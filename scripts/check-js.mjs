import { readdir } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const ignored = new Set(["node_modules", "dist", "test-results", "vendor"]);

async function javascriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (ignored.has(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await javascriptFiles(path));
    else if (/\.(?:js|mjs)$/.test(entry.name)) files.push(path);
  }
  return files;
}

const files = await javascriptFiles(root);
for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    process.exit(result.status || 1);
  }
}
console.log(`OK ${files.length} arquivos JavaScript verificados.`);
