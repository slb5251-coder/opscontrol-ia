import type {RealtimeChannel} from '@supabase/supabase-js';
import {supabase} from './supabase';

const realtimeTables=['tanks','tank_history','operations','vessel_schedules','trucks','truck_stage_history','maintenance_orders','qhse_records','audit_logs'] as const;

export type RealtimeState='connecting'|'connected'|'disconnected'|'error';

export function subscribeOperationalChanges(onChange:()=>void,onState?:(state:RealtimeState)=>void){
 if(!supabase){onState?.('disconnected');return()=>undefined}
 let timer:ReturnType<typeof setTimeout>|null=null;
 const scheduleRefresh=()=>{
  if(timer)clearTimeout(timer);
  timer=setTimeout(onChange,450);
 };
 let channel:RealtimeChannel=supabase.channel('opscontrol-next-operational');
 realtimeTables.forEach(table=>{
  channel=channel.on('postgres_changes',{event:'*',schema:'public',table},scheduleRefresh);
 });
 channel.subscribe(status=>{
  if(status==='SUBSCRIBED')onState?.('connected');
  else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')onState?.('error');
  else if(status==='CLOSED')onState?.('disconnected');
  else onState?.('connecting');
 });
 return()=>{
  if(timer)clearTimeout(timer);
  void supabase.removeChannel(channel);
 };
}
