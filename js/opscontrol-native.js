(() => {
  "use strict";

  const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
  const integer = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
  const compactDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  let currentContext = null;
  let selectedAlertId = "";
  let vesselWeekOffset = 0;

  const esc = (value = "") => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  const arr = value => Array.isArray(value) ? value : [];
  const finite = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const sum = (items, field) => items.reduce((total, item) => total + finite(typeof field === "function" ? field(item) : item?.[field]), 0);
  const pct = (value, capacity) => capacity > 0 ? Math.max(0, Math.min(100, finite(value) / finite(capacity) * 100)) : 0;
  const svg = name => `<svg class="native-icon" aria-hidden="true"><use href="#i-${esc(name)}"></use></svg>`;
  const isoTime = value => {
    const date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime()) ? compactDate.format(date) : "—";
  };
  const dateOnly = value => {
    if (!value) return "—";
    const date = new Date(String(value).length === 10 ? `${value}T12:00:00` : value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("pt-BR");
  };
  const timeOnly = value => {
    const date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime()) ? date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—";
  };
  const relative = value => {
    if (!value) return "Sem atualização";
    const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
    if (!Number.isFinite(minutes)) return "Sem atualização";
    if (minutes < 1) return "agora";
    if (minutes < 60) return `há ${minutes} min`;
    if (minutes < 1440) return `há ${Math.round(minutes / 60)} h`;
    return `há ${Math.round(minutes / 1440)} d`;
  };
  const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const isActive = value => ["andamento", "bombeando", "operacao", "em descarga", "ativo"].some(term => normalize(value).includes(term));
  const isCritical = value => ["crit", "urgent", "alta", "vencid", "indispon", "fora de servico", "bloque"].some(term => normalize(value).includes(term));
  const isWarning = value => ["alert", "atenc", "medio", "alta", "aguard", "manutenc", "pendente"].some(term => normalize(value).includes(term));
  const tone = value => isCritical(value) ? "danger" : isWarning(value) ? "warning" : ["conclu", "confirm", "dispon", "livre", "operacional", "ativo", "realizado", "valido"].some(term => normalize(value).includes(term)) ? "success" : "info";
  const badge = (label, variant = tone(label)) => `<span class="native-badge ${variant}"><i></i>${esc(label || "Não informado")}</span>`;
  const empty = (title, detail = "Nenhum registro encontrado no Supabase.") => `<div class="native-empty">${svg("package")}<strong>${esc(title)}</strong><span>${esc(detail)}</span></div>`;
  const page = (id, html) => { const target = document.getElementById(`page-${id}`); if (target) target.innerHTML = html; };
  const actionButton = (label, action, variant = "primary", icon = "") => `<button class="btn ${variant}" type="button" ${action.startsWith("page:") ? `data-page-link="${esc(action.slice(5))}"` : `data-action="${esc(action)}"`}>${icon ? svg(icon) : ""}<span>${esc(label)}</span></button>`;
  const header = (title, subtitle, actions = "") => `<header class="native-page-header"><div><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div>${actions ? `<div class="native-page-actions">${actions}</div>` : ""}</header>`;
  const data = () => currentContext?.state?.data || {};
  const profileName = id => arr(data().users).find(user => user.id === id)?.name || "Sistema";
  const tankById = id => arr(data().tanks).find(item => item.id === id);
  const activeOperation = () => arr(data().operations).find(item => isActive(item.status)) || arr(data().operations).slice().sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))[0] || null;
  const criticalAlerts = () => [...arr(data().systemAlerts), ...arr(data().alerts)].filter(item => isCritical(item.level || item.severity || item.status)).filter((item, index, all) => all.findIndex(other => String(other.id || other.title) === String(item.id || item.title)) === index);
  const allAlerts = () => [...arr(data().systemAlerts), ...arr(data().alerts)].filter((item, index, all) => all.findIndex(other => String(other.id || other.title) === String(item.id || item.title)) === index).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  function operationProgress(operation) {
    return pct(operation?.executed, operation?.planned);
  }

  function operationRoute(operation) {
    const allocations = arr(data().operationAllocations).filter(item => item.operation_id === operation?.id);
    const source = tankById(operation?.source_tank_id || allocations.find(item => item.direction === "source")?.tank_id)?.name || "Origem não informada";
    const destination = tankById(operation?.destination_tank_id || allocations.find(item => item.direction === "destination")?.tank_id)?.name || operation?.vessel || "Destino não informado";
    return { source, destination };
  }

  function metric(label, value, detail, icon, variant = "blue") {
    return `<article class="native-metric ${variant}"><div><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(detail)}</small></div>${svg(icon)}<i></i></article>`;
  }

  function renderDashboard() {
    const d = data();
    const operations = arr(d.operations);
    const current = activeOperation();
    const tanks = arr(d.tanks).filter(item => !normalize(item.kind).includes("silo"));
    const silos = arr(d.tanks).filter(item => normalize(item.kind).includes("silo"));
    const storedTankVolume = sum(tanks, "volume");
    const tankCapacity = sum(tanks, "capacity");
    const storedBulk = sum(silos, "volume");
    const bulkCapacity = sum(silos, "capacity");
    const activeOperations = operations.filter(item => isActive(item.status));
    const programmed = [...arr(d.vessels), ...operations.filter(item => normalize(item.status).includes("program"))];
    const trucks = arr(d.trucks);
    const expectedTrucks = trucks.filter(item => !["recebido", "concluido", "recusado"].some(term => normalize(item.status).includes(term)));
    const unavailable = arr(d.equipment).filter(item => isCritical(item.status) || normalize(item.status).includes("manutenc"));
    const availability = arr(d.equipment).length ? Math.round((arr(d.equipment).length - unavailable.length) / arr(d.equipment).length * 100) : 100;
    const alerts = criticalAlerts();
    const route = operationRoute(current);
    const progress = operationProgress(current);
    const remaining = Math.max(0, finite(current?.planned) - finite(current?.executed));
    const mobilePredictedAt = current && finite(current.flow_rate) > 0
      ? new Date(Date.now() + remaining / finite(current.flow_rate) * 3600000)
      : null;
    const next = operations.filter(item => item !== current && (normalize(item.status).includes("program") || new Date(item.start_at || 0) > new Date())).slice(0, 3);
    const products = [...new Set(tanks.map(item => item.product || "Sem produto"))].map(product => ({ product, value: sum(tanks.filter(item => (item.product || "Sem produto") === product), "volume") })).sort((a, b) => b.value - a.value).slice(0, 4);
    const maxProduct = Math.max(1, ...products.map(item => item.value));

    page("dashboard", `<div class="native-dashboard">
      <section class="native-metric-grid">
        ${metric("Operações em andamento", String(activeOperations.length), `${operations.length} registradas`, "sliders", "blue")}
        ${metric("Embarcações programadas", String(programmed.length), "janela operacional", "ship", "cyan")}
        ${metric("Volume armazenado", `${integer.format(storedTankVolume)} bbl`, `${Math.round(pct(storedTankVolume, tankCapacity))}% ocupado`, "tank", "green")}
        ${metric("Estoque de granéis", `${integer.format(storedBulk)} ${silos[0]?.unit || "ton"}`, `${Math.round(pct(storedBulk, bulkCapacity))}% ocupado`, "package", "green")}
        ${metric("Carretas previstas", `${expectedTrucks.length}/${trucks.length}`, "em fluxo hoje", "truck", "amber")}
        ${metric("Alertas críticos", String(alerts.length), "exigem atenção", "alert", alerts.length ? "red" : "green")}
        ${metric("Disponibilidade", `${availability}%`, `${unavailable.length} indisponível(is)`, "wrench", "green")}
        ${metric("Última atualização", currentContext?.state?.lastSync ? relative(currentContext.state.lastSync) : "agora", currentContext?.state?.realtimeStatus === "SUBSCRIBED" ? "Realtime ativo" : "sincronização automática", "cog", "neutral")}
      </section>

      <section class="native-dashboard-main">
        <article class="native-card current-operation-card">
          <header class="desktop-operation-header"><div><span class="live-dot"></span><strong>Operação Atual${current ? ` em ${esc(current.activity || "andamento")}` : ""}</strong></div>${current ? badge(current.status, "info") : badge("Sem operação", "neutral")}</header>
          <div class="mobile-current-operation">${current ? `<div class="mobile-operation-head"><strong><i></i>${esc(current.vessel || current.client || "Operação atual")}</strong>${badge(current.status, "success")}</div><div class="mobile-operation-progress"><div class="native-progress"><i style="width:${progress}%"></i></div><span><strong>${Math.round(progress)}% Concluído</strong><b>ETA: ${mobilePredictedAt ? mobilePredictedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—"}</b></span></div><div class="mobile-operation-stats"><span>FLUIDO<strong>${esc(current.product || "—")}</strong></span><span>VAZÃO ATUAL<strong>${number.format(current.flow_rate)} ${esc(current.flow_rate_unit || `${current.unit || "bbl"}/h`)}</strong></span></div>` : empty("Nenhuma operação em andamento")}</div>
          <div class="desktop-operation-body">${current ? `<div class="operation-facts">
            <span>CLIENTE<strong>${esc(current.client || "—")}</strong></span><span>EMBARCAÇÃO<strong>${esc(current.vessel || "—")}</strong></span><span>ORDEM DE SERVIÇO<strong>${esc(current.service_order || "—")}</strong></span><span>PRODUTO<strong class="cyan-text">${esc(current.product || "—")}</strong></span>
            <span>ORIGEM<strong>${esc(route.source)}</strong></span><span>DESTINO<strong>${esc(route.destination)}</strong></span><span>VAZÃO ATUAL<strong class="green-text">${number.format(current.flow_rate)} ${esc(current.flow_rate_unit || `${current.unit || "bbl"}/h`)}</strong></span><span>RESPONSÁVEL<strong>${esc(profileName(current.responsible_id))}</strong></span>
          </div><div class="operation-progress-label"><span>Progresso da operação</span><strong>${integer.format(current.executed)} / ${integer.format(current.planned)} ${esc(current.unit || "")} (${Math.round(progress)}%)</strong></div><div class="native-progress"><i style="width:${progress}%"></i></div>
          <div class="native-timeline">${["Preparação", "Alinhamento", "Teste Pressão", "Bombeio", "Flush", "Término", "Liberação"].map((label, index) => `<span class="${index <= Math.min(6, Math.floor(progress / 17)) ? "done" : ""} ${index === Math.min(6, Math.floor(progress / 17)) ? "current" : ""}"><i>${index + 1}</i>${label}</span>`).join("")}</div>` : empty("Nenhuma operação em andamento", "A próxima operação programada aparecerá aqui.")}</div>
        </article>
        <article class="native-card upcoming-card"><header><strong><span class="desktop-upcoming-title">Próximas Operações Programadas</span><span class="mobile-upcoming-title">Próxima Operação</span></strong></header><div class="upcoming-list">${next.length ? next.map(item => `<button type="button" data-page-link="operations"><span class="upcoming-icon">${svg("ship")}</span><span><strong>${esc(item.vessel || item.activity || "Operação")}</strong><small>${esc(item.client || "—")} · ${esc(item.product || "—")}</small></span><span><strong>${integer.format(item.planned)} ${esc(item.unit || "")}</strong><small>${item.start_at ? isoTime(item.start_at) : "Sem horário"}</small></span></button>`).join("") : empty("Sem próximas operações")}</div></article>
      </section>

      <section class="mobile-field-section"><h2>Ações Rápidas</h2><div class="mobile-quick-grid"><button data-edit-tank="${esc(tanks[0]?.id || "")}">${svg("network")}<span>Atualizar Vol.</span></button><button data-action="new-operation">${svg("file")}<span>Registrar Ocorrência</span></button><button data-page-link="tanks">${svg("tank")}<span>Ver Tanques</span></button><button data-page-link="alerts">${svg("bell")}<span>Alertas</span></button></div><header><h2>Alertas Ativos</h2><button data-page-link="alerts">Ver Todos</button></header><div class="mobile-alert-list">${allAlerts().slice(0, 2).map(item => `<button data-page-link="alerts" class="${tone(item.level || item.status)}"><i></i><span><strong>${esc(item.title)}</strong><small>${relative(item.created_at)}</small></span>${svg("alert")}</button>`).join("") || empty("Sem alertas ativos")}</div></section>

      <section class="native-dashboard-charts">
        <article class="native-card product-volume-card"><header><strong>VOLUME POR PRODUTO</strong></header>${products.length ? products.map((item, index) => `<div class="horizontal-stat"><span>${esc(item.product)}</span><strong>${integer.format(item.value)} bbl</strong><i><b style="width:${item.value / maxProduct * 100}%;--bar:${["#2f80ed", "#f5b942", "#f97316", "#22c55e"][index]}"></b></i></div>`).join("") : empty("Sem volumes registrados")}</article>
        <article class="native-card monthly-card"><header><strong>OPERAÇÕES REALIZADAS POR MÊS</strong></header><div class="month-bars">${Array.from({ length: 7 }, (_, index) => { const date = new Date(); date.setMonth(date.getMonth() - (6 - index)); const count = operations.filter(item => { const itemDate = new Date(item.end_at || item.start_at || item.created_at || 0); return itemDate.getMonth() === date.getMonth() && itemDate.getFullYear() === date.getFullYear(); }).length; return `<span><i style="height:${Math.max(10, count * 18)}px"></i><small>${date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</small></span>`; }).join("")}</div></article>
        <article class="native-card area-card"><header><strong>VOLUME ARMAZENADO POR ÁREA</strong></header><div class="area-content"><div class="donut" style="--part:${pct(sum(tanks.filter(item => normalize(item.phase).includes("1")), "volume"), storedTankVolume)}%"></div><div>${["Phase #1", "Phase #2"].map((phase, index) => { const value = sum(tanks.filter(item => item.phase === phase), "volume"); return `<span><i style="background:${index ? "#f5b942" : "#2f80ed"}"></i>${esc(phase)}: <strong>${integer.format(value)} bbl</strong></span>`; }).join("")}<small>${remaining ? `${integer.format(remaining)} ${esc(current?.unit || "")} restantes na operação atual` : "Sem saldo pendente na operação atual"}</small></div></div></article>
      </section>
    </div>`);
  }

  function tankStatus(asset, percentage) {
    if (percentage >= 95) return ["Limite alto", "danger"];
    if (percentage <= 0) return ["Vazio", "warning"];
    if (asset.updated_at && Date.now() - new Date(asset.updated_at).getTime() > 30 * 60000) return ["Desatualizado", "warning"];
    return [asset.status || "Disponível", tone(asset.status)];
  }

  function assetCard(asset) {
    const percentage = pct(asset.volume, asset.capacity);
    const silo = normalize(asset.kind).includes("silo");
    const [status, variant] = tankStatus(asset, percentage);
    const liquidClass = silo ? "bulk" : normalize(asset.product).includes("sbm") ? "sbm" : "liquid";
    const responsible = profileName(asset.updated_by);
    return `<article class="native-asset-card ${silo ? "silo" : "tank"} ${variant}" style="--asset-level:${percentage}%" data-tank-search="${esc(`${asset.name} ${asset.product} ${asset.client}`.toLowerCase())}" data-tank-phase="${esc(normalize(asset.phase))}" data-tank-kind="${silo ? "silo" : "tank"}" data-tank-product="${esc(normalize(asset.product))}" data-tank-status="${esc(normalize(`${asset.status} ${status}`))}">
      <header><strong>${esc(asset.name)}</strong>${badge(status, variant)}</header>
      <button class="asset-visual ${liquidClass}" type="button" data-tank-detail="${esc(asset.id)}" aria-label="Abrir detalhes de ${esc(asset.name)}"><i style="height:${percentage}%"></i><b>${Math.round(percentage)}%</b></button>
      <dl><div><dt>PRODUTO</dt><dd>${esc(asset.product || "Vazio")}</dd></div><div><dt>CLIENTE</dt><dd>${esc(asset.client || "Sem cliente")}</dd></div><div><dt>${silo ? "QUANTIDADE" : "VOLUME"}</dt><dd>${integer.format(asset.volume)}/${integer.format(asset.capacity)} ${esc(asset.unit)}</dd></div></dl>
      <footer><span title="Responsável: ${esc(responsible)}">Resp. ${esc(responsible.split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase() || "—")}</span><span>Atualizado ${relative(asset.updated_at)}</span></footer>
      <div class="mobile-asset-level"><i><b></b></i><span><strong>${Math.round(percentage)}% Cheio</strong><em>${integer.format(asset.volume)} ${esc(asset.unit)}</em></span></div>
      <button class="asset-card-link" type="button" data-tank-detail="${esc(asset.id)}" aria-label="Ver dados, histórico e movimentações de ${esc(asset.name)}">Ver detalhes</button>
    </article>`;
  }

  function plantMap(assets) {
    const phaseOne = assets.filter(item => normalize(item.phase).includes("1"));
    const phaseTwo = assets.filter(item => normalize(item.phase).includes("2"));
    const node = item => `<button class="map-asset ${normalize(item.kind).includes("silo") ? "silo" : ""} ${activeOperation()?.source_tank_id === item.id ? "active" : ""}" data-tank-detail="${esc(item.id)}"><strong>${esc(item.name)}</strong><i style="height:${pct(item.volume, item.capacity)}%"></i></button>`;
    return `<section class="native-card plant-map-card">
      <header><div><strong>Mapa Operacional da Planta</strong><small>Fluxos e ativos refletem os registros atuais</small></div><div class="map-legend"><span><i class="active"></i>Ativo</span><span><i></i>Estático</span><span><i class="fault"></i>Falha</span></div></header>
      <div class="plant-map-canvas"><div class="map-phase"><span>FASE #1 — WBM</span><div>${phaseOne.filter(item => !normalize(item.kind).includes("silo")).map(node).join("")}</div></div><div class="map-phase phase-two"><span>FASE #2 — SBM</span><div>${phaseTwo.filter(item => !normalize(item.kind).includes("silo")).map(node).join("")}</div></div><div class="map-line main-line"></div><div class="map-line branch-one"></div><div class="map-line branch-two"></div><div class="map-silos"><span>ÁREA DE SILOS</span><div>${assets.filter(item => normalize(item.kind).includes("silo")).map(node).join("")}</div></div><div class="map-pumps"><span>BOMBAS</span><strong>P-01</strong><strong class="active">P-02</strong><strong>P-03</strong></div><div class="map-piers"><span>PIER DE EMBARQUE</span><div><strong>PIER 1</strong><small>Em espera</small></div><div class="active"><strong>PIER 2</strong><small>${esc(activeOperation()?.vessel || "Livre")}</small></div></div></div>
    </section>`;
  }

  function renderTanks() {
    const assets = arr(data().tanks).slice().sort((a, b) => finite(a.order) - finite(b.order));
    const phaseNames = [...new Set(assets.map(item => item.phase || "Sem fase"))];
    const products = [...new Set(assets.map(item => item.product).filter(Boolean))];
    page("tanks", `<div class="native-tanks-page">
      ${header("Controle de Tancagem", "Níveis, produtos e disponibilidade dos ativos em tempo real", `${actionButton("Transferir", "new-tank-transfer", "secondary", "network")}<button class="btn secondary" data-export="tanks">${svg("bars")}<span>Exportar</span></button>`)}
      <div class="native-filter-bar"><div class="native-tabs"><button class="active" data-native-tank-tab="all">Todos</button>${phaseNames.map(phase => `<button data-native-tank-tab="${esc(normalize(phase))}">${esc(phase.replace("Phase #", "Phase "))}</button>`).join("")}<button data-native-tank-availability="true">Disponíveis</button></div><label>Produto<select data-tank-filter="product"><option value="">Todos</option>${products.map(item => `<option value="${esc(normalize(item))}">${esc(item)}</option>`).join("")}</select></label><label>Status<select data-tank-filter="status"><option value="">Todos</option><option value="disponivel">Disponível</option><option value="desatualizado">Desatualizado</option><option value="manutencao">Manutenção</option><option value="limite alto">Limite alto</option></select></label><div class="tank-view-switch" role="tablist" aria-label="Visualização da tancagem"><button class="view-switch active" type="button" data-tank-view="cards" role="tab" aria-selected="true" aria-label="Visualização em cartões">${svg("dashboard")}</button><button class="view-switch" type="button" data-tank-view="map" role="tab" aria-selected="false" aria-label="Mapa da planta">${svg("network")}</button></div></div>
      <div class="tank-view-panel" data-tank-panel="cards">
        ${phaseNames.map((phase, phaseIndex) => { const phaseAssets = assets.filter(item => item.phase === phase); const tanks = phaseAssets.filter(item => !normalize(item.kind).includes("silo")); const silos = phaseAssets.filter(item => normalize(item.kind).includes("silo")); const regular = tanks.filter(item => !normalize(item.kind).includes("mix") && !/^M-/.test(item.name)); const mix = tanks.filter(item => normalize(item.kind).includes("mix") || /^M-/.test(item.name)); return `<section class="asset-phase" data-native-phase="${esc(normalize(phase))}"><h2><i class="${phaseIndex ? "amber" : "blue"}"></i>${esc(phase.replace("Phase", "FASE"))} — ${phaseIndex ? "FLUIDOS BASE SINTÉTICA (SBM)" : "FLUIDOS BASE ÁGUA (WBM)"}</h2><div class="asset-card-grid">${regular.length ? regular.map(assetCard).join("") : empty("Nenhum tanque nesta fase")}</div>${mix.length ? `<h3>Tanques de Mistura (Mix Tanks)</h3><div class="mix-card-grid">${mix.map(assetCard).join("")}</div>` : ""}${silos.length ? `<h3>Silos de Granéis</h3><div class="silo-card-grid">${silos.map(assetCard).join("")}</div>` : ""}</section>`; }).join("")}
      </div>
      <div class="tank-view-panel" data-tank-panel="map" hidden>${plantMap(assets)}</div>
    </div>`);
  }

  function operationRow(item) {
    const progress = operationProgress(item);
    return `<article class="operation-list-row"><span class="operation-type">${svg("sliders")}</span><div><strong>${esc(item.service_order || item.activity || "Operação")}</strong><small>${esc(item.client || "—")} · ${esc(item.vessel || "—")}</small></div><div><span>PRODUTO</span><strong>${esc(item.product || "—")}</strong></div><div><span>PROGRESSO</span><strong>${Math.round(progress)}%</strong><i><b style="width:${progress}%"></b></i></div><div>${badge(item.status)}</div><button class="btn secondary small" data-edit-operation="${esc(item.id)}">Detalhes</button></article>`;
  }

  function operationTimeline(operation, progress) {
    const stages = ["Preparação", "Alinhamento", "Teste de Pressão", "Início Bombeio", "Bombeio", "Flush", "Término", "Liberação"];
    const currentStage = progress >= 100 ? stages.length - 1 : Math.min(stages.length - 2, Math.floor(progress / 100 * (stages.length - 1)));
    const stageStatus = index => index < currentStage ? "Concluída" : index === currentStage ? (progress > 0 ? "Em curso" : "Pronta") : "Pendente";
    return `<article class="native-card operation-timeline-card"><header><div><strong>Cronograma Operacional</strong><small>Etapas vinculadas ao progresso real da operação</small></div><span>${Math.round(progress)}% executado</span></header><div class="operation-stage-track">${stages.map((label, index) => `<span class="${index < currentStage ? "done" : ""} ${index === currentStage ? "current" : ""}"><i>${index < currentStage ? "✓" : index + 1}</i><strong>${esc(label)}</strong><small>${index === 0 && operation.start_at ? timeOnly(operation.start_at) : stageStatus(index)}</small></span>`).join("")}</div>${finite(operation.paused_minutes) > 0 ? `<footer class="operation-pause-note">${svg("alert")}<span><strong>Pausa registrada</strong>${finite(operation.paused_minutes)} min acumulados nesta operação</span></footer>` : `<footer class="operation-pause-note clear">${svg("check")}<span><strong>Fluxo contínuo</strong>Sem pausas registradas</span></footer>`}</article>`;
  }

  function renderOperations() {
    const operations = arr(data().operations).slice().sort((a, b) => new Date(b.start_at || b.created_at || 0) - new Date(a.start_at || a.created_at || 0));
    const current = activeOperation();
    const route = operationRoute(current);
    const progress = operationProgress(current);
    const events = arr(data().operationEvents).filter(item => !current || item.operation_id === current.id).slice(0, 5);
    page("operations", `<div class="native-operations-page">
      ${header("Operação em Tempo Real", "Monitoramento ativo de transferências e serviços", `${badge(currentContext?.state?.realtimeStatus === "SUBSCRIBED" ? "Sistema online" : "Sincronizando", "success")}${actionButton("Nova operação", "new-operation", "primary", "sliders")}`)}
      ${current ? `<section class="operation-live-banner"><div><strong>OS ${esc(current.service_order || "Sem número")}</strong>${badge(current.status, "info")}</div><div><span>INÍCIO<strong>${isoTime(current.start_at)}</strong></span><span>TEMPO DECORRIDO<strong>${current.start_at ? `${Math.max(0, Math.floor((Date.now() - new Date(current.start_at).getTime()) / 3600000))}h` : "—"}</strong></span><span>PROGRESSO<strong>${Math.round(progress)}%</strong></span></div></section>
      <div class="operation-live-grid"><div><article class="native-card operation-client-strip"><span>${svg("ship")}</span><div><small>CLIENTE</small><strong>${esc(current.client || "—")}</strong></div><div><small>EMBARCAÇÃO</small><strong>${esc(current.vessel || "—")}</strong></div><div><small>PRODUTO</small><strong>${esc(current.product || "—")}</strong></div><div><small>DESTINO</small><strong>${esc(route.destination)}</strong></div></article>
      <article class="native-card flow-diagram"><header><strong>Diagrama de Fluxo & Ativos</strong></header><div><span>${svg("tank")}<strong>${esc(route.source)}</strong><small>Nível ${Math.round(pct(tankById(current.source_tank_id)?.volume, tankById(current.source_tank_id)?.capacity))}%</small></span><i></i><span class="active">${svg("cog")}<strong>Bomba P-02</strong><small>Ativa</small></span><i></i><span>${svg("network")}<strong>Linha operacional</strong><small>Pressurizada</small></span><i></i><span>${svg("ship")}<strong>${esc(route.destination)}</strong><small>Destino</small></span></div><footer><span>PROGRAMADO<strong>${integer.format(current.planned)} ${esc(current.unit)}</strong></span><span>REALIZADO<strong class="green-text">${integer.format(current.executed)} ${esc(current.unit)}</strong></span><span>RESTANTE<strong class="amber-text">${integer.format(Math.max(0, finite(current.planned) - finite(current.executed)))} ${esc(current.unit)}</strong></span></footer></article>
      <article class="native-card live-progress"><header><strong>Progresso do Bombeio</strong><b>${Math.round(progress)}% Concluído</b></header><div class="native-progress"><i style="width:${progress}%"></i></div><div><span>VAZÃO ATUAL<strong>${number.format(current.flow_rate)} <small>${esc(current.flow_rate_unit || `${current.unit}/h`)}</small></strong></span><span>VAZÃO MÉDIA<strong>${number.format(current.flow_rate)} <small>${esc(current.flow_rate_unit || `${current.unit}/h`)}</small></strong></span><span>PAUSAS<strong>${finite(current.paused_minutes)} <small>min</small></strong></span><span>TEMPERATURA<strong>—</strong></span></div></article>${operationTimeline(current, progress)}</div>
      <aside class="operation-side"><article class="native-card"><header><strong>Equipe de Turno</strong></header>${arr(data().users).slice(0, 4).map(user => `<div class="team-row"><span>${esc(user.name.split(" ").map(p => p[0]).join("").slice(0, 2))}</span><div><strong>${esc(user.name)}</strong><small>${esc(user.department || user.role)}</small></div></div>`).join("") || empty("Equipe não cadastrada")}</article><article class="native-card observation-log"><header><strong>Log de Observações</strong></header>${events.map(event => `<div><strong>${esc(profileName(event.created_by))}</strong><time>${isoTime(event.created_at)}</time><p>${esc(event.notes || event.description || event.event_type || "Atualização operacional")}</p></div>`).join("") || empty("Sem eventos registrados")}</article><button class="btn warning full" data-edit-operation="${esc(current.id)}">Registrar parada</button><button class="btn secondary full" data-edit-operation="${esc(current.id)}">Atualizar vazão</button><button class="btn primary full" data-edit-operation="${esc(current.id)}">Finalizar operação</button></aside></div>` : empty("Nenhuma operação em andamento", "Cadastre ou inicie uma operação para acompanhar o fluxo em tempo real.")}
      <section class="native-list-section"><header><div><h2>Operações Programadas e Histórico</h2><small>Registros reais sincronizados com o Supabase</small></div><button class="btn secondary" data-export="operations">Exportar CSV</button></header><div>${operations.length ? operations.map(operationRow).join("") : empty("Nenhuma operação cadastrada")}</div></section>
    </div>`);
  }

  function vesselItems() {
    const schedules = arr(data().vessels);
    if (schedules.length) return schedules;
    return arr(data().operations).filter(item => item.vessel).map(item => ({
      id: item.id, vesselName: item.vessel, client: item.client, product: item.product,
      plannedQuantity: item.planned, unit: item.unit, eta: item.start_at, etb: item.start_at,
      etd: item.end_at, berth: item.destination || "—", status: item.status, priority: "Normal",
      operationType: item.activity
    }));
  }

  function renderVessels() {
    const vessels = vesselItems().slice().sort((a, b) => new Date(a.eta || a.etb || 0) - new Date(b.eta || b.etb || 0));
    const berthKey = item => normalize(item?.berth).match(/(?:pier|berco)\s*#?\s*([12])/)?.[1] || (/^[12]$/.test(normalize(item?.berth)) ? normalize(item.berth) : "");
    const conflicts = vessels.filter((item, index) => berthKey(item) && vessels.some((other, otherIndex) => otherIndex !== index && berthKey(item) === berthKey(other) && Math.abs(new Date(item.eta || 0) - new Date(other.eta || 0)) < 6 * 3600000));
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7) + vesselWeekOffset * 7);
    const days = Array.from({ length: 7 }, (_, index) => { const date = new Date(weekStart); date.setDate(date.getDate() + index); return date; });
    const weekEnd = new Date(days[6]);
    weekEnd.setHours(23, 59, 59, 999);
    const weekVessels = vessels.filter(item => { const eta = new Date(item.eta || item.etb || 0); return !Number.isNaN(eta.getTime()) && eta >= weekStart && eta <= weekEnd; });
    const assignedWeekVessels = weekVessels.filter(item => berthKey(item));
    const unassignedWeekVessels = weekVessels.filter(item => !berthKey(item));
    page("vessel-registry", `<div class="native-vessels-page">
      ${header("Programação de Embarcações", "Escalas, janelas de atracação e abastecimento", `${actionButton("Cadastrar embarcação", "new-vessel-registry", "secondary", "ship")}${actionButton("Programar embarcação", "new-vessel", "primary", "ship")}`)}
      <div class="schedule-toolbar"><div><button type="button" data-vessel-week="-1" aria-label="Semana anterior">← Semana</button><strong>${days[0].toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} — ${days[6].toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}</strong><button type="button" data-vessel-week="1" aria-label="Próxima semana">Próxima →</button><button type="button" data-vessel-week="0">Hoje</button></div><div class="native-tabs" aria-label="Atalhos da programação"><button class="active" type="button" data-vessel-jump="timeline">Timeline</button><button type="button" data-vessel-jump="table">Tabela</button><button type="button" data-vessel-jump="agenda">Agenda</button></div><div><select aria-label="Filtrar píer"><option>Pier: Todos</option><option>Pier 1</option><option>Pier 2</option></select><select aria-label="Filtrar status"><option>Status: Ativos</option><option>Todos</option></select></div></div>
      ${conflicts.length ? `<div class="native-alert-banner danger">${svg("alert")}<strong>Conflito detectado:</strong><span>${conflicts.length} programação(ões) utilizam a mesma janela de píer.</span><button type="button" data-vessel-jump="table">Revisar conflito</button></div>` : unassignedWeekVessels.length ? `<div class="native-alert-banner warning schedule-health-banner">${svg("alert")}<strong>Píer pendente</strong><span>${unassignedWeekVessels.length} programação(ões) desta semana ainda precisam de definição de berço.</span><button type="button" data-vessel-jump="table">Revisar</button></div>` : `<div class="native-alert-banner success schedule-health-banner">${svg("check")}<strong>Janelas sem conflito</strong><span>${weekVessels.length ? `${weekVessels.length} embarcação(ões) programada(s) na semana exibida.` : "Nenhuma ocupação prevista nesta semana."}</span></div>`}
      <section class="native-card pier-schedule" data-vessel-section="timeline"><header><div><strong>Visualização de Ocupação dos Píeres</strong><small>Semana operacional · ${assignedWeekVessels.length} janela(s) com píer definido</small></div><span class="pier-live-key"><i></i>Dados sincronizados</span></header><div class="pier-calendar-head"><span></span>${days.map(day => `<span>${day.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" }).toUpperCase()}</span>`).join("")}</div>${["Pier 1", "Pier 2"].map(pier => `<div class="pier-calendar-row"><strong>${pier}</strong>${days.map(day => { const vessel = assignedWeekVessels.find(item => berthKey(item) === pier.slice(-1) && new Date(item.eta || item.etb || 0).toDateString() === day.toDateString()); return `<span class="${vessel ? "occupied" : "available"}">${vessel ? `<button class="${tone(vessel.status)}" data-edit-vessel="${esc(vessel.id)}" title="${esc(vessel.vesselName)} · ${timeOnly(vessel.eta || vessel.etb)}">${esc(vessel.vesselName)}<small>${timeOnly(vessel.eta || vessel.etb)}</small></button>` : `<i aria-hidden="true"></i>`}</span>`; }).join("")}</div>`).join("")}</section>
      <section class="vessel-list" data-vessel-section="table"><header><div><h2>Embarcações Programadas</h2><small>Lista consolidada de escalas e janelas</small></div><span>${vessels.length} registro(s)</span></header>${vessels.length ? vessels.map(item => `<article><span class="vessel-anchor ${tone(item.status)}">${svg("ship")}</span><div><strong>${esc(item.vesselName)}</strong><small>${esc(item.client || "—")} · ${esc(item.product || item.operationType || "—")}</small></div><div><span>LOCALIZAÇÃO</span><strong>${esc(item.berth || "A definir")}</strong></div><div><span>VOLUME PROGRAMADO</span><strong>${integer.format(item.plannedQuantity)} ${esc(item.unit || "")}</strong></div><div><span>JANELA ESTIMADA</span><strong>${item.eta ? `${dateOnly(item.eta)} · ${timeOnly(item.eta)}` : "Sem ETA"}</strong></div>${badge(item.status)}<button class="btn secondary small" data-edit-vessel="${esc(item.id)}">Detalhes</button></article>`).join("") : empty("Nenhuma embarcação programada", "Use “Programar embarcação” para registrar a primeira janela operacional.")}</section>
      <section class="vessel-agenda native-card" data-vessel-section="agenda" hidden><header><div><strong>Agenda Operacional</strong><small>Próximas escalas em ordem cronológica</small></div></header>${vessels.length ? vessels.slice(0, 6).map(item => `<button type="button" data-edit-vessel="${esc(item.id)}"><time><strong>${item.eta ? timeOnly(item.eta) : "—"}</strong><small>${item.eta ? dateOnly(item.eta) : "Sem data"}</small></time><span><strong>${esc(item.vesselName)}</strong><small>${esc(item.berth || "Píer a definir")} · ${esc(item.product || item.operationType || "Operação")}</small></span>${badge(item.status)}</button>`).join("") : empty("Agenda sem escalas")}</section>
    </div>`);
  }

  function truckStatusCounts(trucks) {
    const count = term => trucks.filter(item => normalize(item.status).includes(term)).length;
    return [
      ["Previstas", trucks.length, "blue"], ["Em trânsito", count("transito"), "neutral"],
      ["Na portaria", count("portaria"), "green"], ["Aguardando", count("aguard"), "amber"],
      ["Em descarga", count("descarga"), "blue"], ["Recebidas hoje", count("recebid"), "neutral"],
      ["Recusadas", count("recus"), "neutral"], ["Com pendência", trucks.filter(item => isCritical(item.status) || normalize(item.status).includes("pend")).length, "amber"]
    ];
  }

  function renderTrucks() {
    const trucks = arr(data().trucks).slice().sort((a, b) => new Date(b.date || b.created_at || 0) - new Date(a.date || a.created_at || 0));
    page("trucks", `<div class="native-trucks-page">
      ${header("Controle de Portaria & Carretas", "Monitoramento do fluxo de entrada, descarga e saída", actionButton("Registrar chegada", "new-truck", "primary", "truck"))}
      <section class="truck-kpi-grid">${truckStatusCounts(trucks).map(([label, value, variant]) => `<article class="${variant}"><span>${esc(label)}</span><strong>${integer.format(value)}</strong></article>`).join("")}</section>
      <div class="native-filter-bar truck-filters"><button>Período: Hoje</button><button>Produto: Todos</button><button>Transportadora</button><button>Status: Ativos</button><label>${svg("search")}<input data-truck-filter="query" placeholder="Buscar placa..."></label><button class="btn secondary" data-export="trucks">Exportar</button></div>
      <section class="native-table-card"><div class="native-table-scroll"><table class="native-table"><thead><tr><th>Status</th><th>Transportadora</th><th>Placa</th><th>Motorista</th><th>Produto</th><th>Cliente</th><th>Qtd</th><th>NF</th><th>Origem</th><th>Previsão</th><th>Responsável</th></tr></thead><tbody>${trucks.length ? trucks.map(item => `<tr><td>${badge(item.status)}</td><td><strong>${esc(item.supplier || "—")}</strong></td><td class="mono">${esc(item.plate || "—")}</td><td>${esc(item.driver || "—")}</td><td>${esc(item.product || item.items?.map(x => x.productName).join(", ") || "—")}</td><td>${esc(item.client || "—")}</td><td>${number.format(item.quantity)} ${esc(item.unit || "")}</td><td class="blue-text">${esc(item.invoice || "—")}</td><td>${esc(item.movement || "—")}</td><td>${item.date ? dateOnly(item.date) : "—"}</td><td>${esc(profileName(item.created_by))}</td></tr>${normalize(item.status).includes("descarga") ? `<tr class="truck-expanded"><td colspan="11"><div><strong>FLUXO DE RECEBIMENTO</strong><span class="done">Chegada Portaria</span><i></i><span class="done">Pesagem Entrada</span><i></i><span class="done">Em Descarga</span><i></i><span>Pesagem Saída</span><i></i><span>Liberação</span></div></td></tr>` : ""}`).join("") : `<tr><td colspan="11">${empty("Nenhuma carreta registrada")}</td></tr>`}</tbody></table></div></section>
    </div>`);
  }

  function movementRecords() {
    const movements = arr(data().tankMovements).map(item => ({
      id: item.id, date: item.created_at, type: item.movement_type, product: item.product,
      client: "Interno", source: tankById(item.source_tank_id)?.name || "Externo",
      destination: tankById(item.destination_tank_id)?.name || "Externo", quantity: item.quantity,
      unit: item.unit, flow: 0, status: "Concluído", responsible: profileName(item.created_by)
    }));
    if (movements.length) return movements;
    return arr(data().operations).map(item => ({
      id: item.id, date: item.start_at, type: item.activity, product: item.product, client: item.client,
      source: operationRoute(item).source, destination: operationRoute(item).destination,
      quantity: item.executed || item.planned, unit: item.unit, flow: item.flow_rate,
      status: item.status, responsible: profileName(item.responsible_id)
    }));
  }

  function movementTable(items, bulk = false) {
    return `<div class="native-table-scroll"><table class="native-table movement-table"><thead><tr><th>OS</th><th>Tipo</th><th>Produto</th><th>Cliente</th><th>Origem</th><th>Destino</th><th>Quantidade</th>${bulk ? "" : "<th>Vazão</th>"}<th>Início</th><th>Status</th></tr></thead><tbody>${items.length ? items.map(item => `<tr><td class="mono">#${esc(String(item.id).slice(0, 8))}</td><td>${badge(item.type)}</td><td><strong>${esc(item.product || "—")}</strong></td><td>${esc(item.client || "—")}</td><td>${esc(item.source)}</td><td>${esc(item.destination)}</td><td><strong>${number.format(item.quantity)} ${esc(item.unit || "")}</strong></td>${bulk ? "" : `<td>${item.flow ? `${number.format(item.flow)} ${esc(item.unit)}/h` : "—"}</td>`}<td>${isoTime(item.date)}</td><td>${badge(item.status)}</td></tr>`).join("") : `<tr><td colspan="10">${empty("Nenhuma movimentação registrada")}</td></tr>`}</tbody></table></div>`;
  }

  function renderMovements(kind = "fluid") {
    const bulk = kind === "bulk";
    const all = movementRecords();
    const items = all.filter(item => bulk ? ["ton", "t", "kg"].includes(normalize(item.unit)) || ["barita", "bentonita", "calcita", "cimento", "granel"].some(term => normalize(item.product).includes(term)) : !(["ton", "t", "kg"].includes(normalize(item.unit)) || ["barita", "bentonita", "calcita", "cimento", "granel"].some(term => normalize(item.product).includes(term))));
    const total = sum(items, "quantity");
    const completed = items.filter(item => normalize(item.status).includes("conclu")).length;
    const active = items.filter(item => isActive(item.status)).length;
    const target = bulk ? "bulk-movements" : "fluids";
    page(target, `<div class="native-movements-page">
      ${header(bulk ? "Movimentação de Granéis" : "Movimentação de Fluidos", bulk ? "Recebimento, bombeio e silagem de granéis sólidos" : "Log operacional e transferência de fluidos", `<button class="btn secondary" data-export="operations">${svg("bars")}Exportar</button>`)}
      <section class="movement-kpis">${[
        ["Movimentações Hoje", items.length, "blue"], [bulk ? "Toneladas Bombeadas" : "Volume Total Bombeado", `${integer.format(total)} ${bulk ? "ton" : "bbl"}`, "green"],
        [bulk ? "Recebimentos" : "Fabricações", completed, "blue"], [bulk ? "Bombeios para Embarcação" : "Transferências Internas", active, "amber"], ["Pendentes", items.length - completed - active, "red"]
      ].map(([label, value, variant]) => `<article class="${variant}"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>Dados operacionais atuais</small></article>`).join("")}</section>
      <div class="movement-layout"><section class="native-table-card"><div class="native-filter-bar compact"><button>Período: Hoje</button><button>Tipo: Todos</button><button>Produto: Todos</button><button>Cliente: Todos</button></div>${movementTable(items, bulk)}</section><aside class="native-card stock-side"><header><strong>${bulk ? "Estoque Atual Silos" : "Volume Semanal"}</strong><small>${bulk ? "Capacidade e estocagem" : "Distribuição por produto"}</small></header>${bulk ? arr(data().tanks).filter(item => normalize(item.kind).includes("silo")).map(item => `<div class="stock-row"><span><strong>${esc(item.name)}</strong>${esc(item.product || "Vazio")}</span><b>${integer.format(item.volume)} / ${integer.format(item.capacity)} ${esc(item.unit)}</b><i><em style="width:${pct(item.volume, item.capacity)}%"></em></i></div>`).join("") || empty("Sem silos cadastrados") : [...new Set(items.map(item => item.product).filter(Boolean))].slice(0, 6).map((product, index) => { const value = sum(items.filter(item => item.product === product), "quantity"); return `<div class="weekly-row"><span>${esc(product)}</span><i><em style="width:${Math.max(5, pct(value, total))}%;--bar:${["#f59e0b", "#ef4444", "#3b82f6", "#10b981"][index % 4]}"></em></i><strong>${integer.format(value)}</strong></div>`; }).join("") || empty("Sem movimentações")}</aside></div>
    </div>`);
  }

  function renderInventory() {
    const assets = arr(data().tanks);
    const tanks = assets.filter(item => !normalize(item.kind).includes("silo"));
    const silos = assets.filter(item => normalize(item.kind).includes("silo"));
    const total = sum(tanks, "volume");
    const capacity = sum(tanks, "capacity");
    const products = [...new Set(tanks.map(item => item.product || "Sem produto"))].map(product => {
      const group = tanks.filter(item => (item.product || "Sem produto") === product);
      return { product, client: [...new Set(group.map(item => item.client).filter(Boolean))].join(", "), tanks: group.map(item => item.name).join(", "), value: sum(group, "volume"), capacity: sum(group, "capacity"), density: group.find(item => item.density)?.density || 0 };
    }).sort((a, b) => b.value - a.value);
    page("inventory", `<div class="native-inventory-page">
      ${header("Visão Geral do Estoque da Base", "Inventário consolidado de fluidos e granéis", `<button class="btn secondary" data-page-link="bulk-movements">Granéis</button><button class="btn primary" data-export="tanks">Exportar relatório</button>`)}
      <div class="native-tabs inventory-tabs"><button class="active">Fluidos (bbl)</button><button data-page-link="bulk-movements">Granéis (ton)</button></div>
      <section class="inventory-kpis"><article><span>Total Armazenado (Fluidos)</span><strong>${integer.format(total)} bbl</strong><small>${Math.round(pct(total, capacity))}% da capacidade</small></article><article><span>Capacidade Total Reservatório</span><strong>${integer.format(capacity)} bbl</strong><small>${integer.format(Math.max(0, capacity - total))} bbl livres</small></article><article><span>Giro de Tanques Semanal</span><strong>${integer.format(sum(arr(data().tankMovements).filter(item => new Date(item.created_at || 0) > new Date(Date.now() - 7 * 86400000)), "quantity"))} bbl</strong><small>movimentado no período</small></article></section>
      <div class="inventory-layout"><section class="native-table-card"><header><strong>Detalhamento de Fluidos em Tanques</strong></header><div class="native-table-scroll"><table class="native-table"><thead><tr><th>Produto</th><th>Cliente</th><th>Tanques</th><th>Vol. armazenado</th><th>Capacidade</th><th>Ocupação</th><th>Densidade</th></tr></thead><tbody>${products.length ? products.map((item, index) => `<tr><td><i class="product-dot" style="--dot:${["#38bdf8", "#f5b942", "#22c55e", "#a855f7", "#f97316"][index % 5]}"></i><strong>${esc(item.product)}</strong></td><td>${esc(item.client || "—")}</td><td>${esc(item.tanks)}</td><td><strong>${integer.format(item.value)} bbl</strong></td><td>${integer.format(item.capacity)} bbl</td><td><div class="cell-progress"><i style="width:${pct(item.value, item.capacity)}%"></i></div>${Math.round(pct(item.value, item.capacity))}%</td><td>${item.density ? `${number.format(item.density)} ppg` : "—"}</td></tr>`).join("") : `<tr><td colspan="7">${empty("Sem estoque cadastrado")}</td></tr>`}</tbody></table></div></section><aside><article class="native-card distribution-card"><header><strong>Distribuição por Produto</strong></header><div class="donut" style="--part:${products[0] ? pct(products[0].value, total) : 0}%"></div>${products.slice(0, 4).map(item => `<span>${esc(item.product)} <strong>${Math.round(pct(item.value, total))}%</strong></span>`).join("")}</article><article class="native-card client-stock"><header><strong>Estoque por Cliente</strong></header>${[...new Set(tanks.map(item => item.client || "Sem cliente"))].map(client => { const value = sum(tanks.filter(item => (item.client || "Sem cliente") === client), "volume"); return `<div><span>${esc(client)}<strong>${integer.format(value)} bbl</strong></span><i><em style="width:${pct(value, total)}%"></em></i></div>`; }).join("")}</article></aside></div>
      <section class="native-card silo-preview"><header><strong>Granéis Sólidos</strong><span>Capacidade geral: ${integer.format(sum(silos, "volume"))} / ${integer.format(sum(silos, "capacity"))} ${esc(silos[0]?.unit || "ton")}</span></header><div>${silos.map(item => `<article><span>${esc(item.name)} · ${esc(item.product || "Vazio")}</span><strong>${integer.format(item.volume)} / ${integer.format(item.capacity)} ${esc(item.unit)}</strong><i><em style="width:${pct(item.volume, item.capacity)}%"></em></i></article>`).join("") || empty("Sem silos cadastrados")}</div></section>
    </div>`);
  }

  function renderMaintenance() {
    const equipment = arr(data().equipment);
    const orders = arr(data().maintenanceOrders).slice().sort((a, b) => new Date(a.due_date || a.opened_at || 0) - new Date(b.due_date || b.opened_at || 0));
    const openOrders = orders.filter(item => !["conclu", "fech", "cancel"].some(term => normalize(item.status).includes(term)));
    const unavailable = equipment.filter(item => isCritical(item.status));
    const maintenance = equipment.filter(item => normalize(item.status).includes("manutenc"));
    const groupLabel = category => {
      const value = normalize(category);
      if (value.includes("bomb")) return "Bombas de Transferência";
      if (value.includes("compress") || value.includes("mistur") || value.includes("mix")) return "Compressores & Misturadores";
      return category || "Outros Equipamentos";
    };
    const groups = equipment.reduce((result, item) => {
      const label = groupLabel(item.category);
      if (!result.has(label)) result.set(label, []);
      result.get(label).push(item);
      return result;
    }, new Map());
    const equipmentCard = item => {
      const open = openOrders.find(order => order.equipment_id === item.id);
      const overdue = item.next_maintenance_date && new Date(item.next_maintenance_date) < new Date();
      const health = isCritical(item.status) ? 0 : open && isCritical(open.priority) ? 35 : overdue ? 60 : normalize(item.status).includes("manutenc") ? 45 : 95;
      return `<article class="equipment-card ${tone(item.status)}"><header><span>${svg("cog")}</span><div><strong>${esc(item.name)}</strong><small>${esc(item.category || "Equipamento")}</small></div>${badge(open?.priority || "Crit. média", open && isCritical(open.priority) ? "danger" : "neutral")}</header><dl><div><dt>Localização</dt><dd>${esc(item.location || "Não informada")}</dd></div><div><dt>Horímetro</dt><dd>${integer.format(item.hourmeter)} h</dd></div><div><dt>Próxima preventiva</dt><dd class="${overdue ? "red-text" : ""}">${item.next_maintenance_date ? dateOnly(item.next_maintenance_date) : "Não programada"}</dd></div></dl><footer>${badge(item.status)}<span>Saúde: ${health}%</span><i><em style="width:${health}%"></em></i></footer><div class="equipment-card-actions"><button type="button" data-new-order-equipment="${esc(item.id)}">Abrir OS</button><button type="button" data-edit-equipment="${esc(item.id)}">Detalhes</button></div></article>`;
    };
    page("maintenance", `<div class="native-maintenance-page">
      ${header("Status de Equipamentos e OS Ativas", "Disponibilidade, criticidade e programação preventiva", `${actionButton("Novo equipamento", "new-equipment", "secondary", "wrench")}${actionButton("Nova OS", "new-maintenance-order", "primary", "file")}`)}
      <section class="maintenance-kpis"><article><span>Equipamentos Operacionais</span><strong>${equipment.length - unavailable.length - maintenance.length} / ${equipment.length}</strong>${svg("cog")}</article><article><span>Ordens de Serviço Abertas</span><strong>${openOrders.length} OS</strong>${svg("bars")}</article><article><span>Aguardando Peças</span><strong>${openOrders.filter(item => normalize(item.status).includes("peca")).length}</strong>${svg("package")}</article><article class="danger"><span>Fora de Serviço</span><strong>${unavailable.length}</strong>${svg("alert")}</article></section>
      <div class="equipment-groups">${equipment.length ? [...groups.entries()].map(([label, items]) => `<section class="equipment-section"><h2>${esc(label.toUpperCase())}<span>${items.length} ativo(s)</span></h2><div class="equipment-grid">${items.map(equipmentCard).join("")}</div></section>`).join("") : `<section class="maintenance-empty-state">${svg("wrench")}<div><strong>Nenhum equipamento cadastrado</strong><span>Cadastre o primeiro ativo para controlar disponibilidade, horímetro e preventivas.</span></div><button class="btn primary" type="button" data-action="new-equipment">Novo equipamento</button></section>`}</div>
      <section class="native-table-card preventive-table"><header><div><strong>Cronograma de Manutenção</strong><small>Próximos eventos e ordens de serviço</small></div><button class="btn secondary small" type="button" data-action="new-maintenance-order">Nova OS</button></header><div class="native-table-scroll"><table class="native-table"><thead><tr><th>Data prevista</th><th>Equipamento</th><th>Descrição do serviço</th><th>Responsável</th><th>Criticidade</th><th>Status</th></tr></thead><tbody>${orders.length ? orders.slice(0, 8).map(item => `<tr><td><strong>${dateOnly(item.due_date)}</strong></td><td class="blue-text">${esc(equipment.find(eq => eq.id === item.equipment_id)?.name || "Equipamento não localizado")}</td><td>${esc(item.title || item.description || "Sem descrição")}</td><td>${esc(item.responsible || (item.responsible_id ? profileName(item.responsible_id) : "Não definido"))}</td><td>${badge(item.priority)}</td><td>${badge(item.status)}</td></tr>`).join("") : `<tr><td colspan="6"><div class="maintenance-schedule-empty">${svg("bars")}<span><strong>Nenhuma ordem de serviço programada</strong><small>O cronograma será preenchido com as OS cadastradas no Supabase.</small></span><button class="btn primary small" type="button" data-action="new-maintenance-order">Criar primeira OS</button></div></td></tr>`}</tbody></table></div></section>
      <section class="maintenance-mobile-schedule"><header><div><strong>Cronograma de Manutenção</strong><small>Próximos eventos e ordens de serviço</small></div><button class="btn secondary small" type="button" data-action="new-maintenance-order">Nova OS</button></header><div>${orders.length ? orders.slice(0, 8).map(item => `<article><header><time>${dateOnly(item.due_date)}</time>${badge(item.status)}</header><strong>${esc(equipment.find(eq => eq.id === item.equipment_id)?.name || "Equipamento não localizado")}</strong><p>${esc(item.title || item.description || "Sem descrição")}</p><footer><span>Responsável<strong>${esc(item.responsible || (item.responsible_id ? profileName(item.responsible_id) : "Não definido"))}</strong></span><span>Criticidade${badge(item.priority)}</span></footer></article>`).join("") : `<div class="maintenance-mobile-empty">${svg("bars")}<strong>Nenhuma ordem de serviço programada</strong><span>Crie uma OS para iniciar o cronograma preventivo.</span><button class="btn primary" type="button" data-action="new-maintenance-order">Criar primeira OS</button></div>`}</div></section>
    </div>`);
  }

  function accidentFreeDays() {
    const incident = arr(data().qhse).filter(item => ["incidente", "acidente"].some(term => normalize(item.type).includes(term))).sort((a, b) => new Date(b.date || b.created_at || 0) - new Date(a.date || a.created_at || 0))[0];
    if (!incident) return null;
    return Math.max(0, Math.floor((Date.now() - new Date(incident.date || incident.created_at).getTime()) / 86400000));
  }

  function renderQhse() {
    const records = arr(data().qhse);
    const actions = arr(data().actionItems);
    const pending = actions.filter(item => !["conclu", "fech"].some(term => normalize(item.status).includes(term)));
    const inspections = records.filter(item => normalize(item.type).includes("inspec"));
    const expiring = arr(data().certificates).filter(item => { if (!item.expires_at) return false; const days = (new Date(item.expires_at).getTime() - Date.now()) / 86400000; return days >= 0 && days <= 30; });
    const enrollments = arr(data().courseEnrollments);
    const teams = [...new Set(arr(data().users).map(item => item.department || "Equipe operacional"))];
    const safetyDays = accidentFreeDays();
    page("qhse", `<div class="native-qhse-page">
      ${header("Painel de Segurança, Saúde e Meio Ambiente", "Indicadores, inspeções e conformidade da base", actionButton("Novo registro QHSE", "new-qhse", "primary", "shield"))}
      <section class="qhse-hero"><div class="${safetyDays === null ? "unavailable" : ""}">${svg("shield")}<span>RECORDE DE SEGURANÇA DA BASE<strong>${safetyDays === null ? "—" : integer.format(safetyDays)} <small>${safetyDays === null ? "SEM MARCO CADASTRADO" : "DIAS SEM ACIDENTES"}</small></strong><em>${safetyDays === null ? "Cadastre o primeiro marco QHSE para iniciar o indicador." : "Calculado a partir do último incidente registrado"}</em></span></div><aside><strong>ESTATÍSTICAS ANUAIS</strong><span>Incidentes registrados<b>${records.filter(item => normalize(item.type).includes("incident")).length}</b></span><span>Quase-acidentes reportados<b>${records.filter(item => normalize(item.type).includes("quase")).length}</b></span><span>Desvios identificados<b>${records.filter(item => normalize(item.type).includes("desvio")).length}</b></span><span>Ações pendentes<b class="red-text">${pending.length}</b></span></aside></section>
      <section class="qhse-kpis"><article><span>INSPEÇÕES DE CAMPO</span><strong>${inspections.filter(item => normalize(item.status).includes("conclu")).length}/${inspections.length}</strong><small>programadas e realizadas</small></article><article><span>PTs ATIVAS (Permissões)</span><strong>${records.filter(item => normalize(item.type).includes("permiss")).length} Ativas</strong><small>trabalhos de risco</small></article><article class="danger"><span>AÇÕES QHSE VENCIDAS</span><strong>${pending.filter(item => item.due_at && new Date(item.due_at) < new Date()).length} Pendentes</strong><small>necessitam fechamento</small></article><article><span>PRÓXIMA AUDITORIA</span><strong>${records.find(item => normalize(item.type).includes("auditoria")) ? dateOnly(records.find(item => normalize(item.type).includes("auditoria")).date) : "Não programada"}</strong><small>agenda de conformidade</small></article></section>
      <div class="qhse-main-grid"><article class="native-card daily-dds"><header><strong>DDS do Dia (Diálogo Diário de Segurança)</strong>${arr(data().ddsSessions)[0] ? badge(arr(data().ddsSessions)[0].status) : ""}</header>${arr(data().ddsSessions)[0] ? `<div><strong>${esc(arr(data().ddsSessions)[0].title)}</strong><small>Apresentador: ${esc(arr(data().ddsSessions)[0].instructor || "—")} · Participantes: ${arr(data().ddsAttendance).filter(item => item.sessionId === arr(data().ddsSessions)[0].id).length}</small></div>` : empty("Nenhum DDS programado")}</article><article class="native-card expiring-certificates ${expiring.length ? "warning" : "clear"}"><header>${expiring.length ? svg("alert") : svg("check")}<strong>${expiring.length ? `${expiring.length} certificação(ões) expirando nos próximos 30 dias` : "Certificações sem vencimentos próximos"}</strong></header>${expiring.slice(0, 4).map(item => `<span><strong>${esc(item.title)}</strong><small>${esc(item.owner || "—")}</small><time>${dateOnly(item.expires_at)}</time></span>`).join("") || empty("Nenhum certificado próximo do vencimento")}</article></div>
      <section class="native-card training-status"><header><strong>Status de Conclusão de Treinamentos Obrigatórios por Equipe</strong></header><div>${teams.map(team => { const users = arr(data().users).filter(item => (item.department || "Equipe operacional") === team); const related = enrollments.filter(item => users.some(user => user.id === item.userId)); const done = related.filter(item => normalize(item.status).includes("conclu")).length; const percentage = related.length ? done / related.length * 100 : 0; return `<article class="${related.length ? "" : "no-data"}"><span>${esc(team)}<strong>${related.length ? `${Math.round(percentage)}%` : "Sem dados"}</strong></span><i><em style="width:${percentage}%"></em></i></article>`; }).join("") || empty("Equipes não cadastradas")}</div></section>
    </div>`);
  }

  function renderDds() {
    const sessions = arr(data().ddsSessions).slice().sort((a, b) => new Date(b.scheduledAt || 0) - new Date(a.scheduledAt || 0));
    const courses = arr(data().courses);
    const enrollments = arr(data().courseEnrollments);
    const today = sessions[0];
    page("dds", `<div class="native-learning-page">
      ${header("DDS e Treinamentos de Segurança", "Rotinas diárias, presença e capacitações obrigatórias", `${actionButton("Registrar novo DDS", "new-dds", "primary", "course")}${actionButton("Novo curso", "new-course", "secondary", "file")}`)}
      <section class="dds-feature"><header><div><h2>DDS — Diálogo Diário de Segurança</h2><p>Registre e acompanhe as rotinas diárias de segurança operacional</p></div></header>${today ? `<article><div><span class="today-badge">${new Date(today.scheduledAt || 0).toDateString() === new Date().toDateString() ? "HOJE" : dateOnly(today.scheduledAt)}</span><small>${isoTime(today.scheduledAt)}</small><h3>${esc(today.title)}</h3><p>Apresentador: <strong>${esc(today.instructor || "—")}</strong> · Participação: <strong>${arr(data().ddsAttendance).filter(item => item.sessionId === today.id && normalize(item.status).includes("presen")).length}/${arr(data().ddsAttendance).filter(item => item.sessionId === today.id).length}</strong></p></div>${badge(today.status)}</article>` : empty("Nenhum DDS cadastrado")}</section>
      <section class="native-table-card"><header><strong>Histórico de DDS Recentes</strong></header><div class="native-table-scroll"><table class="native-table"><thead><tr><th>Data</th><th>Tema / Título</th><th>Apresentador</th><th>Participantes</th><th>Status</th><th></th></tr></thead><tbody>${sessions.length ? sessions.map(item => { const attendance = arr(data().ddsAttendance).filter(row => row.sessionId === item.id); const present = attendance.filter(row => normalize(row.status).includes("presen")).length; return `<tr><td class="mono">${dateOnly(item.scheduledAt)}</td><td><strong>${esc(item.title)}</strong><small>${esc(item.topic || "")}</small></td><td>${esc(item.instructor || "—")}</td><td>${present}/${attendance.length}</td><td>${badge(item.status)}</td><td><button class="btn secondary small" data-action="dds-attendance" data-dds-id="${esc(item.id)}">Presença</button></td></tr>`; }).join("") : `<tr><td colspan="6">${empty("Sem histórico de DDS")}</td></tr>`}</tbody></table></div></section>
      <section class="course-section"><h2>Cursos e Treinamentos Obrigatórios</h2><div>${courses.length ? courses.map(item => { const related = enrollments.filter(row => row.courseId === item.id); const completed = related.filter(row => normalize(row.status).includes("conclu")).length; const percentage = related.length ? completed / related.length * 100 : 0; return `<article><header><strong>${esc(item.title)}</strong><span>${Math.round(percentage)}% (${completed}/${related.length})</span></header><i><em style="width:${percentage}%"></em></i><small>${esc(item.provider || "Provedor não informado")} · ${number.format(item.workloadHours)} h</small><button data-action="enroll-course" data-course-id="${esc(item.id)}">Gerenciar</button></article>`; }).join("") : empty("Nenhum curso cadastrado")}</div></section>
    </div>`);
  }

  function renderDocuments() {
    const documents = arr(data().documents).filter(item => !item.visibilityRole || item.visibilityRole === "all" || currentContext?.isAdmin?.());
    const expiring = documents.filter(item => { if (!item.expiresAt) return false; const days = (new Date(item.expiresAt).getTime() - Date.now()) / 86400000; return days >= 0 && days <= 30; });
    const statuses = [...new Set(documents.map(item => item.status).filter(Boolean))];
    page("documents", `<div class="native-documents-page">
      ${header("Gerenciador de Documentos e Certificados", "Biblioteca operacional, licenças, laudos e vencimentos", actionButton("Novo documento", "new-document", "primary", "file"))}
      ${expiring.length ? `<div class="native-alert-banner warning">${svg("alert")}<strong>Atenção:</strong><span>${expiring.length} documento(s) expiram nos próximos 30 dias. Programe as renovações.</span><button>Verificar</button></div>` : ""}
      <div class="document-toolbar"><label>${svg("search")}<input data-document-filter="query" placeholder="Buscar documento por nome..."></label><span>Categoria:</span><div class="native-tabs"><button class="active" type="button" data-document-category="all">Todos</button><button type="button" data-document-category="certificado">Certificados</button><button type="button" data-document-category="licenca">Licenças</button><button type="button" data-document-category="laudo">Laudos</button><button type="button" data-document-category="fispq">FISPQ</button></div><select data-document-filter="status" aria-label="Filtrar status"><option value="">Todos Status</option>${statuses.map(item => `<option value="${esc(normalize(item))}">${esc(item)}</option>`).join("")}</select></div>
      <section class="document-grid">${documents.length ? `${documents.map(item => `<article class="document-card" data-document-card data-document-search="${esc(normalize(`${item.title} ${item.documentNumber} ${item.issuer}`))}" data-document-category-value="${esc(normalize(item.category))}" data-document-status-value="${esc(normalize(item.status))}"><header><span>${svg("file")}</span>${badge(item.category, "info")}</header><small>${esc(item.documentNumber || "SEM NÚMERO")}</small><h3>${esc(item.title)}</h3><p>${esc(item.issuer || "Emissor não informado")} · Revisão ${esc(item.revision || "—")}</p><footer><span>Emissão<strong>${dateOnly(item.issueDate)}</strong></span><span>Validade<strong>${dateOnly(item.expiresAt)}</strong></span>${badge(item.status)}<button data-action="edit-document" data-document-id="${esc(item.id)}">Abrir</button></footer></article>`).join("")}<div class="document-filter-empty" hidden>${empty("Nenhum documento corresponde aos filtros", "Ajuste a busca, categoria ou status.")}</div>` : empty("Nenhum documento disponível", "Cadastre documentos e certificados sem usar dados de demonstração.")}</section>
      <section class="native-card expiry-schedule"><header><div><strong>Cronograma de Vencimentos</strong><small>Próximas renovações estipuladas</small></div></header><div>${documents.filter(item => item.expiresAt).sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt)).slice(0, 6).map(item => `<article class="${new Date(item.expiresAt) < new Date() ? "danger" : ""}"><time><strong>${new Date(item.expiresAt).getDate().toString().padStart(2, "0")}</strong>${new Date(item.expiresAt).toLocaleDateString("pt-BR", { month: "short" }).toUpperCase()}</time><span><strong>${esc(item.title)}</strong><small>${esc(item.status || "Renovação programada")}</small></span></article>`).join("") || empty("Sem vencimentos programados")}</div></section>
    </div>`);
  }

  function renderReports() {
    const operations = arr(data().operations).slice().sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));
    const categories = [["Operacionais", operations.length], ["Passagem de turno", arr(data().handoverApprovals).length], ["Movimentação diária", arr(data().tankMovements).length], ["Inventário", arr(data().inventoryCounts).length], ["Manutenção", arr(data().maintenanceOrders).length], ["QHSE", arr(data().qhse).length], ["Consumo e performance", arr(data().dieselLogs).length]];
    page("reports", `<div class="native-reports-page">
      ${header("Central de Relatórios Inteligentes", "Consolidações operacionais e gerador expresso", actionButton("Passagem de turno", "page:handover", "secondary", "file"))}
      <div class="report-layout"><aside class="native-card report-categories"><strong>CATEGORIAS</strong>${categories.map(([label, count], index) => `<button class="${index ? "" : "active"}">${esc(label)}<span>${count}</span></button>`).join("")}</aside><section class="native-card recent-reports"><header><strong>Relatórios Operacionais Recentes</strong><small>${operations.length} itens</small></header><div class="native-table-scroll"><table class="native-table"><thead><tr><th>Data</th><th>Período</th><th>Autor</th><th>Status</th></tr></thead><tbody>${operations.length ? operations.slice(0, 10).map(item => `<tr><td>${dateOnly(item.start_at || item.created_at)}</td><td><strong>${esc(item.service_order || item.activity)}</strong><small>${esc(item.vessel || item.client || "")}</small></td><td>${esc(profileName(item.responsible_id || item.created_by))}</td><td>${badge(item.status)}</td></tr>`).join("") : `<tr><td colspan="4">${empty("Nenhum relatório disponível")}</td></tr>`}</tbody></table></div></section><aside><article class="native-card report-generator"><header><strong>GERADOR EXPRESSO</strong></header><label>Tipo de Relatório<select><option>Operacional Consolidado</option><option>Inventário</option><option>Passagem de Turno</option></select></label><label>Período<select><option>Últimos 30 dias</option><option>Turno atual</option><option>Hoje</option></select></label><label>Escopo / Área<select><option>Planta completa</option><option>Phase #1</option><option>Phase #2</option></select></label><span>Formato de saída</span><div class="native-tabs"><button class="active">PDF</button><button>Excel</button><button>Painel</button></div><button class="btn primary full" data-export="operations">Gerar relatório</button></article><article class="native-card report-preview"><header><strong>ÚLTIMA PRÉVIA GERADA</strong></header>${operations[0] ? `<div class="paper-preview"><span>ID: ${esc(String(operations[0].id).slice(0, 8))}</span><i></i><i></i><i></i></div><strong>${esc(operations[0].service_order || "Relatório operacional")}.pdf</strong><small>${isoTime(operations[0].updated_at || operations[0].created_at)}</small>` : empty("Sem prévia")}</article></aside></div>
    </div>`);
  }

  function renderHandover() {
    const current = activeOperation();
    const pendings = arr(data().handoverPendings).filter(item => !normalize(item.status).includes("conclu"));
    const notes = arr(data().handoverNotes).slice().sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));
    const restrictions = arr(data().equipment).filter(item => isCritical(item.status) || normalize(item.status).includes("manutenc"));
    const approval = arr(data().handoverApprovals).slice().sort((a, b) => finite(b.sequence_no) - finite(a.sequence_no))[0];
    page("handover", `<div class="native-handover-page">
      ${header("Passagem de Turno", "Continuidade operacional, pendências e aceite formal", `<span class="handover-reference">Ref: ${approval?.sequence_no ? `#PT-${String(approval.sequence_no).padStart(3, "0")}` : "Aguardando entrega"}</span>`)}
      <section class="handover-form-card"><div class="handover-people"><label>De: Operador<input value="${esc(data().profile?.name || "Usuário atual")}" readonly></label><label>Para: Próximo<select><option>Próximo turno</option><option>Turno A</option><option>Turno B</option></select></label></div><label>OPERAÇÕES EM ANDAMENTO<textarea readonly>${current ? `• ${current.activity} ${current.service_order || ""} em ${Math.round(operationProgress(current))}%\n• ${current.vessel || current.client || "Operação sem embarcação"} — ${current.product || "Produto não informado"}` : "Nenhuma operação em andamento."}</textarea></label><label>Pendências Críticas <b>*</b><textarea id="handoverObservations">${esc(pendings.map(item => item.title).join("\n") || notes[0]?.observations || "Nenhuma pendência crítica registrada.")}</textarea></label><label>EQUIPAMENTOS COM RESTRIÇÃO<div class="restriction-chips">${restrictions.map(item => `<span class="${tone(item.status)}">${esc(item.name)} (${esc(item.status)})</span>`).join("") || `<span class="success">Sem restrições</span>`}</div></label><label>Observações de Segurança<textarea>${esc(arr(data().qhse).filter(item => !normalize(item.status).includes("conclu")).slice(0, 3).map(item => item.title).join("\n") || "Sem observações adicionais.")}</textarea></label><div class="handover-actions"><button class="btn secondary" data-action="new-handover-pending">Adicionar pendência</button><button class="btn primary" data-action="deliver-handover">${svg("check")}Confirmar passagem</button></div></section>
    </div>`);
  }

  function renderAlerts() {
    const alerts = allAlerts();
    if (!selectedAlertId && alerts[0]) selectedAlertId = String(alerts[0].id || alerts[0].title);
    const selected = alerts.find(item => String(item.id || item.title) === selectedAlertId) || alerts[0];
    page("alerts", `<div class="native-alerts-page">
      ${header("Alertas & Mensagens", "Controle e tratamento de inconformidades na planta", actionButton("Novo alerta", "new-alert", "primary", "alert"))}
      <div class="alerts-layout"><section class="alert-inbox"><header><strong>Caixa de Mensagens</strong><span>${alerts.length} alertas</span></header><div>${alerts.length ? alerts.map(item => { const id = String(item.id || item.title); return `<button class="alert-inbox-row ${id === String(selected?.id || selected?.title) ? "active" : ""}" data-native-alert-id="${esc(id)}"><span><i class="${tone(item.level || item.status)}"></i><strong>${esc(String(item.level || item.severity || "Aviso").toUpperCase())}</strong><time>${relative(item.created_at || item.due_at)}</time></span><b>${esc(item.title || "Alerta operacional")}</b>${item.read === false ? `<em></em>` : ""}</button>`; }).join("") : empty("Nenhum alerta ativo")}</div></section><section class="alert-detail">${selected ? `<article class="native-card"><header><div><h2>${esc(selected.title || "Alerta operacional")}</h2><small>ID do alerta: ${esc(String(selected.id || "automático").slice(0, 16))} · Recebido ${relative(selected.created_at)}</small></div>${badge(selected.level || selected.severity || "Aviso", tone(selected.level || selected.severity))}</header><div class="alert-meta"><span>REMETENTE<strong>${selected.automatic ? "Sistema Automático" : esc(profileName(selected.created_by))}</strong></span><span>DESTINATÁRIO<strong>${esc(selected.target || selected.target_group || "Equipe de Operações")}</strong></span><span>EQUIPAMENTO VINCULADO<strong class="blue-text">${esc(tankById(selected.entity_id)?.name || selected.category || "Planta")}</strong></span></div><div class="alert-message"><span>MENSAGEM / DETALHAMENTO</span><p>${esc(selected.message || selected.description || "O sistema identificou uma condição operacional que requer avaliação da equipe responsável.")}</p></div><div class="alert-resolution"><header><strong>Resolução / Ações Tomadas</strong>${badge(selected.resolved_at ? "Tratado" : "Pendente", selected.resolved_at ? "success" : "warning")}</header><p>${selected.resolved_at ? `Tratado em ${isoTime(selected.resolved_at)} por ${esc(profileName(selected.resolved_by))}.` : "Aguardando registro de tratamento pela equipe responsável."}</p><div><button class="btn secondary" data-page-link="${esc(selected.action_page || "alerts")}">Abrir módulo</button>${selected.read === false ? `<button class="btn primary" data-read-alert="${esc(selected.id)}">Marcar como lido</button>` : ""}</div></div></article>` : empty("Selecione um alerta")}</section></div>
    </div>`);
  }

  function renderUsers() {
    const users = arr(data().users);
    const active = users.filter(item => item.active !== false);
    const departments = [...new Set(users.map(item => item.department).filter(Boolean))];
    const selected = users.find(item => item.id === data().profile?.id) || users[0];
    page("users", `<div class="native-users-page">
      ${header("Gestão de Usuários e Permissões", "Controle de acesso aplicado na interface e no banco", actionButton("Adicionar usuário", "new-user", "primary", "users"))}
      <section class="user-kpis"><article><span>Total de Usuários</span><strong>${users.length}</strong><small>cadastros</small></article><article><span>Ativos Agora</span><strong>${active.length}</strong><small>contas liberadas</small></article><article><span>Equipes Ativas</span><strong>${departments.length}</strong><small>áreas cadastradas</small></article></section>
      <div class="users-layout"><section class="native-card users-list"><header><div class="native-tabs"><button class="active">Usuários</button><button>Equipes</button><button>Cargos</button><button>Permissões</button></div></header><div class="native-table-scroll"><table class="native-table"><thead><tr><th>Avatar</th><th>Nome</th><th>Cargo</th><th>Equipe</th><th>Status</th><th>Último acesso</th></tr></thead><tbody>${users.length ? users.map(item => `<tr class="${item.id === selected?.id ? "selected" : ""}"><td><span class="table-avatar">${esc(item.name.split(" ").map(p => p[0]).join("").slice(0, 2))}</span></td><td><strong>${esc(item.name)}</strong><small>${esc(item.email)}</small></td><td>${esc(item.role)}</td><td>${esc(item.department || "—")}</td><td>${badge(item.active !== false ? "Ativo" : "Inativo", item.active !== false ? "success" : "danger")}</td><td>${relative(item.created_at)}</td></tr>`).join("") : `<tr><td colspan="6">${empty("Nenhum usuário disponível")}</td></tr>`}</tbody></table></div></section><aside class="native-card user-detail">${selected ? `<header><span class="large-avatar">${esc(selected.name.split(" ").map(p => p[0]).join("").slice(0, 2))}</span><div><strong>${esc(selected.name)}</strong><small>${esc(selected.role)} · ${esc(selected.department || "Sem equipe")}</small></div></header><dl><div><dt>ID</dt><dd>${esc(String(selected.id).slice(0, 14))}</dd></div><div><dt>E-mail</dt><dd>${esc(selected.email)}</dd></div></dl><h3>PERMISSÕES DO CARGO</h3>${Object.entries(selected.permissions || {}).length ? Object.entries(selected.permissions).map(([key, allowed]) => `<span class="permission ${allowed ? "allowed" : "denied"}">${allowed ? "✓" : "×"} ${esc(key)}</span>`).join("") : `<span class="permission allowed">✓ Regras padrão do perfil ${esc(selected.role)}</span>`}<h3>SEGURANÇA</h3><button class="btn secondary full" data-action="change-password">Redefinir acesso</button>` : empty("Selecione um usuário")}</aside></div>
    </div>`);
  }

  function renderSettings() {
    const profile = data().profile || {};
    page("settings", `<div class="native-settings-page">
      ${header("Configurações Globais", "Ajustes de parâmetros, unidades e segurança do OPSControl IA", badge(currentContext?.state?.config?.environment === "production" ? "Produção" : "Homologação", "success"))}
      <div class="settings-layout"><aside class="native-card settings-tabs"><button class="active">Geral</button><button>Notificações</button><button>Integrações</button><button>Backup</button><button>Sistema</button></aside><section class="native-card settings-panel"><h2>Parâmetros Gerais</h2><div class="settings-form-grid"><label>Nome da Planta Operacional<input value="B-Port LMP" readonly></label><label>Fuso Horário Local<select><option>UTC -03:00 (Brasília)</option></select></label></div><hr><h3>TABELA DE TURNOS OPERACIONAIS</h3><table class="native-table"><thead><tr><th>Turno</th><th>Horário de operação</th><th>Responsável</th></tr></thead><tbody><tr><td><strong>Turno A</strong></td><td>06:00 — 18:00</td><td>${esc(profile.name || "Usuário atual")}</td></tr><tr><td><strong>Turno B</strong></td><td>18:00 — 06:00</td><td>A definir</td></tr></tbody></table><hr><h2>Unidades de Medida</h2><div class="settings-form-grid"><label>Vazão de Óleo / Gás<select><option>bbl (Barril)</option></select></label><label>Densidade de Fluidos<select><option>ppg (Libra por Galão)</option></select></label><label>Massa de Carga<select><option>ton (Tonelada)</option></select></label><label>Pressão de Linha<select><option>psi (Libra-força por pol²)</option></select></label></div><hr><div class="settings-form-grid"><label>Idioma do Painel<select><option>Português (Brasil)</option></select></label><label>Tema da Interface<div class="theme-options"><button class="active">Escuro</button><button disabled>Claro</button></div></label></div><hr><div class="setting-toggle"><span><strong>Detecção Automática de Anomalias com IA</strong><small>Varredura contínua de parâmetros críticos.</small></span><input type="checkbox" checked></div><div class="setting-toggle"><span><strong>Notificações de Emergência via SMS/E-mail</strong><small>Disparo instantâneo em alertas críticos.</small></span><input type="checkbox" checked></div><footer><button class="btn secondary" data-action="backup-json">Gerar backup</button><button class="btn primary" data-action="sync-offline">Salvar alterações</button></footer></section></div>
    </div>`);
  }

  function tvHeader(title) {
    return `<header class="tv-native-header"><div><span>${svg("file")}</span><div><strong>OPSControl <em>IA</em></strong><small>Planta LMP — B-Port</small></div></div><h1>${esc(title)}</h1><div><strong>Turno A</strong><small>Resp: ${esc(data().profile?.name || "Operação")}</small></div><time><i></i>${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}<small>(ONLINE)</small></time></header>`;
  }

  function tvPersistent() {
    const alerts = criticalAlerts();
    const current = activeOperation();
    return `<footer class="tv-persistent-strip"><div class="tv-current-operation"><strong>OPERAÇÃO ATUAL:</strong><span>${current ? `${esc(current.service_order || current.activity)} · ${esc(current.vessel || current.client)} · ${Math.round(operationProgress(current))}%` : "Nenhuma operação em andamento"}</span></div><div class="tv-critical-persistent ${alerts.length ? "danger" : "success"}"><i></i><strong>${alerts.length} ALERTA(S) CRÍTICO(S)</strong></div></footer>`;
  }

  function renderTvOperation() {
    const current = activeOperation();
    if (!current) return `${tvHeader("PAINEL TV — OPERAÇÃO ATUAL")}${empty("Nenhuma operação ativa")}${tvPersistent()}`;
    const progress = operationProgress(current);
    const route = operationRoute(current);
    const predicted = current.flow_rate > 0 ? new Date(Date.now() + Math.max(0, current.planned - current.executed) / current.flow_rate * 3600000) : null;
    return `${tvHeader("PAINEL TV — OPERAÇÃO ATUAL")}<main class="tv-operation-grid"><article><header><span>ORDEM DE SERVIÇO ATIVA</span><strong>${esc(current.service_order || "SEM OS")}</strong>${badge(current.status, "info")}</header><div class="tv-facts"><span>CLIENTE<strong>${esc(current.client)}</strong></span><span>EMBARCAÇÃO<strong>${esc(current.vessel)}</strong></span><span>PRODUTO<strong class="amber-text">${esc(current.product)}</strong></span></div><div class="tv-progress-label"><strong>Progresso Geral: ${Math.round(progress)}%</strong><span>${integer.format(current.executed)} / ${integer.format(current.planned)} ${esc(current.unit)}</span></div><div class="native-progress"><i style="width:${progress}%"></i></div><div class="tv-big-metrics"><span>VAZÃO ATUAL<strong class="blue-text">${number.format(current.flow_rate)} <small>${esc(current.flow_rate_unit || `${current.unit}/h`)}</small></strong></span><span>PAUSAS<strong class="green-text">${finite(current.paused_minutes)} <small>min</small></strong></span><span>PREVISÃO TÉRMINO<strong class="amber-text">${predicted ? predicted.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—"}</strong></span></div></article><aside><h2>DIAGRAMA SIMPLIFICADO DE FLUXO</h2><div class="tv-flow"><span><i>${Math.round(pct(tankById(current.source_tank_id)?.volume, tankById(current.source_tank_id)?.capacity))}%</i><strong>${esc(route.source)}</strong><small>${esc(current.product)}</small></span><b></b><em>BOMBA ATIVA</em><b></b><span>${svg("ship")}<strong>${esc(route.destination)}</strong><small>Volume recebido: ${integer.format(current.executed)} ${esc(current.unit)}</small></span></div></aside></main>${tvPersistent()}`;
  }

  function renderTvTanks() {
    const tanks = arr(data().tanks).filter(item => !normalize(item.kind).includes("silo"));
    return `${tvHeader("PAINEL TV — MONITORAMENTO DE TANQUES")}<main class="tv-tank-page">${["Phase #1", "Phase #2"].map(phase => `<section><header><h2>${esc(phase.toUpperCase())}</h2><span>Capacidade total: ${integer.format(sum(tanks.filter(item => item.phase === phase), "capacity"))} bbl</span></header><div>${tanks.filter(item => item.phase === phase).map(item => { const percentage = pct(item.volume, item.capacity); return `<article class="${tone(tankStatus(item, percentage)[0])}"><i>${Math.round(percentage)}%</i><span><strong>${esc(item.name)}</strong><small>${integer.format(item.volume)} / ${integer.format(item.capacity)} ${esc(item.unit)}</small><em>${esc(item.product || "Vazio")}</em></span><b></b></article>`; }).join("") || empty("Sem tanques na fase")}</div></section>`).join("")}</main>${tvPersistent()}`;
  }

  function renderTvSilos() {
    const silos = arr(data().tanks).filter(item => normalize(item.kind).includes("silo"));
    const trucks = arr(data().trucks);
    const unloading = trucks.find(item => normalize(item.status).includes("descarga"));
    return `${tvHeader("PAINEL TV — SILOS E CARRETAS")}<main class="tv-silo-grid"><section><h2>ESTADO DOS SILOS GRANELEIROS</h2><div>${silos.map(item => `<article class="${tone(tankStatus(item, pct(item.volume, item.capacity))[0])}"><span>${esc(item.name)}</span><small>${esc(item.product || "Vazio")}</small><strong>${Math.round(pct(item.volume, item.capacity))}%</strong><em>${integer.format(item.volume)} ${esc(item.unit)}</em></article>`).join("") || empty("Sem silos cadastrados")}</div></section><aside><h2>FLUXO DE CARRETAS (HOJE)</h2><div class="tv-truck-kpis"><span>PREVISTAS<strong>${trucks.length}</strong></span><span>RECEBIDAS<strong class="green-text">${trucks.filter(item => normalize(item.status).includes("recebid")).length}</strong></span><span>EM DESCARGA<strong class="blue-text">${trucks.filter(item => normalize(item.status).includes("descarga")).length}</strong></span><span>AGUARDANDO<strong class="amber-text">${trucks.filter(item => normalize(item.status).includes("aguard")).length}</strong></span></div><h3>CARRETA EM DESCARGA ATUAL</h3>${unloading ? `<article class="tv-current-truck"><strong>${esc(unloading.plate || "Sem placa")}</strong><span>${esc(unloading.product || "Produto")}</span><b>${number.format(unloading.quantity)} ${esc(unloading.unit)}</b><div class="native-progress"><i style="width:45%"></i></div></article>` : empty("Nenhuma carreta em descarga")}</aside></main>${tvPersistent()}`;
  }

  function renderTvSchedule() {
    const vessels = vesselItems().filter(item => new Date(item.eta || item.etb || 0) >= new Date(Date.now() - 12 * 3600000)).slice(0, 4);
    const equipment = arr(data().equipment);
    const safetyDays = accidentFreeDays();
    return `${tvHeader("PAINEL TV — PROGRAMAÇÃO E MANUTENÇÃO")}<main class="tv-schedule-grid"><section><h2>PROGRAMAÇÃO OPERACIONAL — PRÓXIMAS 24H</h2>${vessels.length ? vessels.map(item => `<article><time>${item.eta ? new Date(item.eta).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—"}<small>PREVISTO</small></time><span><strong>${esc(item.vesselName)}</strong><small>${esc(item.product || item.operationType || "—")} · ${integer.format(item.plannedQuantity)} ${esc(item.unit)}</small></span><b>${badge(item.status)}</b></article>`).join("") : empty("Sem programação nas próximas 24h")}</section><aside><article><h2>ESTADO DE EQUIPAMENTOS CRÍTICOS</h2><div class="tv-equipment-totals"><span>${equipment.filter(item => !isCritical(item.status)).length} OPERACIONAIS</span><span>${equipment.filter(item => isCritical(item.status) || normalize(item.status).includes("manutenc")).length} INDISPONÍVEIS</span></div>${equipment.slice(0, 4).map(item => `<div class="tv-equipment-row"><strong>${esc(item.name)}</strong><span>${esc(item.status)}</span></div>`).join("") || empty("Sem equipamentos")}</article><article class="tv-qhse"><h2>SEGURANÇA E QHSE</h2><strong>${safetyDays === null ? "—" : integer.format(safetyDays)}<small>${safetyDays === null ? "SEM MARCO QHSE" : "DIAS SEM ACIDENTES"}</small></strong><p>${safetyDays === null ? "Indicador aguardando o primeiro registro." : "Indicador calculado pelos registros QHSE."}</p></article></aside></main>${tvPersistent()}`;
  }

  function renderTv() {
    const slide = finite(currentContext?.state?.tv?.slide) % 4;
    page("tv", `<div class="native-tv" data-tv-native-slide="${slide}">${[renderTvOperation, renderTvTanks, renderTvSilos, renderTvSchedule][slide]()}</div>`);
  }

  function renderQuality() {
    const issues = [];
    arr(data().tanks).forEach(item => {
      if (!item.updated_at || Date.now() - new Date(item.updated_at).getTime() > 30 * 60000) issues.push({ title: `${item.name} sem atualização recente`, module: "Tancagem", status: "Atenção" });
      if (item.volume > 0 && !item.product) issues.push({ title: `${item.name} possui saldo sem produto`, module: "Tancagem", status: "Crítico" });
    });
    arr(data().operations).forEach(item => { if (!item.responsible_id) issues.push({ title: `${item.service_order || item.activity} sem responsável`, module: "Operações", status: "Atenção" }); });
    page("quality", `<div class="native-secondary-page">${header("Qualidade dos Dados", "Conciliação e integridade dos registros", `<button class="btn primary" data-export="quality">Exportar pendências</button>`)}<section class="secondary-kpis"><article><span>Registros analisados</span><strong>${arr(data().tanks).length + arr(data().operations).length}</strong></article><article><span>Pendências</span><strong>${issues.length}</strong></article><article><span>Conformidade</span><strong>${Math.max(0, 100 - issues.length)}%</strong></article></section><section class="native-card generic-list">${issues.length ? issues.map(item => `<article>${svg("alert")}<div><strong>${esc(item.title)}</strong><small>${esc(item.module)}</small></div>${badge(item.status)}</article>`).join("") : empty("Dados operacionais conformes", "Nenhuma inconsistência automática foi localizada.")}</section></div>`);
  }

  function renderSanitation() {
    const orphanMovements = arr(data().tankMovements).filter(item => item.source_tank_id && !tankById(item.source_tank_id) || item.destination_tank_id && !tankById(item.destination_tank_id));
    page("sanitation", `<div class="native-secondary-page">${header("Saneamento de Dados", "Correções seguras sem alterar saldos existentes")}<section class="native-card generic-list">${orphanMovements.length ? orphanMovements.map(item => `<article>${svg("network")}<div><strong>Movimentação com vínculo incompleto</strong><small>${esc(item.reference || item.id)}</small></div>${badge("Revisar")}</article>`).join("") : empty("Nenhum vínculo órfão encontrado")}</section></div>`);
  }

  function renderChemicalCatalog() {
    const fluids = arr(data().fluids);
    page("chemical-catalog", `<div class="native-secondary-page">${header("Catálogo de Fluidos e Granéis", "Produtos oficiais usados nas operações e ativos", `${actionButton("Novo fluido", "new-fluid", "primary", "network")}${actionButton("Novo granel", "new-bulk", "secondary", "package")}`)}<section class="catalog-native-grid">${fluids.length ? fluids.map(item => `<article class="native-card"><header>${svg(["granel", "insumo"].includes(normalize(item.type)) ? "package" : "tank")}${badge(item.active ? "Ativo" : "Inativo", item.active ? "success" : "danger")}</header><h3>${esc(item.name)}</h3><p>${esc(item.type || "Sem categoria")}</p><dl><div><dt>Unidade</dt><dd>${esc(item.unit || "—")}</dd></div><div><dt>Densidade</dt><dd>${item.density ? `${number.format(item.density)} ${esc(item.densityUnit)}` : "—"}</dd></div></dl></article>`).join("") : empty("Nenhum produto no catálogo")}</section></div>`);
  }

  function renderChemicals() {
    const items = arr(data().chemicals);
    page("chemicals", `<div class="native-secondary-page">${header("Inventário Químico", "Lotes, validade, localização e saldo por produto", actionButton("Novo produto", "new-chemical-product", "primary", "package"))}<section class="native-table-card"><div class="native-table-scroll"><table class="native-table"><thead><tr><th>Produto</th><th>Lote</th><th>Saldo</th><th>Mínimo</th><th>Validade</th><th>Localização</th><th>Status</th></tr></thead><tbody>${items.length ? items.map(item => `<tr><td><strong>${esc(item.name)}</strong><small>${esc(item.category || "")}</small></td><td>${esc(item.lot || "—")}</td><td>${number.format(item.quantity)} ${esc(item.unit)}</td><td>${number.format(item.minimum)} ${esc(item.unit)}</td><td>${dateOnly(item.expiry_date)}</td><td>${esc(item.location || "—")}</td><td>${badge(item.quantity <= item.minimum ? "Baixo estoque" : item.status)}</td></tr>`).join("") : `<tr><td colspan="7">${empty("Nenhum lote químico cadastrado")}</td></tr>`}</tbody></table></div></section></div>`);
  }

  function renderClientTickets() {
    const tickets = arr(data().clientTickets);
    page("client-tickets", `<div class="native-secondary-page">${header("Tickets de Clientes", "FDT, FRT, MDT e MRT por operação", actionButton("Novo ticket", "new-client-ticket", "primary", "file"))}<section class="catalog-native-grid">${tickets.length ? tickets.map(item => { const docs = arr(data().clientTicketDocuments).filter(doc => doc.ticketId === item.id); return `<article class="native-card"><header><strong>${esc(item.ticketNumber || "Sem número")}</strong>${badge(item.status)}</header><h3>${esc(item.title)}</h3><p>${esc(item.client)} · ${esc(item.vessel || item.serviceOrder || "—")}</p><div class="ticket-doc-progress"><i><em style="width:${pct(docs.length, item.requiredTypes?.length || 4)}%"></em></i><span>${docs.length}/${item.requiredTypes?.length || 4} documentos</span></div><button class="btn secondary full" data-edit-client-ticket="${esc(item.id)}">Abrir ticket</button></article>`; }).join("") : empty("Nenhum ticket cadastrado")}</section></div>`);
  }

  function renderCertificates() {
    const items = arr(data().certificates);
    page("certificates", `<div class="native-secondary-page">${header("Certificados da Equipe", "Validades e conformidade dos colaboradores", actionButton("Adicionar certificado", "new-certificate", "primary", "file"))}<section class="native-table-card"><div class="native-table-scroll"><table class="native-table"><thead><tr><th>Certificado</th><th>Colaborador</th><th>Emissor</th><th>Emissão</th><th>Validade</th><th>Status</th></tr></thead><tbody>${items.length ? items.map(item => `<tr><td><strong>${esc(item.title)}</strong></td><td>${esc(item.owner || profileName(item.user_id))}</td><td>${esc(item.issuer || "—")}</td><td>${dateOnly(item.issued_at)}</td><td>${dateOnly(item.expires_at)}</td><td>${badge(item.status)}</td></tr>`).join("") : `<tr><td colspan="6">${empty("Nenhum certificado cadastrado")}</td></tr>`}</tbody></table></div></section></div>`);
  }

  function renderAudit() {
    const logs = arr(data().auditLogs);
    page("audit", `<div class="native-secondary-page">${header("Histórico de Alterações", "Auditoria das ações críticas no sistema", `<button class="btn primary" data-export="audit">Exportar</button>`)}<section class="native-table-card"><div class="native-table-scroll"><table class="native-table"><thead><tr><th>Data</th><th>Usuário</th><th>Tabela</th><th>Ação</th><th>Registro</th></tr></thead><tbody>${logs.length ? logs.map(item => `<tr><td>${isoTime(item.created_at)}</td><td>${esc(profileName(item.changed_by))}</td><td>${esc(item.table_name)}</td><td>${badge(item.action)}</td><td class="mono">${esc(String(item.record_id || "—").slice(0, 12))}</td></tr>`).join("") : `<tr><td colspan="5">${empty("Nenhum evento de auditoria disponível")}</td></tr>`}</tbody></table></div></section></div>`);
  }

  const renderers = {
    dashboard: renderDashboard,
    tanks: renderTanks,
    operations: renderOperations,
    "vessel-registry": renderVessels,
    trucks: renderTrucks,
    fluids: () => renderMovements("fluid"),
    "bulk-movements": () => renderMovements("bulk"),
    inventory: renderInventory,
    maintenance: renderMaintenance,
    qhse: renderQhse,
    dds: renderDds,
    documents: renderDocuments,
    reports: renderReports,
    handover: renderHandover,
    alerts: renderAlerts,
    users: renderUsers,
    settings: renderSettings,
    tv: renderTv,
    quality: renderQuality,
    sanitation: renderSanitation,
    "chemical-catalog": renderChemicalCatalog,
    chemicals: renderChemicals,
    "client-tickets": renderClientTickets,
    certificates: renderCertificates,
    audit: renderAudit
  };

  function renderPage(id, context = currentContext) {
    if (context) currentContext = context;
    const renderer = renderers[id];
    if (!renderer || !currentContext?.state?.data) return false;
    renderer();
    return true;
  }

  function renderAll(context) {
    currentContext = context;
    Object.entries(renderers).forEach(([id, renderer]) => {
      try { renderer(); }
      catch (error) {
        console.error(`Falha no renderer nativo ${id}:`, error);
        page(id, `<div class="native-secondary-page">${header("Módulo indisponível", "Uma inconsistência isolada impediu a exibição.")}<div class="native-card module-error-card"><strong>${esc(error.message || "Erro desconhecido")}</strong><button class="btn primary" data-action="refresh">Tentar novamente</button></div></div>`);
      }
    });
    const count = document.getElementById("alertCount");
    if (count) count.textContent = String(allAlerts().filter(item => item.read !== true).length);
  }

  function assistantContext() {
    const operation = activeOperation();
    const assets = arr(data().tanks);
    return {
      flow: finite(operation?.flow_rate),
      flowUnit: operation?.flow_rate_unit || `${operation?.unit || "bbl"}/h`,
      availableAssets: assets.filter(item => !isCritical(item.status)).length,
      totalAssets: assets.length,
      operation: operation ? `${operation.service_order || operation.activity} · ${operation.vessel || operation.client}` : "Nenhuma operação em andamento",
      criticalAlerts: criticalAlerts().length
    };
  }

  function applyTankFilters() {
    const activeTab = document.querySelector("[data-native-tank-tab].active");
    const availableOnly = Boolean(document.querySelector("[data-native-tank-availability].active"));
    const phase = activeTab?.dataset.nativeTankTab || "all";
    const product = document.querySelector('[data-tank-filter="product"]')?.value || "";
    const status = document.querySelector('[data-tank-filter="status"]')?.value || "";
    document.querySelectorAll("[data-native-phase]").forEach(section => {
      const phaseMatches = phase === "all" || section.dataset.nativePhase === phase;
      let visibleCards = 0;
      section.querySelectorAll(".native-asset-card").forEach(card => {
        const availableMatches = !availableOnly || ["disponivel", "operacional", "livre"].some(value => card.dataset.tankStatus.includes(value));
        const productMatches = !product || card.dataset.tankProduct === product;
        const statusMatches = !status || card.dataset.tankStatus.includes(status);
        const visible = phaseMatches && availableMatches && productMatches && statusMatches;
        card.hidden = !visible;
        if (visible) visibleCards += 1;
      });
      section.hidden = !phaseMatches || visibleCards === 0;
    });
  }

  function applyDocumentFilters() {
    const query = normalize(document.querySelector('[data-document-filter="query"]')?.value);
    const category = document.querySelector("[data-document-category].active")?.dataset.documentCategory || "all";
    const status = document.querySelector('[data-document-filter="status"]')?.value || "";
    let visibleCards = 0;
    document.querySelectorAll("[data-document-card]").forEach(card => {
      const visible = (!query || card.dataset.documentSearch.includes(query))
        && (category === "all" || card.dataset.documentCategoryValue.includes(category))
        && (!status || card.dataset.documentStatusValue.includes(status));
      card.hidden = !visible;
      if (visible) visibleCards += 1;
    });
    const emptyState = document.querySelector(".document-filter-empty");
    if (emptyState) emptyState.hidden = visibleCards > 0;
  }

  document.addEventListener("click", event => {
    const tab = event.target.closest("[data-native-tank-tab]");
    if (tab) {
      document.querySelectorAll("[data-native-tank-tab], [data-native-tank-availability]").forEach(button => button.classList.toggle("active", button === tab));
      applyTankFilters();
      return;
    }
    const availability = event.target.closest("[data-native-tank-availability]");
    if (availability) {
      document.querySelectorAll("[data-native-tank-tab], [data-native-tank-availability]").forEach(button => button.classList.toggle("active", button === availability));
      applyTankFilters();
      return;
    }
    const tankView = event.target.closest("[data-tank-view]");
    if (tankView) {
      const view = tankView.dataset.tankView;
      document.querySelectorAll("[data-tank-view]").forEach(button => {
        const active = button === tankView;
        button.classList.toggle("active", active);
        button.setAttribute("aria-selected", String(active));
      });
      document.querySelectorAll("[data-tank-panel]").forEach(panel => { panel.hidden = panel.dataset.tankPanel !== view; });
      return;
    }
    const weekButton = event.target.closest("[data-vessel-week]");
    if (weekButton) {
      const direction = Number(weekButton.dataset.vesselWeek);
      vesselWeekOffset = direction === 0 ? 0 : vesselWeekOffset + direction;
      renderVessels();
      return;
    }
    const vesselJump = event.target.closest("[data-vessel-jump]");
    if (vesselJump) {
      const mode = vesselJump.dataset.vesselJump;
      document.querySelectorAll(".schedule-toolbar [data-vessel-jump]").forEach(button => button.classList.toggle("active", button.dataset.vesselJump === mode));
      document.querySelectorAll("[data-vessel-section]").forEach(section => {
        section.hidden = mode === "timeline" ? section.dataset.vesselSection === "agenda" : section.dataset.vesselSection !== mode;
      });
      const target = document.querySelector(`[data-vessel-section="${mode === "timeline" ? "timeline" : mode}"]`);
      target?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
      return;
    }
    const documentCategory = event.target.closest("[data-document-category]");
    if (documentCategory) {
      document.querySelectorAll("[data-document-category]").forEach(button => button.classList.toggle("active", button === documentCategory));
      applyDocumentFilters();
      return;
    }
    const alert = event.target.closest("[data-native-alert-id]");
    if (alert) {
      selectedAlertId = alert.dataset.nativeAlertId;
      renderAlerts();
    }
  });

  document.addEventListener("change", event => {
    if (event.target.matches("[data-tank-filter]")) applyTankFilters();
    if (event.target.matches("[data-document-filter]")) applyDocumentFilters();
  });

  document.addEventListener("input", event => {
    if (event.target.matches('[data-document-filter="query"]')) applyDocumentFilters();
  });

  window.OpsControlNativeUI = Object.freeze({ renderAll, renderPage, renderTv: context => renderPage("tv", context), assistantContext });
})();
