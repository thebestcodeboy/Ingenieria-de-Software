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
  v_cupo integer;
  v_fecha date;
  v_hora_inicio time;
  v_cancelado boolean;
  v_confirmados bigint;
  v_estado text;
  v_id uuid;
begin
  select t.cupo_maximo, t.fecha, t.hora_inicio, t.cancelado
    into v_cupo, v_fecha, v_hora_inicio, v_cancelado
    from public.turnos_clase t where t.id = p_turno_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'TURNO_NO_EXISTE'; end if;
  if v_cancelado then raise exception using errcode = 'P0001', message = 'TURNO_CANCELADO'; end if;
  if (v_fecha + v_hora_inicio) <= localtimestamp then raise exception using errcode = 'P0001', message = 'TURNO_PASADO'; end if;
  if v_cupo is null or v_cupo <= 0 then raise exception using errcode = 'P0001', message = 'CUPO_NO_DEFINIDO'; end if;
  if exists (
    select 1 from public.inscripciones i
     where i.turno_id = p_turno_id
       and i.alumno_id = p_alumno_id
       and i.estado <> 'cancelado'
  ) then
    raise exception using errcode = '23505', message = 'INSCRIPCION_DUPLICADA';
  end if;

  select count(*) into v_confirmados
    from public.inscripciones i
   where i.turno_id = p_turno_id and i.estado = 'confirmado';

  v_estado := case when v_confirmados < v_cupo then 'confirmado' else 'en_espera' end;
  insert into public.inscripciones (turno_id, alumno_id, estado)
  values (p_turno_id, p_alumno_id, v_estado)
  returning id into v_id;

  return query
  select v_id, v_estado, v_cupo,
    v_confirmados + case when v_estado = 'confirmado' then 1 else 0 end,
    greatest(v_cupo - v_confirmados - case when v_estado = 'confirmado' then 1 else 0 end, 0);
end;
$$;

revoke all on function public.inscribir_alumno_turno(uuid, uuid) from public;
grant execute on function public.inscribir_alumno_turno(uuid, uuid) to authenticated;

comment on function public.inscribir_alumno_turno(uuid, uuid) is
  'Inscribe o agrega a espera para un único turno, validando cupo y duplicados en una transacción.';