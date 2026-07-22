-- OpsControl IA — exclusão segura de lançamentos incorretos de carretas.
create or replace function public.delete_truck_movement_v1(p_truck_id uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_truck public.trucks;
  v_files jsonb := '[]'::jsonb;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if not private.has_role(array['admin','supervisor','lider','logistica']) then
    raise exception 'Seu perfil não pode excluir movimentações de carretas.';
  end if;

  select * into v_truck
  from public.trucks
  where id = p_truck_id
  for update;

  if not found then
    raise exception 'Movimentação de carreta não localizada.';
  end if;

  if coalesce(v_truck.stock_applied, false)
     or exists(select 1 from public.tank_movements tm where tm.truck_id = p_truck_id)
     or exists(select 1 from public.chemical_movements cm where cm.truck_id = p_truck_id) then
    raise exception 'Esta carreta já movimentou estoque e não pode ser excluída. Faça um ajuste de estoque para corrigir o lançamento.';
  end if;

  select coalesce(jsonb_agg(a.file_path) filter (where a.file_path is not null), '[]'::jsonb)
  into v_files
  from public.attachments a
  where a.module = 'truck' and a.record_id = p_truck_id;

  if v_reason is not null then
    update public.trucks
    set notes = concat_ws(E'\n', nullif(notes, ''), 'Motivo da exclusão: ' || v_reason),
        updated_at = now()
    where id = p_truck_id;
  end if;

  delete from public.attachments
  where module = 'truck' and record_id = p_truck_id;

  delete from public.trucks where id = p_truck_id;

  return jsonb_build_object(
    'deleted', true,
    'truck_id', p_truck_id,
    'plate', v_truck.plate,
    'invoice_number', v_truck.invoice_number,
    'file_paths', v_files
  );
end;
$$;

revoke all on function public.delete_truck_movement_v1(uuid,text) from public, anon;
grant execute on function public.delete_truck_movement_v1(uuid,text) to authenticated, service_role;