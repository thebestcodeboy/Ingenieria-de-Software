import { supabase } from '../lib/supabaseClient';

/**
 * Obtener todas las materias registradas
 */
export async function getMaterias() {
  const { data, error } = await supabase
    .from('materias')
    .select('*')
    .order('nombre', { ascending: true });

  if (error) {
    console.error('Error al obtener materias:', error);
    throw error;
  }
  return data || [];
}

/**
 * Validar formato de texto de materia
 */
function validarNombreMateria(nombre) {
  const limpio = nombre.trim().replace(/\s+/g, ' ');
  if (!limpio) return { error: 'El nombre de la materia es obligatorio.' };
  if (limpio.length < 3) return { error: 'El nombre de la materia debe tener al menos 3 caracteres.' };

  const palabras = limpio.split(' ');
  const nexosPermitidos = ['de', 'del', 'la', 'las', 'los', 'i', 'y', 'e'];

  for (let i = 0; i < palabras.length; i++) {
    const p = palabras[i].toLowerCase();
    if (p.length === 1 && !['i', 'y'].includes(p)) {
      return { error: 'El nombre de la materia no puede contener letras sueltas.' };
    }
    if (p.length < 3 && !nexosPermitidos.includes(p)) {
      return { error: `"${palabras[i]}" no parece una palabra válida.` };
    }
    if (/(\w{2,3})\1{1,}/.test(p) || /asdf|qwer|zxcv|1234|test|prueba/.test(p) || /^\d+$/.test(p)) {
      return { error: 'El nombre de la materia contiene secuencias o números no permitidos.' };
    }
  }
  return { limpio: limpio.toUpperCase() };
}

/**
 * Registrar una nueva materia (HU05)
 */
export async function createMateria({ nombre, nivel, area }) {
  const nomResult = validarNombreMateria(nombre);
  if (nomResult.error) {
    throw new Error(nomResult.error);
  }
  const cleanNombre = nomResult.limpio;

  if (!['Secundario', 'Universitario'].includes(nivel)) {
    throw new Error('Debe seleccionar un nivel educativo válido.');
  }

  if (nivel === 'Universitario' && !area) {
    throw new Error('Las materias universitarias requieren un área o carrera.');
  }

  // Verificación de duplicados
  const { data: existentes } = await supabase
    .from('materias')
    .select('id, nombre, nivel');

  if (existentes && existentes.length > 0) {
    const yaExiste = existentes.some(
      (m) =>
        m.nombre?.trim().toUpperCase() === cleanNombre.toUpperCase() &&
        m.nivel?.trim().toLowerCase() === nivel.toLowerCase()
    );
    if (yaExiste) {
      throw new Error(`Ya existe la materia "${cleanNombre}" registrada en nivel ${nivel}.`);
    }
  }

  const payload = {
    nombre: cleanNombre,
    nivel: nivel,
    area: nivel === 'Universitario' ? area : null
  };

  const { data, error } = await supabase
    .from('materias')
    .insert([payload])
    .select();

  if (error) {
    console.error('Error en createMateria:', error);
    throw new Error(error.message || 'Error al guardar la materia en Supabase.');
  }

  return data?.[0];
}

/**
 * Modificar una materia existente
 */
export async function updateMateria(id, { nombre, nivel, area }) {
  const nomResult = validarNombreMateria(nombre);
  if (nomResult.error) {
    throw new Error(nomResult.error);
  }
  const cleanNombre = nomResult.limpio;

  if (!['Secundario', 'Universitario'].includes(nivel)) {
    throw new Error('Debe seleccionar un nivel educativo válido.');
  }

  if (nivel === 'Universitario' && !area) {
    throw new Error('Las materias universitarias requieren un área o carrera.');
  }

  // Verificar duplicados excluyendo el ID actual
  const { data: existentes } = await supabase
    .from('materias')
    .select('id, nombre, nivel');

  if (existentes && existentes.length > 0) {
    const yaExiste = existentes.some(
      (m) =>
        String(m.id) !== String(id) &&
        m.nombre?.trim().toUpperCase() === cleanNombre.toUpperCase() &&
        m.nivel?.trim().toLowerCase() === nivel.toLowerCase()
    );
    if (yaExiste) {
      throw new Error(`Ya existe otra materia "${cleanNombre}" registrada en nivel ${nivel}.`);
    }
  }

  const payload = {
    nombre: cleanNombre,
    nivel: nivel,
    area: nivel === 'Universitario' ? area : null
  };

  const { data, error } = await supabase
    .from('materias')
    .update(payload)
    .eq('id', id)
    .select();

  if (error) {
    console.error('Error en updateMateria:', error);
    throw new Error(error.message || 'Error al modificar la materia en Supabase.');
  }

  return data?.[0];
}