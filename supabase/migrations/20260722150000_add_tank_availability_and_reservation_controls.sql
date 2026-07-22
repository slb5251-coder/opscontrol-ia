-- OpsControl IA — disponibilidade operacional de tanques e silos.

create or replace view public.tank_operation_reservations
with (security_invoker = true)
as
with base as (
  select
    a.id as reservation_id,
    a.tank_id,
    a.operation_id,
    a.operation_item_id,
    a.direction,
    a.quantity,
    a.unit,
    a.lot,
    a.display_order,
    o.client,
    o.vessel,
    o.service_order,
    o.berth,
    o.scheduled_at,
    o.responsible_id,
    coalesce(i.activity, o.activity) as activity,
    coalesce(i.product, o.product) as product,
    coalesce(i.ticket_number, o.ticket_number) as ticket_number,
    i.rt_number,
    coalesce(i.rig, o.rig) as rig,
    coalesce(i.well, o.well) as well,
    coalesce(i.start_at, o.start_at, o.scheduled_at) as start_at,
    case
      when a.operation_item_id is null or coalesce(o.product_count, 1) <= 1 then o.status
      else i.status
    end as effective_status,
    case
      when a.operation_item_id is null or coalesce(o.product_count, 1) <= 1 then coalesce(o.tank_movement_applied, false)
      else coalesce(i.tank_movement_applied, false)
    end as movement_applied
  from public.operation_tank_allocations a
  join public.operations o on o.id = a.operation_id
  left join public.operation_items i on i.id = a.operation_item_id
)
select
  base.*,
  case
    when effective_status in ('Programada', 'Em andamento', 'Paralisada') then 'active'
    when effective_status = 'Concluída' then 'pending_reconciliation'
    else 'inactive'
  end as reservation_state
from base
where movement_applied = false
  and effective_status <> 'Cancelada';

create or replace view public.tank_operational_availability
with (security_invoker = true)
as
with reservation_totals as (
  select
    r.tank_id,
    coalesce(sum(r.quantity) filter (where r.reservation_state = 'active' and r.direction = 'source'), 0) as reserved_outgoing,
    coalesce(sum(r.quantity) filter (where r.reservation_state = 'active' and r.direction = 'destination'), 0) as reserved_incoming,
    coalesce(sum(r.quantity) filter (where r.reservation_state = 'pending_reconciliation' and r.direction = 'source'), 0) as pending_outgoing,
    coalesce(sum(r.quantity) filter (where r.reservation_state = 'pending_reconciliation' and r.direction = 'destination'), 0) as pending_incoming,
    count(*) filter (where r.reservation_state = 'active')::integer as active_reservation_count,
    count(*) filter (where r.reservation_state = 'pending_reconciliation')::integer as pending_reconciliation_count,
    min(r.start_at) filter (where r.reservation_state = 'active') as next_reserved_at
  from public.tank_operation_reservations r
  group by r.tank_id
)
select
  t.id as tank_id,
  t.name,
  t.phase,
  t.kind,
  t.unit,
  t.capacity,
  t.current_volume as physical_volume,
  coalesce(rt.reserved_outgoing, 0) as reserved_outgoing,
  greatest(t.current_volume - coalesce(rt.reserved_outgoing, 0), 0) as available_volume,
  coalesce(rt.reserved_incoming, 0) as reserved_incoming,
  greatest(t.capacity - t.current_volume - coalesce(rt.reserved_incoming, 0), 0) as available_capacity,
  greatest(t.current_volume - coalesce(rt.reserved_outgoing, 0) + coalesce(rt.reserved_incoming, 0), 0) as projected_volume,
  coalesce(rt.pending_outgoing, 0) as pending_outgoing,
  coalesce(rt.pending_incoming, 0) as pending_incoming,
  coalesce(rt.active_reservation_count, 0) as active_reservation_count,
  coalesce(rt.pending_reconciliation_count, 0) as pending_reconciliation_count,
  rt.next_reserved_at,
  (coalesce(rt.reserved_outgoing, 0) > t.current_volume + 0.001) as outgoing_overbooked,
  (t.current_volume + coalesce(rt.reserved_incoming, 0) > t.capacity + 0.001) as incoming_overbooked,
  case
    when coalesce(rt.reserved_outgoing, 0) > t.current_volume + 0.001
      or t.current_volume + coalesce(rt.reserved_incoming, 0) > t.capacity + 0.001 then 'Crítico'
    when coalesce(rt.pending_reconciliation_count, 0) > 0 then 'Conciliação pendente'
    when coalesce(rt.active_reservation_count, 0) > 0 then 'Reservado'
    else 'Livre'
  end as availability_status
from public.tanks t
left join reservation_totals rt on rt.tank_id = t.id;

revoke all on public.tank_operation_reservations from public, anon;
revoke all on public.tank_operational_availability from public, anon;
grant select on public.tank_operation_reservations to authenticated, service_role;
grant select on public.tank_operational_availability to authenticated, service_role;

create or replace function private.assert_tank_reservation_capacity(p_tank_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_tank public.tanks;
  v_reserved_out numeric := 0;
  v_reserved_in numeric := 0;
  v_active_count integer := 0;
begin
  select * into v_tank
  from public.tanks
  where id = p_tank_id
  for update;

  if not found then
    raise exception 'Tanque ou silo da reserva não localizado.';
  end if;

  select
    coalesce(sum(quantity) filter (where direction = 'source'), 0),
    coalesce(sum(quantity) filter (where direction = 'destination'), 0),
    count(*)::integer
  into v_reserved_out, v_reserved_in, v_active_count
  from public.tank_operation_reservations
  where tank_id = p_tank_id
    and reservation_state = 'active';

  if v_active_count > 0 and (
    lower(coalesce(v_tank.status, '')) like '%manuten%'
    or lower(coalesce(v_tank.status, '')) like '%bloque%'
  ) then
    raise exception '% está % e não pode receber novas reservas.', v_tank.name, v_tank.status;
  end if;

  if v_reserved_out > v_tank.current_volume + 0.001 then
    raise exception 'Reserva acima do saldo em %: físico % %, reservado % %.',
      v_tank.name, v_tank.current_volume, v_tank.unit, v_reserved_out, v_tank.unit;
  end if;

  if v_tank.current_volume + v_reserved_in > v_tank.capacity + 0.001 then
    raise exception 'Reserva acima da capacidade em %: físico % %, entrada reservada % %, capacidade % %.',
      v_tank.name, v_tank.current_volume, v_tank.unit, v_reserved_in, v_tank.unit, v_tank.capacity, v_tank.unit;
  end if;
end;
$$;

revoke all on function private.assert_tank_reservation_capacity(uuid) from public, anon, authenticated;

create or replace function private.enforce_tank_reservation_capacity()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_tank_id uuid;
begin
  if tg_table_name = 'operation_tank_allocations' then
    if tg_op = 'DELETE' then
      perform private.assert_tank_reservation_capacity(old.tank_id);
      return old;
    end if;

    perform private.assert_tank_reservation_capacity(new.tank_id);
    if tg_op = 'UPDATE' and old.tank_id is distinct from new.tank_id then
      perform private.assert_tank_reservation_capacity(old.tank_id);
    end if;
    return new;
  end if;

  if tg_table_name = 'operation_items' then
    for v_tank_id in
      select distinct a.tank_id
      from public.operation_tank_allocations a
      where a.operation_item_id = coalesce(new.id, old.id)
    loop
      perform private.assert_tank_reservation_capacity(v_tank_id);
    end loop;
    return new;
  end if;

  if tg_table_name = 'operations' then
    for v_tank_id in
      select distinct a.tank_id
      from public.operation_tank_allocations a
      where a.operation_id = coalesce(new.id, old.id)
    loop
      perform private.assert_tank_reservation_capacity(v_tank_id);
    end loop;
    return new;
  end if;

  return coalesce(new, old);
end;
$$;

revoke all on function private.enforce_tank_reservation_capacity() from public, anon, authenticated;

drop trigger if exists trg_enforce_tank_reservation_allocations on public.operation_tank_allocations;
create trigger trg_enforce_tank_reservation_allocations
after insert or update of tank_id, direction, quantity, operation_item_id or delete
on public.operation_tank_allocations
for each row execute function private.enforce_tank_reservation_capacity();

drop trigger if exists trg_enforce_tank_reservation_items on public.operation_items;
create trigger trg_enforce_tank_reservation_items
after update of status, tank_movement_applied
on public.operation_items
for each row execute function private.enforce_tank_reservation_capacity();

drop trigger if exists trg_enforce_tank_reservation_operations on public.operations;
create trigger trg_enforce_tank_reservation_operations
after update of status, tank_movement_applied, product_count
on public.operations
for each row execute function private.enforce_tank_reservation_capacity();
