(() => {
  "use strict";

  const VERSION = "20260722-multi-product-operations-1";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const fmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
  const allowedRoles = ["admin", "supervisor", "lider", "operador"];
  const state = {
    client: null,
    loading: false,
    operations: [],
    items: [],
    allocations: [],
    fluids: [],
    tanks: [],
    profiles: [],
    search: "",
    status: "",
    bound: false
  };

  function normalize(value = "") {
    return String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function esc(value = "") {
    return String(value).replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[character]));
  }

  function number(value) {
    const raw = String(value ?? "").trim();
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

  function role() {
    return normalize($("#userRole")?.textContent || "");
  }

  function canEdit() {
    const current = role();
    return allowedRoles.some(item => current.includes(item));
  }

  function config() {
    const root = window.OPSCONTROL_CONFIG || {};
    const environment = root.environments?.[root.defaultEnvironment || "production"] || {};
    return {
      url: environment.supabaseUrl || root.supabaseUrl || "",
      key: environment.supabaseKey || root.supabaseKey || ""
    };
  }

  function ensureClient() {
    if (state.client) return state.client;
    const current = config();
    if (!window.supabase?.createClient || !current.url || !current.key) return null;
    state.client = window.supabase.createClient(current.url, current.key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    return state.client;
  }

  function toast(message, tone = "success") {
    const container = $("#toastContainer") || document.body;
    const element = document.createElement("div");
    element.className = `toast multi-operation-toast ${tone}`;
    element.textContent = message;
    container.appendChild(element);
    setTimeout(() => element.remove(), 3600);
  }

  function statusClass(status = "") {
    const value = normalize(status);
    if (value.includes("conclu")) return "done";
    if (value.includes("paralis")) return "paused";
    if (value.includes("andamento")) return "active";
    if (value.includes("cancel")) return "cancelled";
    return "planned";
  }

  function operationItems(operationId) {
    return state.items
      .filter(item => item.operation_id === operationId)
      .sort((a, b) => Number(a.display_order || 0) - Number(b.display_order || 0));
  }

  function itemAllocations(itemId) {
    return state.allocations
      .filter(item => item.operation_item_id === itemId)
      .sort((a, b) => Number(a.display_order || 0) - Number(b.display_order || 0));
  }

  function profileName(id) {
    return state.profiles.find(profile => profile.id === id)?.full_name || "Não informado";
  }

  function tankName(id) {
    return state.tanks.find(tank => tank.id === id)?.name || "Equipamento";
  }

  async function loadData() {
    const client = ensureClient();
    const page = $("#page-operations");
    if (!client || !page || state.loading) return;
    state.loading = true;
    page.dataset.multiProductState = "loading";

    try {
      const session = await client.auth.getSession();
      if (!session.data.session) return;

      const [operations, items, allocations, fluids, tanks, profiles] = await Promise.all([
        client.from("operations").select("id,client,vessel,service_order,status,responsible_id,notes,vessel_registry_id,berth,scheduled_at,product_count,created_at,updated_at").order("scheduled_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }),
        client.from("operation_items").select("*").order("display_order"),
        client.from("operation_tank_allocations").select("id,operation_id,operation_item_id,direction,tank_id,quantity,unit,display_order,lot").order("display_order"),
        client.from("fluid_types").select("id,name,category,default_unit,active").order("name"),
        client.from("tanks").select("id,name,phase,kind,capacity,unit,current_product,current_lot,current_volume,status,current_fluid_type_id,client,display_order").order("display_order"),
        client.from("profiles").select("id,full_name,role,department,active").eq("active", true).order("full_name")
      ]);

      for (const result of [operations, items, allocations, fluids, tanks]) {
        if (result.error) throw result.error;
      }

      state.operations = operations.data || [];
      state.items = items.data || [];
      state.allocations = allocations.data || [];
      state.fluids = fluids.data || [];
      state.tanks = tanks.data || [];
      state.profiles = profiles.error ? [] : (profiles.data || []);
      render();
    } catch (error) {
      console.error("[Operações multiproduto]", error);
      renderError(error.message || "Falha ao carregar operações.");
    } finally {
      state.loading = false;
      page.dataset.multiProductState = "ready";
    }
  }

  function totalByUnit(items, field) {
    const totals = new Map();
    items.forEach(item => {
      const unit = item.unit || "-";
      totals.set(unit, (totals.get(unit) || 0) + Number(item[field] || 0));
    });
    return [...totals.entries()].map(([unit, value]) => `${fmt.format(value)} ${unit}`).join(" • ") || "0";
  }

  function traceability(item) {
    const missing = [];
    if (!item.ticket_number) missing.push("Ticket");
    if (!item.rt_number) missing.push("RT");
    if (!item.lot) missing.push("Lote");
    if (!item.rig) missing.push("Sonda");
    return missing;
  }

  function allocationHtml(item) {
    const rows = itemAllocations(item.id);
    if (!rows.length) return `<span class="multi-allocation-empty">Sem rateio cadastrado</span>`;
    return rows.map(row => `<span class="multi-allocation-chip ${esc(row.direction)}"><b>${row.direction === "destination" ? "Destino" : "Origem"}</b>${esc(tankName(row.tank_id))} • ${fmt.format(Number(row.quantity || 0))} ${esc(row.unit || item.unit)}${row.lot ? ` • lote ${esc(row.lot)}` : ""}</span>`).join("");
  }

  function itemHtml(item, index) {
    const planned = Number(item.planned_quantity || 0);
    const executed = Number(item.executed_quantity || 0);
    const progress = planned > 0 ? Math.max(0, Math.min(100, executed / planned * 100)) : 0;
    const missing = traceability(item);
    const canApply = canEdit() && item.apply_tank_movement && item.status === "Concluída" && !item.tank_movement_applied;
    return `<article class="multi-product-row ${missing.length ? "trace-missing" : ""}">
      <header>
        <div class="multi-product-index">${index + 1}</div>
        <div class="multi-product-title"><small>${esc(item.activity || "Atividade")}</small><h3>${esc(item.product || "Produto não informado")}</h3></div>
        <span class="multi-status ${statusClass(item.status)}">${esc(item.status || "Programada")}</span>
      </header>
      <div class="multi-product-trace-grid">
        <span><small>Ticket</small><strong>${esc(item.ticket_number || "Pendente")}</strong></span>
        <span><small>RT</small><strong>${esc(item.rt_number || "Pendente")}</strong></span>
        <span><small>Lote</small><strong>${esc(item.lot || "Pendente")}</strong></span>
        <span><small>Sonda</small><strong>${esc(item.rig || "Pendente")}</strong></span>
        ${item.well ? `<span><small>Poço</small><strong>${esc(item.well)}</strong></span>` : ""}
      </div>
      ${missing.length ? `<div class="multi-trace-warning">Rastreabilidade incompleta: ${esc(missing.join(", "))}</div>` : ""}
      <div class="multi-product-volume">
        <div><strong>${fmt.format(executed)} / ${fmt.format(planned)} ${esc(item.unit)}</strong><span>${fmt.format(progress)}% executado</span></div>
        <div class="multi-progress"><span style="width:${progress}%"></span></div>
      </div>
      <div class="multi-product-metrics">
        <span><small>Início</small><strong>${dateTime(item.start_at)}</strong></span>
        <span><small>Término</small><strong>${dateTime(item.end_at)}</strong></span>
        <span><small>Vazão</small><strong>${item.flow_rate ? `${fmt.format(Number(item.flow_rate))} ${esc(item.flow_rate_unit || `${item.unit}/h`)}` : "-"}</strong></span>
        <span><small>Paradas</small><strong>${Number(item.paused_minutes || 0)} min</strong></span>
      </div>
      <div class="multi-allocation-list">${allocationHtml(item)}</div>
      ${item.occurrence ? `<div class="multi-occurrence"><strong>Ocorrência</strong><span>${esc(item.occurrence)}</span></div>` : ""}
      <footer>
        <span class="multi-stock-state">${item.tank_movement_applied ? "✓ Movimentação aplicada" : item.apply_tank_movement ? "Movimentação pendente" : "Sem movimentação automática"}</span>
        ${canApply ? `<button class="btn small primary" data-apply-operation-item="${item.id}">Aplicar movimentação</button>` : ""}
      </footer>
    </article>`;
  }

  function operationHtml(operation) {
    const items = operationItems(operation.id);
    const completed = items.filter(item => ["Concluída", "Cancelada"].includes(item.status)).length;
    const locked = items.some(item => item.tank_movement_applied);
    return `<article class="multi-operation-card" data-operation-search="${esc(normalize(`${operation.vessel} ${operation.client} ${operation.berth || ""} ${items.map(item => `${item.product} ${item.ticket_number || ""} ${item.rt_number || ""} ${item.rig || ""}`).join(" ")}`))}" data-operation-status="${esc(normalize(operation.status))}">
      <header class="multi-operation-head">
        <div>
          <small>${esc(operation.client || "Cliente não informado")}</small>
          <h2>${esc(operation.vessel || "Embarcação")}</h2>
          <p>${operation.berth ? `Berço ${esc(operation.berth)} • ` : ""}${dateTime(operation.scheduled_at || operation.created_at)}${operation.service_order ? ` • OS ${esc(operation.service_order)}` : ""}</p>
        </div>
        <div class="multi-operation-head-status">
          <span class="multi-status ${statusClass(operation.status)}">${esc(operation.status || "Programada")}</span>
          <strong>${completed}/${items.length}</strong><small>produtos concluídos</small>
        </div>
      </header>
      <section class="multi-operation-summary">
        <span><small>Produtos</small><strong>${items.length}</strong></span>
        <span><small>Planejado</small><strong>${esc(totalByUnit(items, "planned_quantity"))}</strong></span>
        <span><small>Executado</small><strong>${esc(totalByUnit(items, "executed_quantity"))}</strong></span>
        <span><small>Responsável</small><strong>${esc(profileName(operation.responsible_id))}</strong></span>
      </section>
      <section class="multi-product-list">${items.map(itemHtml).join("") || `<div class="multi-empty">Nenhum produto vinculado.</div>`}</section>
      <footer class="multi-operation-footer">
        <span>${locked ? "A edição estrutural foi bloqueada após movimentação de estoque." : `${items.length} item(ns) operacional(is)`}</span>
        ${canEdit() && !locked ? `<button class="btn secondary" data-edit-multi-operation="${operation.id}">Editar / adicionar produto</button>` : ""}
      </footer>
    </article>`;
  }

  function filteredOperations() {
    return state.operations.filter(operation => {
      const items = operationItems(operation.id);
      const haystack = normalize(`${operation.vessel} ${operation.client} ${operation.berth || ""} ${items.map(item => `${item.product} ${item.ticket_number || ""} ${item.rt_number || ""} ${item.rig || ""}`).join(" ")}`);
      const searchOk = !state.search || haystack.includes(normalize(state.search));
      const statusOk = !state.status || normalize(operation.status) === normalize(state.status);
      return searchOk && statusOk;
    });
  }

  function render() {
    const page = $("#page-operations");
    if (!page) return;
    const visible = filteredOperations();
    const allItems = state.items;
    const active = state.operations.filter(operation => operation.status === "Em andamento").length;
    const incomplete = allItems.filter(item => traceability(item).length).length;

    page.innerHTML = `<section class="multi-operations-workspace" data-version="${VERSION}">
      <header class="page-header multi-operations-header">
        <div><span class="multi-eyebrow">OPERAÇÕES POR EMBARCAÇÃO</span><h1>Operações multiproduto</h1><p>Uma embarcação pode transportar vários produtos, cada um com ticket, RT, lote, sonda, horário, vazão e rateio próprios.</p></div>
        <div class="actions">${canEdit() ? `<button class="btn primary" data-new-multi-operation>Nova operação</button>` : ""}</div>
      </header>
      <section class="multi-operations-kpis">
        <article><span>Embarcações</span><strong>${state.operations.length}</strong><small>registros operacionais</small></article>
        <article><span>Produtos</span><strong>${allItems.length}</strong><small>itens rastreáveis</small></article>
        <article><span>Em andamento</span><strong>${active}</strong><small>embarcações ativas</small></article>
        <article class="${incomplete ? "attention" : ""}"><span>Rastreabilidade</span><strong>${incomplete}</strong><small>itens antigos pendentes</small></article>
      </section>
      <section class="multi-operations-filters">
        <label><span>Buscar</span><input type="search" data-multi-operation-search value="${esc(state.search)}" placeholder="Embarcação, produto, ticket, RT ou sonda"></label>
        <label><span>Status geral</span><select data-multi-operation-status><option value="">Todos</option>${["Programada", "Em andamento", "Paralisada", "Concluída", "Cancelada"].map(status => `<option ${state.status === status ? "selected" : ""}>${status}</option>`).join("")}</select></label>
        <button class="btn secondary" data-refresh-multi-operations>Atualizar</button>
      </section>
      <div class="multi-operations-result">${visible.length} embarcação(ões) exibida(s)</div>
      <section class="multi-operations-list">${visible.map(operationHtml).join("") || `<div class="multi-empty-state"><strong>Nenhuma operação encontrada</strong><p>Altere os filtros ou cadastre uma nova embarcação.</p></div>`}</section>
    </section>`;
  }

  function renderError(message) {
    const page = $("#page-operations");
    if (!page) return;
    page.innerHTML = `<section class="multi-operations-workspace"><header class="page-header"><div><h1>Operações multiproduto</h1><p>Não foi possível carregar os dados.</p></div></header><div class="card module-error-card"><strong>Falha ao carregar Operações</strong><p>${esc(message)}</p><button class="btn primary" data-refresh-multi-operations>Tentar novamente</button></div></section>`;
  }

  function fluidOptions(selected = "") {
    return state.fluids.filter(item => item.active !== false || item.id === selected).map(item => `<option value="${item.id}" data-name="${esc(item.name)}" data-unit="${esc(item.default_unit || "bbl")}" ${item.id === selected ? "selected" : ""}>${esc(item.name)} • ${esc(item.default_unit || "bbl")}</option>`).join("");
  }

  function tankOptions(selected = "", unit = "") {
    return state.tanks
      .filter(tank => !unit || tank.unit === unit || tank.id === selected)
      .map(tank => `<option value="${tank.id}" ${tank.id === selected ? "selected" : ""}>${esc(tank.name)} • ${esc(tank.phase)} • ${fmt.format(Number(tank.current_volume || 0))}/${fmt.format(Number(tank.capacity || 0))} ${esc(tank.unit)}</option>`)
      .join("");
  }

  function allocationFormRow(allocation = {}, unit = "bbl") {
    return `<div class="multi-allocation-form-row" data-allocation-row>
      <select data-allocation-field="direction"><option value="source" ${allocation.direction !== "destination" ? "selected" : ""}>Origem</option><option value="destination" ${allocation.direction === "destination" ? "selected" : ""}>Destino</option></select>
      <select data-allocation-field="tank_id" required><option value="">Tanque ou silo</option>${tankOptions(allocation.tank_id || "", unit)}</select>
      <input data-allocation-field="lot" value="${esc(allocation.lot || "")}" placeholder="Lote deste tanque">
      <input data-allocation-field="quantity" inputmode="decimal" value="${allocation.quantity ?? ""}" placeholder="Quantidade">
      <button type="button" class="btn small danger outline" data-remove-allocation>Remover</button>
    </div>`;
  }

  function itemForm(item = {}, index = 0) {
    const allocations = item.id ? itemAllocations(item.id) : (item.allocations || []);
    const unit = item.unit || "bbl";
    return `<details class="multi-product-form-item" data-product-form-item open>
      <summary><span>Produto ${index + 1}</span><strong data-product-summary>${esc(item.product || "Novo produto")}</strong><button type="button" data-remove-product-item aria-label="Remover produto">×</button></summary>
      <div class="multi-product-form-grid">
        <label class="wide"><span>Produto *</span><select data-item-field="fluid_type_id" required><option value="">Selecione</option>${fluidOptions(item.fluid_type_id || "")}</select></label>
        <label><span>Atividade *</span><select data-item-field="activity">${["Bombeio", "Load", "Backload", "Fabricação", "Recebimento", "Transferência"].map(value => `<option ${item.activity === value ? "selected" : ""}>${value}</option>`).join("")}</select></label>
        <label><span>Unidade</span><input data-item-field="unit" value="${esc(unit)}" readonly></label>
        <label><span>Ticket *</span><input data-item-field="ticket_number" value="${esc(item.ticket_number || "")}" required></label>
        <label><span>RT *</span><input data-item-field="rt_number" value="${esc(item.rt_number || "")}" required></label>
        <label><span>Lote *</span><input data-item-field="lot" value="${esc(item.lot || "")}" required></label>
        <label><span>Sonda *</span><input data-item-field="rig" value="${esc(item.rig || "")}" required></label>
        <label><span>Poço</span><input data-item-field="well" value="${esc(item.well || "")}"></label>
        <label><span>Planejado</span><input data-item-field="planned_quantity" inputmode="decimal" value="${item.planned_quantity ?? 0}"></label>
        <label><span>Executado</span><input data-item-field="executed_quantity" inputmode="decimal" value="${item.executed_quantity ?? 0}"></label>
        <label><span>Status</span><select data-item-field="status">${["Programada", "Em andamento", "Paralisada", "Concluída", "Cancelada"].map(value => `<option ${item.status === value ? "selected" : ""}>${value}</option>`).join("")}</select></label>
        <label><span>Início</span><input type="datetime-local" data-item-field="start_at" value="${inputDateTime(item.start_at)}"></label>
        <label><span>Término</span><input type="datetime-local" data-item-field="end_at" value="${inputDateTime(item.end_at)}"></label>
        <label><span>Vazão</span><input data-item-field="flow_rate" inputmode="decimal" value="${item.flow_rate ?? ""}"></label>
        <label><span>Unidade da vazão</span><input data-item-field="flow_rate_unit" value="${esc(item.flow_rate_unit || `${unit}/h`)}"></label>
        <label><span>Paradas (min)</span><input type="number" min="0" data-item-field="paused_minutes" value="${item.paused_minutes ?? 0}"></label>
        <label class="wide"><span>Ocorrência</span><textarea data-item-field="occurrence">${esc(item.occurrence || "")}</textarea></label>
        <label class="wide"><span>Observações do produto</span><textarea data-item-field="notes">${esc(item.notes || "")}</textarea></label>
        <label class="multi-checkbox wide"><input type="checkbox" data-item-field="apply_tank_movement" ${item.apply_tank_movement ? "checked" : ""}><span>Aplicar movimentação nos tanques/silos quando este produto for concluído</span></label>
      </div>
      <section class="multi-allocation-form">
        <header><div><strong>Rateio por tanque ou silo</strong><span>Cada origem/destino pode possuir lote próprio.</span></div><button type="button" class="btn small secondary" data-add-allocation>Adicionar rateio</button></header>
        <div data-allocation-list>${allocations.map(allocation => allocationFormRow(allocation, unit)).join("")}</div>
      </section>
    </details>`;
  }

  function ensureModal() {
    let modal = $("#multiOperationModal");
    if (modal) return modal;
    modal = document.createElement("section");
    modal.id = "multiOperationModal";
    modal.className = "multi-operation-modal hidden";
    modal.innerHTML = `<button class="multi-operation-modal-backdrop" data-close-multi-operation aria-label="Fechar"></button><div class="multi-operation-modal-card"><header><div><small>OPERAÇÃO MULTIPRODUTO</small><h2 data-multi-modal-title>Nova operação</h2><p>Cadastre a embarcação uma vez e adicione todos os produtos.</p></div><button type="button" class="icon-btn" data-close-multi-operation aria-label="Fechar">×</button></header><form data-multi-operation-form><div data-multi-operation-form-body></div><footer><button type="button" class="btn secondary" data-close-multi-operation>Cancelar</button><button type="submit" class="btn primary" data-save-multi-operation>Salvar operação</button></footer></form></div>`;
    document.body.appendChild(modal);
    return modal;
  }

  function openForm(operation = null) {
    const modal = ensureModal();
    const items = operation ? operationItems(operation.id) : [{}];
    const body = $("[data-multi-operation-form-body]", modal);
    modal.dataset.operationId = operation?.id || "";
    $("[data-multi-modal-title]", modal).textContent = operation ? `Editar ${operation.vessel}` : "Nova operação";
    body.innerHTML = `<section class="multi-operation-header-form">
      <h3>Dados da embarcação</h3>
      <div class="multi-header-form-grid">
        <label><span>Embarcação *</span><input data-header-field="vessel" value="${esc(operation?.vessel || "")}" required></label>
        <label><span>Cliente *</span><input data-header-field="client" value="${esc(operation?.client || "")}" required></label>
        <label><span>Berço</span><input data-header-field="berth" value="${esc(operation?.berth || "")}"></label>
        <label><span>Data programada</span><input type="datetime-local" data-header-field="scheduled_at" value="${inputDateTime(operation?.scheduled_at)}"></label>
        <label><span>OS geral</span><input data-header-field="service_order" value="${esc(operation?.service_order || "")}"></label>
        <label><span>Responsável</span><select data-header-field="responsible_id"><option value="">Não definido</option>${state.profiles.map(profile => `<option value="${profile.id}" ${operation?.responsible_id === profile.id ? "selected" : ""}>${esc(profile.full_name)}</option>`).join("")}</select></label>
        <label class="wide"><span>Observações gerais</span><textarea data-header-field="notes">${esc(operation?.notes || "")}</textarea></label>
      </div>
    </section>
    <section class="multi-products-form-section"><header><div><h3>Produtos da embarcação</h3><p>Ticket, RT, lote e sonda são individuais.</p></div><button type="button" class="btn secondary" data-add-product-item>Adicionar produto</button></header><div data-product-items>${items.map(itemForm).join("")}</div></section>`;
    modal.classList.remove("hidden");
    document.body.classList.add("multi-operation-modal-open");
  }

  function closeForm() {
    const modal = $("#multiOperationModal");
    modal?.classList.add("hidden");
    document.body.classList.remove("multi-operation-modal-open");
  }

  function updateProductIndexes(modal) {
    $$("[data-product-form-item]", modal).forEach((item, index) => {
      const label = $("summary > span", item);
      if (label) label.textContent = `Produto ${index + 1}`;
    });
  }

  function itemValue(item, field) {
    const element = $(`[data-item-field="${field}"]`, item);
    if (!element) return "";
    if (element.type === "checkbox") return element.checked;
    return element.value.trim();
  }

  function collectForm(modal) {
    const header = {};
    $$('[data-header-field]', modal).forEach(element => { header[element.dataset.headerField] = element.value.trim(); });
    if (!header.vessel || !header.client) throw new Error("Informe a embarcação e o cliente.");

    const items = $$("[data-product-form-item]", modal).map((item, index) => {
      const select = $('[data-item-field="fluid_type_id"]', item);
      const option = select?.selectedOptions?.[0];
      const product = option?.dataset.name || option?.textContent?.split(" • ")[0] || "";
      const allocations = $$("[data-allocation-row]", item).map(row => {
        const value = field => $(`[data-allocation-field="${field}"]`, row)?.value.trim() || "";
        return { direction: value("direction"), tank_id: value("tank_id"), lot: value("lot"), quantity: number(value("quantity")) };
      }).filter(allocation => allocation.tank_id || allocation.quantity);

      const result = {
        display_order: index,
        fluid_type_id: select?.value || "",
        product,
        activity: itemValue(item, "activity"),
        ticket_number: itemValue(item, "ticket_number"),
        rt_number: itemValue(item, "rt_number"),
        lot: itemValue(item, "lot"),
        rig: itemValue(item, "rig"),
        well: itemValue(item, "well"),
        planned_quantity: number(itemValue(item, "planned_quantity")),
        executed_quantity: number(itemValue(item, "executed_quantity")),
        unit: itemValue(item, "unit") || "bbl",
        status: itemValue(item, "status") || "Programada",
        start_at: itemValue(item, "start_at"),
        end_at: itemValue(item, "end_at"),
        flow_rate: itemValue(item, "flow_rate") ? number(itemValue(item, "flow_rate")) : "",
        flow_rate_unit: itemValue(item, "flow_rate_unit"),
        paused_minutes: Math.max(0, number(itemValue(item, "paused_minutes"))),
        occurrence: itemValue(item, "occurrence"),
        notes: itemValue(item, "notes"),
        apply_tank_movement: Boolean(itemValue(item, "apply_tank_movement")),
        allocations
      };

      if (!result.fluid_type_id || !result.product || !result.ticket_number || !result.rt_number || !result.lot || !result.rig) {
        throw new Error(`Produto ${index + 1}: informe produto, ticket, RT, lote e sonda.`);
      }
      if (result.status === "Concluída" && !result.end_at) throw new Error(`Produto ${index + 1}: informe o horário de término.`);
      if (result.apply_tank_movement) {
        if (!allocations.length) throw new Error(`Produto ${index + 1}: adicione o rateio dos tanques/silos.`);
        const total = allocations.reduce((sum, allocation) => sum + allocation.quantity, 0);
        if (Math.abs(total - result.executed_quantity) > 0.001) {
          throw new Error(`Produto ${index + 1}: o rateio (${fmt.format(total)}) deve ser igual ao executado (${fmt.format(result.executed_quantity)} ${result.unit}).`);
        }
      }
      return result;
    });

    if (!items.length) throw new Error("Adicione pelo menos um produto.");
    return { header, items };
  }

  async function saveForm(form) {
    const modal = form.closest("#multiOperationModal");
    const button = $("[data-save-multi-operation]", modal);
    try {
      const payload = collectForm(modal);
      button.disabled = true;
      button.textContent = "Salvando...";
      const { error } = await ensureClient().rpc("save_multi_product_operation", {
        p_operation_id: modal.dataset.operationId || null,
        p_header: payload.header,
        p_items: payload.items
      });
      if (error) throw error;
      closeForm();
      toast("Operação multiproduto salva com sucesso.");
      await loadData();
      document.dispatchEvent(new CustomEvent("opscontrol:multi-operation-updated"));
    } catch (error) {
      console.error(error);
      toast(error.message || "Falha ao salvar operação.", "error");
    } finally {
      button.disabled = false;
      button.textContent = "Salvar operação";
    }
  }

  async function applyMovement(itemId) {
    if (!window.confirm("Aplicar agora a movimentação deste produto nos tanques/silos? Esta ação altera o estoque.")) return;
    try {
      const { error } = await ensureClient().rpc("apply_operation_item_movement", { p_item_id: itemId });
      if (error) throw error;
      toast("Movimentação do produto aplicada ao estoque.");
      await loadData();
      document.dispatchEvent(new CustomEvent("opscontrol:multi-operation-updated"));
    } catch (error) {
      toast(error.message || "Falha ao aplicar movimentação.", "error");
    }
  }

  function bindEvents() {
    if (state.bound) return;
    state.bound = true;

    document.addEventListener("click", event => {
      const newButton = event.target.closest("[data-new-multi-operation]");
      if (newButton) return openForm();

      const editButton = event.target.closest("[data-edit-multi-operation]");
      if (editButton) {
        const operation = state.operations.find(item => item.id === editButton.dataset.editMultiOperation);
        if (operation) openForm(operation);
        return;
      }

      if (event.target.closest("[data-close-multi-operation]")) return closeForm();
      if (event.target.closest("[data-refresh-multi-operations]")) return loadData();

      const applyButton = event.target.closest("[data-apply-operation-item]");
      if (applyButton) return applyMovement(applyButton.dataset.applyOperationItem);

      const addItem = event.target.closest("[data-add-product-item]");
      if (addItem) {
        const modal = addItem.closest("#multiOperationModal");
        const list = $("[data-product-items]", modal);
        list.insertAdjacentHTML("beforeend", itemForm({}, list.children.length));
        updateProductIndexes(modal);
        return;
      }

      const removeItem = event.target.closest("[data-remove-product-item]");
      if (removeItem) {
        event.preventDefault();
        const modal = removeItem.closest("#multiOperationModal");
        const items = $$("[data-product-form-item]", modal);
        if (items.length <= 1) return toast("A operação precisa ter pelo menos um produto.", "error");
        removeItem.closest("[data-product-form-item]").remove();
        updateProductIndexes(modal);
        return;
      }

      const addAllocation = event.target.closest("[data-add-allocation]");
      if (addAllocation) {
        const item = addAllocation.closest("[data-product-form-item]");
        const unit = itemValue(item, "unit") || "bbl";
        $("[data-allocation-list]", item).insertAdjacentHTML("beforeend", allocationFormRow({}, unit));
        return;
      }

      const removeAllocation = event.target.closest("[data-remove-allocation]");
      if (removeAllocation) removeAllocation.closest("[data-allocation-row]")?.remove();
    });

    document.addEventListener("input", event => {
      if (event.target.matches("[data-multi-operation-search]")) {
        state.search = event.target.value;
        render();
      }
    });

    document.addEventListener("change", event => {
      if (event.target.matches("[data-multi-operation-status]")) {
        state.status = event.target.value;
        render();
        return;
      }
      if (event.target.matches('[data-item-field="fluid_type_id"]')) {
        const item = event.target.closest("[data-product-form-item]");
        const option = event.target.selectedOptions[0];
        const unit = option?.dataset.unit || "bbl";
        const unitInput = $('[data-item-field="unit"]', item);
        const flowUnit = $('[data-item-field="flow_rate_unit"]', item);
        const summary = $("[data-product-summary]", item);
        if (unitInput) unitInput.value = unit;
        if (flowUnit && !flowUnit.value) flowUnit.value = `${unit}/h`;
        if (summary) summary.textContent = option?.dataset.name || "Novo produto";
        $$("[data-allocation-field='tank_id']", item).forEach(select => {
          const selected = select.value;
          select.innerHTML = `<option value="">Tanque ou silo</option>${tankOptions(selected, unit)}`;
        });
      }
    });

    document.addEventListener("submit", event => {
      if (!event.target.matches("[data-multi-operation-form]")) return;
      event.preventDefault();
      saveForm(event.target);
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && !$("#multiOperationModal")?.classList.contains("hidden")) closeForm();
    });
  }

  function start() {
    bindEvents();
    const page = $("#page-operations");
    if (page) {
      const observer = new MutationObserver(() => {
        if (!page.querySelector(".multi-operations-workspace") && !state.loading) setTimeout(loadData, 0);
      });
      observer.observe(page, { childList: true });
    }
    [300, 900, 1800].forEach(delay => setTimeout(loadData, delay));
    document.addEventListener("opscontrol:interface-ready", loadData);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
