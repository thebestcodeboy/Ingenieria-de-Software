import { supabase } from '../lib/supabaseClient';

/**
 * Obtiene todos los turnos del instituto dentro de un rango de fechas
 * consumiendo directamente vista_calendario (incluyendo estado).
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
 * Trae la nómina de alumnos inscriptos para el modal de detalle de forma resiliente.
 */
export async function getInscriptosTurno(turnoId) {
  try {
    // 1. Intentar join directo con alumnos
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

    if (!error && Array.isArray(data)) {
      return data.map((ins) => ({
        inscripcionId: ins.id,
        alumnoId: ins.alumnos?.id,
        nombre: ins.alumnos?.nombre || 'Sin nombre',
        apellido: ins.alumnos?.apellido || '',
        dni: ins.alumnos?.dni || '-',
        telefono: ins.alumnos?.telefono || '-',
        legajo: ins.alumnos?.legajo || '-',
      }));
    }

    // 2. Fallback de contingencia si la relación directa en Supabase no resuelve el alias
    const { data: inscripcionesPlanos, error: errPlanos } = await supabase
      .from('inscripciones')
      .select('id, alumno_id')
      .eq('turno_id', turnoId);

    if (errPlanos || !inscripcionesPlanos || inscripcionesPlanos.length === 0) {
      return [];
    }

    const idsAlumnos = inscripcionesPlanos.map((i) => i.alumno_id).filter(Boolean);
    if (idsAlumnos.length === 0) return [];

    const { data: alumnosData } = await supabase
      .from('alumnos')
      .select('id, nombre, apellido, dni, telefono, legajo')
      .in('id', idsAlumnos);

    const mapaAlumnos = new Map((alumnosData || []).map((a) => [a.id, a]));

    return inscripcionesPlanos.map((ins) => {
      const al = mapaAlumnos.get(ins.alumno_id);
      return {
        inscripcionId: ins.id,
        alumnoId: ins.alumno_id,
        nombre: al?.nombre || 'Sin nombre',
        apellido: al?.apellido || '',
        dni: al?.dni || '-',
        telefono: al?.telefono || '-',
        legajo: al?.legajo || '-',
      };
    });
  } catch (err) {
    console.error('Error al resolver alumnos inscriptos:', err);
    return [];
  }
}