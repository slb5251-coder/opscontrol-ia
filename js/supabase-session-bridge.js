(() => {
  "use strict";

  const REMEMBER_LOGIN_KEY = "opscontrol_remember_login";
  const originalCreateClient = window.supabase?.createClient;

  if (typeof originalCreateClient !== "function" || window.supabase.__opscontrolSessionBridge) return;

  window.supabase.createClient = function opscontrolCreateClient(url, key, options = {}) {
    const auth = options.auth || {};
    if (!auth.storageKey) {
      const remember = localStorage.getItem(REMEMBER_LOGIN_KEY) !== "false";
      options = {
        ...options,
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          ...auth,
          storage: remember ? window.localStorage : window.sessionStorage,
          storageKey: remember ? "opscontrol-auth" : "opscontrol-auth-session"
        }
      };
    }
    return originalCreateClient.call(window.supabase, url, key, options);
  };

  window.supabase.__opscontrolSessionBridge = true;
})();
