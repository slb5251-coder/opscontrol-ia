(() => {
  "use strict";

  const MENU_STATE_KEY = "opscontrol_design_menu_groups";
  let scheduled = false;

  function injectStabilityStyles() {
    if (document.querySelector("style[data-design-stability='true']")) return;
    const style = document.createElement("style");
    style.dataset.designStability = "true";
    style.textContent = `
      .design-operation-drawer:not(.is-open){visibility:hidden!important;pointer-events:none!important}
      .design-operation-drawer.is-open{visibility:visible!important;pointer-events:auto!important}
    `;
    document.head.appendChild(style);
  }

  function storedMenuState() {
    try {
      return JSON.parse(localStorage.getItem(MENU_STATE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function setOpen(group, open) {
    group.classList.toggle("is-collapsed", !open);
    group.querySelector(".design-nav-group-toggle")?.setAttribute("aria-expanded", String(open));
  }

  function normalizeMenuGroups() {
    const groups = [...document.querySelectorAll(".design-nav-group")];
    if (!groups.length) return;
    const state = storedMenuState();

    groups.forEach((group, index) => {
      const active = Boolean(group.querySelector(".nav-item.active"));
      if (active) {
        setOpen(group, true);
        group.dataset.designInitialState = "true";
        return;
      }

      if (group.dataset.designInitialState === "true") return;
      const key = group.dataset.designGroup || "";
      const hasStoredState = Object.prototype.hasOwnProperty.call(state, key);
      const open = hasStoredState ? state[key] !== false : index === 0;
      setOpen(group, open);
      group.dataset.designInitialState = "true";
    });
  }

  function run() {
    scheduled = false;
    injectStabilityStyles();
    normalizeMenuGroups();
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
    document.addEventListener("click", event => {
      if (event.target.closest(".nav-item")) requestAnimationFrame(normalizeMenuGroups);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
