import type {RealtimeChannel} from '@supabase/supabase-js';
import {supabase} from './supabase';

const realtimeTables=['tanks','tank_history','operations','vessel_schedules','trucks','truck_stage_history','maintenance_orders','qhse_records','audit_logs'] as const;

export type RealtimeState='connecting'|'connected'|'disconnected'|'error';
export type OperationalRealtimeEvent={table:string;eventType:'INSERT'|'UPDATE'|'DELETE';receivedAt:string};
type RealtimePayload={eventType?:string};

function normalizeEventType(value:string|undefined):OperationalRealtimeEvent['eventType']{
 return value==='INSERT'||value==='DELETE'?value:'UPDATE';
}

export function subscribeOperationalChanges(onChange:(event:OperationalRealtimeEvent)=>void,onState?:(state:RealtimeState)=>void){
 if(!supabase){onState?.('disconnected');return()=>undefined}
 let refreshTimer:ReturnType<typeof setTimeout>|null=null;
 let reconnectTimer:ReturnType<typeof setTimeout>|null=null;
 let channel:RealtimeChannel|null=null;
 let stopped=false;
 let latestEvent:OperationalRealtimeEvent|null=null;

 const scheduleRefresh=(table:string,payload:RealtimePayload)=>{
  latestEvent={table,eventType:normalizeEventType(payload.eventType),receivedAt:new Date().toISOString()};
  if(refreshTimer)clearTimeout(refreshTimer);
  refreshTimer=setTimeout(()=>{if(latestEvent)onChange(latestEvent)},450);
 };

 const connect=()=>{
  if(stopped)return;
  onState?.('connecting');
  channel=supabase.channel(`opscontrol-next-operational-${Date.now()}`);
  realtimeTables.forEach(table=>{
   channel=channel!.on('postgres_changes',{event:'*',schema:'public',table},payload=>scheduleRefresh(table,payload));
  });
  channel.subscribe(status=>{
   if(status==='SUBSCRIBED')onState?.('connected');
   else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){
    onState?.('error');
    if(!stopped){
     reconnectTimer=setTimeout(async()=>{
      if(channel)await supabase.removeChannel(channel);
      connect();
     },3000);
    }
   }else if(status==='CLOSED')onState?.('disconnected');
   else onState?.('connecting');
  });
 };

 const onOnline=()=>{if(!stopped){if(channel)void supabase.removeChannel(channel);connect()}};
 const onOffline=()=>onState?.('disconnected');
 window.addEventListener('online',onOnline);
 window.addEventListener('offline',onOffline);
 connect();

 return()=>{
  stopped=true;
  window.removeEventListener('online',onOnline);
  window.removeEventListener('offline',onOffline);
  if(refreshTimer)clearTimeout(refreshTimer);
  if(reconnectTimer)clearTimeout(reconnectTimer);
  if(channel)void supabase.removeChannel(channel);
 };
}
