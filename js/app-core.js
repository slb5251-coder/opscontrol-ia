(() => {
  "use strict";

  function esc(value = "") {
    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[char]));
  }

  function userInitials(name = "Usuário") {
    return String(name || "Usuário").trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "US";
  }

  function profileAvatarHtml(url, name, className = "") {
    const safeUrl = String(url || "").trim();
    const classes = ["profile-avatar-render", className].filter(Boolean).join(" ");
    if (safeUrl) return `<img class="${esc(classes)}" src="${esc(safeUrl)}" alt="Foto de ${esc(name || "usuário")}" loading="lazy">`;
    return `<span class="${esc(classes)} profile-avatar-fallback">${esc(userInitials(name))}</span>`;
  }

  const UI_ICONS = Object.freeze({
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
    settings: '<circle cx="12" cy="12" r="3"></circle><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.5 1a8 8 0 0 0-1.7-1L14.4 3h-4.8l-.4 3.1a8 8 0 0 0-1.7 1L5 6.1 3 9.5 5 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.5-1a8 8 0 0 0 1.7 1l.4 3.1h4.8l.4-3.1a8 8 0 0 0 1.7-1l2.5 1 2-3.4-2-1.5c.1-.3.1-.7.1-1z"></path>',
    sparkles: '<path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"></path><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z"></path>'
  });

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
    return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }

  function isCriticalAlert(value) {
    return ["alta", "critica", "critico", "critical", "urgente"].includes(normalizedAlertLevel(value));
  }

  function latestTimestamp(values = []) {
    const valid = values.filter(Boolean).map(value => new Date(value)).filter(value => !Number.isNaN(value.getTime()));
    return valid.length ? new Date(Math.max(...valid.map(value => value.getTime()))) : null;
  }

  function normalizeSearch(value = "") {
    return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }

  const MOBILE_PAGE_META = Object.freeze({
    dashboard: ["Início", "Resumo do seu perfil"],
    quality: ["Qualidade dos Dados", "Conciliação e inconsistências"],
    sanitation: ["Saneamento de Dados", "Registros antigos e vínculos"],
    tv: ["Painel TV", "Exibição coletiva"],
    operations: ["Operações", "Serviços e movimentações"],
    "vessel-registry": ["Cadastro de Embarcações", "Nome, IMO e MMSI"],
    tanks: ["Tanques e Silos", "Inventário da planta"],
    fluids: ["Fluidos e Granéis", "Catálogo de produtos"],
    "chemical-catalog": ["Catálogo Químico", "Nomes e unidades oficiais"],
    chemicals: ["Inventário Químico", "Lotes, validade e saldo"],
    trucks: ["Carretas", "Entradas e saídas"],
    "client-tickets": ["Tickets de Clientes", "FDT, FRT, MDT e MRT"],
    qhse: ["QHSE", "Segurança e ações"],
    maintenance: ["Manutenção", "Equipamentos e ordens"],
    certificates: ["Certificados", "Documentos da equipe"],
    alerts: ["Alertas e Chat", "Comunicação operacional"],
    "ai-assistant": ["Assistente IA", "Inteligência operacional"],
    reports: ["Relatórios", "Passagem de serviço"],
    audit: ["Auditoria", "Rastreabilidade"],
    settings: ["Usuários e Acessos", "Perfis e permissões"]
  });

  const DESKTOP_PAGE_META = Object.freeze({
    dashboard: ["Painel Geral de Operações", "Comando central e telemetria da planta"],
    quality: ["Qualidade dos Dados", "Conciliação e integridade dos registros"],
    sanitation: ["Saneamento de Dados", "Tratamento de vínculos e registros antigos"],
    tv: ["Painel TV", "Acompanhamento operacional em tempo real"],
    operations: ["Operações", "Programação e execução dos serviços"],
    "vessel-registry": ["Embarcações", "Cadastro e programação marítima"],
    tanks: ["Tanques e Silos", "Inventário e telemetria da planta"],
    fluids: ["Fluidos e Granéis", "Controle de produtos e movimentações"],
    "chemical-catalog": ["Catálogo Químico", "Padronização de produtos e unidades"],
    chemicals: ["Inventário Químico", "Lotes, validade e níveis de estoque"],
    trucks: ["Carretas", "Recebimentos, expedições e rastreabilidade"],
    "client-tickets": ["Tickets de Clientes", "FDT, FRT, MDT e MRT"],
    qhse: ["QHSE", "Saúde, segurança, meio ambiente e qualidade"],
    maintenance: ["Manutenção", "Ordens de serviço e ativos da planta"],
    certificates: ["Certificados", "Documentos, licenças e vencimentos"],
    alerts: ["Central de Alertas", "Comunicação operacional e direcionamento por função"],
    "ai-assistant": ["Assistente IA", "Passagens, relatórios e análise operacional"],
    reports: ["Relatórios", "Indicadores, consolidações e passagem de serviço"],
    audit: ["Auditoria", "Histórico e rastreabilidade das alterações"],
    settings: ["Usuários e Acessos", "Perfis, acessos e parâmetros do sistema"]
  });

  window.OpsControlCore = Object.freeze({
    version: "20260723-app-core-1",
    esc,
    userInitials,
    profileAvatarHtml,
    uiIcon,
    uid,
    dateOnly,
    dateTime,
    toLocalInput,
    daysUntil,
    localDateKey,
    recordDateKey,
    addDaysToDateKey,
    normalizedAlertLevel,
    isCriticalAlert,
    latestTimestamp,
    normalizeSearch,
    MOBILE_PAGE_META,
    DESKTOP_PAGE_META
  });
})();