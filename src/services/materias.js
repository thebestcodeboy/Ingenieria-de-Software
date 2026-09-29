import { supabase } from '../lib/supabaseClient';

/**
 * Obtener todas las carreras registradas
 */
export async function getCarreras() {
  const { data, error } = await supabase
    .from('carreras')
    .select('*')
    .order('nombre', { ascending: true });

  if (error) {
    console.error('Error al obtener carreras:', error);
    throw new Error(`No se pudieron cargar las carreras: ${error.message}`);
  }
  return data || [];
}

/**
 * Obtener todas las materias registradas junto con sus carreras asociadas (HU17)
 */
export async function getMaterias() {
  const { data: materias, error: errMaterias } = await supabase
    .from('materias')
    .select('*')
    .order('nombre', { ascending: true });

  if (errMaterias) {
    console.error('Error al obtener materias:', errMaterias);
    throw new Error(`No se pudieron cargar las materias: ${errMaterias.message}`);
  }

  if (!materias || materias.length === 0) return [];

  // Obtener relaciones con carreras
  const { data: relaciones, error: errRel } = await supabase
    .from('carrera_materias')
    .select('materia_id, carrera_id, carreras(id, nombre)');

  if (errRel) {
    console.error('Error al obtener relaciones de carreras:', errRel);
    throw new Error(`No se pudieron cargar las carreras asociadas: ${errRel.message}`);
  }

  // Mapear materias adjuntando sus carreras correspondientes
  return materias.map((mat) => {
    const relsMateria = (relaciones || []).filter((r) => String(r.materia_id) === String(mat.id));
    const carrerasAsociadas = relsMateria.map((r) => r.carreras).filter(Boolean);
    return {
      ...mat,
      carreras: carrerasAsociadas,
      carreras_ids: carrerasAsociadas.map((c) => c.id)
    };
  });
}

/**
 * Validar formato de texto de materia
 */
function validarNombreMateria(nombre) {
  const limpio = (nombre || '').trim().replace(/\s+/g, ' ');
  if (!limpio) return { error: 'El nombre de la materia es obligatorio.' };
  if (limpio.length < 3) return { error: 'El nombre de la materia debe tener al menos 3 caracteres.' };

  const palabras = limpio.split(' ');
  const nexosPermitidos = ['a', 'y', 'e', 'o', 'u', 'de', 'del', 'la', 'las', 'los', 'el', 'en', 'al', 'con', 'por', 'para'];
  const numeroRomano = /^(i{1,3}|iv|v|vi{1,3}|ix|x)$/i;
  const secuenciasBasura = ['asdf', 'qwer', 'zxcv', '1234', 'prueba'];

  for (const palabra of palabras) {
    const p = palabra.toLowerCase();

    // Números romanos (I, II, III, IV...) y nexos comunes son válidos
    if (numeroRomano.test(p) || nexosPermitidos.includes(p)) continue;

    if (p.length < 3) {
      return { error: `"${palabra}" no parece una palabra válida.` };
    }
    // Misma letra 3 veces seguidas (aaa) o secuencias de teclado
    if (/(.)\1{2,}/.test(p) || secuenciasBasura.some((s) => p.includes(s)) || /^\d+$/.test(p)) {
      return { error: 'El nombre de la materia contiene secuencias o números no permitidos.' };
    }
  }
  return { limpio: limpio.toUpperCase() };
}

/**
 * Validaciones comunes a alta y modificación
 */
function validarDatos({ nombre, nivel, carrerasIds }) {
  const nomResult = validarNombreMateria(nombre);
  if (nomResult.error) throw new Error(nomResult.error);

  if (!['Secundario', 'Universitario'].includes(nivel)) {
    throw new Error('Debe seleccionar un nivel educativo válido.');
  }

  if (nivel === 'Universitario' && (!carrerasIds || carrerasIds.length === 0)) {
    throw new Error('Las materias universitarias deben estar asociadas al menos a una carrera.');
  }

  return nomResult.limpio;
}

/**
 * Verificar duplicados (opcionalmente excluyendo un id)
 */
async function verificarDuplicado(cleanNombre, nivel, excluirId = null) {
  const { data: existentes, error } = await supabase
    .from('materias')
    .select('id, nombre, nivel');

  if (error) {
    throw new Error(`No se pudo verificar duplicados: ${error.message}`);
  }

  const yaExiste = (existentes || []).some(
    (m) =>
      (excluirId === null || String(m.id) !== String(excluirId)) &&
      m.nombre?.trim().toUpperCase() === cleanNombre &&
      m.nivel?.trim().toLowerCase() === nivel.toLowerCase()
  );

  if (yaExiste) {
    throw new Error(
      excluirId === null
        ? `Ya existe la materia "${cleanNombre}" registrada en nivel ${nivel}.`
        : `Ya existe otra materia "${cleanNombre}" registrada en nivel ${nivel}.`
    );
  }
}

/**
 * Registrar una nueva materia y asociarla a una o varias carreras (HU17)
 */
export async function createMateria({ nombre, nivel, area, carrerasIds }) {
  const cleanNombre = validarDatos({ nombre, nivel, carrerasIds });

  await verificarDuplicado(cleanNombre, nivel);

  // 1. Insertar la materia
  const payload = {
    nombre: cleanNombre,
    nivel,
    area: area || null
  };

  const { data: matData, error: matError } = await supabase
    .from('materias')
    .insert([payload])
    .select();

  if (matError) {
    console.error('Error en createMateria:', matError);
    throw new Error(matError.message || 'Error al guardar la materia en Supabase.');
  }

  const nuevaMateria = matData?.[0];
  if (!nuevaMateria) {
    throw new Error('La materia no se pudo registrar (revisá las políticas RLS de la tabla materias).');
  }

  // 2. Insertar relaciones en la tabla intermedia si es universitaria
  if (nivel === 'Universitario') {
    const idsUnicos = [...new Set(carrerasIds.map(String))];
    const relacionesPayload = idsUnicos.map((cId) => ({
      materia_id: nuevaMateria.id,
      carrera_id: cId
    }));

    const { error: relError } = await supabase
      .from('carrera_materias')
      .insert(relacionesPayload);

    if (relError) {
      console.error('Error al asociar carreras a la materia:', relError);
      // Rollback: no dejar la materia sin carreras
      await supabase.from('materias').delete().eq('id', nuevaMateria.id);
      throw new Error(`No se pudieron asociar las carreras: ${relError.message}`);
    }
  }

  return nuevaMateria;
}

/**
 * Modificar una materia existente y sus carreras asociadas (HU17)
 */
export async function updateMateria(id, { nombre, nivel, area, carrerasIds }) {
  const cleanNombre = validarDatos({ nombre, nivel, carrerasIds });

  await verificarDuplicado(cleanNombre, nivel, id);

  const payload = {
    nombre: cleanNombre,
    nivel,
    area: area || null
  };

  const { data: matData, error: matError } = await supabase
    .from('materias')
    .update(payload)
    .eq('id', id)
    .select();

  if (matError) {
    console.error('Error en updateMateria:', matError);
    throw new Error(matError.message || 'Error al modificar la materia en Supabase.');
  }

  if (!matData || matData.length === 0) {
    throw new Error('No se pudo modificar la materia (no existe o faltan permisos RLS).');
  }

  // Leer relaciones actuales
  const { data: actuales, error: errAct } = await supabase
    .from('carrera_materias')
    .select('carrera_id')
    .eq('materia_id', id);

  if (errAct) {
    throw new Error(`Error al leer las carreras asociadas: ${errAct.message}`);
  }

  const actualesIds = (actuales || []).map((r) => String(r.carrera_id));
  // Si pasa a Secundario, se quitan todas las carreras
  const nuevosIds = nivel === 'Universitario' ? [...new Set(carrerasIds.map(String))] : [];

  const aAgregar = nuevosIds.filter((c) => !actualesIds.includes(c));
  const aQuitar = actualesIds.filter((c) => !nuevosIds.includes(c));

  // Quitar solo las carreras desmarcadas
  if (aQuitar.length > 0) {
    const { error } = await supabase
      .from('carrera_materias')
      .delete()
      .eq('materia_id', id)
      .in('carrera_id', aQuitar);
    if (error) throw new Error(`Error al quitar carreras: ${error.message}`);
  }

  // Agregar solo las carreras nuevas (evita duplicar relaciones)
  if (aAgregar.length > 0) {
    const { error } = await supabase
      .from('carrera_materias')
      .insert(aAgregar.map((cId) => ({ materia_id: id, carrera_id: cId })));
    if (error) throw new Error(`Error al agregar carreras: ${error.message}`);
  }

  return matData[0];
}

export async function cambiarEstadoMateria(id, activo) {
  const { data, error } = await supabase
    .from('materias')
    .update({ activo })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message || 'No se pudo cambiar el estado de la materia.');
  return data;
}
