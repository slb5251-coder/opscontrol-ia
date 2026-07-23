import { readFile, writeFile } from 'node:fs/promises';
import { parse } from 'acorn';

const source = await readFile('js/app.js', 'utf8');
const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'script', locations: true });
const expression = ast.body.find(node => node.type === 'ExpressionStatement')?.expression;
const iifeBody = expression?.callee?.body?.body || [];
const functions = iifeBody.filter(node => node.type === 'FunctionDeclaration');
const byName = new Map(functions.map(node => [node.id.name, node]));

function identifiers(node, result = new Set()) {
  if (!node || typeof node !== 'object') return result;
  if (node.type === 'Identifier') result.add(node.name);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(item => identifiers(item, result));
    else if (value && typeof value === 'object' && !('start' in value && 'end' in value && value === node)) identifiers(value, result);
  }
  return result;
}

function directCalls(node) {
  const calls = new Set();
  function visit(value) {
    if (!value || typeof value !== 'object') return;
    if (value.type === 'CallExpression' && value.callee?.type === 'Identifier') calls.add(value.callee.name);
    for (const child of Object.values(value)) {
      if (Array.isArray(child)) child.forEach(visit);
      else if (child && typeof child === 'object' && child !== value) visit(child);
    }
  }
  visit(node);
  return [...calls].filter(name => byName.has(name)).sort();
}

const patterns = /load|fetch|refresh|sync|map|normal|transform|query|select|profile|data/i;
const selected = functions.filter(node => patterns.test(node.id.name) || /\.from\(|\.rpc\(|state\.data|Promise\.all/.test(source.slice(node.start, node.end)));

const rows = selected.map(node => ({
  name: node.id.name,
  start: node.loc.start.line,
  end: node.loc.end.line,
  calls: directCalls(node),
  identifiers: [...identifiers(node)].filter(name => ['state','CONFIG','AUTH','REALTIME_TABLES'].includes(name)).sort(),
  source: source.slice(node.start, node.end)
}));

const report = [
  '# Mapa da camada de dados',
  '',
  `Funções top-level encontradas: **${functions.length}**`,
  `Funções candidatas: **${rows.length}**`,
  '',
  ...rows.flatMap(row => [
    `## ${row.name}`,
    '',
    `- Linhas: ${row.start}-${row.end}`,
    `- Chamadas internas: ${row.calls.join(', ') || 'nenhuma'}`,
    `- Dependências globais principais: ${row.identifiers.join(', ') || 'nenhuma'}`,
    '',
    '```js',
    row.source,
    '```',
    ''
  ])
];

await writeFile('docs/DATA_LAYER_REPORT.md', report.join('\n'), 'utf8');
console.log(`Relatório gerado com ${rows.length} funções candidatas.`);
