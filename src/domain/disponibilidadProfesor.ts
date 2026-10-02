export type FranjaDocente = { franja: string; horaInicio: string; horaFin: string };

const RANGOS: Record<string, [string, string]> = {
  manana: ['08:00', '12:00'], tarde: ['14:00', '18:00'], noche: ['18:30', '22:30'],
};

function lista(valor: unknown): unknown[] {
  if (typeof valor === 'string') {
    try { valor = JSON.parse(valor); } catch { return [valor]; }
  }
  return Array.isArray(valor) ? valor : [];
}

function minutos(valor: unknown): number {
  const match = String(valor ?? '').match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return NaN;
  const [, hora, minuto, segundo = '0'] = match;
  return Number(hora) < 24 && Number(minuto) < 60 && Number(segundo) < 60
    ? Number(hora) * 3600 + Number(minuto) * 60 + Number(segundo)
    : NaN;
}

export function obtenerFranjasProfesor(profesor: { disponibilidad?: unknown; turnos?: unknown }): FranjaDocente[] {
  const detalle = lista(profesor.disponibilidad);
  const origen = detalle.length > 0 ? detalle : lista(profesor.turnos);
  return origen.map((valor) => {
    const fila = typeof valor === 'object' && valor !== null ? valor as Record<string, unknown> : { franja: valor };
    const franja = String(fila.franja ?? '');
    const clave = franja.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    const rango = RANGOS[clave];
    return { franja, horaInicio: String(fila.horaInicio ?? rango?.[0] ?? ''), horaFin: String(fila.horaFin ?? rango?.[1] ?? '') };
  });
}

export function validarHorarioProfesor(profesor: { disponibilidad?: unknown; turnos?: unknown }, inicio: string, fin: string): string | null {
  const desde = minutos(inicio);
  const hasta = minutos(fin);
  if (!Number.isFinite(desde) || !Number.isFinite(hasta) || desde >= hasta) {
    return 'El horario debe ser válido y la finalización posterior al inicio.';
  }
  const franjas = obtenerFranjasProfesor(profesor);
  if (!franjas.length) return 'El profesor no tiene disponibilidad horaria configurada. Configurala antes de programar una clase.';
  if (!franjas.some((f) => desde >= minutos(f.horaInicio) && hasta <= minutos(f.horaFin))) {
    return 'El horario seleccionado queda fuera de la disponibilidad del profesor. Franjas habilitadas: '
      + franjas.map((f) => f.franja + ' (' + f.horaInicio + ' a ' + f.horaFin + ')').join(', ') + '.';
  }
  return null;
}
