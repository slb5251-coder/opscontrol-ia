import {Ship} from 'lucide-react';
import type {VesselSchedule} from '../lib/data';

type Props={vessels:VesselSchedule[]};

export function VesselsPanel({vessels}:Props){
  return <section>
    <div className="module-head"><div><span>CRONOGRAMA MARÍTIMO</span><h2>Embarcações</h2><p>ETA, cliente, produto e situação operacional.</p></div></div>
    <div className="vessel-grid">
      {vessels.length?vessels.map(v=><article key={v.id}><Ship/><div><strong>{v.vessel_name}</strong><span>{v.client} · {v.product||v.operation_type}</span></div><b>{v.status}</b></article>):<div className="module-empty">Nenhuma embarcação programada.</div>}
    </div>
  </section>;
}
