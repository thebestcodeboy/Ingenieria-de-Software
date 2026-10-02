alter table public.turnos_clase
  add column if not exists serie_id uuid;

create index if not exists turnos_clase_serie_fecha_idx
  on public.turnos_clase (serie_id, fecha)
  where serie_id is not null;

create or replace function public.inscribir_alumno_turno(p_turno_id uuid, p_alumno_id uuid)
returns table (
  inscripcion_id uuid,
  estado text,
  cupo_maximo integer,
  inscriptos_actuales bigint,
  lugares_disponibles bigint
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_turno record;
  v_sesion record;
  v_inscripcion_id uuid;
  v_estado text;
  v_cupo integer;
  v_confirmados bigint;
  v_resultado_id uuid;
  v_resultado_estado text;
  v_resultado_cupo integer;
  v_resultado_confirmados bigint;
  v_resultado_lugares bigint;
begin
  select t.id, t.serie_id, t.cupo_maximo, t.fecha, t.hora_inicio, t.cancelado, t.estado
    into v_turno
    from public.turnos_clase t
   where t.id = p_turno_id
   for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'TURNO_NO_EXISTE';
  end if;
  if coalesce(v_turno.cancelado, false) or v_turno.estado = 'cancelado' then
    raise exception using errcode = 'P0001', message = 'TURNO_CANCELADO';
  end if;
  if (v_turno.fecha + v_turno.hora_inicio) <= localtimestamp then
    raise exception using errcode = 'P0001', message = 'TURNO_PASADO';
  end if;

  for v_sesion in
    select t.id, t.cupo_maximo
      from public.turnos_clase t
     where (t.id = p_turno_id or (v_turno.serie_id is not null and t.serie_id = v_turno.serie_id))
       and not coalesce(t.cancelado, false)
       and coalesce(t.estado, 'activo') <> 'cancelado'
       and (t.fecha + t.hora_inicio) > localtimestamp
     order by t.fecha, t.hora_inicio, t.id
     for update
  loop
    v_cupo := v_sesion.cupo_maximo;
    if v_cupo is null or v_cupo <= 0 then
      raise exception using errcode = 'P0001', message = 'CUPO_NO_DEFINIDO';
    end if;

    v_inscripcion_id := null;
    select i.id, i.estado
      into v_inscripcion_id, v_estado
      from public.inscripciones i
     where i.turno_id = v_sesion.id
       and i.alumno_id = p_alumno_id
       and i.estado <> 'cancelado'
     limit 1;

    if not found then
      select count(*) into v_confirmados
        from public.inscripciones i
       where i.turno_id = v_sesion.id and i.estado = 'confirmado';

      v_estado := case when v_confirmados < v_cupo then 'confirmado' else 'en_espera' end;
      insert into public.inscripciones (turno_id, alumno_id, estado)
      values (v_sesion.id, p_alumno_id, v_estado)
      returning id into v_inscripcion_id;
    end if;

    if v_sesion.id = p_turno_id then
      select count(*) into v_confirmados
        from public.inscripciones i
       where i.turno_id = v_sesion.id and i.estado = 'confirmado';

      v_resultado_id := v_inscripcion_id;
      v_resultado_estado := v_estado;
      v_resultado_cupo := v_cupo;
      v_resultado_confirmados := v_confirmados;
      v_resultado_lugares := greatest(v_cupo - v_confirmados, 0);
    end if;
  end loop;

  return query
  select v_resultado_id, v_resultado_estado, v_resultado_cupo,
    v_resultado_confirmados, v_resultado_lugares;
end;
$$;

revoke all on function public.inscribir_alumno_turno(uuid, uuid) from public;
grant execute on function public.inscribir_alumno_turno(uuid, uuid) to authenticated;

comment on column public.turnos_clase.serie_id is
  'Identifica los turnos que pertenecen a una misma serie periódica.';

comment on function public.inscribir_alumno_turno(uuid, uuid) is
  'Inscribe al alumno en el turno elegido y en las ocurrencias futuras activas de su serie, respetando cupos y lista de espera por sesión.';