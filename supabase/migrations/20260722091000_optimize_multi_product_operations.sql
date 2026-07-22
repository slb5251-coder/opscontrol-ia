-- Índices e ajuste de RLS para Operações multiproduto.
create index if not exists operation_items_created_by_idx on public.operation_items(created_by);
create index if not exists operation_items_fluid_type_idx on public.operation_items(fluid_type_id);
create index if not exists tank_movements_operation_item_idx on public.tank_movements(operation_item_id);

drop policy if exists operation_items_insert on public.operation_items;
create policy operation_items_insert
on public.operation_items for insert
to authenticated
with check (
  private.has_role(array['admin','supervisor','lider','operador'])
  and created_by = (select auth.uid())
);
