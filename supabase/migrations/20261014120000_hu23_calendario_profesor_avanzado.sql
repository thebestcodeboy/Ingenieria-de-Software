-- HU23: historial para identificar clases reprogramadas sin alterar turnos existentes.
create table if not exists public.historial_reprogramacion_turnos (
  id bigint generated always as identity primary key,
  turno_id uuid not null references public.turnos_clase(id) on delete cascade,
  profesor_id uuid not null,
  fecha_anterior date,
  hora_inicio_anterior time,
  hora_fin_anterior time,
  aula_anterior text,
  registrado_en timestamptz not null default now()
);
create index if not exists historial_reprogramacion_turnos_turno_idx
  on public.historial_reprogramacion_turnos(turno_id);
alter table public.historial_reprogramacion_turnos enable row level security;
revoke all on public.historial_reprogramacion_turnos from public, anon, authenticated;

create or replace function public.registrar_reprogramacion_turno()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (old.fecha, old.hora_inicio, old.hora_fin, old.aula_numero, old.profesor_id)
       is distinct from
     (new.fecha, new.hora_inicio, new.hora_fin, new.aula_numero, new.profesor_id) then
    insert into public.historial_reprogramacion_turnos
      (turno_id, profesor_id, fecha_anterior, hora_inicio_anterior, hora_fin_anterior, aula_anterior)
    values (old.id, old.profesor_id, old.fecha, old.hora_inicio, old.hora_fin, old.aula_numero::text);
  end if;
  return new;
end;
$$;
drop trigger if exists registrar_reprogramacion_turno on public.turnos_clase;
create trigger registrar_reprogramacion_turno
after update of fecha, hora_inicio, hora_fin, aula_numero, profesor_id
on public.turnos_clase for each row execute function public.registrar_reprogramacion_turno();

create or replace function public.listar_calendario_profesor_avanzado(p_desde date, p_hasta date)
returns jsonb language plpgsql security definer set search_path = '' stable as $$
declare v_profesor_id uuid; v_resultado jsonb;
begin
  if p_desde is null or p_hasta is null or p_hasta < p_desde or p_hasta - p_desde > 31 then
    raise exception 'Rango de fechas inválido.';
  end if;
  select p.id into v_profesor_id from public.profesores p
    where p.auth_user_id = (select auth.uid()) and coalesce(p.acceso_portal, false) = true;
  if v_profesor_id is null then
    raise exception using errcode='42501', message='PROFESOR_NO_VINCULADO';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'turno_id', t.id, 'fecha', t.fecha, 'hora_inicio', t.hora_inicio,
    'hora_fin', t.hora_fin, 'materia_nombre', coalesce(m.nombre, 'Sin materia'),
    'actividad_nombre', coalesce(ci.nombre, cp.nombre, m.nombre, 'Clase'),
    'aula_numero', t.aula_numero, 'cupo_maximo', t.cupo_maximo,
    'cancelado', coalesce(t.cancelado, false) or coalesce(t.estado, 'activo')='cancelado',
    'reprogramado', exists(select 1 from public.historial_reprogramacion_turnos h where h.turno_id=t.id),
    'alumnos', coalesce((select jsonb_agg(jsonb_build_object(
      'id', a.id, 'nombre', a.nombre, 'apellido', a.apellido, 'estado', i.estado
    ) order by a.apellido, a.nombre)
      from public.inscripciones i join public.alumnos a on a.id=i.alumno_id
      where i.turno_id=t.id and i.estado <> 'cancelado'), '[]'::jsonb)
  ) order by t.fecha, t.hora_inicio, t.id), '[]'::jsonb)
    into v_resultado
  from public.turnos_clase t
  left join public.materias m on m.id=t.materia_id
  left join public.cursos_ingreso ci on ci.id=t.curso_id
  left join public.clases_particulares cp on cp.id=t.clase_particular_id
  where t.profesor_id=v_profesor_id and t.fecha between p_desde and p_hasta;
  return v_resultado;
end;
$$;
revoke all on function public.listar_calendario_profesor_avanzado(date,date) from public, anon;
grant execute on function public.listar_calendario_profesor_avanzado(date,date) to authenticated;
notify pgrst, 'reload schema';
