-- Calendario personal del profesor autenticado.

create or replace function public.listar_calendario_profesor(p_desde date, p_hasta date)
returns table (
  turno_id uuid,
  fecha date,
  hora_inicio time,
  hora_fin time,
  materia_nombre text,
  actividad_nombre text,
  aula_numero text,
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
  if p_desde is null or p_hasta is null or p_hasta < p_desde then
    raise exception using errcode = '22023', message = 'RANGO_FECHAS_INVALIDO';
  end if;

  select p.id into v_profesor_id
    from public.profesores p
   where p.auth_user_id = (select auth.uid())
     and coalesce(p.acceso_portal, false) = true;

  if v_profesor_id is null then
    raise exception using errcode = '42501', message = 'PROFESOR_NO_VINCULADO';
  end if;

  return query
  select
    t.id,
    t.fecha,
    t.hora_inicio,
    t.hora_fin,
    coalesce(m.nombre::text, 'Sin materia'),
    coalesce(ci.nombre::text, cp.nombre::text, m.nombre::text, 'Clase'),
    t.aula_numero::text,
    count(distinct i.alumno_id)
  from public.turnos_clase t
  left join public.materias m on m.id = t.materia_id
  left join public.cursos_ingreso ci on ci.id = t.curso_id
  left join public.clases_particulares cp on cp.id = t.clase_particular_id
  left join public.inscripciones i on i.turno_id = t.id
  where t.profesor_id = v_profesor_id
    and t.fecha between p_desde and p_hasta
  group by t.id, t.fecha, t.hora_inicio, t.hora_fin, m.nombre, ci.nombre, cp.nombre, t.aula_numero
  order by t.fecha, t.hora_inicio;
end;
$$;

revoke all on function public.listar_calendario_profesor(date, date) from public;
grant execute on function public.listar_calendario_profesor(date, date) to authenticated;

comment on function public.listar_calendario_profesor(date, date) is
  'Lista los turnos del profesor autenticado dentro del período solicitado.';
