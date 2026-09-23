import { supabase } from '../lib/supabaseClient';

/**
 * Obtener la lista completa de profesores
 */
export async function getProfesores() {
  const { data, error } = await supabase
    .from('profesores')
    .select('*')
    .order('apellido', { ascending: true });

  if (error) {
    console.error('Error al obtener profesores:', error);
    throw error;
  }
  return data || [];
}

/**
 * Registrar un nuevo profesor y asociar sus materias (HU03)
 */
export async function createProfesor({ nombre, apellido, dni, email, telefono, materiasIds, turnos }) {
  const cleanNombre = nombre?.trim();
  const cleanApellido = apellido?.trim();
  const cleanDni = dni?.trim();

  // Validaciones de negocio
  if (!cleanNombre || !cleanApellido || !cleanDni) {
    throw new Error('Nombre, Apellido y DNI son campos obligatorios.');
  }

  if (!materiasIds || materiasIds.length === 0) {
    throw new Error('Debe asociar al menos una materia al profesor.');
  }

  // Verificación de DNI duplicado
  const { data: existente } = await supabase
    .from('profesores')
    .select('id, dni')
    .eq('dni', cleanDni);

  if (existente && existente.length > 0) {
    throw new Error(`Ya existe un profesor registrado con el DNI ${cleanDni}.`);
  }

  const payload = {
    nombre: cleanNombre,
    apellido: cleanApellido,
    dni: cleanDni,
    email: email?.trim() || null,
    telefono: telefono?.trim() || null,
    materias_ids: materiasIds,
    turnos: turnos || []
  };

  const { data, error } = await supabase
    .from('profesores')
    .insert([payload])
    .select();

  if (error) {
    console.error('Error en createProfesor:', error);
    throw new Error(error.message || 'Error al guardar el profesor en Supabase.');
  }

  return data?.[0];
}