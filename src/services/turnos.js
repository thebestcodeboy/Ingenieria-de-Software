import { supabase } from '../lib/supabaseClient';

export const obtenerDatosTurnos = async () => {
  const [cursosRes, particularesRes, materiasRes, profesoresRes, profesorMateriaRes, cursoMateriaRes, aulasRes, turnosRes] = await Promise.all([
    supabase.from('cursos_ingreso').select('id, nombre').order('nombre'),
    supabase.from('clases_particulares').select('id, nombre, materia_id, nivel, materias ( id, nombre )').order('nombre'),
    supabase.from('materias').select('id, nombre').order('nombre'),
    supabase.from('profesores').select('id, nombre, apellido').order('apellido').order('nombre'),
    supabase.from('profesor_materia').select('profesor_id, materia_id'),
    supabase.from('curso_ingreso_materias').select('curso_id, materia_id'),
    supabase.from('aulas').select('numero, descripcion').order('numero'),
    supabase.from('turnos_clase').select('id, materia_id, profesor_id, curso_id, clase_particular_id, aula_numero, fecha, hora_inicio, hora_fin, created_at').order('fecha').order('hora_inicio')
  ]);

  const response = [cursosRes, particularesRes, materiasRes, profesoresRes, profesorMateriaRes, cursoMateriaRes, aulasRes, turnosRes];
  const failed = response.find((result) => result.error);
  if (failed) throw failed.error;

  return {
    cursos: cursosRes.data || [],
    particulares: particularesRes.data || [],
    materias: materiasRes.data || [],
    profesores: profesoresRes.data || [],
    profesorMaterias: profesorMateriaRes.data || [],
    cursoMaterias: cursoMateriaRes.data || [],
    aulas: aulasRes.data || [],
    turnos: turnosRes.data || []
  };
};

export const registrarTurno = async ({ actividadTipo, actividadId, materiaId, profesorId, aulaNumero, fecha, horaInicio, horaFin }) => {
  const turno = {
    materia_id: materiaId,
    profesor_id: profesorId,
    aula_numero: Number(aulaNumero),
    fecha,
    hora_inicio: horaInicio,
    hora_fin: horaFin,
    curso_id: actividadTipo === 'curso' ? actividadId : null,
    clase_particular_id: actividadTipo === 'particular' ? actividadId : null
  };

  const { data, error } = await supabase
    .from('turnos_clase')
    .insert(turno)
    .select('id, materia_id, profesor_id, curso_id, clase_particular_id, aula_numero, fecha, hora_inicio, hora_fin, created_at')
    .single();

  if (error) throw error;
  return data;
};
