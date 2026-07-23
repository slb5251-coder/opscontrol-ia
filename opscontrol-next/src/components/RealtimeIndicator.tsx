import {useMemo} from 'react';
import type {OperationalRealtimeEvent,RealtimeState} from '../lib/realtime';

type Props={state:RealtimeState;pending:boolean;lastEvent:OperationalRealtimeEvent|null};

export function RealtimeIndicator({state,pending,lastEvent}:Props){
 const label=useMemo(()=>{
  if(pending)return'Atualização pendente';
  if(state==='connecting')return'Conectando...';
  if(state==='error')return'Tempo real indisponível';
  if(state==='disconnected')return'Tempo real desconectado';
  if(lastEvent)return`Atualizado ${new Date(lastEvent.receivedAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`;
  return'Tempo real ativo';
 },[lastEvent,pending,state]);

 const title=lastEvent?`${lastEvent.eventType} em ${lastEvent.table} · ${new Date(lastEvent.receivedAt).toLocaleString('pt-BR')}`:`Supabase Realtime: ${state}`;

 return <button type="button" className={`realtime-indicator realtime-${pending?'pending':state}`} title={title} onClick={()=>window.location.reload()}><i/><span>{label}</span><small>Atualizar</small></button>;
}
