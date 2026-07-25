import {Plus,Truck} from 'lucide-react';
import {useMemo,useState} from 'react';
import type {Truck as TruckRecord} from '../lib/data';

type Props={trucks:TruckRecord[];canEdit:boolean;saving:boolean;onNew:()=>void;onAdvance:(id:string,current:string|null)=>void};
const stages=['Todas','programada','portaria','pátio','operação','liberada'] as const;

export function TrucksPanel({trucks,canEdit,saving,onNew,onAdvance}:Props){
  const[stage,setStage]=useState<(typeof stages)[number]>('Todas');
  const visible=useMemo(()=>stage==='Todas'?trucks:trucks.filter(t=>(t.workflow_stage||'programada').toLowerCase()===stage),[trucks,stage]);
  const pending=trucks.filter(t=>(t.workflow_stage||'').toLowerCase()!=='liberada').length;
  return <section>
    <div className="module-head"><div><span>FLUXO LOGÍSTICO</span><h2>Carretas</h2><p>Entrada, operação e liberação com acompanhamento por etapa.</p></div>{canEdit&&<button className="primary" onClick={onNew}><Plus size={16}/>Nova carreta</button>}</div>
    <div className="module-summary"><span><Truck size={15}/> {pending} carreta(s) pendente(s)</span><strong>{trucks.length} registros</strong></div>
    <div className="quick-filters">{stages.map(item=><button key={item} className={stage===item?'active':''} onClick={()=>setStage(item)}>{item==='Todas'?item:item[0].toUpperCase()+item.slice(1)}</button>)}</div>
    <div className="workflow-grid">{visible.length?visible.map(t=>{const current=(t.workflow_stage||'programada').toLowerCase();const released=current==='liberada';const quantity=t.quantity??0;return <article key={t.id}>
      <Truck/>
      <div><strong>{t.plate||'Sem placa'}</strong><span>{t.product||'Produto não informado'} · {quantity.toLocaleString('pt-BR')} {t.unit||''}</span><small>{t.supplier||'Fornecedor não informado'} · NF {t.invoice_number||'—'} · {t.driver_name||'Motorista não informado'}</small></div>
      <div><b className={`status-chip status-${current}`}>{t.workflow_stage||'Programada'}</b>{canEdit&&<button className="mini-action" disabled={saving||released} onClick={()=>onAdvance(t.id,t.workflow_stage)}>{released?'Fluxo concluído':'Avançar etapa'}</button>}</div>
    </article>}):<div className="empty-state">Nenhuma carreta encontrada nesta etapa.</div>}</div>
  </section>
}
