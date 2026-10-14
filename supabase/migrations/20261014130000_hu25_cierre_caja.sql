alter table public.pagos
  add column if not exists registrado_por uuid references auth.users(id) on delete set null;

alter table public.pagos
  alter column registrado_por set default auth.uid();

create or replace function public.fijar_responsable_pago()
returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is not null then
    new.registrado_por := (select auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists fijar_responsable_pago on public.pagos;
create trigger fijar_responsable_pago
  before insert on public.pagos
  for each row execute function public.fijar_responsable_pago();

create sequence if not exists public.cierre_caja_numero_seq;

create table if not exists public.caja_cierres (
  id uuid primary key default gen_random_uuid(),
  numero_comprobante text not null unique,
  fecha date not null,
  emitido_en timestamptz not null default now(),
  responsable_id uuid not null references auth.users(id),
  responsable_nombre text not null,
  totales_por_medio jsonb not null,
  total_general numeric(14, 2) not null,
  efectivo_esperado numeric(14, 2) not null,
  efectivo_contado numeric(14, 2) not null,
  diferencia numeric(14, 2) not null,
  observacion text,
  constraint caja_cierres_totales_objeto check (jsonb_typeof(totales_por_medio) = 'object'),
  constraint caja_cierres_observacion_diferencia check (diferencia = 0 or length(trim(observacion)) > 0)
);

create table if not exists public.caja_cierre_detalles (
  id uuid primary key default gen_random_uuid(),
  cierre_id uuid not null references public.caja_cierres(id),
  pago_id uuid not null unique references public.pagos(id),
  pago_fecha date not null,
  pago_comprobante text not null,
  alumno_nombre text not null,
  alumno_legajo text,
  concepto text not null,
  medio_pago text not null,
  importe numeric(14, 2) not null
);

create index if not exists caja_cierres_fecha_idx on public.caja_cierres(fecha desc);
create index if not exists caja_cierres_responsable_idx on public.caja_cierres(responsable_id, fecha desc);
create index if not exists caja_cierre_detalles_cierre_idx on public.caja_cierre_detalles(cierre_id);

create or replace function public.es_personal_caja()
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.users u
    where u.id = (select auth.uid())
      and lower(coalesce(
        u.raw_app_meta_data ->> 'rol',
        u.raw_app_meta_data ->> 'role',
        u.raw_user_meta_data ->> 'rol',
        u.raw_user_meta_data ->> 'role',
        ''
      )) in ('gerente', 'gerencia', 'mesa_entrada', 'admin', 'administrador')
  );
$$;

revoke all on function public.es_personal_caja() from public, anon;
grant execute on function public.es_personal_caja() to authenticated;

alter table public.caja_cierres enable row level security;
alter table public.caja_cierre_detalles enable row level security;

drop policy if exists caja_cierres_consulta_administrativa on public.caja_cierres;
create policy caja_cierres_consulta_administrativa on public.caja_cierres
  for select to authenticated using ((select public.es_personal_caja()));

drop policy if exists caja_cierre_detalles_consulta_administrativa on public.caja_cierre_detalles;
create policy caja_cierre_detalles_consulta_administrativa on public.caja_cierre_detalles
  for select to authenticated using ((select public.es_personal_caja()));

revoke all on public.caja_cierres, public.caja_cierre_detalles from anon, authenticated;
grant select on public.caja_cierres, public.caja_cierre_detalles to authenticated;

create or replace function public.cerrar_caja(
  p_fecha date,
  p_pago_ids uuid[],
  p_efectivo_contado numeric,
  p_observacion text default null
)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_nombre text;
  v_total_pendiente integer;
  v_total_seleccionado integer;
  v_total_general numeric(14, 2);
  v_efectivo_esperado numeric(14, 2);
  v_diferencia numeric(14, 2);
  v_totales jsonb;
  v_cierre_id uuid;
begin
  if v_uid is null or not public.es_personal_caja() then
    raise exception using errcode = '42501', message = 'Tu cuenta no tiene permisos para cerrar caja.';
  end if;
  if p_fecha is null or p_efectivo_contado is null or p_efectivo_contado < 0 then
    raise exception 'Ingresá una fecha y un importe contado válido.';
  end if;
  if coalesce(cardinality(p_pago_ids), 0) = 0 then
    raise exception 'No hay cobros para incluir en el cierre.';
  end if;
  if exists (select 1 from unnest(p_pago_ids) id group by id having count(*) > 1) then
    raise exception 'La lista de cobros contiene elementos duplicados.';
  end if;

  select coalesce(u.raw_user_meta_data ->> 'nombre', u.email, 'Usuario')
    into v_nombre from auth.users u where u.id = v_uid;

  perform p.id
    from public.pagos p
    where p.fecha = p_fecha
      and p.estado = 'CONFIRMADO'
      and (p.registrado_por = v_uid or p.registrado_por is null)
      and not exists (select 1 from public.caja_cierre_detalles d where d.pago_id = p.id)
    for update of p;

  select count(*) into v_total_pendiente
    from public.pagos p
    where p.fecha = p_fecha
      and p.estado = 'CONFIRMADO'
      and (p.registrado_por = v_uid or p.registrado_por is null)
      and not exists (select 1 from public.caja_cierre_detalles d where d.pago_id = p.id);

  select count(*) into v_total_seleccionado
    from public.pagos p
    where p.id = any(p_pago_ids)
      and p.fecha = p_fecha
      and p.estado = 'CONFIRMADO'
      and (p.registrado_por = v_uid or p.registrado_por is null)
      and not exists (select 1 from public.caja_cierre_detalles d where d.pago_id = p.id);

  if v_total_pendiente = 0 or v_total_seleccionado <> v_total_pendiente
     or cardinality(p_pago_ids) <> v_total_seleccionado then
    raise exception 'Los cobros disponibles cambiaron. Actualizá la lista antes de cerrar.';
  end if;
  if exists (
    select 1 from public.pagos p where p.id = any(p_pago_ids)
      and p.medio_pago not in ('Efectivo', 'Transferencia', 'Tarjeta de Débito', 'Tarjeta de Crédito', 'Mercado Pago')
  ) then
    raise exception 'Hay cobros con un medio de pago no reconocido. Revisá los registros antes de cerrar.';
  end if;

  select
    round(coalesce(sum(p.importe), 0), 2),
    round(coalesce(sum(p.importe) filter (where p.medio_pago = 'Efectivo'), 0), 2),
    jsonb_build_object(
      'Efectivo', round(coalesce(sum(p.importe) filter (where p.medio_pago = 'Efectivo'), 0), 2),
      'Transferencia', round(coalesce(sum(p.importe) filter (where p.medio_pago = 'Transferencia'), 0), 2),
      'Tarjeta de Débito', round(coalesce(sum(p.importe) filter (where p.medio_pago = 'Tarjeta de Débito'), 0), 2),
      'Tarjeta de Crédito', round(coalesce(sum(p.importe) filter (where p.medio_pago = 'Tarjeta de Crédito'), 0), 2),
      'Mercado Pago', round(coalesce(sum(p.importe) filter (where p.medio_pago = 'Mercado Pago'), 0), 2)
    )
    into v_total_general, v_efectivo_esperado, v_totales
    from public.pagos p where p.id = any(p_pago_ids);

  v_diferencia := round(p_efectivo_contado - v_efectivo_esperado, 2);
  if v_diferencia <> 0 and length(trim(coalesce(p_observacion, ''))) = 0 then
    raise exception 'Ingresá una observación para justificar la diferencia de efectivo.';
  end if;

  insert into public.caja_cierres (
    numero_comprobante, fecha, responsable_id, responsable_nombre,
    totales_por_medio, total_general, efectivo_esperado,
    efectivo_contado, diferencia, observacion
  ) values (
    format('CC-%s-%s', to_char(p_fecha, 'YYYY'), lpad(nextval('public.cierre_caja_numero_seq')::text, 6, '0')),
    p_fecha, v_uid, v_nombre, v_totales, v_total_general, v_efectivo_esperado,
    round(p_efectivo_contado, 2), v_diferencia, nullif(trim(p_observacion), '')
  ) returning id into v_cierre_id;

  insert into public.caja_cierre_detalles (
    cierre_id, pago_id, pago_fecha, pago_comprobante, alumno_nombre,
    alumno_legajo, concepto, medio_pago, importe
  )
  select v_cierre_id, p.id, p.fecha, p.comprobante,
    coalesce(nullif(trim(concat_ws(', ', a.apellido, a.nombre)), ''), 'Alumno sin datos'),
    a.legajo, p.concepto, p.medio_pago, p.importe
  from public.pagos p
  left join public.alumnos a on a.id = p.alumno_id
  where p.id = any(p_pago_ids);

  return v_cierre_id;
end;
$$;

revoke all on function public.cerrar_caja(date, uuid[], numeric, text) from public, anon;
grant execute on function public.cerrar_caja(date, uuid[], numeric, text) to authenticated;

create or replace function public.proteger_pago_cerrado()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.caja_cierre_detalles d where d.pago_id = old.id) then
    raise exception 'El cobro pertenece a un cierre inmutable. Registrá un movimiento nuevo para corregirlo.';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists proteger_pago_cerrado on public.pagos;
create trigger proteger_pago_cerrado
  before update or delete on public.pagos
  for each row execute function public.proteger_pago_cerrado();

create or replace function public.proteger_cierre_caja()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  raise exception 'Un cierre de caja es inmutable.';
end;
$$;

drop trigger if exists proteger_cierre_caja on public.caja_cierres;
create trigger proteger_cierre_caja
  before update or delete on public.caja_cierres
  for each row execute function public.proteger_cierre_caja();

drop trigger if exists proteger_detalle_cierre_caja on public.caja_cierre_detalles;
create trigger proteger_detalle_cierre_caja
  before update or delete on public.caja_cierre_detalles
  for each row execute function public.proteger_cierre_caja();

create table if not exists public.caja_correcciones (
  id uuid primary key default gen_random_uuid(),
  cierre_id uuid not null references public.caja_cierres(id),
  pago_id uuid references public.pagos(id),
  responsable_id uuid not null references auth.users(id),
  responsable_nombre text not null,
  creado_en timestamptz not null default now(),
  medio_pago text not null check (medio_pago in ('Efectivo', 'Transferencia', 'Tarjeta de Débito', 'Tarjeta de Crédito', 'Mercado Pago')),
  importe numeric(14, 2) not null check (importe <> 0),
  motivo text not null check (length(trim(motivo)) > 0)
);

create index if not exists caja_correcciones_cierre_idx on public.caja_correcciones(cierre_id, creado_en);

alter table public.caja_correcciones enable row level security;
drop policy if exists caja_correcciones_consulta_administrativa on public.caja_correcciones;
create policy caja_correcciones_consulta_administrativa on public.caja_correcciones
  for select to authenticated using ((select public.es_personal_caja()));

revoke all on public.caja_correcciones from anon, authenticated;
grant select on public.caja_correcciones to authenticated;

drop trigger if exists proteger_correccion_caja on public.caja_correcciones;
create trigger proteger_correccion_caja
  before update or delete on public.caja_correcciones
  for each row execute function public.proteger_cierre_caja();

create or replace function public.registrar_correccion_caja(
  p_cierre_id uuid,
  p_pago_id uuid,
  p_medio_pago text,
  p_importe numeric,
  p_motivo text
)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_nombre text;
  v_correccion_id uuid;
begin
  if v_uid is null or not public.es_personal_caja() then
    raise exception using errcode = '42501', message = 'Tu cuenta no tiene permisos para registrar movimientos correctivos.';
  end if;
  if p_cierre_id is null or not exists (select 1 from public.caja_cierres c where c.id = p_cierre_id) then
    raise exception 'Seleccioná un cierre válido para vincular la corrección.';
  end if;
  if p_pago_id is not null and not exists (
    select 1 from public.caja_cierre_detalles d where d.cierre_id = p_cierre_id and d.pago_id = p_pago_id
  ) then
    raise exception 'El cobro seleccionado no pertenece a este cierre.';
  end if;
    if p_importe is null or round(p_importe, 2) = 0 or p_medio_pago is null
      or p_medio_pago not in ('Efectivo', 'Transferencia', 'Tarjeta de Débito', 'Tarjeta de Crédito', 'Mercado Pago') then
    raise exception 'Ingresá un importe distinto de cero y un medio de pago válido.';
  end if;
  if length(trim(coalesce(p_motivo, ''))) = 0 then
    raise exception 'El motivo de la corrección es obligatorio.';
  end if;

  select coalesce(u.raw_user_meta_data ->> 'nombre', u.email, 'Usuario')
    into v_nombre from auth.users u where u.id = v_uid;
  insert into public.caja_correcciones (
    cierre_id, pago_id, responsable_id, responsable_nombre, medio_pago, importe, motivo
  ) values (
    p_cierre_id, p_pago_id, v_uid, v_nombre, p_medio_pago, round(p_importe, 2), trim(p_motivo)
  ) returning id into v_correccion_id;
  return v_correccion_id;
end;
$$;

revoke all on function public.registrar_correccion_caja(uuid, uuid, text, numeric, text) from public, anon;
grant execute on function public.registrar_correccion_caja(uuid, uuid, text, numeric, text) to authenticated;

notify pgrst, 'reload schema';