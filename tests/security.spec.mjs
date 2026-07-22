import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [html, app, config, migration] = await Promise.all([
  readFile(resolve(root, "index.html"), "utf8"),
  readFile(resolve(root, "js/app.js"), "utf8"),
  readFile(resolve(root, "js/config.js"), "utf8"),
  readFile(resolve(root, "supabase/migrations/20260722113000_harden_anonymous_rpc_privileges.sql"), "utf8")
]);

assert.match(html, /id="loginForm"/);
assert.match(html, /id="rememberLogin"/);
assert.match(html, /id="forgotPasswordBtn"/);
assert.match(html, /role="alert" aria-live="polite"/);
assert.match(app, /resetPasswordForEmail/);
assert.match(app, /PASSWORD_RECOVERY/);
assert.match(app, /resolve_login_email/);
assert.doesNotMatch(config, /service_role|sb_secret_/i);
assert.match(config, /sb_publishable_/i);
assert.match(migration, /grant execute on function public\.resolve_login_email\(text\) to anon/i);
assert.match(migration, /revoke execute on all functions in schema public from anon/i);
console.log("PASS autenticação, chave pública e privilégios anônimos verificados.");
