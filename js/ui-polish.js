(() => {
  "use strict";

  const scriptUrl = document.currentScript?.src || new URL('js/ui-polish.js', document.baseURI).href;
  const INTERFACE_STYLESHEET = new URL('../interface-fix.css?v=20260721-interface-fix-1', scriptUrl).href;
  const DESIGN_STYLESHEET = new URL('../design-upgrade.css?v=20260721-control-center-1', scriptUrl).href;
  const TANK_CARD_STYLESHEET = new URL('../tank-cards-reference.css?v=20260721-reference-cards-1', scriptUrl).href;
  const DESIGN_SCRIPT = new URL('design-upgrade.js?v=20260721-control-center-1', scriptUrl).href;
  const STABILITY_SCRIPT = new URL('design-stability.js?v=20260721-original-tanks-1', scriptUrl).href;
  const TANK_CARD_SCRIPT = new URL('tank-cards-reference.js?v=20260721-reference-cards-1', scriptUrl).href;
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

  const SCROLLABLE_CONTAINERS = [
    '.page-header .actions',
    '.ui-tab-scroller',
    '.operation-stepper-head',
    '.table-wrap'
  ].join(',');

  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  let scheduled = false;
  let resizeTimer = null;

  function ensureInterfaceStylesheet() {
    if (document.querySelector('link[data-interface-fix="true"]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = INTERFACE_STYLESHEET;
    link.dataset.interfaceFix = 'true';
    document.head.appendChild(link);
  }

  function appendScript(src, marker) {
    if (document.querySelector(`script[data-${marker}="true"]`)) return;
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.setAttribute(`data-${marker}`, 'true');
    document.head.appendChild(script);
  }

  function appendStylesheet(href, marker) {
    if (document.querySelector(`link[data-${marker}="true"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute(`data-${marker}`, 'true');
    document.head.appendChild(link);
  }

  function ensureDesignUpgrade() {
    appendStylesheet(DESIGN_STYLESHEET, 'design-upgrade');
    appendStylesheet(TANK_CARD_STYLESHEET, 'tank-cards-reference');
    appendScript(DESIGN_SCRIPT, 'design-upgrade');
    appendScript(STABILITY_SCRIPT, 'design-stability');
    appendScript(TANK_CARD_SCRIPT, 'tank-cards-reference');
  }

  function activeItem(container) {
    return container.querySelector('.active,[aria-selected="true"],[data-active="true"]');
  }

  function centerActive(container, behavior = 'smooth') {
    const item = activeItem(container);
    if (!item || container.scrollWidth <= container.clientWidth + 2) return;
    item.scrollIntoView({
      block: 'nearest',
      inline: 'center',
      behavior: prefersReducedMotion ? 'auto' : behavior
    });
  }

  function prepareTabContainer(container) {
    if (!container) return;
    container.classList.add('ui-tab-scroller');
    if (container.dataset.uiPolished === 'true') return;

    container.dataset.uiPolished = 'true';
    container.addEventListener('click', () => {
      requestAnimationFrame(() => centerActive(container));
    });
    centerActive(container, 'auto');
  }

  function formatMetricCount(count) {
    return `${count} ${count === 1 ? 'indicador adicional' : 'indicadores adicionais'}`;
  }

  function simplifyDashboard() {
    const page = document.querySelector('#page-dashboard');
    const grid = page?.querySelector('.dashboard-kpi-grid');
    if (!grid || grid.dataset.uiGrouped === 'true') return;

    const cards = [...grid.children].filter(element => element.matches('.stat-card,.card'));
    grid.classList.add('dashboard-primary-kpis');
    grid.dataset.uiGrouped = 'true';
    if (cards.length <= 4) return;

    const secondaryCards = cards.slice(4);
    const details = document.createElement('details');
    details.className = 'dashboard-more-metrics';
    details.innerHTML = `
      <summary>
        <strong>Mais indicadores</strong>
        <span>${formatMetricCount(secondaryCards.length)}</span>
      </summary>
      <div class="dashboard-more-metrics-grid"></div>
    `;

    const secondaryGrid = details.querySelector('.dashboard-more-metrics-grid');
    secondaryCards.forEach(card => secondaryGrid.appendChild(card));
    grid.insertAdjacentElement('afterend', details);
  }

  function markScrollable(container) {
    if (!container) return;
    container.classList.toggle('is-scrollable', container.scrollWidth > container.clientWidth + 2);
  }

  function auditOverflow() {
    const allowed = [
      '.table-wrap',
      '.page-header .actions',
      '.ui-tab-scroller',
      '.operation-stepper-head',
      '.mobile-bottom-nav',
      '.mobile-sheet',
      '.sidebar nav'
    ].join(',');

    const viewportWidth = document.documentElement.clientWidth;
    const offenders = [...document.querySelectorAll('body *')].filter(element => {
      if (element.closest(allowed)) return false;
      const style = getComputedStyle(element);
      if (style.position === 'fixed' || style.display === 'none' || style.visibility === 'hidden') return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.right > viewportWidth + 2;
    }).slice(0, 12);

    document.documentElement.dataset.uiOverflow = offenders.length ? 'true' : 'false';
    if (offenders.length) console.warn('[OpsControl UI] Elementos fora da largura da tela:', offenders);
  }

  function run() {
    scheduled = false;
    document.querySelectorAll(TAB_CONTAINERS).forEach(prepareTabContainer);
    document.querySelectorAll(SCROLLABLE_CONTAINERS).forEach(markScrollable);
    simplifyDashboard();
    auditOverflow();
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(run);
  }

  function start() {
    ensureInterfaceStylesheet();
    ensureDesignUpgrade();
    schedule();

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });

    if ('ResizeObserver' in window) {
      const resizeObserver = new ResizeObserver(schedule);
      resizeObserver.observe(document.documentElement);
      document.querySelectorAll('.main-content,.sidebar').forEach(element => resizeObserver.observe(element));
    }

    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(schedule, 120);
    }, { passive: true });
    window.addEventListener('orientationchange', schedule, { passive: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
