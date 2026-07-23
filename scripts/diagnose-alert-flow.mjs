import { readFile, writeFile } from 'node:fs/promises';

const source = await readFile('js/app.js', 'utf8');
const lines = source.split('\n');
const patterns = [
  /function\s+genericForm\b/,
  /function\s+renderAlerts\b/,
  /form\.dataset\.kind/,
  /kind\s*===\s*["']alert["']/,
  /genericForm\(["']alert["']/,
  /from\(["']alerts["']\)/,
  /target_user_id/,
  /target_group/
];
const hits = [];
for (let index = 0; index < lines.length; index += 1) {
  if (!patterns.some(pattern => pattern.test(lines[index]))) continue;
  const start = Math.max(0, index - 18);
  const end = Math.min(lines.length, index + 35);
  hits.push({ line: index + 1, text: lines.slice(start, end).map((line, offset) => `${start + offset + 1}: ${line}`).join('\n') });
}
const report = ['# Diagnóstico do fluxo de alerta', '', ...hits.flatMap(hit => [`## Linha ${hit.line}`, '', '```js', hit.text, '```', ''])];
await writeFile('docs/ALERT_FLOW_DIAG.md', report.join('\n'), 'utf8');
console.log(`Gerados ${hits.length} blocos de diagnóstico.`);
