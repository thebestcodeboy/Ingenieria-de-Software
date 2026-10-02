-- Detalle académico de los nuevos cobros. Los registros históricos conservan sus datos.
alter table public.pagos
  add column if not exists inscripcion_id uuid references public.inscripciones(id),
  add column if not exists periodo_desde date,
  add column if not exists periodo_hasta date,
  add column if not exists detalle_academico jsonb;

create or replace function public.validar_vinculo_academico_pago()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare v_id text;
begin
  if new.estado in ('CANCELADO', 'ANULADO') then return new; end if;
  if tg_op = 'UPDATE' and old.inscripcion_id is null and new.inscripcion_id is null
     and new.estado <> 'CONFIRMADO' then return new; end if;
  if new.inscripcion_id is null or new.periodo_desde is null or new.periodo_hasta is null
     or new.periodo_hasta < new.periodo_desde or new.detalle_academico is null then
    raise exception 'Seleccioná la actividad y el período o clase que se abona.';
  end if;
  if jsonb_typeof(new.detalle_academico -> 'inscripciones') is distinct from 'array' then
    raise exception 'El detalle del cobro no contiene inscripciones válidas.';
  end if;
  if jsonb_array_length(new.detalle_academico -> 'inscripciones') = 0
     or not ((new.detalle_academico -> 'inscripciones') ? new.inscripcion_id::text) then
    raise exception 'El detalle del cobro no corresponde a la inscripción seleccionada.';
  end if;
  for v_id in select jsonb_array_elements_text(new.detalle_academico -> 'inscripciones') loop
    if not exists (
      select 1 from public.inscripciones i
      join public.turnos_clase t on t.id = i.turno_id
      where i.id::text = v_id and i.alumno_id = new.alumno_id and i.estado = 'confirmado'
        and coalesce(t.estado, 'activo') <> 'cancelado' and not coalesce(t.cancelado, false)
        and t.fecha between new.periodo_desde and new.periodo_hasta
    ) then raise exception 'La clase no tiene una inscripción confirmada de este alumno en el período indicado.';
    end if;
  end loop;
  return new;
end;
$$;
drop trigger if exists validar_vinculo_academico_pago on public.pagos;
create trigger validar_vinculo_academico_pago before insert or update of alumno_id, inscripcion_id, periodo_desde, periodo_hasta, detalle_academico, estado
on public.pagos for each row execute function public.validar_vinculo_academico_pago();
notify pgrst, 'reload schema';
