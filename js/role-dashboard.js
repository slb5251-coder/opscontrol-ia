(() => {
  "use strict";

  const DASHBOARD = "#page-dashboard";
  let scheduled = false;
  let lastSignature = "";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clean = value => String(value ?? "").replace(/\s+/g, " ").trim();
  const normalized = value => clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const esc = value => clean(value).replace(/[&<>'"]/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[char]));

  function currentRole() {
    const value = normalized($("#userRole")?.textContent || "");
    if (/lider/.test(value)) return "lider";
    if (/operador|usuario|user/.test(value)) return "operador";
    if (/logistica|materiais|almoxarif/.test(value)) return "logistica";
    if (/mecanico|manutencao/.test(value)) return "mecanico";
    if (/qhse|hse|seguranca/.test(value)) return "qhse";
    if (/supervisor/.test(value)) return "supervisor";
    if (/admin/.test(value)) return "admin";
    return "supervisor";
  }

  function firstName() {
    return clean($("#userName")?.textContent || "Equipe").split(" ")[0] || "Equipe";
  }

  function metricFrom(rootSelector, labelPattern, fallback = "—") {
    const root = $(rootSelector);
    if (!root) return fallback;
    const candidates = $$([
      ".figma-kpi", ".stat-card", ".pro-stat", ".role-home-metrics>button",
      ".dashboard-attention-item", ".card", "article"
    ].join(","), root);
    const card = candidates.find(item => labelPattern.test(normalized(item.textContent)));
    if (!card) return fallback;
    const value = card.querySelector("h2,strong,b")?.textContent;
    return clean(value || fallback);
  }

  const dashboardMetric = (labelPattern, fallback = "—") => metricFrom(DASHBOARD, labelPattern, fallback);
  const pageMetric = (page, labelPattern, fallback = "—") => metricFrom(`#page-${page}`, labelPattern, fallback);

  function icon(name) {
    const paths = {
      anchor: '<path d="M12 3v15"></path><path d="M8 7l4-4 4 4"></path><path d="M5 21h14"></path><path d="M4 17c2.5 0 3.5 1 5 1s2.5-1 4-1 2.5 1 4 1 2.5-1 3-1"></path>',
      tank: '<path d="M7 4h10"></path><path d="M7 20h10"></path><path d="M8 4v16"></path><path d="M16 4v16"></path><path d="M8 9h8"></path><path d="M8 15h8"></path>',
      file: '<path d="M8 3h8l5 5v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"></path><path d="M16 3v5h5"></path><path d="M9 13h6"></path><path d="M9 17h4"></path>',
      truck: '<path d="M3 6h11v9H3z"></path><path d="M14 9h3l4 4v2h-7z"></path><circle cx="7.5" cy="18" r="1.5"></circle><circle cx="17.5" cy="18" r="1.5"></circle>',
      flask: '<path d="M10 2v7.5L5 18a3 3 0 0 0 2.6 4.5h8.8A3 3 0 0 0 19 18l-5-8.5V2"></path><path d="M8 2h8"></path><path d="M8.5 14h7"></path>',
      wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.3 2.3-2-2z"></path>',
      shield: '<path d="M12 3l7 3v5c0 4.5-3 8.7-7 10-4-1.3-7-5.5-7-10V6l7-3z"></path><path d="M8.5 12l2.2 2.2 4.8-5"></path>',
      alert: '<path d="M12 3 2.8 20h18.4L12 3z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path>',
      chart: '<path d="M4 20V10"></path><path d="M10 20V4"></path><path d="M16 20v-7"></path><path d="M22 20H2"></path>',
      audit: '<ellipse cx="12" cy="5" rx="8" ry="3"></ellipse><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"></path><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"></path>'
    };
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.chart}</svg>`;
  }

  function profile(role) {
    const activeOps = dashboardMetric(/operacoes ativas/);
    const alerts = dashboardMetric(/alertas criticos/);
    const volume = dashboardMetric(/volume armazenado/);
    const docs = dashboardMetric(/docs vencendo|documentos vencendo/);
    const profiles = {
      operador: {
        eyebrow:"PAINEL DO TURNO", title:`Bom turno, ${firstName()}`, tone:"blue",
        subtitle:"Acompanhe a execução, registre movimentações e entregue o turno com os controles atualizados.",
        metrics:[["Operações ativas",activeOps,"operations"],["Volume armazenado",volume,"tanks"],["Pendências do turno",pageMetric("reports",/pendencias/),"reports"]],
        actions:[["new-operation","Registrar operação","Atualizar início, volume ou conclusão","anchor","action"],["tanks","Consultar tancagem","Conferir produto, lote e saldo","tank","page"],["reports","Passagem de turno","Checklist, atividades e pendências","file","page"]],
        priorities:["Operações ativas","Volume armazenado","Alertas críticos"]
      },
      lider: {
        eyebrow:"COMANDO DO TURNO", title:"Painel do líder de equipe", tone:"indigo",
        subtitle:"Priorize operações, pendências, qualidade dos registros e a entrega segura do próximo turno.",
        metrics:[["Operações ativas",activeOps,"operations"],["Alertas críticos",alerts,"alerts"],["Qualidade dos dados",pageMetric("quality",/inconsistencias|qualidade dos dados/),"quality"]],
        actions:[["new-operation","Nova operação","Programar e distribuir a tancagem","anchor","action"],["reports","Preparar passagem","Revisar checklist e pendências","file","page"],["quality","Conferir lançamentos","Corrigir inconsistências antes do fechamento","shield","page"]],
        priorities:["Operações ativas","Alertas críticos","Docs vencendo"]
      },
      logistica: {
        eyebrow:"CENTRAL LOGÍSTICA", title:"Painel de logística e materiais", tone:"green",
        subtitle:"Controle carretas, notas fiscais, lotes, inventários e documentação de recebimento e expedição.",
        metrics:[["Carretas hoje",pageMetric("trucks",/carretas hoje|movimentacoes hoje|registros hoje/),"trucks"],["Estoque baixo",pageMetric("chemicals",/estoque baixo|abaixo do minimo|criticos/),"chemicals"],["Documentos vencendo",docs,"certificates"]],
        actions:[["new-truck","Movimentar carreta","Registrar entrada, saída, NF e lote","truck","action"],["chemicals","Inventário químico","Saldo, validade e rastreabilidade","flask","page"],["quality","Conferir documentos","Validar NF, lote e campos obrigatórios","shield","page"]],
        priorities:["Volume armazenado","Docs vencendo","Alertas críticos"]
      },
      mecanico: {
        eyebrow:"CENTRAL DE MANUTENÇÃO", title:"Painel da manutenção", tone:"amber",
        subtitle:"Acompanhe equipamentos indisponíveis, ordens de serviço, horímetros e programação preventiva.",
        metrics:[["OS abertas",pageMetric("maintenance",/os abertas|ordens abertas|abertas/),"maintenance"],["Equipamentos parados",pageMetric("maintenance",/equipamentos parados|indisponiveis|parados/),"maintenance"],["Alertas críticos",alerts,"alerts"]],
        actions:[["new-maintenance-order","Abrir ordem de serviço","Registrar falha ou manutenção preventiva","wrench","action"],["maintenance","Ver equipamentos","Horímetro, condição e programação","chart","page"],["reports","Pendências recebidas","Itens deixados pelo turno anterior","file","page"]],
        priorities:["Alertas críticos","Operações ativas","Docs vencendo"]
      },
      qhse: {
        eyebrow:"GESTÃO QHSE", title:"Painel de segurança e conformidade", tone:"red",
        subtitle:"Monitore riscos, ações, inspeções, certificados e registros que exigem tratamento.",
        metrics:[["Ações pendentes",pageMetric("qhse",/acoes pendentes|pendentes/),"qhse"],["Alertas críticos",alerts,"alerts"],["Documentos vencendo",docs,"certificates"]],
        actions:[["new-qhse","Novo registro QHSE","Risco, inspeção, DDS ou ocorrência","shield","action"],["qhse","Acompanhar ações","Responsáveis, prazos e evidências","alert","page"],["quality","Ver conformidade","Campos obrigatórios e rastreabilidade","file","page"]],
        priorities:["Alertas críticos","Docs vencendo","Operações ativas"]
      },
      supervisor: {
        eyebrow:"VISÃO GERENCIAL", title:"Painel da supervisão", tone:"navy",
        subtitle:"Decisões sobre produtividade, riscos, qualidade operacional e desempenho da planta.",
        metrics:[["Operações ativas",activeOps,"operations"],["Alertas críticos",alerts,"alerts"],["Inconsistências",pageMetric("quality",/inconsistencias|criticas|problemas/),"quality"]],
        actions:[["reports","Relatórios gerenciais","Indicadores, fechamento e passagem","chart","page"],["quality","Qualidade e conciliação","Validar dados antes do fechamento","shield","page"],["audit","Auditoria completa","Quem alterou cada registro e quando","audit","page"]],
        priorities:["Operações ativas","Alertas críticos","Volume armazenado"]
      },
      admin: {
        eyebrow:"ADMINISTRAÇÃO", title:"Visão administrativa do sistema", tone:"navy",
        subtitle:"Acompanhe operação, qualidade, usuários, auditoria e integridade geral dos dados.",
        metrics:[["Operações ativas",activeOps,"operations"],["Alertas críticos",alerts,"alerts"],["Documentos vencendo",docs,"certificates"]],
        actions:[["quality","Qualidade dos dados","Revisar inconsistências e conciliação","shield","page"],["audit","Auditoria","Alterações, autores e horários","audit","page"],["settings","Configurações","Perfis, permissões e parâmetros","chart","page"]],
        priorities:["Alertas críticos","Operações ativas","Docs vencendo"]
      }
    };
    return profiles[role] || profiles.supervisor;
  }

  function actionHtml([target,label,description,iconName,type]) {
    const attribute = type === "action" ? `data-action="${esc(target)}"` : `data-page-link="${esc(target)}"`;
    return `<button type="button" class="role-dashboard-action" ${attribute}><span>${icon(iconName)}</span><div><strong>${esc(label)}</strong><small>${esc(description)}</small></div><b>›</b></button>`;
  }

  function metricHtml([label,value,page]) {
    return `<button type="button" class="role-dashboard-metric" data-page-link="${esc(page)}"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>Abrir módulo</small></button>`;
  }

  function reorderKpis(page, priorities) {
    const grid = $(".figma-kpi-grid", page);
    if (!grid) return;
    const cards = $$(".figma-kpi", grid);
    const priorityCards = priorities.map(title => cards.find(card => normalized(card.querySelector(".figma-kpi-head span")?.textContent) === normalized(title))).filter(Boolean);
    const desired = [...priorityCards, ...cards.filter(card => !priorityCards.includes(card))];
    desired.forEach((card,index) => {
      const current = grid.children[index];
      if (current !== card) grid.insertBefore(card, current || null);
    });
    cards.forEach(card => card.classList.toggle("role-priority-kpi", priorityCards.includes(card)));
  }

  function enhance() {
    scheduled = false;
    const page = $(DASHBOARD);
    const dashboard = $(".figma-dashboard", page);
    if (!page || !dashboard) return;
    const role = currentRole();
    const data = profile(role);
    const signature = `${role}|${data.metrics.map(item => item[1]).join("|")}|${clean($("#userName")?.textContent)}`;
    const existing = $(".role-dashboard-home", dashboard);
    if (existing && lastSignature === signature) {
      reorderKpis(page, data.priorities);
      return;
    }
    existing?.remove();
    const panel = document.createElement("section");
    panel.className = `role-dashboard-home role-dashboard-${role} tone-${data.tone}`;
    panel.innerHTML = `<div class="role-dashboard-hero"><div class="role-dashboard-copy"><span>${esc(data.eyebrow)}</span><h2>${esc(data.title)}</h2><p>${esc(data.subtitle)}</p></div><div class="role-dashboard-identity"><small>Perfil ativo</small><strong>${esc(clean($("#userRole")?.textContent || role))}</strong><i></i></div></div><div class="role-dashboard-body"><div class="role-dashboard-metrics">${data.metrics.map(metricHtml).join("")}</div><div class="role-dashboard-actions">${data.actions.map(actionHtml).join("")}</div></div>`;
    dashboard.prepend(panel);
    dashboard.dataset.roleDashboard = role;
    reorderKpis(page, data.priorities);
    lastSignature = signature;
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(enhance);
  }

  function start() {
    schedule();
    const dashboard = $(DASHBOARD);
    if (dashboard) new MutationObserver(schedule).observe(dashboard, { childList:true, subtree:true });
    [$("#userRole"), $("#userName")].filter(Boolean).forEach(element => new MutationObserver(schedule).observe(element, { childList:true, subtree:true, characterData:true }));
    document.addEventListener("opscontrol:interface-ready", schedule);
    [120,450,1000].forEach(delay => setTimeout(schedule, delay));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once:true });
  else start();
})();
