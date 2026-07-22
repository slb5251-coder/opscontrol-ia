(() => {
  "use strict";

  const PAGE_SELECTOR = "#page-operations";
  const VERSION = "20260722-operations-analytics-1";
  let scheduled = false;
  let activeFilter = "all";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clean = value => String(value ?? "").replace(/\s+/g, " ").trim();
  const normalized = value => clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  function parseNumber(value) {
    const raw = clean(value).replace(/[^\d,.-]/g, "");
    if (!raw) return 0;
    const comma = raw.lastIndexOf(",");
    const dot = raw.lastIndexOf(".");
    const normalizedValue = comma > dot
      ? raw.replace(/\./g, "").replace(",", ".")
      : comma >= 0
        ? raw.replace(",", ".")
        : raw;
    const number = Number(normalizedValue);
    return Number.isFinite(number) ? number : 0;
  }

  function format(value, maximumFractionDigits = 1) {
    return new Intl.NumberFormat("pt-BR", { maximumFractionDigits }).format(Number(value || 0));
  }

  function parseDateTimes(text) {
    const dates = [];
    const expression = /(\d{2})\/(\d{2})\/(\d{4})(?:\s+|,\s*)(\d{2}):(\d{2})/g;
    let match;
    while ((match = expression.exec(clean(text)))) {
      const [, day, month, year, hour, minute] = match;
      const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), 0, 0);
      if (Number.isFinite(date.getTime())) dates.push(date);
    }
    return dates;
  }

  function rowData(row) {
    const cells = $$('td', row);
    if (cells.length < 8) return null;

    const progressText = clean(cells[2]?.textContent);
    const progressMatch = progressText.match(/([\d.,]+)\s*\/\s*([\d.,]+)\s*([a-zA-Z]+)/);
    if (!progressMatch) return null;

    const executed = parseNumber(progressMatch[1]);
    const planned = parseNumber(progressMatch[2]);
    const unit = normalized(progressMatch[3]);
    const flowText = clean(cells[3]?.textContent);
    const netHours = parseNumber(flowText.match(/([\d.,]+)\s*h\s*l[ií]quidas/i)?.[1] || 0);
    const status = clean(cells[5]?.querySelector('.badge')?.textContent || cells[5]?.textContent || "Registrada");
    const dates = parseDateTimes(cells[6]?.textContent || "");
    const start = dates[0] || null;
    const end = dates[1] || null;
    const statusKey = normalized(status);
    const grossEnd = end || (/em andamento|paralisada/.test(statusKey) ? new Date() : null);
    const grossHours = start && grossEnd ? Math.max(0, (grossEnd.getTime() - start.getTime()) / 3600000) : netHours;
    const pausedHours = Math.max(0, grossHours - netHours);

    return { row, executed, planned, unit, netHours, pausedHours, status, statusKey };
  }

  function collect(page) {
    return $$('.operations-table-card tbody tr', page).map(rowData).filter(Boolean);
  }

  function groupSummary(records, unit) {
    const items = records.filter(item => item.unit === unit);
    const planned = items.reduce((sum, item) => sum + item.planned, 0);
    const executed = items.reduce((sum, item) => sum + item.executed, 0);
    const hours = items.reduce((sum, item) => sum + item.netHours, 0);
    const completion = planned > 0 ? Math.min(100, Math.max(0, executed / planned * 100)) : 0;
    const averageFlow = hours > 0 ? executed / hours : 0;
    return { items, planned, executed, hours, completion, averageFlow };
  }

  function statusCount(records, pattern) {
    return records.filter(item => pattern.test(item.statusKey)).length;
  }

  function replaceMixedProgress(page, bbl, ton) {
    const target = $('.operations-command-progress', page);
    if (!target) return;
    const signature = `${bbl.executed}|${bbl.planned}|${ton.executed}|${ton.planned}`;
    if (target.dataset.operationsSplit === signature) return;
    target.dataset.operationsSplit = signature;
    target.innerHTML = `
      <div class="operations-split-heading"><span>Execução por unidade</span><strong>Sem mistura de bbl e ton</strong></div>
      <div class="operations-split-row fluid">
        <div><span>Fluidos</span><strong>${format(bbl.executed)} / ${format(bbl.planned)} bbl</strong><b>${format(bbl.completion)}%</b></div>
        <div class="progress"><span style="width:${bbl.completion}%"></span></div>
      </div>
      <div class="operations-split-row bulk">
        <div><span>Granéis</span><strong>${format(ton.executed)} / ${format(ton.planned)} ton</strong><b>${format(ton.completion)}%</b></div>
        <div class="progress"><span style="width:${ton.completion}%"></span></div>
      </div>`;
  }

  function ensureTimeAnalytics(page, records, bbl, ton) {
    let panel = $('.operations-time-analytics', page);
    const netHours = records.reduce((sum, item) => sum + item.netHours, 0);
    const pausedHours = records.reduce((sum, item) => sum + item.pausedHours, 0);
    const signature = `${netHours.toFixed(2)}|${pausedHours.toFixed(2)}|${bbl.averageFlow.toFixed(2)}|${ton.averageFlow.toFixed(2)}`;

    if (!panel) {
      panel = document.createElement('section');
      panel.className = 'operations-time-analytics';
      $('.operations-command-bar', page)?.insertAdjacentElement('afterend', panel);
    }
    if (!panel || panel.dataset.signature === signature) return;
    panel.dataset.signature = signature;
    panel.innerHTML = `
      <article><span>Horas líquidas</span><strong>${format(netHours)} h</strong><small>Tempo efetivo das operações filtradas</small></article>
      <article><span>Horas paradas</span><strong>${format(pausedHours)} h</strong><small>Diferença entre período total e horas líquidas</small></article>
      <article><span>Vazão média de fluidos</span><strong>${format(bbl.averageFlow)} bbl/h</strong><small>Volume executado por hora líquida</small></article>
      <article><span>Vazão média de granéis</span><strong>${format(ton.averageFlow)} ton/h</strong><small>Quantidade executada por hora líquida</small></article>`;
  }

  function recordStatus(element) {
    return normalized(element.querySelector('.badge')?.textContent || element.textContent || "");
  }

  function matchesFilter(status) {
    if (activeFilter === 'all') return true;
    const patterns = {
      active: /em andamento/,
      programmed: /programada/,
      paused: /paralisada/,
      completed: /concluida/
    };
    return patterns[activeFilter]?.test(status) ?? true;
  }

  function applyFilter(page) {
    $$('.operations-table-card tbody tr', page).forEach(row => {
      if ($$('td', row).length < 8) return;
      row.hidden = !matchesFilter(recordStatus(row));
    });
    $$('.operation-mobile-card', page).forEach(card => {
      card.hidden = !matchesFilter(recordStatus(card));
    });
    $$('.operations-record-filter button', page).forEach(button => {
      const active = button.dataset.operationsFilter === activeFilter;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function ensureFilter(page, records) {
    let filter = $('.operations-record-filter', page);
    const counts = {
      all: records.length,
      active: statusCount(records, /em andamento/),
      programmed: statusCount(records, /programada/),
      paused: statusCount(records, /paralisada/),
      completed: statusCount(records, /concluida/)
    };
    const signature = Object.values(counts).join('|');

    if (!filter) {
      filter = document.createElement('section');
      filter.className = 'operations-record-filter';
      const headings = $$('.section-heading-row', page);
      const recordsHeading = headings.find(item => /registros/i.test(item.textContent || ''));
      recordsHeading?.insertAdjacentElement('beforebegin', filter);
    }
    if (!filter) return;
    if (filter.dataset.signature !== signature) {
      filter.dataset.signature = signature;
      filter.innerHTML = `
        <div><span>FILTRAR REGISTROS</span><strong>Visualização por status</strong></div>
        <nav aria-label="Filtrar operações">
          <button type="button" data-operations-filter="all">Todas <b>${counts.all}</b></button>
          <button type="button" data-operations-filter="active">Em andamento <b>${counts.active}</b></button>
          <button type="button" data-operations-filter="programmed">Programadas <b>${counts.programmed}</b></button>
          <button type="button" data-operations-filter="paused">Paralisadas <b>${counts.paused}</b></button>
          <button type="button" data-operations-filter="completed">Concluídas <b>${counts.completed}</b></button>
        </nav>`;
    }
    applyFilter(page);
  }

  function bind(page) {
    if (page.dataset.operationsAnalyticsBound === VERSION) return;
    page.dataset.operationsAnalyticsBound = VERSION;
    page.addEventListener('click', event => {
      const button = event.target.closest('[data-operations-filter]');
      if (!button) return;
      activeFilter = button.dataset.operationsFilter || 'all';
      applyFilter(page);
    });
  }

  function enhance() {
    scheduled = false;
    const page = $(PAGE_SELECTOR);
    if (!page) return;
    const records = collect(page);
    if (!records.length) return;

    const bbl = groupSummary(records, 'bbl');
    const ton = groupSummary(records, 'ton');
    page.dataset.operationsAnalytics = VERSION;
    replaceMixedProgress(page, bbl, ton);
    ensureTimeAnalytics(page, records, bbl, ton);
    ensureFilter(page, records);
    bind(page);
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(enhance);
  }

  function start() {
    schedule();
    const page = $(PAGE_SELECTOR);
    if (page) new MutationObserver(schedule).observe(page, { childList: true, subtree: true });
    document.addEventListener('opscontrol:interface-ready', schedule);
    [150, 500, 1200].forEach(delay => setTimeout(schedule, delay));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
