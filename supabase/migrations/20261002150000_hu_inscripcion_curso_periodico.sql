create or replace function public.inscribir_alumno_serie(p_serie_id uuid, p_alumno_id uuid)
returns table (
  inscripcion_id uuid,
  fecha date,
  estado text
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_sesion record;
  v_inscripcion_id uuid;
  v_estado text;
  v_confirmados bigint;
  v_cantidad integer := 0;
begin
  for v_sesion in
    select t.id, t.fecha, t.cupo_maximo
      from public.turnos_clase t
     where t.serie_id = p_serie_id
       and not coalesce(t.cancelado, false)
       and coalesce(t.estado, 'activo') <> 'cancelado'
       and (t.fecha + t.hora_inicio) > localtimestamp
     order by t.fecha, t.hora_inicio, t.id
     for update
  loop
    v_cantidad := v_cantidad + 1;
    if v_sesion.cupo_maximo is null or v_sesion.cupo_maximo <= 0 then
      raise exception using errcode = 'P0001', message = 'CUPO_NO_DEFINIDO';
    end if;

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

      v_estado := case when v_confirmados < v_sesion.cupo_maximo then 'confirmado' else 'en_espera' end;
      insert into public.inscripciones (turno_id, alumno_id, estado)
      values (v_sesion.id, p_alumno_id, v_estado)
      returning id into v_inscripcion_id;
    end if;

    return query select v_inscripcion_id, v_sesion.fecha, v_estado;
  end loop;

  if v_cantidad = 0 then
    raise exception using errcode = 'P0002', message = 'SERIE_SIN_SESIONES_FUTURAS';
  end if;
end;
$$;

revoke all on function public.inscribir_alumno_serie(uuid, uuid) from public;
grant execute on function public.inscribir_alumno_serie(uuid, uuid) to authenticated;

comment on function public.inscribir_alumno_serie(uuid, uuid) is
  'Inscribe al alumno en las sesiones futuras activas de una serie periódica y calcula confirmado/lista de espera por sesión.';