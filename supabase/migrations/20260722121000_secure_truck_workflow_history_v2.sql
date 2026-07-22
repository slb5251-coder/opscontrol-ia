-- OpsControl IA — segurança e identificação dos registros históricos.
alter table public.trucks add column if not exists workflow_legacy boolean not null default false;

update public.trucks
set workflow_legacy = true
where not exists (
  select 1 from public.truck_stage_events event
  where event.truck_id = trucks.id
);

revoke all privileges on public.truck_stage_events from public, anon, authenticated, service_role;
grant select on public.truck_stage_events to authenticated, service_role;

revoke all privileges on public.truck_workflow_overview from public, anon, authenticated, service_role;
grant select on public.truck_workflow_overview to authenticated, service_role;
