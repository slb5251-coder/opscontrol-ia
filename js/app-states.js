(() => {
  "use strict";

  const VERSION = "20260722-app-states-1";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  let scheduled = false;
  let successTimer = null;
  let lastBannerSignature = "";
  let dismissedOnlineSignature = "";

  function normalize(value = "") {
    return String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function connectionState() {
    if (!navigator.onLine) return "offline";
    const badge = $("#syncBadge");
    const text = normalize(badge?.textContent || "");
    if (/falha|indisponivel|erro/.test(text)) return "error";
    if (/conectando|sincronizando|atualizando|modo local/.test(text)) return "syncing";
    if (/atualizado|tempo real ativo/.test(text)) return "online";
    return "idle";
  }

  function bannerContent(state) {
    const badgeText = $("#syncBadge")?.textContent?.trim() || "";
    const map = {
      offline: {
        title: "Modo offline",
        detail: badgeText.includes("pendente") ? `${badgeText}. Os dados já carregados continuam disponíveis.` : "Os dados já carregados continuam disponíveis para consulta.",
        action: ""
      },
      error: {
        title: "Falha na sincronização",
        detail: "Não foi possível buscar os dados mais recentes.",
        action: '<button type="button" class="btn small secondary" data-action="refresh">Tentar novamente</button>'
      },
      syncing: {
        title: "Sincronizando dados",
        detail: "Conferindo as informações mais recentes do Supabase.",
        action: '<span class="app-state-spinner" aria-hidden="true"></span>'
      },
      online: {
        title: "Dados atualizados",
        detail: badgeText || "Sincronização concluída.",
        action: ""
      }
    };
    return map[state] || null;
  }

  function updateBanner() {
    const banner = $("#mobileStatusBanner");
    if (!banner) return;
    const state = connectionState();
    document.documentElement.dataset.connectionState = state;
    const content = bannerContent(state);
    const badgeText = $("#syncBadge")?.textContent?.trim() || "";
    const signature = `${state}|${badgeText}`;

    clearTimeout(successTimer);
    if (!content || state === "idle") {
      lastBannerSignature = signature;
      dismissedOnlineSignature = "";
      banner.className = "mobile-status-banner hidden";
      banner.innerHTML = "";
      return;
    }

    if (state === "online" && dismissedOnlineSignature === signature) {
      banner.classList.add("hidden");
      return;
    }
    if (signature === lastBannerSignature && !banner.classList.contains("hidden")) return;
    if (state !== "online") dismissedOnlineSignature = "";
    lastBannerSignature = signature;

    banner.className = `mobile-status-banner app-state-banner state-${state}`;
    banner.innerHTML = `<div><strong>${content.title}</strong><span>${content.detail}</span></div>${content.action}`;

    if (state === "online") {
      successTimer = setTimeout(() => {
        if (connectionState() === "online") {
          dismissedOnlineSignature = signature;
          banner.classList.add("hidden");
        }
      }, 1800);
    }
  }

  function syncTankPage() {
    const page = $("#page-tanks");
    if (!page) return;
    const state = connectionState();
    page.dataset.tankExperience = VERSION;
    page.classList.toggle("is-syncing", state === "syncing");
    page.classList.toggle("is-offline", state === "offline");
    page.classList.toggle("has-sync-error", state === "error");

    $$('[data-edit-tank],[data-action="new-tank-transfer"]', page).forEach(button => {
      if (state === "offline") {
        if (!button.dataset.appStateDisabled) {
          button.dataset.appStateDisabled = "true";
          button.dataset.previousDisabled = String(button.disabled);
        }
        button.disabled = true;
        button.title = "Reconecte para alterar dados de tancagem.";
      } else if (button.dataset.appStateDisabled === "true") {
        button.disabled = button.dataset.previousDisabled === "true";
        delete button.dataset.appStateDisabled;
        delete button.dataset.previousDisabled;
        button.removeAttribute("title");
      }
    });

    const cards = $$(".reference-tank-card", page);
    const visible = cards.filter(card => !card.hidden && !card.closest("[hidden]")).length;
    const result = $("[data-tank-filter-result]", page);
    if (result) result.dataset.visibleCount = String(visible);

    let empty = $(".tank-experience-empty", page);
    const filteredEmpty = cards.length > 0 && visible === 0;
    const databaseEmpty = cards.length === 0 && !page.querySelector(".module-error-card");

    if (filteredEmpty || databaseEmpty) {
      if (!empty) {
        empty = document.createElement("section");
        empty.className = "tank-experience-empty";
        const anchor = result || page.querySelector(".tank-filter-bar") || page.querySelector(".page-header");
        anchor?.insertAdjacentElement("afterend", empty);
      }
      empty.innerHTML = filteredEmpty
        ? '<span class="tank-empty-icon">⌕</span><div><strong>Nenhum equipamento encontrado</strong><p>Altere a busca ou limpe os filtros para visualizar os tanques e silos.</p></div><button type="button" class="btn secondary" data-action="clear-tank-filters">Limpar filtros</button>'
        : '<span class="tank-empty-icon">TK</span><div><strong>Nenhum tanque ou silo cadastrado</strong><p>Cadastre a estrutura operacional para começar o controle de volumetria.</p></div>';
      empty.hidden = false;
    } else if (empty) {
      empty.hidden = true;
    }
  }

  function enhanceErrors() {
    $$(".module-error-card").forEach(card => {
      if (card.dataset.appStateEnhanced === VERSION) return;
      card.dataset.appStateEnhanced = VERSION;
      card.classList.add("app-state-error-card");
      const heading = card.querySelector("strong");
      if (heading && !card.querySelector(".app-state-error-label")) {
        heading.insertAdjacentHTML("beforebegin", '<span class="app-state-error-label">ERRO DO MÓDULO</span>');
      }
    });
  }

  function run() {
    scheduled = false;
    updateBanner();
    syncTankPage();
    enhanceErrors();
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(run);
  }

  function start() {
    schedule();
    const badge = $("#syncBadge");
    if (badge) new MutationObserver(schedule).observe(badge, { childList: true, subtree: true, attributes: true });
    const page = $("#page-tanks");
    if (page) new MutationObserver(schedule).observe(page, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "class"] });
    window.addEventListener("online", schedule);
    window.addEventListener("offline", schedule);
    document.addEventListener("opscontrol:interface-ready", schedule);
    document.addEventListener("click", event => {
      if (event.target.closest('[data-action="refresh"],[data-action="clear-tank-filters"]')) setTimeout(schedule, 50);
    });
    document.addEventListener("input", event => {
      if (event.target.matches("#page-tanks [data-tank-filter]")) setTimeout(schedule, 0);
    });
    document.addEventListener("change", event => {
      if (event.target.matches("#page-tanks [data-tank-filter]")) setTimeout(schedule, 0);
    });
    [150, 600, 1400].forEach(delay => setTimeout(schedule, delay));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();