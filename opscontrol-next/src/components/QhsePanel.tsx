import {Plus,ShieldCheck} from 'lucide-react';
import type {QhseRecord} from '../lib/data';

type Props={records:QhseRecord[];canCreate:boolean;onCreate:()=>void};

export function QhsePanel({records,canCreate,onCreate}:Props){
  return <section>
    <div className="module-head"><div><span>SEGURANÇA E CONFORMIDADE</span><h2>QHSE</h2><p>Registros, severidade e tratamento de pendências.</p></div>{canCreate&&<button className="primary" onClick={onCreate}><Plus size={16}/>Novo registro</button>}</div>
    <div className="cards-list">
      {records.length?records.map(q=><article key={q.id}><ShieldCheck/><div><strong>{q.title}</strong><span>{q.record_type} · {q.severity}</span></div><b>{q.status}</b></article>):<div className="module-empty">Nenhum registro QHSE encontrado.</div>}
    </div>
  </section>;
}
