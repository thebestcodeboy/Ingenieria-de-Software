import { supabase } from '../lib/supabaseClient';

/**
 * Obtiene la lista de aulas ordenadas por número, incluyendo capacidad física
 */
export async function getAulas() {
  const { data, error } = await supabase
    .from('aulas')
    .select('numero, descripcion, capacidad')
    .order('numero', { ascending: true });

  if (error) {
    console.error('Error al obtener aulas:', error);
    throw new Error(error.message || 'Error al listar las aulas.');
  }

  return data || [];
}

/**
 * Crea una nueva aula con su capacidad física
 */
export async function createAula({ numero, descripcion, capacidad }) {
  const numParsed = Number(numero);
  const capParsed = Number(capacidad);

  if (!numParsed || numParsed <= 0) {
    throw new Error('El número de aula debe ser mayor a 0.');
  }
  if (!capParsed || capParsed <= 0) {
    throw new Error('La capacidad física debe ser al menos de 1 alumno.');
  }

  const payload = {
    numero: numParsed,
    descripcion: descripcion?.trim() || `Aula ${numParsed}`,
    capacidad: capParsed,
  };

  const { data, error } = await supabase
    .from('aulas')
    .insert([payload])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error(`El aula número ${numParsed} ya existe.`);
    }
    throw new Error(error.message || 'Error al crear el aula.');
  }

  return data;
}

/**
 * Actualiza la descripción y/o capacidad física de un aula existente
 */
export async function updateAula(numero, { descripcion, capacidad }) {
  const capParsed = Number(capacidad);

  if (!capParsed || capParsed <= 0) {
    throw new Error('La capacidad física debe ser al menos de 1 alumno.');
  }

  const payload = {
    descripcion: descripcion?.trim() || `Aula ${numero}`,
    capacidad: capParsed,
  };

  const { data, error } = await supabase
    .from('aulas')
    .update(payload)
    .eq('numero', Number(numero))
    .select()
    .single();

  if (error) {
    console.error('Error al actualizar aula:', error);
    throw new Error(error.message || 'Error al actualizar el aula.');
  }

  return data;
}