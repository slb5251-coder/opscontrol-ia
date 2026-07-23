import { readFile, writeFile } from 'node:fs/promises';
import { parse } from 'acorn';

const appPath = 'js/app.js';
const source = await readFile(appPath, 'utf8');
const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'script' });
const expression = ast.body.find(node => node.type === 'ExpressionStatement')?.expression;
const body = expression?.callee?.body?.body || [];
const loadNode = body.find(node => node.type === 'FunctionDeclaration' && node.id.name === 'loadData');
if (!loadNode) throw new Error('Função loadData não localizada.');

let extracted = source.slice(loadNode.start, loadNode.end);
extracted = extracted.replace('async function loadData()', 'async function load({ client, user, applySiloCapacityModels })');
extracted = extracted.replace('const c = state.client;', 'const c = client;');
extracted = extracted.replace('const u = state.user;', 'const u = user;');
extracted = extracted.replace('state.data = {', 'const data = {');
extracted = extracted.replaceAll('state.data', 'data');
extracted = extracted.replace('state.lastSync = new Date();', 'return Object.freeze({ data, lastSync: new Date() });');
if (/\bstate\./.test(extracted)) throw new Error(`Referência ao estado permaneceu no módulo extraído: ${extracted.match(/state\.[A-Za-z0-9_.]+/)?.[0] || 'desconhecida'}`);

const moduleSource = `(() => {\n  "use strict";\n\n  const VERSION = "20260723-data-layer-1";\n\n  ${extracted.replaceAll('\n', '\n  ')}\n\n  window.OpsControlData = Object.freeze({ version: VERSION, load });\n})();\n`;
await writeFile('js/app-data.js', moduleSource, 'utf8');

const wrapper = `async function loadData() {\n    const result = await DATA.load({\n      client: state.client,\n      user: state.user,\n      applySiloCapacityModels\n    });\n    state.data = result.data;\n    state.lastSync = result.lastSync;\n  }`;
const next = source.slice(0, loadNode.start) + wrapper + source.slice(loadNode.end);
let app = next.replace('const APP_VERSION = "20260723-auth-session-1";', 'const APP_VERSION = "20260723-data-layer-1";');
app = app.replace('  const AUTH = window.OpsControlAuth;\n', '  const AUTH = window.OpsControlAuth;\n\n  if (!window.OpsControlData) {\n    throw new Error("OpsControlData não foi carregado antes do aplicativo.");\n  }\n  const DATA = window.OpsControlData;\n');
await writeFile(appPath, app, 'utf8');

let index = await readFile('index.html', 'utf8');
index = index.replace(
  '  <script src="js/app-auth.js?v=20260723-auth-session-1"></script>\n  <script src="js/app.js?v=20260723-auth-session-1"></script>',
  '  <script src="js/app-auth.js?v=20260723-auth-session-1"></script>\n  <script src="js/app-data.js?v=20260723-data-layer-1"></script>\n  <script src="js/app.js?v=20260723-data-layer-1"></script>'
);
await writeFile('index.html', index, 'utf8');

let sw = await readFile('sw.js', 'utf8');
sw = sw.replace('const CACHE = "opscontrol-20260723-auth-session-1";', 'const CACHE = "opscontrol-20260723-data-layer-1";');
sw = sw.replace(
  '  "./js/app-auth.js?v=20260723-auth-session-1",\n  "./js/app.js?v=20260723-auth-session-1",',
  '  "./js/app-auth.js?v=20260723-auth-session-1",\n  "./js/app-data.js?v=20260723-data-layer-1",\n  "./js/app.js?v=20260723-data-layer-1",'
);
await writeFile('sw.js', sw, 'utf8');

const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
if (!packageJson.scripts.test.includes('test:data-layer')) {
  packageJson.scripts.test = packageJson.scripts.test.replace('npm run test:auth-session &&', 'npm run test:auth-session && npm run test:data-layer &&');
}
packageJson.scripts['test:data-layer'] = 'node tests/data-layer.spec.mjs';
await writeFile('package.json', JSON.stringify(packageJson, null, 2) + '\n', 'utf8');

console.log('Camada de dados extraída com sucesso.');
