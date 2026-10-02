-- Fechas comunes a todos los alumnos del curso.
-- Los cursos existentes se conservan sin asignarles fechas inventadas.
alter table public.cursos_ingreso
  add column if not exists fecha_inicio date,
  add column if not exists fecha_fin date;
create or replace function public.validar_periodo_curso_ingreso()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.fecha_inicio is null or new.fecha_fin is null then
    raise exception 'Completá las fechas de inicio y finalización del curso.';
  end if;
  if new.fecha_fin < new.fecha_inicio then
    raise exception 'La finalización no puede ser anterior al inicio del curso.';
  end if;
  if exists (
    select 1 from public.turnos_clase t where t.curso_id = new.id
      and (t.fecha is null or t.fecha < new.fecha_inicio or t.fecha > new.fecha_fin)
  ) then raise exception 'El período elegido deja afuera clases ya programadas. Revisá sus fechas antes de modificar el curso.';
  end if;
  return new;
end;
$$;
drop trigger if exists validar_periodo_curso_ingreso on public.cursos_ingreso;
create trigger validar_periodo_curso_ingreso before insert or update of fecha_inicio, fecha_fin
on public.cursos_ingreso for each row execute function public.validar_periodo_curso_ingreso();

create or replace function public.validar_fecha_turno_curso()
returns trigger language plpgsql set search_path = '' as $$
declare v_inicio date; v_fin date;
begin
  if new.curso_id is null then return new; end if;
  select c.fecha_inicio, c.fecha_fin into v_inicio, v_fin
    from public.cursos_ingreso c where c.id = new.curso_id for update;
  if not found then raise exception 'El curso seleccionado no existe.'; end if;
  if v_inicio is null or v_fin is null then
    raise exception 'Configurá las fechas del curso en Cursos de Ingreso antes de programar clases.';
  end if;
  if new.fecha is null or new.fecha < v_inicio or new.fecha > v_fin then
    raise exception 'La clase debe estar dentro del período del curso: % al %.', v_inicio, v_fin;
  end if;
  return new;
end;
$$;
drop trigger if exists validar_fecha_turno_curso on public.turnos_clase;
create trigger validar_fecha_turno_curso before insert or update of curso_id, fecha
on public.turnos_clase for each row execute function public.validar_fecha_turno_curso();
notify pgrst, 'reload schema';
