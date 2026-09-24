import { supabase } from '../lib/supabaseClient';

/**
 * Cálculo formal de CUIT/CUIL argentino a partir del DNI (solo para visualización en el formulario)
 */
export function calcularCuilArgentino(dni, esFemenino = false) {
  const dniLimpio = String(dni).replace(/\D/g, '');
  if (dniLimpio.length !== 8) return null;

  const prefijo = esFemenino ? '27' : '20';
  const secuencia = `${prefijo}${dniLimpio}`;
  
  const multiplicadores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let acumulado = 0;

  for (let i = 0; i < 10; i++) {
    acumulado += parseInt(secuencia[i], 10) * multiplicadores[i];
  }

  const resto = acumulado % 11;
  let digitoVerificador = 11 - resto;

  if (digitoVerificador === 11) {
    digitoVerificador = 0;
  } else if (digitoVerificador === 10) {
    digitoVerificador = 9;
  }

  const cuitStr = `${secuencia}-${digitoVerificador}`;
  return { cuit: cuitStr, prefijo, dni: dniLimpio, verificador: digitoVerificador };
}

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

// HU13: Modificar datos de profesor existente
export async function updateProfesor(id, { nombre, apellido, dni, email, telefono, materiasIds, turnos }) {
  const cleanNombre = nombre?.trim();
  const cleanApellido = apellido?.trim();
  const cleanDni = String(dni).trim();

  if (!cleanNombre || !cleanApellido || !cleanDni) {
    throw new Error('Nombre, Apellido y DNI son campos obligatorios.');
  }
  if (!materiasIds || materiasIds.length === 0) {
    throw new Error('Debe asociar al menos una materia al profesor.');
  }

  // Verificar DNI duplicado excluyendo al profesor que estamos editando
  const { data: existente } = await supabase
    .from('profesores')
    .select('id')
    .eq('dni', cleanDni)
    .neq('id', id)
    .maybeSingle();

  if (existente) {
    throw new Error(`Ya existe otro profesor registrado con el DNI ${cleanDni}.`);
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
    .update(payload)
    .eq('id', id)
    .select();

  if (error) {
    console.error('Error en updateProfesor:', error);
    throw new Error(error.message || 'Error al actualizar el profesor en Supabase.');
  }
  return data?.[0];
}