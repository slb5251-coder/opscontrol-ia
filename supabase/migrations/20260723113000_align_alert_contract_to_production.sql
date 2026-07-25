do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='alerts' and column_name='workflow_status'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='alerts' and column_name='status'
  ) then
    alter table public.alerts rename column workflow_status to status;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='alerts' and column_name='assigned_to'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='alerts' and column_name='responsible_user_id'
  ) then
    alter table public.alerts rename column assigned_to to responsible_user_id;
  end if;
end;
$$;

alter table public.alerts
  add column if not exists updated_at timestamptz not null default now();

drop function if exists public.update_alert_workflow(uuid,text,uuid,timestamptz,text);

create or replace function public.update_alert_workflow(
  p_alert_id uuid,
  p_status text default null,
  p_responsible_user_id uuid default null,
  p_due_at timestamptz default null
)
returns public.alerts
language plpgsql
security definer
set search_path=public,private
as $$
declare
  v_alert public.alerts;
  v_profile public.profiles;
  v_status text;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  select * into v_alert from public.alerts where id=p_alert_id for update;
  if not found then
    raise exception 'Alerta não localizado.';
  end if;

  if not (
    v_alert.target_user_id is null
    or v_alert.target_user_id=auth.uid()
    or v_alert.created_by=auth.uid()
  ) then
    raise exception 'Você não possui acesso a este alerta.';
  end if;

  select * into v_profile from public.profiles where id=auth.uid();
  if not (
    v_alert.responsible_user_id=auth.uid()
    or v_alert.target_user_id=auth.uid()
    or v_alert.created_by=auth.uid()
    or v_alert.target_group is null
    or lower(coalesce(v_alert.target_group,'')) in ('todos','geral','equipe','operacao-geral')
    or lower(coalesce(v_alert.target_group,''))=lower(coalesce(v_profile.role,''))
    or lower(coalesce(v_alert.target_group,''))=lower(coalesce(v_profile.department,''))
    or private.has_role(array['admin','supervisor','lider','qhse','logistica'])
  ) then
    raise exception 'Seu perfil não pode alterar o atendimento deste alerta.';
  end if;

  v_status:=coalesce(p_status,v_alert.status);
  if v_status not in ('Novo','Reconhecido','Em andamento','Resolvido') then
    raise exception 'Status de atendimento inválido.';
  end if;

  update public.alerts
  set status=v_status,
      responsible_user_id=p_responsible_user_id,
      due_at=p_due_at,
      acknowledged_at=case
        when v_status in ('Reconhecido','Em andamento','Resolvido') then coalesce(acknowledged_at,now())
        else null
      end,
      acknowledged_by=case
        when v_status in ('Reconhecido','Em andamento','Resolvido') then coalesce(acknowledged_by,auth.uid())
        else null
      end,
      resolved_at=case when v_status='Resolvido' then coalesce(resolved_at,now()) else null end,
      resolved_by=case when v_status='Resolvido' then coalesce(resolved_by,auth.uid()) else null end,
      updated_at=now()
  where id=p_alert_id
  returning * into v_alert;

  return v_alert;
end;
$$;

revoke all on function public.update_alert_workflow(uuid,text,uuid,timestamptz) from public,anon;
grant execute on function public.update_alert_workflow(uuid,text,uuid,timestamptz) to authenticated;
