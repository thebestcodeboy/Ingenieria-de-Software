-- Autoriza a gerencia a mantener las materias vinculadas a cada profesor.
-- El rol administrativo confiable se toma de app_metadata.
drop policy if exists profesor_materia_gerencia_app_metadata on public.profesor_materia;
create policy profesor_materia_gerencia_app_metadata
  on public.profesor_materia
  for all
  to authenticated
  using (
    exists (
      select 1
        from auth.users u
       where u.id = (select auth.uid())
         and lower(coalesce(u.raw_app_meta_data ->> 'rol', u.raw_app_meta_data ->> 'role', ''))
             in ('gerente', 'gerencia')
    )
  )
  with check (
    exists (
      select 1
        from auth.users u
       where u.id = (select auth.uid())
         and lower(coalesce(u.raw_app_meta_data ->> 'rol', u.raw_app_meta_data ->> 'role', ''))
             in ('gerente', 'gerencia')
    )
  );

notify pgrst, 'reload schema';
