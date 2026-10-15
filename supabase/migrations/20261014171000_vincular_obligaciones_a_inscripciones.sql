alter table public.obligaciones_pago
  add column if not exists inscripcion_id uuid references public.inscripciones(id) on delete restrict,
  add column if not exists periodo_desde date,
  add column if not exists periodo_hasta date;

alter table public.obligaciones_pago
  drop constraint if exists obligaciones_pago_periodo_valido;

alter table public.obligaciones_pago
  add constraint obligaciones_pago_periodo_valido
  check (periodo_desde is null or periodo_hasta is null or periodo_hasta >= periodo_desde);

notify pgrst, 'reload schema';
