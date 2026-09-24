import { supabase } from '../lib/supabaseClient';

const PALABRAS_PROHIBIDAS = [
  'curso', 'test', 'prueba', 'asdf', 'admin', 'ninguno', 'falso', 'temporal'
];

// Validador y normalizador de Nombre del Curso
export const normalizarYValidarNombreCurso = (texto) => {
  if (!texto || texto.trim() === '') {
    return { valido: false, error: 'El nombre del curso es obligatorio.' };
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

  return { valido: true, textoLimpio: limpio };
};

// Normalizador de Descripción
export const normalizarDescripcion = (texto) => {
  if (!texto || texto.trim() === '') return { valido: true, textoLimpio: null };
  const limpio = texto.trim().replace(/\s+/g, ' ');
  return { valido: true, textoLimpio: limpio };
};

// Obtener todas las materias disponibles para el selector/checklist
export const getMateriasDisponibles = async () => {
  try {
    const { data, error } = await supabase
      .from('materias')
      .select('id, nombre')
      .order('nombre', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  } catch (err) {
    console.error('Error en getMateriasDisponibles:', err);
    throw err;
  }
};

// HU06: Listado de cursos de ingreso con sus materias asociadas
export const getCursosIngreso = async () => {
  try {
    const { data, error } = await supabase
      .from('cursos_ingreso')
      .select(`
        id,
        nombre,
        descripcion,
        created_at,
        curso_ingreso_materias (
          materia_id,
          materias (
            id,
            nombre
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  } catch (err) {
    console.error('Error en getCursosIngreso:', err);
    throw err;
  }
};

// HU06: Registro de curso de ingreso
export const createCursoIngreso = async ({ nombre, descripcion, materiasIds }) => {
  try {
    // 1. Criterio HU06: Exige un nombre válido
    const valNombre = normalizarYValidarNombreCurso(nombre);
    if (!valNombre.valido) throw new Error(valNombre.error);

    const valDesc = normalizarDescripcion(descripcion);

    // 2. Criterio HU06: Exige al menos una materia registrada y sin asociaciones repetidas
    if (!materiasIds || !Array.isArray(materiasIds)) {
      throw new Error('Debe proporcionar una lista válida de materias.');
    }

    const materiasUnicas = [...new Set(materiasIds.filter(Boolean))];

    if (materiasUnicas.length === 0) {
      throw new Error('El curso de ingreso debe tener al menos una materia asociada.');
    }

    // 3. Validar que no exista un curso con el mismo nombre
    const { data: cursoExistente } = await supabase
      .from('cursos_ingreso')
      .select('id')
      .ilike('nombre', valNombre.textoLimpio)
      .maybeSingle();

    if (cursoExistente) {
      throw new Error(`Ya existe un curso registrado con el nombre "${valNombre.textoLimpio}".`);
    }

    // 4. Insertar el curso
    const { data: nuevoCurso, error: errorCurso } = await supabase
      .from('cursos_ingreso')
      .insert([
        {
          nombre: valNombre.textoLimpio,
          descripcion: valDesc.textoLimpio,
        },
      ])
      .select()
      .single();

    if (errorCurso) throw new Error(errorCurso.message);

    // 5. Insertar las materias asociadas en la tabla intermedia
    const relaciones = materiasUnicas.map((materiaId) => ({
      curso_id: nuevoCurso.id,
      materia_id: materiaId,
    }));

    const { error: errorRelaciones } = await supabase
      .from('curso_ingreso_materias')
      .insert(relaciones);

    if (errorRelaciones) {
      // Rollback manual en caso de falla al asociar materias
      await supabase.from('cursos_ingreso').delete().eq('id', nuevoCurso.id);
      throw new Error(`Error al vincular las materias: ${errorRelaciones.message}`);
    }

    return nuevoCurso;
  } catch (err) {
    console.error('Fallo en createCursoIngreso:', err);
    throw err;
  }
};