import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const coreSource = await readFile(resolve(root, 'js/app-core.js'), 'utf8');
const appSource = await readFile(resolve(root, 'js/app.js'), 'utf8');
const indexSource = await readFile(resolve(root, 'index.html'), 'utf8');

const sandbox = {
  window: {},
  crypto: { randomUUID: () => '00000000-0000-4000-8000-000000000000' },
  Intl,
  Date,
  Math,
  Object,
  String,
  Number,
  console
};
vm.createContext(sandbox);
vm.runInContext(coreSource, sandbox, { filename: 'app-core.js' });

const core = sandbox.window.OpsControlCore;
let failed = false;
const assert = (condition, message, detail = '') => {
  console.log(`${condition ? 'PASS' : 'FAIL'} — ${message}${detail ? ` — ${detail}` : ''}`);
  if (!condition) failed = true;
};

assert(Boolean(core), 'núcleo é publicado em window.OpsControlCore');
assert(Object.isFrozen(core), 'API pública do núcleo é congelada');
assert(core?.version === '20260723-app-core-1', 'versão do núcleo é explícita', core?.version || 'ausente');
assert(core?.esc('<b>"teste" & ação</b>') === '&lt;b&gt;&quot;teste&quot; &amp; ação&lt;/b&gt;', 'escape HTML preserva texto e bloqueia marcação');
assert(core?.userInitials('João Victor Corrêa') === 'JV', 'iniciais usam os dois primeiros nomes');
assert(core?.profileAvatarHtml('', 'João Victor').includes('JV'), 'avatar possui fallback por iniciais');
assert(core?.uiIcon('anchor').includes('<svg') && core.uiIcon('anchor').includes('M12 3v15'), 'ícones SVG continuam disponíveis');
assert(core?.uid('teste') === 'teste-00000000-0000-4000-8000-000000000000', 'identificador usa prefixo e UUID');
assert(core?.normalizeSearch('  São João ÁÇÚ  ') === 'sao joao acu', 'normalização remove acentos e espaços');
assert(core?.isCriticalAlert('Crítica') === true && core.isCriticalAlert('Baixa') === false, 'classificação de alerta crítico permanece compatível');
assert(core?.recordDateKey('2026-07-23') === '2026-07-23', 'chave de data pronta não é alterada');
assert(core?.addDaysToDateKey('2026-07-23', 2) === '2026-07-25', 'adição de dias permanece determinística');
assert(core?.MOBILE_PAGE_META?.dashboard?.[0] === 'Início', 'metadados mobile foram extraídos');
assert(core?.DESKTOP_PAGE_META?.operations?.[0] === 'Operações', 'metadados desktop foram extraídos');

const coreIndex = indexSource.indexOf('js/app-core.js');
const appIndex = indexSource.indexOf('js/app.js');
assert(coreIndex >= 0 && appIndex > coreIndex, 'app-core é carregado antes do app.js');
assert(appSource.includes('window.OpsControlCore'), 'app.js consome a API compartilhada');
assert(!appSource.includes('const UI_ICONS ='), 'ícones não permanecem duplicados no app.js');
assert(!appSource.includes('function normalizeSearch('), 'normalização não permanece duplicada no app.js');
assert(!appSource.includes('const MOBILE_PAGE_META ='), 'metadados não permanecem duplicados no app.js');

if (failed) process.exit(1);
