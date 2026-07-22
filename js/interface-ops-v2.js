(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  let scheduled = false;

  function normalize(value = "") {
    return String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function esc(value = "") {
    return String(value).replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[character]));
  }

  function alertIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 2.8 20h18.4L12 3z"></path><path d="M12 9v5"></path><path d="M12 17h.01"></path></svg>`;
  }

  function improveSidebar() {
    const labels = {
      overview: "Comando",
      operations: "Operações",
      materials: "Logística e materiais",
      reliability: "Integridade e QHSE",
      analytics: "Gestão e dados",
      admin: "Sistema"
    };

    $$(".design-nav-group").forEach(group => {
      const key = group.dataset.designGroup || "";
      const label = $(".design-nav-group-toggle span:nth-child(2)", group);
      if (label && labels[key] && label.textContent !== labels[key]) label.textContent = labels[key];

      $$(".nav-item", group).forEach(item => {
        const text = $(".nav-label", item)?.textContent?.trim();
        if (text) item.title = text;
      });
    });
  }

  function enhanceLogin() {
    const hero = $(".login-hero");
    if (!hero || $(".ops-login-industrial", hero)) return;

    const scene = document.createElement("div");
    scene.className = "ops-login-industrial";
    scene.setAttribute("aria-hidden", "true");
    scene.innerHTML = `
      <div class="ops-login-sky"></div>
      <div class="ops-login-terminal">
        <i class="ops-login-tank a"></i>
        <i class="ops-login-tank b"></i>
        <i class="ops-login-tank c"></i>
        <i class="ops-login-silo"></i>
      </div>
      <div class="ops-login-data-line"></div>
      <div class="ops-login-vessel">
        <i class="ops-login-vessel-hull"></i>
        <i class="ops-login-vessel-cabin"></i>
        <i class="ops-login-vessel-mast"></i>
      </div>
      <div class="ops-login-water"></div>
    `;

    const overview = $(".login-ops-overview", hero);
    if (overview) overview.insertAdjacentElement("beforebegin", scene);
    else hero.appendChild(scene);
  }

  function dashboardSignature(page) {
    return normalize($$(".figma-kpi", page).map(card => card.textContent).join("|"));
  }

  function enhanceDashboard() {
    const page = $("#page-dashboard");
    const grid = $(".figma-kpi-grid", page);
    if (!page || !grid) return;

    grid.classList.add("ops-primary-kpis");
    const signature = dashboardSignature(page);
    let strip = $(".ops-attention-strip", page);

    if (strip?.dataset.signature !== signature) strip?.remove();
    strip = $(".ops-attention-strip", page);

    const cards = $$(':scope > .figma-kpi', grid);
    if (!strip && cards.length > 4) {
      strip = document.createElement("section");
      strip.className = "ops-attention-strip";
      strip.dataset.signature = signature;
      strip.setAttribute("aria-label", "Atenção operacional");
      strip.innerHTML = `
        <div class="ops-attention-title">
          <i>${alertIcon()}</i>
          <div><strong>Atenção operacional</strong><span>Pendências e condições que podem exigir ação.</span></div>
        </div>
      `;

      cards.slice(4).forEach(card => strip.appendChild(card));

      const alertCount = Number($("#alertCount")?.textContent || 0);
      const alertItem = document.createElement("button");
      alertItem.type = "button";
      alertItem.className = `ops-attention-item ${alertCount ? "is-warning" : "is-online"}`;
      alertItem.innerHTML = `<div><span>Alertas pendentes</span><strong>${alertCount ? "Revisar central de alertas" : "Nenhuma pendência crítica"}</strong></div><b>${alertCount}</b>`;
      alertItem.addEventListener("click", () => document.querySelector('[data-page="alerts"]')?.click());

      const syncText = $("#syncBadge")?.textContent?.trim() || "Status indisponível";
      const online = /sincron|online|conect/i.test(syncText) && !/local|offline|erro/i.test(syncText);
      const syncItem = document.createElement("div");
      syncItem.className = `ops-attention-item ${online ? "is-online" : "is-warning"}`;
      syncItem.innerHTML = `<div><span>Conexão da planta</span><strong>${esc(syncText)}</strong></div><b>${online ? "OK" : "!"}</b>`;

      strip.append(alertItem, syncItem);
      grid.insertAdjacentElement("afterend", strip);
    }

    const volumeCard = $(".figma-volume-chart", page);
    if (volumeCard) {
      const heading = $(".figma-card-heading h3", volumeCard);
      const description = $(".figma-card-heading p", volumeCard);
      if (heading && heading.textContent !== "Movimentação registrada") heading.textContent = "Movimentação registrada";
      if (description && description.textContent !== "Evolução dos lançamentos operacionais nos últimos sete dias") description.textContent = "Evolução dos lançamentos operacionais nos últimos sete dias";

      if (!$(".ops-chart-context", volumeCard)) {
        const note = document.createElement("div");
        note.className = "ops-chart-context";
        note.innerHTML = `<strong>Leitura por unidade:</strong><span class="ops-unit-chip">Fluidos em bbl</span><span class="ops-unit-chip">Granéis em t</span><span>O detalhamento separado permanece disponível nos relatórios.</span>`;
        volumeCard.appendChild(note);
      }
    }

    const occupancyCard = $(".figma-occupancy-card", page);
    if (occupancyCard) {
      const description = $(".figma-card-heading p", occupancyCard);
      if (description && description.textContent !== "Ocupação dos tanques de fluidos cadastrados") description.textContent = "Ocupação dos tanques de fluidos cadastrados";
      if (!$(".ops-chart-context", occupancyCard)) {
        const note = document.createElement("div");
        note.className = "ops-chart-context";
        note.innerHTML = `<strong>Escopo:</strong><span>WBM, SBM e Brine. Olefina e granéis são acompanhados nos módulos próprios.</span>`;
        occupancyCard.appendChild(note);
      }
    }

    enhanceRecentActivity(page);
  }

  function enhanceRecentActivity(page) {
    const table = $(".figma-recent-table", page);
    if (!table) return;

    const rows = $$("button.figma-recent-row", table);
    const signature = normalize(rows.map(row => row.textContent).join("|"));
    let list = $(".ops-recent-mobile-list", page);
    if (list?.dataset.signature === signature) return;
    list?.remove();

    list = document.createElement("div");
    list.className = "ops-recent-mobile-list";
    list.dataset.signature = signature;

    rows.forEach(row => {
      const cells = $$(':scope > span', row);
      if (cells.length < 4) return;

      const card = document.createElement("button");
      card.type = "button";
      card.className = "ops-recent-mobile-card";
      card.innerHTML = `
        <header>
          <div><time>${cells[0].innerHTML}</time>${cells[1].innerHTML.replace("<strong>", "<h4>").replace("</strong>", "</h4>").replace("<small>", "<p>").replace("</small>", "</p>")}</div>
          <span>${cells[2].innerHTML}</span>
        </header>
        <footer><span>Responsável</span><span>${cells[3].textContent.trim()}</span></footer>
      `;
      card.addEventListener("click", () => row.click());
      list.appendChild(card);
    });

    table.insertAdjacentElement("afterend", list);
  }

  function tankLevel(card) {
    const progress = $(".reference-progress", card);
    const value = Number(progress?.getAttribute("aria-valuenow") || 0);
    return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  }

  function enhanceTankCards() {
    $$("#page-tanks .reference-tank-card").forEach(card => {
      const level = tankLevel(card);
      card.classList.toggle("ops-level-high", level >= 90);
      card.classList.toggle("ops-level-low", level > 0 && level <= 15);
      card.classList.toggle("ops-level-empty", level <= 0);

      const head = $(".reference-card-head", card);
      const titleBlock = $(".reference-card-title", card);
      if (head && titleBlock && !$(".ops-tank-level-alert", head)) {
        const chip = document.createElement("span");
        let tone = "ok";
        let text = "Nível operacional";
        if (level >= 90) { tone = "high"; text = "Capacidade crítica"; }
        else if (level > 0 && level <= 15) { tone = "low"; text = "Baixo volume"; }
        else if (level <= 0) { tone = "empty"; text = "Vazio"; }
        chip.className = `ops-tank-level-alert ${tone}`;
        chip.textContent = text;
        titleBlock.appendChild(chip);
      }

      const actions = $(".reference-card-details .row-actions", card);
      if (!actions || $(".ops-tank-actions", actions)) return;

      const primary = $(':scope > .btn.primary', actions);
      const secondary = $$(':scope > .btn', actions).filter(button => button !== primary);
      if (secondary.length < 2) return;

      const details = document.createElement("details");
      details.className = "ops-tank-actions";
      details.innerHTML = `<summary>Mais ações <span aria-hidden="true">•••</span></summary><div class="ops-tank-actions-menu"></div>`;
      const menu = $(".ops-tank-actions-menu", details);
      secondary.forEach(button => menu.appendChild(button));
      actions.appendChild(details);
    });
  }

  function run() {
    scheduled = false;
    improveSidebar();
    enhanceLogin();
    enhanceDashboard();
    enhanceTankCards();
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
    window.addEventListener("resize", schedule, { passive: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();