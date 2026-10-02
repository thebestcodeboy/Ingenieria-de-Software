-- La validación debe consultar las filas reales, sin que RLS las oculte.
-- FOR UPDATE requiere permisos de actualización aunque no modifique el curso.
-- Estas funciones solo validan registros desde sus triggers; no guardan cursos
-- ni conceden permisos adicionales de escritura a las cuentas de la aplicación.
begin;

alter function public.validar_fecha_turno_curso() security definer;
alter function public.validar_fecha_turno_curso() set search_path = '';
revoke all on function public.validar_fecha_turno_curso() from public, anon, authenticated;

-- También evita que RLS oculte clases existentes al cambiar el período.
alter function public.validar_periodo_curso_ingreso() security definer;
alter function public.validar_periodo_curso_ingreso() set search_path = '';
revoke all on function public.validar_periodo_curso_ingreso() from public, anon, authenticated;

notify pgrst, 'reload schema';
commit;
