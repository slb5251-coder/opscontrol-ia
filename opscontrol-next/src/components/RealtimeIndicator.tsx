import {useMemo} from 'react';
import type {OperationalRealtimeEvent,RealtimeState} from '../lib/realtime';

type Props={state:RealtimeState;pending:boolean;lastEvent:OperationalRealtimeEvent|null;onSync:()=>void};

const tableLabels:Record<string,string>={
 tanks:'Tanques',
 tank_history:'Histórico de tanques',
 operations:'Operações',
 vessel_schedules:'Embarcações',
 trucks:'Carretas',
 truck_stage_history:'Fluxo de carretas',
 maintenance_orders:'Manutenção',
 qhse_records:'QHSE',
 audit_logs:'Auditoria',
 manual:'Sincronização manual',
 resume:'Atualização ao retornar',
 reconnect:'Atualização após reconexão'
};

export function RealtimeIndicator({state,pending,lastEvent,onSync}:Props){
 const moduleLabel=lastEvent?tableLabels[lastEvent.table]||lastEvent.table:null;
 const label=useMemo(()=>{
  if(state==='disconnected')return'Sem conexão';
  if(pending)return'Atualização pendente';
  if(state==='connecting')return'Conectando...';
  if(state==='error')return'Tempo real indisponível';
  if(lastEvent)return`${moduleLabel} · ${new Date(lastEvent.receivedAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`;
  return'Tempo real ativo';
 },[lastEvent,moduleLabel,pending,state]);

 const title=state==='disconnected'?'Sem acesso à internet. A sincronização será retomada automaticamente.':lastEvent?`${lastEvent.eventType} em ${moduleLabel} · ${new Date(lastEvent.receivedAt).toLocaleString('pt-BR')}`:`Supabase Realtime: ${state}`;
 const ariaLabel=`${label}. Clique para sincronizar os dados da aplicação sem recarregar o navegador.`;

 return <button type="button" className={`realtime-indicator realtime-${state==='disconnected'?'disconnected':pending?'pending':state}`} title={title} aria-label={ariaLabel} aria-live="polite" onClick={onSync} disabled={state==='disconnected'}><i aria-hidden="true"/><span>{label}</span><small>{state==='disconnected'?'Offline':'Sincronizar'}</small></button>;
}
