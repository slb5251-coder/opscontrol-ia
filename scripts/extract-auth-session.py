from pathlib import Path
import json

APP_PATH = Path("js/app.js")
INDEX_PATH = Path("index.html")
SW_PATH = Path("sw.js")
PACKAGE_PATH = Path("package.json")


def matching_brace(text: str, start: int) -> int:
    depth = 0
    quote = None
    escape = False
    line_comment = False
    block_comment = False
    i = start
    while i < len(text):
        ch = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ""
        if line_comment:
            if ch == "\n":
                line_comment = False
            i += 1
            continue
        if block_comment:
            if ch == "*" and nxt == "/":
                block_comment = False
                i += 2
                continue
            i += 1
            continue
        if quote:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == quote:
                quote = None
            i += 1
            continue
        if ch == "/" and nxt == "/":
            line_comment = True
            i += 2
            continue
        if ch == "/" and nxt == "*":
            block_comment = True
            i += 2
            continue
        if ch in ('"', "'", "`"):
            quote = ch
            i += 1
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return i
        i += 1
    raise RuntimeError("Bloco JavaScript sem fechamento")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f"Trecho não localizado: {label}")
    return text.replace(old, new, 1)


def replace_block(text: str, marker: str, replacement: str, label: str) -> str:
    start = text.find(marker)
    if start < 0:
        raise RuntimeError(f"Bloco não localizado: {label}")
    open_brace = text.find("{", start)
    if open_brace < 0:
        raise RuntimeError(f"Abertura não localizada: {label}")
    close_brace = matching_brace(text, open_brace)
    return text[:start] + replacement + text[close_brace + 1:]


app = APP_PATH.read_text(encoding="utf-8")

for constant in [
    '  const CONFIG_KEY = "opscontrol_config";\n',
    '  const APP_ENV_KEY = "opscontrol_environment";\n',
    '  const REMEMBER_LOGIN_KEY = "opscontrol_remember_login";\n',
]:
    if constant not in app:
        raise RuntimeError(f"Constante esperada não localizada: {constant.strip()}")
    app = app.replace(constant, "", 1)

app = replace_once(
    app,
    '  const APP_VERSION = "20260723-app-core-1";',
    '  const APP_VERSION = "20260723-auth-session-1";',
    "versão do aplicativo",
)

app = replace_once(
    app,
    '  const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });\n\n  const state = {',
    '  const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });\n\n  if (!window.OpsControlAuth) {\n    throw new Error("OpsControlAuth não foi carregado antes do aplicativo.");\n  }\n  const AUTH = window.OpsControlAuth;\n\n  const state = {',
    "trava do módulo de autenticação",
)

app = replace_once(
    app,
    '    authListenerBound: false,\n    user: null,',
    '    authListenerBound: false,\n    authSubscription: null,\n    user: null,',
    "estado da assinatura de autenticação",
)
app = replace_once(app, '    config: loadConfig()\n', '    config: AUTH.loadConfig(CONFIG)\n', "configuração do estado")

load_config = '''  function loadConfig() {
    const saved = JSON.parse(localStorage.getItem(CONFIG_KEY) || "{}");
    const environment = localStorage.getItem(APP_ENV_KEY) || CONFIG.defaultEnvironment || "production";
    const selected = CONFIG.environments?.[environment] || {};
    return {
      url: saved.url || selected.supabaseUrl || CONFIG.supabaseUrl || "",
      key: saved.key || selected.supabaseKey || CONFIG.supabaseKey || "",
      environment
    };
  }

'''
app = replace_once(app, load_config, "", "função loadConfig")

login_helpers = '''  function showLoginMessage(message, kind = "error") {
    const el = $("#loginMessage");
    el.textContent = message;
    el.classList.toggle("success", kind === "success");
    el.classList.remove("hidden");
  }

  function clearLoginMessage() {
    const el = $("#loginMessage");
    el.textContent = "";
    el.classList.remove("success");
    el.classList.add("hidden");
  }

  function setLoginLoading(loading, label = "Entrando...") {
    const button = $("#loginBtn");
    if (!button) return;
    button.disabled = loading;
    button.classList.toggle("is-loading", loading);
    const text = button.querySelector("span");
    if (text) text.textContent = loading ? label : "Entrar";
  }

'''
app = replace_once(app, login_helpers, "", "helpers visuais do login")

auth_start = app.find("  async function initClient(")
auth_end = app.find("  async function loadData()", auth_start)
if auth_start < 0 or auth_end < 0:
    raise RuntimeError("Bloco principal de autenticação não localizado")
controller = '''  const authController = AUTH.createController({
    state,
    config: CONFIG,
    loadData,
    openApp,
    openModal,
    closeModal,
    formActions,
    toast,
    beforeLogout: async () => {
      clearTimeout(state.refreshDebounce);
      clearInterval(state.refreshTimer);
      stopTvMode();
      if (state.realtime && state.client) await state.client.removeChannel(state.realtime);
      state.realtime = null;
    }
  });

  const {
    showLoginMessage,
    clearLoginMessage,
    initClient,
    resolveLoginEmail,
    openPasswordRecovery,
    requestPasswordRecovery,
    login,
    restoreSession,
    logout
  } = authController;

'''
app = app[:auth_start] + controller + app[auth_end:]

app = replace_block(app, "  async function logout()", "", "função logout duplicada")

app = replace_once(
    app,
    '''      if (state.data.profile.active === false) {
        await state.client.auth.signOut();
        location.reload();
        return false;
      }''',
    '''      if (state.data.profile.active === false) {
        await authController.signOutAndReload();
        return false;
      }''',
    "invalidação de sessão no refresh",
)

app = replace_block(
    app,
    '    if (form.id === "passwordRecoveryForm")',
    '    if (form.id === "passwordRecoveryForm") return authController.completePasswordRecovery(form);',
    "envio de recuperação de senha",
)

profile_replacement = '''      if (form.id === "profilePasswordForm") {
        await authController.changePassword(form, state.user?.email || state.data.profile.email);
        clearFormDraft(form);
        closeModal();
        toast("Senha alterada com sucesso.", "success");
        return;
      }'''
app = replace_block(app, '      if (form.id === "profilePasswordForm")', profile_replacement, "troca de senha do perfil")

switch_replacement = '''    if (action === "switch-environment") {
      authController.switchEnvironment(button.dataset.environment);
      return;
    }'''
app = replace_block(app, '    if (action === "switch-environment")', switch_replacement, "troca de ambiente")

app = replace_once(
    app,
    '''  $("#rememberLogin").checked = localStorage.getItem(REMEMBER_LOGIN_KEY) !== "false";
  $("#connectionHint").textContent = "Acesse com seu e-mail ou usuário e senha cadastrados.";
  restoreSession();''',
    '  authController.initializeLogin();',
    "inicialização do login",
)

for forbidden in [
    "function loadConfig(",
    "function showLoginMessage(",
    "function clearLoginMessage(",
    "function setLoginLoading(",
    "function initClient(",
    "function resolveLoginEmail(",
    "function openPasswordRecovery(",
    "function requestPasswordRecovery(",
    "function login(",
    "function restoreSession(",
    "function logout(",
    "APP_ENV_KEY",
    "REMEMBER_LOGIN_KEY",
    "CONFIG_KEY",
]:
    if forbidden in app:
        raise RuntimeError(f"Símbolo de autenticação duplicado permaneceu no app.js: {forbidden}")

APP_PATH.write_text(app, encoding="utf-8")

index = INDEX_PATH.read_text(encoding="utf-8")
index = replace_once(
    index,
    '  <script src="js/app-core.js?v=20260723-app-core-1"></script>\n  <script src="js/app.js?v=20260723-app-core-1"></script>',
    '  <script src="js/app-core.js?v=20260723-app-core-1"></script>\n  <script src="js/app-auth.js?v=20260723-auth-session-1"></script>\n  <script src="js/app.js?v=20260723-auth-session-1"></script>',
    "ordem dos scripts no HTML",
)
INDEX_PATH.write_text(index, encoding="utf-8")

sw = SW_PATH.read_text(encoding="utf-8")
sw = replace_once(sw, 'const CACHE = "opscontrol-20260723-app-core-1";', 'const CACHE = "opscontrol-20260723-auth-session-1";', "versão do cache")
sw = replace_once(
    sw,
    '  "./js/app-core.js?v=20260723-app-core-1",\n  "./js/app.js?v=20260723-app-core-1",',
    '  "./js/app-core.js?v=20260723-app-core-1",\n  "./js/app-auth.js?v=20260723-auth-session-1",\n  "./js/app.js?v=20260723-auth-session-1",',
    "arquivos principais do cache",
)
SW_PATH.write_text(sw, encoding="utf-8")

package = json.loads(PACKAGE_PATH.read_text(encoding="utf-8"))
scripts = package.setdefault("scripts", {})
current = scripts.get("test", "")
if "npm run test:auth-session" not in current:
    current = current.replace("npm run test:app-core &&", "npm run test:app-core && npm run test:auth-session &&")
scripts["test"] = current
scripts["test:auth-session"] = "node tests/auth-session.spec.mjs"
PACKAGE_PATH.write_text(json.dumps(package, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

print("Autenticação e sessão extraídas do app.js com sucesso.")
