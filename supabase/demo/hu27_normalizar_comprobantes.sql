-- Renumera datos demostrativos ya cargados con formato DEMO-HU27-*.
-- Conserva año, fecha, importes y el resto de la información original.
begin;

with maximos as (
  select substring(comprobante from 5 for 4)::integer as anio,
         max(split_part(comprobante, '-', 3)::integer) as ultimo
  from public.pagos
  where comprobante ~ '^REC-[0-9]{4}-[0-9]+$'
  group by 1
),
numerados as (
  select p.id, extract(year from p.fecha)::integer as anio,
         row_number() over (partition by extract(year from p.fecha) order by p.fecha, p.comprobante, p.id) as numero
  from public.pagos p
  where p.comprobante like 'DEMO-HU27-%'
    and p.observaciones = 'Datos demostrativos HU27; eliminar después de la presentación.'
),
nuevos as (
  select n.id,
         'REC-' || n.anio || '-' || lpad((coalesce(m.ultimo, 0) + n.numero)::text, 4, '0') as comprobante
  from numerados n
  left join maximos m on m.anio = n.anio
)
update public.pagos p
set comprobante = n.comprobante
from nuevos n
where p.id = n.id;

commit;

select comprobante, fecha, importe
from public.pagos
where observaciones = 'Datos demostrativos HU27; eliminar después de la presentación.'
order by fecha, comprobante;
