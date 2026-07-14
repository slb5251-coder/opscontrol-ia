(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const CONFIG = window.OPSCONTROL_CONFIG || {};
  const CONFIG_KEY = "opscontrol_config";
  const THEME_KEY = "opscontrol_theme";
  const fmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
  const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

  const state = {
    client: null,
    user: null,
    data: null,
    page: "dashboard",
    realtime: null,
    refreshing: false,
    lastSync: null,
    filters: { start: "", end: "", client: "", product: "" },
    config: loadConfig()
  };

  function loadConfig() {
    const saved = JSON.parse(localStorage.getItem(CONFIG_KEY) || "{}");
    return {
      url: saved.url || CONFIG.supabaseUrl || "",
      key: saved.key || CONFIG.supabaseKey || ""
    };
  }

  function esc(value = "") {
    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[char]));
  }

  function uid(prefix = "id") {
    return `${prefix}-${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
  }

  function dateOnly(value) {
    if (!value) return "-";
    return new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR");
  }

  function dateTime(value) {
    if (!value) return "-";
    return new Date(value).toLocaleString("pt-BR");
  }

  function toLocalInput(value) {
    if (!value) return "";
    const d = new Date(value);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  function daysUntil(value) {
    if (!value) return null;
    return Math.ceil((new Date(`${String(value).slice(0, 10)}T23:59:59`) - new Date()) / 86400000);
  }

  function toast(message, kind = "normal") {
    const el = document.createElement("div");
    el.className = `toast ${kind}`;
    el.textContent = message;
    $("#toastContainer").appendChild(el);
    setTimeout(() => el.remove(), 3600);
  }

  function showLoginMessage(message) {
    const el = $("#loginMessage");
    el.textContent = message;
    el.classList.remove("hidden");
  }

  function role() {
    return String(state.data?.profile?.role || "").toLowerCase();
  }

  function isAdmin() {
    return role() === "admin";
  }

  function hasRole(roles) {
    return isAdmin() || roles.includes(role());
  }

  function moduleAllowed(module) {
    if (isAdmin() || module === "settings") return true;
    const permissions = state.data?.profile?.permissions || {};
    if (Object.prototype.hasOwnProperty.call(permissions, module)) return permissions[module] !== false;

    const defaults = {
      supervisor: ["dashboard", "operations", "tanks", "fluids", "chemicals", "trucks", "qhse", "maintenance", "certificates", "alerts", "reports"],
      lider: ["dashboard", "operations", "tanks", "fluids", "chemicals", "trucks", "qhse", "maintenance", "certificates", "alerts", "reports"],
      operador: ["dashboard", "operations", "tanks", "fluids", "chemicals", "trucks", "qhse", "alerts", "reports"],
      logistica: ["dashboard", "operations", "tanks", "fluids", "chemicals", "trucks", "certificates", "alerts", "reports"],
      mecanico: ["dashboard", "maintenance", "certificates", "alerts", "reports"],
      qhse: ["dashboard", "operations", "chemicals", "qhse", "certificates", "alerts", "reports"],
      user: ["dashboard", "certificates", "alerts"]
    };
    return (defaults[role()] || defaults.user).includes(module);
  }

  function statusClass(status = "") {
    const s = String(status).toLowerCase();
    if (["conclu", "liberado", "válido", "ativo", "recebida", "operando", "disponível", "fechada"].some(x => s.includes(x))) return "green";
    if (["andamento", "programada", "atenção", "a vencer", "próximo vencimento", "manutenção", "média", "aberta"].some(x => s.includes(x))) return "amber";
    if (["bloqueado", "parado", "crítico", "vencido", "baixo estoque", "alta", "cancelada", "inativo"].some(x => s.includes(x))) return "red";
    if (s.includes("wbm")) return "blue";
    return "neutral";
  }

  function badge(text) {
    return `<span class="badge ${statusClass(text)}">${esc(text || "-")}</span>`;
  }

  function header(title, subtitle, actions = "") {
    return `<div class="page-header">
      <div><h1>${title}</h1><p>${subtitle}</p></div>
      <div class="actions no-print">${actions}</div>
    </div>`;
  }

  function formActions(label = "Salvar") {
    return `<div class="form-actions">
      <button type="button" class="btn secondary" data-close-modal>Cancelar</button>
      <button class="btn primary">${label}</button>
    </div>`;
  }

  function openModal(title, body, eyebrow = "REGISTRO") {
    $("#modalTitle").textContent = title;
    $("#modalEyebrow").textContent = eyebrow;
    $("#modalBody").innerHTML = body;
    $("#modal").classList.remove("hidden");
    syncOperationTankFields($("#operationForm"));
    updateTransferPreview($("#tankTransferForm"));
  }

  function closeModal() {
    $("#modal").classList.add("hidden");
  }

  function productClass(product = "", kind = "", volume = 0) {
    const numericVolume = Number(volume || 0);
    if (numericVolume <= 0) return "empty";

    const p = String(product || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
    const equipmentKind = String(kind || "").toLowerCase();

    // Todo silo com saldo utiliza a cor de granel, mesmo sem produto informado.
    if (equipmentKind.includes("silo")) return "bulk";

    if (["brine", "nacl", "cacl", "salmoura", "cadit"].some(term => p.includes(term))) return "brine";
    if (["sbm", "rheliant", "sintetico", "oleo base"].some(term => p.includes(term))) return "sbm";
    if (["olef", "olefina"].some(term => p.includes(term))) return "olefin";
    if (["wb", "wbdf", "flopro", "glydril", "glydrill", "water", "kcl polymer", "premix"].some(term => p.includes(term))) return "wbm";
    if (["barita", "bentonita", "calcita", "cimento", "bulk", "granel"].some(term => p.includes(term))) return "bulk";

    // Qualquer tanque/Mix Tank com volume e produto desconhecido recebe cor genérica.
    return "generic";
  }

  function tankMovementMode(activity = "") {
    const value = String(activity).toLowerCase();
    if (["bombeio", "carregamento"].includes(value)) return "out";
    if (["backload", "fabricação", "fabricacao", "descarga"].includes(value)) return "in";
    return "none";
  }

  function filteredOperations() {
    const f = state.filters;
    return (state.data?.operations || []).filter(op => {
      const date = String(op.start_at || op.created_at || "").slice(0, 10);
      if (f.start && date && date < f.start) return false;
      if (f.end && date && date > f.end) return false;
      if (f.client && op.client !== f.client) return false;
      if (f.product && op.product !== f.product) return false;
      return true;
    });
  }

  function filteredTrucks() {
    const f = state.filters;
    return (state.data?.trucks || []).filter(item => {
      const date = String(item.date || "").slice(0, 10);
      if (f.start && date && date < f.start) return false;
      if (f.end && date && date > f.end) return false;
      if (f.client && item.client !== f.client) return false;
      if (f.product && item.product !== f.product) return false;
      return true;
    });
  }

  function csvEscape(value) {
    const text = String(value ?? "").replace(/"/g, '""');
    return `"${text}"`;
  }

  function downloadCsv(filename, headers, rows) {
    const content = [headers, ...rows].map(row => row.map(csvEscape).join(";")).join("\n");
    const blob = new Blob(["\ufeff" + content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function exportData(kind) {
    const date = new Date().toISOString().slice(0, 10);
    if (kind === "operations") {
      const rows = filteredOperations().map(op => [op.client, op.vessel, op.service_order, op.activity, op.product, op.lot, op.planned, op.executed, op.unit, op.status, op.start_at, op.end_at, op.paused_minutes, op.tank_movement_applied ? "Aplicada" : "Não aplicada"]);
      return downloadCsv(`operacoes-${date}.csv`, ["Cliente", "Embarcação", "OS", "Atividade", "Produto", "Lote", "Planejado", "Executado", "Unidade", "Status", "Início", "Término", "Parado (min)", "Tancagem"], rows);
    }
    if (kind === "tanks") {
      const rows = state.data.tanks.map(t => [t.phase, t.name, t.kind, t.product, t.lot, t.volume, t.capacity, t.unit, t.status, t.updated_at]);
      return downloadCsv(`tancagem-${date}.csv`, ["Fase", "Tanque/Silo", "Tipo", "Produto", "Lote", "Volume", "Capacidade", "Unidade", "Status", "Atualização"], rows);
    }
    if (kind === "chemicals") {
      const rows = state.data.chemicals.map(c => [c.name, c.category, c.lot, c.quantity, c.unit, c.minimum, c.expiry_date, c.location, c.supplier, chemicalDisplayStatus(c)]);
      return downloadCsv(`inventario-quimico-${date}.csv`, ["Produto", "Categoria", "Lote", "Saldo", "Unidade", "Mínimo", "Validade", "Localização", "Fornecedor", "Status"], rows);
    }
    if (kind === "trucks") {
      const rows = filteredTrucks().map(t => [t.date, t.movement, t.supplier, t.client, t.product, t.lot, t.quantity, t.unit, t.plate, t.driver, t.invoice, t.status]);
      return downloadCsv(`carretas-${date}.csv`, ["Data", "Movimento", "Origem/Destino", "Cliente", "Produto", "Lote", "Quantidade", "Unidade", "Placa", "Motorista", "NF", "Status"], rows);
    }
    if (kind === "maintenance") {
      const rows = state.data.equipment.map(e => [e.name, e.category, e.status, e.hourmeter, e.next_maintenance_date, e.maintenance_due_hourmeter, e.location]);
      return downloadCsv(`manutencao-${date}.csv`, ["Equipamento", "Categoria", "Status", "Horímetro", "Próxima preventiva", "Horímetro limite", "Localização"], rows);
    }
  }

  function syncOperationTankFields(form) {
    if (!form) return;
    const mode = tankMovementMode(form.elements.activity?.value);
    const source = form.querySelector(".tank-source-field");
    const destination = form.querySelector(".tank-destination-field");
    const checkbox = form.elements.apply_tank_movement;
    const hint = form.querySelector("#operationTankHint");
    source?.classList.toggle("hidden", mode !== "out");
    destination?.classList.toggle("hidden", mode !== "in");
    if (checkbox) {
      checkbox.disabled = mode === "none" || checkbox.dataset.applied === "true";
      if (mode === "none") checkbox.checked = false;
    }
    if (hint) {
      hint.textContent = mode === "out"
        ? "Ao concluir, o volume executado será retirado da origem."
        : mode === "in"
          ? "Ao concluir, o volume executado será adicionado ao destino."
          : "Esta atividade não altera a volumetria automaticamente.";
    }
  }

  function operationHours(op) {
    if (!op.start_at) return 0;
    const end = op.end_at ? new Date(op.end_at) : new Date();
    const total = Math.max(0, (end - new Date(op.start_at)) / 3600000);
    return Math.max(0, total - Number(op.paused_minutes || 0) / 60);
  }

  function operationFlow(op) {
    const hours = operationHours(op);
    return hours > 0 ? Number(op.executed || 0) / hours : Number(op.flow_rate || 0);
  }

  function attachmentCount(module, recordId) {
    return (state.data?.attachments || []).filter(item => item.module === module && item.record_id === recordId).length;
  }

  function fileSizeLabel(bytes) {
    const value = Number(bytes || 0);
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / 1024 / 1024).toFixed(1)} MB`;
  }

  function safeFileName(name) {
    return String(name || "arquivo")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-");
  }

  async function initClient() {
    if (!state.config.url || !state.config.key || !window.supabase) {
      throw new Error("A conexão do sistema não está configurada.");
    }
    if (!state.client) {
      state.client = window.supabase.createClient(state.config.url, state.config.key);
    }
    return state.client;
  }

  async function login() {
    const email = $("#loginEmail").value.trim();
    const password = $("#loginPassword").value;
    if (!email || !password) return showLoginMessage("Preencha e-mail e senha.");

    try {
      await initClient();
      const { data, error } = await state.client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      state.user = data.user;
      await loadData();
      if (state.data.profile.active === false) {
        await state.client.auth.signOut();
        throw new Error("Seu acesso está bloqueado. Procure o administrador.");
      }
      openApp();
    } catch (error) {
      showLoginMessage(`Falha no login: ${error.message}`);
    }
  }

  async function restoreSession() {
    try {
      await initClient();
      const { data } = await state.client.auth.getSession();
      if (!data.session?.user) return;
      state.user = data.session.user;
      await loadData();
      if (state.data.profile.active === false) {
        await state.client.auth.signOut();
        return;
      }
      openApp();
    } catch (error) {
      console.error("Não foi possível restaurar a sessão:", error);
    }
  }

  async function loadData() {
    const c = state.client;
    const u = state.user;
    const results = await Promise.all([
      c.from("profiles").select("*").eq("id", u.id).maybeSingle(),
      c.from("profiles").select("*").order("full_name"),
      c.from("fluid_types").select("*").order("name"),
      c.from("tanks").select("*").order("display_order"),
      c.from("tank_history").select("*").order("created_at", { ascending: false }).limit(500),
      c.from("operations").select("*").order("start_at", { ascending: false }).limit(300),
      c.from("operation_events").select("*").order("event_time", { ascending: true }).limit(1000),
      c.from("trucks").select("*").order("movement_date", { ascending: false }).limit(300),
      c.from("qhse_records").select("*").order("record_date", { ascending: false }).limit(300),
      c.from("action_items").select("*").order("due_date", { ascending: true }).limit(500),
      c.from("equipment").select("*").order("name"),
      c.from("diesel_logs").select("*").order("log_date", { ascending: false }).limit(500),
      c.from("maintenance_orders").select("*").order("opened_at", { ascending: false }).limit(500),
      c.from("certificates").select("*").order("expires_at"),
      c.from("alerts").select("*").order("created_at", { ascending: false }).limit(300),
      c.from("chat_messages").select("*").order("created_at", { ascending: true }).limit(500),
      c.from("attachments").select("*").order("created_at", { ascending: false }).limit(1000),
      c.from("chemical_inventory").select("*").order("product_name").limit(1000),
      c.from("chemical_movements").select("*").order("created_at", { ascending: false }).limit(3000),
      c.from("tank_movements").select("*").order("created_at", { ascending: false }).limit(2000),
      c.from("inventory_alerts").select("*").order("created_at", { ascending: false }),
      c.from("operational_health_alerts").select("*").order("created_at", { ascending: false }),
      c.from("system_errors").select("*").order("created_at", { ascending: false }).limit(50)
    ]);

    const failed = results.find(result => result.error);
    if (failed) throw failed.error;

    const profile = results[0].data || {
      id: u.id,
      email: u.email,
      full_name: u.email,
      role: "user",
      active: true,
      permissions: {}
    };

    state.data = {
      profile: {
        id: profile.id,
        name: profile.full_name || u.email,
        email: profile.email || u.email,
        role: profile.role || "user",
        department: profile.department || "",
        active: profile.active !== false,
        permissions: profile.permissions || {}
      },
      users: (results[1].data || []).map(x => ({
        id: x.id, email: x.email || "", name: x.full_name || x.email || "Usuário",
        role: x.role || "user", department: x.department || "", active: x.active !== false,
        permissions: x.permissions || {}, created_at: x.created_at
      })),
      fluids: (results[2].data || []).map(x => ({
        id: x.id, name: x.name, type: x.category, unit: x.default_unit,
        density: Number(x.density_value ?? x.density_ppg ?? 0),
        densityUnit: x.density_unit || (["granel", "insumo"].includes(String(x.category || "").toLowerCase()) ? "t/m³" : "ppg"),
        active: x.active
      })),
      tanks: (results[3].data || []).map(x => ({
        id: x.id, name: x.name, phase: x.phase, kind: x.kind,
        capacity: Number(x.capacity), unit: x.unit, volume: Number(x.current_volume || 0),
        fluidTypeId: x.current_fluid_type_id || null,
        product: x.current_product || "", lot: x.current_lot || "",
        density: x.current_density === null || x.current_density === undefined ? null : Number(x.current_density),
        densityUnit: x.current_density_unit || null,
        status: x.status, order: x.display_order,
        updated_by: x.updated_by, updated_at: x.updated_at
      })),
      tankHistory: results[4].data || [],
      operations: (results[5].data || []).map(x => ({
        id: x.id, client: x.client, vessel: x.vessel, service_order: x.service_order || "",
        activity: x.activity, product: x.product, lot: x.lot || "",
        planned: Number(x.planned_quantity || 0), executed: Number(x.executed_quantity || 0),
        unit: x.unit, status: x.status, start_at: x.start_at, end_at: x.end_at,
        notes: x.notes || "", occurrence: x.occurrence || "", responsible_id: x.responsible_id,
        flow_rate: Number(x.flow_rate || 0), flow_rate_unit: x.flow_rate_unit || "",
        paused_minutes: Number(x.paused_minutes || 0), locked: x.locked === true,
        source_tank_id: x.source_tank_id, destination_tank_id: x.destination_tank_id,
        apply_tank_movement: x.apply_tank_movement === true,
        tank_movement_applied: x.tank_movement_applied === true,
        tank_movement_applied_at: x.tank_movement_applied_at,
        created_by: x.created_by, created_at: x.created_at, updated_at: x.updated_at
      })),
      operationEvents: results[6].data || [],
      trucks: (results[7].data || []).map(x => ({
        id: x.id, date: x.movement_date, movement: x.movement_type,
        supplier: x.supplier, client: x.client || "", product: x.product, lot: x.lot || "",
        quantity: Number(x.quantity || 0), unit: x.unit, plate: x.plate || "",
        driver: x.driver_name || "", invoice: x.invoice_number || "", status: x.status,
        notes: x.notes || ""
      })),
      qhse: (results[8].data || []).map(x => ({
        id: x.id, date: x.record_date, type: x.record_type, title: x.title,
        description: x.description || "", responsible: x.responsible || "",
        severity: x.severity, status: x.status
      })),
      actionItems: results[9].data || [],
      equipment: (results[10].data || []).map(x => ({
        id: x.id, name: x.name, category: x.category, status: x.status,
        hourmeter: Number(x.hourmeter || 0), last_hours: Number(x.last_work_hours || 0),
        diesel_initial: Number(x.diesel_initial || 0), refueled: Number(x.diesel_refueled || 0),
        diesel_final: Number(x.diesel_final || 0), location: x.location || "",
        next_maintenance_date: x.next_maintenance_date,
        maintenance_due_hourmeter: Number(x.maintenance_due_hourmeter || 0),
        maintenance_interval_hours: Number(x.maintenance_interval_hours || 0),
        notes: x.notes || "", updated_at: x.updated_at
      })),
      dieselLogs: results[11].data || [],
      maintenanceOrders: (results[12].data || []).map(x => ({
        id: x.id, equipment_id: x.equipment_id, title: x.title,
        description: x.description || "", priority: x.priority, status: x.status,
        opened_at: x.opened_at, due_date: x.due_date, closed_at: x.closed_at,
        responsible: x.responsible || "", maintenance_type: x.maintenance_type || "Corretiva",
        parts_used: x.parts_used || "", solution: x.solution || "",
        estimated_cost: Number(x.estimated_cost || 0), actual_cost: Number(x.actual_cost || 0),
        before_notes: x.before_notes || "", after_notes: x.after_notes || ""
      })),
      certificates: (results[13].data || []).map(x => ({
        id: x.id, user_id: x.user_id, title: x.title, owner: x.owner_name,
        issuer: x.issuer || "", issued_at: x.issued_at, expires_at: x.expires_at,
        status: x.status
      })),
      alerts: (results[14].data || []).map(x => ({
        id: x.id, title: x.title, message: x.message, level: x.level,
        target: x.target_group || "", target_user_id: x.target_user_id,
        created_at: x.created_at, read: x.is_read
      })),
      messages: (results[15].data || []).map(x => ({
        id: x.id, sender: x.sender_name, sender_id: x.sender_id,
        text: x.message, created_at: x.created_at, mine: x.sender_id === u.id
      })),
      attachments: (results[16].data || []).map(x => ({
        id: x.id, module: x.module, record_id: x.record_id, file_name: x.file_name,
        file_path: x.file_path, mime_type: x.mime_type, file_size: Number(x.file_size || 0),
        uploaded_by: x.uploaded_by, created_at: x.created_at
      })),
      chemicals: (results[17].data || []).map(x => ({
        id: x.id, name: x.product_name, category: x.category || "", lot: x.lot || "",
        unit: x.unit || "kg", quantity: Number(x.quantity || 0),
        minimum: Number(x.minimum_quantity || 0), expiry_date: x.expiry_date,
        location: x.location || "", supplier: x.supplier || "",
        status: x.status || "Disponível", notes: x.notes || "",
        created_by: x.created_by, updated_by: x.updated_by,
        created_at: x.created_at, updated_at: x.updated_at
      })),
      chemicalMovements: (results[18].data || []).map(x => ({
        id: x.id, inventory_id: x.inventory_id, movement_type: x.movement_type,
        quantity: Number(x.quantity || 0), previous_balance: Number(x.previous_balance || 0),
        new_balance: Number(x.new_balance || 0), reference: x.reference || "",
        notes: x.notes || "", performed_by: x.performed_by, created_at: x.created_at
      })),
      tankMovements: (results[19].data || []).map(x => ({
        id: x.id, movement_type: x.movement_type, source_tank_id: x.source_tank_id,
        destination_tank_id: x.destination_tank_id, operation_id: x.operation_id,
        quantity: Number(x.quantity || 0), unit: x.unit, product: x.product || "",
        lot: x.lot || "", reference: x.reference || "", notes: x.notes || "",
        created_by: x.created_by, created_at: x.created_at
      })),
      systemAlerts: [...(results[20].data || []), ...(results[21].data || [])],
      systemErrors: results[22].data || []
    };
    state.lastSync = new Date();
  }

  function openApp() {
    $("#loginView").classList.add("hidden");
    $("#appView").classList.remove("hidden");

    const profile = state.data.profile;
    $("#userName").textContent = profile.name;
    $("#userRole").textContent = profile.role;
    $("#userInitials").textContent = profile.name.split(/\s+/).slice(0, 2).map(x => x[0]).join("").toUpperCase();

    $$(".nav-item").forEach(button => {
      button.classList.toggle("hidden", !moduleAllowed(button.dataset.page));
    });

    applyTheme(localStorage.getItem(THEME_KEY) || "light");
    updateConnectionBadge();
    renderAll();

    const firstAllowed = $$(".nav-item").find(button => !button.classList.contains("hidden"))?.dataset.page || "dashboard";
    showPage(moduleAllowed(state.page) ? state.page : firstAllowed);
    subscribeRealtime();
  }

  async function logout() {
    if (state.realtime) await state.client.removeChannel(state.realtime);
    await state.client.auth.signOut();
    location.reload();
  }

  function updateConnectionBadge() {
    const online = navigator.onLine;
    const badgeEl = $("#syncBadge");
    badgeEl.textContent = online ? "Tempo real ativo" : "Sem conexão";
    badgeEl.className = `status-badge ${online ? "online" : "neutral"}`;
  }

  function subscribeRealtime() {
    if (state.realtime) return;
    state.realtime = state.client
      .channel("opscontrol-professional")
      .on("postgres_changes", { event: "*", schema: "public" }, refreshRealtime)
      .subscribe();
  }

  async function refreshRealtime() {
    if (state.refreshing || !navigator.onLine) return;
    state.refreshing = true;
    try {
      await loadData();
      if (state.data.profile.active === false) {
        await state.client.auth.signOut();
        location.reload();
        return;
      }
      renderAll();
    } catch (error) {
      console.error("Atualização em tempo real:", error);
    } finally {
      state.refreshing = false;
    }
  }

  function renderAll() {
    renderDashboard();
    renderOperations();
    renderTanks();
    renderFluids();
    renderChemicalInventory();
    renderTrucks();
    renderQhse();
    renderMaintenance();
    renderCertificates();
    renderAlerts();
    renderReports();
    renderSettings();
    const manualUnread = state.data.alerts.filter(x => !x.read).length;
    $("#alertCount").textContent = manualUnread + state.data.systemAlerts.length;
  }

  function statCard(title, value, unit, icon, detail = "") {
    return `<div class="card stat-card pro-stat">
      <div><small>${title}</small><h2>${value}</h2><span class="muted">${unit}</span>${detail ? `<em>${detail}</em>` : ""}</div>
      <span class="stat-icon">${icon}</span>
    </div>`;
  }

  function renderDashboard() {
    const d = state.data;
    const operations = filteredOperations();
    const trucks = filteredTrucks();
    const volume = type => d.tanks.filter(t => productClass(t.product) === type).reduce((sum, t) => sum + t.volume, 0);
    const activeOps = operations.filter(x => !["Concluída", "Cancelada"].includes(x.status));
    const today = new Date().toISOString().slice(0, 10);
    const todayOps = operations.filter(x => String(x.start_at || "").slice(0, 10) === today).length;
    const todayTrucks = trucks.filter(x => x.date === today).length;
    const openMaintenance = d.maintenanceOrders.filter(x => !["Concluída", "Fechada", "Cancelada"].includes(x.status)).length;
    const expiring = d.certificates.filter(x => { const days = daysUntil(x.expires_at); return days !== null && days >= 0 && days <= 60; });
    const pendingQhse = d.actionItems.filter(x => x.status !== "Concluído").length + d.qhse.filter(x => x.status !== "Concluído").length;
    const downtime = operations.reduce((sum, op) => sum + Number(op.paused_minutes || 0), 0);
    const lowChemicals = d.chemicals.filter(x => x.quantity <= x.minimum).length;
    const expiringChemicals = d.chemicals.filter(x => { const days = daysUntil(x.expiry_date); return days !== null && days >= 0 && days <= 60; }).length;
    const criticalAlerts = d.systemAlerts.filter(x => String(x.level).toLowerCase() === "alta").length;

    const byClient = {};
    operations.forEach(op => { byClient[op.client] = (byClient[op.client] || 0) + Number(op.executed || 0); });
    const clientRows = Object.entries(byClient).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const maxClient = Math.max(...clientRows.map(x => x[1]), 1);
    const productTotals = {};
    operations.forEach(op => { productTotals[op.product] = (productTotals[op.product] || 0) + Number(op.executed || 0); });
    const products = Object.entries(productTotals).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const clients = [...new Set(d.operations.map(x => x.client).filter(Boolean))].sort();
    const productNames = [...new Set(d.operations.map(x => x.product).filter(Boolean))].sort();

    $("#page-dashboard").innerHTML =
      header("Visão gerencial", "Indicadores operacionais, riscos e produtividade em tempo real.",
        `<button class="btn secondary" data-export="operations">Exportar CSV</button>
         <button class="btn secondary" data-action="refresh">↻ Atualizar</button>
         <button class="btn primary" data-action="new-operation">+ Nova operação</button>`) +
      `<div class="card dashboard-filters no-print">
        <div><label>Data inicial</label><input id="filterStart" type="date" value="${esc(state.filters.start)}"></div>
        <div><label>Data final</label><input id="filterEnd" type="date" value="${esc(state.filters.end)}"></div>
        <div><label>Cliente</label><select id="filterClient"><option value="">Todos</option>${clients.map(x => `<option ${state.filters.client === x ? "selected" : ""}>${esc(x)}</option>`).join("")}</select></div>
        <div><label>Produto</label><select id="filterProduct"><option value="">Todos</option>${productNames.map(x => `<option ${state.filters.product === x ? "selected" : ""}>${esc(x)}</option>`).join("")}</select></div>
        <div class="filter-actions"><button class="btn primary" data-action="apply-dashboard-filters">Aplicar</button><button class="btn secondary" data-action="clear-dashboard-filters">Limpar</button></div>
      </div>

      <div class="grid four" style="margin-top:14px">
        ${statCard("Operações hoje", fmt.format(todayOps), "programadas/iniciadas", "⚓")}
        ${statCard("Carretas hoje", fmt.format(todayTrucks), "movimentações", "🚛")}
        ${statCard("Manutenções abertas", fmt.format(openMaintenance), "ordens pendentes", "⚙")}
        ${statCard("Alertas críticos", fmt.format(criticalAlerts), "exigem atenção", "⚠")}
      </div>

      <div class="grid four" style="margin-top:14px">
        ${statCard("Volume WBM", fmt.format(volume("wbm")), "bbl armazenados", "💧")}
        ${statCard("Volume Brine", fmt.format(volume("brine")), "bbl armazenados", "🟢")}
        ${statCard("Volume SBM", fmt.format(volume("sbm")), "bbl armazenados", "🟤")}
        ${statCard("Olefina", fmt.format(volume("olefin")), "bbl armazenados", "⚪")}
      </div>

      <div class="grid two" style="margin-top:14px">
        <div class="card"><h3>Operações em andamento</h3><p>${activeOps.length} operação(ões) ativa(s)</p>
          ${activeOps.length ? activeOps.slice(0, 5).map(op => {
            const pct = op.planned ? Math.min(100, Math.round(op.executed / op.planned * 100)) : 0;
            return `<div class="operation-mini"><div class="kpi-row"><div><strong>${esc(op.client)} • ${esc(op.vessel)}</strong><span class="muted">${esc(op.activity)} — ${esc(op.product)}</span></div>${badge(op.status)}</div><div class="progress"><span style="width:${pct}%"></span></div><small>${fmt.format(op.executed)} / ${fmt.format(op.planned)} ${esc(op.unit)} • ${fmt.format(operationFlow(op))} ${esc(op.unit)}/h</small></div>`;
          }).join("") : `<div class="empty">Nenhuma operação ativa.</div>`}
        </div>
        <div class="card"><h3>Indicadores críticos</h3><div class="kpi-list" style="margin-top:15px">
          <div class="kpi-row"><span>Tanques bloqueados</span><strong>${d.tanks.filter(x => x.status === "Bloqueado").length}</strong></div>
          <div class="kpi-row"><span>Pendências QHSE</span><strong>${pendingQhse}</strong></div>
          <div class="kpi-row"><span>Tempo parado acumulado</span><strong>${fmt.format(downtime / 60)} h</strong></div>
          <div class="kpi-row"><span>Certificados a vencer</span><strong>${expiring.length}</strong></div>
          <div class="kpi-row"><span>Químicos em baixo estoque</span><strong>${lowChemicals}</strong></div>
          <div class="kpi-row"><span>Lotes químicos vencendo</span><strong>${expiringChemicals}</strong></div>
        </div></div>
      </div>

      <div class="grid two" style="margin-top:14px">
        <div class="card"><h3>Volume executado por cliente</h3><div class="bar-list">${clientRows.length ? clientRows.map(([name, value]) => `<div class="bar-row"><div><span>${esc(name)}</span><strong>${fmt.format(value)}</strong></div><div class="bar-track"><span style="width:${value / maxClient * 100}%"></span></div></div>`).join("") : `<div class="empty">Sem operações no filtro.</div>`}</div></div>
        <div class="card"><h3>Produtos mais movimentados</h3><div class="ranking-list">${products.length ? products.map(([name, value], index) => `<div class="ranking-row"><span class="rank">${index + 1}</span><div><strong>${esc(name)}</strong><small>${fmt.format(value)} movimentados</small></div></div>`).join("") : `<div class="empty">Sem movimentações no filtro.</div>`}</div></div>
      </div>

      <div class="card smart-query" style="margin-top:14px"><div><h3>Consulta inteligente</h3><p>Pergunte sobre volumes, clientes, carretas, tanques, químicos, certificados ou diesel.</p></div><div class="smart-input"><input id="smartQuestion" placeholder="Ex.: Quantos bbl de Brine temos?"><button class="btn primary" data-action="smart-query">Perguntar</button></div><div id="smartAnswer" class="smart-answer hidden"></div></div>`;
  }

  function renderOperations() {
    const operations = filteredOperations();
    const rows = operations.map(op => {
      const pct = op.planned ? Math.min(100, Math.round(op.executed / op.planned * 100)) : 0;
      const flow = operationFlow(op);
      const canEdit = isAdmin() || !op.locked || hasRole(["supervisor"]);
      const source = state.data.tanks.find(t => t.id === op.source_tank_id)?.name;
      const destination = state.data.tanks.find(t => t.id === op.destination_tank_id)?.name;
      const tankLabel = source ? `Origem: ${source}` : destination ? `Destino: ${destination}` : "Não vinculada";
      const tankStatus = op.tank_movement_applied ? "Aplicada" : op.apply_tank_movement ? "Preparada" : "Manual";
      return `<tr>
        <td><strong>${esc(op.client)}</strong><br><small>${esc(op.vessel)}</small><br><small>OS: ${esc(op.service_order || "-")}</small></td>
        <td>${esc(op.activity)}<br><small>${esc(op.product)} • ${esc(op.lot || "-")}</small></td>
        <td>${fmt.format(op.executed)} / ${fmt.format(op.planned)} ${esc(op.unit)}<div class="progress"><span style="width:${pct}%"></span></div></td>
        <td><strong>${fmt.format(flow)} ${esc(op.unit)}/h</strong><br><small>${fmt.format(operationHours(op))} h líquidas</small></td>
        <td><strong>${esc(tankLabel)}</strong><br>${badge(tankStatus)}</td>
        <td>${badge(op.status)}${op.locked ? `<br><span class="tag">🔒 Encerrada</span>` : ""}</td>
        <td>${dateTime(op.start_at)}<br><small>${op.end_at ? `Fim: ${dateTime(op.end_at)}` : "Sem término"}</small></td>
        <td><div class="row-actions">
          <button class="btn small secondary" data-operation-timeline="${op.id}">Timeline</button>
          <button class="btn small secondary" data-attachments="operation:${op.id}" data-attachment-title="${esc(op.vessel)}">📎 ${attachmentCount("operation", op.id)}</button>
          ${hasRole(["supervisor", "lider", "operador"]) && op.status === "Concluída" && !op.tank_movement_applied && tankMovementMode(op.activity) !== "none" ? `<button class="btn small soft" data-apply-operation-tank="${op.id}">Aplicar no tanque</button>` : ""}
          ${canEdit ? `<button class="btn small primary" data-edit-operation="${op.id}">Editar</button>` : ""}
        </div></td>
      </tr>`;
    }).join("");

    const mobile = operations.map(op => {
      const source = state.data.tanks.find(t => t.id === op.source_tank_id)?.name;
      const destination = state.data.tanks.find(t => t.id === op.destination_tank_id)?.name;
      return `<div class="card mobile-record-card"><div class="mobile-record-head"><div><strong>${esc(op.client)}</strong><small>${esc(op.vessel)} • ${esc(op.activity)}</small></div>${badge(op.status)}</div><div class="mobile-record-grid"><span>Produto<strong>${esc(op.product)}</strong></span><span>Executado<strong>${fmt.format(op.executed)} ${esc(op.unit)}</strong></span><span>Tancagem<strong>${esc(source || destination || "Manual")}</strong></span><span>Vazão<strong>${fmt.format(operationFlow(op))} ${esc(op.unit)}/h</strong></span></div><div class="row-actions"><button class="btn small secondary" data-operation-timeline="${op.id}">Timeline</button>${isAdmin() || !op.locked || hasRole(["supervisor"]) ? `<button class="btn small primary" data-edit-operation="${op.id}">Editar</button>` : ""}</div></div>`;
    }).join("");

    $("#page-operations").innerHTML =
      header("Operações", "Planejamento, timeline, vazão, tancagem automática e documentos.",
        `<button class="btn secondary" data-export="operations">Exportar CSV</button><button class="btn primary" data-action="new-operation">+ Nova operação</button>`) +
      `<div class="card table-wrap desktop-record-table"><table class="data-table"><thead><tr><th>Cliente / Embarcação</th><th>Atividade / Produto</th><th>Progresso</th><th>Vazão</th><th>Tancagem</th><th>Status</th><th>Período</th><th>Ações</th></tr></thead><tbody>${rows || `<tr><td colspan="8" class="empty">Nenhuma operação cadastrada.</td></tr>`}</tbody></table></div><div class="mobile-record-list">${mobile || `<div class="empty">Nenhuma operação cadastrada.</div>`}</div>`;
  }

  function operationForm(op = {}) {
    const responsibleOptions = state.data.users.map(user => `<option value="${user.id}" ${op.responsible_id === user.id ? "selected" : ""}>${esc(user.name)}</option>`).join("");
    const tankOptions = state.data.tanks.map(tank => `<option value="${tank.id}" ${op.source_tank_id === tank.id || op.destination_tank_id === tank.id ? "selected" : ""}>${esc(tank.name)} — ${fmt.format(tank.volume)}/${fmt.format(tank.capacity)} ${esc(tank.unit)} — ${esc(tank.product || "Vazio")}</option>`).join("");
    const applied = op.tank_movement_applied === true && !isAdmin();
    return `<form id="operationForm" data-id="${op.id || ""}"><div class="form-grid">
      <div><label>Cliente *</label><input name="client" required value="${esc(op.client || "")}"></div>
      <div><label>Embarcação *</label><input name="vessel" required value="${esc(op.vessel || "")}"></div>
      <div><label>Ordem de serviço</label><input name="service_order" value="${esc(op.service_order || "")}"></div>
      <div><label>Responsável</label><select name="responsible_id"><option value="">Não definido</option>${responsibleOptions}</select></div>
      <div><label>Atividade *</label><select name="activity" ${applied ? "disabled" : ""}>${["Bombeio", "Backload", "Fabricação", "Tratamento", "Carregamento", "Descarga"].map(x => `<option ${op.activity === x ? "selected" : ""}>${x}</option>`).join("")}</select>${applied ? `<input type="hidden" name="activity" value="${esc(op.activity)}">` : ""}</div>
      <div><label>Produto *</label><input name="product" required value="${esc(op.product || "")}" ${applied ? "readonly" : ""}></div>
      <div><label>Lote</label><input name="lot" value="${esc(op.lot || "")}" ${applied ? "readonly" : ""}></div>
      <div><label>Unidade</label><select name="unit" ${applied ? "disabled" : ""}>${["bbl", "ton", "m³"].map(x => `<option ${op.unit === x ? "selected" : ""}>${x}</option>`).join("")}</select>${applied ? `<input type="hidden" name="unit" value="${esc(op.unit)}">` : ""}</div>
      <div><label>Quantidade planejada *</label><input name="planned" type="number" min="0" step="0.01" required value="${op.planned ?? 0}"></div>
      <div><label>Quantidade executada</label><input name="executed" type="number" min="0" step="0.01" value="${op.executed ?? 0}" ${applied ? "readonly" : ""}></div>
      <div><label>Início</label><input name="start_at" type="datetime-local" value="${toLocalInput(op.start_at)}"></div>
      <div><label>Término</label><input name="end_at" type="datetime-local" value="${toLocalInput(op.end_at)}"></div>
      <div><label>Tempo parado (minutos)</label><input name="paused_minutes" type="number" min="0" value="${op.paused_minutes ?? 0}"></div>
      <div><label>Status</label><select name="status">${["Programada", "Em andamento", "Paralisada", "Concluída", "Cancelada"].map(x => `<option ${op.status === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>
      <div class="wide tank-automation-box">
        <div class="check-line"><input id="applyTankMovement" name="apply_tank_movement" type="checkbox" data-applied="${applied}" ${op.apply_tank_movement || applied ? "checked" : ""} ${applied ? "disabled" : ""}><label for="applyTankMovement">Atualizar a volumetria automaticamente ao concluir</label></div>
        <small id="operationTankHint" class="field-help"></small>
        ${applied ? `<div class="info-box">Movimentação aplicada em ${dateTime(op.tank_movement_applied_at)}. Quantidade, produto, lote e tanque ficam protegidos contra alteração.</div>` : ""}
      </div>
      <div class="wide tank-source-field"><label>Tanque ou silo de origem *</label><select name="source_tank_id"><option value="">Selecione a origem</option>${state.data.tanks.map(tank => `<option value="${tank.id}" ${op.source_tank_id === tank.id ? "selected" : ""}>${esc(tank.name)} — ${fmt.format(tank.volume)} ${esc(tank.unit)} — ${esc(tank.product || "Vazio")}</option>`).join("")}</select></div>
      <div class="wide tank-destination-field"><label>Tanque ou silo de destino *</label><select name="destination_tank_id"><option value="">Selecione o destino</option>${state.data.tanks.map(tank => `<option value="${tank.id}" ${op.destination_tank_id === tank.id ? "selected" : ""}>${esc(tank.name)} — livre ${fmt.format(Math.max(0, tank.capacity - tank.volume))} ${esc(tank.unit)} — ${esc(tank.product || "Vazio")}</option>`).join("")}</select></div>
      <div class="wide"><label>Ocorrência</label><textarea name="occurrence" placeholder="Falhas, adernação, solicitação da embarcação...">${esc(op.occurrence || "")}</textarea></div>
      <div class="wide"><label>Observações</label><textarea name="notes">${esc(op.notes || "")}</textarea></div>
      <div class="wide"><label>Documentos ou fotos</label><input name="attachment" type="file" accept=".pdf,image/jpeg,image/png,image/webp,image/heic,image/heif" multiple capture="environment"><small class="field-help">PDF ou fotos, até 20 MB por arquivo.</small></div>
      ${hasRole(["supervisor"]) ? `<div class="wide check-line"><input id="lockOperation" name="locked" type="checkbox" ${op.locked ? "checked" : ""}><label for="lockOperation">Bloquear edição após o encerramento</label></div>` : ""}
    </div>${formActions("Salvar operação")}</form>`;
  }

  function renderTanks() {
    $("#page-tanks").innerHTML =
      header("Tanques e silos", "Volumetria, transferências, produto, lote, status e histórico.",
        `<button class="btn secondary" data-export="tanks">Exportar CSV</button>${hasRole(["supervisor", "lider", "operador", "logistica"]) ? `<button class="btn primary" data-action="new-tank-transfer">Transferir entre tanques</button>` : ""}`) +
      ["Phase #1", "Phase #2"].map(phase => {
        const phaseItems = state.data.tanks
          .filter(item => item.phase === phase)
          .sort((a, b) => a.order - b.order);
        const tanks = phaseItems.filter(item => String(item.kind).toLowerCase() !== "silo");
        const silos = phaseItems.filter(item => String(item.kind).toLowerCase() === "silo");

        return `<section class="tancagem-phase-block">
          <div class="phase-heading"><div><span>ÁREA OPERACIONAL</span><h2>${phase}</h2></div><small>${tanks.length} tanque(s) • ${silos.length} silo(s)</small></div>
          <div class="asset-group tank-asset-group">
            <div class="asset-group-heading"><div class="asset-group-icon tank-group-icon">TK</div><div><h3>Tanques e Mix Tanks</h3><p>Fluidos, salmouras e produtos líquidos.</p></div></div>
            <div class="grid tank-grid compact-tank-grid">${tanks.map(tankCard).join("") || `<div class="empty asset-empty">Nenhum tanque nesta fase.</div>`}</div>
          </div>
          <div class="asset-group silo-asset-group">
            <div class="asset-group-heading"><div class="asset-group-icon silo-group-icon">SL</div><div><h3>Silos de Granéis</h3><p>Barita, bentonita, calcita e outros granéis.</p></div></div>
            <div class="grid tank-grid compact-tank-grid silo-grid">${silos.map(tankCard).join("") || `<div class="empty asset-empty">Nenhum silo nesta fase.</div>`}</div>
          </div>
        </section>`;
      }).join("");
  }

  function tankCard(tank) {
    const volume = Number(tank.volume || 0);
    const capacity = Number(tank.capacity || 0);
    const pct = capacity > 0 ? Math.max(0, Math.min(100, (volume / capacity) * 100)) : 0;
    // Um saldo positivo muito pequeno ainda precisa ficar visível na faixa.
    const visualPct = volume > 0 ? Math.max(1.5, pct) : 0;
    const updater = state.data.users.find(user => user.id === tank.updated_by)?.name || "Não informado";
    const productType = productClass(tank.product, tank.kind, volume);
    const volumeState = volume > 0 ? "has-volume" : "no-volume";

    return `<div class="card tank-card compact-tank-card">
      <div class="tank-top">
        <div>
          <h3>${esc(tank.name)}</h3>
          <span class="tag">${esc(tank.kind)}</span>
        </div>
        ${badge(tank.status)}
      </div>

      <div class="compact-tank-product">
        <strong>${esc(tank.product || (volume > 0 ? "Produto não informado" : "Sem produto"))}</strong>
        <span>Lote: ${esc(tank.lot || "-")}${volume > 0 && !tank.product ? ` • volume registrado` : ""}</span>
        <span>Densidade: ${tank.density !== null && tank.density !== undefined ? `${fmt.format(tank.density)} ${esc(tank.densityUnit || (String(tank.kind).toLowerCase().includes("silo") ? "t/m³" : "ppg"))}` : "não informada"}</span>
      </div>

      <div class="tank-volume-line">
        <strong>${fmt.format(volume)} ${esc(tank.unit)}</strong>
        <span>de ${fmt.format(capacity)} ${esc(tank.unit)}</span>
      </div>

      <div class="tank-progress ${productType} ${volumeState}" data-volume="${volume}" data-kind="${esc(tank.kind)}" role="progressbar"
        aria-label="Ocupação de ${esc(tank.name)}"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow="${pct.toFixed(1)}">
        <span style="width:${visualPct.toFixed(2)}%" title="${fmt.format(pct)}% ocupado"></span>
      </div>

      <div class="tank-progress-caption">
        <strong>${fmt.format(pct)}%</strong>
        <span>${fmt.format(Math.max(0, capacity - volume))} ${esc(tank.unit)} livres</span>
      </div>

      <div class="tank-update-meta">
        <span>Atualizado por: ${esc(updater)}</span>
        <span>${dateTime(tank.updated_at)}</span>
      </div>

      <div class="row-actions">
        ${hasRole(["supervisor", "lider", "operador", "logistica"]) ? `<button class="btn small primary" data-edit-tank="${tank.id}">${isAdmin() ? "Editar tudo" : "Atualizar volume"}</button>` : ""}
        <button class="btn small secondary" data-tank-history="${tank.id}">Histórico</button>
        <button class="btn small secondary" data-tank-movements="${tank.id}">Movimentações</button>
      </div>
    </div>`;
  }

  function tankTransferForm() {
    const sourceOptions = state.data.tanks.filter(tank => tank.volume > 0).map(tank => `<option value="${tank.id}">${esc(tank.name)} — ${fmt.format(tank.volume)} ${esc(tank.unit)} — ${esc(tank.product || "Sem produto")}</option>`).join("");
    const destinationOptions = state.data.tanks.map(tank => `<option value="${tank.id}">${esc(tank.name)} — livre ${fmt.format(Math.max(0, tank.capacity - tank.volume))} ${esc(tank.unit)} — ${esc(tank.product || "Vazio")}</option>`).join("");
    return `<form id="tankTransferForm"><div class="form-grid">
      <div class="wide"><label>Origem *</label><select name="source_tank_id" required><option value="">Selecione</option>${sourceOptions}</select></div>
      <div class="wide"><label>Destino *</label><select name="destination_tank_id" required><option value="">Selecione</option>${destinationOptions}</select></div>
      <div><label>Quantidade *</label><input name="quantity" type="text" inputmode="decimal" required placeholder="Ex.: 250"></div>
      <div><label>Referência</label><input name="reference" placeholder="OS, operação ou motivo"></div>
      <div class="wide"><label>Observações</label><textarea name="notes"></textarea></div>
    </div><div id="transferPreview" class="info-box">Selecione a origem, o destino e a quantidade.</div>${formActions("Confirmar transferência")}</form>`;
  }

  function updateTransferPreview(form) {
    if (!form) return;
    const source = state.data?.tanks?.find(t => t.id === form.elements.source_tank_id?.value);
    const destination = state.data?.tanks?.find(t => t.id === form.elements.destination_tank_id?.value);
    const quantity = parseTankVolume(form.elements.quantity?.value);
    const box = form.querySelector("#transferPreview");
    if (!box) return;
    if (!source || !destination || !Number.isFinite(quantity) || quantity <= 0) {
      box.textContent = "Selecione a origem, o destino e a quantidade.";
      return;
    }
    box.textContent = `${source.name}: ${fmt.format(source.volume)} → ${fmt.format(source.volume - quantity)} ${source.unit} | ${destination.name}: ${fmt.format(destination.volume)} → ${fmt.format(destination.volume + quantity)} ${destination.unit}`;
  }


  function defaultDensityUnit(category = "", kind = "") {
    const categoryText = String(category || "").toLowerCase();
    const kindText = String(kind || "").toLowerCase();
    return kindText.includes("silo") || ["granel", "insumo"].includes(categoryText) ? "t/m³" : "ppg";
  }

  function compatibleTankFluids(tank) {
    const isSilo = String(tank.kind || "").toLowerCase().includes("silo");
    return (state.data.fluids || [])
      .filter(item => item.active !== false || item.id === tank.fluidTypeId)
      .filter(item => {
        if (item.id === tank.fluidTypeId) return true;
        const category = String(item.type || "").toLowerCase();
        return isSilo ? ["granel", "insumo"].includes(category) : !["granel", "insumo"].includes(category);
      })
      .sort((a, b) => `${a.type} ${a.name}`.localeCompare(`${b.type} ${b.name}`, "pt-BR"));
  }

  function catalogProductOptions(tank) {
    const groups = new Map();
    compatibleTankFluids(tank).forEach(item => {
      const group = item.type || "Outros";
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push(item);
    });

    return [...groups.entries()].map(([group, items]) =>
      `<optgroup label="${esc(group)}">${items.map(item => `
        <option value="${item.id}"
          data-product="${esc(item.name)}"
          data-density="${item.density || ""}"
          data-density-unit="${esc(item.densityUnit || defaultDensityUnit(item.type, tank.kind))}"
          ${tank.fluidTypeId === item.id ? "selected" : ""}>
          ${esc(item.name)}${item.density ? ` — ${fmt.format(item.density)} ${esc(item.densityUnit || defaultDensityUnit(item.type, tank.kind))}` : ""}
        </option>`).join("")}</optgroup>`
    ).join("");
  }

  function syncTankCatalogFields(form) {
    if (!form) return;
    const select = form.elements.fluid_type_id;
    const option = select?.selectedOptions?.[0];
    const customWrap = form.querySelector("[data-custom-product-wrap]");
    const productInput = form.elements.product;
    const densityInput = form.elements.density;
    const densityUnit = form.elements.density_unit;
    const tankKind = form.dataset.tankKind || "";

    if (!select || !option) return;

    if (select.value === "__custom__") {
      customWrap?.classList.remove("hidden");
      productInput?.focus();
      if (!densityUnit.value) densityUnit.value = defaultDensityUnit("", tankKind);
      return;
    }

    customWrap?.classList.add("hidden");

    if (!select.value) {
      if (productInput) productInput.value = "";
      if (densityInput) densityInput.value = "";
      if (densityUnit) densityUnit.value = defaultDensityUnit("", tankKind);
      return;
    }

    if (productInput) productInput.value = option.dataset.product || option.textContent.trim();
    if (densityInput) densityInput.value = option.dataset.density || "";
    if (densityUnit) densityUnit.value = option.dataset.densityUnit || defaultDensityUnit("", tankKind);
  }

  function syncFluidDensityUnit(form) {
    if (!form) return;
    const category = form.elements.type?.value || "";
    const densityUnit = form.elements.density_unit;
    if (densityUnit) densityUnit.value = defaultDensityUnit(category, "");
  }

  function tankForm(tank) {
    const admin = isAdmin();
    const linkedFluid = (state.data.fluids || []).find(item => item.id === tank.fluidTypeId);
    const customCurrent = Boolean(tank.product && !linkedFluid);
    const currentDensity = tank.density ?? linkedFluid?.density ?? "";
    const currentDensityUnit = tank.densityUnit || linkedFluid?.densityUnit || defaultDensityUnit(linkedFluid?.type, tank.kind);

    return `<form id="tankForm" data-admin-full="${admin ? "true" : "false"}" data-tank-kind="${esc(tank.kind)}" novalidate>
      <input type="hidden" name="id" value="${tank.id}">
      <div class="form-grid">
        ${admin ? `
          <div><label>Nome *</label><input name="name" required value="${esc(tank.name)}"></div>
          <div><label>Fase *</label><select name="phase">${["Phase #1", "Phase #2"].map(x => `<option ${tank.phase === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>
          <div><label>Tipo *</label><select name="kind">${["Tanque", "Mix Tank", "Silo"].map(x => `<option ${tank.kind === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>
          <div><label>Ordem de exibição</label><input name="display_order" type="number" min="0" step="1" value="${tank.order ?? 0}"></div>
          <div><label>Capacidade *</label><input name="capacity" type="text" inputmode="decimal" value="${String(tank.capacity).replace(".", ",")}" required></div>
          <div><label>Unidade *</label><select name="unit">${["bbl", "ton", "m³"].map(x => `<option ${tank.unit === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>
        ` : `
          <div><label>Tanque ou silo</label><input value="${esc(tank.name)}" disabled></div>
          <div><label>Capacidade</label><input value="${fmt.format(tank.capacity)} ${esc(tank.unit)}" disabled></div>
        `}

        <div><label>Status</label><select name="status">${["Disponível", "Liberado", "Em uso", "Bloqueado", "Limpeza", "Manutenção"].map(x => `<option ${tank.status === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>
        <div>
          <label>Volume atual (${esc(tank.unit)}) *</label>
          <input name="volume" type="text" inputmode="decimal" autocomplete="off" value="${String(tank.volume).replace(".", ",")}" required>
          <small class="field-help">Ex.: 850 ou 850,50.</small>
        </div>

        <div class="wide">
          <label>Produto cadastrado em Fluidos e Granéis</label>
          <select name="fluid_type_id" data-tank-product-select>
            <option value="" ${!tank.fluidTypeId && !customCurrent ? "selected" : ""}>Sem produto</option>
            ${catalogProductOptions(tank)}
            <option value="__custom__" ${customCurrent ? "selected" : ""}>Outro produto — preenchimento manual</option>
          </select>
          <small class="field-help">Tanques exibem fluidos; silos exibem granéis e insumos.</small>
        </div>

        <div class="wide ${customCurrent ? "" : "hidden"}" data-custom-product-wrap>
          <label>Produto manual</label>
          <input name="product" value="${esc(customCurrent ? tank.product : linkedFluid?.name || "")}" placeholder="Informe o produto">
        </div>

        <div>
          <label>Densidade</label>
          <input name="density" type="text" inputmode="decimal" value="${currentDensity === "" ? "" : String(currentDensity).replace(".", ",")}" placeholder="Ex.: 9,7 ou 4,10">
        </div>
        <div>
          <label>Unidade da densidade</label>
          <select name="density_unit">
            <option value="ppg" ${currentDensityUnit === "ppg" ? "selected" : ""}>ppg</option>
            <option value="t/m³" ${currentDensityUnit === "t/m³" ? "selected" : ""}>t/m³</option>
          </select>
        </div>

        <div class="wide"><label>Lote</label><input name="lot" value="${esc(tank.lot)}"></div>
        ${admin ? `<div class="wide admin-edit-notice"><strong>Modo administrador</strong><span>Você pode alterar toda a configuração. Produto e densidade ficam vinculados ao cadastro de Fluidos e Granéis.</span></div>` : ""}
      </div>

      <div id="tankSaveMessage" class="message hidden"></div>
      <div class="form-actions">
        <button type="button" class="btn secondary" data-close-modal>Cancelar</button>
        <button type="button" class="btn primary" data-action="save-tank-volume">${admin ? "Salvar todas as alterações" : "Salvar atualização"}</button>
      </div>
    </form>`;
  }

  function renderFluids() {
    const rows = state.data.fluids.map(item => `<tr>
      <td><strong>${esc(item.name)}</strong><br><small>${item.density ? `${fmt.format(item.density)} ${esc(item.densityUnit || defaultDensityUnit(item.type))}` : "Densidade não informada"}</small></td>
      <td>${badge(item.type)}</td>
      <td>${esc(item.unit || "-")}</td>
      <td>${esc(item.densityUnit || defaultDensityUnit(item.type))}</td>
      <td>${badge(item.active ? "Ativo" : "Inativo")}</td>
      <td><div class="row-actions"><button class="btn small secondary" data-attachments="fluid:${item.id}" data-attachment-title="${esc(item.name)}">📎 ${attachmentCount("fluid", item.id)}</button>${isAdmin() ? `<button class="btn small primary" data-edit-fluid="${item.id}">Editar</button>` : ""}</div></td>
    </tr>`).join("");
    $("#page-fluids").innerHTML =
      header("Fluidos e granéis", "Catálogo vinculado à tancagem, com densidade padrão e documentos.",
        hasRole(["supervisor", "lider", "logistica"]) ? `<button class="btn primary" data-action="new-fluid">+ Adicionar produto</button>` : "") +
      `<div class="info-box" style="margin-bottom:14px">Os produtos ativos desta aba aparecem automaticamente na lista de atualização dos tanques e silos.</div>
       <div class="card table-wrap"><table class="data-table"><thead><tr><th>Produto</th><th>Classificação</th><th>Unidade de estoque</th><th>Unidade da densidade</th><th>Status</th><th>Ações</th></tr></thead><tbody>${rows || `<tr><td colspan="6" class="empty">Nenhum produto cadastrado.</td></tr>`}</tbody></table></div>`;
  }


  function chemicalDisplayStatus(item) {
    const days = daysUntil(item.expiry_date);
    if (days !== null && days < 0) return "Vencido";
    if (item.quantity <= item.minimum) return "Baixo estoque";
    if (days !== null && days <= 60) return "Próximo vencimento";
    return item.status || "Disponível";
  }

  function renderChemicalInventory() {
    const items = state.data.chemicals || [];
    const totalLots = items.length;
    const lowStock = items.filter(item => item.quantity <= item.minimum).length;
    const expired = items.filter(item => { const days = daysUntil(item.expiry_date); return days !== null && days < 0; }).length;
    const expiring = items.filter(item => { const days = daysUntil(item.expiry_date); return days !== null && days >= 0 && days <= 60; }).length;
    const fefoOrder = [...items].filter(x => x.quantity > 0).sort((a, b) => (a.expiry_date || "9999-12-31").localeCompare(b.expiry_date || "9999-12-31"));
    const fefoRank = new Map(fefoOrder.map((item, index) => [item.id, index + 1]));

    const rows = items.map(item => {
      const status = chemicalDisplayStatus(item);
      const days = daysUntil(item.expiry_date);
      const canMove = hasRole(["supervisor", "lider", "logistica", "qhse"]);
      return `<tr><td><strong>${esc(item.name)}</strong><br><small>${esc(item.category || "Produto químico")}</small></td><td>${esc(item.lot || "-")}<br><small>FEFO #${fefoRank.get(item.id) || "-"}</small></td><td><strong>${fmt.format(item.quantity)} ${esc(item.unit)}</strong><br><small>Mínimo: ${fmt.format(item.minimum)} ${esc(item.unit)}</small></td><td>${dateOnly(item.expiry_date)}${days !== null ? `<br><small>${days < 0 ? `${Math.abs(days)} dias vencido` : `${days} dias restantes`}</small>` : ""}</td><td>${esc(item.location || "-")}</td><td>${badge(status)}</td><td><div class="row-actions">${canMove ? `<button class="btn small primary" data-chemical-move="${item.id}">Movimentar</button><button class="btn small secondary" data-edit-chemical="${item.id}">Editar</button>` : ""}<button class="btn small secondary" data-chemical-history="${item.id}">Histórico</button><button class="btn small secondary" data-attachments="chemical:${item.id}" data-attachment-title="${esc(item.name)}">📎 ${attachmentCount("chemical", item.id)}</button></div></td></tr>`;
    }).join("");

    const mobile = items.map(item => `<div class="card mobile-record-card"><div class="mobile-record-head"><div><strong>${esc(item.name)}</strong><small>Lote ${esc(item.lot || "-")} • FEFO #${fefoRank.get(item.id) || "-"}</small></div>${badge(chemicalDisplayStatus(item))}</div><div class="mobile-record-grid"><span>Saldo<strong>${fmt.format(item.quantity)} ${esc(item.unit)}</strong></span><span>Mínimo<strong>${fmt.format(item.minimum)} ${esc(item.unit)}</strong></span><span>Validade<strong>${dateOnly(item.expiry_date)}</strong></span><span>Local<strong>${esc(item.location || "-")}</strong></span></div><div class="row-actions"><button class="btn small primary" data-chemical-move="${item.id}">Movimentar</button>${isAdmin() ? `<button class="btn small secondary" data-edit-chemical="${item.id}">Editar</button>` : ""}<button class="btn small secondary" data-chemical-history="${item.id}">Histórico</button></div></div>`).join("");

    $("#page-chemicals").innerHTML = header("Inventário de produtos químicos", "Saldo por produto e lote, FEFO, validade, estoque mínimo e rastreabilidade.", `${hasRole(["supervisor", "lider", "logistica", "qhse"]) ? `<button class="btn primary" data-action="new-chemical">+ Novo produto/lote</button>` : ""}<button class="btn secondary" data-action="show-fefo">Ordem FEFO</button><button class="btn secondary" data-export="chemicals">Exportar CSV</button>`) +
      `<div class="grid four">${statCard("Produtos e lotes", fmt.format(totalLots), "itens cadastrados", "▧")}${statCard("Baixo estoque", fmt.format(lowStock), "abaixo do mínimo", "⚠")}${statCard("Próximos do vencimento", fmt.format(expiring), "até 60 dias", "⏳")}${statCard("Vencidos", fmt.format(expired), "exigem tratamento", "✕")}</div>
      <div class="card table-wrap desktop-record-table" style="margin-top:14px"><table class="data-table"><thead><tr><th>Produto</th><th>Lote / FEFO</th><th>Saldo</th><th>Validade</th><th>Localização</th><th>Status</th><th>Ações</th></tr></thead><tbody>${rows || `<tr><td colspan="7" class="empty">Nenhum produto químico cadastrado.</td></tr>`}</tbody></table></div><div class="mobile-record-list">${mobile}</div>`;
  }

  function renderTrucks() {
    const trucks = filteredTrucks();
    const rows = trucks.map(item => `<tr><td>${dateOnly(item.date)}</td><td>${badge(item.movement)}</td><td>${esc(item.supplier)}<br><small>${esc(item.client || "-")}</small></td><td><strong>${esc(item.product)}</strong><br><small>${fmt.format(item.quantity)} ${esc(item.unit)} • Lote ${esc(item.lot || "-")}</small></td><td>${esc(item.plate || "-")}<br><small>${esc(item.driver || "-")}</small></td><td>${esc(item.invoice || "-")}</td><td>${badge(item.status)}</td><td><div class="row-actions"><button class="btn small secondary" data-attachments="truck:${item.id}" data-attachment-title="${esc(item.plate || item.product)}">📎 ${attachmentCount("truck", item.id)}</button>${isAdmin() ? `<button class="btn small primary" data-edit-truck="${item.id}">Editar</button>` : ""}</div></td></tr>`).join("");
    const mobile = trucks.map(item => `<div class="card mobile-record-card"><div class="mobile-record-head"><div><strong>${esc(item.product)}</strong><small>${dateOnly(item.date)} • ${esc(item.movement)}</small></div>${badge(item.status)}</div><div class="mobile-record-grid"><span>Quantidade<strong>${fmt.format(item.quantity)} ${esc(item.unit)}</strong></span><span>Origem/Destino<strong>${esc(item.supplier)}</strong></span><span>Placa<strong>${esc(item.plate || "-")}</strong></span><span>NF<strong>${esc(item.invoice || "-")}</strong></span></div>${isAdmin() ? `<div class="row-actions"><button class="btn small primary" data-edit-truck="${item.id}">Editar</button></div>` : ""}</div>`).join("");
    $("#page-trucks").innerHTML = header("Carretas", "Entradas, saídas, NF, motorista e documentos.", `<button class="btn secondary" data-export="trucks">Exportar CSV</button>${hasRole(["supervisor", "lider", "logistica"]) ? `<button class="btn primary" data-action="new-truck">+ Nova movimentação</button>` : ""}`) + `<div class="card table-wrap desktop-record-table"><table class="data-table"><thead><tr><th>Data</th><th>Movimento</th><th>Origem / Cliente</th><th>Produto</th><th>Placa / Motorista</th><th>NF</th><th>Status</th><th>Anexos</th></tr></thead><tbody>${rows || `<tr><td colspan="8" class="empty">Nenhuma movimentação.</td></tr>`}</tbody></table></div><div class="mobile-record-list">${mobile}</div>`;
  }

  function renderQhse() {
    const canAddQhse = hasRole(["supervisor", "lider", "qhse", "operador"]);
    const rows = state.data.qhse.map(item => {
      const openActions = state.data.actionItems.filter(a => a.qhse_record_id === item.id && a.status !== "Concluído").length;
      return `<tr>
        <td>${dateOnly(item.date)}</td><td>${badge(item.type)}</td>
        <td><strong>${esc(item.title)}</strong><br><small>${esc(item.description || "")}</small></td>
        <td>${esc(item.responsible || "-")}</td><td>${badge(item.severity)}</td><td>${badge(item.status)}</td>
        <td><div class="row-actions">
          <button class="btn small secondary" data-qhse-actions="${item.id}">Ações (${openActions})</button>
          <button class="btn small secondary" data-attachments="qhse:${item.id}" data-attachment-title="${esc(item.title)}">📎 ${attachmentCount("qhse", item.id)}</button>${isAdmin() ? `<button class="btn small primary" data-edit-qhse="${item.id}">Editar</button>` : ""}
        </div></td>
      </tr>`;
    }).join("");
    const mobile = state.data.qhse.map(item => {
      const openActions = state.data.actionItems.filter(a => a.qhse_record_id === item.id && a.status !== "Concluído").length;
      return `<div class="card mobile-record-card"><div class="mobile-record-head"><div><strong>${esc(item.title)}</strong><small>${dateOnly(item.date)} • ${esc(item.type)}</small></div>${badge(item.status)}</div><p>${esc(item.description || "Sem descrição")}</p><div class="mobile-record-grid"><span>Responsável<strong>${esc(item.responsible || "-")}</strong></span><span>Severidade<strong>${esc(item.severity)}</strong></span></div><div class="row-actions"><button class="btn small secondary" data-qhse-actions="${item.id}">Ações (${openActions})</button><button class="btn small secondary" data-attachments="qhse:${item.id}" data-attachment-title="${esc(item.title)}">Anexos (${attachmentCount("qhse", item.id)})</button>${isAdmin() ? `<button class="btn small primary" data-edit-qhse="${item.id}">Editar</button>` : ""}</div></div>`;
    }).join("");

    const actions = canAddQhse ? `<button class="btn primary" data-action="new-qhse">+ Novo registro QHSE</button>` : "";
    const quickAction = canAddQhse ? `<div class="module-action-bar"><div class="module-action-copy"><span class="module-action-icon">+</span><div><strong>Adicionar registro QHSE</strong><small>Registre DDS, APR, inspeção, risco, ocorrência ou evidência.</small></div></div><button class="btn primary" data-action="new-qhse">Novo registro</button></div>` : "";

    $("#page-qhse").innerHTML =
      header("QHSE", "DDS, APR, inspeções, riscos, itens de ação e evidências.", actions) + quickAction +
      `<div class="card table-wrap desktop-record-table"><table class="data-table"><thead><tr><th>Data</th><th>Tipo</th><th>Registro</th><th>Responsável</th><th>Severidade</th><th>Status</th><th>Ações</th></tr></thead><tbody>${rows || `<tr><td colspan="7" class="empty">Nenhum registro QHSE cadastrado.</td></tr>`}</tbody></table></div><div class="mobile-record-list">${mobile || `<div class="card empty">Nenhum registro QHSE cadastrado.</div>`}</div>`;
  }

  function renderMaintenance() {
    const canManageMaintenance = hasRole(["supervisor", "lider", "mecanico"]);
    const equipmentRows = state.data.equipment.map(item => {
      const used = Math.max(0, item.diesel_initial + item.refueled - item.diesel_final);
      const average = item.last_hours ? used / item.last_hours : 0;
      const openOrders = state.data.maintenanceOrders.filter(order => order.equipment_id === item.id && !["Concluída", "Fechada", "Cancelada"].includes(order.status)).length;
      const hoursDue = item.maintenance_due_hourmeter > 0 ? item.maintenance_due_hourmeter - item.hourmeter : null;
      const preventive = hoursDue !== null && hoursDue <= 0 ? "Vencida por horímetro" : item.next_maintenance_date ? `${dateOnly(item.next_maintenance_date)}${hoursDue !== null ? ` • ${fmt.format(hoursDue)} h` : ""}` : hoursDue !== null ? `${fmt.format(hoursDue)} h restantes` : "Não programada";
      return `<tr><td><strong>${esc(item.name)}</strong><br><small>${esc(item.category)} • ${esc(item.location || "-")}</small></td><td>${badge(item.status)}</td><td>${fmt.format(item.hourmeter)} h</td><td>${esc(preventive)}</td><td>${fmt.format(used)} L</td><td>${fmt.format(average)} L/h</td><td>${openOrders}</td><td><div class="row-actions">${canManageMaintenance ? `<button class="btn small primary" data-new-order-equipment="${item.id}">Abrir OS</button>` : ""}${isAdmin() ? `<button class="btn small secondary" data-edit-equipment="${item.id}">Editar</button>` : ""}</div></td></tr>`;
    }).join("");
    const orderRows = state.data.maintenanceOrders.map(order => {
      const equipment = state.data.equipment.find(x => x.id === order.equipment_id)?.name || "Equipamento removido";
      return `<tr><td><strong>${esc(order.title)}</strong><br><small>${esc(equipment)} • ${esc(order.maintenance_type)}</small></td><td>${badge(order.priority)}</td><td>${badge(order.status)}</td><td>${esc(order.responsible || "-")}</td><td>${dateOnly(order.due_date)}</td><td>${money.format(order.actual_cost || order.estimated_cost || 0)}</td><td><div class="row-actions"><button class="btn small secondary" data-attachments="maintenance:${order.id}" data-attachment-title="${esc(order.title)}">📎 ${attachmentCount("maintenance", order.id)}</button>${canManageMaintenance ? `<button class="btn small primary" data-edit-order="${order.id}">Editar</button>` : ""}</div></td></tr>`;
    }).join("");
    const mobileOrders = state.data.maintenanceOrders.map(order => {
      const equipment = state.data.equipment.find(x => x.id === order.equipment_id)?.name || "Equipamento removido";
      return `<div class="card mobile-record-card"><div class="mobile-record-head"><div><strong>${esc(order.title)}</strong><small>${esc(equipment)} • ${esc(order.maintenance_type)}</small></div>${badge(order.status)}</div><div class="mobile-record-grid"><span>Prioridade<strong>${esc(order.priority)}</strong></span><span>Prazo<strong>${dateOnly(order.due_date)}</strong></span><span>Responsável<strong>${esc(order.responsible || "-")}</strong></span><span>Custo<strong>${money.format(order.actual_cost || order.estimated_cost || 0)}</strong></span></div><div class="row-actions"><button class="btn small secondary" data-attachments="maintenance:${order.id}" data-attachment-title="${esc(order.title)}">Anexos (${attachmentCount("maintenance", order.id)})</button>${canManageMaintenance ? `<button class="btn small primary" data-edit-order="${order.id}">Editar</button>` : ""}</div></div>`;
    }).join("");

    const headerActions = `<button class="btn secondary" data-export="maintenance">Exportar CSV</button>${canManageMaintenance ? `<button class="btn secondary" data-action="new-equipment">+ Novo equipamento</button><button class="btn primary" data-action="new-maintenance-order">+ Nova ordem de serviço</button>` : ""}`;
    const quickActions = canManageMaintenance ? `<div class="module-action-grid"><button class="module-action-card" data-action="new-equipment"><span class="module-action-card-icon">EQ</span><span><strong>Adicionar equipamento</strong><small>Cadastre motor a diesel, bomba, compressor ou outro ativo.</small></span><b>+</b></button><button class="module-action-card primary-action-card" data-action="new-maintenance-order"><span class="module-action-card-icon">OS</span><span><strong>Abrir ordem de serviço</strong><small>Registre manutenção preventiva ou corretiva.</small></span><b>+</b></button></div>` : "";

    $("#page-maintenance").innerHTML = header("Manutenção", "Equipamentos, preventiva, horímetro, diesel e ordens de serviço.", headerActions) + quickActions + `<div class="section-title">Equipamentos</div><div class="card table-wrap"><table class="data-table"><thead><tr><th>Equipamento</th><th>Status</th><th>Horímetro</th><th>Preventiva</th><th>Diesel</th><th>Média</th><th>OS abertas</th><th>Ação</th></tr></thead><tbody>${equipmentRows || `<tr><td colspan="8" class="empty">Nenhum equipamento cadastrado.</td></tr>`}</tbody></table></div><div class="section-title">Ordens de serviço</div><div class="card table-wrap desktop-record-table"><table class="data-table"><thead><tr><th>Ordem</th><th>Prioridade</th><th>Status</th><th>Responsável</th><th>Prazo</th><th>Custo</th><th>Ações</th></tr></thead><tbody>${orderRows || `<tr><td colspan="7" class="empty">Nenhuma ordem de serviço.</td></tr>`}</tbody></table></div><div class="mobile-record-list">${mobileOrders || `<div class="card empty">Nenhuma ordem de serviço.</div>`}</div>`;
  }

  function renderCertificates() {
    const rows = state.data.certificates.map(item => {
      const days = daysUntil(item.expires_at);
      const automaticStatus = days !== null && days < 0 ? "Vencido" : days !== null && days <= 60 ? "A vencer" : item.status;
      return `<tr>
        <td><strong>${esc(item.title)}</strong><br><small>${esc(item.issuer || "-")}</small></td>
        <td>${esc(item.owner)}</td><td>${dateOnly(item.expires_at)}${days !== null ? `<br><small>${days < 0 ? `${Math.abs(days)} dias vencido` : `${days} dias restantes`}</small>` : ""}</td>
        <td>${badge(automaticStatus)}</td>
        <td><div class="row-actions"><button class="btn small secondary" data-attachments="certificate:${item.id}" data-attachment-title="${esc(item.title)}">📎 ${attachmentCount("certificate", item.id)}</button>${isAdmin() ? `<button class="btn small primary" data-edit-certificate="${item.id}">Editar</button>` : ""}</div></td>
      </tr>`;
    }).join("");
    $("#page-certificates").innerHTML =
      header("Certificados", "Validade, alertas automáticos e arquivos privados.",
        `<button class="btn primary" data-action="new-certificate">+ Adicionar certificado</button>`) +
      `<div class="card table-wrap"><table class="data-table"><thead><tr><th>Certificado</th><th>Colaborador</th><th>Validade</th><th>Status</th><th>Ações</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function renderAlerts() {
    const automatic = state.data.systemAlerts.map(item => `<div class="card alert-card automatic-alert"><div class="kpi-row"><div><strong>${esc(item.title)}</strong><span class="muted">Automático • ${dateTime(item.created_at)}</span></div>${badge(item.level)}</div><p>${esc(item.message)}</p><button class="btn small secondary" data-go-module="${esc(item.module)}">Abrir seção</button></div>`).join("");
    const alerts = state.data.alerts.map(item => `<div class="card alert-card"><div class="kpi-row"><div><strong>${esc(item.title)}</strong><span class="muted">${esc(item.target || "Todos")} • ${dateTime(item.created_at)}</span></div>${badge(item.level)}</div><p>${esc(item.message)}</p>${isAdmin() ? `<button class="btn small primary" data-edit-alert="${item.id}">Editar alerta</button>` : ""}</div>`).join("");
    const messages = state.data.messages.map(item => `<div class="chat-message ${item.mine ? "mine" : ""}"><strong>${esc(item.sender)}</strong><br>${esc(item.text)}<br><small>${dateTime(item.created_at)}</small></div>`).join("");
    $("#page-alerts").innerHTML = header("Alertas e chat", "Alertas automáticos e comunicação interna por equipe.", `<button class="btn primary" data-action="new-alert">+ Novo alerta</button>`) + `<div class="chat-layout"><div><div class="section-title">Alertas automáticos</div><div style="display:grid;gap:9px">${automatic || `<div class="empty">Nenhum risco automático identificado.</div>`}</div><div class="section-title">Alertas enviados</div><div style="display:grid;gap:9px">${alerts || `<div class="empty">Nenhum alerta enviado.</div>`}</div></div><div class="card chat-panel"><h3>Canal Operação Geral</h3><div id="messages" class="messages">${messages}</div><div class="chat-input"><input id="chatText" placeholder="Digite uma mensagem..."><button class="btn primary" data-action="send-message">Enviar</button></div></div></div>`;
  }

  function handoverText() {
    const d = state.data;
    const active = d.operations.filter(op => !["Concluída", "Cancelada"].includes(op.status));
    const pending = d.qhse.filter(item => item.status !== "Concluído");
    const maintenance = d.maintenanceOrders.filter(item => !["Concluída", "Fechada", "Cancelada"].includes(item.status));
    const lines = [
      "> PASSAGEM DE SERVIÇO",
      `> Data: ${new Date().toLocaleDateString("pt-BR")} | Hora: ${new Date().toLocaleTimeString("pt-BR", {hour:"2-digit", minute:"2-digit"})}`,
      "",
      "*Operações em andamento:*"
    ];
    active.forEach((op, index) => lines.push(`${index + 1}. ${op.client} | ${op.vessel} | ${op.activity} de ${op.product} | ${fmt.format(op.executed)}/${fmt.format(op.planned)} ${op.unit} | ${op.status}`));
    if (!active.length) lines.push("• Nenhuma operação em andamento.");
    lines.push("", "*Pendências QHSE:*");
    pending.forEach(item => lines.push(`• ${item.title} — ${item.responsible || "Sem responsável"} — ${item.status}`));
    if (!pending.length) lines.push("• Nenhuma pendência QHSE.");
    lines.push("", "*Manutenções abertas:*");
    maintenance.forEach(item => lines.push(`• ${item.title} — ${item.responsible || "Sem responsável"} — ${item.status}`));
    if (!maintenance.length) lines.push("• Nenhuma manutenção aberta.");
    lines.push("", "*Observação:* Manter controles atualizados e registrar todas as alterações no OpsControl IA.");
    return lines.join("\n");
  }

  function renderReports() {
    const reportCard = (title, description, page, exportKind = "") => `<div class="card report-card"><h3>${title}</h3><p>${description}</p><div class="row-actions"><button class="btn primary" data-print-page="${page}">Gerar / Imprimir</button>${exportKind ? `<button class="btn secondary" data-export="${exportKind}">Exportar CSV</button>` : ""}</div></div>`;
    $("#page-reports").innerHTML = header("Relatórios", "Relatórios operacionais, gerenciais, CSV e passagem de serviço.", `<button class="btn secondary" data-action="copy-handover">Copiar passagem</button>`) + `<div class="grid two">${reportCard("Relatório gerencial", "KPIs, clientes, produtos, riscos e produtividade.", "dashboard", "operations")}${reportCard("Operações", "Vazão, volume, paralisações, tancagem e status.", "operations", "operations")}${reportCard("Inventário de tancagem", "Produto, lote, volume, capacidade e responsável.", "tanks", "tanks")}${reportCard("QHSE", "Registros, severidades e itens de ação.", "qhse")}${reportCard("Manutenção", "Equipamentos, diesel, preventivas e ordens de serviço.", "maintenance", "maintenance")}${reportCard("Carretas", "Entradas, saídas, NF, placa, motorista e anexos.", "trucks", "trucks")}${reportCard("Inventário químico", "Produtos, lotes, FEFO, validade, estoque mínimo e saldo.", "chemicals", "chemicals")}</div><div class="section-title">Prévia da passagem de serviço</div><div class="card"><pre class="handover-preview">${esc(handoverText())}</pre></div>`;
  }

  function renderSettings() {
    const users = state.data.users || [];
    const userRows = users.map(user => `<tr><td><strong>${esc(user.name)}</strong><br><small>${esc(user.email)}</small></td><td>${badge(user.role)}</td><td>${esc(user.department || "-")}</td><td>${badge(user.active ? "Ativo" : "Inativo")}</td><td>${dateOnly(user.created_at)}</td><td>${isAdmin() ? `<button class="btn small primary" data-edit-user="${user.id}">Gerenciar</button>` : ""}</td></tr>`).join("");
    const lastSync = state.lastSync ? state.lastSync.toLocaleString("pt-BR") : "Não sincronizado";
    const errors = state.data.systemErrors || [];
    $("#page-settings").innerHTML = header("Configurações", "Perfil, usuários, permissões, diagnóstico e aparência.", `<button class="btn secondary" data-action="toggle-theme">Alternar tema</button>${isAdmin() ? `<button class="btn primary" data-action="new-user">+ Novo usuário</button>` : ""}`) + `<div class="grid two"><div class="card"><h3>Meu perfil</h3><div class="kpi-list" style="margin-top:14px"><div class="kpi-row"><span>Nome</span><strong>${esc(state.data.profile.name)}</strong></div><div class="kpi-row"><span>E-mail</span><strong>${esc(state.data.profile.email)}</strong></div><div class="kpi-row"><span>Cargo</span>${badge(state.data.profile.role)}</div><div class="kpi-row"><span>Departamento</span><strong>${esc(state.data.profile.department || "-")}</strong></div></div></div><div class="card"><h3>Diagnóstico do sistema</h3><div class="kpi-list" style="margin-top:14px"><div class="kpi-row"><span>Última sincronização</span><strong>${esc(lastSync)}</strong></div><div class="kpi-row"><span>Tanques e silos</span><strong>${state.data.tanks.length}</strong></div><div class="kpi-row"><span>Operações</span><strong>${state.data.operations.length}</strong></div><div class="kpi-row"><span>Alertas automáticos</span><strong>${state.data.systemAlerts.length}</strong></div><div class="kpi-row"><span>Erros registrados</span><strong>${errors.length}</strong></div></div><div class="info-box" style="margin-top:12px">Movimentações automáticas e transferências são executadas por transações no Supabase.</div>${isAdmin() ? `<div class="admin-edit-notice" style="margin-top:12px"><strong>Edição total ativa</strong><span>O administrador pode editar registros operacionais de todos os módulos. Históricos e auditorias permanecem protegidos.</span></div>` : ""}</div></div><div class="section-title">Usuários e permissões</div><div class="card table-wrap">${isAdmin() ? "" : `<div class="info-box" style="margin-bottom:12px">Somente o administrador pode alterar cargo, setor, status e permissões.</div>`}<table class="data-table"><thead><tr><th>Usuário</th><th>Cargo</th><th>Departamento</th><th>Status</th><th>Cadastro</th><th>Ação</th></tr></thead><tbody>${userRows}</tbody></table></div>${isAdmin() && errors.length ? `<div class="section-title">Erros recentes</div><div class="card table-wrap"><table class="data-table"><thead><tr><th>Data</th><th>Contexto</th><th>Mensagem</th></tr></thead><tbody>${errors.slice(0,20).map(e => `<tr><td>${dateTime(e.created_at)}</td><td>${esc(e.context || "-")}</td><td>${esc(e.message)}</td></tr>`).join("")}</tbody></table></div>` : ""}`;
  }

  function genericForm(kind, item = {}) {
    const sel = (value, option) => String(value ?? "") === String(option) ? "selected" : "";
    const id = item.id || "";
    const forms = {
      fluid: `<form id="genericForm" data-kind="fluid" data-id="${id}"><div class="form-grid">
        <div class="wide"><label>Nome do produto *</label><input name="name" required value="${esc(item.name || "")}"></div>
        <div><label>Classificação</label><select name="type" data-fluid-category>${["WBM","Brine","SBM","Olefina","Granel","Insumo"].map(x => `<option ${sel(item.type,x)}>${x}</option>`).join("")}</select></div>
        <div><label>Unidade de estoque</label><select name="unit">${["bbl","ton","m³","kg"].map(x => `<option ${sel(item.unit,x)}>${x}</option>`).join("")}</select></div>
        <div><label>Densidade padrão</label><input name="density" type="text" inputmode="decimal" value="${item.density || ""}" placeholder="Ex.: 9,7 ou 4,10"></div>
        <div><label>Unidade da densidade</label><select name="density_unit"><option value="ppg" ${(item.densityUnit || defaultDensityUnit(item.type)) === "ppg" ? "selected" : ""}>ppg</option><option value="t/m³" ${(item.densityUnit || defaultDensityUnit(item.type)) === "t/m³" ? "selected" : ""}>t/m³</option></select></div>
        <div><label>Ativo</label><select name="active"><option value="true" ${item.active !== false ? "selected" : ""}>Sim</option><option value="false" ${item.active === false ? "selected" : ""}>Não</option></select></div>
        <div class="wide"><label>Documentos ou fotos</label><input name="attachment" type="file" accept=".pdf,image/jpeg,image/png,image/webp,image/heic,image/heif" multiple></div>
      </div>${formActions(id ? "Salvar alterações" : "Salvar produto")}</form>`,

      truck: `<form id="genericForm" data-kind="truck" data-id="${id}"><div class="form-grid">
        <div><label>Data *</label><input name="date" type="date" required value="${String(item.date || new Date().toISOString()).slice(0,10)}"></div>
        <div><label>Movimento</label><select name="movement">${["Entrada","Saída","Backload"].map(x => `<option ${sel(item.movement,x)}>${x}</option>`).join("")}</select></div>
        <div><label>Origem / Destino *</label><input name="supplier" required value="${esc(item.supplier || "")}"></div>
        <div><label>Cliente</label><input name="client" value="${esc(item.client || "")}"></div>
        <div><label>Produto *</label><input name="product" required value="${esc(item.product || "")}"></div>
        <div><label>Lote</label><input name="lot" value="${esc(item.lot || "")}"></div>
        <div><label>Quantidade *</label><input name="quantity" type="number" min="0" step="0.01" required value="${item.quantity ?? 0}"></div>
        <div><label>Unidade</label><select name="unit">${["ton","bbl","m³"].map(x => `<option ${sel(item.unit,x)}>${x}</option>`).join("")}</select></div>
        <div><label>Placa</label><input name="plate" value="${esc(item.plate || "")}"></div>
        <div><label>Motorista</label><input name="driver" value="${esc(item.driver || "")}"></div>
        <div><label>Nota fiscal</label><input name="invoice" value="${esc(item.invoice || "")}"></div>
        <div><label>Status</label><select name="status">${["Programada","Recebida","Concluída"].map(x => `<option ${sel(item.status,x)}>${x}</option>`).join("")}</select></div>
        <div class="wide"><label>Observações</label><textarea name="notes">${esc(item.notes || "")}</textarea></div>
        <div class="wide"><label>NF, documento ou foto</label><input name="attachment" type="file" accept=".pdf,image/jpeg,image/png,image/webp,image/heic,image/heif" multiple capture="environment"></div>
      </div>${formActions(id ? "Salvar alterações" : "Salvar movimentação")}</form>`,

      qhse: `<form id="genericForm" data-kind="qhse" data-id="${id}"><div class="form-grid">
        <div><label>Data</label><input name="date" type="date" value="${String(item.date || new Date().toISOString()).slice(0,10)}"></div>
        <div><label>Tipo</label><select name="type">${["DDS","APR","Inspeção","RIR","Auditoria","Observação"].map(x => `<option ${sel(item.type,x)}>${x}</option>`).join("")}</select></div>
        <div class="wide"><label>Título *</label><input name="title" required value="${esc(item.title || "")}"></div>
        <div class="wide"><label>Descrição</label><textarea name="description">${esc(item.description || "")}</textarea></div>
        <div><label>Responsável</label><input name="responsible" value="${esc(item.responsible || "")}"></div>
        <div><label>Severidade</label><select name="severity">${["Baixa","Média","Alta","Crítica"].map(x => `<option ${sel(item.severity,x)}>${x}</option>`).join("")}</select></div>
        <div><label>Status</label><select name="status">${["Pendente","Em andamento","Concluído"].map(x => `<option ${sel(item.status,x)}>${x}</option>`).join("")}</select></div>
        <div class="wide"><label>Fotos ou documentos</label><input name="attachment" type="file" accept=".pdf,image/jpeg,image/png,image/webp,image/heic,image/heif" multiple capture="environment"></div>
      </div>${formActions(id ? "Salvar alterações" : "Salvar registro")}</form>`,

      equipment: `<form id="genericForm" data-kind="equipment" data-id="${id}"><div class="form-grid">
        <div><label>Equipamento *</label><input name="name" required value="${esc(item.name || "")}"></div>
        <div><label>Categoria</label><select name="category">${["Motor a diesel","Bomba","Compressor","Empilhadeira","Outro"].map(x => `<option ${sel(item.category,x)}>${x}</option>`).join("")}</select></div>
        <div><label>Localização</label><input name="location" value="${esc(item.location || "")}"></div>
        <div><label>Status</label><select name="status">${["Operando","Disponível","Parado","Manutenção"].map(x => `<option ${sel(item.status,x)}>${x}</option>`).join("")}</select></div>
        <div><label>Horímetro final</label><input name="hourmeter" type="number" min="0" step="0.1" value="${item.hourmeter || 0}"></div>
        <div><label>Horas trabalhadas</label><input name="last_hours" type="number" min="0" step="0.1" value="${item.last_hours || 0}"></div>
        <div><label>Diesel inicial (L)</label><input name="diesel_initial" type="number" min="0" step="0.1" value="${item.diesel_initial || 0}"></div>
        <div><label>Abastecido (L)</label><input name="refueled" type="number" min="0" step="0.1" value="${item.refueled || 0}"></div>
        <div><label>Diesel final (L)</label><input name="diesel_final" type="number" min="0" step="0.1" value="${item.diesel_final || 0}"></div>
        <div><label>Próxima preventiva</label><input name="next_maintenance_date" type="date" value="${String(item.next_maintenance_date || "").slice(0,10)}"></div>
        <div><label>Preventiva no horímetro</label><input name="maintenance_due_hourmeter" type="number" min="0" step="0.1" value="${item.maintenance_due_hourmeter || ""}"></div>
        <div><label>Intervalo preventivo (h)</label><input name="maintenance_interval_hours" type="number" min="0" step="0.1" value="${item.maintenance_interval_hours || ""}"></div>
        <div class="wide"><label>Observações</label><textarea name="notes">${esc(item.notes || "")}</textarea></div>
      </div>${formActions(id ? "Salvar alterações" : "Salvar equipamento")}</form>`,

      certificate: `<form id="genericForm" data-kind="certificate" data-id="${id}"><div class="form-grid">
        <div class="wide"><label>Certificado *</label><input name="title" required value="${esc(item.title || "")}"></div>
        <div><label>Colaborador</label><select name="user_id"><option value="">Sem vínculo</option>${state.data.users.map(user => `<option value="${user.id}" ${item.user_id === user.id ? "selected" : ""}>${esc(user.name)}</option>`).join("")}</select></div>
        <div><label>Nome no certificado *</label><input name="owner" value="${esc(item.owner || state.data.profile.name)}" required></div>
        <div><label>Emissor</label><input name="issuer" value="${esc(item.issuer || "")}"></div>
        <div><label>Emissão</label><input name="issued_at" type="date" value="${String(item.issued_at || "").slice(0,10)}"></div>
        <div><label>Validade</label><input name="expires_at" type="date" value="${String(item.expires_at || "").slice(0,10)}"></div>
        <div><label>Status</label><select name="status">${["Válido","A vencer","Vencido"].map(x => `<option ${sel(item.status,x)}>${x}</option>`).join("")}</select></div>
        <div class="wide"><label>Certificado em PDF ou foto</label><input name="attachment" type="file" accept=".pdf,image/jpeg,image/png,image/webp,image/heic,image/heif" multiple></div>
      </div>${formActions(id ? "Salvar alterações" : "Salvar certificado")}</form>`,

      alert: `<form id="genericForm" data-kind="alert" data-id="${id}"><div class="form-grid">
        <div class="wide"><label>Título *</label><input name="title" required value="${esc(item.title || "")}"></div>
        <div class="wide"><label>Mensagem *</label><textarea name="message" required>${esc(item.message || "")}</textarea></div>
        <div><label>Nível</label><select name="level">${["Informativo","Atenção","Crítico"].map(x => `<option ${sel(item.level,x)}>${x}</option>`).join("")}</select></div>
        <div><label>Grupo / Destino</label><input name="target" value="${esc(item.target || "")}" placeholder="Ex.: mecânicos, operação"></div>
      </div>${formActions(id ? "Salvar alterações" : "Criar alerta")}</form>`
    };
    return forms[kind] || "";
  }

  function actionItemForm(qhseId, item = {}) {
    return `<form id="actionItemForm" data-qhse-id="${qhseId}" data-id="${item.id || ""}"><div class="form-grid">
      <div class="wide"><label>Ação *</label><input name="title" required value="${esc(item.title || "")}"></div>
      <div class="wide"><label>Descrição</label><textarea name="description">${esc(item.description || "")}</textarea></div>
      <div><label>Responsável</label><input name="responsible" value="${esc(item.responsible || "")}"></div>
      <div><label>Prazo</label><input name="due_date" type="date" value="${String(item.due_date || "").slice(0,10)}"></div>
      <div><label>Status</label><select name="status">${["Pendente","Em andamento","Concluído"].map(x => `<option ${item.status === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>
    </div>${formActions(item.id ? "Salvar alterações" : "Salvar ação")}</form>`;
  }

  function maintenanceOrderForm(order = {}, equipmentId = "") {
    const selectedEquipment = order.equipment_id || equipmentId;
    return `<form id="maintenanceOrderForm" data-id="${order.id || ""}"><div class="form-grid">
      <div><label>Equipamento *</label><select name="equipment_id" required><option value="">Selecione</option>${state.data.equipment.map(item => `<option value="${item.id}" ${selectedEquipment === item.id ? "selected" : ""}>${esc(item.name)}</option>`).join("")}</select></div>
      <div><label>Tipo</label><select name="maintenance_type">${["Preventiva", "Corretiva", "Inspeção"].map(x => `<option ${order.maintenance_type === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>
      <div class="wide"><label>Título *</label><input name="title" required value="${esc(order.title || "")}"></div>
      <div class="wide"><label>Descrição</label><textarea name="description">${esc(order.description || "")}</textarea></div>
      <div><label>Prioridade</label><select name="priority">${["Baixa", "Média", "Alta", "Crítica"].map(x => `<option ${order.priority === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>
      <div><label>Status</label><select name="status">${["Aberta", "Em andamento", "Aguardando peça", "Concluída", "Cancelada"].map(x => `<option ${order.status === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>
      <div><label>Responsável</label><input name="responsible" value="${esc(order.responsible || "")}"></div>
      <div><label>Prazo</label><input name="due_date" type="date" value="${String(order.due_date || "").slice(0, 10)}"></div>
      <div><label>Custo estimado</label><input name="estimated_cost" type="number" min="0" step="0.01" value="${order.estimated_cost || 0}"></div>
      <div><label>Custo real</label><input name="actual_cost" type="number" min="0" step="0.01" value="${order.actual_cost || 0}"></div>
      <div class="wide"><label>Condição antes</label><textarea name="before_notes">${esc(order.before_notes || "")}</textarea></div>
      <div class="wide"><label>Peças utilizadas</label><textarea name="parts_used">${esc(order.parts_used || "")}</textarea></div>
      <div class="wide"><label>Solução aplicada</label><textarea name="solution">${esc(order.solution || "")}</textarea></div>
      <div class="wide"><label>Condição depois</label><textarea name="after_notes">${esc(order.after_notes || "")}</textarea></div>
      <div class="wide"><label>Fotos antes/depois ou documentos</label><input name="attachment" type="file" accept=".pdf,image/jpeg,image/png,image/webp,image/heic,image/heif" multiple capture="environment"></div>
    </div>${formActions("Salvar ordem")}</form>`;
  }

  function newUserForm() {
    return `<form id="newUserForm"><div class="form-grid"><div class="wide"><label>Nome completo *</label><input name="full_name" required></div><div><label>E-mail *</label><input name="email" type="email" required></div><div><label>Senha inicial *</label><input name="password" type="password" minlength="8" required></div><div><label>Cargo</label><select name="role">${["user","operador","logistica","mecanico","qhse","lider","supervisor","admin"].map(x => `<option>${x}</option>`).join("")}</select></div><div><label>Departamento</label><input name="department"></div><div class="wide info-box">A conta será criada pelo cadastro seguro do Supabase. Dependendo da configuração, o usuário poderá receber uma confirmação por e-mail.</div></div>${formActions("Criar usuário")}</form>`;
  }

  function userForm(user) {
    const modules = [
      ["dashboard", "Dashboard"], ["operations", "Operações"], ["tanks", "Tanques"],
      ["fluids", "Fluidos"], ["chemicals", "Inventário Químico"], ["trucks", "Carretas"], ["qhse", "QHSE"],
      ["maintenance", "Manutenção"], ["certificates", "Certificados"],
      ["alerts", "Alertas"], ["reports", "Relatórios"]
    ];
    return `<form id="userForm" data-user-id="${user.id}"><div class="form-grid">
      <div class="wide"><label>Nome</label><input name="full_name" required value="${esc(user.name)}"></div>
      <div><label>E-mail</label><input value="${esc(user.email)}" disabled></div>
      <div><label>Cargo</label><select name="role">${["admin", "supervisor", "lider", "operador", "logistica", "mecanico", "qhse", "user"].map(x => `<option ${user.role === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>
      <div><label>Departamento</label><input name="department" value="${esc(user.department)}"></div>
      <div><label>Status</label><select name="active"><option value="true" ${user.active ? "selected" : ""}>Ativo</option><option value="false" ${!user.active ? "selected" : ""}>Bloqueado</option></select></div>
      <div class="wide"><label>Permissões por módulo</label><div class="permission-grid">${modules.map(([key, label]) => `<label class="permission-item"><input type="checkbox" name="perm_${key}" ${user.permissions?.[key] !== false ? "checked" : ""}><span>${label}</span></label>`).join("")}</div></div>
    </div>${formActions("Salvar usuário")}</form>`;
  }

  async function uploadAttachments(module, recordId, files) {
    if (!files?.length) return;
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
    for (const file of files) {
      if (!allowed.includes(file.type)) throw new Error(`Formato não permitido: ${file.name}`);
      if (file.size > 20 * 1024 * 1024) throw new Error(`${file.name} ultrapassa 20 MB.`);
      const path = `${module}/${recordId}/${Date.now()}-${uid("file")}-${safeFileName(file.name)}`;
      const { error: uploadError } = await state.client.storage.from("opscontrol-files").upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      const { error: metaError } = await state.client.from("attachments").insert({
        module, record_id: recordId, file_name: file.name, file_path: path,
        mime_type: file.type, file_size: file.size, uploaded_by: state.user.id
      });
      if (metaError) {
        await state.client.storage.from("opscontrol-files").remove([path]);
        throw metaError;
      }
    }
  }

  async function showAttachments(module, recordId, title) {
    const items = state.data.attachments.filter(x => x.module === module && x.record_id === recordId);
    const canDelete = item => isAdmin() || item.uploaded_by === state.user.id;
    const rows = await Promise.all(items.map(async item => {
      const { data, error } = await state.client.storage.from("opscontrol-files").createSignedUrl(item.file_path, 3600);
      const url = error ? "" : data?.signedUrl || "";
      return `<div class="attachment-item">
        <div class="attachment-icon">${String(item.mime_type).startsWith("image/") ? "🖼️" : "📄"}</div>
        <div class="attachment-info"><strong>${esc(item.file_name)}</strong><small>${fileSizeLabel(item.file_size)} • ${dateTime(item.created_at)}</small></div>
        ${url ? `<a class="btn small primary" href="${url}" target="_blank" rel="noopener">Abrir</a>` : ""}
        ${canDelete(item) ? `<button class="btn small danger" data-delete-attachment="${item.id}">Excluir</button>` : ""}
      </div>`;
    }));

    openModal(`Anexos — ${title}`, `
      <form id="attachmentUploadForm" data-module="${module}" data-record-id="${recordId}">
        <label>Adicionar documentos ou fotos</label>
        <input name="attachment" type="file" accept=".pdf,image/jpeg,image/png,image/webp,image/heic,image/heif" multiple capture="environment">
        <div class="form-actions"><button class="btn primary">Enviar arquivos</button></div>
      </form>
      <div class="section-title">Arquivos anexados</div>
      <div class="attachment-list">${rows.join("") || `<div class="empty">Nenhum arquivo anexado.</div>`}</div>
    `, "ANEXOS");
  }


  function parseTankVolume(value) {
    const normalized = String(value ?? "")
      .trim()
      .replace(/\s/g, "")
      .replace(/\.(?=\d{3}(?:\D|$))/g, "")
      .replace(",", ".");
    const number = Number(normalized);
    return Number.isFinite(number) ? number : NaN;
  }

  function parseOptionalDecimal(value) {
    if (value === null || value === undefined || String(value).trim() === "") return null;
    const parsed = parseTankVolume(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  }

  async function saveTankVolume(form, button = null) {
    if (!form) throw new Error("Formulário de tancagem não localizado.");
    if (!state.client || !state.user) throw new Error("Sessão inválida. Entre novamente.");

    const payload = Object.fromEntries(new FormData(form));
    const tank = state.data.tanks.find(item => item.id === payload.id);
    if (!tank) throw new Error("Tanque ou silo não localizado.");

    const adminFull = form.dataset.adminFull === "true" && isAdmin();
    const newVolume = parseTankVolume(payload.volume);
    const newCapacity = adminFull ? parseTankVolume(payload.capacity) : Number(tank.capacity || 0);
    const selectedFluidId = payload.fluid_type_id && payload.fluid_type_id !== "__custom__" ? payload.fluid_type_id : null;
    const selectedFluid = (state.data.fluids || []).find(item => item.id === selectedFluidId);
    const manualProduct = payload.fluid_type_id === "__custom__" ? payload.product?.trim() || null : null;
    const newDensity = parseOptionalDecimal(payload.density);
    const newDensityUnit = newDensity === null ? null : payload.density_unit;

    if (!Number.isFinite(newVolume)) throw new Error("Informe um volume válido.");
    if (!Number.isFinite(newCapacity) || newCapacity <= 0) throw new Error("Informe uma capacidade válida.");
    if (Number.isNaN(newDensity)) throw new Error("Informe uma densidade válida.");
    if (newDensity !== null && newDensity < 0) throw new Error("A densidade não pode ser negativa.");
    if (newVolume < 0) throw new Error("O volume não pode ser negativo.");
    if (newVolume > newCapacity) {
      throw new Error(`O volume não pode ultrapassar ${fmt.format(newCapacity)} ${adminFull ? payload.unit : tank.unit}.`);
    }

    const originalLabel = button?.textContent || "Salvar";
    const message = form.querySelector("#tankSaveMessage");

    if (button) {
      button.disabled = true;
      button.textContent = "Salvando no banco...";
    }
    if (message) {
      message.classList.add("hidden");
      message.textContent = "";
    }

    try {
      const rpcName = adminFull ? "admin_update_tank_with_product" : "update_tank_with_product";
      const sharedProductPayload = {
        p_fluid_type_id: selectedFluidId,
        p_product: selectedFluid?.name || manualProduct,
        p_lot: payload.lot?.trim() || null,
        p_density: newDensity,
        p_density_unit: newDensityUnit
      };
      const rpcPayload = adminFull ? {
        p_tank_id: tank.id,
        p_name: payload.name?.trim(),
        p_phase: payload.phase,
        p_kind: payload.kind,
        p_capacity: newCapacity,
        p_unit: payload.unit,
        p_display_order: Number(payload.display_order || 0),
        p_volume: newVolume,
        p_status: payload.status,
        ...sharedProductPayload
      } : {
        p_tank_id: tank.id,
        p_volume: newVolume,
        p_status: payload.status,
        ...sharedProductPayload
      };

      const { data, error } = await state.client.rpc(rpcName, rpcPayload);
      if (error) throw error;

      const rpcRow = Array.isArray(data) ? data[0] : data;
      if (!rpcRow?.id) throw new Error("O Supabase não confirmou a atualização.");

      const { data: serverRow, error: confirmError } = await state.client
        .from("tanks")
        .select("*")
        .eq("id", tank.id)
        .single();

      if (confirmError) throw confirmError;
      if (!serverRow) throw new Error("Não foi possível reler o tanque atualizado.");

      const confirmedVolume = Number(serverRow.current_volume || 0);
      if (Math.abs(confirmedVolume - newVolume) > 0.001) {
        throw new Error(`O banco retornou ${fmt.format(confirmedVolume)}, diferente do valor informado.`);
      }

      const mapped = {
        id: serverRow.id,
        name: serverRow.name,
        phase: serverRow.phase,
        kind: serverRow.kind,
        capacity: Number(serverRow.capacity || 0),
        unit: serverRow.unit,
        volume: confirmedVolume,
        fluidTypeId: serverRow.current_fluid_type_id || null,
        product: serverRow.current_product || "",
        lot: serverRow.current_lot || "",
        density: serverRow.current_density === null || serverRow.current_density === undefined ? null : Number(serverRow.current_density),
        densityUnit: serverRow.current_density_unit || null,
        status: serverRow.status,
        order: serverRow.display_order,
        updated_by: serverRow.updated_by,
        updated_at: serverRow.updated_at
      };

      const index = state.data.tanks.findIndex(item => item.id === tank.id);
      if (index >= 0) state.data.tanks[index] = mapped;

      renderTanks();
      renderDashboard();
      closeModal();
      toast(`${mapped.name} confirmado em ${fmt.format(mapped.volume)} ${mapped.unit}.`, "success");

      // Sincronização completa em segundo plano. Uma falha em outro módulo
      // não impede a confirmação visual do tanque que já foi salvo.
      setTimeout(() => {
        loadData().then(renderAll).catch(error => console.error("Sincronização posterior:", error));
      }, 50);

      return mapped;
    } catch (error) {
      if (message) {
        message.textContent = error.message;
        message.classList.remove("hidden");
      }
      try {
        await state.client.from("system_errors").insert({
          user_id: state.user.id,
          context: `tank_volume_update:${tank.name}`,
          message: error.message,
          stack: error.stack || null,
          user_agent: navigator.userAgent
        });
      } catch (_) {}
      throw error;
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = originalLabel;
      }
    }
  }

  async function saveOperation(payload, id = null) {
    const start = payload.start_at ? new Date(payload.start_at) : null;
    const end = payload.end_at ? new Date(payload.end_at) : null;
    const paused = Number(payload.paused_minutes || 0);
    const hours = start && end ? Math.max(0, (end - start) / 3600000 - paused / 60) : 0;
    const flow = hours > 0 ? Number(payload.executed || 0) / hours : 0;
    const mode = tankMovementMode(payload.activity);
    const applyTank = payload.apply_tank_movement === true;
    if (applyTank && mode === "out" && !payload.source_tank_id) throw new Error("Selecione o tanque ou silo de origem.");
    if (applyTank && mode === "in" && !payload.destination_tank_id) throw new Error("Selecione o tanque ou silo de destino.");
    if (applyTank && mode === "none") throw new Error("Esta atividade não possui movimentação automática de tancagem.");
    const row = {
      client: payload.client, vessel: payload.vessel, service_order: payload.service_order || null,
      responsible_id: payload.responsible_id || null, activity: payload.activity,
      product: payload.product, lot: payload.lot || null,
      planned_quantity: Number(payload.planned || 0), executed_quantity: Number(payload.executed || 0),
      unit: payload.unit, status: payload.status,
      start_at: payload.start_at || null, end_at: payload.end_at || null,
      paused_minutes: paused, flow_rate: flow, flow_rate_unit: `${payload.unit}/h`,
      occurrence: payload.occurrence || null, notes: payload.notes || null,
      source_tank_id: mode === "out" ? payload.source_tank_id || null : null,
      destination_tank_id: mode === "in" ? payload.destination_tank_id || null : null,
      apply_tank_movement: applyTank,
      locked: payload.locked === true || payload.status === "Concluída",
      created_by: id ? undefined : state.user.id
    };
    Object.keys(row).forEach(key => row[key] === undefined && delete row[key]);
    const query = id ? state.client.from("operations").update(row).eq("id", id).select("id").single() : state.client.from("operations").insert(row).select("id").single();
    const { data, error } = await query;
    if (error) throw error;
    return data.id;
  }

  async function saveEntity(kind, payload, id = null) {
    const maps = {
      fluid: ["fluid_types", {
        name: payload.name, category: payload.type, default_unit: payload.unit,
        density_value: parseOptionalDecimal(payload.density),
        density_unit: payload.density_unit || defaultDensityUnit(payload.type),
        density_ppg: payload.density_unit === "ppg" ? parseOptionalDecimal(payload.density) : null,
        active: payload.active === "true"
      }],
      truck: ["trucks", {
        movement_date: payload.date, movement_type: payload.movement, supplier: payload.supplier,
        client: payload.client || null, product: payload.product, lot: payload.lot || null,
        quantity: Number(payload.quantity || 0), unit: payload.unit, plate: payload.plate || null,
        driver_name: payload.driver || null, invoice_number: payload.invoice || null,
        status: payload.status, notes: payload.notes || null, created_by: state.user.id
      }],
      qhse: ["qhse_records", {
        record_date: payload.date, record_type: payload.type, title: payload.title,
        description: payload.description || null, responsible: payload.responsible || null,
        severity: payload.severity, status: payload.status, created_by: state.user.id
      }],
      equipment: ["equipment", {
        name: payload.name, category: payload.category, location: payload.location || null,
        status: payload.status, hourmeter: Number(payload.hourmeter || 0),
        last_work_hours: Number(payload.last_hours || 0),
        diesel_initial: Number(payload.diesel_initial || 0),
        diesel_refueled: Number(payload.refueled || 0),
        diesel_final: Number(payload.diesel_final || 0),
        next_maintenance_date: payload.next_maintenance_date || null,
        maintenance_due_hourmeter: Number(payload.maintenance_due_hourmeter || 0) || null,
        maintenance_interval_hours: Number(payload.maintenance_interval_hours || 0) || null,
        notes: payload.notes || null, updated_by: state.user.id
      }],
      certificate: ["certificates", {
        user_id: payload.user_id || state.user.id, owner_name: payload.owner,
        title: payload.title, issuer: payload.issuer || null,
        issued_at: payload.issued_at || null, expires_at: payload.expires_at || null,
        status: payload.status, created_by: state.user.id
      }],
      alert: ["alerts", {
        title: payload.title, message: payload.message, level: payload.level,
        target_group: payload.target || null, is_read: false, created_by: state.user.id
      }]
    };
    const [table, row] = maps[kind];
    if (id && Object.prototype.hasOwnProperty.call(row, "created_by")) delete row.created_by;
    const query = id
      ? state.client.from(table).update(row).eq("id", id).select("id").single()
      : state.client.from(table).insert(row).select("id").single();
    const { data, error } = await query;
    if (error) throw error;
    return data.id;
  }

  async function saveMaintenanceOrder(payload, id = null) {
    const completed = ["Concluída", "Fechada"].includes(payload.status);
    const row = {
      equipment_id: payload.equipment_id, title: payload.title,
      description: payload.description || null, priority: payload.priority,
      status: payload.status, due_date: payload.due_date || null,
      responsible: payload.responsible || null, maintenance_type: payload.maintenance_type,
      parts_used: payload.parts_used || null, solution: payload.solution || null,
      estimated_cost: Number(payload.estimated_cost || 0), actual_cost: Number(payload.actual_cost || 0),
      before_notes: payload.before_notes || null, after_notes: payload.after_notes || null,
      closed_at: completed ? new Date().toISOString() : null,
      completed_by: completed ? state.user.id : null,
      created_by: id ? undefined : state.user.id
    };
    Object.keys(row).forEach(key => row[key] === undefined && delete row[key]);
    const query = id
      ? state.client.from("maintenance_orders").update(row).eq("id", id).select("id").single()
      : state.client.from("maintenance_orders").insert(row).select("id").single();
    const { data, error } = await query;
    if (error) throw error;
    return data.id;
  }

  function showPage(page) {
    if (!moduleAllowed(page)) return toast("Seu perfil não possui acesso a este módulo.", "error");
    state.page = page;
    $$(".page").forEach(item => item.classList.remove("active"));
    $$(".nav-item").forEach(item => item.classList.toggle("active", item.dataset.page === page));
    $(`#page-${page}`).classList.add("active");
    $("#sidebar").classList.remove("open");
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }

  function smartAnswer(question) {
    const q = question.toLowerCase();
    const d = state.data;

    if (q.includes("brine")) {
      const volume = d.tanks.filter(t => productClass(t.product) === "brine").reduce((s, t) => s + t.volume, 0);
      return `Há ${fmt.format(volume)} bbl de Brine registrados nos tanques.`;
    }
    if (q.includes("sbm")) {
      const volume = d.tanks.filter(t => productClass(t.product) === "sbm").reduce((s, t) => s + t.volume, 0);
      return `Há ${fmt.format(volume)} bbl de SBM registrados nos tanques.`;
    }
    if (q.includes("wbm")) {
      const volume = d.tanks.filter(t => productClass(t.product) === "wbm").reduce((s, t) => s + t.volume, 0);
      return `Há ${fmt.format(volume)} bbl de WBM registrados nos tanques.`;
    }
    if (q.includes("barita")) {
      const ops = d.operations.filter(op => op.product.toLowerCase().includes("barita"));
      const total = ops.reduce((s, op) => s + op.executed, 0);
      return `Foram registrados ${fmt.format(total)} nas operações de Barita em ${ops.length} operação(ões).`;
    }
    if (q.includes("químic") || q.includes("quimic") || q.includes("estoque químico") || q.includes("estoque quimico")) {
      const low = d.chemicals.filter(item => item.quantity <= item.minimum);
      const expired = d.chemicals.filter(item => {
        const days = daysUntil(item.expiry_date);
        return days !== null && days < 0;
      });
      if (q.includes("baixo") || q.includes("mínimo") || q.includes("minimo")) {
        return low.length ? `Produtos em baixo estoque: ${low.map(x => `${x.name} (${fmt.format(x.quantity)} ${x.unit})`).join(", ")}.` : "Não há produtos químicos abaixo do estoque mínimo.";
      }
      if (q.includes("venc")) {
        return expired.length ? `Produtos vencidos: ${expired.map(x => `${x.name} — lote ${x.lot || "-"}`).join(", ")}.` : "Não há produtos químicos vencidos.";
      }
      return `O inventário químico possui ${d.chemicals.length} produto(s)/lote(s), sendo ${low.length} em baixo estoque e ${expired.length} vencido(s).`;
    }

    if (q.includes("carreta")) {
      const weekAgo = Date.now() - 7 * 86400000;
      const total = d.trucks.filter(item => new Date(`${item.date}T12:00`) >= weekAgo).length;
      return `Foram registradas ${total} movimentações de carretas nos últimos 7 dias.`;
    }
    if (q.includes("diesel")) {
      const ranked = d.equipment.map(item => ({
        name: item.name,
        used: Math.max(0, item.diesel_initial + item.refueled - item.diesel_final)
      })).sort((a, b) => b.used - a.used);
      return ranked.length ? `${ranked[0].name} apresenta o maior consumo registrado: ${fmt.format(ranked[0].used)} L.` : "Não há consumo de diesel registrado.";
    }
    if (q.includes("certificado")) {
      const expiring = d.certificates.filter(item => {
        const days = daysUntil(item.expires_at);
        return days !== null && days >= 0 && days <= 60;
      });
      return `${expiring.length} certificado(s) vencem nos próximos 60 dias.`;
    }
    if (q.includes("tanque") && q.includes("bloque")) {
      const blocked = d.tanks.filter(t => t.status === "Bloqueado");
      return blocked.length ? `Tanques bloqueados: ${blocked.map(x => x.name).join(", ")}.` : "Não há tanques bloqueados.";
    }
    return "Posso responder sobre Brine, WBM, SBM, Barita, inventário químico, carretas, diesel, certificados e tanques bloqueados.";
  }

  document.addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.target;
    try {
      if (!navigator.onLine) throw new Error("Sem internet. Reconecte para salvar alterações.");

      if (form.id === "operationForm") {
        const payload = Object.fromEntries(new FormData(form));
        payload.locked = form.querySelector('[name="locked"]')?.checked === true;
        payload.apply_tank_movement = form.querySelector('[name="apply_tank_movement"]')?.checked === true;
        const files = [...(form.querySelector('[name="attachment"]')?.files || [])];
        delete payload.attachment;
        const recordId = await saveOperation(payload, form.dataset.id || null);
        if (files.length) await uploadAttachments("operation", recordId, files);
      }

      if (form.id === "tankForm") {
        await saveTankVolume(form, form.querySelector('[data-action="save-tank-volume"]'));
        return;
      }

      if (form.id === "tankTransferForm") {
        const payload = Object.fromEntries(new FormData(form));
        const quantity = parseTankVolume(payload.quantity);
        if (!Number.isFinite(quantity) || quantity <= 0) throw new Error("Informe uma quantidade válida.");
        const { error } = await state.client.rpc("transfer_tank_volume", {
          p_source_tank_id: payload.source_tank_id,
          p_destination_tank_id: payload.destination_tank_id,
          p_quantity: quantity,
          p_reference: payload.reference || null,
          p_notes: payload.notes || null
        });
        if (error) throw error;
      }

      if (form.id === "newUserForm") {
        if (!isAdmin()) throw new Error("Somente administradores podem criar usuários.");
        const payload = Object.fromEntries(new FormData(form));
        if (String(payload.password || "").length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");
        const tempClient = window.supabase.createClient(state.config.url, state.config.key, {
          auth: { persistSession: false, autoRefreshToken: false, storageKey: `opscontrol-create-${Date.now()}` }
        });
        const { data, error } = await tempClient.auth.signUp({
          email: String(payload.email).trim().toLowerCase(),
          password: payload.password,
          options: { data: { full_name: payload.full_name } }
        });
        if (error) throw error;
        if (!data.user?.id) throw new Error("O Supabase não devolveu o novo usuário.");
        let profileUpdated = false;
        for (let attempt = 0; attempt < 6 && !profileUpdated; attempt++) {
          await new Promise(resolve => setTimeout(resolve, 300));
          const { error: updateError } = await state.client.from("profiles").update({
            full_name: payload.full_name,
            role: payload.role,
            department: payload.department || null,
            active: true
          }).eq("id", data.user.id);
          profileUpdated = !updateError;
        }
        if (!profileUpdated) throw new Error("A conta foi criada, mas o perfil ainda não ficou disponível para configuração.");
      }

      if (form.id === "genericForm") {
        const kind = form.dataset.kind;
        const files = [...(form.querySelector('[name="attachment"]')?.files || [])];
        const payload = Object.fromEntries(new FormData(form));
        delete payload.attachment;
        if ("active" in payload) payload.active = payload.active === "true";
        const recordId = await saveEntity(kind, payload, form.dataset.id || null);
        if (files.length && ["fluid", "truck", "qhse", "certificate"].includes(kind)) {
          await uploadAttachments(kind, recordId, files);
        }
      }

      if (form.id === "chemicalForm") {
        if (!hasRole(["supervisor", "lider", "logistica", "qhse"])) throw new Error("Seu perfil não pode alterar o inventário químico.");
        const files = [...(form.querySelector('[name="attachment"]')?.files || [])];
        const payload = Object.fromEntries(new FormData(form));
        delete payload.attachment;
        const id = form.dataset.id || null;
        const row = {
          product_name: payload.product_name,
          category: payload.category || null,
          lot: payload.lot || null,
          unit: payload.unit,
          minimum_quantity: Number(payload.minimum_quantity || 0),
          expiry_date: payload.expiry_date || null,
          location: payload.location || null,
          supplier: payload.supplier || null,
          status: payload.status,
          notes: payload.notes || null,
          updated_by: state.user.id
        };
        if (!id) {
          row.quantity = Number(payload.quantity || 0);
          row.created_by = state.user.id;
        }
        const query = id
          ? state.client.from("chemical_inventory").update(row).eq("id", id).select("id").single()
          : state.client.from("chemical_inventory").insert(row).select("id").single();
        const { data, error } = await query;
        if (error) throw error;
        const recordId = data.id;
        if (!id && Number(payload.quantity || 0) > 0) {
          const { error: movementError } = await state.client.from("chemical_movements").insert({
            inventory_id: recordId,
            movement_type: "Entrada",
            quantity: Number(payload.quantity),
            previous_balance: 0,
            new_balance: Number(payload.quantity),
            reference: "Saldo inicial",
            performed_by: state.user.id
          });
          if (movementError) throw movementError;
        }
        if (files.length) await uploadAttachments("chemical", recordId, files);
      }

      if (form.id === "chemicalMovementForm") {
        if (!hasRole(["supervisor", "lider", "logistica", "qhse"])) throw new Error("Seu perfil não pode movimentar o inventário químico.");
        const payload = Object.fromEntries(new FormData(form));
        const item = state.data.chemicals.find(x => x.id === form.dataset.id);
        if (!item) throw new Error("Produto não localizado.");
        const amount = Number(payload.quantity || 0);
        if (amount <= 0) throw new Error("Informe uma quantidade maior que zero.");
        const previous = Number(item.quantity || 0);
        let next = previous;
        if (payload.movement_type === "Entrada") next = previous + amount;
        if (payload.movement_type === "Saída") next = previous - amount;
        if (payload.movement_type === "Ajuste") next = amount;
        if (next < 0) throw new Error("A saída não pode deixar o estoque negativo.");

        const { error:updateError } = await state.client.from("chemical_inventory").update({
          quantity: next,
          updated_by: state.user.id
        }).eq("id", item.id);
        if (updateError) throw updateError;

        const { error:movementError } = await state.client.from("chemical_movements").insert({
          inventory_id: item.id,
          movement_type: payload.movement_type,
          quantity: amount,
          previous_balance: previous,
          new_balance: next,
          reference: payload.reference || null,
          notes: payload.notes || null,
          performed_by: state.user.id
        });
        if (movementError) throw movementError;
      }

      if (form.id === "eventForm") {
        const payload = Object.fromEntries(new FormData(form));
        const { error } = await state.client.from("operation_events").insert({
          operation_id: form.dataset.operationId,
          event_time: payload.event_time, title: payload.title,
          description: payload.description || null, event_type: payload.event_type,
          quantity: Number(payload.quantity || 0) || null,
          unit: payload.unit === "-" ? null : payload.unit,
          created_by: state.user.id
        });
        if (error) throw error;
      }

      if (form.id === "actionItemForm") {
        const payload = Object.fromEntries(new FormData(form));
        const row = {
          qhse_record_id: form.dataset.qhseId, title: payload.title,
          description: payload.description || null, responsible: payload.responsible || null,
          due_date: payload.due_date || null, status: payload.status,
          completed_at: payload.status === "Concluído" ? new Date().toISOString() : null
        };
        const query = form.dataset.id
          ? state.client.from("action_items").update(row).eq("id", form.dataset.id)
          : state.client.from("action_items").insert({ ...row, created_by: state.user.id });
        const { error } = await query;
        if (error) throw error;
      }

      if (form.id === "maintenanceOrderForm") {
        const files = [...(form.querySelector('[name="attachment"]')?.files || [])];
        const payload = Object.fromEntries(new FormData(form));
        delete payload.attachment;
        const recordId = await saveMaintenanceOrder(payload, form.dataset.id || null);
        if (files.length) await uploadAttachments("maintenance", recordId, files);
      }

      if (form.id === "userForm") {
        if (!isAdmin()) throw new Error("Somente o administrador pode alterar usuários.");
        const payload = Object.fromEntries(new FormData(form));
        if (form.dataset.userId === state.user.id && payload.active !== "true") {
          throw new Error("Você não pode bloquear o próprio acesso.");
        }
        if (form.dataset.userId === state.user.id && payload.role !== "admin") {
          throw new Error("O administrador atual não pode remover o próprio cargo.");
        }
        const permissions = {};
        ["dashboard", "operations", "tanks", "fluids", "chemicals", "trucks", "qhse", "maintenance", "certificates", "alerts", "reports"].forEach(module => {
          permissions[module] = form.querySelector(`[name="perm_${module}"]`)?.checked === true;
        });
        const { error } = await state.client.from("profiles").update({
          full_name: payload.full_name,
          role: payload.role,
          department: payload.department || null,
          active: payload.active === "true",
          permissions
        }).eq("id", form.dataset.userId);
        if (error) throw error;
      }

      if (form.id === "attachmentUploadForm") {
        const files = [...(form.querySelector('[name="attachment"]')?.files || [])];
        if (!files.length) throw new Error("Selecione pelo menos um arquivo.");
        await uploadAttachments(form.dataset.module, form.dataset.recordId, files);
      }

      await loadData();
      renderAll();
      closeModal();
      toast("Registro salvo com sucesso.", "success");
    } catch (error) {
      try {
        if (state.client && state.user) await state.client.from("system_errors").insert({ user_id: state.user.id, context: `form:${form.id || "unknown"}`, message: error.message, stack: error.stack || null, user_agent: navigator.userAgent });
      } catch (_) {}
      toast(`Erro: ${error.message}`, "error");
    }
  });

  document.addEventListener("click", async event => {
    const button = event.target.closest("button");
    if (!button) return;

    if (button.id === "loginBtn") return login();
    if (button.id === "logoutBtn") return logout();
    if (button.id === "menuBtn") return $("#sidebar").classList.toggle("open");
    if (button.id === "modalClose" || button.hasAttribute("data-close-modal")) return closeModal();
    if (button.classList.contains("nav-item")) return showPage(button.dataset.page);
    if (button.closest(".user-chip")) return showPage("settings");
    if (button.id === "notificationsBtn") return showPage("alerts");

    const action = button.dataset.action;
    if (action === "refresh") {
      try { await loadData(); renderAll(); toast("Dados atualizados."); } catch (e) { toast(e.message, "error"); }
      return;
    }
    if (action === "apply-dashboard-filters") {
      state.filters = { start: $("#filterStart")?.value || "", end: $("#filterEnd")?.value || "", client: $("#filterClient")?.value || "", product: $("#filterProduct")?.value || "" };
      renderDashboard(); renderOperations(); renderTrucks();
      return;
    }
    if (action === "clear-dashboard-filters") {
      state.filters = { start: "", end: "", client: "", product: "" };
      renderDashboard(); renderOperations(); renderTrucks();
      return;
    }

    if (action === "save-tank-volume") {
      try {
        await saveTankVolume(button.closest("form"), button);
      } catch (error) {
        toast(`Erro ao atualizar volume: ${error.message}`, "error");
      }
      return;
    }
    if (action === "new-operation") return openModal("Nova operação", operationForm(), "OPERAÇÃO");
    if (action === "new-tank-transfer") return openModal("Transferência entre tanques", tankTransferForm(), "TRANSFERÊNCIA");
    if (action === "new-user") return openModal("Novo usuário", newUserForm(), "USUÁRIO");
    if (action === "show-fefo") {
      const items = [...state.data.chemicals].filter(x => x.quantity > 0).sort((a,b) => (a.expiry_date || "9999-12-31").localeCompare(b.expiry_date || "9999-12-31"));
      return openModal("Ordem de consumo FEFO", `<div class="info-box">Consumir primeiro os lotes que vencem antes.</div><div class="attachment-list" style="margin-top:12px">${items.map((item,index) => `<div class="attachment-item"><div class="attachment-icon">${index+1}</div><div class="attachment-info"><strong>${esc(item.name)} — lote ${esc(item.lot || "-")}</strong><small>Validade ${dateOnly(item.expiry_date)} • ${fmt.format(item.quantity)} ${esc(item.unit)}</small></div>${badge(chemicalDisplayStatus(item))}</div>`).join("") || `<div class="empty">Nenhum lote disponível.</div>`}</div>`, "FEFO");
    }
    if (action === "new-fluid") return openModal("Adicionar produto", genericForm("fluid"), "PRODUTO");
    if (action === "new-chemical") return openModal("Novo produto químico/lote", chemicalForm(), "INVENTÁRIO");
    if (action === "new-truck") return openModal("Nova movimentação", genericForm("truck"), "CARRETA");
    if (action === "new-qhse") return openModal("Novo registro QHSE", genericForm("qhse"), "QHSE");
    if (action === "new-equipment") return openModal("Novo equipamento", genericForm("equipment"), "EQUIPAMENTO");
    if (action === "new-certificate") return openModal("Adicionar certificado", genericForm("certificate"), "CERTIFICADO");
    if (action === "new-alert") return openModal("Criar alerta", genericForm("alert"), "ALERTA");
    if (action === "new-maintenance-order") return openModal("Nova ordem de serviço", maintenanceOrderForm(), "MANUTENÇÃO");

    if (action === "send-message") {
      const text = $("#chatText")?.value.trim();
      if (!text) return;
      const { error } = await state.client.from("chat_messages").insert({
        channel: "operacao-geral", sender_id: state.user.id,
        sender_name: state.data.profile.name, message: text
      });
      if (error) return toast(error.message, "error");
      await loadData(); renderAlerts();
      return;
    }

    if (action === "smart-query") {
      const answer = smartAnswer($("#smartQuestion").value.trim());
      const el = $("#smartAnswer");
      el.textContent = answer;
      el.classList.remove("hidden");
      return;
    }

    if (action === "copy-handover") {
      await navigator.clipboard.writeText(handoverText());
      return toast("Passagem de serviço copiada.");
    }

    if (action === "toggle-theme") {
      const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      applyTheme(next);
      return;
    }

    if (button.dataset.editFluid) {
      const item = state.data.fluids.find(x => x.id === button.dataset.editFluid);
      return openModal(`Editar produto — ${item.name}`, genericForm("fluid", item), "ADMIN");
    }

    if (button.dataset.editTruck) {
      const item = state.data.trucks.find(x => x.id === button.dataset.editTruck);
      return openModal(`Editar carreta — ${item.plate || item.product}`, genericForm("truck", item), "ADMIN");
    }

    if (button.dataset.editQhse) {
      const item = state.data.qhse.find(x => x.id === button.dataset.editQhse);
      return openModal(`Editar QHSE — ${item.title}`, genericForm("qhse", item), "ADMIN");
    }

    if (button.dataset.editEquipment) {
      const item = state.data.equipment.find(x => x.id === button.dataset.editEquipment);
      return openModal(`Editar equipamento — ${item.name}`, genericForm("equipment", item), "ADMIN");
    }

    if (button.dataset.editCertificate) {
      const item = state.data.certificates.find(x => x.id === button.dataset.editCertificate);
      return openModal(`Editar certificado — ${item.title}`, genericForm("certificate", item), "ADMIN");
    }

    if (button.dataset.editAlert) {
      const item = state.data.alerts.find(x => x.id === button.dataset.editAlert);
      return openModal(`Editar alerta — ${item.title}`, genericForm("alert", item), "ADMIN");
    }

    if (button.dataset.editChemical) {
      const item = state.data.chemicals.find(x => x.id === button.dataset.editChemical);
      return openModal(`Editar — ${item.name}`, chemicalForm(item), "INVENTÁRIO");
    }

    if (button.dataset.chemicalMove) {
      const item = state.data.chemicals.find(x => x.id === button.dataset.chemicalMove);
      return openModal(`Movimentar — ${item.name}`, chemicalMovementForm(item), "MOVIMENTAÇÃO");
    }

    if (button.dataset.chemicalHistory) {
      const item = state.data.chemicals.find(x => x.id === button.dataset.chemicalHistory);
      const history = state.data.chemicalMovements.filter(x => x.inventory_id === item.id);
      const rows = history.map(movement => {
        const user = state.data.users.find(x => x.id === movement.performed_by)?.name || "Usuário";
        return `<div class="timeline-item"><span class="timeline-dot"></span><div>
          <strong>${esc(movement.movement_type)} — ${fmt.format(movement.quantity)} ${esc(item.unit)}</strong>
          <small>${dateTime(movement.created_at)} • ${esc(user)}</small>
          <p>Saldo: ${fmt.format(movement.previous_balance)} → ${fmt.format(movement.new_balance)} ${esc(item.unit)}<br>
          Referência: ${esc(movement.reference || "-")}<br>${esc(movement.notes || "")}</p>
        </div></div>`;
      }).join("");
      return openModal(`Histórico — ${item.name}`, `<div class="timeline professional-timeline">${rows || `<div class="empty">Nenhuma movimentação registrada.</div>`}</div>`, "RASTREABILIDADE");
    }

    if (button.dataset.export) {
      exportData(button.dataset.export);
      return;
    }

    if (button.dataset.goModule) {
      return showPage(button.dataset.goModule);
    }

    if (button.dataset.applyOperationTank) {
      if (!confirm("Aplicar a quantidade executada na volumetria vinculada?")) return;
      const { error } = await state.client.rpc("apply_completed_operation_tank_movement", { p_operation_id: button.dataset.applyOperationTank });
      if (error) return toast(error.message, "error");
      await loadData(); renderAll(); return toast("Movimentação aplicada à tancagem.", "success");
    }

    if (button.dataset.editOperation) {
      const operation = state.data.operations.find(x => x.id === button.dataset.editOperation);
      return openModal("Editar operação", operationForm(operation), "OPERAÇÃO");
    }

    if (button.dataset.operationTimeline) {
      const operation = state.data.operations.find(x => x.id === button.dataset.operationTimeline);
      const events = state.data.operationEvents.filter(x => x.operation_id === operation.id);
      const timeline = events.map(item => `<div class="timeline-item"><span class="timeline-dot"></span><div><strong>${esc(item.title)}</strong><small>${dateTime(item.event_time)} • ${esc(item.event_type)}</small><p>${esc(item.description || "")}</p>${item.quantity ? `<span class="tag">${fmt.format(item.quantity)} ${esc(item.unit || "")}</span>` : ""}</div></div>`).join("");
      return openModal(`Timeline — ${operation.vessel}`, `
        ${hasRole(["supervisor", "lider", "operador"]) ? `<button class="btn primary" data-add-event="${operation.id}">+ Adicionar evento</button>` : ""}
        <div class="timeline professional-timeline" style="margin-top:14px">${timeline || `<div class="empty">Nenhum evento registrado.</div>`}</div>
      `, "TIMELINE");
    }

    if (button.dataset.addEvent) return openModal("Adicionar evento", eventForm(button.dataset.addEvent), "TIMELINE");

    if (button.dataset.editTank) {
      const tank = state.data.tanks.find(x => x.id === button.dataset.editTank);
      return openModal(`Atualizar ${tank.name}`, tankForm(tank), "TANCAGEM");
    }

    if (button.dataset.tankHistory) {
      const tank = state.data.tanks.find(x => x.id === button.dataset.tankHistory);
      const history = state.data.tankHistory.filter(x => x.tank_id === tank.id);
      return openModal(`Histórico — ${tank.name}`, `<div class="timeline professional-timeline">${history.map(item => {
        const user = state.data.users.find(x => x.id === item.changed_by)?.name || "Usuário";
        return `<div class="timeline-item"><span class="timeline-dot"></span><div><strong>${esc(item.previous_product || "Vazio")} → ${esc(item.new_product || "Vazio")}</strong><small>${dateTime(item.created_at)} • ${esc(user)}</small><p>Lote: ${esc(item.previous_lot || "-")} → ${esc(item.new_lot || "-")}<br>Volume: ${fmt.format(item.previous_volume || 0)} → ${fmt.format(item.new_volume || 0)}<br>Densidade: ${item.previous_density !== null && item.previous_density !== undefined ? `${fmt.format(item.previous_density)} ${esc(item.previous_density_unit || "")}` : "-"} → ${item.new_density !== null && item.new_density !== undefined ? `${fmt.format(item.new_density)} ${esc(item.new_density_unit || "")}` : "-"}<br>Status: ${esc(item.previous_status || "-")} → ${esc(item.new_status || "-")}</p></div></div>`;
      }).join("") || `<div class="empty">Sem histórico.</div>`}</div>`, "HISTÓRICO");
    }

    if (button.dataset.tankMovements) {
      const tank = state.data.tanks.find(x => x.id === button.dataset.tankMovements);
      const movements = state.data.tankMovements.filter(x => x.source_tank_id === tank.id || x.destination_tank_id === tank.id);
      const rows = movements.map(item => {
        const source = state.data.tanks.find(x => x.id === item.source_tank_id)?.name;
        const destination = state.data.tanks.find(x => x.id === item.destination_tank_id)?.name;
        const direction = item.source_tank_id === tank.id ? "Saída" : "Entrada";
        return `<div class="timeline-item"><span class="timeline-dot"></span><div><strong>${esc(direction)} — ${fmt.format(item.quantity)} ${esc(item.unit)}</strong><small>${dateTime(item.created_at)} • ${esc(item.movement_type)}</small><p>${source && destination ? `${esc(source)} → ${esc(destination)}<br>` : ""}Produto: ${esc(item.product || "-")} • Lote: ${esc(item.lot || "-")}<br>Referência: ${esc(item.reference || "-")}</p></div></div>`;
      }).join("");
      return openModal(`Movimentações — ${tank.name}`, `<div class="timeline professional-timeline">${rows || `<div class="empty">Nenhuma movimentação registrada.</div>`}</div>`, "RASTREABILIDADE");
    }

    if (button.dataset.qhseActions) {
      const record = state.data.qhse.find(x => x.id === button.dataset.qhseActions);
      const actions = state.data.actionItems.filter(x => x.qhse_record_id === record.id);
      return openModal(`Ações — ${record.title}`, `
        ${hasRole(["supervisor", "lider", "qhse"]) ? `<button class="btn primary" data-add-action="${record.id}">+ Nova ação</button>` : ""}
        <div class="section-title">Itens de ação</div>
        <div class="attachment-list">${actions.map(item => `<div class="attachment-item"><div class="attachment-icon">✓</div><div class="attachment-info"><strong>${esc(item.title)}</strong><small>${esc(item.responsible || "Sem responsável")} • Prazo ${dateOnly(item.due_date)}</small></div>${badge(item.status)}${isAdmin() ? `<button class="btn small primary" data-edit-action="${item.id}">Editar</button>` : ""}</div>`).join("") || `<div class="empty">Nenhuma ação cadastrada.</div>`}</div>
      `, "QHSE");
    }

    if (button.dataset.addAction) return openModal("Nova ação QHSE", actionItemForm(button.dataset.addAction), "AÇÃO");
    if (button.dataset.editAction) {
      const item = state.data.actionItems.find(x => x.id === button.dataset.editAction);
      return openModal("Editar ação QHSE", actionItemForm(item.qhse_record_id, item), "ADMIN");
    }

    if (button.dataset.newOrderEquipment) return openModal("Nova ordem de serviço", maintenanceOrderForm({}, button.dataset.newOrderEquipment), "MANUTENÇÃO");

    if (button.dataset.editOrder) {
      const order = state.data.maintenanceOrders.find(x => x.id === button.dataset.editOrder);
      return openModal("Editar ordem de serviço", maintenanceOrderForm(order), "MANUTENÇÃO");
    }

    if (button.dataset.editUser) {
      const user = state.data.users.find(x => x.id === button.dataset.editUser);
      return openModal(`Gerenciar ${user.name}`, userForm(user), "USUÁRIO");
    }

    if (button.dataset.attachments) {
      const [module, recordId] = button.dataset.attachments.split(":");
      return showAttachments(module, recordId, button.dataset.attachmentTitle || "Registro");
    }

    if (button.dataset.deleteAttachment) {
      if (!confirm("Excluir este anexo permanentemente?")) return;
      const item = state.data.attachments.find(x => x.id === button.dataset.deleteAttachment);
      const { error: storageError } = await state.client.storage.from("opscontrol-files").remove([item.file_path]);
      if (storageError) return toast(storageError.message, "error");
      const { error } = await state.client.from("attachments").delete().eq("id", item.id);
      if (error) return toast(error.message, "error");
      await loadData(); closeModal(); renderAll(); return toast("Anexo excluído.");
    }

    if (button.dataset.printPage) {
      const oldPage = state.page;
      showPage(button.dataset.printPage);
      setTimeout(() => { window.print(); showPage(oldPage); }, 120);
    }
  });

  document.addEventListener("change", event => {
    if (event.target.closest("#operationForm") && event.target.name === "activity") syncOperationTankFields(event.target.closest("#operationForm"));
    if (event.target.closest("#tankTransferForm")) updateTransferPreview(event.target.closest("#tankTransferForm"));
    if (event.target.closest("#tankForm") && event.target.name === "fluid_type_id") syncTankCatalogFields(event.target.closest("#tankForm"));
    if (event.target.closest('#genericForm[data-kind="fluid"]') && event.target.name === "type") syncFluidDensityUnit(event.target.closest("form"));
  });

  document.addEventListener("input", event => {
    if (event.target.closest("#tankTransferForm") && event.target.name === "quantity") updateTransferPreview(event.target.closest("#tankTransferForm"));
  });

  $("#modal").addEventListener("click", event => {
    if (event.target === $("#modal")) closeModal();
  });

  $("#loginPassword").addEventListener("keydown", event => {
    if (event.key === "Enter") login();
  });

  window.addEventListener("online", updateConnectionBadge);
  window.addEventListener("offline", updateConnectionBadge);

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(console.error));
  }

  $("#connectionHint").textContent = "Acesse com seu e-mail e senha cadastrados.";
  restoreSession();
})();