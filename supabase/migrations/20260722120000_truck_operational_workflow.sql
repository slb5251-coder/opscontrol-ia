-- OpsControl IA — fluxo operacional de carretas.
alter table public.trucks
  add column if not exists workflow_stage text,
  add column if not exists scheduled_at timestamptz,
  add column if not exists expected_release_at timestamptz,
  add column if not exists gate_in_at timestamptz,
  add column if not exists yard_at timestamptz,
  add column if not exists operation_started_at timestamptz,
  add column if not exists operation_ended_at timestamptz,
  add column if not exists released_at timestamptz,
  add column if not exists operation_id uuid references public.operations(id) on delete set null,
  add column if not exists operation_item_id uuid references public.operation_items(id) on delete set null,
  add column if not exists transporter text,
  add column if not exists gross_weight numeric,
  add column if not exists tare_weight numeric,
  add column if not exists net_weight numeric,
  add column if not exists stage_entered_at timestamptz,
  add column if not exists workflow_updated_by uuid references public.profiles(id) on delete set null,
  add column if not exists workflow_updated_at timestamptz,
  add column if not exists workflow_legacy boolean not null default false;

update public.trucks set workflow_stage=case when status='Cancelada' then 'Cancelada' when status='Concluída' then 'Liberada' when status='Em andamento' then 'Operação' when status='Recebida' then 'Pátio' else 'Programada' end where workflow_stage is null;
update public.trucks set workflow_updated_at=coalesce(workflow_updated_at,updated_at,created_at),stage_entered_at=coalesce(stage_entered_at,updated_at,created_at) where workflow_updated_at is null or stage_entered_at is null;
alter table public.trucks alter column workflow_stage set default 'Programada';
alter table public.trucks alter column workflow_stage set not null;
alter table public.trucks drop constraint if exists trucks_workflow_stage_check;
alter table public.trucks add constraint trucks_workflow_stage_check check(workflow_stage in('Programada','Portaria','Pátio','Operação','Liberada','Cancelada'));
alter table public.trucks drop constraint if exists trucks_weight_values_check;
alter table public.trucks add constraint trucks_weight_values_check check((gross_weight is null or gross_weight>=0) and (tare_weight is null or tare_weight>=0) and (net_weight is null or net_weight>=0) and (gross_weight is null or tare_weight is null or gross_weight>=tare_weight));
alter table public.trucks drop constraint if exists trucks_workflow_dates_check;
alter table public.trucks add constraint trucks_workflow_dates_check check((scheduled_at is null or expected_release_at is null or expected_release_at>=scheduled_at) and (gate_in_at is null or released_at is null or released_at>=gate_in_at) and (operation_started_at is null or operation_ended_at is null or operation_ended_at>=operation_started_at));
create index if not exists trucks_workflow_stage_idx on public.trucks(workflow_stage,stage_entered_at);
create index if not exists trucks_expected_release_idx on public.trucks(expected_release_at) where released_at is null;
create index if not exists trucks_operation_link_idx on public.trucks(operation_id,operation_item_id);

create table if not exists public.truck_stage_events(
  id uuid primary key default gen_random_uuid(),truck_id uuid not null references public.trucks(id) on delete cascade,
  from_stage text,to_stage text not null,occurred_at timestamptz not null default now(),notes text,
  created_by uuid references public.profiles(id) on delete set null,created_at timestamptz not null default now(),
  constraint truck_stage_events_from_check check(from_stage is null or from_stage in('Programada','Portaria','Pátio','Operação','Liberada','Cancelada')),
  constraint truck_stage_events_to_check check(to_stage in('Programada','Portaria','Pátio','Operação','Liberada','Cancelada'))
);
create index if not exists truck_stage_events_truck_time_idx on public.truck_stage_events(truck_id,occurred_at desc);
create index if not exists truck_stage_events_created_by_idx on public.truck_stage_events(created_by);
alter table public.truck_stage_events enable row level security;
drop policy if exists truck_stage_events_select on public.truck_stage_events;
create policy truck_stage_events_select on public.truck_stage_events for select to authenticated using(true);

create or replace function private.truck_stage_rank(p_stage text) returns integer language sql immutable set search_path=public,private as $$select case p_stage when 'Programada' then 0 when 'Portaria' then 1 when 'Pátio' then 2 when 'Operação' then 3 when 'Liberada' then 4 when 'Cancelada' then 9 else -1 end$$;
revoke all on function private.truck_stage_rank(text) from public,anon,authenticated;

create or replace function public.save_truck_workflow(p_truck_id uuid,p_payload jsonb) returns uuid language plpgsql security definer set search_path=public,private as $$
declare v_truck public.trucks;v_operation_id uuid;v_item_id uuid;v_gross numeric;v_tare numeric;v_net numeric;v_scheduled timestamptz;v_expected timestamptz;
begin
 if auth.uid() is null then raise exception 'Usuário não autenticado.'; end if;
 if not private.has_role(array['admin','supervisor','lider','logistica','operador']) then raise exception 'Seu perfil não pode alterar o fluxo de carretas.'; end if;
 select * into v_truck from public.trucks where id=p_truck_id for update;if not found then raise exception 'Carreta não localizada.';end if;
 v_operation_id:=nullif(p_payload->>'operation_id','')::uuid;v_item_id:=nullif(p_payload->>'operation_item_id','')::uuid;
 v_scheduled:=nullif(p_payload->>'scheduled_at','')::timestamptz;v_expected:=nullif(p_payload->>'expected_release_at','')::timestamptz;
 v_gross:=nullif(p_payload->>'gross_weight','')::numeric;v_tare:=nullif(p_payload->>'tare_weight','')::numeric;v_net:=nullif(p_payload->>'net_weight','')::numeric;
 if v_scheduled is not null and v_expected is not null and v_expected<v_scheduled then raise exception 'A previsão de liberação não pode ser anterior à programação.';end if;
 if v_gross is not null and v_tare is not null then if v_gross<v_tare then raise exception 'O peso bruto não pode ser menor que a tara.';end if;v_net:=v_gross-v_tare;end if;
 if coalesce(v_gross,0)<0 or coalesce(v_tare,0)<0 or coalesce(v_net,0)<0 then raise exception 'Os pesos não podem ser negativos.';end if;
 if v_item_id is not null and (v_operation_id is null or not exists(select 1 from public.operation_items i where i.id=v_item_id and i.operation_id=v_operation_id)) then raise exception 'O produto selecionado não pertence à operação informada.';end if;
 update public.trucks set scheduled_at=v_scheduled,expected_release_at=v_expected,operation_id=v_operation_id,operation_item_id=v_item_id,transporter=nullif(trim(p_payload->>'transporter'),''),gross_weight=v_gross,tare_weight=v_tare,net_weight=v_net,workflow_updated_by=auth.uid(),workflow_updated_at=now(),updated_at=now() where id=p_truck_id;
 return p_truck_id;
end$$;
revoke all on function public.save_truck_workflow(uuid,jsonb) from public,anon;
grant execute on function public.save_truck_workflow(uuid,jsonb) to authenticated,service_role;

create or replace function public.advance_truck_stage(p_truck_id uuid,p_stage text,p_occurred_at timestamptz default now(),p_notes text default null) returns uuid language plpgsql security definer set search_path=public,private as $$
declare v_truck public.trucks;v_current_rank integer;v_new_rank integer;v_manager boolean;v_status text;
begin
 if auth.uid() is null then raise exception 'Usuário não autenticado.';end if;
 if not private.has_role(array['admin','supervisor','lider','logistica','operador']) then raise exception 'Seu perfil não pode atualizar a etapa da carreta.';end if;
 if p_stage not in('Programada','Portaria','Pátio','Operação','Liberada','Cancelada') then raise exception 'Etapa inválida.';end if;
 select * into v_truck from public.trucks where id=p_truck_id for update;if not found then raise exception 'Carreta não localizada.';end if;if v_truck.workflow_stage=p_stage then return p_truck_id;end if;
 v_manager:=private.has_role(array['admin','supervisor']);v_current_rank:=private.truck_stage_rank(v_truck.workflow_stage);v_new_rank:=private.truck_stage_rank(p_stage);
 if p_stage<>'Cancelada' and not v_manager then if v_new_rank<v_current_rank then raise exception 'Somente administrador ou supervisor pode retornar uma etapa.';end if;if v_new_rank>v_current_rank+1 then raise exception 'Avance uma etapa por vez.';end if;end if;
 if p_stage in('Portaria','Pátio','Operação','Liberada') and nullif(trim(v_truck.plate),'') is null then raise exception 'Informe a placa antes de avançar a carreta.';end if;
 if p_stage='Liberada' and nullif(trim(v_truck.invoice_number),'') is null then raise exception 'Informe a nota fiscal antes de liberar a carreta.';end if;
 v_status:=case when p_stage='Programada' then 'Programada' when p_stage in('Portaria','Pátio') then 'Recebida' when p_stage='Operação' then 'Em andamento' when p_stage='Liberada' then 'Concluída' else 'Cancelada' end;
 update public.trucks set workflow_stage=p_stage,status=v_status,stage_entered_at=coalesce(p_occurred_at,now()),gate_in_at=case when p_stage='Portaria' then coalesce(p_occurred_at,now()) else gate_in_at end,yard_at=case when p_stage='Pátio' then coalesce(p_occurred_at,now()) else yard_at end,operation_started_at=case when p_stage='Operação' then coalesce(p_occurred_at,now()) else operation_started_at end,operation_ended_at=case when p_stage='Liberada' then coalesce(operation_ended_at,p_occurred_at,now()) else operation_ended_at end,released_at=case when p_stage='Liberada' then coalesce(p_occurred_at,now()) else released_at end,workflow_updated_by=auth.uid(),workflow_updated_at=now(),workflow_legacy=false,updated_at=now() where id=p_truck_id;
 insert into public.truck_stage_events(truck_id,from_stage,to_stage,occurred_at,notes,created_by) values(p_truck_id,v_truck.workflow_stage,p_stage,coalesce(p_occurred_at,now()),nullif(trim(p_notes),''),auth.uid());return p_truck_id;
end$$;
revoke all on function public.advance_truck_stage(uuid,text,timestamptz,text) from public,anon;
grant execute on function public.advance_truck_stage(uuid,text,timestamptz,text) to authenticated,service_role;

drop view if exists public.truck_workflow_overview;
create view public.truck_workflow_overview with(security_invoker=true) as select t.*,
 greatest(0,floor(extract(epoch from(now()-coalesce(t.stage_entered_at,t.updated_at,t.created_at)))/60))::integer current_stage_minutes,
 case when t.gate_in_at is not null and t.released_at is null then greatest(0,floor(extract(epoch from(now()-t.gate_in_at))/60))::integer end current_site_minutes,
 case when t.gate_in_at is not null and t.released_at is not null then greatest(0,floor(extract(epoch from(t.released_at-t.gate_in_at))/60))::integer end total_stay_minutes,
 (t.expected_release_at is not null and t.released_at is null and t.workflow_stage not in('Cancelada','Liberada') and now()>t.expected_release_at) overdue,
 case when t.workflow_stage='Cancelada' then 'Cancelada' when t.expected_release_at is not null and t.released_at is null and now()>t.expected_release_at then 'Atrasada' when t.workflow_stage='Liberada' and t.truck_type<>'Plataforma' and not t.stock_applied then 'Estoque pendente' when nullif(trim(t.plate),'') is null or nullif(trim(t.invoice_number),'') is null then 'Documentação pendente' else 'Normal' end workflow_attention
from public.trucks t;
revoke all privileges on public.truck_workflow_overview from public,anon,authenticated,service_role;
grant select on public.truck_workflow_overview to authenticated,service_role;
revoke all privileges on public.truck_stage_events from public,anon,authenticated,service_role;
grant select on public.truck_stage_events to authenticated,service_role;
