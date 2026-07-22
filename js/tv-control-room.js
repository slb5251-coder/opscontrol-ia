(() => {
  "use strict";

  const PAGE_SELECTOR = "#page-tv";
  const INTRO_KEY = "opscontrol_tv_control_room_intro";
  let scheduled = false;
  let initialized = false;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function normalize(value = "") {
    return String(value).replace(/\s+/g, " ").trim();
  }

  function activeSlideLabel(screen) {
    const active = $(".tv-dots button.active", screen);
    return normalize(active?.textContent || "Visão operacional").replace(/^\d+\.\s*/, "");
  }

  function rotationLabel(screen) {
    const toggle = $('[data-action="tv-toggle"]', screen);
    const paused = /retomar/i.test(toggle?.textContent || "");
    return paused ? "Rotação pausada" : "Rotação automática";
  }

  function connectionStatus() {
    const badge = $("#syncBadge");
    const text = normalize(badge?.textContent || "Status indisponível");
    const healthy = /sincron|online|conect/i.test(text) && !/offline|erro|local/i.test(text);
    return { text, healthy };
  }

  function createControlNav(screen) {
    let nav = $(".tv-control-nav", screen);
    if (nav) return nav;

    nav = document.createElement("div");
    nav.className = "tv-control-nav no-print";
    nav.innerHTML = `
      <div class="tv-control-tabs" role="tablist" aria-label="Visões do Painel TV">
        <button type="button" data-tv-control-slide="5">Visão geral</button>
        <button type="button" data-tv-control-slide="0">Tancagem</button>
        <button type="button" data-tv-control-slide="4">Operações</button>
        <button type="button" data-tv-control-slide="6">Alertas</button>
      </div>
      <div class="tv-control-actions">
        <button type="button" data-tv-control-rotation>Rotação automática</button>
        <button type="button" data-tv-control-fullscreen>Tela cheia</button>
      </div>
    `;
    $(".tv-topbar", screen)?.insertAdjacentElement("afterend", nav);
    return nav;
  }

  function createStatusRail(screen) {
    let rail = $(".tv-control-status-rail", screen);
    if (rail) return rail;

    rail = document.createElement("section");
    rail.className = "tv-control-status-rail";
    rail.setAttribute("aria-label", "Status operacional do painel");
    rail.innerHTML = `
      <article data-tv-status="view"><span>Visão atual</span><strong>—</strong></article>
      <article data-tv-status="connection"><span>Conexão</span><strong>—</strong><i></i></article>
      <article data-tv-status="alerts"><span>Alertas</span><strong>0 pendentes</strong></article>
      <article data-tv-status="rotation"><span>Apresentação</span><strong>—</strong></article>
    `;
    $(".tv-control-nav", screen)?.insertAdjacentElement("afterend", rail);
    return rail;
  }

  function syncControls(screen) {
    const currentIndex = Number($(".tv-dots button.active", screen)?.dataset.tvSlide ?? -1);
    $$('[data-tv-control-slide]', screen).forEach(button => {
      const target = Number(button.dataset.tvControlSlide);
      const dashboardActive = currentIndex === 5 && target === 5;
      const tankActive = [0, 1, 2, 3].includes(currentIndex) && target === 0;
      button.classList.toggle("active", dashboardActive || tankActive || currentIndex === target);
      button.setAttribute("aria-selected", String(dashboardActive || tankActive || currentIndex === target));
    });

    const rotationButton = $("[data-tv-control-rotation]", screen);
    if (rotationButton) rotationButton.textContent = rotationLabel(screen);

    const fullscreenButton = $("[data-tv-control-fullscreen]", screen);
    if (fullscreenButton) fullscreenButton.textContent = document.fullscreenElement ? "Sair da tela cheia" : "Tela cheia";
  }

  function syncStatusRail(screen) {
    const rail = $(".tv-control-status-rail", screen);
    if (!rail) return;

    const connection = connectionStatus();
    const alertCount = Number(normalize($("#alertCount")?.textContent || "0")) || 0;
    $('[data-tv-status="view"] strong', rail).textContent = activeSlideLabel(screen);
    $('[data-tv-status="connection"] strong', rail).textContent = connection.text;
    $('[data-tv-status="connection"]', rail).classList.toggle("is-warning", !connection.healthy);
    $('[data-tv-status="connection"]', rail).classList.toggle("is-online", connection.healthy);
    $('[data-tv-status="alerts"] strong', rail).textContent = `${alertCount} pendente${alertCount === 1 ? "" : "s"}`;
    $('[data-tv-status="alerts"]', rail).classList.toggle("is-warning", alertCount > 0);
    $('[data-tv-status="rotation"] strong', rail).textContent = rotationLabel(screen);
  }

  function applyScreenClass(screen) {
    const width = window.innerWidth;
    screen.classList.toggle("tv-size-compact", width < 1450);
    screen.classList.toggle("tv-size-standard", width >= 1450 && width < 2100);
    screen.classList.toggle("tv-size-wide", width >= 2100);

    const slide = $(".tv-slide", screen);
    screen.dataset.controlView = slide?.classList.contains("tv-dashboard-slide") ? "dashboard"
      : slide?.classList.contains("tv-operations-slide") ? "operations"
      : slide?.classList.contains("tv-alerts-slide") ? "alerts"
      : "plant";
  }

  function bindControls(screen) {
    if (screen.dataset.tvControlBound === "true") return;
    screen.dataset.tvControlBound = "true";

    screen.addEventListener("click", event => {
      const slideButton = event.target.closest("[data-tv-control-slide]");
      if (slideButton) {
        const target = Number(slideButton.dataset.tvControlSlide);
        $(`[data-tv-slide="${target}"]`, screen)?.click();
        return;
      }

      if (event.target.closest("[data-tv-control-rotation]")) {
        $('[data-action="tv-toggle"]', screen)?.click();
        return;
      }

      if (event.target.closest("[data-tv-control-fullscreen]")) {
        $('[data-action="tv-fullscreen"]', screen)?.click();
      }
    });
  }

  function openDashboardFirst(screen) {
    if (initialized) return;
    initialized = true;
    let alreadyOpened = false;
    try { alreadyOpened = sessionStorage.getItem(INTRO_KEY) === "true"; } catch {}
    if (alreadyOpened) return;

    const dashboard = $('[data-tv-slide="5"]', screen);
    if (!dashboard || dashboard.classList.contains("active")) return;
    try { sessionStorage.setItem(INTRO_KEY, "true"); } catch {}
    dashboard.click();
  }

  function enhance() {
    scheduled = false;
    const page = $(PAGE_SELECTOR);
    const screen = $(".tv-screen", page);
    if (!page || !screen) return;

    screen.classList.add("tv-control-room");
    createControlNav(screen);
    createStatusRail(screen);
    bindControls(screen);
    applyScreenClass(screen);
    syncControls(screen);
    syncStatusRail(screen);
    openDashboardFirst(screen);
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(enhance);
  }

  function start() {
    schedule();
    const page = $(PAGE_SELECTOR);
    if (page) new MutationObserver(schedule).observe(page, { childList: true, subtree: true, characterData: true });
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", schedule, { passive: true });
    document.addEventListener("fullscreenchange", schedule);
    document.addEventListener("visibilitychange", schedule);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
