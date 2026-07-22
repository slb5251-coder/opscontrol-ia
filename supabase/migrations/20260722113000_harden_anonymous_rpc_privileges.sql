begin;

-- PostgreSQL concede EXECUTE a PUBLIC por padrão. Em um schema exposto pelo
-- Supabase isso transforma funções SECURITY DEFINER em endpoints anônimos.
revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon;

-- Usuários autenticados mantêm os endpoints operacionais existentes. As
-- próprias funções continuam aplicando as validações de perfil e auth.uid().
grant execute on all functions in schema public to authenticated;
grant execute on all functions in schema public to service_role;

-- Funções de trigger nunca devem ser chamadas diretamente pela Data API.
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.write_audit_log() from anon, authenticated;

-- Exceção mínima necessária para login por nome de usuário. A função retorna
-- apenas o e-mail de um perfil ativo e o cliente sempre responde de forma
-- genérica para evitar enumeração visível de contas.
grant execute on function public.resolve_login_email(text) to anon, authenticated;

-- Impede que novas funções voltem a ficar públicas por herança de privilégios.
alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon;
alter default privileges in schema public grant execute on functions to authenticated;
alter default privileges in schema public grant execute on functions to service_role;

commit;
