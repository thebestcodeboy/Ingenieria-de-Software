-- Los conceptos incluyen actividad, materias, docente y período; pueden superar
-- el límite heredado de 150 caracteres al guardar o actualizar un cobro.
alter table public.pagos
  alter column concepto type text using concepto::text;

notify pgrst, 'reload schema';
