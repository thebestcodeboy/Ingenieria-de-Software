import { supabase } from '../lib/supabaseClient';

/**
 * Obtiene todos los turnos del instituto dentro de un rango de fechas
 * consumiendo directamente vista_calendario.
 */
export async function getCalendarioAdmin(desde, hasta) {
  const { data, error } = await supabase
    .from('vista_calendario')
    .select('*')
    .gte('fecha', desde)
    .lte('fecha', hasta)
    .order('fecha', { ascending: true })
    .order('hora_inicio', { ascending: true });

  if (error) {
    console.error('Error al obtener calendario institucional:', error);
    throw new Error('No se pudo cargar la agenda institucional.');
  }

  return data || [];
}

/**
 * Trae la nómina de alumnos inscriptos para el modal de detalle.
 */
export async function getInscriptosTurno(turnoId) {
  const { data, error } = await supabase
    .from('inscripciones')
    .select(`
      id,
      fecha_inscripcion,
      alumnos (
        id,
        nombre,
        apellido,
        dni,
        telefono,
        legajo
      )
    `)
    .eq('turno_id', turnoId);

  if (error) {
    console.error('Error al obtener alumnos inscriptos:', error);
    throw new Error('No se pudo cargar la lista de inscriptos.');
  }

  return (data || []).map((ins) => ({
    inscripcionId: ins.id,
    alumnoId: ins.alumnos?.id,
    nombre: ins.alumnos?.nombre,
    apellido: ins.alumnos?.apellido,
    dni: ins.alumnos?.dni,
    telefono: ins.alumnos?.telefono,
    legajo: ins.alumnos?.legajo,
  }));
}