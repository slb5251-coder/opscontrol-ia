import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { extname, resolve, dirname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = resolve(root, 'test-results', 'final-ui');
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.gif':'image/gif' };

const server = createServer(async (request, response) => {
  try {
    const clean = normalize(decodeURIComponent((request.url || '/').split('?')[0])).replace(/^([.][.][/\\])+/, '');
    const path = resolve(root, clean === '/' ? 'index.html' : clean.replace(/^[/\\]/, ''));
    if (!path.startsWith(root)) throw new Error('Caminho inválido');
    response.writeHead(200, { 'content-type': mime[extname(path)] || 'application/octet-stream' });
    response.end(await readFile(path));
  } catch {
    response.writeHead(404, { 'content-type':'text/plain' });
    response.end('Not found');
  }
});

await new Promise(done => server.listen(0, '127.0.0.1', done));
await mkdir(outputDir, { recursive:true });
await mkdir(resolve(outputDir, 'routes'), { recursive:true });
const port = server.address().port;
const browser = await chromium.launch({
  headless:true,
  executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined
});
const results = [];
let failed = false;
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); if (!ok) failed = true; };

const profile = { id:'00000000-0000-4000-8000-000000000001', email:'admin@example.com', username:'admin.ops', full_name:'Admin Operacional', role:'admin', department:'Operações', active:true, permissions:{} };
const now = new Date();
const iso = offsetHours => new Date(now.getTime() + offsetHours * 3600000).toISOString();
const tables = {
  profiles:[profile],
  fluid_types:[
    { id:'f1', name:'WBM 9.5 ppg', category:'WBM', default_unit:'bbl', density_value:9.5, density_unit:'ppg', active:true },
    { id:'f2', name:'Barita', category:'Granel', default_unit:'ton', density_value:4.1, density_unit:'t/m³', active:true }
  ],
  tanks:[
    { id:'t1', name:'TK-01', phase:'Phase #1', kind:'Tank', capacity:1000, unit:'bbl', current_volume:720, current_product:'WBM 9.5 ppg', current_fluid_type_id:'f1', client:'Petrobras', status:'Disponível', display_order:1, updated_by:profile.id, updated_at:iso(-0.1) },
    { id:'t2', name:'TK-02', phase:'Phase #1', kind:'Tank', capacity:1000, unit:'bbl', current_volume:90, current_product:'WBM 9.5 ppg', current_fluid_type_id:'f1', client:'Petrobras', status:'Disponível', display_order:2, updated_by:profile.id, updated_at:iso(-0.2) },
    { id:'s1', name:'Silo 1', phase:'Phase #1', kind:'Silo', capacity:120, unit:'ton', current_volume:88, current_product:'Barita', current_fluid_type_id:'f2', current_density:4.1, current_density_unit:'t/m³', client:'PRIO', status:'Disponível', display_order:30, updated_by:profile.id, updated_at:iso(-0.15) },
    { id:'t3', name:'TK-S01', phase:'Phase #2', kind:'Tank', capacity:1500, unit:'bbl', current_volume:1190, current_product:'WBM 9.5 ppg', current_fluid_type_id:'f1', client:'Equinor', status:'Disponível', display_order:40, updated_by:profile.id, updated_at:iso(-0.3) },
    { id:'s2', name:'Silo A', phase:'Phase #2', kind:'Silo', capacity:140, unit:'ton', current_volume:14, current_product:'Barita', current_fluid_type_id:'f2', current_density:4.1, current_density_unit:'t/m³', client:'Equinor', status:'Em manutenção', display_order:60, updated_by:profile.id, updated_at:iso(-2) }
  ],
  tank_history:[{ id:'h1', tank_id:'t1', old_volume:650, new_volume:720, created_at:iso(-1), changed_by:profile.id }],
  operations:[{ id:'op1', client:'Petrobras', vessel:'PSV Atlântico', service_order:'OS-101', activity:'Bombeio', product:'WBM 9.5 ppg', fluid_type_id:'f1', planned_quantity:1000, executed_quantity:620, unit:'bbl', status:'Em andamento', start_at:iso(-2), flow_rate:190, flow_rate_unit:'bbl/h', paused_minutes:0, responsible_id:profile.id, created_at:iso(-3), updated_at:iso(-0.1) }],
  operation_tank_allocations:[{ id:'a1', operation_id:'op1', direction:'source', tank_id:'t1', quantity:620, unit:'bbl', display_order:0, created_at:iso(-2), updated_at:iso(-1) }],
  alerts:[{ id:'al1', title:'Vento acima do limite', message:'Monitorar condição para içamento.', level:'Crítico', target_group:'operacao', created_at:iso(-0.2), is_read:false }],
  dds_sessions:[{ id:'d1', title:'Transferência segura de fluidos', topic:'Linha pressurizada', scheduled_at:iso(18), duration_minutes:20, instructor:'QHSE', location:'Sala operacional', status:'Planejado', created_at:iso(-1), updated_at:iso(-1) }],
  dds_attendance:[{ id:'da1', session_id:'d1', user_id:profile.id, status:'Convocado', created_at:iso(-1), updated_at:iso(-1) }],
  courses:[{ id:'c1', title:'NR-35', provider:'Centro Técnico', workload_hours:8, validity_months:24, status:'Ativo', created_at:iso(-24), updated_at:iso(-24) }],
  course_enrollments:[{ id:'ce1', course_id:'c1', user_id:profile.id, status:'Concluído', enrolled_at:iso(-720), completed_at:iso(-600), expires_at:new Date(Date.now()+20*86400000).toISOString().slice(0,10), created_at:iso(-720), updated_at:iso(-600) }],
  documents:[{ id:'doc1', title:'Procedimento de Bombeio', category:'Procedimento', document_number:'POP-OPS-001', revision:'4', issuer:'Operações', issue_date:'2026-01-10', expires_at:'2027-01-10', status:'Válido', visibility_role:'all', created_at:iso(-100), updated_at:iso(-20) }]
};

const mockSupabase = ({ profile, tables }) => {
  window.supabase = {
    createClient() {
      class Query {
        constructor(table) { this.table = table; this.filters = []; }
        select() { return this; }
        eq(key, value) { this.filters.push([key, value]); return this; }
        order() { return this; }
        limit() { return this; }
        maybeSingle() { return Promise.resolve({ data:this.rows()[0] || null, error:null }); }
        single() { return Promise.resolve({ data:this.rows()[0] || null, error:null }); }
        rows() { return (tables[this.table] || []).filter(row => this.filters.every(([key,value]) => row[key] === value)); }
        then(resolve, reject) { return Promise.resolve({ data:this.rows(), error:null }).then(resolve, reject); }
      }
      const channel = { on(){ return this; }, subscribe(callback){ callback('SUBSCRIBED'); return this; } };
      return {
        from:table => new Query(table),
        auth:{ getSession:async()=>({ data:{ session:{ user:{ id:profile.id, email:profile.email } } } }), signOut:async()=>({ error:null }), signInWithPassword:async()=>({ data:{ user:{ id:profile.id, email:profile.email } }, error:null }) },
        channel:()=>channel,
        removeChannel:async()=>{},
        storage:{ from:()=>({ getPublicUrl:()=>({ data:{ publicUrl:'' } }) }) },
        rpc:async()=>({ data:null, error:null })
      };
    }
  };
};

try {
  const routes = ['dashboard','tanks','operations','vessel-registry','trucks','fluids','bulk-movements','inventory','chemicals','maintenance','qhse','dds','documents','reports','handover','alerts','ai-assistant','users','settings','tv'];
  const approvedNavigation = [
    'Visão Geral', 'Planta e Tancagem', 'Operações', 'Programação de Embarcações',
    'Controle de Carretas', 'Movimentação de Fluidos', 'Movimentação de Granéis',
    'Inventário', 'Manutenção', 'QHSE', 'DDS e Cursos', 'Documentos e Certificados',
    'Relatórios', 'Alerta e Comunicação', 'Usuários e Permissões', 'Configurações'
  ];
  const viewports = [{ width:390,height:844 },{ width:1024,height:768 },{ width:1280,height:800 },{ width:1440,height:900 },{ width:1920,height:1080 }];
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.addInitScript(mockSupabase, { profile, tables });
    await page.route('**/*', route => route.request().url().startsWith(`http://127.0.0.1:${port}/`) ? route.continue() : route.abort());
    await page.goto(`http://127.0.0.1:${port}/index.html#dashboard`, { waitUntil:'domcontentloaded' });
    await page.waitForSelector('#appView:not(.hidden)', { timeout:10000 });
    await page.waitForTimeout(300);

    const shell = await page.evaluate(approvedLabels => ({
      dark:document.documentElement.dataset.theme === 'dark',
      overflow:document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
      styles:[...document.querySelectorAll('link[rel="stylesheet"]')].map(link => link.getAttribute('href')),
      navigation:[...document.querySelectorAll('#sidebar nav > .nav-item .nav-label')].map(item => item.textContent.trim()),
      noLegacyLayers:!document.querySelector('.legacy-nav, .nav-section-label, [data-nav-section-toggle]'),
      contextualOutsideSidebar:!document.querySelector('#sidebar [data-page="ai-assistant"], #sidebar [data-page="tv"]'),
      map:Boolean(document.querySelector('.plant-map-card')),
      newRoutes:['bulk-movements','inventory','dds','documents','handover','users'].every(route => document.querySelector(`#page-${route}`)?.innerHTML.trim()),
      approvedNavigation:JSON.stringify([...document.querySelectorAll('#sidebar nav > .nav-item .nav-label')].map(item => item.textContent.trim())) === JSON.stringify(approvedLabels)
    }), approvedNavigation);
    check(`${viewport.width}px tema final escuro`, shell.dark);
    check(`${viewport.width}px sem overflow global`, !shell.overflow);
    check(`${viewport.width}px stylesheet único do Figma`, shell.styles.length === 1 && shell.styles[0].startsWith('opscontrol-native.css'), shell.styles.join(', '));
    check(`${viewport.width}px sem camadas legadas`, shell.noLegacyLayers);
    check(`${viewport.width}px navegação exata do Figma`, shell.approvedNavigation, shell.navigation.join(' | '));
    check(`${viewport.width}px IA e TV fora da sidebar`, shell.contextualOutsideSidebar);
    check(`${viewport.width}px mapa da planta`, shell.map);
    check(`${viewport.width}px novas rotas renderizadas`, shell.newRoutes);

    if (viewport.width === 1440) {
      await page.screenshot({ path:resolve(outputDir, 'dashboard-1440.png'), fullPage:true });
    }
    if (viewport.width === 390) {
      await page.screenshot({ path:resolve(outputDir, 'dashboard-390.png'), fullPage:true });
    }

    if (viewport.width === 1440) {
      for (const route of routes) {
        const activated = await page.evaluate(routeName => {
          const trigger = document.querySelector(`[data-page="${routeName}"], [data-page-link="${routeName}"], [data-mobile-page="${routeName}"]`);
          trigger?.click();
          return Boolean(trigger);
        }, route);
        await page.waitForTimeout(40);
        const state = await page.evaluate(routeName => ({
          active:document.querySelector(`#page-${routeName}`)?.classList.contains('active'),
          error:Boolean(document.querySelector(`#page-${routeName} .module-error-card`))
        }), route);
        check(`rota ${route}`, activated && state.active && !state.error);
        await page.screenshot({ path:resolve(outputDir, 'routes', `${route}.png`), fullPage:true });
      }
    }

    await page.evaluate(() => document.querySelector('[data-page="tanks"]')?.click());
    await page.screenshot({ path:resolve(outputDir, `tancagem-${viewport.width}.png`), fullPage:true });
    if (viewport.width === 1920) {
      await page.evaluate(() => document.querySelector('[data-mobile-page="tv"]')?.click());
      const tv = await page.evaluate(() => ({
        route:document.body.classList.contains('tv-route'),
        operation:Boolean(document.querySelector('.tv-current-operation')),
        critical:Boolean(document.querySelector('.tv-critical-persistent')),
        sidebar:getComputedStyle(document.querySelector('.sidebar')).display
      }));
      check('TV 1920×1080 exclusiva', tv.route && tv.operation && tv.critical && tv.sidebar === 'none');
      await page.screenshot({ path:resolve(outputDir, 'tv-1920.png'), fullPage:true });
    }
    check(`${viewport.width}px sem erros JavaScript`, pageErrors.length === 0, pageErrors.join(' | '));
    await context.close();
  }
} finally {
  await browser.close();
  await new Promise(done => server.close(done));
}

await writeFile(resolve(outputDir, 'report.json'), JSON.stringify(results, null, 2));
for (const item of results) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
if (failed) process.exit(1);
