alter table public.pagos
  add column if not exists external_payment_id text;

create index if not exists pagos_external_payment_id_idx
  on public.pagos (external_payment_id)
  where external_payment_id is not null;

notify pgrst, 'reload schema';