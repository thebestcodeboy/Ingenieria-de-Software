-- Elimina exclusivamente los pagos creados por hu27_datos_comparativos.sql.
delete from public.pagos
where comprobante like 'DEMO-HU27-%'
  and observaciones = 'Datos demostrativos HU27; eliminar después de la presentación.';

select count(*) as pagos_demo_restantes
from public.pagos
where comprobante like 'DEMO-HU27-%';
