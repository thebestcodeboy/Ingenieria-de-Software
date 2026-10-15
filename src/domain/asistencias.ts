export const etiquetasAsistencia = { asistio: 'Asistió', falto: 'Faltó', cancelada: 'Clase cancelada', sin_registrar: 'Sin registrar' };
export type EstadoAsistencia = keyof typeof etiquetasAsistencia;
export type VersionAsistencia = { id: string; version: number; estado: EstadoAsistencia; nota: string | null; observacion: string | null; motivo: string | null; autor_id: string; autor_nombre?: string | null; cargado_en: string };
export type FilaAsistencia = { inscripcion_id: string; turno_id: string; alumno_id: string; alumno: string; inscripcion_estado: string; fecha: string; hora_inicio: string | null; materia_id: string; materia: string; actividad: string; editable: boolean; cancelada: boolean; versiones: VersionAsistencia[] };
export function estadoVigente(fila: FilaAsistencia): EstadoAsistencia { return fila.versiones[0]?.estado ?? (fila.cancelada ? 'cancelada' : 'sin_registrar'); }
export function filtrarAsistencias(filas: FilaAsistencia[], filtros: { alumno?: string; materia?: string; desde?: string; hasta?: string; estado?: string; turno?: string }) {
 return filas.filter(f => (!filtros.alumno || f.alumno_id === filtros.alumno) && (!filtros.materia || f.materia_id === filtros.materia) && (!filtros.desde || f.fecha >= filtros.desde) && (!filtros.hasta || f.fecha <= filtros.hasta) && (!filtros.estado || estadoVigente(f) === filtros.estado) && (!filtros.turno || f.turno_id === filtros.turno));
}
export function resumirAsistencias(filas: FilaAsistencia[]) {
 const resumen = { asistio: 0, falto: 0, cancelada: 0, sin_registrar: 0 };
 for (const fila of filas) resumen[estadoVigente(fila)]++;
 return resumen;
}
