-- OpsControl IA — Operações multiproduto por embarcação
-- Aplicada ao projeto de produção bcnzdujfumswhpduxkfy em 22/07/2026.

alter table public.operations
  add column if not exists berth text,
  add column if not exists scheduled_at timestamptz,
  add column if not exists product_count integer not null default 1;

create table if not exists public.operation_items (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references public.operations(id) on delete cascade,
  display_order integer not null default 0,
  activity text not null,
  fluid_type_id uuid references public.fluid_types(id) on delete set null,
  product text not null,
  ticket_number text,
  rt_number text,
  lot text,
  rig text,
  well text,
  planned_quantity numeric not null default 0,
  executed_quantity numeric not null default 0,
  unit text not null default 'bbl',
  status text not null default 'Programada',
  start_at timestamptz,
  end_at timestamptz,
  flow_rate numeric,
  flow_rate_unit text,
  paused_minutes integer not null default 0,
  occurrence text,
  notes text,
  apply_tank_movement boolean not null default false,
  tank_movement_applied boolean not null default false,
  tank_movement_applied_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint operation_items_status_check check (status in ('Programada','Em andamento','Paralisada','Concluída','Cancelada')),
  constraint operation_items_quantities_check check (planned_quantity >= 0 and executed_quantity >= 0),
  constraint operation_items_paused_check check (paused_minutes >= 0)
);

create index if not exists operation_items_operation_idx on public.operation_items(operation_id, display_order);
create index if not exists operation_items_status_idx on public.operation_items(status);
create index if not exists operation_items_ticket_idx on public.operation_items(ticket_number);
create index if not exists operation_items_rt_idx on public.operation_items(rt_number);

alter table public.operation_tank_allocations
  add column if not exists operation_item_id uuid references public.operation_items(id) on delete cascade,
  add column if not exists lot text;

create index if not exists operation_tank_allocations_item_idx
  on public.operation_tank_allocations(operation_item_id, display_order);

alter table public.tank_movements
  add column if not exists operation_item_id uuid references public.operation_items(id) on delete set null;

insert into public.operation_items (
  operation_id, display_order, activity, fluid_type_id, product, ticket_number, rt_number,
  lot, rig, well, planned_quantity, executed_quantity, unit, status, start_at, end_at,
  flow_rate, flow_rate_unit, paused_minutes, occurrence, notes, apply_tank_movement,
  tank_movement_applied, tank_movement_applied_at, created_by, created_at, updated_at
)
select
  o.id, 0, o.activity, o.fluid_type_id, o.product, o.ticket_number, null,
  o.lot, o.rig, o.well, o.planned_quantity, o.executed_quantity, o.unit, o.status,
  o.start_at, o.end_at, o.flow_rate, o.flow_rate_unit, o.paused_minutes,
  o.occurrence, o.notes, o.apply_tank_movement, o.tank_movement_applied,
  o.tank_movement_applied_at, o.created_by, o.created_at, o.updated_at
from public.operations o
where not exists (
  select 1 from public.operation_items i where i.operation_id = o.id
);

update public.operation_tank_allocations a
set operation_item_id = (
      select oi.id
      from public.operation_items oi
      where oi.operation_id = a.operation_id
      order by oi.display_order, oi.created_at
      limit 1
    ),
    lot = coalesce(a.lot, (
      select oi.lot
      from public.operation_items oi
      where oi.operation_id = a.operation_id
      order by oi.display_order, oi.created_at
      limit 1
    ))
where a.operation_item_id is null;

update public.operations o
set product_count = greatest(1, (
  select count(*)::integer from public.operation_items i where i.operation_id = o.id
));

alter table public.operation_items enable row level security;

drop policy if exists operation_items_select on public.operation_items;
create policy operation_items_select
on public.operation_items for select
to authenticated
using (true);

drop policy if exists operation_items_insert on public.operation_items;
create policy operation_items_insert
on public.operation_items for insert
to authenticated
with check (
  private.has_role(array['admin','supervisor','lider','operador'])
  and created_by = auth.uid()
);

drop policy if exists operation_items_update on public.operation_items;
create policy operation_items_update
on public.operation_items for update
to authenticated
using (private.has_role(array['admin','supervisor','lider','operador']))
with check (private.has_role(array['admin','supervisor','lider','operador']));

drop policy if exists operation_items_delete on public.operation_items;
create policy operation_items_delete
on public.operation_items for delete
to authenticated
using (private.has_role(array['admin','supervisor','lider']));

create or replace function public.save_multi_product_operation(
  p_operation_id uuid,
  p_header jsonb,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_operation_id uuid;
  v_existing public.operations;
  v_first jsonb;
  v_item jsonb;
  v_allocation jsonb;
  v_item_id uuid;
  v_item_order integer;
  v_allocation_order integer;
  v_status text;
  v_count integer;
  v_started_at timestamptz;
  v_ended_at timestamptz;
begin
  if auth.uid() is null then raise exception 'Usuário não autenticado.'; end if;
  if not private.has_role(array['admin','supervisor','lider','operador']) then
    raise exception 'Seu perfil não pode salvar operações.';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Adicione pelo menos um produto à embarcação.';
  end if;

  v_first := p_items -> 0;
  if nullif(trim(v_first->>'product'),'') is null
     or nullif(trim(v_first->>'ticket_number'),'') is null
     or nullif(trim(v_first->>'rt_number'),'') is null
     or nullif(trim(v_first->>'rig'),'') is null then
    raise exception 'Produto, ticket, RT e sonda são obrigatórios em cada item.';
  end if;

  if p_operation_id is null then
    insert into public.operations (
      client, vessel, service_order, activity, product, lot, planned_quantity,
      executed_quantity, unit, status, start_at, end_at, notes, responsible_id,
      created_by, flow_rate, flow_rate_unit, paused_minutes, occurrence,
      apply_tank_movement, tank_movement_applied, fluid_type_id, rig, well,
      ticket_number, vessel_registry_id, berth, scheduled_at, product_count
    ) values (
      trim(p_header->>'client'), trim(p_header->>'vessel'), nullif(trim(p_header->>'service_order'),''),
      trim(v_first->>'activity'), trim(v_first->>'product'), nullif(trim(v_first->>'lot'),''),
      coalesce((v_first->>'planned_quantity')::numeric,0), coalesce((v_first->>'executed_quantity')::numeric,0),
      coalesce(nullif(trim(v_first->>'unit'),''),'bbl'), 'Programada',
      nullif(v_first->>'start_at','')::timestamptz, nullif(v_first->>'end_at','')::timestamptz,
      nullif(trim(p_header->>'notes'),''), nullif(p_header->>'responsible_id','')::uuid,
      auth.uid(), nullif(v_first->>'flow_rate','')::numeric, nullif(trim(v_first->>'flow_rate_unit'),''),
      coalesce((v_first->>'paused_minutes')::integer,0), nullif(trim(v_first->>'occurrence'),''),
      coalesce((v_first->>'apply_tank_movement')::boolean,false), false,
      nullif(v_first->>'fluid_type_id','')::uuid, nullif(trim(v_first->>'rig'),''),
      nullif(trim(v_first->>'well'),''), nullif(trim(v_first->>'ticket_number'),''),
      nullif(p_header->>'vessel_registry_id','')::uuid, nullif(trim(p_header->>'berth'),''),
      nullif(p_header->>'scheduled_at','')::timestamptz, jsonb_array_length(p_items)
    ) returning id into v_operation_id;
  else
    select * into v_existing
    from public.operations
    where id = p_operation_id
    for update;

    if not found then raise exception 'Operação não localizada.'; end if;
    if exists (
      select 1 from public.operation_items
      where operation_id = p_operation_id and tank_movement_applied
    ) then
      raise exception 'Esta operação possui movimentação de estoque aplicada e não pode ter seus produtos recriados.';
    end if;

    v_operation_id := p_operation_id;
    delete from public.operation_tank_allocations where operation_id = v_operation_id;
    delete from public.operation_items where operation_id = v_operation_id;
  end if;

  v_item_order := 0;
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if nullif(trim(v_item->>'product'),'') is null
       or nullif(trim(v_item->>'ticket_number'),'') is null
       or nullif(trim(v_item->>'rt_number'),'') is null
       or nullif(trim(v_item->>'rig'),'') is null then
      raise exception 'Produto, ticket, RT e sonda são obrigatórios em cada item.';
    end if;

    insert into public.operation_items (
      operation_id, display_order, activity, fluid_type_id, product, ticket_number,
      rt_number, lot, rig, well, planned_quantity, executed_quantity, unit, status,
      start_at, end_at, flow_rate, flow_rate_unit, paused_minutes, occurrence, notes,
      apply_tank_movement, created_by
    ) values (
      v_operation_id, v_item_order, trim(v_item->>'activity'), nullif(v_item->>'fluid_type_id','')::uuid,
      trim(v_item->>'product'), trim(v_item->>'ticket_number'), trim(v_item->>'rt_number'),
      nullif(trim(v_item->>'lot'),''), trim(v_item->>'rig'), nullif(trim(v_item->>'well'),''),
      coalesce((v_item->>'planned_quantity')::numeric,0), coalesce((v_item->>'executed_quantity')::numeric,0),
      coalesce(nullif(trim(v_item->>'unit'),''),'bbl'), coalesce(nullif(trim(v_item->>'status'),''),'Programada'),
      nullif(v_item->>'start_at','')::timestamptz, nullif(v_item->>'end_at','')::timestamptz,
      nullif(v_item->>'flow_rate','')::numeric, nullif(trim(v_item->>'flow_rate_unit'),''),
      coalesce((v_item->>'paused_minutes')::integer,0), nullif(trim(v_item->>'occurrence'),''),
      nullif(trim(v_item->>'notes'),''), coalesce((v_item->>'apply_tank_movement')::boolean,false), auth.uid()
    ) returning id into v_item_id;

    v_allocation_order := 0;
    for v_allocation in
      select value from jsonb_array_elements(coalesce(v_item->'allocations','[]'::jsonb))
    loop
      if nullif(v_allocation->>'tank_id','') is null then
        raise exception 'Selecione o tanque ou silo de cada rateio.';
      end if;
      if coalesce((v_allocation->>'quantity')::numeric,0) <= 0 then
        raise exception 'A quantidade de cada rateio deve ser maior que zero.';
      end if;

      insert into public.operation_tank_allocations (
        operation_id, operation_item_id, direction, tank_id, quantity, unit,
        display_order, created_by, lot
      ) values (
        v_operation_id, v_item_id, coalesce(nullif(trim(v_allocation->>'direction'),''),'source'),
        (v_allocation->>'tank_id')::uuid, (v_allocation->>'quantity')::numeric,
        coalesce(nullif(trim(v_item->>'unit'),''),'bbl'), v_allocation_order, auth.uid(),
        coalesce(nullif(trim(v_allocation->>'lot'),''), nullif(trim(v_item->>'lot'),''))
      );
      v_allocation_order := v_allocation_order + 1;
    end loop;

    v_item_order := v_item_order + 1;
  end loop;

  select
    case
      when bool_and(status in ('Concluída','Cancelada')) then 'Concluída'
      when bool_or(status = 'Paralisada') then 'Paralisada'
      when bool_or(status = 'Em andamento') then 'Em andamento'
      else 'Programada'
    end,
    count(*)::integer,
    min(start_at),
    case when bool_and(status in ('Concluída','Cancelada')) then max(end_at) else null end
  into v_status, v_count, v_started_at, v_ended_at
  from public.operation_items
  where operation_id = v_operation_id;

  update public.operations
  set client = trim(p_header->>'client'),
      vessel = trim(p_header->>'vessel'),
      service_order = nullif(trim(p_header->>'service_order'),''),
      responsible_id = nullif(p_header->>'responsible_id','')::uuid,
      notes = nullif(trim(p_header->>'notes'),''),
      vessel_registry_id = nullif(p_header->>'vessel_registry_id','')::uuid,
      berth = nullif(trim(p_header->>'berth'),''),
      scheduled_at = nullif(p_header->>'scheduled_at','')::timestamptz,
      product_count = v_count,
      status = v_status,
      start_at = v_started_at,
      end_at = v_ended_at,
      activity = trim(v_first->>'activity'),
      product = trim(v_first->>'product'),
      lot = nullif(trim(v_first->>'lot'),''),
      planned_quantity = coalesce((v_first->>'planned_quantity')::numeric,0),
      executed_quantity = coalesce((v_first->>'executed_quantity')::numeric,0),
      unit = coalesce(nullif(trim(v_first->>'unit'),''),'bbl'),
      flow_rate = nullif(v_first->>'flow_rate','')::numeric,
      flow_rate_unit = nullif(trim(v_first->>'flow_rate_unit'),''),
      paused_minutes = coalesce((v_first->>'paused_minutes')::integer,0),
      occurrence = nullif(trim(v_first->>'occurrence'),''),
      apply_tank_movement = coalesce((v_first->>'apply_tank_movement')::boolean,false),
      fluid_type_id = nullif(v_first->>'fluid_type_id','')::uuid,
      rig = nullif(trim(v_first->>'rig'),''),
      well = nullif(trim(v_first->>'well'),''),
      ticket_number = nullif(trim(v_first->>'ticket_number'),''),
      updated_at = now()
  where id = v_operation_id;

  return v_operation_id;
end;
$$;

create or replace function public.apply_operation_item_movement(p_item_id uuid)
returns public.operation_items
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_item public.operation_items;
  v_operation public.operations;
  v_allocation public.operation_tank_allocations;
  v_tank public.tanks;
  v_previous numeric;
  v_final numeric;
  v_sum numeric;
begin
  if auth.uid() is null then raise exception 'Usuário não autenticado.'; end if;
  if not private.has_role(array['admin','supervisor','lider','operador','logistica']) then
    raise exception 'Seu perfil não pode aplicar movimentações.';
  end if;

  select * into v_item
  from public.operation_items
  where id = p_item_id
  for update;

  if not found then raise exception 'Produto da operação não localizado.'; end if;
  if v_item.tank_movement_applied then return v_item; end if;
  if not v_item.apply_tank_movement then
    raise exception 'Este produto não está configurado para movimentar estoque.';
  end if;
  if v_item.status <> 'Concluída' then
    raise exception 'Conclua o produto antes de aplicar a movimentação.';
  end if;

  select * into v_operation from public.operations where id = v_item.operation_id;
  select coalesce(sum(quantity),0) into v_sum
  from public.operation_tank_allocations
  where operation_item_id = p_item_id;

  if abs(v_sum - v_item.executed_quantity) > 0.001 then
    raise exception 'O rateio precisa ser igual ao executado: % %.', v_item.executed_quantity, v_item.unit;
  end if;

  for v_allocation in
    select * from public.operation_tank_allocations
    where operation_item_id = p_item_id
    order by display_order
  loop
    select * into v_tank
    from public.tanks
    where id = v_allocation.tank_id
    for update;

    if not found then raise exception 'Tanque ou silo do rateio não localizado.'; end if;
    if v_tank.unit <> v_item.unit then
      raise exception '% utiliza %, diferente da unidade do produto (%).', v_tank.name, v_tank.unit, v_item.unit;
    end if;

    v_previous := v_tank.current_volume;

    if v_allocation.direction = 'source' then
      if v_previous < v_allocation.quantity then
        raise exception 'Saldo insuficiente em %: disponível % %.', v_tank.name, v_previous, v_tank.unit;
      end if;
      v_final := v_previous - v_allocation.quantity;
      update public.tanks
      set current_volume = v_final,
          current_product = case when v_final <= 0 then null else current_product end,
          current_lot = case when v_final <= 0 then null else current_lot end,
          current_fluid_type_id = case when v_final <= 0 then null else current_fluid_type_id end,
          client = case when v_final <= 0 then 'A definir' else client end,
          status = case when v_final <= 0 then 'Disponível' else status end,
          updated_by = auth.uid(),
          updated_at = now()
      where id = v_tank.id;
    elsif v_allocation.direction = 'destination' then
      if v_previous + v_allocation.quantity > v_tank.capacity + 0.001 then
        raise exception 'Capacidade excedida em %.', v_tank.name;
      end if;
      if v_previous > 0
         and v_tank.current_fluid_type_id is not null
         and v_item.fluid_type_id is not null
         and v_tank.current_fluid_type_id <> v_item.fluid_type_id then
        raise exception '% já contém outro produto.', v_tank.name;
      end if;
      v_final := v_previous + v_allocation.quantity;
      update public.tanks
      set current_volume = v_final,
          current_product = v_item.product,
          current_lot = coalesce(v_allocation.lot, v_item.lot),
          current_fluid_type_id = v_item.fluid_type_id,
          client = coalesce(nullif(v_operation.client,''),'A definir'),
          status = 'Em uso',
          updated_by = auth.uid(),
          updated_at = now()
      where id = v_tank.id;
    else
      raise exception 'Direção de rateio inválida.';
    end if;

    insert into public.tank_movements (
      movement_type, source_tank_id, destination_tank_id, operation_id, operation_item_id,
      quantity, unit, product, lot, reference, notes, created_by, previous_volume,
      final_volume, movement_direction, fluid_type_id, client, vessel, responsible_id,
      movement_at, status_after
    ) values (
      v_item.activity,
      case when v_allocation.direction='source' then v_tank.id else null end,
      case when v_allocation.direction='destination' then v_tank.id else null end,
      v_operation.id,
      v_item.id,
      v_allocation.quantity,
      v_item.unit,
      v_item.product,
      coalesce(v_allocation.lot, v_item.lot),
      concat_ws(' • ', nullif(v_item.ticket_number,''), nullif(v_item.rt_number,'')),
      concat('Produto ', v_item.display_order + 1, ' da embarcação ', v_operation.vessel),
      auth.uid(),
      v_previous,
      v_final,
      v_allocation.direction,
      v_item.fluid_type_id,
      v_operation.client,
      v_operation.vessel,
      v_operation.responsible_id,
      now(),
      case when v_final <= 0 then 'Disponível' else 'Em uso' end
    );
  end loop;

  update public.operation_items
  set tank_movement_applied = true,
      tank_movement_applied_at = now(),
      updated_at = now()
  where id = p_item_id
  returning * into v_item;

  update public.operations o
  set tank_movement_applied = not exists (
        select 1 from public.operation_items i
        where i.operation_id = o.id
          and i.apply_tank_movement
          and not i.tank_movement_applied
      ),
      tank_movement_applied_at = case when not exists (
        select 1 from public.operation_items i
        where i.operation_id = o.id
          and i.apply_tank_movement
          and not i.tank_movement_applied
      ) then now() else null end,
      updated_at = now()
  where o.id = v_item.operation_id;

  return v_item;
end;
$$;

revoke all on function public.save_multi_product_operation(uuid,jsonb,jsonb) from public;
revoke all on function public.save_multi_product_operation(uuid,jsonb,jsonb) from anon;
grant execute on function public.save_multi_product_operation(uuid,jsonb,jsonb) to authenticated;

revoke all on function public.apply_operation_item_movement(uuid) from public;
revoke all on function public.apply_operation_item_movement(uuid) from anon;
grant execute on function public.apply_operation_item_movement(uuid) to authenticated;
