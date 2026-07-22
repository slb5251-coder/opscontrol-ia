(() => {
  "use strict";

  const VERSION = "20260722-final-audit-1";
  const MENU_STATE_KEY = "opscontrol_design_menu_groups";
  const MAX_MOBILE_ROWS = 100;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  const TAB_CONTAINERS = [
    '[role="tablist"]', '.tabs', '.tab-list', '.module-tabs', '.filter-tabs',
    '.quality-filter-chips', '.alert-filter-row', '.operation-stepper-head',
    '.alert-workspace-tabs', '.alert-status-filters', '.alert-chat-channels'
  ].join(",");

  const SCROLLABLE_CONTAINERS = [
    '.page-header .actions', '.ui-tab-scroller', '.operation-stepper-head',
    '.table-wrap', '.alert-status-filters', '.alert-chat-channels'
  ].join(",");

  let scheduled = false;
  let resizeTimer = null;
  let menuState = loadMenuState();

  function normalize(value = "") {
    return String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function loadMenuState() {
    try { return JSON.parse(localStorage.getItem(MENU_STATE_KEY) || "{}"); }
    catch { return {}; }
  }

  function saveMenuState() {
    try { localStorage.setItem(MENU_STATE_KEY, JSON.stringify(menuState)); }
    catch { /* A navegação continua funcional sem armazenamento local. */ }
  }

  function setGroupOpen(group, open, persist = true) {
    group.classList.toggle("is-collapsed", !open);
    group.querySelector(".design-nav-group-toggle")?.setAttribute("aria-expanded", String(open));
    const key = group.dataset.designGroup;
    if (persist && key) {
      menuState[key] = open;
      saveMenuState();
    }
  }

  function groupSidebarNavigation() {
    const nav = $("#sidebar > nav");
    if (!nav || nav.dataset.designGrouped === VERSION) return;
    if (nav.querySelector(".design-nav-group")) {
      nav.dataset.designGrouped = VERSION;
      return;
    }

    const items = $$(':scope > .nav-item', nav);
    if (!items.length) return;

    const groups = [
      { key: "overview", label: "Visão geral", pages: ["dashboard", "ai-assistant", "tv"] },
      { key: "operations", label: "Operações", pages: ["operations", "vessel-registry", "client-tickets"] },
      { key: "materials", label: "Logística e materiais", pages: ["tanks", "fluids", "chemical-catalog", "chemicals", "trucks"] },
      { key: "reliability", label: "QHSE e confiabilidade", pages: ["qhse", "maintenance", "certificates", "alerts"] },
      { key: "analytics", label: "Dados e relatórios", pages: ["quality", "sanitation", "reports", "audit"] },
      { key: "admin", label: "Administração", pages: ["settings"] }
    ];

    const byPage = new Map(items.map(item => [item.dataset.page, item]));
    const fragment = document.createDocumentFragment();

    groups.forEach((definition, index) => {
      const groupItems = definition.pages.map(page => byPage.get(page)).filter(Boolean);
      if (!groupItems.length) return;

      const group = document.createElement("section");
      group.className = "design-nav-group";
      group.dataset.designGroup = definition.key;

      const active = groupItems.some(item => item.classList.contains("active"));
      const stored = menuState[definition.key];
      const open = active || (stored === undefined ? index === 0 : stored !== false);
      group.classList.toggle("is-collapsed", !open);

      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "design-nav-group-toggle";
      toggle.setAttribute("aria-expanded", String(open));
      toggle.innerHTML = `
        <span class="design-nav-group-dot" aria-hidden="true"></span>
        <span>${definition.label}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m8 10 4 4 4-4"></path></svg>`;

      const body = document.createElement("div");
      body.className = "design-nav-group-items";
      groupItems.forEach(item => body.appendChild(item));

      toggle.addEventListener("click", () => setGroupOpen(group, group.classList.contains("is-collapsed")));
      group.append(toggle, body);
      fragment.appendChild(group);
    });

    items.filter(item => item.isConnected && item.parentElement === nav).forEach(item => fragment.appendChild(item));
    nav.appendChild(fragment);
    nav.dataset.designGrouped = VERSION;
  }

  function syncActiveMenuGroup() {
    $$(".design-nav-group").forEach(group => {
      if ($(".nav-item.active", group)) setGroupOpen(group, true, false);
    });
  }

  function findDashboardOperationCard(page) {
    return $$(".card", page).find(card => {
      const heading = normalize($("h1,h2,h3,.section-title,strong", card)?.textContent || "");
      const content = normalize(card.textContent || "");
      return heading.includes("nova operacao") || (
        content.includes("nova operacao") &&
        (content.includes("identificacao") || content.includes("produto") || content.includes("distribuicao"))
      );
    });
  }

  function ensureOperationDrawer() {
    let drawer = $("#designOperationDrawer");
    if (drawer) return drawer;

    const backdrop = document.createElement("button");
    backdrop.id = "designOperationBackdrop";
    backdrop.className = "design-operation-backdrop";
    backdrop.type = "button";
    backdrop.setAttribute("aria-label", "Fechar cadastro de operação");

    drawer = document.createElement("aside");
    drawer.id = "designOperationDrawer";
    drawer.className = "design-operation-drawer";
    drawer.setAttribute("aria-hidden", "true");
    drawer.innerHTML = `
      <header class="design-operation-drawer-header">
        <div><small>OPERAÇÃO</small><h2>Registrar nova operação</h2><p>Preencha os dados sem sair da visão operacional.</p></div>
        <button type="button" class="icon-btn design-operation-close" aria-label="Fechar">×</button>
      </header>
      <div class="design-operation-drawer-body"></div>`;

    const close = () => {
      drawer.classList.remove("is-open");
      backdrop.classList.remove("is-open");
      drawer.setAttribute("aria-hidden", "true");
      document.body.classList.remove("design-drawer-open");
    };

    backdrop.addEventListener("click", close);
    $(".design-operation-close", drawer)?.addEventListener("click", close);
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && drawer.classList.contains("is-open")) close();
    });

    document.body.append(backdrop, drawer);
    return drawer;
  }

  function openOperationDrawer() {
    const drawer = ensureOperationDrawer();
    const backdrop = $("#designOperationBackdrop");
    if (!$(".design-operation-drawer-body > *", drawer)) return;
    drawer.classList.add("is-open");
    backdrop?.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("design-drawer-open");
    requestAnimationFrame(() => $("input,select,textarea", drawer)?.focus({ preventScroll: true }));
  }

  function moveDashboardFormToDrawer() {
    const page = $("#page-dashboard");
    if (!page) return;
    const card = findDashboardOperationCard(page);
    if (!card && !$("#designOperationDrawer")) return;

    const drawer = ensureOperationDrawer();
    const body = $(".design-operation-drawer-body", drawer);
    if (card && card.parentElement !== body) {
      body.replaceChildren(card);
      card.classList.add("design-operation-form-card");
    }

    const actions = $(".page-header .actions", page);
    if (!actions || !body.children.length) return;
    const opener = $$("button,.btn", actions).find(button => normalize(button.textContent).includes("nova operacao"));
    if (!opener || opener.dataset.designDrawerBound === VERSION) return;

    opener.dataset.designDrawerBound = VERSION;
    opener.addEventListener("click", event => {
      if (!$(".design-operation-drawer-body > *", drawer)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      openOperationDrawer();
    }, true);
  }

  function actionSignature(actions) {
    return $$(':scope > button,:scope > .btn,:scope > a.btn', actions)
      .filter(item => !item.closest(".design-mobile-actions"))
      .map(item => `${normalize(item.textContent)}:${item.className}`)
      .join("|");
  }

  function enhanceMobileActions() {
    $$(".page-header .actions").forEach(actions => {
      const originals = $$(':scope > button,:scope > .btn,:scope > a.btn', actions)
        .filter(item => !item.closest(".design-mobile-actions"));
      if (originals.length <= 2) {
        $(".design-mobile-actions", actions)?.remove();
        originals.forEach(item => item.classList.remove("design-mobile-secondary"));
        return;
      }

      const signature = actionSignature(actions);
      if (actions.dataset.designActionSignature === signature && $(".design-mobile-actions", actions)) return;

      $(".design-mobile-actions", actions)?.remove();
      originals.forEach(item => item.classList.remove("design-mobile-secondary"));
      const primary = originals.find(item => item.classList.contains("primary")) || originals[0];
      const secondary = originals.filter(item => item !== primary);
      secondary.forEach(item => item.classList.add("design-mobile-secondary"));

      const details = document.createElement("details");
      details.className = "design-mobile-actions";
      details.innerHTML = `
        <summary aria-label="Mais ações"><span>Mais ações</span><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8"></circle><circle cx="12" cy="12" r="1.8"></circle><circle cx="19" cy="12" r="1.8"></circle></svg></summary>
        <div class="design-mobile-actions-menu"></div>`;

      const menu = $(".design-mobile-actions-menu", details);
      secondary.forEach(original => {
        const proxy = document.createElement("button");
        proxy.type = "button";
        proxy.className = "design-mobile-action-item";
        proxy.innerHTML = `<span>${original.innerHTML || original.textContent}</span><b>›</b>`;
        proxy.addEventListener("click", () => {
          details.open = false;
          original.click();
        });
        menu.appendChild(proxy);
      });

      actions.appendChild(details);
      actions.dataset.designActionSignature = signature;
    });
  }

  function cleanClone(node) {
    if (node instanceof Element) {
      node.removeAttribute("id");
      $$("[id]", node).forEach(element => element.removeAttribute("id"));
    }
    return node;
  }

  function tableSignature(table) {
    const rows = table.tBodies?.[0]?.rows?.length || 0;
    const text = normalize(table.textContent || "");
    return `${rows}:${text.length}:${text.slice(0, 90)}:${text.slice(-90)}`;
  }

  function chooseTitleIndex(headers, cells) {
    const priorities = ["embarcacao", "equipamento", "produto", "cliente", "descricao", "atividade", "data"];
    for (const priority of priorities) {
      const index = headers.findIndex(header => normalize(header).includes(priority));
      if (index >= 0 && normalize(cells[index]?.textContent)) return index;
    }
    return Math.max(0, cells.findIndex(cell => normalize(cell.textContent)));
  }

  function createMobileTableCards(table) {
    const wrap = table.closest(".table-wrap");
    if (!wrap || wrap.dataset.designNativeCards === "true") return;
    if (wrap.parentElement?.querySelector(":scope > .mobile-record-list,:scope > .mobile-record-grid")) return;

    const headers = $$("thead th", table).map(th => th.textContent.trim());
    const rows = $$("tbody tr", table).slice(0, MAX_MOBILE_ROWS);
    if (!headers.length || !rows.length) return;

    const signature = tableSignature(table);
    let list = wrap.nextElementSibling?.classList.contains("design-mobile-data-list") ? wrap.nextElementSibling : null;
    if (list?.dataset.signature === signature) return;
    list?.remove();

    list = document.createElement("div");
    list.className = "design-mobile-data-list";
    list.dataset.signature = signature;
    list.setAttribute("aria-label", "Registros em formato de cartões");

    rows.forEach((row, rowIndex) => {
      const cells = $$(':scope > td', row);
      if (!cells.length) return;
      const titleIndex = chooseTitleIndex(headers, cells);
      const dateIndex = headers.findIndex(header => normalize(header).includes("data"));
      const statusIndex = headers.findIndex(header => normalize(header).includes("status"));
      const actionIndexes = headers
        .map((header, index) => ({ header: normalize(header), index }))
        .filter(item => item.header.includes("acao") || item.header.includes("acoes") || item.header.includes("action"))
        .map(item => item.index);

      const card = document.createElement("article");
      card.className = "design-mobile-data-card";
      [...row.attributes].forEach(attribute => {
        if (attribute.name.startsWith("data-")) card.setAttribute(attribute.name, attribute.value);
      });

      const head = document.createElement("header");
      const heading = document.createElement("div");
      heading.className = "design-mobile-data-heading";
      const eyebrow = document.createElement("small");
      eyebrow.textContent = dateIndex >= 0 ? cells[dateIndex]?.textContent.trim() || `Registro ${rowIndex + 1}` : `Registro ${rowIndex + 1}`;
      const title = document.createElement("h3");
      title.textContent = cells[titleIndex]?.textContent.trim() || `Registro ${rowIndex + 1}`;
      heading.append(eyebrow, title);
      head.appendChild(heading);

      if (statusIndex >= 0 && cells[statusIndex]) {
        const status = document.createElement("div");
        status.className = "design-mobile-data-status";
        [...cells[statusIndex].childNodes].forEach(node => status.appendChild(cleanClone(node.cloneNode(true))));
        head.appendChild(status);
      }
      card.appendChild(head);

      const grid = document.createElement("div");
      grid.className = "design-mobile-data-grid";
      cells.forEach((cell, index) => {
        if (index === titleIndex || index === statusIndex || actionIndexes.includes(index)) return;
        if (!normalize(cell.textContent)) return;
        const field = document.createElement("div");
        field.className = "design-mobile-data-field";
        const label = document.createElement("span");
        label.textContent = headers[index] || `Campo ${index + 1}`;
        const content = document.createElement("strong");
        [...cell.childNodes].forEach(node => content.appendChild(cleanClone(node.cloneNode(true))));
        field.append(label, content);
        grid.appendChild(field);
      });
      if (grid.children.length) card.appendChild(grid);

      const originalActionButtons = actionIndexes.flatMap(index => cells[index] ? $$("button,a", cells[index]) : []);
      if (originalActionButtons.length) {
        const footer = document.createElement("footer");
        originalActionButtons.forEach(original => {
          const proxy = document.createElement("button");
          proxy.type = "button";
          proxy.className = "btn secondary small";
          proxy.innerHTML = original.innerHTML || original.textContent || "Abrir";
          proxy.addEventListener("click", () => original.click());
          footer.appendChild(proxy);
        });
        card.appendChild(footer);
      }
      list.appendChild(card);
    });

    wrap.insertAdjacentElement("afterend", list);
    wrap.dataset.designCardTable = "true";
  }

  function enhanceMobileTables() {
    $$(".table-wrap .data-table").forEach(createMobileTableCards);
  }

  function enhanceDashboardKpis() {
    $$("#page-dashboard .stat-card").forEach(card => {
      if (card.dataset.designKpi === VERSION) return;
      const label = normalize($("small", card)?.textContent || card.textContent);
      const tone = label.includes("alert") || label.includes("crit") ? "red"
        : label.includes("manut") ? "amber"
        : label.includes("carreta") ? "cyan"
        : label.includes("equip") || label.includes("ocup") ? "indigo"
        : "blue";
      card.classList.add("design-kpi-card", `design-kpi-${tone}`);
      card.dataset.designKpi = VERSION;
    });
  }

  function formatMetricCount(count) {
    return `${count} ${count === 1 ? "indicador adicional" : "indicadores adicionais"}`;
  }

  function simplifyDashboard() {
    const page = $("#page-dashboard");
    const grid = page?.querySelector(".dashboard-kpi-grid");
    if (!grid || grid.dataset.uiGrouped === VERSION) return;
    const cards = [...grid.children].filter(element => element.matches(".stat-card,.card"));
    grid.classList.add("dashboard-primary-kpis");
    grid.dataset.uiGrouped = VERSION;
    if (cards.length <= 4) return;

    const details = document.createElement("details");
    details.className = "dashboard-more-metrics";
    details.innerHTML = `<summary><strong>Mais indicadores</strong><span>${formatMetricCount(cards.length - 4)}</span></summary><div class="dashboard-more-metrics-grid"></div>`;
    const secondaryGrid = $(".dashboard-more-metrics-grid", details);
    cards.slice(4).forEach(card => secondaryGrid.appendChild(card));
    grid.insertAdjacentElement("afterend", details);
  }

  function activeItem(container) {
    return container.querySelector('.active,[aria-selected="true"],[data-active="true"]');
  }

  function centerActive(container, behavior = "smooth") {
    const item = activeItem(container);
    if (!item || container.scrollWidth <= container.clientWidth + 2) return;
    item.scrollIntoView({ block: "nearest", inline: "center", behavior: prefersReducedMotion ? "auto" : behavior });
  }

  function prepareTabContainer(container) {
    if (!container) return;
    container.classList.add("ui-tab-scroller");
    if (container.dataset.uiPolished === VERSION) return;
    container.dataset.uiPolished = VERSION;
    container.addEventListener("click", () => requestAnimationFrame(() => centerActive(container)));
    centerActive(container, "auto");
  }

  function markScrollable(container) {
    if (!container) return;
    container.classList.toggle("is-scrollable", container.scrollWidth > container.clientWidth + 2);
  }

  function standardizeModules() {
    $$(".page").forEach(page => page.dataset.uiAudited = "true");
    $$(".section-title").forEach(item => item.classList.add("ui-section-heading"));
    $$(".row-actions").forEach(item => item.classList.add("ui-action-cluster"));
    $$(".empty,.tv-empty-state,.dashboard-empty-state,.alert-workspace-empty,.asset-empty")
      .forEach(item => item.classList.add("ui-module-empty"));
    $$([
      ".tank-filter-bar", ".truck-filter-bar", ".vessel-filter-bar", ".client-ticket-filter-bar",
      ".dashboard-filter-grid", ".operations-filter-bar", ".chemical-filter-bar",
      ".quality-filter-bar", ".report-filters", ".alert-workspace-filters"
    ].join(",")).forEach(item => item.classList.add("ui-filter-surface"));
  }

  function auditOverflow() {
    const allowed = [
      ".table-wrap", ".page-header .actions", ".ui-tab-scroller", ".operation-stepper-head",
      ".mobile-bottom-nav", ".mobile-sheet", ".sidebar nav", ".alert-chat-list-v2",
      ".alert-status-filters", ".alert-chat-channels"
    ].join(",");
    const viewportWidth = document.documentElement.clientWidth;
    const offenders = [...document.querySelectorAll("body *")].filter(element => {
      if (element.closest(allowed)) return false;
      const style = getComputedStyle(element);
      if (style.position === "fixed" || style.display === "none" || style.visibility === "hidden") return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.right > viewportWidth + 2;
    }).slice(0, 12);
    document.documentElement.dataset.uiOverflow = offenders.length ? "true" : "false";
    if (offenders.length) console.warn("[OpsControl UI] Elementos fora da largura da tela:", offenders);
  }

  function run() {
    scheduled = false;
    groupSidebarNavigation();
    syncActiveMenuGroup();
    moveDashboardFormToDrawer();
    enhanceMobileActions();
    enhanceMobileTables();
    enhanceDashboardKpis();
    simplifyDashboard();
    standardizeModules();
    document.querySelectorAll(TAB_CONTAINERS).forEach(prepareTabContainer);
    document.querySelectorAll(SCROLLABLE_CONTAINERS).forEach(markScrollable);
    auditOverflow();
    document.documentElement.dataset.interfaceCore = VERSION;
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(run);
  }

  function start() {
    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });

    if ("ResizeObserver" in window) {
      const resizeObserver = new ResizeObserver(schedule);
      resizeObserver.observe(document.documentElement);
      [".main-content", ".sidebar", ".modal-card"].forEach(selector => {
        const element = $(selector);
        if (element) resizeObserver.observe(element);
      });
    }

    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(schedule, 120);
    }, { passive: true });
    window.addEventListener("orientationchange", schedule, { passive: true });
    document.addEventListener("opscontrol:interface-ready", schedule);
    document.addEventListener("click", event => {
      if (event.target.closest(".nav-item")) requestAnimationFrame(syncActiveMenuGroup);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
