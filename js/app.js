(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const CONFIG = window.OPSCONTROL_CONFIG || {};
  const CONFIG_KEY = "opscontrol_config";
  const THEME_KEY = "opscontrol_theme";
  const OFFLINE_QUEUE_KEY = "opscontrol_offline_queue";
  const LOCAL_BACKUP_KEY = "opscontrol_daily_backups";
  const FORM_DRAFT_KEY = "opscontrol_form_drafts";
  const TEST_MODE_KEY = "opscontrol_homologation_mode";
  const TEST_LOG_KEY = "opscontrol_homologation_log";
  const APP_ENV_KEY = "opscontrol_environment";
  const APP_VERSION = "20260716-v33-9-certificados-alertas-profissionais-1";
  const fmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
  const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

  const state = {
    client: null,
    user: null,
    data: null,
    page: "dashboard",
    realtime: null,
    realtimeStatus: "CLOSED",
    refreshing: false,
    refreshDebounce: null,
    refreshTimer: null,
    autoRefreshStarted: false,
    lastRefreshError: null,
    lastSync: null,
    filters: { start: "", end: "", client: "", product: "" },
    handover: { date: "", shift: "" },
    closing: { date: "", shift: "" },
    tv: { slide: 0, paused: false, timer: null, clockTimer: null, intervalMs: 15000 },
    offlineSyncing: false,
    installPrompt: null,
    searchQuery: "",
    testMode: localStorage.getItem(TEST_MODE_KEY) === "true",
    draftTimer: null,
    mobile: {
      moreOpen: false,
      quickOpen: false,
      pullReady: false,
      pullDistance: 0,
      pullStartY: 0,
      pullRefreshing: false
    },
    config: loadConfig()
  };

  function loadConfig() {
    const saved = JSON.parse(localStorage.getItem(CONFIG_KEY) || "{}");
    const environment = localStorage.getItem(APP_ENV_KEY) || CONFIG.defaultEnvironment || "production";
    const selected = CONFIG.environments?.[environment] || {};
    return {
      url: saved.url || selected.supabaseUrl || CONFIG.supabaseUrl || "",
      key: saved.key || selected.supabaseKey || CONFIG.supabaseKey || "",
      environment
    };
  }

  function esc(value = "") {
    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[char]));
  }



  const UI_ICONS = {
    anchor: '<path d="M12 3v15"></path><path d="M8 7l4-4 4 4"></path><path d="M5 21h14"></path><path d="M4 17c2.5 0 3.5 1 5 1s2.5-1 4-1 2.5 1 4 1 2.5-1 3-1"></path>',
    truck: '<path d="M3 6h11v9H3z"></path><path d="M14 9h3l4 4v2h-7z"></path><circle cx="7.5" cy="18" r="1.5"></circle><circle cx="17.5" cy="18" r="1.5"></circle>',
    wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.3 2.3-2-2z"></path>',
    bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7"></path><path d="M10.5 20a1.5 1.5 0 0 0 3 0"></path>',
    droplet: '<path d="M12 3.2S6.5 9.1 6.5 14a5.5 5.5 0 0 0 11 0C17.5 9.1 12 3.2 12 3.2z"></path>',
    package: '<path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5z"></path><path d="m4 7.5 8 4.5 8-4.5"></path><path d="M12 12v9"></path>',
    gauge: '<path d="M4 18a8 8 0 1 1 16 0"></path><path d="M12 14l4-4"></path><path d="M6.5 14h.01"></path><path d="M17.5 14h.01"></path>',
    alert: '<path d="M12 3 2.8 20h18.4L12 3z"></path><path d="M12 9v5"></path><path d="M12 17h.01"></path>',
    refresh: '<path d="M20 11a8 8 0 1 0 2 5"></path><path d="M20 4v7h-7"></path>',
    check: '<path d="m5 12 4 4L19 6"></path>',
    lock: '<rect x="5" y="10" width="14" height="10" rx="2"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path>',
    paperclip: '<path d="m20.5 11.5-8.8 8.8a5 5 0 0 1-7.1-7.1l9.2-9.2a3.5 3.5 0 0 1 5 5l-9.2 9.2a2 2 0 1 1-2.8-2.8l8.5-8.5"></path>',
    products: '<rect x="3" y="4" width="8" height="7" rx="1"></rect><rect x="13" y="4" width="8" height="7" rx="1"></rect><rect x="3" y="13" width="8" height="7" rx="1"></rect><rect x="13" y="13" width="8" height="7" rx="1"></rect>',
    layers: '<path d="m12 3 9 5-9 5-9-5 9-5z"></path><path d="m3 12 9 5 9-5"></path><path d="m3 16 9 5 9-5"></path>',
    hourglass: '<path d="M6 3h12"></path><path d="M6 21h12"></path><path d="M8 3c0 4 1 5 4 7-3 2-4 3-4 7"></path><path d="M16 3c0 4-1 5-4 7 3 2 4 3 4 7"></path>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"></rect><circle cx="9" cy="10" r="2"></circle><path d="m21 15-5-5L5 20"></path>',
    file: '<path d="M7 3h7l4 4v14H7z"></path><path d="M14 3v5h5"></path><path d="M10 13h5"></path><path d="M10 17h5"></path>',
    database: '<ellipse cx="12" cy="5" rx="8" ry="3"></ellipse><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"></path><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"></path>',
    shield: '<path d="M12 3l7 3v5c0 4.5-3 8.7-7 10-4-1.3-7-5.5-7-10V6l7-3z"></path><path d="m8.5 12 2.2 2.2 4.8-5"></path>',
    flask: '<path d="M10 2v7.5L5 18a3 3 0 0 0 2.6 4.5h8.8A3 3 0 0 0 19 18l-5-8.5V2"></path><path d="M8 2h8"></path><path d="M8.5 14h7"></path>',
    monitor: '<rect x="3" y="4" width="18" height="13" rx="2"></rect><path d="M8 21h8"></path><path d="M12 17v4"></path>',
    settings: '<circle cx="12" cy="12" r="3"></circle><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.5 1a8 8 0 0 0-1.7-1L14.4 3h-4.8l-.4 3.1a8 8 0 0 0-1.7 1L5 6.1 3 9.5 5 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.5-1a8 8 0 0 0 1.7 1l.4 3.1h4.8l.4-3.1a8 8 0 0 0 1.7-1l2.5 1 2-3.4-2-1.5c.1-.3.1-.7.1-1z"></path>'
  };

  function uiIcon(name, className = "ui-icon") {
    const paths = UI_ICONS[name] || UI_ICONS.database;
    return `<svg class="${esc(className)}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  }

  function uid(prefix = "id") {
    return `${prefix}-${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
  }

  function dateOnly(value) {
    if (!value) return "-";
    return new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR");
  }

  function dateTime(value) {
    if (!value) return "-";
    return new Date(value).toLocaleString("pt-BR");
  }

  function toLocalInput(value) {
    if (!value) return "";
    const d = new Date(value);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  function daysUntil(value) {
    if (!value) return null;
    return Math.ceil((new Date(`${String(value).slice(0, 10)}T23:59:59`) - new Date()) / 86400000);
  }

  function localDateKey(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  function recordDateKey(value) {
    if (!value) return "";
    const text = String(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    return localDateKey(value);
  }

  function addDaysToDateKey(dateKey, days) {
    if (!dateKey) return "";
    const date = new Date(`${dateKey}T12:00:00`);
    if (Number.isNaN(date.getTime())) return "";
    date.setDate(date.getDate() + Number(days || 0));
    return localDateKey(date);
  }

  function normalizedAlertLevel(value = "") {
    return String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function isCriticalAlert(value) {
    return ["alta", "critica", "critico", "critical", "urgente"].includes(normalizedAlertLevel(value));
  }

  function latestTimestamp(values = []) {
    const valid = values
      .filter(Boolean)
      .map(value => new Date(value))
      .filter(value => !Number.isNaN(value.getTime()));
    return valid.length ? new Date(Math.max(...valid.map(value => value.getTime()))) : null;
  }

  function filterIsActive() {
    return Object.values(state.filters).some(Boolean);
  }

  const MOBILE_PAGE_META = {
    dashboard: ["Início", "Resumo do seu perfil"],
    quality: ["Qualidade dos Dados", "Conciliação e inconsistências"],
    sanitation: ["Saneamento de Dados", "Registros antigos e vínculos"],
    tv: ["Painel TV", "Exibição coletiva"],
    operations: ["Operações", "Serviços e movimentações"],
    tanks: ["Tanques e Silos", "Inventário da planta"],
    fluids: ["Fluidos e Granéis", "Catálogo de produtos"],
    "chemical-catalog": ["Catálogo Químico", "Nomes e unidades oficiais"],
    chemicals: ["Inventário Químico", "Lotes, validade e saldo"],
    trucks: ["Carretas", "Entradas e saídas"],
    qhse: ["QHSE", "Segurança e ações"],
    maintenance: ["Manutenção", "Equipamentos e ordens"],
    certificates: ["Certificados", "Documentos da equipe"],
    alerts: ["Alertas e Chat", "Comunicação operacional"],
    reports: ["Relatórios", "Passagem de serviço"],
    audit: ["Auditoria", "Rastreabilidade"],
    settings: ["Configurações", "Perfil e sistema"]
  };

  function isMobileViewport() {
    return window.matchMedia("(max-width: 820px)").matches;
  }

  function isStandaloneApp() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }

  function closeMobileSheets() {
    state.mobile.moreOpen = false;
    state.mobile.quickOpen = false;
    $("#mobileMoreSheet")?.classList.add("hidden");
    $("#mobileQuickSheet")?.classList.add("hidden");
    $("#mobileSheetBackdrop")?.classList.add("hidden");
    document.body.classList.remove("mobile-sheet-open");
  }

  function openMobileSheet(kind) {
    if (!isMobileViewport()) return;
    closeMobileSheets();
    const target = kind === "quick" ? $("#mobileQuickSheet") : $("#mobileMoreSheet");
    if (!target) return;
    state.mobile.quickOpen = kind === "quick";
    state.mobile.moreOpen = kind === "more";
    target.classList.remove("hidden");
    $("#mobileSheetBackdrop")?.classList.remove("hidden");
    document.body.classList.add("mobile-sheet-open");
  }

  function mobileModuleButton(page, label, description = "") {
    const moduleIcons = {
      fluids: "droplet", "chemical-catalog": "products", quality: "shield", sanitation: "database",
      reports: "gauge", chemicals: "flask", trucks: "truck", qhse: "shield", maintenance: "wrench",
      certificates: "file", alerts: "bell", audit: "check", settings: "settings", tv: "monitor"
    };
    return `<button class="mobile-module-button" data-mobile-page="${page}">
      <span class="mobile-module-icon">${uiIcon(moduleIcons[page] || "database")}</span>
      <span><strong>${esc(label)}</strong><small>${esc(description)}</small></span>
      <b>›</b>
    </button>`;
  }

  function mobileQuickButton(action, label, description, icon) {
    return `<button class="mobile-quick-button" data-action="${action}">
      <span>${icon}</span><span><strong>${esc(label)}</strong><small>${esc(description)}</small></span><b>+</b>
    </button>`;
  }

  function renderMobileShell() {
    if (!state.data) return;

    const [title, subtitle] = MOBILE_PAGE_META[state.page] || [state.page, ""];
    if ($("#mobilePageTitle")) $("#mobilePageTitle").textContent = title;
    if ($("#mobilePageSubtitle")) $("#mobilePageSubtitle").textContent = subtitle;

    $$("[data-mobile-page]").forEach(button => {
      const page = button.dataset.mobilePage;
      button.classList.toggle("active", page === state.page);
      if (button.closest("#mobileBottomNav")) {
        button.classList.toggle("hidden", !moduleAllowed(page));
      }
    });

    const morePages = [
      ["fluids", "Fluidos e Granéis", "Cadastrar produtos vinculados à tancagem"],
      ["chemical-catalog", "Catálogo Químico", "Nomes oficiais dos insumos"],
      ["quality", "Qualidade", "Conciliação e inconsistências"],
      ["sanitation", "Saneamento", "Corrigir vínculos antigos"],
      ["reports", "Relatórios", "Passagem e indicadores"],
      ["chemicals", "Químicos", "Estoque e validade"],
      ["trucks", "Carretas", "Entradas e saídas"],
      ["qhse", "QHSE", "Segurança e ocorrências"],
      ["maintenance", "Manutenção", "Equipamentos e OS"],
      ["certificates", "Certificados", "Documentos"],
      ["alerts", "Alertas", "Avisos e chat"],
      ["audit", "Auditoria", "Alterações do sistema"],
      ["settings", "Configurações", "Perfil e sistema"],
      ["tv", "Painel TV", "Exibição coletiva"]
    ].filter(([page]) => moduleAllowed(page));

    const more = $("#mobileMoreModules");
    if (more) more.innerHTML = morePages.map(([page, label, description]) => mobileModuleButton(page, label, description)).join("");

    const quickActions = [];
    if (moduleAllowed("fluids") && canManageFluidCatalog()) {
      quickActions.push(mobileQuickButton("new-fluid", "Cadastrar fluido", "Produto líquido para tanques e mix tanks", uiIcon("droplet")));
      quickActions.push(mobileQuickButton("new-bulk", "Cadastrar granel", "Produto sólido para os silos", uiIcon("package")));
    }
    if (moduleAllowed("chemical-catalog") && canManageChemicals()) {
      quickActions.push(mobileQuickButton("new-chemical-product", "Cadastrar químico", "Nome e unidade no catálogo oficial", uiIcon("products")));
    }
    if (moduleAllowed("operations") && hasRole(["supervisor", "lider", "operador"])) {
      quickActions.push(mobileQuickButton("new-operation", "Nova operação", "Bombeio, fabricação, backload ou descarga", uiIcon("anchor")));
    }
    if (moduleAllowed("trucks") && hasRole(["supervisor", "lider", "logistica"])) {
      quickActions.push(mobileQuickButton("new-truck", "Movimentar carreta", "Entrada, saída, NF e produto", uiIcon("truck")));
    }
    if (moduleAllowed("qhse") && hasRole(["supervisor", "lider", "operador", "qhse"])) {
      quickActions.push(mobileQuickButton("new-qhse", "Novo registro QHSE", "DDS, APR, risco, inspeção ou ocorrência", uiIcon("shield")));
    }
    if (moduleAllowed("maintenance") && hasRole(["supervisor", "lider", "mecanico"])) {
      quickActions.push(mobileQuickButton("new-maintenance-order", "Abrir ordem de serviço", "Preventiva, corretiva ou inspeção", uiIcon("wrench")));
    }
    if (moduleAllowed("chemicals") && canManageChemicals()) {
      quickActions.push(mobileQuickButton("new-chemical", "Adicionar lote", "Quantidade, validade e localização", uiIcon("flask")));
    }
    if (moduleAllowed("alerts") && hasRole(["supervisor", "lider", "qhse", "logistica"])) {
      quickActions.push(mobileQuickButton("new-alert", "Criar comunicado", "Aviso para a equipe", uiIcon("bell")));
    }

    const quick = $("#mobileQuickActions");
    if (quick) quick.innerHTML = quickActions.join("") || `<div class="empty">Nenhum atalho disponível para seu perfil.</div>`;

    const installArea = $("#mobileInstallArea");
    if (installArea) {
      const feedbackButton = `<button class="btn secondary full mobile-feedback-button" data-action="open-feedback">Enviar feedback da versão</button>`;
      installArea.innerHTML = feedbackButton + (state.installPrompt && !isStandaloneApp()
        ? `<button class="btn primary full" data-action="install-app">Instalar OpsControl neste celular</button><small>O aplicativo ficará disponível na tela inicial.</small>`
        : isStandaloneApp()
          ? `<div class="info-box">OpsControl já está instalado neste aparelho.</div>`
          : `<small>Use “Adicionar à tela de início” no navegador para instalar.</small>`);
    }

    const pending = offlineQueue().length;
    const banner = $("#mobileStatusBanner");
    if (banner) {
      if (!navigator.onLine || pending) {
        banner.classList.remove("hidden");
        banner.className = `mobile-status-banner ${navigator.onLine ? "pending" : "offline"}`;
        banner.innerHTML = navigator.onLine
          ? `<strong>${pending} registro(s) aguardando sincronização</strong><button data-action="sync-offline">Sincronizar</button>`
          : `<strong>Sem conexão</strong><span>${pending ? `${pending} registro(s) salvos no aparelho` : "Você está trabalhando offline"}</span>`;
      } else {
        banner.classList.add("hidden");
      }
    }
  }


  function normalizeSearch(value = "") {
    return String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function searchIndex() {
    const d = state.data || {};
    const rows = [];
    const add = (type, id, page, title, subtitle, terms = "") => rows.push({
      type, id, page, title, subtitle,
      haystack: normalizeSearch(`${title} ${subtitle} ${terms}`)
    });

    (d.tanks || []).forEach(x => add("tank", x.id, "tanks", x.name, `${x.product || "Sem produto"} • lote ${x.lot || "-"}`, `${x.phase} ${x.kind} ${x.status}`));
    (d.operations || []).forEach(x => add("operation", x.id, "operations", `${x.client} • ${x.vessel}`, `${x.activity} de ${x.product}`, `${x.service_order} ${x.ticketNumber} ${x.rig} ${x.well} ${x.lot} ${x.status}`));
    (d.trucks || []).forEach(x => {
      const itemTerms = (x.items || []).map(item => `${item.productName} ${item.quantity} ${item.unit}`).join(" ");
      add("truck", x.id, "trucks", x.plate || x.product, `${x.truckType} • ${x.product} • NF ${x.invoice || "-"}`, `${x.driver} ${x.supplier} ${x.client} ${x.lot} ${itemTerms}`);
    });
    (d.chemicalProducts || []).forEach(x => add("chemical-product", x.id, "chemical-catalog", x.name, `${x.category || "Produto químico"} • ${x.unit}`, x.notes));
    (d.chemicals || []).forEach(x => add("chemical", x.id, "chemicals", x.name, `Lote ${x.lot || "-"} • ${fmt.format(x.quantity)} ${x.unit}`, `${x.location} ${x.supplier} ${x.category}`));
    (d.equipment || []).forEach(x => add("equipment", x.id, "maintenance", x.name, `${x.category} • ${x.status}`, `${x.location} ${x.notes}`));
    (d.maintenanceOrders || []).forEach(x => add("maintenance", x.id, "maintenance", x.title, `${x.responsible || "Sem responsável"} • ${x.status}`, `${x.priority} ${x.description}`));
    (d.qhse || []).forEach(x => add("qhse", x.id, "qhse", x.title, `${x.type} • ${x.status}`, `${x.description} ${x.responsible}`));
    (d.certificates || []).forEach(x => add("certificate", x.id, "certificates", x.title, `${x.owner} • ${dateOnly(x.expires_at)}`, `${x.issuer} ${x.status}`));
    (d.users || []).forEach(x => add("user", x.id, "settings", x.name, `${x.role} • ${x.department || "-"}`, x.email));
    return rows;
  }

  function globalSearchResults(query) {
    const normalized = normalizeSearch(query);
    if (normalized.length < 2) return [];
    const tokens = normalized.split(/\s+/).filter(Boolean);
    return searchIndex()
      .map(item => ({ ...item, score: tokens.reduce((sum, token) => sum + (item.haystack.includes(token) ? 1 : 0), 0) }))
      .filter(item => item.score === tokens.length)
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
      .slice(0, 40);
  }

  function searchResultIcon(type) {
    return ({ tank: "TK", operation: "OP", truck: "CR", "chemical-product": "CQ", chemical: "QI", equipment: "EQ", maintenance: "OS", qhse: "QS", certificate: "CT", user: "US" })[type] || "•";
  }

  function renderGlobalSearchResults(query = "") {
    const container = $("#globalSearchResults");
    if (!container) return;
    const results = globalSearchResults(query);
    container.innerHTML = query.trim().length < 2
      ? `<div class="search-empty-state"><strong>Digite pelo menos duas letras</strong><span>Pesquise embarcação, OS, NF, lote, tanque, produto, placa, funcionário ou equipamento.</span></div>`
      : results.length
        ? results.map(item => `<button class="global-search-result" data-search-type="${item.type}" data-search-id="${item.id}" data-search-page="${item.page}">
            <span class="global-search-icon">${searchResultIcon(item.type)}</span>
            <span><strong>${esc(item.title)}</strong><small>${esc(item.subtitle)}</small></span><b>›</b>
          </button>`).join("")
        : `<div class="search-empty-state"><strong>Nenhum resultado encontrado</strong><span>Tente pesquisar outro nome, lote, NF, OS ou placa.</span></div>`;
  }

  function globalSearchModal() {
    return `<div class="global-search-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-4-4"></path></svg><input id="globalSearchInput" autocomplete="off" placeholder="Pesquisar em todo o sistema" value="${esc(state.searchQuery)}"></div><div id="globalSearchResults" class="global-search-results"></div>`;
  }

  function openGlobalSearch() {
    openModal("Busca geral", globalSearchModal(), "LOCALIZAR");
    setTimeout(() => {
      $("#globalSearchInput")?.focus();
      renderGlobalSearchResults(state.searchQuery);
    }, 50);
  }

  function openSearchResult(type, id, page) {
    closeModal();
    showPage(page);
    if (type === "tank") return openAssetQr("tank", id);
    if (type === "equipment") return openAssetQr("equipment", id);
    if (type === "operation") {
      const item = state.data.operations.find(x => x.id === id);
      if (item && hasRole(["supervisor", "lider", "operador"])) openModal(`Operação — ${item.vessel}`, operationForm(item), "RESULTADO");
      return;
    }
    if (type === "chemical-product") {
      const item = state.data.chemicalProducts.find(x => x.id === id);
      if (item && canManageChemicals()) openModal(`Produto químico — ${item.name}`, chemicalProductForm(item), "CATÁLOGO QUÍMICO");
      return;
    }
    if (type === "chemical") {
      const item = state.data.chemicals.find(x => x.id === id);
      if (item) {
        const history = state.data.chemicalMovements.filter(x => x.inventory_id === id);
        openModal(`Produto — ${item.name}`, `<div class="asset-detail-summary"><h3>${esc(item.name)}</h3><p>Lote ${esc(item.lot || "-")} • ${fmt.format(item.quantity)} ${esc(item.unit)}</p></div><div class="timeline professional-timeline">${history.slice(0, 30).map(x => `<div class="timeline-item"><span class="timeline-dot"></span><div><strong>${esc(x.movement_type)} — ${fmt.format(x.quantity)} ${esc(item.unit)}</strong><small>${dateTime(x.created_at)}</small><p>Saldo: ${fmt.format(x.previous_balance)} → ${fmt.format(x.new_balance)}</p></div></div>`).join("") || `<div class="empty">Sem movimentações.</div>`}</div>`, "RESULTADO");
      }
      return;
    }
    if (type === "maintenance") {
      const item = state.data.maintenanceOrders.find(x => x.id === id);
      if (item && hasRole(["supervisor", "lider", "mecanico"])) openModal("Ordem de serviço", maintenanceOrderForm(item), "RESULTADO");
      return;
    }
    if (type === "qhse") {
      document.querySelector(`[data-qhse-actions="${id}"]`)?.click();
      return;
    }
    toast("Módulo aberto no registro pesquisado.", "success");
  }

  function draftStore() {
    try { return JSON.parse(localStorage.getItem(FORM_DRAFT_KEY) || "{}"); } catch (_) { return {}; }
  }

  function draftIdentity(form) {
    if (!form) return "";
    if (form.id === "tankForm") return "";
    const hiddenRecordId = form.querySelector?.('input[type="hidden"][name="id"]')?.value
      || form.querySelector?.('input[type="hidden"][name="tank_id"]')?.value
      || "";
    if (form.dataset.id || form.dataset.userId || form.dataset.operationId || form.dataset.recordId || hiddenRecordId) return "";
    const kind = form.dataset.kind || form.id;
    return `${state.user?.id || "anon"}:${kind}`;
  }

  function clearLegacyTankDrafts() {
    try {
      const drafts = draftStore();
      let changed = false;
      Object.keys(drafts).forEach(key => {
        if (key.endsWith(":tankForm") || key.includes("tankForm")) {
          delete drafts[key];
          changed = true;
        }
      });
      if (changed) localStorage.setItem(FORM_DRAFT_KEY, JSON.stringify(drafts));
    } catch (_) {}
  }

  function serializeFormDraft(form) {
    const fields = [...form.querySelectorAll("input[name],select[name],textarea[name]")]
      .filter(field => !["file", "password", "hidden"].includes(field.type))
      .filter(field => !["id", "tank_id", "record_id", "operation_id"].includes(field.name))
      .map((field, index) => ({
        name: field.name,
        index,
        type: field.type,
        value: field.value,
        checked: field.checked
      }));
    const allocationRows = form.id === "operationForm"
      ? [...form.querySelectorAll("[data-operation-allocation-row]")].map(row => ({
          tank_id: row.querySelector("[data-allocation-tank]")?.value || "",
          quantity: row.querySelector("[data-allocation-quantity]")?.value || ""
        }))
      : [];
    const truckItems = form.id === "truckForm"
      ? [...form.querySelectorAll("[data-truck-platform-row]")].map(row => ({
          chemical_product_id: row.querySelector("[data-truck-item-product]")?.value || "",
          quantity: row.querySelector("[data-truck-item-quantity]")?.value || ""
        }))
      : [];
    return { fields, allocationRows, truckItems, saved_at: new Date().toISOString() };
  }

  function saveFormDraft(form) {
    const key = draftIdentity(form);
    if (!key) return;
    const drafts = draftStore();
    drafts[key] = serializeFormDraft(form);
    localStorage.setItem(FORM_DRAFT_KEY, JSON.stringify(drafts));
    const status = $("#draftStatus");
    if (status) status.textContent = `Rascunho salvo às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  }

  function clearFormDraft(form) {
    const key = draftIdentity(form);
    if (!key) return;
    const drafts = draftStore();
    delete drafts[key];
    localStorage.setItem(FORM_DRAFT_KEY, JSON.stringify(drafts));
  }

  function restoreFormDraft(form) {
    const key = draftIdentity(form);
    if (!key) return false;
    const draft = draftStore()[key];
    if (!draft?.fields?.length) return false;

    if (form.id === "truckForm" && draft.truckItems?.length) {
      const list = form.querySelector("[data-truck-items-list]");
      if (list) list.innerHTML = draft.truckItems.map(item => truckPlatformItemRow({
        chemicalProductId:item.chemical_product_id,
        quantity:item.quantity
      })).join("");
    }

    if (form.id === "operationForm" && draft.allocationRows?.length) {
      const mode = tankMovementMode(form.elements.activity?.value || "");
      const direction = mode === "out" ? "source" : "destination";
      const unit = form.elements.unit?.value || "bbl";
      const list = form.querySelector("[data-operation-allocation-list]");
      if (list && mode !== "none") {
        list.innerHTML = draft.allocationRows.map(row => operationAllocationRow({ tank_id: row.tank_id, quantity: row.quantity }, direction, unit, false, form.elements.fluid_type_id?.value || "")).join("");
      }
    }

    const allFields = [...form.querySelectorAll("input[name],select[name],textarea[name]")]
      .filter(field => !["file", "password", "hidden"].includes(field.type))
      .filter(field => !["id", "tank_id", "record_id", "operation_id"].includes(field.name));
    draft.fields.forEach(saved => {
      if (["id", "tank_id", "record_id", "operation_id"].includes(saved.name)) return;
      const candidates = allFields.filter(field => field.name === saved.name);
      const field = candidates.shift() || allFields[saved.index];
      if (!field || field.type === "file") return;
      if (["checkbox", "radio"].includes(field.type)) field.checked = saved.checked;
      else field.value = saved.value;
    });

    const banner = document.createElement("div");
    banner.className = "draft-restored-banner";
    banner.innerHTML = `<div><strong>Rascunho restaurado</strong><span id="draftStatus">Salvo em ${dateTime(draft.saved_at)}</span></div><button type="button" class="btn small secondary" data-action="discard-draft">Descartar</button>`;
    form.prepend(banner);
    syncOperationCatalogFields(form);
    if (form.id === "truckForm") syncTruckForm(form);
    updateOperationAllocationSummary(form);
    return true;
  }

  function scheduleDraftSave(form) {
    if (!draftIdentity(form)) return;
    clearTimeout(state.draftTimer);
    state.draftTimer = setTimeout(() => saveFormDraft(form), 450);
  }

  function testLog() {
    try { return JSON.parse(localStorage.getItem(TEST_LOG_KEY) || "[]"); } catch (_) { return []; }
  }

  function addTestLog(context, data = {}) {
    const log = testLog();
    log.unshift({
      id: uid("test"),
      context,
      data,
      user: state.data?.profile?.name || state.user?.email || "Usuário",
      page: state.page,
      created_at: new Date().toISOString()
    });
    localStorage.setItem(TEST_LOG_KEY, JSON.stringify(log.slice(0, 300)));
  }

  function setTestMode(enabled) {
    state.testMode = enabled;
    localStorage.setItem(TEST_MODE_KEY, String(enabled));
    document.body.classList.toggle("homologation-mode", enabled);
    renderAll();
    toast(enabled ? "Modo homologação ativado. Nenhum salvamento irá para o banco oficial." : "Modo homologação desativado.", "success");
  }

  function simulateFormSubmission(form) {
    const payload = Object.fromEntries(new FormData(form));
    if (form.id === "truckForm") payload.platform_items = collectTruckPlatformItems(form, false);
    Object.keys(payload).forEach(key => {
      if (payload[key] instanceof File) payload[key] = payload[key].name || "arquivo";
    });
    addTestLog(`form:${form.id || form.dataset.kind || "registro"}`, payload);
    clearFormDraft(form);
    closeModal();
    renderSettings();
    toast("Ação simulada na homologação local. O banco oficial não foi alterado.", "success");
  }

  function feedbackForm() {
    return `<form id="feedbackForm">
      <div class="form-grid">
        <div><label>Tipo</label><select name="category"><option>Erro</option><option>Dificuldade</option><option selected>Sugestão</option><option>Campo desnecessário</option><option>Informação ausente</option></select></div>
        <div><label>Nota da experiência</label><select name="rating"><option value="">Sem nota</option>${[1,2,3,4,5].map(value => `<option value="${value}">${value} de 5</option>`).join("")}</select></div>
        <div class="wide"><label>O que aconteceu ou poderia melhorar? *</label><textarea name="message" required placeholder="Conte onde demorou, errou, precisou voltar ou não encontrou uma informação."></textarea></div>
        <input type="hidden" name="page" value="${esc(state.page)}">
      </div>${formActions("Enviar feedback")}
    </form>`;
  }

  function assetData(type, id) {
    if (type === "tank") {
      const item = state.data.tanks.find(x => x.id === id);
      if (!item) return null;
      return {
        type, id, page: "tanks", code: item.name, title: item.name,
        subtitle: `${item.phase} • ${item.kind}`,
        lines: [
          ["Produto", item.product || "Sem produto"],
          ["Lote", item.lot || "-"],
          ["Saldo", `${fmt.format(item.volume)} ${item.unit}`],
          ["Capacidade", `${fmt.format(item.capacity)} ${item.unit}`],
          ["Status", item.status],
          ["Atualização", dateTime(item.updated_at)]
        ]
      };
    }
    if (type === "equipment") {
      const item = state.data.equipment.find(x => x.id === id);
      if (!item) return null;
      return {
        type, id, page: "maintenance", code: item.name, title: item.name,
        subtitle: `${item.category} • ${item.location || "-"}`,
        lines: [
          ["Status", item.status],
          ["Horímetro", `${fmt.format(item.hourmeter)} h`],
          ["Próxima manutenção", dateOnly(item.next_maintenance_date)],
          ["Localização", item.location || "-"],
          ["Atualização", dateTime(item.updated_at)]
        ]
      };
    }
    return null;
  }

  function assetDeepLink(type, id) {
    const url = new URL(location.href);
    url.searchParams.set("asset", type);
    url.searchParams.set("id", id);
    const data = assetData(type, id);
    url.hash = data?.page || "dashboard";
    return url.toString();
  }

  function qrSvg(text) {
    if (typeof qrcode !== "function") return `<div class="qr-error">Gerador de QR indisponível.</div>`;
    const qr = qrcode(0, "M");
    qr.addData(text);
    qr.make();
    return qr.createSvgTag({ cellSize: 5, margin: 2, scalable: true });
  }

  function assetQrContent(type, id) {
    const data = assetData(type, id);
    if (!data) return `<div class="empty">Ativo não localizado.</div>`;
    const link = assetDeepLink(type, id);
    return `<div class="asset-qr-layout" id="assetQrPrint">
      <div class="asset-qr-code">${qrSvg(link)}</div>
      <div class="asset-qr-info"><span class="asset-code">${esc(data.code)}</span><h3>${esc(data.title)}</h3><p>${esc(data.subtitle)}</p><div class="asset-detail-grid">${data.lines.map(([label, value]) => `<span>${esc(label)}<strong>${esc(value)}</strong></span>`).join("")}</div></div>
      <div class="asset-qr-actions no-print"><button class="btn secondary" data-action="copy-asset-link" data-link="${esc(link)}">Copiar link</button><button class="btn primary" data-action="print-asset-qr">Imprimir etiqueta</button></div>
    </div>`;
  }

  function openAssetQr(type, id) {
    const data = assetData(type, id);
    if (!data) return toast("Ativo não localizado.", "error");
    showPage(data.page);
    openModal(`Identificação — ${data.title}`, assetQrContent(type, id), "QR CODE");
  }

  function openDeepLinkedAsset() {
    const params = new URLSearchParams(location.search);
    const type = params.get("asset");
    const id = params.get("id");
    if (!type || !id) return;
    setTimeout(() => openAssetQr(type, id), 180);
  }

  function toast(message, kind = "normal") {
    const el = document.createElement("div");
    el.className = `toast ${kind}`;
    el.textContent = message;
    $("#toastContainer").appendChild(el);
    setTimeout(() => el.remove(), 3600);
  }

  function showLoginMessage(message) {
    const el = $("#loginMessage");
    el.textContent = message;
    el.classList.remove("hidden");
  }

  function role() {
    return String(state.data?.profile?.role || "").toLowerCase();
  }

  function isAdmin() {
    return role() === "admin";
  }

  function hasRole(roles) {
    return isAdmin() || roles.includes(role());
  }

  function canManageFluidCatalog() {
    return hasRole(["supervisor", "lider", "logistica"]);
  }

  function canManageTrucks() {
    return hasRole(["supervisor", "lider", "logistica"]);
  }

  function canManageChemicals() {
    return hasRole(["supervisor", "lider", "logistica", "qhse"]);
  }

  function canManageCertificates() {
    return hasRole(["supervisor", "logistica"]);
  }

  function canManageHandover() {
    return hasRole(["supervisor", "lider", "operador", "logistica", "qhse", "mecanico"]);
  }

  function canDeleteHandoverPending() {
    return hasRole(["supervisor", "lider"]);
  }

  function canApproveHandover() {
    return hasRole(["supervisor", "lider"]);
  }

  function canViewAudit() {
    return hasRole(["supervisor"]);
  }

  function moduleAllowed(module) {
    if (isAdmin() || module === "settings") return true;
    if (module === "fluids" && ["supervisor", "lider", "operador", "logistica", "qhse"].includes(role())) return true;
    if (module === "chemical-catalog" && ["supervisor", "lider", "logistica", "qhse"].includes(role())) return true;
    if (module === "sanitation" && ["admin", "supervisor"].includes(role())) return true;
    const permissions = state.data?.profile?.permissions || {};
    if (Object.prototype.hasOwnProperty.call(permissions, module)) return permissions[module] !== false;

    const defaults = {
      supervisor: ["dashboard", "quality", "sanitation",  "tv", "operations", "tanks", "fluids", "chemical-catalog", "chemicals", "trucks", "qhse", "maintenance", "certificates", "alerts", "reports", "audit"],
      lider: ["dashboard", "quality",  "tv", "operations", "tanks", "fluids", "chemical-catalog", "chemicals", "trucks", "qhse", "maintenance", "certificates", "alerts", "reports"],
      operador: ["dashboard", "quality", "tv", "operations", "tanks", "fluids", "chemical-catalog", "chemicals", "trucks", "qhse", "alerts", "reports"],
      logistica: ["dashboard", "quality",  "tv", "operations", "tanks", "fluids", "chemical-catalog", "chemicals", "trucks", "certificates", "alerts", "reports"],
      mecanico: ["dashboard", "quality", "tv", "maintenance", "certificates", "alerts", "reports"],
      qhse: ["dashboard", "quality",  "tv", "operations", "chemicals", "qhse", "certificates", "alerts", "reports"],
      tv: ["tv"],
      user: ["dashboard", "quality", "tv", "certificates", "alerts"]
    };
    return (defaults[role()] || defaults.user).includes(module);
  }

  function statusClass(status = "") {
    const s = String(status).toLowerCase();
    if (["conclu", "liberado", "válido", "ativo", "recebida", "operando", "disponível", "fechada"].some(x => s.includes(x))) return "green";
    if (["andamento", "programada", "atenção", "a vencer", "próximo vencimento", "manutenção", "média", "aberta"].some(x => s.includes(x))) return "amber";
    if (["bloqueado", "parado", "crítico", "vencido", "baixo estoque", "alta", "cancelada", "inativo"].some(x => s.includes(x))) return "red";
    if (s.includes("wbm")) return "blue";
    return "neutral";
  }

  function badge(text) {
    return `<span class="badge ${statusClass(text)}">${esc(text || "-")}</span>`;
  }

  function header(title, subtitle, actions = "") {
    return `<div class="page-header">
      <div><h1>${title}</h1><p>${subtitle}</p></div>
      <div class="actions no-print">${actions}</div>
    </div>`;
  }

  function formActions(label = "Salvar") {
    return `<div class="form-actions">
      <button type="button" class="btn secondary" data-close-modal>Cancelar</button>
      <button class="btn primary">${label}</button>
    </div>`;
  }

  function openModal(title, body, eyebrow = "REGISTRO") {
    closeMobileSheets();
    $("#modalTitle").textContent = title;
    $("#modalEyebrow").textContent = eyebrow;
    $("#modalBody").innerHTML = body;
    $("#modal").classList.remove("hidden");
    document.body.classList.add("modal-open");
    syncOperationCatalogFields($("#operationForm"));
    setOperationStep($("#operationForm"), 1);
    syncTruckForm($("#truckForm"));
    updateTransferPreview($("#tankTransferForm"));
    const modalForm = $("#modalBody form");
    if (modalForm?.id === "tankForm") clearLegacyTankDrafts();
    else if (modalForm) restoreFormDraft(modalForm);
    setTimeout(() => {
      const firstField = $("#modalBody input:not([type='hidden']):not([disabled]), #modalBody select:not([disabled]), #modalBody textarea:not([disabled])");
      firstField?.focus({ preventScroll: true });
    }, 120);
  }

  function closeModal() {
    $("#modal").classList.add("hidden");
    document.body.classList.remove("modal-open");
  }

  function productClass(product = "", kind = "", volume = 0) {
    const numericVolume = Number(volume || 0);
    if (numericVolume <= 0) return "empty";

    const p = String(product || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
    const equipmentKind = String(kind || "").toLowerCase();

    // Todo silo com saldo utiliza a cor de granel, mesmo sem produto informado.
    if (equipmentKind.includes("silo")) return "bulk";

    if (["brine", "nacl", "cacl", "salmoura", "cadit"].some(term => p.includes(term))) return "brine";
    if (["sbm", "rheliant", "sintetico", "oleo base"].some(term => p.includes(term))) return "sbm";
    if (["olef", "olefina"].some(term => p.includes(term))) return "olefin";
    if (["wb", "wbdf", "flopro", "glydril", "glydrill", "water", "kcl polymer", "premix"].some(term => p.includes(term))) return "wbm";
    if (["barita", "bentonita", "calcita", "cimento", "bulk", "granel"].some(term => p.includes(term))) return "bulk";

    // Qualquer tanque/Mix Tank com volume e produto desconhecido recebe cor genérica.
    return "generic";
  }

  function tankMovementMode(activity = "") {
    const value = String(activity).toLowerCase();
    if (["bombeio", "carregamento"].includes(value)) return "out";
    if (["backload", "fabricação", "fabricacao", "descarga"].includes(value)) return "in";
    return "none";
  }

  function filteredOperations() {
    const f = state.filters;
    return (state.data?.operations || []).filter(op => {
      const date = recordDateKey(op.start_at || op.created_at);
      if (f.start && date && date < f.start) return false;
      if (f.end && date && date > f.end) return false;
      if (f.client && op.client !== f.client) return false;
      if (f.product && op.product !== f.product) return false;
      return true;
    });
  }

  function filteredTrucks() {
    const f = state.filters;
    return (state.data?.trucks || []).filter(item => {
      const date = recordDateKey(item.date);
      if (f.start && date && date < f.start) return false;
      if (f.end && date && date > f.end) return false;
      if (f.client && item.client !== f.client) return false;
      if (f.product && item.product !== f.product && !(item.items || []).some(product => product.productName === f.product)) return false;
      return true;
    });
  }

  function csvEscape(value) {
    const text = String(value ?? "").replace(/"/g, '""');
    return `"${text}"`;
  }

  function downloadCsv(filename, headers, rows) {
    const content = [headers, ...rows].map(row => row.map(csvEscape).join(";")).join("\n");
    const blob = new Blob(["\ufeff" + content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function downloadJson(filename, value) {
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function offlineQueue() {
    try { return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]"); }
    catch (_) { return []; }
  }

  function saveOfflineQueue(items) {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(items.slice(-100)));
    updateConnectionBadge();
    openDeepLinkedAsset();
  }

  function hasFileSelection(form) {
    return [...form.querySelectorAll('input[type="file"]')].some(input => input.files?.length);
  }

  function queueOfflineForm(form) {
    if (hasFileSelection(form)) return false;
    const payload = Object.fromEntries(new FormData(form));
    let action = null;
    if (form.id === "truckForm") {
      delete payload.attachment;
      action = {
        type: "truck",
        id: form.dataset.id || null,
        payload,
        items: collectTruckPlatformItems(form, false)
      };
    } else if (form.id === "genericForm" && ["qhse", "alert"].includes(form.dataset.kind)) {
      action = { type: "entity", kind: form.dataset.kind, id: form.dataset.id || null, payload };
    } else if (form.id === "eventForm") {
      action = { type: "event", operationId: form.dataset.operationId, payload };
    } else if (form.id === "actionItemForm") {
      action = { type: "action_item", id: form.dataset.id || null, qhseId: form.dataset.qhseId || null, payload };
    } else if (form.id === "handoverPendingForm") {
      action = { type: "handover_pending", id: form.dataset.id || null, payload };
    }
    if (!action) return false;
    const queue = offlineQueue();
    queue.push({ id: uid("offline"), queued_at: new Date().toISOString(), ...action });
    saveOfflineQueue(queue);
    return true;
  }

  async function replayOfflineAction(action) {
    if (action.type === "truck") return saveTruck(action.payload, action.id, action.items || []);
    if (action.type === "entity") return saveEntity(action.kind, action.payload, action.id);
    if (action.type === "event") {
      const p = action.payload;
      const { error } = await state.client.from("operation_events").insert({
        operation_id: action.operationId, event_time: p.event_time, title: p.title,
        description: p.description || null, event_type: p.event_type,
        quantity: Number(p.quantity || 0) || null, unit: p.unit === "-" ? null : p.unit,
        created_by: state.user.id
      });
      if (error) throw error;
      return;
    }
    if (action.type === "action_item") {
      const p = action.payload;
      const row = { qhse_record_id: action.qhseId, title: p.title, description: p.description || null,
        responsible: p.responsible || null, due_date: p.due_date || null, status: p.status,
        completed_at: p.status === "Concluído" ? new Date().toISOString() : null };
      const query = action.id ? state.client.from("action_items").update(row).eq("id", action.id)
        : state.client.from("action_items").insert({ ...row, created_by: state.user.id });
      const { error } = await query; if (error) throw error; return;
    }
    if (action.type === "handover_pending") {
      const p = action.payload; const completed = p.status === "Concluído";
      const row = { title:p.title, description:p.description||null, category:p.category,
        responsible:p.responsible||null, priority:p.priority, status:p.status,
        due_at:p.due_at ? new Date(p.due_at).toISOString() : null,
        completed_at:completed?new Date().toISOString():null, completed_by:completed?state.user.id:null };
      const query = action.id ? state.client.from("handover_pending_items").update(row).eq("id",action.id)
        : state.client.from("handover_pending_items").insert({ ...row, created_by:state.user.id });
      const { error } = await query; if (error) throw error;
    }
  }

  async function syncOfflineQueue() {
    if (state.offlineSyncing || !navigator.onLine || !state.client || !state.user) return;
    const queue = offlineQueue();
    if (!queue.length) return;
    state.offlineSyncing = true;
    const remaining = [];
    let synced = 0;
    for (const action of queue) {
      try { await replayOfflineAction(action); synced += 1; }
      catch (error) { remaining.push({ ...action, last_error: error.message }); }
    }
    saveOfflineQueue(remaining);
    state.offlineSyncing = false;
    if (synced) {
      await loadData(); renderAll();
      toast(`${synced} registro(s) offline sincronizado(s).`, "success");
    }
  }

  function backupPayload() {
    const d = state.data || {};
    return {
      generated_at: new Date().toISOString(), generated_by: d.profile?.name || "-", version: APP_VERSION,
      tanks: d.tanks || [], operations: d.operations || [], operationAllocations: d.operationAllocations || [],
      trucks: d.trucks || [], truckItems: d.truckItems || [],
      chemicalProducts: d.chemicalProducts || [], chemicals: d.chemicals || [], chemicalMovements: d.chemicalMovements || [],
      closings:d.closings || [], closingItems:d.closingItems || [], inventoryCounts:d.inventoryCounts || [],
      tankMovements: d.tankMovements || [], qhse: d.qhse || [], actionItems: d.actionItems || [],
      equipment: d.equipment || [], maintenanceOrders: d.maintenanceOrders || [],
      certificates: d.certificates || [], handoverPendings: d.handoverPendings || [],
      handoverNotes: d.handoverNotes || [], handoverApprovals: d.handoverApprovals || [],
      checklistItems: d.shiftChecklist || []
    };
  }

  function saveLocalDailyBackup() {
    if (!state.data) return;
    try {
      const today = localDateKey();
      const backups = JSON.parse(localStorage.getItem(LOCAL_BACKUP_KEY) || "[]").filter(item => item.date !== today);
      backups.push({ date: today, created_at: new Date().toISOString(), data: backupPayload() });
      localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify(backups.slice(-3)));
    } catch (error) { console.warn("Backup local:", error); }
  }

  function latestLocalBackup() {
    try { return JSON.parse(localStorage.getItem(LOCAL_BACKUP_KEY) || "[]").slice(-1)[0] || null; }
    catch (_) { return null; }
  }

  function exportData(kind) {
    const date = new Date().toISOString().slice(0, 10);
    if (kind === "operations") {
      const rows = filteredOperations().map(op => [op.client, op.vessel, op.rig, op.well, op.ticketNumber, op.service_order, op.activity, op.product, op.fluidTypeId, op.lot, op.planned, op.executed, op.unit, operationAllocationText(op), op.status, op.start_at, op.end_at, op.paused_minutes, op.tank_movement_applied ? "Aplicada" : "Não aplicada"]);
      return downloadCsv(`operacoes-${date}.csv`, ["Cliente", "Embarcação", "Sonda", "Poço", "Ticket", "OS", "Atividade", "Produto", "ID do produto", "Lote", "Planejado", "Executado", "Unidade", "Distribuição tanques/silos", "Status", "Início", "Término", "Parado (min)", "Tancagem"], rows);
    }
    if (kind === "tanks") {
      const rows = state.data.tanks.map(t => [t.phase, t.name, t.kind, t.product, t.lot, t.volume, t.capacity, t.unit, t.physicalCapacityM3 || "", t.status, t.updated_at]);
      return downloadCsv(`tancagem-${date}.csv`, ["Fase", "Tanque/Silo", "Tipo", "Produto", "Lote", "Volume", "Capacidade", "Unidade", "Status", "Atualização"], rows);
    }
    if (kind === "chemicals") {
      const totals = new Map(groupedChemicalInventory().map(item => [item.id, item.total]));
      const rows = state.data.chemicals.map(c => [c.name, c.category, totals.get(c.productId) || 0, c.lot || "Sem lote", c.quantity, c.unit, c.minimum, c.expiry_date, c.location, c.supplier, chemicalDisplayStatus(c)]);
      return downloadCsv(`inventario-quimico-${date}.csv`, ["Produto", "Categoria", "Total do produto", "Lote", "Quantidade do lote", "Unidade", "Mínimo do lote", "Validade", "Localização", "Fornecedor", "Status"], rows);
    }
    if (kind === "trucks") {
      const rows = filteredTrucks().flatMap(t => t.truckType === "Plataforma" && t.items.length
        ? t.items.map((item,index) => [t.date,t.movement,t.truckType,t.supplier,t.client,item.productName,"",item.quantity,item.unit,index+1,t.items.length,t.plate,t.driver,t.invoice,t.status])
        : [[t.date,t.movement,t.truckType,t.supplier,t.client,t.product,t.lot,t.quantity,t.unit,1,1,t.plate,t.driver,t.invoice,t.status]]);
      return downloadCsv(`carretas-${date}.csv`, ["Data","Movimento","Tipo da carreta","Origem/Destino","Cliente","Produto","Lote","Quantidade","Unidade","Item","Total de itens","Placa","Motorista","NF","Status"], rows);
    }
    if (kind === "maintenance") {
      const rows = state.data.equipment.map(e => [e.name, e.category, e.status, e.hourmeter, e.next_maintenance_date, e.maintenance_due_hourmeter, e.location]);
      return downloadCsv(`manutencao-${date}.csv`, ["Equipamento", "Categoria", "Status", "Horímetro", "Próxima preventiva", "Horímetro limite", "Localização"], rows);
    }
    if (kind === "audit") {
      const rows = state.data.auditLogs.map(x => [x.created_at, state.data.users.find(u=>u.id===x.changed_by)?.name||"Sistema", x.table_name, x.action, x.record_id, auditChangeSummary(x)]);
      return downloadCsv("auditoria.csv", ["Data","Usuário","Tabela","Ação","Registro","Alterações"], rows);
    }
    if (kind === "quality") {
      const rows = dataQualityIssues().map(x => [x.severity, x.category, x.title, x.detail, x.page, x.entityType, x.entityId]);
      return downloadCsv(`qualidade-dados-${localDateKey()}.csv`, ["Severidade","Categoria","Pendência","Detalhe","Módulo","Tipo","ID"], rows);
    }
  }

  function operationFieldValue(form, name) {
    return form?.querySelector(`[name="${name}"]:not([disabled])`)?.value
      ?? form?.querySelector(`[name="${name}"]`)?.value
      ?? "";
  }


  function operationCatalogProducts(op = {}) {
    const currentId = op.fluidTypeId || "";
    return (state.data?.fluids || [])
      .filter(item => item.active !== false || item.id === currentId)
      .sort((a, b) => {
        const bulkA = ["granel", "insumo"].includes(String(a.type || "").toLowerCase()) ? 1 : 0;
        const bulkB = ["granel", "insumo"].includes(String(b.type || "").toLowerCase()) ? 1 : 0;
        return bulkA - bulkB || a.name.localeCompare(b.name);
      });
  }

  function operationCatalogOptions(op = {}) {
    const currentId = op.fluidTypeId || "";
    const products = operationCatalogProducts(op);
    const fluids = products.filter(item => !["granel", "insumo"].includes(String(item.type || "").toLowerCase()));
    const bulks = products.filter(item => ["granel", "insumo"].includes(String(item.type || "").toLowerCase()));
    const render = item => `<option value="${item.id}" data-product="${esc(item.name)}" data-unit="${esc(item.unit || "bbl")}" data-category="${esc(item.type || "")}" ${item.id === currentId ? "selected" : ""}>${esc(item.name)}${item.active === false ? " — inativo (histórico)" : ""}</option>`;
    return `${fluids.length ? `<optgroup label="Fluidos">${fluids.map(render).join("")}</optgroup>` : ""}${bulks.length ? `<optgroup label="Granéis">${bulks.map(render).join("")}</optgroup>` : ""}`;
  }

  function selectedOperationCatalogItem(form) {
    const id = form?.elements?.fluid_type_id?.value || "";
    return (state.data?.fluids || []).find(item => item.id === id) || null;
  }

  function syncOperationCatalogFields(form, resetAllocations = false) {
    if (!form) return;
    const select = form.elements.fluid_type_id;
    const unitInput = form.elements.unit;
    const selected = selectedOperationCatalogItem(form);

    if (unitInput) unitInput.value = selected?.unit || "";
    const category = form.querySelector("[data-operation-product-category]");
    if (category) {
      category.textContent = selected
        ? `${selected.type} • unidade ${selected.unit}${selected.density ? ` • densidade ${fmt.format(selected.density)} ${selected.densityUnit || ""}` : ""}`
        : "Selecione um produto cadastrado.";
    }

    if (resetAllocations && form.dataset.allocationLocked !== "true") {
      const list = form.querySelector("[data-operation-allocation-list]");
      const mode = tankMovementMode(operationFieldValue(form, "activity"));
      if (list) {
        list.innerHTML = mode === "none"
          ? ""
          : operationAllocationRow({}, mode === "out" ? "source" : "destination", selected?.unit || "bbl", false, selected?.id || "");
      }
    }
    syncOperationTankFields(form);
  }

  function allocationsForOperation(operationId) {
    if (!operationId) return [];
    return (state.data?.operationAllocations || [])
      .filter(item => item.operation_id === operationId)
      .sort((a, b) => a.display_order - b.display_order);
  }

  function normalizedOperationAllocations(op = {}) {
    const stored = allocationsForOperation(op.id);
    if (stored.length) return stored;
    const mode = tankMovementMode(op.activity);
    if (mode === "out" && op.source_tank_id) {
      return [{ direction: "source", tank_id: op.source_tank_id, quantity: Number(op.executed || 0), unit: op.unit, display_order: 0 }];
    }
    if (mode === "in" && op.destination_tank_id) {
      return [{ direction: "destination", tank_id: op.destination_tank_id, quantity: Number(op.executed || 0), unit: op.unit, display_order: 0 }];
    }
    return [];
  }

  function operationAllocationText(op) {
    const allocations = normalizedOperationAllocations(op);
    if (!allocations.length) return "Não distribuída";
    return allocations.map(item => {
      const tank = state.data.tanks.find(t => t.id === item.tank_id);
      return `${tank?.name || "Equipamento"}: ${fmt.format(item.quantity)} ${item.unit || op.unit}`;
    }).join(" + ");
  }

  function operationAllocationHtml(op) {
    const allocations = normalizedOperationAllocations(op);
    if (!allocations.length) return `<span class="muted">Não distribuída</span>`;
    return `<div class="operation-allocation-chips">${allocations.map(item => {
      const tank = state.data.tanks.find(t => t.id === item.tank_id);
      return `<span class="operation-allocation-chip"><strong>${esc(tank?.name || "Equipamento")}</strong>${fmt.format(item.quantity)} ${esc(item.unit || op.unit)}</span>`;
    }).join("")}</div>`;
  }

  function operationTankOptions(unit = "bbl", selectedId = "", direction = "source", fluidTypeId = "") {
    const phaseOrder = ["Phase #1", "Phase #2"];
    return phaseOrder.map(phase => {
      const options = state.data.tanks
        .filter(tank => tank.phase === phase)
        .filter(tank => tank.unit === unit || tank.id === selectedId)
        .filter(tank => {
          if (!fluidTypeId || tank.id === selectedId) return true;
          if (direction === "source") return tank.fluidTypeId === fluidTypeId;
          return Number(tank.volume || 0) <= 0 || tank.fluidTypeId === fluidTypeId;
        })
        .sort((a, b) => a.order - b.order)
        .map(tank => {
          const free = Math.max(0, Number(tank.capacity || 0) - Number(tank.volume || 0));
          const availability = direction === "source"
            ? `saldo ${fmt.format(tank.volume)} ${tank.unit}`
            : `livre ${fmt.format(free)} ${tank.unit}`;
          return `<option value="${tank.id}" ${tank.id === selectedId ? "selected" : ""}>${esc(tank.name)} — ${availability} — ${esc(tank.product || "Vazio")}</option>`;
        }).join("");
      return options ? `<optgroup label="${phase}">${options}</optgroup>` : "";
    }).join("");
  }

  function operationAllocationRow(allocation = {}, direction = "source", unit = "bbl", locked = false, fluidTypeId = "") {
    const rowId = uid("allocation");
    return `<div class="operation-allocation-row" data-operation-allocation-row data-direction="${direction}" data-row-id="${rowId}">
      <span class="allocation-number">#</span>
      <div class="allocation-tank-field">
        <label>Tanque ou silo</label>
        <select data-allocation-tank ${locked ? "disabled" : ""}>
          <option value="">Selecione o equipamento</option>
          ${operationTankOptions(unit, allocation.tank_id || "", direction, fluidTypeId)}
        </select>
      </div>
      <div class="allocation-quantity-field">
        <label>Quantidade</label>
        <div class="allocation-quantity-input"><input data-allocation-quantity type="text" inputmode="decimal" value="${allocation.quantity ? String(allocation.quantity).replace(".", ",") : ""}" placeholder="0" ${locked ? "readonly" : ""}><span data-allocation-unit>${esc(unit)}</span></div>
      </div>
      ${locked ? "" : `<button type="button" class="btn small danger outline allocation-remove" data-remove-operation-allocation aria-label="Remover equipamento">Remover</button>`}
    </div>`;
  }

  function refreshOperationAllocationOptions(form) {
    if (!form) return;
    const mode = tankMovementMode(operationFieldValue(form, "activity"));
    const direction = mode === "out" ? "source" : "destination";
    const unit = operationFieldValue(form, "unit") || "bbl";
    const fluidTypeId = form.elements.fluid_type_id?.value || "";
    form.querySelectorAll("[data-operation-allocation-row]").forEach((row, index) => {
      row.dataset.direction = direction;
      row.querySelector(".allocation-number").textContent = `${index + 1}.`;
      const select = row.querySelector("[data-allocation-tank]");
      const selected = select?.value || "";
      if (select) select.innerHTML = `<option value="">Selecione o equipamento</option>${operationTankOptions(unit, selected, direction, fluidTypeId)}`;
      const unitLabel = row.querySelector("[data-allocation-unit]");
      if (unitLabel) unitLabel.textContent = unit;
    });
  }

  function addOperationAllocationRow(form, allocation = {}) {
    const list = form?.querySelector("[data-operation-allocation-list]");
    if (!list) return;
    const mode = tankMovementMode(operationFieldValue(form, "activity"));
    if (mode === "none") return;
    const direction = mode === "out" ? "source" : "destination";
    const unit = operationFieldValue(form, "unit") || "bbl";
    list.insertAdjacentHTML("beforeend", operationAllocationRow(allocation, direction, unit, false, form.elements.fluid_type_id?.value || ""));
    refreshOperationAllocationOptions(form);
    updateOperationAllocationSummary(form);
  }

  function collectOperationAllocations(form) {
    const mode = tankMovementMode(operationFieldValue(form, "activity"));
    if (mode === "none") return [];
    const direction = mode === "out" ? "source" : "destination";
    const unit = operationFieldValue(form, "unit") || "bbl";
    const rows = [...form.querySelectorAll("[data-operation-allocation-row]")];
    const allocations = [];
    const used = new Set();

    rows.forEach((row, index) => {
      const tankId = row.querySelector("[data-allocation-tank]")?.value || "";
      const rawQuantity = row.querySelector("[data-allocation-quantity]")?.value || "";
      if (!tankId && !String(rawQuantity).trim()) return;
      if (!tankId) throw new Error(`Selecione o tanque ou silo na linha ${index + 1}.`);
      const quantity = parseTankVolume(rawQuantity);
      if (!Number.isFinite(quantity) || quantity <= 0) throw new Error(`Informe uma quantidade válida na linha ${index + 1}.`);
      if (used.has(tankId)) throw new Error("O mesmo tanque ou silo não pode aparecer duas vezes na distribuição.");
      const tank = state.data.tanks.find(item => item.id === tankId);
      if (!tank) throw new Error("Um dos equipamentos selecionados não foi localizado.");
      if (tank.unit !== unit) throw new Error(`${tank.name} utiliza ${tank.unit}, diferente da unidade da operação (${unit}).`);
      const fluidTypeId = form.elements.fluid_type_id?.value || "";
      if (direction === "source" && fluidTypeId && tank.fluidTypeId !== fluidTypeId) {
        throw new Error(`${tank.name} não possui o produto selecionado na operação.`);
      }
      if (direction === "destination" && fluidTypeId && Number(tank.volume || 0) > 0 && tank.fluidTypeId !== fluidTypeId) {
        throw new Error(`${tank.name} contém outro produto.`);
      }
      used.add(tankId);
      allocations.push({ direction, tank_id: tankId, quantity, unit, display_order: allocations.length });
    });

    return allocations;
  }

  function updateOperationAllocationSummary(form) {
    if (!form) return;
    const summary = form.querySelector("[data-operation-allocation-summary]");
    if (!summary) return;
    let allocations = [];
    try { allocations = collectOperationAllocations(form); } catch (_) {}
    const total = allocations.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const executed = parseTankVolume(form.querySelector('[name="executed"]')?.value || "0") || 0;
    const unit = operationFieldValue(form, "unit") || "bbl";
    const difference = executed-total;
    const complete = executed > 0 && Math.abs(difference) <= 0.001;
    summary.classList.toggle("allocation-complete", complete);
    summary.classList.toggle("allocation-pending", !complete);
    summary.innerHTML = `<div><strong>${fmt.format(total)} / ${fmt.format(executed)} ${esc(unit)}</strong><span>${allocations.length} equipamento(s) selecionado(s)</span></div><span>${complete ? "Distribuição completa" : difference > 0 ? `Faltam ${fmt.format(difference)} ${esc(unit)}` : difference < 0 ? `Excede ${fmt.format(Math.abs(difference))} ${esc(unit)}` : "Informe a quantidade executada"}</span>`;
  }

  function syncOperationTankFields(form) {
    if (!form) return;
    const mode = tankMovementMode(operationFieldValue(form, "activity"));
    const previousMode = form.dataset.allocationMode || mode;
    const field = form.querySelector(".operation-allocation-field");
    const list = form.querySelector("[data-operation-allocation-list]");
    const title = form.querySelector("[data-operation-allocation-title]");
    const addButton = form.querySelector("[data-add-operation-allocation]");
    const checkbox = form.elements.apply_tank_movement;
    const hint = form.querySelector("#operationTankHint");
    const locked = form.dataset.allocationLocked === "true";

    field?.classList.toggle("hidden", mode === "none");
    if (title) title.textContent = mode === "out" ? "Distribuição da saída por tanque/silo" : "Distribuição da entrada por tanque/silo";
    if (addButton) {
      addButton.classList.toggle("hidden", mode === "none" || locked);
      addButton.textContent = mode === "out" ? "+ Adicionar origem" : "+ Adicionar destino";
    }

    if (previousMode !== mode && !locked && list) {
      list.innerHTML = "";
      if (mode !== "none") list.innerHTML = operationAllocationRow({}, mode === "out" ? "source" : "destination", operationFieldValue(form, "unit") || "bbl", false, form.elements.fluid_type_id?.value || "");
    }
    form.dataset.allocationMode = mode;

    if (checkbox) {
      checkbox.disabled = mode === "none" || checkbox.dataset.applied === "true";
      if (mode === "none") checkbox.checked = false;
    }
    if (hint) {
      hint.textContent = mode === "out"
        ? "Distribua a quantidade executada entre todas as origens utilizadas."
        : mode === "in"
          ? "Distribua a quantidade executada entre todos os destinos utilizados."
          : "Esta atividade não altera a volumetria automaticamente.";
    }
    refreshOperationAllocationOptions(form);
    updateOperationAllocationSummary(form);
  }

  function operationHours(op) {
    if (!op.start_at) return 0;
    const end = op.end_at ? new Date(op.end_at) : new Date();
    const total = Math.max(0, (end - new Date(op.start_at)) / 3600000);
    return Math.max(0, total - Number(op.paused_minutes || 0) / 60);
  }

  function operationFlow(op) {
    const hours = operationHours(op);
    return hours > 0 ? Number(op.executed || 0) / hours : Number(op.flow_rate || 0);
  }

  function attachmentCount(module, recordId) {
    return (state.data?.attachments || []).filter(item => item.module === module && item.record_id === recordId).length;
  }

  function fileSizeLabel(bytes) {
    const value = Number(bytes || 0);
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / 1024 / 1024).toFixed(1)} MB`;
  }

  function safeFileName(name) {
    return String(name || "arquivo")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-");
  }

  async function initClient() {
    if (!state.config.url || !state.config.key || !window.supabase) {
      throw new Error("A conexão do sistema não está configurada.");
    }
    if (!state.client) {
      state.client = window.supabase.createClient(state.config.url, state.config.key);
    }
    return state.client;
  }

  async function login() {
    const email = $("#loginEmail").value.trim();
    const password = $("#loginPassword").value;
    if (!email || !password) return showLoginMessage("Preencha e-mail e senha.");

    try {
      await initClient();
      const { data, error } = await state.client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      state.user = data.user;
      await loadData();
      if (state.data.profile.active === false) {
        await state.client.auth.signOut();
        throw new Error("Seu acesso está bloqueado. Procure o administrador.");
      }
      openApp();
    } catch (error) {
      showLoginMessage(`Falha no login: ${error.message}`);
    }
  }

  async function restoreSession() {
    try {
      await initClient();
      const { data } = await state.client.auth.getSession();
      if (!data.session?.user) return;
      state.user = data.session.user;
      await loadData();
      if (state.data.profile.active === false) {
        await state.client.auth.signOut();
        return;
      }
      openApp();
    } catch (error) {
      console.error("Não foi possível restaurar a sessão:", error);
    }
  }

  async function loadData() {
    const c = state.client;
    const u = state.user;
    const results = await Promise.all([
      c.from("profiles").select("*").eq("id", u.id).maybeSingle(),
      c.from("profiles").select("*").order("full_name"),
      c.from("fluid_types").select("*").order("name"),
      c.from("tanks").select("*").order("display_order"),
      c.from("tank_history").select("*").order("created_at", { ascending: false }).limit(500),
      c.from("operations").select("*").order("start_at", { ascending: false }).limit(2000),
      c.from("operation_events").select("*").order("event_time", { ascending: true }).limit(5000),
      c.from("trucks").select("*").order("movement_date", { ascending: false }).limit(2000),
      c.from("qhse_records").select("*").order("record_date", { ascending: false }).limit(1000),
      c.from("action_items").select("*").order("due_date", { ascending: true }).limit(500),
      c.from("equipment").select("*").order("name"),
      c.from("diesel_logs").select("*").order("log_date", { ascending: false }).limit(500),
      c.from("maintenance_orders").select("*").order("opened_at", { ascending: false }).limit(500),
      c.from("certificates").select("*").order("expires_at"),
      c.from("alerts").select("*").order("created_at", { ascending: false }).limit(1000),
      c.from("chat_messages").select("*").order("created_at", { ascending: true }).limit(500),
      c.from("attachments").select("*").order("created_at", { ascending: false }).limit(1000),
      c.from("chemical_inventory").select("*").order("product_name").limit(1000),
      c.from("chemical_movements").select("*").order("created_at", { ascending: false }).limit(3000),
      c.from("tank_movements").select("*").order("created_at", { ascending: false }).limit(2000),
      c.from("inventory_alerts").select("*").order("created_at", { ascending: false }),
      c.from("operational_health_alerts").select("*").order("created_at", { ascending: false }),
      c.from("system_errors").select("*").order("created_at", { ascending: false }).limit(50),
      c.from("operation_tank_allocations").select("*").order("display_order", { ascending: true }),
      c.from("handover_pending_items").select("*").order("created_at", { ascending: false }).limit(1000),
      c.from("shift_handover_notes").select("*").order("shift_date", { ascending: false }).limit(500),
      c.from("operational_alert_center").select("*").order("created_at", { ascending: false }).limit(1000),
      c.from("shift_handover_approvals").select("*").order("shift_date", { ascending: false }).limit(500),
      c.from("shift_checklist_items").select("*").order("shift_date", { ascending: false }).limit(2000),
      c.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(1500),
      c.from("app_feedback").select("*").order("created_at", { ascending: false }).limit(500),
      c.from("truck_movement_items").select("*").order("display_order", { ascending: true }).limit(5000),
      c.from("chemical_products").select("*").order("name"),
      c.from("operational_closings").select("*").order("closing_date", { ascending: false }).order("shift", { ascending: true }).limit(200),
      c.from("closing_reconciliation_items").select("*").order("created_at", { ascending: false }).limit(10000),
      c.from("inventory_counts").select("*").order("counted_at", { ascending: false }).limit(5000)
    ]);

    if (results[0]?.error) throw results[0].error;

    results.forEach((result, index) => {
      if (!result?.error) return;
      console.warn(`Fonte opcional ${index} indisponível:`, result.error);
      results[index] = { data: [] };
    });

    const profile = results[0].data || {
      id: u.id,
      email: u.email,
      full_name: u.email,
      role: "user",
      active: true,
      permissions: {}
    };

    state.data = {
      profile: {
        id: profile.id,
        name: profile.full_name || u.email,
        email: profile.email || u.email,
        role: profile.role || "user",
        department: profile.department || "",
        active: profile.active !== false,
        permissions: profile.permissions || {}
      },
      users: (results[1].data || []).map(x => ({
        id: x.id, email: x.email || "", name: x.full_name || x.email || "Usuário",
        role: x.role || "user", department: x.department || "", active: x.active !== false,
        permissions: x.permissions || {}, created_at: x.created_at
      })),
      fluids: (results[2].data || []).map(x => ({
        id: x.id, name: x.name, type: x.category, unit: x.default_unit,
        density: Number(x.density_value ?? x.density_ppg ?? 0),
        densityUnit: x.density_unit || (["granel", "insumo"].includes(String(x.category || "").toLowerCase()) ? "t/m³" : "ppg"),
        active: x.active !== false
      })),
      tanks: (results[3].data || []).map(x => ({
        id: x.id, name: x.name, phase: x.phase, kind: x.kind,
        capacity: Number(x.capacity), unit: x.unit, volume: Number(x.current_volume || 0),
        physicalCapacityM3: x.physical_capacity_m3 === null || x.physical_capacity_m3 === undefined
          ? null : Number(x.physical_capacity_m3),
        fluidTypeId: x.current_fluid_type_id || null,
        product: x.current_product || "", lot: x.current_lot || "",
        density: x.current_density === null || x.current_density === undefined ? null : Number(x.current_density),
        densityUnit: x.current_density_unit || null,
        status: x.status, order: x.display_order,
        updated_by: x.updated_by, updated_at: x.updated_at
      })),
      tankHistory: results[4].data || [],
      operations: (results[5].data || []).map(x => {
        const linkedProduct = (results[2].data || []).find(item => item.id === x.fluid_type_id);
        return {
        id: x.id, client: x.client, vessel: x.vessel, service_order: x.service_order || "",
        rig: x.rig || "", well: x.well || "", ticketNumber: x.ticket_number || "",
        fluidTypeId: x.fluid_type_id || null,
        activity: x.activity, product: linkedProduct?.name || x.product, lot: x.lot || "",
        planned: Number(x.planned_quantity || 0), executed: Number(x.executed_quantity || 0),
        unit: x.unit, status: x.status, start_at: x.start_at, end_at: x.end_at,
        notes: x.notes || "", occurrence: x.occurrence || "", responsible_id: x.responsible_id,
        flow_rate: Number(x.flow_rate || 0), flow_rate_unit: x.flow_rate_unit || "",
        paused_minutes: Number(x.paused_minutes || 0), locked: x.locked === true,
        source_tank_id: x.source_tank_id, destination_tank_id: x.destination_tank_id,
        apply_tank_movement: x.apply_tank_movement === true,
        tank_movement_applied: x.tank_movement_applied === true,
        tank_movement_applied_at: x.tank_movement_applied_at,
        created_by: x.created_by, created_at: x.created_at, updated_at: x.updated_at
      };
      }),
      operationEvents: results[6].data || [],
      trucks: (results[7].data || []).map(x => {
        const linkedProduct = (results[2].data || []).find(item => item.id === x.fluid_type_id);
        const items = (results[31].data || []).filter(item => item.truck_id === x.id).map(item => ({
          id: item.id,
          truckId: item.truck_id,
          chemicalProductId: item.chemical_product_id || null,
          productName: item.product_name,
          lot: item.lot || "",
          quantity: Number(item.quantity || 0),
          unit: item.unit,
          displayOrder: Number(item.display_order || 0),
          created_at: item.created_at,
          updated_at: item.updated_at
        }));
        return {
          id: x.id, date: x.movement_date, movement: x.movement_type,
          truckType: x.truck_type || (["bbl","m³","m3"].includes(String(x.unit || "").toLowerCase()) ? "Tank" : "Bulk"),
          fluidTypeId: x.fluid_type_id || null,
          tankId: x.tank_id || null,
          stockApplied: x.stock_applied === true,
          stockAppliedAt: x.stock_applied_at,
          stockSummary: x.stock_application_summary || {},
          supplier: x.supplier, client: x.client || "",
          product: linkedProduct?.name || x.product, lot: x.lot || "",
          quantity: Number(x.quantity || 0), unit: x.unit, plate: x.plate || "",
          driver: x.driver_name || "", invoice: x.invoice_number || "", status: x.status,
          notes: x.notes || "", items, created_by: x.created_by,
          created_at: x.created_at, updated_at: x.updated_at
        };
      }),
      qhse: (results[8].data || []).map(x => ({
        id: x.id, date: x.record_date, type: x.record_type, title: x.title,
        description: x.description || "", responsible: x.responsible || "",
        severity: x.severity, status: x.status, created_by: x.created_by,
        created_at: x.created_at, updated_at: x.updated_at
      })),
      actionItems: results[9].data || [],
      equipment: (results[10].data || []).map(x => ({
        id: x.id, name: x.name, category: x.category, status: x.status,
        hourmeter: Number(x.hourmeter || 0), last_hours: Number(x.last_work_hours || 0),
        diesel_initial: Number(x.diesel_initial || 0), refueled: Number(x.diesel_refueled || 0),
        diesel_final: Number(x.diesel_final || 0), location: x.location || "",
        next_maintenance_date: x.next_maintenance_date,
        maintenance_due_hourmeter: Number(x.maintenance_due_hourmeter || 0),
        maintenance_interval_hours: Number(x.maintenance_interval_hours || 0),
        notes: x.notes || "", updated_at: x.updated_at
      })),
      dieselLogs: results[11].data || [],
      maintenanceOrders: (results[12].data || []).map(x => ({
        id: x.id, equipment_id: x.equipment_id, title: x.title,
        description: x.description || "", priority: x.priority, status: x.status,
        opened_at: x.opened_at, due_date: x.due_date, closed_at: x.closed_at,
        responsible: x.responsible || "", maintenance_type: x.maintenance_type || "Corretiva",
        parts_used: x.parts_used || "", solution: x.solution || "",
        estimated_cost: Number(x.estimated_cost || 0), actual_cost: Number(x.actual_cost || 0),
        before_notes: x.before_notes || "", after_notes: x.after_notes || ""
      })),
      certificates: (results[13].data || []).map(x => ({
        id: x.id, user_id: x.user_id, title: x.title, owner: x.owner_name,
        issuer: x.issuer || "", issued_at: x.issued_at, expires_at: x.expires_at,
        status: x.status
      })),
      alerts: (results[14].data || []).map(x => ({
        id: x.id, title: x.title, message: x.message, level: x.level,
        target: x.target_group || "", target_user_id: x.target_user_id,
        created_at: x.created_at, read: x.is_read
      })),
      messages: (results[15].data || []).map(x => ({
        id: x.id, sender: x.sender_name, sender_id: x.sender_id,
        text: x.message, created_at: x.created_at, mine: x.sender_id === u.id
      })),
      attachments: (results[16].data || []).map(x => ({
        id: x.id, module: x.module, record_id: x.record_id, file_name: x.file_name,
        file_path: x.file_path, mime_type: x.mime_type, file_size: Number(x.file_size || 0),
        uploaded_by: x.uploaded_by, created_at: x.created_at
      })),
      chemicalProducts: (results[32].data || []).map(x => ({
        id:x.id, name:x.name, category:x.category || "", unit:x.default_unit || "unidade",
        active:x.active !== false, notes:x.notes || "", created_by:x.created_by,
        created_at:x.created_at, updated_at:x.updated_at
      })),
      chemicals: (results[17].data || []).map(x => ({
        id: x.id, productId: x.product_id || null, name: x.product_name, category: x.category || "", lot: x.lot || "",
        unit: x.unit || "kg", quantity: Number(x.quantity || 0),
        minimum: Number(x.minimum_quantity || 0), expiry_date: x.expiry_date,
        location: x.location || "", supplier: x.supplier || "",
        status: x.status || "Disponível", notes: x.notes || "",
        created_by: x.created_by, updated_by: x.updated_by,
        created_at: x.created_at, updated_at: x.updated_at
      })),
      chemicalMovements: (results[18].data || []).map(x => ({
        id: x.id, inventory_id: x.inventory_id, movement_type: x.movement_type,
        quantity: Number(x.quantity || 0), previous_balance: Number(x.previous_balance || 0),
        new_balance: Number(x.new_balance || 0), reference: x.reference || "",
        notes: x.notes || "", performed_by: x.performed_by,
        chemicalProductId: x.chemical_product_id || null, truckId: x.truck_id || null,
        created_at: x.created_at
      })),
      tankMovements: (results[19].data || []).map(x => ({
        id: x.id, movement_type: x.movement_type, source_tank_id: x.source_tank_id,
        destination_tank_id: x.destination_tank_id, operation_id: x.operation_id,
        truckId: x.truck_id || null,
        quantity: Number(x.quantity || 0), unit: x.unit, product: x.product || "",
        lot: x.lot || "", reference: x.reference || "", notes: x.notes || "",
        created_by: x.created_by, created_at: x.created_at
      })),
      systemAlerts: [...(results[20].data || []), ...(results[21].data || [])],
      systemErrors: results[22].data || [],
      operationAllocations: (results[23].data || []).map(x => ({
        id: x.id, operation_id: x.operation_id, direction: x.direction,
        tank_id: x.tank_id, quantity: Number(x.quantity || 0), unit: x.unit,
        display_order: Number(x.display_order || 0), created_by: x.created_by,
        created_at: x.created_at, updated_at: x.updated_at
      })),
      handoverPendings: (results[24].data || []).map(x => ({
        id: x.id, title: x.title, description: x.description || "",
        category: x.category, responsible: x.responsible || "",
        priority: x.priority, status: x.status, due_at: x.due_at,
        created_by: x.created_by, completed_by: x.completed_by,
        completed_at: x.completed_at, created_at: x.created_at, updated_at: x.updated_at
      })),
      handoverNotes: (results[25].data || []).map(x => ({
        id: x.id, shift_date: x.shift_date, shift_type: x.shift_type,
        observations: x.observations || "", updated_by: x.updated_by,
        created_at: x.created_at, updated_at: x.updated_at
      })),
      alertCenter: (results[26].data || []).map(x => ({
        id: x.alert_key, title: x.title, message: x.message || "", level: x.level || "Média",
        category: x.category || "Sistema", entity_type: x.entity_type, entity_id: x.entity_id,
        due_at: x.due_at, created_at: x.created_at, action_page: x.action_page || "alerts", automatic: true
      })),
      handoverApprovals: (results[27].data || []).map(x => ({
        id:x.id, sequence_no:Number(x.sequence_no||0), shift_date:x.shift_date, shift_type:x.shift_type,
        status:x.status, snapshot_json:x.snapshot_json||{}, snapshot_text:x.snapshot_text||"",
        delivered_by:x.delivered_by, delivered_at:x.delivered_at, received_by:x.received_by,
        received_at:x.received_at, reopened_by:x.reopened_by, reopened_at:x.reopened_at,
        created_at:x.created_at, updated_at:x.updated_at
      })),
      shiftChecklist: (results[28].data || []).map(x => ({
        id:x.id, shift_date:x.shift_date, shift_type:x.shift_type, item_key:x.item_key,
        item_label:x.item_label, category:x.category, completed:x.completed,
        notes:x.notes||"", completed_by:x.completed_by, completed_at:x.completed_at,
        created_by:x.created_by, created_at:x.created_at, updated_at:x.updated_at
      })),
      auditLogs: (results[29].data || []).map(x => ({
        id:x.id, table_name:x.table_name, record_id:x.record_id, action:x.action,
        old_data:x.old_data, new_data:x.new_data, changed_by:x.changed_by, created_at:x.created_at
      })),
      feedback: (results[30].data || []).map(x => ({
        id:x.id, category:x.category, page:x.page || "dashboard", rating:x.rating,
        message:x.message, device_info:x.device_info || "", app_version:x.app_version || "",
        status:x.status || "Novo", created_by:x.created_by, created_at:x.created_at, updated_at:x.updated_at
      })),
      truckItems: (results[31].data || []).map(item => ({
        id:item.id, truckId:item.truck_id, chemicalProductId:item.chemical_product_id || null,
        productName:item.product_name, lot:item.lot || "", quantity:Number(item.quantity || 0),
        unit:item.unit, displayOrder:Number(item.display_order || 0),
        created_at:item.created_at, updated_at:item.updated_at
      })),
      closings: (results[33].data || []).map(item => ({
        id:item.id, date:item.closing_date, shift:item.shift, periodStart:item.period_start,
        periodEnd:item.period_end, status:item.status, summary:item.summary || {},
        notes:item.notes || "", closedBy:item.closed_by, closedAt:item.closed_at,
        reopenedBy:item.reopened_by, reopenedAt:item.reopened_at,
        created_at:item.created_at, updated_at:item.updated_at
      })),
      closingItems: (results[34].data || []).map(item => ({
        id:item.id, closingId:item.closing_id, itemType:item.item_type, itemId:item.item_id,
        itemName:item.item_name, unit:item.unit,
        theoretical:Number(item.theoretical_quantity || 0),
        measured:item.measured_quantity === null ? null : Number(item.measured_quantity),
        variance:item.variance === null ? null : Number(item.variance),
        variancePct:item.variance_pct === null ? null : Number(item.variance_pct),
        status:item.status, created_at:item.created_at
      })),
      inventoryCounts: (results[35].data || []).map(item => ({
        id:item.id, countedAt:item.counted_at, shift:item.shift, itemType:item.item_type,
        itemId:item.item_id, measured:Number(item.measured_quantity || 0),
        unit:item.unit, notes:item.notes || "", createdBy:item.created_by
      }))
    };
    state.data.systemAlerts = [...state.data.systemAlerts, ...state.data.alertCenter]
      .filter((item,index,all) => all.findIndex(other => String(other.id || other.alert_key || other.title) === String(item.id || item.alert_key || item.title)) === index);
    state.lastSync = new Date();
  }

  function openApp() {
    $("#loginView").classList.add("hidden");
    $("#appView").classList.remove("hidden");

    const profile = state.data.profile;
    $("#userName").textContent = profile.name;
    $("#userRole").textContent = profile.role;
    $("#userInitials").textContent = profile.name.split(/\s+/).slice(0, 2).map(x => x[0]).join("").toUpperCase();

    $$(".nav-item").forEach(button => {
      button.classList.toggle("hidden", !moduleAllowed(button.dataset.page));
    });

    applyTheme(localStorage.getItem(THEME_KEY) || "light");
    updateConnectionBadge();
    renderAll();

    const kiosk = role() === "tv";
    document.body.classList.toggle("kiosk-mode", kiosk);
    document.body.classList.toggle("homologation-mode", state.testMode);
    const firstAllowed = $$(".nav-item").find(button => !button.classList.contains("hidden"))?.dataset.page || "dashboard";
    const storedPage = localStorage.getItem("opscontrol_last_page");
    const hashPage = String(location.hash || "").replace("#", "");
    const requestedPage = hashPage || storedPage || state.page;
    showPage(kiosk ? "tv" : (moduleAllowed(requestedPage) ? requestedPage : firstAllowed), { history: false });
    subscribeRealtime();
    startAutoRefresh();
    setupMobilePullToRefresh();
    renderMobileShell();
    saveLocalDailyBackup();
    syncOfflineQueue();
    updateConnectionBadge();
  }

  async function logout() {
    clearTimeout(state.refreshDebounce);
    clearInterval(state.refreshTimer);
    stopTvMode();
    if (state.realtime) await state.client.removeChannel(state.realtime);
    await state.client.auth.signOut();
    location.reload();
  }

  function updateConnectionBadge() {
    const badgeEl = $("#syncBadge");
    if (!badgeEl) return;

    const pendingOffline = offlineQueue().length;
    if (!navigator.onLine) {
      badgeEl.textContent = pendingOffline ? `Sem conexão • ${pendingOffline} pendente(s)` : "Sem conexão";
      badgeEl.className = "status-badge neutral";
      renderMobileShell();
      return;
    }

    if (state.lastRefreshError) {
      badgeEl.textContent = "Falha de sincronização";
      badgeEl.className = "status-badge red";
      renderMobileShell();
      return;
    }

    if (state.realtimeStatus === "SUBSCRIBED") {
      const time = state.lastSync ? state.lastSync.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "";
      badgeEl.textContent = time ? `Atualizado ${time}` : "Tempo real ativo";
      badgeEl.className = "status-badge online";
      renderMobileShell();
      return;
    }

    badgeEl.textContent = state.realtimeStatus === "CHANNEL_ERROR" || state.realtimeStatus === "TIMED_OUT"
      ? "Tempo real indisponível"
      : "Conectando...";
    badgeEl.className = "status-badge neutral";
    renderMobileShell();
  }

  function scheduleRealtimeRefresh() {
    clearTimeout(state.refreshDebounce);
    state.refreshDebounce = setTimeout(() => refreshRealtime("tempo real"), 700);
  }

  function subscribeRealtime() {
    if (state.realtime) return;
    state.realtime = state.client
      .channel("opscontrol-professional-live")
      .on("postgres_changes", { event: "*", schema: "public" }, scheduleRealtimeRefresh)
      .subscribe(status => {
        state.realtimeStatus = status;
        updateConnectionBadge();
      });
  }

  function startAutoRefresh() {
    if (state.autoRefreshStarted) return;
    state.autoRefreshStarted = true;

    state.refreshTimer = setInterval(() => {
      if (navigator.onLine && document.visibilityState === "visible") refreshRealtime("verificação automática");
    }, 60000);

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && navigator.onLine) refreshRealtime("retorno ao aplicativo");
    });
  }

  async function refreshRealtime(source = "tempo real", showToast = false) {
    if (state.refreshing || !navigator.onLine) return false;
    state.refreshing = true;
    state.lastRefreshError = null;
    updateConnectionBadge();

    try {
      await loadData();
      if (state.data.profile.active === false) {
        await state.client.auth.signOut();
        location.reload();
        return false;
      }
      renderAll();
      updateConnectionBadge();
      if (showToast) toast(`Dashboard atualizado às ${state.lastSync.toLocaleTimeString("pt-BR")}.`, "success");
      return true;
    } catch (error) {
      state.lastRefreshError = error;
      console.error(`Atualização (${source}):`, error);
      updateConnectionBadge();
      if (showToast) toast(`Falha ao atualizar: ${error.message}`, "error");
      return false;
    } finally {
      state.refreshing = false;
    }
  }

  function renderModuleSafely(name, pageId, renderer) {
    try {
      renderer();
      return true;
    } catch (error) {
      console.error(`Falha ao renderizar ${name}:`, error);
      const page = $(`#page-${pageId}`);
      if (page) {
        page.innerHTML = header(name, "O módulo encontrou uma inconsistência isolada.") +
          `<div class="card module-error-card"><strong>Não foi possível carregar esta aba.</strong><p>${esc(error.message || "Erro desconhecido")}</p><button class="btn primary" data-action="refresh">Tentar novamente</button></div>`;
      }
      return false;
    }
  }

  function renderAll() {
    const modules = [
      ["Dashboard", "dashboard", renderDashboard],
      ["Qualidade dos Dados", "quality", renderQuality],
      ["Saneamento de Dados", "sanitation", renderSanitation],
      ["Painel TV", "tv", renderTv],
      ["Operações", "operations", renderOperations],
      ["Tanques e silos", "tanks", renderTanks],
      ["Fluidos e granéis", "fluids", renderFluids],
      ["Catálogo químico", "chemical-catalog", renderChemicalCatalog],
      ["Inventário químico", "chemicals", renderChemicalInventory],
      ["Carretas", "trucks", renderTrucks],
      ["QHSE", "qhse", renderQhse],
      ["Manutenção", "maintenance", renderMaintenance],
      ["Certificados", "certificates", renderCertificates],
      ["Alertas", "alerts", renderAlerts],
      ["Relatórios", "reports", renderReports],
      ["Auditoria", "audit", renderAudit],
      ["Configurações", "settings", renderSettings]
    ];

    modules.forEach(([name, pageId, renderer]) => renderModuleSafely(name, pageId, renderer));
    const manualUnread = (state.data.alerts || []).filter(x => !x.read).length;
    const alertCount = $("#alertCount");
    if (alertCount) alertCount.textContent = manualUnread + (state.data.systemAlerts || []).length;
    renderMobileShell();
  }

  function statCard(title, value, unit, icon, detail = "", tone = "blue") {
    return `<div class="card stat-card pro-stat tone-${esc(tone)}">
      <div><small>${esc(title)}</small><h2>${esc(value)}</h2><span class="muted">${esc(unit)}</span>${detail ? `<em>${esc(detail)}</em>` : ""}</div>
      <span class="stat-icon">${icon}</span>
    </div>`;
  }

  function storageCard(title, value, capacity, unit, icon, tone) {
    const pct = capacity > 0 ? Math.min(100, Math.max(0, value / capacity * 100)) : 0;
    return `<div class="card storage-stat ${tone}">
      <div class="storage-stat-top"><div><small>${title}</small><h2>${fmt.format(value)}</h2><span>${esc(unit)} armazenados</span></div><span class="storage-icon">${icon}</span></div>
      <div class="storage-progress"><span style="width:${pct}%"></span></div>
      <div class="storage-foot"><span>${fmt.format(pct)}% ocupado</span><strong>${fmt.format(Math.max(0, capacity-value))} ${esc(unit)} livres</strong></div>
    </div>`;
  }

  function aggregateOperationVolume(operations, field) {
    const totals = new Map();
    operations.forEach(op => {
      const label = String(op[field] || "Não informado").trim() || "Não informado";
      const unit = String(op.unit || "").trim() || "-";
      const key = `${label}|||${unit}`;
      totals.set(key, (totals.get(key) || 0) + Number(op.executed || 0));
    });
    return [...totals.entries()].map(([key, value]) => {
      const [label, unit] = key.split("|||");
      return { label, unit, value };
    }).sort((a, b) => b.value - a.value);
  }


  function tvOperationAllocations(operation) {
    return state.data.operationAllocations
      .filter(item => item.operation_id === operation.id)
      .sort((a, b) => a.display_order - b.display_order)
      .map(item => {
        const tank = state.data.tanks.find(x => x.id === item.tank_id);
        return `${tank?.name || "Equipamento"}: ${fmt.format(item.quantity)} ${item.unit}`;
      });
  }

  function tvTankTile(tank) {
    const volume = Number(tank.volume || 0);
    const capacity = Number(tank.capacity || 0);
    const pct = capacity > 0 ? Math.max(0, Math.min(100, volume / capacity * 100)) : 0;
    const visualPct = volume > 0 ? Math.max(2, pct) : 0;
    const tone = productClass(tank.product, tank.kind, volume);
    const status = tank.status || (volume > 0 ? "Operacional" : "Vazio");
    return `<article class="tv-equipment-tile ${tone} ${status === "Bloqueado" ? "blocked" : ""}">
      <div class="tv-equipment-head"><strong>${esc(tank.name)}</strong><span>${esc(status)}</span></div>
      <div class="tv-equipment-body">
        <div class="tv-equipment-gauge"><span style="height:${visualPct}%"></span><b>${fmt.format(pct)}%</b></div>
        <div class="tv-equipment-info">
          <h3>${esc(tank.product || (volume > 0 ? "Produto não informado" : "Vazio"))}</h3>
          <p>${tank.client ? esc(tank.client) : esc(tank.phase || "B-Port LMP")}</p>
          <strong>${fmt.format(volume)} <small>/ ${fmt.format(capacity)} ${esc(tank.unit)}</small></strong>
          <em>${tank.lot ? `Lote ${esc(tank.lot)}` : esc(tank.kind || "Equipamento")}</em>
        </div>
      </div>
    </article>`;
  }

  function tvOperationTile(operation) {
    const pct = operation.planned > 0 ? Math.min(100, Math.max(0, operation.executed / operation.planned * 100)) : 0;
    const allocations = tvOperationAllocations(operation);
    return `<article class="tv-operation-tile">
      <div class="tv-operation-top"><div><small>${esc(operation.client)}</small><h3>${esc(operation.vessel)}</h3></div>${badge(operation.status)}</div>
      <div class="tv-operation-title">${esc(operation.activity)} de ${esc(operation.product)}</div>
      ${(operation.rig || operation.well || operation.ticketNumber) ? `<div class="tv-operation-meta">${operation.rig ? `Sonda ${esc(operation.rig)}` : ""}${operation.well ? ` • Poço ${esc(operation.well)}` : ""}${operation.ticketNumber ? ` • Ticket ${esc(operation.ticketNumber)}` : ""}</div>` : ""}
      <div class="tv-operation-progress"><span style="width:${pct}%"></span></div>
      <div class="tv-operation-values"><strong>${fmt.format(operation.executed)} / ${fmt.format(operation.planned)} ${esc(operation.unit)}</strong><span>${fmt.format(operationFlow(operation))} ${esc(operation.unit)}/h</span></div>
      ${allocations.length ? `<div class="tv-operation-allocations">${allocations.slice(0,3).map(item => `<span>${esc(item)}</span>`).join("")}</div>` : ""}
      ${operation.occurrence ? `<div class="tv-operation-occurrence">${uiIcon("alert", "ui-icon ui-icon-inline")} ${esc(operation.occurrence)}</div>` : ""}
    </article>`;
  }

  function tvActiveOperations() {
    return state.data.operations
      .filter(operation => !["Concluída", "Cancelada"].includes(operation.status))
      .sort((a, b) => new Date(a.start_time || a.created_at || 0) - new Date(b.start_time || b.created_at || 0));
  }

  function tvCriticalAlerts() {
    return [...state.data.systemAlerts, ...state.data.alerts.filter(item => !item.read)]
      .filter(item => isCriticalAlert(item.level))
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }

  function tvPhaseAssets(phase, silo) {
    return state.data.tanks
      .filter(item => item.phase === phase && isSiloAsset(item) === silo)
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  }

  function tvPlantSlide(phase, silo, slideNumber) {
    const assets = tvPhaseAssets(phase, silo);
    const occupied = assets.filter(item => Number(item.volume || 0) > 0).length;
    const alerts = assets.filter(item => {
      const status = item.status || "";
      const pct = Number(item.capacity || 0) > 0 ? Number(item.volume || 0) / Number(item.capacity) * 100 : 0;
      return ["Bloqueado", "Em manutenção"].includes(status) || (Number(item.volume || 0) > 0 && (pct < 10 || pct > 90));
    }).length;
    const total = assets.reduce((sum, item) => sum + Number(item.volume || 0), 0);
    const unit = silo ? "ton" : "bbl";
    const title = silo ? `Planta de Granéis ${phase}` : `Planta de Fluidos ${phase}`;
    const gridClass = silo ? "tv-plant-grid tv-bulk-grid" : "tv-plant-grid tv-fluid-grid";

    return `<section class="tv-slide tv-plant-slide ${phase === "Phase #1" ? "tv-phase-1" : "tv-phase-2"}">
      <div class="tv-slide-heading"><div><small>SLIDE ${slideNumber} DE 7</small><h2>${esc(title)}</h2><span>${occupied} de ${assets.length} equipamentos com produto</span></div><strong>${state.data.profile.department || "B-Port LMP"}</strong></div>
      <div class="tv-slide-kpis">
        <div><span>Equipamentos</span><strong>${assets.length}</strong></div>
        <div><span>Com produto</span><strong>${occupied}</strong></div>
        <div><span>Volume total</span><strong>${fmt.format(total)} ${unit}</strong></div>
        <div><span>Alertas</span><strong>${alerts}</strong></div>
      </div>
      <div class="${gridClass}">${assets.length ? assets.map(tvTankTile).join("") : `<div class="tv-empty-state">Nenhum equipamento cadastrado nesta área.</div>`}</div>
    </section>`;
  }

  function tvOperationsSlide() {
    const active = tvActiveOperations();
    const occurrences = active.filter(item => item.occurrence).length;
    return `<section class="tv-slide tv-operations-slide">
      <div class="tv-slide-heading"><div><small>SLIDE 5 DE 7</small><h2>Operações em execução</h2><span>${active.length} operação(ões) ativa(s)</span></div><strong>Atualização automática</strong></div>
      <div class="tv-slide-kpis">
        <div><span>Operações ativas</span><strong>${active.length}</strong></div>
        <div><span>Programadas</span><strong>${state.data.operations.filter(x => x.status === "Programada").length}</strong></div>
        <div><span>Paralisadas</span><strong>${active.filter(x => x.status === "Paralisada").length}</strong></div>
        <div><span>Ocorrências</span><strong>${occurrences}</strong></div>
      </div>
      <div class="tv-operation-grid tv-operation-grid-wide">${active.length ? active.slice(0, 8).map(tvOperationTile).join("") : `<div class="tv-empty-state">Nenhuma operação em andamento no momento.</div>`}</div>
    </section>`;
  }

  function tvDashboardSlide() {
    const tanks = state.data.tanks.filter(item => !isSiloAsset(item));
    const silos = state.data.tanks.filter(item => isSiloAsset(item));
    const totalBbl = tanks.reduce((sum, item) => sum + Number(item.volume || 0), 0);
    const totalTon = silos.reduce((sum, item) => sum + Number(item.volume || 0), 0);
    const active = tvActiveOperations();
    const alerts = tvCriticalAlerts();
    const todayKey = new Date().toISOString().slice(0,10);
    const todayTrucks = state.data.trucks.filter(item => String(item.date || item.created_at || "").slice(0,10) === todayKey);
    return `<section class="tv-slide tv-dashboard-slide">
      <div class="tv-slide-heading"><div><small>SLIDE 6 DE 7</small><h2>Dashboard Operacional</h2><span>Resumo geral da planta</span></div><strong>B-Port LMP</strong></div>
      <div class="tv-dashboard-kpi-grid">
        <div><span>Fluidos armazenados</span><strong>${fmt.format(totalBbl)} bbl</strong><small>${tanks.filter(x=>Number(x.volume||0)>0).length}/${tanks.length} equipamentos ocupados</small></div>
        <div><span>Granéis armazenados</span><strong>${fmt.format(totalTon)} ton</strong><small>${silos.filter(x=>Number(x.volume||0)>0).length}/${silos.length} silos ocupados</small></div>
        <div><span>Operações ativas</span><strong>${active.length}</strong><small>Em execução neste momento</small></div>
        <div><span>Carretas hoje</span><strong>${todayTrucks.length}</strong><small>Registros do dia</small></div>
        <div><span>Alertas críticos</span><strong>${alerts.length}</strong><small>Necessitam atenção</small></div>
        <div><span>Última sincronização</span><strong>${state.lastSync ? state.lastSync.toLocaleTimeString("pt-BR") : "-"}</strong><small>Dados em tempo real</small></div>
      </div>
      <div class="tv-dashboard-bottom">
        <div class="tv-dashboard-status"><h3>Status dos equipamentos</h3>${["Operacional","Disponível","Em fabricação","Recebendo","Bombeando","Em manutenção","Bloqueado","Vazio"].map(status => `<div><span class="tv-status-dot"></span><strong>${status}</strong><b>${state.data.tanks.filter(item => (item.status || (Number(item.volume||0)>0?"Operacional":"Vazio")) === status).length}</b></div>`).join("")}</div>
        <div class="tv-dashboard-recent"><h3>Operações mais recentes</h3>${active.slice(0,5).map(operation => `<div><strong>${esc(operation.activity)}</strong><span>${esc(operation.client)} • ${esc(operation.vessel)}</span><b>${esc(operation.status)}</b></div>`).join("") || `<div class="tv-empty-state compact">Nenhuma operação ativa.</div>`}</div>
      </div>
    </section>`;
  }

  function tvAlertsSlide() {
    const alerts = tvCriticalAlerts();
    const equipmentAlerts = state.data.tanks.map(item => {
      const status = item.status || "";
      const pct = Number(item.capacity || 0) > 0 ? Number(item.volume || 0) / Number(item.capacity) * 100 : 0;
      if (["Bloqueado", "Em manutenção"].includes(status)) return { level:"Crítico", title:`${item.name} — ${status}`, message:`${item.product || "Sem produto"} • ${fmt.format(item.volume)} ${item.unit}` };
      if (pct > 90) return { level:"Alto", title:`${item.name} acima de 90%`, message:`${fmt.format(pct)}% • ${fmt.format(item.volume)} / ${fmt.format(item.capacity)} ${item.unit}` };
      if (Number(item.volume || 0) > 0 && pct < 10) return { level:"Alto", title:`${item.name} abaixo de 10%`, message:`${fmt.format(pct)}% • ${fmt.format(item.volume)} / ${fmt.format(item.capacity)} ${item.unit}` };
      return null;
    }).filter(Boolean);
    const combined = [...equipmentAlerts, ...alerts].slice(0, 12);
    return `<section class="tv-slide tv-alerts-slide">
      <div class="tv-slide-heading"><div><small>SLIDE 7 DE 7</small><h2>Alertas e atenção operacional</h2><span>${combined.length} ocorrência(s) em destaque</span></div><strong>Prioridade operacional</strong></div>
      <div class="tv-alert-grid-full">${combined.length ? combined.map(item => `<article class="tv-alert-card-full"><div>${badge(item.level || "Alto")}</div><strong>${esc(item.title || "Alerta")}</strong><p>${esc(item.message || "")}</p></article>`).join("") : `<div class="tv-all-clear"><span>✓</span><strong>Nenhum alerta crítico neste momento.</strong><small>A planta está sem ocorrências prioritárias.</small></div>`}</div>
    </section>`;
  }

  function updateTvClock() {
    const clock = $("#tvClock");
    const date = $("#tvDate");
    if (!clock || !date) return;
    const now = new Date();
    clock.textContent = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    date.textContent = now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  }

  function changeTvSlide(step = 1) {
    const totalSlides = 7;
    state.tv.slide = (state.tv.slide + step + totalSlides) % totalSlides;
    renderTv();
  }

  function startTvMode() {
    clearInterval(state.tv.timer);
    clearInterval(state.tv.clockTimer);
    state.tv.clockTimer = setInterval(updateTvClock, 1000);
    if (!state.tv.paused) state.tv.timer = setInterval(() => {
      if (state.page === "tv" && document.visibilityState === "visible") changeTvSlide(1);
    }, state.tv.intervalMs);
    updateTvClock();
  }

  function stopTvMode() {
    clearInterval(state.tv.timer);
    clearInterval(state.tv.clockTimer);
    state.tv.timer = null;
    state.tv.clockTimer = null;
  }

  function renderTv() {
    const page = $("#page-tv");
    if (!page || !state.data) return;
    const totalSlides = 7;
    const slide = ((Number(state.tv.slide || 0) % totalSlides) + totalSlides) % totalSlides;
    state.tv.slide = slide;
    const labels = ["Fluidos P#1","Granéis P#1","Fluidos P#2","Granéis P#2","Operações","Dashboard","Alertas"];
    const slides = [
      () => tvPlantSlide("Phase #1", false, 1),
      () => tvPlantSlide("Phase #1", true, 2),
      () => tvPlantSlide("Phase #2", false, 3),
      () => tvPlantSlide("Phase #2", true, 4),
      tvOperationsSlide,
      tvDashboardSlide,
      tvAlertsSlide
    ];
    page.innerHTML = `<div class="tv-screen tv-light-screen">
      <div class="tv-topbar"><div class="tv-brand"><span>OC</span><div><strong>OpsControl IA</strong><small>Painel Operacional — B-Port LMP</small></div></div><div class="tv-top-status"><span class="live-dot"></span><strong>Dados em tempo real</strong><small>Troca automática a cada ${Math.round(state.tv.intervalMs / 1000)} segundos</small></div><div class="tv-clock"><strong id="tvClock">--:--:--</strong><span id="tvDate">--</span></div></div>
      <div class="tv-content">${slides[slide]()}</div>
      <div class="tv-footer"><div class="tv-dots">${labels.map((label,index)=>`<button class="${index===slide?"active":""}" data-tv-slide="${index}"><span></span>${index+1}. ${label}</button>`).join("")}</div><div class="tv-controls no-print"><button class="btn secondary" data-action="tv-prev">‹ Anterior</button><button class="btn secondary" data-action="tv-toggle">${state.tv.paused?"▶ Retomar":"Ⅱ Pausar"}</button><button class="btn secondary" data-action="tv-next">Próximo ›</button><button class="btn primary" data-action="tv-fullscreen">${document.fullscreenElement?"Sair da tela cheia":"Tela cheia"}</button></div></div>
    </div>`;
    updateTvClock();
  }



  function dashboardRoleHome(d, activeOps) {
    const currentRole = role();
    const currentShift = handoverSnapshot();
    const openPendings = (d.handoverPendings || []).filter(x => ["Pendente", "Em andamento"].includes(x.status));
    const lowChemicals = (d.chemicals || []).filter(x => x.quantity <= x.minimum);
    const openOrders = (d.maintenanceOrders || []).filter(x => !["Concluída", "Fechada", "Cancelada"].includes(x.status));
    const openActions = (d.actionItems || []).filter(x => x.status !== "Concluído");
    const todayTrucks = (d.trucks || []).filter(x => recordDateKey(x.date || x.created_at) === localDateKey());
    const checklist = checklistForShift();
    const checklistDone = checklist.filter(x => x.completed).length;
    const qualityCount = dataQualityIssues().filter(x => x.severity !== "Baixa").length;

    const action = (page, label, description, icon) => `<button class="role-home-action" data-page-link="${page}"><span>${icon}</span><div><strong>${esc(label)}</strong><small>${esc(description)}</small></div><b>›</b></button>`;
    const create = (name, label, description, icon) => `<button class="role-home-action" data-action="${name}"><span>${icon}</span><div><strong>${esc(label)}</strong><small>${esc(description)}</small></div><b>+</b></button>`;

    let title = `Olá, ${esc(d.profile.name.split(" ")[0])}`;
    let subtitle = "Resumo operacional da planta";
    let metrics = [];
    let actions = [];

    if (["operador", "user"].includes(currentRole)) {
      title = `Turno operacional — ${esc(d.profile.name.split(" ")[0])}`;
      subtitle = activeOps.length ? `${activeOps.length} operação(ões) exigindo acompanhamento` : "Nenhuma operação ativa neste momento";
      metrics = [
        ["Operações ativas", activeOps.length, "operations"],
        ["Checklist do turno", `${checklistDone}/${checklist.length}`, "reports"],
        ["Pendências", openPendings.length, "reports"]
      ];
      actions = [
        create("new-operation", "Registrar operação", "Início, volume, paralisação ou conclusão", uiIcon("anchor")),
        action("tanks", "Consultar tancagem", "Saldo, produto e lote", uiIcon("layers")),
        action("reports", "Passagem do turno", "Checklist e pendências", uiIcon("file"))
      ];
    } else if (currentRole === "lider") {
      title = "Painel do líder de turno";
      subtitle = "Operações, pendências e entrega da equipe";
      metrics = [
        ["Operações ativas", activeOps.length, "operations"],
        ["Pendências abertas", openPendings.length, "reports"],
        ["Qualidade dos dados", qualityCount, "quality"]
      ];
      actions = [
        create("new-operation", "Nova operação", "Programar e distribuir tancagem", uiIcon("anchor")),
        action("reports", "Preparar passagem", "Checklist, atividades e pendências", uiIcon("file")),
        action("quality", "Conferir lançamentos", "Inconsistências antes do fechamento", uiIcon("shield"))
      ];
    } else if (currentRole === "logistica") {
      title = "Painel da logística";
      subtitle = "Carretas, estoques, lotes e documentação";
      metrics = [
        ["Carretas hoje", todayTrucks.length, "trucks"],
        ["Químicos baixos", lowChemicals.length, "chemicals"],
        ["Pendências", openPendings.length, "reports"]
      ];
      actions = [
        create("new-truck", "Movimentar carreta", "Entrada, saída, NF e lote", uiIcon("truck")),
        action("chemicals", "Inventário químico", "Saldo, validade e FEFO", uiIcon("flask")),
        action("quality", "Conferir documentos", "NF, lote e rastreabilidade", uiIcon("shield"))
      ];
    } else if (currentRole === "mecanico") {
      title = "Painel da manutenção";
      subtitle = "Equipamentos e ordens de serviço";
      metrics = [
        ["OS abertas", openOrders.length, "maintenance"],
        ["Equipamentos parados", d.equipment.filter(x => String(x.status).toLowerCase().includes("parado")).length, "maintenance"],
        ["Pendências do turno", openPendings.filter(x => x.category === "Manutenção").length, "reports"]
      ];
      actions = [
        create("new-maintenance-order", "Abrir ordem de serviço", "Registrar falha ou preventiva", uiIcon("wrench")),
        action("maintenance", "Ver equipamentos", "Horímetro e programação", uiIcon("gauge")),
        action("reports", "Pendências recebidas", "Itens do turno anterior", uiIcon("file"))
      ];
    } else if (currentRole === "qhse") {
      title = "Painel QHSE";
      subtitle = "Riscos, ações, validade e conformidade";
      metrics = [
        ["Ações pendentes", openActions.length, "qhse"],
        ["Alertas críticos", d.systemAlerts.filter(x => isCriticalAlert(x.level)).length, "alerts"],
        ["Qualidade dos dados", qualityCount, "quality"]
      ];
      actions = [
        create("new-qhse", "Novo registro QHSE", "Risco, inspeção, DDS ou ocorrência", uiIcon("shield")),
        action("qhse", "Acompanhar ações", "Responsáveis e prazos", uiIcon("check")),
        action("quality", "Ver conformidade", "Campos obrigatórios e documentos", uiIcon("shield"))
      ];
    } else {
      title = currentRole === "supervisor" ? "Painel da supervisão" : "Visão administrativa";
      subtitle = "Riscos, produtividade, qualidade e decisões";
      metrics = [
        ["Operações ativas", activeOps.length, "operations"],
        ["Alertas críticos", d.systemAlerts.filter(x => isCriticalAlert(x.level)).length, "alerts"],
        ["Inconsistências", dataQualityIssues().length, "quality"]
      ];
      actions = [
        action("quality", "Qualidade e conciliação", "Validar dados antes do fechamento", uiIcon("shield")),
        action("reports", "Relatórios gerenciais", "Indicadores e passagem", uiIcon("file")),
        action("audit", "Auditoria", "Quem alterou e quando", uiIcon("database"))
      ];
    }

    return `<section class="role-home-panel role-${esc(currentRole)}">
      <div class="role-home-heading"><div><small>MEU PAINEL</small><h2>${title}</h2><p>${subtitle}</p></div><button class="btn secondary" data-action="open-feedback">Dar feedback</button></div>
      <div class="role-home-metrics">${metrics.map(([label, value, page]) => `<button data-page-link="${page}"><span>${esc(label)}</span><strong>${esc(value)}</strong></button>`).join("")}</div>
      <div class="role-home-actions">${actions.join("")}</div>
    </section>`;
  }

  function renderDashboard() {
    const d = state.data;
    const operations = filteredOperations();
    const trucks = filteredTrucks();
    const filtersActive = filterIsActive();

    const storage = type => {
      const items = d.tanks.filter(t => productClass(t.product, t.kind, t.volume) === type);
      return {
        volume: items.reduce((sum, item) => sum + Number(item.volume || 0), 0),
        capacity: items.reduce((sum, item) => sum + Number(item.capacity || 0), 0)
      };
    };

    const wbm = storage("wbm");
    const brine = storage("brine");
    const sbm = storage("sbm");
    const olefin = storage("olefin");
    const bulk = storage("bulk");
    const genericVolume = d.tanks
      .filter(t => productClass(t.product, t.kind, t.volume) === "generic")
      .reduce((sum, item) => sum + Number(item.volume || 0), 0);

    const activeOps = operations.filter(x => !["Concluída", "Cancelada"].includes(x.status));
    const today = localDateKey();
    const todayOps = d.operations.filter(x => recordDateKey(x.start_at || x.created_at) === today).length;
    const todayTrucks = d.trucks.filter(x => recordDateKey(x.date || x.created_at) === today).length;
    const periodOps = operations.length;
    const periodTrucks = trucks.length;

    const openMaintenance = d.maintenanceOrders.filter(x => !["Concluída", "Fechada", "Cancelada"].includes(x.status)).length;
    const expiring = d.certificates.filter(x => {
      const days = daysUntil(x.expires_at);
      return days !== null && days >= 0 && days <= 60;
    });
    const pendingQhse = d.actionItems.filter(x => x.status !== "Concluído").length
      + d.qhse.filter(x => x.status !== "Concluído").length;
    const downtime = operations.reduce((sum, op) => sum + Number(op.paused_minutes || 0), 0);
    const lowChemicals = d.chemicals.filter(x => Number(x.quantity || 0) <= Number(x.minimum || 0)).length;
    const expiringChemicals = d.chemicals.filter(x => {
      const days = daysUntil(x.expiry_date);
      return days !== null && days >= 0 && days <= 60;
    }).length;
    const criticalAlerts = d.systemAlerts.filter(x => isCriticalAlert(x.level)).length
      + d.alerts.filter(x => !x.read && isCriticalAlert(x.level)).length;

    const byClient = aggregateOperationVolume(operations, "client").slice(0, 6);
    const products = aggregateOperationVolume(operations, "product").slice(0, 6);
    const maxClient = Math.max(...byClient.map(x => x.value), 1);

    const clients = [...new Set(d.operations.map(x => x.client).filter(Boolean))].sort();
    const productNames = [...new Set(d.operations.map(x => x.product).filter(Boolean))].sort();

    const latestChange = latestTimestamp([
      ...d.tanks.map(x => x.updated_at),
      ...d.operations.map(x => x.updated_at || x.created_at),
      ...d.chemicals.map(x => x.updated_at),
      ...d.maintenanceOrders.map(x => x.closed_at || x.opened_at),
      ...d.alerts.map(x => x.created_at)
    ]);

    const occupiedAssets = d.tanks.filter(x => Number(x.volume || 0) > 0).length;
    const blockedAssets = d.tanks.filter(x => String(x.status || "").toLowerCase() === "bloqueado").length;
    const operationCount = filtersActive ? periodOps : todayOps;
    const truckCount = filtersActive ? periodTrucks : todayTrucks;
    const periodLabel = filtersActive ? "no período selecionado" : "registradas hoje";

    const phaseSummary = phase => {
      const assets = d.tanks.filter(x => x.phase === phase);
      const occupied = assets.filter(x => Number(x.volume || 0) > 0).length;
      const blocked = assets.filter(x => String(x.status || "").toLowerCase() === "bloqueado").length;
      const silos = assets.filter(isSiloAsset).length;
      const tanks = Math.max(0, assets.length - silos);
      const utilization = assets.length ? occupied / assets.length * 100 : 0;
      return { phase, total: assets.length, occupied, blocked, silos, tanks, utilization };
    };
    const phase1 = phaseSummary("Phase #1");
    const phase2 = phaseSummary("Phase #2");

    const attentionItems = [
      criticalAlerts > 0 ? { tone: "critical", value: criticalAlerts, title: "Alertas críticos", detail: "Alertas automáticos ou ainda não lidos", page: "alerts", icon: "alert" } : null,
      blockedAssets > 0 ? { tone: "warning", value: blockedAssets, title: "Equipamentos bloqueados", detail: "Tanques ou silos indisponíveis para operação", page: "tanks", icon: "lock" } : null,
      pendingQhse > 0 ? { tone: "warning", value: pendingQhse, title: "Pendências QHSE", detail: "Registros e itens de ação ainda abertos", page: "qhse", icon: "shield" } : null,
      lowChemicals > 0 ? { tone: "warning", value: lowChemicals, title: "Estoque químico baixo", detail: "Produtos no mínimo ou abaixo do mínimo", page: "chemicals", icon: "flask" } : null,
      expiring.length > 0 ? { tone: "info", value: expiring.length, title: "Certificados a vencer", detail: "Vencimento previsto nos próximos 60 dias", page: "certificates", icon: "file" } : null,
      expiringChemicals > 0 ? { tone: "info", value: expiringChemicals, title: "Lotes próximos do vencimento", detail: "Validade prevista nos próximos 60 dias", page: "chemicals", icon: "hourglass" } : null
    ].filter(Boolean).slice(0, 5);

    const activityDate = value => {
      if (!value) return "-";
      const raw = String(value);
      return raw.length <= 10 ? dateOnly(raw) : dateTime(raw);
    };
    const recentActivity = [
      ...d.operations.map(item => ({
        date: item.updated_at || item.start_at || item.created_at,
        page: "operations", icon: "anchor", tone: "blue",
        title: `${item.client || "Cliente não informado"} • ${item.vessel || "Embarcação não informada"}`,
        detail: `${item.activity || "Operação"} — ${item.product || "Produto não informado"}`
      })),
      ...d.trucks.map(item => ({
        date: item.updated_at || item.created_at || item.date,
        page: "trucks", icon: "truck", tone: "green",
        title: item.plate || item.invoice || "Movimentação de carreta",
        detail: `${item.movement || "Movimentação"} — ${item.product || item.truckType || "Carga"}`
      })),
      ...d.qhse.map(item => ({
        date: item.updated_at || item.created_at || item.date,
        page: "qhse", icon: "shield", tone: "amber",
        title: item.title || item.type || "Registro QHSE",
        detail: `${item.severity || "Sem severidade"} — ${item.status || "Sem status"}`
      })),
      ...d.maintenanceOrders.map(item => {
        const equipment = d.equipment.find(eq => eq.id === item.equipment_id);
        return {
          date: item.closed_at || item.opened_at,
          page: "maintenance", icon: "wrench", tone: "red",
          title: item.title || "Ordem de manutenção",
          detail: `${equipment?.name || "Equipamento"} — ${item.status || "Sem status"}`
        };
      })
    ].filter(item => item.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 7);

    const phaseCard = item => `<div class="dashboard-phase-card">
      <div class="dashboard-phase-head"><div><small>ÁREA OPERACIONAL</small><strong>${esc(item.phase)}</strong></div><span>${fmt.format(item.utilization)}%</span></div>
      <div class="dashboard-phase-progress"><span style="width:${Math.min(100, Math.max(0, item.utilization))}%"></span></div>
      <div class="dashboard-phase-data"><div><strong>${item.occupied}/${item.total}</strong><small>com produto</small></div><div><strong>${item.tanks}</strong><small>tanques</small></div><div><strong>${item.silos}</strong><small>silos</small></div><div><strong>${item.blocked}</strong><small>bloqueados</small></div></div>
    </div>`;

    $("#page-dashboard").innerHTML =
      header(MOBILE_PAGE_META.dashboard[0], "Visão consolidada da operação, tancagem e pontos de atenção.",
        `<button class="btn secondary" data-export="operations">Exportar CSV</button>
         <button class="btn secondary" data-action="refresh">${uiIcon("refresh", "ui-icon btn-icon")} Atualizar</button>
         <button class="btn primary" data-action="new-operation">+ Nova operação</button>`) +
      `<div class="dashboard-v331">
        ${dashboardRoleHome(d, activeOps)}

        <section class="dashboard-command-bar" aria-label="Status de sincronização">
          <div class="dashboard-command-live"><span class="live-dot"></span><div><strong>Operação sincronizada</strong><small>Tempo real ativo e verificação automática a cada 60 segundos</small></div></div>
          <div><small>Última sincronização</small><strong>${state.lastSync ? dateTime(state.lastSync) : "-"}</strong></div>
          <div><small>Última alteração</small><strong>${latestChange ? dateTime(latestChange) : "-"}</strong></div>
          <div><small>Ocupação da planta</small><strong>${occupiedAssets} de ${d.tanks.length} equipamentos</strong></div>
        </section>

        <section class="card dashboard-filter-panel no-print">
          <div class="dashboard-filter-heading"><div><small>PERÍODO E ESCOPO</small><h3>Filtros do dashboard</h3><p>Operações, carretas, rankings e tempo parado seguem o período selecionado.</p></div>${filtersActive ? `<span class="dashboard-filter-active">Filtro ativo</span>` : ""}</div>
          <div class="dashboard-filter-grid">
            <div><label>Data inicial</label><input id="filterStart" type="date" value="${esc(state.filters.start)}"></div>
            <div><label>Data final</label><input id="filterEnd" type="date" value="${esc(state.filters.end)}"></div>
            <div><label>Cliente</label><select id="filterClient"><option value="">Todos</option>${clients.map(x => `<option ${state.filters.client === x ? "selected" : ""}>${esc(x)}</option>`).join("")}</select></div>
            <div><label>Produto</label><select id="filterProduct"><option value="">Todos</option>${productNames.map(x => `<option ${state.filters.product === x ? "selected" : ""}>${esc(x)}</option>`).join("")}</select></div>
            <div class="filter-actions"><button class="btn primary" data-action="apply-dashboard-filters">Aplicar filtros</button><button class="btn secondary" data-action="clear-dashboard-filters">Limpar</button></div>
          </div>
        </section>
        ${filtersActive ? `<div class="dashboard-filter-notice">A tancagem continua exibindo o saldo atual da planta. Os demais indicadores seguem o filtro aplicado.</div>` : ""}

        <section class="dashboard-kpi-grid" aria-label="Indicadores principais">
          ${statCard(filtersActive ? "Operações no filtro" : "Operações hoje", fmt.format(operationCount), periodLabel, uiIcon("anchor"), activeOps.length ? `${activeOps.length} em andamento` : "Nenhuma em andamento", "blue")}
          ${statCard("Operações ativas", fmt.format(activeOps.length), "em acompanhamento", uiIcon("gauge"), activeOps.length ? "Monitorar execução e vazão" : "Planta sem operação ativa", "indigo")}
          ${statCard(filtersActive ? "Carretas no filtro" : "Carretas hoje", fmt.format(truckCount), periodLabel, uiIcon("truck"), "Entradas e saídas registradas", "green")}
          ${statCard("Equipamentos ocupados", fmt.format(occupiedAssets), `de ${d.tanks.length} tanques e silos`, uiIcon("layers"), `${blockedAssets} bloqueado(s)`, "cyan")}
          ${statCard("Manutenções abertas", fmt.format(openMaintenance), "ordens pendentes", uiIcon("wrench"), "Corretivas e preventivas", "amber")}
          ${statCard("Alertas críticos", fmt.format(criticalAlerts), "automáticos e não lidos", uiIcon("alert"), criticalAlerts ? "Requerem atenção" : "Nenhuma criticidade", "red")}
        </section>

        <div class="dashboard-main-grid">
          <section class="card dashboard-operations-panel">
            <div class="dashboard-section-heading"><div><small>ACOMPANHAMENTO EM TEMPO REAL</small><h3>Operações em andamento</h3><p>${activeOps.length} operação(ões) ativa(s) ${filtersActive ? "no filtro selecionado" : "neste momento"}.</p></div><button class="btn small secondary" data-page-link="operations">Ver todas</button></div>
            <div class="dashboard-operation-list">${activeOps.length ? activeOps.slice(0, 6).map(op => {
              const pct = op.planned ? Math.min(100, Math.max(0, Math.round(Number(op.executed || 0) / Number(op.planned || 1) * 100))) : 0;
              return `<article class="dashboard-operation-card">
                <div class="dashboard-operation-top"><div><small>${esc(op.client || "Cliente não informado")}</small><strong>${esc(op.vessel || "Embarcação não informada")}</strong><span>${esc(op.activity || "Operação")} • ${esc(op.product || "Produto não informado")}</span></div>${badge(op.status)}</div>
                <div class="dashboard-operation-progress"><span style="width:${pct}%"></span></div>
                <div class="dashboard-operation-metrics"><div><small>Executado</small><strong>${fmt.format(op.executed)} ${esc(op.unit)}</strong></div><div><small>Planejado</small><strong>${fmt.format(op.planned)} ${esc(op.unit)}</strong></div><div><small>Progresso</small><strong>${pct}%</strong></div><div><small>Vazão</small><strong>${fmt.format(operationFlow(op))} ${esc(op.unit)}/h</strong></div></div>
                <div class="dashboard-operation-footer"><span>${op.start_at ? `Início: ${dateTime(op.start_at)}` : "Horário inicial não informado"}</span><div><button class="btn small secondary" data-operation-timeline="${op.id}">Timeline</button><button class="btn small primary" data-edit-operation="${op.id}">Abrir</button></div></div>
              </article>`;
            }).join("") : `<div class="dashboard-empty-state">${uiIcon("check")}<strong>Nenhuma operação ativa</strong><span>As novas operações aparecerão aqui automaticamente.</span></div>`}</div>
          </section>

          <aside class="dashboard-side-stack">
            <section class="card dashboard-attention-panel">
              <div class="dashboard-section-heading compact"><div><small>CENTRAL DE ATENÇÃO</small><h3>Pontos que exigem ação</h3></div><button class="btn small secondary" data-page-link="alerts">Alertas</button></div>
              <div class="dashboard-attention-list">${attentionItems.length ? attentionItems.map(item => `<button class="dashboard-attention-item tone-${item.tone}" data-page-link="${item.page}"><span class="dashboard-attention-icon">${uiIcon(item.icon)}</span><div><strong>${esc(item.title)}</strong><small>${esc(item.detail)}</small></div><b>${fmt.format(item.value)}</b></button>`).join("") : `<div class="dashboard-empty-state compact">${uiIcon("check")}<strong>Sem pendências críticas</strong><span>Os principais controles estão dentro dos limites.</span></div>`}</div>
            </section>

            <section class="card dashboard-phase-panel">
              <div class="dashboard-section-heading compact"><div><small>DISPONIBILIDADE POR ÁREA</small><h3>Ocupação das fases</h3></div><button class="btn small secondary" data-page-link="tanks">Tancagem</button></div>
              <div class="dashboard-phase-list">${phaseCard(phase1)}${phaseCard(phase2)}</div>
              <div class="dashboard-plant-metrics">
                <div><span>QHSE pendente</span><strong>${pendingQhse}</strong></div>
                <div><span>Tempo parado</span><strong>${fmt.format(downtime / 60)} h</strong></div>
                <div><span>Certificados</span><strong>${expiring.length}</strong></div>
                <div><span>Químicos baixos</span><strong>${lowChemicals}</strong></div>
              </div>
            </section>
          </aside>
        </div>

        <section class="card dashboard-storage-overview">
          <div class="dashboard-section-heading"><div><small>SALDO ATUAL DA PLANTA</small><h3>Tancagem por família de produto</h3><p>Volumes atuais, capacidade utilizada e espaço livre.</p></div><button class="btn small secondary" data-page-link="tanks">Abrir inventário</button></div>
          <div class="dashboard-storage-grid">
            ${storageCard("WBM", wbm.volume, wbm.capacity, "bbl", uiIcon("droplet"), "wbm")}
            ${storageCard("Brine", brine.volume, brine.capacity, "bbl", uiIcon("droplet"), "brine")}
            ${storageCard("SBM", sbm.volume, sbm.capacity, "bbl", uiIcon("droplet"), "sbm")}
            ${storageCard("Olefina", olefin.volume, olefin.capacity, "bbl", uiIcon("droplet"), "olefin")}
            ${storageCard("Granéis", bulk.volume, bulk.capacity, "ton", uiIcon("package"), "bulk")}
          </div>
          ${genericVolume > 0 ? `<div class="dashboard-data-warning">Existem ${fmt.format(genericVolume)} bbl com produto não classificado. Vincule o produto para incluir esse volume no indicador correto.</div>` : ""}
        </section>

        <div class="dashboard-analysis-grid">
          <section class="card dashboard-chart-card">
            <div class="dashboard-section-heading compact"><div><small>PERFORMANCE</small><h3>Volume executado por cliente</h3><p>Valores mantidos por unidade operacional.</p></div></div>
            <div class="bar-list">${byClient.length ? byClient.map(item => `<div class="bar-row"><div><span>${esc(item.label)} <em class="unit-chip">${esc(item.unit)}</em></span><strong>${fmt.format(item.value)}</strong></div><div class="bar-track"><span style="width:${Math.min(100, item.value / maxClient * 100)}%"></span></div></div>`).join("") : `<div class="empty">Sem operações no período.</div>`}</div>
          </section>

          <section class="card dashboard-ranking-card">
            <div class="dashboard-section-heading compact"><div><small>MOVIMENTAÇÃO</small><h3>Produtos mais movimentados</h3><p>Ranking pelo volume executado.</p></div></div>
            <div class="ranking-list">${products.length ? products.map((item, index) => `<div class="ranking-row"><span class="rank">${index + 1}</span><div><strong>${esc(item.label)}</strong><small>${fmt.format(item.value)} ${esc(item.unit)} movimentados</small></div></div>`).join("") : `<div class="empty">Sem movimentações no período.</div>`}</div>
          </section>

          <section class="card dashboard-activity-panel">
            <div class="dashboard-section-heading compact"><div><small>RASTREABILIDADE</small><h3>Atividades recentes</h3><p>Últimas atualizações dos módulos operacionais.</p></div><button class="btn small secondary" data-page-link="audit">Auditoria</button></div>
            <div class="dashboard-activity-list">${recentActivity.length ? recentActivity.map(item => `<button class="dashboard-activity-item" data-page-link="${item.page}"><span class="dashboard-activity-icon tone-${item.tone}">${uiIcon(item.icon)}</span><div><strong>${esc(item.title)}</strong><small>${esc(item.detail)}</small></div><time>${activityDate(item.date)}</time></button>`).join("") : `<div class="empty">Nenhuma atividade recente.</div>`}</div>
          </section>
        </div>

        <section class="card smart-query dashboard-smart-query"><div><small>ASSISTENTE OPERACIONAL</small><h3>Consulta inteligente</h3><p>Pergunte sobre volumes, clientes, carretas, tanques, químicos, certificados ou diesel.</p></div><div class="smart-input"><input id="smartQuestion" placeholder="Ex.: Quantos bbl de Brine temos?"><button class="btn primary" data-action="smart-query">Perguntar</button></div><div id="smartAnswer" class="smart-answer hidden"></div></section>
      </div>`;
  }


  function dataQualityIssues() {
    const d = state.data;
    const issues = [];
    const add = (severity, category, title, detail, page, entityType = "", entityId = "") => issues.push({
      id: `${category}:${entityType}:${entityId}:${title}`,
      severity, category, title, detail, page, entityType, entityId
    });

    d.tanks.forEach(tank => {
      if (tank.volume > 0 && !tank.product) add("Alta", "Tancagem", `${tank.name} com saldo sem produto`, `${fmt.format(tank.volume)} ${tank.unit} precisam ser classificados.`, "tanks", "tank", tank.id);
      if (tank.volume > 0 && !tank.lot) add("Média", "Tancagem", `${tank.name} sem lote`, `${tank.product || "Produto não informado"} possui saldo sem rastreabilidade de lote.`, "tanks", "tank", tank.id);
      if (isSiloAsset(tank) && tank.volume > 0 && !(Number(tank.density) > 0)) add("Alta", "Tancagem", `${tank.name} sem densidade`, "A capacidade operacional do silo depende da densidade cadastrada.", "tanks", "tank", tank.id);
      if (tank.capacity > 0 && tank.volume > tank.capacity + 0.001) add("Crítica", "Tancagem", `${tank.name} acima da capacidade`, `${fmt.format(tank.volume)} de ${fmt.format(tank.capacity)} ${tank.unit}.`, "tanks", "tank", tank.id);
      const latest = d.tankHistory.filter(x => x.tank_id === tank.id).sort((a,b) => new Date(b.created_at)-new Date(a.created_at))[0];
      if (latest && Math.abs(Number(latest.new_volume || 0) - Number(tank.volume || 0)) > 0.001) add("Alta", "Conciliação", `${tank.name} diferente do último histórico`, `Atual ${fmt.format(tank.volume)} ${tank.unit}; histórico ${fmt.format(latest.new_volume)} ${tank.unit}.`, "tanks", "tank", tank.id);
    });

    d.operations.forEach(op => {
      const mode = tankMovementMode(op.activity);
      const allocations = normalizedOperationAllocations(op);
      const total = allocations.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      if (!op.fluidTypeId) add("Alta", "Operações", `${op.vessel}: produto não vinculado`, `${op.product || "Produto não informado"} precisa ser selecionado no catálogo Fluidos e Granéis.`, "operations", "operation", op.id);
      if (op.status === "Concluída" && !op.ticketNumber) add("Média", "Operações", `${op.vessel}: concluída sem ticket`, `${op.client} • ${op.activity} de ${op.product}.`, "operations", "operation", op.id);
      if (op.status === "Concluída" && !op.end_at) add("Alta", "Operações", `${op.vessel}: concluída sem término`, `${op.client} • ${op.activity} de ${op.product}.`, "operations", "operation", op.id);
      if (["Em andamento", "Paralisada", "Concluída"].includes(op.status) && !op.start_at) add("Alta", "Operações", `${op.vessel}: sem horário inicial`, `${op.client} • ${op.activity} de ${op.product}.`, "operations", "operation", op.id);
      if (mode !== "none" && op.executed > 0 && !allocations.length) add("Crítica", "Operações", `${op.vessel}: sem rateio de tancagem`, `${fmt.format(op.executed)} ${op.unit} executados sem origem/destino distribuído.`, "operations", "operation", op.id);
      if (mode !== "none" && allocations.length && Math.abs(total - op.executed) > 0.001) add("Alta", "Conciliação", `${op.vessel}: rateio diferente do executado`, `Executado ${fmt.format(op.executed)}; rateado ${fmt.format(total)} ${op.unit}.`, "operations", "operation", op.id);
      if (op.executed > op.planned + 0.001 && op.planned > 0) add("Média", "Operações", `${op.vessel}: executado acima do planejado`, `${fmt.format(op.executed)} de ${fmt.format(op.planned)} ${op.unit}.`, "operations", "operation", op.id);
    });

    d.trucks.forEach(truck => {
      if (truck.truckType !== "Plataforma" && ["Recebida","Concluída"].includes(truck.status) && !truck.stockApplied) add("Crítica","Logística",`${truck.plate || truck.invoice || "Carreta"}: estoque não aplicado`,"Abra a carreta e confirme produto, quantidade e equipamento.","trucks","truck",truck.id);
      if (!["Bulk","Tank","Plataforma"].includes(truck.truckType)) add("Alta", "Logística", `${truck.plate || truck.product}: tipo não definido`, "Classifique a carreta como Bulk, Tank ou Plataforma.", "trucks", "truck", truck.id);
      if (!truck.invoice) add("Média", "Logística", `${truck.plate || truck.product}: carreta sem NF`, `${truck.movement} • ${truck.truckType} • ${truck.product}.`, "trucks", "truck", truck.id);
      if (truck.truckType !== "Plataforma" && !truck.fluidTypeId) add("Alta", "Logística", `${truck.plate || truck.product}: produto não vinculado`, "Selecione o produto cadastrado em Fluidos e Granéis.", "trucks", "truck", truck.id);
      if (truck.truckType !== "Plataforma" && !truck.lot) add("Média", "Logística", `${truck.plate || truck.product}: carreta sem lote`, `${truck.product} sem lote informado.`, "trucks", "truck", truck.id);
      if (truck.truckType === "Plataforma" && !(truck.items || []).length) add("Alta", "Logística", `${truck.plate || "Plataforma"}: sem produtos`, "Adicione os insumos e suas quantidades.", "trucks", "truck", truck.id);
      if (!truck.plate) add("Baixa", "Logística", `Movimentação sem placa`, `${truck.product} • NF ${truck.invoice || "-"}.`, "trucks", "truck", truck.id);
    });

    d.chemicals.forEach(item => {
      if (!item.productId) add("Alta","Químicos",`${item.name} sem Catálogo Químico`,"Vincule o lote a um nome oficial.","chemicals","chemical",item.id);
      if (!item.lot) add("Alta", "Químicos", `${item.name} sem lote`, "O controle FEFO e a rastreabilidade ficam incompletos.", "chemicals", "chemical", item.id);
      if (!item.expiry_date) add("Média", "Químicos", `${item.name} sem validade`, `Lote ${item.lot || "-"}.`, "chemicals", "chemical", item.id);
      if (item.quantity < 0) add("Crítica", "Químicos", `${item.name} com saldo negativo`, `${fmt.format(item.quantity)} ${item.unit}.`, "chemicals", "chemical", item.id);
      const movements = d.chemicalMovements.filter(x => x.inventory_id === item.id).sort((a,b) => new Date(a.created_at)-new Date(b.created_at));
      const latest = movements.at(-1);
      if (latest && Math.abs(Number(latest.new_balance) - Number(item.quantity)) > 0.001) add("Crítica", "Conciliação", `${item.name} diferente da movimentação`, `Estoque ${fmt.format(item.quantity)}; último saldo ${fmt.format(latest.new_balance)} ${item.unit}.`, "chemicals", "chemical", item.id);
      movements.forEach((movement, index) => {
        if (index === 0) return;
        const previous = movements[index - 1];
        if (Math.abs(Number(movement.previous_balance) - Number(previous.new_balance)) > 0.001) add("Alta", "Conciliação", `${item.name}: quebra na sequência de saldos`, `${dateTime(previous.created_at)} → ${dateTime(movement.created_at)}.`, "chemicals", "chemical", item.id);
      });
    });

    d.certificates.forEach(item => {
      if (!item.user_id) add("Média", "Documentação", `${item.title} sem usuário vinculado`, `${item.owner || "Colaborador não informado"}.`, "certificates", "certificate", item.id);
      if (!item.expires_at) add("Média", "Documentação", `${item.title} sem validade`, `${item.owner || "-"}.`, "certificates", "certificate", item.id);
    });

    d.equipment.forEach(item => {
      if (!item.location) add("Baixa", "Manutenção", `${item.name} sem localização`, `${item.category}.`, "maintenance", "equipment", item.id);
      if (!item.next_maintenance_date && !item.maintenance_due_hourmeter) add("Média", "Manutenção", `${item.name} sem preventiva programada`, "Cadastre data ou horímetro para a próxima manutenção.", "maintenance", "equipment", item.id);
    });

    return issues.sort((a, b) => {
      const rank = { "Crítica": 0, "Alta": 1, "Média": 2, "Baixa": 3 };
      return (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9) || a.category.localeCompare(b.category);
    });
  }

  function reconciliationSummary() {
    const d = state.data;
    const chemicalOk = d.chemicals.filter(item => {
      const latest = d.chemicalMovements.filter(x => x.inventory_id === item.id).sort((a,b) => new Date(b.created_at)-new Date(a.created_at))[0];
      return !latest || Math.abs(Number(latest.new_balance) - Number(item.quantity)) <= 0.001;
    }).length;
    const tankOk = d.tanks.filter(tank => {
      const latest = d.tankHistory.filter(x => x.tank_id === tank.id).sort((a,b) => new Date(b.created_at)-new Date(a.created_at))[0];
      return !latest || Math.abs(Number(latest.new_volume || 0) - Number(tank.volume || 0)) <= 0.001;
    }).length;
    const operationOk = d.operations.filter(op => {
      const mode = tankMovementMode(op.activity);
      if (mode === "none" || op.executed <= 0) return true;
      const total = normalizedOperationAllocations(op).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      return Math.abs(total - op.executed) <= 0.001;
    }).length;
    return {
      tankOk, tankTotal: d.tanks.length,
      chemicalOk, chemicalTotal: d.chemicals.length,
      operationOk, operationTotal: d.operations.length
    };
  }

  function renderQuality() {
    const issues = dataQualityIssues();
    const summary = reconciliationSummary();
    const critical = issues.filter(x => ["Crítica", "Alta"].includes(x.severity));
    const categories = [...new Set(issues.map(x => x.category))];
    const cards = issues.map(item => `<article class="card quality-issue-card ${statusClass(item.severity)}">
      <div class="quality-issue-top"><span>${esc(item.category)}</span>${badge(item.severity)}</div>
      <h3>${esc(item.title)}</h3><p>${esc(item.detail)}</p>
      <footer><button class="btn small secondary" data-quality-page="${item.page}" data-quality-type="${item.entityType}" data-quality-id="${item.entityId}">Corrigir registro</button></footer>
    </article>`).join("");

    $("#page-quality").innerHTML =
      header("Qualidade dos dados", "Verificação automática de rastreabilidade, conciliação e campos obrigatórios.",
        `<button class="btn secondary" data-action="refresh">${uiIcon("refresh", "ui-icon btn-icon")} Recalcular</button><button class="btn primary" data-export="quality">Exportar pendências</button>`) +
      `<div class="quality-score-card card"><div><small>ÍNDICE DE QUALIDADE</small><strong>${Math.max(0, Math.round(100 - Math.min(100, issues.reduce((sum, item) => sum + ({Crítica:8,Alta:5,Média:2,Baixa:1}[item.severity] || 1), 0))))}%</strong><span>${issues.length} ponto(s) encontrado(s)</span></div><div class="quality-score-bars"><span>Críticos/altos<strong>${critical.length}</strong></span><span>Categorias<strong>${categories.length}</strong></span><span>Última análise<strong>${new Date().toLocaleTimeString("pt-BR")}</strong></span></div></div>
      <div class="section-title">Conciliação automática</div>
      <div class="grid three reconciliation-grid">
        <div class="card reconciliation-card"><span>Tanques e silos</span><strong>${summary.tankOk}/${summary.tankTotal}</strong><small>Saldo atual igual ao último histórico</small><div class="progress"><span style="width:${summary.tankTotal ? summary.tankOk / summary.tankTotal * 100 : 100}%"></span></div></div>
        <div class="card reconciliation-card"><span>Inventário químico</span><strong>${summary.chemicalOk}/${summary.chemicalTotal}</strong><small>Saldo igual à última movimentação</small><div class="progress"><span style="width:${summary.chemicalTotal ? summary.chemicalOk / summary.chemicalTotal * 100 : 100}%"></span></div></div>
        <div class="card reconciliation-card"><span>Operações com rateio</span><strong>${summary.operationOk}/${summary.operationTotal}</strong><small>Rateio igual ao volume executado</small><div class="progress"><span style="width:${summary.operationTotal ? summary.operationOk / summary.operationTotal * 100 : 100}%"></span></div></div>
      </div>
      ${latestClosingReconciliationPanel()}
      <div class="section-title">Pendências encontradas</div>
      <div class="quality-filter-chips">${categories.map(category => `<span>${esc(category)} <strong>${issues.filter(x => x.category === category).length}</strong></span>`).join("") || `<span>Nenhuma pendência</span>`}</div>
      <div class="quality-issues-grid">${cards || `<div class="card quality-all-good"><strong>${uiIcon("check", "ui-icon ui-icon-inline")} Dados consistentes</strong><p>Nenhuma inconsistência automática foi encontrada.</p></div>`}</div>`;
  }


  function sanitationIssues() {
    const issues=[];
    const add=(type,title,detail,page,id="")=>issues.push({type,title,detail,page,id});
    state.data.operations.filter(item=>!item.fluidTypeId).forEach(item=>add("Operação",`${item.vessel}: produto sem vínculo`,item.product||"Produto não informado","operations",item.id));
    state.data.trucks.filter(item=>["Bulk","Tank"].includes(item.truckType)&&!item.fluidTypeId).forEach(item=>add("Carreta",`${item.plate||item.invoice||"Carreta"}: produto sem vínculo`,item.product,"trucks",item.id));
    state.data.chemicals.filter(item=>!item.productId).forEach(item=>add("Químico",`${item.name}: lote sem catálogo`,`Lote ${item.lot||"-"}`,"chemicals",item.id));
    state.data.tanks.filter(item=>item.volume>0&&!item.fluidTypeId).forEach(item=>add("Tancagem",`${item.name}: saldo sem produto vinculado`,`${fmt.format(item.volume)} ${item.unit}`,"tanks",item.id));
    state.data.fluids.filter(item=>["granel","insumo"].includes(String(item.type).toLowerCase())&&Number(item.density)>10).forEach(item=>add("Densidade",`${item.name}: densidade fora do padrão`,`${fmt.format(item.density)} ${item.densityUnit}`,"fluids",item.id));
    return issues;
  }

  function renderSanitation() {
    const issues=sanitationIssues();
    const grouped=[...new Set(issues.map(item=>item.type))];
    $("#page-sanitation").innerHTML=header("Saneamento de Dados","Localize registros antigos sem vínculo e corrija sem alterar saldos.",`<button class="btn secondary" data-action="refresh">${uiIcon("refresh", "ui-icon btn-icon")} Reanalisar</button>`)+
      `<div class="card sanitation-intro"><strong>Correções automáticas já aplicadas</strong><p>Os lotes químicos existentes foram vinculados ao novo Catálogo Químico pelo nome. Esta tela mostra apenas o que ainda exige decisão humana.</p></div>
      <div class="grid four">${grouped.map(type=>statCard(type,issues.filter(item=>item.type===type).length,"pendência(s)",uiIcon("alert"))).join("")||statCard("Pendências",0,"dados vinculados",uiIcon("check"))}</div>
      <div class="section-title">Registros que exigem conferência</div><div class="sanitation-grid">${issues.map(item=>`<article class="card sanitation-card"><div>${badge(item.type)}<h3>${esc(item.title)}</h3><p>${esc(item.detail)}</p></div><button class="btn small primary" data-sanitation-page="${item.page}" data-sanitation-id="${item.id}">Abrir registro</button></article>`).join("")||`<div class="card quality-all-good"><strong>✓ Base saneada</strong><p>Nenhum vínculo antigo pendente foi encontrado.</p></div>`}</div>`;
  }

  function planningAssessment(operation) {
    const allocations = normalizedOperationAllocations(operation);
    const mode = tankMovementMode(operation.activity);
    const expected = Number(operation.planned || 0);
    const allocated = allocations.reduce((sum,item)=>sum+Number(item.quantity||0),0);
    const issues = [];
    if (mode !== "none" && !allocations.length) issues.push("Nenhum tanque ou silo reservado");
    if (mode !== "none" && allocations.length && Math.abs(allocated-expected)>0.001) issues.push(`Rateio ${fmt.format(allocated)} de ${fmt.format(expected)} ${operation.unit}`);
    allocations.forEach(item => {
      const tank=state.data.tanks.find(t=>t.id===item.tank_id); if(!tank){issues.push("Equipamento não localizado");return;}
      if(item.direction==="source" && Number(item.quantity)>Number(tank.volume)) issues.push(`${tank.name}: saldo insuficiente`);
      if(item.direction==="destination" && Number(item.quantity)>Number(tank.capacity-tank.volume)) issues.push(`${tank.name}: capacidade insuficiente`);
      if(String(tank.unit).toLowerCase()!==String(operation.unit).toLowerCase()) issues.push(`${tank.name}: unidade diferente`);
    });
    return { allocations, allocated, issues, ready: issues.length===0 && mode!=="none" };
  }

  function planningCard(operation) {
    const check=planningAssessment(operation); const start=operation.start_at?dateTime(operation.start_at):"Sem horário";
    return `<div class="planning-card ${check.issues.length?"risk":"ready"}">
      <div class="planning-card-head"><div><small>${esc(operation.client)}</small><h3>${esc(operation.vessel)}</h3></div>${badge(check.issues.length?"Atenção":"Pronta")}</div>
      <p>${esc(operation.activity)} de <strong>${esc(operation.product)}</strong></p>
      <div class="planning-operation-meta">${operation.rig ? `<span>Sonda: ${esc(operation.rig)}</span>` : ""}${operation.well ? `<span>Poço: ${esc(operation.well)}</span>` : ""}${operation.ticketNumber ? `<span>Ticket: ${esc(operation.ticketNumber)}</span>` : ""}</div>
      <div class="planning-kpis"><span>Previsto<strong>${fmt.format(operation.planned)} ${esc(operation.unit)}</strong></span><span>Reservado<strong>${fmt.format(check.allocated)} ${esc(operation.unit)}</strong></span><span>Início<strong>${esc(start)}</strong></span></div>
      <div class="planning-assets">${check.allocations.map(item=>{const t=state.data.tanks.find(x=>x.id===item.tank_id);return `<span>${esc(t?.name||"-")}: ${fmt.format(item.quantity)} ${esc(item.unit)}</span>`}).join("")||"<span>Sem equipamentos reservados</span>"}</div>
      ${check.issues.length?`<div class="planning-issues">${check.issues.map(x=>`<span>${uiIcon("alert", "ui-icon ui-icon-inline")} ${esc(x)}</span>`).join("")}</div>`:`<div class="planning-ok">${uiIcon("check", "ui-icon ui-icon-inline")} Saldo e capacidade conferidos</div>`}
      <button class="btn small primary" data-edit-operation="${operation.id}">Abrir planejamento</button>
    </div>`;
  }


  function operationPriorityCard(op) {
    const pct = op.planned ? Math.min(100, Math.round(Number(op.executed || 0) / Number(op.planned || 1) * 100)) : 0;
    const flow = operationFlow(op);
    const allocations = normalizedOperationAllocations(op);
    const statusIcon = op.status === "Em andamento" ? "activity" : op.status === "Paralisada" ? "alert" : "calendar";
    return `<article class="operation-focus-card ${statusClass(op.status)}">
      <div class="operation-focus-head">
        <div class="operation-focus-icon">${uiIcon(statusIcon)}</div>
        <div><small>${esc(op.client || "Cliente não informado")}</small><h3>${esc(op.vessel || "Operação")}</h3></div>
        ${badge(op.status)}
      </div>
      <div class="operation-focus-service"><strong>${esc(op.activity)}</strong><span>${esc(op.product || "Produto não informado")}</span></div>
      <div class="operation-focus-meta">
        ${op.rig ? `<span>Sonda<strong>${esc(op.rig)}</strong></span>` : ""}
        ${op.well ? `<span>Poço<strong>${esc(op.well)}</strong></span>` : ""}
        ${op.ticketNumber ? `<span>Ticket<strong>${esc(op.ticketNumber)}</strong></span>` : ""}
      </div>
      <div class="operation-focus-progress"><div><span>Progresso</span><strong>${pct}%</strong></div><div class="progress"><span style="width:${pct}%"></span></div></div>
      <div class="operation-focus-kpis">
        <span>Executado<strong>${fmt.format(op.executed)} ${esc(op.unit)}</strong></span>
        <span>Vazão<strong>${fmt.format(flow)} ${esc(op.unit)}/h</strong></span>
        <span>Tancagem<strong>${allocations.length} equipamento(s)</strong></span>
      </div>
      <div class="operation-focus-actions">
        <button class="btn small secondary" data-operation-timeline="${op.id}">${uiIcon("history", "ui-icon btn-icon")} Timeline</button>
        <button class="btn small primary" data-edit-operation="${op.id}">${uiIcon("edit", "ui-icon btn-icon")} Abrir operação</button>
      </div>
    </article>`;
  }

  function renderOperations() {
    const operations = filteredOperations();
    const active = operations.filter(op => ["Em andamento", "Paralisada"].includes(op.status));
    const programmed = operations.filter(op => op.status === "Programada");
    const completed = operations.filter(op => op.status === "Concluída");
    const totalPlanned = operations.reduce((sum, op) => sum + Number(op.planned || 0), 0);
    const totalExecuted = operations.reduce((sum, op) => sum + Number(op.executed || 0), 0);
    const completion = totalPlanned > 0 ? Math.min(100, Math.round(totalExecuted / totalPlanned * 100)) : 0;
    const pendingTank = operations.filter(op => op.status === "Concluída" && !op.tank_movement_applied && tankMovementMode(op.activity) !== "none").length;

    const rows = operations.map(op => {
      const pct = op.planned ? Math.min(100, Math.round(op.executed / op.planned * 100)) : 0;
      const flow = operationFlow(op);
      const canEdit = isAdmin() || !op.locked || hasRole(["supervisor"]);
      const tankStatus = op.tank_movement_applied ? "Aplicada" : op.apply_tank_movement ? "Preparada" : "Manual";
      return `<tr>
        <td><strong>${esc(op.client)}</strong><br><small>${esc(op.vessel)}</small><br><small>Sonda: ${esc(op.rig || "-")} • Poço: ${esc(op.well || "-")}</small><br><small>Ticket: ${esc(op.ticketNumber || "-")} • OS: ${esc(op.service_order || "-")}</small></td>
        <td>${esc(op.activity)}<br><small>${esc(op.product)} • ${esc(op.lot || "-")}</small></td>
        <td><div class="operation-table-progress"><div><strong>${fmt.format(op.executed)} / ${fmt.format(op.planned)} ${esc(op.unit)}</strong><span>${pct}%</span></div><div class="progress"><span style="width:${pct}%"></span></div></div></td>
        <td><strong>${fmt.format(flow)} ${esc(op.unit)}/h</strong><br><small>${fmt.format(operationHours(op))} h líquidas</small></td>
        <td>${operationAllocationHtml(op)}<div style="margin-top:6px">${badge(tankStatus)}</div></td>
        <td>${badge(op.status)}${op.locked ? `<br><span class="tag">${uiIcon("lock", "ui-icon ui-icon-inline")} Encerrada</span>` : ""}</td>
        <td>${dateTime(op.start_at)}<br><small>${op.end_at ? `Fim: ${dateTime(op.end_at)}` : "Sem término"}</small></td>
        <td><div class="row-actions">
          <button class="btn small secondary" data-operation-timeline="${op.id}">Timeline</button>
          <button class="btn small secondary" data-attachments="operation:${op.id}" data-attachment-title="${esc(op.vessel)}">${uiIcon("paperclip", "ui-icon btn-icon")} ${attachmentCount("operation", op.id)}</button>
          ${hasRole(["supervisor", "lider", "operador"]) && op.status === "Concluída" && !op.tank_movement_applied && tankMovementMode(op.activity) !== "none" ? `<button class="btn small soft" data-apply-operation-tank="${op.id}">Aplicar na tancagem</button>` : ""}
          ${canEdit ? `<button class="btn small primary" data-edit-operation="${op.id}">Editar</button>` : ""}
        </div></td>
      </tr>`;
    }).join("");

    const mobile = operations.map(op => `<div class="card mobile-record-card operation-mobile-card">
      <div class="mobile-record-head"><div><strong>${esc(op.client)}</strong><small>${esc(op.vessel)} • ${esc(op.activity)}</small></div>${badge(op.status)}</div>
      <div class="operation-mobile-meta">${op.rig ? `<span>Sonda <strong>${esc(op.rig)}</strong></span>` : ""}${op.well ? `<span>Poço <strong>${esc(op.well)}</strong></span>` : ""}${op.ticketNumber ? `<span>Ticket <strong>${esc(op.ticketNumber)}</strong></span>` : ""}</div>
      <div class="mobile-record-grid"><span>Produto<strong>${esc(op.product)}</strong></span><span>Executado<strong>${fmt.format(op.executed)} ${esc(op.unit)}</strong></span><span>Vazão<strong>${fmt.format(operationFlow(op))} ${esc(op.unit)}/h</strong></span><span>Tancagem<strong>${normalizedOperationAllocations(op).length} equipamento(s)</strong></span></div>
      <div class="mobile-allocation-summary">${operationAllocationHtml(op)}</div>
      <div class="row-actions"><button class="btn small secondary" data-operation-timeline="${op.id}">Timeline</button>${isAdmin() || !op.locked || hasRole(["supervisor"]) ? `<button class="btn small primary" data-edit-operation="${op.id}">Editar</button>` : ""}</div>
    </div>`).join("");

    const priority = [...active, ...programmed].slice(0, 6);
    $("#page-operations").innerHTML =
      header("Operações", "Planeje, acompanhe e encerre serviços com rastreabilidade completa.",
        `<button class="btn secondary" data-export="operations">${uiIcon("download", "ui-icon btn-icon")} Exportar CSV</button><button class="btn primary" data-action="new-operation">${uiIcon("plus", "ui-icon btn-icon")} Nova operação</button>`) +
      `<section class="operations-command-bar">
        <div class="operations-command-copy"><span>CENTRAL OPERACIONAL</span><h2>Visão consolidada das operações</h2><p>Acompanhe programação, execução, vazão e atualização da tancagem em uma única tela.</p></div>
        <div class="operations-command-progress"><div><span>Execução consolidada</span><strong>${completion}%</strong></div><div class="progress"><span style="width:${completion}%"></span></div><small>${fmt.format(totalExecuted)} de ${fmt.format(totalPlanned)} nas unidades registradas</small></div>
      </section>
      <div class="operations-kpi-grid">
        ${statCard("Em andamento", active.filter(op => op.status === "Em andamento").length, "operação(ões) ativa(s)", uiIcon("activity"))}
        ${statCard("Programadas", programmed.length, "aguardando início", uiIcon("calendar"))}
        ${statCard("Paralisadas", active.filter(op => op.status === "Paralisada").length, "exigem acompanhamento", uiIcon("alert"))}
        ${statCard("Concluídas", completed.length, "no período filtrado", uiIcon("check"))}
        ${statCard("Tancagem pendente", pendingTank, "aguardando aplicação", uiIcon("tank"))}
      </div>
      <div class="section-heading-row"><div><span>PRIORIDADES</span><h2>Programação e execução</h2></div><small>${priority.length} operação(ões) em destaque</small></div>
      <div class="operation-focus-grid">${priority.map(operationPriorityCard).join("") || `<div class="card empty">Nenhuma operação ativa ou programada.</div>`}</div>
      <div class="section-heading-row"><div><span>PLANEJAMENTO</span><h2>Conferência de saldo e capacidade</h2></div><small>Validação automática dos equipamentos reservados</small></div>
      <div class="planning-grid">${programmed.sort((a,b)=>new Date(a.start_at||"2999-01-01")-new Date(b.start_at||"2999-01-01")).slice(0,8).map(planningCard).join("")||`<div class="card empty">Nenhuma operação programada.</div>`}</div>
      <div class="section-heading-row"><div><span>REGISTROS</span><h2>Controle completo</h2></div><small>${operations.length} registro(s) no filtro atual</small></div>
      <div class="card table-wrap desktop-record-table operations-table-card"><table class="data-table"><thead><tr><th>Cliente / Embarcação</th><th>Atividade / Produto</th><th>Progresso</th><th>Vazão</th><th>Distribuição da tancagem</th><th>Status</th><th>Período</th><th>Ações</th></tr></thead><tbody>${rows || `<tr><td colspan="8" class="empty">Nenhuma operação cadastrada.</td></tr>`}</tbody></table></div><div class="mobile-record-list">${mobile || `<div class="empty">Nenhuma operação cadastrada.</div>`}</div>`;
  }

  function setOperationStep(form, step = 1) {
    if (!form) return;
    const target = Math.max(1, Math.min(4, Number(step || 1)));
    form.dataset.step = String(target);
    form.querySelectorAll("[data-operation-step]").forEach(section => section.classList.toggle("active", Number(section.dataset.operationStep) === target));
    form.querySelectorAll("[data-operation-step-indicator]").forEach(indicator => {
      const value = Number(indicator.dataset.operationStepIndicator);
      indicator.classList.toggle("active", value === target);
      indicator.classList.toggle("done", value < target);
    });
    updateOperationReview(form);
  }

  function validateOperationStep(form, step) {
    if (step === 1) {
      if (!form.elements.client?.value.trim()) throw new Error("Informe o cliente.");
      if (!form.elements.vessel?.value.trim()) throw new Error("Informe a embarcação.");
    }
    if (step === 2) {
      if (!form.elements.fluid_type_id?.value) throw new Error("Selecione o fluido ou granel.");
      const planned = parseTankVolume(form.elements.planned?.value || "");
      if (!Number.isFinite(planned) || planned < 0) throw new Error("Informe uma quantidade planejada válida.");
    }
    if (step === 3) {
      const mode = tankMovementMode(form.elements.activity?.value || "");
      const apply = form.elements.apply_tank_movement?.checked;
      if (mode !== "none" && apply) collectOperationAllocations(form);
    }
    return true;
  }

  function updateOperationReview(form) {
    const review = form?.querySelector("[data-operation-review]");
    if (!review) return;
    const product = state.data.fluids.find(item => item.id === form.elements.fluid_type_id?.value);
    const allocations = [...form.querySelectorAll("[data-operation-allocation-row]")].map(row => {
      const tank = state.data.tanks.find(item => item.id === row.querySelector("[data-allocation-tank]")?.value);
      const qty = row.querySelector("[data-allocation-quantity]")?.value || "0";
      return tank ? `${tank.name}: ${qty} ${form.elements.unit?.value || ""}` : "";
    }).filter(Boolean);
    review.innerHTML = `<div><span>Cliente / embarcação</span><strong>${esc(form.elements.client?.value || "-")} • ${esc(form.elements.vessel?.value || "-")}</strong></div><div><span>Atividade / produto</span><strong>${esc(form.elements.activity?.value || "-")} • ${esc(product?.name || "-")}</strong></div><div><span>Planejado / executado</span><strong>${esc(form.elements.planned?.value || "0")} / ${esc(form.elements.executed?.value || "0")} ${esc(form.elements.unit?.value || "")}</strong></div><div><span>Tancagem</span><strong>${esc(allocations.join(" | ") || "Sem rateio")}</strong></div>`;
  }

  function operationForm(op = {}) {
    const responsibleOptions = state.data.users.map(user => `<option value="${user.id}" ${op.responsible_id === user.id ? "selected" : ""}>${esc(user.name)}</option>`).join("");
    const applied = op.tank_movement_applied === true && !isAdmin();
    const activity = op.activity || "Bombeio";
    const mode = tankMovementMode(activity);
    const direction = mode === "out" ? "source" : "destination";
    const linkedProduct = state.data.fluids.find(item => item.id === op.fluidTypeId);
    const legacyUnlinked = Boolean(op.product && !linkedProduct);
    const unit = linkedProduct?.unit || op.unit || "bbl";
    const allocations = normalizedOperationAllocations(op);
    const initialRows = allocations.length ? allocations.map(item => operationAllocationRow(item,item.direction||direction,unit,applied,op.fluidTypeId||"")).join("") : mode!=="none" ? operationAllocationRow({},direction,unit,applied,op.fluidTypeId||"") : "";
    const nav = `<div class="operation-stepper-head">${[["1","Identificação"],["2","Serviço"],["3","Tancagem"],["4","Conclusão"]].map(([n,label]) => `<span data-operation-step-indicator="${n}" class="${n==="1"?"active":""}"><b>${n}</b><small>${label}</small></span>`).join("")}</div>`;
    return `<form id="operationForm" data-id="${op.id || ""}" data-step="1" data-allocation-mode="${mode}" data-allocation-locked="${applied}" novalidate>${nav}
      <section class="operation-step active" data-operation-step="1"><div class="form-grid">
        <div><label>Cliente *</label><input name="client" required value="${esc(op.client || "")}"></div>
        <div><label>Embarcação *</label><input name="vessel" required value="${esc(op.vessel || "")}"></div>
        <div><label>Sonda</label><input name="rig" value="${esc(op.rig || "")}" placeholder="Ex.: NS-58"></div>
        <div><label>Poço</label><input name="well" value="${esc(op.well || "")}" placeholder="Ex.: 7-WAH-12D-RJS"></div>
        <div><label>Número do ticket</label><input name="ticket_number" value="${esc(op.ticketNumber || "")}"></div>
        <div><label>Ordem de serviço</label><input name="service_order" value="${esc(op.service_order || "")}"></div>
        <div class="wide"><label>Responsável</label><select name="responsible_id"><option value="">Não definido</option>${responsibleOptions}</select></div>
      </div><div class="operation-step-actions"><span></span><button type="button" class="btn primary" data-action="operation-next-step">Próximo: serviço</button></div></section>
      <section class="operation-step" data-operation-step="2"><div class="form-grid">
        <div><label>Atividade *</label><select name="activity" ${applied?"disabled":""}>${["Bombeio","Backload","Fabricação","Tratamento","Carregamento","Descarga"].map(value => `<option ${activity===value?"selected":""}>${value}</option>`).join("")}</select>${applied?`<input type="hidden" name="activity" value="${esc(activity)}">`:""}</div>
        <div class="wide operation-catalog-field"><div class="catalog-linked-heading"><div><label>Fluido ou granel *</label><small>Produto do catálogo oficial.</small></div>${applied?"":`<button type="button" class="btn small secondary" data-action="open-fluid-catalog">Abrir catálogo</button>`}</div><select name="fluid_type_id" data-operation-product-select required ${applied?"disabled":""}><option value="">Selecione o produto cadastrado</option>${operationCatalogOptions(op)}</select>${applied?`<input type="hidden" name="fluid_type_id" value="${esc(op.fluidTypeId || "")}">`:""}<small class="field-help" data-operation-product-category>${linkedProduct?`${esc(linkedProduct.type)} • unidade ${esc(linkedProduct.unit)}`:"Selecione um produto cadastrado."}</small>${legacyUnlinked?`<div class="message warning"><strong>Produto antigo não vinculado:</strong> ${esc(op.product)}.</div>`:""}</div>
        <div><label>Lote</label><input name="lot" value="${esc(op.lot || "")}" ${applied?"readonly":""}></div>
        <div><label>Unidade</label><input name="unit" value="${esc(unit)}" readonly></div>
        <div><label>Quantidade planejada *</label><input name="planned" type="text" inputmode="decimal" value="${op.planned ?? 0}"></div>
        <div><label>Quantidade executada</label><input name="executed" type="text" inputmode="decimal" value="${op.executed ?? 0}" ${applied?"readonly":""}></div>
      </div><div class="operation-step-actions"><button type="button" class="btn secondary" data-action="operation-prev-step">Voltar</button><button type="button" class="btn primary" data-action="operation-next-step">Próximo: tancagem</button></div></section>
      <section class="operation-step" data-operation-step="3"><div class="form-grid">
        <div class="wide tank-automation-box"><div class="check-line"><input id="applyTankMovement" name="apply_tank_movement" type="checkbox" data-applied="${applied}" ${op.apply_tank_movement||applied?"checked":""} ${applied?"disabled":""}><label for="applyTankMovement">Atualizar a volumetria automaticamente ao concluir</label></div><small id="operationTankHint" class="field-help"></small>${applied?`<div class="info-box">Movimentação aplicada em ${dateTime(op.tank_movement_applied_at)}.</div>`:""}</div>
        <div class="wide operation-allocation-field ${mode==="none"?"hidden":""}"><div class="operation-allocation-heading"><div><strong data-operation-allocation-title>${mode==="out"?"Distribuição da saída":"Distribuição da entrada"}</strong><small>Informe quanto saiu ou entrou em cada equipamento.</small></div>${applied?"":`<button type="button" class="btn small soft" data-add-operation-allocation>+ Adicionar equipamento</button>`}</div><div class="operation-allocation-list" data-operation-allocation-list>${initialRows}</div><div class="operation-allocation-summary" data-operation-allocation-summary></div></div>
      </div><div class="operation-step-actions"><button type="button" class="btn secondary" data-action="operation-prev-step">Voltar</button><button type="button" class="btn primary" data-action="operation-next-step">Próximo: conclusão</button></div></section>
      <section class="operation-step" data-operation-step="4"><div class="form-grid">
        <div><label>Início</label><input name="start_at" type="datetime-local" value="${toLocalInput(op.start_at)}"></div>
        <div><label>Término</label><input name="end_at" type="datetime-local" value="${toLocalInput(op.end_at)}"></div>
        <div><label>Tempo parado (minutos)</label><input name="paused_minutes" type="number" min="0" value="${op.paused_minutes ?? 0}"></div>
        <div><label>Status</label><select name="status">${["Programada","Em andamento","Paralisada","Concluída","Cancelada"].map(value => `<option ${op.status===value?"selected":""}>${value}</option>`).join("")}</select></div>
        <div class="wide"><label>Ocorrência</label><textarea name="occurrence">${esc(op.occurrence || "")}</textarea></div>
        <div class="wide"><label>Observações</label><textarea name="notes">${esc(op.notes || "")}</textarea></div>
        <div class="wide operation-review-card" data-operation-review></div>
        <div class="wide"><label>Documentos ou fotos</label><input name="attachment" type="file" accept=".pdf,image/jpeg,image/png,image/webp,image/heic,image/heif" multiple capture="environment"></div>
        ${hasRole(["supervisor"])?`<div class="wide check-line"><input id="lockOperation" name="locked" type="checkbox" ${op.locked?"checked":""}><label for="lockOperation">Bloquear edição após o encerramento</label></div>`:""}
      </div><div class="operation-step-actions"><button type="button" class="btn secondary" data-action="operation-prev-step">Voltar</button><button class="btn primary">Salvar operação</button></div></section>
    </form>`;
  }

  function renderTanks() {
    const all = state.data.tanks || [];
    const occupied = all.filter(item => Number(item.volume || 0) > 0).length;
    const maintenance = all.filter(item => String(item.status || "").toLowerCase().includes("manuten")).length;
    const totalVolume = all.reduce((sum,item)=>sum+Number(item.volume||0),0);
    const totalCapacity = all.reduce((sum,item)=>sum+Number(item.capacity||0),0);
    const pct = totalCapacity > 0 ? totalVolume / totalCapacity * 100 : 0;
    const products = [...new Set(all.map(item=>item.product).filter(Boolean))].sort();
    const statuses = [...new Set(all.map(item=>item.status).filter(Boolean))].sort();
    $("#page-tanks").innerHTML =
      header("Tanques e silos", "Controle operacional de volumetria, produto, lote, disponibilidade e histórico.",
        `<button class="btn secondary" data-page-link="fluids">Fluidos e Granéis</button><button class="btn secondary" data-export="tanks">Exportar CSV</button>${hasRole(["supervisor", "lider", "operador", "logistica"]) ? `<button class="btn primary" data-action="new-tank-transfer">Transferir entre tanques</button>` : ""}`) +
      `<section class="tank-command-center">
        <div class="tank-kpi"><span>Equipamentos</span><strong>${all.length}</strong><small>${occupied} com volume</small></div>
        <div class="tank-kpi"><span>Ocupação geral</span><strong>${fmt.format(pct)}%</strong><small>${fmt.format(totalVolume)} de ${fmt.format(totalCapacity)}</small></div>
        <div class="tank-kpi"><span>Disponíveis</span><strong>${all.filter(item=>String(item.status||'').toLowerCase().includes('dispon')).length}</strong><small>Prontos para operação</small></div>
        <div class="tank-kpi"><span>Em manutenção</span><strong>${maintenance}</strong><small>Requerem atenção</small></div>
      </section>
      <section class="tank-filter-bar">
        <div class="tank-filter-search"><label>Buscar equipamento</label><input data-tank-filter="search" placeholder="Nome, produto, lote ou cliente"></div>
        <div><label>Fase</label><select data-tank-filter="phase"><option value="">Todas</option><option>Phase #1</option><option>Phase #2</option></select></div>
        <div><label>Tipo</label><select data-tank-filter="kind"><option value="">Todos</option><option value="tank">Tanques</option><option value="silo">Silos</option></select></div>
        <div><label>Produto</label><select data-tank-filter="product"><option value="">Todos</option>${products.map(x=>`<option>${esc(x)}</option>`).join('')}</select></div>
        <div><label>Status</label><select data-tank-filter="status"><option value="">Todos</option>${statuses.map(x=>`<option>${esc(x)}</option>`).join('')}</select></div>
        <button class="btn secondary" type="button" data-action="clear-tank-filters">Limpar</button>
      </section>
      <div class="tank-filter-result" data-tank-filter-result>${all.length} equipamento(s)</div>` +
      ["Phase #1", "Phase #2"].map(phase => {
        const phaseItems = all.filter(item => item.phase === phase).sort((a,b)=>a.order-b.order);
        const tanks = phaseItems.filter(item => String(item.kind).toLowerCase() !== "silo");
        const silos = phaseItems.filter(item => String(item.kind).toLowerCase() === "silo");
        return `<section class="tancagem-phase-block" data-tank-phase-section="${esc(phase)}">
          <div class="phase-heading"><div><span>ÁREA OPERACIONAL</span><h2>${phase}</h2></div><small>${tanks.length} tanque(s) • ${silos.length} silo(s)</small></div>
          <div class="asset-group tank-asset-group" data-tank-kind-group="tank"><div class="asset-group-heading"><div class="asset-group-icon tank-group-icon">TK</div><div><h3>Tanques e Mix Tanks</h3><p>Fluidos, salmouras e produtos líquidos.</p></div></div><div class="grid tank-grid compact-tank-grid">${tanks.map(tankCard).join("") || `<div class="empty asset-empty">Nenhum tanque nesta fase.</div>`}</div></div>
          <div class="asset-group silo-asset-group" data-tank-kind-group="silo"><div class="asset-group-heading"><div class="asset-group-icon silo-group-icon">SL</div><div><h3>Silos de Granéis</h3><p>Barita, bentonita, calcita e outros granéis.</p></div></div><div class="grid tank-grid compact-tank-grid silo-grid">${silos.map(tankCard).join("") || `<div class="empty asset-empty">Nenhum silo nesta fase.</div>`}</div></div>
        </section>`;
      }).join("");
  }

  function applyTankFilters() {
    const page = $("#page-tanks"); if (!page) return;
    const value = key => (page.querySelector(`[data-tank-filter="${key}"]`)?.value || "").trim().toLowerCase();
    const search=value('search'), phase=value('phase'), kind=value('kind'), product=value('product'), status=value('status');
    let visible=0;
    page.querySelectorAll('[data-tank-search]').forEach(card=>{
      const ok=(!search||card.dataset.tankSearch.includes(search))&&(!phase||card.dataset.tankPhase===phase)&&(!kind||card.dataset.tankKind===kind)&&(!product||card.dataset.tankProduct===product)&&(!status||card.dataset.tankStatus===status);
      card.hidden=!ok; if(ok) visible++;
    });
    page.querySelectorAll('[data-tank-kind-group]').forEach(group=>{group.hidden=![...group.querySelectorAll('[data-tank-search]')].some(card=>!card.hidden)});
    page.querySelectorAll('[data-tank-phase-section]').forEach(section=>{section.hidden=![...section.querySelectorAll('[data-tank-search]')].some(card=>!card.hidden)});
    const result=page.querySelector('[data-tank-filter-result]'); if(result) result.textContent=`${visible} equipamento(s) exibido(s)`;
  }


  function tankCard(tank) {
    const volume = Number(tank.volume || 0);
    const capacity = Number(tank.capacity || 0);
    const silo = isSiloAsset(tank);
    const physicalCapacity = silo ? defaultSiloPhysicalCapacity(tank) : null;
    const pct = capacity > 0 ? Math.max(0, Math.min(100, (volume / capacity) * 100)) : 0;
    // Um saldo positivo muito pequeno ainda precisa ficar visível na faixa.
    const visualPct = volume > 0 ? Math.max(1.5, pct) : 0;
    const updater = state.data.users.find(user => user.id === tank.updated_by)?.name || "Não informado";
    const productType = productClass(tank.product, tank.kind, volume);
    const volumeState = volume > 0 ? "has-volume" : "no-volume";

    return `<div class="card tank-card compact-tank-card ${silo ? "silo-card" : "fluid-tank-card"} tank-bg-${productType} ${volumeState}" data-tank-search="${esc(`${tank.name} ${tank.product||""} ${tank.lot||""} ${tank.client||""}`.toLowerCase())}" data-tank-phase="${esc(String(tank.phase||"").toLowerCase())}" data-tank-kind="${silo?"silo":"tank"}" data-tank-product="${esc(String(tank.product||"").toLowerCase())}" data-tank-status="${esc(String(tank.status||"").toLowerCase())}">
      <div class="tank-top">
        <div>
          <h3>${esc(tank.name)}</h3>
          <span class="tag">${esc(tank.kind)}</span>
        </div>
        ${badge(tank.status)}
      </div>

      <div class="tank-card-body"><div class="tank-mini-visual ${silo ? "is-silo" : "is-tank"}"><span style="height:${visualPct.toFixed(2)}%"></span><b>${fmt.format(pct)}%</b></div><div class="tank-card-details"><div class="compact-tank-product">
        <strong>${esc(tank.product || (volume > 0 ? "Produto não informado" : "Sem produto"))}</strong>
        <span>Lote: ${esc(tank.lot || "-")}${volume > 0 && !tank.product ? ` • volume registrado` : ""}</span>
        <span>Densidade: ${tank.density !== null && tank.density !== undefined ? `${fmt.format(tank.density)} ${esc(tank.densityUnit || (silo ? "t/m³" : "ppg"))}` : "não informada"}</span>
        ${silo ? `<span>Volume físico: ${fmt.format(physicalCapacity)} m³</span>` : ""}
      </div>

      <div class="tank-volume-line">
        <strong>${fmt.format(volume)} ${esc(tank.unit)}</strong>
        <span>${silo ? "capacidade operacional" : "de"} ${fmt.format(capacity)} ${esc(tank.unit)}</span>
      </div>

      <div class="tank-progress ${productType} ${volumeState}" data-volume="${volume}" data-kind="${esc(tank.kind)}" role="progressbar"
        aria-label="Ocupação de ${esc(tank.name)}"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow="${pct.toFixed(1)}">
        <span style="width:${visualPct.toFixed(2)}%" title="${fmt.format(pct)}% ocupado"></span>
      </div>

      <div class="tank-progress-caption">
        <strong>${fmt.format(pct)}%</strong>
        <span>${fmt.format(Math.max(0, capacity - volume))} ${esc(tank.unit)} livres</span>
      </div>

      </div></div><div class="tank-update-meta">
        <span>Atualizado por: ${esc(updater)}</span>
        <span>${dateTime(tank.updated_at)}</span>
      </div>

      <div class="row-actions">
        ${hasRole(["supervisor", "lider", "operador", "logistica"]) ? `<button class="btn small primary" data-edit-tank="${tank.id}">Atualizar conteúdo</button>` : ""}
        ${isAdmin() ? `<button class="btn small secondary admin-structure-btn" data-edit-tank-structure="${tank.id}">Editar estrutura</button>` : ""}
        <button class="btn small secondary" data-tank-history="${tank.id}">Histórico</button>
        <button class="btn small secondary" data-tank-movements="${tank.id}">Movimentações</button>
        <button class="btn small secondary" data-asset-qr="tank:${tank.id}">QR Code</button>
      </div>
    </div>`;
  }


  function tankHistoryVisual(tank, history) {
    const ordered=[...history].sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)).slice(-30);
    const points=ordered.map(item=>Number(item.new_volume||0));
    const max=Math.max(Number(tank.capacity||0),...points,1); const width=720,height=210,pad=28;
    const coords=points.map((value,index)=>({x:pad+(index*(width-pad*2)/Math.max(1,points.length-1)),y:height-pad-(value/max*(height-pad*2)),value}));
    const poly=coords.map(p=>`${p.x},${p.y}`).join(" ");
    const last=coords.at(-1);
    return `<div class="tank-history-visual"><div class="history-chart-head"><div><strong>Evolução do volume</strong><span>Últimas ${ordered.length} alterações</span></div><div><strong>${fmt.format(tank.volume)} ${esc(tank.unit)}</strong><span>Atual</span></div></div>
      ${ordered.length?`<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Evolução do volume"><line x1="${pad}" y1="${height-pad}" x2="${width-pad}" y2="${height-pad}" class="chart-axis"/><line x1="${pad}" y1="${pad}" x2="${pad}" y2="${height-pad}" class="chart-axis"/><polyline points="${poly}" class="history-line" fill="none"/>${coords.map((p,i)=>`<circle cx="${p.x}" cy="${p.y}" r="${i===coords.length-1?5:3}" class="history-point"><title>${fmt.format(p.value)} ${esc(tank.unit)} — ${dateTime(ordered[i].created_at)}</title></circle>`).join("")}${last?`<text x="${Math.min(width-80,last.x+8)}" y="${Math.max(18,last.y-8)}">${fmt.format(last.value)} ${esc(tank.unit)}</text>`:""}</svg>`:`<div class="empty">Sem histórico suficiente para o gráfico.</div>`}
      <div class="history-summary-grid"><span>Capacidade<strong>${fmt.format(tank.capacity)} ${esc(tank.unit)}</strong></span><span>Produto atual<strong>${esc(tank.product||"-")}</strong></span><span>Densidade<strong>${tank.density?`${fmt.format(tank.density)} ${esc(tank.densityUnit||"")}`:"-"}</strong></span></div></div>`;
  }



  function completeTankTimeline(tank) {
    const entries=[];
    state.data.tankHistory.filter(item=>item.tank_id===tank.id).forEach(item=>{
      const user=state.data.users.find(x=>x.id===item.changed_by)?.name||"Sistema";
      entries.push({time:item.created_at,title:`Atualização: ${item.previous_product||"Vazio"} → ${item.new_product||"Vazio"}`,meta:`${user} • saldo ${fmt.format(item.previous_volume||0)} → ${fmt.format(item.new_volume||0)} ${tank.unit}`,detail:item.notes||`Lote ${item.previous_lot||"-"} → ${item.new_lot||"-"}`});
    });
    state.data.tankMovements.filter(item=>item.source_tank_id===tank.id||item.destination_tank_id===tank.id).forEach(item=>{
      const direction=item.source_tank_id===tank.id?"Saída":"Entrada";
      const operation=state.data.operations.find(op=>op.id===item.operation_id);
      const truck=state.data.trucks.find(entry=>entry.id===item.truckId);
      const source=state.data.tanks.find(x=>x.id===item.source_tank_id)?.name;
      const destination=state.data.tanks.find(x=>x.id===item.destination_tank_id)?.name;
      entries.push({time:item.created_at,title:`${direction}: ${fmt.format(item.quantity)} ${item.unit}`,meta:`${item.movement_type} • ${item.product||"-"}`,detail:[source&&destination?`${source} → ${destination}`:"",operation?`${operation.client} / ${operation.vessel}${operation.ticketNumber?` • Ticket ${operation.ticketNumber}`:""}`:"",truck?`Carreta ${truck.plate||truck.invoice||truck.id}${truck.invoice?` • NF ${truck.invoice}`:""}`:"",item.reference||""].filter(Boolean).join(" • ")});
    });
    return entries.sort((a,b)=>new Date(b.time)-new Date(a.time));
  }

  function completeTankTimelineHtml(tank) {
    const rows=completeTankTimeline(tank).map(entry=>`<div class="timeline-item"><span class="timeline-dot"></span><div><strong>${esc(entry.title)}</strong><small>${dateTime(entry.time)} • ${esc(entry.meta)}</small><p>${esc(entry.detail||"")}</p></div></div>`).join("");
    return `${tankHistoryVisual(tank,state.data.tankHistory.filter(item=>item.tank_id===tank.id))}<div class="section-title">Linha do tempo integrada</div><div class="timeline professional-timeline">${rows||`<div class="empty">Nenhuma movimentação registrada.</div>`}</div>`;
  }

  function tankTransferForm() {
    const sourceOptions = state.data.tanks.filter(tank => tank.volume > 0).map(tank => `<option value="${tank.id}">${esc(tank.name)} — ${fmt.format(tank.volume)} ${esc(tank.unit)} — ${esc(tank.product || "Sem produto")}</option>`).join("");
    const destinationOptions = state.data.tanks.map(tank => `<option value="${tank.id}">${esc(tank.name)} — livre ${fmt.format(Math.max(0, tank.capacity - tank.volume))} ${esc(tank.unit)} — ${esc(tank.product || "Vazio")}</option>`).join("");
    return `<form id="tankTransferForm"><div class="form-grid">
      <div class="wide"><label>Origem *</label><select name="source_tank_id" required><option value="">Selecione</option>${sourceOptions}</select></div>
      <div class="wide"><label>Destino *</label><select name="destination_tank_id" required><option value="">Selecione</option>${destinationOptions}</select></div>
      <div><label>Quantidade *</label><input name="quantity" type="text" inputmode="decimal" required placeholder="Ex.: 250"></div>
      <div><label>Referência</label><input name="reference" placeholder="OS, operação ou motivo"></div>
      <div class="wide"><label>Observações</label><textarea name="notes"></textarea></div>
    </div><div id="transferPreview" class="info-box">Selecione a origem, o destino e a quantidade.</div>${formActions("Confirmar transferência")}</form>`;
  }

  function updateTransferPreview(form) {
    if (!form) return;
    const source = state.data?.tanks?.find(t => t.id === form.elements.source_tank_id?.value);
    const destination = state.data?.tanks?.find(t => t.id === form.elements.destination_tank_id?.value);
    const quantity = parseTankVolume(form.elements.quantity?.value);
    const box = form.querySelector("#transferPreview");
    if (!box) return;
    if (!source || !destination || !Number.isFinite(quantity) || quantity <= 0) {
      box.textContent = "Selecione a origem, o destino e a quantidade.";
      return;
    }
    const destinationCapacity = isSiloAsset(destination) && source.density
      ? siloOperationalCapacity(defaultSiloPhysicalCapacity(destination), destination.density || source.density)
      : destination.capacity;
    const capacityText = isSiloAsset(destination) && destinationCapacity
      ? ` | capacidade operacional: ${fmt.format(destinationCapacity)} ton`
      : "";
    box.textContent = `${source.name}: ${fmt.format(source.volume)} → ${fmt.format(source.volume - quantity)} ${source.unit} | ${destination.name}: ${fmt.format(destination.volume)} → ${fmt.format(destination.volume + quantity)} ${destination.unit}${capacityText}`;
  }



  function isSiloAsset(value) {
    const kind = typeof value === "object" ? value?.kind : value;
    return String(kind || "").toLowerCase().includes("silo");
  }

  function siloOperationalCapacity(physicalCapacityM3, density) {
    const physical = Number(physicalCapacityM3);
    const densityValue = Number(density);
    if (!Number.isFinite(physical) || physical <= 0 || !Number.isFinite(densityValue) || densityValue <= 0) return null;
    return Math.round(physical * densityValue * 1000) / 1000;
  }

  function defaultSiloPhysicalCapacity(tank) {
    if (Number(tank?.physicalCapacityM3) > 0) return Number(tank.physicalCapacityM3);
    const currentCapacity = Number(tank?.capacity || 0);
    return currentCapacity > 0 ? currentCapacity / 2.162 : 69.380204;
  }

  function defaultDensityUnit(category = "", kind = "") {
    const categoryText = String(category || "").toLowerCase();
    const kindText = String(kind || "").toLowerCase();
    return kindText.includes("silo") || ["granel", "insumo"].includes(categoryText) ? "t/m³" : "ppg";
  }

  function compatibleTankFluids(tank) {
    const isSilo = isSiloAsset(tank);
    return (state.data.fluids || [])
      .filter(item => item.active !== false || item.id === tank.fluidTypeId)
      .filter(item => {
        if (item.id === tank.fluidTypeId) return true;
        const category = String(item.type || "").toLowerCase();
        return isSilo ? ["granel", "insumo"].includes(category) : !["granel", "insumo"].includes(category);
      })
      .sort((a, b) => `${a.type} ${a.name}`.localeCompare(`${b.type} ${b.name}`, "pt-BR"));
  }

  function activeCompatibleTankProducts(tank) {
    return compatibleTankFluids(tank).filter(item => item.active !== false);
  }

  function catalogProductOptions(tank) {
    const groups = new Map();
    compatibleTankFluids(tank).forEach(item => {
      const group = item.type || "Outros";
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push(item);
    });

    return [...groups.entries()].map(([group, items]) =>
      `<optgroup label="${esc(group)}">${items.map(item => `
        <option value="${item.id}"
          data-product="${esc(item.name)}"
          data-density="${item.density || ""}"
          data-density-unit="${esc(item.densityUnit || defaultDensityUnit(item.type, tank.kind))}"
          ${tank.fluidTypeId === item.id ? "selected" : ""}>
          ${esc(item.name)}${item.density ? ` — ${fmt.format(item.density)} ${esc(item.densityUnit || defaultDensityUnit(item.type, tank.kind))}` : ""}
        </option>`).join("")}</optgroup>`
    ).join("");
  }

  function syncSiloCapacityPreview(form) {
    if (!form) return;

    const kind = form.elements.kind?.value || form.dataset.tankKind || "";
    const isSilo = isSiloAsset(kind);
    form.dataset.tankKind = kind;

    const fixedWrap = form.querySelector("[data-fixed-capacity-wrap]");
    const siloWraps = [...form.querySelectorAll("[data-silo-capacity-wrap]")];
    const unitWrap = form.querySelector("[data-unit-wrap]");
    const preview = form.querySelector("[data-silo-capacity-preview]");

    fixedWrap?.classList.toggle("hidden", isSilo);
    siloWraps.forEach(element => element.classList.toggle("hidden", !isSilo));
    unitWrap?.classList.toggle("hidden", isSilo);

    if (!isSilo) {
      preview?.classList.add("hidden");
      return;
    }

    const physical = parseOptionalDecimal(form.elements.physical_capacity_m3?.value);
    const density = parseOptionalDecimal(form.elements.density?.value);
    const capacity = siloOperationalCapacity(physical, density);
    const currentVolume = parseOptionalDecimal(form.elements.volume?.value) ?? 0;
    const operationalField = form.elements.operational_capacity;

    if (form.elements.density_unit) form.elements.density_unit.value = "t/m³";
    if (operationalField) operationalField.value = capacity === null ? "" : fmt.format(capacity);

    if (!preview) return;
    preview.classList.remove("hidden");

    if (capacity === null) {
      preview.innerHTML = `<strong>Capacidade operacional do silo</strong><span>Selecione um granel com densidade em t/m³.</span>`;
      return;
    }

    const free = Math.max(0, capacity - currentVolume);
    const exceeded = currentVolume > capacity;
    preview.classList.toggle("silo-capacity-danger", exceeded);
    preview.innerHTML = `
      <strong>${fmt.format(capacity)} ton de capacidade operacional</strong>
      <span>${fmt.format(physical)} m³ × ${fmt.format(density)} t/m³</span>
      <span>${exceeded ? `Saldo atual excede a nova capacidade em ${fmt.format(currentVolume-capacity)} ton.` : `${fmt.format(free)} ton disponíveis.`}</span>`;
  }

  function syncTankCatalogFields(form) {
    if (!form) return;
    const select = form.elements.fluid_type_id;
    const option = select?.selectedOptions?.[0];
    const densityInput = form.elements.density;
    const densityUnit = form.elements.density_unit;
    const tankKind = form.elements.kind?.value || form.dataset.tankKind || "";

    if (!select || !option) return;

    if (!select.value) {
      if (densityInput) densityInput.value = "";
      if (densityUnit) densityUnit.value = defaultDensityUnit("", tankKind);
      syncSiloCapacityPreview(form);
      return;
    }

    if (densityInput) densityInput.value = option.dataset.density || "";
    if (densityUnit) densityUnit.value = option.dataset.densityUnit || defaultDensityUnit("", tankKind);
    syncSiloCapacityPreview(form);
  }

  function syncFluidDensityUnit(form) {
    if (!form) return;
    const category = form.elements.type?.value || "";
    const densityUnit = form.elements.density_unit;
    if (densityUnit) densityUnit.value = defaultDensityUnit(category, "");
  }

  function tankForm(tank, editStructure = false) {
    const admin = isAdmin() && editStructure;
    const editToken = crypto.randomUUID();
    const silo = isSiloAsset(tank);
    const linkedFluid = (state.data.fluids || []).find(item => item.id === tank.fluidTypeId);
    const unlinkedCurrent = Boolean(tank.product && !linkedFluid);
    const currentDensity = tank.density ?? linkedFluid?.density ?? "";
    const currentDensityUnit = silo ? "t/m³" : (tank.densityUnit || linkedFluid?.densityUnit || defaultDensityUnit(linkedFluid?.type, tank.kind));
    const physicalCapacity = defaultSiloPhysicalCapacity(tank);
    const calculatedCapacity = siloOperationalCapacity(physicalCapacity, currentDensity) ?? tank.capacity;

    return `<form id="tankForm"
      data-id="${tank.id}"
      data-tank-id="${tank.id}"
      data-tank-name="${esc(tank.name)}"
      data-tank-updated-at="${esc(tank.updated_at || "")}"
      data-edit-token="${editToken}"
      data-admin-full="${admin ? "true" : "false"}"
      data-tank-kind="${esc(tank.kind)}"
      novalidate>
      <input type="hidden" name="id" value="${tank.id}" data-immutable-id>
      <div class="tank-target-lock">
        <span>Equipamento selecionado</span>
        <strong>${esc(tank.name)}</strong>
        <small>${esc(tank.phase)} • ${esc(tank.kind)} • ID ${esc(tank.id.slice(0, 8))}</small>
      </div>
      <div class="form-grid">
        ${admin ? `
          <div><label>Nome do equipamento *</label><input name="name" required autocomplete="off" autocapitalize="characters" spellcheck="false" value="${esc(tank.name)}"><small class="field-help">O nome precisa ser exclusivo, por exemplo TK-12 ou SILO A.</small></div>
          <div><label>Fase *</label><select name="phase">${["Phase #1", "Phase #2"].map(x => `<option ${tank.phase === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>
          <div><label>Tipo *</label><select name="kind" data-tank-kind-select>${["Tanque", "Mix Tank", "Silo"].map(x => `<option ${tank.kind === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>
          <div><label>Ordem de exibição</label><input name="display_order" type="number" min="0" step="1" value="${tank.order ?? 0}"></div>
          <div data-fixed-capacity-wrap class="${silo ? "hidden" : ""}">
            <label>Capacidade fixa *</label>
            <input name="capacity" type="text" inputmode="decimal" value="${String(tank.capacity).replace(".", ",")}">
          </div>
          <div data-silo-capacity-wrap class="${silo ? "" : "hidden"}">
            <label>Volume físico do silo (m³) *</label>
            <input name="physical_capacity_m3" type="text" inputmode="decimal" value="${String(physicalCapacity).replace(".", ",")}">
          </div>
          <div data-unit-wrap class="${silo ? "hidden" : ""}">
            <label>Unidade *</label>
            <select name="unit">${["bbl", "ton", "m³"].map(x => `<option ${tank.unit === x ? "selected" : ""}>${x}</option>`).join("")}</select>
          </div>
          <div data-silo-capacity-wrap class="${silo ? "" : "hidden"}">
            <label>Capacidade operacional (ton)</label>
            <input name="operational_capacity" value="${fmt.format(calculatedCapacity)}" disabled>
          </div>
        ` : `
          <div><label>Tanque ou silo</label><input value="${esc(tank.name)}" disabled></div>
          ${silo ? `
            <div><label>Volume físico</label><input value="${fmt.format(physicalCapacity)} m³" disabled></div>
            <input type="hidden" name="physical_capacity_m3" value="${physicalCapacity}">
          ` : `
            <div><label>Capacidade</label><input value="${fmt.format(tank.capacity)} ${esc(tank.unit)}" disabled></div>
          `}
        `}

        <div><label>Status</label><select name="status">${["Disponível", "Liberado", "Em uso", "Bloqueado", "Limpeza", "Manutenção"].map(x => `<option ${tank.status === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>
        <div>
          <label>Volume atual (${esc(tank.unit)}) *</label>
          <input name="volume" type="text" inputmode="decimal" autocomplete="off" value="${String(tank.volume).replace(".", ",")}" required>
          <small class="field-help">${silo ? "Saldo do granel em toneladas." : "Ex.: 850 ou 850,50."}</small>
        </div>

        <div class="wide catalog-linked-field">
          <div class="catalog-linked-heading">
            <div>
              <label>Produto vinculado *</label>
              <small>Selecione um produto cadastrado na aba Fluidos e Granéis.</small>
            </div>
            <div class="catalog-linked-actions">
              <button type="button" class="btn small secondary" data-action="refresh-tank-products">Atualizar lista</button>
              <button type="button" class="btn small secondary" data-action="open-fluid-catalog">Abrir catálogo</button>
            </div>
          </div>
          <select name="fluid_type_id" data-tank-product-select>
            <option value="" ${!tank.fluidTypeId ? "selected" : ""}>${tank.volume > 0 ? "Selecione o produto cadastrado" : "Sem produto — equipamento vazio"}</option>
            ${catalogProductOptions(tank)}
          </select>
          ${unlinkedCurrent ? `<div class="message warning catalog-link-warning"><strong>Produto antigo não vinculado:</strong> ${esc(tank.product)}. Selecione o cadastro correto antes de salvar.</div>` : ""}
          <div class="tank-product-availability">
            <strong>${activeCompatibleTankProducts(tank).length}</strong>
            <span>produto(s) ativo(s) compatível(eis) com ${esc(tank.name)}</span>
          </div>
          ${activeCompatibleTankProducts(tank).length === 0 ? `<div class="message warning"><strong>Nenhum produto disponível.</strong> Cadastre ou ative um produto compatível em Fluidos e Granéis.</div>` : ""}
          <small class="field-help">${silo ? "Neste silo aparecem somente produtos classificados como Granel ou Insumo." : "Neste tanque aparecem somente WBM, Brine, SBM, Olefina e outros fluidos."}</small>
        </div>

        <div>
          <label>Densidade</label>
          <input name="density" type="text" inputmode="decimal" value="${currentDensity === "" ? "" : String(currentDensity).replace(".", ",")}" placeholder="${silo ? "Ex.: 2,162" : "Ex.: 9,7"}" ${admin ? "" : "readonly"}>
          ${admin ? "" : `<small class="field-help">Carregada automaticamente do cadastro do produto.</small>`}
        </div>
        <div>
          <label>Unidade da densidade</label>
          <select name="density_unit" ${(silo || !admin) ? "disabled" : ""}>
            <option value="ppg" ${currentDensityUnit === "ppg" ? "selected" : ""}>ppg</option>
            <option value="t/m³" ${currentDensityUnit === "t/m³" ? "selected" : ""}>t/m³</option>
          </select>
          ${(silo || !admin) ? `<input type="hidden" name="density_unit" value="${esc(currentDensityUnit)}">` : ""}
        </div>

        <div class="wide silo-capacity-preview ${silo ? "" : "hidden"}" data-silo-capacity-preview>
          <strong>${fmt.format(calculatedCapacity)} ton de capacidade operacional</strong>
          <span>${fmt.format(physicalCapacity)} m³ × ${currentDensity === "" ? "densidade não informada" : `${fmt.format(currentDensity)} t/m³`}</span>
          <span>${fmt.format(Math.max(0, calculatedCapacity-tank.volume))} ton disponíveis.</span>
        </div>

        <div class="wide"><label>Lote</label><input name="lot" value="${esc(tank.lot)}"></div>
        ${admin
          ? `<div class="wide admin-edit-notice structure-edit-notice"><strong>Edição estrutural</strong><span>Este modo altera nome, fase, tipo, capacidade, ordem e conteúdo. Use apenas para modificar a estrutura do equipamento.</span></div>`
          : `<div class="wide info-box content-update-notice"><strong>Atualização operacional segura</strong><span>Produto, lote, volume e status serão alterados. Densidade e capacidade serão calculadas pelo cadastro oficial; nome e estrutura não serão enviados.</span></div>`}
      </div>

      <div id="tankSaveMessage" class="message hidden"></div>
      <div class="form-actions">
        <button type="button" class="btn secondary" data-close-modal>Cancelar</button>
        <button type="button" class="btn primary" data-action="save-tank-volume"
          data-tank-id="${tank.id}"
          data-tank-name="${esc(tank.name)}"
          data-edit-token="${editToken}">${admin ? "Salvar estrutura e conteúdo" : `Salvar somente em ${esc(tank.name)}`}</button>
      </div>
    </form>`;
  }


  async function toggleFluidCatalogActive(id, nextActive) {
    if (!canManageFluidCatalog()) return toast("Seu perfil não pode alterar o catálogo.", "error");
    const item = state.data.fluids.find(product => product.id === id);
    if (!item) return toast("Produto não encontrado.", "error");

    if (state.testMode) {
      addTestLog("fluid-status", { id, name: item.name, active: nextActive });
      return toast("Alteração simulada na homologação local.", "success");
    }

    const { data, error } = await state.client.rpc("save_fluid_catalog_item", {
      p_id: item.id,
      p_name: item.name,
      p_category: item.type,
      p_default_unit: item.unit,
      p_density_value: item.density || null,
      p_density_unit: item.densityUnit || defaultDensityUnit(item.type),
      p_active: Boolean(nextActive)
    });

    if (error) throw error;
    const saved = Array.isArray(data) ? data[0] : data;
    if (!saved?.id || saved.active !== Boolean(nextActive)) {
      throw new Error("O Supabase não confirmou a alteração do status.");
    }

    await loadData();
    renderFluids();
    renderTanks();
    renderMobileShell();
    toast(nextActive ? `${item.name} ativado e liberado na tancagem.` : `${item.name} desativado e removido das novas seleções.`, "success");
  }

  function fluidCatalogCard(item) {
    const category = String(item.type || "Outros");
    const bulk = ["granel", "insumo"].includes(category.toLowerCase());
    return `<article class="card catalog-product-card ${bulk ? "catalog-bulk-card" : "catalog-fluid-card"}">
      <div class="catalog-product-top">
        <span class="catalog-product-icon">${bulk ? uiIcon("package") : uiIcon("droplet")}</span>
        <div><strong>${esc(item.name)}</strong><small>${esc(category)}</small></div>
        ${badge(item.active ? "Ativo" : "Inativo")}
      </div>
      <div class="catalog-product-details">
        <span>Unidade<strong>${esc(item.unit || (bulk ? "ton" : "bbl"))}</strong></span>
        <span>Densidade<strong>${item.density ? `${fmt.format(item.density)} ${esc(item.densityUnit || defaultDensityUnit(item.type))}` : "Não informada"}</strong></span>
      </div>
      <div class="row-actions">
        <button class="btn small secondary" data-attachments="fluid:${item.id}" data-attachment-title="${esc(item.name)}">Anexos (${attachmentCount("fluid", item.id)})</button>
        ${canManageFluidCatalog() ? `<button class="btn small ${item.active ? "danger-soft" : "success-soft"}" data-toggle-fluid-active="${item.id}" data-next-active="${item.active ? "false" : "true"}">${item.active ? "Desativar" : "Ativar agora"}</button><button class="btn small primary" data-edit-fluid="${item.id}">Editar</button>` : ""}
      </div>
    </article>`;
  }

  function renderFluids() {
    const products = state.data.fluids || [];
    const fluids = products.filter(item => !["granel", "insumo"].includes(String(item.type || "").toLowerCase()));
    const bulks = products.filter(item => ["granel", "insumo"].includes(String(item.type || "").toLowerCase()));
    const activeFluids = fluids.filter(item => item.active !== false).length;
    const activeBulks = bulks.filter(item => item.active !== false).length;

    $("#page-fluids").innerHTML =
      header("Fluidos e Granéis", "Cadastre os produtos uma vez e selecione-os depois nos tanques e silos.",
        canManageFluidCatalog()
          ? `<button class="btn secondary" data-action="new-bulk">+ Cadastrar granel</button><button class="btn primary" data-action="new-fluid">+ Cadastrar fluido</button>`
          : "") +
      `<div class="catalog-link-flow card">
        <span class="catalog-flow-step"><b>1</b><strong>Cadastre aqui</strong><small>Nome, classificação, unidade e densidade.</small></span>
        <span class="catalog-flow-arrow">→</span>
        <span class="catalog-flow-step"><b>2</b><strong>Atualize a tancagem</strong><small>Abra o tanque ou silo desejado.</small></span>
        <span class="catalog-flow-arrow">→</span>
        <span class="catalog-flow-step"><b>3</b><strong>Selecione no menu</strong><small>O sistema salva o vínculo com o cadastro.</small></span>
      </div>

      <div class="catalog-summary-grid">
        <button class="card catalog-summary fluid-summary" data-page-link="tanks"><span>Fluidos ativos</span><strong>${activeFluids}</strong><small>Aparecem somente nos tanques e mix tanks.</small></button>
        <button class="card catalog-summary bulk-summary" data-page-link="tanks"><span>Granéis ativos</span><strong>${activeBulks}</strong><small>Aparecem somente nos silos.</small></button>
      </div>

      <section class="catalog-section">
        <div class="catalog-section-heading"><div><span class="catalog-section-icon fluid">●</span><div><h2>Fluidos</h2><p>WBM, Brine, SBM, Olefina e outros produtos líquidos.</p></div></div>${canManageFluidCatalog() ? `<button class="btn small primary" data-action="new-fluid">Adicionar fluido</button>` : ""}</div>
        <div class="catalog-product-grid">${fluids.map(fluidCatalogCard).join("") || `<div class="card empty">Nenhum fluido cadastrado.</div>`}</div>
      </section>

      <section class="catalog-section catalog-bulk-section">
        <div class="catalog-section-heading"><div><span class="catalog-section-icon bulk">◆</span><div><h2>Granéis</h2><p>Barita, Bentonita, Calcita e outros produtos armazenados em silos.</p></div></div>${canManageFluidCatalog() ? `<button class="btn small primary" data-action="new-bulk">Adicionar granel</button>` : ""}</div>
        <div class="catalog-product-grid">${bulks.map(fluidCatalogCard).join("") || `<div class="card empty">Nenhum granel cadastrado.</div>`}</div>
      </section>`;
  }


  function chemicalProductForm(item = {}) {
    return `<form id="chemicalProductForm" data-id="${item.id || ""}">
      <div class="form-grid">
        <div class="wide"><label>Nome do produto químico *</label><input name="name" required value="${esc(item.name || "")}" placeholder="Ex.: Duo Vis"></div>
        <div><label>Categoria</label><input name="category" value="${esc(item.category || "")}" placeholder="Ex.: Aditivo, Polímero"></div>
        <div><label>Unidade padrão *</label><select name="unit">${["kg","L","saco","sacos","tambor","tambores","big bag","Big Bag","unidade"].map(value => `<option ${item.unit === value ? "selected" : ""}>${value}</option>`).join("")}</select></div>
        <div><label>Status</label><select name="active"><option value="true" ${item.active !== false ? "selected" : ""}>Ativo</option><option value="false" ${item.active === false ? "selected" : ""}>Inativo</option></select></div>
        <div class="wide"><label>Observações</label><textarea name="notes">${esc(item.notes || "")}</textarea></div>
      </div>${formActions(item.id ? "Salvar produto" : "Cadastrar produto")}
    </form>`;
  }

  function renderChemicalCatalog() {
    const products = groupedChemicalInventory();
    const active = products.filter(item => item.active).length;
    const rows = products.map(item => `<article class="card chemical-catalog-card ${item.active ? "" : "inactive"}">
      <div class="mobile-record-head"><div><strong>${esc(item.name)}</strong><small>${esc(item.category || "Produto químico")}</small></div>${badge(item.active ? "Ativo" : "Inativo")}</div>
      <div class="mobile-record-grid"><span>Saldo total<strong>${fmt.format(item.total)} ${esc(item.unit)}</strong></span><span>Lotes<strong>${item.lots.length}</strong></span><span>Unidade padrão<strong>${esc(item.unit)}</strong></span></div>
      ${item.notes ? `<p>${esc(item.notes)}</p>` : ""}
      <div class="row-actions">${canManageChemicals() ? `<button class="btn small primary" data-new-chemical-lot="${item.id}">+ Adicionar lote</button><button class="btn small secondary" data-edit-chemical-product="${item.id}">Editar produto</button>` : ""}<button class="btn small secondary" data-chemical-lots="${item.id}">Ver lotes</button></div>
    </article>`).join("");
    $("#page-chemical-catalog").innerHTML =
      header("Catálogo Químico", "Um único cadastro por produto. As quantidades ficam separadas por lote no inventário.",
        canManageChemicals() ? `<button class="btn primary" data-action="new-chemical-product">+ Novo produto químico</button>` : "") +
      `<div class="grid three"><div class="card stat-card"><div><small>Produtos cadastrados</small><h2>${products.length}</h2><span class="muted">um cadastro por nome</span></div></div><div class="card stat-card"><div><small>Produtos ativos</small><h2>${active}</h2><span class="muted">disponíveis para carretas</span></div></div><div class="card stat-card"><div><small>Lotes no inventário</small><h2>${state.data.chemicals.length}</h2><span class="muted">quantidades separadas</span></div></div></div>
      <div class="catalog-link-flow card"><span class="catalog-flow-step"><b>1</b><strong>Cadastre o produto</strong><small>Uma única vez.</small></span><span class="catalog-flow-arrow">→</span><span class="catalog-flow-step"><b>2</b><strong>Adicione os lotes</strong><small>Quantidade, validade e localização.</small></span><span class="catalog-flow-arrow">→</span><span class="catalog-flow-step"><b>3</b><strong>Veja o total</strong><small>Soma automática dos lotes.</small></span></div>
      <div class="chemical-catalog-grid">${rows || `<div class="card empty">Nenhum produto químico cadastrado.</div>`}</div>`;
  }


  function groupedChemicalInventory() {
    const products = state.data.chemicalProducts || [];
    const lots = state.data.chemicals || [];
    return products.map(product => {
      const productLots = lots
        .filter(lot => lot.productId === product.id)
        .sort((a, b) => (a.expiry_date || "9999-12-31").localeCompare(b.expiry_date || "9999-12-31") || String(a.lot || "").localeCompare(String(b.lot || "")));
      const total = productLots.reduce((sum, lot) => sum + Number(lot.quantity || 0), 0);
      const minimum = productLots.reduce((sum, lot) => sum + Number(lot.minimum || 0), 0);
      const availableLots = productLots.filter(lot => Number(lot.quantity || 0) > 0);
      const expiredLots = availableLots.filter(lot => { const days = daysUntil(lot.expiry_date); return days !== null && days < 0; });
      const expiringLots = availableLots.filter(lot => { const days = daysUntil(lot.expiry_date); return days !== null && days >= 0 && days <= 60; });
      const nextLot = availableLots[0] || null;
      let status = product.active === false ? "Inativo" : "Disponível";
      if (expiredLots.length) status = "Vencido";
      else if (minimum > 0 && total <= minimum) status = "Baixo estoque";
      else if (expiringLots.length) status = "Próximo vencimento";
      else if (!productLots.length || total <= 0) status = "Sem estoque";
      return { ...product, lots: productLots, total, minimum, expiredLots, expiringLots, nextLot, inventoryStatus: status };
    });
  }

  function chemicalLotsModal(productId) {
    const group = groupedChemicalInventory().find(item => item.id === productId);
    if (!group) return `<div class="empty">Produto químico não localizado.</div>`;
    const rows = group.lots.map((lot, index) => {
      const days = daysUntil(lot.expiry_date);
      return `<article class="chemical-lot-row">
        <div class="chemical-lot-rank">${index + 1}</div>
        <div class="chemical-lot-main">
          <strong>${esc(lot.lot || "Sem lote")}</strong>
          <small>${fmt.format(lot.quantity)} ${esc(lot.unit)} • ${esc(lot.location || "Sem localização")}</small>
          <span>Validade: ${dateOnly(lot.expiry_date)}${days !== null ? ` • ${days < 0 ? `${Math.abs(days)} dias vencido` : `${days} dias restantes`}` : ""}</span>
        </div>
        <div class="chemical-lot-status">${badge(chemicalDisplayStatus(lot))}</div>
        <div class="row-actions">
          ${canManageChemicals() ? `<button class="btn small primary" data-chemical-move="${lot.id}">Movimentar</button><button class="btn small secondary" data-edit-chemical="${lot.id}">Editar lote</button>` : ""}
          <button class="btn small secondary" data-chemical-history="${lot.id}">Histórico</button>
          <button class="btn small secondary" data-attachments="chemical:${lot.id}" data-attachment-title="${esc(group.name)} — ${esc(lot.lot || "Sem lote")}">Anexos (${attachmentCount("chemical", lot.id)})</button>
        </div>
      </article>`;
    }).join("");
    return `<div class="chemical-product-total-card"><span>Saldo total de ${esc(group.name)}</span><strong>${fmt.format(group.total)} ${esc(group.unit)}</strong><small>${group.lots.length} lote(s) cadastrado(s)</small></div>
      <div class="row-actions chemical-lot-modal-actions">${canManageChemicals() ? `<button class="btn primary" data-new-chemical-lot="${group.id}">+ Adicionar lote</button>` : ""}<button class="btn secondary" data-edit-chemical-product="${group.id}">Editar produto</button></div>
      <div class="chemical-lot-list">${rows || `<div class="empty">Nenhum lote cadastrado para este produto.</div>`}</div>`;
  }

  function truckInventoryLabel(item) {
    if (item.truckType === "Plataforma") return "Sem vínculo com inventário";
    if (item.stockApplied) {
      const tankName = item.tankId ? state.data.tanks.find(tank => tank.id === item.tankId)?.name : "";
      return `✓ estoque aplicado${tankName ? ` • ${tankName}` : ""}`;
    }
    return "estoque pendente";
  }

  function chemicalDisplayStatus(item) {
    const days = daysUntil(item.expiry_date);
    if (days !== null && days < 0) return "Vencido";
    if (item.quantity <= item.minimum) return "Baixo estoque";
    if (days !== null && days <= 60) return "Próximo vencimento";
    return item.status || "Disponível";
  }

  function renderChemicalInventory() {
    const groups = groupedChemicalInventory();
    const lots = state.data.chemicals || [];
    const totalProducts = groups.length;
    const totalLots = lots.length;
    const lowStock = groups.filter(item => item.inventoryStatus === "Baixo estoque" || item.inventoryStatus === "Sem estoque").length;
    const expired = groups.filter(item => item.expiredLots.length > 0).length;
    const expiring = groups.filter(item => item.expiringLots.length > 0).length;
    const totalBalance = groups.reduce((sum,item)=>sum+Number(item.total||0),0);
    const categories = [...new Set(groups.map(item=>item.category||"Produto químico"))].sort();
    const statuses = [...new Set(groups.map(item=>item.inventoryStatus))].sort();
    const fefoLots = lots.filter(item=>Number(item.quantity||0)>0).sort((a,b)=>(a.expiry_date||"9999-12-31").localeCompare(b.expiry_date||"9999-12-31")).slice(0,6);
    const categorySummary = categories.map(category=>{
      const items=groups.filter(item=>(item.category||"Produto químico")===category);
      return `<div><span>${esc(category)}</span><strong>${items.length}</strong><small>${items.reduce((sum,item)=>sum+item.lots.length,0)} lote(s)</small></div>`;
    }).join("");
    const fefoRows = fefoLots.map((lot,index)=>{
      const product=groups.find(item=>item.id===lot.productId);
      const days=daysUntil(lot.expiry_date);
      return `<article class="chemical-fefo-row">
        <div class="chemical-fefo-rank">${index+1}</div>
        <div><strong>${esc(product?.name||lot.name||"Produto")}</strong><small>Lote ${esc(lot.lot||"Sem lote")} • ${fmt.format(lot.quantity)} ${esc(lot.unit||product?.unit||"")}</small></div>
        <div><span>${dateOnly(lot.expiry_date)}</span><small>${days===null?"Sem prazo":days<0?`${Math.abs(days)} dias vencido`:days===0?"Vence hoje":`${days} dias restantes`}</small></div>
        ${badge(chemicalDisplayStatus(lot))}
      </article>`;
    }).join("");

    const cards = groups.map(item => {
      const nextLot = item.nextLot;
      const stockPct=item.minimum>0?Math.min(100,Math.max(0,item.total/item.minimum*100)):item.total>0?100:0;
      const search=[item.name,item.category,item.inventoryStatus,...item.lots.flatMap(lot=>[lot.lot,lot.location,lot.supplier])].filter(Boolean).join(" ").toLowerCase();
      return `<article class="card chemical-product-stock-card ${item.active ? "" : "inactive"}" data-chemical-card data-chemical-search="${esc(search)}" data-chemical-category="${esc(String(item.category||"Produto químico").toLowerCase())}" data-chemical-status="${esc(String(item.inventoryStatus||"").toLowerCase())}">
        <div class="chemical-product-stock-head"><div><span>${esc(item.category || "Produto químico")}</span><h3>${esc(item.name)}</h3></div>${badge(item.inventoryStatus)}</div>
        <div class="chemical-total-value"><small>Saldo total</small><strong>${fmt.format(item.total)} ${esc(item.unit)}</strong><span>Soma de ${item.lots.length} lote(s)</span></div>
        <div class="chemical-stock-meter"><div><span>Referência de estoque mínimo</span><strong>${item.minimum>0?`${fmt.format(item.total)} / ${fmt.format(item.minimum)} ${esc(item.unit)}`:"Sem mínimo definido"}</strong></div><div class="progress"><span style="width:${stockPct}%"></span></div></div>
        <div class="chemical-product-stock-grid">
          <span>Lotes<strong>${item.lots.length}</strong></span>
          <span>Mínimo total<strong>${fmt.format(item.minimum)} ${esc(item.unit)}</strong></span>
          <span>Próximo FEFO<strong>${nextLot ? esc(nextLot.lot || "Sem lote") : "-"}</strong></span>
          <span>Próxima validade<strong>${nextLot ? dateOnly(nextLot.expiry_date) : "-"}</strong></span>
        </div>
        <div class="row-actions">${canManageChemicals() ? `<button class="btn small primary" data-new-chemical-lot="${item.id}">+ Adicionar lote</button>` : ""}<button class="btn small secondary" data-chemical-lots="${item.id}">Ver e movimentar lotes</button>${canManageChemicals() ? `<button class="btn small secondary" data-edit-chemical-product="${item.id}">Editar produto</button>` : ""}</div>
      </article>`;
    }).join("");

    $("#page-chemicals").innerHTML = header("Inventário de produtos químicos", "Controle profissional de saldo, lotes, validade, localização e movimentações por FEFO.", `${canManageChemicals() ? `<button class="btn primary" data-action="new-chemical-product">+ Novo produto</button>` : ""}<button class="btn secondary" data-action="show-fefo">Ordem FEFO</button><button class="btn secondary" data-export="chemicals">Exportar lotes</button>`) +
      `<section class="chemical-command-grid">
        ${statCard("Produtos", fmt.format(totalProducts), "cadastros únicos", uiIcon("products"))}
        ${statCard("Lotes ativos", fmt.format(totalLots), "rastreabilidade individual", uiIcon("layers"))}
        ${statCard("Baixo ou sem estoque", fmt.format(lowStock), "produtos críticos", uiIcon("alert"))}
        ${statCard("Validade crítica", fmt.format(expired + expiring), "vencidos ou até 60 dias", uiIcon("hourglass"))}
      </section>
      <section class="chemical-control-grid">
        <div class="card chemical-fefo-panel">
          <div class="chemical-section-heading"><div><small>PRIORIDADE DE CONSUMO</small><h3>Fila FEFO</h3><p>Lotes com menor prazo aparecem primeiro.</p></div><span>${fefoLots.length} prioritários</span></div>
          <div class="chemical-fefo-list">${fefoRows||`<div class="empty">Nenhum lote com saldo disponível.</div>`}</div>
        </div>
        <div class="card chemical-category-panel">
          <div class="chemical-section-heading"><div><small>VISÃO DO ESTOQUE</small><h3>Distribuição por categoria</h3><p>${fmt.format(totalBalance)} em saldo somado nas unidades cadastradas.</p></div></div>
          <div class="chemical-category-summary">${categorySummary||`<div class="empty">Sem categorias cadastradas.</div>`}</div>
        </div>
      </section>
      <section class="chemical-filter-bar">
        <div class="chemical-filter-search"><label>Buscar produto ou lote</label><input data-chemical-filter="search" placeholder="Produto, lote, localização ou fornecedor"></div>
        <div><label>Categoria</label><select data-chemical-filter="category"><option value="">Todas</option>${categories.map(x=>`<option>${esc(x)}</option>`).join("")}</select></div>
        <div><label>Status</label><select data-chemical-filter="status"><option value="">Todos</option>${statuses.map(x=>`<option>${esc(x)}</option>`).join("")}</select></div>
        <button class="btn secondary" type="button" data-action="clear-chemical-filters">Limpar</button>
      </section>
      <div class="chemical-filter-result" data-chemical-filter-result>${groups.length} produto(s)</div>
      <div class="info-box chemical-inventory-rule"><strong>Carretas Plataforma desvinculadas:</strong> cadastrar um produto na carreta não cria lote e não altera este inventário. Os lotes são controlados somente aqui.</div>
      <div class="chemical-product-stock-grid-list">${cards || `<div class="card empty">Nenhum produto químico cadastrado.</div>`}</div>`;
  }

  function applyChemicalFilters() {
    const page=$("#page-chemicals"); if(!page) return;
    const value=key=>(page.querySelector(`[data-chemical-filter="${key}"]`)?.value||"").trim().toLowerCase();
    const search=value("search"), category=value("category"), status=value("status");
    let visible=0;
    page.querySelectorAll("[data-chemical-card]").forEach(card=>{
      const ok=(!search||card.dataset.chemicalSearch.includes(search))&&(!category||card.dataset.chemicalCategory===category)&&(!status||card.dataset.chemicalStatus===status);
      card.hidden=!ok; if(ok) visible++;
    });
    const result=page.querySelector("[data-chemical-filter-result]"); if(result) result.textContent=`${visible} produto(s) exibido(s)`;
  }

  function renderTrucks() {
    const trucks = filteredTrucks();
    const today = localDateKey();
    const typeCount = type => trucks.filter(item => item.truckType === type).length;
    const movementCount = movement => trucks.filter(item => String(item.movement || "").toLowerCase() === movement.toLowerCase()).length;
    const todayCount = trucks.filter(item => recordDateKey(item.date || item.created_at) === today).length;
    const pendingStock = trucks.filter(item => item.truckType !== "Plataforma" && !item.stockApplied && ["Recebida", "Concluída"].includes(item.status)).length;
    const pendingDocs = trucks.filter(item => !item.invoice || !item.plate || (item.truckType !== "Plataforma" && !item.lot)).length;
    const activeQueue = trucks.filter(item => !["Concluída", "Cancelada"].includes(item.status));
    const completed = trucks.filter(item => item.status === "Concluída").length;

    const quantityByUnit = trucks.reduce((acc, item) => {
      if (item.truckType === "Plataforma") {
        (item.items || []).forEach(row => {
          const unit = row.unit || "un";
          acc[unit] = (acc[unit] || 0) + Number(row.quantity || 0);
        });
      } else {
        const unit = item.unit || "un";
        acc[unit] = (acc[unit] || 0) + Number(item.quantity || 0);
      }
      return acc;
    }, {});
    const volumeSummary = Object.entries(quantityByUnit).slice(0, 3).map(([unit, quantity]) => `${fmt.format(quantity)} ${esc(unit)}`).join(" • ") || "Sem volume no período";

    const rows = trucks.map(item => `<tr>
      <td><strong>${dateOnly(item.date)}</strong><br><small>${recordDateKey(item.date || item.created_at) === today ? "Hoje" : "Movimentação"}</small></td>
      <td>${badge(item.movement)}<br><small>${badge(item.truckType)}</small></td>
      <td><strong>${esc(item.supplier || "-")}</strong><br><small>${esc(item.client || "Sem cliente")}</small></td>
      <td>${truckItemsSummary(item)}</td>
      <td><strong>${esc(item.plate || "-")}</strong><br><small>${esc(item.driver || "Motorista não informado")}</small></td>
      <td><strong>${esc(item.invoice || "-")}</strong><br><small>${esc(item.lot || "Sem lote")}</small></td>
      <td>${badge(item.status)}<br><small>${esc(truckInventoryLabel(item))}</small></td>
      <td><div class="row-actions">
        ${item.truckType === "Plataforma" ? `<button class="btn small secondary" data-truck-items="${item.id}">Ver ${item.items.length} itens</button>` : ""}
        <button class="btn small secondary" data-attachments="truck:${item.id}" data-attachment-title="${esc(item.plate || item.product)}">Anexos (${attachmentCount("truck", item.id)})</button>
        ${canManageTrucks() ? `<button class="btn small primary" data-edit-truck="${item.id}">Editar</button>` : ""}
      </div></td>
    </tr>`).join("");

    const mobile = trucks.map(item => `<article class="card mobile-record-card truck-mobile-card truck-type-${String(item.truckType).toLowerCase()}">
      <div class="mobile-record-head"><div><strong>${esc(item.plate || item.product || "Movimentação")}</strong><small>${dateOnly(item.date)} • ${esc(item.movement)}</small></div>${badge(item.truckType)}</div>
      <div class="truck-mobile-products">${truckItemsSummary(item)}</div>
      <div class="mobile-record-grid"><span>Origem/Destino<strong>${esc(item.supplier || "-")}</strong></span><span>Cliente<strong>${esc(item.client || "-")}</strong></span><span>NF<strong>${esc(item.invoice || "-")}</strong></span><span>Lote<strong>${esc(item.lot || "-")}</strong></span><span>Motorista<strong>${esc(item.driver || "-")}</strong></span><span>Status<strong>${esc(item.status)}</strong></span><span>Integração<strong>${item.truckType === "Plataforma" ? "Sem inventário" : (item.stockApplied ? "Aplicado" : "Pendente")}</strong></span></div>
      <div class="row-actions">${item.truckType === "Plataforma" ? `<button class="btn small secondary" data-truck-items="${item.id}">Ver itens</button>` : ""}<button class="btn small secondary" data-attachments="truck:${item.id}" data-attachment-title="${esc(item.plate || item.product)}">Anexos</button>${canManageTrucks() ? `<button class="btn small primary" data-edit-truck="${item.id}">Editar</button>` : ""}</div>
    </article>`).join("");

    const queueCards = activeQueue.slice(0, 6).map(item => `<article class="truck-queue-card">
      <div class="truck-queue-icon">${uiIcon("truck")}</div>
      <div class="truck-queue-main"><div><strong>${esc(item.plate || item.invoice || "Carreta")}</strong>${badge(item.status)}</div><p>${esc(item.movement || "Movimentação")} • ${esc(item.truckType || "Tipo não definido")} • ${esc(item.product || (item.items || [])[0]?.productName || "Carga não informada")}</p><small>${esc(item.supplier || "Origem/Destino não informado")} ${item.client ? `→ ${esc(item.client)}` : ""}</small></div>
      ${canManageTrucks() ? `<button class="btn small secondary" data-edit-truck="${item.id}">Abrir</button>` : ""}
    </article>`).join("");

    $("#page-trucks").innerHTML =
      header("Central de carretas", "Entradas, saídas, documentação, produtos e integração com estoque.",
        `<button class="btn secondary" data-export="trucks">Exportar CSV</button>${canManageTrucks() ? `<button class="btn primary" data-action="new-truck">+ Nova movimentação</button>` : ""}`) +
      `<section class="truck-overview-grid">
        ${statCard("Carretas hoje", fmt.format(todayCount), "movimentações registradas", uiIcon("truck"), "Entradas e saídas do dia", "blue")}
        ${statCard("Em andamento", fmt.format(activeQueue.length), "fila operacional", uiIcon("activity"), "Aguardando conclusão", "orange")}
        ${statCard("Estoque pendente", fmt.format(pendingStock), "movimentações", uiIcon("alert"), "Necessitam aplicação", "red")}
        ${statCard("Documentação pendente", fmt.format(pendingDocs), "placa, NF ou lote", uiIcon("file"), "Conferência necessária", "purple")}
      </section>
      <section class="truck-control-grid">
        <div class="card truck-flow-card"><div class="truck-section-heading"><div><small>FLUXO LOGÍSTICO</small><h3>Resumo do período</h3></div><span>${trucks.length} registros</span></div>
          <div class="truck-flow-stats"><div><span>Entradas</span><strong>${movementCount("Entrada")}</strong></div><div><span>Saídas</span><strong>${movementCount("Saída")}</strong></div><div><span>Concluídas</span><strong>${completed}</strong></div></div>
          <div class="truck-volume-summary"><small>VOLUME MOVIMENTADO</small><strong>${volumeSummary}</strong></div>
        </div>
        <div class="card truck-types-card"><div class="truck-section-heading"><div><small>TIPOS DE CARRETA</small><h3>Distribuição</h3></div></div>
          <div class="truck-type-professional"><div><span class="truck-type-mark bulk"></span><p>Bulk<small>Granéis</small></p><strong>${typeCount("Bulk")}</strong></div><div><span class="truck-type-mark tank"></span><p>Tank<small>Fluidos</small></p><strong>${typeCount("Tank")}</strong></div><div><span class="truck-type-mark platform"></span><p>Plataforma<small>Insumos diversos</small></p><strong>${typeCount("Plataforma")}</strong></div></div>
        </div>
      </section>
      <section class="card truck-queue-panel"><div class="truck-section-heading"><div><small>FILA OPERACIONAL</small><h3>Movimentações que exigem acompanhamento</h3></div><span>${activeQueue.length} abertas</span></div><div class="truck-queue-list">${queueCards || `<div class="empty">Nenhuma movimentação pendente.</div>`}</div></section>
      <div class="section-title truck-record-title"><span>Histórico de movimentações</span><small>${trucks.length} registro(s) no filtro atual</small></div>
      <div class="card table-wrap desktop-record-table truck-professional-table"><table class="data-table"><thead><tr><th>Data</th><th>Movimento / Tipo</th><th>Origem / Cliente</th><th>Produtos</th><th>Placa / Motorista</th><th>NF / Lote</th><th>Status</th><th>Ações</th></tr></thead><tbody>${rows || `<tr><td colspan="8" class="empty">Nenhuma movimentação.</td></tr>`}</tbody></table></div>
      <div class="mobile-record-list">${mobile || `<div class="card empty">Nenhuma movimentação.</div>`}</div>`;
  }

  function renderQhse() {
    const canAddQhse = hasRole(["supervisor", "lider", "qhse", "operador"]);
    const records = state.data.qhse || [];
    const actionsList = state.data.actionItems || [];
    const openStatus = item => !["Concluído", "Fechado", "Cancelado"].includes(item.status);
    const openActionsTotal = actionsList.filter(openStatus).length;
    const criticalRecords = records.filter(item => ["Crítica", "Crítico", "Alta", "Alto"].includes(item.severity) && item.status !== "Concluído").length;
    const openRecords = records.filter(item => !["Concluído", "Fechado", "Cancelado"].includes(item.status)).length;
    const completedRecords = records.filter(item => ["Concluído", "Fechado"].includes(item.status)).length;
    const typeCounts = records.reduce((acc,item)=>{ const key=item.type||"Outros"; acc[key]=(acc[key]||0)+1; return acc; },{});
    const rows = records.map(item => {
      const openActions = actionsList.filter(a => a.qhse_record_id === item.id && openStatus(a)).length;
      return `<tr><td>${dateOnly(item.date)}</td><td>${badge(item.type)}</td><td><strong>${esc(item.title)}</strong><br><small>${esc(item.description || "")}</small></td><td>${esc(item.responsible || "-")}</td><td>${badge(item.severity)}</td><td>${badge(item.status)}</td><td><div class="row-actions"><button class="btn small secondary" data-qhse-actions="${item.id}">Ações (${openActions})</button><button class="btn small secondary" data-attachments="qhse:${item.id}" data-attachment-title="${esc(item.title)}">${uiIcon("paperclip", "ui-icon btn-icon")} ${attachmentCount("qhse", item.id)}</button>${isAdmin() ? `<button class="btn small primary" data-edit-qhse="${item.id}">Editar</button>` : ""}</div></td></tr>`;
    }).join("");
    const mobile = records.map(item => {
      const openActions = actionsList.filter(a => a.qhse_record_id === item.id && openStatus(a)).length;
      return `<article class="card mobile-record-card qhse-mobile-card"><div class="mobile-record-head"><div><strong>${esc(item.title)}</strong><small>${dateOnly(item.date)} • ${esc(item.type)}</small></div>${badge(item.status)}</div><p>${esc(item.description || "Sem descrição")}</p><div class="mobile-record-grid"><span>Responsável<strong>${esc(item.responsible || "-")}</strong></span><span>Severidade<strong>${esc(item.severity)}</strong></span><span>Ações abertas<strong>${openActions}</strong></span></div><div class="row-actions"><button class="btn small secondary" data-qhse-actions="${item.id}">Plano de ação</button><button class="btn small secondary" data-attachments="qhse:${item.id}" data-attachment-title="${esc(item.title)}">Anexos (${attachmentCount("qhse", item.id)})</button>${isAdmin() ? `<button class="btn small primary" data-edit-qhse="${item.id}">Editar</button>` : ""}</div></article>`;
    }).join("");
    const typeBars = Object.entries(typeCounts).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([type,count])=>`<div class="qhse-type-row"><span>${esc(type)}</span><div><i style="width:${records.length ? Math.max(8,Math.round(count/records.length*100)) : 0}%"></i></div><strong>${count}</strong></div>`).join("");
    const priority = records.filter(item => !["Concluído","Fechado","Cancelado"].includes(item.status)).slice(0,5).map(item=>`<article class="qhse-priority-card"><span class="qhse-priority-icon">${uiIcon("shield")}</span><div><strong>${esc(item.title)}</strong><small>${esc(item.type||"Registro")} • ${esc(item.responsible||"Sem responsável")}</small></div>${badge(item.severity)}</article>`).join("");
    const actions = canAddQhse ? `<button class="btn primary" data-action="new-qhse">+ Novo registro QHSE</button>` : "";
    $("#page-qhse").innerHTML = header("Central QHSE", "Segurança, prevenção, inspeções, riscos e planos de ação.", actions) +
      `<section class="qhse-kpi-grid">${statCard("Registros abertos", fmt.format(openRecords), "em acompanhamento", uiIcon("shield"), "Tratativas ativas", "blue")}${statCard("Críticos / altos", fmt.format(criticalRecords), "prioridade imediata", uiIcon("alert"), "Exigem atenção", "red")}${statCard("Ações pendentes", fmt.format(openActionsTotal), "planos de ação", uiIcon("activity"), "Responsáveis e prazos", "orange")}${statCard("Concluídos", fmt.format(completedRecords), "registros encerrados", uiIcon("check"), "Evidências finalizadas", "green")}</section>
      <section class="qhse-control-grid"><div class="card qhse-priority-panel"><div class="professional-section-heading"><div><small>PRIORIDADES</small><h3>Registros que exigem acompanhamento</h3></div><span>${openRecords} abertos</span></div><div class="qhse-priority-list">${priority || `<div class="empty">Nenhum registro pendente.</div>`}</div></div><div class="card qhse-type-panel"><div class="professional-section-heading"><div><small>DISTRIBUIÇÃO</small><h3>Registros por tipo</h3></div></div><div class="qhse-type-list">${typeBars || `<div class="empty">Sem dados.</div>`}</div></div></section>
      ${canAddQhse ? `<div class="module-action-bar"><div class="module-action-copy"><span class="module-action-icon">${uiIcon("shield")}</span><div><strong>Registrar atividade QHSE</strong><small>DDS, APR, inspeção, risco, ocorrência ou evidência.</small></div></div><button class="btn primary" data-action="new-qhse">Novo registro</button></div>` : ""}
      <div class="section-title professional-record-title"><span>Histórico QHSE</span><small>${records.length} registro(s)</small></div><div class="card table-wrap desktop-record-table professional-table"><table class="data-table"><thead><tr><th>Data</th><th>Tipo</th><th>Registro</th><th>Responsável</th><th>Severidade</th><th>Status</th><th>Ações</th></tr></thead><tbody>${rows || `<tr><td colspan="7" class="empty">Nenhum registro QHSE cadastrado.</td></tr>`}</tbody></table></div><div class="mobile-record-list">${mobile || `<div class="card empty">Nenhum registro QHSE cadastrado.</div>`}</div>`;
  }

  function renderMaintenance() {
    const canManageMaintenance = hasRole(["supervisor", "lider", "mecanico"]);
    const equipment = state.data.equipment || [];
    const orders = state.data.maintenanceOrders || [];
    const orderOpen = order => !["Concluída", "Fechada", "Cancelada"].includes(order.status);
    const openOrders = orders.filter(orderOpen);
    const overdueOrders = openOrders.filter(order => order.due_date && daysUntil(order.due_date) < 0);
    const preventiveDue = equipment.filter(item => (item.maintenance_due_hourmeter > 0 && item.hourmeter >= item.maintenance_due_hourmeter) || (item.next_maintenance_date && daysUntil(item.next_maintenance_date) <= 7)).length;
    const unavailable = equipment.filter(item => ["Manutenção", "Indisponível", "Parado"].includes(item.status)).length;
    const equipmentRows = equipment.map(item => {
      const used = Math.max(0, Number(item.diesel_initial||0) + Number(item.refueled||0) - Number(item.diesel_final||0));
      const average = item.last_hours ? used / item.last_hours : 0;
      const itemOpenOrders = orders.filter(order => order.equipment_id === item.id && orderOpen(order)).length;
      const hoursDue = item.maintenance_due_hourmeter > 0 ? item.maintenance_due_hourmeter - item.hourmeter : null;
      const preventive = hoursDue !== null && hoursDue <= 0 ? "Vencida por horímetro" : item.next_maintenance_date ? `${dateOnly(item.next_maintenance_date)}${hoursDue !== null ? ` • ${fmt.format(hoursDue)} h` : ""}` : hoursDue !== null ? `${fmt.format(hoursDue)} h restantes` : "Não programada";
      return `<tr><td><strong>${esc(item.name)}</strong><br><small>${esc(item.category)} • ${esc(item.location || "-")}</small></td><td>${badge(item.status)}</td><td>${fmt.format(item.hourmeter)} h</td><td>${esc(preventive)}</td><td>${fmt.format(used)} L</td><td>${fmt.format(average)} L/h</td><td>${itemOpenOrders}</td><td><div class="row-actions">${canManageMaintenance ? `<button class="btn small primary" data-new-order-equipment="${item.id}">Abrir OS</button>` : ""}${isAdmin() ? `<button class="btn small secondary" data-edit-equipment="${item.id}">Editar</button>` : ""}<button class="btn small secondary" data-asset-qr="equipment:${item.id}">QR</button></div></td></tr>`;
    }).join("");
    const mobileEquipment = equipment.map(item => { const count=orders.filter(order=>order.equipment_id===item.id&&orderOpen(order)).length; return `<article class="card mobile-record-card maintenance-mobile-card"><div class="mobile-record-head"><div><strong>${esc(item.name)}</strong><small>${esc(item.category)} • ${esc(item.location || "-")}</small></div>${badge(item.status)}</div><div class="mobile-record-grid"><span>Horímetro<strong>${fmt.format(item.hourmeter)} h</strong></span><span>OS abertas<strong>${count}</strong></span><span>Próxima preventiva<strong>${item.next_maintenance_date?dateOnly(item.next_maintenance_date):"Não programada"}</strong></span></div><div class="row-actions">${canManageMaintenance ? `<button class="btn small primary" data-new-order-equipment="${item.id}">Abrir OS</button>` : ""}<button class="btn small secondary" data-asset-qr="equipment:${item.id}">QR Code</button>${isAdmin() ? `<button class="btn small secondary" data-edit-equipment="${item.id}">Editar</button>` : ""}</div></article>`; }).join("");
    const orderRows = orders.map(order => { const eq=equipment.find(x=>x.id===order.equipment_id)?.name||"Equipamento removido"; return `<tr><td><strong>${esc(order.title)}</strong><br><small>${esc(eq)} • ${esc(order.maintenance_type)}</small></td><td>${badge(order.priority)}</td><td>${badge(order.status)}</td><td>${esc(order.responsible || "-")}</td><td>${dateOnly(order.due_date)}</td><td>${money.format(order.actual_cost || order.estimated_cost || 0)}</td><td><div class="row-actions"><button class="btn small secondary" data-attachments="maintenance:${order.id}" data-attachment-title="${esc(order.title)}">${uiIcon("paperclip", "ui-icon btn-icon")} ${attachmentCount("maintenance", order.id)}</button>${canManageMaintenance ? `<button class="btn small primary" data-edit-order="${order.id}">Editar</button>` : ""}</div></td></tr>`; }).join("");
    const mobileOrders = orders.map(order => { const eq=equipment.find(x=>x.id===order.equipment_id)?.name||"Equipamento removido"; return `<article class="card mobile-record-card"><div class="mobile-record-head"><div><strong>${esc(order.title)}</strong><small>${esc(eq)} • ${esc(order.maintenance_type)}</small></div>${badge(order.status)}</div><div class="mobile-record-grid"><span>Prioridade<strong>${esc(order.priority)}</strong></span><span>Prazo<strong>${dateOnly(order.due_date)}</strong></span><span>Responsável<strong>${esc(order.responsible || "-")}</strong></span><span>Custo<strong>${money.format(order.actual_cost || order.estimated_cost || 0)}</strong></span></div><div class="row-actions"><button class="btn small secondary" data-attachments="maintenance:${order.id}" data-attachment-title="${esc(order.title)}">Anexos (${attachmentCount("maintenance", order.id)})</button>${canManageMaintenance ? `<button class="btn small primary" data-edit-order="${order.id}">Editar</button>` : ""}</div></article>`; }).join("");
    const priorityOrders = openOrders.slice(0,6).map(order=>{ const eq=equipment.find(x=>x.id===order.equipment_id)?.name||"Equipamento"; return `<article class="maintenance-order-card"><span>${uiIcon("wrench")}</span><div><strong>${esc(order.title)}</strong><small>${esc(eq)} • Prazo ${dateOnly(order.due_date)}</small></div>${badge(order.priority)}</article>`; }).join("");
    const headerActions = `<button class="btn secondary" data-export="maintenance">Exportar CSV</button>${canManageMaintenance ? `<button class="btn secondary" data-action="new-equipment">+ Novo equipamento</button><button class="btn primary" data-action="new-maintenance-order">+ Nova OS</button>` : ""}`;
    $("#page-maintenance").innerHTML = header("Central de manutenção", "Ativos, preventiva, horímetro, diesel e ordens de serviço.", headerActions) +
      `<section class="maintenance-kpi-grid">${statCard("Equipamentos", fmt.format(equipment.length), "ativos cadastrados", uiIcon("wrench"), "Base de ativos", "blue")}${statCard("OS abertas", fmt.format(openOrders.length), "em execução ou aguardando", uiIcon("file"), "Fila de manutenção", "orange")}${statCard("Preventivas próximas", fmt.format(preventiveDue), "vencidas ou em até 7 dias", uiIcon("hourglass"), "Planejamento preventivo", "purple")}${statCard("Indisponíveis", fmt.format(unavailable), "equipamentos parados", uiIcon("alert"), overdueOrders.length ? `${overdueOrders.length} OS vencida(s)` : "Sem OS vencidas", "red")}</section>
      <section class="maintenance-control-grid"><div class="card maintenance-priority-panel"><div class="professional-section-heading"><div><small>FILA DE MANUTENÇÃO</small><h3>Ordens prioritárias</h3></div><span>${openOrders.length} abertas</span></div><div class="maintenance-order-list">${priorityOrders || `<div class="empty">Nenhuma ordem pendente.</div>`}</div></div><div class="card maintenance-health-panel"><div class="professional-section-heading"><div><small>SAÚDE DOS ATIVOS</small><h3>Resumo operacional</h3></div></div><div class="maintenance-health-grid"><div><span>Disponíveis</span><strong>${Math.max(0,equipment.length-unavailable)}</strong></div><div><span>Indisponíveis</span><strong>${unavailable}</strong></div><div><span>OS vencidas</span><strong>${overdueOrders.length}</strong></div><div><span>Preventivas</span><strong>${preventiveDue}</strong></div></div></div></section>
      ${canManageMaintenance ? `<div class="module-action-grid"><button class="module-action-card" data-action="new-equipment"><span class="module-action-card-icon">${uiIcon("wrench")}</span><span><strong>Adicionar equipamento</strong><small>Cadastre motor, bomba, compressor ou outro ativo.</small></span><b>+</b></button><button class="module-action-card primary-action-card" data-action="new-maintenance-order"><span class="module-action-card-icon">${uiIcon("file")}</span><span><strong>Abrir ordem de serviço</strong><small>Preventiva, corretiva ou inspeção.</small></span><b>+</b></button></div>` : ""}
      <div class="section-title professional-record-title"><span>Equipamentos</span><small>${equipment.length} ativo(s)</small></div><div class="card table-wrap desktop-record-table professional-table"><table class="data-table"><thead><tr><th>Equipamento</th><th>Status</th><th>Horímetro</th><th>Preventiva</th><th>Diesel</th><th>Média</th><th>OS abertas</th><th>Ação</th></tr></thead><tbody>${equipmentRows || `<tr><td colspan="8" class="empty">Nenhum equipamento cadastrado.</td></tr>`}</tbody></table></div><div class="mobile-record-list">${mobileEquipment || `<div class="card empty">Nenhum equipamento cadastrado.</div>`}</div><div class="section-title professional-record-title"><span>Ordens de serviço</span><small>${orders.length} registro(s)</small></div><div class="card table-wrap desktop-record-table professional-table"><table class="data-table"><thead><tr><th>Ordem</th><th>Prioridade</th><th>Status</th><th>Responsável</th><th>Prazo</th><th>Custo</th><th>Ações</th></tr></thead><tbody>${orderRows || `<tr><td colspan="7" class="empty">Nenhuma ordem de serviço.</td></tr>`}</tbody></table></div><div class="mobile-record-list">${mobileOrders || `<div class="card empty">Nenhuma ordem de serviço.</div>`}</div>`;
  }

  function renderCertificates() {
    const canManage = canManageCertificates();
    const certificates = state.data.certificates || [];
    const enriched = certificates.map(item => {
      const days = daysUntil(item.expires_at);
      const automaticStatus = days !== null && days < 0 ? "Vencido" : days !== null && days <= 60 ? "A vencer" : (item.status || "Válido");
      return { ...item, days, automaticStatus };
    });
    const expired = enriched.filter(item => item.automaticStatus === "Vencido");
    const expiring = enriched.filter(item => item.automaticStatus === "A vencer");
    const valid = enriched.filter(item => !["Vencido","A vencer"].includes(item.automaticStatus));
    const owners = [...new Set(enriched.map(item => item.owner).filter(Boolean))];
    const priority = [...expired, ...expiring].sort((a,b) => (a.days ?? 99999) - (b.days ?? 99999)).slice(0,8);
    const rows = enriched.map(item => `<tr>
      <td><strong>${esc(item.title)}</strong><br><small>${esc(item.issuer || "-")}</small></td>
      <td>${esc(item.owner || "-")}</td><td>${dateOnly(item.expires_at)}${item.days !== null ? `<br><small>${item.days < 0 ? `${Math.abs(item.days)} dias vencido` : `${item.days} dias restantes`}</small>` : ""}</td>
      <td>${badge(item.automaticStatus)}</td>
      <td><div class="row-actions"><button class="btn small secondary" data-attachments="certificate:${item.id}" data-attachment-title="${esc(item.title)}">${uiIcon("paperclip", "ui-icon btn-icon")} ${attachmentCount("certificate", item.id)}</button>${canManage ? `<button class="btn small primary" data-edit-certificate="${item.id}">Editar</button>` : ""}</div></td>
    </tr>`).join("");
    const mobile = enriched.map(item => `<article class="card mobile-record-card certificate-mobile-card"><div class="mobile-record-head"><div><strong>${esc(item.title)}</strong><small>${esc(item.issuer || "-")}</small></div>${badge(item.automaticStatus)}</div><div class="mobile-record-grid"><span>Colaborador<strong>${esc(item.owner || "-")}</strong></span><span>Validade<strong>${dateOnly(item.expires_at)}</strong></span><span>Prazo<strong>${item.days === null ? "Sem data" : item.days < 0 ? `${Math.abs(item.days)} dias vencido` : `${item.days} dias`}</strong></span></div><div class="row-actions"><button class="btn small secondary" data-attachments="certificate:${item.id}" data-attachment-title="${esc(item.title)}">Anexos (${attachmentCount("certificate", item.id)})</button>${canManage ? `<button class="btn small primary" data-edit-certificate="${item.id}">Editar</button>` : ""}</div></article>`).join("");
    const priorityCards = priority.map(item => `<article class="certificate-priority-card ${statusClass(item.automaticStatus)}"><span class="certificate-priority-icon">${uiIcon("file")}</span><div><strong>${esc(item.title)}</strong><small>${esc(item.owner || "-")} • ${dateOnly(item.expires_at)}</small></div><div>${badge(item.automaticStatus)}<small>${item.days < 0 ? `${Math.abs(item.days)}d vencido` : `${item.days}d restantes`}</small></div></article>`).join("");
    const ownerCoverage = owners.slice(0,8).map(owner => { const list=enriched.filter(item=>item.owner===owner); const pending=list.filter(item=>["Vencido","A vencer"].includes(item.automaticStatus)).length; return `<div class="certificate-owner-row"><span><strong>${esc(owner)}</strong><small>${list.length} certificado(s)</small></span><b class="${pending ? "needs-attention" : "is-ok"}">${pending ? `${pending} pendente(s)` : "Regular"}</b></div>`; }).join("");
    $("#page-certificates").innerHTML =
      header("Gestão de certificados", "Validades, documentos, colaboradores e pendências de conformidade.", canManage ? `<button class="btn primary" data-action="new-certificate">+ Adicionar certificado</button>` : "") +
      `${!canManage ? `<div class="info-box" style="margin-bottom:14px">Você pode consultar seus certificados. O cadastro é feito pela Logística, Supervisor ou Administrador.</div>` : ""}
      <section class="certificate-kpi-grid">${statCard("Certificados", fmt.format(enriched.length), "documentos cadastrados", uiIcon("file"), `${owners.length} colaborador(es)`, "blue")}${statCard("Válidos", fmt.format(valid.length), "sem vencimento próximo", uiIcon("check"), "Situação regular", "green")}${statCard("A vencer", fmt.format(expiring.length), "nos próximos 60 dias", uiIcon("hourglass"), "Planejar renovação", "orange")}${statCard("Vencidos", fmt.format(expired.length), "exigem regularização", uiIcon("alert"), expired.length ? "Ação imediata" : "Nenhuma pendência", "red")}</section>
      <section class="certificate-control-grid"><div class="card certificate-priority-panel"><div class="professional-section-heading"><div><small>CONFORMIDADE</small><h3>Renovações prioritárias</h3></div><span>${priority.length} item(ns)</span></div><div class="certificate-priority-list">${priorityCards || `<div class="empty">Nenhum certificado vencido ou próximo do vencimento.</div>`}</div></div><div class="card certificate-owner-panel"><div class="professional-section-heading"><div><small>COBERTURA</small><h3>Situação por colaborador</h3></div><span>${owners.length} pessoa(s)</span></div><div class="certificate-owner-list">${ownerCoverage || `<div class="empty">Nenhum colaborador vinculado.</div>`}</div></div></section>
      <div class="section-title professional-record-title"><span>Todos os certificados</span><small>${enriched.length} registro(s)</small></div><div class="card table-wrap desktop-record-table professional-table"><table class="data-table"><thead><tr><th>Certificado</th><th>Colaborador</th><th>Validade</th><th>Status</th><th>Ações</th></tr></thead><tbody>${rows || `<tr><td colspan="5" class="empty">Nenhum certificado disponível.</td></tr>`}</tbody></table></div><div class="mobile-record-list">${mobile || `<div class="card empty">Nenhum certificado disponível.</div>`}</div>`;
  }

  function renderAlerts() {
    const manual = state.data.alerts || [];
    const automatic = state.data.systemAlerts || [];
    const messages = state.data.messages || [];
    const all = [...automatic.map(item=>({ ...item, automatic:true })), ...manual.map(item => ({ ...item, category:item.target||"Comunicado", automatic:false }))]
      .sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
    const critical = all.filter(item=>isCriticalAlert(item.level));
    const grouped = [...new Set(all.map(x=>x.category||"Sistema"))];
    const recent = all.filter(item => { const age=Date.now()-new Date(item.created_at||0).getTime(); return Number.isFinite(age) && age <= 24*60*60*1000; });
    const automaticCount = all.filter(item=>item.automatic).length;
    const priorityCards = critical.slice(0,6).map(item=>`<article class="alert-priority-card ${statusClass(item.level)}"><span>${uiIcon("alert")}</span><div><strong>${esc(item.title)}</strong><small>${esc(item.category||"Sistema")} • ${dateTime(item.created_at)}</small><p>${esc(item.message||"")}</p></div>${item.action_page&&moduleAllowed(item.action_page)?`<button class="btn small secondary" data-alert-page="${esc(item.action_page)}">Abrir</button>`:""}</article>`).join("");
    const cards=all.slice(0,80).map(item=>`<article class="alert-center-card ${statusClass(item.level)}"><div class="alert-center-top"><span>${esc(item.category||"Sistema")}</span>${badge(item.level)}</div><h3>${esc(item.title)}</h3><p>${esc(item.message||"")}</p><footer><span>${item.automatic ? "Automático" : "Comunicado"} • ${dateTime(item.created_at)}</span>${item.action_page&&moduleAllowed(item.action_page)?`<button class="btn small secondary" data-alert-page="${esc(item.action_page)}">Abrir módulo</button>`:""}</footer></article>`).join("");
    const chatMessages=messages.slice(-100).map(item=>`<div class="chat-message"><div class="chat-avatar">${esc(String(item.sender_name||"U").trim().slice(0,1).toUpperCase())}</div><div><strong>${esc(item.sender_name)}</strong><p>${esc(item.message)}</p><small>${dateTime(item.created_at)}</small></div></div>`).join("");
    $("#page-alerts").innerHTML=header("Alertas e comunicação", "Prioridades operacionais, avisos automáticos e comunicação da equipe.", hasRole(["supervisor","lider","qhse","logistica"])?`<button class="btn primary" data-action="new-alert">+ Criar comunicado</button>`:"")+
      `<section class="alert-professional-kpis">${statCard("Alertas ativos", fmt.format(all.length), "avisos disponíveis", uiIcon("bell"), `${recent.length} nas últimas 24h`, "blue")}${statCard("Críticos e altos", fmt.format(critical.length), "exigem acompanhamento", uiIcon("alert"), critical.length ? "Prioridade operacional" : "Sem criticidade", "red")}${statCard("Automáticos", fmt.format(automaticCount), "gerados pelo sistema", uiIcon("settings"), `${grouped.length} categoria(s)`, "purple")}${statCard("Mensagens", fmt.format(messages.length), "no chat da equipe", uiIcon("users"), `${offlineQueue().length} pendente(s) offline`, "green")}</section>
      <section class="alert-priority-layout"><div class="card alert-priority-panel"><div class="professional-section-heading"><div><small>PRIORIDADE</small><h3>Pontos que exigem atenção</h3></div><span>${critical.length} crítico(s)</span></div><div class="alert-priority-list">${priorityCards || `<div class="empty">Nenhum alerta crítico ou alto.</div>`}</div></div><div class="card alert-category-panel"><div class="professional-section-heading"><div><small>DISTRIBUIÇÃO</small><h3>Alertas por categoria</h3></div></div><div class="alert-category-list">${grouped.map(category=>{ const count=all.filter(x=>(x.category||"Sistema")===category).length; const pct=all.length?Math.round(count/all.length*100):0; return `<div><span><strong>${esc(category)}</strong><small>${count} alerta(s)</small></span><div class="mini-progress"><i style="width:${pct}%"></i></div><b>${pct}%</b></div>`; }).join("") || `<div class="empty">Nenhuma categoria disponível.</div>`}</div></div></section>
      <section class="alert-center-layout professional-alert-layout"><div><div class="professional-section-heading alert-section-heading"><div><small>CENTRAL</small><h3>Todos os alertas</h3></div><span>${all.length} registro(s)</span></div><div class="alert-filter-row">${grouped.map(category=>`<span>${esc(category)} <strong>${all.filter(x=>(x.category||"Sistema")===category).length}</strong></span>`).join("")}</div><div class="alert-center-grid">${cards||`<div class="empty">Nenhum alerta ativo.</div>`}</div></div>
      <aside class="card chat-panel professional-chat-panel"><div class="chat-panel-head"><div><small>COMUNICAÇÃO</small><h3>Chat interno</h3></div><span>${messages.length}</span></div><div class="chat-list">${chatMessages||`<div class="empty">Sem mensagens.</div>`}</div>${role()!=="tv"?`<form id="chatForm" class="chat-form"><input name="message" required placeholder="Mensagem para a equipe"><button class="btn primary">Enviar</button></form>`:""}</aside></section>`;
  }

  function defaultHandoverSelection(now = new Date()) {
    const hour = now.getHours();
    if (hour >= 7 && hour < 19) return { date: localDateKey(now), shift: "day" };
    if (hour >= 19) return { date: localDateKey(now), shift: "night" };
    return { date: addDaysToDateKey(localDateKey(now), -1), shift: "night" };
  }

  function ensureHandoverSelection() {
    if (!state.handover.date || !state.handover.shift) {
      state.handover = defaultHandoverSelection();
    }
    return state.handover;
  }

  function shiftWindow(selection = ensureHandoverSelection()) {
    const startHour = selection.shift === "day" ? 7 : 19;
    const endHour = selection.shift === "day" ? 19 : 7;
    const endDate = selection.shift === "day" ? selection.date : addDaysToDateKey(selection.date, 1);
    return {
      date: selection.date,
      shift: selection.shift,
      start: new Date(`${selection.date}T${String(startHour).padStart(2, "0")}:00:00`),
      end: new Date(`${endDate}T${String(endHour).padStart(2, "0")}:00:00`),
      label: selection.shift === "day" ? "Turno Dia — 07:00 às 19:00" : "Turno Noite — 19:00 às 07:00"
    };
  }

  function timestampInWindow(value, window) {
    if (!value) return false;
    const time = new Date(value).getTime();
    return Number.isFinite(time) && time >= window.start.getTime() && time < window.end.getTime();
  }

  function handoverSnapshot(selection = ensureHandoverSelection()) {
    const d = state.data;
    const window = shiftWindow(selection);

    const completedOperations = d.operations.filter(op =>
      op.status === "Concluída" && timestampInWindow(op.end_at || op.updated_at, window)
    );

    const activeOperations = d.operations.filter(op => {
      if (["Concluída", "Cancelada"].includes(op.status)) return false;
      const start = op.start_at ? new Date(op.start_at).getTime() : new Date(op.created_at).getTime();
      return Number.isFinite(start) && start < window.end.getTime();
    });

    const events = d.operationEvents.filter(item => timestampInWindow(item.event_time, window));
    const tankMovements = d.tankMovements.filter(item => timestampInWindow(item.created_at, window));
    const trucks = d.trucks.filter(item =>
      timestampInWindow(item.created_at, window) ||
      (!item.created_at && recordDateKey(item.date) === selection.date)
    );
    const qhse = d.qhse.filter(item =>
      timestampInWindow(item.created_at, window) ||
      (!item.created_at && recordDateKey(item.date) === selection.date)
    );
    const maintenanceOpened = d.maintenanceOrders.filter(item => timestampInWindow(item.opened_at, window));
    const maintenanceClosed = d.maintenanceOrders.filter(item => timestampInWindow(item.closed_at, window));

    const pendingCompleted = d.handoverPendings.filter(item =>
      item.status === "Concluído" && timestampInWindow(item.completed_at, window)
    );
    const openPendings = d.handoverPendings.filter(item =>
      ["Pendente", "Em andamento"].includes(item.status) &&
      new Date(item.created_at).getTime() < window.end.getTime()
    );

    const openQhseActions = d.actionItems.filter(item => item.status !== "Concluído");
    const openMaintenance = d.maintenanceOrders.filter(item => !["Concluída", "Fechada", "Cancelada"].includes(item.status));
    const note = d.handoverNotes.find(item => item.shift_date === selection.date && item.shift_type === selection.shift);

    return {
      selection, window, completedOperations, activeOperations, events,
      tankMovements, trucks, qhse, maintenanceOpened, maintenanceClosed,
      pendingCompleted, openPendings, openQhseActions, openMaintenance,
      observations: note?.observations || "", note
    };
  }


  const SHIFT_CHECKLIST_TEMPLATE = [
    ["tank_inventory","Conferir volumes, produtos e lotes dos tanques e silos","Operacional"],
    ["pumps","Inspecionar bombas, compressores e equipamentos em operação","Equipamentos"],
    ["chemical_inventory","Conferir insumos e estoque químico crítico","Inventário"],
    ["documents","Atualizar OS, RFF, relatórios e controles","Documentação"],
    ["qhse","Verificar ocorrências, ações QHSE e condições inseguras","QHSE"],
    ["housekeeping","Manter sala e áreas operacionais organizadas","Housekeeping"],
    ["handover","Registrar operações em andamento e pendências do próximo turno","Passagem"]
  ];

  function selectedHandoverApproval(selection=ensureHandoverSelection()) {
    return (state.data.handoverApprovals || []).find(item=>item.shift_date===selection.date&&item.shift_type===selection.shift)||null;
  }

  function checklistForShift(selection=ensureHandoverSelection()) {
    const saved=(state.data.shiftChecklist || []).filter(item=>item.shift_date===selection.date&&item.shift_type===selection.shift);
    return SHIFT_CHECKLIST_TEMPLATE.map(([key,label,category])=>saved.find(item=>item.item_key===key)||{item_key:key,item_label:label,category,completed:false,notes:""});
  }

  function handoverApprovalCard(selection,snapshot) {
    const approval=selectedHandoverApproval(selection); const locked=approval?.status==="Aprovada";
    const delivered=state.data.users.find(u=>u.id===approval?.delivered_by)?.name||"-";
    const received=state.data.users.find(u=>u.id===approval?.received_by)?.name||"-";
    return `<div class="card handover-approval-card ${locked?"approved":""}"><div><small>Controle da passagem</small><h3>${approval?.sequence_no?`Passagem nº ${String(approval.sequence_no).padStart(5,"0")}`:"Passagem ainda não entregue"}</h3><p>${approval?`Status: ${approval.status}`:"Revise o checklist e entregue ao próximo turno."}</p></div><div class="handover-approval-people"><span>Entregue por<strong>${esc(delivered)}</strong><small>${dateTime(approval?.delivered_at)}</small></span><span>Recebida por<strong>${esc(received)}</strong><small>${dateTime(approval?.received_at)}</small></span></div><div class="row-actions">${!locked&&canManageHandover()?`<button class="btn primary" data-action="deliver-handover">Entregar passagem</button>`:""}${approval?.status==="Entregue"&&canApproveHandover()?`<button class="btn primary" data-action="approve-handover">Confirmar recebimento</button>`:""}${locked&&hasRole(["supervisor"])?`<button class="btn secondary" data-action="reopen-handover">Reabrir</button>`:""}${approval?.snapshot_text?`<button class="btn secondary" data-action="view-approved-handover">Ver versão entregue</button>`:""}</div></div>`;
  }

  function shiftChecklistHtml(selection=ensureHandoverSelection()) {
    const approval=selectedHandoverApproval(selection); const locked=approval?.status==="Aprovada"&&!hasRole(["supervisor"]);
    const items=checklistForShift(selection); const done=items.filter(x=>x.completed).length;
    return `<div class="card shift-checklist-card"><div class="kpi-row"><div><h3>Checklist do turno</h3><span class="muted">${done} de ${items.length} itens concluídos</span></div>${badge(done===items.length?"Concluído":"Pendente")}</div><div class="checklist-progress"><span style="width:${done/items.length*100}%"></span></div><div class="shift-checklist-list">${items.map(item=>`<label class="shift-checklist-row ${item.completed?"done":""}"><input type="checkbox" data-shift-checklist="${esc(item.item_key)}" ${item.completed?"checked":""} ${locked?"disabled":""}><span><strong>${esc(item.item_label)}</strong><small>${esc(item.category)}</small></span><input class="checklist-note" data-shift-checklist-note="${esc(item.item_key)}" value="${esc(item.notes||"")}" placeholder="Observação" ${locked?"disabled":""}></label>`).join("")}</div></div>`;
  }

  function periodStats(days,offsetDays=0) {
    const end=new Date(); end.setHours(23,59,59,999); end.setDate(end.getDate()-offsetDays);
    const start=new Date(end); start.setDate(start.getDate()-days+1); start.setHours(0,0,0,0);
    const ops=state.data.operations.filter(op=>{const d=new Date(op.end_at||op.start_at||op.created_at);return d>=start&&d<=end&&op.status==="Concluída"});
    const trucks=state.data.trucks.filter(t=>{const d=new Date(`${t.date}T12:00:00`);return d>=start&&d<=end});
    return { operations:ops.length, bbl:ops.filter(o=>o.unit==="bbl").reduce((s,o)=>s+Number(o.executed||0),0), ton:ops.filter(o=>o.unit==="ton").reduce((s,o)=>s+Number(o.executed||0),0), trucks:trucks.length, downtime:ops.reduce((s,o)=>s+Number(o.paused_minutes||0),0)/60 };
  }

  function metricComparison(label,current,previous,suffix="") {
    const diff=previous?((current-previous)/previous*100):(current?100:0); const arrow=diff>0?"↑":diff<0?"↓":"→";
    return `<div class="metric-comparison"><span>${esc(label)}</span><strong>${fmt.format(current)}${suffix}</strong><small class="${diff<0?"down":diff>0?"up":""}">${arrow} ${fmt.format(Math.abs(diff))}% contra período anterior</small></div>`;
  }


  function handoverPendingForm(item = {}) {
    return `<form id="handoverPendingForm" data-id="${item.id || ""}">
      <div class="form-grid">
        <div><label>Categoria</label><select name="category">${["Operação","Logística","Tancagem","QHSE","Manutenção","Documentação","Outro"].map(x => `<option ${item.category === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>
        <div><label>Prioridade</label><select name="priority">${["Baixa","Normal","Alta","Crítica"].map(x => `<option ${item.priority === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>
        <div class="wide"><label>Pendência *</label><input name="title" required value="${esc(item.title || "")}" placeholder="Ex.: Atualizar lote da RFF"></div>
        <div class="wide"><label>Descrição</label><textarea name="description">${esc(item.description || "")}</textarea></div>
        <div><label>Responsável</label><input name="responsible" value="${esc(item.responsible || "")}"></div>
        <div><label>Prazo</label><input name="due_at" type="datetime-local" value="${toLocalInput(item.due_at)}"></div>
        <div><label>Status</label><select name="status">${["Pendente","Em andamento","Concluído","Cancelado"].map(x => `<option ${item.status === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>
      </div>
      ${formActions(item.id ? "Salvar pendência" : "Adicionar pendência")}
    </form>`;
  }

  function handoverSection(title, items, renderer, emptyText) {
    return `<section class="handover-section"><h3>${title}</h3>${items.length ? `<ol>${items.map(renderer).join("")}</ol>` : `<p class="handover-empty">${emptyText}</p>`}</section>`;
  }

  function handoverSheetHtml(snapshot) {
    const s = snapshot;
    const generated = new Date();
    const operationItems = s.completedOperations.map(op => ({
      title: `${op.activity} de ${op.product}`,
      detail: `${op.client} • ${op.vessel}${op.rig ? ` • Sonda ${op.rig}` : ""}${op.well ? ` • Poço ${op.well}` : ""}${op.ticketNumber ? ` • Ticket ${op.ticketNumber}` : ""} • ${fmt.format(op.executed)} ${op.unit}${op.service_order ? ` • OS ${op.service_order}` : ""}`
    }));
    const eventItems = s.events.map(item => ({
      title: item.title,
      detail: `${dateTime(item.event_time)}${item.description ? ` • ${item.description}` : ""}`
    }));
    const movementItems = s.tankMovements.map(item => {
      const source = state.data.tanks.find(t => t.id === item.source_tank_id)?.name;
      const destination = state.data.tanks.find(t => t.id === item.destination_tank_id)?.name;
      const route = source && destination ? `${source} → ${destination}` : source ? `Saída de ${source}` : destination ? `Entrada em ${destination}` : item.movement_type;
      return { title: `${route}: ${fmt.format(item.quantity)} ${item.unit}`, detail: `${item.product || "-"}${item.lot ? ` • lote ${item.lot}` : ""}` };
    });
    const truckItems = s.trucks.map(item => ({
      title: `${item.movement} — ${item.product}`,
      detail: `${fmt.format(item.quantity)} ${item.unit} • ${item.supplier || item.client || "-"}${item.invoice ? ` • NF ${item.invoice}` : ""}${item.plate ? ` • ${item.plate}` : ""}`
    }));
    const qhseItems = s.qhse.map(item => ({ title: `${item.type}: ${item.title}`, detail: `${item.responsible || "Sem responsável"} • ${item.status}` }));
    const maintenanceItems = [
      ...s.maintenanceOpened.map(item => ({ title: `OS aberta: ${item.title}`, detail: `${item.responsible || "Sem responsável"} • ${item.status}` })),
      ...s.maintenanceClosed.map(item => ({ title: `OS concluída: ${item.title}`, detail: `${item.responsible || "Sem responsável"}` })),
      ...s.pendingCompleted.map(item => ({ title: `Pendência concluída: ${item.title}`, detail: `${item.responsible || "Sem responsável"} • ${item.category}` }))
    ];
    const pendingItems = [
      ...s.activeOperations.map(op => ({ title: `Operação em andamento: ${op.activity} de ${op.product}`, detail: `${op.client} • ${op.vessel}${op.rig ? ` • Sonda ${op.rig}` : ""}${op.well ? ` • Poço ${op.well}` : ""}${op.ticketNumber ? ` • Ticket ${op.ticketNumber}` : ""} • ${fmt.format(op.executed)}/${fmt.format(op.planned)} ${op.unit}` })),
      ...s.openPendings.map(item => ({ title: item.title, detail: `${item.category} • ${item.responsible || "Sem responsável"} • ${item.priority}` })),
      ...s.openMaintenance.map(item => ({ title: `Manutenção: ${item.title}`, detail: `${item.responsible || "Sem responsável"} • ${item.status}` })),
      ...s.openQhseActions.map(item => ({ title: `QHSE: ${item.title}`, detail: `${item.responsible || "Sem responsável"} • prazo ${dateOnly(item.due_date)}` }))
    ];

    const itemRenderer = item => `<li><strong>${esc(item.title)}</strong><span>${esc(item.detail || "")}</span></li>`;

    return `<article class="handover-sheet" id="handoverSheet">
      <header class="handover-print-header">
        <div><span class="handover-logo">OC</span></div>
        <div><h1>PASSAGEM DE SERVIÇO</h1><p>B-Port LMP — OpsControl IA</p></div>
        <div class="handover-print-meta"><strong>${dateOnly(s.selection.date)}</strong><span>${esc(s.window.label)}</span>${selectedHandoverApproval(s.selection)?.sequence_no?`<span>Passagem nº ${String(selectedHandoverApproval(s.selection).sequence_no).padStart(5,"0")} • ${esc(selectedHandoverApproval(s.selection).status)}</span>`:""}<small>Gerado em ${generated.toLocaleString("pt-BR")}</small></div>
      </header>

      <div class="handover-summary-grid">
        <div><span>Operações concluídas</span><strong>${s.completedOperations.length}</strong></div>
        <div><span>Eventos registrados</span><strong>${s.events.length}</strong></div>
        <div><span>Movimentações</span><strong>${s.tankMovements.length}</strong></div>
        <div><span>Pendências abertas</span><strong>${pendingItems.length}</strong></div>
      </div>

      ${handoverSection("1. Operações concluídas no turno", operationItems, itemRenderer, "Nenhuma operação concluída no período.")}
      ${handoverSection("2. Eventos e atividades registradas", eventItems, itemRenderer, "Nenhum evento registrado no período.")}
      ${handoverSection("3. Movimentações de tanques e silos", movementItems, itemRenderer, "Nenhuma movimentação de tancagem registrada.")}
      ${handoverSection("4. Movimentações de carretas", truckItems, itemRenderer, "Nenhuma carreta registrada no período.")}
      ${handoverSection("5. QHSE e manutenção", [...qhseItems, ...maintenanceItems], itemRenderer, "Nenhuma atividade QHSE ou de manutenção registrada.")}
      ${handoverSection("6. Pendências para o próximo turno", pendingItems, itemRenderer, "Nenhuma pendência identificada.")}
      <section class="handover-section"><h3>7. Checklist do turno</h3><ol>${checklistForShift(s.selection).map(item=>`<li><strong>${item.completed?"☑":"☐"} ${esc(item.item_label)}</strong>${item.notes?`<span>${esc(item.notes)}</span>`:""}</li>`).join("")}</ol></section>

      <section class="handover-section observations"><h3>8. Observações</h3><p>${esc(s.observations || "Manter os controles atualizados, a sala organizada e registrar todas as alterações no OpsControl IA.")}</p></section>

      <footer class="handover-signatures">
        <div><span>Responsável pelo turno</span><strong>${esc(state.data.profile.name)}</strong></div>
        <div><span>Recebido por</span><strong>________________________________</strong></div>
      </footer>
    </article>`;
  }

  function handoverText(selection = ensureHandoverSelection()) {
    const s = handoverSnapshot(selection);
    const lines = [
      "> PASSAGEM DE SERVIÇO",
      `> Data: ${dateOnly(selection.date)} | ${s.window.label}`,
      ""
    ];
    let number = 1;

    const add = text => lines.push(`${number++}. ${text}`);
    s.completedOperations.forEach(op => add(`${op.activity} de ${op.product} concluído — ${op.client} / ${op.vessel} — ${fmt.format(op.executed)} ${op.unit}`));
    s.events.forEach(item => add(`${item.title}${item.description ? ` — ${item.description}` : ""}`));
    s.trucks.forEach(item => add(`${item.movement} de carreta — ${item.product} — ${fmt.format(item.quantity)} ${item.unit}${item.invoice ? ` — NF ${item.invoice}` : ""}`));
    s.qhse.forEach(item => add(`${item.type}: ${item.title} — ${item.status}`));
    s.maintenanceClosed.forEach(item => add(`Manutenção concluída: ${item.title}`));
    s.pendingCompleted.forEach(item => add(`Pendência concluída: ${item.title}`));

    if (number === 1) lines.push("• Nenhuma atividade concluída ou registrada no turno.");

    lines.push("", "*Operações em andamento:*");
    s.activeOperations.forEach(op => lines.push(`• ${op.client} | ${op.vessel} | ${op.activity} de ${op.product} | ${fmt.format(op.executed)}/${fmt.format(op.planned)} ${op.unit} | ${op.status}`));
    if (!s.activeOperations.length) lines.push("• Nenhuma operação em andamento.");

    lines.push("", "*Pendências:*");
    s.openPendings.forEach(item => lines.push(`• [${item.priority}] ${item.title} — ${item.responsible || "Sem responsável"} — ${item.status}`));
    s.openMaintenance.forEach(item => lines.push(`• Manutenção: ${item.title} — ${item.responsible || "Sem responsável"} — ${item.status}`));
    s.openQhseActions.forEach(item => lines.push(`• QHSE: ${item.title} — ${item.responsible || "Sem responsável"} — prazo ${dateOnly(item.due_date)}`));
    if (!s.openPendings.length && !s.openMaintenance.length && !s.openQhseActions.length) lines.push("• Nenhuma pendência.");

    lines.push("", "*Observações:*");
    lines.push(s.observations || "Manter os controles atualizados, a sala organizada e registrar todas as alterações no OpsControl IA.");
    return lines.join("\n");
  }



  function currentClosing(date = state.closing.date || localDateKey(), shift = state.closing.shift || "day") {
    return (state.data.closings || []).find(item => item.date === date && item.shift === shift) || null;
  }

  function closingForm(date = localDateKey(), shift = "day") {
    const closing = currentClosing(date,shift);
    const tankRows = state.data.tanks.map(item => `<div class="closing-count-row"><span><strong>${esc(item.name)}</strong><small>${esc(item.product || "Vazio")} • teórico ${fmt.format(item.volume)} ${esc(item.unit)}</small></span><input data-closing-count data-item-type="tank" data-item-id="${item.id}" data-unit="${esc(item.unit)}" inputmode="decimal" placeholder="${String(item.volume).replace(".",",")}"></div>`).join("");
    const chemicalRows = state.data.chemicals.map(item => `<div class="closing-count-row"><span><strong>${esc(item.name)}</strong><small>Lote ${esc(item.lot || "-")} • teórico ${fmt.format(item.quantity)} ${esc(item.unit)}</small></span><input data-closing-count data-item-type="chemical" data-item-id="${item.id}" data-unit="${esc(item.unit)}" inputmode="decimal" placeholder="${String(item.quantity).replace(".",",")}"></div>`).join("");
    return `<form id="closingForm"><div class="form-grid"><div><label>Data *</label><input name="date" type="date" value="${date}" required></div><div><label>Turno *</label><select name="shift"><option value="day" ${shift==="day"?"selected":""}>Dia — 07h às 19h</option><option value="night" ${shift==="night"?"selected":""}>Noite — 19h às 07h</option></select></div><div class="wide"><label>Observações</label><textarea name="notes">${esc(closing?.notes || "")}</textarea></div></div>
      <div class="closing-tools"><button type="button" class="btn secondary" data-action="fill-closing-theoretical">Preencher com saldos teóricos</button><span>Deixe em branco o item que não foi contado fisicamente.</span></div>
      <details open class="closing-count-group"><summary>Tanques e silos (${state.data.tanks.length})</summary><div>${tankRows}</div></details>
      <details class="closing-count-group"><summary>Inventário químico (${state.data.chemicals.length})</summary><div>${chemicalRows}</div></details>
      ${formActions("Fechar turno e salvar conciliação")}</form>`;
  }

  function collectClosingCounts(form) {
    return [...form.querySelectorAll("[data-closing-count]")].map(input => {
      const value = parseOptionalDecimal(input.value);
      if (Number.isNaN(value)) throw new Error("Existe uma contagem física inválida.");
      if (value === null) return null;
      if (value < 0) throw new Error("A contagem física não pode ser negativa.");
      return {item_type:input.dataset.itemType,item_id:input.dataset.itemId,measured_quantity:value,unit:input.dataset.unit};
    }).filter(Boolean);
  }

  function closingDetails(closing) {
    if (!closing) return `<div class="card empty">Nenhum fechamento realizado.</div>`;
    const items=(state.data.closingItems || []).filter(item => item.closingId===closing.id);
    const divergent=items.filter(item => item.status==="Divergente");
    const counted=items.filter(item => item.measured!==null);
    const rows=items.filter(item => item.status!=="Conferido").slice(0,30).map(item => `<tr><td>${esc(item.itemName)}</td><td>${esc(item.itemType==="tank"?"Tancagem":"Químico")}</td><td>${fmt.format(item.theoretical)} ${esc(item.unit)}</td><td>${item.measured===null?"Não contado":`${fmt.format(item.measured)} ${esc(item.unit)}`}</td><td>${item.variance===null?"-":`${fmt.format(item.variance)} ${esc(item.unit)}`}</td><td>${badge(item.status)}</td></tr>`).join("");
    return `<div class="card closing-detail-card"><div class="kpi-row"><div><h3>${dateOnly(closing.date)} • ${closing.shift==="day"?"Dia":"Noite"}</h3><span class="muted">Fechado em ${dateTime(closing.closedAt)}</span></div>${badge(closing.status)}</div><div class="closing-summary-grid"><span>Contados<strong>${counted.length}/${items.length}</strong></span><span>Divergências<strong>${divergent.length}</strong></span><span>Operações concluídas<strong>${closing.summary.operations_completed || 0}</strong></span><span>Carretas<strong>${closing.summary.trucks || 0}</strong></span></div>${closing.notes?`<p>${esc(closing.notes)}</p>`:""}<div class="table-wrap"><table class="data-table"><thead><tr><th>Item</th><th>Tipo</th><th>Teórico</th><th>Contado</th><th>Diferença</th><th>Status</th></tr></thead><tbody>${rows||`<tr><td colspan="6" class="empty">Todos os itens contados estão conferidos.</td></tr>`}</tbody></table></div><div class="row-actions">${hasRole(["admin","supervisor"])&&closing.status==="Fechado"?`<button class="btn small danger" data-reopen-closing="${closing.id}">Reabrir fechamento</button>`:""}<button class="btn small secondary" data-export-closing="${closing.id}">Exportar conciliação</button></div></div>`;
  }

  function renderClosingPanel() {
    const latest=(state.data.closings || [])[0] || null;
    const cards=(state.data.closings || []).slice(0,8).map(item => `<button class="closing-history-button" data-view-closing="${item.id}"><span>${dateOnly(item.date)} • ${item.shift==="day"?"Dia":"Noite"}</span>${badge(item.status)}</button>`).join("");
    return `<div class="section-title">Fechamento diário operacional</div><div class="closing-layout"><div><div class="card closing-action-card"><div><small>CONTROLE DO TURNO</small><h3>Fechar operações e conciliar estoques</h3><p>Registra operações, carretas, movimentações, saldo teórico e contagem física.</p></div>${hasRole(["supervisor","lider"])?`<button class="btn primary" data-action="new-closing">Preparar fechamento</button>`:""}</div>${closingDetails(latest)}</div><aside class="card"><h3>Fechamentos recentes</h3><div class="closing-history-list">${cards||`<div class="empty">Nenhum fechamento.</div>`}</div></aside></div>`;
  }

  function latestClosingReconciliationPanel() {
    const closing=(state.data.closings || []).find(item => item.status==="Fechado") || (state.data.closings || [])[0];
    if(!closing) return `<div class="section-title">Conciliação física</div><div class="card empty">Faça o primeiro fechamento diário para comparar saldo teórico e contagem física.</div>`;
    const items=(state.data.closingItems || []).filter(item => item.closingId===closing.id);
    const divergent=items.filter(item => item.status==="Divergente");
    const notCounted=items.filter(item => item.status==="Não contado");
    return `<div class="section-title">Conciliação física mais recente</div><div class="grid three reconciliation-grid"><div class="card reconciliation-card"><span>Data / turno</span><strong>${dateOnly(closing.date)}</strong><small>${closing.shift==="day"?"Dia":"Noite"} • ${closing.status}</small></div><div class="card reconciliation-card"><span>Divergências</span><strong>${divergent.length}</strong><small>diferença entre teórico e contado</small></div><div class="card reconciliation-card"><span>Não contados</span><strong>${notCounted.length}</strong><small>itens sem contagem física</small></div></div>${divergent.length?`<div class="quality-issues-grid">${divergent.slice(0,12).map(item => `<article class="card quality-issue-card red"><div class="quality-issue-top"><span>CONCILIAÇÃO</span>${badge("Alta")}</div><h3>${esc(item.itemName)}</h3><p>Teórico ${fmt.format(item.theoretical)}; contado ${fmt.format(item.measured)}; diferença ${fmt.format(item.variance)} ${esc(item.unit)}.</p></article>`).join("")}</div>`:""}`;
  }

  function renderReports() {
    const selection=ensureHandoverSelection(); const snapshot=handoverSnapshot(selection); const approval=selectedHandoverApproval(selection);
    const locked=approval?.status==="Aprovada"&&!hasRole(["supervisor"]);
    const operations = state.data.operations || [];
    const trucks = state.data.trucks || [];
    const closings = state.data.closings || [];
    const openOperations = operations.filter(item => !["Concluída","Cancelada","Encerrada"].includes(item.status)).length;
    const openPendings = snapshot.openPendings.length;
    const latestClosing = closings[0] || null;
    const pendingOffline = offlineQueue().length;
    const reportCard=(title,description,page,exportKind="")=>`<div class="card report-card"><h3>${title}</h3><p>${description}</p><div class="row-actions"><button class="btn primary" data-print-page="${page}">Gerar / Imprimir</button>${exportKind?`<button class="btn secondary" data-export="${exportKind}">Exportar CSV</button>`:""}</div></div>`;
    const pendingCards=snapshot.openPendings.map(item=>`<div class="handover-pending-card"><div><span>${badge(item.priority)}</span><small>${esc(item.category)}</small><h4>${esc(item.title)}</h4><p>${esc(item.description||"Sem descrição")}</p><footer><span>${esc(item.responsible||"Sem responsável")}</span><span>${item.due_at?dateTime(item.due_at):"Sem prazo"}</span></footer></div>${canManageHandover()?`<div class="row-actions"><button class="btn small secondary" data-edit-handover-pending="${item.id}">Editar</button><button class="btn small primary" data-toggle-handover-pending="${item.id}">Concluir</button>${canDeleteHandoverPending()?`<button class="btn small danger" data-delete-handover-pending="${item.id}">Excluir</button>`:""}</div>`:""}</div>`).join("");
    const week=periodStats(7),prevWeek=periodStats(7,7),month=periodStats(30),prevMonth=periodStats(30,30);
    $("#page-reports").innerHTML=header("Central de relatórios","Passagem de turno, fechamento, indicadores, conciliação e exportações gerenciais.",`<button class="btn secondary" data-action="copy-handover">Copiar passagem</button><button class="btn primary" data-action="print-handover">Imprimir passagem</button>`)+
      `<section class="reports-kpi-grid">${statCard("Operações abertas", fmt.format(openOperations), "em execução ou programadas", uiIcon("activity"), "Visão operacional", "blue")}${statCard("Pendências do turno", fmt.format(openPendings), "aguardando conclusão", uiIcon("alert"), "Passagem de serviço", "orange")}${statCard("Fechamentos", fmt.format(closings.length), latestClosing ? `Último: ${dateOnly(latestClosing.date)}` : "Nenhum realizado", uiIcon("check"), "Conciliação diária", "green")}${statCard("Fila offline", fmt.format(pendingOffline), "aguardando sincronização", uiIcon("cloud"), pendingOffline ? "Requer sincronização" : "Sistema sincronizado", pendingOffline ? "red" : "purple")}</section>
       <section class="reports-command-grid no-print"><div class="card reports-command-card"><span>${uiIcon("file")}</span><div><small>PASSAGEM DE TURNO</small><h3>Resumo operacional automático</h3><p>Consolida operações, carretas, QHSE, manutenção e pendências.</p></div><button class="btn secondary" data-action="copy-handover">Copiar</button></div><div class="card reports-command-card"><span>${uiIcon("check")}</span><div><small>FECHAMENTO</small><h3>Conciliação física e teórica</h3><p>Confere tancagem, inventário, operações e movimentações do turno.</p></div>${hasRole(["supervisor","lider"])?`<button class="btn primary" data-action="new-closing">Preparar</button>`:`<button class="btn secondary" data-page-link="reports">Consultar</button>`}</div><div class="card reports-command-card"><span>${uiIcon("download")}</span><div><small>EXPORTAÇÕES</small><h3>Dados para análise gerencial</h3><p>CSV, impressão e backup completo dos principais módulos.</p></div><button class="btn secondary" data-export="operations">Exportar</button></div></section>
       ${renderClosingPanel()}${handoverApprovalCard(selection,snapshot)}
       <div class="card handover-controls no-print"><div class="handover-control-copy"><strong>Passagem automática do turno</strong><span>Operações, eventos, movimentações, carretas, QHSE e manutenção.</span></div><div><label>Data do turno</label><input id="handoverDate" type="date" value="${esc(selection.date)}"></div><div><label>Turno</label><select id="handoverShift"><option value="day" ${selection.shift==="day"?"selected":""}>Dia — 07h às 19h</option><option value="night" ${selection.shift==="night"?"selected":""}>Noite — 19h às 07h</option></select></div><button class="btn secondary" data-action="apply-handover-filter">Atualizar período</button>${canManageHandover()&&!locked?`<button class="btn primary" data-action="new-handover-pending">+ Adicionar pendência</button>`:""}</div>
       <div class="handover-layout"><div>${handoverSheetHtml(snapshot)}</div><aside class="handover-side no-print"><div class="card"><h3>Observações do turno</h3><p>Incluídas na impressão e na cópia para WhatsApp.</p><textarea id="handoverObservations" rows="7" ${locked?"disabled":""}>${esc(snapshot.observations)}</textarea>${canManageHandover()&&!locked?`<button class="btn primary full" data-action="save-handover-note">Salvar observações</button>`:""}</div>${shiftChecklistHtml(selection)}<div class="card"><div class="kpi-row"><div><h3>Pendências manuais</h3><span class="muted">Continuam abertas até a conclusão.</span></div>${badge(snapshot.openPendings.length)}</div><div class="handover-pending-list">${pendingCards||`<div class="empty">Nenhuma pendência manual aberta.</div>`}</div></div></aside></div>
       <div class="section-title no-print">Indicadores comparativos</div><div class="grid two no-print"><div class="card"><h3>Últimos 7 dias</h3><div class="metric-grid">${metricComparison("Operações",week.operations,prevWeek.operations)}${metricComparison("Volume de fluidos",week.bbl,prevWeek.bbl," bbl")}${metricComparison("Granéis",week.ton,prevWeek.ton," ton")}${metricComparison("Carretas",week.trucks,prevWeek.trucks)}</div></div><div class="card"><h3>Últimos 30 dias</h3><div class="metric-grid">${metricComparison("Operações",month.operations,prevMonth.operations)}${metricComparison("Volume de fluidos",month.bbl,prevMonth.bbl," bbl")}${metricComparison("Granéis",month.ton,prevMonth.ton," ton")}${metricComparison("Horas paradas",month.downtime,prevMonth.downtime," h")}</div></div></div>
       <div class="section-title no-print">Exportação e backup</div><div class="grid three no-print"><div class="card report-card"><h3>Backup completo</h3><p>Dados operacionais em JSON para guarda externa.</p><button class="btn primary" data-action="backup-json">Baixar backup</button></div><div class="card report-card"><h3>Auditoria</h3><p>Alterações de usuários e registros.</p><button class="btn secondary" data-page-link="audit">Abrir auditoria</button></div><div class="card report-card"><h3>Fila offline</h3><p>${offlineQueue().length} registro(s) aguardando sincronização.</p><button class="btn secondary" data-action="sync-offline">Sincronizar agora</button></div></div>
       <div class="section-title no-print">Outros relatórios</div><div class="grid two no-print">${reportCard("Relatório gerencial","KPIs, clientes, produtos, riscos e produtividade.","dashboard","operations")}${reportCard("Operações","Vazão, volume, paralisações e tancagem.","operations","operations")}${reportCard("Inventário de tancagem","Produto, lote, volume e capacidade.","tanks","tanks")}${reportCard("QHSE","Registros, severidades e itens de ação.","qhse")}${reportCard("Manutenção","Equipamentos, diesel e ordens.","maintenance","maintenance")}${reportCard("Carretas","Entradas, saídas, NF, placa e motorista.","trucks","trucks")}</div>`;
  }



  function auditChangeSummary(item) {
    const before=item.old_data||{},after=item.new_data||{}; const keys=[...new Set([...Object.keys(before),...Object.keys(after)])].filter(k=>JSON.stringify(before[k])!==JSON.stringify(after[k])).slice(0,6);
    return keys.map(key=>`${key}: ${before[key]??"-"} → ${after[key]??"-"}`).join(" | ")||"Registro criado/removido";
  }

  function renderAudit() {
    const page=$("#page-audit"); if(!page)return;
    if(!canViewAudit()){page.innerHTML=header("Auditoria","Acesso restrito.")+`<div class="card empty">Somente administração e supervisão podem consultar a auditoria.</div>`;return;}
    const auditLogs = state.data.auditLogs || [];
    const userName = item => state.data.users.find(u=>u.id===item.changed_by)?.name||"Sistema";
    const todayKey = new Date().toISOString().slice(0,10);
    const todayCount = auditLogs.filter(item => String(item.created_at||"").slice(0,10)===todayKey).length;
    const createCount = auditLogs.filter(item => /insert|create|criad/i.test(item.action||"")).length;
    const updateCount = auditLogs.filter(item => /update|edit|alter/i.test(item.action||"")).length;
    const moduleCounts = auditLogs.reduce((acc,item)=>{const key=item.table_name||"Sistema";acc[key]=(acc[key]||0)+1;return acc;},{});
    const topModules = Object.entries(moduleCounts).sort((a,b)=>b[1]-a[1]).slice(0,6);
    const moduleBars = topModules.map(([name,count])=>`<div class="audit-module-row"><span>${esc(name)}</span><div><i style="width:${auditLogs.length?Math.max(8,Math.round(count/auditLogs.length*100)):0}%"></i></div><strong>${count}</strong></div>`).join("");
    const recent = auditLogs.slice(0,6).map(item=>`<article class="audit-activity-card"><span>${uiIcon("history")}</span><div><strong>${esc(userName(item))}</strong><small>${esc(item.table_name||"Sistema")} • ${dateTime(item.created_at)}</small><p>${esc(auditChangeSummary(item))}</p></div>${badge(item.action)}</article>`).join("");
    const rows=auditLogs.map(item=>`<tr><td>${dateTime(item.created_at)}</td><td><strong>${esc(userName(item))}</strong></td><td>${esc(item.table_name)}</td><td>${badge(item.action)}</td><td>${esc(item.record_id||"-")}</td><td><small>${esc(auditChangeSummary(item))}</small></td></tr>`).join("");
    const mobileAudit=auditLogs.map(item=>`<article class="card mobile-record-card audit-mobile-card"><div class="mobile-record-head"><div><strong>${esc(userName(item))}</strong><small>${dateTime(item.created_at)}</small></div>${badge(item.action)}</div><div class="mobile-record-grid"><span>Módulo<strong>${esc(item.table_name)}</strong></span><span>Registro<strong>${esc(item.record_id||"-")}</strong></span></div><p>${esc(auditChangeSummary(item))}</p></article>`).join("");
    page.innerHTML=header("Central de auditoria","Rastreabilidade completa de alterações, usuários, módulos e registros.",`<button class="btn secondary" data-export="audit">Exportar CSV</button>`)+
      `<section class="audit-professional-kpis">${statCard("Alterações carregadas",fmt.format(auditLogs.length),"registros de auditoria",uiIcon("history"),"Histórico completo","blue")}${statCard("Alterações hoje",fmt.format(todayCount),"eventos no dia atual",uiIcon("activity"),"Monitoramento diário","purple")}${statCard("Criações",fmt.format(createCount),"novos registros",uiIcon("plus"),"Inclusões rastreadas","green")}${statCard("Atualizações",fmt.format(updateCount),"registros modificados",uiIcon("edit"),"Mudanças rastreadas","orange")}</section>
       <section class="audit-control-grid"><div class="card audit-recent-panel"><div class="professional-section-heading"><div><small>ATIVIDADE RECENTE</small><h3>Últimas alterações registradas</h3></div><span>${auditLogs.length} eventos</span></div><div class="audit-activity-list">${recent||`<div class="empty">Nenhuma atividade registrada.</div>`}</div></div><div class="card audit-modules-panel"><div class="professional-section-heading"><div><small>DISTRIBUIÇÃO</small><h3>Alterações por módulo</h3></div></div><div class="audit-module-list">${moduleBars||`<div class="empty">Sem dados.</div>`}</div></div></section>
       <div class="section-title professional-record-title"><span>Histórico detalhado</span><small>${auditLogs.length} registro(s)</small></div><div class="card table-wrap desktop-record-table professional-table"><table class="data-table"><thead><tr><th>Data</th><th>Usuário</th><th>Módulo</th><th>Ação</th><th>Registro</th><th>Alterações</th></tr></thead><tbody>${rows||`<tr><td colspan="6" class="empty">Nenhuma auditoria disponível.</td></tr>`}</tbody></table></div><div class="mobile-record-list">${mobileAudit||`<div class="card empty">Nenhuma auditoria disponível.</div>`}</div>`;
  }



  function environmentPanel() {
    const current=state.config.environment || "production";
    const staging=CONFIG.environments?.staging || {};
    const configured=Boolean(staging.supabaseUrl && staging.supabaseKey);
    return `<div class="card environment-card"><div class="kpi-row"><div><h3>Ambiente do sistema</h3><p>Produção usa o banco oficial. Homologação precisa de URL e chave próprias em js/config.js.</p></div>${badge(current==="production"?"Produção":"Homologação")}</div><div class="info-box">${configured?"O ambiente de homologação está configurado e pode ser ativado.":"Estrutura pronta, mas o banco de homologação ainda não foi criado/configurado."}</div><div class="row-actions"><button class="btn secondary" data-action="switch-environment" data-environment="${current==="production"?"staging":"production"}" ${current==="production"&&!configured?"disabled":""}>Alternar para ${current==="production"?"Homologação":"Produção"}</button></div></div>`;
  }

  function homologationPanel() {
    const logs = testLog();
    return `<div class="card homologation-card ${state.testMode ? "active" : ""}">
      <div class="homologation-head"><div><span class="homologation-dot"></span><div><h3>Modo de homologação local</h3><p>Use os dados oficiais somente para consulta e simule salvamentos neste aparelho.</p></div></div>${badge(state.testMode ? "Ativo" : "Inativo")}</div>
      <div class="info-box">${state.testMode ? "Nenhum formulário, checklist, transferência ou encerramento será enviado ao banco oficial." : "Ative antes de testar novos fluxos com a equipe."}</div>
      <div class="row-actions"><button class="btn ${state.testMode ? "danger" : "primary"}" data-action="toggle-test-mode">${state.testMode ? "Desativar homologação" : "Ativar homologação"}</button><button class="btn secondary" data-action="export-test-log">Exportar testes (${logs.length})</button>${logs.length ? `<button class="btn secondary" data-action="clear-test-log">Limpar testes</button>` : ""}</div>
    </div>`;
  }

  function feedbackManagementPanel() {
    const items = state.data.feedback || [];
    if (!items.length) return `<div class="card empty">Nenhum feedback recebido.</div>`;
    return `<div class="feedback-management-list">${items.map(item => {
      const user = state.data.users.find(x => x.id === item.created_by)?.name || "Usuário";
      return `<article class="card feedback-card"><div class="mobile-record-head"><div><strong>${esc(item.category)}</strong><small>${esc(user)} • ${dateTime(item.created_at)} • ${esc(item.page)}</small></div>${badge(item.status)}</div><p>${esc(item.message)}</p>${item.rating ? `<span class="feedback-rating">Nota ${item.rating}/5</span>` : ""}</article>`;
    }).join("")}</div>`;
  }

  function renderSettings() {
    const users = state.data?.users || [];
    const userRows = users.map(user => `<tr><td><strong>${esc(user.name)}</strong><br><small>${esc(user.email)}</small></td><td>${badge(user.role)}</td><td>${esc(user.department || "-")}</td><td>${badge(user.active ? "Ativo" : "Inativo")}</td><td>${dateOnly(user.created_at)}</td><td>${isAdmin() ? `<button class="btn small primary" data-edit-user="${user.id}">Gerenciar</button>` : ""}</td></tr>`).join("");
    const mobileUsers = users.map(user => `<article class="card mobile-record-card"><div class="mobile-record-head"><div><strong>${esc(user.name)}</strong><small>${esc(user.email)}</small></div>${badge(user.active ? "Ativo" : "Inativo")}</div><div class="mobile-record-grid"><span>Cargo<strong>${esc(user.role)}</strong></span><span>Setor<strong>${esc(user.department || "-")}</strong></span></div>${isAdmin() ? `<button class="btn primary full" data-edit-user="${user.id}">Gerenciar usuário</button>` : ""}</article>`).join("");
    const lastSync = state.lastSync ? state.lastSync.toLocaleString("pt-BR") : "Não sincronizado";
    const errors = state.data?.systemErrors || [];
    $("#page-settings").innerHTML = header("Configurações", "Perfil, usuários, permissões, diagnóstico e aparência.", `<button class="btn secondary" data-action="toggle-theme">Alternar tema</button>${isAdmin() ? `<button class="btn primary" data-action="new-user">+ Novo usuário</button>` : ""}`) + `<div class="section-title">Ambiente</div>${environmentPanel()}<div class="section-title">Teste seguro</div>${homologationPanel()}<div class="grid two"><div class="card"><h3>Meu perfil</h3><div class="kpi-list" style="margin-top:14px"><div class="kpi-row"><span>Nome</span><strong>${esc(state.data.profile.name)}</strong></div><div class="kpi-row"><span>E-mail</span><strong>${esc(state.data.profile.email)}</strong></div><div class="kpi-row"><span>Cargo</span>${badge(state.data.profile.role)}</div><div class="kpi-row"><span>Departamento</span><strong>${esc(state.data.profile.department || "-")}</strong></div></div></div><div class="card"><h3>Diagnóstico do sistema</h3><div class="kpi-list" style="margin-top:14px"><div class="kpi-row"><span>Última sincronização</span><strong>${esc(lastSync)}</strong></div><div class="kpi-row"><span>Tanques e silos</span><strong>${(state.data.tanks || []).length}</strong></div><div class="kpi-row"><span>Operações</span><strong>${(state.data.operations || []).length}</strong></div><div class="kpi-row"><span>Alertas automáticos</span><strong>${(state.data.systemAlerts || []).length}</strong></div><div class="kpi-row"><span>Erros registrados</span><strong>${errors.length}</strong></div><div class="kpi-row"><span>Fila offline</span><strong>${offlineQueue().length}</strong></div><div class="kpi-row"><span>Backup local</span><strong>${latestLocalBackup()?.created_at ? dateTime(latestLocalBackup().created_at) : "-"}</strong></div></div><div class="row-actions" style="margin-top:12px"><button class="btn primary" data-action="backup-json">Backup JSON</button><button class="btn secondary" data-action="sync-offline">Sincronizar offline</button></div><div class="info-box" style="margin-top:12px">Movimentações automáticas e transferências são executadas por transações no Supabase.</div>${isAdmin() ? `<div class="admin-edit-notice" style="margin-top:12px"><strong>Edição total ativa</strong><span>O administrador pode editar registros operacionais de todos os módulos. Históricos e auditorias permanecem protegidos.</span></div>` : ""}</div></div><div class="section-title">Usuários e permissões</div><div class="card table-wrap desktop-record-table">${isAdmin() ? "" : `<div class="info-box" style="margin-bottom:12px">Somente o administrador pode alterar cargo, setor, status e permissões.</div>`}<table class="data-table"><thead><tr><th>Usuário</th><th>Cargo</th><th>Departamento</th><th>Status</th><th>Cadastro</th><th>Ação</th></tr></thead><tbody>${userRows}</tbody></table></div><div class="mobile-record-list">${mobileUsers || `<div class="card empty">Nenhum usuário disponível.</div>`}</div>${hasRole(["supervisor"]) ? `<div class="section-title">Feedback da versão beta</div>${feedbackManagementPanel()}` : ""}${isAdmin() && errors.length ? `<div class="section-title">Erros recentes</div><div class="card table-wrap"><table class="data-table"><thead><tr><th>Data</th><th>Contexto</th><th>Mensagem</th></tr></thead><tbody>${errors.slice(0,20).map(e => `<tr><td>${dateTime(e.created_at)}</td><td>${esc(e.context || "-")}</td><td>${esc(e.message)}</td></tr>`).join("")}</tbody></table></div>` : ""}`;
  }


  function chemicalForm(item = {}) {
    const editing = Boolean(item.id);
    const lockProduct = item.lockProduct === true;
    const currentProduct = state.data.chemicalProducts.find(product => product.id === item.productId);
    const products = (state.data.chemicalProducts || []).filter(product => product.active || product.id === item.productId);
    const status = item.status || "Disponível";
    return `<form id="chemicalForm" data-id="${item.id || ""}" novalidate>
      <div class="form-grid">
        <div class="wide catalog-linked-field">
          <div class="catalog-linked-heading"><div><label>Produto do Catálogo Químico *</label><small>O nome e a unidade vêm do cadastro oficial.</small></div><button type="button" class="btn small secondary" data-action="open-chemical-catalog">Abrir catálogo</button></div>
          <select name="product_id" required ${lockProduct ? "disabled" : ""}><option value="">Selecione o produto</option>${products.map(product => `<option value="${product.id}" ${product.id === item.productId ? "selected" : ""}>${esc(product.name)}</option>`).join("")}</select>
          ${lockProduct ? `<input type="hidden" name="product_id" value="${esc(item.productId || "")}">` : ""}
          <small class="field-help">${currentProduct ? `${esc(currentProduct.category || "Produto químico")} • ${esc(currentProduct.unit)} • o total será somado automaticamente` : "Selecione um produto cadastrado."}</small>
        </div>
        <div><label>Lote</label><input name="lot" value="${esc(item.lot || "")}"></div>
        ${editing ? `<div><label>Saldo atual</label><input value="${fmt.format(item.quantity)} ${esc(item.unit)}" disabled><small class="field-help">Para alterar o saldo, use Movimentar.</small></div>` : `<div><label>Quantidade inicial</label><input name="quantity" type="text" inputmode="decimal" value="0"></div>`}
        <div><label>Estoque mínimo</label><input name="minimum_quantity" type="text" inputmode="decimal" value="${String(item.minimum || 0).replace(".", ",")}"></div>
        <div><label>Validade</label><input name="expiry_date" type="date" value="${String(item.expiry_date || "").slice(0,10)}"></div>
        <div><label>Localização</label><input name="location" value="${esc(item.location || "")}" placeholder="Ex.: Almoxarifado A"></div>
        <div><label>Fornecedor</label><input name="supplier" value="${esc(item.supplier || "")}"></div>
        <div><label>Status</label><select name="status">${["Disponível","Quarentena","Bloqueado","Vencido","Descartado"].map(value => `<option ${status === value ? "selected" : ""}>${value}</option>`).join("")}</select></div>
        <div class="wide"><label>Observações</label><textarea name="notes">${esc(item.notes || "")}</textarea></div>
        <div class="wide"><label>FISPQ, NF, certificado ou foto</label><input name="attachment" type="file" accept=".pdf,image/jpeg,image/png,image/webp,image/heic,image/heif" multiple capture="environment"></div>
      </div><div id="chemicalSaveMessage" class="message hidden"></div>${formActions(editing ? "Salvar lote" : "Cadastrar lote")}
    </form>`;
  }

  function chemicalMovementForm(item) {
    return `<form id="chemicalMovementForm" data-id="${item.id}" novalidate>
      <div class="info-box">
        <strong>${esc(item.name)}</strong><br>
        Lote: ${esc(item.lot || "-")} • Saldo atual: ${fmt.format(item.quantity)} ${esc(item.unit)}
      </div>
      <div class="form-grid" style="margin-top:12px">
        <div>
          <label>Tipo de movimentação</label>
          <select name="movement_type">
            <option>Entrada</option>
            <option>Saída</option>
            <option>Ajuste</option>
          </select>
        </div>
        <div>
          <label>Quantidade *</label>
          <input name="quantity" type="text" inputmode="decimal" required placeholder="Ex.: 10 ou 10,5">
          <small class="field-help">Em Ajuste, informe o novo saldo físico. O valor pode ser zero.</small>
        </div>
        <div>
          <label>Referência</label>
          <input name="reference" placeholder="NF, OS, inventário ou operação">
        </div>
        <div class="wide">
          <label>Observação</label>
          <textarea name="notes"></textarea>
        </div>
      </div>
      <div id="chemicalMovementMessage" class="message hidden"></div>
      ${formActions("Confirmar movimentação")}
    </form>`;
  }


  function inferredTruckType(item = {}) {
    if (["Bulk","Tank","Plataforma"].includes(item.truckType)) return item.truckType;
    return ["bbl","m³","m3"].includes(String(item.unit || "").toLowerCase()) ? "Tank" : "Bulk";
  }

  function truckCatalogProducts(type = "Bulk", currentId = "") {
    return (state.data?.fluids || [])
      .filter(item => item.active !== false || item.id === currentId)
      .filter(item => {
        const category = String(item.type || "").toLowerCase();
        return type === "Bulk" ? category === "granel" : !["granel","insumo"].includes(category);
      })
      .sort((a,b) => a.name.localeCompare(b.name));
  }

  function truckCatalogOptions(type = "Bulk", selectedId = "") {
    return truckCatalogProducts(type, selectedId).map(item =>
      `<option value="${item.id}" data-unit="${esc(item.unit)}" ${item.id === selectedId ? "selected" : ""}>${esc(item.name)}${item.active === false ? " — inativo (histórico)" : ""}</option>`
    ).join("");
  }

  function truckCompatibleTanks(type, productId, movement, selectedId = "") {
    const incoming = ["Entrada","Backload"].includes(movement);
    return (state.data.tanks || []).filter(tank => {
      if (tank.id === selectedId) return true;
      if (type === "Bulk" && !isSiloAsset(tank)) return false;
      if (type === "Tank" && isSiloAsset(tank)) return false;
      const product = state.data.fluids.find(item => item.id === productId);
      if (!product || tank.unit !== product.unit) return false;
      if (incoming) return Number(tank.volume || 0) <= 0 || tank.fluidTypeId === productId;
      return tank.fluidTypeId === productId && Number(tank.volume || 0) > 0;
    }).sort((a,b) => a.order-b.order);
  }

  function truckTankOptions(type, productId, movement, selectedId = "") {
    return truckCompatibleTanks(type, productId, movement, selectedId).map(tank => {
      const incoming = ["Entrada","Backload"].includes(movement);
      const detail = incoming ? `livre ${fmt.format(Math.max(0,tank.capacity-tank.volume))} ${tank.unit}` : `saldo ${fmt.format(tank.volume)} ${tank.unit}`;
      return `<option value="${tank.id}" ${tank.id === selectedId ? "selected" : ""}>${esc(tank.name)} — ${detail} — ${esc(tank.product || "Vazio")}</option>`;
    }).join("");
  }

  function platformProductOptions(selectedId = "") {
    return (state.data.chemicalProducts || [])
      .filter(item => item.active || item.id === selectedId)
      .sort((a,b) => a.name.localeCompare(b.name))
      .map(item => `<option value="${item.id}" data-unit="${esc(item.unit)}" ${item.id === selectedId ? "selected" : ""}>${esc(item.name)}</option>`)
      .join("");
  }

  function truckPlatformItemRow(item = {}) {
    const selectedId = item.chemicalProductId || item.chemical_product_id || "";
    const product = (state.data.chemicalProducts || []).find(entry => entry.id === selectedId);
    return `<div class="truck-platform-row" data-truck-platform-row>
      <div class="truck-platform-product"><label>Produto químico *</label><select data-truck-item-product><option value="">Selecione o produto químico</option>${platformProductOptions(selectedId)}</select><small data-truck-item-detail>${product ? `Produto selecionado: ${esc(product.name)}` : "A lista mostra somente o nome do produto."}</small></div>
      <div><label>Quantidade *</label><input data-truck-item-quantity type="text" inputmode="decimal" value="${esc(item.quantity ?? "")}" placeholder="Ex.: 20"></div>
      <div><label>Unidade</label><input data-truck-item-unit value="${esc(item.unit || product?.unit || "")}" readonly></div>
      <button type="button" class="icon-btn truck-remove-item" data-action="remove-truck-item" aria-label="Remover produto">×</button>
    </div>`;
  }

  function syncTruckPlatformRow(row) {
    if (!row) return;
    const select = row.querySelector("[data-truck-item-product]");
    const product = (state.data.chemicalProducts || []).find(item => item.id === select?.value);
    const unit = row.querySelector("[data-truck-item-unit]");
    const detail = row.querySelector("[data-truck-item-detail]");
    if (unit) unit.value = product?.unit || "";
    if (detail) detail.textContent = product ? `Produto selecionado: ${product.name}` : "A lista mostra somente o nome do produto.";
  }

  function syncTruckSingleProduct(form) {
    if (!form) return;
    const type = form.elements.truck_type?.value || "Bulk";
    const movement = form.elements.movement?.value || "Entrada";
    const select = form.elements.fluid_type_id;
    const selected = select?.value || "";
    if (select) {
      const valid = truckCatalogProducts(type, selected).some(item => item.id === selected);
      select.innerHTML = `<option value="">Selecione o produto cadastrado</option>${truckCatalogOptions(type, valid ? selected : "")}`;
    }
    const product = (state.data.fluids || []).find(item => item.id === select?.value);
    if (form.elements.unit) form.elements.unit.value = product?.unit || "";
    const detail = form.querySelector("[data-truck-product-detail]");
    if (detail) detail.textContent = product ? `${product.type} • unidade ${product.unit}` : type === "Bulk" ? "Somente granéis." : "Somente fluidos.";
    const tankSelect = form.elements.tank_id;
    const selectedTank = tankSelect?.value || form.dataset.tankId || "";
    if (tankSelect) tankSelect.innerHTML = `<option value="">Selecione o equipamento</option>${truckTankOptions(type,product?.id || "",movement,selectedTank)}`;
  }

  function updateTruckPlatformSummary(form) {
    const summary = form?.querySelector("[data-truck-platform-summary]");
    if (!summary) return;
    const valid = [...form.querySelectorAll("[data-truck-platform-row]")].filter(row => row.querySelector("[data-truck-item-product]")?.value);
    summary.innerHTML = `<strong>${valid.length}</strong><span>produto(s) adicionado(s)</span>`;
  }

  function syncTruckForm(form, resetProduct = false) {
    if (!form) return;
    const type = form.elements.truck_type?.value || "Bulk";
    const single = form.querySelector("[data-truck-single-section]");
    const platform = form.querySelector("[data-truck-platform-section]");
    const isPlatform = type === "Plataforma";
    single?.classList.toggle("hidden", isPlatform);
    platform?.classList.toggle("hidden", !isPlatform);
    single?.querySelectorAll("input,select").forEach(field => field.disabled = isPlatform);
    platform?.querySelectorAll("input,select").forEach(field => field.disabled = !isPlatform);
    if (!isPlatform) {
      if (resetProduct && form.elements.fluid_type_id) form.elements.fluid_type_id.value = "";
      syncTruckSingleProduct(form);
    } else {
      const list = form.querySelector("[data-truck-items-list]");
      if (list && !list.children.length) list.innerHTML = truckPlatformItemRow();
      list?.querySelectorAll("[data-truck-platform-row]").forEach(syncTruckPlatformRow);
      updateTruckPlatformSummary(form);
    }
  }

  function collectTruckPlatformItems(form, validate = true) {
    if (!form || form.elements.truck_type?.value !== "Plataforma") return [];
    const rows = [...form.querySelectorAll("[data-truck-platform-row]")];
    if (validate && !rows.length) throw new Error("Adicione pelo menos um produto na Plataforma.");
    const used = new Set();
    return rows.map((row,index) => {
      const productId = row.querySelector("[data-truck-item-product]")?.value || "";
      const quantity = parseTankVolume(row.querySelector("[data-truck-item-quantity]")?.value || "");
      const product = state.data.chemicalProducts.find(item => item.id === productId);
      if (validate && !product) throw new Error(`Selecione o produto da linha ${index+1}.`);
      if (validate && (!Number.isFinite(quantity) || quantity<=0)) throw new Error(`Informe uma quantidade maior que zero na linha ${index+1}.`);
      if (validate && used.has(productId)) throw new Error(`${product.name} foi adicionado mais de uma vez.`);
      if (productId) used.add(productId);
      return { chemical_product_id:productId, quantity:Number.isFinite(quantity)?quantity:0, display_order:index };
    }).filter(item => item.chemical_product_id);
  }

  function truckItemsSummary(item, detailed = false) {
    const items = item.items || [];
    if (item.truckType !== "Plataforma") return `<strong>${esc(item.product)}</strong><small>${fmt.format(item.quantity)} ${esc(item.unit)} • Lote ${esc(item.lot || "-")}</small>`;
    if (!items.length) return `<strong>Plataforma</strong><small>Nenhum item detalhado.</small>`;
    const visible = detailed ? items : items.slice(0,3);
    return `<div class="truck-item-summary">${visible.map(product => `<span><strong>${esc(product.productName)}</strong><small>${fmt.format(product.quantity)} ${esc(product.unit)}</small></span>`).join("")}${!detailed && items.length>3 ? `<em>+ ${items.length-3} produto(s)</em>` : ""}</div>`;
  }

  function truckForm(item = {}) {
    const type = inferredTruckType(item);
    const items = item.items || [];
    const linked = state.data.fluids.find(product => product.id === item.fluidTypeId);
    const stockApplied = type !== "Plataforma" && item.stockApplied === true;
    const tank = state.data.tanks.find(entry => entry.id === item.tankId);
    return `<form id="truckForm" data-id="${item.id || ""}" data-tank-id="${item.tankId || ""}" data-stock-applied="${stockApplied}">
      ${stockApplied ? `<div class="info-box truck-stock-lock"><strong>Estoque já aplicado</strong><span>${dateTime(item.stockAppliedAt)} • ${tank?.name || "Inventário químico"}. Produto, quantidade e equipamento ficam protegidos; correções devem ser feitas por ajuste de estoque.</span></div>` : ""}
      <div class="form-grid">
        <div><label>Data *</label><input name="date" type="date" required value="${String(item.date || new Date().toISOString()).slice(0,10)}"></div>
        <div><label>Movimento *</label><select name="movement" ${stockApplied ? "disabled" : ""}>${["Entrada","Saída","Backload"].map(value => `<option ${item.movement === value ? "selected" : ""}>${value}</option>`).join("")}</select>${stockApplied ? `<input type="hidden" name="movement" value="${esc(item.movement)}">` : ""}</div>
        <div class="wide truck-type-field"><label>Tipo da carreta *</label><div class="truck-type-selector">${["Bulk","Tank","Plataforma"].map(value => `<label><input type="radio" name="truck_type" value="${value}" ${type===value?"checked":""} ${stockApplied?"disabled":""}><span><b>${value==="Bulk"?uiIcon("package"):value==="Tank"?uiIcon("droplet"):uiIcon("products")}</b><strong>${value}</strong><small>${value==="Bulk"?"Granel":value==="Tank"?"Fluido":"Vários insumos"}</small></span></label>`).join("")}</div>${stockApplied ? `<input type="hidden" name="truck_type" value="${esc(type)}">` : ""}</div>
        <div><label>Origem / Destino *</label><input name="supplier" required value="${esc(item.supplier || "")}"></div>
        <div><label>Cliente</label><input name="client" value="${esc(item.client || "")}"></div>
        <section class="wide truck-single-section ${type==="Plataforma"?"hidden":""}" data-truck-single-section>
          <div class="form-grid">
            <div class="wide"><div class="catalog-linked-heading"><div><label>Produto vinculado *</label><small>Bulk usa granéis; Tank usa fluidos.</small></div><button type="button" class="btn small secondary" data-action="open-fluid-catalog">Abrir Fluidos e Granéis</button></div><select name="fluid_type_id" data-truck-single-product ${stockApplied?"disabled":""}><option value="">Selecione o produto cadastrado</option>${truckCatalogOptions(type,item.fluidTypeId || "")}</select>${stockApplied ? `<input type="hidden" name="fluid_type_id" value="${esc(item.fluidTypeId || "")}">` : ""}<small class="field-help" data-truck-product-detail>${linked ? `${esc(linked.type)} • unidade ${esc(linked.unit)}` : ""}</small></div>
            <div class="wide"><label>Tanque ou silo vinculado *</label><select name="tank_id" ${stockApplied?"disabled":""}><option value="">Selecione o equipamento</option>${truckTankOptions(type,item.fluidTypeId || "",item.movement || "Entrada",item.tankId || "")}</select>${stockApplied ? `<input type="hidden" name="tank_id" value="${esc(item.tankId || "")}">` : ""}<small class="field-help">Entrada/Backload acrescenta saldo; Saída reduz o saldo automaticamente ao receber/concluir.</small></div>
            <div><label>Lote</label><input name="lot" value="${esc(item.lot || "")}" ${stockApplied?"readonly":""}></div>
            <div><label>Quantidade *</label><input name="quantity" type="text" inputmode="decimal" value="${item.quantity || ""}" ${stockApplied?"readonly":""}></div>
            <div><label>Unidade</label><input name="unit" value="${esc(linked?.unit || item.unit || "")}" readonly></div>
          </div>
        </section>
        <section class="wide truck-platform-section ${type==="Plataforma"?"":"hidden"}" data-truck-platform-section>
          <div class="info-box platform-detached-notice"><strong>Sem vínculo com o Inventário Químico</strong><span>Esta carreta registra somente os produtos e as quantidades transportadas. Nenhum lote ou saldo será criado ou alterado.</span></div>
          <div class="truck-platform-heading"><div><label>Produtos da Plataforma *</label><small>Selecione o nome do Catálogo Químico e informe a quantidade transportada.</small></div><div class="row-actions"><button type="button" class="btn small secondary" data-action="open-chemical-catalog">Abrir catálogo</button>${stockApplied?"":`<button type="button" class="btn small primary" data-action="add-truck-item">+ Adicionar produto</button>`}</div></div>
          <div class="truck-platform-summary" data-truck-platform-summary><strong>${items.length}</strong><span>produto(s) adicionado(s)</span></div>
          <div class="truck-platform-list" data-truck-items-list>${(items.length?items:[{}]).map(truckPlatformItemRow).join("")}</div>
        </section>
        <div><label>Placa</label><input name="plate" value="${esc(item.plate || "")}"></div>
        <div><label>Motorista</label><input name="driver" value="${esc(item.driver || "")}"></div>
        <div><label>Nota fiscal</label><input name="invoice" value="${esc(item.invoice || "")}"></div>
        <div><label>Status</label><select name="status">${["Programada","Recebida","Concluída"].map(value => `<option ${item.status===value?"selected":""}>${value}</option>`).join("")}</select><small class="field-help">${type === "Plataforma" ? "O status não altera o Inventário Químico." : "Recebida ou Concluída aplica o saldo no tanque ou silo vinculado."}</small></div>
        <div class="wide"><label>Observações</label><textarea name="notes">${esc(item.notes || "")}</textarea></div>
        <div class="wide"><label>NF, documento ou foto</label><input name="attachment" type="file" accept=".pdf,image/jpeg,image/png,image/webp,image/heic,image/heif" multiple capture="environment"></div>
      </div>${formActions(item.id?"Salvar alterações":"Salvar movimentação")}
    </form>`;
  }

  async function saveTruck(payload,id=null,items=[]) {
    const type=payload.truck_type;
    if(!["Bulk","Tank","Plataforma"].includes(type)) throw new Error("Selecione o tipo da carreta.");
    const finalStatus=["Recebida","Concluída"].includes(payload.status);
    if(finalStatus && !payload.invoice) throw new Error("Informe a nota fiscal antes de receber ou concluir a carreta.");
    const quantity=type==="Plataforma"?0:parseTankVolume(payload.quantity || "");
    if(type!=="Plataforma" && (!Number.isFinite(quantity)||quantity<=0)) throw new Error("Informe uma quantidade maior que zero.");
    if(type!=="Plataforma" && !payload.fluid_type_id) throw new Error("Selecione o produto em Fluidos e Granéis.");
    if(type!=="Plataforma" && finalStatus && !payload.tank_id) throw new Error("Selecione o tanque ou silo antes de aplicar o estoque.");
    if(type==="Plataforma" && !items.length) throw new Error("Adicione pelo menos um produto na Plataforma.");
    const truckPayload={movement_date:payload.date,movement_type:payload.movement,truck_type:type,supplier:payload.supplier,client:payload.client||null,fluid_type_id:type==="Plataforma"?null:payload.fluid_type_id,tank_id:type==="Plataforma"?null:(payload.tank_id||null),lot:type==="Plataforma"?null:(payload.lot||null),quantity,plate:payload.plate||null,driver_name:payload.driver||null,invoice_number:payload.invoice||null,status:payload.status,notes:payload.notes||null};
    const {data,error}=await state.client.rpc("save_truck_movement_integrated",{p_truck_id:id||null,p_truck:truckPayload,p_items:items});
    if(error) throw error;
    const row=Array.isArray(data)?data[0]:data;
    if(!row?.id) throw new Error("O Supabase não confirmou a movimentação da carreta.");
    return row.id;
  }

  function genericForm(kind, item = {}) {
    const sel = (value, option) => String(value ?? "") === String(option) ? "selected" : "";
    const id = item.id || "";
    const forms = {
      fluid: `<form id="genericForm" data-kind="fluid" data-id="${id}"><div class="form-grid">
        <div class="wide"><label>Nome do produto *</label><input name="name" required value="${esc(item.name || "")}"></div>
        <div><label>Tipo de produto *</label><select name="type" data-fluid-category>${["WBM","Brine","SBM","Olefina","Outro Fluido","Granel","Insumo"].map(x => `<option ${sel(item.type,x)}>${x}</option>`).join("")}</select><small class="field-help">Granel e Insumo aparecem nos silos. As demais opções aparecem nos tanques.</small></div>
        <div><label>Unidade de estoque</label><select name="unit">${["bbl","ton","m³","kg"].map(x => `<option ${sel(item.unit,x)}>${x}</option>`).join("")}</select></div>
        <div><label>Densidade padrão</label><input name="density" type="text" inputmode="decimal" value="${item.density || ""}" placeholder="Ex.: 9,7 ou 4,10"></div>
        <div><label>Unidade da densidade</label><select name="density_unit"><option value="ppg" ${(item.densityUnit || defaultDensityUnit(item.type)) === "ppg" ? "selected" : ""}>ppg</option><option value="t/m³" ${(item.densityUnit || defaultDensityUnit(item.type)) === "t/m³" ? "selected" : ""}>t/m³</option></select></div>
        <div class="catalog-status-field"><label>Status do produto *</label><select name="active" required><option value="true" ${item.active !== false ? "selected" : ""}>Ativo — aparece nos tanques/silos</option><option value="false" ${item.active === false ? "selected" : ""}>Inativo — fica oculto na seleção</option></select><small class="field-help">Ao ativar, o produto volta imediatamente para o menu suspenso dos equipamentos compatíveis.</small></div>
        <div class="wide"><label>Documentos ou fotos</label><input name="attachment" type="file" accept=".pdf,image/jpeg,image/png,image/webp,image/heic,image/heif" multiple></div>
      </div>${formActions(id ? "Salvar alterações" : "Salvar produto")}</form>`,

      qhse: `<form id="genericForm" data-kind="qhse" data-id="${id}"><div class="form-grid">
        <div><label>Data</label><input name="date" type="date" value="${String(item.date || new Date().toISOString()).slice(0,10)}"></div>
        <div><label>Tipo</label><select name="type">${["DDS","APR","Inspeção","RIR","Auditoria","Observação"].map(x => `<option ${sel(item.type,x)}>${x}</option>`).join("")}</select></div>
        <div class="wide"><label>Título *</label><input name="title" required value="${esc(item.title || "")}"></div>
        <div class="wide"><label>Descrição</label><textarea name="description">${esc(item.description || "")}</textarea></div>
        <div><label>Responsável</label><input name="responsible" value="${esc(item.responsible || "")}"></div>
        <div><label>Severidade</label><select name="severity">${["Baixa","Média","Alta","Crítica"].map(x => `<option ${sel(item.severity,x)}>${x}</option>`).join("")}</select></div>
        <div><label>Status</label><select name="status">${["Pendente","Em andamento","Concluído"].map(x => `<option ${sel(item.status,x)}>${x}</option>`).join("")}</select></div>
        <div class="wide"><label>Fotos ou documentos</label><input name="attachment" type="file" accept=".pdf,image/jpeg,image/png,image/webp,image/heic,image/heif" multiple capture="environment"></div>
      </div>${formActions(id ? "Salvar alterações" : "Salvar registro")}</form>`,

      equipment: `<form id="genericForm" data-kind="equipment" data-id="${id}"><div class="form-grid">
        <div><label>Equipamento *</label><input name="name" required value="${esc(item.name || "")}"></div>
        <div><label>Categoria</label><select name="category">${["Motor a diesel","Bomba","Compressor","Empilhadeira","Outro"].map(x => `<option ${sel(item.category,x)}>${x}</option>`).join("")}</select></div>
        <div><label>Localização</label><input name="location" value="${esc(item.location || "")}"></div>
        <div><label>Status</label><select name="status">${["Operando","Disponível","Parado","Manutenção"].map(x => `<option ${sel(item.status,x)}>${x}</option>`).join("")}</select></div>
        <div><label>Horímetro final</label><input name="hourmeter" type="number" min="0" step="0.1" value="${item.hourmeter || 0}"></div>
        <div><label>Horas trabalhadas</label><input name="last_hours" type="number" min="0" step="0.1" value="${item.last_hours || 0}"></div>
        <div><label>Diesel inicial (L)</label><input name="diesel_initial" type="number" min="0" step="0.1" value="${item.diesel_initial || 0}"></div>
        <div><label>Abastecido (L)</label><input name="refueled" type="number" min="0" step="0.1" value="${item.refueled || 0}"></div>
        <div><label>Diesel final (L)</label><input name="diesel_final" type="number" min="0" step="0.1" value="${item.diesel_final || 0}"></div>
        <div><label>Próxima preventiva</label><input name="next_maintenance_date" type="date" value="${String(item.next_maintenance_date || "").slice(0,10)}"></div>
        <div><label>Preventiva no horímetro</label><input name="maintenance_due_hourmeter" type="number" min="0" step="0.1" value="${item.maintenance_due_hourmeter || ""}"></div>
        <div><label>Intervalo preventivo (h)</label><input name="maintenance_interval_hours" type="number" min="0" step="0.1" value="${item.maintenance_interval_hours || ""}"></div>
        <div class="wide"><label>Observações</label><textarea name="notes">${esc(item.notes || "")}</textarea></div>
      </div>${formActions(id ? "Salvar alterações" : "Salvar equipamento")}</form>`,

      certificate: `<form id="genericForm" data-kind="certificate" data-id="${id}"><div class="form-grid">
        <div class="wide"><label>Certificado *</label><input name="title" required value="${esc(item.title || "")}"></div>
        <div>
          <label>Usuário vinculado *</label>
          <select name="user_id" required data-certificate-user>
            <option value="">Selecione o usuário</option>
            ${state.data.users.filter(user => user.active !== false || user.id === item.user_id).map(user => `<option value="${user.id}" data-user-name="${esc(user.name)}" ${item.user_id === user.id ? "selected" : ""}>${esc(user.name)} — ${esc(user.role)}</option>`).join("")}
          </select>
        </div>
        <div><label>Nome no certificado *</label><input name="owner" value="${esc(item.owner || "")}" required></div>
        <div><label>Emissor</label><input name="issuer" value="${esc(item.issuer || "")}"></div>
        <div><label>Emissão</label><input name="issued_at" type="date" value="${String(item.issued_at || "").slice(0,10)}"></div>
        <div><label>Validade</label><input name="expires_at" type="date" value="${String(item.expires_at || "").slice(0,10)}"></div>
        <div><label>Status</label><select name="status">${["Válido","A vencer","Vencido"].map(x => `<option ${sel(item.status,x)}>${x}</option>`).join("")}</select></div>
        <div class="wide"><label>Certificado em PDF ou foto</label><input name="attachment" type="file" accept=".pdf,image/jpeg,image/png,image/webp,image/heic,image/heif" multiple></div>
      </div>
      <div class="info-box" style="margin-top:12px">Somente Logística, Supervisor ou Administrador podem cadastrar e editar certificados.</div>
      ${formActions(id ? "Salvar alterações" : "Salvar certificado")}</form>`,

      alert: `<form id="genericForm" data-kind="alert" data-id="${id}"><div class="form-grid">
        <div class="wide"><label>Título *</label><input name="title" required value="${esc(item.title || "")}"></div>
        <div class="wide"><label>Mensagem *</label><textarea name="message" required>${esc(item.message || "")}</textarea></div>
        <div><label>Nível</label><select name="level">${["Informativo","Atenção","Crítico"].map(x => `<option ${sel(item.level,x)}>${x}</option>`).join("")}</select></div>
        <div><label>Grupo / Destino</label><input name="target" value="${esc(item.target || "")}" placeholder="Ex.: mecânicos, operação"></div>
      </div>${formActions(id ? "Salvar alterações" : "Criar alerta")}</form>`
    };
    return forms[kind] || "";
  }

  function actionItemForm(qhseId, item = {}) {
    return `<form id="actionItemForm" data-qhse-id="${qhseId}" data-id="${item.id || ""}"><div class="form-grid">
      <div class="wide"><label>Ação *</label><input name="title" required value="${esc(item.title || "")}"></div>
      <div class="wide"><label>Descrição</label><textarea name="description">${esc(item.description || "")}</textarea></div>
      <div><label>Responsável</label><input name="responsible" value="${esc(item.responsible || "")}"></div>
      <div><label>Prazo</label><input name="due_date" type="date" value="${String(item.due_date || "").slice(0,10)}"></div>
      <div><label>Status</label><select name="status">${["Pendente","Em andamento","Concluído"].map(x => `<option ${item.status === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>
    </div>${formActions(item.id ? "Salvar alterações" : "Salvar ação")}</form>`;
  }

  function maintenanceOrderForm(order = {}, equipmentId = "") {
    const selectedEquipment = order.equipment_id || equipmentId;
    return `<form id="maintenanceOrderForm" data-id="${order.id || ""}"><div class="form-grid">
      <div><label>Equipamento *</label><select name="equipment_id" required><option value="">Selecione</option>${state.data.equipment.map(item => `<option value="${item.id}" ${selectedEquipment === item.id ? "selected" : ""}>${esc(item.name)}</option>`).join("")}</select></div>
      <div><label>Tipo</label><select name="maintenance_type">${["Preventiva", "Corretiva", "Inspeção"].map(x => `<option ${order.maintenance_type === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>
      <div class="wide"><label>Título *</label><input name="title" required value="${esc(order.title || "")}"></div>
      <div class="wide"><label>Descrição</label><textarea name="description">${esc(order.description || "")}</textarea></div>
      <div><label>Prioridade</label><select name="priority">${["Baixa", "Média", "Alta", "Crítica"].map(x => `<option ${order.priority === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>
      <div><label>Status</label><select name="status">${["Aberta", "Em andamento", "Aguardando peça", "Concluída", "Cancelada"].map(x => `<option ${order.status === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>
      <div><label>Responsável</label><input name="responsible" value="${esc(order.responsible || "")}"></div>
      <div><label>Prazo</label><input name="due_date" type="date" value="${String(order.due_date || "").slice(0, 10)}"></div>
      <div><label>Custo estimado</label><input name="estimated_cost" type="number" min="0" step="0.01" value="${order.estimated_cost || 0}"></div>
      <div><label>Custo real</label><input name="actual_cost" type="number" min="0" step="0.01" value="${order.actual_cost || 0}"></div>
      <div class="wide"><label>Condição antes</label><textarea name="before_notes">${esc(order.before_notes || "")}</textarea></div>
      <div class="wide"><label>Peças utilizadas</label><textarea name="parts_used">${esc(order.parts_used || "")}</textarea></div>
      <div class="wide"><label>Solução aplicada</label><textarea name="solution">${esc(order.solution || "")}</textarea></div>
      <div class="wide"><label>Condição depois</label><textarea name="after_notes">${esc(order.after_notes || "")}</textarea></div>
      <div class="wide"><label>Fotos antes/depois ou documentos</label><input name="attachment" type="file" accept=".pdf,image/jpeg,image/png,image/webp,image/heic,image/heif" multiple capture="environment"></div>
    </div>${formActions("Salvar ordem")}</form>`;
  }

  function newUserForm() {
    return `<form id="newUserForm"><div class="form-grid"><div class="wide"><label>Nome completo *</label><input name="full_name" required></div><div><label>E-mail *</label><input name="email" type="email" required></div><div><label>Senha inicial *</label><input name="password" type="password" minlength="8" required></div><div><label>Cargo</label><select name="role">${["user","tv","operador","logistica","mecanico","qhse","lider","supervisor","admin"].map(x => `<option>${x}</option>`).join("")}</select></div><div><label>Departamento</label><input name="department"></div><div class="wide info-box">A conta será criada pelo cadastro seguro do Supabase. Dependendo da configuração, o usuário poderá receber uma confirmação por e-mail.</div></div>${formActions("Criar usuário")}</form>`;
  }

  function userForm(user) {
    const modules = [
      ["dashboard", "Dashboard"], ["quality", "Qualidade dos Dados"], ["sanitation", "Saneamento de Dados"], ["tv", "Painel TV"], ["operations", "Operações"], ["tanks", "Tanques"],
      ["fluids", "Fluidos e Granéis"], ["chemical-catalog", "Catálogo Químico"], ["chemicals", "Inventário Químico"], ["trucks", "Carretas"], ["qhse", "QHSE"],
      ["maintenance", "Manutenção"], ["certificates", "Certificados"],
      ["alerts", "Alertas"], ["reports", "Relatórios"], ["audit", "Auditoria"]
    ];
    return `<form id="userForm" data-user-id="${user.id}"><div class="form-grid">
      <div class="wide"><label>Nome</label><input name="full_name" required value="${esc(user.name)}"></div>
      <div><label>E-mail</label><input value="${esc(user.email)}" disabled></div>
      <div><label>Cargo</label><select name="role">${["admin", "supervisor", "lider", "operador", "logistica", "mecanico", "qhse", "tv", "user"].map(x => `<option ${user.role === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>
      <div><label>Departamento</label><input name="department" value="${esc(user.department)}"></div>
      <div><label>Status</label><select name="active"><option value="true" ${user.active ? "selected" : ""}>Ativo</option><option value="false" ${!user.active ? "selected" : ""}>Bloqueado</option></select></div>
      <div class="wide"><label>Permissões por módulo</label><div class="permission-grid">${modules.map(([key, label]) => `<label class="permission-item"><input type="checkbox" name="perm_${key}" ${user.permissions?.[key] !== false ? "checked" : ""}><span>${label}</span></label>`).join("")}</div></div>
    </div>${formActions("Salvar usuário")}</form>`;
  }

  async function uploadAttachments(module, recordId, files) {
    if (!files?.length) return;
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
    for (const file of files) {
      if (!allowed.includes(file.type)) throw new Error(`Formato não permitido: ${file.name}`);
      if (file.size > 20 * 1024 * 1024) throw new Error(`${file.name} ultrapassa 20 MB.`);
      const path = `${module}/${recordId}/${Date.now()}-${uid("file")}-${safeFileName(file.name)}`;
      const { error: uploadError } = await state.client.storage.from("opscontrol-files").upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      const { error: metaError } = await state.client.from("attachments").insert({
        module, record_id: recordId, file_name: file.name, file_path: path,
        mime_type: file.type, file_size: file.size, uploaded_by: state.user.id
      });
      if (metaError) {
        await state.client.storage.from("opscontrol-files").remove([path]);
        throw metaError;
      }
    }
  }

  async function showAttachments(module, recordId, title) {
    const items = state.data.attachments.filter(x => x.module === module && x.record_id === recordId);
    const canDelete = item => isAdmin() || item.uploaded_by === state.user.id;
    const rows = await Promise.all(items.map(async item => {
      const { data, error } = await state.client.storage.from("opscontrol-files").createSignedUrl(item.file_path, 3600);
      const url = error ? "" : data?.signedUrl || "";
      return `<div class="attachment-item">
        <div class="attachment-icon">${String(item.mime_type).startsWith("image/") ? uiIcon("image") : uiIcon("file")}</div>
        <div class="attachment-info"><strong>${esc(item.file_name)}</strong><small>${fileSizeLabel(item.file_size)} • ${dateTime(item.created_at)}</small></div>
        ${url ? `<a class="btn small primary" href="${url}" target="_blank" rel="noopener">Abrir</a>` : ""}
        ${canDelete(item) ? `<button class="btn small danger" data-delete-attachment="${item.id}">Excluir</button>` : ""}
      </div>`;
    }));

    openModal(`Anexos — ${title}`, `
      <form id="attachmentUploadForm" data-module="${module}" data-record-id="${recordId}">
        <label>Adicionar documentos ou fotos</label>
        <input name="attachment" type="file" accept=".pdf,image/jpeg,image/png,image/webp,image/heic,image/heif" multiple capture="environment">
        <div class="form-actions"><button class="btn primary">Enviar arquivos</button></div>
      </form>
      <div class="section-title">Arquivos anexados</div>
      <div class="attachment-list">${rows.join("") || `<div class="empty">Nenhum arquivo anexado.</div>`}</div>
    `, "ANEXOS");
  }


  function parseTankVolume(value) {
    const normalized = String(value ?? "")
      .trim()
      .replace(/\s/g, "")
      .replace(/\.(?=\d{3}(?:\D|$))/g, "")
      .replace(",", ".");
    const number = Number(normalized);
    return Number.isFinite(number) ? number : NaN;
  }

  function parseOptionalDecimal(value) {
    if (value === null || value === undefined || String(value).trim() === "") return null;
    const parsed = parseTankVolume(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  }


  function friendlyTankSaveError(error) {
    const raw = String(error?.message || error || "Não foi possível salvar o tanque ou silo.");
    if (raw.includes("tanks_name_key") || raw.toLowerCase().includes("duplicate key")) {
      return "Já existe outro tanque ou silo com esse nome. A atualização operacional não precisa alterar o nome do equipamento.";
    }
    if (raw.includes("fluid_types_name_key")) {
      return "Este produto já está cadastrado em Fluidos e Granéis. Selecione o cadastro existente.";
    }
    if (raw.toLowerCase().includes("não é compatível com silo")) {
      return "Este produto é um fluido e não pode ser usado em silo. Selecione um Granel ou Insumo.";
    }
    if (raw.toLowerCase().includes("não é compatível com tanque")) {
      return "Este produto é um granel e não pode ser usado em tanque de fluido.";
    }
    if (raw.toLowerCase().includes("equipamento selecionado não confere")
        || raw.toLowerCase().includes("outro equipamento")
        || raw.toLowerCase().includes("id oculto")) {
      return "O formulário estava vinculado a outro equipamento e foi bloqueado. Feche a janela, abra novamente o tanque correto e salve.";
    }
    if (raw.toLowerCase().includes("alterado depois que o formulário foi aberto")) {
      return "Este tanque foi atualizado por outra pessoa. Feche a janela, atualize a página e abra novamente.";
    }
    return raw;
  }


  async function refreshTankProductList(form) {
    if (!form) return;
    const tankId = form.dataset.tankId;
    const editStructure = form.dataset.adminFull === "true";
    if (!tankId) throw new Error("O formulário perdeu o vínculo com o equipamento.");
    const currentSelection = form.elements.fluid_type_id?.value || "";
    const currentVolume = form.elements.volume?.value || "";
    const currentLot = form.elements.lot?.value || "";
    const currentStatus = form.elements.status?.value || "";

    await loadData();
    const tank = state.data.tanks.find(item => item.id === tankId);
    if (!tank) throw new Error("Tanque ou silo não localizado após atualizar o catálogo.");

    $("#modalBody").innerHTML = tankForm(tank, editStructure);
    const refreshed = $("#tankForm");
    if (refreshed?.elements.volume) refreshed.elements.volume.value = currentVolume;
    if (refreshed?.elements.lot) refreshed.elements.lot.value = currentLot;
    if (refreshed?.elements.status) refreshed.elements.status.value = currentStatus;
    if (refreshed?.elements.fluid_type_id && currentSelection) {
      const exists = [...refreshed.elements.fluid_type_id.options].some(option => option.value === currentSelection);
      if (exists) refreshed.elements.fluid_type_id.value = currentSelection;
    }
    syncTankCatalogFields(refreshed);
    toast("Lista de produtos atualizada.", "success");
  }

  async function saveTankVolume(form, button = null) {
    if (!form) throw new Error("Formulário de tancagem não localizado.");
    if (!state.client || !state.user) throw new Error("Sessão inválida. Entre novamente.");

    const payload = Object.fromEntries(new FormData(form));
    const targetTankId = form.dataset.tankId || "";
    const targetTankName = form.dataset.tankName || "";
    const expectedUpdatedAt = form.dataset.tankUpdatedAt || null;
    const editToken = form.dataset.editToken || "";
    const payloadId = payload.id || "";

    if (!targetTankId || !targetTankName || !editToken) {
      throw new Error("O formulário perdeu a identificação segura do tanque. Feche e abra novamente.");
    }
    if (payloadId && payloadId !== targetTankId) {
      throw new Error("O ID oculto não corresponde ao equipamento aberto. A alteração foi bloqueada.");
    }
    if (button) {
      if (button.dataset.tankId !== targetTankId || button.dataset.editToken !== editToken) {
        throw new Error("O botão de salvar pertence a outro equipamento. A alteração foi bloqueada.");
      }
    }
    if ($("#tankForm") !== form || !form.closest("#modalBody")) {
      throw new Error("Este formulário não é mais o formulário ativo. Feche e abra o tanque novamente.");
    }

    const tank = state.data.tanks.find(item => item.id === targetTankId);
    if (!tank) throw new Error("Tanque ou silo não localizado.");
    if (normalizeSearch(tank.name) !== normalizeSearch(targetTankName)) {
      throw new Error(`O equipamento aberto era ${targetTankName}, mas os dados atuais pertencem a ${tank.name}. Atualize a página.`);
    }

    const adminFull = form.dataset.adminFull === "true" && isAdmin();
    const newKind = adminFull ? payload.kind : tank.kind;
    const silo = isSiloAsset(newKind);
    const newVolume = parseTankVolume(payload.volume);
    const physicalCapacityM3 = silo
      ? parseOptionalDecimal(payload.physical_capacity_m3 ?? tank.physicalCapacityM3 ?? defaultSiloPhysicalCapacity(tank))
      : null;
    const selectedFluidId = payload.fluid_type_id || null;
    const selectedFluid = (state.data.fluids || []).find(item => item.id === selectedFluidId);
    const newDensity = adminFull
      ? parseOptionalDecimal(payload.density)
      : (selectedFluid?.density === null || selectedFluid?.density === undefined ? null : Number(selectedFluid.density));
    const newDensityUnit = newDensity === null
      ? null
      : (silo ? "t/m³" : (adminFull ? payload.density_unit : selectedFluid?.densityUnit || "ppg"));
    const fixedCapacity = !silo
      ? (adminFull ? parseTankVolume(payload.capacity) : Number(tank.capacity || 0))
      : null;
    const calculatedSiloCapacity = silo ? siloOperationalCapacity(physicalCapacityM3, newDensity) : null;
    const newCapacity = silo ? (calculatedSiloCapacity ?? Number(tank.capacity || 0)) : fixedCapacity;

    if (adminFull) {
      const requestedName = String(payload.name || "").trim();
      if (!requestedName) throw new Error("Informe o nome do tanque ou silo.");
      const duplicateTank = state.data.tanks.find(item =>
        item.id !== tank.id && normalizeSearch(item.name) === normalizeSearch(requestedName)
      );
      if (duplicateTank) {
        throw new Error(`O nome ${requestedName} já pertence a ${duplicateTank.name}. Escolha outro nome para o equipamento.`);
      }
    }

    if (!Number.isFinite(newVolume)) throw new Error("Informe um volume válido.");
    if (newVolume > 0 && !selectedFluidId) throw new Error("Selecione um produto cadastrado na aba Fluidos e Granéis.");
    if (selectedFluidId && !selectedFluid) throw new Error("O produto selecionado não foi encontrado no catálogo. Atualize a página e tente novamente.");
    if (selectedFluid) {
      const category = String(selectedFluid.type || "").toLowerCase();
      const compatible = silo ? ["granel", "insumo"].includes(category) : !["granel", "insumo"].includes(category);
      if (!compatible) throw new Error(silo ? "Selecione um produto classificado como Granel ou Insumo." : "Selecione um produto classificado como fluido.");
    }
    if (silo && (!Number.isFinite(physicalCapacityM3) || physicalCapacityM3 <= 0)) throw new Error("Informe o volume físico do silo em m³.");
    if (!silo && (!Number.isFinite(newCapacity) || newCapacity <= 0)) throw new Error("Informe uma capacidade válida.");
    if (Number.isNaN(newDensity)) throw new Error("Informe uma densidade válida.");
    if (newDensity !== null && newDensity < 0) throw new Error("A densidade não pode ser negativa.");
    if (silo && newVolume > 0 && (!newDensity || newDensityUnit !== "t/m³")) {
      throw new Error("Selecione o granel e informe a densidade em t/m³.");
    }
    if (newVolume < 0) throw new Error("O volume não pode ser negativo.");
    if (newVolume > newCapacity) {
      throw new Error(`O volume não pode ultrapassar a capacidade operacional de ${fmt.format(newCapacity)} ${silo ? "ton" : (adminFull ? payload.unit : tank.unit)}.`);
    }

    const originalLabel = button?.textContent || "Salvar";
    const message = form.querySelector("#tankSaveMessage");

    if (button) {
      button.disabled = true;
      button.textContent = "Salvando no banco...";
    }
    if (message) {
      message.classList.add("hidden");
      message.textContent = "";
    }

    try {
      // O modo operacional usa uma função que não recebe nome, fase, tipo,
      // capacidade ou densidade. Isso elimina conflitos de nome e garante
      // que o produto seja derivado exclusivamente pelo ID do catálogo.
      const rpcName = adminFull ? "admin_update_tank_product_capacity_v2" : "update_tank_content_v4";
      const rpcPayload = adminFull ? {
        p_tank_id: targetTankId,
        p_name: payload.name?.trim(),
        p_phase: payload.phase,
        p_kind: payload.kind,
        p_capacity: silo ? Number(tank.capacity || 0) : newCapacity,
        p_physical_capacity_m3: physicalCapacityM3,
        p_unit: silo ? "ton" : payload.unit,
        p_display_order: Number(payload.display_order || 0),
        p_volume: newVolume,
        p_status: payload.status,
        p_fluid_type_id: selectedFluidId,
        p_product: selectedFluid?.name || null,
        p_lot: payload.lot?.trim() || null,
        p_density: newDensity,
        p_density_unit: newDensityUnit
      } : {
        p_tank_id: targetTankId,
        p_expected_name: targetTankName,
        p_expected_updated_at: expectedUpdatedAt,
        p_volume: newVolume,
        p_status: payload.status,
        p_fluid_type_id: selectedFluidId,
        p_lot: payload.lot?.trim() || null
      };

      const { data, error } = await state.client.rpc(rpcName, rpcPayload);
      if (error) throw error;

      const rpcRow = Array.isArray(data) ? data[0] : data;
      if (!rpcRow?.id) throw new Error("O Supabase não confirmou a atualização.");
      if (rpcRow.id !== targetTankId || normalizeSearch(rpcRow.name) !== normalizeSearch(targetTankName)) {
        throw new Error("O Supabase retornou outro equipamento. A confirmação foi rejeitada.");
      }

      const { data: serverRow, error: confirmError } = await state.client
        .from("tanks")
        .select("*")
        .eq("id", targetTankId)
        .single();

      if (confirmError) throw confirmError;
      if (!serverRow) throw new Error("Não foi possível reler o tanque atualizado.");
      if (serverRow.id !== targetTankId || normalizeSearch(serverRow.name) !== normalizeSearch(targetTankName)) {
        throw new Error("A releitura retornou outro equipamento. A atualização não foi confirmada.");
      }

      const confirmedVolume = Number(serverRow.current_volume || 0);
      if (Math.abs(confirmedVolume - newVolume) > 0.001) {
        throw new Error(`O banco retornou ${fmt.format(confirmedVolume)}, diferente do valor informado.`);
      }
      if ((serverRow.current_fluid_type_id || null) !== selectedFluidId) {
        throw new Error("O banco não confirmou o produto selecionado.");
      }

      const mapped = {
        id: serverRow.id,
        name: serverRow.name,
        phase: serverRow.phase,
        kind: serverRow.kind,
        capacity: Number(serverRow.capacity || 0),
        unit: serverRow.unit,
        volume: confirmedVolume,
        physicalCapacityM3: serverRow.physical_capacity_m3 === null || serverRow.physical_capacity_m3 === undefined
          ? null : Number(serverRow.physical_capacity_m3),
        fluidTypeId: serverRow.current_fluid_type_id || null,
        product: serverRow.current_product || "",
        lot: serverRow.current_lot || "",
        density: serverRow.current_density === null || serverRow.current_density === undefined ? null : Number(serverRow.current_density),
        densityUnit: serverRow.current_density_unit || null,
        status: serverRow.status,
        order: serverRow.display_order,
        updated_by: serverRow.updated_by,
        updated_at: serverRow.updated_at
      };

      const index = state.data.tanks.findIndex(item => item.id === targetTankId);
      if (index >= 0) state.data.tanks[index] = mapped;

      renderTanks();
      renderDashboard();
      closeModal();
      toast(`${mapped.name} confirmado em ${fmt.format(mapped.volume)} ${mapped.unit}.`, "success");

      // Sincronização completa em segundo plano. Uma falha em outro módulo
      // não impede a confirmação visual do tanque que já foi salvo.
      setTimeout(() => {
        loadData().then(renderAll).catch(error => console.error("Sincronização posterior:", error));
      }, 50);

      return mapped;
    } catch (error) {
      const friendlyMessage = friendlyTankSaveError(error);
      if (message) {
        message.textContent = friendlyMessage;
        message.classList.remove("hidden");
      }
      try {
        await state.client.from("system_errors").insert({
          user_id: state.user.id,
          context: `tank_volume_update:${targetTankName}:${targetTankId.slice(0,8)}`,
          message: friendlyMessage,
          stack: error.stack || null,
          user_agent: navigator.userAgent
        });
      } catch (_) {}
      throw new Error(friendlyMessage);
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = originalLabel;
      }
    }
  }

  async function saveOperation(payload, id = null, allocations = []) {
    const planned = parseTankVolume(payload.planned || "0");
    const executed = parseTankVolume(payload.executed || "0");
    const catalogItem = state.data.fluids.find(item => item.id === payload.fluid_type_id);
    if (!catalogItem) throw new Error("Selecione um produto cadastrado em Fluidos e Granéis.");
    const existing = id ? state.data.operations.find(item => item.id === id) : null;
    if (catalogItem.active === false && existing?.fluidTypeId !== catalogItem.id) {
      throw new Error("O produto selecionado está inativo. Ative-o em Fluidos e Granéis.");
    }
    if (!Number.isFinite(planned) || planned < 0) throw new Error("Informe uma quantidade planejada válida.");
    if (!Number.isFinite(executed) || executed < 0) throw new Error("Informe uma quantidade executada válida.");

    if (payload.status === "Concluída" && !payload.ticket_number?.trim()) throw new Error("Informe o número do ticket antes de concluir a operação.");
    const start = payload.start_at ? new Date(payload.start_at) : null;
    const end = payload.end_at ? new Date(payload.end_at) : null;
    if (payload.status === "Concluída" && !start) throw new Error("Informe o horário de início.");
    if (payload.status === "Concluída" && !end) throw new Error("Informe o horário de término.");
    if (start && end && end < start) throw new Error("O término não pode ser anterior ao início.");
    const paused = Number(payload.paused_minutes || 0);
    const hours = start && end ? Math.max(0, (end - start) / 3600000 - paused / 60) : 0;
    const flow = hours > 0 ? executed / hours : 0;
    const mode = tankMovementMode(payload.activity);
    const applyTank = payload.apply_tank_movement === true;
    const allocationTotal = allocations.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

    if (applyTank && mode === "none") throw new Error("Esta atividade não possui movimentação automática de tancagem.");
    if (payload.status === "Concluída" && mode !== "none") {
      if (!allocations.length) throw new Error("Distribua a quantidade executada entre os tanques ou silos.");
      if (Math.abs(allocationTotal-executed) > 0.001) {
        throw new Error(`A soma distribuída (${fmt.format(allocationTotal)}) deve ser igual à quantidade executada (${fmt.format(executed)}).`);
      }
    }

    const operationPayload = {
      client: payload.client,
      vessel: payload.vessel,
      rig: payload.rig || null,
      well: payload.well || null,
      ticket_number: payload.ticket_number || null,
      service_order: payload.service_order || null,
      responsible_id: payload.responsible_id || null,
      fluid_type_id: catalogItem.id,
      activity: payload.activity,
      product: catalogItem.name,
      lot: payload.lot || null,
      planned_quantity: planned,
      executed_quantity: executed,
      unit: catalogItem.unit,
      status: payload.status,
      start_at: start ? start.toISOString() : null,
      end_at: end ? end.toISOString() : null,
      paused_minutes: paused,
      flow_rate: flow,
      flow_rate_unit: `${catalogItem.unit}/h`,
      occurrence: payload.occurrence || null,
      notes: payload.notes || null,
      apply_tank_movement: applyTank,
      locked: payload.locked === true || payload.status === "Concluída"
    };

    const { data, error } = await state.client.rpc("save_operation_with_allocations", {
      p_operation_id: id || null,
      p_operation: operationPayload,
      p_allocations: allocations
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.id) throw new Error("O Supabase não confirmou a operação e sua distribuição.");
    return row.id;
  }

  async function saveEntity(kind, payload, id = null) {

    if (kind === "fluid") {
      const active = String(payload.active).toLowerCase() === "true";
      const density = parseOptionalDecimal(payload.density);
      const { data, error } = await state.client.rpc("save_fluid_catalog_item", {
        p_id: id || null,
        p_name: payload.name?.trim() || "",
        p_category: payload.type,
        p_default_unit: payload.unit,
        p_density_value: density,
        p_density_unit: payload.density_unit || defaultDensityUnit(payload.type),
        p_active: active
      });
      if (error) throw error;
      const saved = Array.isArray(data) ? data[0] : data;
      if (!saved?.id) throw new Error("O Supabase não confirmou a atualização do produto.");
      return saved.id;
    }

    const maps = {
      qhse: ["qhse_records", {
        record_date: payload.date, record_type: payload.type, title: payload.title,
        description: payload.description || null, responsible: payload.responsible || null,
        severity: payload.severity, status: payload.status, created_by: state.user.id
      }],
      equipment: ["equipment", {
        name: payload.name, category: payload.category, location: payload.location || null,
        status: payload.status, hourmeter: Number(payload.hourmeter || 0),
        last_work_hours: Number(payload.last_hours || 0),
        diesel_initial: Number(payload.diesel_initial || 0),
        diesel_refueled: Number(payload.refueled || 0),
        diesel_final: Number(payload.diesel_final || 0),
        next_maintenance_date: payload.next_maintenance_date || null,
        maintenance_due_hourmeter: Number(payload.maintenance_due_hourmeter || 0) || null,
        maintenance_interval_hours: Number(payload.maintenance_interval_hours || 0) || null,
        notes: payload.notes || null, updated_by: state.user.id
      }],
      certificate: ["certificates", {
        user_id: payload.user_id, owner_name: payload.owner,
        title: payload.title, issuer: payload.issuer || null,
        issued_at: payload.issued_at || null, expires_at: payload.expires_at || null,
        status: payload.status, created_by: state.user.id
      }],
      alert: ["alerts", {
        title: payload.title, message: payload.message, level: payload.level,
        target_group: payload.target || null, is_read: false, created_by: state.user.id
      }]
    };
    const [table, row] = maps[kind];
    if (id && Object.prototype.hasOwnProperty.call(row, "created_by")) delete row.created_by;
    const query = id
      ? state.client.from(table).update(row).eq("id", id).select("id").single()
      : state.client.from(table).insert(row).select("id").single();
    const { data, error } = await query;
    if (error) throw error;
    return data.id;
  }

  async function saveMaintenanceOrder(payload, id = null) {
    const completed = ["Concluída", "Fechada"].includes(payload.status);
    const row = {
      equipment_id: payload.equipment_id, title: payload.title,
      description: payload.description || null, priority: payload.priority,
      status: payload.status, due_date: payload.due_date || null,
      responsible: payload.responsible || null, maintenance_type: payload.maintenance_type,
      parts_used: payload.parts_used || null, solution: payload.solution || null,
      estimated_cost: Number(payload.estimated_cost || 0), actual_cost: Number(payload.actual_cost || 0),
      before_notes: payload.before_notes || null, after_notes: payload.after_notes || null,
      closed_at: completed ? new Date().toISOString() : null,
      completed_by: completed ? state.user.id : null,
      created_by: id ? undefined : state.user.id
    };
    Object.keys(row).forEach(key => row[key] === undefined && delete row[key]);
    const query = id
      ? state.client.from("maintenance_orders").update(row).eq("id", id).select("id").single()
      : state.client.from("maintenance_orders").insert(row).select("id").single();
    const { data, error } = await query;
    if (error) throw error;
    return data.id;
  }

  function showPage(page, options = {}) {
    if (role() === "tv" && page !== "tv") page = "tv";
    if (!moduleAllowed(page)) return toast("Seu perfil não possui acesso a este módulo.", "error");
    state.page = page;
    const targetPage = $(`#page-${page}`);
    if (!targetPage) return toast("A página solicitada não está disponível.", "error");
    $$(".page").forEach(item => item.classList.remove("active"));
    $$(".nav-item").forEach(item => item.classList.toggle("active", item.dataset.page === page));
    targetPage.classList.add("active");
    $("#sidebar")?.classList.remove("open");
    $("#sidebarBackdrop")?.classList.remove("visible");
    closeMobileSheets();
    localStorage.setItem("opscontrol_last_page", page);
    if (options.history !== false && location.hash !== `#${page}`) {
      history.pushState({ page }, "", `#${page}`);
    }
    if (options.scroll !== false) window.scrollTo({ top: 0, behavior: "instant" });
    if (page === "tv") {
      renderTv();
      startTvMode();
    } else {
      stopTvMode();
    }
    renderMobileShell();
  }

  function setupMobilePullToRefresh() {
    const main = $(".main-content");
    const indicator = $("#pullRefreshIndicator");
    if (!main || !indicator || main.dataset.pullReady === "true") return;
    main.dataset.pullReady = "true";

    main.addEventListener("touchstart", event => {
      if (!isMobileViewport() || window.scrollY > 0 || !$("#modal")?.classList.contains("hidden") || state.mobile.pullRefreshing) return;
      state.mobile.pullStartY = event.touches[0].clientY;
      state.mobile.pullDistance = 0;
      state.mobile.pullReady = true;
    }, { passive: true });

    main.addEventListener("touchmove", event => {
      if (!state.mobile.pullReady) return;
      const distance = Math.max(0, Math.min(110, (event.touches[0].clientY - state.mobile.pullStartY) * 0.55));
      if (distance <= 0) return;
      state.mobile.pullDistance = distance;
      document.documentElement.style.setProperty("--pull-distance", `${distance}px`);
      document.body.classList.add("mobile-pulling");
      indicator.querySelector("strong").textContent = distance >= 72 ? "Solte para atualizar" : "Puxe para atualizar";
      if (distance > 10) event.preventDefault();
    }, { passive: false });

    main.addEventListener("touchend", async () => {
      if (!state.mobile.pullReady) return;
      const shouldRefresh = state.mobile.pullDistance >= 72;
      state.mobile.pullReady = false;
      state.mobile.pullDistance = 0;
      document.body.classList.remove("mobile-pulling");
      document.documentElement.style.setProperty("--pull-distance", "0px");
      indicator.querySelector("strong").textContent = shouldRefresh ? "Atualizando..." : "Puxe para atualizar";
      if (shouldRefresh) {
        state.mobile.pullRefreshing = true;
        indicator.classList.add("refreshing");
        await refreshRealtime("gesto de atualização", true);
        state.mobile.pullRefreshing = false;
        indicator.classList.remove("refreshing");
        indicator.querySelector("strong").textContent = "Puxe para atualizar";
      }
    }, { passive: true });
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }

  function smartAnswer(question) {
    const q = question.toLowerCase();
    const d = state.data;

    if (q.includes("brine")) {
      const volume = d.tanks.filter(t => productClass(t.product) === "brine").reduce((s, t) => s + t.volume, 0);
      return `Há ${fmt.format(volume)} bbl de Brine registrados nos tanques.`;
    }
    if (q.includes("sbm")) {
      const volume = d.tanks.filter(t => productClass(t.product) === "sbm").reduce((s, t) => s + t.volume, 0);
      return `Há ${fmt.format(volume)} bbl de SBM registrados nos tanques.`;
    }
    if (q.includes("wbm")) {
      const volume = d.tanks.filter(t => productClass(t.product) === "wbm").reduce((s, t) => s + t.volume, 0);
      return `Há ${fmt.format(volume)} bbl de WBM registrados nos tanques.`;
    }
    if (q.includes("barita")) {
      const ops = d.operations.filter(op => op.product.toLowerCase().includes("barita"));
      const total = ops.reduce((s, op) => s + op.executed, 0);
      return `Foram registrados ${fmt.format(total)} nas operações de Barita em ${ops.length} operação(ões).`;
    }
    if (q.includes("químic") || q.includes("quimic") || q.includes("estoque químico") || q.includes("estoque quimico")) {
      const low = d.chemicals.filter(item => item.quantity <= item.minimum);
      const expired = d.chemicals.filter(item => {
        const days = daysUntil(item.expiry_date);
        return days !== null && days < 0;
      });
      if (q.includes("baixo") || q.includes("mínimo") || q.includes("minimo")) {
        return low.length ? `Produtos em baixo estoque: ${low.map(x => `${x.name} (${fmt.format(x.quantity)} ${x.unit})`).join(", ")}.` : "Não há produtos químicos abaixo do estoque mínimo.";
      }
      if (q.includes("venc")) {
        return expired.length ? `Produtos vencidos: ${expired.map(x => `${x.name} — lote ${x.lot || "-"}`).join(", ")}.` : "Não há produtos químicos vencidos.";
      }
      return `O inventário químico possui ${d.chemicals.length} produto(s)/lote(s), sendo ${low.length} em baixo estoque e ${expired.length} vencido(s).`;
    }

    if (q.includes("carreta")) {
      const weekAgo = Date.now() - 7 * 86400000;
      const total = d.trucks.filter(item => new Date(`${item.date}T12:00`) >= weekAgo).length;
      return `Foram registradas ${total} movimentações de carretas nos últimos 7 dias.`;
    }
    if (q.includes("diesel")) {
      const ranked = d.equipment.map(item => ({
        name: item.name,
        used: Math.max(0, item.diesel_initial + item.refueled - item.diesel_final)
      })).sort((a, b) => b.used - a.used);
      return ranked.length ? `${ranked[0].name} apresenta o maior consumo registrado: ${fmt.format(ranked[0].used)} L.` : "Não há consumo de diesel registrado.";
    }
    if (q.includes("certificado")) {
      const expiring = d.certificates.filter(item => {
        const days = daysUntil(item.expires_at);
        return days !== null && days >= 0 && days <= 60;
      });
      return `${expiring.length} certificado(s) vencem nos próximos 60 dias.`;
    }
    if (q.includes("tanque") && q.includes("bloque")) {
      const blocked = d.tanks.filter(t => t.status === "Bloqueado");
      return blocked.length ? `Tanques bloqueados: ${blocked.map(x => x.name).join(", ")}.` : "Não há tanques bloqueados.";
    }
    return "Posso responder sobre Brine, WBM, SBM, Barita, inventário químico, carretas, diesel, certificados e tanques bloqueados.";
  }

  document.addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.target;
    if (state.testMode && form.id !== "feedbackForm") {
      simulateFormSubmission(form);
      return;
    }
    if (!navigator.onLine && form.id !== "loginForm") {
      if (queueOfflineForm(form)) {
        closeModal(); toast("Registro salvo na fila offline. Será sincronizado quando a internet voltar.", "success");
        return;
      }
      return toast("Este registro altera saldo ou dados críticos e exige conexão com o Supabase.", "error");
    }
    try {
      if (!navigator.onLine) throw new Error("Sem internet. Reconecte para salvar alterações.");


      if (form.id === "feedbackForm") {
        const payload = Object.fromEntries(new FormData(form));
        const { error } = await state.client.from("app_feedback").insert({
          category: payload.category,
          page: payload.page || state.page,
          rating: payload.rating ? Number(payload.rating) : null,
          message: payload.message.trim(),
          device_info: `${navigator.userAgent} | ${window.innerWidth}x${window.innerHeight}`,
          app_version: APP_VERSION,
          created_by: state.user.id
        });
        if (error) throw error;
      }

      if (form.id === "operationForm") {
        const payload = Object.fromEntries(new FormData(form));
        payload.locked = form.querySelector('[name="locked"]')?.checked === true;
        payload.apply_tank_movement = form.querySelector('[name="apply_tank_movement"]')?.checked === true;
        const files = [...(form.querySelector('[name="attachment"]')?.files || [])];
        delete payload.attachment;
        const allocations = collectOperationAllocations(form);
        const recordId = await saveOperation(payload, form.dataset.id || null, allocations);
        if (files.length) await uploadAttachments("operation", recordId, files);
      }

      if (form.id === "tankForm") {
        await saveTankVolume(form, form.querySelector('[data-action="save-tank-volume"]'));
        return;
      }

      if (form.id === "tankTransferForm") {
        const payload = Object.fromEntries(new FormData(form));
        const quantity = parseTankVolume(payload.quantity);
        if (!Number.isFinite(quantity) || quantity <= 0) throw new Error("Informe uma quantidade válida.");
        const { error } = await state.client.rpc("transfer_tank_volume", {
          p_source_tank_id: payload.source_tank_id,
          p_destination_tank_id: payload.destination_tank_id,
          p_quantity: quantity,
          p_reference: payload.reference || null,
          p_notes: payload.notes || null
        });
        if (error) throw error;
      }

      if (form.id === "newUserForm") {
        if (!isAdmin()) throw new Error("Somente administradores podem criar usuários.");
        const payload = Object.fromEntries(new FormData(form));
        if (String(payload.password || "").length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");
        const tempClient = window.supabase.createClient(state.config.url, state.config.key, {
          auth: { persistSession: false, autoRefreshToken: false, storageKey: `opscontrol-create-${Date.now()}` }
        });
        const { data, error } = await tempClient.auth.signUp({
          email: String(payload.email).trim().toLowerCase(),
          password: payload.password,
          options: { data: { full_name: payload.full_name } }
        });
        if (error) throw error;
        if (!data.user?.id) throw new Error("O Supabase não devolveu o novo usuário.");
        let profileUpdated = false;
        for (let attempt = 0; attempt < 6 && !profileUpdated; attempt++) {
          await new Promise(resolve => setTimeout(resolve, 300));
          const { error: updateError } = await state.client.from("profiles").update({
            full_name: payload.full_name,
            role: payload.role,
            department: payload.department || null,
            active: true
          }).eq("id", data.user.id);
          profileUpdated = !updateError;
        }
        if (!profileUpdated) throw new Error("A conta foi criada, mas o perfil ainda não ficou disponível para configuração.");
      }


      if (form.id === "truckForm") {
        if (!canManageTrucks()) throw new Error("Seu perfil não pode cadastrar ou editar carretas.");
        const files = [...(form.querySelector('[name="attachment"]')?.files || [])];
        const payload = Object.fromEntries(new FormData(form));
        delete payload.attachment;
        const items = collectTruckPlatformItems(form);
        const recordId = await saveTruck(payload, form.dataset.id || null, items);
        if (files.length) await uploadAttachments("truck", recordId, files);
      }

      if (form.id === "genericForm") {
        const kind = form.dataset.kind;
        if (kind === "certificate" && !canManageCertificates()) {
          throw new Error("Somente Logística, Supervisor ou Administrador podem cadastrar certificados.");
        }
        const files = [...(form.querySelector('[name="attachment"]')?.files || [])];
        const payload = Object.fromEntries(new FormData(form));
        delete payload.attachment;
        if ("active" in payload) payload.active = payload.active === "true";
        const recordId = await saveEntity(kind, payload, form.dataset.id || null);
        if (files.length && ["fluid", "truck", "qhse", "certificate"].includes(kind)) {
          await uploadAttachments(kind, recordId, files);
        }
      }


      if (form.id === "chemicalProductForm") {
        if (!canManageChemicals()) throw new Error("Seu perfil não pode alterar o Catálogo Químico.");
        const payload=Object.fromEntries(new FormData(form));
        const {data,error}=await state.client.rpc("save_chemical_product",{p_id:form.dataset.id||null,p_name:payload.name?.trim(),p_category:payload.category?.trim()||null,p_default_unit:payload.unit,p_active:payload.active==="true",p_notes:payload.notes?.trim()||null});
        if(error) throw error;
        const row=Array.isArray(data)?data[0]:data;
        if(!row?.id) throw new Error("O Supabase não confirmou o produto químico.");
      }

      if (form.id === "closingForm") {
        if (!hasRole(["supervisor","lider"])) throw new Error("Seu perfil não pode fechar o turno.");
        const payload=Object.fromEntries(new FormData(form));
        const counts=collectClosingCounts(form);
        const {data,error}=await state.client.rpc("close_operational_period",{p_date:payload.date,p_shift:payload.shift,p_notes:payload.notes?.trim()||null,p_counts:counts});
        if(error) throw error;
        const row=Array.isArray(data)?data[0]:data;
        if(!row?.id) throw new Error("O Supabase não confirmou o fechamento.");
      }

      if (form.id === "reopenClosingForm") {
        const payload=Object.fromEntries(new FormData(form));
        const {error}=await state.client.rpc("reopen_operational_closing",{p_closing_id:form.dataset.id,p_reason:payload.reason?.trim()});
        if(error) throw error;
      }

      if (form.id === "chemicalForm") {
        if (!canManageChemicals()) throw new Error("Seu perfil não pode alterar o inventário químico.");

        const files = [...(form.querySelector('[name="attachment"]')?.files || [])];
        const payload = Object.fromEntries(new FormData(form));
        delete payload.attachment;

        const initialQuantity = form.dataset.id ? 0 : parseOptionalDecimal(payload.quantity);
        const minimumQuantity = parseOptionalDecimal(payload.minimum_quantity) ?? 0;

        if (Number.isNaN(initialQuantity)) throw new Error("Informe uma quantidade inicial válida.");
        if (Number.isNaN(minimumQuantity)) throw new Error("Informe um estoque mínimo válido.");
        if ((initialQuantity ?? 0) < 0) throw new Error("A quantidade inicial não pode ser negativa.");
        if (minimumQuantity < 0) throw new Error("O estoque mínimo não pode ser negativo.");

        if (!payload.product_id) throw new Error("Selecione um produto do Catálogo Químico.");
        const { data, error } = await state.client.rpc("save_chemical_inventory_v3", {
          p_inventory_id: form.dataset.id || null,
          p_product_id: payload.product_id,
          p_lot: payload.lot?.trim() || null,
          p_initial_quantity: initialQuantity ?? 0,
          p_minimum_quantity: minimumQuantity,
          p_expiry_date: payload.expiry_date || null,
          p_location: payload.location?.trim() || null,
          p_supplier: payload.supplier?.trim() || null,
          p_status: payload.status,
          p_notes: payload.notes?.trim() || null
        });

        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : data;
        if (!row?.id) throw new Error("O Supabase não confirmou o cadastro do produto químico.");

        const { data: confirmed, error: confirmError } = await state.client
          .from("chemical_inventory")
          .select("id,product_name,quantity,updated_at")
          .eq("id", row.id)
          .single();

        if (confirmError) throw confirmError;
        if (!confirmed?.id) throw new Error("Não foi possível confirmar o produto salvo.");

        if (files.length) await uploadAttachments("chemical", row.id, files);
      }

      if (form.id === "chemicalMovementForm") {
        if (!canManageChemicals()) throw new Error("Seu perfil não pode movimentar o inventário químico.");

        const payload = Object.fromEntries(new FormData(form));
        const amount = parseOptionalDecimal(payload.quantity);
        if (Number.isNaN(amount) || amount === null) throw new Error("Informe uma quantidade válida.");
        if (amount < 0) throw new Error("A quantidade não pode ser negativa.");
        if (payload.movement_type !== "Ajuste" && amount <= 0) {
          throw new Error("Informe uma quantidade maior que zero.");
        }

        const { data, error } = await state.client.rpc("move_chemical_inventory", {
          p_inventory_id: form.dataset.id,
          p_movement_type: payload.movement_type,
          p_quantity: amount,
          p_reference: payload.reference?.trim() || null,
          p_notes: payload.notes?.trim() || null
        });

        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : data;
        if (!row?.id) throw new Error("O Supabase não confirmou a movimentação.");

        const { data: confirmed, error: confirmError } = await state.client
          .from("chemical_inventory")
          .select("id,quantity,updated_at")
          .eq("id", row.id)
          .single();

        if (confirmError) throw confirmError;
        if (Math.abs(Number(confirmed.quantity) - Number(row.quantity)) > 0.001) {
          throw new Error("O saldo confirmado é diferente do saldo movimentado.");
        }
      }

      if (form.id === "handoverPendingForm") {
        if (!canManageHandover()) throw new Error("Seu perfil não pode alterar a passagem de serviço.");
        const payload = Object.fromEntries(new FormData(form));
        const completed = payload.status === "Concluído";
        const row = {
          title: payload.title?.trim(),
          description: payload.description?.trim() || null,
          category: payload.category,
          responsible: payload.responsible?.trim() || null,
          priority: payload.priority,
          status: payload.status,
          due_at: payload.due_at ? new Date(payload.due_at).toISOString() : null,
          completed_at: completed ? new Date().toISOString() : null,
          completed_by: completed ? state.user.id : null
        };
        const query = form.dataset.id
          ? state.client.from("handover_pending_items").update(row).eq("id", form.dataset.id).select("id").single()
          : state.client.from("handover_pending_items").insert({ ...row, created_by: state.user.id }).select("id").single();
        const { data, error } = await query;
        if (error) throw error;
        if (!data?.id) throw new Error("O Supabase não confirmou a pendência.");
      }

      if (form.id === "eventForm") {
        const payload = Object.fromEntries(new FormData(form));
        const { error } = await state.client.from("operation_events").insert({
          operation_id: form.dataset.operationId,
          event_time: payload.event_time, title: payload.title,
          description: payload.description || null, event_type: payload.event_type,
          quantity: Number(payload.quantity || 0) || null,
          unit: payload.unit === "-" ? null : payload.unit,
          created_by: state.user.id
        });
        if (error) throw error;
      }

      if (form.id === "actionItemForm") {
        const payload = Object.fromEntries(new FormData(form));
        const row = {
          qhse_record_id: form.dataset.qhseId, title: payload.title,
          description: payload.description || null, responsible: payload.responsible || null,
          due_date: payload.due_date || null, status: payload.status,
          completed_at: payload.status === "Concluído" ? new Date().toISOString() : null
        };
        const query = form.dataset.id
          ? state.client.from("action_items").update(row).eq("id", form.dataset.id)
          : state.client.from("action_items").insert({ ...row, created_by: state.user.id });
        const { error } = await query;
        if (error) throw error;
      }

      if (form.id === "maintenanceOrderForm") {
        const files = [...(form.querySelector('[name="attachment"]')?.files || [])];
        const payload = Object.fromEntries(new FormData(form));
        delete payload.attachment;
        const recordId = await saveMaintenanceOrder(payload, form.dataset.id || null);
        if (files.length) await uploadAttachments("maintenance", recordId, files);
      }

      if (form.id === "userForm") {
        if (!isAdmin()) throw new Error("Somente o administrador pode alterar usuários.");
        const payload = Object.fromEntries(new FormData(form));
        if (form.dataset.userId === state.user.id && payload.active !== "true") {
          throw new Error("Você não pode bloquear o próprio acesso.");
        }
        if (form.dataset.userId === state.user.id && payload.role !== "admin") {
          throw new Error("O administrador atual não pode remover o próprio cargo.");
        }
        const permissions = {};
        ["dashboard", "quality", "sanitation", "tv", "operations", "tanks", "fluids", "chemical-catalog", "chemicals", "trucks", "qhse", "maintenance", "certificates", "alerts", "reports", "audit"].forEach(module => {
          permissions[module] = form.querySelector(`[name="perm_${module}"]`)?.checked === true;
        });
        if (payload.role === "tv") Object.keys(permissions).forEach(key => permissions[key] = key === "tv");
        const { error } = await state.client.from("profiles").update({
          full_name: payload.full_name,
          role: payload.role,
          department: payload.department || null,
          active: payload.active === "true",
          permissions
        }).eq("id", form.dataset.userId);
        if (error) throw error;
      }

      if (form.id === "attachmentUploadForm") {
        const files = [...(form.querySelector('[name="attachment"]')?.files || [])];
        if (!files.length) throw new Error("Selecione pelo menos um arquivo.");
        await uploadAttachments(form.dataset.module, form.dataset.recordId, files);
      }

      clearFormDraft(form);
      await loadData();
      renderAll();
      closeModal();
      toast(form.dataset.kind === "fluid" ? "Produto e status atualizados com sucesso." : "Registro salvo com sucesso.", "success");
    } catch (error) {
      try {
        if (state.client && state.user) await state.client.from("system_errors").insert({ user_id: state.user.id, context: `form:${form.id || "unknown"}`, message: error.message, stack: error.stack || null, user_agent: navigator.userAgent });
      } catch (_) {}
      toast(`Erro: ${error.message}`, "error");
    }
  });

  document.addEventListener("click", async event => {
    const button = event.target.closest("button");
    if (!button) return;

    if (button.id === "loginBtn") return login();
    if (button.id === "logoutBtn") return logout();
    if (button.id === "menuBtn") {
      const sidebar = $("#sidebar");
      const open = !sidebar.classList.contains("open");
      sidebar.classList.toggle("open", open);
      $("#sidebarBackdrop")?.classList.toggle("visible", open);
      return;
    }
    if (button.id === "sidebarBackdrop") {
      $("#sidebar")?.classList.remove("open");
      button.classList.remove("visible");
      return;
    }
    if (button.id === "mobileSheetBackdrop") return closeMobileSheets();
    if (button.id === "modalClose" || button.hasAttribute("data-close-modal")) return closeModal();
    if (button.dataset.mobilePage) return showPage(button.dataset.mobilePage);
    if (button.classList.contains("nav-item")) return showPage(button.dataset.page);
    if (button.closest(".user-chip")) return showPage("settings");
    if (button.id === "notificationsBtn") return showPage("alerts");
    if (button.id === "globalSearchBtn") return openGlobalSearch();

    if (button.dataset.pageLink) { showPage(button.dataset.pageLink); return; }
    if (button.dataset.alertPage) { showPage(button.dataset.alertPage); return; }

    if (button.hasAttribute("data-tv-slide")) {
      state.tv.slide = Number(button.dataset.tvSlide || 0);
      renderTv();
      return;
    }

    if (button.hasAttribute("data-add-operation-allocation")) {
      addOperationAllocationRow(button.closest("#operationForm"));
      return;
    }
    if (button.hasAttribute("data-remove-operation-allocation")) {
      const form = button.closest("#operationForm");
      button.closest("[data-operation-allocation-row]")?.remove();
      refreshOperationAllocationOptions(form);
      updateOperationAllocationSummary(form);
      return;
    }


    if (button.dataset.searchType) {
      state.searchQuery = $("#globalSearchInput")?.value || state.searchQuery;
      return openSearchResult(button.dataset.searchType, button.dataset.searchId, button.dataset.searchPage);
    }

    if (button.dataset.assetQr) {
      const [type, id] = button.dataset.assetQr.split(":");
      return openAssetQr(type, id);
    }

    if (button.dataset.qualityPage) {
      const type = button.dataset.qualityType;
      const id = button.dataset.qualityId;
      showPage(button.dataset.qualityPage);
      if (type === "tank" || type === "equipment") return openAssetQr(type, id);
      if (type === "operation") return openSearchResult(type, id, "operations");
      if (type === "chemical") return openSearchResult(type, id, "chemicals");
      return;
    }

    const action = button.dataset.action;
    if (button.closest(".mobile-sheet") && !["mobile-more", "mobile-quick"].includes(action)) closeMobileSheets();

    if (action === "add-truck-item") {
      const form = button.closest("#truckForm");
      form?.querySelector("[data-truck-items-list]")?.insertAdjacentHTML("beforeend", truckPlatformItemRow());
      updateTruckPlatformSummary(form);
      scheduleDraftSave(form);
      return;
    }
    if (action === "remove-truck-item") {
      const form = button.closest("#truckForm");
      const rows = form?.querySelectorAll("[data-truck-platform-row]") || [];
      if (rows.length <= 1) return toast("A Plataforma precisa manter pelo menos uma linha.", "error");
      button.closest("[data-truck-platform-row]")?.remove();
      updateTruckPlatformSummary(form);
      scheduleDraftSave(form);
      return;
    }
    if (action === "open-chemical-inventory") {
      closeModal();
      return showPage("chemicals");
    }


    if (action === "new-chemical-product") return openModal("Novo produto químico", chemicalProductForm(), "CATÁLOGO QUÍMICO");
    if (action === "open-chemical-catalog") { closeModal(); return showPage("chemical-catalog"); }
    if (action === "operation-next-step") {
      const form=button.closest("#operationForm"); const step=Number(form?.dataset.step||1);
      try { validateOperationStep(form,step); setOperationStep(form,step+1); } catch(error){ toast(error.message,"error"); }
      return;
    }
    if (action === "operation-prev-step") { const form=button.closest("#operationForm"); setOperationStep(form,Number(form?.dataset.step||1)-1); return; }
    if (action === "new-closing") {
      const selection=ensureHandoverSelection();
      state.closing={date:selection.date,shift:selection.shift};
      return openModal("Fechamento diário operacional",closingForm(selection.date,selection.shift),"FECHAMENTO");
    }
    if (action === "fill-closing-theoretical") {
      button.closest("form")?.querySelectorAll("[data-closing-count]").forEach(input=>input.value=input.placeholder);
      return toast("Campos preenchidos com os saldos teóricos.");
    }

    if (action === "open-feedback") {
      return openModal("Feedback da versão beta", feedbackForm(), "MELHORIA CONTÍNUA");
    }
    if (action === "discard-draft") {
      const form = button.closest("form");
      clearFormDraft(form);
      button.closest(".draft-restored-banner")?.remove();
      form?.reset();
      syncOperationTankFields(form);
      return toast("Rascunho descartado.");
    }
    if (action === "switch-environment") {
      const environment=button.dataset.environment;
      const config=CONFIG.environments?.[environment] || {};
      if(!config.supabaseUrl || !config.supabaseKey) return toast("O ambiente de homologação ainda não possui URL e chave.","error");
      localStorage.setItem(APP_ENV_KEY,environment);
      location.reload();
      return;
    }

    if (action === "toggle-test-mode") {
      setTestMode(!state.testMode);
      return;
    }
    if (action === "export-test-log") {
      downloadJson(`homologacao-${localDateKey()}.json`, { version: APP_VERSION, exported_at: new Date().toISOString(), records: testLog() });
      return toast("Histórico de homologação exportado.", "success");
    }
    if (action === "clear-test-log") {
      if (!confirm("Limpar o histórico local de homologação?")) return;
      localStorage.removeItem(TEST_LOG_KEY);
      renderSettings();
      return toast("Histórico de homologação limpo.");
    }
    if (action === "copy-asset-link") {
      await navigator.clipboard.writeText(button.dataset.link || "");
      return toast("Link do ativo copiado.", "success");
    }
    if (action === "print-asset-qr") {
      document.body.classList.add("print-asset-qr");
      setTimeout(() => window.print(), 80);
      return;
    }

    if (action === "mobile-more") {
      openMobileSheet("more");
      return;
    }
    if (action === "mobile-quick") {
      openMobileSheet("quick");
      return;
    }
    if (action === "mobile-close-sheet") {
      closeMobileSheets();
      return;
    }
    if (action === "install-app") {
      if (!state.installPrompt) return toast("Use a opção “Adicionar à tela de início” do navegador.", "error");
      state.installPrompt.prompt();
      const choice = await state.installPrompt.userChoice;
      if (choice.outcome === "accepted") toast("Instalação iniciada.", "success");
      state.installPrompt = null;
      renderMobileShell();
      return;
    }
    if (action === "tv-prev") {
      changeTvSlide(-1);
      return;
    }
    if (action === "tv-next") {
      changeTvSlide(1);
      return;
    }
    if (action === "tv-toggle") {
      state.tv.paused = !state.tv.paused;
      startTvMode();
      renderTv();
      return;
    }
    if (action === "tv-fullscreen") {
      const target = $("#page-tv");
      try {
        if (!document.fullscreenElement) await target.requestFullscreen();
        else await document.exitFullscreen();
      } catch (error) {
        toast(`Não foi possível abrir a tela cheia: ${error.message}`, "error");
      }
      renderTv();
      return;
    }
    if (action === "apply-handover-filter") {
      state.handover = {
        date: $("#handoverDate")?.value || defaultHandoverSelection().date,
        shift: $("#handoverShift")?.value || "day"
      };
      renderReports();
      return;
    }
    if (action === "new-handover-pending") {
      if (!canManageHandover()) return toast("Seu perfil não pode adicionar pendências.", "error");
      return openModal("Nova pendência da passagem", handoverPendingForm(), "PASSAGEM");
    }
    if (action === "save-handover-note") {
      if (!canManageHandover()) return toast("Seu perfil não pode alterar as observações.", "error");
      const selection = ensureHandoverSelection();
      const observations = $("#handoverObservations")?.value.trim() || null;
      const { error } = await state.client.from("shift_handover_notes").upsert({
        shift_date: selection.date,
        shift_type: selection.shift,
        observations,
        updated_by: state.user.id
      }, { onConflict: "shift_date,shift_type" });
      if (error) return toast(error.message, "error");
      await loadData();
      renderReports();
      return toast("Observações do turno salvas.", "success");
    }
    if (action === "print-handover") {
      document.body.classList.add("print-handover");
      setTimeout(() => window.print(), 100);
      return;
    }

    if (action === "backup-json") {
      downloadJson(`opscontrol-backup-${localDateKey()}.json`, backupPayload());
      return toast("Backup completo gerado.", "success");
    }
    if (action === "sync-offline") {
      if (!navigator.onLine) return toast("Sem conexão para sincronizar.", "error");
      await syncOfflineQueue(); return;
    }
    const directWriteActions = ["deliver-handover","approve-handover","reopen-handover","save-handover-note","save-tank-volume"];
    if (state.testMode && directWriteActions.includes(action)) {
      addTestLog(`action:${action}`, { page: state.page });
      return toast("Ação simulada na homologação local. O banco oficial não foi alterado.", "success");
    }
    if (action === "deliver-handover") {
      const selection=ensureHandoverSelection(); const snapshot=handoverSnapshot(selection);
      const checklist=checklistForShift(selection); const missing=checklist.filter(x=>!x.completed);
      if (missing.length&&!confirm(`Existem ${missing.length} itens do checklist pendentes. Entregar mesmo assim?`)) return;
      const summary={ selection, generated_at:new Date().toISOString(), delivered_by:state.data.profile.name,
        counts:{operations:snapshot.completedOperations.length,events:snapshot.events.length,movements:snapshot.tankMovements.length,pendings:snapshot.openPendings.length}, checklist, observations:snapshot.observations };
      const {error}=await state.client.rpc("submit_shift_handover",{p_shift_date:selection.date,p_shift_type:selection.shift,p_snapshot_json:summary,p_snapshot_text:handoverText(selection)});
      if(error)return toast(error.message,"error"); await loadData();renderReports();return toast("Passagem entregue e numerada.","success");
    }
    if (action === "approve-handover") {
      const selection=ensureHandoverSelection(); const {error}=await state.client.rpc("approve_shift_handover",{p_shift_date:selection.date,p_shift_type:selection.shift});
      if(error)return toast(error.message,"error"); await loadData();renderReports();return toast("Recebimento confirmado. Passagem bloqueada.","success");
    }
    if (action === "reopen-handover") {
      const selection=ensureHandoverSelection(); if(!confirm("Reabrir esta passagem aprovada?"))return;
      const {error}=await state.client.rpc("reopen_shift_handover",{p_shift_date:selection.date,p_shift_type:selection.shift});
      if(error)return toast(error.message,"error"); await loadData();renderReports();return toast("Passagem reaberta.","success");
    }
    if (action === "view-approved-handover") {
      const approval=selectedHandoverApproval(); return openModal(`Passagem nº ${String(approval.sequence_no).padStart(5,"0")}`,`<pre class="approved-handover-text">${esc(approval.snapshot_text||"Sem versão salva.")}</pre>`,`VERSÃO ENTREGUE`);
    }
    if (action === "refresh") {
      const original = button.textContent;
      button.disabled = true;
      button.textContent = "Atualizando...";
      await refreshRealtime("atualização manual", true);
      button.disabled = false;
      button.textContent = original;
      return;
    }
    if (action === "apply-dashboard-filters") {
      state.filters = { start: $("#filterStart")?.value || "", end: $("#filterEnd")?.value || "", client: $("#filterClient")?.value || "", product: $("#filterProduct")?.value || "" };
      renderDashboard(); renderOperations(); renderTrucks();
      return;
    }
    if (action === "clear-dashboard-filters") {
      state.filters = { start: "", end: "", client: "", product: "" };
      renderDashboard(); renderOperations(); renderTrucks();
      return;
    }

    if (action === "refresh-tank-products") {
      try {
        button.disabled = true;
        button.textContent = "Atualizando...";
        await refreshTankProductList(button.closest("form"));
      } catch (error) {
        toast(error.message || "Não foi possível atualizar a lista.", "error");
      } finally {
        button.disabled = false;
        button.textContent = "Atualizar lista";
      }
      return;
    }

    if (action === "save-tank-volume") {
      try {
        await saveTankVolume(button.closest("form"), button);
      } catch (error) {
        toast(`Erro ao atualizar volume: ${error.message}`, "error");
      }
      return;
    }
    if (action === "new-operation") return openModal("Nova operação", operationForm(), "OPERAÇÃO");
    if (action === "new-tank-transfer") return openModal("Transferência entre tanques", tankTransferForm(), "TRANSFERÊNCIA");
    if (action === "new-user") return openModal("Novo usuário", newUserForm(), "USUÁRIO");
    if (action === "show-fefo") {
      const items = [...state.data.chemicals].filter(x => x.quantity > 0).sort((a,b) => (a.expiry_date || "9999-12-31").localeCompare(b.expiry_date || "9999-12-31"));
      return openModal("Ordem de consumo FEFO", `<div class="info-box">Consumir primeiro os lotes que vencem antes.</div><div class="attachment-list" style="margin-top:12px">${items.map((item,index) => `<div class="attachment-item"><div class="attachment-icon">${index+1}</div><div class="attachment-info"><strong>${esc(item.name)} — lote ${esc(item.lot || "-")}</strong><small>Validade ${dateOnly(item.expiry_date)} • ${fmt.format(item.quantity)} ${esc(item.unit)}</small></div>${badge(chemicalDisplayStatus(item))}</div>`).join("") || `<div class="empty">Nenhum lote disponível.</div>`}</div>`, "FEFO");
    }
    if (action === "new-fluid") return openModal("Cadastrar fluido", genericForm("fluid", { type:"WBM", unit:"bbl", densityUnit:"ppg", active:true }), "FLUIDOS E GRANÉIS");
    if (action === "new-bulk") return openModal("Cadastrar granel", genericForm("fluid", { type:"Granel", unit:"ton", densityUnit:"t/m³", active:true }), "FLUIDOS E GRANÉIS");
    if (action === "open-fluid-catalog") {
      closeModal();
      return showPage("fluids");
    }
    if (action === "new-chemical") { if (!canManageChemicals()) return toast("Seu perfil não pode alterar o inventário químico.", "error"); return openModal("Adicionar lote ao inventário", chemicalForm(), "INVENTÁRIO"); }
    if (action === "new-truck") return openModal("Nova movimentação de carreta", truckForm(), "CARRETA");
    if (action === "new-qhse") return openModal("Novo registro QHSE", genericForm("qhse"), "QHSE");
    if (action === "new-equipment") return openModal("Novo equipamento", genericForm("equipment"), "EQUIPAMENTO");
    if (action === "new-certificate") { if (!canManageCertificates()) return toast("Somente Logística, Supervisor ou Administrador podem adicionar certificados.", "error"); return openModal("Adicionar certificado", genericForm("certificate"), "CERTIFICADO"); }
    if (action === "new-alert") return openModal("Criar alerta", genericForm("alert"), "ALERTA");
    if (action === "new-maintenance-order") return openModal("Nova ordem de serviço", maintenanceOrderForm(), "MANUTENÇÃO");

    if (action === "send-message") {
      const text = $("#chatText")?.value.trim();
      if (!text) return;
      const { error } = await state.client.from("chat_messages").insert({
        channel: "operacao-geral", sender_id: state.user.id,
        sender_name: state.data.profile.name, message: text
      });
      if (error) return toast(error.message, "error");
      await loadData(); renderAlerts();
      return;
    }

    if (action === "smart-query") {
      const answer = smartAnswer($("#smartQuestion").value.trim());
      const el = $("#smartAnswer");
      el.textContent = answer;
      el.classList.remove("hidden");
      return;
    }

    if (action === "copy-handover") {
      await navigator.clipboard.writeText(handoverText());
      return toast("Passagem de serviço copiada.");
    }

    if (action === "toggle-theme") {
      const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      applyTheme(next);
      return;
    }

    if (button.dataset.editHandoverPending) {
      if (!canManageHandover()) return toast("Seu perfil não pode editar pendências.", "error");
      const item = state.data.handoverPendings.find(x => x.id === button.dataset.editHandoverPending);
      return openModal(`Editar pendência — ${item.title}`, handoverPendingForm(item), "PASSAGEM");
    }

    if (button.dataset.toggleHandoverPending) {
      if (!canManageHandover()) return toast("Seu perfil não pode concluir pendências.", "error");
      const item = state.data.handoverPendings.find(x => x.id === button.dataset.toggleHandoverPending);
      const completed = item.status !== "Concluído";
      const { error } = await state.client.from("handover_pending_items").update({
        status: completed ? "Concluído" : "Pendente",
        completed_at: completed ? new Date().toISOString() : null,
        completed_by: completed ? state.user.id : null
      }).eq("id", item.id);
      if (error) return toast(error.message, "error");
      await loadData(); renderReports();
      return toast(completed ? "Pendência concluída." : "Pendência reaberta.", "success");
    }

    if (button.dataset.deleteHandoverPending) {
      if (!canDeleteHandoverPending()) return toast("Somente liderança, supervisão ou administrador podem excluir.", "error");
      if (!confirm("Excluir esta pendência permanentemente?")) return;
      const { error } = await state.client.from("handover_pending_items").delete().eq("id", button.dataset.deleteHandoverPending);
      if (error) return toast(error.message, "error");
      await loadData(); renderReports();
      return toast("Pendência excluída.");
    }



    if (button.dataset.chemicalLots) {
      const product = state.data.chemicalProducts.find(item => item.id === button.dataset.chemicalLots);
      if (!product) return toast("Produto químico não localizado.", "error");
      return openModal(`Lotes — ${product.name}`, chemicalLotsModal(product.id), "INVENTÁRIO POR LOTE");
    }
    if (button.dataset.newChemicalLot) {
      if (!canManageChemicals()) return toast("Seu perfil não pode alterar o inventário químico.", "error");
      const product = state.data.chemicalProducts.find(item => item.id === button.dataset.newChemicalLot);
      if (!product) return toast("Produto químico não localizado.", "error");
      return openModal(`Adicionar lote — ${product.name}`, chemicalForm({ productId: product.id, lockProduct: true }), "NOVO LOTE");
    }

    if (button.dataset.editChemicalProduct) {
      const item=state.data.chemicalProducts.find(entry=>entry.id===button.dataset.editChemicalProduct);
      return openModal(`Editar produto — ${item.name}`,chemicalProductForm(item),"CATÁLOGO QUÍMICO");
    }
    if (button.dataset.viewClosing) {
      const closing=state.data.closings.find(item=>item.id===button.dataset.viewClosing);
      return openModal(`Fechamento — ${dateOnly(closing.date)}`,closingDetails(closing),"CONCILIAÇÃO");
    }
    if (button.dataset.reopenClosing) {
      return openModal("Reabrir fechamento",`<form id="reopenClosingForm" data-id="${button.dataset.reopenClosing}"><label>Motivo da reabertura *</label><textarea name="reason" required></textarea>${formActions("Reabrir fechamento")}</form>`,"CONTROLE");
    }
    if (button.dataset.exportClosing) {
      const closing=state.data.closings.find(item=>item.id===button.dataset.exportClosing);
      const rows=state.data.closingItems.filter(item=>item.closingId===closing.id).map(item=>[closing.date,closing.shift,item.itemType,item.itemName,item.theoretical,item.measured,item.variance,item.variancePct,item.unit,item.status]);
      return downloadCsv(`conciliacao-${closing.date}-${closing.shift}.csv`,["Data","Turno","Tipo","Item","Teórico","Contado","Diferença","Diferença %","Unidade","Status"],rows);
    }
    if (button.dataset.sanitationPage) {
      showPage(button.dataset.sanitationPage);
      const id=button.dataset.sanitationId;
      if (button.dataset.sanitationPage==="operations") return openSearchResult("operation",id,"operations");
      if (button.dataset.sanitationPage==="tanks") return openAssetQr("tank",id);
      if (button.dataset.sanitationPage==="chemicals") return openSearchResult("chemical",id,"chemicals");
      return;
    }

    if (button.dataset.toggleFluidActive) {
      const nextActive = button.dataset.nextActive === "true";
      const item = state.data.fluids.find(product => product.id === button.dataset.toggleFluidActive);
      const verb = nextActive ? "ativar" : "desativar";
      if (!item) return toast("Produto não encontrado.", "error");
      if (!confirm(`Deseja ${verb} ${item.name}?`)) return;
      try {
        await toggleFluidCatalogActive(item.id, nextActive);
      } catch (error) {
        console.error("Falha ao alterar status do catálogo:", error);
        toast(error.message || "Não foi possível alterar o status.", "error");
      }
      return;
    }

    if (button.dataset.editFluid) {
      const item = state.data.fluids.find(x => x.id === button.dataset.editFluid);
      return openModal(`Editar produto — ${item.name}`, genericForm("fluid", item), "ADMIN");
    }

    if (button.dataset.editTruck) {
      if (!canManageTrucks()) return toast("Seu perfil não pode editar carretas.", "error");
      const item = state.data.trucks.find(x => x.id === button.dataset.editTruck);
      return openModal(`Editar carreta — ${item.plate || item.product}`, truckForm(item), "CARRETA");
    }

    if (button.dataset.truckItems) {
      const item = state.data.trucks.find(x => x.id === button.dataset.truckItems);
      if (!item) return toast("Carreta não localizada.", "error");
      return openModal(`Itens da Plataforma — ${item.plate || item.invoice || item.id}`, `<div class="truck-detail-list">${(item.items || []).map((product,index) => `<div class="attachment-item"><div class="attachment-icon">${index+1}</div><div class="attachment-info"><strong>${esc(product.productName)}</strong><small>${fmt.format(product.quantity)} ${esc(product.unit)}</small></div></div>`).join("") || `<div class="empty">Nenhum produto detalhado.</div>`}</div>`, "PLATAFORMA");
    }

    if (button.dataset.editQhse) {
      const item = state.data.qhse.find(x => x.id === button.dataset.editQhse);
      return openModal(`Editar QHSE — ${item.title}`, genericForm("qhse", item), "ADMIN");
    }

    if (button.dataset.editEquipment) {
      const item = state.data.equipment.find(x => x.id === button.dataset.editEquipment);
      return openModal(`Editar equipamento — ${item.name}`, genericForm("equipment", item), "ADMIN");
    }

    if (button.dataset.editCertificate) {
      if (!canManageCertificates()) return toast("Somente Logística, Supervisor ou Administrador podem editar certificados.", "error");
      const item = state.data.certificates.find(x => x.id === button.dataset.editCertificate);
      return openModal(`Editar certificado — ${item.title}`, genericForm("certificate", item), "CERTIFICADO");
    }

    if (button.dataset.editAlert) {
      const item = state.data.alerts.find(x => x.id === button.dataset.editAlert);
      return openModal(`Editar alerta — ${item.title}`, genericForm("alert", item), "ADMIN");
    }

    if (button.dataset.editChemical) {
      if (!canManageChemicals()) return toast("Seu perfil não pode editar o inventário químico.", "error");
      const item = state.data.chemicals.find(x => x.id === button.dataset.editChemical);
      return openModal(`Editar — ${item.name}`, chemicalForm(item), "INVENTÁRIO");
    }

    if (button.dataset.chemicalMove) {
      if (!canManageChemicals()) return toast("Seu perfil não pode movimentar o inventário químico.", "error");
      const item = state.data.chemicals.find(x => x.id === button.dataset.chemicalMove);
      return openModal(`Movimentar — ${item.name}`, chemicalMovementForm(item), "MOVIMENTAÇÃO");
    }

    if (button.dataset.chemicalHistory) {
      const item = state.data.chemicals.find(x => x.id === button.dataset.chemicalHistory);
      const history = state.data.chemicalMovements.filter(x => x.inventory_id === item.id);
      const rows = history.map(movement => {
        const user = state.data.users.find(x => x.id === movement.performed_by)?.name || "Usuário";
        return `<div class="timeline-item"><span class="timeline-dot"></span><div>
          <strong>${esc(movement.movement_type)} — ${fmt.format(movement.quantity)} ${esc(item.unit)}</strong>
          <small>${dateTime(movement.created_at)} • ${esc(user)}</small>
          <p>Saldo: ${fmt.format(movement.previous_balance)} → ${fmt.format(movement.new_balance)} ${esc(item.unit)}<br>
          Referência: ${esc(movement.reference || "-")}<br>${esc(movement.notes || "")}</p>
        </div></div>`;
      }).join("");
      return openModal(`Histórico — ${item.name}`, `<div class="timeline professional-timeline">${rows || `<div class="empty">Nenhuma movimentação registrada.</div>`}</div>`, "RASTREABILIDADE");
    }

    if (button.dataset.export) {
      exportData(button.dataset.export);
      return;
    }

    if (button.dataset.goModule) {
      return showPage(button.dataset.goModule);
    }

    if (button.dataset.applyOperationTank) {
      if (!confirm("Aplicar a quantidade executada na volumetria vinculada?")) return;
      const { error } = await state.client.rpc("apply_completed_operation_tank_movement", { p_operation_id: button.dataset.applyOperationTank });
      if (error) return toast(error.message, "error");
      await loadData(); renderAll(); return toast("Movimentação aplicada à tancagem.", "success");
    }

    if (button.dataset.editOperation) {
      const operation = state.data.operations.find(x => x.id === button.dataset.editOperation);
      return openModal("Editar operação", operationForm(operation), "OPERAÇÃO");
    }

    if (button.dataset.operationTimeline) {
      const operation = state.data.operations.find(x => x.id === button.dataset.operationTimeline);
      const events = state.data.operationEvents.filter(x => x.operation_id === operation.id);
      const timeline = events.map(item => `<div class="timeline-item"><span class="timeline-dot"></span><div><strong>${esc(item.title)}</strong><small>${dateTime(item.event_time)} • ${esc(item.event_type)}</small><p>${esc(item.description || "")}</p>${item.quantity ? `<span class="tag">${fmt.format(item.quantity)} ${esc(item.unit || "")}</span>` : ""}</div></div>`).join("");
      return openModal(`Timeline — ${operation.vessel}`, `
        ${hasRole(["supervisor", "lider", "operador"]) ? `<button class="btn primary" data-add-event="${operation.id}">+ Adicionar evento</button>` : ""}
        <div class="timeline professional-timeline" style="margin-top:14px">${timeline || `<div class="empty">Nenhum evento registrado.</div>`}</div>
      `, "TIMELINE");
    }

    if (button.dataset.addEvent) return openModal("Adicionar evento", eventForm(button.dataset.addEvent), "TIMELINE");

    if (button.dataset.editTank) {
      const tank = state.data.tanks.find(x => x.id === button.dataset.editTank);
      if (!tank) return toast("O tanque selecionado não foi encontrado. Atualize a página.", "error");
      return openModal(`Atualizar conteúdo — ${tank.name}`, tankForm(tank, false), "TANCAGEM");
    }

    if (button.dataset.editTankStructure) {
      if (!isAdmin()) return toast("Somente o administrador pode editar a estrutura.", "error");
      const tank = state.data.tanks.find(x => x.id === button.dataset.editTankStructure);
      if (!tank) return toast("O equipamento selecionado não foi encontrado. Atualize a página.", "error");
      return openModal(`Editar estrutura — ${tank.name}`, tankForm(tank, true), "ADMINISTRAÇÃO");
    }

    if (button.dataset.tankHistory) {
      const tank = state.data.tanks.find(x => x.id === button.dataset.tankHistory);
      return openModal(`Histórico completo — ${tank.name}`, completeTankTimelineHtml(tank), "RASTREABILIDADE");
    }


    if (button.dataset.tankMovements) {
      const tank = state.data.tanks.find(x => x.id === button.dataset.tankMovements);
      const movements = state.data.tankMovements.filter(x => x.source_tank_id === tank.id || x.destination_tank_id === tank.id);
      const rows = movements.map(item => {
        const source = state.data.tanks.find(x => x.id === item.source_tank_id)?.name;
        const destination = state.data.tanks.find(x => x.id === item.destination_tank_id)?.name;
        const direction = item.source_tank_id === tank.id ? "Saída" : "Entrada";
        return `<div class="timeline-item"><span class="timeline-dot"></span><div><strong>${esc(direction)} — ${fmt.format(item.quantity)} ${esc(item.unit)}</strong><small>${dateTime(item.created_at)} • ${esc(item.movement_type)}</small><p>${source && destination ? `${esc(source)} → ${esc(destination)}<br>` : ""}Produto: ${esc(item.product || "-")} • Lote: ${esc(item.lot || "-")}<br>Referência: ${esc(item.reference || "-")}</p></div></div>`;
      }).join("");
      return openModal(`Movimentações — ${tank.name}`, `<div class="timeline professional-timeline">${rows || `<div class="empty">Nenhuma movimentação registrada.</div>`}</div>`, "RASTREABILIDADE");
    }

    if (button.dataset.qhseActions) {
      const record = state.data.qhse.find(x => x.id === button.dataset.qhseActions);
      const actions = state.data.actionItems.filter(x => x.qhse_record_id === record.id);
      return openModal(`Ações — ${record.title}`, `
        ${hasRole(["supervisor", "lider", "qhse"]) ? `<button class="btn primary" data-add-action="${record.id}">+ Nova ação</button>` : ""}
        <div class="section-title">Itens de ação</div>
        <div class="attachment-list">${actions.map(item => `<div class="attachment-item"><div class="attachment-icon">${uiIcon("check")}</div><div class="attachment-info"><strong>${esc(item.title)}</strong><small>${esc(item.responsible || "Sem responsável")} • Prazo ${dateOnly(item.due_date)}</small></div>${badge(item.status)}${isAdmin() ? `<button class="btn small primary" data-edit-action="${item.id}">Editar</button>` : ""}</div>`).join("") || `<div class="empty">Nenhuma ação cadastrada.</div>`}</div>
      `, "QHSE");
    }

    if (button.dataset.addAction) return openModal("Nova ação QHSE", actionItemForm(button.dataset.addAction), "AÇÃO");
    if (button.dataset.editAction) {
      const item = state.data.actionItems.find(x => x.id === button.dataset.editAction);
      return openModal("Editar ação QHSE", actionItemForm(item.qhse_record_id, item), "ADMIN");
    }

    if (button.dataset.newOrderEquipment) return openModal("Nova ordem de serviço", maintenanceOrderForm({}, button.dataset.newOrderEquipment), "MANUTENÇÃO");

    if (button.dataset.action === "clear-chemical-filters") {
      document.querySelectorAll("#page-chemicals [data-chemical-filter]").forEach(field => field.value = "");
      applyChemicalFilters();
      return;
    }

    if (button.dataset.action === "clear-tank-filters") {
      document.querySelectorAll("#page-tanks [data-tank-filter]").forEach(field => field.value = "");
      applyTankFilters();
      return;
    }

    if (button.dataset.editOrder) {
      const order = state.data.maintenanceOrders.find(x => x.id === button.dataset.editOrder);
      return openModal("Editar ordem de serviço", maintenanceOrderForm(order), "MANUTENÇÃO");
    }

    if (button.dataset.editUser) {
      const user = state.data.users.find(x => x.id === button.dataset.editUser);
      return openModal(`Gerenciar ${user.name}`, userForm(user), "USUÁRIO");
    }

    if (button.dataset.attachments) {
      const [module, recordId] = button.dataset.attachments.split(":");
      return showAttachments(module, recordId, button.dataset.attachmentTitle || "Registro");
    }

    if (button.dataset.deleteAttachment) {
      if (!confirm("Excluir este anexo permanentemente?")) return;
      const item = state.data.attachments.find(x => x.id === button.dataset.deleteAttachment);
      const { error: storageError } = await state.client.storage.from("opscontrol-files").remove([item.file_path]);
      if (storageError) return toast(storageError.message, "error");
      const { error } = await state.client.from("attachments").delete().eq("id", item.id);
      if (error) return toast(error.message, "error");
      await loadData(); closeModal(); renderAll(); return toast("Anexo excluído.");
    }

    if (button.dataset.printPage) {
      const oldPage = state.page;
      showPage(button.dataset.printPage);
      setTimeout(() => { window.print(); showPage(oldPage); }, 120);
    }
  });

  document.addEventListener("change", async event => {
    if (event.target.matches("[data-tank-filter]")) applyTankFilters();
    if (event.target.matches("[data-chemical-filter]")) applyChemicalFilters();
    const changedForm = event.target.closest("#modalBody form");
    if (changedForm) scheduleDraftSave(changedForm);
    if (event.target.closest("#truckForm") && event.target.name === "truck_type") syncTruckForm(event.target.closest("#truckForm"), true);
    if (event.target.closest("#truckForm") && ["fluid_type_id","movement"].includes(event.target.name)) syncTruckSingleProduct(event.target.closest("#truckForm"));
    if (event.target.closest("#truckForm") && event.target.matches("[data-truck-item-product]")) {
      syncTruckPlatformRow(event.target.closest("[data-truck-platform-row]"));
      updateTruckPlatformSummary(event.target.closest("#truckForm"));
    }
    if (event.target.closest("#operationForm") && event.target.name === "fluid_type_id") syncOperationCatalogFields(event.target.closest("#operationForm"), true);
    if (event.target.closest("#operationForm") && ["activity","status","apply_tank_movement"].includes(event.target.name)) syncOperationTankFields(event.target.closest("#operationForm"));
    if (event.target.closest("#operationForm") && event.target.matches("[data-allocation-tank]")) updateOperationAllocationSummary(event.target.closest("#operationForm"));
    if (event.target.closest("#tankTransferForm")) updateTransferPreview(event.target.closest("#tankTransferForm"));
    if (event.target.closest("#tankForm") && event.target.name === "fluid_type_id") syncTankCatalogFields(event.target.closest("#tankForm"));
    if (event.target.closest("#tankForm") && event.target.name === "kind") syncSiloCapacityPreview(event.target.closest("#tankForm"));
    if (event.target.closest('#genericForm[data-kind="fluid"]') && event.target.name === "type") syncFluidDensityUnit(event.target.closest("form"));
    if (event.target.closest('#genericForm[data-kind="certificate"]') && event.target.name === "user_id") {
      const form = event.target.closest("form");
      const option = event.target.selectedOptions?.[0];
      const owner = form.elements.owner;
      if (owner && option?.dataset.userName) owner.value = option.dataset.userName;
    }
    if (event.target.matches("[data-shift-checklist]")) {
      if (state.testMode) {
        addTestLog("checklist", { key:event.target.dataset.shiftChecklist, completed:event.target.checked });
        toast("Checklist simulado na homologação local.", "success");
        return;
      }
      const selection=ensureHandoverSelection(); const key=event.target.dataset.shiftChecklist;
      const template=SHIFT_CHECKLIST_TEMPLATE.find(item=>item[0]===key); const note=document.querySelector(`[data-shift-checklist-note="${key}"]`)?.value||"";
      const completed=event.target.checked;
      const {error}=await state.client.from("shift_checklist_items").upsert({shift_date:selection.date,shift_type:selection.shift,item_key:key,item_label:template?.[1]||key,category:template?.[2]||"Operacional",completed,notes:note,completed_by:completed?state.user.id:null,completed_at:completed?new Date().toISOString():null,created_by:state.user.id},{onConflict:"shift_date,shift_type,item_key"});
      if(error){event.target.checked=!completed;return toast(error.message,"error");} await loadData();renderReports();
    }
  });

  document.addEventListener("input", event => {
    if (event.target.matches("[data-tank-filter]")) applyTankFilters();
    if (event.target.matches("[data-chemical-filter]")) applyChemicalFilters();
    if (event.target.closest("#operationForm")) updateOperationReview(event.target.closest("#operationForm"));
    if (event.target.id === "globalSearchInput") {
      state.searchQuery = event.target.value;
      renderGlobalSearchResults(state.searchQuery);
    }
    const draftForm = event.target.closest("#modalBody form");
    if (draftForm) scheduleDraftSave(draftForm);
    if (event.target.closest("#truckForm") && event.target.matches("[data-truck-item-quantity]")) updateTruckPlatformSummary(event.target.closest("#truckForm"));
    if (event.target.closest("#tankTransferForm") && event.target.name === "quantity") updateTransferPreview(event.target.closest("#tankTransferForm"));
    if (event.target.closest("#operationForm") && (event.target.name === "executed" || event.target.matches("[data-allocation-quantity]"))) updateOperationAllocationSummary(event.target.closest("#operationForm"));
    if (event.target.closest("#tankForm") && ["density","physical_capacity_m3","volume"].includes(event.target.name)) {
      syncSiloCapacityPreview(event.target.closest("#tankForm"));
    }
  });

  $("#modal").addEventListener("click", event => {
    if (event.target === $("#modal")) closeModal();
  });

  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    if (!$("#modal")?.classList.contains("hidden")) return closeModal();
    if (state.mobile.moreOpen || state.mobile.quickOpen) return closeMobileSheets();
    $("#sidebar")?.classList.remove("open");
    $("#sidebarBackdrop")?.classList.remove("visible");
  });

  $("#loginPassword").addEventListener("keydown", event => {
    if (event.key === "Enter") login();
  });


  document.addEventListener("focusout", async event => {
    if (!event.target.matches("[data-shift-checklist-note]")) return;
    if (state.testMode) {
      addTestLog("checklist-note", { key:event.target.dataset.shiftChecklistNote, notes:event.target.value });
      return;
    }
    const selection=ensureHandoverSelection(); const key=event.target.dataset.shiftChecklistNote;
    const template=SHIFT_CHECKLIST_TEMPLATE.find(item=>item[0]===key);
    const current=checklistForShift(selection).find(item=>item.item_key===key);
    const {error}=await state.client.from("shift_checklist_items").upsert({shift_date:selection.date,shift_type:selection.shift,item_key:key,item_label:template?.[1]||key,category:template?.[2]||"Operacional",completed:current?.completed||false,notes:event.target.value||null,completed_by:current?.completed_by||null,completed_at:current?.completed_at||null,created_by:state.user.id},{onConflict:"shift_date,shift_type,item_key"});
    if(error)toast(error.message,"error"); else await loadData();
  });

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    state.installPrompt = event;
    renderMobileShell();
  });

  window.addEventListener("appinstalled", () => {
    state.installPrompt = null;
    toast("OpsControl instalado com sucesso.", "success");
    renderMobileShell();
  });

  window.addEventListener("popstate", event => {
    if (!$("#modal")?.classList.contains("hidden")) return closeModal();
    if (state.mobile.moreOpen || state.mobile.quickOpen) return closeMobileSheets();
    if ($("#sidebar")?.classList.contains("open")) {
      $("#sidebar").classList.remove("open");
      $("#sidebarBackdrop")?.classList.remove("visible");
      return;
    }
    const page = event.state?.page || String(location.hash || "").replace("#", "") || "dashboard";
    if (moduleAllowed(page)) showPage(page, { history: false });
  });

  window.addEventListener("online", () => {
    updateConnectionBadge();
    syncOfflineQueue();
    refreshRealtime("conexão restaurada");
  });
  window.addEventListener("offline", updateConnectionBadge);
  window.addEventListener("afterprint", () => {
    document.body.classList.remove("print-handover");
    document.body.classList.remove("print-asset-qr");
  });
  document.addEventListener("fullscreenchange", () => {
    if (state.page === "tv") renderTv();
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(console.error));
  }

  $("#connectionHint").textContent = "Acesse com seu e-mail e senha cadastrados.";
  restoreSession();
})();