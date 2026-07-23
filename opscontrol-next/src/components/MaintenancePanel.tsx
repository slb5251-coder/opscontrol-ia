import {Plus,Wrench} from 'lucide-react';
import type {Maintenance} from '../lib/data';

type Props={maintenance:Maintenance[];canCreate:boolean;onCreate:()=>void};

export function MaintenancePanel({maintenance,canCreate,onCreate}:Props){
  return <section>
    <div className="module-head"><div><span>CONFIABILIDADE</span><h2>Manutenção</h2><p>Ordens, prioridades, responsáveis e prazos.</p></div>{canCreate&&<button className="primary" onClick={onCreate}><Plus size={16}/>Nova ordem</button>}</div>
    <div className="cards-list">
      {maintenance.length?maintenance.map(m=><article key={m.id}><Wrench/><div><strong>{m.title}</strong><span>{m.equipment?.name||'Equipamento'} · {m.maintenance_type}</span></div><b>{m.status}</b></article>):<div className="module-empty">Nenhuma ordem de manutenção registrada.</div>}
    </div>
  </section>;
}
