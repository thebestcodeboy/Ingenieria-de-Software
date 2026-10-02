-- Permisos administrativos basados exclusivamente en roles confiables.
create or replace function public.validar_operador_inscripciones()
returns void language plpgsql security definer set search_path = '' as $$
declare v_rol text;
begin
  select lower(coalesce(u.raw_app_meta_data->>'rol', u.raw_app_meta_data->>'role', ''))
    into v_rol from auth.users u where u.id = (select auth.uid());
  if v_rol is null or v_rol not in ('mesa_entrada', 'gerente', 'gerencia', 'admin', 'administrador') then
    raise exception using errcode = '42501', message = 'No tenés permiso para gestionar inscripciones.';
  end if;
end;
$$;
revoke all on function public.validar_operador_inscripciones() from public;
grant execute on function public.validar_operador_inscripciones() to authenticated;

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
      where c.activo = true and p.activo = true
        and t.fecha between c.fecha_inicio and c.fecha_fin
        and not coalesce(t.cancelado, false) and coalesce(t.estado, 'activo') <> 'cancelado'
        and (t.fecha + t.hora_inicio) > localtimestamp), '[]'::jsonb)
  ) into v_resultado;
  return v_resultado;
end;
$$;
revoke all on function public.opciones_inscripciones_administrativas() from public;
grant execute on function public.opciones_inscripciones_administrativas() to authenticated;

create or replace function public.inscribir_alumno_curso_administrativo(
  p_curso_id uuid, p_profesor_id uuid, p_alumno_id uuid
)
returns table(inscripcion_id uuid, turno_id uuid, fecha date, estado text)
language plpgsql security definer set search_path = ''
set timezone = 'America/Argentina/Buenos_Aires' as $$
begin
  perform public.validar_operador_inscripciones();
  perform 1 from public.alumnos a where a.id = p_alumno_id and a.activo = true for share;
  if not found then raise exception 'Seleccioná un alumno activo.'; end if;
  perform 1 from public.cursos_ingreso c where c.id = p_curso_id and c.activo = true
    and c.fecha_inicio is not null and c.fecha_fin >= current_date for share;
  if not found then raise exception 'Seleccioná un curso activo con período configurado y vigente.'; end if;
  perform 1 from public.profesores p where p.id = p_profesor_id and p.activo = true for share;
  if not found then raise exception 'Seleccioná un docente activo.'; end if;
  return query select * from public.inscribir_alumno_curso(p_curso_id, p_profesor_id, p_alumno_id);
end;
$$;
revoke all on function public.inscribir_alumno_curso_administrativo(uuid, uuid, uuid) from public;
grant execute on function public.inscribir_alumno_curso_administrativo(uuid, uuid, uuid) to authenticated;
notify pgrst, 'reload schema';
