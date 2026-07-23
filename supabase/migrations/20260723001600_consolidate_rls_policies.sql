-- Políticas FOR ALL eram avaliadas também em SELECT. São separadas por operação.
drop policy if exists documents_write on public.documents;
drop policy if exists documents_insert on public.documents;
drop policy if exists documents_update on public.documents;
drop policy if exists documents_delete on public.documents;
create policy documents_insert on public.documents
  for insert to authenticated
  with check (private.has_role(array['admin','supervisor','lider','qhse','logistica']));
create policy documents_update on public.documents
  for update to authenticated
  using (private.has_role(array['admin','supervisor','lider','qhse','logistica']))
  with check (private.has_role(array['admin','supervisor','lider','qhse','logistica']));
create policy documents_delete on public.documents
  for delete to authenticated
  using (private.has_role(array['admin','supervisor','lider','qhse','logistica']));

drop policy if exists courses_write on public.courses;
drop policy if exists courses_insert on public.courses;
drop policy if exists courses_update on public.courses;
drop policy if exists courses_delete on public.courses;
create policy courses_insert on public.courses
  for insert to authenticated
  with check (private.has_role(array['admin','supervisor','lider','qhse']));
create policy courses_update on public.courses
  for update to authenticated
  using (private.has_role(array['admin','supervisor','lider','qhse']))
  with check (private.has_role(array['admin','supervisor','lider','qhse']));
create policy courses_delete on public.courses
  for delete to authenticated
  using (private.has_role(array['admin','supervisor','lider','qhse']));

drop policy if exists course_enrollments_write on public.course_enrollments;
drop policy if exists course_enrollments_insert on public.course_enrollments;
drop policy if exists course_enrollments_update on public.course_enrollments;
drop policy if exists course_enrollments_delete on public.course_enrollments;
create policy course_enrollments_insert on public.course_enrollments
  for insert to authenticated
  with check (private.has_role(array['admin','supervisor','lider','qhse']));
create policy course_enrollments_update on public.course_enrollments
  for update to authenticated
  using (private.has_role(array['admin','supervisor','lider','qhse']))
  with check (private.has_role(array['admin','supervisor','lider','qhse']));
create policy course_enrollments_delete on public.course_enrollments
  for delete to authenticated
  using (private.has_role(array['admin','supervisor','lider','qhse']));

drop policy if exists dds_sessions_write on public.dds_sessions;
drop policy if exists dds_sessions_insert on public.dds_sessions;
drop policy if exists dds_sessions_update on public.dds_sessions;
drop policy if exists dds_sessions_delete on public.dds_sessions;
create policy dds_sessions_insert on public.dds_sessions
  for insert to authenticated
  with check (private.has_role(array['admin','supervisor','lider','qhse']));
create policy dds_sessions_update on public.dds_sessions
  for update to authenticated
  using (private.has_role(array['admin','supervisor','lider','qhse']))
  with check (private.has_role(array['admin','supervisor','lider','qhse']));
create policy dds_sessions_delete on public.dds_sessions
  for delete to authenticated
  using (private.has_role(array['admin','supervisor','lider','qhse']));

drop policy if exists dds_attendance_write on public.dds_attendance;
drop policy if exists dds_attendance_insert on public.dds_attendance;
drop policy if exists dds_attendance_update on public.dds_attendance;
drop policy if exists dds_attendance_delete on public.dds_attendance;
create policy dds_attendance_insert on public.dds_attendance
  for insert to authenticated
  with check (private.has_role(array['admin','supervisor','lider','qhse']));
create policy dds_attendance_update on public.dds_attendance
  for update to authenticated
  using (private.has_role(array['admin','supervisor','lider','qhse']))
  with check (private.has_role(array['admin','supervisor','lider','qhse']));
create policy dds_attendance_delete on public.dds_attendance
  for delete to authenticated
  using (private.has_role(array['admin','supervisor','lider','qhse']));

-- Políticas administrativas redundantes: as políticas principais já incluem admin.
drop policy if exists action_items_admin_update_all on public.action_items;
drop policy if exists alerts_admin_update_all on public.alerts;
drop policy if exists chemical_inventory_admin_update_all on public.chemical_inventory;
drop policy if exists equipment_admin_update_all on public.equipment;
drop policy if exists fluid_types_admin_update_all on public.fluid_types;
drop policy if exists maintenance_orders_admin_update_all on public.maintenance_orders;
drop policy if exists operations_admin_update_all on public.operations;
drop policy if exists qhse_records_admin_update_all on public.qhse_records;
drop policy if exists tanks_admin_update_all on public.tanks;
drop policy if exists trucks_admin_update_all on public.trucks;

-- Evita recalcular auth.uid() para cada linha nas políticas.
drop policy if exists certificates_select_manager_or_owner on public.certificates;
create policy certificates_select_manager_or_owner on public.certificates
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.has_role(array['admin','supervisor','logistica'])
  );

drop policy if exists shift_handover_notes_insert on public.shift_handover_notes;
drop policy if exists shift_handover_notes_update on public.shift_handover_notes;
create policy shift_handover_notes_insert on public.shift_handover_notes
  for insert to authenticated
  with check (
    updated_by = (select auth.uid())
    and private.has_role(array['admin','supervisor','lider','operador','logistica','qhse','mecanico'])
  );
create policy shift_handover_notes_update on public.shift_handover_notes
  for update to authenticated
  using (private.has_role(array['admin','supervisor','lider','operador','logistica','qhse','mecanico']))
  with check (
    updated_by = (select auth.uid())
    and private.has_role(array['admin','supervisor','lider','operador','logistica','qhse','mecanico'])
  );

drop policy if exists handover_pending_insert on public.handover_pending_items;
create policy handover_pending_insert on public.handover_pending_items
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and private.has_role(array['admin','supervisor','lider','operador','logistica','qhse','mecanico'])
  );

drop policy if exists truck_movement_items_insert on public.truck_movement_items;
create policy truck_movement_items_insert on public.truck_movement_items
  for insert to authenticated
  with check (
    private.has_role(array['admin','supervisor','lider','logistica'])
    and created_by = (select auth.uid())
  );
