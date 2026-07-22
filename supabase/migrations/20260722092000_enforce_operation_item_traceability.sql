-- Novos produtos exigem rastreabilidade mínima completa.
-- NOT VALID preserva registros históricos importados que ainda precisam ser saneados,
-- mas a restrição é aplicada a novos inserts e updates.
alter table public.operation_items
  drop constraint if exists operation_items_traceability_required_check;

alter table public.operation_items
  add constraint operation_items_traceability_required_check
  check (
    nullif(trim(ticket_number), '') is not null
    and nullif(trim(rt_number), '') is not null
    and nullif(trim(lot), '') is not null
    and nullif(trim(rig), '') is not null
  ) not valid;
