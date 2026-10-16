-- Marca visible de "reprogramada" para los cuatro calendarios (Mesa, Gerencia, Profesor y Alumno).
-- Hasta ahora solo el profesor lo conocía, vía historial_reprogramacion_turnos (sin acceso directo para los demás roles).
alter table public.turnos_clase add column if not exists reprogramado boolean not null default false;

-- Clases que ya fueron reprogramadas antes de esta migración.
update public.turnos_clase t set reprogramado = true
where exists (select 1 from public.historial_reprogramacion_turnos h where h.turno_id = t.id);

-- A partir de ahora, cada reprogramación deja la marca en el propio turno.
create or replace function public.registrar_reprogramacion_turno()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (old.fecha, old.hora_inicio, old.hora_fin, old.aula_numero, old.profesor_id)
       is distinct from
     (new.fecha, new.hora_inicio, new.hora_fin, new.aula_numero, new.profesor_id) then
    insert into public.historial_reprogramacion_turnos
      (turno_id, profesor_id, fecha_anterior, hora_inicio_anterior, hora_fin_anterior, aula_anterior)
    values (old.id, old.profesor_id, old.fecha, old.hora_inicio, old.hora_fin, old.aula_numero::text);
    -- La columna reprogramado no está en la lista "update of" del trigger, así que no se vuelve a disparar.
    update public.turnos_clase set reprogramado = true where id = new.id;
  end if;
  return new;
end;
$$;
notify pgrst, 'reload schema';
