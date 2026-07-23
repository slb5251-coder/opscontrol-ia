(() => {
  "use strict";

  const VERSION = "20260723-alert-center-v2-3";
  const PAGE_SELECTOR = "#page-alerts";
  const TAB_KEY = "opscontrol_alert_center_tab";
  const CHANNEL_KEY = "opscontrol_alert_center_channel";
  const CONFIG_KEY = "opscontrol_config";
  const ENV_KEY = "opscontrol_environment";
  const TEST_MODE_KEY = "opscontrol_homologation_mode";
  const REMEMBER_LOGIN_KEY = "opscontrol_remember_login";

  let client = null;
  let user = null;
  let currentProfile = null;
  let profiles = [];
  let alerts = [];
  let alertReceipts = [];
  let messages = [];
  let messageReads = [];
  let automaticAlerts = [];
  let realtime = null;
  let loadTimer = null;
  let rendering = false;
  let activeTab = localStorage.getItem(TAB_KEY) || "alerts";
  let activeChannel = localStorage.getItem(CHANNEL_KEY) || "geral";
  let statusFilter = "all";
  let responsibleFilter = "all";
  let query = "";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clean = value => String(value ?? "").replace(/\s+/g, " ").trim();
  const normalized = value => clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const esc = value => clean(value).replace(/[&<>'"]/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[char]));
  const formatDateTime = value => {
    if (!value) return "Sem data";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return clean(value) || "Sem data";
    return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  };
  const toLocalInput = value => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  function appConfig() {
    const config = window.OPSCONTROL_CONFIG || {};
    const modular = window.OpsControlAuth?.loadConfig?.(config);
    if (modular?.url && modular?.key) return modular;
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(CONFIG_KEY) || "{}"); } catch {}
    const environment = localStorage.getItem(ENV_KEY) || config.defaultEnvironment || "production";
    const selected = config.environments?.[environment] || {};
    const named = Boolean(selected.supabaseUrl && selected.supabaseKey);
    return {
      url: named ? selected.supabaseUrl : (saved.url || config.supabaseUrl || ""),
      key: named ? selected.supabaseKey : (saved.key || config.supabaseKey || ""),
      environment
    };
  }

  function roleKey() {
    return normalized(currentProfile?.role || $("#userRole")?.textContent || "user");
  }

  function profileName(id) {
    if (!id) return "Não definido";
    return profiles.find(item => item.id === id)?.full_name || "Usuário";
  }

  function currentName() {
    return currentProfile?.full_name || clean($("#userName")?.textContent) || user?.email || "Usuário";
  }

  function isAdmin() {
    return roleKey() === "admin";
  }

  const channelDefinitions = [
    { id: "geral", label: "Geral", roles: ["*"] },
    { id: "operacao", label: "Operação", roles: ["admin", "supervisor", "lider", "operador", "user"] },
    { id: "lideranca", label: "Liderança", roles: ["admin", "supervisor", "lider"] },
    { id: "logistica", label: "Logística", roles: ["admin", "supervisor", "lider", "logistica"] },
    { id: "qhse", label: "QHSE", roles: ["admin", "supervisor", "lider", "qhse"] },
    { id: "manutencao", label: "Manutenção", roles: ["admin", "supervisor", "lider", "mecanico"] }
  ];

  function allowedChannels() {
    const role = roleKey();
    return channelDefinitions.filter(channel => channel.roles.includes("*") || channel.roles.includes(role));
  }

  function ensureActiveChannel() {
    const channels = allowedChannels();
    if (activeChannel === "operacao-geral") activeChannel = "geral";
    if (!channels.some(channel => channel.id === activeChannel)) activeChannel = channels[0]?.id || "geral";
    localStorage.setItem(CHANNEL_KEY, activeChannel);
  }

  function levelClass(level) {
    const key = normalized(level);
    if (/crit/.test(key)) return "critical";
    if (/alto|alta/.test(key)) return "high";
    if (/medio|media/.test(key)) return "medium";
    if (/baixo|baixa/.test(key)) return "low";
    return "info";
  }

  function statusClass(status) {
    const key = normalized(status);
    if (key === "resolvido") return "resolved";
    if (key === "em andamento") return "progress";
    if (key === "reconhecido") return "acknowledged";
    return "new";
  }

  function statusOptions(selected) {
    return ["Novo", "Reconhecido", "Em andamento", "Resolvido"]
      .map(status => `<option ${status === selected ? "selected" : ""}>${status}</option>`).join("");
  }

  function profileOptions(selected, includeEmpty = true) {
    const items = profiles
      .filter(item => item.active !== false)
      .sort((a, b) => clean(a.full_name).localeCompare(clean(b.full_name), "pt-BR"))
      .map(item => `<option value="${esc(item.id)}" ${item.id === selected ? "selected" : ""}>${esc(item.full_name)} — ${esc(item.role || "usuário")}</option>`)
      .join("");
    return `${includeEmpty ? '<option value="">Sem responsável</option>' : ""}${items}`;
  }

  function isCurrentUserRead(alert) {
    return alertReceipts.some(item => item.alert_id === alert.id && item.user_id === user?.id);
  }

  function receiptCount(alertId) {
    return new Set(alertReceipts.filter(item => item.alert_id === alertId).map(item => item.user_id)).size;
  }

  function messageReadCount(messageId, senderId) {
    return new Set(messageReads
      .filter(item => item.message_id === messageId && item.user_id !== senderId)
      .map(item => item.user_id)).size;
  }

  function dueState(dueAt, status) {
    if (!dueAt || normalized(status) === "resolvido") return { className: "", label: dueAt ? formatDateTime(dueAt) : "Sem prazo" };
    const due = new Date(dueAt);
    if (Number.isNaN(due.getTime())) return { className: "", label: "Sem prazo" };
    const diff = due.getTime() - Date.now();
    if (diff < 0) return { className: "overdue", label: `Vencido • ${formatDateTime(dueAt)}` };
    if (diff <= 24 * 60 * 60 * 1000) return { className: "today", label: `Até 24h • ${formatDateTime(dueAt)}` };
    return { className: "scheduled", label: formatDateTime(dueAt) };
  }

  function alertMatches(alert) {
    const status = normalized(alert.status || "Novo");
    if (statusFilter === "new" && status !== "novo") return false;
    if (statusFilter === "ack" && status !== "reconhecido") return false;
    if (statusFilter === "progress" && status !== "em andamento") return false;
    if (statusFilter === "resolved" && status !== "resolvido") return false;
    if (statusFilter === "unread" && isCurrentUserRead(alert)) return false;
    if (statusFilter === "overdue" && !(alert.due_at && new Date(alert.due_at) < new Date() && status !== "resolvido")) return false;
    if (responsibleFilter === "none" && alert.responsible_user_id) return false;
    if (responsibleFilter !== "all" && responsibleFilter !== "none" && alert.responsible_user_id !== responsibleFilter) return false;
    if (query) {
      const haystack = normalized([
        alert.title, alert.message, alert.level, alert.target_group,
        alert.status, profileName(alert.responsible_user_id)
      ].join(" "));
      if (!haystack.includes(normalized(query))) return false;
    }
    return true;
  }

  function automaticMatches(alert) {
    if (statusFilter === "resolved" || statusFilter === "ack" || statusFilter === "progress") return false;
    if (responsibleFilter !== "all") return false;
    if (!query) return true;
    return normalized([alert.title, alert.message, alert.level, alert.category].join(" ")).includes(normalized(query));
  }

  function extractAutomaticAlerts(page) {
    const extracted = [];
    $$(".alert-center-card", page).forEach(card => {
      const footer = clean(card.querySelector("footer>span")?.textContent || "");
      if (!/^Automático/i.test(footer)) return;
      const action = card.querySelector("[data-alert-page]");
      extracted.push({
        key: [
          clean(card.querySelector("h3")?.textContent),
          clean(card.querySelector(".alert-center-top>span")?.textContent),
          footer
        ].join("|"),
        title: clean(card.querySelector("h3")?.textContent || "Alerta automático"),
        message: clean(card.querySelector("p")?.textContent || ""),
        category: clean(card.querySelector(".alert-center-top>span")?.textContent || "Sistema"),
        level: clean(card.querySelector(".badge")?.textContent || "Alto"),
        created_label: footer.replace(/^Automático\s*•\s*/i, ""),
        action_page: action?.dataset.alertPage || ""
      });
    });
    const seen = new Set();
    return extracted.filter(item => {
      if (seen.has(item.key)) return false;
      seen.add(item.key);
      return true;
    });
  }

  function manualAlertCard(alert, compact = false) {
    const read = isCurrentUserRead(alert);
    const due = dueState(alert.due_at, alert.status);
    const responsible = profileName(alert.responsible_user_id);
    return `<article class="alert-workflow-card level-${levelClass(alert.level)} status-${statusClass(alert.status)} ${read ? "is-read" : "is-unread"} ${due.className}" data-alert-workflow-card="${esc(alert.id)}">
      <header>
        <div class="alert-workflow-badges">
          <span class="alert-level">${esc(alert.level || "Informativo")}</span>
          <span class="alert-status">${esc(alert.status || "Novo")}</span>
          ${!read ? '<span class="alert-unread-dot">Não lido</span>' : ""}
        </div>
        <time>${formatDateTime(alert.created_at)}</time>
      </header>
      <h3>${esc(alert.title)}</h3>
      <p>${esc(alert.message)}</p>
      <div class="alert-workflow-meta">
        <span>Público<strong>${esc(alert.target_group || (alert.target_user_id ? "Usuário direcionado" : "Equipe"))}</strong></span>
        <span>Responsável<strong>${esc(responsible)}</strong></span>
        <span>Prazo<strong>${esc(due.label)}</strong></span>
        <span>Leitura<strong>${receiptCount(alert.id)} confirmação(ões)</strong></span>
      </div>
      ${compact ? "" : `<div class="alert-workflow-controls">
        <label>Status<select data-alert-field="status">${statusOptions(alert.status || "Novo")}</select></label>
        <label>Responsável<select data-alert-field="responsible">${profileOptions(alert.responsible_user_id)}</select></label>
        <label>Prazo<input data-alert-field="due" type="datetime-local" value="${esc(toLocalInput(alert.due_at))}"></label>
      </div>`}
      <footer>
        <div>
          ${!read ? `<button type="button" class="btn small secondary" data-alert-read="${esc(alert.id)}">Confirmar leitura</button>` : `<span class="alert-read-confirmed">✓ Leitura confirmada</span>`}
          ${!compact && !alert.responsible_user_id ? `<button type="button" class="btn small soft" data-alert-assume="${esc(alert.id)}">Assumir</button>` : ""}
        </div>
        <div>
          ${!compact ? `<button type="button" class="btn small secondary" data-alert-save="${esc(alert.id)}">Salvar atendimento</button>` : ""}
          ${!compact && normalized(alert.status) !== "resolvido" ? `<button type="button" class="btn small primary" data-alert-resolve="${esc(alert.id)}">Resolver</button>` : ""}
          ${isAdmin() ? `<button type="button" class="btn small danger outline" data-alert-delete-v2="${esc(alert.id)}">Excluir</button>` : ""}
        </div>
      </footer>
    </article>`;
  }

  function automaticAlertCard(alert) {
    return `<article class="alert-workflow-card automatic level-${levelClass(alert.level)}">
      <header><div class="alert-workflow-badges"><span class="alert-level">${esc(alert.level)}</span><span class="alert-status">Automático</span></div><time>${esc(alert.created_label || "Sistema")}</time></header>
      <h3>${esc(alert.title)}</h3>
      <p>${esc(alert.message)}</p>
      <div class="alert-workflow-meta"><span>Categoria<strong>${esc(alert.category)}</strong></span><span>Origem<strong>Monitoramento automático</strong></span></div>
      <footer><span class="alert-system-note">O atendimento é feito no módulo de origem.</span>${alert.action_page ? `<button type="button" class="btn small primary" data-alert-page="${esc(alert.action_page)}">Abrir módulo</button>` : ""}</footer>
    </article>`;
  }

  function filterBar() {
    const counts = {
      all: alerts.length,
      unread: alerts.filter(item => !isCurrentUserRead(item)).length,
      progress: alerts.filter(item => normalized(item.status) === "em andamento").length,
      overdue: alerts.filter(item => item.due_at && new Date(item.due_at) < new Date() && normalized(item.status) !== "resolvido").length,
      resolved: alerts.filter(item => normalized(item.status) === "resolvido").length
    };
    const button = (id, label, count) => `<button type="button" class="${statusFilter === id ? "active" : ""}" data-alert-filter="${id}">${label}<b>${count}</b></button>`;
    return `<section class="alert-workspace-filters">
      <div class="alert-status-filters">
        ${button("all", "Todos", counts.all)}
        ${button("unread", "Não lidos", counts.unread)}
        ${button("new", "Novos", alerts.filter(item => normalized(item.status) === "novo").length)}
        ${button("ack", "Reconhecidos", alerts.filter(item => normalized(item.status) === "reconhecido").length)}
        ${button("progress", "Em andamento", counts.progress)}
        ${button("overdue", "Vencidos", counts.overdue)}
        ${button("resolved", "Resolvidos", counts.resolved)}
      </div>
      <div class="alert-workspace-search">
        <input type="search" value="${esc(query)}" data-alert-query placeholder="Buscar alerta ou comunicado">
        <select data-alert-responsible-filter>
          <option value="all">Todos os responsáveis</option>
          <option value="none" ${responsibleFilter === "none" ? "selected" : ""}>Sem responsável</option>
          ${profiles.filter(item => item.active !== false).sort((a,b)=>clean(a.full_name).localeCompare(clean(b.full_name),"pt-BR")).map(item => `<option value="${esc(item.id)}" ${responsibleFilter === item.id ? "selected" : ""}>${esc(item.full_name)}</option>`).join("")}
        </select>
      </div>
    </section>`;
  }

  function alertsTab() {
    const operational = alerts.filter(item => !/informativo|baixo|baixa/.test(normalized(item.level))).filter(alertMatches);
    const automatic = automaticAlerts.filter(automaticMatches);
    return `${filterBar()}<section class="alert-workspace-grid">
      ${automatic.map(automaticAlertCard).join("")}
      ${operational.map(item => manualAlertCard(item)).join("")}
      ${!automatic.length && !operational.length ? '<div class="alert-workspace-empty"><strong>Nenhum alerta neste filtro.</strong><span>Ajuste os filtros ou aguarde novas ocorrências.</span></div>' : ""}
    </section>`;
  }

  function communicationsTab() {
    const items = alerts.filter(alertMatches);
    return `${filterBar()}<section class="alert-workspace-grid communications">
      ${items.map(item => manualAlertCard(item)).join("")}
      ${!items.length ? '<div class="alert-workspace-empty"><strong>Nenhum comunicado neste filtro.</strong><span>Crie um comunicado ou altere os filtros.</span></div>' : ""}
    </section>`;
  }

  function channelLabel(channelId) {
    return channelDefinitions.find(channel => channel.id === channelId)?.label || channelId;
  }

  function chatMessageHtml(message) {
    const mine = message.sender_id === user?.id;
    const readCount = messageReadCount(message.id, message.sender_id);
    return `<article class="alert-chat-message ${mine ? "mine" : ""}" data-chat-message="${esc(message.id)}">
      <div class="alert-chat-avatar">${esc(clean(message.sender_name || "U").slice(0, 1).toUpperCase())}</div>
      <div>
        <header><strong>${esc(message.sender_name || "Usuário")}</strong><time>${formatDateTime(message.created_at)}</time></header>
        <p>${esc(message.message)}</p>
        <footer>${mine ? `<span>${readCount ? `Lida por ${readCount}` : "Enviada"}</span><button type="button" data-chat-delete="${esc(message.id)}">Excluir</button>` : `<span>${esc(channelLabel(message.channel))}</span>`}</footer>
      </div>
    </article>`;
  }

  function chatTab() {
    ensureActiveChannel();
    const channels = allowedChannels();
    const visibleMessages = messages.filter(item => item.channel === activeChannel);
    return `<section class="alert-chat-workspace">
      <nav class="alert-chat-channels" aria-label="Canais do chat">
        ${channels.map(channel => `<button type="button" class="${channel.id === activeChannel ? "active" : ""}" data-chat-channel="${esc(channel.id)}">${esc(channel.label)}<b>${messages.filter(item => item.channel === channel.id).length}</b></button>`).join("")}
      </nav>
      <div class="alert-chat-panel-v2">
        <header><div><small>CANAL</small><h3>${esc(channelLabel(activeChannel))}</h3></div><span>${visibleMessages.length} mensagem(ns)</span></header>
        <div class="alert-chat-list-v2">${visibleMessages.map(chatMessageHtml).join("") || '<div class="alert-workspace-empty compact"><strong>Sem mensagens neste canal.</strong><span>Inicie a comunicação com a equipe.</span></div>'}</div>
        <form class="alert-chat-composer-v2" data-chat-compose>
          <textarea name="message" rows="2" required maxlength="2000" placeholder="Mensagem para ${esc(channelLabel(activeChannel))}"></textarea>
          <button class="btn primary" type="submit">Enviar</button>
        </form>
      </div>
    </section>`;
  }

  function summaryHtml() {
    const unresolved = alerts.filter(item => normalized(item.status) !== "resolvido").length;
    const unread = alerts.filter(item => !isCurrentUserRead(item)).length;
    const overdue = alerts.filter(item => item.due_at && new Date(item.due_at) < new Date() && normalized(item.status) !== "resolvido").length;
    const mine = alerts.filter(item => item.responsible_user_id === user?.id && normalized(item.status) !== "resolvido").length;
    return `<section class="alert-workspace-summary">
      <article><span>Em atendimento</span><strong>${unresolved}</strong><small>Não resolvidos</small></article>
      <article><span>Não lidos</span><strong>${unread}</strong><small>Confirmação pendente</small></article>
      <article class="${overdue ? "warning" : ""}"><span>Fora do prazo</span><strong>${overdue}</strong><small>Exigem prioridade</small></article>
      <article><span>Comigo</span><strong>${mine}</strong><small>Sob sua responsabilidade</small></article>
    </section>`;
  }

  function tabsHtml() {
    const alertCount = automaticAlerts.length + alerts.filter(item => !/informativo|baixo|baixa/.test(normalized(item.level)) && normalized(item.status) !== "resolvido").length;
    const communicationCount = alerts.length;
    const unreadChat = messages.filter(message => message.sender_id !== user?.id && !messageReads.some(read => read.message_id === message.id && read.user_id === user?.id)).length;
    return `<nav class="alert-workspace-tabs" role="tablist">
      <button type="button" class="${activeTab === "alerts" ? "active" : ""}" data-alert-tab="alerts">Alertas <b>${alertCount}</b></button>
      <button type="button" class="${activeTab === "communications" ? "active" : ""}" data-alert-tab="communications">Comunicados <b>${communicationCount}</b></button>
      <button type="button" class="${activeTab === "chat" ? "active" : ""}" data-alert-tab="chat">Chat <b>${unreadChat}</b></button>
    </nav>`;
  }

  function renderWorkspace() {
    const page = $(PAGE_SELECTOR);
    if (!page) return;
    rendering = true;
    automaticAlerts = extractAutomaticAlerts(page);
    page.dataset.alertCenterV2 = VERSION;
    $$(".alert-professional-kpis,.alert-admin-notice,.alert-priority-layout,.alert-center-layout", page)
      .forEach(element => element.classList.add("alert-legacy-source"));

    let workspace = $(".alert-workspace-v2", page);
    if (!workspace) {
      workspace = document.createElement("section");
      workspace.className = "alert-workspace-v2";
      const header = $(".page-header", page);
      header?.insertAdjacentElement("afterend", workspace);
      if (!header) page.prepend(workspace);
    }

    const content = activeTab === "chat" ? chatTab() : activeTab === "communications" ? communicationsTab() : alertsTab();
    workspace.innerHTML = `${summaryHtml()}${tabsHtml()}<div class="alert-workspace-content">${content}</div><div class="alert-workspace-feedback" aria-live="polite"></div>`;
    const notificationBadge = $("#alertCount");
    if (notificationBadge) notificationBadge.textContent = automaticAlerts.length + alerts.filter(item => !isCurrentUserRead(item)).length;
    rendering = false;

    if (activeTab === "chat") {
      const list = $(".alert-chat-list-v2", workspace);
      if (list) list.scrollTop = list.scrollHeight;
      markVisibleChatRead();
    }
  }

  function feedback(message, type = "success") {
    const target = $(".alert-workspace-feedback");
    if (!target) return;
    target.textContent = message;
    target.dataset.type = type;
    clearTimeout(target._timer);
    target._timer = setTimeout(() => {
      target.textContent = "";
      delete target.dataset.type;
    }, 3500);
  }

  async function ensureClient() {
    if (client) return true;
    const { url, key, environment = "production" } = appConfig();
    if (!url || !key || !window.supabase?.createClient) return false;
    const remember = localStorage.getItem(REMEMBER_LOGIN_KEY) !== "false";
    client = window.supabase.createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: remember ? window.localStorage : window.sessionStorage,
        storageKey: remember
          ? `opscontrol-auth${environment !== "production" ? `-${environment}` : ""}`
          : `opscontrol-auth-session${environment !== "production" ? `-${environment}` : ""}`
      }
    });
    const { data, error } = await client.auth.getSession();
    if (error || !data.session?.user) return false;
    user = data.session.user;
    return true;
  }

  async function loadRemote() {
    if (rendering) return;
    if (!await ensureClient()) {
      renderWorkspace();
      feedback("Sessão do Supabase indisponível para os controles avançados.", "error");
      return;
    }

    const [
      profileResult, profilesResult, alertsResult, receiptsResult,
      messagesResult, messageReadsResult
    ] = await Promise.all([
      client.from("profiles").select("id,full_name,role,department,active").eq("id", user.id).maybeSingle(),
      client.from("profiles").select("id,full_name,role,department,active").eq("active", true),
      client.from("alerts").select("id,title,message,level,target_group,target_user_id,is_read,created_by,created_at,status,responsible_user_id,due_at,acknowledged_at,acknowledged_by,resolved_at,resolved_by,updated_at").order("created_at", { ascending: false }).limit(200),
      client.from("alert_read_receipts").select("alert_id,user_id,read_at").limit(5000),
      client.from("chat_messages").select("id,channel,sender_id,sender_name,message,created_at").order("created_at", { ascending: true }).limit(500),
      client.from("chat_message_reads").select("message_id,user_id,read_at").limit(5000)
    ]);

    const error = [profileResult, profilesResult, alertsResult, receiptsResult, messagesResult, messageReadsResult].find(result => result.error)?.error;
    if (error) {
      renderWorkspace();
      feedback(`Não foi possível carregar a central: ${error.message}`, "error");
      return;
    }

    currentProfile = profileResult.data || null;
    profiles = profilesResult.data || [];
    alerts = alertsResult.data || [];
    alertReceipts = receiptsResult.data || [];
    messages = messagesResult.data || [];
    messageReads = messageReadsResult.data || [];
    ensureActiveChannel();
    renderWorkspace();
    subscribeRealtime();
  }

  function scheduleLoad(delay = 80) {
    clearTimeout(loadTimer);
    loadTimer = setTimeout(loadRemote, delay);
  }

  function subscribeRealtime() {
    if (!client || realtime) return;
    realtime = client.channel("opscontrol-alert-center-v2")
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, () => scheduleLoad(120))
      .on("postgres_changes", { event: "*", schema: "public", table: "alert_read_receipts" }, () => scheduleLoad(120))
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => scheduleLoad(120))
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_message_reads" }, () => scheduleLoad(120))
      .subscribe();
  }

  async function saveAlertWorkflow(id, overrides = {}) {
    const card = document.querySelector(`[data-alert-workflow-card="${CSS.escape(id)}"]`);
    const current = alerts.find(item => item.id === id);
    if (!current) return;
    const status = overrides.status ?? card?.querySelector('[data-alert-field="status"]')?.value ?? current.status;
    const responsible = overrides.responsible ?? card?.querySelector('[data-alert-field="responsible"]')?.value ?? current.responsible_user_id ?? "";
    const dueValue = overrides.due ?? card?.querySelector('[data-alert-field="due"]')?.value ?? toLocalInput(current.due_at);
    const dueAt = dueValue ? new Date(dueValue).toISOString() : null;
    const { error } = await client.rpc("update_alert_workflow", {
      p_alert_id: id,
      p_status: status,
      p_responsible_user_id: responsible || null,
      p_due_at: dueAt
    });
    if (error) return feedback(error.message, "error");
    feedback("Atendimento atualizado.");
    await loadRemote();
  }

  async function markAlertRead(id) {
    const { error } = await client.from("alert_read_receipts").upsert({
      alert_id: id,
      user_id: user.id,
      read_at: new Date().toISOString()
    }, { onConflict: "alert_id,user_id" });
    if (error) return feedback(error.message, "error");
    feedback("Leitura confirmada.");
    await loadRemote();
  }

  async function deleteAlert(id) {
    if (!isAdmin()) return;
    if (!window.confirm("Excluir este comunicado definitivamente?")) return;
    const { error } = await client.from("alerts").delete().eq("id", id);
    if (error) return feedback(error.message, "error");
    feedback("Comunicado excluído.");
    await loadRemote();
  }

  async function sendChat(form) {
    const textarea = form.elements.message;
    const message = clean(textarea.value);
    if (!message) return;
    const submit = form.querySelector("button[type='submit']");
    if (submit) submit.disabled = true;
    const { error } = await client.from("chat_messages").insert({
      channel: activeChannel,
      sender_id: user.id,
      sender_name: currentName(),
      message
    });
    if (submit) submit.disabled = false;
    if (error) return feedback(error.message, "error");
    textarea.value = "";
    feedback("Mensagem enviada.");
    await loadRemote();
  }

  async function deleteChatMessage(id) {
    if (!window.confirm("Excluir esta mensagem?")) return;
    const { error } = await client.from("chat_messages").delete().eq("id", id);
    if (error) return feedback(error.message, "error");
    await loadRemote();
  }

  async function markVisibleChatRead() {
    if (!client || !user || activeTab !== "chat") return;
    const rows = messages
      .filter(message => message.channel === activeChannel && message.sender_id !== user.id)
      .filter(message => !messageReads.some(read => read.message_id === message.id && read.user_id === user.id))
      .map(message => ({ message_id: message.id, user_id: user.id, read_at: new Date().toISOString() }));
    if (!rows.length) return;
    const { error } = await client.from("chat_message_reads").upsert(rows, { onConflict: "message_id,user_id" });
    if (!error) {
      messageReads.push(...rows);
      const tab = $('[data-alert-tab="chat"]');
      if (tab) {
        const unread = messages.filter(message => message.sender_id !== user.id && !messageReads.some(read => read.message_id === message.id && read.user_id === user.id)).length;
        tab.querySelector("b").textContent = unread;
      }
    }
  }

  function enhanceAlertForm() {
    const form = $('#genericForm[data-kind="alert"]');
    if (!form || form.dataset.alertWorkflowEnhanced === VERSION || !profiles.length) return;
    form.dataset.alertWorkflowEnhanced = VERSION;
    const actions = form.querySelector(".form-actions");
    const fields = document.createElement("div");
    fields.className = "alert-v2-form-fields form-grid";
    fields.innerHTML = `
      <div><label>Status inicial</label><select name="workflow_status">${statusOptions("Novo")}</select></div>
      <div><label>Responsável</label><select name="responsible_user_id">${profileOptions("", true)}</select></div>
      <div class="wide"><label>Prazo de atendimento</label><input type="datetime-local" name="due_at"></div>`;
    actions?.insertAdjacentElement("beforebegin", fields);
  }

  async function submitEnhancedAlert(form, event) {
    if (localStorage.getItem(TEST_MODE_KEY) === "true") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!navigator.onLine) return feedback("Conexão necessária para criar o alerta com fluxo de atendimento.", "error");
    if (!await ensureClient()) return feedback("Sessão indisponível.", "error");
    const data = Object.fromEntries(new FormData(form));
    const submit = form.querySelector("button[type='submit'],button:not([type])");
    if (submit) submit.disabled = true;
    const { error } = await client.from("alerts").insert({
      title: clean(data.title),
      message: clean(data.message),
      level: data.level || "Informativo",
      target_group: clean(data.target) || null,
      is_read: false,
      status: data.workflow_status || "Novo",
      responsible_user_id: data.responsible_user_id || null,
      due_at: data.due_at ? new Date(data.due_at).toISOString() : null,
      created_by: user.id
    });
    if (submit) submit.disabled = false;
    if (error) return feedback(error.message, "error");
    $("#modalClose")?.click();
    feedback("Alerta criado com fluxo de atendimento.");
    await loadRemote();
  }

  function bindEvents() {
    document.addEventListener("click", async event => {
      const button = event.target.closest("button");
      if (!button) return;

      if (button.dataset.alertTab) {
        activeTab = button.dataset.alertTab;
        localStorage.setItem(TAB_KEY, activeTab);
        renderWorkspace();
        return;
      }
      if (button.dataset.alertFilter) {
        statusFilter = button.dataset.alertFilter;
        renderWorkspace();
        return;
      }
      if (button.dataset.chatChannel) {
        activeChannel = button.dataset.chatChannel;
        localStorage.setItem(CHANNEL_KEY, activeChannel);
        renderWorkspace();
        return;
      }
      if (button.dataset.alertRead) return markAlertRead(button.dataset.alertRead);
      if (button.dataset.alertSave) return saveAlertWorkflow(button.dataset.alertSave);
      if (button.dataset.alertAssume) return saveAlertWorkflow(button.dataset.alertAssume, { status: "Em andamento", responsible: user.id });
      if (button.dataset.alertResolve) return saveAlertWorkflow(button.dataset.alertResolve, { status: "Resolvido" });
      if (button.dataset.alertDeleteV2) return deleteAlert(button.dataset.alertDeleteV2);
      if (button.dataset.chatDelete) return deleteChatMessage(button.dataset.chatDelete);
    });

    document.addEventListener("input", event => {
      if (event.target.matches("[data-alert-query]")) {
        query = event.target.value;
        clearTimeout(event.target._timer);
        event.target._timer = setTimeout(renderWorkspace, 180);
      }
    });

    document.addEventListener("change", event => {
      if (event.target.matches("[data-alert-responsible-filter]")) {
        responsibleFilter = event.target.value;
        renderWorkspace();
      }
    });

    document.addEventListener("submit", event => {
      const chatForm = event.target.closest("[data-chat-compose]");
      if (chatForm) {
        event.preventDefault();
        event.stopImmediatePropagation();
        sendChat(chatForm);
        return;
      }
      const alertForm = event.target.closest('#genericForm[data-kind="alert"]');
      if (alertForm) submitEnhancedAlert(alertForm, event);
    }, true);
  }

  function observe() {
    const page = $(PAGE_SELECTOR);
    if (page) {
      new MutationObserver(mutations => {
        if (rendering) return;
        const externalChange = mutations.some(mutation => {
          const target = mutation.target.nodeType === 1 ? mutation.target : mutation.target.parentElement;
          return !target?.closest(".alert-workspace-v2");
        });
        if (externalChange) scheduleLoad(120);
      }).observe(page, { childList: true, subtree: true });
    }

    new MutationObserver(() => enhanceAlertForm())
      .observe(document.body, { childList: true, subtree: true });
  }

  async function start() {
    bindEvents();
    observe();
    await loadRemote();
    enhanceAlertForm();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();