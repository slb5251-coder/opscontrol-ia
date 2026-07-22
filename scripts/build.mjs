import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const files = [
  'index.html', 'app.css', 'v33.css', 'opscontrol-ui.css', 'figma-interface.css',
  'assistente-integrado.css', 'figma-final.css', 'manifest.json', 'sw.js'
];
const directories = ['assets', 'js', 'vendor'];

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const file of files) await cp(resolve(root, file), resolve(dist, file));
for (const directory of directories) await cp(resolve(root, directory), resolve(dist, directory), { recursive: true });

const marker = {
  name: 'OPSControl IA',
  builtAt: new Date().toISOString(),
  basePath: './',
  entrypoint: 'index.html'
};
await writeFile(resolve(dist, 'build.json'), `${JSON.stringify(marker, null, 2)}\n`);

const builtHtml = await readFile(resolve(dist, 'index.html'), 'utf8');
if (!builtHtml.includes('figma-final.css') || !builtHtml.includes('js/app.js')) {
  throw new Error('O bundle de produção não contém os arquivos finais esperados.');
}
console.log('Build estático criado em dist/ com base relativa ./ para GitHub Pages.');
