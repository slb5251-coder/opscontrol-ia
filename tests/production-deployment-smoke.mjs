import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const rootUrl = process.env.PRODUCTION_URL || 'https://slb5251-coder.github.io/opscontrol-ia/';
const expectedProductionProject = 'bcnzdujfumswhpduxkfy';
const expectedStagingProject = 'idnbbesxdoeeiupwltxk';
const outputDir = resolve('test-results', 'production-smoke');
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const results = [];
let failed = false;

function check(condition, message, detail = '') {
  results.push({ condition, message, detail });
  console.log(`${condition ? 'PASS' : 'FAIL'} — ${message}${detail ? ` — ${detail}` : ''}`);
  if (!condition) failed = true;
}

async function openWithRetry(page, environment) {
  const url = new URL(rootUrl);
  url.searchParams.set('env', environment);
  url.searchParams.set('release_smoke', `${Date.now()}`);
  let lastError;
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      const response = await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 30000 });
      if (!response || response.status() >= 400) throw new Error(`HTTP ${response?.status() || 'sem resposta'}`);
      await page.waitForSelector('#loginForm', { state: 'visible', timeout: 15000 });
      const config = await page.evaluate(() => ({
        active: window.OPSCONTROL_ACTIVE_ENVIRONMENT,
        productionUrl: window.OPSCONTROL_CONFIG?.environments?.production?.supabaseUrl || '',
        stagingUrl: window.OPSCONTROL_CONFIG?.environments?.staging?.supabaseUrl || ''
      }));
      if (!config.productionUrl.includes(expectedProductionProject) || !config.stagingUrl.includes(expectedStagingProject)) {
        throw new Error('Configuração publicada ainda não corresponde à release atual.');
      }
      return { url: url.toString(), config };
    } catch (error) {
      lastError = error;
      if (attempt === 30) throw error;
      await page.waitForTimeout(10000);
    }
  }
  throw lastError;
}

try {
  const productionContext = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const productionPage = await productionContext.newPage();
  const productionErrors = [];
  productionPage.on('pageerror', error => productionErrors.push(error.message));
  const production = await openWithRetry(productionPage, 'production');
  const productionTitle = await productionPage.title();
  check(production.config.active === 'production', 'site publicado seleciona produção', production.config.active);
  check(!productionTitle.startsWith('[HOMOLOGAÇÃO]'), 'título de produção não exibe homologação', productionTitle);
  check(await productionPage.locator('#homologationBanner').count() === 0, 'produção não exibe faixa de homologação');
  check(productionErrors.length === 0, 'produção não gera erro JavaScript não tratado', productionErrors.join(' | '));
  await productionPage.screenshot({ path: resolve(outputDir, 'production-login.png'), fullPage: true });
  await productionContext.close();

  const stagingContext = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const stagingPage = await stagingContext.newPage();
  const stagingErrors = [];
  stagingPage.on('pageerror', error => stagingErrors.push(error.message));
  const staging = await openWithRetry(stagingPage, 'staging');
  const stagingTitle = await stagingPage.title();
  const banner = stagingPage.locator('#homologationBanner');
  check(staging.config.active === 'staging', 'site publicado seleciona homologação', staging.config.active);
  check(stagingTitle.startsWith('[HOMOLOGAÇÃO]'), 'título identifica homologação', stagingTitle);
  check(await banner.isVisible(), 'faixa de homologação está visível');
  check((await banner.textContent()).includes('Dados e autenticação separados da produção'), 'faixa confirma isolamento de dados');
  check(await stagingPage.locator('.staging-config-blocker').count() === 0, 'homologação publicada não está bloqueada por configuração insegura');
  check(await stagingPage.locator('#loginEmail').isEnabled(), 'login da homologação permanece habilitado');
  check(stagingErrors.length === 0, 'homologação não gera erro JavaScript não tratado', stagingErrors.join(' | '));
  await stagingPage.screenshot({ path: resolve(outputDir, 'staging-login.png'), fullPage: true });
  await stagingContext.close();
} finally {
  await browser.close();
}

if (failed) process.exit(1);
