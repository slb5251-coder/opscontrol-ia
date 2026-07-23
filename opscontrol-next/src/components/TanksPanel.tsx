import {Search} from 'lucide-react';
import type {Tank} from '../lib/data';

type Props={tanks:Tank[];query:string;onQuery:(value:string)=>void;renderTank:(tank:Tank)=>React.ReactNode};

export function TanksPanel({tanks,query,onQuery,renderTank}:Props){return <section><div className="module-head"><div><span>GESTÃO DE TANCAGEM</span><h2>Tanques e silos</h2><p>Capacidade, produto, cliente, status e histórico.</p></div></div><div className="filters"><div><Search size={16}/><input value={query} onChange={e=>onQuery(e.target.value)} placeholder="Buscar tanque, produto ou cliente"/></div></div><div className="tank-grid-list expanded">{tanks.length?tanks.map(renderTank):<div className="empty-state">Nenhum tanque encontrado.</div>}</div></section>}
