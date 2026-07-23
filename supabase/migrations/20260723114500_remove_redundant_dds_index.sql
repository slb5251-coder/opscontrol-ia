-- O índice legado dds_attendance_user_id_idx já cobre a chave estrangeira user_id.
drop index if exists public.idx_dds_attendance_user_id;
