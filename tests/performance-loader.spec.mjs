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

  await page.evaluate(() => {
    const form = document.createElement('form');
    form.id = 'genericForm';
    form.dataset.kind = 'alert';
    document.querySelector('#appView').appendChild(form);
  });
  await page.waitForFunction(() => window.OpsControlModules?.loaded('alert-center-v2'));
  assert(wasRequested('/alert-center-v2.js'), 'central de alertas carrega quando um formulário de alerta é aberto');
  assert(wasRequested('/alert-center-v2.css'), 'estilo de alertas acompanha o carregamento funcional');

  const loaderVersion = await page.evaluate(() => window.OpsControlModules?.version || '');
  assert(loaderVersion.includes('module-loader'), 'API de diagnóstico expõe a versão do carregador', loaderVersion);
} finally {
  await browser.close();
  await new Promise(resolveClose => server.close(resolveClose));
}

if (failed) process.exit(1);