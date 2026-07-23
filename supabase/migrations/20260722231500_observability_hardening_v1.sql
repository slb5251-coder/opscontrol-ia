create index if not exists idx_system_errors_resolved_by
  on public.system_errors(resolved_by)
  where resolved_by is not null;

alter function public.resolve_system_error_v1(bigint,text) security invoker;

revoke all on function public.resolve_system_error_v1(bigint,text) from public,anon;
grant execute on function public.resolve_system_error_v1(bigint,text) to authenticated;
