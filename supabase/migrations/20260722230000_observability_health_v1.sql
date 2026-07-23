alter table public.system_errors
  add column if not exists environment text not null default 'production',
  add column if not exists app_version text,
  add column if not exists page_path text,
  add column if not exists severity text not null default 'error',
  add column if not exists fingerprint text,
  add column if not exists session_id text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists first_seen_at timestamptz not null default now(),
  add column if not exists last_seen_at timestamptz not null default now(),
  add column if not exists occurrence_count integer not null default 1,
  add column if not exists resolved_at timestamptz,
  add column if not exists resolved_by uuid references public.profiles(id) on delete set null,
  add column if not exists resolution_notes text;

alter table public.system_errors drop constraint if exists system_errors_environment_check;
alter table public.system_errors add constraint system_errors_environment_check check(environment in ('production','staging'));
alter table public.system_errors drop constraint if exists system_errors_severity_check;
alter table public.system_errors add constraint system_errors_severity_check check(severity in ('info','warning','error','critical'));
alter table public.system_errors drop constraint if exists system_errors_occurrence_count_check;
alter table public.system_errors add constraint system_errors_occurrence_count_check check(occurrence_count > 0);

update public.system_errors
set first_seen_at=coalesce(first_seen_at,created_at),
    last_seen_at=coalesce(last_seen_at,created_at),
    occurrence_count=greatest(coalesce(occurrence_count,1),1),
    metadata=coalesce(metadata,'{}'::jsonb);

create index if not exists idx_system_errors_unresolved_recent
  on public.system_errors(severity,last_seen_at desc)
  where resolved_at is null;
create index if not exists idx_system_errors_fingerprint_user
  on public.system_errors(user_id,environment,fingerprint,last_seen_at desc)
  where fingerprint is not null;
create index if not exists idx_system_errors_environment_version
  on public.system_errors(environment,app_version,last_seen_at desc);

alter table public.system_errors enable row level security;
drop policy if exists system_errors_admin_select on public.system_errors;
drop policy if exists system_errors_management_select on public.system_errors;
create policy system_errors_management_select on public.system_errors
  for select to authenticated
  using(private.has_role(array['admin','supervisor']));
drop policy if exists system_errors_management_update on public.system_errors;
create policy system_errors_management_update on public.system_errors
  for update to authenticated
  using(private.has_role(array['admin','supervisor']))
  with check(private.has_role(array['admin','supervisor']));
drop policy if exists system_errors_admin_delete on public.system_errors;
create policy system_errors_admin_delete on public.system_errors
  for delete to authenticated
  using(private.has_role(array['admin']));

create or replace function public.report_client_error_v1(
  p_context text,
  p_message text,
  p_stack text default null,
  p_user_agent text default null,
  p_environment text default 'production',
  p_app_version text default null,
  p_page_path text default null,
  p_severity text default 'error',
  p_fingerprint text default null,
  p_session_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path=public,private
as $$
declare
  v_user uuid:=auth.uid();
  v_id bigint;
  v_environment text:=lower(btrim(coalesce(p_environment,'production')));
  v_severity text:=lower(btrim(coalesce(p_severity,'error')));
  v_fingerprint text:=nullif(left(btrim(coalesce(p_fingerprint,'')),128),'');
begin
  if v_user is null then raise exception 'Usuário não autenticado.'; end if;
  if v_environment not in ('production','staging') then v_environment:='production'; end if;
  if v_severity not in ('info','warning','error','critical') then v_severity:='error'; end if;
  if nullif(btrim(coalesce(p_message,'')),'') is null then raise exception 'Mensagem de erro obrigatória.'; end if;

  if v_fingerprint is not null then
    select id into v_id
    from public.system_errors
    where user_id=v_user
      and environment=v_environment
      and fingerprint=v_fingerprint
      and resolved_at is null
      and last_seen_at>=now()-interval '30 minutes'
    order by last_seen_at desc
    limit 1
    for update;
  end if;

  if v_id is not null then
    update public.system_errors
    set occurrence_count=occurrence_count+1,
        last_seen_at=now(),
        severity=case
          when severity='critical' or v_severity='critical' then 'critical'
          when severity='error' or v_severity='error' then 'error'
          when severity='warning' or v_severity='warning' then 'warning'
          else 'info'
        end,
        context=left(coalesce(nullif(btrim(p_context),''),context),160),
        message=left(btrim(p_message),2000),
        stack=left(coalesce(p_stack,stack),8000),
        page_path=left(coalesce(p_page_path,page_path),500),
        app_version=left(coalesce(p_app_version,app_version),100),
        session_id=left(coalesce(p_session_id,session_id),100),
        user_agent=left(coalesce(p_user_agent,user_agent),1000),
        metadata=coalesce(metadata,'{}'::jsonb)||coalesce(p_metadata,'{}'::jsonb)
    where id=v_id;
    return v_id;
  end if;

  insert into public.system_errors(
    user_id,context,message,stack,user_agent,environment,app_version,page_path,severity,
    fingerprint,session_id,metadata,first_seen_at,last_seen_at,occurrence_count
  ) values(
    v_user,left(nullif(btrim(coalesce(p_context,'')),''),160),left(btrim(p_message),2000),
    left(p_stack,8000),left(p_user_agent,1000),v_environment,left(p_app_version,100),
    left(p_page_path,500),v_severity,v_fingerprint,left(p_session_id,100),
    coalesce(p_metadata,'{}'::jsonb),now(),now(),1
  ) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.resolve_system_error_v1(
  p_error_id bigint,
  p_resolution_notes text default null
)
returns public.system_errors
language plpgsql
security definer
set search_path=public,private
as $$
declare
  v_user uuid:=auth.uid();
  v_row public.system_errors%rowtype;
begin
  if v_user is null or not private.has_role(array['admin','supervisor']) then
    raise exception 'Seu perfil não pode resolver erros do sistema.';
  end if;
  update public.system_errors
  set resolved_at=now(),resolved_by=v_user,
      resolution_notes=nullif(left(btrim(coalesce(p_resolution_notes,'')),2000),'')
  where id=p_error_id
  returning * into v_row;
  if not found then raise exception 'Erro do sistema não localizado.'; end if;
  return v_row;
end;
$$;

create or replace function public.get_system_health_v1()
returns jsonb
language plpgsql
security definer
set search_path=public,private,supabase_migrations
as $$
declare
  v_user uuid:=auth.uid();
  v_errors integer;
  v_critical integer;
  v_stale_operations integer;
  v_overdue_alerts integer;
  v_overdue_maintenance integer;
  v_expired_certificates integer;
  v_blocked_tanks integer;
  v_near_capacity integer;
  v_status text;
begin
  if v_user is null or not private.has_role(array['admin','supervisor']) then
    raise exception 'Seu perfil não pode acessar a saúde do sistema.';
  end if;

  select count(*) filter(where severity in ('error','critical')),
         count(*) filter(where severity='critical')
  into v_errors,v_critical
  from public.system_errors
  where resolved_at is null and last_seen_at>=now()-interval '24 hours';

  select count(*) into v_stale_operations
  from public.operations
  where status in ('Em andamento','Paralisada') and updated_at<now()-interval '4 hours';

  select count(*) into v_overdue_alerts
  from public.alerts
  where workflow_status<>'Resolvido' and due_at is not null and due_at<now();

  select count(*) into v_overdue_maintenance
  from public.maintenance_orders
  where status not in ('Concluída','Cancelada') and due_date is not null and due_date<current_date;

  select count(*) into v_expired_certificates
  from public.certificates
  where expires_at is not null and expires_at<current_date and status<>'Cancelado';

  select count(*) filter(where status='Bloqueado'),
         count(*) filter(where capacity>0 and current_volume/capacity>=0.90)
  into v_blocked_tanks,v_near_capacity
  from public.tanks;

  v_status:=case
    when v_critical>0 or v_blocked_tanks>0 then 'critical'
    when v_errors>0 or v_stale_operations>0 or v_overdue_alerts>0 or v_overdue_maintenance>0 or v_expired_certificates>0 then 'warning'
    else 'healthy'
  end;

  return jsonb_build_object(
    'status',v_status,
    'generated_at',now(),
    'database_time',now(),
    'latest_migration',(select max(version) from supabase_migrations.schema_migrations),
    'realtime_tables',(select count(*) from pg_publication_tables where pubname='supabase_realtime' and schemaname='public'),
    'active_users',(select count(*) from public.profiles where active=true),
    'active_operations',(select count(*) from public.operations where status in ('Em andamento','Paralisada')),
    'unresolved_errors_24h',v_errors,
    'critical_errors_24h',v_critical,
    'latest_error_at',(select max(last_seen_at) from public.system_errors where resolved_at is null),
    'stale_operations',v_stale_operations,
    'overdue_alerts',v_overdue_alerts,
    'overdue_maintenance',v_overdue_maintenance,
    'expired_certificates',v_expired_certificates,
    'blocked_tanks',v_blocked_tanks,
    'near_capacity_tanks',v_near_capacity,
    'recent_errors',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',id,'severity',severity,'context',context,'message',message,
        'occurrence_count',occurrence_count,'last_seen_at',last_seen_at,
        'environment',environment,'app_version',app_version,'page_path',page_path
      ) order by last_seen_at desc)
      from (
        select id,severity,context,message,occurrence_count,last_seen_at,environment,app_version,page_path
        from public.system_errors
        where resolved_at is null
        order by last_seen_at desc
        limit 10
      ) recent
    ),'[]'::jsonb)
  );
end;
$$;

revoke all on function public.report_client_error_v1(text,text,text,text,text,text,text,text,text,text,jsonb) from public,anon;
revoke all on function public.resolve_system_error_v1(bigint,text) from public,anon;
revoke all on function public.get_system_health_v1() from public,anon;
grant execute on function public.report_client_error_v1(text,text,text,text,text,text,text,text,text,text,jsonb) to authenticated;
grant execute on function public.resolve_system_error_v1(bigint,text) to authenticated;
grant execute on function public.get_system_health_v1() to authenticated;
