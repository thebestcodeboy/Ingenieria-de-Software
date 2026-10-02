-- Corrige la dependencia ausente de inscribir_alumno_curso.
-- Conserva validación de operador, bloqueos, cupos y ausencia de duplicados.
begin;

create or replace function public.inscribir_alumno_curso_administrativo(
  p_curso_id uuid,
  p_profesor_id uuid,
  p_alumno_id uuid
)
returns table (
  inscripcion_id uuid,
  turno_id uuid,
  fecha date,
  estado text
)
language plpgsql
security definer
set search_path = ''
set timezone = 'America/Argentina/Buenos_Aires'
as $$
declare
  v_turno record;
  v_inscripcion_id uuid;
  v_estado text;
  v_confirmados bigint;
  v_cantidad integer := 0;
begin
  perform public.validar_operador_inscripciones();
  perform 1 from public.alumnos a where a.id = p_alumno_id and a.activo = true for share;
  if not found then raise exception 'Seleccioná un alumno activo.'; end if;
  perform 1 from public.cursos_ingreso c where c.id = p_curso_id and c.activo = true
    and c.fecha_inicio is not null and c.fecha_fin >= current_date for share;
  if not found then raise exception 'Seleccioná un curso activo con período configurado y vigente.'; end if;
  perform 1 from public.profesores p where p.id = p_profesor_id and p.activo = true for share;
  if not found then raise exception 'Seleccioná un docente activo.'; end if;
  for v_turno in
    select t.id, t.fecha, t.cupo_maximo
      from public.turnos_clase t
     where t.curso_id = p_curso_id
       and t.profesor_id = p_profesor_id
       and not coalesce(t.cancelado, false)
       and coalesce(t.estado, 'activo') <> 'cancelado'
       and (t.fecha + t.hora_inicio) > localtimestamp
     order by t.fecha, t.hora_inicio, t.id
     for update
  loop
    v_cantidad := v_cantidad + 1;
    if v_turno.cupo_maximo is null or v_turno.cupo_maximo <= 0 then
      raise exception using errcode = 'P0001', message = 'CUPO_NO_DEFINIDO';
    end if;

    select i.id, i.estado
      into v_inscripcion_id, v_estado
      from public.inscripciones i
     where i.turno_id = v_turno.id
       and i.alumno_id = p_alumno_id
       and i.estado <> 'cancelado'
     limit 1;

    if not found then
      select count(*) into v_confirmados
        from public.inscripciones i
       where i.turno_id = v_turno.id and i.estado = 'confirmado';

      v_estado := case when v_confirmados < v_turno.cupo_maximo then 'confirmado' else 'en_espera' end;
      insert into public.inscripciones (turno_id, alumno_id, estado)
      values (v_turno.id, p_alumno_id, v_estado)
      returning id into v_inscripcion_id;
    end if;

    return query select v_inscripcion_id, v_turno.id, v_turno.fecha, v_estado;
  end loop;

  if v_cantidad = 0 then
    raise exception using errcode = 'P0002', message = 'CURSO_SIN_TURNOS_FUTUROS';
  end if;
end;
$$;

revoke all on function public.inscribir_alumno_curso_administrativo(uuid, uuid, uuid) from public;
grant execute on function public.inscribir_alumno_curso_administrativo(uuid, uuid, uuid) to authenticated;


notify pgrst, 'reload schema';
commit;
