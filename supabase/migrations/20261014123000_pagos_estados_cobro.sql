alter table public.pagos
  drop constraint if exists pagos_estado_check;

alter table public.pagos
  add constraint pagos_estado_check
  check (estado in (
    'CONFIRMADO',
    'PENDIENTE',
    'RECHAZADO',
    'BORRADOR',
    'CANCELADO',
    'ANULADO'
  )) not valid;

notify pgrst, 'reload schema';