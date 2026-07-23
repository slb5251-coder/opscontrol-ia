import {ClipboardList} from 'lucide-react';
import type {AuditLog} from '../lib/data';

type Props={entries:AuditLog[]};

export function AuditPanel({entries}:Props){
  return <section>
    <div className="module-head"><div><span>RASTREABILIDADE</span><h2>Auditoria</h2><p>Histórico das alterações realizadas no sistema.</p></div></div>
    <div className="audit-list">
      {entries.length?entries.map(a=><article key={a.id}><ClipboardList/><div><strong>{a.table_name} · {a.action}</strong><span>Registro {a.record_id||'—'}</span><small>{new Date(a.created_at).toLocaleString('pt-BR')}</small></div></article>):<div className="module-empty">Nenhum evento de auditoria encontrado.</div>}
    </div>
  </section>;
}
