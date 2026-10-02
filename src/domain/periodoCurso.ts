function fechaValida(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const valor = new Date(fecha + 'T00:00:00Z');
  return Number.isFinite(valor.getTime()) && valor.toISOString().slice(0,10) === fecha;
}
export function validarPeriodoCurso(inicio?: string | null, fin?: string | null): string | null {
  if (!inicio || !fin) return 'Completá las fechas de inicio y finalización del curso.';
  if (!fechaValida(inicio) || !fechaValida(fin)) return 'Las fechas del curso no son válidas.';
  if (fin < inicio) return 'La fecha de finalización no puede ser anterior al inicio.';
  return null;
}
export function validarFechaCurso(fecha: string, inicio?: string | null, fin?: string | null): string | null {
  const error = validarPeriodoCurso(inicio, fin);
  if (error) return error;
  if (!fechaValida(fecha) || fecha < inicio! || fecha > fin!) return 'La clase debe estar dentro del período del curso: ' + inicio + ' al ' + fin + '.';
  return null;
}
export function duracionCurso(inicio?: string | null, fin?: string | null): string {
  if (validarPeriodoCurso(inicio, fin)) return 'Período pendiente de configurar';
  const dias = Math.round((Date.parse(fin! + 'T00:00:00Z') - Date.parse(inicio! + 'T00:00:00Z')) / 86400000) + 1;
  return dias + (dias === 1 ? ' día' : ' días');
}
