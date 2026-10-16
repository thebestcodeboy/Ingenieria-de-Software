-- Portal docente: separar las clases particulares de los cursos de ingreso.

create or replace function public.listar_clases_particulares_profesor()
returns table (
  clase_id uuid,
  nombre text,
  materia text,
  nivel text,
  cantidad_alumnos bigint
)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_profesor_id uuid;
begin
  select p.id
    into v_profesor_id
    from public.profesores p
   where p.auth_user_id = (select auth.uid())
     and coalesce(p.acceso_portal, false) = true;

  if v_profesor_id is null then
    raise exception using errcode = '42501', message = 'PROFESOR_NO_VINCULADO';
  end if;

  return query
  select
    cp.id,
    cp.nombre::text,
    m.nombre::text,
    cp.nivel::text,
    count(distinct i.alumno_id)::bigint
  from public.turnos_clase t
  join public.clases_particulares cp on cp.id = t.clase_particular_id
  left join public.materias m on m.id = cp.materia_id
  left join public.inscripciones i on i.turno_id = t.id and i.estado = 'confirmado'
  where t.profesor_id = v_profesor_id
    and t.clase_particular_id is not null
  group by cp.id, cp.nombre, cp.nivel, m.nombre
  order by cp.nombre;
end;
$$;

create or replace function public.listar_alumnos_clase_particular_profesor(p_clase_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_profesor_id uuid;
begin
  select p.id
    into v_profesor_id
    from public.profesores p
   where p.auth_user_id = (select auth.uid())
     and coalesce(p.acceso_portal, false) = true;

  if v_profesor_id is null then
    raise exception using errcode = '42501', message = 'PROFESOR_NO_VINCULADO';
  end if;

  if not exists (
    select 1
      from public.turnos_clase t
     where t.clase_particular_id = p_clase_id
       and t.profesor_id = v_profesor_id
  ) then
    raise exception using errcode = '42501', message = 'CLASE_PARTICULAR_NO_ASIGNADA';
  end if;

  return coalesce((
    select jsonb_agg(x order by x->>'apellido', x->>'nombre')
      from (
        select jsonb_build_object(
          'id', a.id,
          'nombre', a.nombre,
          'apellido', a.apellido,
          'dni', a.dni,
          'legajo', a.legajo,
          'email', a.email,
          'telefono', a.telefono,
          'direccion', a.direccion,
          'clases', count(distinct t.id),
          'primera_clase', min(t.fecha)
        ) as x
          from public.inscripciones i
          join public.turnos_clase t
            on t.id = i.turno_id
           and t.clase_particular_id = p_clase_id
           and t.profesor_id = v_profesor_id
          join public.alumnos a on a.id = i.alumno_id
         where i.estado <> 'cancelado'
         group by a.id
      ) s
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.listar_clases_particulares_profesor() from public, anon;
revoke all on function public.listar_alumnos_clase_particular_profesor(uuid) from public, anon;
grant execute on function public.listar_clases_particulares_profesor() to authenticated;
grant execute on function public.listar_alumnos_clase_particular_profesor(uuid) to authenticated;

comment on function public.listar_clases_particulares_profesor() is
  'Lista las clases particulares con turnos asignados al profesor autenticado y su cantidad de alumnos.';
comment on function public.listar_alumnos_clase_particular_profesor(uuid) is
  'Lista los alumnos de una clase particular asignada al profesor autenticado.';

notify pgrst, 'reload schema';
