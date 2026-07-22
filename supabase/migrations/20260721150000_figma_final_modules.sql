-- OPSControl IA: módulos complementares aprovados no Figma.
-- Migration estritamente aditiva: preserva tabelas, usuários e registros existentes.

alter table public.profiles
  add column if not exists username text;

with ranked as (
  select
    id,
    lower(regexp_replace(split_part(coalesce(email, id::text), '@', 1), '[^a-zA-Z0-9._-]+', '', 'g')) as base_username,
    row_number() over (
      partition by lower(regexp_replace(split_part(coalesce(email, id::text), '@', 1), '[^a-zA-Z0-9._-]+', '', 'g'))
      order by created_at nulls last, id
    ) as username_order
  from public.profiles
  where username is null
)
update public.profiles as profile
set username = case
  when ranked.base_username = '' then 'user-' || left(profile.id::text, 8)
  when ranked.username_order = 1 then ranked.base_username
  else ranked.base_username || '-' || left(profile.id::text, 6)
end
from ranked
where ranked.id = profile.id
  and profile.username is null;

create unique index if not exists profiles_username_lower_uidx
  on public.profiles (lower(username))
  where username is not null;

create or replace function public.resolve_login_email(p_identifier text)
returns text
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select profile.email
  from public.profiles as profile
  where lower(profile.username) = lower(btrim(p_identifier))
    and profile.active is true
  limit 1
$$;

revoke all on function public.resolve_login_email(text) from public;
grant execute on function public.resolve_login_email(text) to anon, authenticated;

create table if not exists public.dds_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 3 and 180),
  topic text,
  scheduled_at timestamptz not null,
  duration_minutes integer not null default 15 check (duration_minutes between 5 and 480),
  instructor text,
  location text,
  status text not null default 'Planejado' check (status in ('Planejado', 'Realizado', 'Cancelado')),
  notes text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dds_attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.dds_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'Convocado' check (status in ('Não convocado', 'Convocado', 'Presente', 'Ausente', 'Justificado')),
  signed_at timestamptz,
  notes text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, user_id)
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 3 and 180),
  description text,
  provider text,
  workload_hours numeric(7,2) not null default 0 check (workload_hours >= 0),
  validity_months integer not null default 0 check (validity_months between 0 and 600),
  status text not null default 'Ativo' check (status in ('Ativo', 'Inativo')),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'Inscrito' check (status in ('Inscrito', 'Em andamento', 'Concluído', 'Vencido', 'Cancelado')),
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  expires_at date,
  certificate_id uuid references public.certificates(id) on delete set null,
  score numeric(5,2) check (score is null or score between 0 and 100),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, user_id)
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 3 and 220),
  category text not null check (category in ('Procedimento', 'Licença', 'Certificado', 'Ficha técnica', 'Contrato', 'QHSE', 'Operacional', 'Outro')),
  document_number text,
  revision text,
  issuer text,
  issue_date date,
  expires_at date,
  status text not null default 'Válido' check (status in ('Válido', 'Em revisão', 'A vencer', 'Vencido', 'Arquivado')),
  visibility_role text not null default 'all' check (visibility_role in ('all', 'admin', 'supervisor', 'lider', 'operador', 'logistica', 'mecanico', 'qhse', 'tv', 'user')),
  notes text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dds_sessions_scheduled_at_idx on public.dds_sessions (scheduled_at desc);
create index if not exists dds_attendance_user_id_idx on public.dds_attendance (user_id);
create index if not exists course_enrollments_user_id_idx on public.course_enrollments (user_id);
create index if not exists course_enrollments_expires_at_idx on public.course_enrollments (expires_at) where expires_at is not null;
create index if not exists documents_category_status_idx on public.documents (category, status);
create index if not exists documents_expires_at_idx on public.documents (expires_at) where expires_at is not null;

create trigger set_dds_sessions_updated_at before update on public.dds_sessions
  for each row execute function public.set_updated_at();
create trigger set_dds_attendance_updated_at before update on public.dds_attendance
  for each row execute function public.set_updated_at();
create trigger set_courses_updated_at before update on public.courses
  for each row execute function public.set_updated_at();
create trigger set_course_enrollments_updated_at before update on public.course_enrollments
  for each row execute function public.set_updated_at();
create trigger set_documents_updated_at before update on public.documents
  for each row execute function public.set_updated_at();

create trigger audit_dds_sessions after insert or update or delete on public.dds_sessions
  for each row execute function public.write_audit_log();
create trigger audit_dds_attendance after insert or update or delete on public.dds_attendance
  for each row execute function public.write_audit_log();
create trigger audit_courses after insert or update or delete on public.courses
  for each row execute function public.write_audit_log();
create trigger audit_course_enrollments after insert or update or delete on public.course_enrollments
  for each row execute function public.write_audit_log();
create trigger audit_documents after insert or update or delete on public.documents
  for each row execute function public.write_audit_log();

alter table public.dds_sessions enable row level security;
alter table public.dds_attendance enable row level security;
alter table public.courses enable row level security;
alter table public.course_enrollments enable row level security;
alter table public.documents enable row level security;

create policy dds_sessions_select_staff on public.dds_sessions for select to authenticated
  using (private.has_role(array['admin','supervisor','lider','operador','logistica','mecanico','qhse','user']));
create policy dds_sessions_insert_management on public.dds_sessions for insert to authenticated
  with check (private.has_role(array['admin','supervisor','lider','qhse']) and created_by = (select auth.uid()));
create policy dds_sessions_update_management on public.dds_sessions for update to authenticated
  using (private.has_role(array['admin','supervisor','lider','qhse']))
  with check (private.has_role(array['admin','supervisor','lider','qhse']));

create policy dds_attendance_select_staff on public.dds_attendance for select to authenticated
  using (private.has_role(array['admin','supervisor','lider','operador','logistica','mecanico','qhse','user']));
create policy dds_attendance_insert_self_or_management on public.dds_attendance for insert to authenticated
  with check (user_id = (select auth.uid()) or private.has_role(array['admin','supervisor','lider','qhse']));
create policy dds_attendance_update_self_or_management on public.dds_attendance for update to authenticated
  using (user_id = (select auth.uid()) or private.has_role(array['admin','supervisor','lider','qhse']))
  with check (user_id = (select auth.uid()) or private.has_role(array['admin','supervisor','lider','qhse']));

create policy courses_select_staff on public.courses for select to authenticated
  using (private.has_role(array['admin','supervisor','lider','operador','logistica','mecanico','qhse','user']));
create policy courses_insert_management on public.courses for insert to authenticated
  with check (private.has_role(array['admin','supervisor','lider','qhse']) and created_by = (select auth.uid()));
create policy courses_update_management on public.courses for update to authenticated
  using (private.has_role(array['admin','supervisor','lider','qhse']))
  with check (private.has_role(array['admin','supervisor','lider','qhse']));

create policy course_enrollments_select_self_or_management on public.course_enrollments for select to authenticated
  using (user_id = (select auth.uid()) or private.has_role(array['admin','supervisor','lider','qhse']));
create policy course_enrollments_insert_management on public.course_enrollments for insert to authenticated
  with check (private.has_role(array['admin','supervisor','lider','qhse']));
create policy course_enrollments_update_management on public.course_enrollments for update to authenticated
  using (private.has_role(array['admin','supervisor','lider','qhse']))
  with check (private.has_role(array['admin','supervisor','lider','qhse']));

create policy documents_select_by_visibility on public.documents for select to authenticated
  using (visibility_role = 'all' or visibility_role = private.current_role() or private.has_role(array['admin']));
create policy documents_insert_management on public.documents for insert to authenticated
  with check (private.has_role(array['admin','supervisor','lider','logistica','qhse']) and created_by = (select auth.uid()));
create policy documents_update_management on public.documents for update to authenticated
  using (private.has_role(array['admin','supervisor','lider','logistica','qhse']))
  with check (private.has_role(array['admin','supervisor','lider','logistica','qhse']));

revoke all on public.dds_sessions, public.dds_attendance, public.courses, public.course_enrollments, public.documents from anon;
grant select, insert, update on public.dds_sessions, public.dds_attendance, public.courses, public.course_enrollments, public.documents to authenticated;

insert into public.role_permissions (role, permissions, description)
values ('tv', '{"tv": true}'::jsonb, 'Visualização exclusiva do painel operacional de TV')
on conflict (role) do nothing;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['dds_sessions','dds_attendance','course_enrollments','documents']
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end
$$;
