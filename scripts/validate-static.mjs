import { readFile, access } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = await readFile(resolve(root, "index.html"), "utf8");
const app = await readFile(resolve(root, "js/app.js"), "utf8");
const auth = await readFile(resolve(root, "js/app-auth.js"), "utf8");
const config = await readFile(resolve(root, "js/config.js"), "utf8");
const migration = await readFile(resolve(root, "supabase/migrations/20260722113000_harden_anonymous_rpc_privileges.sql"), "utf8");

const failures = [];
const localSources = [...html.matchAll(/(?:src|href)="([^"?#]+)(?:[?#][^"]*)?"/g)]
  .map(match => match[1])
  .filter(path => !/^(?:https?:|#|data:)/.test(path));
for (const source of localSources) {
  try { await access(resolve(root, source)); }
  catch { failures.push(`Arquivo referenciado não existe: ${source}`); }
}

for (const id of ["loginForm", "togglePasswordBtn", "rememberLogin", "forgotPasswordBtn", "loginMessage"]) {
  if (!html.includes(`id="${id}"`)) failures.push(`Controle obrigatório ausente: ${id}`);
}

const coreIndex = html.indexOf("js/app-core.js");
const authIndex = html.indexOf("js/app-auth.js");
const appIndex = html.indexOf("js/app.js");
if (coreIndex < 0 || authIndex <= coreIndex || appIndex <= authIndex) {
  failures.push("Ordem obrigatória dos scripts: app-core.js, app-auth.js e app.js.");
}
if (!app.includes("window.OpsControlAuth")) failures.push("Aplicativo não está conectado ao módulo de autenticação.");
if (!auth.includes("resetPasswordForEmail")) failures.push("Recuperação de senha não implementada no módulo de autenticação.");
if (!auth.includes("PASSWORD_RECOVERY")) failures.push("Retorno de recuperação não tratado no módulo de autenticação.");
if (!auth.includes("Se o acesso estiver cadastrado")) failures.push("Recuperação de senha pode permitir enumeração de usuários.");
if (/service_role|sb_secret_/i.test(config)) failures.push("Chave secreta encontrada no cliente público.");
if (!/sb_publishable_/i.test(config)) failures.push("Use uma chave publicável no cliente.");
if (!migration.includes("revoke execute on all functions in schema public from anon")) failures.push("Migration não revoga execução anônima por padrão.");
if (failures.length) {
  failures.forEach(item => console.error(`ERRO ${item}`));
  process.exit(1);
}
console.log(`OK ${new Set(localSources).size} assets, autenticação modular e privilégios validados.`);
