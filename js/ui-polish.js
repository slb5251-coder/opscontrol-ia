(() => {
  "use strict";

  const TAB_CONTAINERS = [
    '[role="tablist"]',
    '.tabs',
    '.tab-list',
    '.module-tabs',
    '.filter-tabs',
    '.quality-filter-chips',
    '.alert-filter-row',
    '.operation-stepper-head'
  ].join(',');

  let scheduled = false;
  let resizeTimer = null;

  function activeItem(container) {
    return container.querySelector('.active,[aria-selected="true"],[data-active="true"]');
  }

  function centerActive(container, behavior = "smooth") {
    const item = activeItem(container);
    if (!item || container.scrollWidth <= container.clientWidth + 2) return;
    item.scrollIntoView({ block: "nearest", inline: "center", behavior });
  }

  function prepareTabContainer(container) {
    if (!container || container.dataset.uiPolished === "true") return;
    container.dataset.uiPolished = "true";
    container.classList.add("ui-tab-scroller");
    container.addEventListener("click", () => {
      requestAnimationFrame(() => centerActive(container));
    });
    centerActive(container, "auto");
  }

  function simplifyDashboard() {
    const page = document.querySelector('#page-dashboard');
    const grid = page?.querySelector('.dashboard-kpi-grid');
    if (!grid || grid.dataset.uiGrouped === "true") return;

    const cards = [...grid.children].filter(element => element.matches('.stat-card,.card'));
    if (cards.length <= 4) {
      grid.classList.add('dashboard-primary-kpis');
      grid.dataset.uiGrouped = "true";
      return;
    }

    grid.classList.add('dashboard-primary-kpis');
    grid.dataset.uiGrouped = "true";

    const details = document.createElement('details');
    details.className = 'dashboard-more-metrics';
    details.innerHTML = '<summary>Mais indicadores <span>2 indicadores adicionais</span></summary><div class="dashboard-more-metrics-grid"></div>';

    const secondaryGrid = details.querySelector('.dashboard-more-metrics-grid');
    cards.slice(4).forEach(card => secondaryGrid.appendChild(card));
    grid.insertAdjacentElement('afterend', details);
  }

  function markScrollable(container) {
    if (!container) return;
    const scrollable = container.scrollWidth > container.clientWidth + 2;
    container.classList.toggle('is-scrollable', scrollable);
  }

  function auditOverflow() {
    const allowed = '.table-wrap,.page-header .actions,.ui-tab-scroller,.operation-stepper-head,.mobile-sheet,.sidebar nav';
    const viewportWidth = document.documentElement.clientWidth;
    const offenders = [...document.querySelectorAll('body *')].filter(element => {
      if (element.closest(allowed)) return false;
      const style = getComputedStyle(element);
      if (style.position === 'fixed' || style.display === 'none' || style.visibility === 'hidden') return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.right > viewportWidth + 2;
    }).slice(0, 12);

    document.documentElement.dataset.uiOverflow = offenders.length ? 'true' : 'false';
    if (offenders.length) {
      console.warn('[OpsControl UI] Elementos fora da largura da tela:', offenders);
    }
  }

  function run() {
    scheduled = false;
    document.querySelectorAll(TAB_CONTAINERS).forEach(prepareTabContainer);
    document.querySelectorAll('.page-header .actions,.ui-tab-scroller,.operation-stepper-head,.table-wrap').forEach(markScrollable);
    simplifyDashboard();
    auditOverflow();
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

    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(schedule, 120);
    }, { passive: true });

    window.addEventListener('orientationchange', schedule, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
