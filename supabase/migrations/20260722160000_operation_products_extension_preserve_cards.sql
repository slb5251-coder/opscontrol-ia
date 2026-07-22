-- OpsControl IA — extensão multiproduto preservando os cartões originais.

alter table public.operation_tank_allocations
  drop constraint if exists operation_tank_allocations_operation_id_direction_tank_id_key;

create unique index if not exists operation_tank_allocations_item_direction_tank_uidx
  on public.operation_tank_allocations(operation_item_id, direction, tank_id)
  where operation_item_id is not null;

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
    case when count(*) > 0 and bool_and(status in ('Concluída','Cancelada')) then max(end_at) else null end
  into v_count, v_status, v_started_at, v_ended_at
  from public.operation_items
  where operation_id = p_operation_id;

  if v_first.id is null then
    update public.operations
    set product_count = 0,
        status = v_status,
        start_at = v_started_at,
        end_at = v_ended_at,
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
      tank_movement_applied = not exists (
        select 1
        from public.operation_items i
        where i.operation_id = p_operation_id
          and i.apply_tank_movement
          and not i.tank_movement_applied
      ),
      tank_movement_applied_at = case
        when not exists (
          select 1
          from public.operation_items i
          where i.operation_id = p_operation_id
            and i.apply_tank_movement
            and not i.tank_movement_applied
        ) then (
          select max(i.tank_movement_applied_at)
          from public.operation_items i
          where i.operation_id = p_operation_id
        )
        else null
      end,
      updated_at = now()
  where id = p_operation_id;
end;
$$;

revoke all on function private.sync_operation_from_items(uuid) from public, anon, authenticated;

create or replace function public.save_operation_product(
  p_item_id uuid,
  p_operation_id uuid,
  p_payload jsonb,
  p_allocations jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_operation public.operations;
  v_existing public.operation_items;
  v_item_id uuid;
  v_fluid_type_id uuid;
  v_product text;
  v_unit text;
  v_activity text;
  v_ticket text;
  v_rt text;
  v_lot text;
  v_rig text;
  v_well text;
  v_status text;
  v_planned numeric;
  v_executed numeric;
  v_flow numeric;
  v_flow_unit text;
  v_paused integer;
  v_start timestamptz;
  v_end timestamptz;
  v_occurrence text;
  v_notes text;
  v_apply boolean;
  v_order integer;
  v_allocation jsonb;
  v_tank public.tanks;
  v_direction text;
  v_quantity numeric;
  v_allocation_lot text;
  v_allocation_total numeric := 0;
  v_allocation_order integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;
  if not private.has_role(array['admin','supervisor','lider','operador']) then
    raise exception 'Seu perfil não pode alterar produtos de operações.';
  end if;

  select * into v_operation
  from public.operations
  where id = p_operation_id
  for update;
  if not found then
    raise exception 'Operação não localizada.';
  end if;

  v_fluid_type_id := nullif(trim(p_payload->>'fluid_type_id'),'')::uuid;
  if v_fluid_type_id is null then
    raise exception 'Selecione o produto no catálogo.';
  end if;

  select name, default_unit into v_product, v_unit
  from public.fluid_types
  where id = v_fluid_type_id and active is not false;
  if not found then
    raise exception 'Produto do catálogo não localizado ou inativo.';
  end if;

  v_activity := coalesce(nullif(trim(p_payload->>'activity'),''),'Bombeio');
  v_ticket := nullif(trim(p_payload->>'ticket_number'),'');
  v_rt := nullif(trim(p_payload->>'rt_number'),'');
  v_lot := nullif(trim(p_payload->>'lot'),'');
  v_rig := nullif(trim(p_payload->>'rig'),'');
  v_well := nullif(trim(p_payload->>'well'),'');
  v_status := coalesce(nullif(trim(p_payload->>'status'),''),'Programada');
  v_planned := coalesce(nullif(p_payload->>'planned_quantity','')::numeric,0);
  v_executed := coalesce(nullif(p_payload->>'executed_quantity','')::numeric,0);
  v_flow := nullif(p_payload->>'flow_rate','')::numeric;
  v_flow_unit := coalesce(nullif(trim(p_payload->>'flow_rate_unit'),''), concat(v_unit,'/h'));
  v_paused := coalesce(nullif(p_payload->>'paused_minutes','')::integer,0);
  v_start := nullif(p_payload->>'start_at','')::timestamptz;
  v_end := nullif(p_payload->>'end_at','')::timestamptz;
  v_occurrence := nullif(trim(p_payload->>'occurrence'),'');
  v_notes := nullif(trim(p_payload->>'notes'),'');
  v_apply := coalesce(nullif(p_payload->>'apply_tank_movement','')::boolean,false);

  if v_ticket is null or v_rt is null or v_lot is null or v_rig is null then
    raise exception 'Ticket, RT, lote e sonda são obrigatórios para cada produto.';
  end if;
  if v_planned < 0 or v_executed < 0 then
    raise exception 'As quantidades não podem ser negativas.';
  end if;
  if v_paused < 0 then
    raise exception 'O tempo parado não pode ser negativo.';
  end if;
  if v_status = 'Concluída' and v_end is null then
    raise exception 'Informe o horário de término do produto concluído.';
  end if;
  if jsonb_typeof(coalesce(p_allocations,'[]'::jsonb)) <> 'array' then
    raise exception 'Rateio de tanques ou silos inválido.';
  end if;

  if p_item_id is not null then
    select * into v_existing
    from public.operation_items
    where id = p_item_id and operation_id = p_operation_id
    for update;
    if not found then
      raise exception 'Produto da operação não localizado.';
    end if;
  end if;

  if v_existing.id is not null and v_existing.tank_movement_applied then
    update public.operation_items
    set ticket_number = v_ticket,
        rt_number = v_rt,
        lot = v_lot,
        rig = v_rig,
        well = v_well,
        occurrence = v_occurrence,
        notes = v_notes,
        updated_at = now()
    where id = v_existing.id
    returning id into v_item_id;
  else
    if v_existing.id is null then
      select coalesce(max(display_order),-1) + 1 into v_order
      from public.operation_items
      where operation_id = p_operation_id;

      insert into public.operation_items (
        operation_id, display_order, activity, fluid_type_id, product,
        ticket_number, rt_number, lot, rig, well,
        planned_quantity, executed_quantity, unit, status,
        start_at, end_at, flow_rate, flow_rate_unit, paused_minutes,
        occurrence, notes, apply_tank_movement, created_by
      ) values (
        p_operation_id, v_order, v_activity, v_fluid_type_id, v_product,
        v_ticket, v_rt, v_lot, v_rig, v_well,
        v_planned, v_executed, v_unit, v_status,
        v_start, v_end, v_flow, v_flow_unit, v_paused,
        v_occurrence, v_notes, v_apply, auth.uid()
      ) returning id into v_item_id;
    else
      update public.operation_items
      set activity = v_activity,
          fluid_type_id = v_fluid_type_id,
          product = v_product,
          ticket_number = v_ticket,
          rt_number = v_rt,
          lot = v_lot,
          rig = v_rig,
          well = v_well,
          planned_quantity = v_planned,
          executed_quantity = v_executed,
          unit = v_unit,
          status = v_status,
          start_at = v_start,
          end_at = v_end,
          flow_rate = v_flow,
          flow_rate_unit = v_flow_unit,
          paused_minutes = v_paused,
          occurrence = v_occurrence,
          notes = v_notes,
          apply_tank_movement = v_apply,
          updated_at = now()
      where id = v_existing.id
      returning id into v_item_id;

      delete from public.operation_tank_allocations
      where operation_item_id = v_item_id;
    end if;

    for v_allocation in
      select value from jsonb_array_elements(coalesce(p_allocations,'[]'::jsonb))
    loop
      v_direction := coalesce(nullif(trim(v_allocation->>'direction'),''),'source');
      if v_direction not in ('source','destination') then
        raise exception 'Direção de rateio inválida.';
      end if;
      if nullif(v_allocation->>'tank_id','') is null then
        raise exception 'Selecione o tanque ou silo do rateio.';
      end if;
      v_quantity := coalesce(nullif(v_allocation->>'quantity','')::numeric,0);
      if v_quantity <= 0 then
        raise exception 'A quantidade de cada rateio deve ser maior que zero.';
      end if;

      select * into v_tank
      from public.tanks
      where id = (v_allocation->>'tank_id')::uuid;
      if not found then
        raise exception 'Tanque ou silo do rateio não localizado.';
      end if;
      if lower(v_tank.unit) <> lower(v_unit) then
        raise exception '% utiliza %, diferente da unidade do produto (%).', v_tank.name, v_tank.unit, v_unit;
      end if;

      v_allocation_lot := coalesce(nullif(trim(v_allocation->>'lot'),''),v_lot);
      insert into public.operation_tank_allocations (
        operation_id, operation_item_id, direction, tank_id,
        quantity, unit, display_order, created_by, lot
      ) values (
        p_operation_id, v_item_id, v_direction, v_tank.id,
        v_quantity, v_unit, v_allocation_order, auth.uid(), v_allocation_lot
      );
      v_allocation_total := v_allocation_total + v_quantity;
      v_allocation_order := v_allocation_order + 1;
    end loop;

    if v_apply and v_status = 'Concluída' then
      if v_allocation_order = 0 then
        raise exception 'Adicione o rateio antes de concluir um produto com movimentação automática.';
      end if;
      if abs(v_allocation_total - v_executed) > 0.001 then
        raise exception 'O rateio precisa ser igual ao executado: % %.', v_executed, v_unit;
      end if;
    end if;
  end if;

  perform private.sync_operation_from_items(p_operation_id);
  return v_item_id;
end;
$$;

revoke all on function public.save_operation_product(uuid,uuid,jsonb,jsonb) from public, anon;
grant execute on function public.save_operation_product(uuid,uuid,jsonb,jsonb) to authenticated, service_role;

create or replace function public.delete_operation_product(p_item_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_item public.operation_items;
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;
  if not private.has_role(array['admin','supervisor','lider','operador']) then
    raise exception 'Seu perfil não pode excluir produtos de operações.';
  end if;

  select * into v_item
  from public.operation_items
  where id = p_item_id
  for update;
  if not found then
    raise exception 'Produto da operação não localizado.';
  end if;
  if v_item.tank_movement_applied then
    raise exception 'Este produto já movimentou estoque e não pode ser excluído.';
  end if;

  select count(*)::integer into v_count
  from public.operation_items
  where operation_id = v_item.operation_id;
  if v_count <= 1 then
    raise exception 'A operação precisa manter pelo menos um produto.';
  end if;

  delete from public.operation_items where id = p_item_id;
  perform private.sync_operation_from_items(v_item.operation_id);
  return v_item.operation_id;
end;
$$;

revoke all on function public.delete_operation_product(uuid) from public, anon;
grant execute on function public.delete_operation_product(uuid) to authenticated, service_role;
