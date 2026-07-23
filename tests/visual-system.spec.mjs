import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const fixture = `<!doctype html><html lang="pt-BR"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{box-sizing:border-box}html,body{margin:0;max-width:100%;overflow-x:clip}.login-view{display:grid;grid-template-columns:minmax(0,1fr) 420px;min-height:100vh}.login-hero{position:relative;overflow:hidden;padding:48px}.login-panel{display:grid;place-items:center;padding:24px}.login-card{width:min(390px,100%);padding:28px}.shell{display:grid;grid-template-columns:264px minmax(0,1fr)}.sidebar{position:relative;min-width:0}.main-content{min-width:0;padding:26px}.page{min-width:0}.topbar{display:flex;align-items:center}.stat-card,.card,.reference-tank-card{padding:18px}.tv-screen{min-height:420px}.nav-item{display:flex;align-items:center;gap:10px}.hidden{display:none!important}
@media(max-width:900px){.login-view{grid-template-columns:1fr}.login-hero{min-height:420px}.shell{grid-template-columns:1fr}.main-content{padding:16px 14px 92px}}
</style>
<link rel="stylesheet" href="/visual-system-v3.css"></head><body>
<section class="login-view"><div class="login-hero"><div class="login-hero-copy"><h1>OpsControl IA</h1></div><section class="login-ops-overview"><div class="login-ops-metrics"><article><strong>24/7</strong><span>Operação</span></article></div></section></div><div class="login-panel"><form class="login-card"><div class="login-field"><input></div><button class="btn primary">Entrar</button></form></div></section>
<section id="appView"><header class="topbar"><span class="brand-mark">OC</span></header><div class="shell"><aside class="sidebar"><nav><button class="nav-item active" data-page="dashboard"><span class="nav-icon"><svg viewBox="0 0 24 24"><path d="M3 3h8v8H3z"></path></svg></span><span class="nav-label">Dashboard</span></button></nav></aside><main class="main-content">
<section id="page-dashboard" class="page active"><div class="page-header"><h1>Dashboard</h1></div><article class="stat-card"><h2>1.250</h2></article><div class="card">Operação normal</div></section>
<section id="page-tanks" class="page active"><article class="tank-card reference-tank-card tone-blue"><section class="reference-card-view"><div class="reference-card-head"><h3>TK-01</h3></div><div class="reference-product-block"><span>Produto</span><strong>WBM</strong></div><div class="reference-volume-row"><strong>700 / 1000 bbl</strong><span>70%</span></div><div class="reference-progress" aria-valuenow="70"><span style="--reference-level:70%"></span></div></section></article></section>
<section id="page-tv" class="page active"><div class="tv-screen tv-control-room"><div class="tv-control-status-rail"><article><span>Conexão</span><strong>Online</strong></article></div></div></section>
</main></div></section><div id="modal" class="modal hidden"><div class="modal-card"></div></div>
<script src="/js/visual-system-v3.js"></script></body></html>`;

const mime = { '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8' };
const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', 'http://127.0.0.1');
  if (url.pathname === '/fixture.html') {
    response.writeHead(200, {'content-type':'text/html; charset=utf-8'}); response.end(fixture); return;
  }
  const paths = new Map([
    ['/visual-system-v3.css', resolve(root, 'visual-system-v3.css')],
    ['/js/visual-system-v3.js', resolve(root, 'js/visual-system-v3.js')]
  ]);
  const file = paths.get(url.pathname);
  if (file) { response.writeHead(200, {'content-type':mime[extname(file)]}); response.end(await readFile(file)); return; }
  response.writeHead(404); response.end('Not found');
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const port = server.address().port;
const browser = await chromium.launch({headless:true});
let failed = false;
const check = (condition, message, detail='') => {
  console.log(`${condition?'PASS':'FAIL'} — ${message}${detail?` — ${detail}`:''}`);
  if (!condition) failed = true;
};

try {
  const page = await browser.newPage({viewport:{width:1366,height:900}});
  await page.goto(`http://127.0.0.1:${port}/fixture.html`, {waitUntil:'networkidle'});
  await page.waitForFunction(() => document.documentElement.dataset.visualSystem?.includes('visual-system-v3'));
  await page.waitForTimeout(120);

  check(await page.locator('body.visual-v3').count() === 1, 'tema visual global é ativado');
  check(await page.locator('.visual-login-grid').count() === 1, 'login recebe grade animada');
  check(await page.locator('.visual-login-aurora').count() === 1, 'login recebe aurora');
  check(await page.locator('.visual-login-ship .ship').count() === 1, 'login recebe embarcação navegando');
  check(await page.locator('.visual-spotlight').count() >= 4, 'cards recebem spotlight interativo');
  check(await page.locator('.visual-vessel-gauge').count() === 1, 'tanque recebe medidor visual');
  check((await page.locator('.visual-vessel-copy strong').textContent()) === '70%', 'medidor mantém percentual real');
  check((await page.locator('.visual-vessel-liquid').getAttribute('style')).includes('70%'), 'nível líquido acompanha os dados');

  await page.waitForTimeout(760);
  const counter = await page.locator('.stat-card h2').evaluate(element => ({
    text: element.textContent,
    animating: element.dataset.visualAnimating || '',
    target: element.dataset.visualNumberTarget || ''
  }));
  check(counter.text === '1.250', 'contador termina no valor original', counter.text);
  check(counter.animating === '' && counter.target === '1.250', 'contador não reinicia após a própria atualização', JSON.stringify(counter));

  const iconDisplay = await page.locator('.nav-icon svg').evaluate(element => getComputedStyle(element).display);
  check(iconDisplay !== 'none', 'ícones reais aparecem na sidebar', iconDisplay);
  const sidebarBackground = await page.locator('.sidebar').evaluate(element => getComputedStyle(element).backgroundImage);
  check(sidebarBackground.includes('gradient'), 'sidebar usa acabamento industrial premium');
  const tvBackground = await page.locator('.tv-screen').evaluate(element => getComputedStyle(element).backgroundImage);
  check(tvBackground.includes('gradient'), 'Painel TV recebe visual de sala de controle');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 3);
  check(!overflow, 'sistema visual não cria overflow desktop');

  const reduced = await browser.newContext({viewport:{width:390,height:844}, reducedMotion:'reduce'});
  const mobile = await reduced.newPage();
  await mobile.goto(`http://127.0.0.1:${port}/fixture.html`, {waitUntil:'networkidle'});
  await mobile.waitForFunction(() => document.body.classList.contains('visual-v3'));
  const animation = await mobile.locator('.visual-login-grid').evaluate(element => getComputedStyle(element).animationName);
  check(animation === 'none', 'movimento reduzido desativa animações decorativas', animation);
  const mobileOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 3);
  check(!mobileOverflow, 'sistema visual permanece responsivo em 390px');
  await reduced.close();
} finally {
  await browser.close();
  await new Promise(done => server.close(done));
}
if (failed) process.exit(1);
