(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const MENU_STATE_KEY = "opscontrol_design_menu_groups";
  const MAX_MOBILE_ROWS = 100;

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
    try {
      return JSON.parse(localStorage.getItem(MENU_STATE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveMenuState() {
    try {
      localStorage.setItem(MENU_STATE_KEY, JSON.stringify(menuState));
    } catch {
      // O menu continua funcional mesmo quando o armazenamento estiver indisponível.
    }
  }

  function setGroupOpen(group, open) {
    group.classList.toggle("is-collapsed", !open);
    const toggle = $(".design-nav-group-toggle", group);
    toggle?.setAttribute("aria-expanded", String(open));
    const key = group.dataset.designGroup;
    if (key) {
      menuState[key] = open;
      saveMenuState();
    }
  }

  function groupSidebarNavigation() {
    const nav = $("#sidebar > nav");
    if (!nav || nav.dataset.designGrouped === "true") return;

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
      const open = active || stored !== false || index === 0;
      group.classList.toggle("is-collapsed", !open);

      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "design-nav-group-toggle";
      toggle.setAttribute("aria-expanded", String(open));
      toggle.innerHTML = `
        <span class="design-nav-group-dot" aria-hidden="true"></span>
        <span>${definition.label}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m8 10 4 4 4-4"></path></svg>
      `;

      const body = document.createElement("div");
      body.className = "design-nav-group-items";
      groupItems.forEach(item => body.appendChild(item));

      toggle.addEventListener("click", () => setGroupOpen(group, group.classList.contains("is-collapsed")));
      group.append(toggle, body);
      fragment.appendChild(group);
    });

    items.filter(item => item.isConnected && item.parentElement === nav).forEach(item => fragment.appendChild(item));
    nav.appendChild(fragment);
    nav.dataset.designGrouped = "true";
  }

  function syncActiveMenuGroup() {
    $$(".design-nav-group").forEach(group => {
      if ($(".nav-item.active", group)) setGroupOpen(group, true);
    });
  }

  function ensureLoginScene() {
    const hero = $(".login-hero");
    if (!hero || $(".login-industrial-scene,.login-ops-overview", hero)) return;

    const scene = document.createElement("div");
    scene.className = "login-industrial-scene";
    scene.setAttribute("aria-hidden", "true");
    scene.innerHTML = `
      <div class="login-scene-grid"></div>
      <div class="login-scene-pipe login-scene-pipe-a"></div>
      <div class="login-scene-pipe login-scene-pipe-b"></div>
      <div class="login-scene-tank tank-a"><span></span></div>
      <div class="login-scene-tank tank-b"><span></span></div>
      <div class="login-scene-silo"><span></span></div>
      <div class="login-scene-vessel"><span></span><i></i></div>
      <div class="login-scene-status"><b></b> Centro de controle operacional</div>
    `;
    hero.appendChild(scene);
  }

  function findDashboardOperationCard(page) {
    const cards = $$(".card", page);
    return cards.find(card => {
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
      <div class="design-operation-drawer-body"></div>
    `;

    const close = () => {
      drawer.classList.remove("is-open");
      backdrop.classList.remove("is-open");
      drawer.setAttribute("aria-hidden", "true");
      document.body.classList.remove("design-drawer-open");
    };

    backdrop.addEventListener("click", close);
    $(".design-operation-close", drawer).addEventListener("click", close);
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && drawer.classList.contains("is-open")) close();
    });

    document.body.append(backdrop, drawer);
    return drawer;
  }

  function openOperationDrawer() {
    const drawer = ensureOperationDrawer();
    const backdrop = $("#designOperationBackdrop");
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
    const drawer = ensureOperationDrawer();
    const body = $(".design-operation-drawer-body", drawer);

    if (card && card.parentElement !== body) {
      body.replaceChildren(card);
      card.classList.add("design-operation-form-card");
    }

    const actions = $(".page-header .actions", page);
    if (!actions || !body.children.length) return;

    let opener = $$("button,.btn", actions).find(button => normalize(button.textContent).includes("nova operacao"));
    if (!opener) {
      opener = document.createElement("button");
      opener.type = "button";
      opener.className = "btn primary";
      opener.textContent = "Nova operação";
      actions.prepend(opener);
    }

    if (opener.dataset.designDrawerBound !== "true") {
      opener.dataset.designDrawerBound = "true";
      opener.addEventListener("click", event => {
        if (!$(".design-operation-drawer-body > *", drawer)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        openOperationDrawer();
      }, true);
    }
  }

  function actionSignature(actions) {
    return $$(':scope > button,:scope > .btn,:scope > a.btn', actions)
      .map(item => `${normalize(item.textContent)}:${item.className}`)
      .join("|");
  }

  function enhanceMobileActions() {
    $$(".page-header .actions").forEach(actions => {
      const originals = $$(':scope > button,:scope > .btn,:scope > a.btn', actions)
        .filter(item => !item.closest(".design-mobile-actions"));
      if (originals.length <= 2) return;

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
        <div class="design-mobile-actions-menu"></div>
      `;

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
      $$('[id]', node).forEach(element => element.removeAttribute("id"));
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
    return cells.findIndex(cell => normalize(cell.textContent));
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

  function parseBrazilianNumber(value) {
    const normalized = String(value || "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
    const number = Number(normalized);
    return Number.isFinite(number) ? number : null;
  }

  function vesselLevel(card) {
    const text = card.textContent || "";
    const percent = text.match(/(\d{1,3}(?:[.,]\d+)?)\s*%/);
    if (percent) return Math.max(0, Math.min(100, Number(percent[1].replace(",", "."))));

    const progress = $(".progress > span,.storage-progress > span,[role='progressbar']", card);
    const width = progress?.style?.width || progress?.getAttribute?.("aria-valuenow");
    if (width) {
      const value = Number(String(width).replace("%", ""));
      if (Number.isFinite(value)) return Math.max(0, Math.min(100, value));
    }

    const ratio = text.match(/([\d.,]+)\s*(?:bbl|ton|t|m³|m3)?\s*(?:\/|de)\s*([\d.,]+)\s*(?:bbl|ton|t|m³|m3)?/i);
    if (ratio) {
      const current = parseBrazilianNumber(ratio[1]);
      const capacity = parseBrazilianNumber(ratio[2]);
      if (current !== null && capacity) return Math.max(0, Math.min(100, current / capacity * 100));
    }

    return 0;
  }

  function vesselTone(text) {
    const value = normalize(text);
    if (value.includes("brine") || value.includes("salmoura")) return "brine";
    if (value.includes("sbm") || value.includes("oleo") || value.includes("rheliant") || value.includes("glydrill")) return "sbm";
    if (value.includes("olefina")) return "olefin";
    if (value.includes("barita") || value.includes("bentonita") || value.includes("calcita") || value.includes("granel")) return "bulk";
    return "wbm";
  }

  function vesselStatus(level) {
    if (level >= 90) return { tone: "critical", label: "Capacidade crítica" };
    if (level >= 75) return { tone: "attention", label: "Atenção ao volume" };
    if (level <= 10) return { tone: "low", label: "Baixo volume" };
    return { tone: "normal", label: "Faixa operacional" };
  }

  function enhanceIndustrialVessels() {
    const page = $("#page-tanks");
    if (!page) return;

    let candidates = $$(".tank-card,.storage-stat,[data-tank-id],[data-silo-id]", page);
    if (!candidates.length) {
      candidates = $$(".card", page).filter(card => {
        const heading = normalize($("h2,h3,strong", card)?.textContent || "");
        return /^(tk[-\s]|silo|mix[-\s]|tanque)/i.test(heading);
      });
    }

    candidates.forEach(card => {
      const text = card.textContent || "";
      const normalized = normalize(text);
      if (card.closest(".design-operation-drawer")) return;

      const level = vesselLevel(card);
      const type = normalized.includes("silo") || normalized.includes("granel") ? "silo" : "tank";
      const tone = vesselTone(text);
      const status = vesselStatus(level);
      const signature = `${Math.round(level)}:${type}:${tone}:${status.tone}`;

      let visual = $(":scope > .design-industrial-vessel", card);
      if (!visual) {
        visual = document.createElement("div");
        visual.className = "design-industrial-vessel";
        card.prepend(visual);
      }
      if (visual.dataset.signature === signature) return;

      visual.dataset.signature = signature;
      visual.className = `design-industrial-vessel is-${type} tone-${tone} status-${status.tone}`;
      visual.style.setProperty("--design-level", `${level}%`);
      visual.innerHTML = `
        <div class="design-vessel-shell" aria-label="Nível ${Math.round(level)}%">
          <div class="design-vessel-fill"><span></span></div>
          <div class="design-vessel-cap"></div>
          <div class="design-vessel-scale"><i></i><i></i><i></i><i></i></div>
        </div>
        <div class="design-vessel-summary">
          <small>${type === "silo" ? "SILO INDUSTRIAL" : "TANQUE INDUSTRIAL"}</small>
          <strong>${Math.round(level)}%</strong>
          <span><b></b>${status.label}</span>
        </div>
      `;
    });
  }

  function enhanceDashboardKpis() {
    $$("#page-dashboard .stat-card").forEach(card => {
      if (card.dataset.designKpi === "true") return;
      const label = normalize($("small", card)?.textContent || card.textContent);
      const tone = label.includes("alert") || label.includes("crit") ? "red"
        : label.includes("manut") ? "amber"
        : label.includes("carreta") ? "cyan"
        : label.includes("equip") || label.includes("ocup") ? "indigo"
        : "blue";
      card.classList.add("design-kpi-card", `design-kpi-${tone}`);
      card.dataset.designKpi = "true";
    });
  }

  function run() {
    scheduled = false;
    ensureLoginScene();
    groupSidebarNavigation();
    syncActiveMenuGroup();
    moveDashboardFormToDrawer();
    enhanceMobileActions();
    enhanceMobileTables();
    enhanceIndustrialVessels();
    enhanceDashboardKpis();
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

    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(schedule, 140);
    }, { passive: true });

    window.addEventListener("orientationchange", schedule, { passive: true });
    document.addEventListener("click", event => {
      if (event.target.closest(".nav-item")) requestAnimationFrame(syncActiveMenuGroup);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
