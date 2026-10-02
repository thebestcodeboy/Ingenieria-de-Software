import { supabase } from '../lib/supabaseClient';

export type AlumnoInscripcion = { id: string; nombre: string; apellido: string; dni: string | null; legajo: string | null };
export type CursoInscripcion = { id: string; nombre: string; fecha_inicio: string; fecha_fin: string };
export type SesionInscripcion = {
  id: string; curso_id: string; profesor_id: string; docente: string; materia: string | null;
  fecha: string; hora_inicio: string; hora_fin: string; cupo_maximo: number | null; confirmados: number;
};
export type OpcionesInscripcion = { alumnos: AlumnoInscripcion[]; cursos: CursoInscripcion[]; sesiones: SesionInscripcion[] };
export type ResultadoInscripcion = { inscripcion_id: string; turno_id: string; fecha: string; estado: string };

function mensajeError(error: { code?: string; message: string }) {
  if (error.code === '42883' && error.message.includes('inscribir_alumno_curso')) return 'Falta actualizar la función de inscripción en Supabase. Aplicá la migración de inscripción administrativa autónoma.';
  if (error.code === 'PGRST202') return 'Falta aplicar la migración de inscripciones administrativas en Supabase.';
  if (error.message.includes('CUPO_NO_DEFINIDO')) return 'Hay clases sin cupo configurado. Completá sus cupos antes de inscribir.';
  if (error.message.includes('CURSO_SIN_TURNOS_FUTUROS')) return 'Este curso y docente no tienen clases futuras disponibles.';
  if (error.message.includes('ALUMNO_INACTIVO')) return 'El alumno está inactivo.';
  return error.message;
}

export async function listarOpcionesInscripcion(): Promise<OpcionesInscripcion> {
  const { data, error } = await supabase.rpc('opciones_inscripciones_administrativas');
  if (error) throw new Error(mensajeError(error));
  if (!data) throw new Error('No se pudieron obtener las opciones de inscripción.');
  return data as OpcionesInscripcion;
}

export async function inscribirAlumnoCursoAdministrativo(cursoId: string, profesorId: string, alumnoId: string): Promise<ResultadoInscripcion[]> {
  if (!cursoId || !profesorId || !alumnoId) throw new Error('Seleccioná alumno, curso y docente.');
  const { data, error } = await supabase.rpc('inscribir_alumno_curso_administrativo', {
    p_curso_id: cursoId, p_profesor_id: profesorId, p_alumno_id: alumnoId,
  });
  if (error) throw new Error(mensajeError(error));
  if (!data?.length) throw new Error('No se registraron sesiones. Revisá la programación del curso.');
  return data as ResultadoInscripcion[];
}
