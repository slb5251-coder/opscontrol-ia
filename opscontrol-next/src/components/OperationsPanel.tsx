import {Plus} from 'lucide-react';
import type {Operation} from '../lib/data';

type Props={operations:Operation[];canEdit:boolean;onNew:()=>void;onEdit:(operation:Operation)=>void};

export function OperationsPanel({operations,canEdit,onNew,onEdit}:Props){return <section>{<div className="module-head"><div><span>PROGRAMAÇÃO OPERACIONAL</span><h2>Operações</h2><p>Planejado versus executado.</p></div>{canEdit&&<button className="primary" onClick={onNew}><Plus size={16}/>Nova operação</button>}</div>}<div className="data-list">{operations.length?operations.map(o=><article key={o.id}><div><strong>{o.vessel}</strong><span>{o.client} · {o.product}</span></div><b>{o.executed_quantity}/{o.planned_quantity} {o.unit}</b><small>{o.status}</small>{canEdit&&<button className="mini-action" onClick={()=>onEdit(o)}>Editar</button>}</article>):<div className="empty-state">Nenhuma operação cadastrada.</div>}</div></section>}
