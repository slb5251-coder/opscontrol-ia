(() => {
  "use strict";

  const $ = (selector, root = document) => root?.querySelector(selector) || null;
  const $$ = (selector, root = document) => [...(root?.querySelectorAll(selector) || [])];
  let timer = null;

  function clearEpochInputs(root = document) {
    $$('input[type="datetime-local"]', root).forEach(input => {
      if (String(input.value || "").startsWith("1970-01-01")) input.value = "";
    });
  }

  function bridgeViewOnlyCards() {
    const page = $("#page-trucks");
    if (!page) return;
    let changed = false;
    $$('[data-attachments^="truck:"]', page).forEach(button => {
      if (button.dataset.editTruck) return;
      const id = String(button.dataset.attachments || "").split(":")[1] || "";
      if (!id) return;
      button.dataset.editTruck = id;
      changed = true;
    });
    if (changed) {
      const marker = document.createElement("span");
      marker.hidden = true;
      marker.dataset.twfCompatMarker = "true";
      page.appendChild(marker);
      marker.remove();
    }
  }

  function refresh() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      bridgeViewOnlyCards();
      clearEpochInputs($("#twfDrawer") || document);
    }, 20);
  }

  function start() {
    refresh();
    const app = $("#appView") || document.body;
    new MutationObserver(refresh).observe(app, { childList: true, subtree: true });
    document.addEventListener("click", event => {
      if (event.target.closest("[data-twf-open]")) setTimeout(refresh, 0);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();