(() => {
  "use strict";

  const VERSION = "20260722-operation-products-extension-1";
  const CONFIG_KEY = "opscontrol_config";
  const ENV_KEY = "opscontrol_environment";
  const REMEMBER_KEY = "opscontrol_remember_login";
  const EDIT_ROLES = ["admin", "supervisor", "lider", "operador"];
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const fmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

  const state = {
    client: null,
    user: null,
    operations: [],
    items: [],
    allocations: [],
    fluids: [],
    tanks: [],
    currentOperationId: "",
    loading: false,
    bound: false,
    observer: null,
    realtime: null,
    enhanceTimer: null
  };

  function clean(value = "") {
    return String(value ?? "").replace(/\s+/g, " ").trim();
  }

  function normalize(value = "") {
    return clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  function esc(value = "") {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
  }

  function number(value) {
    const raw = clean(value);
    if (!raw) return 0;
    const parsed = Number(raw.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function dateTime(value) {
    if (!value) return "-";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  }

  function inputDateTime(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  function toIso(value) {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  }

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

  function currentRole() {
    return normalize($("#userRole")?.textContent || "");
  }

  function canEdit() {
    const role = currentRole();
    return EDIT_ROLES.some(item => role.includes(item));
  }

  function operationById(id) {
    return state.operations.find(item => item.id === id) || null;
  }

  function itemsByOperation(id) {
    return state.items
      .filter(item => item.operation_id === id)
      .sort((a, b) => Number(a.display_order || 0) - Number(b.display_order || 0));
  }

  function allocationsByItem(id) {
    return state.allocations
      .filter(item => item.operation_item_id === id)
      .sort((a, b) => Number(a.display_order || 0) - Number(b.display_order || 0));
  }

  function tankById(id) {
    return state.tanks.find(item => item.id === id) || null;
  }

  function traceMissing(item) {
    return [
      ["Ticket", item.ticket_number],
      ["RT", item.rt_number],
      ["Lote", item.lot],
      ["Sonda", item.rig]
    ].filter(([, value]) => !clean(value)).map(([label]) => label);
  }

  function statusTone(status = "") {
    const key = normalize(status);
    if (key.includes("conclu")) return "done";
    if (key.includes("paralis")) return "paused";
    if (key.includes("andamento")) return "active";
    if (key.includes("cancel")) return "cancelled";
    return "planned";
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

  async function loadData({ silent = false } = {}) {
    if (state.loading) return;
    if (!await ensureClient()) return;
    state.loading = true;
    try {
      const [operations, items, allocations, fluids, tanks] = await Promise.all([
        state.client.from("operations")
          .select("id,client,vessel,status,service_order,berth,scheduled_at,created_at,product_count,responsible_id")
          .order("created_at", { ascending: false }),
        state.client.from("operation_items").select("*").order("display_order"),
        state.client.from("operation_tank_allocations")
          .select("id,operation_id,operation_item_id,direction,tank_id,quantity,unit,display_order,lot")
          .order("display_order"),
        state.client.from("fluid_types")
          .select("id,name,category,default_unit,active")
          .order("name"),
        state.client.from("tanks")
          .select("id,name,phase,kind,capacity,unit,current_product,current_lot,current_volume,status,display_order")
          .order("display_order")
      ]);
      const failed = [operations, items, allocations, fluids, tanks].find(result => result.error);
      if (failed?.error) throw failed.error;
      state.operations = operations.data || [];
      state.items = items.data || [];
      state.allocations = allocations.data || [];
      state.fluids = fluids.data || [];
      state.tanks = tanks.data || [];
      enhanceOperationsPage();
      if (state.currentOperationId && !$("#opxDrawer")?.classList.contains("hidden")) renderDrawer();
    } catch (error) {
      console.error("[Produtos da operação]", error);
      if (!silent) toast(error.message || "Falha ao carregar produtos da operação.", "error");
    } finally {
      state.loading = false;
    }
  }

  function operationIdFromContainer(container) {
    return $("[data-edit-operation]", container)?.dataset.editOperation || "";
  }

  function countLabel(count) {
    return count === 1 ? "1 produto" : `${count} produtos`;
  }

  function enhanceContainer(container) {
    const operationId = operationIdFromContainer(container);
    if (!operationId || container.dataset.opxOperation === operationId) return;
    container.dataset.opxOperation = operationId;
    const items = itemsByOperation(operationId);
    const incomplete = items.filter(item => traceMissing(item).length).length;
    const label = countLabel(items.length || 1);

    const actions = $(".operation-focus-actions,.row-actions,.planning-card-actions", container);
    if (actions && !$("[data-opx-open]", actions)) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "btn small secondary opx-open-button";
      button.dataset.opxOpen = operationId;
      button.innerHTML = `<span>Produtos</span><b>${items.length || 1}</b>`;
      actions.prepend(button);
    }

    const preferred = $(".operation-focus-service,.operation-mobile-meta,.planning-operation-meta", container);
    if (preferred && !$(".opx-count-chip", preferred)) {
      const chip = document.createElement("span");
      chip.className = `opx-count-chip${incomplete ? " warning" : ""}`;
      chip.textContent = incomplete ? `${label} • dados pendentes` : label;
      chip.title = incomplete ? `${incomplete} produto(s) com rastreabilidade pendente` : label;
      preferred.appendChild(chip);
    }
  }

  function enhanceOperationsPage() {
    const page = $("#page-operations");
    if (!page) return;
    $$(".operation-focus-card,.planning-card,.operation-mobile-card,.operations-table-card tbody tr", page)
      .forEach(enhanceContainer);
  }

  function scheduleEnhance() {
    clearTimeout(state.enhanceTimer);
    state.enhanceTimer = setTimeout(() => enhanceOperationsPage(), 40);
  }

  function toast(message, tone = "success") {
    const container = $("#toastContainer") || document.body;
    const element = document.createElement("div");
    element.className = `toast opx-toast ${tone}`;
    element.textContent = message;
    container.appendChild(element);
    setTimeout(() => element.remove(), 3800);
  }

  function ensureDrawer() {
    let drawer = $("#opxDrawer");
    if (drawer) return drawer;
    const backdrop = document.createElement("button");
    backdrop.id = "opxBackdrop";
    backdrop.className = "opx-backdrop hidden";
    backdrop.type = "button";
    backdrop.dataset.opxClose = "true";
    backdrop.setAttribute("aria-label", "Fechar produtos da operação");

    drawer = document.createElement("aside");
    drawer.id = "opxDrawer";
    drawer.className = "opx-drawer hidden";
    drawer.setAttribute("aria-hidden", "true");
    drawer.innerHTML = `<header class="opx-drawer-head"><div data-opx-drawer-title></div><button type="button" class="icon-btn" data-opx-close="true" aria-label="Fechar">×</button></header><div class="opx-drawer-body" data-opx-drawer-body></div>`;
    document.body.append(backdrop, drawer);
    return drawer;
  }

  async function openDrawer(operationId) {
    state.currentOperationId = operationId;
    ensureDrawer();
    $("#opxBackdrop")?.classList.remove("hidden");
    $("#opxDrawer")?.classList.remove("hidden");
    $("#opxDrawer")?.setAttribute("aria-hidden", "false");
    document.body.classList.add("opx-drawer-open");
    renderDrawer(true);
    await loadData({ silent: true });
  }

  function closeDrawer() {
    $("#opxBackdrop")?.classList.add("hidden");
    $("#opxDrawer")?.classList.add("hidden");
    $("#opxDrawer")?.setAttribute("aria-hidden", "true");
    document.body.classList.remove("opx-drawer-open");
    state.currentOperationId = "";
  }

  function allocationChips(item) {
    const allocations = allocationsByItem(item.id);
    if (!allocations.length) return `<span class="opx-allocation-empty">Sem rateio de tancagem</span>`;
    return allocations.map(row => {
      const tank = tankById(row.tank_id);
      const direction = row.direction === "destination" ? "Destino" : "Origem";
      return `<span class="opx-allocation-chip"><b>${direction}</b>${esc(tank?.name || "Equipamento")} • ${fmt.format(Number(row.quantity || 0))} ${esc(row.unit || item.unit)}${row.lot ? ` • lote ${esc(row.lot)}` : ""}</span>`;
    }).join("");
  }

  function productCard(item, index, total) {
    const planned = Number(item.planned_quantity || 0);
    const executed = Number(item.executed_quantity || 0);
    const progress = planned > 0 ? Math.max(0, Math.min(100, executed / planned * 100)) : 0;
    const missing = traceMissing(item);
    const canApply = canEdit() && item.apply_tank_movement && item.status === "Concluída" && !item.tank_movement_applied;
    const canDelete = canEdit() && total > 1 && !item.tank_movement_applied;
    return `<article class="opx-product-card${missing.length ? " trace-warning" : ""}">
      <header><span class="opx-product-index">${index + 1}</span><div><small>${esc(item.activity || "Atividade")}</small><h3>${esc(item.product || "Produto")}</h3></div><span class="opx-status ${statusTone(item.status)}">${esc(item.status || "Programada")}</span></header>
      <div class="opx-trace-grid">
        <span><small>Ticket</small><strong>${esc(item.ticket_number || "Pendente")}</strong></span>
        <span><small>RT</small><strong>${esc(item.rt_number || "Pendente")}</strong></span>
        <span><small>Lote</small><strong>${esc(item.lot || "Pendente")}</strong></span>
        <span><small>Sonda</small><strong>${esc(item.rig || "Pendente")}</strong></span>
        ${item.well ? `<span><small>Poço</small><strong>${esc(item.well)}</strong></span>` : ""}
      </div>
      ${missing.length ? `<div class="opx-trace-alert">Completar: ${esc(missing.join(", "))}</div>` : ""}
      <div class="opx-progress-row"><div><strong>${fmt.format(executed)} / ${fmt.format(planned)} ${esc(item.unit)}</strong><span>${fmt.format(progress)}%</span></div><div class="progress"><span style="width:${progress}%"></span></div></div>
      <div class="opx-metrics"><span>Início<strong>${dateTime(item.start_at)}</strong></span><span>Término<strong>${dateTime(item.end_at)}</strong></span><span>Vazão<strong>${item.flow_rate ? `${fmt.format(Number(item.flow_rate))} ${esc(item.flow_rate_unit || `${item.unit}/h`)}` : "-"}</strong></span><span>Paradas<strong>${Number(item.paused_minutes || 0)} min</strong></span></div>
      <div class="opx-allocation-list">${allocationChips(item)}</div>
      ${item.occurrence ? `<div class="opx-occurrence"><strong>Ocorrência</strong><span>${esc(item.occurrence)}</span></div>` : ""}
      <footer><span>${item.tank_movement_applied ? "✓ Estoque aplicado" : item.apply_tank_movement ? "Movimentação preparada" : "Movimentação manual"}</span><div class="opx-card-actions">${canApply ? `<button type="button" class="btn small soft" data-opx-apply="${item.id}">Aplicar estoque</button>` : ""}${canEdit() ? `<button type="button" class="btn small primary" data-opx-edit="${item.id}">Editar</button>` : ""}${canDelete ? `<button type="button" class="btn small danger outline" data-opx-delete="${item.id}">Excluir</button>` : ""}</div></footer>
    </article>`;
  }

  function renderDrawer(loading = false) {
    const drawer = ensureDrawer();
    const operation = operationById(state.currentOperationId);
    const body = $("[data-opx-drawer-body]", drawer);
    const title = $("[data-opx-drawer-title]", drawer);
    if (!operation) {
      title.innerHTML = `<small>PRODUTOS DA OPERAÇÃO</small><h2>Carregando...</h2>`;
      body.innerHTML = loading ? `<div class="opx-loading">Carregando produtos...</div>` : `<div class="opx-empty">Operação não localizada.</div>`;
      return;
    }
    const items = itemsByOperation(operation.id);
    const completed = items.filter(item => ["Concluída", "Cancelada"].includes(item.status)).length;
    title.innerHTML = `<small>${esc(operation.client || "Cliente")}</small><h2>${esc(operation.vessel || "Embarcação")}</h2><p>${completed}/${items.length} produtos concluídos</p>`;
    body.innerHTML = `<section class="opx-drawer-summary"><span>Produtos<strong>${items.length}</strong></span><span>Status geral<strong>${esc(operation.status || "Programada")}</strong></span><span>OS<strong>${esc(operation.service_order || "-")}</strong></span></section>
      <div class="opx-drawer-actions">${canEdit() ? `<button type="button" class="btn primary" data-opx-new="${operation.id}">+ Adicionar produto</button>` : ""}<button type="button" class="btn secondary" data-opx-reload>Atualizar</button></div>
      <section class="opx-product-list">${items.map((item, index) => productCard(item, index, items.length)).join("") || `<div class="opx-empty"><strong>Nenhum produto vinculado</strong><p>Cadastre o primeiro produto desta embarcação.</p></div>`}</section>`;
  }

  function fluidOptions(selected = "") {
    return state.fluids
      .filter(item => item.active !== false || item.id === selected)
      .map(item => `<option value="${item.id}" data-unit="${esc(item.default_unit || "bbl")}" ${item.id === selected ? "selected" : ""}>${esc(item.name)} • ${esc(item.default_unit || "bbl")}</option>`)
      .join("");
  }

  function tankOptions(selected = "", unit = "") {
    return state.tanks
      .filter(tank => !unit || normalize(tank.unit) === normalize(unit) || tank.id === selected)
      .map(tank => `<option value="${tank.id}" ${tank.id === selected ? "selected" : ""}>${esc(tank.name)} • ${esc(tank.phase || "")} • ${fmt.format(Number(tank.current_volume || 0))}/${fmt.format(Number(tank.capacity || 0))} ${esc(tank.unit)}</option>`)
      .join("");
  }

  function allocationRow(allocation = {}, unit = "bbl", locked = false) {
    return `<div class="opx-allocation-row" data-opx-allocation-row>
      <select data-opx-allocation="direction" ${locked ? "disabled" : ""}><option value="source" ${allocation.direction !== "destination" ? "selected" : ""}>Origem</option><option value="destination" ${allocation.direction === "destination" ? "selected" : ""}>Destino</option></select>
      <select data-opx-allocation="tank_id" ${locked ? "disabled" : ""}><option value="">Tanque ou silo</option>${tankOptions(allocation.tank_id || "", unit)}</select>
      <input data-opx-allocation="lot" value="${esc(allocation.lot || "")}" placeholder="Lote do equipamento" ${locked ? "readonly" : ""}>
      <input data-opx-allocation="quantity" inputmode="decimal" value="${allocation.quantity ?? ""}" placeholder="Quantidade" ${locked ? "readonly" : ""}>
      ${locked ? "" : `<button type="button" class="btn small danger outline" data-opx-remove-allocation>×</button>`}
    </div>`;
  }

  function renderProductForm(item = null) {
    const drawer = ensureDrawer();
    const operation = operationById(state.currentOperationId);
    if (!operation) return;
    const body = $("[data-opx-drawer-body]", drawer);
    const locked = Boolean(item?.tank_movement_applied);
    const unit = item?.unit || state.fluids.find(fluid => fluid.id === item?.fluid_type_id)?.default_unit || "bbl";
    const allocations = item ? allocationsByItem(item.id) : [];
    body.innerHTML = `<form class="opx-product-form" data-opx-product-form data-item-id="${item?.id || ""}" data-operation-id="${operation.id}" data-locked="${locked}">
      <div class="opx-form-head"><button type="button" class="btn small secondary" data-opx-back>← Voltar</button><div><small>${item ? "EDITAR PRODUTO" : "NOVO PRODUTO"}</small><h3>${esc(item?.product || "Produto da embarcação")}</h3></div></div>
      ${locked ? `<div class="opx-lock-notice"><strong>Estoque já aplicado.</strong><span>Produto, quantidades e rateio estão bloqueados. Você ainda pode completar ticket, RT, lote, sonda, poço e observações.</span></div>` : ""}
      <div class="opx-form-grid">
        <label class="wide"><span>Produto *</span><select data-opx-field="fluid_type_id" required ${locked ? "disabled" : ""}><option value="">Selecione</option>${fluidOptions(item?.fluid_type_id || "")}</select></label>
        <label><span>Atividade *</span><select data-opx-field="activity" ${locked ? "disabled" : ""}>${["Bombeio","Backload","Fabricação","Tratamento","Carregamento","Descarga","Recebimento","Transferência"].map(value => `<option ${item?.activity === value ? "selected" : ""}>${value}</option>`).join("")}</select></label>
        <label><span>Unidade</span><input data-opx-field="unit" value="${esc(unit)}" readonly></label>
        <label><span>Ticket *</span><input data-opx-field="ticket_number" value="${esc(item?.ticket_number || "")}" required></label>
        <label><span>RT *</span><input data-opx-field="rt_number" value="${esc(item?.rt_number || "")}" required></label>
        <label><span>Lote *</span><input data-opx-field="lot" value="${esc(item?.lot || "")}" required></label>
        <label><span>Sonda *</span><input data-opx-field="rig" value="${esc(item?.rig || "")}" required></label>
        <label><span>Poço</span><input data-opx-field="well" value="${esc(item?.well || "")}"></label>
        <label><span>Planejado</span><input data-opx-field="planned_quantity" inputmode="decimal" value="${item?.planned_quantity ?? 0}" ${locked ? "readonly" : ""}></label>
        <label><span>Executado</span><input data-opx-field="executed_quantity" inputmode="decimal" value="${item?.executed_quantity ?? 0}" ${locked ? "readonly" : ""}></label>
        <label><span>Status</span><select data-opx-field="status" ${locked ? "disabled" : ""}>${["Programada","Em andamento","Paralisada","Concluída","Cancelada"].map(value => `<option ${item?.status === value ? "selected" : ""}>${value}</option>`).join("")}</select></label>
        <label><span>Início</span><input type="datetime-local" data-opx-field="start_at" value="${inputDateTime(item?.start_at)}" ${locked ? "readonly" : ""}></label>
        <label><span>Término</span><input type="datetime-local" data-opx-field="end_at" value="${inputDateTime(item?.end_at)}" ${locked ? "readonly" : ""}></label>
        <label><span>Vazão</span><input data-opx-field="flow_rate" inputmode="decimal" value="${item?.flow_rate ?? ""}" ${locked ? "readonly" : ""}></label>
        <label><span>Unidade da vazão</span><input data-opx-field="flow_rate_unit" value="${esc(item?.flow_rate_unit || `${unit}/h`)}" ${locked ? "readonly" : ""}></label>
        <label><span>Paradas (min)</span><input type="number" min="0" data-opx-field="paused_minutes" value="${item?.paused_minutes ?? 0}" ${locked ? "readonly" : ""}></label>
        <label class="wide"><span>Ocorrência</span><textarea data-opx-field="occurrence">${esc(item?.occurrence || "")}</textarea></label>
        <label class="wide"><span>Observações</span><textarea data-opx-field="notes">${esc(item?.notes || "")}</textarea></label>
        <label class="wide opx-check"><input type="checkbox" data-opx-field="apply_tank_movement" ${item?.apply_tank_movement ? "checked" : ""} ${locked ? "disabled" : ""}><span>Aplicar movimentação nos tanques/silos após a conclusão</span></label>
      </div>
      <section class="opx-allocation-form"><header><div><strong>Rateio por tanque ou silo</strong><span>Cada produto mantém seu próprio lote e quantidade.</span></div>${locked ? "" : `<button type="button" class="btn small secondary" data-opx-add-allocation>Adicionar rateio</button>`}</header><div data-opx-allocation-list>${allocations.map(row => allocationRow(row, unit, locked)).join("")}</div><div class="opx-allocation-total" data-opx-allocation-total></div></section>
      <footer><button type="button" class="btn secondary" data-opx-back>Cancelar</button><button type="submit" class="btn primary" data-opx-save>Salvar produto</button></footer>
    </form>`;
    updateAllocationTotal(body);
  }

  function fieldValue(form, name) {
    const field = $(`[data-opx-field="${name}"]`, form);
    if (!field) return "";
    if (field.type === "checkbox") return field.checked;
    return clean(field.value);
  }

  function collectProductForm(form) {
    const productSelect = $("[data-opx-field='fluid_type_id']", form);
    const locked = form.dataset.locked === "true";
    const item = state.items.find(row => row.id === form.dataset.itemId) || null;
    const payload = {
      fluid_type_id: productSelect?.value || item?.fluid_type_id || "",
      activity: fieldValue(form, "activity") || item?.activity || "Bombeio",
      ticket_number: fieldValue(form, "ticket_number"),
      rt_number: fieldValue(form, "rt_number"),
      lot: fieldValue(form, "lot"),
      rig: fieldValue(form, "rig"),
      well: fieldValue(form, "well"),
      planned_quantity: locked ? Number(item?.planned_quantity || 0) : number(fieldValue(form, "planned_quantity")),
      executed_quantity: locked ? Number(item?.executed_quantity || 0) : number(fieldValue(form, "executed_quantity")),
      status: fieldValue(form, "status") || item?.status || "Programada",
      start_at: locked ? item?.start_at || "" : toIso(fieldValue(form, "start_at")),
      end_at: locked ? item?.end_at || "" : toIso(fieldValue(form, "end_at")),
      flow_rate: locked ? item?.flow_rate ?? "" : (fieldValue(form, "flow_rate") ? number(fieldValue(form, "flow_rate")) : ""),
      flow_rate_unit: fieldValue(form, "flow_rate_unit") || item?.flow_rate_unit || "",
      paused_minutes: locked ? Number(item?.paused_minutes || 0) : Math.max(0, number(fieldValue(form, "paused_minutes"))),
      occurrence: fieldValue(form, "occurrence"),
      notes: fieldValue(form, "notes"),
      apply_tank_movement: locked ? Boolean(item?.apply_tank_movement) : Boolean(fieldValue(form, "apply_tank_movement"))
    };
    if (!payload.fluid_type_id || !payload.ticket_number || !payload.rt_number || !payload.lot || !payload.rig) {
      throw new Error("Informe produto, ticket, RT, lote e sonda.");
    }
    if (payload.status === "Concluída" && !payload.end_at) throw new Error("Informe o horário de término do produto concluído.");

    const allocations = locked ? allocationsByItem(item?.id) : $$("[data-opx-allocation-row]", form).map(row => {
      const value = name => clean($(`[data-opx-allocation="${name}"]`, row)?.value || "");
      return { direction: value("direction") || "source", tank_id: value("tank_id"), lot: value("lot"), quantity: number(value("quantity")) };
    }).filter(row => row.tank_id || row.quantity);

    if (!locked && allocations.some(row => !row.tank_id || row.quantity <= 0)) throw new Error("Confira o tanque e a quantidade de cada rateio.");
    if (!locked && payload.apply_tank_movement && payload.status === "Concluída") {
      const total = allocations.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
      if (!allocations.length) throw new Error("Adicione o rateio antes de concluir o produto.");
      if (Math.abs(total - payload.executed_quantity) > 0.001) throw new Error(`O rateio (${fmt.format(total)}) deve ser igual ao executado (${fmt.format(payload.executed_quantity)}).`);
    }
    return { payload, allocations };
  }

  async function saveProduct(form) {
    const button = $("[data-opx-save]", form);
    try {
      const { payload, allocations } = collectProductForm(form);
      button.disabled = true;
      button.textContent = "Salvando...";
      const { error } = await state.client.rpc("save_operation_product", {
        p_item_id: form.dataset.itemId || null,
        p_operation_id: form.dataset.operationId,
        p_payload: payload,
        p_allocations: allocations
      });
      if (error) throw error;
      toast("Produto salvo com sucesso.");
      await loadData({ silent: true });
      renderDrawer();
      refreshMainApp();
    } catch (error) {
      console.error(error);
      toast(error.message || "Falha ao salvar produto.", "error");
    } finally {
      button.disabled = false;
      button.textContent = "Salvar produto";
    }
  }

  async function deleteProduct(itemId) {
    const item = state.items.find(row => row.id === itemId);
    if (!item || !window.confirm(`Excluir o produto ${item.product}?`)) return;
    try {
      const { error } = await state.client.rpc("delete_operation_product", { p_item_id: itemId });
      if (error) throw error;
      toast("Produto excluído.");
      await loadData({ silent: true });
      renderDrawer();
      refreshMainApp();
    } catch (error) {
      toast(error.message || "Falha ao excluir produto.", "error");
    }
  }

  async function applyMovement(itemId) {
    if (!window.confirm("Aplicar a movimentação deste produto nos tanques/silos? Esta ação altera o estoque.")) return;
    try {
      const { error } = await state.client.rpc("apply_operation_item_movement", { p_item_id: itemId });
      if (error) throw error;
      toast("Movimentação aplicada ao estoque.");
      await loadData({ silent: true });
      renderDrawer();
      refreshMainApp();
    } catch (error) {
      toast(error.message || "Falha ao aplicar movimentação.", "error");
    }
  }

  function refreshMainApp() {
    const refresh = $$('[data-action="refresh"]').find(button => button.offsetParent !== null);
    if (refresh) refresh.click();
    setTimeout(() => {
      loadData({ silent: true });
      scheduleEnhance();
    }, 700);
  }

  function updateAllocationTotal(root = document) {
    const form = root.closest?.("[data-opx-product-form]") || $("[data-opx-product-form]", root) || root;
    const target = $("[data-opx-allocation-total]", form);
    if (!target) return;
    const unit = fieldValue(form, "unit") || "";
    const total = $$("[data-opx-allocation='quantity']", form).reduce((sum, input) => sum + number(input.value), 0);
    target.textContent = `Total rateado: ${fmt.format(total)} ${unit}`;
  }

  function bindEvents() {
    if (state.bound) return;
    state.bound = true;
    document.addEventListener("click", event => {
      const open = event.target.closest("[data-opx-open]");
      if (open) return openDrawer(open.dataset.opxOpen);
      if (event.target.closest("[data-opx-close]")) return closeDrawer();
      if (event.target.closest("[data-opx-reload]")) return loadData();
      if (event.target.closest("[data-opx-back]")) return renderDrawer();

      const add = event.target.closest("[data-opx-new]");
      if (add) return renderProductForm();
      const edit = event.target.closest("[data-opx-edit]");
      if (edit) return renderProductForm(state.items.find(item => item.id === edit.dataset.opxEdit));
      const remove = event.target.closest("[data-opx-delete]");
      if (remove) return deleteProduct(remove.dataset.opxDelete);
      const apply = event.target.closest("[data-opx-apply]");
      if (apply) return applyMovement(apply.dataset.opxApply);

      const addAllocation = event.target.closest("[data-opx-add-allocation]");
      if (addAllocation) {
        const form = addAllocation.closest("[data-opx-product-form]");
        const unit = fieldValue(form, "unit") || "bbl";
        $("[data-opx-allocation-list]", form).insertAdjacentHTML("beforeend", allocationRow({}, unit, false));
        updateAllocationTotal(form);
        return;
      }
      const removeAllocation = event.target.closest("[data-opx-remove-allocation]");
      if (removeAllocation) {
        const form = removeAllocation.closest("[data-opx-product-form]");
        removeAllocation.closest("[data-opx-allocation-row]")?.remove();
        updateAllocationTotal(form);
      }
    });

    document.addEventListener("change", event => {
      if (event.target.matches('[data-opx-field="fluid_type_id"]')) {
        const form = event.target.closest("[data-opx-product-form]");
        const option = event.target.selectedOptions[0];
        const unit = option?.dataset.unit || "bbl";
        $("[data-opx-field='unit']", form).value = unit;
        const flowUnit = $("[data-opx-field='flow_rate_unit']", form);
        if (flowUnit && (!flowUnit.value || /^(bbl|ton)\/h$/i.test(flowUnit.value))) flowUnit.value = `${unit}/h`;
        $$('[data-opx-allocation="tank_id"]', form).forEach(select => {
          const selected = select.value;
          select.innerHTML = `<option value="">Tanque ou silo</option>${tankOptions(selected, unit)}`;
        });
        updateAllocationTotal(form);
      }
      if (event.target.matches('[data-opx-allocation="quantity"]')) updateAllocationTotal(event.target.closest("[data-opx-product-form]"));
    });

    document.addEventListener("input", event => {
      if (event.target.matches('[data-opx-allocation="quantity"]')) updateAllocationTotal(event.target.closest("[data-opx-product-form]"));
    });

    document.addEventListener("submit", event => {
      if (!event.target.matches("[data-opx-product-form]")) return;
      event.preventDefault();
      saveProduct(event.target);
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && !$("#opxDrawer")?.classList.contains("hidden")) closeDrawer();
    });
  }

  function subscribeRealtime() {
    if (!state.client || state.realtime) return;
    state.realtime = state.client.channel("opscontrol-operation-products-extension")
      .on("postgres_changes", { event: "*", schema: "public", table: "operation_items" }, () => loadData({ silent: true }))
      .on("postgres_changes", { event: "*", schema: "public", table: "operation_tank_allocations" }, () => loadData({ silent: true }))
      .on("postgres_changes", { event: "*", schema: "public", table: "operations" }, () => loadData({ silent: true }))
      .subscribe();
  }

  async function start() {
    bindEvents();
    const page = $("#page-operations");
    if (page && !state.observer) {
      state.observer = new MutationObserver(scheduleEnhance);
      state.observer.observe(page, { childList: true, subtree: true });
    }
    await loadData({ silent: true });
    subscribeRealtime();
    [500, 1400, 3000].forEach(delay => setTimeout(() => loadData({ silent: true }), delay));
    document.addEventListener("opscontrol:interface-ready", () => loadData({ silent: true }));
    document.documentElement.dataset.operationProductsExtension = VERSION;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();