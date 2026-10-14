-- Datos demostrativos para HU27. Ejecutar manualmente en Supabase SQL Editor.
-- Inserta 120 cobros confirmados: 6 por mes durante 2025 y enero-agosto de 2026.
-- Es repetible y genera comprobantes con formato REC-AAAA-####.

begin;

do $$
begin
  if not exists (select 1 from public.alumnos where coalesce(activo, true)) then
    raise exception 'Se necesita al menos un alumno activo para cargar la demostración de HU27.';
  end if;
end;
$$;

-- Estos pagos históricos son sintéticos y no poseen una inscripción histórica real.
-- Se omite solamente la validación académica durante esta carga controlada.
alter table public.pagos disable trigger validar_vinculo_academico_pago;

with meses as (
  select fecha::date, row_number() over (order by fecha)::integer as numero
  from generate_series(date '2025-01-01', date '2026-08-01', interval '1 month') fecha
),
alumnos_demo as (
  select id, row_number() over (order by apellido, nombre, id)::integer as numero,
         count(*) over ()::integer as cantidad
  from public.alumnos
  where coalesce(activo, true)
),
conceptos(orden, actividad, importe_base, medio_pago) as (
  values
    (1, 'Curso de ingreso: INGENIERÍA UNC', 40000::numeric, 'Transferencia'::text),
    (2, 'Curso de ingreso: KINESIOLOGÍA UCASAL', 50000::numeric, 'Efectivo'::text),
    (3, 'Clase particular: APOYO DE MATEMÁTICA', 20000::numeric, 'Tarjeta de Débito'::text),
    (4, 'Abono Semanal de Cursada (6 Semanas)', 30000::numeric, 'Efectivo'::text),
    (5, 'Curso de ingreso: MEDICINA', 60000::numeric, 'Mercado Pago'::text),
    (6, 'Curso de ingreso: ENFERMERÍA', 45000::numeric, 'Tarjeta de Crédito'::text)
),
filas_base as (
  select
    a.id as alumno_id,
    c.actividad || ' · Datos demostrativos' as concepto,
    round(
      c.importe_base
      * (0.90 + ((m.numero + c.orden) % 6) * 0.05)
      * case when extract(year from m.fecha) = 2026 then 1.10 else 1 end,
      2
    ) as importe,
    c.medio_pago,
    (m.fecha + (3 + c.orden * 3))::date as fecha,
    jsonb_build_object(
      'actividad', c.actividad,
      'docente', 'Datos demostrativos HU27',
      'materias', case when c.orden = 1 then jsonb_build_array('ÁLGEBRA', 'ANÁLISIS MATEMÁTICO I')
                       when c.orden in (2, 5) then jsonb_build_array('ANATOMÍA')
                       when c.orden = 6 then jsonb_build_array('BIOLOGÍA')
                       else jsonb_build_array('MATEMÁTICA') end,
      'inscripciones', '[]'::jsonb
    ) as detalle_academico
  from meses m
  cross join conceptos c
  join alumnos_demo a on a.numero = ((m.numero + c.orden - 2) % a.cantidad) + 1
),
pendientes as (
  select f.*, extract(year from f.fecha)::integer as anio
  from filas_base f
  where not exists (
    select 1 from public.pagos p
    where p.observaciones = 'Datos demostrativos HU27; eliminar después de la presentación.'
      and p.fecha = f.fecha
      and p.detalle_academico ->> 'actividad' = f.detalle_academico ->> 'actividad'
  )
),
maximos as (
  select substring(comprobante from 5 for 4)::integer as anio,
         max(split_part(comprobante, '-', 3)::integer) as ultimo
  from public.pagos
  where comprobante ~ '^REC-[0-9]{4}-[0-9]+$'
  group by 1
),
filas as (
  select p.*,
    'REC-' || p.anio || '-' || lpad((coalesce(m.ultimo, 0) + row_number() over (partition by p.anio order by p.fecha, p.concepto))::text, 4, '0') as comprobante
  from pendientes p
  left join maximos m on m.anio = p.anio
)
insert into public.pagos (
  comprobante, alumno_id, concepto, modalidad, cantidad, importe,
  medio_pago, fecha, estado, observaciones, detalle_academico
)
select
  f.comprobante, f.alumno_id, f.concepto, 'Mes', 1, f.importe,
  f.medio_pago, f.fecha, 'CONFIRMADO', 'Datos demostrativos HU27; eliminar después de la presentación.', f.detalle_academico
from filas f;

alter table public.pagos enable trigger validar_vinculo_academico_pago;

commit;

-- Verificación rápida:
select extract(year from fecha)::integer as anio,
       extract(month from fecha)::integer as mes,
       count(*) as pagos,
       sum(importe) as total
from public.pagos
where observaciones = 'Datos demostrativos HU27; eliminar después de la presentación.'
group by 1, 2
order by 1, 2;
