-- HU09: definir el cupo máximo de un turno de clase.
-- Esta migración protege las reglas incluso si una escritura no proviene de la UI.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'turnos_clase_cupo_maximo_positivo'
      and conrelid = 'public.turnos_clase'::regclass
  ) then
    alter table public.turnos_clase
      add constraint turnos_clase_cupo_maximo_positivo
      check (cupo_maximo is null or cupo_maximo > 0)
      not valid;
  end if;
end
$$;

alter table public.turnos_clase
  validate constraint turnos_clase_cupo_maximo_positivo;

create or replace function public.validar_modificacion_cupo_turno()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_inscriptos bigint;
begin
  if new.cupo_maximo is null or new.cupo_maximo <= 0 then
    raise exception using
      errcode = '22023',
      message = 'CUPO_INVALIDO';
  end if;

  select count(*)
    into v_inscriptos
    from public.inscripciones
   where turno_id = new.id;

  if new.cupo_maximo < v_inscriptos then
    raise exception using
      errcode = 'P0001',
      message = 'CUPO_MENOR_A_INSCRIPTOS',
      detail = format(
        'El turno tiene %s inscriptos y el cupo solicitado es %s.',
        v_inscriptos,
        new.cupo_maximo
      );
  end if;

  return new;
end;
$$;

drop trigger if exists validar_modificacion_cupo_turno
  on public.turnos_clase;

create trigger validar_modificacion_cupo_turno
before update of cupo_maximo on public.turnos_clase
for each row
execute function public.validar_modificacion_cupo_turno();

create or replace function public.validar_cupo_inscripcion()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_cupo integer;
  v_inscriptos bigint;
begin
  select cupo_maximo
    into v_cupo
    from public.turnos_clase
   where id = new.turno_id
   for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'TURNO_NO_EXISTE';
  end if;

  if v_cupo is null then
    raise exception using
      errcode = 'P0001',
      message = 'CUPO_NO_DEFINIDO';
  end if;

  if tg_op = 'UPDATE' then
    select count(*)
      into v_inscriptos
      from public.inscripciones
     where turno_id = new.turno_id
       and id <> old.id;
  else
    select count(*)
      into v_inscriptos
      from public.inscripciones
     where turno_id = new.turno_id;
  end if;

  if v_inscriptos >= v_cupo then
    raise exception using
      errcode = 'P0001',
      message = 'CUPO_COMPLETO';
  end if;

  return new;
end;
$$;

drop trigger if exists validar_cupo_inscripcion
  on public.inscripciones;

create trigger validar_cupo_inscripcion
before insert or update of turno_id on public.inscripciones
for each row
execute function public.validar_cupo_inscripcion();

create or replace function public.definir_cupo_turno(
  p_turno_id uuid,
  p_cupo_maximo integer
)
returns table (
  turno_id uuid,
  cupo_maximo integer,
  inscriptos_actuales bigint,
  lugares_disponibles bigint
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_inscriptos bigint;
begin
  if p_cupo_maximo is null or p_cupo_maximo <= 0 then
    raise exception using
      errcode = '22023',
      message = 'CUPO_INVALIDO';
  end if;

  perform 1
    from public.turnos_clase
   where id = p_turno_id
   for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'TURNO_NO_EXISTE';
  end if;

  select count(*)
    into v_inscriptos
    from public.inscripciones
   where inscripciones.turno_id = p_turno_id;

  if p_cupo_maximo < v_inscriptos then
    raise exception using
      errcode = 'P0001',
      message = 'CUPO_MENOR_A_INSCRIPTOS',
      detail = format(
        'El turno tiene %s inscriptos y el cupo solicitado es %s.',
        v_inscriptos,
        p_cupo_maximo
      );
  end if;

  update public.turnos_clase
     set cupo_maximo = p_cupo_maximo
   where id = p_turno_id;

  return query
  select
    p_turno_id,
    p_cupo_maximo,
    v_inscriptos,
    (p_cupo_maximo::bigint - v_inscriptos);
end;
$$;

comment on function public.definir_cupo_turno(uuid, integer) is
  'HU09: define el cupo de un turno sin permitir un valor menor a sus inscriptos.';

revoke all on function public.definir_cupo_turno(uuid, integer) from public;
grant execute on function public.definir_cupo_turno(uuid, integer) to anon, authenticated;
