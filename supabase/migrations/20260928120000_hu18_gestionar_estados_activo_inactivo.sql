-- HU18: conservar entidades e historial, permitiendo su baja logica.
alter table public.alumnos
  add column if not exists activo boolean not null default true;
alter table public.profesores
  add column if not exists activo boolean not null default true;
alter table public.materias
  add column if not exists activo boolean not null default true;
alter table public.cursos_ingreso
  add column if not exists activo boolean not null default true;

update public.alumnos set activo = true where activo is null;
update public.profesores set activo = true where activo is null;
update public.materias set activo = true where activo is null;
update public.cursos_ingreso set activo = true where activo is null;

do $$
declare
  tabla text;
begin
  foreach tabla in array array['alumnos', 'profesores', 'materias', 'cursos_ingreso'] loop
    if exists (
      select 1
        from information_schema.columns
       where table_schema = 'public'
         and table_name = tabla
         and column_name = 'estado'
    ) then
      execute format(
        'update public.%I set activo = false where upper(coalesce(estado::text, '''')) = ''INACTIVO''',
        tabla
      );
    end if;
  end loop;
end;
$$;

alter table public.alumnos alter column activo set default true;
alter table public.alumnos alter column activo set not null;
alter table public.profesores alter column activo set default true;
alter table public.profesores alter column activo set not null;
alter table public.materias alter column activo set default true;
alter table public.materias alter column activo set not null;
alter table public.cursos_ingreso alter column activo set default true;
alter table public.cursos_ingreso alter column activo set not null;

create or replace function public.validar_entidades_activas_turno()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.profesores p
     where p.id = new.profesor_id and p.activo = true
  ) then
    raise exception using errcode = 'P0001', message = 'PROFESOR_INACTIVO';
  end if;

  if not exists (
    select 1 from public.materias m
     where m.id = new.materia_id and m.activo = true
  ) then
    raise exception using errcode = 'P0001', message = 'MATERIA_INACTIVA';
  end if;

  if new.curso_id is not null and not exists (
    select 1 from public.cursos_ingreso c
     where c.id = new.curso_id and c.activo = true
  ) then
    raise exception using errcode = 'P0001', message = 'CURSO_INACTIVO';
  end if;

  return new;
end;
$$;

drop trigger if exists validar_entidades_activas_turno on public.turnos_clase;
create trigger validar_entidades_activas_turno
before insert or update of profesor_id, materia_id, curso_id
on public.turnos_clase
for each row
execute function public.validar_entidades_activas_turno();

create or replace function public.validar_alumno_activo_inscripcion()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.alumnos a
     where a.id = new.alumno_id and a.activo = true
  ) then
    raise exception using errcode = 'P0001', message = 'ALUMNO_INACTIVO';
  end if;

  return new;
end;
$$;

drop trigger if exists validar_alumno_activo_inscripcion on public.inscripciones;
create trigger validar_alumno_activo_inscripcion
before insert or update of alumno_id, turno_id
on public.inscripciones
for each row
execute function public.validar_alumno_activo_inscripcion();

notify pgrst, 'reload schema';