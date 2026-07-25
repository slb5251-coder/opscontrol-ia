import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const requests = [];
const pageHtml = `<!doctype html><html><head><meta charset="utf-8"></head><body>
<section id="loginView"></section><section id="appView" class="hidden">
<button class="nav-item active" data-page="dashboard">Dashboard</button>
<button class="nav-item" data-page="ai-assistant">IA</button>
<section id="page-dashboard" class="page active"></section>
<section id="page-ai-assistant" class="page"></section>
</section><span id="syncBadge">Online</span><script src="/js/interface-runtime.js"></script></body></html>`;

const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', 'http://127.0.0.1');
  requests.push(url.pathname);
  if (url.pathname === '/test.html') { response.writeHead(200, {'content-type':'text/html'}); response.end(pageHtml); return; }
  if (url.pathname === '/js/interface-runtime.js') { response.writeHead(200, {'content-type':'text/javascript'}); response.end(await readFile(resolve(root,'js/interface-runtime.js'))); return; }
  if (url.pathname.endsWith('.js')) { response.writeHead(200, {'content-type':'text/javascript'}); response.end(`window.OpsDeferredStub=true;`); return; }
  if (url.pathname.endsWith('.css')) { response.writeHead(200, {'content-type':'text/css'}); response.end('/* stub */'); return; }
  response.writeHead(404); response.end();
});

await new Promise(resolveStart => server.listen(0,'127.0.0.1',resolveStart));
const port = server.address().port;
const browser = await chromium.launch({headless:true});
let failed = false;
const assert = (condition, message) => { console.log(`${condition?'PASS':'FAIL'} — ${message}`); if(!condition) failed=true; };

try {
  const page = await browser.newPage();
  await page.route('https://unpkg.com/**', async route => {
    requests.push(new URL(route.request().url()).pathname);
    const isJs = route.request().url().endsWith('.js');
    await route.fulfill({status:200, contentType:isJs?'text/javascript':'text/css', body:isJs?'window.L={map(){}};':'/* leaflet */'});
  });
  await page.goto(`http://127.0.0.1:${port}/test.html`, {waitUntil:'domcontentloaded'});
  await page.waitForFunction(() => document.documentElement.dataset.interfaceRuntime === 'ready');
  assert(!requests.some(path => path.includes('assistente-integrado')), 'Assistente não é baixado no login');
  assert(!requests.some(path => path.includes('leaflet')), 'Leaflet não é baixado no login');

  await page.evaluate(() => document.querySelector('#appView').classList.remove('hidden'));
  await page.waitForFunction(() => window.OpsControlModules?.loaded('role-dashboard'));
  assert(!requests.some(path => path.includes('assistente-integrado')), 'Assistente continua adiado no dashboard');
  assert(!requests.some(path => path.includes('leaflet')), 'Leaflet continua adiado no dashboard');

  await page.evaluate(() => {
    document.querySelector('#page-dashboard').classList.remove('active');
    document.querySelector('#page-ai-assistant').classList.add('active');
    document.querySelector('[data-page="dashboard"]').classList.remove('active');
    document.querySelector('[data-page="ai-assistant"]').classList.add('active');
  });
  await page.waitForFunction(() => window.OpsControlModules?.loaded('ai-assistant'));
  assert(requests.some(path => path.endsWith('/assistente-integrado.js')), 'JS do Assistente carrega ao abrir o módulo');
  assert(requests.some(path => path.endsWith('/assistente-integrado.css')), 'CSS do Assistente carrega junto');
  assert(!requests.some(path => path.includes('leaflet')), 'Leaflet não carrega ao abrir apenas a IA');

  await page.evaluate(() => {
    const map = document.createElement('div'); map.id='vesselAisMap'; document.querySelector('#appView').appendChild(map);
  });
  await page.waitForFunction(() => window.OpsControlModules?.loaded('leaflet'));
  assert(requests.some(path => path.endsWith('/leaflet.js')), 'Leaflet JS carrega apenas quando existe mapa interno');
  assert(requests.some(path => path.endsWith('/leaflet.css')), 'Leaflet CSS acompanha o mapa interno');
} finally {
  await browser.close();
  await new Promise(resolveClose => server.close(resolveClose));
}
if (failed) process.exit(1);
