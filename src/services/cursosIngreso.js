import { validarPeriodoCurso } from '../domain/periodoCurso';
import { supabase } from '../lib/supabaseClient';

const PALABRAS_PROHIBIDAS = [
  'curso', 'test', 'prueba', 'asdf', 'admin', 'ninguno', 'falso', 'temporal'
];

// Validador y normalizador de Nombre del Curso (Bloquea números estrictamente)
export const normalizarYValidarNombreCurso = (texto) => {
  if (!texto || typeof texto !== 'string' || texto.trim() === '') {
    return { valido: false, error: 'El nombre del curso es obligatorio.' };
  }

  if (/\d/.test(texto)) {
    return { valido: false, error: 'El nombre del curso no puede contener números. Use la descripción para indicar años o cohortes.' };
  }

  const limpio = texto.trim().replace(/\s+/g, ' ');

  if (limpio.length < 4) {
    return { valido: false, error: 'El nombre del curso debe tener al menos 4 caracteres.' };
  }

  const palabras = limpio.split(' ');
  for (const p of palabras) {
    const min = p.toLowerCase();
    if (PALABRAS_PROHIBIDAS.includes(min)) {
      return { valido: false, error: `"${p}" no es un nombre de curso válido.` };
    }
    if (
      /(\w{2,3})\1{1,}/.test(min) || 
      /asdf|qwer|zxcv|hjkl|dasd|dada/.test(min)
    ) {
      return { valido: false, error: `El nombre contiene una secuencia de prueba no permitida ("${p}").` };
    }
  }

  return { valido: true, textoLimpio: limpio.toUpperCase() };
};

// Normalizador de Descripción (Permite números, ej: 2027)
export const normalizarDescripcion = (texto) => {
  if (!texto || typeof texto !== 'string' || texto.trim() === '') return { valido: true, textoLimpio: null };
  const limpio = texto.trim().replace(/\s+/g, ' ');
  return { valido: true, textoLimpio: limpio };
};

// Obtener exclusivamente materias de NIVEL UNIVERSITARIO (Filtro seguro en JS)
export const getMateriasDisponibles = async () => {
  try {
    const { data, error } = await supabase
      .from('materias')
      .select('id, nombre, nivel')
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (error) throw new Error(error.message);
    
    // Filtrar estrictamente en memoria para descartar cualquier rastro de secundario
    const soloUniversitarias = (data || []).filter((m) => {
      const niv = (m.nivel || '').toLowerCase();
      return niv.includes('univ') && !niv.includes('secun');
    });

    return soloUniversitarias;
  } catch (err) {
    console.error('Error en getMateriasDisponibles:', err);
    throw err;
  }
};

// Listado de cursos de ingreso con sus materias asociadas
export const getCursosIngreso = async () => {
  try {
    const { data: cursosData, error: cursoError } = await supabase
      .from('cursos_ingreso')
      .select('*')
      .order('created_at', { ascending: false });

    if (cursoError) throw new Error(cursoError.message);
    if (!cursosData || cursosData.length === 0) return [];

    const { data: relacionesData, error: relError } = await supabase
      .from('curso_ingreso_materias')
      .select(`
        curso_id,
        materia_id,
        materias (
          id,
          nombre,
          nivel
        )
      `);

    if (relError) {
      console.warn('Aviso al traer relaciones de materias:', relError.message);
    }

    const cursosMapeados = cursosData.map((curso) => {
      const relsDelCurso = (relacionesData || []).filter(
        (r) => String(r.curso_id) === String(curso.id)
      );
      return {
        ...curso,
        curso_ingreso_materias: relsDelCurso,
      };
    });

    return cursosMapeados;
  } catch (err) {
    console.error('Error en getCursosIngreso:', err);
    throw err;
  }
};

export const cambiarEstadoCursoIngreso = async (id, activo) => {
  const { data, error } = await supabase
    .from('cursos_ingreso')
    .update({ activo })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message || 'No se pudo cambiar el estado del curso.');
  return data;
};

// El curso y sus materias se guardan en una única transacción de Supabase.
async function guardarCursoIngreso({ nombre, descripcion, materiasIds, fechaInicio, fechaFin, activo = true }, cursoId = null) {
  const errorPeriodo = validarPeriodoCurso(fechaInicio, fechaFin);
  if (errorPeriodo) throw new Error(errorPeriodo);
  const valNombre = normalizarYValidarNombreCurso(nombre);
  if (!valNombre.valido) throw new Error(valNombre.error);
  if (!Array.isArray(materiasIds) || !materiasIds.filter(Boolean).length) {
    throw new Error('Seleccioná al menos una materia universitaria.');
  }
  const { data, error } = await supabase.rpc('guardar_curso_ingreso', {
    p_nombre: valNombre.textoLimpio,
    p_descripcion: normalizarDescripcion(descripcion).textoLimpio,
    p_fecha_inicio: fechaInicio, p_fecha_fin: fechaFin,
    p_materias: [...new Set(materiasIds.filter(Boolean))],
    p_activo: activo, p_curso_id: cursoId,
  });
  if (error) {
    if (error.code === 'PGRST202') throw new Error('Falta instalar la actualización de guardado de cursos en Supabase.');
    throw new Error(error.message || 'No se pudo guardar el curso.');
  }
  const curso = Array.isArray(data) ? data[0] : data;
  if (!curso || (cursoId !== null && String(curso.id) !== String(cursoId))
      || curso.fecha_inicio !== fechaInicio || curso.fecha_fin !== fechaFin || curso.activo !== activo) {
    throw new Error('Supabase no confirmó todos los cambios del curso. Actualizá el listado antes de reintentar.');
  }
  return curso;
}
export const createCursoIngreso = (datos) => guardarCursoIngreso(datos);
export const updateCursoIngreso = (id, datos) => guardarCursoIngreso(datos, id);
