-- Permite al portal del alumno consultar los docentes de un curso sin abrir
-- acceso directo a la tabla protegida profesor_curso.

create or replace function public.listar_docentes_curso_alumno(p_curso_id uuid)
returns table (
  id uuid,
  nombre text,
  apellido text
)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_email text;
  v_username text;
  v_rol text;
begin
  if (select auth.uid()) is null then
    raise exception using
      errcode = '42501',
      message = 'SESION_REQUERIDA';
  end if;

  v_email := lower(coalesce((select auth.jwt()) ->> 'email', ''));
  v_username := split_part(v_email, '@', 1);
  v_rol := lower(coalesce(
    (select auth.jwt()) -> 'user_metadata' ->> 'rol',
    (select auth.jwt()) -> 'user_metadata' ->> 'role',
    ''
  ));

  if v_rol not in ('alumno', 'estudiante') then
    raise exception using
      errcode = '42501',
      message = 'ROL_ALUMNO_REQUERIDO';
  end if;

  if not exists (
    select 1
      from public.alumnos a
     where coalesce(a.activo, true) = true
       and coalesce(a.acceso_portal, false) = true
       and (
         lower(coalesce(a.email, '')) = v_email
         or lower(coalesce(a.username_institucional, '')) = v_username
       )
  ) then
    raise exception using
      errcode = '42501',
      message = 'ALUMNO_NO_VINCULADO';
  end if;

  return query
  select distinct
    p.id,
    p.nombre::text,
    p.apellido::text
  from public.profesor_curso pc
  join public.profesores p on p.id = pc.profesor_id
  where pc.curso_id = p_curso_id
    and coalesce(p.activo, true) = true
  order by p.apellido::text, p.nombre::text;
end;
$$;

revoke all on function public.listar_docentes_curso_alumno(uuid) from public;
grant execute on function public.listar_docentes_curso_alumno(uuid) to authenticated;

comment on function public.listar_docentes_curso_alumno(uuid) is
  'Lista datos publicos minimos de docentes activos de un curso para el alumno autenticado.';
