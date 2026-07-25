import { supabase } from './supabase';

export type Tank={id:string;name:string;kind:string;phase:string;capacity:number;current_volume:number;current_product:string|null;current_lot?:string|null;client?:string|null;status:string;unit:string;updated_at?:string;current_fluid_type_id?:string|null};
export type DashboardSummary={operations_in_progress:number|null;operations_scheduled:number|null;trucks_pending:number|null;qhse_pending:number|null;tanks_blocked?:number|null;equipment_unavailable?:number|null};
export type Operation={id:string;vessel:string;client:string;product:string;activity:string;status:string;planned_quantity:number;executed_quantity:number;unit:string;scheduled_at:string|null;notes?:string|null};
export type VesselSchedule={id:string;vessel_name:string;client:string;operation_type:string;product:string|null;planned_quantity:number;unit:string;status:string;eta:string|null;berth:string|null};
export type TankHistory={id:string;created_at:string;movement_type:string|null;movement_direction:string|null;moved_quantity:number|null;previous_volume:number|null;new_volume:number|null;notes:string|null};
export type Truck={id:string;plate:string|null;driver_name:string|null;supplier:string|null;client:string|null;product:string|null;quantity:number|null;unit:string|null;invoice_number:string|null;workflow_stage:string|null;current_stage_minutes:number|null;overdue:boolean|null};
export type Maintenance={id:string;title:string;maintenance_type:string;priority:string;responsible:string|null;due_date:string|null;status:string;equipment:{name:string}|null};
export type QhseRecord={id:string;title:string;record_type:string;severity:string;status:string;responsible:string|null;record_date:string};
export type Profile={id:string;full_name:string;role:string;department:string|null;permissions:Record<string,unknown>;active:boolean};
export type FluidType={id:string;name:string;category:string;default_unit:string};
export type Equipment={id:string;name:string;category:string;status:string};
export type AuditLog={id:number;table_name:string;record_id:string|null;action:string;old_data:any;new_data:any;created_at:string;profile?:{full_name:string}|null};

type MaintenanceRow=Omit<Maintenance,'equipment'>&{equipment:{name:string}[]|{name:string}|null};

export async function loadDashboard(){
 if(!supabase)throw new Error('Supabase não configurado.');
 const[tanksResult,summaryResult,alertsResult,operationsResult,vesselsResult,trucksResult,maintenanceResult,qhseResult]=await Promise.all([
  supabase.from('tanks').select('id,name,kind,phase,capacity,current_volume,current_product,current_lot,client,status,unit,updated_at,current_fluid_type_id').order('display_order'),
  supabase.from('dashboard_summary').select('*').maybeSingle(),
  supabase.from('operational_alert_center').select('alert_key,title,message,level,created_at').order('created_at',{ascending:false}).limit(12),
  supabase.from('operations').select('id,vessel,client,product,activity,status,planned_quantity,executed_quantity,unit,scheduled_at,notes').order('scheduled_at',{ascending:true}).limit(30),
  supabase.from('vessel_schedules').select('id,vessel_name,client,operation_type,product,planned_quantity,unit,status,eta,berth').order('eta',{ascending:true}).limit(20),
  supabase.from('truck_workflow_overview').select('id,plate,driver_name,supplier,client,product,quantity,unit,invoice_number,workflow_stage,current_stage_minutes,overdue').order('created_at',{ascending:false}).limit(30),
  supabase.from('maintenance_orders').select('id,title,maintenance_type,priority,responsible,due_date,status,equipment(name)').order('created_at',{ascending:false}).limit(30),
  supabase.from('qhse_records').select('id,title,record_type,severity,status,responsible,record_date').order('record_date',{ascending:false}).limit(30)
 ]);
 const error=tanksResult.error||summaryResult.error||alertsResult.error||operationsResult.error||vesselsResult.error||trucksResult.error||maintenanceResult.error||qhseResult.error;if(error)throw error;
 const maintenance=((maintenanceResult.data??[])as unknown as MaintenanceRow[]).map(item=>({...item,equipment:Array.isArray(item.equipment)?item.equipment[0]??null:item.equipment}));
 return{tanks:(tanksResult.data??[])as Tank[],summary:(summaryResult.data??null)as DashboardSummary|null,alerts:alertsResult.data??[],operations:(operationsResult.data??[])as Operation[],vessels:(vesselsResult.data??[])as VesselSchedule[],trucks:(trucksResult.data??[])as Truck[],maintenance,qhse:(qhseResult.data??[])as QhseRecord[]};
}

export async function loadTankHistory(tankId:string){if(!supabase)return[];const{data,error}=await supabase.from('tank_history').select('id,created_at,movement_type,movement_direction,moved_quantity,previous_volume,new_volume,notes').eq('tank_id',tankId).order('created_at',{ascending:false}).limit(30);if(error)throw error;return(data??[])as TankHistory[]}
export async function loadProfile(){if(!supabase)return null;const{data:{user}}=await supabase.auth.getUser();if(!user)return null;const{data,error}=await supabase.from('profiles').select('id,full_name,role,department,permissions,active').eq('id',user.id).maybeSingle();if(error)throw error;return data as Profile|null}
export async function loadFluidTypes(){if(!supabase)return[];const{data,error}=await supabase.from('fluid_types').select('id,name,category,default_unit').eq('active',true).order('name');if(error)throw error;return(data??[])as FluidType[]}
export async function loadEquipment(){if(!supabase)return[];const{data,error}=await supabase.from('equipment').select('id,name,category,status').order('name');if(error)throw error;return(data??[])as Equipment[]}
export async function loadAuditLogs(){if(!supabase)return[];const{data,error}=await supabase.from('audit_logs').select('id,table_name,record_id,action,old_data,new_data,created_at').order('created_at',{ascending:false}).limit(50);if(error)throw error;return(data??[])as AuditLog[]}
export function canWrite(profile:Profile|null,module:string){if(!profile||!profile.active)return false;if(['admin','supervisor','manager','líder','leader'].includes(profile.role.toLowerCase()))return true;const p=profile.permissions as any;return Boolean(p?.[module]?.write||p?.[module]?.edit||p?.write)}
export async function updateTank(tank:Tank,payload:{volume:number;status:string;client:string;lot:string;fluid_type_id:string}){if(!supabase)throw new Error('Supabase não configurado.');const{data,error}=await supabase.rpc('update_tank_content_v10',{p_tank_id:tank.id,p_expected_name:tank.name,p_expected_updated_at:tank.updated_at||new Date().toISOString(),p_fluid_type_id:payload.fluid_type_id,p_lot:payload.lot||undefined,p_status:payload.status,p_volume:payload.volume,p_client:payload.client});if(error)throw error;return data as Tank}
export async function createOperation(payload:{vessel:string;client:string;product:string;activity:string;planned_quantity:number;unit:string;scheduled_at:string}){if(!supabase)throw new Error('Supabase não configurado.');const{data,error}=await supabase.rpc('save_operation_with_allocations',{p_operation_id:'00000000-0000-0000-0000-000000000000',p_allocations:[],p_operation:{...payload,status:'Programada',executed_quantity:0}});if(error)throw error;return data as Operation}
export async function updateOperation(id:string,payload:Partial<Operation>){if(!supabase)throw new Error('Supabase não configurado.');const{data,error}=await supabase.from('operations').update({...payload,updated_at:new Date().toISOString()}).eq('id',id).select().single();if(error)throw error;return data as Operation}
export async function advanceTruck(truckId:string,stage:string){if(!supabase)throw new Error('Supabase não configurado.');const{data,error}=await supabase.rpc('advance_truck_stage',{p_truck_id:truckId,p_stage:stage,p_notes:'Atualizado pelo OPSControl IA Next'});if(error)throw error;return data}
export async function createTruck(payload:{movement_date:string;movement_type:string;supplier:string;client:string;product:string;quantity:number;unit:string;plate:string;driver_name:string;invoice_number:string;truck_type:string;notes:string}){if(!supabase)throw new Error('Supabase não configurado.');const{data:{user}}=await supabase.auth.getUser();const{data,error}=await supabase.from('trucks').insert({...payload,status:'Programada',workflow_stage:'programada',created_by:user?.id}).select().single();if(error)throw error;return data}
export async function createMaintenance(payload:{equipment_id:string;title:string;description:string;priority:string;maintenance_type:string;responsible:string;due_date:string}){if(!supabase)throw new Error('Supabase não configurado.');const{data:{user}}=await supabase.auth.getUser();const{data,error}=await supabase.from('maintenance_orders').insert({...payload,status:'Aberta',estimated_cost:0,actual_cost:0,created_by:user?.id}).select().single();if(error)throw error;return data}
export async function createQhse(payload:{record_date:string;record_type:string;title:string;description:string;responsible:string;severity:string}){if(!supabase)throw new Error('Supabase não configurado.');const{data:{user}}=await supabase.auth.getUser();const{data,error}=await supabase.from('qhse_records').insert({...payload,status:'Aberto',created_by:user?.id}).select().single();if(error)throw error;return data}
