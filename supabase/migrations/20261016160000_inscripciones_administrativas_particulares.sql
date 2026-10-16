-- Habilita la inscripción administrativa de alumnos en clases particulares.
-- La inscripción confirmada dispara el mismo flujo de obligaciones de pago
-- que ya se utiliza para las inscripciones a cursos.
begin;

create or replace function public.opciones_inscripciones_administrativas()
returns jsonb language plpgsql security definer set search_path = ''
set timezone = 'America/Argentina/Buenos_Aires' as $$
declare v_resultado jsonb;
begin
  perform public.validar_operador_inscripciones();
  select jsonb_build_object(
    'alumnos', coalesce((select jsonb_agg(jsonb_build_object(
      'id', a.id, 'nombre', a.nombre, 'apellido', a.apellido,
      'dni', to_jsonb(a)->>'dni', 'legajo', to_jsonb(a)->>'legajo'
    ) order by a.apellido, a.nombre) from public.alumnos a where a.activo = true), '[]'::jsonb),
    'cursos', coalesce((select jsonb_agg(jsonb_build_object(
      'id', c.id, 'nombre', c.nombre, 'fecha_inicio', c.fecha_inicio, 'fecha_fin', c.fecha_fin
    ) order by c.nombre) from public.cursos_ingreso c
      where c.activo = true and c.fecha_inicio is not null and c.fecha_fin >= current_date), '[]'::jsonb),
    'sesiones', coalesce((select jsonb_agg(jsonb_build_object(
      'id', t.id, 'curso_id', t.curso_id, 'profesor_id', t.profesor_id,
      'docente', concat_ws(' ', p.apellido, p.nombre), 'materia', m.nombre,
      'fecha', t.fecha, 'hora_inicio', t.hora_inicio, 'hora_fin', t.hora_fin,
      'cupo_maximo', t.cupo_maximo,
      'confirmados', (select count(*) from public.inscripciones i where i.turno_id = t.id and i.estado = 'confirmado')
    ) order by t.fecha, t.hora_inicio)
      from public.turnos_clase t join public.cursos_ingreso c on c.id = t.curso_id
      join public.profesores p on p.id = t.profesor_id
      left join public.materias m on m.id = t.materia_id
      where c.activo = true and p.activo = true and t.fecha between c.fecha_inicio and c.fecha_fin
        and not coalesce(t.cancelado, false) and coalesce(t.estado, 'activo') <> 'cancelado'
        and (t.fecha + t.hora_inicio) > localtimestamp), '[]'::jsonb),
    'clases_particulares', coalesce((select jsonb_agg(jsonb_build_object(
      'id', cp.id, 'nombre', cp.nombre, 'nivel', cp.nivel
    ) order by cp.nombre) from public.clases_particulares cp
      where cp.activo = true and exists (
        select 1 from public.turnos_clase t join public.profesores p on p.id = t.profesor_id
         where t.clase_particular_id = cp.id and p.activo = true
           and not coalesce(t.cancelado, false) and coalesce(t.estado, 'activo') <> 'cancelado'
           and (t.fecha + t.hora_inicio) > localtimestamp
      )), '[]'::jsonb),
    'sesiones_particulares', coalesce((select jsonb_agg(jsonb_build_object(
      'id', t.id, 'curso_id', null, 'clase_particular_id', t.clase_particular_id,
      'profesor_id', t.profesor_id, 'docente', concat_ws(' ', p.apellido, p.nombre),
      'materia', m.nombre, 'fecha', t.fecha, 'hora_inicio', t.hora_inicio, 'hora_fin', t.hora_fin,
      'cupo_maximo', t.cupo_maximo,
      'confirmados', (select count(*) from public.inscripciones i where i.turno_id = t.id and i.estado = 'confirmado')
    ) order by t.fecha, t.hora_inicio)
      from public.turnos_clase t join public.clases_particulares cp on cp.id = t.clase_particular_id
      join public.profesores p on p.id = t.profesor_id left join public.materias m on m.id = t.materia_id
      where cp.activo = true and p.activo = true
        and not coalesce(t.cancelado, false) and coalesce(t.estado, 'activo') <> 'cancelado'
        and (t.fecha + t.hora_inicio) > localtimestamp), '[]'::jsonb)
  ) into v_resultado;
  return v_resultado;
end;
$$;

create or replace function public.inscribir_alumno_particular_administrativo(
  p_clase_particular_id uuid, p_profesor_id uuid, p_alumno_id uuid
)
returns table(inscripcion_id uuid, turno_id uuid, fecha date, estado text)
language plpgsql security definer set search_path = ''
set timezone = 'America/Argentina/Buenos_Aires' as $$
declare v_turno record; v_inscripcion_id uuid; v_estado text; v_confirmados bigint; v_cantidad integer := 0;
begin
  perform public.validar_operador_inscripciones();
  perform 1 from public.alumnos a where a.id = p_alumno_id and a.activo = true for share;
  if not found then raise exception using errcode = 'P0001', message = 'ALUMNO_INACTIVO'; end if;
  perform 1 from public.clases_particulares cp where cp.id = p_clase_particular_id and cp.activo = true for share;
  if not found then raise exception 'Seleccioná una clase particular activa.'; end if;
  perform 1 from public.profesores p where p.id = p_profesor_id and p.activo = true for share;
  if not found then raise exception 'Seleccioná un docente activo.'; end if;

  for v_turno in
    select t.id, t.fecha, t.cupo_maximo from public.turnos_clase t
     where t.clase_particular_id = p_clase_particular_id and t.profesor_id = p_profesor_id
       and not coalesce(t.cancelado, false) and coalesce(t.estado, 'activo') <> 'cancelado'
       and (t.fecha + t.hora_inicio) > localtimestamp
     order by t.fecha, t.hora_inicio, t.id for update
  loop
    v_cantidad := v_cantidad + 1;
    if v_turno.cupo_maximo is null or v_turno.cupo_maximo <= 0 then
      raise exception using errcode = 'P0001', message = 'CUPO_NO_DEFINIDO';
    end if;
    select i.id, i.estado into v_inscripcion_id, v_estado from public.inscripciones i
     where i.turno_id = v_turno.id and i.alumno_id = p_alumno_id and i.estado <> 'cancelado' limit 1;
    if not found then
      select count(*) into v_confirmados from public.inscripciones i
       where i.turno_id = v_turno.id and i.estado = 'confirmado';
      v_estado := case when v_confirmados < v_turno.cupo_maximo then 'confirmado' else 'en_espera' end;
      insert into public.inscripciones(turno_id, alumno_id, estado)
      values(v_turno.id, p_alumno_id, v_estado) returning id into v_inscripcion_id;
    end if;
    return query select v_inscripcion_id, v_turno.id, v_turno.fecha, v_estado;
  end loop;
  if v_cantidad = 0 then raise exception using errcode = 'P0002', message = 'CLASE_SIN_TURNOS_FUTUROS'; end if;
end;
$$;

revoke all on function public.inscribir_alumno_particular_administrativo(uuid, uuid, uuid) from public, anon;
grant execute on function public.inscribir_alumno_particular_administrativo(uuid, uuid, uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
