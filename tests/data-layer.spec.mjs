import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const html = '<!doctype html><html><body><script src="/js/app-data.js"></script></body></html>';
const files = new Map([
  ['/js/app-data.js', resolve(root, 'js/app-data.js')],
  ['/js/app.js', resolve(root, 'js/app.js')],
  ['/index.html', resolve(root, 'index.html')],
  ['/sw.js', resolve(root, 'sw.js')]
]);
const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', 'http://127.0.0.1');
  if (url.pathname === '/test.html') {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(html);
    return;
  }
  const file = files.get(url.pathname);
  if (file) {
    response.writeHead(200, { 'content-type': extname(file) === '.js' ? 'text/javascript; charset=utf-8' : 'text/plain; charset=utf-8' });
    response.end(await readFile(file));
    return;
  }
  response.writeHead(404);
  response.end('Not found');
});

await new Promise(resolveStart => server.listen(0, '127.0.0.1', resolveStart));
const port = server.address().port;
const browser = await chromium.launch({ headless: true });
let failed = false;
const assert = (condition, message, detail = '') => {
  console.log(`${condition ? 'PASS' : 'FAIL'} — ${message}${detail ? ` — ${detail}` : ''}`);
  if (!condition) failed = true;
};

try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}/test.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.OpsControlData));

  const result = await page.evaluate(async () => {
    const calls = [];
    const rows = {
      profiles: [
        { id: 'u1', email: 'admin@test.local', full_name: 'Admin Teste', role: 'admin', active: true, permissions: {} },
        { id: 'u2', email: 'operador@test.local', full_name: 'Operador', role: 'operador', active: true, permissions: {} }
      ],
      fluid_types: [{ id: 'f1', name: 'WBM Teste', category: 'WBM', default_unit: 'bbl', density_value: 9.5, density_unit: 'ppg', active: true }],
      tanks: [{ id: 't1', name: 'TK-01', phase: 'Phase #1', kind: 'tank', capacity: 1000, unit: 'bbl', current_volume: 300, current_fluid_type_id: 'f1', current_product: 'WBM Teste', current_lot: 'L1', current_density: 9.5, current_density_unit: 'ppg', client: 'Petrobras', status: 'Operacional', display_order: 1, updated_at: '2026-07-23T00:00:00Z' }],
      operations: [{ id: 'op1', client: 'Petrobras', vessel: 'PSV Teste', service_order: 'OS-1', activity: 'Bombeio', fluid_type_id: 'f1', planned_quantity: 100, executed_quantity: 50, unit: 'bbl', status: 'Em andamento', start_at: '2026-07-23T00:00:00Z' }],
      alerts: [{ id: 'a1', title: 'Alerta manual', message: 'Teste', level: 'Alta', created_at: '2026-07-23T00:00:00Z', is_read: false }],
      operational_alert_center: [{ alert_key: 'sys-1', title: 'Alerta automático', message: 'Teste', level: 'Alta', category: 'Sistema', created_at: '2026-07-23T00:00:00Z', action_page: 'alerts' }],
      dismissed_system_alerts: [{ id: 'd1', alert_key: 'sys-1', dismissed_at: '2026-07-23T01:00:00Z' }],
      vessel_registry: [{ id: 'v1', name: 'PSV Teste', imo: '1234567', mmsi: '123456789', active: true }]
    };

    function resultFor(table, method, args) {
      if (table === 'profiles' && method === 'maybeSingle') return { data: rows.profiles[0], error: null };
      if (table === 'latest_vessel_positions') return { data: [], error: { message: 'optional view unavailable' } };
      return { data: rows[table] || [], error: null };
    }

    function query(table) {
      let lastMethod = 'select';
      let lastArgs = [];
      const chain = {
        select(...args) { calls.push([table, 'select', args]); lastMethod = 'select'; lastArgs = args; return chain; },
        eq(...args) { calls.push([table, 'eq', args]); lastMethod = 'eq'; lastArgs = args; return chain; },
        order(...args) { calls.push([table, 'order', args]); lastMethod = 'order'; lastArgs = args; return chain; },
        limit(...args) { calls.push([table, 'limit', args]); lastMethod = 'limit'; lastArgs = args; return chain; },
        maybeSingle(...args) { calls.push([table, 'maybeSingle', args]); return Promise.resolve(resultFor(table, 'maybeSingle', args)); },
        then(resolve, reject) { return Promise.resolve(resultFor(table, lastMethod, lastArgs)).then(resolve, reject); }
      };
      return chain;
    }

    const client = { from: table => { calls.push([table, 'from', []]); return query(table); } };
    const output = await window.OpsControlData.load({
      client,
      user: { id: 'u1', email: 'admin@test.local' },
      applySiloCapacityModels: items => items.map(item => ({ ...item, capacityModelApplied: true }))
    });

    return {
      version: window.OpsControlData.version,
      frozen: Object.isFrozen(window.OpsControlData),
      outputFrozen: Object.isFrozen(output),
      data: output.data,
      lastSyncValid: output.lastSync instanceof Date && !Number.isNaN(output.lastSync.getTime()),
      tables: [...new Set(calls.filter(item => item[1] === 'from').map(item => item[0]))]
    };
  });

  assert(result.version.includes('data-layer'), 'módulo expõe versão própria', result.version);
  assert(result.frozen && result.outputFrozen, 'API e resultado são congelados');
  assert(result.data.profile.role === 'admin' && result.data.profile.name === 'Admin Teste', 'perfil é normalizado');
  assert(result.data.tanks[0].volume === 300 && result.data.tanks[0].capacityModelApplied, 'tanques são transformados e passam pelo modelo de capacidade');
  assert(result.data.operations[0].product === 'WBM Teste' && result.data.operations[0].executed === 50, 'operação vincula o catálogo e converte quantidades');
  assert(result.data.vesselRegistryAvailable === true && result.data.vesselPositionsAvailable === false, 'fontes opcionais registram disponibilidade sem quebrar o carregamento');
  assert(result.data.systemAlerts.every(item => String(item.id || item.alert_key || '') !== 'sys-1'), 'alertas dispensados são removidos');
  assert(result.lastSyncValid, 'retorno inclui horário de sincronização válido');
  for (const table of ['profiles', 'tanks', 'operations', 'alerts', 'chemical_inventory', 'operational_closings', 'vessel_registry', 'client_document_tickets']) {
    assert(result.tables.includes(table), `consulta inclui ${table}`);
  }

  const staticAudit = await page.evaluate(async () => {
    const [app, index, sw] = await Promise.all([
      fetch('/js/app.js').then(response => response.text()),
      fetch('/index.html').then(response => response.text()),
      fetch('/sw.js').then(response => response.text())
    ]);
    return { app, index, sw };
  });
  assert(!staticAudit.app.includes('c.from("profiles").select("*").eq("id", u.id).maybeSingle()'), 'app.js não mantém a consulta monolítica');
  assert(staticAudit.app.includes('window.OpsControlData') && staticAudit.app.includes('DATA.load'), 'app.js consome o módulo de dados');
  const authIndex = staticAudit.index.indexOf('js/app-auth.js');
  const dataIndex = staticAudit.index.indexOf('js/app-data.js');
  const appIndex = staticAudit.index.indexOf('js/app.js');
  assert(authIndex >= 0 && authIndex < dataIndex && dataIndex < appIndex, 'ordem de scripts mantém Auth → Data → App');
  assert(staticAudit.sw.includes('js/app-data.js') && staticAudit.sw.includes('data-layer-1'), 'PWA inclui a camada de dados no núcleo');
} finally {
  await browser.close();
  await new Promise(resolveClose => server.close(resolveClose));
}

if (failed) process.exit(1);
