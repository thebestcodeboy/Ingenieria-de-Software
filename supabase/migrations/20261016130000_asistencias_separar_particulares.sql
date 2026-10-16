create or replace function public.listar_bitacora_asistencias()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(fila order by fecha, hora_inicio, alumno), '[]'::jsonb)
  from (
    select
      i.id as inscripcion_id,
      i.turno_id,
      i.alumno_id,
      i.estado as inscripcion_estado,
      concat_ws(' ', a.apellido, a.nombre) as alumno,
      t.fecha,
      t.hora_inicio,
      t.materia_id,
      coalesce(m.nombre, 'Sin materia') as materia,
      coalesce(ci.nombre, cp.nombre, m.nombre, 'Clase') as actividad,
      case
        when t.clase_particular_id is not null then 'particular'
        when t.curso_id is not null then 'ingreso'
        else 'materia'
      end as tipo_actividad,
      coalesce(t.cancelado, false) or coalesce(t.estado, '') = 'cancelado' as cancelada,
      public.puede_consultar_asistencia(i.id, true) as editable,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', v.id,
          'version', v.version,
          'estado', v.estado,
          'nota', v.nota,
          'observacion', v.observacion,
          'motivo', v.motivo,
          'autor_id', v.autor_id,
          'cargado_en', v.cargado_en
        ) order by v.version desc)
        from public.asistencia_versiones v
        where v.inscripcion_id = i.id
      ), '[]'::jsonb) as versiones
    from public.inscripciones i
    join public.turnos_clase t on t.id = i.turno_id
    join public.alumnos a on a.id = i.alumno_id
    left join public.materias m on m.id = t.materia_id
    left join public.cursos_ingreso ci on ci.id = t.curso_id
    left join public.clases_particulares cp on cp.id = t.clase_particular_id
    where public.puede_consultar_asistencia(i.id)
      and (
        i.estado = 'confirmado'
        or exists (
          select 1 from public.asistencia_versiones v
          where v.inscripcion_id = i.id
        )
      )
  ) fila;
$$;

revoke all on function public.listar_bitacora_asistencias() from public;
grant execute on function public.listar_bitacora_asistencias() to authenticated;

create or replace function public.listar_clases_sin_alumnos_asistencia()
returns table (
  turno_id uuid,
  fecha date,
  hora_inicio time,
  materia text,
  actividad text,
  aula text,
  tipo_actividad text
)
language plpgsql
stable
security definer
set search_path = ''
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
    t.id,
    t.fecha,
    t.hora_inicio,
    coalesce(m.nombre, cp.nombre, ci.nombre, 'Sin materia')::text,
    coalesce(cp.nombre, ci.nombre, m.nombre, 'Clase')::text,
    t.aula_numero::text,
    case
      when t.clase_particular_id is not null then 'particular'
      when t.curso_id is not null then 'ingreso'
      else 'materia'
    end::text
  from public.turnos_clase t
  left join public.materias m on m.id = t.materia_id
  left join public.cursos_ingreso ci on ci.id = t.curso_id
  left join public.clases_particulares cp on cp.id = t.clase_particular_id
  where t.profesor_id = v_profesor_id
    and t.fecha >= (timezone('America/Argentina/Buenos_Aires', now()))::date
    and not coalesce(t.cancelado, false)
    and coalesce(t.estado, '') <> 'cancelado'
    and not exists (
      select 1
        from public.inscripciones i
       where i.turno_id = t.id
         and i.estado = 'confirmado'
    )
  order by t.fecha, t.hora_inicio;
end;
$$;

revoke all on function public.listar_clases_sin_alumnos_asistencia() from public, anon;
grant execute on function public.listar_clases_sin_alumnos_asistencia() to authenticated;

notify pgrst, 'reload schema';
