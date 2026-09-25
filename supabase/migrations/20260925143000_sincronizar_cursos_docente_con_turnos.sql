-- Unifica los cursos y el calendario del profesor.
-- Un curso se considera asignado cuando Mesa de Entrada creó al menos un
-- turno de ese curso con el profesor autenticado.

create or replace function public.listar_cursos_portal_profesor()
returns table (
  curso_id uuid,
  nombre text,
  descripcion text,
  materias text[],
  anotado boolean,
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
    raise exception using
      errcode = '42501',
      message = 'PROFESOR_NO_VINCULADO';
  end if;

  return query
  select
    c.id,
    c.nombre::text,
    c.descripcion::text,
    coalesce(
      array_agg(distinct m.nombre::text order by m.nombre::text)
        filter (where m.id is not null),
      array[]::text[]
    ) as materias,
    true as anotado,
    count(distinct i.alumno_id) as cantidad_alumnos
  from public.cursos_ingreso c
  join public.turnos_clase t
    on t.curso_id = c.id
   and t.profesor_id = v_profesor_id
  left join public.curso_ingreso_materias cim on cim.curso_id = c.id
  left join public.materias m on m.id = cim.materia_id
  left join public.inscripciones i on i.turno_id = t.id
  group by c.id, c.nombre, c.descripcion
  order by c.nombre;
end;
$$;

revoke all on function public.listar_cursos_portal_profesor() from public;
grant execute on function public.listar_cursos_portal_profesor() to authenticated;

-- La asignación es responsabilidad de Mesa de Entrada mediante turnos_clase.
revoke execute on function public.anotarme_curso_profesor(uuid) from anon;
revoke execute on function public.anotarme_curso_profesor(uuid) from authenticated;

comment on function public.listar_cursos_portal_profesor() is
  'Lista cursos con turnos asignados por Mesa de Entrada al profesor autenticado.';
