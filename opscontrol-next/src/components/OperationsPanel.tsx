import {Activity, Plus} from 'lucide-react';
import {useMemo,useState} from 'react';
import type {Operation} from '../lib/data';

type Props={operations:Operation[];canEdit:boolean;onNew:()=>void;onEdit:(operation:Operation)=>void};

const filters=['Todas','Programada','Em andamento','Pausada','Concluída'] as const;
const progress=(executed:number,planned:number)=>Math.max(0,Math.min(100,Math.round(executed/(planned||1)*100)));

export function OperationsPanel({operations,canEdit,onNew,onEdit}:Props){
  const[filter,setFilter]=useState<(typeof filters)[number]>('Todas');
  const visible=useMemo(()=>filter==='Todas'?operations:operations.filter(o=>o.status===filter),[operations,filter]);
  const active=operations.filter(o=>['Em andamento','Pausada'].includes(o.status)).length;
  return <section>
    <div className="module-head"><div><span>PROGRAMAÇÃO OPERACIONAL</span><h2>Operações</h2><p>Planejado versus executado, com prioridade para atividades em andamento.</p></div>{canEdit&&<button className="primary" onClick={onNew}><Plus size={16}/>Nova operação</button>}</div>
    <div className="module-summary"><span><Activity size={15}/> {active} operação(ões) ativa(s)</span><strong>{operations.length} registros</strong></div>
    <div className="quick-filters">{filters.map(item=><button key={item} className={filter===item?'active':''} onClick={()=>setFilter(item)}>{item}</button>)}</div>
    <div className="data-list operation-list">{visible.length?visible.map(o=>{const pct=progress(o.executed_quantity,o.planned_quantity);return <article key={o.id}>
      <div><strong>{o.vessel}</strong><span>{o.client} · {o.product}</span><small>{o.activity} · {o.unit}</small></div>
      <div className="operation-progress"><b>{pct}%</b><span>{o.executed_quantity.toLocaleString('pt-BR')} / {o.planned_quantity.toLocaleString('pt-BR')} {o.unit}</span><div><i style={{width:`${pct}%`}}/></div></div>
      <small className={`status-chip status-${o.status.toLowerCase().replaceAll(' ','-')}`}>{o.status}</small>
      {canEdit&&<button className="mini-action" onClick={()=>onEdit(o)}>Editar</button>}
    </article>}):<div className="empty-state">Nenhuma operação encontrada neste filtro.</div>}</div>
  </section>
}