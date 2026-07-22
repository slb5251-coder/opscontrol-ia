import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const mime = { '.js': 'text/javascript; charset=utf-8', '.html': 'text/html; charset=utf-8' };

const testPage = `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>Observability test</title></head>
<body>
  <span id="syncBadge">Online</span>
  <script>
    window.OPSCONTROL_ACTIVE_ENVIRONMENT = 'staging';
    window.OPSCONTROL_CONFIG = {
      defaultEnvironment: 'staging',
      environments: {
        staging: { supabaseUrl: 'https://staging.supabase.co', supabaseKey: 'sb_publishable_TEST_KEY' }
      }
    };
    localStorage.setItem('sb-staging-auth-token', JSON.stringify({
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token'
    }));
  </script>
  <script src="/js/system-observability.js"></script>
</body>
</html>`;

const server = createServer(async (request, response) => {
  if ((request.url || '').startsWith('/test.html')) {
    response.writeHead(200, { 'content-type': mime['.html'] });
    response.end(testPage);
    return;
  }
  try {
    const filePath = resolve(root, String(request.url || '').replace(/^\//, '').split('?')[0]);
    if (!filePath.startsWith(root)) throw new Error('invalid path');
    const content = await readFile(filePath);
    response.writeHead(200, { 'content-type': mime[extname(filePath)] || 'application/octet-stream' });
    response.end(content);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});

await new Promise(resolveStart => server.listen(0, '127.0.0.1', resolveStart));
const port = server.address().port;
const browser = await chromium.launch({ headless: true });
let failed = false;

function assert(condition, message, detail = '') {
  console.log(`${condition ? 'PASS' : 'FAIL'} — ${message}${detail ? ` — ${detail}` : ''}`);
  if (!condition) failed = true;
}

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const reports = [];
  let resolveCalls = 0;
  let authorized = true;

  await page.route('https://staging.supabase.co/rest/v1/rpc/**', async route => {
    const url = route.request().url();
    const body = route.request().postDataJSON?.() || {};
    if (url.endsWith('/report_client_error_v1')) {
      reports.push(body);
      await route.fulfill({ status: 200, contentType: 'application/json', body: '1' });
      return;
    }
    if (url.endsWith('/resolve_system_error_v1')) {
      resolveCalls += 1;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: body.p_error_id, resolved_at: new Date().toISOString() }) });
      return;
    }
    if (url.endsWith('/get_system_health_v1')) {
      if (!authorized) {
        await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ message: 'forbidden' }) });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'healthy',
          generated_at: new Date().toISOString(),
          latest_migration: '20260722230000',
          realtime_tables: 39,
          unresolved_errors_24h: 1,
          critical_errors_24h: 0,
          stale_operations: 0,
          overdue_alerts: 0,
          overdue_maintenance: 0,
          expired_certificates: 0,
          blocked_tanks: 0,
          near_capacity_tanks: 0,
          recent_errors: [{ id: 9, severity: 'error', context: 'test', message: 'Falha de teste', occurrence_count: 2, last_seen_at: new Date().toISOString(), page_path: '/dashboard' }]
        })
      });
      return;
    }
    await route.abort();
  });

  await page.goto(`http://127.0.0.1:${port}/test.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#systemHealthButton:not(.hidden)', { timeout: 5000 });

  const buttonText = await page.locator('#systemHealthButton').textContent();
  assert(buttonText?.includes('Sistema saudável'), 'painel administrativo recebe estado saudável', buttonText || '');

  await page.evaluate(() => {
    window.dispatchEvent(new ErrorEvent('error', {
      message: 'Falha para joao@example.com com sb_publishable_SECRET e ?access_token=abc',
      error: new Error('Falha para joao@example.com com sb_publishable_SECRET e ?access_token=abc')
    }));
  });
  await page.waitForFunction(() => document.documentElement.dataset.observability === 'active', null, { timeout: 5000 });
  await new Promise(resolveWait => setTimeout(resolveWait, 150));

  const report = reports.at(-1) || {};
  assert(Boolean(report.p_fingerprint), 'erro recebe fingerprint para deduplicação');
  assert(report.p_environment === 'staging', 'erro registra ambiente correto', report.p_environment || '');
  assert(!String(report.p_message || '').includes('joao@example.com'), 'e-mail é removido da telemetria');
  assert(!String(report.p_message || '').includes('sb_publishable_SECRET'), 'chave é removida da telemetria');
  assert(!String(report.p_message || '').includes('access_token=abc'), 'token é removido da telemetria');
  assert(String(report.p_message || '').includes('[EMAIL]'), 'telemetria mantém marcador de dado removido');

  await page.click('#systemHealthButton');
  await page.waitForSelector('#systemHealthPanel.open');
  assert(await page.locator('.system-health-metric').count() === 8, 'painel apresenta oito indicadores de saúde');
  assert((await page.locator('.system-health-error').count()) === 1, 'painel apresenta erros recentes');

  await page.click('[data-health-resolve="9"]');
  await page.waitForTimeout(100);
  assert(resolveCalls === 1, 'ação de resolver chama RPC segura', String(resolveCalls));

  authorized = false;
  await page.evaluate(() => window.OpsControlObservability.health());
  await page.waitForTimeout(100);
  assert(await page.locator('#systemHealthButton.hidden').count() === 1, 'painel fica oculto para perfil sem autorização');

  await context.close();
} finally {
  await browser.close();
  await new Promise(resolveClose => server.close(resolveClose));
}

if (failed) process.exit(1);
