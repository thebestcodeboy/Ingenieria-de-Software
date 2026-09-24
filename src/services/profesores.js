import { supabase } from '../lib/supabaseClient';

/**
 * Validador demográfico y de patrones para DNI argentino
 * Bloquea números repetidos (ej: 000222), secuencias de prueba y rangos fuera del padrón
 */
export function validarDniArgentino(dni) {
  const limpio = String(dni || '').replace(/\D/g, '');

  if (limpio.length !== 8) {
    return { valido: false, error: 'El DNI debe contener exactamente 8 dígitos.' };
  }

  const num = parseInt(limpio, 10);
  if (num < 10000000 || num > 56000000) {
    return { valido: false, error: 'El DNI no corresponde a un rango demográfico activo válido (10M a 56M).' };
  }

  // Rechazar números con todos los dígitos iguales (ej: 00000000, 11111111)
  if (/^(\d)\1{7}$/.test(limpio)) {
    return { valido: false, error: 'El DNI no puede consistir en un número repetido.' };
  }

  // Rechazar secuencias obvias o terminadas en múltiples ceros de prueba
  if (limpio.includes('123456') || limpio.includes('654321') || limpio.endsWith('000000')) {
    return { valido: false, error: 'El DNI contiene una secuencia de prueba no permitida.' };
  }

  return { valido: true, dniLimpio: limpio, error: null };
}

/**
 * Validador y generador de CUIL mediante Algoritmo Módulo 11 oficial
 */
export function calcularYValidarCuil(dni, sexo = 'M') {
  const checkDni = validarDniArgentino(dni);
  if (!checkDni.valido) return null;

  const prefijos = sexo === 'F' ? [27, 23, 24] : [20, 23, 24];
  const multiplicadores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

  for (const prefijo of prefijos) {
    const base10 = `${prefijo}${checkDni.dniLimpio}`;
    let acumulado = 0;

    for (let i = 0; i < 10; i++) {
      acumulado += parseInt(base10[i], 10) * multiplicadores[i];
    }

    const resto = acumulado % 11;
    let verificador = 11 - resto;

    if (verificador === 11) verificador = 0;
    if (verificador === 10) {
      // Recalcular con prefijo 23 según norma oficial
      continue;
    }

    const cuilCompleto = `${prefijo}-${checkDni.dniLimpio}-${verificador}`;
    return { cuil: cuilCompleto, verificador };
  }

  return null;
}

/**
 * Validador estricto de teléfono argentino (10 dígitos: código de área + abonado)
 * Bloquea números de prueba como '030303003', ceros a la izquierda y prefijos inválidos
 */
export function validarTelefonoArgentino(telefono) {
  if (!telefono) return { valido: true, telefonoLimpio: null, error: null };

  let limpio = String(telefono).replace(/\D/g, '');

  // Eliminar prefijo 0 si fue ingresado
  if (limpio.startsWith('0')) {
    limpio = limpio.slice(1);
  }

  // Longitud obligatoria de 10 dígitos (código de área sin 0 + número sin 15)
  if (limpio.length !== 10) {
    return {
      valido: false,
      error: 'El teléfono debe tener 10 dígitos (ej: 3874869843 para Salta).',
      telefonoLimpio: null
    };
  }

  // Bloquear dígitos idénticos consecutivos (ej: 1111111111)
  if (/^(\d)\1{9}$/.test(limpio)) {
    return { valido: false, error: 'El número de teléfono no puede tener todos los dígitos repetidos.', telefonoLimpio: null };
  }

  // Bloquear patrones de prueba conocidos
  if (limpio === '0303030030' || limpio.includes('123456') || limpio.includes('000000')) {
    return { valido: false, error: 'El teléfono ingresado corresponde a un patrón de prueba no permitido.', telefonoLimpio: null };
  }

  // Validación de códigos de área geográficos de Argentina (11 a 389)
  const codArea2 = parseInt(limpio.slice(0, 2), 10);
  const codArea3 = parseInt(limpio.slice(0, 3), 10);

  const esAreaValida = codArea2 === 11 || (codArea3 >= 220 && codArea3 <= 389);

  if (!esAreaValida) {
    return {
      valido: false,
      error: 'El código de área no corresponde a una región válida de Argentina.',
      telefonoLimpio: null
    };
  }

  return { valido: true, telefonoLimpio: limpio, error: null };
}

/**
 * Obtener la nómina completa de profesores
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
  const cleanNombre = nombre?.trim().replace(/\s+/g, ' ').toUpperCase();
  const cleanApellido = apellido?.trim().replace(/\s+/g, ' ').toUpperCase();

  // Validaciones de nombres
  if (!cleanNombre || cleanNombre.length < 2 || cleanNombre.length > 40) {
    throw new Error('El nombre debe tener entre 2 y 40 caracteres.');
  }

  if (!cleanApellido || cleanApellido.length < 2 || cleanApellido.length > 40) {
    throw new Error('El apellido debe tener entre 2 y 40 caracteres.');
  }

  // 1. Validar DNI
  const checkDni = validarDniArgentino(dni);
  if (!checkDni.valido) {
    throw new Error(checkDni.error || 'DNI inválido.');
  }

  // 2. Validar Teléfono
  const checkTel = validarTelefonoArgentino(telefono);
  if (!checkTel.valido) {
    throw new Error(checkTel.error || 'Teléfono inválido.');
  }

  // 3. Validar Correo Electrónico
  let cleanEmail = email?.trim().toLowerCase() || null;
  if (cleanEmail) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(cleanEmail)) {
      throw new Error('El formato del correo electrónico es inválido.');
    }
    if (cleanEmail.includes('test') || cleanEmail.includes('asdf') || cleanEmail.includes('prueba')) {
      throw new Error('El correo electrónico contiene patrones de prueba no permitidos.');
    }
  }

  // 4. Validar Materias
  if (!materiasIds || materiasIds.length === 0) {
    throw new Error('Debe asociar al menos una materia al profesor.');
  }

  // 5. Verificar DNI duplicado en Supabase
  const { data: existente } = await supabase
    .from('profesores')
    .select('id, dni')
    .eq('dni', checkDni.dniLimpio);

  if (existente && existente.length > 0) {
    throw new Error(`Ya existe un docente registrado con el DNI ${checkDni.dniLimpio}.`);
  }

  // Inserción en la base de datos
  const payload = {
    nombre: cleanNombre,
    apellido: cleanApellido,
    dni: checkDni.dniLimpio,
    email: cleanEmail,
    telefono: checkTel.telefonoLimpio,
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