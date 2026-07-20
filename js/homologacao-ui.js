(() => {
  "use strict";

  const VERSION = "33.12.14.16-homologacao";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function normalize(value = "") {
    return String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function searchIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-4-4"></path></svg>';
  }

  function moduleIcon(kind) {
    const icons = {
      operations: '<path d="M12 3v15"></path><path d="M8 7l4-4 4 4"></path><path d="M5 21h14"></path><path d="M4 17c2.5 0 3.5 1 5 1s2.5-1 4-1 2.5 1 4 1 2.5-1 3-1"></path>',
      tanks: '<path d="M7 4h10"></path><path d="M7 20h10"></path><path d="M8 4v16"></path><path d="M16 4v16"></path><path d="M8 9h8"></path><path d="M8 15h8"></path>',
      trucks: '<path d="M3 6h11v9H3z"></path><path d="M14 9h3l4 4v2h-7z"></path><circle cx="7.5" cy="18" r="1.5"></circle><circle cx="17.5" cy="18" r="1.5"></circle>',
      alerts: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7"></path><path d="M10.5 20a1.5 1.5 0 0 0 3 0"></path>'
    };
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${icons[kind] || icons.operations}</svg>`;
  }

  function enhanceTopbar() {
    const syncBadge = $("#syncBadge");
    if (!syncBadge || $(".homologacao-badge")) return;
    const badge = document.createElement("span");
    badge.className = "homologacao-badge";
    badge.textContent = "Homologação";
    badge.title = "Ambiente separado da versão principal";
    syncBadge.before(badge);
  }

  function filterNavigation(value) {
    const query = normalize(value);
    const nav = $("#sidebar nav");
    if (!nav) return;

    $$(".nav-item", nav).forEach(item => {
      const label = normalize(item.querySelector(".nav-label")?.textContent || item.textContent);
      item.classList.toggle("homologacao-search-hidden", Boolean(query) && !label.includes(query));
    });

    $$(".nav-section", nav).forEach(section => {
      const visibleItems = $$(".nav-item", section).filter(item => !item.classList.contains("homologacao-search-hidden") && !item.classList.contains("hidden"));
      section.classList.toggle("homologacao-section-hidden", Boolean(query) && visibleItems.length === 0);
      if (query && visibleItems.length) {
        const list = $(".nav-section-list", section);
        const toggle = $(".nav-section-toggle", section);
        list?.classList.remove("collapsed");
        toggle?.setAttribute("aria-expanded", "true");
      }
    });
  }

  function enhanceSidebar() {
    const sidebar = $("#sidebar");
    const nav = sidebar?.querySelector("nav");
    if (!sidebar || !nav || $(".homologacao-sidebar-tools", sidebar)) return;

    const tools = document.createElement("div");
    tools.className = "homologacao-sidebar-tools no-print";
    tools.innerHTML = `
      <div class="homologacao-sidebar-heading">
        <div><small>Nova interface</small><strong>Central de módulos</strong></div>
        <span class="homologacao-sidebar-version">${VERSION}</span>
      </div>
      <div class="homologacao-search-shell">
        ${searchIcon()}
        <input id="homologacaoModuleSearch" type="search" inputmode="search" autocomplete="off" placeholder="Buscar módulo..." aria-label="Buscar módulo no menu">
        <button type="button" class="homologacao-search-clear" aria-label="Limpar busca" title="Limpar busca">×</button>
      </div>
      <div class="homologacao-search-hint">Digite o nome de um módulo. Atalho: tecla /</div>`;
    sidebar.insertBefore(tools, nav);

    const input = $("#homologacaoModuleSearch", tools);
    const clear = $(".homologacao-search-clear", tools);
    input?.addEventListener("input", event => filterNavigation(event.target.value));
    clear?.addEventListener("click", () => {
      if (!input) return;
      input.value = "";
      filterNavigation("");
      input.focus();
    });

    $$(".nav-item", nav).forEach(item => {
      const label = item.querySelector(".nav-label")?.textContent?.trim();
      if (label && !item.title) item.title = label;
    });
  }

  function dashboardBanner() {
    const banner = document.createElement("section");
    banner.className = "homologacao-dashboard-banner no-print";
    banner.innerHTML = `
      <div><i aria-hidden="true"></i><div><strong>Ambiente de homologação</strong><small>Interface em validação com a versão principal preservada.</small></div></div>
      <span>Supabase V2 conectado</span>`;
    return banner;
  }

  function mobileHub() {
    const hub = document.createElement("section");
    hub.className = "homologacao-mobile-hub no-print";
    hub.setAttribute("aria-label", "Acessos operacionais rápidos");
    const links = [
      ["operations", "Operações", "Programação e andamento", "operations"],
      ["tanks", "Tanques e Silos", "Volumes e disponibilidade", "tanks"],
      ["trucks", "Carretas", "Entradas, saídas e fila", "trucks"],
      ["alerts", "Alertas", "Pendências e comunicados", "alerts"]
    ];
    hub.innerHTML = links.map(([page, label, detail, icon]) => `
      <button type="button" class="homologacao-mobile-link" data-homologacao-page="${page}">
        ${moduleIcon(icon)}<span><strong>${label}</strong><small>${detail}</small></span>
      </button>`).join("");
    return hub;
  }

  function enhanceDashboard() {
    const page = $("#page-dashboard");
    const header = page?.querySelector(".page-header");
    if (!page || !header) return;
    if (!page.querySelector(".homologacao-dashboard-banner")) header.after(dashboardBanner());
    const banner = page.querySelector(".homologacao-dashboard-banner");
    if (banner && !page.querySelector(".homologacao-mobile-hub")) banner.after(mobileHub());
  }

  function openPage(page) {
    const target = $(`.nav-item[data-page="${page}"]`);
    if (target) target.click();
  }

  function bindEvents() {
    document.addEventListener("click", event => {
      const link = event.target.closest("[data-homologacao-page]");
      if (link) openPage(link.dataset.homologacaoPage);
    });

    document.addEventListener("keydown", event => {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return;
      const active = document.activeElement;
      if (active?.matches("input, textarea, select, [contenteditable='true']")) return;
      const input = $("#homologacaoModuleSearch");
      if (!input || $("#appView")?.classList.contains("hidden")) return;
      event.preventDefault();
      input.focus();
    });
  }

  function startObservers() {
    const dashboard = $("#page-dashboard");
    if (dashboard) {
      new MutationObserver(() => enhanceDashboard()).observe(dashboard, { childList: true });
    }
    const sidebar = $("#sidebar");
    if (sidebar) {
      new MutationObserver(() => enhanceSidebar()).observe(sidebar, { childList: true, subtree: true });
    }
  }

  function init() {
    document.documentElement.dataset.environment = "homologacao";
    enhanceTopbar();
    enhanceSidebar();
    enhanceDashboard();
    bindEvents();
    startObservers();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
