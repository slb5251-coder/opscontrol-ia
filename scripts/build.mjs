import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");
const ignored = new Set([".git", "node_modules", "dist", "scripts", "supabase", "test-results", "tests"]);

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const entry of await readdir(root, { withFileTypes: true })) {
  if (ignored.has(entry.name)) continue;
  await cp(resolve(root, entry.name), resolve(dist, entry.name), { recursive: true });
}
console.log("Build de produção criado em dist/.");
