import {Search} from 'lucide-react';
import {useMemo,useState} from 'react';
import type {Tank} from '../lib/data';

type Props={tanks:Tank[];query:string;onQuery:(value:string)=>void;renderTank:(tank:Tank)=>React.ReactNode};

const filters=['Todos','Operando','Disponível','Recebendo','Bloqueado','Manutenção'] as const;

export function TanksPanel({tanks,query,onQuery,renderTank}:Props){
  const[filter,setFilter]=useState<(typeof filters)[number]>('Todos');
  const visible=useMemo(()=>filter==='Todos'?tanks:tanks.filter(t=>t.status===filter),[tanks,filter]);
  const critical=tanks.filter(t=>{const level=t.current_volume/(t.capacity||1);return level<=.2||level>=.9||['Bloqueado','Manutenção'].includes(t.status)}).length;
  const operating=tanks.filter(t=>t.status==='Operando'||t.status==='Recebendo').length;
  return <section>
    <div className="module-head"><div><span>GESTÃO DE TANCAGEM</span><h2>Tanques e silos</h2><p>Capacidade, produto, cliente, status e histórico.</p></div></div>
    <div className="module-summary"><span><b>{operating}</b> em operação</span><span className={critical?'danger':''}><b>{critical}</b> críticos</span><span><b>{tanks.length}</b> total</span></div>
    <div className="module-toolbar"><div className="filters"><div><Search size={16}/><input value={query} onChange={e=>onQuery(e.target.value)} placeholder="Buscar tanque, produto ou cliente"/></div></div><div className="quick-filters">{filters.map(item=><button key={item} className={filter===item?'active':''} onClick={()=>setFilter(item)}>{item}</button>)}</div></div>
    <div className="tank-grid-list expanded">{visible.length?visible.map(renderTank):<div className="empty-state">Nenhum tanque encontrado neste filtro.</div>}</div>
  </section>;
}