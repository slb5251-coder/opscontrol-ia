import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, resolve, dirname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const outputDir = resolve(root, 'test-results');
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
};

function safePath(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath.split('?')[0])).replace(/^([.][.][/\\])+/, '');
  return resolve(root, clean === '/' ? 'index.html' : clean.replace(/^[/\\]/, ''));
}

const server = createServer(async (request, response) => {
  try {
    const path = safePath(request.url || '/');
    if (!path.startsWith(root)) throw new Error('Caminho inválido');
    const content = await readFile(path);
    response.writeHead(200, { 'content-type': mime[extname(path)] || 'application/octet-stream' });
    response.end(content);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});

await new Promise(resolveStart => server.listen(0, '127.0.0.1', resolveStart));
const port = server.address().port;
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
let failed = false;

function assert(condition, message, detail = '') {
  const marker = condition ? 'PASS' : 'FAIL';
  console.log(`${marker} — ${message}${detail ? ` — ${detail}` : ''}`);
  if (!condition) failed = true;
}

try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  await page.route('**/*', async route => {
    const url = route.request().url();
    if (url.startsWith(`http://127.0.0.1:${port}/`)) await route.continue();
    else await route.abort();
  });

  await page.goto(`http://127.0.0.1:${port}/index.html?env=staging`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(250);

  const staging = await page.evaluate(() => ({
    environment: window.OPSCONTROL_ACTIVE_ENVIRONMENT,
    storedEnvironment: localStorage.getItem('opscontrol_environment'),
    htmlEnvironment: document.documentElement.dataset.opsEnvironment,
    title: document.title,
    banner: Boolean(document.querySelector('#homologationBanner')),
    blocker: Boolean(document.querySelector('.staging-config-blocker')),
    loginDisabled: Boolean(document.querySelector('#loginBtn')?.disabled),
    productionUrlSelected: window.OPSCONTROL_CONFIG?.environments?.staging?.supabaseUrl === window.OPSCONTROL_CONFIG?.environments?.production?.supabaseUrl
  }));

  assert(staging.environment === 'staging', 'parâmetro ativa homologação', staging.environment);
  assert(staging.storedEnvironment === 'staging', 'ambiente fica persistido', staging.storedEnvironment);
  assert(staging.htmlEnvironment === 'staging', 'HTML recebe identificação de homologação', staging.htmlEnvironment);
  assert(staging.title.startsWith('[HOMOLOGAÇÃO]'), 'título identifica homologação', staging.title);
  assert(staging.banner, 'faixa de homologação visível');
  assert(staging.blocker, 'homologação sem banco fica bloqueada');
  assert(staging.loginDisabled, 'login não usa produção por engano');
  assert(!staging.productionUrlSelected, 'staging não herda URL de produção');
  await page.screenshot({ path: resolve(outputDir, 'environment-staging.png'), fullPage: true });

  await page.goto(`http://127.0.0.1:${port}/index.html?env=production`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(200);

  const production = await page.evaluate(() => ({
    environment: window.OPSCONTROL_ACTIVE_ENVIRONMENT,
    storedEnvironment: localStorage.getItem('opscontrol_environment'),
    htmlEnvironment: document.documentElement.dataset.opsEnvironment || '',
    title: document.title,
    banner: Boolean(document.querySelector('#homologationBanner')),
    blocker: Boolean(document.querySelector('.staging-config-blocker')),
    loginDisabled: Boolean(document.querySelector('#loginBtn')?.disabled),
    configured: Boolean(window.OPSCONTROL_CONFIG?.environments?.production?.supabaseUrl && window.OPSCONTROL_CONFIG?.environments?.production?.supabaseKey)
  }));

  assert(production.environment === 'production', 'parâmetro retorna à produção', production.environment);
  assert(production.storedEnvironment === 'production', 'produção fica persistida', production.storedEnvironment);
  assert(!production.htmlEnvironment, 'produção não recebe marca de homologação');
  assert(!production.title.startsWith('[HOMOLOGAÇÃO]'), 'título de produção permanece limpo', production.title);
  assert(!production.banner && !production.blocker, 'produção não exibe bloqueios de homologação');
  assert(!production.loginDisabled, 'login de produção permanece disponível');
  assert(production.configured, 'produção continua configurada');
  await page.screenshot({ path: resolve(outputDir, 'environment-production.png'), fullPage: true });

  await context.close();
} finally {
  await browser.close();
  await new Promise(resolveClose => server.close(resolveClose));
}

if (failed) process.exit(1);
