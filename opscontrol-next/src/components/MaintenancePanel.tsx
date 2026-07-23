import {Plus,Wrench} from 'lucide-react';
import {useMemo,useState} from 'react';
import type {Maintenance} from '../lib/data';

type Props={maintenance:Maintenance[];canCreate:boolean;onCreate:()=>void};

const filters=['Todas','Crítica','Alta','Média','Baixa'] as const;

export function MaintenancePanel({maintenance,canCreate,onCreate}:Props){
  const[filter,setFilter]=useState<(typeof filters)[number]>('Todas');
  const visible=useMemo(()=>filter==='Todas'?maintenance:maintenance.filter(m=>m.priority===filter),[maintenance,filter]);
  const open=maintenance.filter(m=>m.status!=='Concluída'&&m.status!=='Concluído').length;
  const critical=maintenance.filter(m=>m.priority==='Crítica'&&m.status!=='Concluída'&&m.status!=='Concluído').length;
  return <section>
    <div className="module-head"><div><span>CONFIABILIDADE</span><h2>Manutenção</h2><p>Ordens, prioridades, responsáveis e prazos.</p></div>{canCreate&&<button className="primary" onClick={onCreate}><Plus size={16}/>Nova ordem</button>}</div>
    <div className="module-summary"><span><b>{open}</b> abertas</span><span className={critical?'danger':''}><b>{critical}</b> críticas</span><span><b>{maintenance.length}</b> total</span></div>
    <div className="quick-filters">{filters.map(item=><button key={item} className={filter===item?'active':''} onClick={()=>setFilter(item)}>{item}</button>)}</div>
    <div className="cards-list maintenance-list">
      {visible.length?visible.map(m=><article key={m.id} className={`priority-${(m.priority||'média').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}`}><Wrench/><div><strong>{m.title}</strong><span>{m.equipment?.name||'Equipamento'} · {m.maintenance_type}</span><small>{m.responsible||'Sem responsável'}{m.due_date?` · prazo ${new Date(`${m.due_date}T12:00:00`).toLocaleDateString('pt-BR')}`:''}</small></div><div className="status-stack"><b>{m.status}</b><em>{m.priority}</em></div></article>):<div className="module-empty">Nenhuma ordem encontrada neste filtro.</div>}
    </div>
  </section>;
}