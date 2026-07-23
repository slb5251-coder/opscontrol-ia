import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const requested = [];

const testPage = `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>Module loader test</title></head>
<body>
  <section id="loginView"></section>
  <section id="appView" class="hidden">
    <button class="nav-item active" data-page="dashboard">Dashboard</button>
    <button class="nav-item" data-page="tanks">Tanques</button>
    <main>
      <section id="page-dashboard" class="page active"></section>
      <section id="page-tanks" class="page"></section>
      <section id="page-operations" class="page"></section>
      <section id="page-tv" class="page"></section>
      <section id="page-alerts" class="page"></section>
    </main>
  </section>
  <span id="syncBadge">Online</span>
  <script src="/js/interface-runtime.js"></script>
</body>
</html>`;

const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', 'http://127.0.0.1');
  requested.push(url.pathname);

  if (url.pathname === '/test.html') {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(testPage);
    return;
  }

  if (url.pathname === '/js/interface-runtime.js') {
    const content = await readFile(resolve(root, 'js/interface-runtime.js'));
    response.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' });
    response.end(content);
    return;
  }

  if (url.pathname.endsWith('.js')) {
    const marker = url.pathname.split('/').pop().replace(/[^a-z0-9]+/gi, '_');
    response.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' });
    response.end(`document.documentElement.dataset[${JSON.stringify(`stub_${marker}`)}] = 'loaded';`);
    return;
  }

  if (url.pathname.endsWith('.css')) {
    response.writeHead(200, { 'content-type': 'text/css; charset=utf-8' });
    response.end('/* module style stub */');
    return;
  }

  response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  response.end('Not found');
});

await new Promise(resolveStart => server.listen(0, '127.0.0.1', resolveStart));
const port = server.address().port;
const browser = await chromium.launch({ headless: true });
let failed = false;

function assert(condition, message, detail = '') {
  console.log(`${condition ? 'PASS' : 'FAIL'} — ${message}${detail ? ` — ${detail}` : ''}`);
  if (!condition) failed = true;
}

const wasRequested = suffix => requested.some(path => path.endsWith(suffix));

try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}/test.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.documentElement.dataset.interfaceRuntime === 'ready');

  assert(wasRequested('/system-observability.js'), 'observabilidade carrega como núcleo');
  assert(wasRequested('/interface-ops-v2.js'), 'interface principal carrega como núcleo');
  assert(wasRequested('/app-states.js'), 'estados de conexão carregam como núcleo');
  assert(wasRequested('/visual-system-v3.js'), 'Visual V3 carrega como núcleo global');
  assert(wasRequested('/visual-system-v3.css'), 'CSS global do Visual V3 carrega no início');
  assert(wasRequested('/visual-modules-v3.css'), 'tratamento visual de todos os módulos carrega no início');
  assert(!wasRequested('/role-dashboard.js'), 'dashboard por perfil não carrega durante o login');
  assert(!wasRequested('/tank-cards-reference.js'), 'tancagem não carrega durante o login');
  assert(!wasRequested('/tv-control-room.js'), 'Painel TV não carrega durante o login');
  assert(!wasRequested('/operations-analytics.js'), 'analytics não carrega durante o login');
  assert(!wasRequested('/alert-center-v2.js'), 'central de alertas não carrega durante o login');

  await page.evaluate(() => document.querySelector('#appView').classList.remove('hidden'));
  await page.waitForFunction(() => window.OpsControlModules?.loaded('role-dashboard'));
  assert(wasRequested('/role-dashboard.js'), 'dashboard por perfil carrega ao abrir o aplicativo');
  assert(wasRequested('/role-dashboard.css'), 'CSS do dashboard carrega junto com o módulo');

  await page.evaluate(() => {
    document.querySelector('#page-dashboard').classList.remove('active');
    document.querySelector('#page-tanks').classList.add('active');
    document.querySelector('[data-page="dashboard"]').classList.remove('active');
    document.querySelector('[data-page="tanks"]').classList.add('active');
  });
  await page.waitForFunction(() => window.OpsControlModules?.loaded('tank-cards-reference'));
  assert(wasRequested('/tank-cards-reference.js'), 'módulo de tancagem carrega ao abrir Tanques');
  assert(wasRequested('/tank-cards-reference.css'), 'estilo de cartões carrega sob demanda');
  assert(wasRequested('/mobile-tank-experience.css'), 'experiência móvel de tanques carrega sob demanda');
  assert(!wasRequested('/tv-control-room.js'), 'Painel TV continua sem download quando não foi aberto');
  assert(!wasRequested('/operations-analytics.js'), 'analytics continua sem download quando não foi aberto');

  const visualOrder = await page.evaluate(() => {
    const links = [...document.querySelectorAll('link[data-ops-module-style]')];
    const last = links.slice(-2).map(link => link.dataset.opsModuleStyle);
    return {
      last,
      promoted: document.documentElement.dataset.visualStylesPromoted,
      hasPromote: typeof window.OpsControlModules?.promoteVisualStyles === 'function'
    };
  });
  assert(visualOrder.last.length === 2 && visualOrder.last.every(name => name === 'visual-v3'), 'Visual V3 permanece depois dos estilos sob demanda', visualOrder.last.join(', '));
  assert(visualOrder.promoted === '2' && visualOrder.hasPromote, 'carregador expõe e registra a precedência visual', visualOrder.promoted);

  await page.evaluate(() => {
    const form = document.createElement('form');
    form.id = 'genericForm';
    form.dataset.kind = 'alert';
    document.querySelector('#appView').appendChild(form);
  });
  await page.waitForFunction(() => window.OpsControlModules?.loaded('alert-center-v2'));
  assert(wasRequested('/alert-center-v2.js'), 'central de alertas carrega quando um formulário de alerta é aberto');
  assert(wasRequested('/alert-center-v2.css'), 'estilo de alertas acompanha o carregamento funcional');

  const loader = await page.evaluate(() => ({
    version: window.OpsControlModules?.version || '',
    hasLoad: typeof window.OpsControlModules?.load === 'function',
    hasStatus: typeof window.OpsControlModules?.status === 'function',
    hasPageMap: Boolean(window.OpsControlModules?.pageModules?.dashboard),
    visualStillLast: [...document.querySelectorAll('link[data-ops-module-style]')].slice(-2).every(link => link.dataset.opsModuleStyle === 'visual-v3')
  }));
  assert(loader.version.includes('visual-system-v3'), 'API de diagnóstico expõe versão do Visual V3', loader.version);
  assert(loader.hasLoad && loader.hasStatus && loader.hasPageMap, 'API expõe carregamento, estado e mapa de páginas');
  assert(loader.visualStillLast, 'precedência visual é restaurada após abrir Alertas');
} finally {
  await browser.close();
  await new Promise(resolveClose => server.close(resolveClose));
}

if (failed) process.exit(1);
