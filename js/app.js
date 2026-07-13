(() => {
  "use strict";

  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const DEMO_KEY = "opscontrol_v2_demo";
  const CONFIG_KEY = "opscontrol_v2_config";
  const fmt = n => new Intl.NumberFormat("pt-BR",{maximumFractionDigits:1}).format(Number(n||0));
  const now = () => new Date().toISOString();
  const uid = p => `${p}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const esc = v => String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

  const defaults = {
    profile:{name:"João Victor",role:"Administrador",email:"demo@opscontrol.local"},
    fluids:[
      {id:"f1",name:"WB Premix 9.0 ppg",type:"WBM",active:true},
      {id:"f2",name:"Brine NaCl 9.9 ppg",type:"Brine",active:true},
      {id:"f3",name:"SBM Rheliant 9.6 ppg",type:"SBM",active:true},
      {id:"f4",name:"Olefina",type:"Olefina",active:true},
      {id:"f5",name:"Barita",type:"Granel",active:true},
      {id:"f6",name:"Bentonita",type:"Granel",active:true},
      {id:"f7",name:"Calcita",type:"Granel",active:true}
    ],
    tanks:[],
    operations:[
      {id:"o1",client:"Petrobras",vessel:"PSV Atlântico",activity:"Bombeio",product:"Brine NaCl 9.9 ppg",planned:1200,executed:780,unit:"bbl",status:"Em andamento",start_at:"2026-07-13T07:00"},
      {id:"o2",client:"PRIO",vessel:"Wahoo Support",activity:"Bombeio",product:"Barita",planned:120,executed:0,unit:"ton",status:"Programada",start_at:"2026-07-14T07:00"},
      {id:"o3",client:"Equinor",vessel:"AHTS Horizon",activity:"Fabricação",product:"WB Premix 9.0 ppg",planned:800,executed:800,unit:"bbl",status:"Concluída",start_at:"2026-07-12T08:00"}
    ],
    trucks:[
      {id:"tr1",date:"2026-07-13",movement:"Entrada",supplier:"Brasco",product:"Olefina",quantity:25,unit:"m³",plate:"ABC1D23",invoice:"1238",status:"Recebida"},
      {id:"tr2",date:"2026-07-12",movement:"Entrada",supplier:"Fornecedor Bulk",product:"Barita",quantity:30,unit:"ton",plate:"XYZ9F88",invoice:"9871",status:"Recebida"}
    ],
    qhse:[
      {id:"q1",date:"2026-07-13",type:"DDS",title:"Bloqueio e etiquetagem - LOTO",responsible:"João Victor",severity:"Baixa",status:"Concluído"},
      {id:"q2",date:"2026-07-13",type:"Inspeção",title:"Mangueiras e conexões Fig. 206",responsible:"Carlos Lima",severity:"Média",status:"Em andamento"}
    ],
    equipment:[
      {id:"e1",name:"Motor a diesel #01",category:"Motor a diesel",status:"Operando",hourmeter:1220,last_hours:12,diesel_initial:340,refueled:0,diesel_final:160},
      {id:"e2",name:"Bomba centrífuga #02",category:"Bomba",status:"Manutenção",hourmeter:840,last_hours:0,diesel_initial:0,refueled:0,diesel_final:0},
      {id:"e3",name:"Compressor #01",category:"Compressor",status:"Parado",hourmeter:134,last_hours:0,diesel_initial:0,refueled:0,diesel_final:0}
    ],
    certificates:[
      {id:"c1",title:"NR-33 Espaço Confinado",owner:"João Victor",expires_at:"2026-08-20",status:"Válido"},
      {id:"c2",title:"NR-35 Trabalho em Altura",owner:"João Victor",expires_at:"2026-11-10",status:"A vencer"}
    ],
    alerts:[
      {id:"a1",title:"Motor a diesel #01",message:"Consumo médio acima de 14 L/h.",level:"Atenção",target:"Mecânica",created_at:"2026-07-13T12:10",read:false},
      {id:"a2",title:"Certificado a vencer",message:"NR-33 vence em menos de 60 dias.",level:"Informativo",target:"João Victor",created_at:"2026-07-13T09:20",read:false}
    ],
    messages:[
      {id:"m1",sender:"João Victor",text:"Equipe, validar o motor #01 após o bombeio.",created_at:"2026-07-13T12:20",mine:true},
      {id:"m2",sender:"Mecânica",text:"Recebido. Vamos realizar a inspeção.",created_at:"2026-07-13T12:24",mine:false}
    ]
  };

  function buildTanks(){
    const arr=[], add=(name,phase,kind,capacity,order)=>arr.push({id:`tank-${name}`,name,phase,kind,capacity,volume:0,product:"",lot:"",status:"Disponível",order});
    add("M-01","Phase #1","Mix Tank",500,1); add("M-02","Phase #1","Mix Tank",500,2);
    for(let i=1;i<=18;i++) add(`TK-${String(i).padStart(2,"0")}`,"Phase #1","Tanque",1000,10+i);
    for(let i=1;i<=5;i++) add(`SILO ${i}`,"Phase #1","Silo",150,50+i);
    add("M-03","Phase #2","Mix Tank",500,101); add("M-04","Phase #2","Mix Tank",500,102);
    for(let i=1;i<=15;i++) add(`TK-S${String(i).padStart(2,"0")}`,"Phase #2","Tanque",1500,110+i);
    ["A","B","C","D"].forEach((x,i)=>add(`SILO ${x}`,"Phase #2","Silo",150,151+i));
    const fill={
      "M-01":["Brine NaCl 9.9 ppg","BRN-1307",320,"Liberado"],
      "TK-01":["Brine NaCl 9.9 ppg","BRN-1207",850,"Liberado"],
      "TK-02":["WB Premix 9.0 ppg","WBM-1107",710,"Liberado"],
      "TK-03":["Glydril 9.7 ppg","GLY-1007",500,"Bloqueado"],
      "M-03":["SBM Rheliant 9.6 ppg","SBM-1307",420,"Liberado"],
      "TK-S01":["SBM Rheliant 9.6 ppg","SBM-1207",1200,"Liberado"],
      "TK-S02":["Olefina","OLF-1207",1170,"Liberado"],
      "SILO 1":["Barita","BAR-1307",120,"Disponível"],
      "SILO A":["Barita","BAR-1207",95,"Disponível"]
    };
    arr.forEach(t=>{if(fill[t.name])[t.product,t.lot,t.volume,t.status]=fill[t.name]});
    return arr;
  }
  defaults.tanks=buildTanks();

  const state={mode:"real",client:null,user:null,data:null,page:"dashboard",config:loadConfig(),realtimeChannel:null,realtimeBusy:false};
  function loadConfig(){
    const base=window.OPSCONTROL_CONFIG||{};
    try{return {...{url:base.supabaseUrl||"",key:base.supabaseKey||""},...JSON.parse(localStorage.getItem(CONFIG_KEY)||"{}")}}
    catch{return {url:base.supabaseUrl||"",key:base.supabaseKey||""}}
  }
  function demoData(){
    try{return JSON.parse(localStorage.getItem(DEMO_KEY))||JSON.parse(JSON.stringify(defaults))}
    catch{return JSON.parse(JSON.stringify(defaults))}
  }
  function saveDemo(){localStorage.setItem(DEMO_KEY,JSON.stringify(state.data))}
  function configured(){return !!(state.config.url&&state.config.key)}
  function badge(text){
    const s=String(text||"").toLowerCase();
    let c="neutral";
    if(["conclu","liberado","válido","ativo","recebida","operando","disponível"].some(x=>s.includes(x)))c="green";
    else if(["andamento","programada","atenção","a vencer","manutenção","média"].some(x=>s.includes(x)))c="amber";
    else if(["bloqueado","parado","crítico","vencido","alta"].some(x=>s.includes(x)))c="red";
    else if(s.includes("wbm"))c="blue";
    return `<span class="badge ${c}">${esc(text||"-")}</span>`;
  }
  function dateOnly(v){if(!v)return"-";return new Date(String(v).slice(0,10)+"T12:00").toLocaleDateString("pt-BR")}
  function dateTime(v){if(!v)return"-";return new Date(v).toLocaleString("pt-BR")}
  function toast(msg){const d=document.createElement("div");d.className="toast";d.textContent=msg;$("#toastContainer").append(d);setTimeout(()=>d.remove(),3200)}
  function showMessage(msg){$("#loginMessage").textContent=msg;$("#loginMessage").classList.remove("hidden")}

  async function initClient(){
    if(!configured()||!window.supabase)return null;
    state.client=window.supabase.createClient(state.config.url,state.config.key);
    return state.client;
  }

  async function realLogin(){
    const email=$("#loginEmail").value.trim(),password=$("#loginPassword").value;
    if(!configured())return showMessage("A conexão com o sistema não está configurada. Contate o administrador.");
    try{
      await initClient();
      const {data,error}=await state.client.auth.signInWithPassword({email,password});
      if(error)throw error;
      state.mode="real";state.user=data.user;
      await loadRealData();openApp();
    }catch(e){showMessage("Falha no login: "+e.message)}
  }

  async function loadRealData(){
    const c=state.client,u=state.user;
    const qs=await Promise.all([
      c.from("profiles").select("*").eq("id",u.id).maybeSingle(),
      c.from("profiles").select("id,email,full_name,role,department,active,created_at").order("full_name"),
      c.from("fluid_types").select("*").order("name"),
      c.from("tanks").select("*").order("display_order"),
      c.from("operations").select("*").order("start_at",{ascending:false}),
      c.from("trucks").select("*").order("movement_date",{ascending:false}),
      c.from("qhse_records").select("*").order("record_date",{ascending:false}),
      c.from("equipment").select("*").order("name"),
      c.from("certificates").select("*").order("expires_at"),
      c.from("alerts").select("*").order("created_at",{ascending:false}),
      c.from("chat_messages").select("*").order("created_at",{ascending:true}),
      c.from("attachments").select("*").order("created_at",{ascending:false})
    ]);
    const bad=qs.find(x=>x.error);if(bad)throw bad.error;
    const p=qs[0].data||{full_name:u.email,role:"user"};
    state.data={
      profile:{name:p.full_name||u.email,role:p.role||"user",email:u.email},
      users:(qs[1].data||[]).map(x=>({id:x.id,email:x.email||"",name:x.full_name||x.email||"Usuário",role:x.role||"user",department:x.department||"",active:x.active!==false,created_at:x.created_at})),
      fluids:(qs[2].data||[]).map(x=>({id:x.id,name:x.name,type:x.category,active:x.active})),
      tanks:(qs[3].data||[]).map(x=>({id:x.id,name:x.name,phase:x.phase,kind:x.kind,capacity:Number(x.capacity),volume:Number(x.current_volume||0),product:x.current_product||"",lot:x.current_lot||"",status:x.status,order:x.display_order})),
      operations:(qs[4].data||[]).map(x=>({id:x.id,client:x.client,vessel:x.vessel,activity:x.activity,product:x.product,planned:Number(x.planned_quantity),executed:Number(x.executed_quantity),unit:x.unit,status:x.status,start_at:x.start_at})),
      trucks:(qs[5].data||[]).map(x=>({id:x.id,date:x.movement_date,movement:x.movement_type,supplier:x.supplier,product:x.product,quantity:Number(x.quantity),unit:x.unit,plate:x.plate,invoice:x.invoice_number,status:x.status})),
      qhse:(qs[6].data||[]).map(x=>({id:x.id,date:x.record_date,type:x.record_type,title:x.title,responsible:x.responsible,severity:x.severity,status:x.status})),
      equipment:(qs[7].data||[]).map(x=>({id:x.id,name:x.name,category:x.category,status:x.status,hourmeter:Number(x.hourmeter),last_hours:Number(x.last_work_hours),diesel_initial:Number(x.diesel_initial),refueled:Number(x.diesel_refueled),diesel_final:Number(x.diesel_final)})),
      certificates:(qs[8].data||[]).map(x=>({id:x.id,title:x.title,owner:x.owner_name,expires_at:x.expires_at,status:x.status})),
      alerts:(qs[9].data||[]).map(x=>({id:x.id,title:x.title,message:x.message,level:x.level,target:x.target_group,created_at:x.created_at,read:x.is_read})),
      messages:(qs[10].data||[]).map(x=>({id:x.id,sender:x.sender_name,text:x.message,created_at:x.created_at,mine:x.sender_id===u.id})),
      attachments:(qs[11].data||[]).map(x=>({
        id:x.id,
        module:x.module,
        record_id:x.record_id,
        file_name:x.file_name,
        file_path:x.file_path,
        mime_type:x.mime_type,
        file_size:Number(x.file_size||0),
        created_at:x.created_at
      }))
    };
  }


  async function refreshRealtimeData(){
    if(state.mode!=="real" || state.realtimeBusy) return;
    state.realtimeBusy=true;
    try{
      await loadRealData();
      renderAll();
      $("#syncBadge").textContent="Supabase online";
    }catch(e){
      console.error("Falha ao atualizar dados em tempo real:",e);
    }finally{
      state.realtimeBusy=false;
    }
  }

  function subscribeRealtime(){
    if(state.mode!=="real" || !state.client || state.realtimeChannel) return;
    state.realtimeChannel=state.client
      .channel("opscontrol-live")
      .on("postgres_changes",{event:"*",schema:"public",table:"operations"},refreshRealtimeData)
      .on("postgres_changes",{event:"*",schema:"public",table:"tanks"},refreshRealtimeData)
      .on("postgres_changes",{event:"*",schema:"public",table:"tank_history"},refreshRealtimeData)
      .on("postgres_changes",{event:"*",schema:"public",table:"alerts"},refreshRealtimeData)
      .on("postgres_changes",{event:"*",schema:"public",table:"chat_messages"},refreshRealtimeData)
      .subscribe(status=>{
        if(status==="SUBSCRIBED"){
          $("#syncBadge").textContent="Tempo real ativo";
        }
      });
  }

  function openApp(){
    $("#loginView").classList.add("hidden");$("#appView").classList.remove("hidden");
    $("#syncBadge").textContent=state.mode==="real"?"Supabase online":"Demonstração local";
    $("#syncBadge").className=`status-badge ${state.mode==="real"?"online":"neutral"}`;
    const p=state.data.profile;$("#userName").textContent=p.name;$("#userRole").textContent=p.role;
    $("#userInitials").textContent=p.name.split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase();
    renderAll();showPage("dashboard");if(state.mode==="real")subscribeRealtime();
  }
  async function logout(){
    if(state.realtimeChannel&&state.client)await state.client.removeChannel(state.realtimeChannel);
    if(state.mode==="real"&&state.client)await state.client.auth.signOut();
    location.reload();
  }
  function header(t,s,a=""){return `<div class="page-header"><div><h1>${t}</h1><p>${s}</p></div><div class="actions">${a}</div></div>`}
  function stat(t,v,u,c){return `<div class="card stat-card"><div><small>${t}</small><h2>${fmt(v)}</h2><span class="muted">${u}</span></div><span class="drop ${c}"></span></div>`}

  function renderDashboard(){
    const d=state.data,vol=type=>d.tanks.filter(t=>{
      const p=(t.product||"").toLowerCase();
      if(type==="WBM")return p.includes("wb")||p.includes("glydril");
      if(type==="Brine")return p.includes("brine")||p.includes("nacl");
      if(type==="SBM")return p.includes("sbm")||p.includes("rheliant");
      return p.includes("olef");
    }).reduce((s,t)=>s+t.volume,0);
    const ops=d.operations.filter(x=>!["Concluída","Cancelada"].includes(x.status));
    const diesel=d.equipment.reduce((s,e)=>s+Math.max(0,e.diesel_initial+e.refueled-e.diesel_final),0);
    $("#page-dashboard").innerHTML=header("Visão geral","Indicadores operacionais da B-Port LMP.",`<button class="btn primary" data-action="new-operation">+ Nova operação</button>`)+
    `<div class="grid four">${stat("Volume WBM",vol("WBM"),"bbl armazenados","wbm")}${stat("Volume Brine",vol("Brine"),"bbl armazenados","brine")}${stat("Volume SBM",vol("SBM"),"bbl armazenados","sbm")}${stat("Olefina",vol("Olefina"),"bbl armazenados","olefin")}</div>
    <div class="grid two" style="margin-top:14px">
      <div class="card"><h3>Operações em andamento</h3>${ops.length?ops.map(op=>{const p=op.planned?Math.min(100,Math.round(op.executed/op.planned*100)):0;return `<div style="margin-top:14px"><div class="kpi-row"><div><strong>${esc(op.client)} • ${esc(op.vessel)}</strong><span class="muted">${esc(op.activity)} — ${esc(op.product)}</span></div>${badge(op.status)}</div><div class="progress"><span style="width:${p}%"></span></div><small>${fmt(op.executed)} / ${fmt(op.planned)} ${esc(op.unit)} • ${p}%</small></div>`}).join(""):`<div class="empty">Nenhuma operação ativa.</div>`}</div>
      <div class="card"><h3>Indicadores críticos</h3><div class="kpi-list" style="margin-top:15px"><div class="kpi-row"><span>Tanques bloqueados</span><strong>${d.tanks.filter(x=>x.status==="Bloqueado").length}</strong></div><div class="kpi-row"><span>Pendências QHSE</span><strong>${d.qhse.filter(x=>x.status!=="Concluído").length}</strong></div><div class="kpi-row"><span>Equipamentos em manutenção</span><strong>${d.equipment.filter(x=>x.status==="Manutenção").length}</strong></div><div class="kpi-row"><span>Diesel consumido</span><strong>${fmt(diesel)} L</strong></div></div></div>
    </div>`;
  }

  function renderOperations(){
    const rows=state.data.operations.map(op=>{const p=op.planned?Math.min(100,Math.round(op.executed/op.planned*100)):0;return `<tr><td><strong>${esc(op.client)}</strong><br><small>${esc(op.vessel)}</small></td><td>${esc(op.activity)}</td><td>${esc(op.product)}</td><td>${fmt(op.executed)} / ${fmt(op.planned)} ${esc(op.unit)}<div class="progress"><span style="width:${p}%"></span></div></td><td>${badge(op.status)}</td><td>${dateTime(op.start_at)}</td><td><button class="btn small secondary" data-edit-operation="${op.id}">Editar</button></td></tr>`}).join("");
    $("#page-operations").innerHTML=header("Operações","Planejamento e acompanhamento de embarcações.",`<button class="btn primary" data-action="new-operation">+ Nova operação</button>`)+`<div class="card table-wrap"><table class="data-table"><thead><tr><th>Cliente / Embarcação</th><th>Atividade</th><th>Produto</th><th>Progresso</th><th>Status</th><th>Início</th><th>Ações</th></tr></thead><tbody>${rows||`<tr><td colspan="7" class="empty">Nenhuma operação.</td></tr>`}</tbody></table></div>`;
  }

  function renderTanks(){
    $("#page-tanks").innerHTML=header("Tanques e tancagem","Mix Tanks, tanques e silos.")+
      ["Phase #1","Phase #2"].map(phase=>`<div class="section-title">${phase}</div><div class="grid three">${state.data.tanks.filter(t=>t.phase===phase).sort((a,b)=>a.order-b.order).map(t=>{const p=t.capacity?Math.min(100,Math.round(t.volume/t.capacity*100)):0;return `<div class="card"><div class="tank-top"><div><h3>${esc(t.name)}</h3><span class="tag">${esc(t.kind)}</span></div>${badge(t.status)}</div><p class="tank-meta">${esc(t.product||"Sem produto")}<br>Lote: ${esc(t.lot||"-")}</p><strong>${fmt(t.volume)} / ${fmt(t.capacity)} ${t.kind==="Silo"?"ton":"bbl"}</strong><div class="progress"><span style="width:${p}%"></span></div><button class="btn small secondary" data-edit-tank="${t.id}">Atualizar</button></div>`}).join("")}</div>`).join("");
  }

  function renderFluids(){
    $("#page-fluids").innerHTML=header("Fluidos e granéis","Cadastro padronizado de produtos.",`<button class="btn primary" data-action="new-fluid">+ Adicionar produto</button>`)+`<div class="card table-wrap"><table class="data-table"><thead><tr><th>Produto</th><th>Classificação</th><th>Status</th><th>Anexos</th></tr></thead><tbody>${state.data.fluids.map(x=>{const count=attachmentCount("fluid",x.id);return `<tr><td><strong>${esc(x.name)}</strong></td><td>${badge(x.type)}</td><td>${badge(x.active?"Ativo":"Inativo")}</td><td><button class="btn small secondary" data-attachments="fluid:${x.id}" data-attachment-title="${esc(x.name)}">📎 ${count}</button></td></tr>`}).join("")}</tbody></table></div>`;
  }

  function renderTrucks(){
    $("#page-trucks").innerHTML=header("Carretas","Entradas e saídas de fluidos, granéis e insumos.",`<button class="btn primary" data-action="new-truck">+ Nova movimentação</button>`)+`<div class="card table-wrap"><table class="data-table"><thead><tr><th>Data</th><th>Movimento</th><th>Origem/Destino</th><th>Produto</th><th>Placa</th><th>NF</th><th>Status</th><th>Anexos</th></tr></thead><tbody>${state.data.trucks.map(x=>{const count=attachmentCount("truck",x.id);return `<tr><td>${dateOnly(x.date)}</td><td>${badge(x.movement)}</td><td>${esc(x.supplier)}</td><td><strong>${esc(x.product)}</strong><br><small>${fmt(x.quantity)} ${esc(x.unit)}</small></td><td>${esc(x.plate)}</td><td>${esc(x.invoice)}</td><td>${badge(x.status)}</td><td><button class="btn small secondary" data-attachments="truck:${x.id}" data-attachment-title="${esc(x.plate||x.product)}">📎 ${count}</button></td></tr>`}).join("")}</tbody></table></div>`;
  }

  function renderQhse(){
    $("#page-qhse").innerHTML=header("QHSE","DDS, APR, inspeções e riscos.",`<button class="btn primary" data-action="new-qhse">+ Novo registro</button>`)+`<div class="card table-wrap"><table class="data-table"><thead><tr><th>Data</th><th>Tipo</th><th>Registro</th><th>Responsável</th><th>Severidade</th><th>Status</th></tr></thead><tbody>${state.data.qhse.map(x=>`<tr><td>${dateOnly(x.date)}</td><td>${badge(x.type)}</td><td><strong>${esc(x.title)}</strong></td><td>${esc(x.responsible)}</td><td>${badge(x.severity)}</td><td>${badge(x.status)}</td></tr>`).join("")}</tbody></table></div>`;
  }

  function renderMaintenance(){
    $("#page-maintenance").innerHTML=header("Manutenção e equipamentos","Horímetro, horas trabalhadas e diesel.",`<button class="btn primary" data-action="new-equipment">+ Novo equipamento</button>`)+`<div class="card table-wrap"><table class="data-table"><thead><tr><th>Equipamento</th><th>Status</th><th>Horímetro</th><th>Horas</th><th>Diesel consumido</th><th>Média</th></tr></thead><tbody>${state.data.equipment.map(e=>{const used=Math.max(0,e.diesel_initial+e.refueled-e.diesel_final),avg=e.last_hours?used/e.last_hours:0;return `<tr><td><strong>${esc(e.name)}</strong><br><small>${esc(e.category)}</small></td><td>${badge(e.status)}</td><td>${fmt(e.hourmeter)} h</td><td>${fmt(e.last_hours)} h</td><td>${fmt(used)} L</td><td>${fmt(avg)} L/h</td></tr>`}).join("")}</tbody></table></div>`;
  }

  function renderCertificates(){
    $("#page-certificates").innerHTML=header("Certificados","Documentos por usuário e validade.",`<button class="btn primary" data-action="new-certificate">+ Adicionar certificado</button>`)+`<div class="card table-wrap"><table class="data-table"><thead><tr><th>Certificado</th><th>Colaborador</th><th>Validade</th><th>Status</th><th>Arquivo</th></tr></thead><tbody>${state.data.certificates.map(x=>{const count=attachmentCount("certificate",x.id);return `<tr><td><strong>${esc(x.title)}</strong></td><td>${esc(x.owner)}</td><td>${dateOnly(x.expires_at)}</td><td>${badge(x.status)}</td><td><button class="btn small secondary" data-attachments="certificate:${x.id}" data-attachment-title="${esc(x.title)}">📎 ${count}</button></td></tr>`}).join("")}</tbody></table></div>`;
  }

  function renderAlerts(){
    $("#page-alerts").innerHTML=header("Alertas e chat interno","Comunicação por usuário, equipe ou função.",`<button class="btn primary" data-action="new-alert">+ Novo alerta</button>`)+`<div class="chat-layout"><div><div class="section-title">Alertas</div><div style="display:grid;gap:9px">${state.data.alerts.map(x=>`<div class="card"><div class="kpi-row"><div><strong>${esc(x.title)}</strong><span class="muted">${esc(x.target)} • ${dateTime(x.created_at)}</span></div>${badge(x.level)}</div><p>${esc(x.message)}</p></div>`).join("")}</div></div><div class="card chat-panel"><h3>Canal Operação Geral</h3><div id="messages" class="messages">${state.data.messages.map(x=>`<div class="chat-message ${x.mine?"mine":""}"><strong>${esc(x.sender)}</strong><br>${esc(x.text)}<br><small>${dateTime(x.created_at)}</small></div>`).join("")}</div><div class="chat-input"><input id="chatText" placeholder="Digite uma mensagem..."><button class="btn primary" data-action="send-message">Enviar</button></div></div></div>`;
  }

  function renderReports(){
    const card=(t,d,p)=>`<div class="card"><h3>${t}</h3><p>${d}</p><button class="btn primary" data-print-page="${p}">Gerar / Imprimir</button></div>`;
    $("#page-reports").innerHTML=header("Relatórios","Relatórios operacionais e passagem de serviço.")+`<div class="grid two">${card("Relatório geral","Resumo do dashboard e indicadores.","dashboard")}${card("Passagem de serviço","Operações em andamento e pendências.","operations")}${card("Inventário de tancagem","Tanques, produtos, lotes e volumes.","tanks")}${card("Relatório QHSE","DDS, APR e inspeções.","qhse")}${card("Relatório de manutenção","Horímetro e consumo de diesel.","maintenance")}${card("Controle de carretas","Entradas, saídas, placas e NF.","trucks")}</div><div class="warning-box" style="margin-top:14px"><strong>PDF:</strong> selecione “Salvar como PDF” na janela de impressão.</div>`;
  }

  function renderSettings(){
    const users=state.data.users||[];
    const isAdmin=String(state.data.profile?.role||"").toLowerCase()==="admin";
    const userRows=users.map(u=>`<tr>
      <td><strong>${esc(u.name)}</strong><br><small>${esc(u.email)}</small></td>
      <td>${badge(u.role)}</td>
      <td>${esc(u.department||"-")}</td>
      <td>${badge(u.active?"Ativo":"Inativo")}</td>
      <td>${dateOnly(u.created_at)}</td>
    </tr>`).join("");

    $("#page-settings").innerHTML=header("Configurações","Usuários cadastrados e informações do sistema.")+
      `<div class="grid two">
        <div class="card">
          <h3>Meu perfil</h3>
          <div class="kpi-list" style="margin-top:14px">
            <div class="kpi-row"><span>Nome</span><strong>${esc(state.data.profile.name)}</strong></div>
            <div class="kpi-row"><span>E-mail</span><strong>${esc(state.data.profile.email)}</strong></div>
            <div class="kpi-row"><span>Cargo</span>${badge(state.data.profile.role)}</div>
          </div>
        </div>
        <div class="card">
          <h3>Sistema</h3>
          <p><strong>Aplicação:</strong> OpsControl IA V2<br>
          <strong>Unidade:</strong> B-Port LMP<br>
          <strong>Conexão:</strong> Supabase online<br>
          <strong>Projeto:</strong> opscontrol-ia-v2</p>
        </div>
      </div>
      <div class="section-title">Usuários cadastrados</div>
      <div class="card table-wrap">
        ${isAdmin?`
          <table class="data-table">
            <thead><tr><th>Usuário</th><th>Cargo</th><th>Departamento</th><th>Status</th><th>Cadastro</th></tr></thead>
            <tbody>${userRows||`<tr><td colspan="5" class="empty">Nenhum usuário cadastrado.</td></tr>`}</tbody>
          </table>
        `:`
          <div class="info-box">A lista completa de usuários é visível somente para administradores.</div>
          <table class="data-table" style="margin-top:12px">
            <thead><tr><th>Usuário</th><th>Cargo</th><th>Departamento</th><th>Status</th><th>Cadastro</th></tr></thead>
            <tbody>${userRows||`<tr><td colspan="5" class="empty">Perfil não localizado.</td></tr>`}</tbody>
          </table>
        `}
      </div>`;
  }

  function renderAll(){renderDashboard();renderOperations();renderTanks();renderFluids();renderTrucks();renderQhse();renderMaintenance();renderCertificates();renderAlerts();renderReports();renderSettings();$("#alertCount").textContent=state.data.alerts.filter(x=>!x.read).length}
  function showPage(p){state.page=p;$$(".page").forEach(x=>x.classList.remove("active"));$$(".nav-item").forEach(x=>x.classList.toggle("active",x.dataset.page===p));$(`#page-${p}`).classList.add("active");$("#sidebar").classList.remove("open")}
  function openModal(t,b,e="REGISTRO"){$("#modalTitle").textContent=t;$("#modalEyebrow").textContent=e;$("#modalBody").innerHTML=b;$("#modal").classList.remove("hidden")}
  function closeModal(){$("#modal").classList.add("hidden")}
  const actions=label=>`<div class="form-actions"><button type="button" class="btn secondary" data-close-modal>Cancelar</button><button class="btn primary">${label}</button></div>`;

  function operationForm(op={}){
    return `<form id="operationForm" data-id="${op.id||""}"><div class="form-grid"><div><label>Cliente</label><input name="client" required value="${esc(op.client||"")}"></div><div><label>Embarcação</label><input name="vessel" required value="${esc(op.vessel||"")}"></div><div><label>Atividade</label><select name="activity">${["Bombeio","Backload","Fabricação","Tratamento","Carregamento","Descarga"].map(x=>`<option ${op.activity===x?"selected":""}>${x}</option>`).join("")}</select></div><div><label>Produto</label><input name="product" required value="${esc(op.product||"")}"></div><div><label>Planejado</label><input name="planned" type="number" step="0.01" value="${op.planned??0}"></div><div><label>Executado</label><input name="executed" type="number" step="0.01" value="${op.executed??0}"></div><div><label>Unidade</label><select name="unit"><option>bbl</option><option>ton</option><option>m³</option></select></div><div><label>Status</label><select name="status">${["Programada","Em andamento","Paralisada","Concluída","Cancelada"].map(x=>`<option ${op.status===x?"selected":""}>${x}</option>`).join("")}</select></div><div class="wide"><label>Início</label><input name="start_at" type="datetime-local" value="${String(op.start_at||"").slice(0,16)}"></div></div>${actions("Salvar operação")}</form>`;
  }
  function tankForm(t){return `<form id="tankForm"><input type="hidden" name="id" value="${t.id}"><div class="form-grid"><div><label>Tanque</label><input value="${esc(t.name)}" disabled></div><div><label>Status</label><select name="status">${["Disponível","Liberado","Em uso","Bloqueado","Limpeza","Manutenção"].map(x=>`<option ${t.status===x?"selected":""}>${x}</option>`).join("")}</select></div><div class="wide"><label>Produto</label><input name="product" value="${esc(t.product)}"></div><div><label>Lote</label><input name="lot" value="${esc(t.lot)}"></div><div><label>Volume</label><input name="volume" type="number" step="0.01" max="${t.capacity}" value="${t.volume}"></div></div>${actions("Atualizar tancagem")}</form>`}
  function generic(kind){
    const f={
      fluid:`<form id="genericForm" data-kind="fluid"><div class="form-grid"><div class="wide"><label>Produto</label><input name="name" required></div><div><label>Classificação</label><select name="type"><option>WBM</option><option>Brine</option><option>SBM</option><option>Olefina</option><option>Granel</option><option>Insumo</option></select></div><div><label>Ativo</label><select name="active"><option value="true">Sim</option><option value="false">Não</option></select></div><div class="wide"><label>Documentos ou fotos</label><input name="attachment" type="file" accept=".pdf,image/jpeg,image/png,image/webp,image/heic,image/heif" multiple><small class="field-help">PDF ou imagem. Máximo de 20 MB por arquivo.</small></div></div>${actions("Salvar produto")}</form>`,
      truck:`<form id="genericForm" data-kind="truck"><div class="form-grid"><div><label>Data</label><input name="date" type="date" required></div><div><label>Movimento</label><select name="movement"><option>Entrada</option><option>Saída</option><option>Backload</option></select></div><div><label>Origem / Destino</label><input name="supplier" required></div><div><label>Produto</label><input name="product" required></div><div><label>Quantidade</label><input name="quantity" type="number" step="0.01"></div><div><label>Unidade</label><select name="unit"><option>ton</option><option>bbl</option><option>m³</option></select></div><div><label>Placa</label><input name="plate"></div><div><label>NF</label><input name="invoice"></div><div><label>Status</label><select name="status"><option>Programada</option><option>Recebida</option><option>Concluída</option></select></div><div class="wide"><label>Nota fiscal, documento ou foto</label><input name="attachment" type="file" accept=".pdf,image/jpeg,image/png,image/webp,image/heic,image/heif" multiple capture="environment"><small class="field-help">Você pode tirar uma foto pelo celular ou escolher arquivos.</small></div></div>${actions("Salvar movimentação")}</form>`,
      qhse:`<form id="genericForm" data-kind="qhse"><div class="form-grid"><div><label>Data</label><input name="date" type="date"></div><div><label>Tipo</label><select name="type"><option>DDS</option><option>APR</option><option>Inspeção</option><option>RIR</option><option>Auditoria</option></select></div><div class="wide"><label>Título</label><input name="title" required></div><div><label>Responsável</label><input name="responsible"></div><div><label>Severidade</label><select name="severity"><option>Baixa</option><option>Média</option><option>Alta</option><option>Crítica</option></select></div><div><label>Status</label><select name="status"><option>Pendente</option><option>Em andamento</option><option>Concluído</option></select></div></div>${actions("Salvar registro")}</form>`,
      equipment:`<form id="genericForm" data-kind="equipment"><div class="form-grid"><div><label>Equipamento</label><input name="name" required></div><div><label>Categoria</label><select name="category"><option>Motor a diesel</option><option>Bomba</option><option>Compressor</option><option>Empilhadeira</option><option>Outro</option></select></div><div><label>Status</label><select name="status"><option>Operando</option><option>Disponível</option><option>Parado</option><option>Manutenção</option></select></div><div><label>Horímetro</label><input name="hourmeter" type="number" step="0.1" value="0"></div><div><label>Horas trabalhadas</label><input name="last_hours" type="number" step="0.1" value="0"></div><div><label>Diesel inicial</label><input name="diesel_initial" type="number" step="0.1" value="0"></div><div><label>Abastecido</label><input name="refueled" type="number" step="0.1" value="0"></div><div><label>Diesel final</label><input name="diesel_final" type="number" step="0.1" value="0"></div></div>${actions("Salvar equipamento")}</form>`,
      certificate:`<form id="genericForm" data-kind="certificate"><div class="form-grid"><div class="wide"><label>Certificado</label><input name="title" required></div><div><label>Colaborador</label><input name="owner"></div><div><label>Validade</label><input name="expires_at" type="date"></div><div><label>Status</label><select name="status"><option>Válido</option><option>A vencer</option><option>Vencido</option></select></div><div class="wide"><label>Certificado em PDF ou foto</label><input name="attachment" type="file" accept=".pdf,image/jpeg,image/png,image/webp,image/heic,image/heif" multiple><small class="field-help">O arquivo ficará armazenado de forma privada.</small></div></div>${actions("Salvar certificado")}</form>`,
      alert:`<form id="genericForm" data-kind="alert"><div class="form-grid"><div class="wide"><label>Título</label><input name="title" required></div><div class="wide"><label>Mensagem</label><textarea name="message" required></textarea></div><div><label>Nível</label><select name="level"><option>Informativo</option><option>Atenção</option><option>Crítico</option></select></div><div><label>Destinatário / Grupo</label><input name="target"></div></div>${actions("Enviar alerta")}</form>`
    };return f[kind];
  }


  function attachmentCount(module,recordId){
    return (state.data.attachments||[]).filter(x=>x.module===module && x.record_id===recordId).length;
  }

  function fileSizeLabel(bytes){
    const value=Number(bytes||0);
    if(value<1024)return `${value} B`;
    if(value<1024*1024)return `${(value/1024).toFixed(1)} KB`;
    return `${(value/1024/1024).toFixed(1)} MB`;
  }

  function safeFileName(name){
    return String(name||"arquivo")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/[^a-zA-Z0-9._-]+/g,"-")
      .replace(/-+/g,"-");
  }

  async function uploadAttachments(module,recordId,files){
    if(!files || !files.length)return;
    const allowed=[
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif"
    ];
    for(const file of files){
      if(!allowed.includes(file.type)){
        throw new Error(`Formato não permitido: ${file.name}`);
      }
      if(file.size>20*1024*1024){
        throw new Error(`O arquivo ${file.name} ultrapassa 20 MB.`);
      }
      const path=`${module}/${recordId}/${Date.now()}-${uid("file")}-${safeFileName(file.name)}`;
      const {error:uploadError}=await state.client.storage
        .from("opscontrol-files")
        .upload(path,file,{contentType:file.type,upsert:false});
      if(uploadError)throw uploadError;

      const {error:metaError}=await state.client.from("attachments").insert({
        module,
        record_id:recordId,
        file_name:file.name,
        file_path:path,
        mime_type:file.type,
        file_size:file.size,
        uploaded_by:state.user.id
      });
      if(metaError){
        await state.client.storage.from("opscontrol-files").remove([path]);
        throw metaError;
      }
    }
  }

  async function showAttachments(module,recordId,title){
    const items=(state.data.attachments||[]).filter(x=>x.module===module && x.record_id===recordId);
    if(!items.length){
      openModal(`Anexos — ${title}`,`<div class="empty">Nenhum documento ou foto anexado.</div>`,"ANEXOS");
      return;
    }

    const rows=await Promise.all(items.map(async file=>{
      const {data,error}=await state.client.storage
        .from("opscontrol-files")
        .createSignedUrl(file.file_path,3600);
      const url=error?"":data?.signedUrl||"";
      const type=(file.mime_type||"").startsWith("image/")?"Foto":"Documento";
      return `<div class="attachment-item">
        <div class="attachment-icon">${type==="Foto"?"🖼️":"📄"}</div>
        <div class="attachment-info">
          <strong>${esc(file.file_name)}</strong>
          <small>${type} • ${fileSizeLabel(file.file_size)} • ${dateTime(file.created_at)}</small>
        </div>
        ${url?`<a class="btn small primary" href="${url}" target="_blank" rel="noopener">Abrir</a>`:`<span class="badge red">Indisponível</span>`}
      </div>`;
    }));

    openModal(`Anexos — ${title}`,`<div class="attachment-list">${rows.join("")}</div>`,"ANEXOS");
  }

  async function saveDemoEntity(kind,payload,id){
    const map={operation:"operations",fluid:"fluids",truck:"trucks",qhse:"qhse",equipment:"equipment",certificate:"certificates",alert:"alerts"};
    const a=state.data[map[kind]];
    if(id){const i=a.findIndex(x=>x.id===id);a[i]={...a[i],...payload}}
    else a.unshift({id:uid(kind[0]),...payload});
    saveDemo();renderAll();
  }

  async function saveReal(kind,payload,id){
    const maps={
      operation:["operations",{client:payload.client,vessel:payload.vessel,activity:payload.activity,product:payload.product,planned_quantity:payload.planned,executed_quantity:payload.executed,unit:payload.unit,status:payload.status,start_at:payload.start_at}],
      fluid:["fluid_types",{name:payload.name,category:payload.type,active:payload.active}],
      truck:["trucks",{movement_date:payload.date,movement_type:payload.movement,supplier:payload.supplier,product:payload.product,quantity:payload.quantity,unit:payload.unit,plate:payload.plate,invoice_number:payload.invoice,status:payload.status}],
      qhse:["qhse_records",{record_date:payload.date,record_type:payload.type,title:payload.title,responsible:payload.responsible,severity:payload.severity,status:payload.status}],
      equipment:["equipment",{name:payload.name,category:payload.category,status:payload.status,hourmeter:payload.hourmeter,last_work_hours:payload.last_hours,diesel_initial:payload.diesel_initial,diesel_refueled:payload.refueled,diesel_final:payload.diesel_final}],
      certificate:["certificates",{user_id:state.user.id,owner_name:payload.owner,title:payload.title,expires_at:payload.expires_at,status:payload.status}],
      alert:["alerts",{title:payload.title,message:payload.message,level:payload.level,target_group:payload.target,is_read:false,created_by:state.user.id}]
    };
    const [table,row]=maps[kind];
    const q=id
      ? state.client.from(table).update(row).eq("id",id).select("id").single()
      : state.client.from(table).insert(row).select("id").single();
    const {data,error}=await q;
    if(error)throw error;
    await loadRealData();
    renderAll();
    return data?.id||id;
  }

  document.addEventListener("submit",async e=>{
    e.preventDefault();const f=e.target;
    try{
      if(f.id==="setupConnectionForm"){
        const x=Object.fromEntries(new FormData(f));state.config={url:x.url.trim(),key:x.key.trim()};localStorage.setItem(CONFIG_KEY,JSON.stringify(state.config));closeModal();toast("Conexão salva.");return;
      }
      if(f.id==="operationForm"){
        const x=Object.fromEntries(new FormData(f));x.planned=Number(x.planned);x.executed=Number(x.executed);
        state.mode==="demo"?await saveDemoEntity("operation",x,f.dataset.id||null):await saveReal("operation",x,f.dataset.id||null);
      }else if(f.id==="tankForm"){
        const x=Object.fromEntries(new FormData(f)),t=state.data.tanks.find(v=>v.id===x.id);
        const before={...t};
        Object.assign(t,{status:x.status,product:x.product,lot:x.lot,volume:Number(x.volume)});
        if(state.mode==="demo"){saveDemo();renderAll()}else{
          const {error}=await state.client.from("tanks").update({
            status:t.status,
            current_product:t.product,
            current_lot:t.lot,
            current_volume:t.volume,
            updated_by:state.user.id
          }).eq("id",t.id);
          if(error)throw error;
          const {error:historyError}=await state.client.from("tank_history").insert({
            tank_id:t.id,
            tank_name:t.name,
            previous_product:before.product||null,
            new_product:t.product||null,
            previous_lot:before.lot||null,
            new_lot:t.lot||null,
            previous_volume:Number(before.volume||0),
            new_volume:Number(t.volume||0),
            previous_status:before.status||null,
            new_status:t.status||null,
            changed_by:state.user.id
          });
          if(historyError)throw historyError;
          await loadRealData();renderAll();
        }
      }else if(f.id==="genericForm"){
        const kind=f.dataset.kind;
        const input=f.querySelector('input[name="attachment"]');
        const files=input?[...input.files]:[];
        const x=Object.fromEntries(new FormData(f));
        delete x.attachment;
        ["quantity","hourmeter","last_hours","diesel_initial","refueled","diesel_final"].forEach(k=>{if(k in x)x[k]=Number(x[k]||0)});
        if("active"in x)x.active=x.active==="true";
        let recordId=null;
        if(state.mode==="demo"){
          await saveDemoEntity(kind,x);
        }else{
          recordId=await saveReal(kind,x);
          if(files.length && ["fluid","truck","certificate"].includes(kind)){
            toast(`Enviando ${files.length} anexo(s)...`);
            await uploadAttachments(kind,recordId,files);
            await loadRealData();
            renderAll();
          }
        }
      }
      closeModal();toast("Registro e anexos salvos.");
    }catch(err){toast("Erro: "+err.message)}
  });

  document.addEventListener("click",async e=>{
    const b=e.target.closest("button");if(!b)return;
    if(b.id==="loginBtn")return realLogin();
    if(b.id==="logoutBtn")return logout();
    if(b.id==="menuBtn")return $("#sidebar").classList.toggle("open");
    if(b.id==="modalClose"||b.hasAttribute("data-close-modal"))return closeModal();
    if(b.classList.contains("nav-item"))return showPage(b.dataset.page);

    const a=b.dataset.action;
    if(a==="new-operation")return openModal("Nova operação",operationForm(),"OPERAÇÃO");
    if(a==="new-fluid")return openModal("Adicionar produto",generic("fluid"),"PRODUTO");
    if(a==="new-truck")return openModal("Nova movimentação",generic("truck"),"CARRETA");
    if(a==="new-qhse")return openModal("Novo registro QHSE",generic("qhse"),"QHSE");
    if(a==="new-equipment")return openModal("Novo equipamento",generic("equipment"),"MANUTENÇÃO");
    if(a==="new-certificate")return openModal("Adicionar certificado",generic("certificate"),"CERTIFICADO");
    if(a==="new-alert")return openModal("Criar alerta",generic("alert"),"ALERTA");
    if(a==="send-message"){
      const text=$("#chatText")?.value.trim();if(!text)return;
      if(state.mode==="demo"){state.data.messages.push({id:uid("m"),sender:state.data.profile.name,text,created_at:now(),mine:true});saveDemo()}
      else{const {error}=await state.client.from("chat_messages").insert({channel:"operacao-geral",sender_id:state.user.id,sender_name:state.data.profile.name,message:text});if(error)return toast(error.message);await loadRealData()}
      renderAlerts();return;
    }

    if(b.dataset.attachments){
      const [module,recordId]=b.dataset.attachments.split(":");
      return showAttachments(module,recordId,b.dataset.attachmentTitle||"Registro");
    }

    if(b.dataset.editOperation){const op=state.data.operations.find(x=>x.id===b.dataset.editOperation);return openModal("Editar operação",operationForm(op),"OPERAÇÃO")}
    if(b.dataset.editTank){const t=state.data.tanks.find(x=>x.id===b.dataset.editTank);return openModal("Atualizar "+t.name,tankForm(t),"TANCAGEM")}
    if(b.dataset.printPage){const old=state.page;showPage(b.dataset.printPage);setTimeout(()=>{window.print();showPage(old)},100)}
  });

  $("#modal").addEventListener("click",e=>{if(e.target===$("#modal"))closeModal()});
  $("#connectionHint").textContent="Acesse com seu e-mail e senha cadastrados.";
  if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
})();