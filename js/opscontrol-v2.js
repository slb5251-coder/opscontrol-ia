(() => {
  "use strict";

  const VERSION = "34.0.0-homologacao";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function normalize(value = "") {
    return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }

  function icon(name) {
    const paths = {
      search: '<circle cx="11" cy="11" r="7"></circle><path d="M20 20l-4-4"></path>',
      operations: '<path d="M12 3v15"></path><path d="M8 7l4-4 4 4"></path><path d="M5 21h14"></path><path d="M4 17c2.5 0 3.5 1 5 1s2.5-1 4-1 2.5 1 4 1 2.5-1 3-1"></path>',
      tanks: '<path d="M7 4h10"></path><path d="M7 20h10"></path><path d="M8 4v16"></path><path d="M16 4v16"></path><path d="M8 9h8"></path><path d="M8 15h8"></path>',
      trucks: '<path d="M3 6h11v9H3z"></path><path d="M14 9h3l4 4v2h-7z"></path><circle cx="7.5" cy="18" r="1.5"></circle><circle cx="17.5" cy="18" r="1.5"></circle>',
      qhse: '<path d="M12 3l7 3v5c0 4.5-3 8.7-7 10-4-1.3-7-5.5-7-10V6l7-3z"></path><path d="M9.5 12.5l1.8 1.8 3.7-4"></path>',
      maintenance: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.3 2.3-2-2z"></path>'
    };
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.operations}</svg>`;
  }

  function setInterface() {
    document.documentElement.dataset.interface = "v2";
    document.documentElement.dataset.environment = "homologacao";
  }

  function enhanceTopbar() {
    const sync = $("#syncBadge");
    if (!sync || $(".v2-environment-badge")) return;
    const badge = document.createElement("span");
    badge.className = "v2-environment-badge";
    badge.textContent = "Homologação";
    badge.title = "Interface 2.0 em validação; produção preservada";
    sync.before(badge);
  }

  function filterNavigation(value) {
    const query = normalize(value);
    const nav = $("#sidebar nav");
    if (!nav) return;
    $$(".nav-item", nav).forEach(item => {
      const text = normalize(item.querySelector(".nav-label")?.textContent || item.textContent);
      item.classList.toggle("v2-search-hidden", Boolean(query) && !text.includes(query));
    });
    $$(".nav-section", nav).forEach(section => {
      const visible = $$(".nav-item", section).some(item => !item.classList.contains("hidden") && !item.classList.contains("v2-search-hidden"));
      section.classList.toggle("v2-section-hidden", Boolean(query) && !visible);
    });
  }

  function enhanceSidebar() {
    const sidebar = $("#sidebar");
    const nav = sidebar?.querySelector("nav");
    if (!sidebar || !nav || $(".v2-sidebar-tools", sidebar)) return;
    const tools = document.createElement("section");
    tools.className = "v2-sidebar-tools no-print";
    tools.innerHTML = `
      <header><div><small>Interface 2.0</small><strong>Central operacional</strong></div><span class="v2-version">V${VERSION}</span></header>
      <div class="v2-search">${icon("search")}<input id="v2ModuleSearch" type="search" autocomplete="off" inputmode="search" placeholder="Buscar módulo..." aria-label="Buscar módulo"><button class="v2-search-clear" type="button" aria-label="Limpar busca">×</button></div>`;
    sidebar.insertBefore(tools, nav);
    const input = $("#v2ModuleSearch", tools);
    input?.addEventListener("input", e => filterNavigation(e.target.value));
    $(".v2-search-clear", tools)?.addEventListener("click", () => { input.value = ""; filterNavigation(""); input.focus(); });
    $$(".nav-item", nav).forEach(item => { if (!item.title) item.title = item.querySelector(".nav-label")?.textContent?.trim() || ""; });
  }

  function openPage(page) {
    const target = $(`.nav-item[data-page="${page}"]`);
    if (target) target.click();
  }

  function dashboardIntro() {
    const node = document.createElement("section");
    node.className = "v2-dashboard-intro no-print";
    node.innerHTML = `<div><span class="v2-dashboard-pulse"></span><div><strong>Centro de controle conectado</strong><small>Dados operacionais, alertas e tancagem atualizados pela base existente.</small></div></div><b>Supabase V2 • Interface V34</b>`;
    return node;
  }

  function quickGrid() {
    const links = [
      ["operations","Operações","Execução e vazão","operations"],
      ["tanks","Tanques e Silos","Volumes e produtos","tanks"],
      ["trucks","Carretas","Fila e movimentações","trucks"],
      ["qhse","QHSE","Inspeções e ações","qhse"],
      ["maintenance","Manutenção","Ativos e ordens","maintenance"]
    ];
    const node = document.createElement("section");
    node.className = "v2-quick-grid no-print";
    node.setAttribute("aria-label", "Acessos rápidos");
    node.innerHTML = links.map(([page,title,detail,ico]) => `<button type="button" class="v2-quick-link" data-v2-page="${page}">${icon(ico)}<span><strong>${title}</strong><small>${detail}</small></span></button>`).join("");
    return node;
  }

  function assetTone(card) {
    const classes = [...card.classList];
    const found = classes.find(c => c.startsWith("tank-bg-"));
    return found ? found.replace("tank-bg-", "tone-") : "tone-wbm";
  }

  function extractAssets(phase) {
    return $$(`#page-tanks [data-tank-phase="${phase.toLowerCase()}"]`).slice(0, 12).map(card => {
      const name = $("h3", card)?.textContent?.trim() || "TK";
      const product = $(".compact-tank-product strong", card)?.textContent?.trim() || "Sem produto";
      const pctText = $(".tank-progress-caption strong", card)?.textContent?.trim() || $(".tank-mini-visual b", card)?.textContent?.trim() || "0%";
      const level = Math.max(0, Math.min(100, Number(pctText.replace(/[^0-9,.-]/g, "").replace(",", ".")) || 0));
      return { name, product, level, tone: assetTone(card) };
    });
  }

  function plantOverview() {
    const phases = ["Phase #1", "Phase #2"];
    const section = document.createElement("section");
    section.className = "v2-plant-overview";
    section.innerHTML = `
      <div class="v2-plant-overview-header"><div><small>Mapa operacional</small><strong>Disponibilidade da planta</strong></div><button type="button" data-v2-page="tanks">Abrir tancagem</button></div>
      <div class="v2-plant-phases">${phases.map(phase => {
        const assets = extractAssets(phase);
        return `<article class="v2-plant-phase"><header><strong>${phase}</strong><span>${assets.length} ativos exibidos</span></header><div class="v2-asset-strip">${assets.length ? assets.map(a => `<button type="button" class="v2-asset ${a.tone}" style="--level:${a.level}" data-v2-page="tanks"><strong>${a.name}</strong><small>${a.product}</small><b>${a.level.toLocaleString("pt-BR",{maximumFractionDigits:1})}%</b></button>`).join("") : `<span class="muted">Aguardando dados de tancagem.</span>`}</div></article>`;
      }).join("")}</div>`;
    return section;
  }

  function enhanceDashboard() {
    const page = $("#page-dashboard");
    const header = page?.querySelector(".page-header");
    if (!page || !header) return;
    if (!page.querySelector(".v2-dashboard-intro")) {
      const intro = dashboardIntro();
      header.after(intro);
      intro.after(quickGrid());
    }
    const kpis = page.querySelector(".dashboard-kpi-grid");
    if (kpis && !page.querySelector(".v2-plant-overview")) kpis.after(plantOverview());
  }

  function enhancePages() {
    $$(".page").forEach(page => {
      page.dataset.v2Page = page.id.replace(/^page-/, "");
      const eyebrow = page.querySelector(".page-header h1");
      if (eyebrow && !eyebrow.dataset.v2Ready) eyebrow.dataset.v2Ready = "true";
    });
    enhanceDashboard();
  }

  function bindEvents() {
    document.addEventListener("click", event => {
      const link = event.target.closest("[data-v2-page]");
      if (!link) return;
      openPage(link.dataset.v2Page);
    });
    document.addEventListener("keydown", event => {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return;
      if (document.activeElement?.matches("input,textarea,select,[contenteditable='true']")) return;
      const input = $("#v2ModuleSearch");
      if (!input || $("#appView")?.classList.contains("hidden")) return;
      event.preventDefault(); input.focus();
    });
  }

  function observe() {
    const root = $("#appView") || document.body;
    let timer = 0;
    new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => { enhanceTopbar(); enhanceSidebar(); enhancePages(); }, 50);
    }).observe(root, { childList:true, subtree:true });
  }

  function init() {
    setInterface();
    enhanceTopbar();
    enhanceSidebar();
    enhancePages();
    bindEvents();
    observe();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once:true });
  else init();
})();
