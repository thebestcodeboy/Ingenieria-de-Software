export function generarFechasSemanales(fechaInicio: string, meses: number): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaInicio) || !Number.isInteger(meses) || meses < 1 || meses > 12) {
    throw new Error('La fecha inicial o la duración de la repetición no son válidas.');
  }

  const [anio, mes, dia] = fechaInicio.split('-').map(Number);
  const inicio = new Date(Date.UTC(anio, mes - 1, dia));
  if (inicio.toISOString().slice(0, 10) !== fechaInicio) {
    throw new Error('La fecha inicial no es válida.');
  }

  const mesFinal = mes - 1 + meses;
  const ultimoDiaMesFinal = new Date(Date.UTC(anio, mesFinal + 1, 0)).getUTCDate();
  const fin = Date.UTC(anio, mesFinal, Math.min(dia, ultimoDiaMesFinal));
  const fechas: string[] = [];

  for (let fecha = inicio.getTime(); fecha < fin; fecha += 7 * 24 * 60 * 60 * 1000) {
    fechas.push(new Date(fecha).toISOString().slice(0, 10));
  }

  return fechas;
}