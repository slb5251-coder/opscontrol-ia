-- O OPSControl exige autenticação para todos os dados operacionais.
revoke all privileges on all tables in schema public from anon;
revoke all privileges on all sequences in schema public from anon;
revoke execute on all functions in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke execute on functions from anon;

-- Catálogo químico: políticas antes aplicadas a PUBLIC.
drop policy if exists chemical_products_select on public.chemical_products;
drop policy if exists chemical_products_insert on public.chemical_products;
drop policy if exists chemical_products_update on public.chemical_products;
create policy chemical_products_select on public.chemical_products
  for select to authenticated using (true);
create policy chemical_products_insert on public.chemical_products
  for insert to authenticated
  with check (private.has_role(array['admin','supervisor','lider','logistica','qhse']));
create policy chemical_products_update on public.chemical_products
  for update to authenticated
  using (private.has_role(array['admin','supervisor','lider','logistica','qhse']))
  with check (private.has_role(array['admin','supervisor','lider','logistica','qhse']));

-- Contagens de inventário: políticas antes aplicadas a PUBLIC.
drop policy if exists inventory_counts_select on public.inventory_counts;
drop policy if exists inventory_counts_write on public.inventory_counts;
drop policy if exists inventory_counts_insert on public.inventory_counts;
create policy inventory_counts_select on public.inventory_counts
  for select to authenticated using (true);
create policy inventory_counts_insert on public.inventory_counts
  for insert to authenticated
  with check (private.has_role(array['admin','supervisor','lider','logistica']));

-- Distribuição operacional: políticas antes aplicadas a PUBLIC.
drop policy if exists operation_tank_allocations_select on public.operation_tank_allocations;
drop policy if exists operation_tank_allocations_insert on public.operation_tank_allocations;
drop policy if exists operation_tank_allocations_update on public.operation_tank_allocations;
drop policy if exists operation_tank_allocations_delete on public.operation_tank_allocations;
create policy operation_tank_allocations_select on public.operation_tank_allocations
  for select to authenticated using (true);
create policy operation_tank_allocations_insert on public.operation_tank_allocations
  for insert to authenticated
  with check (
    private.has_role(array['admin','supervisor','lider','operador'])
    and created_by = (select auth.uid())
  );
create policy operation_tank_allocations_update on public.operation_tank_allocations
  for update to authenticated
  using (private.has_role(array['admin','supervisor','lider','operador']))
  with check (private.has_role(array['admin','supervisor','lider','operador']));
create policy operation_tank_allocations_delete on public.operation_tank_allocations
  for delete to authenticated
  using (private.has_role(array['admin','supervisor','lider','operador']));

-- Fechamento operacional: políticas antes aplicadas a PUBLIC.
drop policy if exists operational_closings_select on public.operational_closings;
drop policy if exists operational_closings_write on public.operational_closings;
drop policy if exists operational_closings_insert on public.operational_closings;
drop policy if exists operational_closings_update on public.operational_closings;
drop policy if exists operational_closings_delete on public.operational_closings;
create policy operational_closings_select on public.operational_closings
  for select to authenticated using (true);
create policy operational_closings_insert on public.operational_closings
  for insert to authenticated
  with check (private.has_role(array['admin','supervisor','lider']));
create policy operational_closings_update on public.operational_closings
  for update to authenticated
  using (private.has_role(array['admin','supervisor','lider']))
  with check (private.has_role(array['admin','supervisor','lider']));
create policy operational_closings_delete on public.operational_closings
  for delete to authenticated
  using (private.has_role(array['admin','supervisor','lider']));

drop policy if exists closing_reconciliation_select on public.closing_reconciliation_items;
drop policy if exists closing_reconciliation_write on public.closing_reconciliation_items;
drop policy if exists closing_reconciliation_insert on public.closing_reconciliation_items;
drop policy if exists closing_reconciliation_update on public.closing_reconciliation_items;
drop policy if exists closing_reconciliation_delete on public.closing_reconciliation_items;
create policy closing_reconciliation_select on public.closing_reconciliation_items
  for select to authenticated using (true);
create policy closing_reconciliation_insert on public.closing_reconciliation_items
  for insert to authenticated
  with check (private.has_role(array['admin','supervisor','lider']));
create policy closing_reconciliation_update on public.closing_reconciliation_items
  for update to authenticated
  using (private.has_role(array['admin','supervisor','lider']))
  with check (private.has_role(array['admin','supervisor','lider']));
create policy closing_reconciliation_delete on public.closing_reconciliation_items
  for delete to authenticated
  using (private.has_role(array['admin','supervisor','lider']));
