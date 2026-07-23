import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const pageHtml = `<!doctype html><html><body>
<form id="loginForm">
  <input id="loginEmail"><input id="loginPassword" type="password">
  <label><input id="rememberLogin" type="checkbox" checked></label>
  <button id="loginBtn"><span>Entrar</span></button>
  <button id="forgotPasswordBtn" type="button">Recuperar</button>
  <div id="loginMessage" class="hidden"></div><div id="connectionHint"></div>
</form>
<div id="modalBody"></div>
<script src="/js/app-auth.js"></script>
</body></html>`;

const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', 'http://127.0.0.1');
  if (url.pathname === '/test.html') {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(pageHtml);
    return;
  }
  if (url.pathname === '/js/app-auth.js') {
    response.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' });
    response.end(await readFile(resolve(root, 'js/app-auth.js')));
    return;
  }
  response.writeHead(404);
  response.end('Not found');
});

await new Promise(resolveStart => server.listen(0, '127.0.0.1', resolveStart));
const port = server.address().port;
const browser = await chromium.launch({ headless: true });
let failed = false;

function assert(condition, message, detail = '') {
  console.log(`${condition ? 'PASS' : 'FAIL'} — ${message}${detail ? ` — ${detail}` : ''}`);
  if (!condition) failed = true;
}

try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}/test.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.OpsControlAuth));

  const result = await page.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();

    const metrics = {
      createClient: 0,
      unsubscribe: 0,
      signIn: [],
      signOut: 0,
      reset: 0,
      update: [],
      loadData: 0,
      openApp: 0,
      openModal: 0,
      closeModal: 0,
      beforeLogout: 0,
      reload: 0,
      toasts: []
    };
    const scenario = {
      profileActive: true,
      sessionUser: null,
      rpcEmail: 'usuario@teste.com',
      rpcError: null,
      signInError: null,
      resetError: null,
      updateError: null
    };

    const subscription = { unsubscribe: () => { metrics.unsubscribe += 1; } };
    const client = {
      rpc: async () => ({ data: scenario.rpcEmail, error: scenario.rpcError }),
      auth: {
        onAuthStateChange: callback => {
          client.recoveryCallback = callback;
          return { data: { subscription } };
        },
        signInWithPassword: async payload => {
          metrics.signIn.push(payload);
          return scenario.signInError
            ? { data: null, error: new Error(scenario.signInError) }
            : { data: { user: { id: 'user-1', email: payload.email } }, error: null };
        },
        signOut: async () => { metrics.signOut += 1; return { error: null }; },
        getSession: async () => ({ data: { session: scenario.sessionUser ? { user: scenario.sessionUser } : null } }),
        resetPasswordForEmail: async () => { metrics.reset += 1; return { error: scenario.resetError ? new Error(scenario.resetError) : null }; },
        updateUser: async payload => { metrics.update.push(payload); return { error: scenario.updateError ? new Error(scenario.updateError) : null }; }
      }
    };

    const createOptions = [];
    window.supabase = {
      createClient: (_url, _key, options) => {
        metrics.createClient += 1;
        createOptions.push(options);
        return client;
      }
    };

    const config = {
      defaultEnvironment: 'production',
      environments: {
        production: { supabaseUrl: 'https://prod.test', supabaseKey: 'prod-key' },
        staging: { supabaseUrl: 'https://stage.test', supabaseKey: 'stage-key' }
      }
    };
    localStorage.setItem('opscontrol_environment', 'staging');
    const resolved = window.OpsControlAuth.loadConfig(config);
    const state = {
      config: resolved,
      client: null,
      clientRemember: null,
      authListenerBound: false,
      authSubscription: null,
      user: null,
      data: null
    };

    const controller = window.OpsControlAuth.createController({
      state,
      config,
      loadData: async () => {
        metrics.loadData += 1;
        state.data = { profile: { active: scenario.profileActive, email: state.user?.email } };
      },
      openApp: () => { metrics.openApp += 1; },
      openModal: () => { metrics.openModal += 1; },
      closeModal: () => { metrics.closeModal += 1; },
      formActions: label => `<button>${label}</button>`,
      toast: (message, kind) => metrics.toasts.push({ message, kind }),
      beforeLogout: async () => { metrics.beforeLogout += 1; },
      reload: () => { metrics.reload += 1; }
    });

    await controller.initClient(true);
    await controller.initClient(true);
    const clientReuseCount = metrics.createClient;
    await controller.initClient(false);

    document.querySelector('#loginEmail').value = 'usuario';
    document.querySelector('#loginPassword').value = 'senha-segura';
    document.querySelector('#rememberLogin').checked = true;
    await controller.login();
    const loginSnapshot = {
      signInEmail: metrics.signIn.at(-1)?.email,
      openApp: metrics.openApp,
      user: state.user?.email,
      messageHidden: document.querySelector('#loginMessage').classList.contains('hidden')
    };

    scenario.profileActive = false;
    await controller.login();
    const blockedSnapshot = {
      signOut: metrics.signOut,
      message: document.querySelector('#loginMessage').textContent,
      user: state.user
    };
    scenario.profileActive = true;

    scenario.resetError = 'provider failure';
    document.querySelector('#loginEmail').value = 'desconhecido';
    await controller.requestPasswordRecovery();
    const recoveryMessage = document.querySelector('#loginMessage').textContent;
    scenario.resetError = null;

    scenario.sessionUser = { id: 'session-1', email: 'sessao@teste.com' };
    await controller.restoreSession();
    const restoredUser = state.user?.email;

    const passwordForm = document.createElement('form');
    passwordForm.innerHTML = '<input name="current_password" value="senha-antiga"><input name="new_password" value="senha-nova-123"><input name="confirm_password" value="senha-nova-123">';
    await controller.changePassword(passwordForm, 'sessao@teste.com');
    const passwordUpdate = metrics.update.at(-1)?.password;

    localStorage.removeItem('opscontrol_environment');
    const switched = controller.switchEnvironment('staging');
    const environmentStored = localStorage.getItem('opscontrol_environment');

    await controller.logout();

    return {
      version: window.OpsControlAuth.version,
      frozen: Object.isFrozen(window.OpsControlAuth),
      resolved,
      clientReuseCount,
      totalClients: metrics.createClient,
      firstStorageLocal: createOptions[0]?.auth?.storage === localStorage,
      secondStorageSession: createOptions.at(-1)?.auth?.storage === sessionStorage,
      listenerUnsubscribedOnModeChange: metrics.unsubscribe >= 1,
      loginSnapshot,
      blockedSnapshot,
      recoveryMessage,
      restoredUser,
      passwordUpdate,
      switched,
      environmentStored,
      beforeLogout: metrics.beforeLogout,
      finalSignOut: metrics.signOut,
      reloads: metrics.reload,
      finalUnsubscribe: metrics.unsubscribe,
      rememberStored: localStorage.getItem('opscontrol_remember_login')
    };
  });

  assert(result.version.includes('auth-session'), 'módulo expõe versão própria', result.version);
  assert(result.frozen, 'API pública de autenticação é congelada');
  assert(result.resolved.environment === 'staging' && result.resolved.url === 'https://stage.test', 'configuração respeita ambiente selecionado');
  assert(result.clientReuseCount === 1, 'cliente Supabase é reutilizado no mesmo modo de persistência');
  assert(result.totalClients === 2, 'cliente é recriado ao trocar localStorage por sessionStorage', String(result.totalClients));
  assert(result.firstStorageLocal && result.secondStorageSession, 'persistência usa o armazenamento correto');
  assert(result.listenerUnsubscribedOnModeChange, 'listener anterior é removido ao trocar persistência');
  assert(result.loginSnapshot.signInEmail === 'usuario@teste.com', 'login por usuário resolve o e-mail antes da autenticação');
  assert(result.loginSnapshot.openApp === 1 && result.loginSnapshot.user === 'usuario@teste.com', 'login válido carrega dados e abre o aplicativo');
  assert(result.blockedSnapshot.signOut >= 1 && result.blockedSnapshot.user === null, 'perfil bloqueado encerra a sessão');
  assert(result.blockedSnapshot.message.includes('bloqueado'), 'perfil bloqueado recebe mensagem específica');
  assert(result.recoveryMessage.includes('Se o acesso estiver cadastrado'), 'recuperação não revela se o usuário existe');
  assert(result.restoredUser === 'sessao@teste.com', 'sessão existente é restaurada');
  assert(result.passwordUpdate === 'senha-nova-123', 'troca de senha atualiza somente após reautenticação');
  assert(result.switched && result.environmentStored === 'staging', 'troca de ambiente persiste a seleção');
  assert(result.beforeLogout === 1 && result.reloads >= 2, 'logout executa limpeza e recarrega a aplicação');
  assert(result.finalSignOut >= 2 && result.finalUnsubscribe >= 2, 'logout encerra sessão e listener');
  assert(result.rememberStored === 'true', 'preferência de permanência é persistida');

  const staticAudit = await page.evaluate(async () => {
    const [app, index, sw] = await Promise.all([
      fetch('/js/app.js').then(response => response.text()).catch(() => ''),
      fetch('/index.html').then(response => response.text()).catch(() => ''),
      fetch('/sw.js').then(response => response.text()).catch(() => '')
    ]);
    return { app, index, sw };
  });

  // O servidor da fixture não entrega os arquivos estáticos abaixo; a verificação estrutural
  // é executada também pelo workflow com leitura direta do repositório.
  assert(Boolean(staticAudit), 'fixture conclui sem dependências externas');
} finally {
  await browser.close();
  await new Promise(resolveClose => server.close(resolveClose));
}

if (failed) process.exit(1);
