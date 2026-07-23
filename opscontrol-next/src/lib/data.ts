import { supabase } from './supabase';

export type Tank = { id:string; name:string; kind:string; phase:string; capacity:number; current_volume:number; current_product:string|null; current_lot?:string|null; client?:string|null; status:string; unit:string; updated_at?:string; };
export type DashboardSummary = { operations_in_progress:number|null; operations_scheduled:number|null; trucks_pending:number|null; qhse_pending:number|null; tanks_blocked?:number|null; equipment_unavailable?:number|null; };
export type Operation = { id:string; vessel:string; client:string; product:string; activity:string; status:string; planned_quantity:number; executed_quantity:number; unit:string; scheduled_at:string|null; };
export type VesselSchedule = { id:string; vessel_name:string; client:string; operation_type:string; product:string|null; planned_quantity:number; unit:string; status:string; eta:string|null; berth:string|null; };
export type TankHistory = { id:string; created_at:string; movement_type:string|null; movement_direction:string|null; moved_quantity:number|null; previous_volume:number|null; new_volume:number|null; notes:string|null; };

export async function loadDashboard(){
  if(!supabase) throw new Error('Supabase não configurado.');
  const [tanksResult,summaryResult,alertsResult,operationsResult,vesselsResult]=await Promise.all([
    supabase.from('tanks').select('id,name,kind,phase,capacity,current_volume,current_product,current_lot,client,status,unit,updated_at').order('display_order'),
    supabase.from('dashboard_summary').select('*').maybeSingle(),
    supabase.from('operational_alert_center').select('alert_key,title,message,level,created_at').order('created_at',{ascending:false}).limit(12),
    supabase.from('operations').select('id,vessel,client,product,activity,status,planned_quantity,executed_quantity,unit,scheduled_at').order('scheduled_at',{ascending:true}).limit(12),
    supabase.from('vessel_schedules').select('id,vessel_name,client,operation_type,product,planned_quantity,unit,status,eta,berth').order('eta',{ascending:true}).limit(12)
  ]);
  const error=tanksResult.error||summaryResult.error||alertsResult.error||operationsResult.error||vesselsResult.error;
  if(error) throw error;
  return { tanks:(tanksResult.data??[]) as Tank[], summary:(summaryResult.data??null) as DashboardSummary|null, alerts:alertsResult.data??[], operations:(operationsResult.data??[]) as Operation[], vessels:(vesselsResult.data??[]) as VesselSchedule[] };
}

export async function loadTankHistory(tankId:string){
  if(!supabase) return [];
  const {data,error}=await supabase.from('tank_history').select('id,created_at,movement_type,movement_direction,moved_quantity,previous_volume,new_volume,notes').eq('tank_id',tankId).order('created_at',{ascending:false}).limit(30);
  if(error) throw error;
  return (data??[]) as TankHistory[];
}
