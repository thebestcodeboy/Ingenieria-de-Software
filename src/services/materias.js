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
 * Registrar una nueva materia (HU05)
 */
export async function createMateria({ nombre, nivel, area }) {
  const cleanNombre = nombre.trim();

  if (!cleanNombre || cleanNombre.length < 3) {
    throw new Error('El nombre de la materia debe tener al menos 3 caracteres.');
  }

  if (!['Secundario', 'Universitario'].includes(nivel)) {
    throw new Error('Debe seleccionar un nivel educativo válido.');
  }

  if (nivel === 'Universitario' && !area) {
    throw new Error('Las materias universitarias requieren un área o carrera.');
  }

  // Verificación de duplicados en memoria sobre las materias existentes
  const { data: existentes } = await supabase
    .from('materias')
    .select('nombre, nivel');

  if (existentes && existentes.length > 0) {
    const yaExiste = existentes.some(
      (m) =>
        m.nombre?.trim().toLowerCase() === cleanNombre.toLowerCase() &&
        m.nivel?.trim().toLowerCase() === nivel.toLowerCase()
    );
    if (yaExiste) {
      throw new Error(`Ya existe la materia "${cleanNombre}" registrada en nivel ${nivel}.`);
    }
  }

  // Inserción directa
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