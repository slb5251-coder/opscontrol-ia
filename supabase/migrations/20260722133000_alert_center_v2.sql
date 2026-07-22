-- OpsControl IA — Central de Alertas, Comunicados e Chat v2
-- Mantém no repositório a estrutura aplicada ao Supabase de produção.

alter table public.alerts
  add column if not exists status text not null default 'Novo',
  add column if not exists responsible_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists due_at timestamptz,
  add column if not exists acknowledged_at timestamptz,
  add column if not exists acknowledged_by uuid references public.profiles(id) on delete set null,
  add column if not exists resolved_at timestamptz,
  add column if not exists resolved_by uuid references public.profiles(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'alerts_status_check'
      and conrelid = 'public.alerts'::regclass
  ) then
    alter table public.alerts
      add constraint alerts_status_check
      check (status in ('Novo','Reconhecido','Em andamento','Resolvido'));
  end if;
end $$;

create index if not exists alerts_status_idx on public.alerts(status);
create index if not exists alerts_responsible_user_idx on public.alerts(responsible_user_id);
create index if not exists alerts_due_at_idx on public.alerts(due_at);

create table if not exists public.alert_read_receipts (
  alert_id uuid not null references public.alerts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (alert_id, user_id)
);

create table if not exists public.chat_message_reads (
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

alter table public.alert_read_receipts enable row level security;
alter table public.chat_message_reads enable row level security;

drop policy if exists alert_read_receipts_select on public.alert_read_receipts;
create policy alert_read_receipts_select
on public.alert_read_receipts for select
to authenticated
using (true);

drop policy if exists alert_read_receipts_insert_own on public.alert_read_receipts;
create policy alert_read_receipts_insert_own
on public.alert_read_receipts for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists alert_read_receipts_update_own on public.alert_read_receipts;
create policy alert_read_receipts_update_own
on public.alert_read_receipts for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists chat_message_reads_select on public.chat_message_reads;
create policy chat_message_reads_select
on public.chat_message_reads for select
to authenticated
using (true);

drop policy if exists chat_message_reads_insert_own on public.chat_message_reads;
create policy chat_message_reads_insert_own
on public.chat_message_reads for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists chat_message_reads_update_own on public.chat_message_reads;
create policy chat_message_reads_update_own
on public.chat_message_reads for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists chat_messages_select on public.chat_messages;
drop policy if exists chat_messages_insert on public.chat_messages;
drop policy if exists chat_messages_select_by_channel on public.chat_messages;
drop policy if exists chat_messages_insert_by_channel on public.chat_messages;

create policy chat_messages_select_by_channel
on public.chat_messages for select
to authenticated
using (
  channel = 'operacao-geral'
  or (channel = 'lideranca' and private.has_role(array['admin','supervisor','lider']))
  or (channel = 'logistica' and private.has_role(array['admin','supervisor','lider','logistica']))
  or (channel = 'qhse' and private.has_role(array['admin','supervisor','lider','qhse']))
  or (channel = 'manutencao' and private.has_role(array['admin','supervisor','lider','mecanico']))
  or (channel = 'operacao' and private.has_role(array['admin','supervisor','lider','operador','user']))
);

create policy chat_messages_insert_by_channel
on public.chat_messages for insert
to authenticated
with check (
  (sender_id = auth.uid() or sender_id is null)
  and (
    channel = 'operacao-geral'
    or (channel = 'lideranca' and private.has_role(array['admin','supervisor','lider']))
    or (channel = 'logistica' and private.has_role(array['admin','supervisor','lider','logistica']))
    or (channel = 'qhse' and private.has_role(array['admin','supervisor','lider','qhse']))
    or (channel = 'manutencao' and private.has_role(array['admin','supervisor','lider','mecanico']))
    or (channel = 'operacao' and private.has_role(array['admin','supervisor','lider','operador','user']))
  )
);

create or replace function public.update_alert_workflow(
  p_alert_id uuid,
  p_status text default null,
  p_responsible_user_id uuid default null,
  p_due_at timestamptz default null
)
returns public.alerts
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_alert public.alerts;
  v_profile public.profiles;
  v_status text;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  select * into v_alert
  from public.alerts
  where id = p_alert_id
  for update;

  if not found then
    raise exception 'Alerta não localizado.';
  end if;

  if not (
    v_alert.target_user_id is null
    or v_alert.target_user_id = auth.uid()
    or v_alert.created_by = auth.uid()
  ) then
    raise exception 'Você não possui acesso a este alerta.';
  end if;

  select * into v_profile
  from public.profiles
  where id = auth.uid();

  if not (
    v_alert.responsible_user_id = auth.uid()
    or v_alert.target_user_id = auth.uid()
    or v_alert.created_by = auth.uid()
    or v_alert.target_group is null
    or lower(coalesce(v_alert.target_group,'')) in ('todos','geral','equipe','operacao-geral')
    or lower(coalesce(v_alert.target_group,'')) = lower(coalesce(v_profile.role,''))
    or lower(coalesce(v_alert.target_group,'')) = lower(coalesce(v_profile.department,''))
    or private.has_role(array['admin','supervisor','lider','qhse','logistica'])
  ) then
    raise exception 'Seu perfil não pode alterar o atendimento deste alerta.';
  end if;

  v_status := coalesce(p_status, v_alert.status);
  if v_status not in ('Novo','Reconhecido','Em andamento','Resolvido') then
    raise exception 'Status de atendimento inválido.';
  end if;

  update public.alerts
  set status = v_status,
      responsible_user_id = p_responsible_user_id,
      due_at = p_due_at,
      acknowledged_at = case
        when v_status in ('Reconhecido','Em andamento','Resolvido') then coalesce(acknowledged_at, now())
        else null
      end,
      acknowledged_by = case
        when v_status in ('Reconhecido','Em andamento','Resolvido') then coalesce(acknowledged_by, auth.uid())
        else null
      end,
      resolved_at = case
        when v_status = 'Resolvido' then coalesce(resolved_at, now())
        else null
      end,
      resolved_by = case
        when v_status = 'Resolvido' then coalesce(resolved_by, auth.uid())
        else null
      end,
      updated_at = now()
  where id = p_alert_id
  returning * into v_alert;

  return v_alert;
end;
$$;

revoke all on function public.update_alert_workflow(uuid,text,uuid,timestamptz) from public;
revoke all on function public.update_alert_workflow(uuid,text,uuid,timestamptz) from anon;
grant execute on function public.update_alert_workflow(uuid,text,uuid,timestamptz) to authenticated;

drop function if exists public.mark_alert_read(uuid);
drop function if exists public.mark_chat_message_read(uuid);
drop function if exists public.alert_visible_to_current_user(public.alerts);