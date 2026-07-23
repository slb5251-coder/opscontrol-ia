# Mapa de autenticação e sessão

Gerado automaticamente a partir de `js/app.js`. Este arquivo é temporário e serve para planejar uma extração segura.

- Funções totais encontradas: **310**
- Funções relacionadas a autenticação/configuração: **32**
- Referências diretas encontradas: **25**

## Funções relacionadas

### `clientLogoConfig(client = "")`

- Linhas: `249-257`
- Assíncrona: `não`
- Dependências internas chamadas: nenhuma

```js
  function clientLogoConfig(client = "") {
    const normalized = normalizeSearch(client);
    if (!normalized) return null;
    if (normalized.includes("equinor")) return { src: "assets/client-logos/equinor.png", alt: "Equinor" };
    if (normalized.includes("petrobras") || normalized === "br") return { src: "assets/client-logos/petrobras.gif", alt: "Petrobras" };
    if (normalized.includes("prio") || normalized === "pro") return { src: "assets/client-logos/prio.png", alt: "PRIO" };
    return null;
  }
```

### `clientLogoBadge(client = "", fallbackIcon = "calendar", extraClass = "")`

- Linhas: `258-264`
- Assíncrona: `não`
- Dependências internas chamadas: `clientLogoConfig`

```js
  function clientLogoBadge(client = "", fallbackIcon = "calendar", extraClass = "") {
    const logo = clientLogoConfig(client);
    const classes = ["client-logo-badge", extraClass].filter(Boolean).join(" ");
    if (logo) return `<span class="${classes}" title="${esc(logo.alt)}"><img src="${logo.src}" alt="${esc(logo.alt)}" loading="lazy"></span>`;
    return `<span class="${classes} client-logo-fallback" title="${esc(client || "Operação")}">${uiIcon(fallbackIcon)}</span>`;
  }
```

### `showLoginMessage(message, kind = "error")`

- Linhas: `635-641`
- Assíncrona: `não`
- Dependências internas chamadas: nenhuma

```js
  function showLoginMessage(message, kind = "error") {
    const el = $("#loginMessage");
    el.textContent = message;
    el.classList.toggle("success", kind === "success");
    el.classList.remove("hidden");
  }
```

### `clearLoginMessage()`

- Linhas: `642-648`
- Assíncrona: `não`
- Dependências internas chamadas: nenhuma

```js
  function clearLoginMessage() {
    const el = $("#loginMessage");
    el.textContent = "";
    el.classList.remove("success");
    el.classList.add("hidden");
  }
```

### `setLoginLoading(loading, label = "Entrando...")`

- Linhas: `649-657`
- Assíncrona: `não`
- Dependências internas chamadas: nenhuma

```js
  function setLoginLoading(loading, label = "Entrando...") {
    const button = $("#loginBtn");
    if (!button) return;
    button.disabled = loading;
    button.classList.toggle("is-loading", loading);
    const text = button.querySelector("span");
    if (text) text.textContent = loading ? label : "Entrar";
  }
```

### `canManageClientTickets()`

- Linhas: `694-697`
- Assíncrona: `não`
- Dependências internas chamadas: `hasRole`

```js
  function canManageClientTickets() {
    return hasRole(["supervisor", "lider", "logistica", "operador", "qhse"]);
  }
```

### `canDeleteClientTickets()`

- Linhas: `698-701`
- Assíncrona: `não`
- Dependências internas chamadas: `hasRole`

```js
  function canDeleteClientTickets() {
    return hasRole(["supervisor"]);
  }
```

### `csvEscape(value)`

- Linhas: `876-3417`
- Assíncrona: `não`
- Dependências internas chamadas: `addOperationAllocationRow`, `aggregateOperationVolume`, `allocationsForOperation`, `applySiloCapacityModels`, `applyTheme`, `attachmentCount`, `auditChangeSummary`, `backupPayload`, `badge`, `canDeleteVesselRegistry`, `canManageVesselRegistry`, `changeTvSlide`, `chemicalDisplayStatus`, `cleanVesselIdentifier`, `clearLoginMessage`, `clientLogoBadge`, `clientTicketDocuments`, `clientTicketMetrics`, `collectOperationAllocations`, `collectTruckPlatformItems`, `dashboardRoleHome`, `dataQualityIssues`, `decorateSidebarNavigation`, `downloadCsv`, `downloadJson`, `exportData`, `fileSizeLabel`, `filterIsActive`, `filteredClientTickets`, `filteredOperations`, `filteredTrucks`, `filteredVessels`, `formActions`, `groupedChemicalInventory`, `hasFileSelection`, `hasRole`, `haversineNm`, `header`, `initVesselMap`, `isAdmin`, `isSiloAsset`, `latestClosingReconciliationPanel`, `latestLocalBackup`, `loadData`, `login`, `logout`, `marineTrafficOperationButton`, `marineTrafficVesselButton`, `moduleAllowed`, `normalizedOperationAllocations`, `offlineQueue`, `openApp`, `openAppProfileHeader`, `openDeepLinkedAsset`, `openModal`, `openPasswordRecovery`, `operationAllocationHtml`, `operationAllocationRow`, `operationAllocationText`, `operationCatalogOptions`, `operationCatalogProducts`, `operationFieldValue`, `operationFlow`, `operationForm`, `operationHours`, `operationPriorityCard`, `operationTankOptions`, `parseTankVolume`, `planningAssessment`, `planningCard`, `productClass`, `queueOfflineForm`, `reconciliationSummary`, `refreshOperationAllocationOptions`, `refreshRealtime`, `renderAll`, `renderDashboard`, `renderDashboardLegacy`, `renderFigmaDashboard`, `renderMobileShell`, `renderModuleSafely`, `renderOperations`, `renderQuality`, `renderSanitation`, `renderTv`, `renderVesselRegistry`, `renderVessels`, `replayOfflineAction`, `requestPasswordRecovery`, `resolveLoginEmail`, `restoreSession`, `role`, `safeFileName`, `sanitationIssues`, `saveEntity`, `saveLocalDailyBackup`, `saveOfflineQueue`, `saveTruck`, `saveVesselRegistry`, `scheduleRealtimeRefresh`, `scheduleVesselFilterRender`, `scheduleVesselMapInit`, `selectedOperationCatalogItem`, `setLoginLoading`, `setOperationStep`, `setupMobilePullToRefresh`, `showLoginMessage`, `showPage`, `startAutoRefresh`, `startTvMode`, `statCard`, `statusClass`, `stopTvMode`, `storageCard`, `subscribeRealtime`, `syncOfflineQueue`, `syncOperationCatalogFields`, `syncOperationTankFields`, `syncOperationVessel`, `tankMovementMode`, `toast`, `trucksForPage`, `tvActiveOperations`, `tvAlertsSlide`, `tvCriticalAlerts`, `tvDashboardSlide`, `tvOperationAllocations`, `tvOperationTile`, `tvOperationsSlide`, `tvPhaseAssets`, `tvPlantSlide`, `tvTankTile`, `updateConnectionBadge`, `updateOperationAllocationSummary`, `updateOperationReview`, `updateTvClock`, `validateOperationStep`, `vesselAlertTone`, `vesselEtaInfo`, `vesselGeofence`, `vesselLatestPosition`, `vesselMapFallback`, `vesselPositionSummary`, `vesselRegistryForm`, `vesselSignalInfo`

```js
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

  function downloadJson(filename, value) {
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function offlineQueue() {
    try { return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]"); }
    catch (_) { return []; }
  }

  function saveOfflineQueue(items) {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(items.slice(-100)));
    updateConnectionBadge();
    openDeepLinkedAsset();
  }

  function hasFileSelection(form) {
    return [...form.querySelectorAll('input[type="file"]')].some(input => input.files?.length);
  }

  function queueOfflineForm(form) {
    if (hasFileSelection(form)) return false;
    const payload = Object.fromEntries(new FormData(form));
    let action = null;
    if (form.id === "truckForm") {
      delete payload.attachment;
      action = {
        type: "truck",
        id: form.dataset.id || null,
        payload,
        items: collectTruckPlatformItems(form, false)
      };
    } else if (form.id === "genericForm" && ["qhse", "alert"].includes(form.dataset.kind)) {
      action = { type: "entity", kind: form.dataset.kind, id: form.dataset.id || null, payload };
    } else if (form.id === "eventForm") {
      action = { type: "event", operationId: form.dataset.operationId, payload };
    } else if (form.id === "actionItemForm") {
      action = { type: "action_item", id: form.dataset.id || null, qhseId: form.dataset.qhseId || null, payload };
    } else if (form.id === "handoverPendingForm") {
      action = { type: "handover_pending", id: form.dataset.id || null, payload };
    }
    if (!action) return false;
    const queue = offlineQueue();
    queue.push({ id: uid("offline"), queued_at: new Date().toISOString(), ...action });
    saveOfflineQueue(queue);
    return true;
  }

  async function replayOfflineAction(action) {
    if (action.type === "truck") return saveTruck(action.payload, action.id, action.items || []);
    if (action.type === "entity") return saveEntity(action.kind, action.payload, action.id);
    if (action.type === "event") {
      const p = action.payload;
      const { error } = await state.client.from("operation_events").insert({
        operation_id: action.operationId, event_time: p.event_time, title: p.title,
        description: p.description || null, event_type: p.event_type,
        quantity: Number(p.quantity || 0) || null, unit: p.unit === "-" ? null : p.unit,
        created_by: state.user.id
      });
      if (error) throw error;
      return;
    }
    if (action.type === "action_item") {
      const p = action.payload;
      const row = { qhse_record_id: action.qhseId, title: p.title, description: p.description || null,
        responsible: p.responsible || null, due_date: p.due_date || null, status: p.status,
        completed_at: p.status === "Concluído" ? new Date().toISOString() : null };
      const query = action.id ? state.client.from("action_items").update(row).eq("id", action.id)
        : state.client.from("action_items").insert({ ...row, created_by: state.user.id });
      const { error } = await query; if (error) throw error; return;
    }
    if (action.type === "handover_pending") {
      const p = action.payload; const completed = p.status === "Concluído";
      const row = { title:p.title, description:p.description||null, category:p.category,
        responsible:p.responsible||null, priority:p.priority, status:p.status,
        due_at:p.due_at ? new Date(p.due_at).toISOString() : null,
        completed_at:completed?new Date().toISOString():null, completed_by:completed?state.user.id:null };
      const query = action.id ? state.client.from("handover_pending_items").update(row).eq("id",action.id)
        : state.client.from("handover_pending_items").insert({ ...row, created_by:state.user.id });
      const { error } = await query; if (error) throw error;
    }
  }

  async function syncOfflineQueue() {
    if (state.offlineSyncing || !navigator.onLine || !state.client || !state.user) return;
    const queue = offlineQueue();
    if (!queue.length) return;
    state.offlineSyncing = true;
    const remaining = [];
    let synced = 0;
    for (const action of queue) {
      try { await replayOfflineAction(action); synced += 1; }
      catch (error) { remaining.push({ ...action, last_error: error.message }); }
    }
    saveOfflineQueue(remaining);
    state.offlineSyncing = false;
    if (synced) {
      await loadData(); renderAll();
      toast(`${synced} registro(s) offline sincronizado(s).`, "success");
    }
  }

  function backupPayload() {
    const d = state.data || {};
    return {
      generated_at: new Date().toISOString(), generated_by: d.profile?.name || "-", version: APP_VERSION,
      tanks: d.tanks || [], operations: d.operations || [], operationAllocations: d.operationAllocations || [],
      vessels: d.vessels || [], vesselPositions: d.vesselPositions || [],
      trucks: d.trucks || [], truckItems: d.truckItems || [],
      chemicalProducts: d.chemicalProducts || [], chemicals: d.chemicals || [], chemicalMovements: d.chemicalMovements || [],
      closings:d.closings || [], closingItems:d.closingItems || [], inventoryCounts:d.inventoryCounts || [],
      tankMovements: d.tankMovements || [], qhse: d.qhse || [], actionItems: d.actionItems || [],
      equipment: d.equipment || [], maintenanceOrders: d.maintenanceOrders || [],
      certificates: d.certificates || [], handoverPendings: d.handoverPendings || [],
      handoverNotes: d.handoverNotes || [], handoverApprovals: d.handoverApprovals || [],
      checklistItems: d.shiftChecklist || [], clientTickets: d.clientTickets || [], clientTicketDocuments: d.clientTicketDocuments || []
    };
  }

  function saveLocalDailyBackup() {
    if (!state.data) return;
    try {
      const today = localDateKey();
      const backups = JSON.parse(localStorage.getItem(LOCAL_BACKUP_KEY) || "[]").filter(item => item.date !== today);
      backups.push({ date: today, created_at: new Date().toISOString(), data: backupPayload() });
      localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify(backups.slice(-3)));
    } catch (error) { console.warn("Backup local:", error); }
  }

  function latestLocalBackup() {
    try { return JSON.parse(localStorage.getItem(LOCAL_BACKUP_KEY) || "[]").slice(-1)[0] || null; }
    catch (_) { return null; }
  }

  function exportData(kind) {
    const date = new Date().toISOString().slice(0, 10);
    if (kind === "operations") {
      const rows = filteredOperations().map(op => [op.client, op.vessel, op.rig, op.well, op.ticketNumber, op.service_order, op.activity, op.product, op.fluidTypeId, op.lot, op.planned, op.executed, op.unit, operationAllocationText(op), op.status, op.start_at, op.end_at, op.paused_minutes, op.tank_movement_applied ? "Aplicada" : "Não aplicada"]);
      return downloadCsv(`operacoes-${date}.csv`, ["Cliente", "Embarcação", "Sonda", "Poço", "Ticket", "OS", "Atividade", "Produto", "ID do produto", "Lote", "Planejado", "Executado", "Unidade", "Distribuição tanques/silos", "Status", "Início", "Término", "Parado (min)", "Tancagem"], rows);
    }
    if (kind === "vessels") {
      const rows = filteredVessels().map(item => [item.vesselName, item.imo, item.mmsi, item.client, item.berth, item.destination, item.operationType, item.product, item.plannedQuantity, item.unit, item.eta, item.aisEta, item.distanceToPortNm ?? "", item.etb, item.etd, item.status, item.priority, item.aisEnabled ? "Sim" : "Não", item.aisSyncStatus, item.lastAisAt || ""]);
      return downloadCsv(`embarcacoes-${date}.csv`, ["Embarcação", "IMO", "MMSI", "Cliente", "Berço", "Destino AIS", "Operação", "Produto", "Quantidade planejada", "Unidade", "ETA programado", "ETA AIS", "Distância ao Porto (mn)", "ETB", "ETD", "Status", "Prioridade", "AIS", "Status sincronização", "Último AIS"], rows);
    }
    if (kind === "tanks") {
      const rows = state.data.tanks.map(t => [t.phase, t.name, t.kind, t.client || "A definir", t.product, t.lot, t.volume, t.capacity, t.unit, t.physicalCapacityM3 || "", t.status, t.updated_at]);
      return downloadCsv(`tancagem-${date}.csv`, ["Fase", "Tanque/Silo", "Tipo", "Cliente", "Produto", "Lote", "Volume", "Capacidade", "Unidade", "Volume físico (m³)", "Status", "Atualização"], rows);
    }
    if (kind === "chemicals") {
      const totals = new Map(groupedChemicalInventory().map(item => [item.id, item.total]));
      const rows = state.data.chemicals.map(c => [c.name, c.category, totals.get(c.productId) || 0, c.lot || "Sem lote", c.quantity, c.unit, c.minimum, c.expiry_date, c.location, c.supplier, chemicalDisplayStatus(c)]);
      return downloadCsv(`inventario-quimico-${date}.csv`, ["Produto", "Categoria", "Total do produto", "Lote", "Quantidade do lote", "Unidade", "Mínimo do lote", "Validade", "Localização", "Fornecedor", "Status"], rows);
    }
    if (kind === "trucks") {
      const truckRows = state.page === "trucks" ? trucksForPage() : filteredTrucks();
      const rows = truckRows.flatMap(t => t.truckType === "Plataforma" && t.items.length
        ? t.items.map((item,index) => [t.date,t.movement,t.truckType,t.supplier,t.client,item.productName,"",item.quantity,item.unit,index+1,t.items.length,t.plate,t.driver,t.invoice,t.status])
        : [[t.date,t.movement,t.truckType,t.supplier,t.client,t.product,t.lot,t.quantity,t.unit,1,1,t.plate,t.driver,t.invoice,t.status]]);
      return downloadCsv(`carretas-${date}.csv`, ["Data","Movimento","Tipo da carreta","Origem/Destino","Cliente","Produto","Lote","Quantidade","Unidade","Item","Total de itens","Placa","Motorista","NF","Status"], rows);
    }
    if (kind === "client-tickets") {
      const rows = filteredClientTickets().map(ticket => {
        const metrics = clientTicketMetrics(ticket);
        return [ticket.ticketNumber,ticket.date,ticket.client,ticket.title,ticket.vessel,ticket.serviceOrder,ticket.responsible,ticket.status,metrics.complete,metrics.total,metrics.missing.join(" / "),clientTicketDocuments(ticket.id).map(doc => `${doc.documentType}: ${doc.fileName}`).join(" | ")];
      });
      return downloadCsv(`tickets-clientes-${date}.csv`, ["Ticket","Data","Cliente","Título","Embarcação","OS","Responsável","Status","Documentos anexados","Documentos exigidos","Pendentes","Arquivos"], rows);
    }
    if (kind === "maintenance") {
      const rows = state.data.equipment.map(e => [e.name, e.category, e.status, e.hourmeter, e.next_maintenance_date, e.maintenance_due_hourmeter, e.location]);
      return downloadCsv(`manutencao-${date}.csv`, ["Equipamento", "Categoria", "Status", "Horímetro", "Próxima preventiva", "Horímetro limite", "Localização"], rows);
    }
    if (kind === "audit") {
      const rows = state.data.auditLogs.map(x => [x.created_at, state.data.users.find(u=>u.id===x.changed_by)?.name||"Sistema", x.table_name, x.action, x.record_id, auditChangeSummary(x)]);
      return downloadCsv("auditoria.csv", ["Data","Usuário","Tabela","Ação","Registro","Alterações"], rows);
    }
    if (kind === "quality") {
      const rows = dataQualityIssues().map(x => [x.severity, x.category, x.title, x.detail, x.page, x.entityType, x.entityId]);
      return downloadCsv(`qualidade-dados-${localDateKey()}.csv`, ["Severidade","Categoria","Pendência","Detalhe","Módulo","Tipo","ID"], rows);
    }
  }

  function operationFieldValue(form, name) {
    return form?.querySelector(`[name="${name}"]:not([disabled])`)?.value
      ?? form?.querySelector(`[name="${name}"]`)?.value
      ?? "";
  }


  function operationCatalogProducts(op = {}) {
    const currentId = op.fluidTypeId || "";
    return (state.data?.fluids || [])
      .filter(item => item.active !== false || item.id === currentId)
      .sort((a, b) => {
        const bulkA = ["granel", "insumo"].includes(String(a.type || "").toLowerCase()) ? 1 : 0;
        const bulkB = ["granel", "insumo"].includes(String(b.type || "").toLowerCase()) ? 1 : 0;
        return bulkA - bulkB || a.name.localeCompare(b.name);
      });
  }

  function operationCatalogOptions(op = {}) {
    const currentId = op.fluidTypeId || "";
    const products = operationCatalogProducts(op);
    const fluids = products.filter(item => !["granel", "insumo"].includes(String(item.type || "").toLowerCase()));
    const bulks = products.filter(item => ["granel", "insumo"].includes(String(item.type || "").toLowerCase()));
    const render = item => `<option value="${item.id}" data-product="${esc(item.name)}" data-unit="${esc(item.unit || "bbl")}" data-category="${esc(item.type || "")}" ${item.id === currentId ? "selected" : ""}>${esc(item.name)}${item.active === false ? " — inativo (histórico)" : ""}</option>`;
    return `${fluids.length ? `<optgroup label="Fluidos">${fluids.map(render).join("")}</optgroup>` : ""}${bulks.length ? `<optgroup label="Granéis">${bulks.map(render).join("")}</optgroup>` : ""}`;
  }

  function selectedOperationCatalogItem(form) {
    const id = form?.elements?.fluid_type_id?.value || "";
    return (state.data?.fluids || []).find(item => item.id === id) || null;
  }

  function syncOperationCatalogFields(form, resetAllocations = false) {
    if (!form) return;
    const select = form.elements.fluid_type_id;
    const unitInput = form.elements.unit;
    const selected = selectedOperationCatalogItem(form);

    if (unitInput) unitInput.value = selected?.unit || "";
    const category = form.querySelector("[data-operation-product-category]");
    if (category) {
      category.textContent = selected
        ? `${selected.type} • unidade ${selected.unit}${selected.density ? ` • densidade ${fmt.format(selected.density)} ${selected.densityUnit || ""}` : ""}`
        : "Selecione um produto cadastrado.";
    }

    if (resetAllocations && form.dataset.allocationLocked !== "true") {
      const list = form.querySelector("[data-operation-allocation-list]");
      const mode = tankMovementMode(operationFieldValue(form, "activity"));
      if (list) {
        list.innerHTML = mode === "none"
          ? ""
          : operationAllocationRow({}, mode === "out" ? "source" : "destination", selected?.unit || "bbl", false, selected?.id || "");
      }
    }
    syncOperationTankFields(form);
  }

  function allocationsForOperation(operationId) {
    if (!operationId) return [];
    return (state.data?.operationAllocations || [])
      .filter(item => item.operation_id === operationId)
      .sort((a, b) => a.display_order - b.display_order);
  }

  function normalizedOperationAllocations(op = {}) {
    const stored = allocationsForOperation(op.id);
    if (stored.length) return stored;
    const mode = tankMovementMode(op.activity);
    if (mode === "out" && op.source_tank_id) {
      return [{ direction: "source", tank_id: op.source_tank_id, quantity: Number(op.executed || 0), unit: op.unit, display_order: 0 }];
    }
    if (mode === "in" && op.destination_tank_id) {
      return [{ direction: "destination", tank_id: op.destination_tank_id, quantity: Number(op.executed || 0), unit: op.unit, display_order: 0 }];
    }
    return [];
  }

  function operationAllocationText(op) {
    const allocations = normalizedOperationAllocations(op);
    if (!allocations.length) return "Não distribuída";
    return allocations.map(item => {
      const tank = state.data.tanks.find(t => t.id === item.tank_id);
      return `${tank?.name || "Equipamento"}: ${fmt.format(item.quantity)} ${item.unit || op.unit}`;
    }).join(" + ");
  }

  function operationAllocationHtml(op) {
    const allocations = normalizedOperationAllocations(op);
    if (!allocations.length) return `<span class="muted">Não distribuída</span>`;
    return `<div class="operation-allocation-chips">${allocations.map(item => {
      const tank = state.data.tanks.find(t => t.id === item.tank_id);
      return `<span class="operation-allocation-chip"><strong>${esc(tank?.name || "Equipamento")}</strong>${fmt.format(item.quantity)} ${esc(item.unit || op.unit)}</span>`;
    }).join("")}</div>`;
  }

  function operationTankOptions(unit = "bbl", selectedId = "", direction = "source", fluidTypeId = "") {
    const phaseOrder = ["Phase #1", "Phase #2"];
    return phaseOrder.map(phase => {
      const options = state.data.tanks
        .filter(tank => tank.phase === phase)
        .filter(tank => tank.unit === unit || tank.id === selectedId)
        .filter(tank => {
          if (!fluidTypeId || tank.id === selectedId) return true;
          if (direction === "source") return tank.fluidTypeId === fluidTypeId;
          return Number(tank.volume || 0) <= 0 || tank.fluidTypeId === fluidTypeId;
        })
        .sort((a, b) => a.order - b.order)
        .map(tank => {
          const free = Math.max(0, Number(tank.capacity || 0) - Number(tank.volume || 0));
          const availability = direction === "source"
            ? `saldo ${fmt.format(tank.volume)} ${tank.unit}`
            : `livre ${fmt.format(free)} ${tank.unit}`;
          return `<option value="${tank.id}" ${tank.id === selectedId ? "selected" : ""}>${esc(tank.name)} — ${availability} — ${esc(tank.product || "Vazio")}</option>`;
        }).join("");
      return options ? `<optgroup label="${phase}">${options}</optgroup>` : "";
    }).join("");
  }

  function operationAllocationRow(allocation = {}, direction = "source", unit = "bbl", locked = false, fluidTypeId = "") {
    const rowId = uid("allocation");
    return `<div class="operation-allocation-row" data-operation-allocation-row data-direction="${direction}" data-row-id="${rowId}">
      <span class="allocation-number">#</span>
      <div class="allocation-tank-field">
        <label>Tanque ou silo</label>
        <select data-allocation-tank ${locked ? "disabled" : ""}>
          <option value="">Selecione o equipamento</option>
          ${operationTankOptions(unit, allocation.tank_id || "", direction, fluidTypeId)}
        </select>
      </div>
      <div class="allocation-quantity-field">
        <label>Quantidade</label>
        <div class="allocation-quantity-input"><input data-allocation-quantity type="text" inputmode="decimal" value="${allocation.quantity ? String(allocation.quantity).replace(".", ",") : ""}" placeholder="0" ${locked ? "readonly" : ""}><span data-allocation-unit>${esc(unit)}</span></div>
      </div>
      ${locked ? "" : `<button type="button" class="btn small danger outline allocation-remove" data-remove-operation-allocation aria-label="Remover equipamento">Remover</button>`}
    </div>`;
  }

  function refreshOperationAllocationOptions(form) {
    if (!form) return;
    const mode = tankMovementMode(operationFieldValue(form, "activity"));
    const direction = mode === "out" ? "source" : "destination";
    const unit = operationFieldValue(form, "unit") || "bbl";
    const fluidTypeId = form.elements.fluid_type_id?.value || "";
    form.querySelectorAll("[data-operation-allocation-row]").forEach((row, index) => {
      row.dataset.direction = direction;
      row.querySelector(".allocation-number").textContent = `${index + 1}.`;
      const select = row.querySelector("[data-allocation-tank]");
      const selected = select?.value || "";
      if (select) select.innerHTML = `<option value="">Selecione o equipamento</option>${operationTankOptions(unit, selected, direction, fluidTypeId)}`;
      const unitLabel = row.querySelector("[data-allocation-unit]");
      if (unitLabel) unitLabel.textContent = unit;
    });
  }

  function addOperationAllocationRow(form, allocation = {}) {
    const list = form?.querySelector("[data-operation-allocation-list]");
    if (!list) return;
    const mode = tankMovementMode(operationFieldValue(form, "activity"));
    if (mode === "none") return;
    const direction = mode === "out" ? "source" : "destination";
    const unit = operationFieldValue(form, "unit") || "bbl";
    list.insertAdjacentHTML("beforeend", operationAllocationRow(allocation, direction, unit, false, form.elements.fluid_type_id?.value || ""));
    refreshOperationAllocationOptions(form);
    updateOperationAllocationSummary(form);
  }

  function collectOperationAllocations(form) {
    const mode = tankMovementMode(operationFieldValue(form, "activity"));
    if (mode === "none") return [];
    const direction = mode === "out" ? "source" : "destination";
    const unit = operationFieldValue(form, "unit") || "bbl";
    const rows = [...form.querySelectorAll("[data-operation-allocation-row]")];
    const allocations = [];
    const used = new Set();

    rows.forEach((row, index) => {
      const tankId = row.querySelector("[data-allocation-tank]")?.value || "";
      const rawQuantity = row.querySelector("[data-allocation-quantity]")?.value || "";
      if (!tankId && !String(rawQuantity).trim()) return;
      if (!tankId) throw new Error(`Selecione o tanque ou silo na linha ${index + 1}.`);
      const quantity = parseTankVolume(rawQuantity);
      if (!Number.isFinite(quantity) || quantity <= 0) throw new Error(`Informe uma quantidade válida na linha ${index + 1}.`);
      if (used.has(tankId)) throw new Error("O mesmo tanque ou silo não pode aparecer duas vezes na distribuição.");
      const tank = state.data.tanks.find(item => item.id === tankId);
      if (!tank) throw new Error("Um dos equipamentos selecionados não foi localizado.");
      if (tank.unit !== unit) throw new Error(`${tank.name} utiliza ${tank.unit}, diferente da unidade da operação (${unit}).`);
      const fluidTypeId = form.elements.fluid_type_id?.value || "";
      if (direction === "source" && fluidTypeId && tank.fluidTypeId !== fluidTypeId) {
        throw new Error(`${tank.name} não possui o produto selecionado na operação.`);
      }
      if (direction === "destination" && fluidTypeId && Number(tank.volume || 0) > 0 && tank.fluidTypeId !== fluidTypeId) {
        throw new Error(`${tank.name} contém outro produto.`);
      }
      used.add(tankId);
      allocations.push({ direction, tank_id: tankId, quantity, unit, display_order: allocations.length });
    });

    return allocations;
  }

  function updateOperationAllocationSummary(form) {
    if (!form) return;
    const summary = form.querySelector("[data-operation-allocation-summary]");
    if (!summary) return;
    let allocations = [];
    try { allocations = collectOperationAllocations(form); } catch (_) {}
    const total = allocations.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const executed = parseTankVolume(form.querySelector('[name="executed"]')?.value || "0") || 0;
    const unit = operationFieldValue(form, "unit") || "bbl";
    const difference = executed-total;
    const complete = executed > 0 && Math.abs(difference) <= 0.001;
    summary.classList.toggle("allocation-complete", complete);
    summary.classList.toggle("allocation-pending", !complete);
    summary.innerHTML = `<div><strong>${fmt.format(total)} / ${fmt.format(executed)} ${esc(unit)}</strong><span>${allocations.length} equipamento(s) selecionado(s)</span></div><span>${complete ? "Distribuição completa" : difference > 0 ? `Faltam ${fmt.format(difference)} ${esc(unit)}` : difference < 0 ? `Excede ${fmt.format(Math.abs(difference))} ${esc(unit)}` : "Informe a quantidade executada"}</span>`;
  }

  function syncOperationTankFields(form) {
    if (!form) return;
    const mode = tankMovementMode(operationFieldValue(form, "activity"));
    const previousMode = form.dataset.allocationMode || mode;
    const field = form.querySelector(".operation-allocation-field");
    const list = form.querySelector("[data-operation-allocation-list]");
    const title = form.querySelector("[data-operation-allocation-title]");
    const addButton = form.querySelector("[data-add-operation-allocation]");
    const checkbox = form.elements.apply_tank_movement;
    const hint = form.querySelector("#operationTankHint");
    const locked = form.dataset.allocationLocked === "true";

    field?.classList.toggle("hidden", mode === "none");
    if (title) title.textContent = mode === "out" ? "Distribuição da saída por tanque/silo" : "Distribuição da entrada por tanque/silo";
    if (addButton) {
      addButton.classList.toggle("hidden", mode === "none" || locked);
      addButton.textContent = mode === "out" ? "+ Adicionar origem" : "+ Adicionar destino";
    }

    if (previousMode !== mode && !locked && list) {
      list.innerHTML = "";
      if (mode !== "none") list.innerHTML = operationAllocationRow({}, mode === "out" ? "source" : "destination", operationFieldValue(form, "unit") || "bbl", false, form.elements.fluid_type_id?.value || "");
    }
    form.dataset.allocationMode = mode;

    if (checkbox) {
      checkbox.disabled = mode === "none" || checkbox.dataset.applied === "true";
      if (mode === "none") checkbox.checked = false;
    }
    if (hint) {
      hint.textContent = mode === "out"
        ? "Distribua a quantidade executada entre todas as origens utilizadas."
        : mode === "in"
          ? "Distribua a quantidade executada entre todos os destinos utilizados."
          : "Esta atividade não altera a volumetria automaticamente.";
    }
    refreshOperationAllocationOptions(form);
    updateOperationAllocationSummary(form);
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

  async function initClient(remember = localStorage.getItem(REMEMBER_LOGIN_KEY) !== "false") {
    if (!state.config.url || !state.config.key || !window.supabase) {
      throw new Error("A conexão do sistema não está configurada.");
    }
    if (!state.client || state.clientRemember !== remember) {
      if (state.client && state.authListenerBound) {
        state.authListenerBound = false;
      }
      state.clientRemember = remember;
      state.client = window.supabase.createClient(state.config.url, state.config.key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: remember ? window.localStorage : window.sessionStorage,
          storageKey: remember ? "opscontrol-auth" : "opscontrol-auth-session"
        }
      });
    }
    if (!state.authListenerBound) {
      state.authListenerBound = true;
      state.client.auth.onAuthStateChange(event => {
        if (event === "PASSWORD_RECOVERY") {
          setTimeout(openPasswordRecovery, 0);
        }
      });
    }
    return state.client;
  }

  async function resolveLoginEmail(identifier) {
    const normalized = String(identifier || "").trim();
    if (normalized.includes("@")) return normalized.toLowerCase();
    const { data, error } = await state.client.rpc("resolve_login_email", { p_identifier: normalized });
    if (error || !data) throw new Error("Credenciais inválidas.");
    return String(data).trim().toLowerCase();
  }

  function openPasswordRecovery() {
    openModal("Definir nova senha", `<form id="passwordRecoveryForm"><div class="form-grid">
      <div class="wide"><label for="recoveryNewPassword">Nova senha *</label><input id="recoveryNewPassword" name="new_password" type="password" minlength="8" autocomplete="new-password" required></div>
      <div class="wide"><label for="recoveryConfirmPassword">Confirmar nova senha *</label><input id="recoveryConfirmPassword" name="confirm_password" type="password" minlength="8" autocomplete="new-password" required></div>
    </div><div class="info-box" style="margin-top:12px">Use pelo menos 8 caracteres. Após a alteração, entre novamente com a nova senha.</div>${formActions("Atualizar senha")}</form>`, "RECUPERAÇÃO DE ACESSO");
  }

  async function requestPasswordRecovery() {
    const identifier = $("#loginEmail").value.trim();
    if (!identifier) return showLoginMessage("Informe seu e-mail ou usuário para recuperar a senha.");
    const button = $("#forgotPasswordBtn");
    button.disabled = true;
    clearLoginMessage();
    try {
      await initClient($("#rememberLogin")?.checked !== false);
      const email = await resolveLoginEmail(identifier);
      const redirectTo = `${location.origin}${location.pathname}`;
      const { error } = await state.client.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      showLoginMessage("Se o acesso estiver cadastrado, enviaremos as instruções de recuperação por e-mail.", "success");
    } catch (_) {
      showLoginMessage("Se o acesso estiver cadastrado, enviaremos as instruções de recuperação por e-mail.", "success");
    } finally {
      button.disabled = false;
    }
  }

  async function login() {
    const identifier = $("#loginEmail").value.trim();
    const password = $("#loginPassword").value;
    if (!identifier || !password) return showLoginMessage("Preencha e-mail ou usuário e senha.");

    const remember = $("#rememberLogin")?.checked !== false;
    localStorage.setItem(REMEMBER_LOGIN_KEY, String(remember));
    clearLoginMessage();
    setLoginLoading(true);
    try {
      await initClient(remember);
      const email = await resolveLoginEmail(identifier);
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
      const blocked = String(error?.message || "").includes("bloqueado");
      showLoginMessage(blocked ? error.message : "Não foi possível entrar. Verifique suas credenciais e tente novamente.");
    } finally {
      setLoginLoading(false);
    }
  }

  async function restoreSession() {
    try {
      await initClient(localStorage.getItem(REMEMBER_LOGIN_KEY) !== "false");
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
      c.from("operations").select("*").order("start_at", { ascending: false }).limit(2000),
      c.from("operation_events").select("*").order("event_time", { ascending: true }).limit(5000),
      c.from("trucks").select("*").order("movement_date", { ascending: false }).limit(2000),
      c.from("qhse_records").select("*").order("record_date", { ascending: false }).limit(1000),
      c.from("action_items").select("*").order("due_date", { ascending: true }).limit(500),
      c.from("equipment").select("*").order("name"),
      c.from("diesel_logs").select("*").order("log_date", { ascending: false }).limit(500),
      c.from("maintenance_orders").select("*").order("opened_at", { ascending: false }).limit(500),
      c.from("certificates").select("*").order("expires_at"),
      c.from("alerts").select("*").order("created_at", { ascending: false }).limit(1000),
      c.from("chat_messages").select("*").order("created_at", { ascending: true }).limit(500),
      c.from("attachments").select("*").order("created_at", { ascending: false }).limit(1000),
      c.from("chemical_inventory").select("*").order("product_name").limit(1000),
      c.from("chemical_movements").select("*").order("created_at", { ascending: false }).limit(3000),
      c.from("tank_movements").select("*").order("created_at", { ascending: false }).limit(2000),
      c.from("inventory_alerts").select("*").order("created_at", { ascending: false }),
      c.from("operational_health_alerts").select("*").order("created_at", { ascending: false }),
      c.from("system_errors").select("*").order("created_at", { ascending: false }).limit(50),
      c.from("operation_tank_allocations").select("*").order("display_order", { ascending: true }),
      c.from("handover_pending_items").select("*").order("created_at", { ascending: false }).limit(1000),
      c.from("shift_handover_notes").select("*").order("shift_date", { ascending: false }).limit(500),
      c.from("operational_alert_center").select("*").order("created_at", { ascending: false }).limit(1000),
      c.from("shift_handover_approvals").select("*").order("shift_date", { ascending: false }).limit(500),
      c.from("shift_checklist_items").select("*").order("shift_date", { ascending: false }).limit(2000),
      c.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(1500),
      c.from("app_feedback").select("*").order("created_at", { ascending: false }).limit(500),
      c.from("truck_movement_items").select("*").order("display_order", { ascending: true }).limit(5000),
      c.from("chemical_products").select("*").order("name"),
      c.from("operational_closings").select("*").order("closing_date", { ascending: false }).order("shift", { ascending: true }).limit(200),
      c.from("closing_reconciliation_items").select("*").order("created_at", { ascending: false }).limit(10000),
      c.from("inventory_counts").select("*").order("counted_at", { ascending: false }).limit(5000),
      c.from("vessel_schedules").select("*").order("eta", { ascending: true }).limit(1000),
      c.from("latest_vessel_positions").select("*").order("position_time", { ascending: false }).limit(1000),
      c.from("vessel_positions").select("*").order("position_time", { ascending: false }).limit(3000),
      c.from("vessel_geofences").select("*").eq("active", true).order("created_at", { ascending: true }),
      c.from("vessel_ais_alerts").select("*").order("event_at", { ascending: false }).limit(1000),
      c.from("vessel_ais_sync_runs").select("*").order("started_at", { ascending: false }).limit(100),
      c.from("vessel_registry").select("*").order("name", { ascending: true }).limit(2000),
      c.from("dismissed_system_alerts").select("*").order("dismissed_at", { ascending: false }).limit(2000),
      c.from("client_document_tickets").select("*").order("ticket_date", { ascending: false }).order("created_at", { ascending: false }).limit(2000),
      c.from("client_ticket_documents").select("*").order("created_at", { ascending: false }).limit(5000)
    ]);

    if (results[0]?.error) throw results[0].error;

    const optionalAvailability = {
      vessels: !results[36]?.error,
      vesselPositions: !results[37]?.error,
      vesselPositionHistory: !results[38]?.error,
      vesselGeofences: !results[39]?.error,
      vesselAlerts: !results[40]?.error,
      vesselSyncRuns: !results[41]?.error,
      vesselRegistry: !results[42]?.error
    };

    results.forEach((result, index) => {
      if (!result?.error) return;
      console.warn(`Fonte opcional ${index} indisponível:`, result.error);
      results[index] = { data: [] };
    });

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
        avatarUrl: profile.avatar_url || "",
        active: profile.active !== false,
        permissions: profile.permissions || {}
      },
      users: (results[1].data || []).map(x => ({
        id: x.id, email: x.email || "", name: x.full_name || x.email || "Usuário",
        role: x.role || "user", department: x.department || "", avatarUrl: x.avatar_url || "", active: x.active !== false,
        permissions: x.permissions || {}, created_at: x.created_at
      })),
      fluids: (results[2].data || []).map(x => ({
        id: x.id, name: x.name, type: x.category, unit: x.default_unit,
        density: Number(x.density_value ?? x.density_ppg ?? 0),
        densityUnit: x.density_unit || (["granel", "insumo"].includes(String(x.category || "").toLowerCase()) ? "t/m³" : "ppg"),
        active: x.active !== false
      })),
      tanks: applySiloCapacityModels((results[3].data || []).map(x => ({
        id: x.id, name: x.name, phase: x.phase, kind: x.kind,
        capacity: Number(x.capacity), unit: x.unit, volume: Number(x.current_volume || 0),
        physicalCapacityM3: x.physical_capacity_m3 === null || x.physical_capacity_m3 === undefined
          ? null : Number(x.physical_capacity_m3),
        fluidTypeId: x.current_fluid_type_id || null,
        product: x.current_product || "", lot: x.current_lot || "",
        density: x.current_density === null || x.current_density === undefined ? null : Number(x.current_density),
        densityUnit: x.current_density_unit || null,
        client: x.client || "A definir",
        status: x.status, order: x.display_order,
        updated_by: x.updated_by, updated_at: x.updated_at
      }))),
      tankHistory: results[4].data || [],
      operations: (results[5].data || []).map(x => {
        const linkedProduct = (results[2].data || []).find(item => item.id === x.fluid_type_id);
        return {
        id: x.id, client: x.client, vessel: x.vessel, vesselRegistryId: x.vessel_registry_id || null, service_order: x.service_order || "",
        rig: x.rig || "", well: x.well || "", ticketNumber: x.ticket_number || "",
        fluidTypeId: x.fluid_type_id || null,
        activity: x.activity, product: linkedProduct?.name || x.product, lot: x.lot || "",
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
      };
      }),
      operationEvents: results[6].data || [],
      trucks: (results[7].data || []).map(x => {
        const linkedProduct = (results[2].data || []).find(item => item.id === x.fluid_type_id);
        const items = (results[31].data || []).filter(item => item.truck_id === x.id).map(item => ({
          id: item.id,
          truckId: item.truck_id,
          chemicalProductId: item.chemical_product_id || null,
          productName: item.product_name,
          lot: item.lot || "",
          quantity: Number(item.quantity || 0),
          unit: item.unit,
          displayOrder: Number(item.display_order || 0),
          created_at: item.created_at,
          updated_at: item.updated_at
        }));
        return {
          id: x.id, date: x.movement_date, movement: x.movement_type,
          truckType: x.truck_type || (["bbl","m³","m3"].includes(String(x.unit || "").toLowerCase()) ? "Tank" : "Bulk"),
          fluidTypeId: x.fluid_type_id || null,
          tankId: x.tank_id || null,
          stockApplied: x.stock_applied === true,
          stockAppliedAt: x.stock_applied_at,
          stockSummary: x.stock_application_summary || {},
          supplier: x.supplier, client: x.client || "",
          product: linkedProduct?.name || x.product, lot: x.lot || "",
          quantity: Number(x.quantity || 0), unit: x.unit, plate: x.plate || "",
          driver: x.driver_name || "", invoice: x.invoice_number || "", status: x.status,
          notes: x.notes || "", items, created_by: x.created_by,
          created_at: x.created_at, updated_at: x.updated_at
        };
      }),
      qhse: (results[8].data || []).map(x => ({
        id: x.id, date: x.record_date, type: x.record_type, title: x.title,
        description: x.description || "", responsible: x.responsible || "",
        severity: x.severity, status: x.status, created_by: x.created_by,
        created_at: x.created_at, updated_at: x.updated_at
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
      chemicalProducts: (results[32].data || []).map(x => ({
        id:x.id, name:x.name, category:x.category || "", unit:x.default_unit || "unidade",
        active:x.active !== false, notes:x.notes || "", created_by:x.created_by,
        created_at:x.created_at, updated_at:x.updated_at
      })),
      chemicals: (results[17].data || []).map(x => ({
        id: x.id, productId: x.product_id || null, name: x.product_name, category: x.category || "", lot: x.lot || "",
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
        notes: x.notes || "", performed_by: x.performed_by,
        chemicalProductId: x.chemical_product_id || null, truckId: x.truck_id || null,
        created_at: x.created_at
      })),
      tankMovements: (results[19].data || []).map(x => ({
        id: x.id, movement_type: x.movement_type, source_tank_id: x.source_tank_id,
        destination_tank_id: x.destination_tank_id, operation_id: x.operation_id,
        truckId: x.truck_id || null,
        quantity: Number(x.quantity || 0), unit: x.unit, product: x.product || "",
        lot: x.lot || "", reference: x.reference || "", notes: x.notes || "",
        created_by: x.created_by, created_at: x.created_at
      })),
      systemAlerts: [...(results[20].data || []), ...(results[21].data || [])],
      systemErrors: results[22].data || [],
      operationAllocations: (results[23].data || []).map(x => ({
        id: x.id, operation_id: x.operation_id, direction: x.direction,
        tank_id: x.tank_id, quantity: Number(x.quantity || 0), unit: x.unit,
        display_order: Number(x.display_order || 0), created_by: x.created_by,
        created_at: x.created_at, updated_at: x.updated_at
      })),
      handoverPendings: (results[24].data || []).map(x => ({
        id: x.id, title: x.title, description: x.description || "",
        category: x.category, responsible: x.responsible || "",
        priority: x.priority, status: x.status, due_at: x.due_at,
        created_by: x.created_by, completed_by: x.completed_by,
        completed_at: x.completed_at, created_at: x.created_at, updated_at: x.updated_at
      })),
      handoverNotes: (results[25].data || []).map(x => ({
        id: x.id, shift_date: x.shift_date, shift_type: x.shift_type,
        observations: x.observations || "", updated_by: x.updated_by,
        created_at: x.created_at, updated_at: x.updated_at
      })),
      alertCenter: (results[26].data || []).map(x => ({
        id: x.alert_key, title: x.title, message: x.message || "", level: x.level || "Média",
        category: x.category || "Sistema", entity_type: x.entity_type, entity_id: x.entity_id,
        due_at: x.due_at, created_at: x.created_at, action_page: x.action_page || "alerts", automatic: true
      })),
      handoverApprovals: (results[27].data || []).map(x => ({
        id:x.id, sequence_no:Number(x.sequence_no||0), shift_date:x.shift_date, shift_type:x.shift_type,
        status:x.status, snapshot_json:x.snapshot_json||{}, snapshot_text:x.snapshot_text||"",
        delivered_by:x.delivered_by, delivered_at:x.delivered_at, received_by:x.received_by,
        received_at:x.received_at, reopened_by:x.reopened_by, reopened_at:x.reopened_at,
        created_at:x.created_at, updated_at:x.updated_at
      })),
      shiftChecklist: (results[28].data || []).map(x => ({
        id:x.id, shift_date:x.shift_date, shift_type:x.shift_type, item_key:x.item_key,
        item_label:x.item_label, category:x.category, completed:x.completed,
        notes:x.notes||"", completed_by:x.completed_by, completed_at:x.completed_at,
        created_by:x.created_by, created_at:x.created_at, updated_at:x.updated_at
      })),
      auditLogs: (results[29].data || []).map(x => ({
        id:x.id, table_name:x.table_name, record_id:x.record_id, action:x.action,
        old_data:x.old_data, new_data:x.new_data, changed_by:x.changed_by, created_at:x.created_at
      })),
      feedback: (results[30].data || []).map(x => ({
        id:x.id, category:x.category, page:x.page || "dashboard", rating:x.rating,
        message:x.message, device_info:x.device_info || "", app_version:x.app_version || "",
        status:x.status || "Novo", created_by:x.created_by, created_at:x.created_at, updated_at:x.updated_at
      })),
      truckItems: (results[31].data || []).map(item => ({
        id:item.id, truckId:item.truck_id, chemicalProductId:item.chemical_product_id || null,
        productName:item.product_name, lot:item.lot || "", quantity:Number(item.quantity || 0),
        unit:item.unit, displayOrder:Number(item.display_order || 0),
        created_at:item.created_at, updated_at:item.updated_at
      })),
      closings: (results[33].data || []).map(item => ({
        id:item.id, date:item.closing_date, shift:item.shift, periodStart:item.period_start,
        periodEnd:item.period_end, status:item.status, summary:item.summary || {},
        notes:item.notes || "", closedBy:item.closed_by, closedAt:item.closed_at,
        reopenedBy:item.reopened_by, reopenedAt:item.reopened_at,
        created_at:item.created_at, updated_at:item.updated_at
      })),
      closingItems: (results[34].data || []).map(item => ({
        id:item.id, closingId:item.closing_id, itemType:item.item_type, itemId:item.item_id,
        itemName:item.item_name, unit:item.unit,
        theoretical:Number(item.theoretical_quantity || 0),
        measured:item.measured_quantity === null ? null : Number(item.measured_quantity),
        variance:item.variance === null ? null : Number(item.variance),
        variancePct:item.variance_pct === null ? null : Number(item.variance_pct),
        status:item.status, created_at:item.created_at
      })),
      inventoryCounts: (results[35].data || []).map(item => ({
        id:item.id, countedAt:item.counted_at, shift:item.shift, itemType:item.item_type,
        itemId:item.item_id, measured:Number(item.measured_quantity || 0),
        unit:item.unit, notes:item.notes || "", createdBy:item.created_by
      })),
      vessels: (results[36].data || []).map(item => ({
        id:item.id, vesselName:item.vessel_name, imo:item.imo || "", mmsi:item.mmsi || "",
        client:item.client, berth:item.berth || "", operationType:item.operation_type || "Bombeio",
        product:item.product || "", plannedQuantity:Number(item.planned_quantity || 0), unit:item.unit || "bbl",
        eta:item.eta, etb:item.etb, etd:item.etd, destination:item.destination || "", status:item.status || "Programada",
        priority:item.priority || "Normal", notes:item.notes || "", aisEnabled:item.ais_enabled === true,
        aisProvider:item.ais_provider || "MarineTraffic", aisEta:item.ais_eta,
        distanceToPortNm:item.distance_to_port_nm === null || item.distance_to_port_nm === undefined ? null : Number(item.distance_to_port_nm),
        aisSyncStatus:item.ais_sync_status || "Pendente", aisSyncMessage:item.ais_sync_message || "",
        lastAisAt:item.last_ais_at, createdBy:item.created_by, updatedBy:item.updated_by,
        createdAt:item.created_at, updatedAt:item.updated_at
      })),
      vesselPositions: (results[37].data || []).map(item => ({
        id:item.id, scheduleId:item.schedule_id, latitude:Number(item.latitude), longitude:Number(item.longitude),
        speedKnots:item.speed_knots === null ? null : Number(item.speed_knots),
        courseDegrees:item.course_degrees === null ? null : Number(item.course_degrees),
        headingDegrees:item.heading_degrees === null ? null : Number(item.heading_degrees),
        navigationStatus:item.navigation_status || "", positionTime:item.position_time,
        source:item.source || "manual", createdAt:item.created_at
      })),
      vesselPositionHistory: (results[38].data || []).map(item => ({
        id:item.id, scheduleId:item.schedule_id, latitude:Number(item.latitude), longitude:Number(item.longitude),
        speedKnots:item.speed_knots === null ? null : Number(item.speed_knots),
        courseDegrees:item.course_degrees === null ? null : Number(item.course_degrees),
        headingDegrees:item.heading_degrees === null ? null : Number(item.heading_degrees),
        navigationStatus:item.navigation_status || "", positionTime:item.position_time,
        source:item.source || "manual", createdAt:item.created_at
      })),
      vesselGeofences: (results[39].data || []).map(item => ({
        id:item.id, name:item.name, latitude:Number(item.latitude), longitude:Number(item.longitude),
        radiusNm:Number(item.radius_nm || 25), alertOnEntry:item.alert_on_entry !== false,
        active:item.active !== false, createdAt:item.created_at, updatedAt:item.updated_at
      })),
      vesselAisAlerts: (results[40].data || []).map(item => ({
        id:item.id, scheduleId:item.schedule_id, type:item.alert_type, severity:item.severity,
        title:item.title, message:item.message || "", eventAt:item.event_at,
        resolvedAt:item.resolved_at, resolvedBy:item.resolved_by,
        metadata:item.metadata || {}, createdAt:item.created_at
      })),
      vesselAisSyncRuns: (results[41].data || []).map(item => ({
        id:item.id, provider:item.provider, status:item.status,
        processed:Number(item.processed_count || 0), updated:Number(item.updated_count || 0),
        failed:Number(item.failed_count || 0), message:item.message || "",
        startedAt:item.started_at, finishedAt:item.finished_at, requestedBy:item.requested_by
      })),
      vesselRegistry: (results[42].data || []).map(item => ({
        id:item.id, name:item.name, imo:item.imo || "", mmsi:item.mmsi || "",
        active:item.active !== false, createdBy:item.created_by, updatedBy:item.updated_by,
        createdAt:item.created_at, updatedAt:item.updated_at
      })),
      dismissedSystemAlerts: (results[43].data || []).map(item => ({
        id:item.id, alertKey:item.alert_key, title:item.title || "", category:item.category || "",
        dismissedBy:item.dismissed_by, dismissedAt:item.dismissed_at
      })),
      clientTickets: (results[44].data || []).map(item => ({
        id:item.id, ticketNumber:item.ticket_number, client:item.client, title:item.title,
        date:item.ticket_date, operationId:item.operation_id || null, vessel:item.vessel || "",
        serviceOrder:item.service_order || "", responsible:item.responsible || "", status:item.status,
        requiredTypes:Array.isArray(item.required_document_types) ? item.required_document_types : ["FDT","FRT","MDT","MRT"],
        notes:item.notes || "", createdBy:item.created_by, createdAt:item.created_at, updatedAt:item.updated_at
      })),
      clientTicketDocuments: (results[45].data || []).map(item => ({
        id:item.id, ticketId:item.ticket_id, documentType:item.document_type,
        documentNumber:item.document_number || "", documentDate:item.document_date || "", revision:item.revision || "",
        status:item.status || "Anexado", fileName:item.file_name, filePath:item.file_path, mimeType:item.mime_type || "",
        fileSize:Number(item.file_size || 0), notes:item.notes || "", uploadedBy:item.uploaded_by,
        createdAt:item.created_at, updatedAt:item.updated_at
      })),
      vesselRegistryAvailable: optionalAvailability.vesselRegistry,
      vesselModuleAvailable: optionalAvailability.vessels,
      vesselPositionsAvailable: optionalAvailability.vesselPositions,
      vesselMonitoringAvailable: optionalAvailability.vesselPositionHistory && optionalAvailability.vesselGeofences && optionalAvailability.vesselAlerts
    };
    const dismissedAlertKeys = new Set((state.data.dismissedSystemAlerts || []).map(item => String(item.alertKey || "")));
    state.data.systemAlerts = [...state.data.systemAlerts, ...state.data.alertCenter]
      .filter((item,index,all) => all.findIndex(other => String(other.id || other.alert_key || other.title) === String(item.id || item.alert_key || item.title)) === index)
      .filter(item => !dismissedAlertKeys.has(String(item.id || item.alert_key || item.title || "")));
    state.lastSync = new Date();
  }

  function openAppProfileHeader() {
    const profile = state.data?.profile;
    if (!profile) return;
    if ($("#userName")) $("#userName").textContent = profile.name;
    if ($("#userRole")) $("#userRole").textContent = profile.role;
    const initialsBox = $("#userInitials");
    const avatarImage = $("#userAvatar");
    if (initialsBox?.childNodes?.[0]) initialsBox.childNodes[0].nodeValue = userInitials(profile.name);
    if (avatarImage) {
      avatarImage.classList.toggle("hidden", !profile.avatarUrl);
      avatarImage.src = profile.avatarUrl || "";
      avatarImage.alt = `Foto de ${profile.name}`;
    }
  }

  function decorateSidebarNavigation() {
    const nav = $("#sidebar nav");
    if (!nav) return;
    nav.querySelectorAll(".nav-section-label").forEach(item => item.remove());
    const labels = {
      dashboard: "VISÃO GERAL",
      operations: "OPERAÇÕES",
      tanks: "LOGÍSTICA E MATERIAIS",
      qhse: "QHSE E CONFIABILIDADE",
      reports: "DADOS E RELATÓRIOS",
      settings: "ADMINISTRAÇÃO"
    };
    Object.entries(labels).forEach(([page, label]) => {
      const target = nav.querySelector(`[data-page="${page}"]`);
      if (!target) return;
      const section = document.createElement("button");
      section.type = "button";
      section.className = "nav-section-label";
      section.dataset.navSectionToggle = page;
      section.innerHTML = `<span>${label}</span><b aria-hidden="true">⌄</b>`;
      target.before(section);
    });
    let currentSection = "";
    [...nav.children].forEach(item => {
      if (item.classList.contains("nav-section-label")) currentSection = item.dataset.navSectionToggle;
      else if (item.classList.contains("nav-item")) item.dataset.navSection = currentSection;
    });
    const names = {
      "vessel-registry": "Embarcações",
      alerts: "Central de Alertas",
      settings: "Usuários e Acessos"
    };
    Object.entries(names).forEach(([page, label]) => {
      const item = nav.querySelector(`[data-page="${page}"] .nav-label`);
      if (item) item.textContent = label;
    });
    nav.querySelectorAll(".nav-item").forEach(item => {
      const label = item.querySelector(".nav-label")?.textContent?.trim() || "Módulo";
      item.dataset.navTitle = label;
      item.title = label;
      item.setAttribute("aria-label", label);
    });
    nav.querySelectorAll(".nav-count").forEach(item => item.remove());
    const data = state.data || {};
    const counts = {
      alerts: [...(data.systemAlerts || []), ...(data.alerts || [])].filter(item => isCriticalAlert(item.level) && item.read !== true).length,
      maintenance: (data.maintenanceOrders || []).filter(item => !["Concluída","Fechada","Cancelada"].includes(item.status)).length,
      certificates: (data.certificates || []).filter(item => { const days=daysUntil(item.expires_at); return days!==null && days>=0 && days<=30; }).length,
      qhse: [...(data.qhse || []), ...(data.actionItems || [])].filter(item => !["Concluído","Concluída","Fechado"].includes(item.status)).length
    };
    Object.entries(counts).forEach(([page, count]) => {
      if (!count) return;
      const target = nav.querySelector(`[data-page="${page}"]`);
      if (!target) return;
      const badge = document.createElement("span");
      badge.className = "nav-count";
      badge.textContent = count > 99 ? "99+" : String(count);
      target.appendChild(badge);
    });
    document.body.classList.toggle("sidebar-compact", localStorage.getItem("opscontrol_sidebar_compact") === "true");
  }

  function openApp() {
    $("#loginView").classList.add("hidden");
    $("#appView").classList.remove("hidden");

    const profile = state.data.profile;
    openAppProfileHeader();

    decorateSidebarNavigation();
    $$(".nav-item").forEach(button => {
      button.classList.toggle("hidden", !moduleAllowed(button.dataset.page));
    });

    applyTheme(localStorage.getItem(THEME_KEY) || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
    updateConnectionBadge();
    renderAll();

    const kiosk = role() === "tv";
    document.body.classList.toggle("kiosk-mode", kiosk);
    document.body.classList.toggle("homologation-mode", state.testMode);
    const firstAllowed = $$(".nav-item").find(button => !button.classList.contains("hidden"))?.dataset.page || "dashboard";
    const storedPage = localStorage.getItem("opscontrol_last_page");
    const hashPage = String(location.hash || "").replace("#", "");
    const requestedPageRaw = hashPage || storedPage || state.page;
    const requestedPage = requestedPageRaw === "vessels" ? "operations" : requestedPageRaw;
    showPage(kiosk ? "tv" : (moduleAllowed(requestedPage) ? requestedPage : firstAllowed), { history: false });
    subscribeRealtime();
    startAutoRefresh();
    setupMobilePullToRefresh();
    renderMobileShell();
    saveLocalDailyBackup();
    syncOfflineQueue();
    updateConnectionBadge();
  }

  async function logout() {
    clearTimeout(state.refreshDebounce);
    clearInterval(state.refreshTimer);
    stopTvMode();
    if (state.realtime) await state.client.removeChannel(state.realtime);
    await state.client.auth.signOut();
    location.reload();
  }

  function updateConnectionBadge() {
    const badgeEl = $("#syncBadge");
    if (!badgeEl) return;

    const pendingOffline = offlineQueue().length;
    if (!navigator.onLine) {
      badgeEl.textContent = pendingOffline ? `Sem conexão • ${pendingOffline} pendente(s)` : "Sem conexão";
      badgeEl.className = "status-badge neutral";
      renderMobileShell();
      return;
    }

    if (state.lastRefreshError) {
      badgeEl.textContent = "Falha de sincronização";
      badgeEl.className = "status-badge red";
      renderMobileShell();
      return;
    }

    if (state.realtimeStatus === "SUBSCRIBED") {
      const time = state.lastSync ? state.lastSync.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "";
      badgeEl.textContent = time ? `Atualizado ${time}` : "Tempo real ativo";
      badgeEl.className = "status-badge online";
      renderMobileShell();
      return;
    }

    badgeEl.textContent = state.realtimeStatus === "CHANNEL_ERROR" || state.realtimeStatus === "TIMED_OUT"
      ? "Tempo real indisponível"
      : "Conectando...";
    badgeEl.className = "status-badge neutral";
    renderMobileShell();
  }

  function scheduleRealtimeRefresh() {
    clearTimeout(state.refreshDebounce);
    state.refreshDebounce = setTimeout(() => refreshRealtime("tempo real"), 700);
  }

  function subscribeRealtime() {
    if (state.realtime) return;
    let channel = state.client.channel(`opscontrol:${state.user.id}:operational`);
    REALTIME_TABLES.forEach(table => {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, scheduleRealtimeRefresh);
    });
    state.realtime = channel.subscribe(status => {
      state.realtimeStatus = status;
      updateConnectionBadge();
    });
  }

  function startAutoRefresh() {
    if (state.autoRefreshStarted) return;
    state.autoRefreshStarted = true;

    state.refreshTimer = setInterval(() => {
      if (navigator.onLine && document.visibilityState === "visible") refreshRealtime("verificação automática");
    }, 60000);

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && navigator.onLine) refreshRealtime("retorno ao aplicativo");
    });
  }

  async function refreshRealtime(source = "tempo real", showToast = false) {
    if (state.refreshing || !navigator.onLine) return false;
    state.refreshing = true;
    state.lastRefreshError = null;
    updateConnectionBadge();

    try {
      await loadData();
      if (state.data.profile.active === false) {
        await state.client.auth.signOut();
        location.reload();
        return false;
      }
      renderAll();
      updateConnectionBadge();
      if (showToast) toast(`Dashboard atualizado às ${state.lastSync.toLocaleTimeString("pt-BR")}.`, "success");
      return true;
    } catch (error) {
      state.lastRefreshError = error;
      console.error(`Atualização (${source}):`, error);
      updateConnectionBadge();
      if (showToast) toast(`Falha ao atualizar: ${error.message}`, "error");
      return false;
    } finally {
      state.refreshing = false;
    }
  }

  function renderModuleSafely(name, pageId, renderer) {
    try {
      renderer();
      return true;
    } catch (error) {
      console.error(`Falha ao renderizar ${name}:`, error);
      const page = $(`#page-${pageId}`);
      if (page) {
        page.innerHTML = header(name, "O módulo encontrou uma inconsistência isolada.") +
          `<div class="card module-error-card"><strong>Não foi possível carregar esta aba.</strong><p>${esc(error.message || "Erro desconhecido")}</p><button class="btn primary" data-action="refresh">Tentar novamente</button></div>`;
      }
      return false;
    }
  }

  function renderAll() {
    const modules = [
      ["Dashboard", "dashboard", renderDashboard],
      ["Qualidade dos Dados", "quality", renderQuality],
      ["Saneamento de Dados", "sanitation", renderSanitation],
      ["Painel TV", "tv", renderTv],
      ["Operações", "operations", renderOperations],
      ["Cadastro de Embarcações", "vessel-registry", renderVesselRegistry],
      ["Tanques e silos", "tanks", renderTanks],
      ["Fluidos e granéis", "fluids", renderFluids],
      ["Catálogo químico", "chemical-catalog", renderChemicalCatalog],
      ["Inventário químico", "chemicals", renderChemicalInventory],
      ["Carretas", "trucks", renderTrucks],
      ["Tickets de Clientes", "client-tickets", renderClientTickets],
      ["QHSE", "qhse", renderQhse],
      ["Manutenção", "maintenance", renderMaintenance],
      ["Certificados", "certificates", renderCertificates],
      ["Alertas", "alerts", renderAlerts],
      ["Relatórios", "reports", renderReports],
      ["Auditoria", "audit", renderAudit],
      ["Configurações", "settings", renderSettings]
    ];

    modules.forEach(([name, pageId, renderer]) => renderModuleSafely(name, pageId, renderer));
    const manualUnread = (state.data.alerts || []).filter(x => !x.read).length;
    const alertCount = $("#alertCount");
    if (alertCount) alertCount.textContent = manualUnread + (state.data.systemAlerts || []).length;
    renderMobileShell();
  }

  function statCard(title, value, unit, icon, detail = "", tone = "blue") {
    return `<div class="card stat-card pro-stat tone-${esc(tone)}">
      <div><small>${esc(title)}</small><h2>${esc(value)}</h2><span class="muted">${esc(unit)}</span>${detail ? `<em>${esc(detail)}</em>` : ""}</div>
      <span class="stat-icon">${icon}</span>
    </div>`;
  }

  function storageCard(title, value, capacity, unit, icon, tone) {
    const pct = capacity > 0 ? Math.min(100, Math.max(0, value / capacity * 100)) : 0;
    return `<div class="card storage-stat ${tone}">
      <div class="storage-stat-top"><div><small>${title}</small><h2>${fmt.format(value)}</h2><span>${esc(unit)} armazenados</span></div><span class="storage-icon">${icon}</span></div>
      <div class="storage-progress"><span style="width:${pct}%"></span></div>
      <div class="storage-foot"><span>${fmt.format(pct)}% ocupado</span><strong>${fmt.format(Math.max(0, capacity-value))} ${esc(unit)} livres</strong></div>
    </div>`;
  }

  function aggregateOperationVolume(operations, field) {
    const totals = new Map();
    operations.forEach(op => {
      const label = String(op[field] || "Não informado").trim() || "Não informado";
      const unit = String(op.unit || "").trim() || "-";
      const key = `${label}|||${unit}`;
      totals.set(key, (totals.get(key) || 0) + Number(op.executed || 0));
    });
    return [...totals.entries()].map(([key, value]) => {
      const [label, unit] = key.split("|||");
      return { label, unit, value };
    }).sort((a, b) => b.value - a.value);
  }


  function tvOperationAllocations(operation) {
    return state.data.operationAllocations
      .filter(item => item.operation_id === operation.id)
      .sort((a, b) => a.display_order - b.display_order)
      .map(item => {
        const tank = state.data.tanks.find(x => x.id === item.tank_id);
        return `${tank?.name || "Equipamento"}: ${fmt.format(item.quantity)} ${item.unit}`;
      });
  }

  function tvTankTile(tank) {
    const volume = Number(tank.volume || 0);
    const capacity = Number(tank.capacity || 0);
    const pct = capacity > 0 ? Math.max(0, Math.min(100, volume / capacity * 100)) : 0;
    const tone = productClass(tank.product, tank.kind, volume);
    const status = tank.status || (volume > 0 ? "Operacional" : "Vazio");
    const equipmentType = esc(tank.kind || "Equipamento");
    const location = esc(tank.phase || "B-Port LMP");
    const product = esc(tank.product || (volume > 0 ? "Produto não informado" : "Sem produto"));
    const secondary = tank.client ? esc(tank.client) : location;
    const trailingMeta = tank.lot ? `Lote ${esc(tank.lot)}` : equipmentType;
    return `<article class="tv-equipment-tile ${tone} ${status === "Bloqueado" ? "blocked" : ""}">
      <div class="tv-equipment-head">
        <div class="tv-equipment-title-wrap">
          <strong>${esc(tank.name)}</strong>
          <small>${equipmentType} • ${location}</small>
        </div>
        <span class="tv-equipment-status-chip">${esc(status)}</span>
      </div>
      <div class="tv-equipment-product-row">
        <h3>${product}</h3>
        <b>${fmt.format(pct)}%</b>
      </div>
      <div class="tv-equipment-progress"><span style="width:${pct}%"></span></div>
      <div class="tv-equipment-values"><strong>${fmt.format(volume)} ${esc(tank.unit)}</strong><small>de ${fmt.format(capacity)} ${esc(tank.unit)}</small></div>
      <div class="tv-equipment-meta"><span>${secondary}</span><span>${trailingMeta}</span></div>
    </article>`;
  }

  function tvOperationTile(operation) {
    const pct = operation.planned > 0 ? Math.min(100, Math.max(0, operation.executed / operation.planned * 100)) : 0;
    const allocations = tvOperationAllocations(operation);
    return `<article class="tv-operation-tile">
      <div class="tv-operation-top"><div><small>${esc(operation.client)}</small><h3>${esc(operation.vessel)}</h3></div>${badge(operation.status)}</div>
      <div class="tv-operation-title">${esc(operation.activity)} de ${esc(operation.product)}</div>
      ${(operation.rig || operation.well || operation.ticketNumber) ? `<div class="tv-operation-meta">${operation.rig ? `Sonda ${esc(operation.rig)}` : ""}${operation.well ? ` • Poço ${esc(operation.well)}` : ""}${operation.ticketNumber ? ` • Ticket ${esc(operation.ticketNumber)}` : ""}</div>` : ""}
      <div class="tv-operation-progress"><span style="width:${pct}%"></span></div>
      <div class="tv-operation-values"><strong>${fmt.format(operation.executed)} / ${fmt.format(operation.planned)} ${esc(operation.unit)}</strong><span>${fmt.format(operationFlow(operation))} ${esc(operation.unit)}/h</span></div>
      ${allocations.length ? `<div class="tv-operation-allocations">${allocations.slice(0,3).map(item => `<span>${esc(item)}</span>`).join("")}</div>` : ""}
      ${operation.occurrence ? `<div class="tv-operation-occurrence">${uiIcon("alert", "ui-icon ui-icon-inline")} ${esc(operation.occurrence)}</div>` : ""}
    </article>`;
  }

  function tvActiveOperations() {
    return state.data.operations
      .filter(operation => !["Concluída", "Cancelada"].includes(operation.status))
      .sort((a, b) => new Date(a.start_time || a.created_at || 0) - new Date(b.start_time || b.created_at || 0));
  }

  function tvCriticalAlerts() {
    return [...state.data.systemAlerts, ...state.data.alerts.filter(item => !item.read)]
      .filter(item => isCriticalAlert(item.level))
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }

  function tvPhaseAssets(phase, silo) {
    return state.data.tanks
      .filter(item => item.phase === phase && isSiloAsset(item) === silo)
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  }

  function tvPlantSlide(phase, silo, slideNumber) {
    const assets = tvPhaseAssets(phase, silo);
    const occupied = assets.filter(item => Number(item.volume || 0) > 0).length;
    const alerts = assets.filter(item => {
      const status = item.status || "";
      const pct = Number(item.capacity || 0) > 0 ? Number(item.volume || 0) / Number(item.capacity) * 100 : 0;
      return ["Bloqueado", "Em manutenção"].includes(status) || (Number(item.volume || 0) > 0 && (pct < 10 || pct > 90));
    }).length;
    const total = assets.reduce((sum, item) => sum + Number(item.volume || 0), 0);
    const unit = silo ? "ton" : "bbl";
    const title = silo ? `Planta de Granéis ${phase}` : `Planta de Fluidos ${phase}`;
    const gridClass = silo ? "tv-plant-grid tv-bulk-grid" : "tv-plant-grid tv-fluid-grid";

    return `<section class="tv-slide tv-plant-slide ${phase === "Phase #1" ? "tv-phase-1" : "tv-phase-2"}">
      <div class="tv-slide-heading"><div><small>SLIDE ${slideNumber} DE 7</small><h2>${esc(title)}</h2><span>${occupied} de ${assets.length} equipamentos com produto</span></div><strong>${state.data.profile.department || "B-Port LMP"}</strong></div>
      <div class="tv-slide-kpis">
        <div><span>Equipamentos</span><strong>${assets.length}</strong></div>
        <div><span>Com produto</span><strong>${occupied}</strong></div>
        <div><span>Volume total</span><strong>${fmt.format(total)} ${unit}</strong></div>
        <div><span>Alertas</span><strong>${alerts}</strong></div>
      </div>
      <div class="${gridClass}">${assets.length ? assets.map(tvTankTile).join("") : `<div class="tv-empty-state">Nenhum equipamento cadastrado nesta área.</div>`}</div>
    </section>`;
  }

  function tvOperationsSlide() {
    const active = tvActiveOperations();
    const occurrences = active.filter(item => item.occurrence).length;
    return `<section class="tv-slide tv-operations-slide">
      <div class="tv-slide-heading"><div><small>SLIDE 5 DE 7</small><h2>Operações em execução</h2><span>${active.length} operação(ões) ativa(s)</span></div><strong>Atualização automática</strong></div>
      <div class="tv-slide-kpis">
        <div><span>Operações ativas</span><strong>${active.length}</strong></div>
        <div><span>Programadas</span><strong>${state.data.operations.filter(x => x.status === "Programada").length}</strong></div>
        <div><span>Paralisadas</span><strong>${active.filter(x => x.status === "Paralisada").length}</strong></div>
        <div><span>Ocorrências</span><strong>${occurrences}</strong></div>
      </div>
      <div class="tv-operation-grid tv-operation-grid-wide">${active.length ? active.slice(0, 8).map(tvOperationTile).join("") : `<div class="tv-empty-state">Nenhuma operação em andamento no momento.</div>`}</div>
    </section>`;
  }

  function tvDashboardSlide() {
    const tanks = state.data.tanks.filter(item => !isSiloAsset(item));
    const silos = state.data.tanks.filter(item => isSiloAsset(item));
    const totalBbl = tanks.reduce((sum, item) => sum + Number(item.volume || 0), 0);
    const totalTon = silos.reduce((sum, item) => sum + Number(item.volume || 0), 0);
    const active = tvActiveOperations();
    const alerts = tvCriticalAlerts();
    const todayKey = new Date().toISOString().slice(0,10);
    const todayTrucks = state.data.trucks.filter(item => String(item.date || item.created_at || "").slice(0,10) === todayKey);
    return `<section class="tv-slide tv-dashboard-slide">
      <div class="tv-slide-heading"><div><small>SLIDE 6 DE 7</small><h2>Dashboard Operacional</h2><span>Resumo geral da planta</span></div><strong>B-Port LMP</strong></div>
      <div class="tv-dashboard-kpi-grid">
        <div><span>Fluidos armazenados</span><strong>${fmt.format(totalBbl)} bbl</strong><small>${tanks.filter(x=>Number(x.volume||0)>0).length}/${tanks.length} equipamentos ocupados</small></div>
        <div><span>Granéis armazenados</span><strong>${fmt.format(totalTon)} ton</strong><small>${silos.filter(x=>Number(x.volume||0)>0).length}/${silos.length} silos ocupados</small></div>
        <div><span>Operações ativas</span><strong>${active.length}</strong><small>Em execução neste momento</small></div>
        <div><span>Carretas hoje</span><strong>${todayTrucks.length}</strong><small>Registros do dia</small></div>
        <div><span>Alertas críticos</span><strong>${alerts.length}</strong><small>Necessitam atenção</small></div>
        <div><span>Última sincronização</span><strong>${state.lastSync ? state.lastSync.toLocaleTimeString("pt-BR") : "-"}</strong><small>Dados em tempo real</small></div>
      </div>
      <div class="tv-dashboard-bottom">
        <div class="tv-dashboard-status"><h3>Status dos equipamentos</h3>${["Operacional","Disponível","Em fabricação","Recebendo","Bombeando","Em manutenção","Bloqueado","Vazio"].map(status => `<div><span class="tv-status-dot"></span><strong>${status}</strong><b>${state.data.tanks.filter(item => (item.status || (Number(item.volume||0)>0?"Operacional":"Vazio")) === status).length}</b></div>`).join("")}</div>
        <div class="tv-dashboard-recent"><h3>Operações mais recentes</h3>${active.slice(0,5).map(operation => `<div><strong>${esc(operation.activity)}</strong><span>${esc(operation.client)} • ${esc(operation.vessel)}</span><b>${esc(operation.status)}</b></div>`).join("") || `<div class="tv-empty-state compact">Nenhuma operação ativa.</div>`}</div>
      </div>
    </section>`;
  }

  function tvAlertsSlide() {
    const alerts = tvCriticalAlerts();
    const equipmentAlerts = state.data.tanks.map(item => {
      const status = item.status || "";
      const pct = Number(item.capacity || 0) > 0 ? Number(item.volume || 0) / Number(item.capacity) * 100 : 0;
      if (["Bloqueado", "Em manutenção"].includes(status)) return { level:"Crítico", title:`${item.name} — ${status}`, message:`${item.product || "Sem produto"} • ${fmt.format(item.volume)} ${item.unit}` };
      if (pct > 90) return { level:"Alto", title:`${item.name} acima de 90%`, message:`${fmt.format(pct)}% • ${fmt.format(item.volume)} / ${fmt.format(item.capacity)} ${item.unit}` };
      if (Number(item.volume || 0) > 0 && pct < 10) return { level:"Alto", title:`${item.name} abaixo de 10%`, message:`${fmt.format(pct)}% • ${fmt.format(item.volume)} / ${fmt.format(item.capacity)} ${item.unit}` };
      return null;
    }).filter(Boolean);
    const combined = [...equipmentAlerts, ...alerts].slice(0, 12);
    return `<section class="tv-slide tv-alerts-slide">
      <div class="tv-slide-heading"><div><small>SLIDE 7 DE 7</small><h2>Alertas e atenção operacional</h2><span>${combined.length} ocorrência(s) em destaque</span></div><strong>Prioridade operacional</strong></div>
      <div class="tv-alert-grid-full">${combined.length ? combined.map(item => `<article class="tv-alert-card-full"><div>${badge(item.level || "Alto")}</div><strong>${esc(item.title || "Alerta")}</strong><p>${esc(item.message || "")}</p></article>`).join("") : `<div class="tv-all-clear"><span>✓</span><strong>Nenhum alerta crítico neste momento.</strong><small>A planta está sem ocorrências prioritárias.</small></div>`}</div>
    </section>`;
  }

  function updateTvClock() {
    const clock = $("#tvClock");
    const date = $("#tvDate");
    if (!clock || !date) return;
    const now = new Date();
    clock.textContent = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    date.textContent = now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  }

  function changeTvSlide(step = 1) {
    const totalSlides = 7;
    state.tv.slide = (state.tv.slide + step + totalSlides) % totalSlides;
    renderTv();
  }

  function startTvMode() {
    clearInterval(state.tv.timer);
    clearInterval(state.tv.clockTimer);
    state.tv.clockTimer = setInterval(updateTvClock, 1000);
    if (!state.tv.paused) state.tv.timer = setInterval(() => {
      if (state.page === "tv" && document.visibilityState === "visible") changeTvSlide(1);
    }, state.tv.intervalMs);
    updateTvClock();
  }

  function stopTvMode() {
    clearInterval(state.tv.timer);
    clearInterval(state.tv.clockTimer);
    state.tv.timer = null;
    state.tv.clockTimer = null;
  }

  function renderTv() {
    const page = $("#page-tv");
    if (!page || !state.data) return;
    const totalSlides = 7;
    const slide = ((Number(state.tv.slide || 0) % totalSlides) + totalSlides) % totalSlides;
    state.tv.slide = slide;
    const labels = ["Fluidos P#1","Granéis P#1","Fluidos P#2","Granéis P#2","Operações","Dashboard","Alertas"];
    const slides = [
      () => tvPlantSlide("Phase #1", false, 1),
      () => tvPlantSlide("Phase #1", true, 2),
      () => tvPlantSlide("Phase #2", false, 3),
      () => tvPlantSlide("Phase #2", true, 4),
      tvOperationsSlide,
      tvDashboardSlide,
      tvAlertsSlide
    ];
    page.innerHTML = `<div class="tv-screen tv-light-screen">
      <div class="tv-topbar"><div class="tv-brand"><span>OC</span><div><strong>OpsControl IA</strong><small>Painel Operacional — B-Port LMP</small></div></div><div class="tv-top-status"><span class="live-dot"></span><strong>Dados em tempo real</strong><small>Troca automática a cada ${Math.round(state.tv.intervalMs / 1000)} segundos</small></div><div class="tv-clock"><strong id="tvClock">--:--:--</strong><span id="tvDate">--</span></div></div>
      <div class="tv-content">${slides[slide]()}</div>
      <div class="tv-footer"><div class="tv-dots">${labels.map((label,index)=>`<button class="${index===slide?"active":""}" data-tv-slide="${index}"><span></span>${index+1}. ${label}</button>`).join("")}</div><div class="tv-controls no-print"><button class="btn secondary" data-action="tv-prev">‹ Anterior</button><button class="btn secondary" data-action="tv-toggle">${state.tv.paused?"▶ Retomar":"Ⅱ Pausar"}</button><button class="btn secondary" data-action="tv-next">Próximo ›</button><button class="btn primary" data-action="tv-fullscreen">${document.fullscreenElement?"Sair da tela cheia":"Tela cheia"}</button></div></div>
    </div>`;
    updateTvClock();
  }



  function dashboardRoleHome(d, activeOps) {
    const currentRole = role();
    const currentShift = handoverSnapshot();
    const openPendings = (d.handoverPendings || []).filter(x => ["Pendente", "Em andamento"].includes(x.status));
    const lowChemicals = (d.chemicals || []).filter(x => x.quantity <= x.minimum);
    const openOrders = (d.maintenanceOrders || []).filter(x => !["Concluída", "Fechada", "Cancelada"].includes(x.status));
    const openActions = (d.actionItems || []).filter(x => x.status !== "Concluído");
    const todayTrucks = (d.trucks || []).filter(x => recordDateKey(x.date || x.created_at) === localDateKey());
    const checklist = checklistForShift();
    const checklistDone = checklist.filter(x => x.completed).length;
    const qualityCount = dataQualityIssues().filter(x => x.severity !== "Baixa").length;

    const action = (page, label, description, icon) => `<button class="role-home-action" data-page-link="${page}"><span>${icon}</span><div><strong>${esc(label)}</strong><small>${esc(description)}</small></div><b>›</b></button>`;
    const create = (name, label, description, icon) => `<button class="role-home-action" data-action="${name}"><span>${icon}</span><div><strong>${esc(label)}</strong><small>${esc(description)}</small></div><b>+</b></button>`;

    let title = `Olá, ${esc(d.profile.name.split(" ")[0])}`;
    let subtitle = "Resumo operacional da planta";
    let metrics = [];
    let actions = [];

    if (["operador", "user"].includes(currentRole)) {
      title = `Turno operacional — ${esc(d.profile.name.split(" ")[0])}`;
      subtitle = activeOps.length ? `${activeOps.length} operação(ões) exigindo acompanhamento` : "Nenhuma operação ativa neste momento";
      metrics = [
        ["Operações ativas", activeOps.length, "operations"],
        ["Checklist do turno", `${checklistDone}/${checklist.length}`, "reports"],
        ["Pendências", openPendings.length, "reports"]
      ];
      actions = [
        create("new-operation", "Registrar operação", "Início, volume, paralisação ou conclusão", uiIcon("anchor")),
        action("tanks", "Consultar tancagem", "Saldo, produto e lote", uiIcon("layers")),
        action("reports", "Passagem do turno", "Checklist e pendências", uiIcon("file"))
      ];
    } else if (currentRole === "lider") {
      title = "Painel do líder de turno";
      subtitle = "Operações, pendências e entrega da equipe";
      metrics = [
        ["Operações ativas", activeOps.length, "operations"],
        ["Pendências abertas", openPendings.length, "reports"],
        ["Qualidade dos dados", qualityCount, "quality"]
      ];
      actions = [
        create("new-operation", "Nova operação", "Programar e distribuir tancagem", uiIcon("anchor")),
        action("reports", "Preparar passagem", "Checklist, atividades e pendências", uiIcon("file")),
        action("quality", "Conferir lançamentos", "Inconsistências antes do fechamento", uiIcon("shield"))
      ];
    } else if (currentRole === "logistica") {
      title = "Painel da logística";
      subtitle = "Carretas, estoques, lotes e documentação";
      metrics = [
        ["Carretas hoje", todayTrucks.length, "trucks"],
        ["Químicos baixos", lowChemicals.length, "chemicals"],
        ["Pendências", openPendings.length, "reports"]
      ];
      actions = [
        create("new-truck", "Movimentar carreta", "Entrada, saída, NF e lote", uiIcon("truck")),
        action("chemicals", "Inventário químico", "Saldo, validade e FEFO", uiIcon("flask")),
        action("quality", "Conferir documentos", "NF, lote e rastreabilidade", uiIcon("shield"))
      ];
    } else if (currentRole === "mecanico") {
      title = "Painel da manutenção";
      subtitle = "Equipamentos e ordens de serviço";
      metrics = [
        ["OS abertas", openOrders.length, "maintenance"],
        ["Equipamentos parados", d.equipment.filter(x => String(x.status).toLowerCase().includes("parado")).length, "maintenance"],
        ["Pendências do turno", openPendings.filter(x => x.category === "Manutenção").length, "reports"]
      ];
      actions = [
        create("new-maintenance-order", "Abrir ordem de serviço", "Registrar falha ou preventiva", uiIcon("wrench")),
        action("maintenance", "Ver equipamentos", "Horímetro e programação", uiIcon("gauge")),
        action("reports", "Pendências recebidas", "Itens do turno anterior", uiIcon("file"))
      ];
    } else if (currentRole === "qhse") {
      title = "Painel QHSE";
      subtitle = "Riscos, ações, validade e conformidade";
      metrics = [
        ["Ações pendentes", openActions.length, "qhse"],
        ["Alertas críticos", d.systemAlerts.filter(x => isCriticalAlert(x.level)).length, "alerts"],
        ["Qualidade dos dados", qualityCount, "quality"]
      ];
      actions = [
        create("new-qhse", "Novo registro QHSE", "Risco, inspeção, DDS ou ocorrência", uiIcon("shield")),
        action("qhse", "Acompanhar ações", "Responsáveis e prazos", uiIcon("check")),
        action("quality", "Ver conformidade", "Campos obrigatórios e documentos", uiIcon("shield"))
      ];
    } else {
      title = currentRole === "supervisor" ? "Painel da supervisão" : "Visão administrativa";
      subtitle = "Riscos, produtividade, qualidade e decisões";
      metrics = [
        ["Operações ativas", activeOps.length, "operations"],
        ["Alertas críticos", d.systemAlerts.filter(x => isCriticalAlert(x.level)).length, "alerts"],
        ["Inconsistências", dataQualityIssues().length, "quality"]
      ];
      actions = [
        action("quality", "Qualidade e conciliação", "Validar dados antes do fechamento", uiIcon("shield")),
        action("reports", "Relatórios gerenciais", "Indicadores e passagem", uiIcon("file")),
        action("audit", "Auditoria", "Quem alterou e quando", uiIcon("database"))
      ];
    }

    return `<section class="role-home-panel role-${esc(currentRole)}">
      <div class="role-home-heading"><div><small>MEU PAINEL</small><h2>${title}</h2><p>${subtitle}</p></div><button class="btn secondary" data-action="open-feedback">Dar feedback</button></div>
      <div class="role-home-metrics">${metrics.map(([label, value, page]) => `<button data-page-link="${page}"><span>${esc(label)}</span><strong>${esc(value)}</strong></button>`).join("")}</div>
      <div class="role-home-actions">${actions.join("")}</div>
    </section>`;
  }

  function renderDashboard() {
    return renderFigmaDashboard();
  }

  function renderFigmaDashboard() {
    const d = state.data;
    const operations = filteredOperations();
    const trucks = filteredTrucks();
    const activeOperations = operations.filter(item => !["Concluída", "Cancelada", "Fechada"].includes(item.status));
    const uniqueVessels = new Set(activeOperations.map(item => item.vessel).filter(Boolean));
    const tanks = d.tanks || [];
    const totalVolume = tanks.reduce((sum, item) => sum + Number(item.volume || 0), 0);
    const totalCapacity = tanks.reduce((sum, item) => sum + Number(item.capacity || 0), 0);
    const occupancy = totalCapacity ? Math.round(totalVolume / totalCapacity * 100) : 0;
    const criticalAlerts = [...(d.systemAlerts || []), ...(d.alerts || [])]
      .filter(item => isCriticalAlert(item.level) && item.read !== true).length;
    const expiringDocuments = (d.certificates || []).filter(item => {
      const days = daysUntil(item.expires_at);
      return days !== null && days >= 0 && days <= 15;
    }).length;

    const storageTotals = ["wbm", "sbm", "brine"].map(type => tanks
      .filter(item => productClass(item.product, item.kind, item.volume) === type)
      .reduce((sum, item) => sum + Number(item.volume || 0), 0));
    const storageBase = Math.max(totalCapacity, 1);
    const shares = storageTotals.map(value => Math.round(value / storageBase * 100));
    const filled = Math.min(100, shares.reduce((sum, value) => sum + value, 0));
    const empty = Math.max(0, 100 - filled);

    const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const key = localDateKey(date);
      const value = operations
        .filter(item => recordDateKey(item.start_at || item.created_at) === key)
        .reduce((sum, item) => sum + Number(item.executed || item.planned || 0), 0);
      return { key, label: dayLabels[date.getDay()], value };
    });
    const maxDay = Math.max(...days.map(item => item.value), 1);

    const recent = [
      ...operations.map(item => ({
        time: item.updated_at || item.start_at || item.created_at,
        title: `${item.activity || "Operação"} — ${item.product || "Produto não informado"}`,
        detail: `${item.client || "Cliente"} • ${item.vessel || "Embarcação não informada"}`,
        status: item.status || "Registrada", responsible: d.users.find(user => user.id === item.responsible_id)?.name || "Equipe operacional",
        page: "operations"
      })),
      ...trucks.map(item => ({
        time: item.updated_at || item.created_at || item.date,
        title: `${item.movement || "Movimentação"} de ${item.product || item.truckType || "carga"}`,
        detail: `${item.plate || "Placa não informada"} • NF ${item.invoice || "-"}`,
        status: item.status || "Registrada", responsible: d.users.find(user => user.id === item.created_by)?.name || "Logística",
        page: "trucks"
      })),
      ...(d.maintenanceOrders || []).map(item => ({
        time: item.closed_at || item.opened_at,
        title: item.title || "Ordem de manutenção",
        detail: d.equipment.find(eq => eq.id === item.equipment_id)?.name || "Equipamento",
        status: item.status || "Aberta", responsible: item.responsible || "Manutenção",
        page: "maintenance"
      }))
    ].filter(item => item.time)
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, 6);

    const kpis = [
      ["Operações ativas", activeOperations.length, "Serviços em acompanhamento", "blue", "anchor"],
      ["Embarcações no terminal", uniqueVessels.size, "Programação operacional ativa", "green", "anchor"],
      ["Volume armazenado", `${fmt.format(totalVolume)} bbl`, `${occupancy}% da capacidade cadastrada`, "cyan", "database"],
      ["Alertas críticos", criticalAlerts, criticalAlerts ? "Requer atenção do líder" : "Nenhuma criticidade", "red", "alert"],
      ["Docs vencendo", expiringDocuments, "Próximos 15 dias", "amber", "file"]
    ];

    $("#page-dashboard").innerHTML =
      header("Visão Geral da Planta", "Monitoramento integrado de fluidos, atividades de tancagem e conformidade operacional.",
        `<button class="btn soft" data-action="refresh">${uiIcon("refresh", "ui-icon btn-icon")} Sincronizar</button><button class="btn primary" data-action="new-operation">+ Novo registro</button>`) +
      `<div class="figma-dashboard">
        <section class="figma-kpi-grid">
          ${kpis.map(([title,value,detail,tone,icon]) => `<article class="figma-kpi tone-${tone}">
            <div class="figma-kpi-head"><span>${esc(title)}</span><i>${uiIcon(icon)}</i></div>
            <strong>${esc(value)}</strong><small>${esc(detail)}</small>
          </article>`).join("")}
        </section>
        <section class="figma-dashboard-charts">
          <article class="card figma-volume-chart">
            <div class="figma-card-heading"><div><h3>Movimentação de Volume</h3><p>Volume executado nos últimos sete dias</p></div><span>Semanal</span></div>
            <div class="figma-bars">
              ${days.map((item, index) => `<div class="figma-bar-item"><b>${fmt.format(item.value)}</b><i class="${index === days.length - 1 ? "current" : ""}" style="height:${Math.max(8, item.value / maxDay * 100)}%"></i><span>${item.label}</span></div>`).join("")}
            </div>
          </article>
          <article class="card figma-occupancy-card">
            <div class="figma-card-heading"><div><h3>Distribuição de Ocupação</h3><p>Volume por tipo de fluido</p></div></div>
            <div class="figma-occupancy-content">
              <div class="figma-donut" style="--a:${shares[0]}%;--b:${shares[0]+shares[1]}%;--c:${shares[0]+shares[1]+shares[2]}%"><div><strong>${occupancy}%</strong><span>preenchido</span></div></div>
              <div class="figma-legend">
                <span><i class="wbm"></i>WBM <b>${shares[0]}%</b></span>
                <span><i class="sbm"></i>SBM <b>${shares[1]}%</b></span>
                <span><i class="brine"></i>Brine <b>${shares[2]}%</b></span>
                <span><i class="empty"></i>Vazio <b>${empty}%</b></span>
              </div>
            </div>
          </article>
        </section>
        <section class="card figma-recent-card">
          <div class="figma-card-heading"><div><h3>Painel de Atividades Recentes</h3><p>Últimos movimentos e atualizações da planta</p></div><button class="text-button-inline" data-page-link="audit">Ver histórico completo</button></div>
          <div class="figma-recent-table">
            <div class="figma-recent-row head"><span>Hora</span><span>Operação / Evento</span><span>Status</span><span>Responsável</span></div>
            ${recent.map(item => `<button class="figma-recent-row" data-page-link="${item.page}"><span>${dateTime(item.time)}</span><span><strong>${esc(item.title)}</strong><small>${esc(item.detail)}</small></span><span>${badge(item.status)}</span><span>${esc(item.responsible)}</span></button>`).join("") || `<div class="empty">Nenhuma atividade recente disponível.</div>`}
          </div>
        </section>
      </div>`;
  }

  function renderDashboardLegacy() {
    const d = state.data;
    const operations = filteredOperations();
    const trucks = filteredTrucks();
    const filtersActive = filterIsActive();

    const storage = type => {
      const items = d.tanks.filter(t => productClass(t.product, t.kind, t.volume) === type);
      return {
        volume: items.reduce((sum, item) => sum + Number(item.volume || 0), 0),
        capacity: items.reduce((sum, item) => sum + Number(item.capacity || 0), 0)
      };
    };

    const wbm = storage("wbm");
    const brine = storage("brine");
    const sbm = storage("sbm");
    const olefin = storage("olefin");
    const bulk = storage("bulk");
    const genericVolume = d.tanks
      .filter(t => productClass(t.product, t.kind, t.volume) === "generic")
      .reduce((sum, item) => sum + Number(item.volume || 0), 0);

    const activeOps = operations.filter(x => !["Concluída", "Cancelada"].includes(x.status));
    const today = localDateKey();
    const todayOps = d.operations.filter(x => recordDateKey(x.start_at || x.created_at) === today).length;
    const todayTrucks = d.trucks.filter(x => recordDateKey(x.date || x.created_at) === today).length;
    const periodOps = operations.length;
    const periodTrucks = trucks.length;

    const openMaintenance = d.maintenanceOrders.filter(x => !["Concluída", "Fechada", "Cancelada"].includes(x.status)).length;
    const expiring = d.certificates.filter(x => {
      const days = daysUntil(x.expires_at);
      return days !== null && days >= 0 && days <= 60;
    });
    const pendingQhse = d.actionItems.filter(x => x.status !== "Concluído").length
      + d.qhse.filter(x => x.status !== "Concluído").length;
    const downtime = operations.reduce((sum, op) => sum + Number(op.paused_minutes || 0), 0);
    const lowChemicals = d.chemicals.filter(x => Number(x.quantity || 0) <= Number(x.minimum || 0)).length;
    const expiringChemicals = d.chemicals.filter(x => {
      const days = daysUntil(x.expiry_date);
      return days !== null && days >= 0 && days <= 60;
    }).length;
    const criticalAlerts = d.systemAlerts.filter(x => isCriticalAlert(x.level)).length
      + d.alerts.filter(x => !x.read && isCriticalAlert(x.level)).length;

    const byClient = aggregateOperationVolume(operations, "client").slice(0, 6);
    const products = aggregateOperationVolume(operations, "product").slice(0, 6);
    const maxClient = Math.max(...byClient.map(x => x.value), 1);

    const clients = [...new Set(d.operations.map(x => x.client).filter(Boolean))].sort();
    const productNames = [...new Set(d.operations.map(x => x.product).filter(Boolean))].sort();

    const latestChange = latestTimestamp([
      ...d.tanks.map(x => x.updated_at),
      ...d.operations.map(x => x.updated_at || x.created_at),
      ...d.chemicals.map(x => x.updated_at),
      ...d.maintenanceOrders.map(x => x.closed_at || x.opened_at),
      ...d.alerts.map(x => x.created_at)
    ]);

    const occupiedAssets = d.tanks.filter(x => Number(x.volume || 0) > 0).length;
    const blockedAssets = d.tanks.filter(x => String(x.status || "").toLowerCase() === "bloqueado").length;
    const operationCount = filtersActive ? periodOps : todayOps;
    const truckCount = filtersActive ? periodTrucks : todayTrucks;
    const periodLabel = filtersActive ? "no período selecionado" : "registradas hoje";

    const phaseSummary = phase => {
      const assets = d.tanks.filter(x => x.phase === phase);
      const occupied = assets.filter(x => Number(x.volume || 0) > 0).length;
      const blocked = assets.filter(x => String(x.status || "").toLowerCase() === "bloqueado").length;
      const silos = assets.filter(isSiloAsset).length;
      const tanks = Math.max(0, assets.length - silos);
      const utilization = assets.length ? occupied / assets.length * 100 : 0;
      return { phase, total: assets.length, occupied, blocked, silos, tanks, utilization };
    };
    const phase1 = phaseSummary("Phase #1");
    const phase2 = phaseSummary("Phase #2");

    const attentionItems = [
      criticalAlerts > 0 ? { tone: "critical", value: criticalAlerts, title: "Alertas críticos", detail: "Alertas automáticos ou ainda não lidos", page: "alerts", icon: "alert" } : null,
      blockedAssets > 0 ? { tone: "warning", value: blockedAssets, title: "Equipamentos bloqueados", detail: "Tanques ou silos indisponíveis para operação", page: "tanks", icon: "lock" } : null,
      pendingQhse > 0 ? { tone: "warning", value: pendingQhse, title: "Pendências QHSE", detail: "Registros e itens de ação ainda abertos", page: "qhse", icon: "shield" } : null,
      lowChemicals > 0 ? { tone: "warning", value: lowChemicals, title: "Estoque químico baixo", detail: "Produtos no mínimo ou abaixo do mínimo", page: "chemicals", icon: "flask" } : null,
      expiring.length > 0 ? { tone: "info", value: expiring.length, title: "Certificados a vencer", detail: "Vencimento previsto nos próximos 60 dias", page: "certificates", icon: "file" } : null,
      expiringChemicals > 0 ? { tone: "info", value: expiringChemicals, title: "Lotes próximos do vencimento", detail: "Validade prevista nos próximos 60 dias", page: "chemicals", icon: "hourglass" } : null
    ].filter(Boolean).slice(0, 5);

    const activityDate = value => {
      if (!value) return "-";
      const raw = String(value);
      return raw.length <= 10 ? dateOnly(raw) : dateTime(raw);
    };
    const recentActivity = [
      ...d.operations.map(item => ({
        date: item.updated_at || item.start_at || item.created_at,
        page: "operations", icon: "anchor", tone: "blue",
        title: `${item.client || "Cliente não informado"} • ${item.vessel || "Embarcação não informada"}`,
        detail: `${item.activity || "Operação"} — ${item.product || "Produto não informado"}`
      })),
      ...d.trucks.map(item => ({
        date: item.updated_at || item.created_at || item.date,
        page: "trucks", icon: "truck", tone: "green",
        title: item.plate || item.invoice || "Movimentação de carreta",
        detail: `${item.movement || "Movimentação"} — ${item.product || item.truckType || "Carga"}`
      })),
      ...d.qhse.map(item => ({
        date: item.updated_at || item.created_at || item.date,
        page: "qhse", icon: "shield", tone: "amber",
        title: item.title || item.type || "Registro QHSE",
        detail: `${item.severity || "Sem severidade"} — ${item.status || "Sem status"}`
      })),
      ...d.maintenanceOrders.map(item => {
        const equipment = d.equipment.find(eq => eq.id === item.equipment_id);
        return {
          date: item.closed_at || item.opened_at,
          page: "maintenance", icon: "wrench", tone: "red",
          title: item.title || "Ordem de manutenção",
          detail: `${equipment?.name || "Equipamento"} — ${item.status || "Sem status"}`
        };
      })
    ].filter(item => item.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 7);

    const phaseCard = item => `<div class="dashboard-phase-card">
      <div class="dashboard-phase-head"><div><small>ÁREA OPERACIONAL</small><strong>${esc(item.phase)}</strong></div><span>${fmt.format(item.utilization)}%</span></div>
      <div class="dashboard-phase-progress"><span style="width:${Math.min(100, Math.max(0, item.utilization))}%"></span></div>
      <div class="dashboard-phase-data"><div><strong>${item.occupied}/${item.total}</strong><small>com produto</small></div><div><strong>${item.tanks}</strong><small>tanques</small></div><div><strong>${item.silos}</strong><small>silos</small></div><div><strong>${item.blocked}</strong><small>bloqueados</small></div></div>
    </div>`;

    $("#page-dashboard").innerHTML =
      header(MOBILE_PAGE_META.dashboard[0], "Visão consolidada da operação, tancagem e pontos de atenção.",
        `<button class="btn secondary" data-export="operations">Exportar CSV</button>
         <button class="btn secondary" data-action="refresh">${uiIcon("refresh", "ui-icon btn-icon")} Atualizar</button>
         <button class="btn primary" data-action="new-operation">+ Nova operação</button>`) +
      `<div class="dashboard-v331">
        ${dashboardRoleHome(d, activeOps)}

        <section class="dashboard-command-bar" aria-label="Status de sincronização">
          <div class="dashboard-command-live"><span class="live-dot"></span><div><strong>Operação sincronizada</strong><small>Tempo real ativo e verificação automática a cada 60 segundos</small></div></div>
          <div><small>Última sincronização</small><strong>${state.lastSync ? dateTime(state.lastSync) : "-"}</strong></div>
          <div><small>Última alteração</small><strong>${latestChange ? dateTime(latestChange) : "-"}</strong></div>
          <div><small>Ocupação da planta</small><strong>${occupiedAssets} de ${d.tanks.length} equipamentos</strong></div>
        </section>

        <section class="card dashboard-filter-panel no-print">
          <div class="dashboard-filter-heading"><div><small>PERÍODO E ESCOPO</small><h3>Filtros do dashboard</h3><p>Operações, carretas, rankings e tempo parado seguem o período selecionado.</p></div>${filtersActive ? `<span class="dashboard-filter-active">Filtro ativo</span>` : ""}</div>
          <div class="dashboard-filter-grid">
            <div><label>Data inicial</label><input id="filterStart" type="date" value="${esc(state.filters.start)}"></div>
            <div><label>Data final</label><input id="filterEnd" type="date" value="${esc(state.filters.end)}"></div>
            <div><label>Cliente</label><select id="filterClient"><option value="">Todos</option>${clients.map(x => `<option ${state.filters.client === x ? "selected" : ""}>${esc(x)}</option>`).join("")}</select></div>
            <div><label>Produto</label><select id="filterProduct"><option value="">Todos</option>${productNames.map(x => `<option ${state.filters.product === x ? "selected" : ""}>${esc(x)}</option>`).join("")}</select></div>
            <div class="filter-actions"><button class="btn primary" data-action="apply-dashboard-filters">Aplicar filtros</button><button class="btn secondary" data-action="clear-dashboard-filters">Limpar</button></div>
          </div>
        </section>
        ${filtersActive ? `<div class="dashboard-filter-notice">A tancagem continua exibindo o saldo atual da planta. Os demais indicadores seguem o filtro aplicado.</div>` : ""}

        <section class="dashboard-kpi-grid" aria-label="Indicadores principais">
          ${statCard(filtersActive ? "Operações no filtro" : "Operações hoje", fmt.format(operationCount), periodLabel, uiIcon("anchor"), activeOps.length ? `${activeOps.length} em andamento` : "Nenhuma em andamento", "blue")}
          ${statCard("Operações ativas", fmt.format(activeOps.length), "em acompanhamento", uiIcon("gauge"), activeOps.length ? "Monitorar execução e vazão" : "Planta sem operação ativa", "indigo")}
          ${statCard(filtersActive ? "Carretas no filtro" : "Carretas hoje", fmt.format(truckCount), periodLabel, uiIcon("truck"), "Entradas e saídas registradas", "green")}
          ${statCard("Equipamentos ocupados", fmt.format(occupiedAssets), `de ${d.tanks.length} tanques e silos`, uiIcon("layers"), `${blockedAssets} bloqueado(s)`, "cyan")}
          ${statCard("Manutenções abertas", fmt.format(openMaintenance), "ordens pendentes", uiIcon("wrench"), "Corretivas e preventivas", "amber")}
          ${statCard("Alertas críticos", fmt.format(criticalAlerts), "automáticos e não lidos", uiIcon("alert"), criticalAlerts ? "Requerem atenção" : "Nenhuma criticidade", "red")}
        </section>

        <div class="dashboard-main-grid">
          <section class="card dashboard-operations-panel">
            <div class="dashboard-section-heading"><div><small>ACOMPANHAMENTO EM TEMPO REAL</small><h3>Operações em andamento</h3><p>${activeOps.length} operação(ões) ativa(s) ${filtersActive ? "no filtro selecionado" : "neste momento"}.</p></div><button class="btn small secondary" data-page-link="operations">Ver todas</button></div>
            <div class="dashboard-operation-list">${activeOps.length ? activeOps.slice(0, 6).map(op => {
              const pct = op.planned ? Math.min(100, Math.max(0, Math.round(Number(op.executed || 0) / Number(op.planned || 1) * 100))) : 0;
              return `<article class="dashboard-operation-card">
                <div class="dashboard-operation-top"><div><small>${esc(op.client || "Cliente não informado")}</small><strong>${esc(op.vessel || "Embarcação não informada")}</strong><span>${esc(op.activity || "Operação")} • ${esc(op.product || "Produto não informado")}</span></div>${badge(op.status)}</div>
                <div class="dashboard-operation-progress"><span style="width:${pct}%"></span></div>
                <div class="dashboard-operation-metrics"><div><small>Executado</small><strong>${fmt.format(op.executed)} ${esc(op.unit)}</strong></div><div><small>Planejado</small><strong>${fmt.format(op.planned)} ${esc(op.unit)}</strong></div><div><small>Progresso</small><strong>${pct}%</strong></div><div><small>Vazão</small><strong>${fmt.format(operationFlow(op))} ${esc(op.unit)}/h</strong></div></div>
                <div class="dashboard-operation-footer"><span>${op.start_at ? `Início: ${dateTime(op.start_at)}` : "Horário inicial não informado"}</span><div><button class="btn small secondary" data-operation-timeline="${op.id}">Timeline</button><button class="btn small primary" data-edit-operation="${op.id}">Abrir</button></div></div>
              </article>`;
            }).join("") : `<div class="dashboard-empty-state">${uiIcon("check")}<strong>Nenhuma operação ativa</strong><span>As novas operações aparecerão aqui automaticamente.</span></div>`}</div>
          </section>

          <aside class="dashboard-side-stack">
            <section class="card dashboard-attention-panel">
              <div class="dashboard-section-heading compact"><div><small>CENTRAL DE ATENÇÃO</small><h3>Pontos que exigem ação</h3></div><button class="btn small secondary" data-page-link="alerts">Alertas</button></div>
              <div class="dashboard-attention-list">${attentionItems.length ? attentionItems.map(item => `<button class="dashboard-attention-item tone-${item.tone}" data-page-link="${item.page}"><span class="dashboard-attention-icon">${uiIcon(item.icon)}</span><div><strong>${esc(item.title)}</strong><small>${esc(item.detail)}</small></div><b>${fmt.format(item.value)}</b></button>`).join("") : `<div class="dashboard-empty-state compact">${uiIcon("check")}<strong>Sem pendências críticas</strong><span>Os principais controles estão dentro dos limites.</span></div>`}</div>
            </section>

            <section class="card dashboard-phase-panel">
              <div class="dashboard-section-heading compact"><div><small>DISPONIBILIDADE POR ÁREA</small><h3>Ocupação das fases</h3></div><button class="btn small secondary" data-page-link="tanks">Tancagem</button></div>
              <div class="dashboard-phase-list">${phaseCard(phase1)}${phaseCard(phase2)}</div>
              <div class="dashboard-plant-metrics">
                <div><span>QHSE pendente</span><strong>${pendingQhse}</strong></div>
                <div><span>Tempo parado</span><strong>${fmt.format(downtime / 60)} h</strong></div>
                <div><span>Certificados</span><strong>${expiring.length}</strong></div>
                <div><span>Químicos baixos</span><strong>${lowChemicals}</strong></div>
              </div>
            </section>
          </aside>
        </div>

        <section class="card dashboard-storage-overview">
          <div class="dashboard-section-heading"><div><small>SALDO ATUAL DA PLANTA</small><h3>Tancagem por família de produto</h3><p>Volumes atuais, capacidade utilizada e espaço livre.</p></div><button class="btn small secondary" data-page-link="tanks">Abrir inventário</button></div>
          <div class="dashboard-storage-grid">
            ${storageCard("WBM", wbm.volume, wbm.capacity, "bbl", uiIcon("droplet"), "wbm")}
            ${storageCard("Brine", brine.volume, brine.capacity, "bbl", uiIcon("droplet"), "brine")}
            ${storageCard("SBM", sbm.volume, sbm.capacity, "bbl", uiIcon("droplet"), "sbm")}
            ${storageCard("Olefina", olefin.volume, olefin.capacity, "bbl", uiIcon("droplet"), "olefin")}
            ${storageCard("Granéis", bulk.volume, bulk.capacity, "ton", uiIcon("package"), "bulk")}
          </div>
          ${genericVolume > 0 ? `<div class="dashboard-data-warning">Existem ${fmt.format(genericVolume)} bbl com produto não classificado. Vincule o produto para incluir esse volume no indicador correto.</div>` : ""}
        </section>

        <div class="dashboard-analysis-grid">
          <section class="card dashboard-chart-card">
            <div class="dashboard-section-heading compact"><div><small>PERFORMANCE</small><h3>Volume executado por cliente</h3><p>Valores mantidos por unidade operacional.</p></div></div>
            <div class="bar-list">${byClient.length ? byClient.map(item => `<div class="bar-row"><div><span>${esc(item.label)} <em class="unit-chip">${esc(item.unit)}</em></span><strong>${fmt.format(item.value)}</strong></div><div class="bar-track"><span style="width:${Math.min(100, item.value / maxClient * 100)}%"></span></div></div>`).join("") : `<div class="empty">Sem operações no período.</div>`}</div>
          </section>

          <section class="card dashboard-ranking-card">
            <div class="dashboard-section-heading compact"><div><small>MOVIMENTAÇÃO</small><h3>Produtos mais movimentados</h3><p>Ranking pelo volume executado.</p></div></div>
            <div class="ranking-list">${products.length ? products.map((item, index) => `<div class="ranking-row"><span class="rank">${index + 1}</span><div><strong>${esc(item.label)}</strong><small>${fmt.format(item.value)} ${esc(item.unit)} movimentados</small></div></div>`).join("") : `<div class="empty">Sem movimentações no período.</div>`}</div>
          </section>

          <section class="card dashboard-activity-panel">
            <div class="dashboard-section-heading compact"><div><small>RASTREABILIDADE</small><h3>Atividades recentes</h3><p>Últimas atualizações dos módulos operacionais.</p></div><button class="btn small secondary" data-page-link="audit">Auditoria</button></div>
            <div class="dashboard-activity-list">${recentActivity.length ? recentActivity.map(item => `<button class="dashboard-activity-item" data-page-link="${item.page}"><span class="dashboard-activity-icon tone-${item.tone}">${uiIcon(item.icon)}</span><div><strong>${esc(item.title)}</strong><small>${esc(item.detail)}</small></div><time>${activityDate(item.date)}</time></button>`).join("") : `<div class="empty">Nenhuma atividade recente.</div>`}</div>
          </section>
        </div>

        <section class="card smart-query dashboard-smart-query"><div><small>ASSISTENTE OPERACIONAL</small><h3>Consulta inteligente</h3><p>Pergunte sobre volumes, clientes, carretas, tanques, químicos, certificados ou diesel.</p></div><div class="smart-input"><input id="smartQuestion" placeholder="Ex.: Quantos bbl de Brine temos?"><button class="btn primary" data-action="smart-query">Perguntar</button></div><div id="smartAnswer" class="smart-answer hidden"></div></section>
      </div>`;
  }


  function dataQualityIssues() {
    const d = state.data;
    const issues = [];
    const add = (severity, category, title, detail, page, entityType = "", entityId = "") => issues.push({
      id: `${category}:${entityType}:${entityId}:${title}`,
      severity, category, title, detail, page, entityType, entityId
    });

    d.tanks.forEach(tank => {
      if (tank.volume > 0 && !tank.product) add("Alta", "Tancagem", `${tank.name} com saldo sem produto`, `${fmt.format(tank.volume)} ${tank.unit} precisam ser classificados.`, "tanks", "tank", tank.id);
      if (tank.volume > 0 && !tank.lot) add("Média", "Tancagem", `${tank.name} sem lote`, `${tank.product || "Produto não informado"} possui saldo sem rastreabilidade de lote.`, "tanks", "tank", tank.id);
      if (isSiloAsset(tank) && tank.volume > 0 && !(Number(tank.density) > 0)) add("Alta", "Tancagem", `${tank.name} sem densidade`, "A capacidade operacional do silo depende da densidade cadastrada.", "tanks", "tank", tank.id);
      if (tank.capacity > 0 && tank.volume > tank.capacity + 0.001) add("Crítica", "Tancagem", `${tank.name} acima da capacidade`, `${fmt.format(tank.volume)} de ${fmt.format(tank.capacity)} ${tank.unit}.`, "tanks", "tank", tank.id);
      const latest = d.tankHistory.filter(x => x.tank_id === tank.id).sort((a,b) => new Date(b.created_at)-new Date(a.created_at))[0];
      if (latest && Math.abs(Number(latest.new_volume || 0) - Number(tank.volume || 0)) > 0.001) add("Alta", "Conciliação", `${tank.name} diferente do último histórico`, `Atual ${fmt.format(tank.volume)} ${tank.unit}; histórico ${fmt.format(latest.new_volume)} ${tank.unit}.`, "tanks", "tank", tank.id);
    });

    d.operations.forEach(op => {
      const mode = tankMovementMode(op.activity);
      const allocations = normalizedOperationAllocations(op);
      const total = allocations.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      if (!op.fluidTypeId) add("Alta", "Operações", `${op.vessel}: produto não vinculado`, `${op.product || "Produto não informado"} precisa ser selecionado no catálogo Fluidos e Granéis.`, "operations", "operation", op.id);
      if (op.status === "Concluída" && !op.ticketNumber) add("Média", "Operações", `${op.vessel}: concluída sem ticket`, `${op.client} • ${op.activity} de ${op.product}.`, "operations", "operation", op.id);
      if (op.status === "Concluída" && !op.end_at) add("Alta", "Operações", `${op.vessel}: concluída sem término`, `${op.client} • ${op.activity} de ${op.product}.`, "operations", "operation", op.id);
      if (["Em andamento", "Paralisada", "Concluída"].includes(op.status) && !op.start_at) add("Alta", "Operações", `${op.vessel}: sem horário inicial`, `${op.client} • ${op.activity} de ${op.product}.`, "operations", "operation", op.id);
      if (mode !== "none" && op.executed > 0 && !allocations.length) add("Crítica", "Operações", `${op.vessel}: sem rateio de tancagem`, `${fmt.format(op.executed)} ${op.unit} executados sem origem/destino distribuído.`, "operations", "operation", op.id);
      if (mode !== "none" && allocations.length && Math.abs(total - op.executed) > 0.001) add("Alta", "Conciliação", `${op.vessel}: rateio diferente do executado`, `Executado ${fmt.format(op.executed)}; rateado ${fmt.format(total)} ${op.unit}.`, "operations", "operation", op.id);
      if (op.executed > op.planned + 0.001 && op.planned > 0) add("Média", "Operações", `${op.vessel}: executado acima do planejado`, `${fmt.format(op.executed)} de ${fmt.format(op.planned)} ${op.unit}.`, "operations", "operation", op.id);
    });

    d.trucks.forEach(truck => {
      if (truck.truckType !== "Plataforma" && ["Recebida","Concluída"].includes(truck.status) && !truck.stockApplied) add("Crítica","Logística",`${truck.plate || truck.invoice || "Carreta"}: estoque não aplicado`,"Abra a carreta e confirme produto, quantidade e equipamento.","trucks","truck",truck.id);
      if (!["Bulk","Tank","Plataforma"].includes(truck.truckType)) add("Alta", "Logística", `${truck.plate || truck.product}: tipo não definido`, "Classifique a carreta como Bulk, Tank ou Plataforma.", "trucks", "truck", truck.id);
      if (!truck.invoice) add("Média", "Logística", `${truck.plate || truck.product}: carreta sem NF`, `${truck.movement} • ${truck.truckType} • ${truck.product}.`, "trucks", "truck", truck.id);
      if (truck.truckType !== "Plataforma" && !truck.fluidTypeId) add("Alta", "Logística", `${truck.plate || truck.product}: produto não vinculado`, "Selecione o produto cadastrado em Fluidos e Granéis.", "trucks", "truck", truck.id);
      if (truck.truckType !== "Plataforma" && !truck.lot) add("Média", "Logística", `${truck.plate || truck.product}: carreta sem lote`, `${truck.product} sem lote informado.`, "trucks", "truck", truck.id);
      if (truck.truckType === "Plataforma" && !(truck.items || []).length) add("Alta", "Logística", `${truck.plate || "Plataforma"}: sem produtos`, "Adicione os insumos e suas quantidades.", "trucks", "truck", truck.id);
      if (!truck.plate) add("Baixa", "Logística", `Movimentação sem placa`, `${truck.product} • NF ${truck.invoice || "-"}.`, "trucks", "truck", truck.id);
    });

    d.chemicals.forEach(item => {
      if (!item.productId) add("Alta","Químicos",`${item.name} sem Catálogo Químico`,"Vincule o lote a um nome oficial.","chemicals","chemical",item.id);
      if (!item.lot) add("Alta", "Químicos", `${item.name} sem lote`, "O controle FEFO e a rastreabilidade ficam incompletos.", "chemicals", "chemical", item.id);
      if (!item.expiry_date) add("Média", "Químicos", `${item.name} sem validade`, `Lote ${item.lot || "-"}.`, "chemicals", "chemical", item.id);
      if (item.quantity < 0) add("Crítica", "Químicos", `${item.name} com saldo negativo`, `${fmt.format(item.quantity)} ${item.unit}.`, "chemicals", "chemical", item.id);
      const movements = d.chemicalMovements.filter(x => x.inventory_id === item.id).sort((a,b) => new Date(a.created_at)-new Date(b.created_at));
      const latest = movements.at(-1);
      if (latest && Math.abs(Number(latest.new_balance) - Number(item.quantity)) > 0.001) add("Crítica", "Conciliação", `${item.name} diferente da movimentação`, `Estoque ${fmt.format(item.quantity)}; último saldo ${fmt.format(latest.new_balance)} ${item.unit}.`, "chemicals", "chemical", item.id);
      movements.forEach((movement, index) => {
        if (index === 0) return;
        const previous = movements[index - 1];
        if (Math.abs(Number(movement.previous_balance) - Number(previous.new_balance)) > 0.001) add("Alta", "Conciliação", `${item.name}: quebra na sequência de saldos`, `${dateTime(previous.created_at)} → ${dateTime(movement.created_at)}.`, "chemicals", "chemical", item.id);
      });
    });

    d.certificates.forEach(item => {
      if (!item.user_id) add("Média", "Documentação", `${item.title} sem usuário vinculado`, `${item.owner || "Colaborador não informado"}.`, "certificates", "certificate", item.id);
      if (!item.expires_at) add("Média", "Documentação", `${item.title} sem validade`, `${item.owner || "-"}.`, "certificates", "certificate", item.id);
    });

    d.equipment.forEach(item => {
      if (!item.location) add("Baixa", "Manutenção", `${item.name} sem localização`, `${item.category}.`, "maintenance", "equipment", item.id);
      if (!item.next_maintenance_date && !item.maintenance_due_hourmeter) add("Média", "Manutenção", `${item.name} sem preventiva programada`, "Cadastre data ou horímetro para a próxima manutenção.", "maintenance", "equipment", item.id);
    });

    return issues.sort((a, b) => {
      const rank = { "Crítica": 0, "Alta": 1, "Média": 2, "Baixa": 3 };
      return (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9) || a.category.localeCompare(b.category);
    });
  }

  function reconciliationSummary() {
    const d = state.data;
    const chemicalOk = d.chemicals.filter(item => {
      const latest = d.chemicalMovements.filter(x => x.inventory_id === item.id).sort((a,b) => new Date(b.created_at)-new Date(a.created_at))[0];
      return !latest || Math.abs(Number(latest.new_balance) - Number(item.quantity)) <= 0.001;
    }).length;
    const tankOk = d.tanks.filter(tank => {
      const latest = d.tankHistory.filter(x => x.tank_id === tank.id).sort((a,b) => new Date(b.created_at)-new Date(a.created_at))[0];
      return !latest || Math.abs(Number(latest.new_volume || 0) - Number(tank.volume || 0)) <= 0.001;
    }).length;
    const operationOk = d.operations.filter(op => {
      const mode = tankMovementMode(op.activity);
      if (mode === "none" || op.executed <= 0) return true;
      const total = normalizedOperationAllocations(op).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      return Math.abs(total - op.executed) <= 0.001;
    }).length;
    return {
      tankOk, tankTotal: d.tanks.length,
      chemicalOk, chemicalTotal: d.chemicals.length,
      operationOk, operationTotal: d.operations.length
    };
  }

  function renderQuality() {
    const issues = dataQualityIssues();
    const summary = reconciliationSummary();
    const critical = issues.filter(x => ["Crítica", "Alta"].includes(x.severity));
    const categories = [...new Set(issues.map(x => x.category))];
    const cards = issues.map(item => `<article class="card quality-issue-card ${statusClass(item.severity)}">
      <div class="quality-issue-top"><span>${esc(item.category)}</span>${badge(item.severity)}</div>
      <h3>${esc(item.title)}</h3><p>${esc(item.detail)}</p>
      <footer><button class="btn small secondary" data-quality-page="${item.page}" data-quality-type="${item.entityType}" data-quality-id="${item.entityId}">Corrigir registro</button></footer>
    </article>`).join("");

    $("#page-quality").innerHTML =
      header("Qualidade dos dados", "Verificação automática de rastreabilidade, conciliação e campos obrigatórios.",
        `<button class="btn secondary" data-action="refresh">${uiIcon("refresh", "ui-icon btn-icon")} Recalcular</button><button class="btn primary" data-export="quality">Exportar pendências</button>`) +
      `<div class="quality-score-card card"><div><small>ÍNDICE DE QUALIDADE</small><strong>${Math.max(0, Math.round(100 - Math.min(100, issues.reduce((sum, item) => sum + ({Crítica:8,Alta:5,Média:2,Baixa:1}[item.severity] || 1), 0))))}%</strong><span>${issues.length} ponto(s) encontrado(s)</span></div><div class="quality-score-bars"><span>Críticos/altos<strong>${critical.length}</strong></span><span>Categorias<strong>${categories.length}</strong></span><span>Última análise<strong>${new Date().toLocaleTimeString("pt-BR")}</strong></span></div></div>
      <div class="section-title">Conciliação automática</div>
      <div class="grid three reconciliation-grid">
        <div class="card reconciliation-card"><span>Tanques e silos</span><strong>${summary.tankOk}/${summary.tankTotal}</strong><small>Saldo atual igual ao último histórico</small><div class="progress"><span style="width:${summary.tankTotal ? summary.tankOk / summary.tankTotal * 100 : 100}%"></span></div></div>
        <div class="card reconciliation-card"><span>Inventário químico</span><strong>${summary.chemicalOk}/${summary.chemicalTotal}</strong><small>Saldo igual à última movimentação</small><div class="progress"><span style="width:${summary.chemicalTotal ? summary.chemicalOk / summary.chemicalTotal * 100 : 100}%"></span></div></div>
        <div class="card reconciliation-card"><span>Operações com rateio</span><strong>${summary.operationOk}/${summary.operationTotal}</strong><small>Rateio igual ao volume executado</small><div class="progress"><span style="width:${summary.operationTotal ? summary.operationOk / summary.operationTotal * 100 : 100}%"></span></div></div>
      </div>
      ${latestClosingReconciliationPanel()}
      <div class="section-title">Pendências encontradas</div>
      <div class="quality-filter-chips">${categories.map(category => `<span>${esc(category)} <strong>${issues.filter(x => x.category === category).length}</strong></span>`).join("") || `<span>Nenhuma pendência</span>`}</div>
      <div class="quality-issues-grid">${cards || `<div class="card quality-all-good"><strong>${uiIcon("check", "ui-icon ui-icon-inline")} Dados consistentes</strong><p>Nenhuma inconsistência automática foi encontrada.</p></div>`}</div>`;
  }


  function sanitationIssues() {
    const issues=[];
    const add=(type,title,detail,page,id="")=>issues.push({type,title,detail,page,id});
    state.data.operations.filter(item=>!item.fluidTypeId).forEach(item=>add("Operação",`${item.vessel}: produto sem vínculo`,item.product||"Produto não informado","operations",item.id));
    state.data.trucks.filter(item=>["Bulk","Tank"].includes(item.truckType)&&!item.fluidTypeId).forEach(item=>add("Carreta",`${item.plate||item.invoice||"Carreta"}: produto sem vínculo`,item.product,"trucks",item.id));
    state.data.chemicals.filter(item=>!item.productId).forEach(item=>add("Químico",`${item.name}: lote sem catálogo`,`Lote ${item.lot||"-"}`,"chemicals",item.id));
    state.data.tanks.filter(item=>item.volume>0&&!item.fluidTypeId).forEach(item=>add("Tancagem",`${item.name}: saldo sem produto vinculado`,`${fmt.format(item.volume)} ${item.unit}`,"tanks",item.id));
    state.data.fluids.filter(item=>["granel","insumo"].includes(String(item.type).toLowerCase())&&Number(item.density)>10).forEach(item=>add("Densidade",`${item.name}: densidade fora do padrão`,`${fmt.format(item.density)} ${item.densityUnit}`,"fluids",item.id));
    return issues;
  }

  function renderSanitation() {
    const issues=sanitationIssues();
    const grouped=[...new Set(issues.map(item=>item.type))];
    $("#page-sanitation").innerHTML=header("Saneamento de Dados","Localize registros antigos sem vínculo e corrija sem alterar saldos.",`<button class="btn secondary" data-action="refresh">${uiIcon("refresh", "ui-icon btn-icon")} Reanalisar</button>`)+
      `<div class="card sanitation-intro"><strong>Correções automáticas já aplicadas</strong><p>Os lotes químicos existentes foram vinculados ao novo Catálogo Químico pelo nome. Esta tela mostra apenas o que ainda exige decisão humana.</p></div>
      <div class="grid four">${grouped.map(type=>statCard(type,issues.filter(item=>item.type===type).length,"pendência(s)",uiIcon("alert"))).join("")||statCard("Pendências",0,"dados vinculados",uiIcon("check"))}</div>
      <div class="section-title">Registros que exigem conferência</div><div class="sanitation-grid">${issues.map(item=>`<article class="card sanitation-card"><div>${badge(item.type)}<h3>${esc(item.title)}</h3><p>${esc(item.detail)}</p></div><button class="btn small primary" data-sanitation-page="${item.page}" data-sanitation-id="${item.id}">Abrir registro</button></article>`).join("")||`<div class="card quality-all-good"><strong>✓ Base saneada</strong><p>Nenhum vínculo antigo pendente foi encontrado.</p></div>`}</div>`;
  }

  function cleanVesselIdentifier(value = "", length = 0) {
    const digits = String(value || "").replace(/\D/g, "");
    return digits && (!length || digits.length === length) ? digits : "";
  }

  function vesselRegistryForm(item = {}) {
    return `<form id="vesselRegistryForm" data-id="${item.id || ""}" novalidate><div class="form-grid">
      <div class="wide"><label>Nome da embarcação *</label><input name="name" required maxlength="120" value="${esc(item.name || "")}" placeholder="Ex.: Starnav Ursus"></div>
      <div><label>IMO</label><input name="imo" inputmode="numeric" maxlength="7" pattern="[0-9]{7}" value="${esc(item.imo || "")}" placeholder="7 dígitos"></div>
      <div><label>MMSI *</label><input name="mmsi" inputmode="numeric" maxlength="9" pattern="[0-9]{9}" required value="${esc(item.mmsi || "")}" placeholder="9 dígitos"></div>
      <div class="wide info-box"><strong>Abertura direta no mapa:</strong> o MMSI é obrigatório para centralizar a embarcação no mapa do MarineTraffic. O IMO permanece como identificação complementar.</div>
    </div>${formActions(item.id ? "Salvar alterações" : "Cadastrar embarcação")}</form>`;
  }

  async function saveVesselRegistry(payload, id = null) {
    if (!canManageVesselRegistry()) throw new Error("Seu perfil não pode cadastrar ou editar embarcações.");
    const name = String(payload.name || "").trim();
    const rawImo = String(payload.imo || "").replace(/\D/g, "");
    const rawMmsi = String(payload.mmsi || "").replace(/\D/g, "");
    if (!name) throw new Error("Informe o nome da embarcação.");
    if (rawImo && rawImo.length !== 7) throw new Error("O IMO precisa ter exatamente 7 dígitos.");
    if (rawMmsi && rawMmsi.length !== 9) throw new Error("O MMSI precisa ter exatamente 9 dígitos.");
    if (!rawMmsi) throw new Error("Informe o MMSI para abrir a embarcação diretamente no mapa.");
    const row = { name, imo: rawImo || null, mmsi: rawMmsi || null, active: true, updated_by: state.user.id };
    const query = id
      ? state.client.from("vessel_registry").update(row).eq("id", id).select("id").single()
      : state.client.from("vessel_registry").insert({ ...row, created_by: state.user.id }).select("id").single();
    const { data, error } = await query;
    if (error) {
      if (String(error.code) === "23505") throw new Error("Já existe uma embarcação com este nome, IMO ou MMSI.");
      if (String(error.code) === "23514") throw new Error("Confira o formato do IMO e do MMSI.");
      throw error;
    }
    return data.id;
  }

  function renderVesselRegistry() {
    const page = $("#page-vessel-registry");
    if (!page) return;
    const items = [...(state.data.vesselRegistry || [])].sort((a,b) => a.name.localeCompare(b.name, "pt-BR"));
    const cards = items.map(item => `<article class="card vessel-registry-card">
      <div class="vessel-registry-card-head"><div class="vessel-registry-icon">${uiIcon("anchor")}</div><div><small>EMBARCAÇÃO</small><h3>${esc(item.name)}</h3></div>${badge(item.active ? "Ativa" : "Inativa")}</div>
      <div class="vessel-registry-identifiers"><span>IMO<strong>${esc(item.imo || "Não informado")}</strong></span><span>MMSI<strong>${esc(item.mmsi || "Não informado")}</strong></span></div>
      <div class="vessel-registry-preview"><span>Mapa da embarcação</span>${marineTrafficVesselButton({ vesselName:item.name, imo:item.imo, mmsi:item.mmsi }, true)}</div>
      <div class="row-actions">${canManageVesselRegistry() ? `<button class="btn small primary" data-edit-vessel-registry="${item.id}">Editar</button>` : ""}${canDeleteVesselRegistry() ? `<button class="btn small danger" data-delete-vessel-registry="${item.id}">Excluir</button>` : ""}</div>
    </article>`).join("");
    const rows = items.map(item => `<tr><td><strong>${esc(item.name)}</strong></td><td>${esc(item.imo || "-")}</td><td>${esc(item.mmsi || "-")}</td><td>${marineTrafficVesselButton({ vesselName:item.name, imo:item.imo, mmsi:item.mmsi }, true)}</td><td><div class="row-actions">${canManageVesselRegistry() ? `<button class="btn small primary" data-edit-vessel-registry="${item.id}">Editar</button>` : ""}${canDeleteVesselRegistry() ? `<button class="btn small danger" data-delete-vessel-registry="${item.id}">Excluir</button>` : ""}</div></td></tr>`).join("");
    page.innerHTML = header("Cadastro de Embarcações", "Cadastre nome, IMO e MMSI uma única vez. No celular, os cartões e botões se adaptam automaticamente.", canManageVesselRegistry() ? `<button class="btn primary" data-action="new-vessel-registry">${uiIcon("plus", "ui-icon btn-icon")} Nova embarcação</button>` : "") +
      `<section class="vessel-registry-hero"><div><span>CADASTRO MESTRE</span><h2>Mapa direto da embarcação</h2><p>O botão usa o MMSI cadastrado para abrir o mapa do MarineTraffic já focado no navio, sem passar pela página de informações.</p></div><div class="vessel-registry-summary"><span>Embarcações cadastradas<strong>${items.length}</strong></span><span>Com IMO<strong>${items.filter(item=>item.imo).length}</strong></span><span>Com MMSI<strong>${items.filter(item=>item.mmsi).length}</strong></span></div></section>
      <div class="vessel-registry-grid">${cards || `<div class="card empty">Nenhuma embarcação cadastrada.</div>`}</div>
      <div class="card table-wrap desktop-record-table"><table class="data-table"><thead><tr><th>Embarcação</th><th>IMO</th><th>MMSI</th><th>MarineTraffic</th><th>Ações</th></tr></thead><tbody>${rows || `<tr><td colspan="5" class="empty">Nenhuma embarcação cadastrada.</td></tr>`}</tbody></table></div>`;
  }

  function planningAssessment(operation) {
    const allocations = normalizedOperationAllocations(operation);
    const mode = tankMovementMode(operation.activity);
    const expected = Number(operation.planned || 0);
    const allocated = allocations.reduce((sum,item)=>sum+Number(item.quantity||0),0);
    const issues = [];
    if (mode !== "none" && !allocations.length) issues.push("Nenhum tanque ou silo reservado");
    if (mode !== "none" && allocations.length && Math.abs(allocated-expected)>0.001) issues.push(`Rateio ${fmt.format(allocated)} de ${fmt.format(expected)} ${operation.unit}`);
    allocations.forEach(item => {
      const tank=state.data.tanks.find(t=>t.id===item.tank_id); if(!tank){issues.push("Equipamento não localizado");return;}
      if(item.direction==="source" && Number(item.quantity)>Number(tank.volume)) issues.push(`${tank.name}: saldo insuficiente`);
      if(item.direction==="destination" && Number(item.quantity)>Number(tank.capacity-tank.volume)) issues.push(`${tank.name}: capacidade insuficiente`);
      if(String(tank.unit).toLowerCase()!==String(operation.unit).toLowerCase()) issues.push(`${tank.name}: unidade diferente`);
    });
    return { allocations, allocated, issues, ready: issues.length===0 && mode!=="none" };
  }

  function planningCard(operation) {
    const check=planningAssessment(operation); const start=operation.start_at?dateTime(operation.start_at):"Sem horário";
    return `<div class="planning-card ${check.issues.length?"risk":"ready"}">
      <div class="planning-card-head"><div><small>${esc(operation.client)}</small><h3>${esc(operation.vessel)}</h3></div>${badge(check.issues.length?"Atenção":"Pronta")}</div>
      <p>${esc(operation.activity)} de <strong>${esc(operation.product)}</strong></p>
      <div class="planning-operation-meta">${operation.rig ? `<span>Sonda: ${esc(operation.rig)}</span>` : ""}${operation.well ? `<span>Poço: ${esc(operation.well)}</span>` : ""}${operation.ticketNumber ? `<span>Ticket: ${esc(operation.ticketNumber)}</span>` : ""}</div>
      <div class="planning-kpis"><span>Previsto<strong>${fmt.format(operation.planned)} ${esc(operation.unit)}</strong></span><span>Reservado<strong>${fmt.format(check.allocated)} ${esc(operation.unit)}</strong></span><span>Início<strong>${esc(start)}</strong></span></div>
      <div class="planning-assets">${check.allocations.map(item=>{const t=state.data.tanks.find(x=>x.id===item.tank_id);return `<span>${esc(t?.name||"-")}: ${fmt.format(item.quantity)} ${esc(item.unit)}</span>`}).join("")||"<span>Sem equipamentos reservados</span>"}</div>
      ${check.issues.length?`<div class="planning-issues">${check.issues.map(x=>`<span>${uiIcon("alert", "ui-icon ui-icon-inline")} ${esc(x)}</span>`).join("")}</div>`:`<div class="planning-ok">${uiIcon("check", "ui-icon ui-icon-inline")} Saldo e capacidade conferidos</div>`}
      <div class="row-actions planning-card-actions">${marineTrafficOperationButton(operation)}<button class="btn small primary" data-edit-operation="${operation.id}">Abrir planejamento</button></div>
    </div>`;
  }


  function operationPriorityCard(op) {
    const pct = op.planned ? Math.min(100, Math.round(Number(op.executed || 0) / Number(op.planned || 1) * 100)) : 0;
    const flow = operationFlow(op);
    const allocations = normalizedOperationAllocations(op);
    const statusIcon = op.status === "Em andamento" ? "activity" : op.status === "Paralisada" ? "alert" : "calendar";
    return `<article class="operation-focus-card ${statusClass(op.status)}">
      <div class="operation-focus-head">
        <div class="operation-focus-icon">${clientLogoBadge(op.client, statusIcon, "operation-card-logo")}</div>
        <div><small>${esc(op.client || "Cliente não informado")}</small><h3>${esc(op.vessel || "Operação")}</h3></div>
        ${badge(op.status)}
      </div>
      <div class="operation-focus-service"><strong>${esc(op.activity)}</strong><span>${esc(op.product || "Produto não informado")}</span></div>
      <div class="operation-focus-meta">
        ${op.rig ? `<span>Sonda<strong>${esc(op.rig)}</strong></span>` : ""}
        ${op.well ? `<span>Poço<strong>${esc(op.well)}</strong></span>` : ""}
        ${op.ticketNumber ? `<span>Ticket<strong>${esc(op.ticketNumber)}</strong></span>` : ""}
      </div>
      <div class="operation-focus-progress"><div><span>Progresso</span><strong>${pct}%</strong></div><div class="progress"><span style="width:${pct}%"></span></div></div>
      <div class="operation-focus-kpis">
        <span>Executado<strong>${fmt.format(op.executed)} ${esc(op.unit)}</strong></span>
        <span>Vazão<strong>${fmt.format(flow)} ${esc(op.unit)}/h</strong></span>
        <span>Tancagem<strong>${allocations.length} equipamento(s)</strong></span>
      </div>
      <div class="operation-focus-actions">
        ${op.status === "Programada" ? marineTrafficOperationButton(op) : ""}
        <button class="btn small secondary" data-operation-timeline="${op.id}">${uiIcon("history", "ui-icon btn-icon")} Timeline</button>
        <button class="btn small primary" data-edit-operation="${op.id}">${uiIcon("edit", "ui-icon btn-icon")} Abrir operação</button>
      </div>
    </article>`;
  }

  function renderOperations() {
    const operations = filteredOperations();
    const active = operations.filter(op => ["Em andamento", "Paralisada"].includes(op.status));
    const programmed = operations.filter(op => op.status === "Programada");
    const completed = operations.filter(op => op.status === "Concluída");
    const totalPlanned = operations.reduce((sum, op) => sum + Number(op.planned || 0), 0);
    const totalExecuted = operations.reduce((sum, op) => sum + Number(op.executed || 0), 0);
    const completion = totalPlanned > 0 ? Math.min(100, Math.round(totalExecuted / totalPlanned * 100)) : 0;
    const pendingTank = operations.filter(op => op.status === "Concluída" && !op.tank_movement_applied && tankMovementMode(op.activity) !== "none").length;

    const rows = operations.map(op => {
      const pct = op.planned ? Math.min(100, Math.round(op.executed / op.planned * 100)) : 0;
      const flow = operationFlow(op);
      const canEdit = isAdmin() || !op.locked || hasRole(["supervisor"]);
      const tankStatus = op.tank_movement_applied ? "Aplicada" : op.apply_tank_movement ? "Preparada" : "Manual";
      return `<tr>
        <td><strong>${esc(op.client)}</strong><br><small>${esc(op.vessel)}</small><br><small>Sonda: ${esc(op.rig || "-")} • Poço: ${esc(op.well || "-")}</small><br><small>Ticket: ${esc(op.ticketNumber || "-")} • OS: ${esc(op.service_order || "-")}</small></td>
        <td>${esc(op.activity)}<br><small>${esc(op.product)} • ${esc(op.lot || "-")}</small></td>
        <td><div class="operation-table-progress"><div><strong>${fmt.format(op.executed)} / ${fmt.format(op.planned)} ${esc(op.unit)}</strong><span>${pct}%</span></div><div class="progress"><span style="width:${pct}%"></span></div></div></td>
        <td><strong>${fmt.format(flow)} ${esc(op.unit)}/h</strong><br><small>${fmt.format(operationHours(op))} h líquidas</small></td>
        <td>${operationAllocationHtml(op)}<div style="margin-top:6px">${badge(tankStatus)}</div></td>
        <td>${badge(op.status)}${op.locked ? `<br><span class="tag">${uiIcon("lock", "ui-icon ui-icon-inline")} Encerrada</span>` : ""}</td>
        <td>${dateTime(op.start_at)}<br><small>${op.end_at ? `Fim: ${dateTime(op.end_at)}` : "Sem término"}</small></td>
        <td><div class="row-actions">
          <button class="btn small secondary" data-operation-timeline="${op.id}">Timeline</button>
          ${op.status === "Programada" ? marineTrafficOperationButton(op, true) : ""}
          <button class="btn small secondary" data-attachments="operation:${op.id}" data-attachment-title="${esc(op.vessel)}">${uiIcon("paperclip", "ui-icon btn-icon")} ${attachmentCount("operation", op.id)}</button>
          ${hasRole(["supervisor", "lider", "operador"]) && op.status === "Concluída" && !op.tank_movement_applied && tankMovementMode(op.activity) !== "none" ? `<button class="btn small soft" data-apply-operation-tank="${op.id}">Aplicar na tancagem</button>` : ""}
          ${canEdit ? `<button class="btn small primary" data-edit-operation="${op.id}">Editar</button>` : ""}
        </div></td>
      </tr>`;
    }).join("");

    const mobile = operations.map(op => `<div class="card mobile-record-card operation-mobile-card">
      <div class="mobile-record-head operation-mobile-head"><div class="operation-mobile-title">${clientLogoBadge(op.client, "calendar", "operation-mobile-logo")}<div><strong>${esc(op.client)}</strong><small>${esc(op.vessel)} • ${esc(op.activity)}</small></div></div>${badge(op.status)}</div>
      <div class="operation-mobile-meta">${op.rig ? `<span>Sonda <strong>${esc(op.rig)}</strong></span>` : ""}${op.well ? `<span>Poço <strong>${esc(op.well)}</strong></span>` : ""}${op.ticketNumber ? `<span>Ticket <strong>${esc(op.ticketNumber)}</strong></span>` : ""}</div>
      <div class="mobile-record-grid"><span>Produto<strong>${esc(op.product)}</strong></span><span>Executado<strong>${fmt.format(op.executed)} ${esc(op.unit)}</strong></span><span>Vazão<strong>${fmt.format(operationFlow(op))} ${esc(op.unit)}/h</strong></span><span>Tancagem<strong>${normalizedOperationAllocations(op).length} equipamento(s)</strong></span></div>
      <div class="mobile-allocation-summary">${operationAllocationHtml(op)}</div>
      <div class="row-actions">${op.status === "Programada" ? marineTrafficOperationButton(op, true) : ""}<button class="btn small secondary" data-operation-timeline="${op.id}">Timeline</button>${isAdmin() || !op.locked || hasRole(["supervisor"]) ? `<button class="btn small primary" data-edit-operation="${op.id}">Editar</button>` : ""}</div>
    </div>`).join("");

    const priority = [...active, ...programmed].slice(0, 6);
    $("#page-operations").innerHTML =
      header("Operações", "Planeje os serviços e abra a posição das embarcações programadas diretamente no MarineTraffic.",
        `<button class="btn secondary" data-export="operations">${uiIcon("download", "ui-icon btn-icon")} Exportar CSV</button><button class="btn primary" data-action="new-operation">${uiIcon("plus", "ui-icon btn-icon")} Nova operação</button>`) +
      `<section class="operations-command-bar">
        <div class="operations-command-copy"><span>CENTRAL OPERACIONAL</span><h2>Visão consolidada das operações</h2><p>Acompanhe programação, execução, vazão, tancagem e acesso ao MarineTraffic em uma única tela.</p></div>
        <div class="operations-command-progress"><div><span>Execução consolidada</span><strong>${completion}%</strong></div><div class="progress"><span style="width:${completion}%"></span></div><small>${fmt.format(totalExecuted)} de ${fmt.format(totalPlanned)} nas unidades registradas</small></div>
      </section>
      <div class="operations-kpi-grid">
        ${statCard("Em andamento", active.filter(op => op.status === "Em andamento").length, "operação(ões) ativa(s)", uiIcon("activity"))}
        ${statCard("Programadas", programmed.length, "aguardando início", uiIcon("calendar"))}
        ${statCard("Paralisadas", active.filter(op => op.status === "Paralisada").length, "exigem acompanhamento", uiIcon("alert"))}
        ${statCard("Concluídas", completed.length, "no período filtrado", uiIcon("check"))}
        ${statCard("Tancagem pendente", pendingTank, "aguardando aplicação", uiIcon("tank"))}
      </div>
      <div class="section-heading-row"><div><span>PRIORIDADES</span><h2>Programação e execução</h2></div><small>${priority.length} operação(ões) em destaque</small></div>
      <div class="operation-focus-grid">${priority.map(operationPriorityCard).join("") || `<div class="card empty">Nenhuma operação ativa ou programada.</div>`}</div>
      <div class="section-heading-row"><div><span>PLANEJAMENTO</span><h2>Conferência de saldo e capacidade</h2></div><small>Validação automática dos equipamentos reservados</small></div>
      <div class="planning-grid">${programmed.sort((a,b)=>new Date(a.start_at||"2999-01-01")-new Date(b.start_at||"2999-01-01")).slice(0,8).map(planningCard).join("")||`<div class="card empty">Nenhuma operação programada.</div>`}</div>
      <div class="section-heading-row"><div><span>REGISTROS</span><h2>Controle completo</h2></div><small>${operations.length} registro(s) no filtro atual</small></div>
      <div class="card table-wrap desktop-record-table operations-table-card"><table class="data-table"><thead><tr><th>Cliente / Embarcação</th><th>Atividade / Produto</th><th>Progresso</th><th>Vazão</th><th>Distribuição da tancagem</th><th>Status</th><th>Período</th><th>Ações</th></tr></thead><tbody>${rows || `<tr><td colspan="8" class="empty">Nenhuma operação cadastrada.</td></tr>`}</tbody></table></div><div class="mobile-record-list">${mobile || `<div class="empty">Nenhuma operação cadastrada.</div>`}</div>`;
  }

  function setOperationStep(form, step = 1) {
    if (!form) return;
    const target = Math.max(1, Math.min(4, Number(step || 1)));
    form.dataset.step = String(target);
    form.querySelectorAll("[data-operation-step]").forEach(section => section.classList.toggle("active", Number(section.dataset.operationStep) === target));
    form.querySelectorAll("[data-operation-step-indicator]").forEach(indicator => {
      const value = Number(indicator.dataset.operationStepIndicator);
      indicator.classList.toggle("active", value === target);
      indicator.classList.toggle("done", value < target);
    });
    updateOperationReview(form);
  }

  function validateOperationStep(form, step) {
    if (step === 1) {
      if (!form.elements.client?.value.trim()) throw new Error("Informe o cliente.");
      if (!form.elements.vessel_registry_id?.value) throw new Error("Selecione uma embarcação cadastrada.");
      if (!form.elements.vessel?.value.trim()) throw new Error("A embarcação selecionada não possui nome válido.");
    }
    if (step === 2) {
      if (!form.elements.fluid_type_id?.value) throw new Error("Selecione o fluido ou granel.");
      const planned = parseTankVolume(form.elements.planned?.value || "");
      if (!Number.isFinite(planned) || planned < 0) throw new Error("Informe uma quantidade planejada válida.");
    }
    if (step === 3) {
      const mode = tankMovementMode(form.elements.activity?.value || "");
      const apply = form.elements.apply_tank_movement?.checked;
      if (mode !== "none" && apply) collectOperationAllocations(form);
    }
    return true;
  }

  function syncOperationVessel(form) {
    if (!form) return;
    const select = form.elements.vessel_registry_id;
    const hiddenName = form.elements.vessel;
    const info = form.querySelector("[data-operation-vessel-info]");
    if (!select || !hiddenName) return;
    const selected = (state.data?.vesselRegistry || []).find(item => item.id === select.value);
    hiddenName.value = selected?.name || "";
    if (info) {
      info.textContent = selected
        ? `IMO ${selected.imo || "não informado"} • MMSI ${selected.mmsi || "não informado"}`
        : "Cadastre ou selecione a embarcação com MMSI para abrir diretamente o mapa.";
    }
    updateOperationReview(form);
  }

  function updateOperationReview(form) {
    const review = form?.querySelector("[data-operation-review]");
    if (!review) return;
    const product = state.data.fluids.find(item => item.id === form.elements.fluid_type_id?.value);
    const allocations = [...form.querySelectorAll("[data-operation-allocation-row]")].map(row => {
      const tank = state.data.tanks.find(item => item.id === row.querySelector("[data-allocation-tank]")?.value);
      const qty = row.querySelector("[data-allocation-quantity]")?.value || "0";
      return tank ? `${tank.name}: ${qty} ${form.elements.unit?.value || ""}` : "";
    }).filter(Boolean);
    review.innerHTML = `<div><span>Cliente / embarcação</span><strong>${esc(form.elements.client?.value || "-")} • ${esc(form.elements.vessel?.value || "-")}</strong></div><div><span>Atividade / produto</span><strong>${esc(form.elements.activity?.value || "-")} • ${esc(product?.name || "-")}</strong></div><div><span>Planejado / executado</span><strong>${esc(form.elements.planned?.value || "0")} / ${esc(form.elements.executed?.value || "0")} ${esc(form.elements.unit?.value || "")}</strong></div><div><span>Tancagem</span><strong>${esc(allocations.join(" | ") || "Sem rateio")}</strong></div>`;
  }

  function operationForm(op = {}) {
    const responsibleOptions = state.data.users.map(user => `<option value="${user.id}" ${op.responsible_id === user.id ? "selected" : ""}>${esc(user.name)}</option>`).join("");
    const registry = (state.data.vesselRegistry || []).filter(item => item.active !== false);
    const matchedVessel = registry.find(item => item.id === op.vesselRegistryId) || registry.find(item => normalizeSearch(item.name) === normalizeSearch(op.vessel || ""));
    const selectedVesselId = matchedVessel?.id || "";
    const vesselOptions = registry.map(item => `<option value="${item.id}" ${selectedVesselId === item.id ? "selected" : ""}>${esc(item.name)}${item.imo ? ` • IMO ${esc(item.imo)}` : ""}${item.mmsi ? ` • MMSI ${esc(item.mmsi)}` : ""}</option>`).join("");
    const applied = op.tank_movement_applied === true && !isAdmin();
    const activity = op.activity || "Bombeio";
    const mode = tankMovementMode(activity);
    const direction = mode === "out" ? "source" : "destination";
    const linkedProduct = state.data.fluids.find(item => item.id === op.fluidTypeId);
    const legacyUnlinked = Boolean(op.product && !linkedProduct);
    const unit = linkedProduct?.unit || op.unit || "bbl";
    const allocations = normalizedOperationAllocations(op);
    const initialRows = allocations.length ? allocations.map(item => operationAllocationRow(item,item.direction||direction,unit,applied,op.fluidTypeId||"")).join("") : mode!=="none" ? operationAllocationRow({},direction,unit,applied,op.fluidTypeId||"") : "";
    const nav = `<div class="operation-stepper-head">${[["1","Identificação"],["2","Serviço"],["3","Tancagem"],["4","Conclusão"]].map(([n,label]) => `<span data-operation-step-indicator="${n}" class="${n==="1"?"active":""}"><b>${n}</b><small>${label}</small></span>`).join("")}</div>`;
    return `<form id="operationForm" data-id="${op.id || ""}" data-step="1" data-allocation-mode="${mode}" data-allocation-locked="${applied}" novalidate>${nav}
      <section class="operation-step active" data-operation-step="1"><div class="form-grid">
        <div><label>Cliente *</label><input name="client" required value="${esc(op.client || "")}"></div>
        <div class="wide operation-vessel-field"><div class="catalog-linked-heading"><div><label>Embarcação cadastrada *</label><small>O MMSI será usado para abrir diretamente o mapa.</small></div>${canManageVesselRegistry() ? `<button type="button" class="btn small secondary" data-action="open-vessel-registry">Cadastrar embarcação</button>` : ""}</div><select name="vessel_registry_id" required><option value="">Selecione a embarcação</option>${vesselOptions}</select><input type="hidden" name="vessel" value="${esc(matchedVessel?.name || op.vessel || "")}"><small class="field-help" data-operation-vessel-info>${matchedVessel ? `IMO ${esc(matchedVessel.imo || "não informado")} • MMSI ${esc(matchedVessel.mmsi || "não informado")}` : "Cadastre ou selecione a embarcação com MMSI para abrir diretamente o mapa."}</small>${op.vessel && !matchedVessel ? `<div class="message warning"><strong>Embarcação antiga não vinculada:</strong> ${esc(op.vessel)}. Selecione o cadastro correto antes de salvar.</div>` : ""}</div>
        <div><label>Sonda</label><input name="rig" value="${esc(op.rig || "")}" placeholder="Ex.: NS-58"></div>
        <div><label>Poço</label><input name="well" value="${esc(op.well || "")}" placeholder="Ex.: 7-WAH-12D-RJS"></div>
        <div><label>Número do ticket</label><input name="ticket_number" value="${esc(op.ticketNumber || "")}"></div>
        <div><label>Ordem de serviço</label><input name="service_order" value="${esc(op.service_order || "")}"></div>
        <div class="wide"><label>Responsável</label><select name="responsible_id"><option value="">Não definido</option>${responsibleOptions}</select></div>
      </div><div class="operation-step-actions"><span></span><button type="button" class="btn primary" data-action="operation-next-step">Próximo: serviço</button></div></section>
      <section class="operation-step" data-operation-step="2"><div class="form-grid">
        <div><label>Atividade *</label><select name="activity" ${applied?"disabled":""}>${["Bombeio","Backload","Fabricação","Tratamento","Carregamento","Descarga"].map(value => `<option ${activity===value?"selected":""}>${value}</option>`).join("")}</select>${applied?`<input type="hidden" name="activity" value="${esc(activity)}">`:""}</div>
        <div class="wide operation-catalog-field"><div class="catalog-linked-heading"><div><label>Fluido ou granel *</label><small>Produto do catálogo oficial.</small></div>${applied?"":`<button type="button" class="btn small secondary" data-action="open-fluid-catalog">Abrir catálogo</button>`}</div><select name="fluid_type_id" data-operation-product-select required ${applied?"disabled":""}><option value="">Selecione o produto cadastrado</option>${operationCatalogOptions(op)}</select>${applied?`<input type="hidden" name="fluid_type_id" value="${esc(op.fluidTypeId || "")}">`:""}<small class="field-help" data-operation-product-category>${linkedProduct?`${esc(linkedProduct.type)} • unidade ${esc(linkedProduct.unit)}`:"Selecione um produto cadastrado."}</small>${legacyUnlinked?`<div class="message warning"><strong>Produto antigo não vinculado:</strong> ${esc(op.product)}.</div>`:""}</div>
        <div><label>Lote</label><input name="lot" value="${esc(op.lot || "")}" ${applied?"readonly":""}></div>
        <div><label>Unidade</label><input name="unit" value="${esc(unit)}" readonly></div>
        <div><label>Quantidade planejada *</label><input name="planned" type="text" inputmode="decimal" value="${op.planned ?? 0}"></div>
        <div><label>Quantidade executada</label><input name="executed" type="text" inputmode="decimal" value="${op.executed ?? 0}" ${applied?"readonly":""}></div>
      </div><div class="operation-step-actions"><button type="button" class="btn secondary" data-action="operation-prev-step">Voltar</button><button type="button" class="btn primary" data-action="operation-next-step">Próximo: tancagem</button></div></section>
      <section class="operation-step" data-operation-step="3"><div class="form-grid">
        <div class="wide tank-automation-box"><div class="check-line"><input id="applyTankMovement" name="apply_tank_movement" type="checkbox" data-applied="${applied}" ${op.apply_tank_movement||applied?"checked":""} ${applied?"disabled":""}><label for="applyTankMovement">Atualizar a volumetria automaticamente ao concluir</label></div><small id="operationTankHint" class="field-help"></small>${applied?`<div class="info-box">Movimentação aplicada em ${dateTime(op.tank_movement_applied_at)}.</div>`:""}</div>
        <div class="wide operation-allocation-field ${mode==="none"?"hidden":""}"><div class="operation-allocation-heading"><div><strong data-operation-allocation-title>${mode==="out"?"Distribuição da saída":"Distribuição da entrada"}</strong><small>Informe quanto saiu ou entrou em cada equipamento.</small></div>${applied?"":`<button type="button" class="btn small soft" data-add-operation-allocation>+ Adicionar equipamento</button>`}</div><div class="operation-allocation-list" data-operation-allocation-list>${initialRows}</div><div class="operation-allocation-summary" data-operation-allocation-summary></div></div>
      </div><div class="operation-step-actions"><button type="button" class="btn secondary" data-action="operation-prev-step">Voltar</button><button type="button" class="btn primary" data-action="operation-next-step">Próximo: conclusão</button></div></section>
      <section class="operation-step" data-operation-step="4"><div class="form-grid">
        <div><label>Início</label><input name="start_at" type="datetime-local" value="${toLocalInput(op.start_at)}"></div>
        <div><label>Término</label><input name="end_at" type="datetime-local" value="${toLocalInput(op.end_at)}"></div>
        <div><label>Tempo parado (minutos)</label><input name="paused_minutes" type="number" min="0" value="${op.paused_minutes ?? 0}"></div>
        <div><label>Status</label><select name="status">${["Programada","Em andamento","Paralisada","Concluída","Cancelada"].map(value => `<option ${op.status===value?"selected":""}>${value}</option>`).join("")}</select></div>
        <div class="wide"><label>Ocorrência</label><textarea name="occurrence">${esc(op.occurrence || "")}</textarea></div>
        <div class="wide"><label>Observações</label><textarea name="notes">${esc(op.notes || "")}</textarea></div>
        <div class="wide operation-review-card" data-operation-review></div>
        <div class="wide"><label>Documentos ou fotos</label><input name="attachment" type="file" accept=".pdf,image/jpeg,image/png,image/webp,image/heic,image/heif" multiple capture="environment"></div>
        ${hasRole(["supervisor"])?`<div class="wide check-line"><input id="lockOperation" name="locked" type="checkbox" ${op.locked?"checked":""}><label for="lockOperation">Bloquear edição após o encerramento</label></div>`:""}
      </div><div class="operation-step-actions"><button type="button" class="btn secondary" data-action="operation-prev-step">Voltar</button><button class="btn primary">Salvar operação</button></div></section>
    </form>`;
  }


  function vesselLatestPosition(scheduleId) {
    return (state.data.vesselPositions || []).find(item => item.scheduleId === scheduleId) || null;
  }

  function vesselGeofence() {
    return (state.data.vesselGeofences || []).find(item => item.active) || {
      id: "porto-acu-default", name: "Porto do Açu - zona operacional",
      latitude: -21.846944, longitude: -40.997778, radiusNm: 25, alertOnEntry: true, active: true
    };
  }

  function haversineNm(lat1, lon1, lat2, lon2) {
    const values = [lat1, lon1, lat2, lon2].map(Number);
    if (!values.every(Number.isFinite)) return null;
    const [startLat, startLon, endLat, endLon] = values;
    const toRad = value => value * Math.PI / 180;
    const dLat = toRad(endLat - startLat);
    const dLon = toRad(endLon - startLon);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(startLat)) * Math.cos(toRad(endLat)) * Math.sin(dLon / 2) ** 2;
    return 3440.065 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  }

  function vesselDistanceNm(item, position = vesselLatestPosition(item.id)) {
    if (Number.isFinite(item.distanceToPortNm) && item.distanceToPortNm >= 0) return item.distanceToPortNm;
    if (!position) return null;
    const zone = vesselGeofence();
    const distance = haversineNm(position.latitude, position.longitude, zone.latitude, zone.longitude);
    return Number.isFinite(distance) ? distance : null;
  }

  function vesselSignalInfo(item) {
    const position = vesselLatestPosition(item.id);
    if (!item.aisEnabled) return { label: "AIS desativado", tone: "neutral", ageMinutes: null };
    if (!position) return { label: "Aguardando posição", tone: "amber", ageMinutes: null };
    const positionMs = new Date(position.positionTime).getTime();
    if (!Number.isFinite(positionMs)) return { label: "Horário AIS inválido", tone: "red", ageMinutes: null };
    const ageMinutes = Math.max(0, (Date.now() - positionMs) / 60000);
    if (ageMinutes > 120) return { label: `Sinal há ${Math.round(ageMinutes)} min`, tone: "red", ageMinutes };
    if (ageMinutes > 30) return { label: `Atualizado há ${Math.round(ageMinutes)} min`, tone: "amber", ageMinutes };
    return { label: ageMinutes < 2 ? "Posição ao vivo" : `Atualizado há ${Math.round(ageMinutes)} min`, tone: "green", ageMinutes };
  }

  function vesselEtaInfo(item) {
    if (!item.eta) return { label: "Sem ETA", tone: "neutral", hours: null };
    const eta = new Date(item.eta);
    if (!Number.isFinite(eta.getTime())) return { label: "ETA inválido", tone: "red", hours: null };
    const hours = (eta.getTime() - Date.now()) / 3600000;
    if (["Concluída", "Cancelada"].includes(item.status)) return { label: item.status, tone: statusClass(item.status), hours };
    if (["Atracada", "Em operação"].includes(item.status)) return { label: item.status, tone: "green", hours };
    if (hours < 0 || item.status === "Atrasada") return { label: "ETA vencido", tone: "red", hours };
    if (hours <= 24) return { label: `${Math.max(0, Math.round(hours))}h para ETA`, tone: "amber", hours };
    return { label: `${Math.ceil(hours / 24)} dia(s)`, tone: "blue", hours };
  }

  function filteredVessels() {
    const filters = state.vesselFilters || {};
    const query = String(filters.query || "").trim().toLowerCase();
    const days = Number(filters.window || 0);
    const now = Date.now();
    const start = days > 0 ? now - 24 * 3600000 : null;
    const limit = days > 0 ? now + days * 86400000 : null;
    const alwaysVisibleStatuses = new Set(["Atracada", "Em operação", "Aguardando berço", "Em aproximação", "Atrasada"]);
    return [...(state.data.vessels || [])]
      .filter(item => !query || [item.vesselName, item.imo, item.mmsi, item.client, item.berth, item.operationType, item.product, item.destination].some(value => String(value || "").toLowerCase().includes(query)))
      .filter(item => !filters.client || item.client === filters.client)
      .filter(item => !filters.status || item.status === filters.status)
      .filter(item => {
        if (!limit) return true;
        if (alwaysVisibleStatuses.has(item.status)) return true;
        if (!item.eta) return false;
        const etaMs = new Date(item.eta).getTime();
        return Number.isFinite(etaMs) && etaMs >= start && etaMs <= limit;
      })
      .sort((a, b) => {
        const aTime = new Date(a.eta || "2999-12-31").getTime();
        const bTime = new Date(b.eta || "2999-12-31").getTime();
        return (Number.isFinite(aTime) ? aTime : Infinity) - (Number.isFinite(bTime) ? bTime : Infinity);
      });
  }

  function scheduleVesselFilterRender(target = null) {
    clearTimeout(state.vesselMap.filterTimer);
    const filterName = target?.dataset?.vesselFilter || "query";
    const selectionStart = target?.selectionStart ?? null;
    const selectionEnd = target?.selectionEnd ?? null;
    state.vesselMap.filterTimer = setTimeout(() => {
      renderVessels();
      const next = document.querySelector(`[data-vessel-filter="${filterName}"]`);
      if (next && filterName === "query") {
        next.focus({ preventScroll: true });
        if (selectionStart !== null && typeof next.setSelectionRange === "function") {
          next.setSelectionRange(selectionStart, selectionEnd ?? selectionStart);
        }
      }
    }, filterName === "query" ? 220 : 0);
  }

  function scheduleVesselMapInit(delay = 80) {
    clearTimeout(state.vesselMap.timer);
    state.vesselMap.timer = setTimeout(() => {
      state.vesselMap.timer = null;
      initVesselMap();
    }, delay);
  }

  function vesselPositionSummary(item) {
    const position = vesselLatestPosition(item.id);
    if (!position) return item.aisEnabled ? "Aguardando posição" : "AIS desativado";
    const speed = Number.isFinite(position.speedKnots) ? `${fmt.format(position.speedKnots)} kn` : "Velocidade indisponível";
    const distance = vesselDistanceNm(item, position);
    const when = Number.isFinite(new Date(position.positionTime).getTime()) ? dateTime(position.positionTime) : "horário inválido";
    return `${speed}${distance === null ? "" : ` • ${fmt.format(distance)} mn`} • ${when}`;
  }

  function vesselAlertTone(severity = "") {
    const value = String(severity).toLowerCase();
    if (value.includes("crítica") || value.includes("critica")) return "red";
    if (value.includes("alta")) return "amber";
    if (value.includes("média") || value.includes("media")) return "blue";
    return "neutral";
  }

  function vesselMapFallback() {
    const container = $("#vesselAisMap");
    if (!container) return;
    const positions = state.data.vesselPositions || [];
    container.innerHTML = `<div class="vessel-map-fallback"><strong>Mapa indisponível neste momento</strong><span>${positions.length ? `${positions.length} posição(ões) continuam disponíveis na lista.` : "Cadastre uma posição manual ou sincronize o AIS."}</span></div>`;
  }

  function initVesselMap() {
    clearTimeout(state.vesselMap.timer);
    state.vesselMap.timer = null;
    const container = $("#vesselAisMap");
    if (!container || state.page !== "vessels") return;
    if (!window.L) return vesselMapFallback();
    if (state.vesselMap.instance) {
      try { state.vesselMap.instance.remove(); } catch (_) {}
      state.vesselMap.instance = null;
      state.vesselMap.markers = new Map();
    }
    const zone = vesselGeofence();
    let map;
    try {
      map = window.L.map(container, { zoomControl: true, attributionControl: true }).setView([zone.latitude, zone.longitude], 8);
    } catch (error) {
      console.warn("Falha ao iniciar mapa AIS:", error);
      return vesselMapFallback();
    }
    state.vesselMap.instance = map;
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap"
    }
```

### `resolveLoginEmail(identifier)`

- Linhas: `1398-1405`
- Assíncrona: `sim`
- Dependências internas chamadas: nenhuma

```js
  async function resolveLoginEmail(identifier) {
    const normalized = String(identifier || "").trim();
    if (normalized.includes("@")) return normalized.toLowerCase();
    const { data, error } = await state.client.rpc("resolve_login_email", { p_identifier: normalized });
    if (error || !data) throw new Error("Credenciais inválidas.");
    return String(data).trim().toLowerCase();
  }
```

### `openPasswordRecovery()`

- Linhas: `1406-1412`
- Assíncrona: `não`
- Dependências internas chamadas: `formActions`, `openModal`

```js
  function openPasswordRecovery() {
    openModal("Definir nova senha", `<form id="passwordRecoveryForm"><div class="form-grid">
      <div class="wide"><label for="recoveryNewPassword">Nova senha *</label><input id="recoveryNewPassword" name="new_password" type="password" minlength="8" autocomplete="new-password" required></div>
      <div class="wide"><label for="recoveryConfirmPassword">Confirmar nova senha *</label><input id="recoveryConfirmPassword" name="confirm_password" type="password" minlength="8" autocomplete="new-password" required></div>
    </div><div class="info-box" style="margin-top:12px">Use pelo menos 8 caracteres. Após a alteração, entre novamente com a nova senha.</div>${formActions("Atualizar senha")}</form>`, "RECUPERAÇÃO DE ACESSO");
  }
```

### `requestPasswordRecovery()`

- Linhas: `1413-1432`
- Assíncrona: `sim`
- Dependências internas chamadas: `clearLoginMessage`, `resolveLoginEmail`, `showLoginMessage`

```js
  async function requestPasswordRecovery() {
    const identifier = $("#loginEmail").value.trim();
    if (!identifier) return showLoginMessage("Informe seu e-mail ou usuário para recuperar a senha.");
    const button = $("#forgotPasswordBtn");
    button.disabled = true;
    clearLoginMessage();
    try {
      await initClient($("#rememberLogin")?.checked !== false);
      const email = await resolveLoginEmail(identifier);
      const redirectTo = `${location.origin}${location.pathname}`;
      const { error } = await state.client.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      showLoginMessage("Se o acesso estiver cadastrado, enviaremos as instruções de recuperação por e-mail.", "success");
    } catch (_) {
      showLoginMessage("Se o acesso estiver cadastrado, enviaremos as instruções de recuperação por e-mail.", "success");
    } finally {
      button.disabled = false;
    }
  }
```

### `login()`

- Linhas: `1433-1461`
- Assíncrona: `sim`
- Dependências internas chamadas: `clearLoginMessage`, `loadData`, `openApp`, `resolveLoginEmail`, `setLoginLoading`, `showLoginMessage`

```js
  async function login() {
    const identifier = $("#loginEmail").value.trim();
    const password = $("#loginPassword").value;
    if (!identifier || !password) return showLoginMessage("Preencha e-mail ou usuário e senha.");

    const remember = $("#rememberLogin")?.checked !== false;
    localStorage.setItem(REMEMBER_LOGIN_KEY, String(remember));
    clearLoginMessage();
    setLoginLoading(true);
    try {
      await initClient(remember);
      const email = await resolveLoginEmail(identifier);
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
      const blocked = String(error?.message || "").includes("bloqueado");
      showLoginMessage(blocked ? error.message : "Não foi possível entrar. Verifique suas credenciais e tente novamente.");
    } finally {
      setLoginLoading(false);
    }
  }
```

### `restoreSession()`

- Linhas: `1462-1478`
- Assíncrona: `sim`
- Dependências internas chamadas: `loadData`, `openApp`

```js
  async function restoreSession() {
    try {
      await initClient(localStorage.getItem(REMEMBER_LOGIN_KEY) !== "false");
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
```

### `logout()`

- Linhas: `1985-1993`
- Assíncrona: `sim`
- Dependências internas chamadas: `stopTvMode`

```js
  async function logout() {
    clearTimeout(state.refreshDebounce);
    clearInterval(state.refreshTimer);
    stopTvMode();
    if (state.realtime) await state.client.removeChannel(state.realtime);
    await state.client.auth.signOut();
    location.reload();
  }
```

### `refreshRealtime(source = "tempo real", showToast = false)`

- Linhas: `2058-2085`
- Assíncrona: `sim`
- Dependências internas chamadas: `loadData`, `renderAll`, `toast`, `updateConnectionBadge`

```js
  async function refreshRealtime(source = "tempo real", showToast = false) {
    if (state.refreshing || !navigator.onLine) return false;
    state.refreshing = true;
    state.lastRefreshError = null;
    updateConnectionBadge();

    try {
      await loadData();
      if (state.data.profile.active === false) {
        await state.client.auth.signOut();
        location.reload();
        return false;
      }
      renderAll();
      updateConnectionBadge();
      if (showToast) toast(`Dashboard atualizado às ${state.lastSync.toLocaleTimeString("pt-BR")}.`, "success");
      return true;
    } catch (error) {
      state.lastRefreshError = error;
      console.error(`Atualização (${source}):`, error);
      updateConnectionBadge();
      if (showToast) toast(`Falha ao atualizar: ${error.message}`, "error");
      return false;
    } finally {
      state.refreshing = false;
    }
  }
```

### `tankClientSuggestions(current = "")`

- Linhas: `4091-4100`
- Assíncrona: `não`
- Dependências internas chamadas: nenhuma

```js
  function tankClientSuggestions(current = "") {
    return [...new Set([
      "A definir", "Petrobras", "PRIO", "Equinor", "Shell", "TotalEnergies", "Petronas", "Trident Energy",
      current,
      ...(state.data?.operations || []).map(item => item.client),
      ...(state.data?.tanks || []).map(item => item.client)
    ].map(value => String(value || "").trim()).filter(Boolean))]
      .sort((a,b) => a.localeCompare(b, "pt-BR"));
  }
```

### `clientTicketDocuments(ticketId)`

- Linhas: `4760-4763`
- Assíncrona: `não`
- Dependências internas chamadas: nenhuma

```js
  function clientTicketDocuments(ticketId) {
    return (state.data?.clientTicketDocuments || []).filter(item => item.ticketId === ticketId);
  }
```

### `clientTicketMetrics(ticket)`

- Linhas: `4764-4774`
- Assíncrona: `não`
- Dependências internas chamadas: `clientTicketDocuments`

```js
  function clientTicketMetrics(ticket) {
    const required = [...new Set((ticket.requiredTypes || CLIENT_TICKET_DOCUMENT_TYPES).filter(type => CLIENT_TICKET_DOCUMENT_TYPES.includes(type)))];
    const documents = clientTicketDocuments(ticket.id).filter(item => item.status !== "Substituído");
    const present = new Set(documents.map(item => item.documentType));
    const complete = required.filter(type => present.has(type)).length;
    const missing = required.filter(type => !present.has(type));
    const total = required.length;
    const percent = total ? Math.round(complete / total * 100) : 100;
    return { required, documents, present, complete, missing, total, percent, ready: missing.length === 0 };
  }
```

### `filteredClientTickets()`

- Linhas: `4775-4790`
- Assíncrona: `não`
- Dependências internas chamadas: `clientTicketMetrics`

```js
  function filteredClientTickets() {
    const filters = state.clientTicketFilters || {};
    const query = normalizeSearch(filters.query || "");
    return (state.data?.clientTickets || []).filter(ticket => {
      const metrics = clientTicketMetrics(ticket);
      const docs = metrics.documents.map(item => `${item.documentType} ${item.documentNumber} ${item.fileName}`).join(" ");
      const search = normalizeSearch(`${ticket.ticketNumber} ${ticket.client} ${ticket.title} ${ticket.vessel} ${ticket.serviceOrder} ${ticket.responsible} ${ticket.status} ${ticket.notes} ${docs}`);
      if (query && !search.includes(query)) return false;
      if (filters.client && ticket.client !== filters.client) return false;
      if (filters.status && ticket.status !== filters.status) return false;
      if (filters.completeness === "complete" && !metrics.ready) return false;
      if (filters.completeness === "pending" && metrics.ready) return false;
      return true;
    });
  }
```

### `clientTicketFilterActiveCount()`

- Linhas: `4791-4794`
- Assíncrona: `não`
- Dependências internas chamadas: nenhuma

```js
  function clientTicketFilterActiveCount() {
    return Object.values(state.clientTicketFilters || {}).filter(Boolean).length;
  }
```

### `scheduleClientTicketFilterRender(field)`

- Linhas: `4795-4808`
- Assíncrona: `não`
- Dependências internas chamadas: `renderClientTickets`

```js
  function scheduleClientTicketFilterRender(field) {
    clearTimeout(state.clientTicketFilterTimer);
    const key = field.dataset.clientTicketFilter;
    const cursor = typeof field.selectionStart === "number" ? field.selectionStart : null;
    state.clientTicketFilterTimer = setTimeout(() => {
      renderClientTickets();
      const replacement = document.querySelector(`#page-client-tickets [data-client-ticket-filter="${key}"]`);
      if (replacement) {
        replacement.focus();
        if (cursor !== null && typeof replacement.setSelectionRange === "function") replacement.setSelectionRange(cursor, cursor);
      }
    }, 180);
  }
```

### `clientTicketDocumentChip(ticket, type)`

- Linhas: `4809-4817`
- Assíncrona: `não`
- Dependências internas chamadas: `clientTicketDocuments`

```js
  function clientTicketDocumentChip(ticket, type) {
    const docs = clientTicketDocuments(ticket.id).filter(item => item.documentType === type && item.status !== "Substituído");
    const required = (ticket.requiredTypes || []).includes(type);
    const present = docs.length > 0;
    const className = present ? "present" : required ? "missing" : "optional";
    const label = present ? `${type} • ${docs.length}` : required ? `${type} pendente` : `${type} opcional`;
    return `<span class="client-ticket-doc-chip ${className}">${present ? uiIcon("check") : uiIcon("file")} ${esc(label)}</span>`;
  }
```

### `clientTicketStatusTone(ticket)`

- Linhas: `4818-4825`
- Assíncrona: `não`
- Dependências internas chamadas: `clientTicketMetrics`

```js
  function clientTicketStatusTone(ticket) {
    const metrics = clientTicketMetrics(ticket);
    if (["Cancelado", "Arquivado"].includes(ticket.status)) return "neutral";
    if (["Concluído", "Enviado"].includes(ticket.status) || metrics.ready) return "green";
    if (ticket.status === "Em revisão") return "blue";
    return "amber";
  }
```

### `renderClientTickets()`

- Linhas: `4826-4860`
- Assíncrona: `não`
- Dependências internas chamadas: `badge`, `canManageClientTickets`, `clientTicketDocumentChip`, `clientTicketFilterActiveCount`, `clientTicketMetrics`, `clientTicketStatusTone`, `filteredClientTickets`, `header`, `statCard`

```js
  function renderClientTickets() {
    const all = state.data?.clientTickets || [];
    const tickets = filteredClientTickets();
    const clients = [...new Set(all.map(item => item.client).filter(Boolean))].sort((a,b) => a.localeCompare(b));
    const statuses = [...new Set(all.map(item => item.status).filter(Boolean))].sort((a,b) => a.localeCompare(b));
    const totalDocs = (state.data?.clientTicketDocuments || []).length;
    const ready = all.filter(ticket => clientTicketMetrics(ticket).ready).length;
    const pending = all.length - ready;
    const sent = all.filter(ticket => ["Enviado","Arquivado"].includes(ticket.status)).length;
    const actions = `<button class="btn secondary" data-export="client-tickets">Exportar CSV</button>${canManageClientTickets() ? `<button class="btn primary" data-action="new-client-ticket">+ Novo ticket</button>` : ""}`;

    const cards = tickets.map(ticket => {
      const metrics = clientTicketMetrics(ticket);
      return `<article class="card client-ticket-card tone-${clientTicketStatusTone(ticket)}">
        <div class="client-ticket-card-head"><div><small>${esc(ticket.ticketNumber)}</small><h3>${esc(ticket.client)}</h3><p>${esc(ticket.title)}</p></div>${badge(ticket.status)}</div>
        <div class="client-ticket-context"><span>Data<strong>${dateOnly(ticket.date)}</strong></span><span>Embarcação<strong>${esc(ticket.vessel || "-")}</strong></span><span>OS<strong>${esc(ticket.serviceOrder || "-")}</strong></span><span>Responsável<strong>${esc(ticket.responsible || "-")}</strong></span></div>
        <div class="client-ticket-progress"><div><span>Documentação</span><strong>${metrics.complete}/${metrics.total}</strong></div><div class="client-ticket-progress-bar"><i style="width:${metrics.percent}%"></i></div><small>${metrics.ready ? "Pacote documental completo" : `Pendentes: ${esc(metrics.missing.join(", "))}`}</small></div>
        <div class="client-ticket-doc-chips">${CLIENT_TICKET_DOCUMENT_TYPES.map(type => clientTicketDocumentChip(ticket,type)).join("")}</div>
        <div class="row-actions"><button class="btn small secondary" data-view-client-ticket="${ticket.id}">Abrir documentos</button>${canManageClientTickets() ? `<button class="btn small primary" data-edit-client-ticket="${ticket.id}">Editar ticket</button>` : ""}</div>
      </article>`;
    }).join("");

    $("#page-client-tickets").innerHTML = header("Tickets de Clientes", "Organize FDT, FRT, MDT e MRT por cliente, operação ou embarcação.", actions) +
      `<section class="client-ticket-kpis">${statCard("Tickets", fmt.format(all.length), "pacotes documentais", uiIcon("file"), "Todos os clientes", "blue")}${statCard("Completos", fmt.format(ready), "sem documentos pendentes", uiIcon("check"), "Prontos para revisão/envio", "green")}${statCard("Pendentes", fmt.format(pending), "com documento faltando", uiIcon("alert"), "Exigem acompanhamento", "orange")}${statCard("Arquivos", fmt.format(totalDocs), "FDT, FRT, MDT e MRT", uiIcon("paperclip"), `${sent} ticket(s) enviados`, "purple")}</section>
      <section class="card client-ticket-filter-panel"><div class="client-ticket-filter-heading"><div><small>LOCALIZAÇÃO</small><h3>Pesquisar tickets e documentos</h3><p>Busque por cliente, ticket, embarcação, OS, tipo ou nome do arquivo.</p></div>${clientTicketFilterActiveCount() ? `<span>${clientTicketFilterActiveCount()} filtro(s)</span>` : ""}</div><div class="client-ticket-filter-grid">
        <div class="wide"><label>Busca geral</label><input data-client-ticket-filter="query" value="${esc(state.clientTicketFilters.query || "")}" placeholder="Ex.: Equinor, FDT, embarcação ou número do ticket"></div>
        <div><label>Cliente</label><select data-client-ticket-filter="client"><option value="">Todos</option>${clients.map(value => `<option value="${esc(value)}" ${state.clientTicketFilters.client===value?"selected":""}>${esc(value)}</option>`).join("")}</select></div>
        <div><label>Status</label><select data-client-ticket-filter="status"><option value="">Todos</option>${statuses.map(value => `<option value="${esc(value)}" ${state.clientTicketFilters.status===value?"selected":""}>${esc(value)}</option>`).join("")}</select></div>
        <div><label>Documentação</label><select data-client-ticket-filter="completeness"><option value="">Todos</option><option value="complete" ${state.clientTicketFilters.completeness==="complete"?"selected":""}>Completa</option><option value="pending" ${state.clientTicketFilters.completeness==="pending"?"selected":""}>Pendente</option></select></div>
        <div class="client-ticket-filter-action"><button class="btn secondary full" data-action="clear-client-ticket-filters">Limpar filtros</button></div>
      </div></section>
      <div class="section-title professional-record-title"><span>Pacotes documentais</span><small>${tickets.length} ticket(s) no filtro</small></div>
      <section class="client-ticket-grid">${cards || `<div class="card empty">Nenhum ticket de cliente encontrado.</div>`}</section>`;
  }
```

### `clientTicketForm(ticket = {})`

- Linhas: `4861-4862`
- Assíncrona: `não`
- Dependências internas chamadas: nenhuma

```js
  function clientTicketForm(ticket = {}
```

### `clientTicketDocumentUploadForm(ticket, preferredType = "")`

- Linhas: `4880-4893`
- Assíncrona: `não`
- Dependências internas chamadas: `clientTicketMetrics`, `formActions`

```js
  function clientTicketDocumentUploadForm(ticket, preferredType = "") {
    const missing = clientTicketMetrics(ticket).missing;
    const selected = preferredType || missing[0] || ticket.requiredTypes?.[0] || "FDT";
    return `<form id="clientTicketDocumentForm" data-ticket-id="${ticket.id}"><div class="form-grid">
      <div><label>Tipo do documento *</label><select name="document_type" required>${CLIENT_TICKET_DOCUMENT_TYPES.map(type => `<option ${type===selected?"selected":""}>${type}</option>`).join("")}</select></div>
      <div><label>Status</label><select name="status">${["Anexado","Em revisão","Aprovado"].map(value => `<option>${value}</option>`).join("")}</select></div>
      <div><label>Número do documento</label><input name="document_number" placeholder="Ex.: FDT-00125"></div>
      <div><label>Data do documento</label><input name="document_date" type="date" value="${localDateKey()}"></div>
      <div><label>Revisão</label><input name="revision" placeholder="Ex.: Rev. 0"></div>
      <div class="wide"><label>Arquivo *</label><input name="document_file" type="file" accept=".pdf,image/jpeg,image/png,image/webp,image/heic,image/heif" required><small class="field-help">PDF ou imagem, com no máximo 20 MB.</small></div>
      <div class="wide"><label>Observações</label><textarea name="notes"></textarea></div>
    </div>${formActions("Anexar documento")}</form>`;
  }
```

### `clientTicketDocumentEditForm(document)`

- Linhas: `4894-4905`
- Assíncrona: `não`
- Dependências internas chamadas: `formActions`

```js
  function clientTicketDocumentEditForm(document) {
    return `<form id="clientTicketDocumentEditForm" data-id="${document.id}" data-ticket-id="${document.ticketId}"><div class="form-grid">
      <div><label>Tipo *</label><select name="document_type">${CLIENT_TICKET_DOCUMENT_TYPES.map(type => `<option ${type===document.documentType?"selected":""}>${type}</option>`).join("")}</select></div>
      <div><label>Status</label><select name="status">${["Anexado","Em revisão","Aprovado","Substituído"].map(value => `<option ${value===document.status?"selected":""}>${value}</option>`).join("")}</select></div>
      <div><label>Número</label><input name="document_number" value="${esc(document.documentNumber || "")}"></div>
      <div><label>Data</label><input name="document_date" type="date" value="${String(document.documentDate || "").slice(0,10)}"></div>
      <div><label>Revisão</label><input name="revision" value="${esc(document.revision || "")}"></div>
      <div class="wide"><label>Arquivo</label><input value="${esc(document.fileName)}" disabled></div>
      <div class="wide"><label>Observações</label><textarea name="notes">${esc(document.notes || "")}</textarea></div>
    </div>${formActions("Salvar documento")}</form>`;
  }
```

### `clientTicketDetails(ticket)`

- Linhas: `4906-4920`
- Assíncrona: `não`
- Dependências internas chamadas: `badge`, `canDeleteClientTickets`, `canManageClientTickets`, `clientTicketDocumentChip`, `clientTicketDocumentUploadForm`, `clientTicketDocuments`, `clientTicketMetrics`

```js
  function clientTicketDetails(ticket) {
    const metrics = clientTicketMetrics(ticket);
    const documents = clientTicketDocuments(ticket.id);
    const rows = documents.map(document => {
      const uploader = state.data.users.find(user => user.id === document.uploadedBy)?.name || "Usuário";
      const canDelete = canDeleteClientTickets() || document.uploadedBy === state.user.id;
      return `<article class="client-ticket-document-row status-${normalizeSearch(document.status)}"><span class="client-ticket-document-type">${esc(document.documentType)}</span><div class="client-ticket-document-info"><strong>${esc(document.fileName)}</strong><small>${document.documentNumber ? `Nº ${esc(document.documentNumber)} • ` : ""}${document.documentDate ? `${dateOnly(document.documentDate)} • ` : ""}${document.revision ? `${esc(document.revision)} • ` : ""}${esc(document.status)}</small><small>Enviado por ${esc(uploader)} em ${dateTime(document.createdAt)}</small>${document.notes ? `<p>${esc(document.notes)}</p>` : ""}</div><div class="row-actions"><button class="btn small secondary" data-open-client-ticket-document="${document.id}">Visualizar</button>${canManageClientTickets()?`<button class="btn small secondary" data-edit-client-ticket-document="${document.id}">Editar</button>`:""}${canDelete?`<button class="btn small danger outline" data-delete-client-ticket-document="${document.id}">Excluir</button>`:""}</div></article>`;
    }).join("");
    return `<div class="client-ticket-detail-head"><div><small>${esc(ticket.ticketNumber)}</small><h3>${esc(ticket.client)} — ${esc(ticket.title)}</h3><p>${dateOnly(ticket.date)}${ticket.vessel?` • ${esc(ticket.vessel)}`:""}${ticket.serviceOrder?` • OS ${esc(ticket.serviceOrder)}`:""}</p></div>${badge(ticket.status)}</div>
      <div class="client-ticket-detail-progress"><div><strong>${metrics.complete}/${metrics.total} documentos obrigatórios</strong><span>${metrics.percent}%</span></div><div class="client-ticket-progress-bar"><i style="width:${metrics.percent}%"></i></div><div class="client-ticket-doc-chips">${CLIENT_TICKET_DOCUMENT_TYPES.map(type => clientTicketDocumentChip(ticket,type)).join("")}</div></div>
      ${ticket.notes ? `<div class="info-box">${esc(ticket.notes)}</div>` : ""}
      ${canManageClientTickets() ? `<div class="client-ticket-upload-panel"><div class="professional-section-heading"><div><small>NOVO ARQUIVO</small><h3>Anexar FDT, FRT, MDT ou MRT</h3></div></div>${clientTicketDocumentUploadForm(ticket)}</div>` : ""}
      <div class="section-title"><span>Documentos anexados</span><small>${documents.length} arquivo(s)</small></div><div class="client-ticket-document-list">${rows || `<div class="empty">Nenhum documento anexado.</div>`}</div>`;
  }
```

### `saveClientTicket(payload, id = null, requiredTypes = [])`

- Linhas: `4921-4939`
- Assíncrona: `sim`
- Dependências internas chamadas: `canManageClientTickets`

```js
  async function saveClientTicket(payload, id = null, requiredTypes = []) {
    if (!canManageClientTickets()) throw new Error("Seu perfil não pode alterar tickets de clientes.");
    if (!requiredTypes.length) throw new Error("Selecione pelo menos um documento obrigatório.");
    const row = {
      client:String(payload.client || "").trim(), title:String(payload.title || "").trim(),
      ticket_date:payload.ticket_date, operation_id:payload.operation_id || null,
      vessel:String(payload.vessel || "").trim() || null, service_order:String(payload.service_order || "").trim() || null,
      responsible:String(payload.responsible || "").trim() || null, status:payload.status || "Em montagem",
      required_document_types:requiredTypes, notes:String(payload.notes || "").trim() || null
    };
    if (!row.client) throw new Error("Informe o cliente.");
    const query = id
      ? state.client.from("client_document_tickets").update(row).eq("id",id).select("id,ticket_number").single()
      : state.client.from("client_document_tickets").insert({...row,created_by:state.user.id}).select("id,ticket_number").single();
    const {data,error} = await query;
    if (error) throw error;
    return data;
  }
```

### `uploadClientTicketDocument(form)`

- Linhas: `4940-4969`
- Assíncrona: `sim`
- Dependências internas chamadas: `canManageClientTickets`, `clientTicketDocuments`, `safeFileName`

```js
  async function uploadClientTicketDocument(form) {
    if (!canManageClientTickets()) throw new Error("Seu perfil não pode anexar documentos.");
    const payload = Object.fromEntries(new FormData(form));
    const file = form.elements.document_file?.files?.[0];
    if (!file) throw new Error("Selecione o arquivo.");
    const allowed = ["application/pdf","image/jpeg","image/png","image/webp","image/heic","image/heif"];
    if (!allowed.includes(file.type)) throw new Error("Formato não permitido. Use PDF ou imagem.");
    if (file.size > 20 * 1024 * 1024) throw new Error("O arquivo ultrapassa 20 MB.");
    const ticketId = form.dataset.ticketId;
    const path = `client-tickets/${ticketId}/${payload.document_type}/${Date.now()}-${uid("document")}-${safeFileName(file.name)}`;
    const {error:uploadError} = await state.client.storage.from("opscontrol-files").upload(path,file,{contentType:file.type,upsert:false});
    if (uploadError) throw uploadError;
    const {error:metaError} = await state.client.from("client_ticket_documents").insert({
      ticket_id:ticketId, document_type:payload.document_type, document_number:String(payload.document_number||"").trim()||null,
      document_date:payload.document_date||null, revision:String(payload.revision||"").trim()||null,
      status:payload.status||"Anexado", file_name:file.name, file_path:path, mime_type:file.type,
      file_size:file.size, notes:String(payload.notes||"").trim()||null, uploaded_by:state.user.id
    });
    if (metaError) {
      await state.client.storage.from("opscontrol-files").remove([path]);
      throw metaError;
    }
    const ticket = state.data.clientTickets.find(item => item.id === ticketId);
    if (ticket && ["Aberto","Em montagem"].includes(ticket.status)) {
      const futurePresent = new Set([...clientTicketDocuments(ticketId).filter(item=>item.status!=="Substituído").map(item=>item.documentType),payload.document_type]);
      const complete = (ticket.requiredTypes || []).every(type => futurePresent.has(type));
      if (complete) await state.client.from("client_document_tickets").update({status:"Em revisão"}).eq("id",ticketId);
    }
  }
```

### `openClientTicketDocument(documentId)`

- Linhas: `4970-4977`
- Assíncrona: `sim`
- Dependências internas chamadas: `toast`

```js
  async function openClientTicketDocument(documentId) {
    const document = state.data.clientTicketDocuments.find(item => item.id === documentId);
    if (!document) return toast("Documento não localizado.","error");
    const {data,error} = await state.client.storage.from("opscontrol-files").createSignedUrl(document.filePath,3600);
    if (error) return toast(error.message,"error");
    window.open(data.signedUrl,"_blank","noopener,noreferrer");
  }
```

### `profilePasswordForm()`

- Linhas: `5760-5768`
- Assíncrona: `não`
- Dependências internas chamadas: `formActions`

```js
  function profilePasswordForm() {
    return `<form id="profilePasswordForm" novalidate><div class="form-grid">
      <div class="wide"><label>Senha atual *</label><input name="current_password" type="password" autocomplete="current-password" required></div>
      <div><label>Nova senha *</label><input name="new_password" type="password" autocomplete="new-password" minlength="8" required></div>
      <div><label>Confirmar nova senha *</label><input name="confirm_password" type="password" autocomplete="new-password" minlength="8" required></div>
      <div class="wide info-box"><strong>Segurança da conta</strong><br>A nova senha precisa ter pelo menos 8 caracteres. A senha atual será confirmada antes da alteração.</div>
    </div>${formActions("Alterar senha")}</form>`;
  }
```

## Referências diretas fora das funções selecionadas

- Linha `14`: `const APP_ENV_KEY = "opscontrol_environment";`
- Linha `15`: `const REMEMBER_LOGIN_KEY = "opscontrol_remember_login";`
- Linha `64`: `const environment = localStorage.getItem(APP_ENV_KEY) || CONFIG.defaultEnvironment || "production";`
- Linha `1369`: `async function initClient(remember = localStorage.getItem(REMEMBER_LOGIN_KEY) !== "false") {`
- Linha `1378`: `state.client = window.supabase.createClient(state.config.url, state.config.key, {`
- Linha `1390`: `state.client.auth.onAuthStateChange(event => {`
- Linha `1424`: `const { error } = await state.client.auth.resetPasswordForEmail(email, { redirectTo });`
- Linha `1440`: `localStorage.setItem(REMEMBER_LOGIN_KEY, String(remember));`
- Linha `1446`: `const { data, error } = await state.client.auth.signInWithPassword({ email, password });`
- Linha `1451`: `await state.client.auth.signOut();`
- Linha `1465`: `await initClient(localStorage.getItem(REMEMBER_LOGIN_KEY) !== "false");`
- Linha `1466`: `const { data } = await state.client.auth.getSession();`
- Linha `1471`: `await state.client.auth.signOut();`
- Linha `1991`: `await state.client.auth.signOut();`
- Linha `2068`: `await state.client.auth.signOut();`
- Linha `6569`: `await initClient(localStorage.getItem(REMEMBER_LOGIN_KEY) !== "false");`
- Linha `6570`: `const { error } = await state.client.auth.updateUser({ password });`
- Linha `6572`: `await state.client.auth.signOut();`
- Linha `6605`: `const { data: authData, error: authError } = await state.client.auth.signInWithPassword({`
- Linha `6611`: `const { error: passwordError } = await state.client.auth.updateUser({ password: newPassword });`
- Linha `6635`: `await state.client.auth.updateUser({ data: { avatar_url: publicUrl } });`
- Linha `6744`: `const tempClient = window.supabase.createClient(state.config.url, state.config.key, {`
- Linha `6747`: `const { data, error } = await tempClient.auth.signUp({`
- Linha `7184`: `localStorage.setItem(APP_ENV_KEY,environment);`
- Linha `8042`: `$("#rememberLogin").checked = localStorage.getItem(REMEMBER_LOGIN_KEY) !== "false";`
