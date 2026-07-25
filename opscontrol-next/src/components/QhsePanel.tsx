import {Plus,ShieldCheck} from 'lucide-react';
import {useMemo,useState} from 'react';
import type {QhseRecord} from '../lib/data';

type Props={records:QhseRecord[];canCreate:boolean;onCreate:()=>void};

const filters=['Todos','Crítica','Alta','Média','Baixa'] as const;

export function QhsePanel({records,canCreate,onCreate}:Props){
  const[filter,setFilter]=useState<(typeof filters)[number]>('Todos');
  const visible=useMemo(()=>filter==='Todos'?records:records.filter(q=>q.severity===filter),[records,filter]);
  const pending=records.filter(q=>q.status!=='Concluído'&&q.status!=='Concluída').length;
  const critical=records.filter(q=>q.severity==='Crítica'&&q.status!=='Concluído'&&q.status!=='Concluída').length;
  return <section>
    <div className="module-head"><div><span>SEGURANÇA E CONFORMIDADE</span><h2>QHSE</h2><p>Registros, severidade e tratamento de pendências.</p></div>{canCreate&&<button className="primary" onClick={onCreate}><Plus size={16}/>Novo registro</button>}</div>
    <div className="module-summary"><span><b>{pending}</b> pendentes</span><span className={critical?'danger':''}><b>{critical}</b> críticos</span><span><b>{records.length}</b> total</span></div>
    <div className="quick-filters">{filters.map(item=><button key={item} className={filter===item?'active':''} onClick={()=>setFilter(item)}>{item}</button>)}</div>
    <div className="cards-list qhse-list">
      {visible.length?visible.map(q=><article key={q.id} className={`severity-${(q.severity||'média').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}`}><ShieldCheck/><div><strong>{q.title}</strong><span>{q.record_type} · {q.severity}</span><small>{q.responsible||'Sem responsável'}{q.record_date?` · ${new Date(`${q.record_date}T12:00:00`).toLocaleDateString('pt-BR')}`:''}</small></div><div className="status-stack"><b>{q.status}</b><em>{q.severity}</em></div></article>):<div className="module-empty">Nenhum registro encontrado neste filtro.</div>}
    </div>
  </section>;
}