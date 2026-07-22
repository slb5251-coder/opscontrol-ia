(() => {
  "use strict";

  const $ = (selector, root = document) => root?.querySelector(selector) || null;
  const $$ = (selector, root = document) => [...(root?.querySelectorAll(selector) || [])];
  const OPEN_DAYS_PATTERN = /(?:\d+\s*)?dia\(s\)\s+aberta|aberta\s+h[aá]\s+mais\s+de\s+1\s+dia|abertas\s*\+\s*1\s+dia/i;
  let timer = null;
  let clearingFilter = false;

  function replaceEmptyAttentionGroups(page) {
    $$(".truck-attention-flags", page).forEach(group => {
      if (group.querySelector("span")) return;
      const ok = document.createElement("div");
      ok.className = "truck-attention-ok";
      ok.textContent = "Sem pendências";
      group.replaceWith(ok);
    });
  }

  function cleanAttentionList(page) {
    const list = $(".truck-attention-list", page);
    if (!list) return;

    $$(':scope > article', list).forEach(article => {
      const flagBox = article.children[1];
      if (flagBox && !flagBox.querySelector("span")) article.remove();
    });

    const remaining = $$(':scope > article', list);
    const count = $(".truck-attention-panel .truck-section-heading > span", page);
    if (count) count.textContent = `${remaining.length} registro(s)`;

    if (!remaining.length && !$(".empty", list)) {
      list.innerHTML = '<div class="empty">Nenhuma pendência encontrada.</div>';
    }
  }

  function clearOverdueFilter(page) {
    const select = $('[data-truck-filter="attention"]', page);
    if (!select) return;

    const wasSelected = select.value === "overdue";
    select.querySelector('option[value="overdue"]')?.remove();

    if (wasSelected && !clearingFilter) {
      clearingFilter = true;
      select.value = "";
      select.dispatchEvent(new Event("change", { bubbles: true }));
      setTimeout(() => { clearingFilter = false; }, 300);
    }
  }

  function cleanPage() {
    const page = $("#page-trucks");
    if (!page) return;

    clearOverdueFilter(page);
    $('[data-truck-quick-attention="overdue"]', page)?.remove();

    $$("span", page).forEach(span => {
      if (OPEN_DAYS_PATTERN.test(String(span.textContent || "").trim())) span.remove();
    });

    replaceEmptyAttentionGroups(page);
    cleanAttentionList(page);
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(cleanPage, 30);
  }

  function start() {
    schedule();
    const app = $("#appView") || document.body;
    new MutationObserver(schedule).observe(app, { childList: true, subtree: true });
    document.addEventListener("opscontrol:interface-ready", schedule);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();