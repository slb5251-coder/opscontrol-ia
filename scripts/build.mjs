import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const files = [
  'index.html',
  'opscontrol-native.css',
  'manifest.json',
  'sw.js',
  'js/config.js',
  'js/opscontrol-native.js',
  'js/app.js',
  'js/assistente-integrado.js',
  'vendor/qrcode.js'
];
const directories = ['assets'];

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const file of files) {
  const target = resolve(dist, file);
  await mkdir(dirname(target), { recursive: true });
  await cp(resolve(root, file), target);
}
for (const directory of directories) await cp(resolve(root, directory), resolve(dist, directory), { recursive: true });

const marker = {
  name: 'OPSControl IA',
  builtAt: new Date().toISOString(),
  basePath: './',
  entrypoint: 'index.html'
};
await writeFile(resolve(dist, 'build.json'), `${JSON.stringify(marker, null, 2)}\n`);

const builtHtml = await readFile(resolve(dist, 'index.html'), 'utf8');
if (!builtHtml.includes('opscontrol-native.css') || !builtHtml.includes('js/opscontrol-native.js') || !builtHtml.includes('js/app.js')) {
  throw new Error('O bundle de produção não contém os arquivos finais esperados.');
}
console.log('Build estático criado em dist/ com base relativa ./ para GitHub Pages.');
