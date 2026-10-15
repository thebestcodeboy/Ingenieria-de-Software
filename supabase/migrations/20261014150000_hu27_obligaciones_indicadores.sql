-- HU27: fuente mínima de obligaciones para calcular morosidad real.
-- La administración cotidiana de estas obligaciones queda fuera del alcance de HU27.
create table if not exists public.obligaciones_pago (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references public.alumnos(id) on delete restrict,
  curso_id uuid references public.cursos_ingreso(id) on delete set null,
  materia_id uuid references public.materias(id) on delete set null,
  actividad_nombre text not null check (btrim(actividad_nombre) <> ''),
  concepto text not null check (btrim(concepto) <> ''),
  importe_original numeric(12,2) not null check (importe_original > 0),
  saldo_pendiente numeric(12,2) not null check (saldo_pendiente >= 0 and saldo_pendiente <= importe_original),
  fecha_emision date not null,
  fecha_vencimiento date not null,
  estado text not null default 'PENDIENTE'
    check (estado in ('PENDIENTE', 'PARCIAL', 'PAGADA', 'ANULADA')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint obligaciones_pago_fechas_validas check (fecha_vencimiento >= fecha_emision)
);

create index if not exists obligaciones_pago_alumno_idx
  on public.obligaciones_pago (alumno_id);
create index if not exists obligaciones_pago_vencimiento_idx
  on public.obligaciones_pago (fecha_vencimiento)
  where saldo_pendiente > 0 and estado in ('PENDIENTE', 'PARCIAL');

alter table public.obligaciones_pago enable row level security;
revoke all on table public.obligaciones_pago from anon, authenticated;
grant select on table public.obligaciones_pago to authenticated;

drop policy if exists obligaciones_pago_lectura_gerencia on public.obligaciones_pago;
create policy obligaciones_pago_lectura_gerencia
on public.obligaciones_pago
for select
to authenticated
using (
  lower(coalesce(
    (select auth.jwt()) -> 'app_metadata' ->> 'rol',
    (select auth.jwt()) -> 'app_metadata' ->> 'role',
    ''
  )) in ('gerente', 'gerencia')
);

create or replace function public.obtener_indicadores_financieros_hu27()
returns jsonb
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_rol text;
  v_pagos jsonb;
  v_obligaciones jsonb;
begin
  select lower(coalesce(u.raw_app_meta_data ->> 'rol', u.raw_app_meta_data ->> 'role', ''))
    into v_rol
  from auth.users u
  where u.id = (select auth.uid());

  if v_rol not in ('gerente', 'gerencia') then
    raise exception using errcode = '42501', message = 'ACCESO_RESTRINGIDO_GERENCIA';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'alumno_id', p.alumno_id,
    'fecha', p.fecha,
    'importe', p.importe,
    'medio_pago', p.medio_pago,
    'estado', p.estado,
    'concepto', p.concepto,
    'detalle_academico', p.detalle_academico
  ) order by p.fecha), '[]'::jsonb)
  into v_pagos
  from public.pagos p;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', o.id,
    'alumno_id', o.alumno_id,
    'alumno_nombre', trim(concat_ws(', ', a.apellido, a.nombre)),
    'actividad_nombre', o.actividad_nombre,
    'importe_original', o.importe_original,
    'saldo_pendiente', o.saldo_pendiente,
    'fecha_vencimiento', o.fecha_vencimiento,
    'estado', o.estado
  ) order by o.fecha_vencimiento), '[]'::jsonb)
  into v_obligaciones
  from public.obligaciones_pago o
  join public.alumnos a on a.id = o.alumno_id
  where o.estado <> 'ANULADA';

  return jsonb_build_object(
    'pagos', v_pagos,
    'obligaciones', v_obligaciones
  );
end;
$$;

revoke all on function public.obtener_indicadores_financieros_hu27() from public, anon;
grant execute on function public.obtener_indicadores_financieros_hu27() to authenticated;

comment on table public.obligaciones_pago is
  'Obligaciones mínimas requeridas por HU27 para medir deuda pendiente y antigüedad.';
comment on function public.obtener_indicadores_financieros_hu27() is
  'Entrega pagos y obligaciones al rol Gerencia para los indicadores de HU27.';

notify pgrst, 'reload schema';
