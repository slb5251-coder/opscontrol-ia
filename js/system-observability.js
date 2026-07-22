(() => {
  "use strict";

  const VERSION = "20260722-observability-1";
  const QUEUE_KEY = "opscontrol_observability_queue_v1";
  const SESSION_KEY = "opscontrol_observability_session_v1";
  const MAX_QUEUE = 25;
  const HEALTH_INTERVAL_MS = 5 * 60 * 1000;
  const seen = new Map();
  let healthTimer = null;
  let lastHealth = null;
  let panelOpen = false;

  const $ = (selector, root = document) => root.querySelector(selector);

  function activeConfig() {
    const root = window.OPSCONTROL_CONFIG || {};
    const environment = window.OPSCONTROL_ACTIVE_ENVIRONMENT
      || localStorage.getItem("opscontrol_environment")
      || root.defaultEnvironment
      || "production";
    const selected = root.environments?.[environment] || {};
    return {
      environment,
      url: selected.supabaseUrl || root.supabaseUrl || "",
      key: selected.supabaseKey || root.supabaseKey || ""
    };
  }

  function sessionId() {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  }

  function projectRef(url) {
    try { return new URL(url).hostname.split(".")[0]; }
    catch { return ""; }
  }

  function extractSession(value) {
    if (!value || typeof value !== "object") return null;
    if (typeof value.access_token === "string") return value;
    if (value.currentSession?.access_token) return value.currentSession;
    if (value.session?.access_token) return value.session;
    if (Array.isArray(value) && value[0]?.access_token) return value[0];
    return null;
  }

  function storedSession(url) {
    const ref = projectRef(url);
    for (const storage of [localStorage, sessionStorage]) {
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index) || "";
        if (!key.includes("auth-token") || (ref && !key.includes(ref))) continue;
        try {
          const session = extractSession(JSON.parse(storage.getItem(key) || "null"));
          if (session?.access_token) return session;
        } catch { /* Ignore invalid storage entries. */ }
      }
    }
    return null;
  }

  function sanitize(value, maxLength = 2000) {
    return String(value || "")
      .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]")
      .replace(/sb_(?:publishable|secret)_[A-Za-z0-9_-]+/gi, "[SUPABASE_KEY]")
      .replace(/([?&](?:token|key|apikey|access_token|refresh_token)=)[^&#\s]+/gi, "$1[REDACTED]")
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[EMAIL]")
      .slice(0, maxLength);
  }

  function readQueue() {
    try {
      const value = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
      return Array.isArray(value) ? value.slice(-MAX_QUEUE) : [];
    } catch { return []; }
  }

  function writeQueue(queue) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE)));
  }

  function enqueue(payload) {
    const queue = readQueue();
    queue.push(payload);
    writeQueue(queue);
    updateRuntimeStatus("queued");
  }

  async function fingerprint(parts) {
    const raw = parts.map(value => sanitize(value, 500)).join("|");
    if (!crypto.subtle) return raw.slice(0, 128);
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
  }

  async function rpc(name, payload = {}) {
    const config = activeConfig();
    const session = storedSession(config.url);
    if (!config.url || !config.key || !session?.access_token) {
      const error = new Error("Sessão autenticada indisponível para observabilidade.");
      error.code = "NO_SESSION";
      throw error;
    }

    const response = await fetch(`${config.url}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
        "X-Client-Info": `opscontrol-observability/${VERSION}`
      },
      body: JSON.stringify(payload),
      cache: "no-store"
    });

    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; }
    catch { data = text; }

    if (!response.ok) {
      const error = new Error(data?.message || data?.error || `Falha HTTP ${response.status}`);
      error.status = response.status;
      error.details = data;
      throw error;
    }
    return data;
  }

  function updateRuntimeStatus(status) {
    document.documentElement.dataset.observability = status;
  }

  async function send(payload, queueOnFailure = true) {
    if (!navigator.onLine) {
      if (queueOnFailure) enqueue(payload);
      return false;
    }
    try {
      await rpc("report_client_error_v1", payload);
      updateRuntimeStatus("active");
      return true;
    } catch (error) {
      if (error.code === "NO_SESSION" || error.status === 401) {
        if (queueOnFailure) enqueue(payload);
        return false;
      }
      if (error.status === 403) return false;
      if (queueOnFailure) enqueue(payload);
      console.warn("[OpsControl Observability] Falha ao registrar erro:", error.message);
      return false;
    }
  }

  async function report(input = {}) {
    const message = sanitize(input.message || input.error?.message || input.reason || "Erro sem mensagem");
    if (!message || /report_client_error_v1|OpsControl Observability/i.test(message)) return false;
    if (/AbortError|The operation was aborted/i.test(message)) return false;

    const context = sanitize(input.context || "client-runtime", 160);
    const stack = sanitize(input.stack || input.error?.stack || "", 8000);
    const pagePath = sanitize(`${location.pathname}${location.hash || ""}`, 500);
    const key = await fingerprint([context, message, stack.split("\n").slice(0, 3).join("\n"), pagePath]);
    const recent = seen.get(key) || 0;
    if (Date.now() - recent < 3000) return false;
    seen.set(key, Date.now());

    const config = activeConfig();
    return send({
      p_context: context,
      p_message: message,
      p_stack: stack || null,
      p_user_agent: sanitize(navigator.userAgent, 1000),
      p_environment: config.environment === "staging" ? "staging" : "production",
      p_app_version: VERSION,
      p_page_path: pagePath,
      p_severity: ["info", "warning", "error", "critical"].includes(input.severity) ? input.severity : "error",
      p_fingerprint: key,
      p_session_id: sessionId(),
      p_metadata: {
        source: sanitize(input.source || "browser", 100),
        online: navigator.onLine,
        visibility: document.visibilityState,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        resource: sanitize(input.resource || "", 500)
      }
    });
  }

  async function flushQueue() {
    if (!navigator.onLine) return;
    const queue = readQueue();
    if (!queue.length) return updateRuntimeStatus("active");
    const remaining = [];
    for (const payload of queue) {
      const sent = await send(payload, false);
      if (!sent) remaining.push(payload);
    }
    writeQueue(remaining);
    updateRuntimeStatus(remaining.length ? "queued" : "active");
  }

  function healthTone(status) {
    if (status === "critical") return { label: "Sistema crítico", tone: "critical" };
    if (status === "warning") return { label: "Sistema com atenção", tone: "warning" };
    return { label: "Sistema saudável", tone: "healthy" };
  }

  function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("pt-BR");
  }

  function metric(label, value, attention = false) {
    return `<article class="system-health-metric${attention ? " attention" : ""}"><span>${label}</span><strong>${Number(value || 0).toLocaleString("pt-BR")}</strong></article>`;
  }

  function renderPanel() {
    const panel = $("#systemHealthPanel");
    if (!panel || !lastHealth) return;
    const tone = healthTone(lastHealth.status);
    const errors = Array.isArray(lastHealth.recent_errors) ? lastHealth.recent_errors : [];
    panel.innerHTML = `
      <button class="system-health-backdrop" data-health-close aria-label="Fechar painel"></button>
      <section class="system-health-drawer" role="dialog" aria-modal="true" aria-labelledby="systemHealthTitle">
        <header>
          <div><small>OBSERVABILIDADE</small><h2 id="systemHealthTitle">Saúde do sistema</h2><p>Atualizado em ${formatDate(lastHealth.generated_at)}</p></div>
          <button type="button" class="system-health-close" data-health-close aria-label="Fechar">×</button>
        </header>
        <div class="system-health-state ${tone.tone}"><strong>${tone.label}</strong><span>Migration ${lastHealth.latest_migration || "-"} • ${lastHealth.realtime_tables || 0} tabelas Realtime</span></div>
        <div class="system-health-grid">
          ${metric("Erros 24h", lastHealth.unresolved_errors_24h, lastHealth.unresolved_errors_24h > 0)}
          ${metric("Erros críticos", lastHealth.critical_errors_24h, lastHealth.critical_errors_24h > 0)}
          ${metric("Operações sem atualização", lastHealth.stale_operations, lastHealth.stale_operations > 0)}
          ${metric("Alertas vencidos", lastHealth.overdue_alerts, lastHealth.overdue_alerts > 0)}
          ${metric("Manutenções atrasadas", lastHealth.overdue_maintenance, lastHealth.overdue_maintenance > 0)}
          ${metric("Certificados vencidos", lastHealth.expired_certificates, lastHealth.expired_certificates > 0)}
          ${metric("Tanques bloqueados", lastHealth.blocked_tanks, lastHealth.blocked_tanks > 0)}
          ${metric("Próximos da capacidade", lastHealth.near_capacity_tanks, lastHealth.near_capacity_tanks > 0)}
        </div>
        <section class="system-health-errors">
          <div class="system-health-section-title"><div><small>ÚLTIMAS FALHAS</small><h3>Erros não resolvidos</h3></div><button type="button" data-health-refresh>Atualizar</button></div>
          ${errors.length ? errors.map(item => `
            <article class="system-health-error severity-${item.severity || "error"}">
              <div><strong>${sanitize(item.context || "Erro do sistema", 160)}</strong><p>${sanitize(item.message, 600)}</p><small>${formatDate(item.last_seen_at)} • ${item.occurrence_count || 1} ocorrência(s) • ${sanitize(item.page_path || "-", 200)}</small></div>
              <button type="button" data-health-resolve="${item.id}">Resolver</button>
            </article>`).join("") : `<div class="system-health-empty">Nenhum erro não resolvido.</div>`}
        </section>
      </section>`;
  }

  function mountHealthControl() {
    let button = $("#systemHealthButton");
    if (!button) {
      button = document.createElement("button");
      button.id = "systemHealthButton";
      button.type = "button";
      button.className = "system-health-button hidden";
      button.innerHTML = `<span aria-hidden="true"></span><strong>Saúde</strong>`;
      const syncBadge = $("#syncBadge");
      syncBadge?.insertAdjacentElement("afterend", button);
      button.addEventListener("click", () => {
        panelOpen = true;
        let panel = $("#systemHealthPanel");
        if (!panel) {
          panel = document.createElement("div");
          panel.id = "systemHealthPanel";
          document.body.appendChild(panel);
        }
        renderPanel();
        panel.classList.add("open");
        document.body.classList.add("system-health-open");
      });
    }
    return button;
  }

  async function loadHealth() {
    try {
      const health = await rpc("get_system_health_v1");
      lastHealth = health;
      const button = mountHealthControl();
      const tone = healthTone(health.status);
      button.className = `system-health-button ${tone.tone}`;
      button.innerHTML = `<span aria-hidden="true"></span><strong>${tone.label}</strong>`;
      button.title = `Última verificação: ${formatDate(health.generated_at)}`;
      if (panelOpen) renderPanel();
      return health;
    } catch (error) {
      if ([401, 403].includes(error.status) || error.code === "NO_SESSION") {
        $("#systemHealthButton")?.classList.add("hidden");
        return null;
      }
      console.warn("[OpsControl Health]", error.message);
      return null;
    }
  }

  function bindEvents() {
    window.addEventListener("error", event => {
      if (event.target && event.target !== window) {
        const element = event.target;
        report({
          context: "resource-load",
          message: `Falha ao carregar recurso ${element.tagName || "desconhecido"}`,
          severity: "warning",
          resource: element.src || element.href || "",
          source: "resource"
        });
        return;
      }
      report({ context: "window-error", message: event.message, stack: event.error?.stack, severity: "error", source: "exception" });
    }, true);

    window.addEventListener("unhandledrejection", event => {
      const reason = event.reason;
      report({
        context: "unhandled-promise",
        message: reason?.message || reason || "Promise rejeitada sem tratamento",
        stack: reason?.stack,
        severity: "error",
        source: "promise"
      });
    });

    document.addEventListener("opscontrol:report-error", event => report(event.detail || {}));
    window.addEventListener("online", () => { flushQueue(); loadHealth(); });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") { flushQueue(); loadHealth(); }
    });

    document.addEventListener("click", async event => {
      if (event.target.closest("[data-health-close]")) {
        panelOpen = false;
        $("#systemHealthPanel")?.classList.remove("open");
        document.body.classList.remove("system-health-open");
        return;
      }
      if (event.target.closest("[data-health-refresh]")) {
        event.target.closest("[data-health-refresh]").disabled = true;
        await loadHealth();
        return;
      }
      const resolveButton = event.target.closest("[data-health-resolve]");
      if (resolveButton) {
        resolveButton.disabled = true;
        try {
          await rpc("resolve_system_error_v1", { p_error_id: Number(resolveButton.dataset.healthResolve), p_resolution_notes: "Resolvido pelo painel de saúde." });
          await loadHealth();
        } catch (error) {
          resolveButton.disabled = false;
          console.warn("[OpsControl Health] Falha ao resolver erro:", error.message);
        }
      }
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && panelOpen) {
        panelOpen = false;
        $("#systemHealthPanel")?.classList.remove("open");
        document.body.classList.remove("system-health-open");
      }
    });
  }

  function start() {
    bindEvents();
    updateRuntimeStatus(readQueue().length ? "queued" : "ready");
    [800, 2500, 6000].forEach(delay => setTimeout(() => { flushQueue(); loadHealth(); }, delay));
    healthTimer = setInterval(loadHealth, HEALTH_INTERVAL_MS);
  }

  window.OpsControlObservability = Object.freeze({
    version: VERSION,
    report,
    flush: flushQueue,
    health: loadHealth,
    get lastHealth() { return lastHealth; }
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();

  window.addEventListener("beforeunload", () => clearInterval(healthTimer));
})();
