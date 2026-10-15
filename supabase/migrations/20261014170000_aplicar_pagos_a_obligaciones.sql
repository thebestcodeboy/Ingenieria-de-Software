alter table public.pagos
  add column if not exists obligacion_id uuid references public.obligaciones_pago(id) on delete restrict;

create index if not exists pagos_obligacion_idx
  on public.pagos (obligacion_id)
  where obligacion_id is not null;

drop policy if exists obligaciones_pago_lectura_administrativa on public.obligaciones_pago;
create policy obligaciones_pago_lectura_administrativa
on public.obligaciones_pago
for select
to authenticated
using (
  lower(coalesce(
    (select auth.jwt()) -> 'app_metadata' ->> 'rol',
    (select auth.jwt()) -> 'app_metadata' ->> 'role',
    ''
  )) in ('mesa_entrada', 'admin', 'administrador', 'gerente', 'gerencia')
);

drop policy if exists obligaciones_pago_alta_administrativa on public.obligaciones_pago;
create policy obligaciones_pago_alta_administrativa
on public.obligaciones_pago
for insert
to authenticated
with check (
  lower(coalesce(
    (select auth.jwt()) -> 'app_metadata' ->> 'rol',
    (select auth.jwt()) -> 'app_metadata' ->> 'role',
    ''
  )) in ('mesa_entrada', 'admin', 'administrador', 'gerente', 'gerencia')
);

grant insert on table public.obligaciones_pago to authenticated;

create or replace function public.validar_pago_obligacion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_obligacion public.obligaciones_pago;
  v_aplicado numeric(12,2);
begin
  if new.obligacion_id is null then
    return new;
  end if;

  select * into v_obligacion
  from public.obligaciones_pago
  where id = new.obligacion_id
  for update;

  if not found then
    raise exception 'La obligación seleccionada no existe.';
  end if;
  if v_obligacion.alumno_id <> new.alumno_id then
    raise exception 'La obligación no corresponde al alumno del pago.';
  end if;
  if v_obligacion.estado = 'ANULADA' then
    raise exception 'No se puede aplicar un pago a una obligación anulada.';
  end if;

  if new.estado = 'CONFIRMADO' then
    select coalesce(sum(p.importe), 0)
      into v_aplicado
    from public.pagos p
    where p.obligacion_id = new.obligacion_id
      and p.estado = 'CONFIRMADO'
      and (tg_op = 'INSERT' or p.id <> new.id);

    if v_aplicado + new.importe > v_obligacion.importe_original then
      raise exception 'El pago supera el saldo disponible de la obligación.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists validar_pago_obligacion on public.pagos;
create trigger validar_pago_obligacion
before insert or update of obligacion_id, alumno_id, importe, estado
on public.pagos
for each row execute function public.validar_pago_obligacion();

create or replace function public.recalcular_obligacion_pago(p_obligacion_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_original numeric(12,2);
  v_pagado numeric(12,2);
  v_saldo numeric(12,2);
begin
  if p_obligacion_id is null then return; end if;

  select importe_original into v_original
  from public.obligaciones_pago
  where id = p_obligacion_id
  for update;
  if not found then return; end if;

  select coalesce(sum(importe), 0) into v_pagado
  from public.pagos
  where obligacion_id = p_obligacion_id and estado = 'CONFIRMADO';

  v_saldo := greatest(v_original - v_pagado, 0);
  update public.obligaciones_pago
  set saldo_pendiente = v_saldo,
      estado = case when v_saldo = 0 then 'PAGADA'
                    when v_saldo < importe_original then 'PARCIAL'
                    else 'PENDIENTE' end,
      updated_at = now()
  where id = p_obligacion_id and estado <> 'ANULADA';
end;
$$;

create or replace function public.sincronizar_pago_obligacion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.recalcular_obligacion_pago(old.obligacion_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.recalcular_obligacion_pago(new.obligacion_id);
  end if;
  return null;
end;
$$;

drop trigger if exists sincronizar_pago_obligacion on public.pagos;
create trigger sincronizar_pago_obligacion
after insert or update or delete
on public.pagos
for each row execute function public.sincronizar_pago_obligacion();

notify pgrst, 'reload schema';
