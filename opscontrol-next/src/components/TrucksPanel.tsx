import {Plus,Truck} from 'lucide-react';
import type {Truck as TruckRecord} from '../lib/data';

type Props={trucks:TruckRecord[];canEdit:boolean;saving:boolean;onNew:()=>void;onAdvance:(id:string,current:string|null)=>void};

export function TrucksPanel({trucks,canEdit,saving,onNew,onAdvance}:Props){return <section><div className="module-head"><div><span>FLUXO LOGÍSTICO</span><h2>Carretas</h2><p>Entrada, operação e liberação.</p></div>{canEdit&&<button className="primary" onClick={onNew}><Plus size={16}/>Nova carreta</button>}</div><div className="workflow-grid">{trucks.length?trucks.map(t=><article key={t.id}><Truck/><div><strong>{t.plate||'Sem placa'}</strong><span>{t.product} · {t.quantity} {t.unit}</span><small>{t.supplier} · NF {t.invoice_number||'—'}</small></div><div><b>{t.workflow_stage}</b>{canEdit&&<button className="mini-action" disabled={saving} onClick={()=>onAdvance(t.id,t.workflow_stage)}>Avançar etapa</button>}</div></article>):<div className="empty-state">Nenhuma carreta cadastrada.</div>}</div></section>}
