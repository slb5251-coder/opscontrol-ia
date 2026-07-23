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
 const client=supabase;
 if(!client){onState?.('disconnected');return()=>undefined}
 let refreshTimer:ReturnType<typeof setTimeout>|null=null;
 let reconnectTimer:ReturnType<typeof setTimeout>|null=null;
 let channel:RealtimeChannel|null=null;
 let stopped=false;
 let connecting=false;
 let latestEvent:OperationalRealtimeEvent|null=null;

 const clearReconnect=()=>{
  if(reconnectTimer){clearTimeout(reconnectTimer);reconnectTimer=null}
 };
 const removeCurrentChannel=async()=>{
  const current=channel;
  channel=null;
  if(current)await client.removeChannel(current);
 };
 const scheduleRefresh=(table:string,payload:RealtimePayload)=>{
  if(stopped||!navigator.onLine)return;
  latestEvent={table,eventType:normalizeEventType(payload.eventType),receivedAt:new Date().toISOString()};
  if(refreshTimer)clearTimeout(refreshTimer);
  refreshTimer=setTimeout(()=>{
   refreshTimer=null;
   const event=latestEvent;
   latestEvent=null;
   if(!stopped&&event)onChange(event);
  },450);
 };
 const scheduleReconnect=()=>{
  if(stopped||!navigator.onLine||reconnectTimer)return;
  reconnectTimer=setTimeout(async()=>{
   reconnectTimer=null;
   await removeCurrentChannel();
   connect();
  },3000);
 };
 const connect=()=>{
  if(stopped||connecting||!navigator.onLine)return;
  connecting=true;
  clearReconnect();
  onState?.('connecting');
  const nextChannel=client.channel(`opscontrol-next-operational-${Date.now()}`);
  realtimeTables.forEach(table=>{
   nextChannel.on('postgres_changes',{event:'*',schema:'public',table},payload=>scheduleRefresh(table,payload));
  });
  channel=nextChannel;
  nextChannel.subscribe(status=>{
   if(stopped||channel!==nextChannel)return;
   if(status==='SUBSCRIBED'){
    connecting=false;
    onState?.('connected');
   }else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){
    connecting=false;
    onState?.('error');
    scheduleReconnect();
   }else if(status==='CLOSED'){
    connecting=false;
    onState?.('disconnected');
    scheduleReconnect();
   }else onState?.('connecting');
  });
 };
 const onOnline=async()=>{
  if(stopped)return;
  connecting=false;
  clearReconnect();
  await removeCurrentChannel();
  connect();
 };
 const onOffline=()=>{
  connecting=false;
  clearReconnect();
  if(refreshTimer){clearTimeout(refreshTimer);refreshTimer=null}
  latestEvent=null;
  onState?.('disconnected');
 };
 window.addEventListener('online',onOnline);
 window.addEventListener('offline',onOffline);
 connect();

 return()=>{
  stopped=true;
  connecting=false;
  window.removeEventListener('online',onOnline);
  window.removeEventListener('offline',onOffline);
  if(refreshTimer)clearTimeout(refreshTimer);
  clearReconnect();
  latestEvent=null;
  if(channel)void client.removeChannel(channel);
  channel=null;
 };
}