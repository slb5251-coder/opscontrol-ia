(() => {
  "use strict";

  const VERSION = "20260723-visual-system-v3-1";
  const root = document.documentElement;
  const body = document.body;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  let revealObserver;
  let scheduled = false;

  function esc(value = "") {
    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[char]));
  }

  function addLoginScene() {
    const hero = $(".login-hero");
    if (!hero || hero.dataset.visualScene === "true") return;
    hero.dataset.visualScene = "true";
    hero.insertAdjacentHTML("afterbegin", `
      <div class="visual-login-grid" aria-hidden="true"></div>
      <div class="visual-login-aurora" aria-hidden="true"></div>
      <div class="visual-login-ship" aria-hidden="true">
        <div class="wake"></div><div class="ship"><i class="mast"></i></div><div class="sea"></div>
      </div>`);
  }

  function isCard(element) {
    return element.matches([
      ".card", ".stat-card", ".figma-kpi", ".role-dashboard-home", ".role-dashboard-metric",
      ".role-dashboard-action", ".reference-tank-card", ".table-wrap", ".dashboard-command-bar",
      ".dashboard-more-metrics", ".tv-control-status-rail article", ".login-ops-metrics article"
    ].join(","));
  }

  function enhanceSurface(element) {
    if (!element || element.dataset.visualEnhanced === "true") return;
    element.dataset.visualEnhanced = "true";
    element.classList.add("visual-spotlight");
    const text = (element.textContent || "").toLowerCase();
    if (/crític|bloquead|vencid|alto volume|baixo volume|atenção|pendente/.test(text)) {
      element.classList.add("visual-border-beam");
    }
  }

  function enhanceSurfaces(scope = document) {
    $$([
      ".card", ".stat-card", ".figma-kpi", ".role-dashboard-home", ".role-dashboard-metric",
      ".role-dashboard-action", ".reference-tank-card", ".table-wrap", ".dashboard-command-bar",
      ".dashboard-more-metrics", ".tv-control-status-rail article", ".login-ops-metrics article"
    ].join(","), scope).forEach(enhanceSurface);
  }

  function pointerSpotlight(event) {
    const card = event.target.closest(".visual-spotlight");
    if (!card) return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
    card.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
  }

  function revealChildren(scope = document) {
    const targets = $$([
      ".page.active > .page-header", ".page.active > .card", ".page.active > .table-wrap",
      ".page.active > section", ".page.active > div", ".dashboard-kpi-grid > *",
      ".figma-kpi-grid > *", ".tank-grid > *", ".role-dashboard-body > *"
    ].join(","), scope);
    targets.forEach(element => {
      if (element.classList.contains("visual-reveal")) return;
      element.classList.add("visual-reveal");
      if (reduceMotion.matches) element.classList.add("is-visible");
      else revealObserver?.observe(element);
    });
  }

  function parseNumericText(text = "") {
    const compact = String(text).trim();
    const match = compact.match(/^([^\d-]*)(-?[\d.]+(?:,[\d]+)?)(.*)$/);
    if (!match) return null;
    const numeric = Number(match[2].replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(numeric)) return null;
    return { prefix: match[1], value: numeric, suffix: match[3], decimals: match[2].includes(",") ? match[2].split(",")[1].length : 0 };
  }

  function animateNumber(element) {
    if (!element || element.dataset.visualNumber === element.textContent) return;
    const parsed = parseNumericText(element.textContent);
    if (!parsed || Math.abs(parsed.value) > 100000000) return;
    element.dataset.visualNumber = element.textContent;
    if (reduceMotion.matches) return;
    const duration = 650;
    const start = performance.now();
    const original = element.textContent;
    const format = value => value.toLocaleString("pt-BR", {
      minimumFractionDigits: parsed.decimals,
      maximumFractionDigits: parsed.decimals
    });
    function frame(now) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = `${parsed.prefix}${format(parsed.value * eased)}${parsed.suffix}`;
      if (progress < 1) requestAnimationFrame(frame);
      else element.textContent = original;
    }
    requestAnimationFrame(frame);
  }

  function animateNumbers(scope = document) {
    $$(".stat-card h2,.figma-kpi strong,.role-dashboard-metric strong,.dashboard-kpi-grid h2,[data-visual-number]", scope).forEach(animateNumber);
  }

  function vesselTone(card) {
    for (const tone of ["green", "blue", "amber", "brown", "gray", "red"]) {
      if (card.classList.contains(`tone-${tone}`)) return tone;
    }
    return "blue";
  }

  function enhanceTankCard(card) {
    if (!card || !card.classList.contains("reference-tank-card")) return;
    const view = $(":scope > .reference-card-view", card);
    if (!view) return;
    const progress = $(".reference-progress > span", view);
    const row = $(".reference-volume-row", view);
    const product = $(".reference-product-block strong", view)?.textContent || "Produto operacional";
    const rawLevel = progress?.style.getPropertyValue("--reference-level") || $(".reference-progress", view)?.getAttribute("aria-valuenow") || "0";
    const level = Math.max(0, Math.min(100, Number(String(rawLevel).replace(/[^\d.,-]/g, "").replace(",", ".")) || 0));
    const signature = `${Math.round(level)}|${product}|${vesselTone(card)}`;
    let gauge = $(":scope > .visual-vessel-gauge", view);
    if (gauge?.dataset.signature === signature) return;
    gauge?.remove();
    const normalized = product.toLowerCase();
    const silo = /silo|barita|bentonita|calcita|cimento|granel/.test(normalized) || /silo/i.test(card.textContent || "");
    gauge = document.createElement("div");
    gauge.className = "visual-vessel-gauge";
    gauge.dataset.signature = signature;
    gauge.innerHTML = `
      <div class="visual-vessel-shell${silo ? " is-silo" : ""}" aria-hidden="true">
        <span class="visual-vessel-liquid" style="--level:${level}%"></span>
      </div>
      <div class="visual-vessel-copy">
        <span>${silo ? "Nível do silo" : "Nível do tanque"}</span>
        <strong>${Math.round(level)}%</strong>
        <small>${esc(product)}</small>
      </div>`;
    (row || $(".reference-product-block", view))?.insertAdjacentElement("afterend", gauge);
  }

  function enhanceTanks(scope = document) {
    $$(".reference-tank-card", scope).forEach(enhanceTankCard);
  }

  function enhanceModal() {
    const modal = $("#modal");
    if (!modal || modal.classList.contains("hidden")) return;
    $(".modal-card", modal)?.classList.add("visual-spotlight");
  }

  function tagPages() {
    $$(".page").forEach(page => {
      const name = page.id.replace(/^page-/, "");
      page.dataset.visualPage = name;
    });
  }

  function run(scope = document) {
    scheduled = false;
    addLoginScene();
    tagPages();
    enhanceSurfaces(scope);
    enhanceTanks(scope);
    revealChildren(scope);
    animateNumbers(scope);
    enhanceModal();
  }

  function schedule(scope = document) {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => run(scope));
  }

  function start() {
    body.classList.add("visual-v3");
    root.dataset.visualSystem = VERSION;
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: .06, rootMargin: "0px 0px -24px" });

    document.addEventListener("pointermove", pointerSpotlight, { passive: true });
    const observer = new MutationObserver(records => {
      const scope = records.find(record => record.target instanceof Element)?.target || document;
      schedule(scope instanceof Element ? scope : document);
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style", "aria-valuenow"] });
    document.addEventListener("visibilitychange", () => !document.hidden && schedule());
    window.addEventListener("resize", () => schedule(), { passive: true });
    schedule();
  }

  window.OpsControlVisual = Object.freeze({
    version: VERSION,
    refresh: schedule,
    enhanceTankCard,
    animateNumbers
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
