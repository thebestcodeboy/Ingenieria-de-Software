create or replace function public.baja_inscripcion_alumno(
  p_inscripcion_id uuid,
  p_turno_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text := lower(coalesce((select auth.jwt()) ->> 'email', ''));
  v_username text := split_part(v_email, '@', 1);
  v_rol text := lower(coalesce(
    (select auth.jwt()) -> 'user_metadata' ->> 'rol',
    (select auth.jwt()) -> 'user_metadata' ->> 'role',
    ''
  ));
  v_alumno_id uuid;
begin
  if v_uid is null or v_rol not in ('alumno', 'estudiante') then
    raise exception using errcode = '42501', message = 'ROL_ALUMNO_REQUERIDO';
  end if;

  select a.id into v_alumno_id
    from public.alumnos a
   where coalesce(a.activo, true) = true
     and coalesce(a.acceso_portal, false) = true
     and (
       lower(coalesce(a.email, '')) = v_email
       or lower(coalesce(a.username_institucional, '')) = v_username
     )
   limit 1;

  if v_alumno_id is null then
    raise exception using errcode = '42501', message = 'ALUMNO_NO_VINCULADO';
  end if;

  perform 1
    from public.inscripciones i
    join public.turnos_clase t on t.id = i.turno_id
   where i.id = p_inscripcion_id
     and i.turno_id = p_turno_id
     and i.alumno_id = v_alumno_id
     and i.estado <> 'cancelado'
     and (t.fecha + t.hora_inicio) > localtimestamp
   for update of i, t;

  if not found then
    raise exception using errcode = 'P0002', message = 'INSCRIPCION_ACTIVA_NO_ENCONTRADA';
  end if;

  update public.inscripciones
     set estado = 'cancelado'
   where id = p_inscripcion_id
     and turno_id = p_turno_id;
end;
$$;

create or replace function public.cancelar_turno_profesor(p_turno_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_rol text := lower(coalesce(
    (select auth.jwt()) -> 'user_metadata' ->> 'rol',
    (select auth.jwt()) -> 'user_metadata' ->> 'role',
    ''
  ));
  v_profesor_id uuid;
  v_profesor_turno_id uuid;
  v_fecha date;
  v_hora_inicio time;
  v_estado text;
begin
  if v_uid is null or v_rol <> 'profesor' then
    raise exception using errcode = '42501', message = 'ROL_PROFESOR_REQUERIDO';
  end if;

  select p.id into v_profesor_id
    from public.profesores p
   where p.auth_user_id = v_uid
     and coalesce(p.acceso_portal, false) = true;

  if v_profesor_id is null then
    raise exception using errcode = '42501', message = 'PROFESOR_NO_VINCULADO';
  end if;

  select t.profesor_id, t.fecha, t.hora_inicio, t.estado
    into v_profesor_turno_id, v_fecha, v_hora_inicio, v_estado
    from public.turnos_clase t
   where t.id = p_turno_id
   for update;

  if not found or v_profesor_turno_id <> v_profesor_id then
    raise exception using errcode = '42501', message = 'TURNO_NO_ASIGNADO';
  end if;
  if coalesce(v_estado, 'activo') = 'cancelado' then
    raise exception using errcode = 'P0001', message = 'TURNO_YA_CANCELADO';
  end if;
  if (v_fecha + v_hora_inicio) <= localtimestamp then
    raise exception using errcode = 'P0001', message = 'TURNO_PASADO';
  end if;

  update public.turnos_clase
     set estado = 'cancelado', cancelado = true
   where id = p_turno_id;
end;
$$;

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
  left join public.inscripciones i on i.turno_id = t.id and i.estado <> 'cancelado'
  where t.profesor_id = v_profesor_id
    and t.fecha between p_desde and p_hasta
    and not coalesce(t.cancelado, false)
    and coalesce(t.estado, 'activo') <> 'cancelado'
  group by t.id, t.fecha, t.hora_inicio, t.hora_fin, m.nombre, ci.nombre, cp.nombre, t.aula_numero
  order by t.fecha, t.hora_inicio;
end;
$$;

revoke all on function public.baja_inscripcion_alumno(uuid, uuid) from public;
grant execute on function public.baja_inscripcion_alumno(uuid, uuid) to authenticated;
revoke all on function public.cancelar_turno_profesor(uuid) from public;
grant execute on function public.cancelar_turno_profesor(uuid) to authenticated;
revoke all on function public.listar_calendario_profesor(date, date) from public;
grant execute on function public.listar_calendario_profesor(date, date) to authenticated;

comment on function public.baja_inscripcion_alumno(uuid, uuid) is
  'Da de baja al alumno autenticado de una única ocurrencia y promueve la lista de espera si corresponde.';
comment on function public.cancelar_turno_profesor(uuid) is
  'Cancela una ocurrencia futura asignada al profesor autenticado, manteniendo su historial.';