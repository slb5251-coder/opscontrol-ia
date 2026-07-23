# Diagnóstico do fluxo de alerta

## Linha 384

```js
366:     if (type === "qhse") {
367:       document.querySelector(`[data-qhse-actions="${id}"]`)?.click();
368:       return;
369:     }
370:     toast("Módulo aberto no registro pesquisado.", "success");
371:   }
372: 
373:   function draftStore() {
374:     try { return JSON.parse(localStorage.getItem(FORM_DRAFT_KEY) || "{}"); } catch (_) { return {}; }
375:   }
376: 
377:   function draftIdentity(form) {
378:     if (!form) return "";
379:     if (form.id === "tankForm") return "";
380:     const hiddenRecordId = form.querySelector?.('input[type="hidden"][name="id"]')?.value
381:       || form.querySelector?.('input[type="hidden"][name="tank_id"]')?.value
382:       || "";
383:     if (form.dataset.id || form.dataset.userId || form.dataset.operationId || form.dataset.recordId || hiddenRecordId) return "";
384:     const kind = form.dataset.kind || form.id;
385:     return `${state.user?.id || "anon"}:${kind}`;
386:   }
387: 
388:   function clearLegacyTankDrafts() {
389:     try {
390:       const drafts = draftStore();
391:       let changed = false;
392:       Object.keys(drafts).forEach(key => {
393:         if (key.endsWith(":tankForm") || key.includes("tankForm")) {
394:           delete drafts[key];
395:           changed = true;
396:         }
397:       });
398:       if (changed) localStorage.setItem(FORM_DRAFT_KEY, JSON.stringify(drafts));
399:     } catch (_) {}
400:   }
401: 
402:   function serializeFormDraft(form) {
403:     const fields = [...form.querySelectorAll("input[name],select[name],textarea[name]")]
404:       .filter(field => !["file", "password", "hidden"].includes(field.type))
405:       .filter(field => !["id", "tank_id", "record_id", "operation_id"].includes(field.name))
406:       .map((field, index) => ({
407:         name: field.name,
408:         index,
409:         type: field.type,
410:         value: field.value,
411:         checked: field.checked
412:       }));
413:     const allocationRows = form.id === "operationForm"
414:       ? [...form.querySelectorAll("[data-operation-allocation-row]")].map(row => ({
415:           tank_id: row.querySelector("[data-allocation-tank]")?.value || "",
416:           quantity: row.querySelector("[data-allocation-quantity]")?.value || ""
417:         }))
418:       : [];
```

## Linha 529

```js
511:     });
512:     localStorage.setItem(TEST_LOG_KEY, JSON.stringify(log.slice(0, 300)));
513:   }
514: 
515:   function setTestMode(enabled) {
516:     state.testMode = enabled;
517:     localStorage.setItem(TEST_MODE_KEY, String(enabled));
518:     document.body.classList.toggle("homologation-mode", enabled);
519:     renderAll();
520:     toast(enabled ? "Modo homologação ativado. Nenhum salvamento irá para o banco oficial." : "Modo homologação desativado.", "success");
521:   }
522: 
523:   function simulateFormSubmission(form) {
524:     const payload = Object.fromEntries(new FormData(form));
525:     if (form.id === "truckForm") payload.platform_items = collectTruckPlatformItems(form, false);
526:     Object.keys(payload).forEach(key => {
527:       if (payload[key] instanceof File) payload[key] = payload[key].name || "arquivo";
528:     });
529:     addTestLog(`form:${form.id || form.dataset.kind || "registro"}`, payload);
530:     clearFormDraft(form);
531:     closeModal();
532:     renderSettings();
533:     toast("Ação simulada na homologação local. O banco oficial não foi alterado.", "success");
534:   }
535: 
536:   function feedbackForm() {
537:     return `<form id="feedbackForm">
538:       <div class="form-grid">
539:         <div><label>Tipo</label><select name="category"><option>Erro</option><option>Dificuldade</option><option selected>Sugestão</option><option>Campo desnecessário</option><option>Informação ausente</option></select></div>
540:         <div><label>Nota da experiência</label><select name="rating"><option value="">Sem nota</option>${[1,2,3,4,5].map(value => `<option value="${value}">${value} de 5</option>`).join("")}</select></div>
541:         <div class="wide"><label>O que aconteceu ou poderia melhorar? *</label><textarea name="message" required placeholder="Conte onde demorou, errou, precisou voltar ou não encontrou uma informação."></textarea></div>
542:         <input type="hidden" name="page" value="${esc(state.page)}">
543:       </div>${formActions("Enviar feedback")}
544:     </form>`;
545:   }
546: 
547:   function assetData(type, id) {
548:     if (type === "tank") {
549:       const item = state.data.tanks.find(x => x.id === id);
550:       if (!item) return null;
551:       return {
552:         type, id, page: "tanks", code: item.name, title: item.name,
553:         subtitle: `${item.phase} • ${item.kind}`,
554:         lines: [
555:           ["Produto", item.product || "Sem produto"],
556:           ["Lote", item.lot || "-"],
557:           ["Saldo", `${fmt.format(item.volume)} ${item.unit}`],
558:           ["Capacidade", `${fmt.format(item.capacity)} ${item.unit}`],
559:           ["Status", item.status],
560:           ["Atualização", dateTime(item.updated_at)]
561:         ]
562:       };
563:     }
```

## Linha 906

```js
888:   }
889: 
890:   function hasFileSelection(form) {
891:     return [...form.querySelectorAll('input[type="file"]')].some(input => input.files?.length);
892:   }
893: 
894:   function queueOfflineForm(form) {
895:     if (hasFileSelection(form)) return false;
896:     const payload = Object.fromEntries(new FormData(form));
897:     let action = null;
898:     if (form.id === "truckForm") {
899:       delete payload.attachment;
900:       action = {
901:         type: "truck",
902:         id: form.dataset.id || null,
903:         payload,
904:         items: collectTruckPlatformItems(form, false)
905:       };
906:     } else if (form.id === "genericForm" && ["qhse", "alert"].includes(form.dataset.kind)) {
907:       action = { type: "entity", kind: form.dataset.kind, id: form.dataset.id || null, payload };
908:     } else if (form.id === "eventForm") {
909:       action = { type: "event", operationId: form.dataset.operationId, payload };
910:     } else if (form.id === "actionItemForm") {
911:       action = { type: "action_item", id: form.dataset.id || null, qhseId: form.dataset.qhseId || null, payload };
912:     } else if (form.id === "handoverPendingForm") {
913:       action = { type: "handover_pending", id: form.dataset.id || null, payload };
914:     }
915:     if (!action) return false;
916:     const queue = offlineQueue();
917:     queue.push({ id: uid("offline"), queued_at: new Date().toISOString(), ...action });
918:     saveOfflineQueue(queue);
919:     return true;
920:   }
921: 
922:   async function replayOfflineAction(action) {
923:     if (action.type === "truck") return saveTruck(action.payload, action.id, action.items || []);
924:     if (action.type === "entity") return saveEntity(action.kind, action.payload, action.id);
925:     if (action.type === "event") {
926:       const p = action.payload;
927:       const { error } = await state.client.from("operation_events").insert({
928:         operation_id: action.operationId, event_time: p.event_time, title: p.title,
929:         description: p.description || null, event_type: p.event_type,
930:         quantity: Number(p.quantity || 0) || null, unit: p.unit === "-" ? null : p.unit,
931:         created_by: state.user.id
932:       });
933:       if (error) throw error;
934:       return;
935:     }
936:     if (action.type === "action_item") {
937:       const p = action.payload;
938:       const row = { qhse_record_id: action.qhseId, title: p.title, description: p.description || null,
939:         responsible: p.responsible || null, due_date: p.due_date || null, status: p.status,
940:         completed_at: p.status === "Concluído" ? new Date().toISOString() : null };
```

## Linha 907

```js
889: 
890:   function hasFileSelection(form) {
891:     return [...form.querySelectorAll('input[type="file"]')].some(input => input.files?.length);
892:   }
893: 
894:   function queueOfflineForm(form) {
895:     if (hasFileSelection(form)) return false;
896:     const payload = Object.fromEntries(new FormData(form));
897:     let action = null;
898:     if (form.id === "truckForm") {
899:       delete payload.attachment;
900:       action = {
901:         type: "truck",
902:         id: form.dataset.id || null,
903:         payload,
904:         items: collectTruckPlatformItems(form, false)
905:       };
906:     } else if (form.id === "genericForm" && ["qhse", "alert"].includes(form.dataset.kind)) {
907:       action = { type: "entity", kind: form.dataset.kind, id: form.dataset.id || null, payload };
908:     } else if (form.id === "eventForm") {
909:       action = { type: "event", operationId: form.dataset.operationId, payload };
910:     } else if (form.id === "actionItemForm") {
911:       action = { type: "action_item", id: form.dataset.id || null, qhseId: form.dataset.qhseId || null, payload };
912:     } else if (form.id === "handoverPendingForm") {
913:       action = { type: "handover_pending", id: form.dataset.id || null, payload };
914:     }
915:     if (!action) return false;
916:     const queue = offlineQueue();
917:     queue.push({ id: uid("offline"), queued_at: new Date().toISOString(), ...action });
918:     saveOfflineQueue(queue);
919:     return true;
920:   }
921: 
922:   async function replayOfflineAction(action) {
923:     if (action.type === "truck") return saveTruck(action.payload, action.id, action.items || []);
924:     if (action.type === "entity") return saveEntity(action.kind, action.payload, action.id);
925:     if (action.type === "event") {
926:       const p = action.payload;
927:       const { error } = await state.client.from("operation_events").insert({
928:         operation_id: action.operationId, event_time: p.event_time, title: p.title,
929:         description: p.description || null, event_type: p.event_type,
930:         quantity: Number(p.quantity || 0) || null, unit: p.unit === "-" ? null : p.unit,
931:         created_by: state.user.id
932:       });
933:       if (error) throw error;
934:       return;
935:     }
936:     if (action.type === "action_item") {
937:       const p = action.payload;
938:       const row = { qhse_record_id: action.qhseId, title: p.title, description: p.description || null,
939:         responsible: p.responsible || null, due_date: p.due_date || null, status: p.status,
940:         completed_at: p.status === "Concluído" ? new Date().toISOString() : null };
941:       const query = action.id ? state.client.from("action_items").update(row).eq("id", action.id)
```

## Linha 4566

```js
4548:     const priority = [...expired, ...expiring].sort((a,b) => (a.days ?? 99999) - (b.days ?? 99999)).slice(0,8);
4549:     const rows = enriched.map(item => `<tr>
4550:       <td><strong>${esc(item.title)}</strong><br><small>${esc(item.issuer || "-")}</small></td>
4551:       <td>${esc(item.owner || "-")}</td><td>${dateOnly(item.expires_at)}${item.days !== null ? `<br><small>${item.days < 0 ? `${Math.abs(item.days)} dias vencido` : `${item.days} dias restantes`}</small>` : ""}</td>
4552:       <td>${badge(item.automaticStatus)}</td>
4553:       <td><div class="row-actions"><button class="btn small secondary" data-attachments="certificate:${item.id}" data-attachment-title="${esc(item.title)}">${uiIcon("paperclip", "ui-icon btn-icon")} ${attachmentCount("certificate", item.id)}</button>${canManage ? `<button class="btn small primary" data-edit-certificate="${item.id}">Editar</button>` : ""}</div></td>
4554:     </tr>`).join("");
4555:     const mobile = enriched.map(item => `<article class="card mobile-record-card certificate-mobile-card"><div class="mobile-record-head"><div><strong>${esc(item.title)}</strong><small>${esc(item.issuer || "-")}</small></div>${badge(item.automaticStatus)}</div><div class="mobile-record-grid"><span>Colaborador<strong>${esc(item.owner || "-")}</strong></span><span>Validade<strong>${dateOnly(item.expires_at)}</strong></span><span>Prazo<strong>${item.days === null ? "Sem data" : item.days < 0 ? `${Math.abs(item.days)} dias vencido` : `${item.days} dias`}</strong></span></div><div class="row-actions"><button class="btn small secondary" data-attachments="certificate:${item.id}" data-attachment-title="${esc(item.title)}">Anexos (${attachmentCount("certificate", item.id)})</button>${canManage ? `<button class="btn small primary" data-edit-certificate="${item.id}">Editar</button>` : ""}</div></article>`).join("");
4556:     const priorityCards = priority.map(item => `<article class="certificate-priority-card ${statusClass(item.automaticStatus)}"><span class="certificate-priority-icon">${uiIcon("file")}</span><div><strong>${esc(item.title)}</strong><small>${esc(item.owner || "-")} • ${dateOnly(item.expires_at)}</small></div><div>${badge(item.automaticStatus)}<small>${item.days < 0 ? `${Math.abs(item.days)}d vencido` : `${item.days}d restantes`}</small></div></article>`).join("");
4557:     const ownerCoverage = owners.slice(0,8).map(owner => { const list=enriched.filter(item=>item.owner===owner); const pending=list.filter(item=>["Vencido","A vencer"].includes(item.automaticStatus)).length; return `<div class="certificate-owner-row"><span><strong>${esc(owner)}</strong><small>${list.length} certificado(s)</small></span><b class="${pending ? "needs-attention" : "is-ok"}">${pending ? `${pending} pendente(s)` : "Regular"}</b></div>`; }).join("");
4558:     $("#page-certificates").innerHTML =
4559:       header("Gestão de certificados", "Validades, documentos, colaboradores e pendências de conformidade.", canManage ? `<button class="btn primary" data-action="new-certificate">+ Adicionar certificado</button>` : "") +
4560:       `${!canManage ? `<div class="info-box" style="margin-bottom:14px">Você pode consultar seus certificados. O cadastro é feito pela Logística, Supervisor ou Administrador.</div>` : ""}
4561:       <section class="certificate-kpi-grid">${statCard("Certificados", fmt.format(enriched.length), "documentos cadastrados", uiIcon("file"), `${owners.length} colaborador(es)`, "blue")}${statCard("Válidos", fmt.format(valid.length), "sem vencimento próximo", uiIcon("check"), "Situação regular", "green")}${statCard("A vencer", fmt.format(expiring.length), "nos próximos 60 dias", uiIcon("hourglass"), "Planejar renovação", "orange")}${statCard("Vencidos", fmt.format(expired.length), "exigem regularização", uiIcon("alert"), expired.length ? "Ação imediata" : "Nenhuma pendência", "red")}</section>
4562:       <section class="certificate-control-grid"><div class="card certificate-priority-panel"><div class="professional-section-heading"><div><small>CONFORMIDADE</small><h3>Renovações prioritárias</h3></div><span>${priority.length} item(ns)</span></div><div class="certificate-priority-list">${priorityCards || `<div class="empty">Nenhum certificado vencido ou próximo do vencimento.</div>`}</div></div><div class="card certificate-owner-panel"><div class="professional-section-heading"><div><small>COBERTURA</small><h3>Situação por colaborador</h3></div><span>${owners.length} pessoa(s)</span></div><div class="certificate-owner-list">${ownerCoverage || `<div class="empty">Nenhum colaborador vinculado.</div>`}</div></div></section>
4563:       <div class="section-title professional-record-title"><span>Todos os certificados</span><small>${enriched.length} registro(s)</small></div><div class="card table-wrap desktop-record-table professional-table"><table class="data-table"><thead><tr><th>Certificado</th><th>Colaborador</th><th>Validade</th><th>Status</th><th>Ações</th></tr></thead><tbody>${rows || `<tr><td colspan="5" class="empty">Nenhum certificado disponível.</td></tr>`}</tbody></table></div><div class="mobile-record-list">${mobile || `<div class="card empty">Nenhum certificado disponível.</div>`}</div>`;
4564:   }
4565: 
4566:   function renderAlerts() {
4567:     const manual = state.data.alerts || [];
4568:     const automatic = state.data.systemAlerts || [];
4569:     const messages = state.data.messages || [];
4570:     const all = [
4571:       ...automatic.map(item=>({ ...item, automatic:true, category:item.category||"Sistema", deleteKey:String(item.id || item.alert_key || item.title || "") })),
4572:       ...manual.map(item => ({ ...item, category:item.target||"Comunicado", automatic:false, deleteKey:String(item.id || "") }))
4573:     ].sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
4574:     const critical = all.filter(item=>isCriticalAlert(item.level));
4575:     const grouped = [...new Set(all.map(x=>x.category||"Sistema"))];
4576:     const recent = all.filter(item => { const age=Date.now()-new Date(item.created_at||0).getTime(); return Number.isFinite(age) && age <= 24*60*60*1000; });
4577:     const automaticCount = all.filter(item=>item.automatic).length;
4578:     const adminAlertActions = item => isAdmin() && item.deleteKey
4579:       ? `<button class="btn small danger outline" data-delete-alert="${esc(item.deleteKey)}" data-alert-automatic="${item.automatic ? "true" : "false"}" data-alert-title="${esc(item.title || "Alerta")}" data-alert-category="${esc(item.category || "Sistema")}">Excluir</button>`
4580:       : "";
4581:     const priorityCards = critical.slice(0,6).map(item=>`<article class="alert-priority-card ${statusClass(item.level)}"><span>${uiIcon("alert")}</span><div><strong>${esc(item.title)}</strong><small>${esc(item.category||"Sistema")} • ${dateTime(item.created_at)}</small><p>${esc(item.message||"")}</p></div><div class="alert-admin-actions">${item.action_page&&moduleAllowed(item.action_page)?`<button class="btn small secondary" data-alert-page="${esc(item.action_page)}">Abrir</button>`:""}${adminAlertActions(item)}</div></article>`).join("");
4582:     const cards=all.slice(0,80).map(item=>`<article class="alert-center-card ${statusClass(item.level)}"><div class="alert-center-top"><span>${esc(item.category||"Sistema")}</span>${badge(item.level)}</div><h3>${esc(item.title)}</h3><p>${esc(item.message||"")}</p><footer><span>${item.automatic ? "Automático" : "Comunicado"} • ${dateTime(item.created_at)}</span><div class="alert-admin-actions">${item.action_page&&moduleAllowed(item.action_page)?`<button class="btn small secondary" data-alert-page="${esc(item.action_page)}">Abrir módulo</button>`:""}${adminAlertActions(item)}</div></footer></article>`).join("");
4583:     const chatMessages=messages.slice(-100).map(item=>`<div class="chat-message"><div class="chat-avatar">${esc(String(item.sender_name||"U").trim().slice(0,1).toUpperCase())}</div><div><strong>${esc(item.sender_name)}</strong><p>${esc(item.message)}</p><small>${dateTime(item.created_at)}</small></div></div>`).join("");
4584:     $("#page-alerts").innerHTML=header("Central de Alertas", "Prioridades operacionais, avisos automáticos e comunicação direcionada da equipe.", hasRole(["supervisor","lider","qhse","logistica"])?`<button class="btn primary" data-action="new-alert">+ Criar alerta</button>`:"")+
4585:       `<section class="alert-professional-kpis">${statCard("Alertas ativos", fmt.format(all.length), "avisos disponíveis", uiIcon("bell"), `${recent.length} nas últimas 24h`, "blue")}${statCard("Críticos e altos", fmt.format(critical.length), "exigem acompanhamento", uiIcon("alert"), critical.length ? "Prioridade operacional" : "Sem criticidade", "red")}${statCard("Automáticos", fmt.format(automaticCount), "gerados pelo sistema", uiIcon("settings"), `${grouped.length} categoria(s)`, "purple")}${statCard("Mensagens", fmt.format(messages.length), "no chat da equipe", uiIcon("users"), `${offlineQueue().length} pendente(s) offline`, "green")}</section>
4586:       ${isAdmin() ? `<div class="admin-edit-notice alert-admin-notice"><strong>Exclusão administrativa ativa</strong><span>Comunicados são apagados definitivamente. Alertas automáticos são removidos da central sem apagar o dado operacional de origem.</span></div>` : ""}
4587:       <section class="alert-priority-layout"><div class="card alert-priority-panel"><div class="professional-section-heading"><div><small>PRIORIDADE</small><h3>Pontos que exigem atenção</h3></div><span>${critical.length} crítico(s)</span></div><div class="alert-priority-list">${priorityCards || `<div class="empty">Nenhum alerta crítico ou alto.</div>`}</div></div><div class="card alert-category-panel"><div class="professional-section-heading"><div><small>DISTRIBUIÇÃO</small><h3>Alertas por categoria</h3></div></div><div class="alert-category-list">${grouped.map(category=>{ const count=all.filter(x=>(x.category||"Sistema")===category).length; const pct=all.length?Math.round(count/all.length*100):0; return `<div><span><strong>${esc(category)}</strong><small>${count} alerta(s)</small></span><div class="mini-progress"><i style="width:${pct}%"></i></div><b>${pct}%</b></div>`; }).join("") || `<div class="empty">Nenhuma categoria disponível.</div>`}</div></div></section>
4588:       <section class="alert-center-layout professional-alert-layout"><div><div class="professional-section-heading alert-section-heading"><div><small>CENTRAL</small><h3>Todos os alertas</h3></div><span>${all.length} registro(s)</span></div><div class="alert-filter-row">${grouped.map(category=>`<span>${esc(category)} <strong>${all.filter(x=>(x.category||"Sistema")===category).length}</strong></span>`).join("")}</div><div class="alert-center-grid">${cards||`<div class="empty">Nenhum alerta ativo.</div>`}</div></div>
4589:       <aside class="card chat-panel professional-chat-panel"><div class="chat-panel-head"><div><small>COMUNICAÇÃO</small><h3>Chat interno</h3></div><span>${messages.length}</span></div><div class="chat-list">${chatMessages||`<div class="empty">Sem mensagens.</div>`}</div>${role()!=="tv"?`<form id="chatForm" class="chat-form"><input name="message" required placeholder="Mensagem para a equipe"><button class="btn primary">Enviar</button></form>`:""}</aside></section>`;
4590:   }
4591: 
4592:   function defaultHandoverSelection(now = new Date()) {
4593:     const hour = now.getHours();
4594:     if (hour >= 7 && hour < 19) return { date: localDateKey(now), shift: "day" };
4595:     if (hour >= 19) return { date: localDateKey(now), shift: "night" };
4596:     return { date: addDaysToDateKey(localDateKey(now), -1), shift: "night" };
4597:   }
4598: 
4599:   function ensureHandoverSelection() {
4600:     if (!state.handover.date || !state.handover.shift) {
```

## Linha 5278

```js
5260: 
5261:   function profilePasswordForm() {
5262:     return `<form id="profilePasswordForm" novalidate><div class="form-grid">
5263:       <div class="wide"><label>Senha atual *</label><input name="current_password" type="password" autocomplete="current-password" required></div>
5264:       <div><label>Nova senha *</label><input name="new_password" type="password" autocomplete="new-password" minlength="8" required></div>
5265:       <div><label>Confirmar nova senha *</label><input name="confirm_password" type="password" autocomplete="new-password" minlength="8" required></div>
5266:       <div class="wide info-box"><strong>Segurança da conta</strong><br>A nova senha precisa ter pelo menos 8 caracteres. A senha atual será confirmada antes da alteração.</div>
5267:     </div>${formActions("Alterar senha")}</form>`;
5268:   }
5269: 
5270:   function profileAvatarForm() {
5271:     const profile = state.data.profile;
5272:     return `<form id="profileAvatarForm" novalidate><div class="profile-avatar-editor">
5273:       <div class="profile-avatar-preview" data-avatar-preview>${profileAvatarHtml(profile.avatarUrl, profile.name)}</div>
5274:       <div><strong>${esc(profile.name)}</strong><p>Envie uma foto JPG, PNG ou WebP de até 5 MB.</p></div>
5275:     </div><div class="form-grid"><div class="wide"><label>Foto de perfil *</label><input name="avatar" type="file" accept="image/jpeg,image/png,image/webp" required></div></div>${formActions(profile.avatarUrl ? "Trocar foto" : "Salvar foto")}</form>`;
5276:   }
5277: 
5278:   function genericForm(kind, item = {}) {
5279:     const sel = (value, option) => String(value ?? "") === String(option) ? "selected" : "";
5280:     const id = item.id || "";
5281:     const forms = {
5282:       fluid: `<form id="genericForm" data-kind="fluid" data-id="${id}"><div class="form-grid">
5283:         <div class="wide"><label>Nome do produto *</label><input name="name" required value="${esc(item.name || "")}"></div>
5284:         <div><label>Tipo de produto *</label><select name="type" data-fluid-category>${["WBM","Brine","SBM","Olefina","Outro Fluido","Granel","Insumo"].map(x => `<option ${sel(item.type,x)}>${x}</option>`).join("")}</select><small class="field-help">Granel e Insumo aparecem nos silos. As demais opções aparecem nos tanques.</small></div>
5285:         <div><label>Unidade de estoque</label><select name="unit">${["bbl","ton","m³","kg"].map(x => `<option ${sel(item.unit,x)}>${x}</option>`).join("")}</select></div>
5286:         <div><label>Densidade padrão</label><input name="density" type="text" inputmode="decimal" value="${item.density || ""}" placeholder="Ex.: 9,7 ou 4,10"></div>
5287:         <div><label>Unidade da densidade</label><select name="density_unit"><option value="ppg" ${(item.densityUnit || defaultDensityUnit(item.type)) === "ppg" ? "selected" : ""}>ppg</option><option value="t/m³" ${(item.densityUnit || defaultDensityUnit(item.type)) === "t/m³" ? "selected" : ""}>t/m³</option></select></div>
5288:         <div class="catalog-status-field"><label>Status do produto *</label><select name="active" required><option value="true" ${item.active !== false ? "selected" : ""}>Ativo — aparece nos tanques/silos</option><option value="false" ${item.active === false ? "selected" : ""}>Inativo — fica oculto na seleção</option></select><small class="field-help">Ao ativar, o produto volta imediatamente para o menu suspenso dos equipamentos compatíveis.</small></div>
5289:         <div class="wide"><label>Documentos ou fotos</label><input name="attachment" type="file" accept=".pdf,image/jpeg,image/png,image/webp,image/heic,image/heif" multiple></div>
5290:       </div>${formActions(id ? "Salvar alterações" : "Salvar produto")}</form>`,
5291: 
5292:       qhse: `<form id="genericForm" data-kind="qhse" data-id="${id}"><div class="form-grid">
5293:         <div><label>Data</label><input name="date" type="date" value="${String(item.date || new Date().toISOString()).slice(0,10)}"></div>
5294:         <div><label>Tipo</label><select name="type">${["DDS","APR","Inspeção","RIR","Auditoria","Observação"].map(x => `<option ${sel(item.type,x)}>${x}</option>`).join("")}</select></div>
5295:         <div class="wide"><label>Título *</label><input name="title" required value="${esc(item.title || "")}"></div>
5296:         <div class="wide"><label>Descrição</label><textarea name="description">${esc(item.description || "")}</textarea></div>
5297:         <div><label>Responsável</label><input name="responsible" value="${esc(item.responsible || "")}"></div>
5298:         <div><label>Severidade</label><select name="severity">${["Baixa","Média","Alta","Crítica"].map(x => `<option ${sel(item.severity,x)}>${x}</option>`).join("")}</select></div>
5299:         <div><label>Status</label><select name="status">${["Pendente","Em andamento","Concluído"].map(x => `<option ${sel(item.status,x)}>${x}</option>`).join("")}</select></div>
5300:         <div class="wide"><label>Fotos ou documentos</label><input name="attachment" type="file" accept=".pdf,image/jpeg,image/png,image/webp,image/heic,image/heif" multiple capture="environment"></div>
5301:       </div>${formActions(id ? "Salvar alterações" : "Salvar registro")}</form>`,
5302: 
5303:       equipment: `<form id="genericForm" data-kind="equipment" data-id="${id}"><div class="form-grid">
5304:         <div><label>Equipamento *</label><input name="name" required value="${esc(item.name || "")}"></div>
5305:         <div><label>Categoria</label><select name="category">${["Motor a diesel","Bomba","Compressor","Empilhadeira","Outro"].map(x => `<option ${sel(item.category,x)}>${x}</option>`).join("")}</select></div>
5306:         <div><label>Localização</label><input name="location" value="${esc(item.location || "")}"></div>
5307:         <div><label>Status</label><select name="status">${["Operando","Disponível","Parado","Manutenção"].map(x => `<option ${sel(item.status,x)}>${x}</option>`).join("")}</select></div>
5308:         <div><label>Horímetro final</label><input name="hourmeter" type="number" min="0" step="0.1" value="${item.hourmeter || 0}"></div>
5309:         <div><label>Horas trabalhadas</label><input name="last_hours" type="number" min="0" step="0.1" value="${item.last_hours || 0}"></div>
5310:         <div><label>Diesel inicial (L)</label><input name="diesel_initial" type="number" min="0" step="0.1" value="${item.diesel_initial || 0}"></div>
5311:         <div><label>Abastecido (L)</label><input name="refueled" type="number" min="0" step="0.1" value="${item.refueled || 0}"></div>
5312:         <div><label>Diesel final (L)</label><input name="diesel_final" type="number" min="0" step="0.1" value="${item.diesel_final || 0}"></div>
```

## Linha 5869

```js
5851:         status: payload.status, hourmeter: Number(payload.hourmeter || 0),
5852:         last_work_hours: Number(payload.last_hours || 0),
5853:         diesel_initial: Number(payload.diesel_initial || 0),
5854:         diesel_refueled: Number(payload.refueled || 0),
5855:         diesel_final: Number(payload.diesel_final || 0),
5856:         next_maintenance_date: payload.next_maintenance_date || null,
5857:         maintenance_due_hourmeter: Number(payload.maintenance_due_hourmeter || 0) || null,
5858:         maintenance_interval_hours: Number(payload.maintenance_interval_hours || 0) || null,
5859:         notes: payload.notes || null, updated_by: state.user.id
5860:       }],
5861:       certificate: ["certificates", {
5862:         user_id: payload.user_id, owner_name: payload.owner,
5863:         title: payload.title, issuer: payload.issuer || null,
5864:         issued_at: payload.issued_at || null, expires_at: payload.expires_at || null,
5865:         status: payload.status, created_by: state.user.id
5866:       }],
5867:       alert: ["alerts", {
5868:         title: payload.title, message: payload.message, level: payload.level,
5869:         target_group: payload.target || null, is_read: false, created_by: state.user.id
5870:       }]
5871:     };
5872:     const [table, row] = maps[kind];
5873:     if (id && Object.prototype.hasOwnProperty.call(row, "created_by")) delete row.created_by;
5874:     const query = id
5875:       ? state.client.from(table).update(row).eq("id", id).select("id").single()
5876:       : state.client.from(table).insert(row).select("id").single();
5877:     const { data, error } = await query;
5878:     if (error) throw error;
5879:     return data.id;
5880:   }
5881: 
5882:   async function saveMaintenanceOrder(payload, id = null) {
5883:     const completed = ["Concluída", "Fechada"].includes(payload.status);
5884:     const row = {
5885:       equipment_id: payload.equipment_id, title: payload.title,
5886:       description: payload.description || null, priority: payload.priority,
5887:       status: payload.status, due_date: payload.due_date || null,
5888:       responsible: payload.responsible || null, maintenance_type: payload.maintenance_type,
5889:       parts_used: payload.parts_used || null, solution: payload.solution || null,
5890:       estimated_cost: Number(payload.estimated_cost || 0), actual_cost: Number(payload.actual_cost || 0),
5891:       before_notes: payload.before_notes || null, after_notes: payload.after_notes || null,
5892:       closed_at: completed ? new Date().toISOString() : null,
5893:       completed_by: completed ? state.user.id : null,
5894:       created_by: id ? undefined : state.user.id
5895:     };
5896:     Object.keys(row).forEach(key => row[key] === undefined && delete row[key]);
5897:     const query = id
5898:       ? state.client.from("maintenance_orders").update(row).eq("id", id).select("id").single()
5899:       : state.client.from("maintenance_orders").insert(row).select("id").single();
5900:     const { data, error } = await query;
5901:     if (error) throw error;
5902:     return data.id;
5903:   }
```

## Linha 6244

```js
6226:           }).eq("id", data.user.id);
6227:           profileUpdated = !updateError;
6228:         }
6229:         if (!profileUpdated) throw new Error("A conta foi criada, mas o perfil ainda não ficou disponível para configuração.");
6230:       }
6231: 
6232: 
6233:       if (form.id === "truckForm") {
6234:         if (!canManageTrucks()) throw new Error("Seu perfil não pode cadastrar ou editar carretas.");
6235:         const files = [...(form.querySelector('[name="attachment"]')?.files || [])];
6236:         const payload = Object.fromEntries(new FormData(form));
6237:         delete payload.attachment;
6238:         const items = collectTruckPlatformItems(form);
6239:         const recordId = await saveTruck(payload, form.dataset.id || null, items);
6240:         if (files.length) await uploadAttachments("truck", recordId, files);
6241:       }
6242: 
6243:       if (form.id === "genericForm") {
6244:         const kind = form.dataset.kind;
6245:         if (kind === "certificate" && !canManageCertificates()) {
6246:           throw new Error("Somente Logística, Supervisor ou Administrador podem cadastrar certificados.");
6247:         }
6248:         const files = [...(form.querySelector('[name="attachment"]')?.files || [])];
6249:         const payload = Object.fromEntries(new FormData(form));
6250:         delete payload.attachment;
6251:         if ("active" in payload) payload.active = payload.active === "true";
6252:         const recordId = await saveEntity(kind, payload, form.dataset.id || null);
6253:         if (files.length && ["fluid", "truck", "qhse", "certificate"].includes(kind)) {
6254:           await uploadAttachments(kind, recordId, files);
6255:         }
6256:       }
6257: 
6258: 
6259:       if (form.id === "chemicalProductForm") {
6260:         if (!canManageChemicals()) throw new Error("Seu perfil não pode alterar o Catálogo Químico.");
6261:         const payload=Object.fromEntries(new FormData(form));
6262:         const {data,error}=await state.client.rpc("save_chemical_product",{p_id:form.dataset.id||null,p_name:payload.name?.trim(),p_category:payload.category?.trim()||null,p_default_unit:payload.unit,p_active:payload.active==="true",p_notes:payload.notes?.trim()||null});
6263:         if(error) throw error;
6264:         const row=Array.isArray(data)?data[0]:data;
6265:         if(!row?.id) throw new Error("O Supabase não confirmou o produto químico.");
6266:       }
6267: 
6268:       if (form.id === "closingForm") {
6269:         if (!hasRole(["supervisor","lider"])) throw new Error("Seu perfil não pode fechar o turno.");
6270:         const payload=Object.fromEntries(new FormData(form));
6271:         const counts=collectClosingCounts(form);
6272:         const {data,error}=await state.client.rpc("close_operational_period",{p_date:payload.date,p_shift:payload.shift,p_notes:payload.notes?.trim()||null,p_counts:counts});
6273:         if(error) throw error;
6274:         const row=Array.isArray(data)?data[0]:data;
6275:         if(!row?.id) throw new Error("O Supabase não confirmou o fechamento.");
6276:       }
6277: 
6278:       if (form.id === "reopenClosingForm") {
```

## Linha 6457

```js
6439:           role: payload.role,
6440:           department: payload.department || null,
6441:           active: payload.active === "true",
6442:           permissions
6443:         }).eq("id", form.dataset.userId);
6444:         if (error) throw error;
6445:       }
6446: 
6447:       if (form.id === "attachmentUploadForm") {
6448:         const files = [...(form.querySelector('[name="attachment"]')?.files || [])];
6449:         if (!files.length) throw new Error("Selecione pelo menos um arquivo.");
6450:         await uploadAttachments(form.dataset.module, form.dataset.recordId, files);
6451:       }
6452: 
6453:       clearFormDraft(form);
6454:       await loadData();
6455:       renderAll();
6456:       closeModal();
6457:       toast(form.dataset.kind === "fluid" ? "Produto e status atualizados com sucesso." : "Registro salvo com sucesso.", "success");
6458:     } catch (error) {
6459:       try {
6460:         if (state.client && state.user) await state.client.from("system_errors").insert({ user_id: state.user.id, context: `form:${form.id || "unknown"}`, message: error.message, stack: error.stack || null, user_agent: navigator.userAgent });
6461:       } catch (_) {}
6462:       toast(`Erro: ${error.message}`, "error");
6463:     }
6464:   });
6465: 
6466:   document.addEventListener("click", async event => {
6467:     const button = event.target.closest("button");
6468:     if (!button) return;
6469:     if (button.id === "sidebarToggleBtn") {
6470:       const compact = !document.body.classList.contains("sidebar-compact");
6471:       document.body.classList.toggle("sidebar-compact", compact);
6472:       localStorage.setItem("opscontrol_sidebar_compact", String(compact));
6473:       button.setAttribute("aria-label", compact ? "Expandir menu" : "Recolher menu");
6474:       button.title = compact ? "Expandir menu" : "Recolher menu";
6475:       return;
6476:     }
6477:     if (button.dataset.navSectionToggle) {
6478:       const section = button.dataset.navSectionToggle;
6479:       const collapsed = !button.classList.contains("collapsed");
6480:       button.classList.toggle("collapsed", collapsed);
6481:       document.querySelectorAll(`#sidebar .nav-item[data-nav-section="${section}"]`).forEach(item => {
6482:         if (!item.classList.contains("active")) item.classList.toggle("section-collapsed", collapsed);
6483:       });
6484:       return;
6485:     }
6486: 
6487:     if (button.id === "loginBtn") return;
6488:     if (button.id === "forgotPasswordBtn") return requestPasswordRecovery();
6489:     if (button.id === "togglePasswordBtn") {
6490:       const input = $("#loginPassword");
6491:       const visible = input.type === "text";
```

## Linha 6536

```js
6518:     if (button.id === "globalSearchBtn") return openGlobalSearch();
6519: 
6520:     if (button.dataset.pageLink) { showPage(button.dataset.pageLink); return; }
6521:     if (button.dataset.alertPage) { showPage(button.dataset.alertPage); return; }
6522:     if (button.dataset.deleteAlert) {
6523:       if (!isAdmin()) return toast("Somente o administrador pode excluir alertas.", "error");
6524:       const title = button.dataset.alertTitle || "este alerta";
6525:       if (!await confirmAction(`Excluir ${title}? Esta ação ficará registrada na auditoria.`)) return;
6526:       const automatic = button.dataset.alertAutomatic === "true";
6527:       if (automatic) {
6528:         const { error } = await state.client.from("dismissed_system_alerts").upsert({
6529:           alert_key: button.dataset.deleteAlert,
6530:           title,
6531:           category: button.dataset.alertCategory || "Sistema",
6532:           dismissed_by: state.user.id
6533:         }, { onConflict: "alert_key" });
6534:         if (error) return toast(error.message, "error");
6535:       } else {
6536:         const { error } = await state.client.from("alerts").delete().eq("id", button.dataset.deleteAlert);
6537:         if (error) return toast(error.message, "error");
6538:       }
6539:       await loadData();
6540:       renderAlerts();
6541:       renderAll();
6542:       return toast("Alerta excluído da central.", "success");
6543:     }
6544: 
6545:     if (button.hasAttribute("data-tv-slide")) {
6546:       state.tv.slide = Number(button.dataset.tvSlide || 0);
6547:       renderTv();
6548:       return;
6549:     }
6550: 
6551:     if (button.hasAttribute("data-add-operation-allocation")) {
6552:       addOperationAllocationRow(button.closest("#operationForm"));
6553:       return;
6554:     }
6555:     if (button.hasAttribute("data-remove-operation-allocation")) {
6556:       const form = button.closest("#operationForm");
6557:       button.closest("[data-operation-allocation-row]")?.remove();
6558:       refreshOperationAllocationOptions(form);
6559:       updateOperationAllocationSummary(form);
6560:       return;
6561:     }
6562: 
6563: 
6564:     if (button.dataset.searchType) {
6565:       state.searchQuery = $("#globalSearchInput")?.value || state.searchQuery;
6566:       return openSearchResult(button.dataset.searchType, button.dataset.searchId, button.dataset.searchPage);
6567:     }
6568: 
6569:     if (button.dataset.assetQr) {
6570:       const [type, id] = button.dataset.assetQr.split(":");
```

## Linha 6867

```js
6849:     if (action === "new-tank-transfer") return openModal("Transferência entre tanques", tankTransferForm(), "TRANSFERÊNCIA");
6850:     if (action === "new-user") return openModal("Novo usuário", newUserForm(), "USUÁRIO");
6851:     if (action === "show-fefo") {
6852:       const items = [...state.data.chemicals].filter(x => x.quantity > 0).sort((a,b) => (a.expiry_date || "9999-12-31").localeCompare(b.expiry_date || "9999-12-31"));
6853:       return openModal("Ordem de consumo FEFO", `<div class="info-box">Consumir primeiro os lotes que vencem antes.</div><div class="attachment-list" style="margin-top:12px">${items.map((item,index) => `<div class="attachment-item"><div class="attachment-icon">${index+1}</div><div class="attachment-info"><strong>${esc(item.name)} — lote ${esc(item.lot || "-")}</strong><small>Validade ${dateOnly(item.expiry_date)} • ${fmt.format(item.quantity)} ${esc(item.unit)}</small></div>${badge(chemicalDisplayStatus(item))}</div>`).join("") || `<div class="empty">Nenhum lote disponível.</div>`}</div>`, "FEFO");
6854:     }
6855:     if (action === "new-fluid") return openModal("Cadastrar fluido", genericForm("fluid", { type:"WBM", unit:"bbl", densityUnit:"ppg", active:true }), "FLUIDOS E GRANÉIS");
6856:     if (action === "new-bulk") return openModal("Cadastrar granel", genericForm("fluid", { type:"Granel", unit:"ton", densityUnit:"t/m³", active:true }), "FLUIDOS E GRANÉIS");
6857:     if (action === "open-fluid-catalog") {
6858:       closeModal();
6859:       return showPage("fluids");
6860:     }
6861:     if (action === "new-chemical") { if (!canManageChemicals()) return toast("Seu perfil não pode alterar o inventário químico.", "error"); return openModal("Adicionar lote ao inventário", chemicalForm(), "INVENTÁRIO"); }
6862:     if (action === "new-truck") return openModal("Nova movimentação de carreta", truckForm(), "CARRETA");
6863:     if (action === "new-client-ticket") { if (!canManageClientTickets()) return toast("Seu perfil não pode criar tickets de clientes.", "error"); return openModal("Novo ticket de cliente", clientTicketForm(), "DOCUMENTAÇÃO DO CLIENTE"); }
6864:     if (action === "new-qhse") return openModal("Novo registro QHSE", genericForm("qhse"), "QHSE");
6865:     if (action === "new-equipment") return openModal("Novo equipamento", genericForm("equipment"), "EQUIPAMENTO");
6866:     if (action === "new-certificate") { if (!canManageCertificates()) return toast("Somente Logística, Supervisor ou Administrador podem adicionar certificados.", "error"); return openModal("Adicionar certificado", genericForm("certificate"), "CERTIFICADO"); }
6867:     if (action === "new-alert") return openModal("Criar alerta", genericForm("alert"), "ALERTA");
6868:     if (action === "new-maintenance-order") return openModal("Nova ordem de serviço", maintenanceOrderForm(), "MANUTENÇÃO");
6869: 
6870:     if (action === "send-message") {
6871:       const text = $("#chatText")?.value.trim();
6872:       if (!text) return;
6873:       const { error } = await state.client.from("chat_messages").insert({
6874:         channel: "operacao-geral", sender_id: state.user.id,
6875:         sender_name: state.data.profile.name, message: text
6876:       });
6877:       if (error) return toast(error.message, "error");
6878:       await loadData(); renderAlerts();
6879:       return;
6880:     }
6881: 
6882:     if (action === "smart-query") {
6883:       const answer = smartAnswer($("#smartQuestion").value.trim());
6884:       const el = $("#smartAnswer");
6885:       el.textContent = answer;
6886:       el.classList.remove("hidden");
6887:       return;
6888:     }
6889: 
6890:     if (action === "copy-handover") {
6891:       await navigator.clipboard.writeText(handoverText());
6892:       return toast("Passagem de serviço copiada.");
6893:     }
6894: 
6895:     if (action === "toggle-theme") {
6896:       const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
6897:       applyTheme(next);
6898:       return;
6899:     }
6900: 
6901:     if (button.dataset.editHandoverPending) {
```

## Linha 7062

```js
7044:     if (button.dataset.editQhse) {
7045:       const item = state.data.qhse.find(x => x.id === button.dataset.editQhse);
7046:       return openModal(`Editar QHSE — ${item.title}`, genericForm("qhse", item), "ADMIN");
7047:     }
7048: 
7049:     if (button.dataset.editEquipment) {
7050:       const item = state.data.equipment.find(x => x.id === button.dataset.editEquipment);
7051:       return openModal(`Editar equipamento — ${item.name}`, genericForm("equipment", item), "ADMIN");
7052:     }
7053: 
7054:     if (button.dataset.editCertificate) {
7055:       if (!canManageCertificates()) return toast("Somente Logística, Supervisor ou Administrador podem editar certificados.", "error");
7056:       const item = state.data.certificates.find(x => x.id === button.dataset.editCertificate);
7057:       return openModal(`Editar certificado — ${item.title}`, genericForm("certificate", item), "CERTIFICADO");
7058:     }
7059: 
7060:     if (button.dataset.editAlert) {
7061:       const item = state.data.alerts.find(x => x.id === button.dataset.editAlert);
7062:       return openModal(`Editar alerta — ${item.title}`, genericForm("alert", item), "ADMIN");
7063:     }
7064: 
7065:     if (button.dataset.editChemical) {
7066:       if (!canManageChemicals()) return toast("Seu perfil não pode editar o inventário químico.", "error");
7067:       const item = state.data.chemicals.find(x => x.id === button.dataset.editChemical);
7068:       return openModal(`Editar — ${item.name}`, chemicalForm(item), "INVENTÁRIO");
7069:     }
7070: 
7071:     if (button.dataset.chemicalMove) {
7072:       if (!canManageChemicals()) return toast("Seu perfil não pode movimentar o inventário químico.", "error");
7073:       const item = state.data.chemicals.find(x => x.id === button.dataset.chemicalMove);
7074:       return openModal(`Movimentar — ${item.name}`, chemicalMovementForm(item), "MOVIMENTAÇÃO");
7075:     }
7076: 
7077:     if (button.dataset.chemicalHistory) {
7078:       const item = state.data.chemicals.find(x => x.id === button.dataset.chemicalHistory);
7079:       const history = state.data.chemicalMovements.filter(x => x.inventory_id === item.id);
7080:       const rows = history.map(movement => {
7081:         const user = state.data.users.find(x => x.id === movement.performed_by)?.name || "Usuário";
7082:         return `<div class="timeline-item"><span class="timeline-dot"></span><div>
7083:           <strong>${esc(movement.movement_type)} — ${fmt.format(movement.quantity)} ${esc(item.unit)}</strong>
7084:           <small>${dateTime(movement.created_at)} • ${esc(user)}</small>
7085:           <p>Saldo: ${fmt.format(movement.previous_balance)} → ${fmt.format(movement.new_balance)} ${esc(item.unit)}<br>
7086:           Referência: ${esc(movement.reference || "-")}<br>${esc(movement.notes || "")}</p>
7087:         </div></div>`;
7088:       }).join("");
7089:       return openModal(`Histórico — ${item.name}`, `<div class="timeline professional-timeline">${rows || `<div class="empty">Nenhuma movimentação registrada.</div>`}</div>`, "RASTREABILIDADE");
7090:     }
7091: 
7092:     if (button.dataset.export) {
7093:       exportData(button.dataset.export);
7094:       return;
7095:     }
7096: 
```
