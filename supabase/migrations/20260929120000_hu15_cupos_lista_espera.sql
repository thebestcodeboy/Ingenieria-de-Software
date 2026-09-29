-- HU15: cupos y lista de espera transaccionales por turno.

alter table public.turnos_clase
  add column if not exists cancelado boolean not null default false;

alter table public.inscripciones
  add column if not exists estado text not null default 'confirmado';

alter table public.inscripciones
  add column if not exists created_at timestamptz not null default now();

create unique index if not exists inscripciones_turno_alumno_activa_uidx
  on public.inscripciones (turno_id, alumno_id)
  where estado <> 'cancelado';

create or replace function public.validar_cupo_inscripcion()
returns trigger
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
begin
  if new.estado = 'cancelado' then
    return new;
  end if;

  select cupo_maximo, fecha, hora_inicio, cancelado
    into v_cupo, v_fecha, v_hora_inicio, v_cancelado
    from public.turnos_clase
   where id = new.turno_id
   for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'TURNO_NO_EXISTE';
  end if;
  if v_cancelado then
    raise exception using errcode = 'P0001', message = 'TURNO_CANCELADO';
  end if;
  if (v_fecha + v_hora_inicio) <= localtimestamp then
    raise exception using errcode = 'P0001', message = 'TURNO_PASADO';
  end if;
  if v_cupo is null or v_cupo <= 0 then
    raise exception using errcode = 'P0001', message = 'CUPO_NO_DEFINIDO';
  end if;

  if new.estado = 'confirmado' then
    if tg_op = 'UPDATE' then
      select count(*) into v_confirmados
        from public.inscripciones
       where turno_id = new.turno_id and estado = 'confirmado' and id <> old.id;
    else
      select count(*) into v_confirmados
        from public.inscripciones
       where turno_id = new.turno_id and estado = 'confirmado';
    end if;
    if v_confirmados >= v_cupo then
      raise exception using errcode = 'P0001', message = 'CUPO_COMPLETO';
    end if;
  elsif new.estado <> 'en_espera' and new.estado <> 'cancelado' then
    raise exception using errcode = '22023', message = 'ESTADO_INSCRIPCION_INVALIDO';
  end if;
  return new;
end;
$$;

drop trigger if exists validar_cupo_inscripcion on public.inscripciones;
create trigger validar_cupo_inscripcion
before insert or update of turno_id, estado on public.inscripciones
for each row execute function public.validar_cupo_inscripcion();

create or replace function public.promover_lista_espera_al_cancelar()
returns trigger
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
  v_siguiente_id uuid;
begin
  if old.estado <> 'confirmado' or new.estado <> 'cancelado' then return new; end if;
  select t.cupo_maximo, t.fecha, t.hora_inicio, t.cancelado
    into v_cupo, v_fecha, v_hora_inicio, v_cancelado
    from public.turnos_clase t where t.id = new.turno_id for update;
  if not found or v_cancelado or v_cupo is null
     or (v_fecha + v_hora_inicio) <= localtimestamp then return new; end if;
  select count(*) into v_confirmados from public.inscripciones i
   where i.turno_id = new.turno_id and i.estado = 'confirmado';
  if v_confirmados >= v_cupo then return new; end if;
  select i.id into v_siguiente_id from public.inscripciones i
   where i.turno_id = new.turno_id and i.estado = 'en_espera'
   order by i.created_at asc, i.id asc limit 1 for update;
  if v_siguiente_id is not null then
    update public.inscripciones set estado = 'confirmado' where id = v_siguiente_id;
  end if;
  return new;
end;
$$;

drop trigger if exists promover_lista_espera_al_cancelar on public.inscripciones;
create trigger promover_lista_espera_al_cancelar
after update of estado on public.inscripciones
for each row execute function public.promover_lista_espera_al_cancelar();

create or replace function public.inscribir_alumno_turno(p_turno_id uuid, p_alumno_id uuid)
returns table (inscripcion_id uuid, estado text, cupo_maximo integer, inscriptos_actuales bigint, lugares_disponibles bigint)
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
  if exists (select 1 from public.inscripciones i where i.turno_id = p_turno_id and i.alumno_id = p_alumno_id and i.estado <> 'cancelado') then
    raise exception using errcode = '23505', message = 'INSCRIPCION_DUPLICADA';
  end if;
  select count(*) into v_confirmados from public.inscripciones i where i.turno_id = p_turno_id and i.estado = 'confirmado';
  v_estado := case when v_confirmados < v_cupo then 'confirmado' else 'en_espera' end;
  insert into public.inscripciones (turno_id, alumno_id, estado)
  values (p_turno_id, p_alumno_id, v_estado) returning id into v_id;
  return query select v_id, v_estado, v_cupo, v_confirmados + case when v_estado = 'confirmado' then 1 else 0 end,
    greatest(v_cupo - v_confirmados - case when v_estado = 'confirmado' then 1 else 0 end, 0);
end;
$$;

create or replace function public.cancelar_inscripcion_y_promover(p_inscripcion_id uuid, p_turno_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_estado_anterior text;
begin
  select i.estado into v_estado_anterior from public.inscripciones i
   where i.id = p_inscripcion_id and i.turno_id = p_turno_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'INSCRIPCION_NO_EXISTE'; end if;
  update public.inscripciones set estado = 'cancelado' where id = p_inscripcion_id;
  return null;
end;
$$;

revoke all on function public.inscribir_alumno_turno(uuid, uuid) from public;
grant execute on function public.inscribir_alumno_turno(uuid, uuid) to authenticated;
revoke all on function public.cancelar_inscripcion_y_promover(uuid, uuid) from public;
grant execute on function public.cancelar_inscripcion_y_promover(uuid, uuid) to authenticated;

comment on function public.inscribir_alumno_turno(uuid, uuid) is
  'HU15: inscribe o agrega a espera, bloqueando el turno y validando cupo y duplicados en una transacción.';
