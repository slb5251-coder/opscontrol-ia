(() => {
  "use strict";

  const VERSION = "20260722-tank-availability-1";
  const CONFIG_KEY = "opscontrol_config";
  const ENV_KEY = "opscontrol_environment";
  const REMEMBER_KEY = "opscontrol_remember_login";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const fmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

  const state = {
    client: null,
    user: null,
    availability: [],
    reservations: [],
    loading: false,
    loaded: false,
    enhanceTimer: null,
    refreshTimer: null,
    currentTankId: ""
  };

  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));

  const normalize = value => String(value ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

  const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;

  function appConfig() {
    const config = window.OPSCONTROL_CONFIG || {};
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(CONFIG_KEY) || "{}"); } catch {}
    const environment = localStorage.getItem(ENV_KEY) || config.defaultEnvironment || "production";
    const selected = config.environments?.[environment] || {};
    return {
      url: saved.url || selected.supabaseUrl || config.supabaseUrl || "",
      key: saved.key || selected.supabaseKey || config.supabaseKey || ""
    };
  }

  async function ensureClient() {
    if (state.client && state.user) return true;
    const { url, key } = appConfig();
    if (!url || !key || !window.supabase?.createClient) return false;
    const remember = localStorage.getItem(REMEMBER_KEY) !== "false";
    state.client = window.supabase.createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: remember ? window.localStorage : window.sessionStorage,
        storageKey: remember ? "opscontrol-auth" : "opscontrol-auth-session"
      }
    });
    const { data, error } = await state.client.auth.getSession();
    if (error || !data.session?.user) return false;
    state.user = data.session.user;
    return true;
  }

  function rowForTank(tankId) {
    return state.availability.find(row => row.tank_id === tankId) || null;
  }

  function reservationsForTank(tankId) {
    return state.reservations
      .filter(row => row.tank_id === tankId)
      .sort((a, b) => {
        const stateRank = { active: 0, pending_reconciliation: 1, inactive: 2 };
        return (stateRank[a.reservation_state] ?? 9) - (stateRank[b.reservation_state] ?? 9)
          || new Date(a.start_at || "2999-12-31") - new Date(b.start_at || "2999-12-31");
      });
  }

  function statusTone(status) {
    const value = normalize(status);
    if (value.includes("critic")) return "critical";
    if (value.includes("concili")) return "pending";
    if (value.includes("reserv")) return "reserved";
    return "free";
  }

  function dateTime(value) {
    if (!value) return "Sem programação";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Sem programação";
    return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  }

  function unitGroup(unit) {
    const value = normalize(unit);
    return value === "bbl" ? "bbl" : value === "ton" || value === "t" ? "ton" : value || "outros";
  }

  function summaryForUnit(unit) {
    const rows = state.availability.filter(row => unitGroup(row.unit) === unit);
    return rows.reduce((summary, row) => {
      summary.equipment += 1;
      summary.physical += number(row.physical_volume);
      summary.reservedOut += number(row.reserved_outgoing);
      summary.available += number(row.available_volume);
      summary.reservedIn += number(row.reserved_incoming);
      summary.freeCapacity += number(row.available_capacity);
      summary.pending += number(row.pending_reconciliation_count);
      summary.critical += row.outgoing_overbooked || row.incoming_overbooked ? 1 : 0;
      return summary;
    }, { equipment: 0, physical: 0, reservedOut: 0, available: 0, reservedIn: 0, freeCapacity: 0, pending: 0, critical: 0 });
  }

  function renderSummary() {
    const page = $("#page-tanks");
    const anchor = $(".tank-command-center", page);
    if (!page || !anchor || !state.loaded) return;

    let section = $("[data-tav-summary]", page);
    if (!section) {
      section = document.createElement("section");
      section.className = "tav-summary";
      section.dataset.tavSummary = VERSION;
      anchor.insertAdjacentElement("afterend", section);
    }

    const groups = [
      ["bbl", "Fluidos", summaryForUnit("bbl")],
      ["ton", "Granéis", summaryForUnit("ton")]
    ].filter(([, , summary]) => summary.equipment > 0);
    const pendingTotal = state.availability.reduce((sum, row) => sum + number(row.pending_reconciliation_count), 0);
    const criticalTotal = state.availability.filter(row => row.outgoing_overbooked || row.incoming_overbooked).length;
    const signature = JSON.stringify({ groups, pendingTotal, criticalTotal });
    if (section.dataset.tavSignature === signature) return;
    section.dataset.tavSignature = signature;

    section.innerHTML = `<header><div><small>DISPONIBILIDADE OPERACIONAL</small><h2>Físico, reservado e disponível</h2></div><span class="tav-summary-state ${criticalTotal ? "critical" : pendingTotal ? "pending" : "ok"}">${criticalTotal ? `${criticalTotal} conflito(s)` : pendingTotal ? `${pendingTotal} conciliação(ões) pendente(s)` : "Sem conflitos"}</span></header>
      <div class="tav-summary-grid">${groups.map(([unit, label, summary]) => `<article>
        <div><span>${label}</span><strong>${summary.equipment} equipamentos</strong></div>
        <dl>
          <div><dt>Físico</dt><dd>${fmt.format(summary.physical)} ${unit}</dd></div>
          <div><dt>Reservado</dt><dd>${fmt.format(summary.reservedOut)} ${unit}</dd></div>
          <div><dt>Disponível</dt><dd>${fmt.format(summary.available)} ${unit}</dd></div>
          <div><dt>Entrada reservada</dt><dd>${fmt.format(summary.reservedIn)} ${unit}</dd></div>
          <div><dt>Capacidade livre</dt><dd>${fmt.format(summary.freeCapacity)} ${unit}</dd></div>
        </dl>
      </article>`).join("")}</div>`;
  }

  function tankIdFromCard(card) {
    return $("[data-tank-history]", card)?.dataset.tankHistory
      || $("[data-edit-tank]", card)?.dataset.editTank
      || $("[data-tank-movements]", card)?.dataset.tankMovements
      || "";
  }

  function availabilityMarkup(row) {
    const unit = esc(row.unit || "");
    const pending = number(row.pending_reconciliation_count);
    const active = number(row.active_reservation_count);
    return `<section class="tav-breakdown" data-tav-breakdown>
      <header><span>Disponibilidade</span><b class="tav-status ${statusTone(row.availability_status)}">${esc(row.availability_status)}</b></header>
      <div class="tav-metrics">
        <span><small>Físico</small><strong>${fmt.format(number(row.physical_volume))} ${unit}</strong></span>
        <span><small>Reservado</small><strong>${fmt.format(number(row.reserved_outgoing))} ${unit}</strong></span>
        <span class="available"><small>Disponível</small><strong>${fmt.format(number(row.available_volume))} ${unit}</strong></span>
        <span><small>Entrada reservada</small><strong>${fmt.format(number(row.reserved_incoming))} ${unit}</strong></span>
        <span><small>Capacidade livre</small><strong>${fmt.format(number(row.available_capacity))} ${unit}</strong></span>
      </div>
      ${pending ? `<div class="tav-warning"><strong>${pending} movimentação(ões) aguardando conciliação</strong><span>Saída pendente: ${fmt.format(number(row.pending_outgoing))} ${unit} • Entrada pendente: ${fmt.format(number(row.pending_incoming))} ${unit}</span></div>` : ""}
      ${active ? `<div class="tav-reserved-note">${active} reserva(s) operacional(is) ativa(s)${row.next_reserved_at ? ` • próxima ${esc(dateTime(row.next_reserved_at))}` : ""}</div>` : ""}
    </section>`;
  }

  function enhanceCard(card) {
    const tankId = tankIdFromCard(card);
    const row = rowForTank(tankId);
    if (!tankId || !row) return;
    const signature = [row.physical_volume, row.reserved_outgoing, row.available_volume, row.reserved_incoming, row.available_capacity, row.pending_reconciliation_count, row.availability_status].join("|");
    if (card.dataset.tavSignature === signature) return;
    card.dataset.tavSignature = signature;

    $("[data-tav-breakdown]", card)?.remove();
    const volumeLine = $(".tank-volume-line", card);
    if (volumeLine) volumeLine.insertAdjacentHTML("afterend", availabilityMarkup(row));

    const actions = $(".row-actions", card);
    if (actions) {
      let button = $("[data-tav-open]", actions);
      const count = number(row.active_reservation_count) + number(row.pending_reconciliation_count);
      if (!button) {
        button = document.createElement("button");
        button.type = "button";
        button.className = "btn small secondary tav-open-button";
        button.dataset.tavOpen = tankId;
        actions.appendChild(button);
      }
      button.innerHTML = `Reservas <b>${count}</b>`;
      button.classList.toggle("attention", number(row.pending_reconciliation_count) > 0 || row.outgoing_overbooked || row.incoming_overbooked);
    }
  }

  function enhancePage() {
    const page = $("#page-tanks");
    if (!page || !state.loaded) return;
    renderSummary();
    $$(".tank-card", page).forEach(enhanceCard);
  }

  function scheduleEnhance() {
    clearTimeout(state.enhanceTimer);
    state.enhanceTimer = setTimeout(enhancePage, 50);
  }

  function ensureDrawer() {
    let drawer = $("#tavDrawer");
    if (drawer) return drawer;
    const backdrop = document.createElement("button");
    backdrop.id = "tavBackdrop";
    backdrop.type = "button";
    backdrop.className = "tav-backdrop hidden";
    backdrop.dataset.tavClose = "true";
    backdrop.setAttribute("aria-label", "Fechar reservas do equipamento");

    drawer = document.createElement("aside");
    drawer.id = "tavDrawer";
    drawer.className = "tav-drawer hidden";
    drawer.setAttribute("aria-hidden", "true");
    drawer.innerHTML = `<header class="tav-drawer-head"><div data-tav-drawer-title></div><button type="button" class="icon-btn" data-tav-close="true" aria-label="Fechar">×</button></header><div class="tav-drawer-body" data-tav-drawer-body></div>`;
    document.body.append(backdrop, drawer);
    return drawer;
  }

  function reservationCard(reservation) {
    const pending = reservation.reservation_state === "pending_reconciliation";
    const direction = reservation.direction === "destination" ? "Entrada" : "Saída";
    return `<article class="tav-reservation-card ${pending ? "pending" : "active"}">
      <header><div><small>${esc(direction)} • ${esc(reservation.activity || "Operação")}</small><h3>${esc(reservation.product || "Produto")}</h3></div><span>${pending ? "Conciliação pendente" : esc(reservation.effective_status || "Reservada")}</span></header>
      <div class="tav-reservation-main"><strong>${fmt.format(number(reservation.quantity))} ${esc(reservation.unit || "")}</strong><span>${esc(reservation.vessel || "Embarcação")} • ${esc(reservation.client || "Cliente")}</span></div>
      <div class="tav-reservation-meta">
        <span>Ticket<strong>${esc(reservation.ticket_number || "-")}</strong></span>
        <span>RT<strong>${esc(reservation.rt_number || "-")}</strong></span>
        <span>Lote<strong>${esc(reservation.lot || "-")}</strong></span>
        <span>Sonda<strong>${esc(reservation.rig || "-")}</strong></span>
        <span>Programação<strong>${esc(dateTime(reservation.start_at))}</strong></span>
        <span>OS<strong>${esc(reservation.service_order || "-")}</strong></span>
      </div>
    </article>`;
  }

  function renderDrawer() {
    const drawer = ensureDrawer();
    const row = rowForTank(state.currentTankId);
    const reservations = reservationsForTank(state.currentTankId);
    const title = $("[data-tav-drawer-title]", drawer);
    const body = $("[data-tav-drawer-body]", drawer);
    if (!row) {
      title.innerHTML = `<small>DISPONIBILIDADE</small><h2>Equipamento não localizado</h2>`;
      body.innerHTML = `<div class="tav-empty">Atualize a página e tente novamente.</div>`;
      return;
    }

    title.innerHTML = `<small>${esc(row.phase || "PLANTA")}</small><h2>${esc(row.name || "Equipamento")}</h2><p>${esc(row.availability_status || "Livre")}</p>`;
    body.innerHTML = `<section class="tav-drawer-summary">
        <span>Físico<strong>${fmt.format(number(row.physical_volume))} ${esc(row.unit)}</strong></span>
        <span>Reservado<strong>${fmt.format(number(row.reserved_outgoing))} ${esc(row.unit)}</strong></span>
        <span>Disponível<strong>${fmt.format(number(row.available_volume))} ${esc(row.unit)}</strong></span>
        <span>Entrada reservada<strong>${fmt.format(number(row.reserved_incoming))} ${esc(row.unit)}</strong></span>
        <span>Capacidade livre<strong>${fmt.format(number(row.available_capacity))} ${esc(row.unit)}</strong></span>
      </section>
      <div class="tav-drawer-actions"><button type="button" class="btn secondary" data-tav-reload>Atualizar</button><button type="button" class="btn primary" data-tav-operations>Abrir Operações</button></div>
      <section class="tav-reservation-list">${reservations.map(reservationCard).join("") || `<div class="tav-empty"><strong>Nenhuma reserva ativa</strong><p>Este equipamento está sem volumes programados ou pendências de conciliação.</p></div>`}</section>`;
  }

  function openDrawer(tankId) {
    state.currentTankId = tankId;
    const drawer = ensureDrawer();
    $("#tavBackdrop")?.classList.remove("hidden");
    drawer.classList.remove("hidden");
    drawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("tav-drawer-open");
    renderDrawer();
  }

  function closeDrawer() {
    $("#tavBackdrop")?.classList.add("hidden");
    $("#tavDrawer")?.classList.add("hidden");
    $("#tavDrawer")?.setAttribute("aria-hidden", "true");
    document.body.classList.remove("tav-drawer-open");
    state.currentTankId = "";
  }

  async function loadData({ silent = false } = {}) {
    if (state.loading) return;
    state.loading = true;
    try {
      if (!await ensureClient()) return;
      const [availabilityResult, reservationsResult] = await Promise.all([
        state.client.from("tank_operational_availability").select("*"),
        state.client.from("tank_operation_reservations").select("*").order("start_at", { ascending: true })
      ]);
      const error = availabilityResult.error || reservationsResult.error;
      if (error) throw error;
      state.availability = availabilityResult.data || [];
      state.reservations = reservationsResult.data || [];
      state.loaded = true;
      scheduleEnhance();
      if (state.currentTankId) renderDrawer();
    } catch (error) {
      if (!silent) console.error("[Tank Availability]", error);
    } finally {
      state.loading = false;
    }
  }

  function bindEvents() {
    document.addEventListener("click", event => {
      const open = event.target.closest("[data-tav-open]");
      if (open) {
        event.preventDefault();
        event.stopPropagation();
        openDrawer(open.dataset.tavOpen);
        return;
      }
      if (event.target.closest("[data-tav-close]")) return closeDrawer();
      if (event.target.closest("[data-tav-reload]")) return loadData();
      if (event.target.closest("[data-tav-operations]")) {
        closeDrawer();
        document.querySelector('.nav-item[data-page="operations"]')?.click();
      }
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && !$("#tavDrawer")?.classList.contains("hidden")) closeDrawer();
    });
  }

  function start() {
    bindEvents();
    const page = $("#page-tanks");
    if (page) new MutationObserver(scheduleEnhance).observe(page, { childList: true, subtree: true });
    document.addEventListener("opscontrol:interface-ready", () => loadData({ silent: true }));
    [300, 1000, 2500].forEach(delay => setTimeout(() => loadData({ silent: true }), delay));
    state.refreshTimer = setInterval(() => {
      if (document.visibilityState === "visible") loadData({ silent: true });
    }, 30000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
