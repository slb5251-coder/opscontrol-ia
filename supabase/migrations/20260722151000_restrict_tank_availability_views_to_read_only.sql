-- OpsControl IA — manter as views de disponibilidade somente leitura.

revoke all privileges on public.tank_operation_reservations from public, anon, authenticated, service_role;
revoke all privileges on public.tank_operational_availability from public, anon, authenticated, service_role;

grant select on public.tank_operation_reservations to authenticated, service_role;
grant select on public.tank_operational_availability to authenticated, service_role;
