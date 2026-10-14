create or replace function public.alumno_portal_actual_id()
returns uuid
language sql stable security definer set search_path = '' as $$
  select a.id
  from auth.users u
  join public.alumnos a on
    lower(trim(coalesce(a.email, ''))) = lower(trim(coalesce(u.email, '')))
    or lower(trim(coalesce(a.username_institucional, ''))) = lower(split_part(coalesce(u.email, ''), '@', 1))
  where u.id = (select auth.uid())
    and lower(coalesce(
      u.raw_app_meta_data ->> 'rol', u.raw_app_meta_data ->> 'role',
      u.raw_user_meta_data ->> 'rol', u.raw_user_meta_data ->> 'role', ''
    )) in ('alumno', 'estudiante')
    and coalesce(a.activo, true)
    and coalesce(a.acceso_portal, false)
  limit 1;
$$;

revoke all on function public.alumno_portal_actual_id() from public, anon;
grant execute on function public.alumno_portal_actual_id() to authenticated;

create table if not exists public.bitacora_alumno (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references public.alumnos(id) on delete cascade,
  tipo text not null,
  titulo text not null,
  detalle text not null,
  ocurrido_en timestamptz not null default now(),
  origen_tipo text not null,
  origen_id uuid not null,
  datos jsonb not null default '{}'::jsonb
);

create index if not exists bitacora_alumno_fecha_idx
  on public.bitacora_alumno(alumno_id, ocurrido_en desc);

alter table public.bitacora_alumno enable row level security;
drop policy if exists bitacora_alumno_consulta_propia on public.bitacora_alumno;
create policy bitacora_alumno_consulta_propia on public.bitacora_alumno
  for select to authenticated
  using (alumno_id = (select public.alumno_portal_actual_id()));

revoke all on public.bitacora_alumno from anon, authenticated;
grant select on public.bitacora_alumno to authenticated;

create or replace function public.listar_pagos_portal_alumno()
returns table (
  id uuid,
  comprobante text,
  concepto text,
  importe numeric,
  medio_pago text,
  fecha date,
  estado text,
  created_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_alumno_id uuid := (select public.alumno_portal_actual_id());
begin
  if v_alumno_id is null then return; end if;
  return query
    select p.id, p.comprobante::text, p.concepto::text, p.importe::numeric,
      p.medio_pago::text, p.fecha::date, p.estado::text, p.created_at::timestamptz
    from public.pagos p
    where p.alumno_id = v_alumno_id and p.estado::text <> 'BORRADOR'
    order by p.created_at desc;
end;
$$;

revoke all on function public.listar_pagos_portal_alumno() from public, anon;
grant execute on function public.listar_pagos_portal_alumno() to authenticated;

create or replace function public.registrar_evento_bitacora_alumno()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_tipo text;
  v_titulo text;
  v_detalle text;
  v_alumno_id uuid;
  v_origen_tipo text;
  v_origen_id uuid;
  v_datos jsonb;
begin
  if tg_table_name = 'inscripciones' then
    if tg_op = 'UPDATE' and old.estado::text is not distinct from new.estado::text then return new; end if;
    if new.estado::text not in ('confirmado', 'en_espera', 'cancelado') then return new; end if;
    v_alumno_id := new.alumno_id;
    v_origen_tipo := 'inscripcion';
    v_origen_id := new.id;
    v_datos := jsonb_build_object('turno_id', new.turno_id, 'estado', new.estado::text);
    if new.estado::text = 'cancelado' then
      v_tipo := 'inscripcion_cancelada';
      v_titulo := 'Inscripción cancelada';
      v_detalle := 'Se registró la baja de una clase.';
    elsif new.estado::text = 'en_espera' then
      v_tipo := 'inscripcion_espera';
      v_titulo := 'Lista de espera';
      v_detalle := 'Se registró una inscripción en lista de espera.';
    else
      v_tipo := 'inscripcion_confirmada';
      v_titulo := 'Inscripción confirmada';
      v_detalle := 'Se confirmó una inscripción a clase.';
    end if;
  elsif tg_table_name = 'pagos' then
    if tg_op = 'UPDATE' and old.estado::text is not distinct from new.estado::text then return new; end if;
    if new.estado::text = 'BORRADOR' then return new; end if;
    v_alumno_id := new.alumno_id;
    v_origen_tipo := 'pago';
    v_origen_id := new.id;
    v_datos := jsonb_build_object(
      'comprobante', new.comprobante,
      'importe', new.importe,
      'medio_pago', new.medio_pago,
      'estado', new.estado::text
    );
    if new.estado::text = 'CONFIRMADO' then
      v_tipo := 'pago_confirmado';
      v_titulo := 'Pago confirmado';
      v_detalle := concat(new.comprobante, ' · ', new.concepto, ' · $', new.importe::text);
    elsif new.estado::text = 'PENDIENTE' then
      v_tipo := 'pago_pendiente';
      v_titulo := 'Pago pendiente';
      v_detalle := concat(new.comprobante, ' · ', new.concepto, ' · $', new.importe::text);
    else
      v_tipo := 'pago_estado_actualizado';
      v_titulo := concat('Estado del pago: ', new.estado::text);
      v_detalle := concat(new.comprobante, ' · ', new.concepto, ' · $', new.importe::text);
    end if;
  else
    return null;
  end if;

  insert into public.bitacora_alumno (
    alumno_id, tipo, titulo, detalle, origen_tipo, origen_id, datos
  ) values (
    v_alumno_id, v_tipo, v_titulo, v_detalle, v_origen_tipo, v_origen_id, v_datos
  );
  return new;
end;
$$;

drop trigger if exists bitacora_inscripcion_alumno on public.inscripciones;
create trigger bitacora_inscripcion_alumno
  after insert or update of estado on public.inscripciones
  for each row execute function public.registrar_evento_bitacora_alumno();

drop trigger if exists bitacora_pago_alumno on public.pagos;
create trigger bitacora_pago_alumno
  after insert or update of estado on public.pagos
  for each row execute function public.registrar_evento_bitacora_alumno();

insert into public.bitacora_alumno (
  alumno_id, tipo, titulo, detalle, ocurrido_en, origen_tipo, origen_id, datos
)
select p.alumno_id,
  case p.estado::text when 'CONFIRMADO' then 'pago_confirmado' when 'PENDIENTE' then 'pago_pendiente' else 'pago_estado_actualizado' end,
  case p.estado::text when 'CONFIRMADO' then 'Pago confirmado' when 'PENDIENTE' then 'Pago pendiente' else concat('Estado del pago: ', p.estado::text) end,
  concat(p.comprobante, ' · ', p.concepto, ' · $', p.importe::text),
  p.created_at, 'pago', p.id,
  jsonb_build_object('comprobante', p.comprobante, 'importe', p.importe, 'medio_pago', p.medio_pago, 'estado', p.estado::text)
from public.pagos p
where p.estado::text <> 'BORRADOR'
  and not exists (
    select 1 from public.bitacora_alumno b
    where b.origen_tipo = 'pago' and b.origen_id = p.id
  );

insert into public.bitacora_alumno (
  alumno_id, tipo, titulo, detalle, ocurrido_en, origen_tipo, origen_id, datos
)
select i.alumno_id,
  case i.estado::text when 'confirmado' then 'inscripcion_confirmada' else 'inscripcion_espera' end,
  case i.estado::text when 'confirmado' then 'Inscripción vigente' else 'Lista de espera' end,
  case i.estado::text when 'confirmado' then 'Inscripción activa al iniciar la bitácora.' else 'Inscripción en espera al iniciar la bitácora.' end,
  (to_jsonb(i) ->> 'created_at')::timestamptz, 'inscripcion', i.id,
  jsonb_build_object('turno_id', i.turno_id, 'estado', i.estado::text)
from public.inscripciones i
where i.estado::text in ('confirmado', 'en_espera')
  and coalesce(to_jsonb(i) ->> 'created_at', '') ~ '^\d{4}-\d{2}-\d{2}';

notify pgrst, 'reload schema';