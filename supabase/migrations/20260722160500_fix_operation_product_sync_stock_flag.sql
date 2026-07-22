create or replace function private.sync_operation_from_items(p_operation_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_first public.operation_items;
  v_count integer;
  v_status text;
  v_started_at timestamptz;
  v_ended_at timestamptz;
  v_has_automatic boolean;
  v_has_pending_automatic boolean;
begin
  select * into v_first
  from public.operation_items
  where operation_id = p_operation_id
  order by display_order, created_at
  limit 1;

  select
    count(*)::integer,
    case
      when count(*) = 0 then 'Programada'
      when bool_and(status in ('Concluída','Cancelada')) then 'Concluída'
      when bool_or(status = 'Paralisada') then 'Paralisada'
      when bool_or(status = 'Em andamento') then 'Em andamento'
      else 'Programada'
    end,
    min(start_at),
    case when count(*) > 0 and bool_and(status in ('Concluída','Cancelada')) then max(end_at) else null end,
    coalesce(bool_or(apply_tank_movement),false),
    coalesce(bool_or(apply_tank_movement and not tank_movement_applied),false)
  into v_count, v_status, v_started_at, v_ended_at, v_has_automatic, v_has_pending_automatic
  from public.operation_items
  where operation_id = p_operation_id;

  if v_first.id is null then
    update public.operations
    set product_count = 0,
        status = v_status,
        start_at = v_started_at,
        end_at = v_ended_at,
        tank_movement_applied = false,
        tank_movement_applied_at = null,
        updated_at = now()
    where id = p_operation_id;
    return;
  end if;

  update public.operations
  set product_count = v_count,
      status = v_status,
      start_at = v_started_at,
      end_at = v_ended_at,
      activity = v_first.activity,
      fluid_type_id = v_first.fluid_type_id,
      product = v_first.product,
      ticket_number = v_first.ticket_number,
      lot = v_first.lot,
      rig = v_first.rig,
      well = v_first.well,
      planned_quantity = v_first.planned_quantity,
      executed_quantity = v_first.executed_quantity,
      unit = v_first.unit,
      flow_rate = v_first.flow_rate,
      flow_rate_unit = v_first.flow_rate_unit,
      paused_minutes = v_first.paused_minutes,
      occurrence = v_first.occurrence,
      apply_tank_movement = v_first.apply_tank_movement,
      tank_movement_applied = v_has_automatic and not v_has_pending_automatic,
      tank_movement_applied_at = case
        when v_has_automatic and not v_has_pending_automatic then (
          select max(i.tank_movement_applied_at)
          from public.operation_items i
          where i.operation_id = p_operation_id and i.apply_tank_movement
        )
        else null
      end,
      updated_at = now()
  where id = p_operation_id;
end;
$$;

revoke all on function private.sync_operation_from_items(uuid) from public, anon, authenticated;
