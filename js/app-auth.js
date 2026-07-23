(() => {
  "use strict";

  const VERSION = "20260723-auth-session-1";
  const CONFIG_KEY = "opscontrol_config";
  const ENVIRONMENT_KEY = "opscontrol_environment";
  const REMEMBER_KEY = "opscontrol_remember_login";

  function safeJson(value, fallback = {}) {
    try {
      const parsed = JSON.parse(value || "{}");
      return parsed && typeof parsed === "object" ? parsed : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function loadConfig(config = {}, storage = window.localStorage) {
    const saved = safeJson(storage.getItem(CONFIG_KEY), {});
    const environment = storage.getItem(ENVIRONMENT_KEY) || config.defaultEnvironment || "production";
    const selected = config.environments?.[environment] || {};
    return Object.freeze({
      url: saved.url || selected.supabaseUrl || config.supabaseUrl || "",
      key: saved.key || selected.supabaseKey || config.supabaseKey || "",
      environment
    });
  }

  function createController(options = {}) {
    const {
      state,
      config = window.OPSCONTROL_CONFIG || {},
      localStorage = window.localStorage,
      sessionStorage = window.sessionStorage,
      location = window.location,
      document = window.document,
      getSupabase = () => window.supabase,
      loadData,
      openApp,
      openModal,
      closeModal,
      formActions,
      toast,
      beforeLogout = async () => {},
      reload = () => location.reload()
    } = options;

    if (!state || typeof state !== "object") throw new Error("Estado do aplicativo não informado ao módulo de autenticação.");
    for (const [name, value] of Object.entries({ loadData, openApp, openModal, closeModal, formActions, toast })) {
      if (typeof value !== "function") throw new Error(`Dependência de autenticação inválida: ${name}.`);
    }

    const query = selector => document.querySelector(selector);

    function showLoginMessage(message, kind = "error") {
      const element = query("#loginMessage");
      if (!element) return;
      element.textContent = String(message || "");
      element.classList.toggle("success", kind === "success");
      element.classList.remove("hidden");
    }

    function clearLoginMessage() {
      const element = query("#loginMessage");
      if (!element) return;
      element.textContent = "";
      element.classList.remove("success");
      element.classList.add("hidden");
    }

    function setLoginLoading(loading, label = "Entrando...") {
      const button = query("#loginBtn");
      if (!button) return;
      button.disabled = Boolean(loading);
      button.classList.toggle("is-loading", Boolean(loading));
      const text = button.querySelector("span");
      if (text) text.textContent = loading ? label : "Entrar";
    }

    function rememberPreference() {
      return localStorage.getItem(REMEMBER_KEY) !== "false";
    }

    function setRememberPreference(value) {
      localStorage.setItem(REMEMBER_KEY, String(Boolean(value)));
    }

    function disposeAuthListener() {
      try {
        state.authSubscription?.unsubscribe?.();
      } catch (_) {}
      state.authSubscription = null;
      state.authListenerBound = false;
    }

    async function initClient(remember = rememberPreference()) {
      if (!state.config?.url || !state.config?.key || !getSupabase()) {
        throw new Error("A conexão do sistema não está configurada.");
      }

      if (!state.client || state.clientRemember !== remember) {
        disposeAuthListener();
        state.clientRemember = remember;
        state.client = getSupabase().createClient(state.config.url, state.config.key, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storage: remember ? localStorage : sessionStorage,
            storageKey: remember ? "opscontrol-auth" : "opscontrol-auth-session"
          }
        });
      }

      if (!state.authListenerBound) {
        const result = state.client.auth.onAuthStateChange(event => {
          if (event === "PASSWORD_RECOVERY") setTimeout(openPasswordRecovery, 0);
        });
        state.authSubscription = result?.data?.subscription || result?.subscription || null;
        state.authListenerBound = true;
      }
      return state.client;
    }

    async function resolveLoginEmail(identifier) {
      const normalized = String(identifier || "").trim();
      if (!normalized) throw new Error("Credenciais inválidas.");
      if (normalized.includes("@")) return normalized.toLowerCase();
      const { data, error } = await state.client.rpc("resolve_login_email", { p_identifier: normalized });
      if (error || !data) throw new Error("Credenciais inválidas.");
      return String(data).trim().toLowerCase();
    }

    function openPasswordRecovery() {
      openModal("Definir nova senha", `<form id="passwordRecoveryForm"><div class="form-grid">
        <div class="wide"><label for="recoveryNewPassword">Nova senha *</label><input id="recoveryNewPassword" name="new_password" type="password" minlength="8" autocomplete="new-password" required></div>
        <div class="wide"><label for="recoveryConfirmPassword">Confirmar nova senha *</label><input id="recoveryConfirmPassword" name="confirm_password" type="password" minlength="8" autocomplete="new-password" required></div>
      </div><div class="info-box" style="margin-top:12px">Use pelo menos 8 caracteres. Após a alteração, entre novamente com a nova senha.</div>${formActions("Atualizar senha")}</form>`, "RECUPERAÇÃO DE ACESSO");
    }

    async function requestPasswordRecovery() {
      const identifier = query("#loginEmail")?.value.trim() || "";
      if (!identifier) return showLoginMessage("Informe seu e-mail ou usuário para recuperar a senha.");
      const button = query("#forgotPasswordBtn");
      if (button) button.disabled = true;
      clearLoginMessage();
      try {
        await initClient(query("#rememberLogin")?.checked !== false);
        const email = await resolveLoginEmail(identifier);
        const redirectTo = `${location.origin}${location.pathname}`;
        const { error } = await state.client.auth.resetPasswordForEmail(email, { redirectTo });
        if (error) throw error;
      } catch (_) {
        // A mensagem permanece genérica para não revelar se o usuário existe.
      } finally {
        showLoginMessage("Se o acesso estiver cadastrado, enviaremos as instruções de recuperação por e-mail.", "success");
        if (button) button.disabled = false;
      }
    }

    async function login() {
      const identifier = query("#loginEmail")?.value.trim() || "";
      const password = query("#loginPassword")?.value || "";
      if (!identifier || !password) return showLoginMessage("Preencha e-mail ou usuário e senha.");

      const remember = query("#rememberLogin")?.checked !== false;
      setRememberPreference(remember);
      clearLoginMessage();
      setLoginLoading(true);
      try {
        await initClient(remember);
        const email = await resolveLoginEmail(identifier);
        const { data, error } = await state.client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        state.user = data.user;
        await loadData();
        if (state.data?.profile?.active === false) {
          await state.client.auth.signOut();
          state.user = null;
          throw new Error("Seu acesso está bloqueado. Procure o administrador.");
        }
        openApp();
      } catch (error) {
        const blocked = String(error?.message || "").includes("bloqueado");
        showLoginMessage(blocked ? error.message : "Não foi possível entrar. Verifique suas credenciais e tente novamente.");
      } finally {
        setLoginLoading(false);
      }
    }

    async function restoreSession() {
      try {
        await initClient(rememberPreference());
        const { data } = await state.client.auth.getSession();
        if (!data.session?.user) return false;
        state.user = data.session.user;
        await loadData();
        if (state.data?.profile?.active === false) {
          await state.client.auth.signOut();
          state.user = null;
          return false;
        }
        openApp();
        return true;
      } catch (error) {
        console.error("Não foi possível restaurar a sessão:", error);
        return false;
      }
    }

    async function completePasswordRecovery(form) {
      const payload = Object.fromEntries(new FormData(form));
      const password = String(payload.new_password || "");
      const confirmation = String(payload.confirm_password || "");
      if (password.length < 8) return toast("A nova senha precisa ter pelo menos 8 caracteres.", "error");
      if (password !== confirmation) return toast("A confirmação da nova senha não confere.", "error");
      const submit = form.querySelector("button[type='submit'], button:not([type])");
      if (submit) submit.disabled = true;
      try {
        await initClient(rememberPreference());
        const { error } = await state.client.auth.updateUser({ password });
        if (error) throw error;
        await state.client.auth.signOut();
        state.user = null;
        closeModal();
        showLoginMessage("Senha atualizada. Entre novamente com sua nova senha.", "success");
      } catch (error) {
        toast(`Não foi possível atualizar a senha: ${error.message}`, "error");
      } finally {
        if (submit) submit.disabled = false;
      }
    }

    async function changePassword(form, email) {
      const payload = Object.fromEntries(new FormData(form));
      const currentPassword = String(payload.current_password || "");
      const newPassword = String(payload.new_password || "");
      const confirmation = String(payload.confirm_password || "");
      if (!currentPassword) throw new Error("Informe a senha atual.");
      if (newPassword.length < 8) throw new Error("A nova senha precisa ter pelo menos 8 caracteres.");
      if (newPassword !== confirmation) throw new Error("A confirmação da nova senha não confere.");
      if (newPassword === currentPassword) throw new Error("A nova senha precisa ser diferente da senha atual.");

      const { data, error } = await state.client.auth.signInWithPassword({ email, password: currentPassword });
      if (error) throw new Error("A senha atual está incorreta.");
      if (data?.user) state.user = data.user;
      const { error: passwordError } = await state.client.auth.updateUser({ password: newPassword });
      if (passwordError) throw passwordError;
      return true;
    }

    async function signOutAndReload() {
      try {
        await beforeLogout();
        if (state.client) await state.client.auth.signOut();
      } finally {
        state.user = null;
        disposeAuthListener();
        reload();
      }
    }

    async function logout() {
      return signOutAndReload();
    }

    function switchEnvironment(environment) {
      const target = config.environments?.[environment] || {};
      if (!target.supabaseUrl || !target.supabaseKey) {
        toast("O ambiente selecionado ainda não possui URL e chave.", "error");
        return false;
      }
      localStorage.setItem(ENVIRONMENT_KEY, environment);
      reload();
      return true;
    }

    function initializeLogin() {
      const remember = query("#rememberLogin");
      if (remember) remember.checked = rememberPreference();
      const hint = query("#connectionHint");
      if (hint) hint.textContent = "Acesse com seu e-mail ou usuário e senha cadastrados.";
      return restoreSession();
    }

    return Object.freeze({
      version: VERSION,
      showLoginMessage,
      clearLoginMessage,
      setLoginLoading,
      rememberPreference,
      initClient,
      resolveLoginEmail,
      openPasswordRecovery,
      requestPasswordRecovery,
      login,
      restoreSession,
      completePasswordRecovery,
      changePassword,
      signOutAndReload,
      logout,
      switchEnvironment,
      initializeLogin
    });
  }

  window.OpsControlAuth = Object.freeze({
    version: VERSION,
    keys: Object.freeze({ config: CONFIG_KEY, environment: ENVIRONMENT_KEY, remember: REMEMBER_KEY }),
    loadConfig,
    createController
  });
})();
