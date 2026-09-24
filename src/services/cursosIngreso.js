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

// Registro de curso de ingreso
export const createCursoIngreso = async ({ nombre, descripcion, materiasIds }) => {
  try {
    const valNombre = normalizarYValidarNombreCurso(nombre);
    if (!valNombre.valido) throw new Error(valNombre.error);

    const valDesc = normalizarDescripcion(descripcion);

    if (!materiasIds || !Array.isArray(materiasIds)) {
      throw new Error('Debe proporcionar una lista válida de materias.');
    }

    const materiasUnicas = [...new Set(materiasIds.filter(Boolean))];

    if (materiasUnicas.length === 0) {
      throw new Error('El curso de ingreso debe tener al menos una materia asociada.');
    }

    // Validar duplicados por nombre
    const { data: cursoExistente } = await supabase
      .from('cursos_ingreso')
      .select('id')
      .ilike('nombre', valNombre.textoLimpio)
      .maybeSingle();

    if (cursoExistente) {
      throw new Error(`Ya existe un curso registrado con el nombre "${valNombre.textoLimpio}".`);
    }

    // Insertar curso
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

    // Insertar relaciones
    const relaciones = materiasUnicas.map((materiaId) => ({
      curso_id: nuevoCurso.id,
      materia_id: materiaId,
    }));

    const { error: errorRelaciones } = await supabase
      .from('curso_ingreso_materias')
      .insert(relaciones);

    if (errorRelaciones) {
      await supabase.from('cursos_ingreso').delete().eq('id', nuevoCurso.id);
      throw new Error(`Error al vincular las materias: ${errorRelaciones.message}`);
    }

    return nuevoCurso;
  } catch (err) {
    console.error('Fallo en createCursoIngreso:', err);
    throw err;
  }
};