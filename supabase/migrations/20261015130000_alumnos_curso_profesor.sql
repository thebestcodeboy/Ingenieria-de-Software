-- Mis cursos (profesor): nómina de alumnos con sus datos completos, solo de cursos donde el profesor tiene turnos.
create or replace function public.listar_alumnos_curso_profesor(p_curso_id uuid)
returns jsonb language plpgsql security definer set search_path = '' stable as $$
declare v_profesor_id uuid;
begin
  select p.id into v_profesor_id from public.profesores p
    where p.auth_user_id = (select auth.uid()) and coalesce(p.acceso_portal, false) = true;
  if v_profesor_id is null then
    raise exception using errcode='42501', message='PROFESOR_NO_VINCULADO';
  end if;
  if not exists (select 1 from public.turnos_clase t where t.curso_id = p_curso_id and t.profesor_id = v_profesor_id) then
    raise exception using errcode='42501', message='CURSO_NO_ASIGNADO';
  end if;
  return coalesce((select jsonb_agg(x order by x->>'apellido', x->>'nombre') from (
    select jsonb_build_object(
      'id', a.id, 'nombre', a.nombre, 'apellido', a.apellido, 'dni', a.dni, 'legajo', a.legajo,
      'email', a.email, 'telefono', a.telefono, 'direccion', a.direccion,
      'clases', count(distinct t.id),
      'primera_clase', min(t.fecha)
    ) as x
    from public.inscripciones i
    join public.turnos_clase t on t.id = i.turno_id and t.curso_id = p_curso_id and t.profesor_id = v_profesor_id
    join public.alumnos a on a.id = i.alumno_id
    where i.estado <> 'cancelado'
    group by a.id
  ) s), '[]'::jsonb);
end;
$$;
revoke all on function public.listar_alumnos_curso_profesor(uuid) from public, anon;
grant execute on function public.listar_alumnos_curso_profesor(uuid) to authenticated;
notify pgrst, 'reload schema';
