-- La cuenta institucional de gerencia puede mantener las materias vinculadas a profesores.
-- Se valida con los claims firmados de Supabase, sin consultar auth.users desde RLS.
drop policy if exists profesor_materia_gerencia_app_metadata on public.profesor_materia;
create policy profesor_materia_gerencia_app_metadata
  on public.profesor_materia
  for all
  to authenticated
  using (
    lower(coalesce(
      (select auth.jwt()) -> 'app_metadata' ->> 'rol',
      (select auth.jwt()) -> 'app_metadata' ->> 'role',
      ''
    )) in ('gerente', 'gerencia')
    or lower(coalesce((select auth.jwt()) ->> 'email', '')) = 'gerente@ateneo.com'
  )
  with check (
    lower(coalesce(
      (select auth.jwt()) -> 'app_metadata' ->> 'rol',
      (select auth.jwt()) -> 'app_metadata' ->> 'role',
      ''
    )) in ('gerente', 'gerencia')
    or lower(coalesce((select auth.jwt()) ->> 'email', '')) = 'gerente@ateneo.com'
  );

notify pgrst, 'reload schema';
