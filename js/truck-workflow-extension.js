(() => {
  "use strict";

  const VERSION = "20260722-truck-workflow-1";
  const CONFIG_KEY = "opscontrol_config";
  const ENV_KEY = "opscontrol_environment";
  const REMEMBER_KEY = "opscontrol_remember_login";
  const STAGES = ["Programada", "Portaria", "Pátio", "Operação", "Liberada"];
  const EDIT_ROLES = ["admin", "supervisor", "lider", "logistica", "operador"];
  const MANAGER_ROLES = ["admin", "supervisor"];
  const $ = (selector, root = document) => root?.querySelector(selector) || null;
  const $$ = (selector, root = document) => [...(root?.querySelectorAll(selector) || [])];
  const fmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

  const state = {
    client: null,
    user: null,
    trucks: [],
    events: [],
    operations: [],
    items: [],
    currentTruckId: "",
    loaded: false,
    loading: false,
    enhanceTimer: null,
    refreshTimer: null
  };

  function clean(value = "") { return String(value ?? "").replace(/\s+/g, " ").trim(); }
  function normalize(value = "") { return clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
  function esc(value = "") {
    return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  }
  function number(value) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
  function currentRole() { return normalize($("#userRole")?.textContent || ""); }
  function canEdit() { return EDIT_ROLES.some(role => currentRole().includes(role)); }
  function isManager() { return MANAGER_ROLES.some(role => currentRole().includes(role)); }
  function appConfig() {
    const config = window.OPSCONTROL_CONFIG || {};
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(CONFIG_KEY) || "{}"); } catch {}
    const environment = localStorage.getItem(ENV_KEY) || config.defaultEnvironment || "production";
    const selected = config.environments?.[environment] || {};
    return { url: saved.url || selected.supabaseUrl || config.supabaseUrl || "", key: saved.key || selected.supabaseKey || config.supabaseKey || "" };
  }
  function dateTime(value) {
    if (!value) return "-";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  }
  function inputDateTime(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }
  function toIso(value) {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  }
  function duration(minutes) {
    const value = Math.max(0, number(minutes));
    if (value < 60) return `${value} min`;
    const hours = Math.floor(value / 60);
    const mins = value % 60;
    if (hours < 24) return `${hours}h${mins ? ` ${mins}min` : ""}`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  function stageIndex(stage) { return STAGES.indexOf(stage); }
  function nextStage(stage) { const index = stageIndex(stage); return index >= 0 && index < STAGES.length - 1 ? STAGES[index + 1] : ""; }
  function stageTone(stage, attention = "") {
    if (attention === "Atrasada") return "late";
    if (stage === "Liberada") return "done";
    if (stage === "Operação") return "active";
    if (stage === "Pátio" || stage === "Portaria") return "waiting";
    if (stage === "Cancelada") return "cancelled";
    return "planned";
  }
  function truckById(id) { return state.trucks.find(item => item.id === id) || null; }
  function eventsForTruck(id) { return state.events.filter(item => item.truck_id === id).sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at)); }
  function operationById(id) { return state.operations.find(item => item.id === id) || null; }
  function itemById(id) { return state.items.find(item => item.id === id) || null; }

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

  async function loadData({ silent = false } = {}) {
    if (state.loading) return;
    state.loading = true;
    try {
      if (!await ensureClient()) return;
      const [trucksResult, eventsResult, operationsResult, itemsResult] = await Promise.all([
        state.client.from("truck_workflow_overview").select("*").order("movement_date", { ascending: false }).order("created_at", { ascending: false }),
        state.client.from("truck_stage_events").select("*").order("occurred_at", { ascending: false }).limit(3000),
        state.client.from("operations").select("id,client,vessel,service_order,status,start_at,product_count").order("created_at", { ascending: false }).limit(1000),
        state.client.from("operation_items").select("id,operation_id,product,ticket_number,rt_number,lot,rig,status,display_order").order("display_order", { ascending: true }).limit(3000)
      ]);
      const error = trucksResult.error || eventsResult.error || operationsResult.error || itemsResult.error;
      if (error) throw error;
      state.trucks = trucksResult.data || [];
      state.events = eventsResult.data || [];
      state.operations = operationsResult.data || [];
      state.items = itemsResult.data || [];
      state.loaded = true;
      scheduleEnhance();
      if (state.currentTruckId) renderDrawer();
    } catch (error) {
      if (!silent) console.error("[Truck Workflow]", error);
    } finally {
      state.loading = false;
    }
  }

  function summarySignature() {
    return state.trucks.map(item => `${item.id}:${item.workflow_stage}:${item.overdue}:${item.updated_at}`).join("|");
  }
  function renderSummary() {
    const page = $("#page-trucks");
    const anchor = $(".truck-overview-grid", page);
    if (!page || !anchor || !state.loaded) return;
    let section = $("[data-twf-summary]", page);
    if (!section) {
      section = document.createElement("section");
      section.className = "twf-summary";
      section.dataset.twfSummary = VERSION;
      anchor.insertAdjacentElement("afterend", section);
    }
    const signature = summarySignature();
    if (section.dataset.signature === signature) return;
    section.dataset.signature = signature;
    const counts = Object.fromEntries([...STAGES, "Cancelada"].map(stage => [stage, state.trucks.filter(item => item.workflow_stage === stage).length]));
    const inside = state.trucks.filter(item => ["Portaria", "Pátio", "Operação"].includes(item.workflow_stage)).length;
    const overdue = state.trucks.filter(item => item.overdue).length;
    const stays = state.trucks.map(item => item.total_stay_minutes).filter(value => value !== null && value !== undefined).map(number);
    const average = stays.length ? Math.round(stays.reduce((sum, value) => sum + value, 0) / stays.length) : 0;
    section.innerHTML = `<header><div><small>FLUXO OPERACIONAL</small><h2>Programação, permanência e liberação</h2></div><div class="twf-summary-badges"><span>${inside} na planta</span><span class="${overdue ? "late" : ""}">${overdue} atrasada(s)</span><span>Média ${average ? duration(average) : "sem dados"}</span></div></header><div class="twf-stage-board">${STAGES.map((stage, index) => `<article class="stage-${stageTone(stage)}"><b>${index + 1}</b><div><span>${esc(stage)}</span><strong>${counts[stage] || 0}</strong></div></article>`).join("")}</div>`;
  }

  function truckIdFromElement(element) {
    return $("[data-edit-truck]", element)?.dataset.editTruck || element.closest("[data-edit-truck]")?.dataset.editTruck || "";
  }
  function stageCompact(truck) {
    const stage = truck.workflow_stage || "Programada";
    const tone = stageTone(stage, truck.workflow_attention);
    const time = truck.workflow_legacy ? "classificação histórica" : duration(truck.current_stage_minutes);
    return `<div class="twf-compact ${tone}" data-twf-compact><span>${esc(stage)}</span><small>${esc(time)}</small>${truck.overdue ? `<b>Atrasada</b>` : ""}</div>`;
  }
  function enhanceContainer(container) {
    const truckId = truckIdFromElement(container);
    const truck = truckById(truckId);
    if (!truckId || !truck) return;
    const signature = [truck.workflow_stage, truck.current_stage_minutes, truck.overdue, truck.workflow_attention, truck.workflow_legacy].join("|");
    if (container.dataset.twfSignature === signature) return;
    container.dataset.twfSignature = signature;
    $("[data-twf-compact]", container)?.remove();
    if (container.tagName === "TR") {
      const statusCell = container.children[6];
      statusCell?.insertAdjacentHTML("beforeend", stageCompact(truck));
    } else {
      const actions = $(".row-actions", container);
      if (actions) actions.insertAdjacentHTML("beforebegin", stageCompact(truck));
      else container.insertAdjacentHTML("beforeend", stageCompact(truck));
    }
    const actions = $(".row-actions", container);
    if (actions && !$("[data-twf-open]", actions)) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "btn small secondary twf-open-button";
      button.dataset.twfOpen = truckId;
      button.textContent = "Fluxo";
      actions.prepend(button);
    }
  }
  function enhancePage() {
    const page = $("#page-trucks");
    if (!page || !state.loaded) return;
    renderSummary();
    const containers = new Set();
    $$("[data-edit-truck]", page).forEach(button => {
      const container = button.closest("tr,.truck-mobile-card,.truck-queue-card,.truck-attention-list article,article");
      if (container) containers.add(container);
    });
    containers.forEach(enhanceContainer);
  }
  function scheduleEnhance() { clearTimeout(state.enhanceTimer); state.enhanceTimer = setTimeout(enhancePage, 60); }

  function ensureDrawer() {
    let drawer = $("#twfDrawer");
    if (drawer) return drawer;
    const backdrop = document.createElement("button");
    backdrop.id = "twfBackdrop";
    backdrop.type = "button";
    backdrop.className = "twf-backdrop hidden";
    backdrop.dataset.twfClose = "true";
    backdrop.setAttribute("aria-label", "Fechar fluxo da carreta");
    drawer = document.createElement("aside");
    drawer.id = "twfDrawer";
    drawer.className = "twf-drawer hidden";
    drawer.setAttribute("aria-hidden", "true");
    drawer.innerHTML = `<header class="twf-drawer-head"><div data-twf-title></div><button type="button" class="icon-btn" data-twf-close="true" aria-label="Fechar">×</button></header><div class="twf-drawer-body" data-twf-body></div>`;
    document.body.append(backdrop, drawer);
    return drawer;
  }
  function operationOptions(selected = "") {
    return state.operations.map(operation => `<option value="${operation.id}" ${selected === operation.id ? "selected" : ""}>${esc(operation.client || "Cliente")} • ${esc(operation.vessel || "Embarcação")} • ${esc(operation.service_order || operation.status || "Operação")}</option>`).join("");
  }
  function itemOptions(operationId, selected = "") {
    return state.items.filter(item => item.operation_id === operationId).map(item => `<option value="${item.id}" ${selected === item.id ? "selected" : ""}>${esc(item.product || "Produto")} • Ticket ${esc(item.ticket_number || "-")} • RT ${esc(item.rt_number || "-")}</option>`).join("");
  }
  function stageForm(truck) {
    if (!canEdit() || ["Liberada", "Cancelada"].includes(truck.workflow_stage)) return "";
    const next = nextStage(truck.workflow_stage);
    const options = isManager() ? [...STAGES, "Cancelada"].map(stage => `<option value="${stage}" ${stage === next ? "selected" : ""}>${stage}</option>`).join("") : `<option value="${next}">${next}</option><option value="Cancelada">Cancelada</option>`;
    return `<form class="twf-stage-form" data-twf-stage-form><div><label>Nova etapa</label><select name="stage">${options}</select></div><div><label>Data e hora</label><input name="occurred_at" type="datetime-local" value="${inputDateTime()}"></div><div class="wide"><label>Observação da etapa</label><input name="notes" placeholder="Ex.: liberada pela portaria, aguardando doca"></div><button class="btn primary wide">Atualizar etapa</button></form>`;
  }
  function planningForm(truck) {
    if (!canEdit()) return "";
    return `<details class="twf-planning"><summary>Planejamento e vínculo operacional</summary><form data-twf-planning-form><div class="twf-form-grid"><label><span>Programada para</span><input name="scheduled_at" type="datetime-local" value="${inputDateTime(truck.scheduled_at)}"></label><label><span>Previsão de liberação</span><input name="expected_release_at" type="datetime-local" value="${inputDateTime(truck.expected_release_at)}"></label><label class="wide"><span>Operação vinculada</span><select name="operation_id"><option value="">Sem vínculo</option>${operationOptions(truck.operation_id || "")}</select></label><label class="wide"><span>Produto da operação</span><select name="operation_item_id"><option value="">Sem produto específico</option>${itemOptions(truck.operation_id, truck.operation_item_id || "")}</select></label><label class="wide"><span>Transportadora</span><input name="transporter" value="${esc(truck.transporter || "")}"></label><label><span>Peso bruto</span><input name="gross_weight" inputmode="decimal" value="${truck.gross_weight ?? ""}"></label><label><span>Tara</span><input name="tare_weight" inputmode="decimal" value="${truck.tare_weight ?? ""}"></label><label><span>Peso líquido</span><input name="net_weight" inputmode="decimal" value="${truck.net_weight ?? ""}" readonly></label></div><button class="btn primary full">Salvar planejamento</button></form></details>`;
  }
  function timeline(truckId) {
    const events = eventsForTruck(truckId);
    if (!events.length) return `<div class="twf-empty"><strong>Sem histórico de etapas</strong><p>Este registro foi classificado a partir do status antigo. O histórico começará na próxima atualização.</p></div>`;
    return events.map(event => `<article><span></span><div><strong>${esc(event.from_stage || "Início")} → ${esc(event.to_stage)}</strong><small>${dateTime(event.occurred_at)}</small>${event.notes ? `<p>${esc(event.notes)}</p>` : ""}</div></article>`).join("");
  }
  function renderDrawer() {
    const drawer = ensureDrawer();
    const truck = truckById(state.currentTruckId);
    const title = $("[data-twf-title]", drawer);
    const body = $("[data-twf-body]", drawer);
    if (!truck) { title.innerHTML = `<small>FLUXO DE CARRETAS</small><h2>Registro não localizado</h2>`; body.innerHTML = `<div class="twf-empty">Atualize a página.</div>`; return; }
    const operation = operationById(truck.operation_id);
    const item = itemById(truck.operation_item_id);
    title.innerHTML = `<small>${esc(truck.truck_type || "Carreta")} • ${esc(truck.movement_type || "Movimentação")}</small><h2>${esc(truck.plate || truck.invoice_number || "Carreta")}</h2><p>${esc(truck.client || truck.supplier || "Sem cliente")}</p>`;
    body.innerHTML = `<section class="twf-current ${stageTone(truck.workflow_stage, truck.workflow_attention)}"><div><small>ETAPA ATUAL</small><strong>${esc(truck.workflow_stage)}</strong><span>${truck.workflow_legacy ? "Classificação gerada do cadastro anterior" : `Nesta etapa há ${duration(truck.current_stage_minutes)}`}</span></div><b>${esc(truck.workflow_attention || "Normal")}</b></section><section class="twf-stepper">${STAGES.map((stage, index) => `<div class="${index < stageIndex(truck.workflow_stage) ? "done" : index === stageIndex(truck.workflow_stage) ? "active" : ""}"><i>${index + 1}</i><span>${stage}</span></div>`).join("")}</section><section class="twf-time-grid"><span>Programação<strong>${dateTime(truck.scheduled_at)}</strong></span><span>Entrada na portaria<strong>${dateTime(truck.gate_in_at)}</strong></span><span>Chegada ao pátio<strong>${dateTime(truck.yard_at)}</strong></span><span>Início da operação<strong>${dateTime(truck.operation_started_at)}</strong></span><span>Liberação<strong>${dateTime(truck.released_at)}</strong></span><span>Permanência<strong>${truck.total_stay_minutes != null ? duration(truck.total_stay_minutes) : truck.current_site_minutes != null ? duration(truck.current_site_minutes) : "-"}</strong></span></section>${truck.overdue ? `<div class="twf-alert"><strong>Previsão de liberação ultrapassada</strong><span>Prevista para ${dateTime(truck.expected_release_at)}.</span></div>` : ""}${operation ? `<div class="twf-operation-link"><small>OPERAÇÃO VINCULADA</small><strong>${esc(operation.client)} • ${esc(operation.vessel)}</strong><span>${item ? `${esc(item.product)} • Ticket ${esc(item.ticket_number || "-")} • RT ${esc(item.rt_number || "-")}` : esc(operation.service_order || operation.status)}</span></div>` : ""}${stageForm(truck)}${planningForm(truck)}<div class="twf-section-title">Histórico de etapas</div><section class="twf-timeline">${timeline(truck.id)}</section>`;
  }
  function openDrawer(id) { state.currentTruckId = id; ensureDrawer(); $("#twfBackdrop")?.classList.remove("hidden"); $("#twfDrawer")?.classList.remove("hidden"); $("#twfDrawer")?.setAttribute("aria-hidden", "false"); document.body.classList.add("twf-drawer-open"); renderDrawer(); }
  function closeDrawer() { $("#twfBackdrop")?.classList.add("hidden"); $("#twfDrawer")?.classList.add("hidden"); $("#twfDrawer")?.setAttribute("aria-hidden", "true"); document.body.classList.remove("twf-drawer-open"); state.currentTruckId = ""; }
  function toast(message, tone = "success") { const target = $("#toastContainer") || document.body; const element = document.createElement("div"); element.className = `toast twf-toast ${tone}`; element.textContent = message; target.appendChild(element); setTimeout(() => element.remove(), 4000); }

  async function updateStage(form) {
    const payload = Object.fromEntries(new FormData(form));
    const { error } = await state.client.rpc("advance_truck_stage", { p_truck_id: state.currentTruckId, p_stage: payload.stage, p_occurred_at: toIso(payload.occurred_at) || new Date().toISOString(), p_notes: clean(payload.notes) || null });
    if (error) throw error;
    toast(`Carreta atualizada para ${payload.stage}.`);
    await loadData();
  }
  async function savePlanning(form) {
    const payload = Object.fromEntries(new FormData(form));
    const data = { scheduled_at: toIso(payload.scheduled_at), expected_release_at: toIso(payload.expected_release_at), operation_id: payload.operation_id || "", operation_item_id: payload.operation_item_id || "", transporter: clean(payload.transporter), gross_weight: clean(payload.gross_weight), tare_weight: clean(payload.tare_weight), net_weight: clean(payload.net_weight) };
    const { error } = await state.client.rpc("save_truck_workflow", { p_truck_id: state.currentTruckId, p_payload: data });
    if (error) throw error;
    toast("Planejamento da carreta salvo.");
    await loadData();
  }
  function bindEvents() {
    document.addEventListener("click", event => {
      const open = event.target.closest("[data-twf-open]");
      if (open) { event.preventDefault(); event.stopPropagation(); openDrawer(open.dataset.twfOpen); return; }
      if (event.target.closest("[data-twf-close]")) closeDrawer();
    });
    document.addEventListener("change", event => {
      const operationSelect = event.target.closest("[data-twf-planning-form] [name='operation_id']");
      if (operationSelect) { const itemSelect = $("[name='operation_item_id']", operationSelect.form); if (itemSelect) itemSelect.innerHTML = `<option value="">Sem produto específico</option>${itemOptions(operationSelect.value)}`; }
      const weight = event.target.closest("[data-twf-planning-form] [name='gross_weight'],[data-twf-planning-form] [name='tare_weight']");
      if (weight) { const form = weight.form; const gross = number(form.elements.gross_weight.value); const tare = number(form.elements.tare_weight.value); form.elements.net_weight.value = gross || tare ? Math.max(0, gross - tare) : ""; }
    });
    document.addEventListener("submit", async event => {
      const stage = event.target.closest("[data-twf-stage-form]");
      const planning = event.target.closest("[data-twf-planning-form]");
      if (!stage && !planning) return;
      event.preventDefault();
      const button = event.submitter;
      if (button) button.disabled = true;
      try { if (stage) await updateStage(stage); else await savePlanning(planning); }
      catch (error) { toast(error.message || "Não foi possível salvar.", "error"); }
      finally { if (button) button.disabled = false; }
    });
    document.addEventListener("keydown", event => { if (event.key === "Escape" && !$("#twfDrawer")?.classList.contains("hidden")) closeDrawer(); });
  }
  function start() {
    bindEvents();
    const page = $("#page-trucks");
    if (page) new MutationObserver(scheduleEnhance).observe(page, { childList: true, subtree: true });
    document.addEventListener("opscontrol:interface-ready", () => loadData({ silent: true }));
    [350, 1200, 2800].forEach(delay => setTimeout(() => loadData({ silent: true }), delay));
    state.refreshTimer = setInterval(() => { if (document.visibilityState === "visible") loadData({ silent: true }); }, 30000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true }); else start();
})();