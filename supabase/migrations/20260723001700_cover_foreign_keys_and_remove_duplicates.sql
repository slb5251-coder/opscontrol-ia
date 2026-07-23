-- Índices de cobertura para chaves estrangeiras sinalizadas pelo advisor.
create index if not exists idx_alerts_acknowledged_by on public.alerts(acknowledged_by);
create index if not exists idx_alerts_resolved_by on public.alerts(resolved_by);
create index if not exists idx_chemical_products_created_by on public.chemical_products(created_by);
create index if not exists idx_client_document_tickets_created_by on public.client_document_tickets(created_by);
create index if not exists idx_client_document_tickets_operation_id on public.client_document_tickets(operation_id);
create index if not exists idx_client_ticket_documents_uploaded_by on public.client_ticket_documents(uploaded_by);
create index if not exists idx_course_enrollments_course_id on public.course_enrollments(course_id);
create index if not exists idx_course_enrollments_created_by on public.course_enrollments(created_by);
create index if not exists idx_courses_created_by on public.courses(created_by);
create index if not exists idx_dds_attendance_user_id on public.dds_attendance(user_id);
create index if not exists idx_dds_sessions_created_by on public.dds_sessions(created_by);
create index if not exists idx_dismissed_system_alerts_dismissed_by on public.dismissed_system_alerts(dismissed_by);
create index if not exists idx_documents_created_by on public.documents(created_by);
create index if not exists idx_documents_updated_by on public.documents(updated_by);
create index if not exists idx_inventory_counts_created_by on public.inventory_counts(created_by);
create index if not exists idx_operational_closings_closed_by on public.operational_closings(closed_by);
create index if not exists idx_operational_closings_reopened_by on public.operational_closings(reopened_by);
create index if not exists idx_tank_movements_responsible_id on public.tank_movements(responsible_id);
create index if not exists idx_truck_movement_items_created_by on public.truck_movement_items(created_by);
create index if not exists idx_vessel_ais_alerts_resolved_by on public.vessel_ais_alerts(resolved_by);
create index if not exists idx_vessel_ais_sync_runs_requested_by on public.vessel_ais_sync_runs(requested_by);
create index if not exists idx_vessel_geofences_created_by on public.vessel_geofences(created_by);
create index if not exists idx_vessel_geofences_updated_by on public.vessel_geofences(updated_by);
create index if not exists idx_vessel_registry_created_by on public.vessel_registry(created_by);
create index if not exists idx_vessel_registry_updated_by on public.vessel_registry(updated_by);
create index if not exists idx_vessel_schedules_created_by on public.vessel_schedules(created_by);
create index if not exists idx_vessel_schedules_updated_by on public.vessel_schedules(updated_by);

-- Remove somente índices comprovadamente idênticos.
drop index if exists public.idx_tank_history_tank_created;
drop index if exists public.truck_items_truck_product_unique;
