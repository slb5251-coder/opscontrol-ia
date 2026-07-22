import { access, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = await readFile(resolve(root, 'index.html'), 'utf8');
const app = await readFile(resolve(root, 'js/app.js'), 'utf8');
const native = await readFile(resolve(root, 'js/opscontrol-native.js'), 'utf8');
const css = await readFile(resolve(root, 'opscontrol-native.css'), 'utf8');

const requiredPages = [
  'dashboard', 'tv', 'operations', 'vessel-registry', 'tanks', 'fluids', 'bulk-movements', 'inventory', 'chemicals', 'trucks',
  'qhse', 'maintenance', 'dds', 'documents', 'alerts', 'ai-assistant', 'reports', 'handover',
  'users', 'settings'
];

const errors = [];
for (const page of requiredPages) {
  if (!html.includes(`id="page-${page}"`)) errors.push(`Rota ausente: ${page}`);
}

const references = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map(match => match[1])
  .filter(value => !/^(?:https?:|#|data:|mailto:|tel:)/.test(value))
  .map(value => value.split('?')[0].split('#')[0])
  .filter(Boolean);

for (const reference of new Set(references)) {
  try { await access(resolve(root, reference)); }
  catch { errors.push(`Arquivo referenciado não existe: ${reference}`); }
}

if (/service[_-]?role|sk-proj-|sk-[A-Za-z0-9]{20,}/i.test(`${app}\n${native}`)) {
  errors.push('Possível segredo encontrado no bundle principal.');
}
if (!css.includes('prefers-reduced-motion')) {
  errors.push('Suporte a prefers-reduced-motion ausente.');
}

if (errors.length) {
  errors.forEach(error => console.error(`ERRO ${error}`));
  process.exit(1);
}

console.log(`OK ${requiredPages.length} rotas e ${new Set(references).size} arquivos locais validados.`);
