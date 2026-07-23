import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, resolve, dirname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const outputDir = resolve(root, 'test-results');
await mkdir(outputDir, { recursive: true });
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
if (!email || !password) throw new Error('Credenciais E2E não foram fornecidas.');

const mime = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.gif': 'image/gif'
};
function safePath(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath.split('?')[0])).replace(/^([.][.][/\\])+/, '');
  return resolve(root, clean === '/' ? 'index.html' : clean.replace(/^[/\\]/, ''));
}

let server;
let baseUrl = process.env.E2E_BASE_URL || '';
if (!baseUrl) {
  server = createServer(async (request, response) => {
    try {
      const path = safePath(request.url || '/');
      if (!path.startsWith(root)) throw new Error('Caminho inválido');
      const content = await readFile(path);
      response.writeHead(200, { 'content-type': mime[extname(path)] || 'application/octet-stream', 'cache-control': 'no-store' });
      response.end(content);
    } catch {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Not found');
    }
  });
  await new Promise(resolveStart => server.listen(0, '127.0.0.1', resolveStart));
  baseUrl = `http://127.0.0.1:${server.address().port}/index.html`;
}

const browser = await chromium.launch({ headless: true });
let failed = false;
const results = [];
function check(condition, message, detail = '') {
  results.push({ condition, message, detail });
  console.log(`${condition ? 'PASS' : 'FAIL'} — ${message}${detail ? ` — ${detail}` : ''}`);
  if (!condition) failed = true;
}

async function login(page) {
  const url = new URL(baseUrl);
  url.searchParams.set('env', 'staging');
  url.searchParams.set('e2e', '1');
  await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#loginForm', { state: 'visible' });
  await page.fill('#loginEmail', email);
  await page.fill('#loginPassword', password);
  await page.click('#loginBtn');
  await page.waitForSelector('#appView:not(.hidden)', { timeout: 60000 });
  await page.waitForFunction(() => {
    const role = document.querySelector('#userRole')?.textContent?.trim().toLowerCase() || '';
    return role && role !== 'perfil';
  }, null, { timeout: 60000 });
}

async function openPage(page, name) {
  const button = page.locator(`.nav-item[data-page="${name}"]`).first();
  await button.waitFor({ state: 'attached', timeout: 30000 });
  const group = button.locator('xpath=ancestor::section[contains(concat(" ", normalize-space(@class), " "), " design-nav-group ")]').first();
  if (await group.count()) {
    const toggle = group.locator(':scope > .design-nav-group-toggle').first();
    if (await toggle.count() && (await toggle.getAttribute('aria-expanded')) !== 'true') {
      await toggle.click();
      await page.waitForTimeout(80);
    }
  }
  await button.waitFor({ state: 'visible', timeout: 30000 });
  await button.click();
  await page.locator(`#page-${name}.active`).waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(120);
}

async function fillRequiredFields(form) {
  const today = new Date().toISOString().slice(0, 10);
  const dateTime = new Date().toISOString().slice(0, 16);
  const fields = form.locator('input[required]:not([type="hidden"]), select[required], textarea[required]');
  const count = await fields.count();
  for (let index = 0; index < count; index += 1) {
    const field = fields.nth(index);
    const tag = await field.evaluate(element => element.tagName.toLowerCase());
    const type = (await field.getAttribute('type')) || '';
    const name = (await field.getAttribute('name')) || '';
    if (tag === 'select') {
      const options = await field.locator('option').evaluateAll(items => items.map(item => ({ value: item.value, disabled: item.disabled })));
      const option = options.find(item => item.value && !item.disabled);
      if (option) await field.selectOption(option.value);
      continue;
    }
    if (type === 'checkbox' || type === 'radio') {
      if (!(await field.isChecked())) await field.check();
      continue;
    }
    if (type === 'date') await field.fill(today);
    else if (type === 'datetime-local') await field.fill(dateTime);
    else if (type === 'number') await field.fill('1');
    else if (type === 'email') await field.fill('opscontrol.e2e@slb5251.test');
    else if (type === 'password') await field.fill('E2e-Teste-123!');
    else if (name === 'title') await field.fill('[E2E] Validação da homologação');
    else if (name === 'message' || name === 'description' || tag === 'textarea') await field.fill('[E2E] Registro automático de validação');
    else await field.fill('[E2E] Teste');
  }
}

try {
  const desktop = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await desktop.newPage();
  const pageErrors = [];
  const severeConsole = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && !/favicon|net::ERR_ABORTED|optional/i.test(message.text())) severeConsole.push(message.text());
  });

  await login(page);
  const roleLabel = (await page.locator('#userRole').textContent()).trim().toLowerCase();
  check((await page.title()).startsWith('[HOMOLOGAÇÃO]'), 'título identifica homologação', await page.title());
  check(await page.locator('#homologationBanner').isVisible(), 'faixa de homologação está visível');
  check(/admin|administrador/.test(roleLabel), 'login real recebeu perfil administrador', roleLabel);
  check(!(await page.locator('#syncBadge').textContent()).includes('Modo local'), 'aplicativo está conectado ao Supabase');
  await page.screenshot({ path: resolve(outputDir, 'e2e-desktop-login.png'), fullPage: true });

  const modules = ['dashboard','operations','vessel-registry','tanks','fluids','chemical-catalog','chemicals','trucks','client-tickets','qhse','maintenance','certificates','alerts','reports','audit','settings','tv'];
  for (const module of modules) {
    await openPage(page, module);
    const audit = await page.evaluate(name => {
      const element = document.querySelector(`#page-${name}`);
      return {
        visible: Boolean(element?.classList.contains('active')),
        text: element?.textContent?.trim().length || 0,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 3
      };
    }, module);
    check(audit.visible && audit.text > 0, `módulo ${module} renderiza conteúdo`, `texto: ${audit.text}`);
    check(!audit.overflow, `módulo ${module} não causa overflow global`);
  }

  const forms = [
    ['operations','new-operation','#operationForm'],
    ['vessel-registry','new-vessel-registry','#vesselRegistryForm'],
    ['trucks','new-truck','#truckForm'],
    ['client-tickets','new-client-ticket','#clientTicketForm'],
    ['qhse','new-qhse','#genericForm[data-kind="qhse"]'],
    ['maintenance','new-maintenance-order','#maintenanceOrderForm'],
    ['chemicals','new-chemical','#chemicalForm'],
    ['alerts','new-alert','#genericForm[data-kind="alert"]']
  ];
  for (const [module, action, selector] of forms) {
    await openPage(page, module);
    const trigger = page.locator(`[data-action="${action}"]:visible`).first();
    check(await trigger.count() > 0, `ação ${action} está disponível`);
    if (await trigger.count()) {
      await trigger.click();
      const form = page.locator(selector);
      await form.waitFor({ state: 'visible', timeout: 15000 });
      check(await form.isVisible(), `formulário ${selector} abre corretamente`);
      const close = page.locator('[data-close-modal]:visible').first();
      if (await close.count()) await close.click();
      else await page.keyboard.press('Escape');
      await page.waitForTimeout(80);
    }
  }

  await openPage(page, 'alerts');
  const alertTrigger = page.locator('[data-action="new-alert"]:visible').first();
  await alertTrigger.click();
  const alertForm = page.locator('#genericForm[data-kind="alert"]');
  await alertForm.waitFor({ state: 'visible' });
  await fillRequiredFields(alertForm);
  const titleField = alertForm.locator('[name="title"]');
  if (await titleField.count()) await titleField.fill('[E2E] Validação da homologação');
  const messageField = alertForm.locator('[name="message"], [name="description"], textarea').first();
  if (await messageField.count()) await messageField.fill('[E2E] Registro automático de validação');
  await alertForm.locator('button[type="submit"], button:not([type])').last().click();
  await page.waitForSelector('#modal.hidden', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(600);
  await openPage(page, 'alerts');
  check((await page.locator('#page-alerts').textContent()).includes('[E2E]'), 'fluxo real de alerta grava e reaparece na interface');

  await openPage(page, 'tv');
  const tvAudit = await page.evaluate(() => {
    const root = document.querySelector('#page-tv');
    const controls = [...root.querySelectorAll('button')].filter(button => button.offsetParent !== null).length;
    return { text: root?.textContent?.trim().length || 0, controls, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 3 };
  });
  check(tvAudit.text > 50, 'Painel TV renderiza conteúdo operacional', `texto: ${tvAudit.text}`);
  check(tvAudit.controls > 0, 'Painel TV disponibiliza controles', `controles: ${tvAudit.controls}`);
  check(!tvAudit.overflow, 'Painel TV não causa overflow global');
  await page.screenshot({ path: resolve(outputDir, 'e2e-tv-panel.png'), fullPage: true });

  const logout = page.locator('#logoutBtn:visible, [data-action="logout"]:visible').first();
  check(await logout.count() > 0, 'controle de logout está disponível');
  if (await logout.count()) {
    await logout.click();
    await page.waitForSelector('#loginView:not(.hidden)', { timeout: 30000 });
  }
  await page.fill('#loginEmail', email);
  await page.click('#forgotPasswordBtn');
  await page.waitForFunction(() => document.querySelector('#loginMessage')?.textContent?.includes('Se o acesso estiver cadastrado'), null, { timeout: 30000 });
  check((await page.locator('#loginMessage').textContent()).includes('Se o acesso estiver cadastrado'), 'recuperação usa resposta não enumerável');
  check(pageErrors.length === 0, 'nenhum erro JavaScript não tratado no desktop', pageErrors.join(' | '));
  check(severeConsole.length === 0, 'nenhum erro grave no console desktop', severeConsole.join(' | '));
  await desktop.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobilePage = await mobile.newPage();
  const mobileErrors = [];
  mobilePage.on('pageerror', error => mobileErrors.push(error.message));
  await login(mobilePage);
  for (const module of ['dashboard','operations','tanks','alerts','tv']) {
    const direct = mobilePage.locator(`[data-mobile-page="${module}"]:visible`).first();
    if (await direct.count()) await direct.click();
    else {
      await mobilePage.click('#menuBtn').catch(() => {});
      const target = mobilePage.locator(`.nav-item[data-page="${module}"]`).first();
      await target.click({ force: true });
    }
    await mobilePage.locator(`#page-${module}.active`).waitFor({ state: 'visible', timeout: 30000 });
    const overflow = await mobilePage.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 3);
    check(!overflow, `módulo ${module} permanece responsivo em 390px`);
  }
  check(mobileErrors.length === 0, 'nenhum erro JavaScript não tratado no celular', mobileErrors.join(' | '));
  await mobilePage.screenshot({ path: resolve(outputDir, 'e2e-mobile.png'), fullPage: true });
  await mobile.close();
} finally {
  await browser.close();
  if (server) await new Promise(resolveClose => server.close(resolveClose));
}

if (failed) process.exit(1);
