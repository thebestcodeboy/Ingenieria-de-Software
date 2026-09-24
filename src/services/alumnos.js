import { supabase } from '../lib/supabaseClient';

const PALABRAS_PROHIBIDAS = [
  'alumno', 'alumnos', 'estudiante', 'usuario', 'test', 'prueba',
  'nombre', 'apellido', 'admin', 'nadie', 'ninguno', 'falso'
];

const CONECTORES_VALIDOS = ['de', 'del', 'la', 'las', 'los', 'san', 'santa', 'di'];

// Validador y normalizador de Nombre y Apellido (Persistencia en MAYÚSCULAS)
export const normalizarYValidarNombre = (texto, campo = 'nombre') => {
  if (!texto || texto.trim() === '') {
    return { valido: false, error: `El ${campo} es obligatorio.` };
  }

  const limpio = texto.trim().replace(/\s+/g, ' ');

  const regexSoloLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/;
  if (!regexSoloLetras.test(limpio)) {
    return { valido: false, error: `El ${campo} solo puede contener letras.` };
  }

  const palabras = limpio.split(' ');

  for (const p of palabras) {
    if (p.length < 3 && !CONECTORES_VALIDOS.includes(p.toLowerCase())) {
      return {
        valido: false,
        error: `El ${campo} contiene el fragmento "${p}", el cual es demasiado corto para ser válido.`
      };
    }
  }

  for (const p of palabras) {
    if (PALABRAS_PROHIBIDAS.includes(p.toLowerCase())) {
      return { valido: false, error: `"${p}" no es un ${campo} válido.` };
    }
  }

  for (const p of palabras) {
    const min = p.toLowerCase();
    if (
      /(\w{2,3})\1{1,}/.test(min) || 
      /asdf|qwer|zxcv|hjkl|dasd|dada/.test(min)
    ) {
      return { valido: false, error: `El ${campo} "${p}" contiene una secuencia no permitida.` };
    }
  }

  // Se normaliza todo a MAYÚSCULAS para registro formal universitario
  const enMayusculas = limpio.toUpperCase();

  return { valido: true, textoLimpio: enMayusculas };
};

// Algoritmo oficial de Módulo 11 (AFIP / ANSES)
export const calcularCuilArgentino = (dniInput, tipo = 20) => {
  const dniStr = String(dniInput).replace(/\D/g, '');
  if (dniStr.length !== 8) return null;

  const ponderadores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

  const resolver = (prefijo) => {
    const base = `${prefijo}${dniStr}`;
    let suma = 0;
    for (let i = 0; i < 10; i++) {
      suma += parseInt(base[i], 10) * ponderadores[i];
    }
    const resto = suma % 11;
    if (resto === 0) return { prefijo, dv: 0 };
    if (resto === 1) {
      if (prefijo === 20 || prefijo === 27) return resolver(23);
      return { prefijo: 23, dv: 9 };
    }
    return { prefijo, dv: 11 - resto };
  };

  const res = resolver(tipo);
  return {
    cuit: `${res.prefijo}-${dniStr}-${res.dv}`,
    valido: true,
  };
};

// Validador de DNI de Alumno
export const validarDniEstudiante = (dniInput) => {
  const dniStr = String(dniInput).replace(/\D/g, '');

  if (dniStr.length !== 8) {
    return { valido: false, error: 'El DNI debe tener exactamente 8 dígitos.' };
  }

  const num = parseInt(dniStr, 10);

  if (num < 10000000 || num > 56000000) {
    return { valido: false, error: 'El DNI se encuentra fuera del rango demográfico estudiantil (10 a 56 millones).' };
  }

  if (/^(\d)\1{7}$/.test(dniStr)) {
    return { valido: false, error: 'El DNI no puede consistir en un número repetido.' };
  }

  if (dniStr.includes('123456') || dniStr.includes('654321') || dniStr.endsWith('000000')) {
    return { valido: false, error: 'El DNI contiene una secuencia de prueba no permitida.' };
  }

  return { valido: true, dniLimpio: num };
};

// Validador y normalizador de Teléfono
export const validarYNormalizarTelefono = (telInput) => {
  if (!telInput || telInput.trim() === '') return { valido: true, telefonoLimpio: null };

  let limpio = telInput.replace(/\D/g, '');

  if (limpio.length === 11 && limpio.startsWith('0')) {
    limpio = limpio.slice(1);
  }

  if (limpio.length === 10) {
    return { valido: true, telefonoLimpio: limpio };
  }

  if ((limpio.length === 12 && limpio.startsWith('54')) || (limpio.length === 13 && limpio.startsWith('549'))) {
    return { valido: true, telefonoLimpio: limpio };
  }

  return {
    valido: false,
    error: 'El teléfono debe tener 10 dígitos (código de área + número. Ej: 2914476052 o 3874123456).'
  };
};

// Validador de Correo Electrónico
export const validarEmailReal = (emailInput, telefonoLimpio = null) => {
  if (!emailInput || emailInput.trim() === '') return { valido: true, emailLimpio: null };

  const email = emailInput.trim().toLowerCase();

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return { valido: false, error: 'El formato del correo electrónico es inválido.' };
  }

  const [usuario] = email.split('@');

  if (telefonoLimpio && usuario === telefonoLimpio) {
    return { valido: false, error: 'El correo electrónico no puede ser el mismo número de teléfono.' };
  }

  if (/(\w{2,3})\1{2,}/.test(usuario) || /asdf|qwer|zxcv|1234|test|prueba|dasd/.test(usuario)) {
    return { valido: false, error: 'El correo electrónico contiene una secuencia de prueba no permitida.' };
  }

  return { valido: true, emailLimpio: email };
};

// Validador de Domicilio
export const validarDireccionReal = (direccionInput) => {
  if (!direccionInput || direccionInput.trim() === '') {
    return { valido: true, direccionLimpia: null };
  }

  const dir = direccionInput.trim().replace(/\s+/g, ' ');

  if (/[()\[\]{}¿?¡!$%&=*#_<>]/.test(dir)) {
    return { 
      valido: false, 
      error: 'El domicilio no puede contener paréntesis ni símbolos especiales no válidos.' 
    };
  }

  if (/^\d+/.test(dir)) {
    return { 
      valido: false, 
      error: 'El domicilio debe comenzar con el nombre de la calle (ej: Av. San Martín 123), no con la numeración.' 
    };
  }

  const tieneLetras = /[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/.test(dir);
  const tieneAltura = /\b\d+\b|s\/n|sin numero|sin número/i.test(dir);

  if (!tieneLetras || !tieneAltura) {
    return { 
      valido: false, 
      error: 'El domicilio debe incluir el nombre de la calle y la numeración (o S/N).' 
    };
  }

  const matchNumeroEnMedio = dir.match(/^(.+?)\s+(\d+)\s+([a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s\d,.-]+)$/i);
  if (matchNumeroEnMedio) {
    const resto = matchNumeroEnMedio[3].trim().toLowerCase();
    const especificadoresValidos = /^(dpto|depto|departamento|piso|pb|mz|manzana|lote|torre|monoblock|casa|oficina|of|puerta|timbre|bis)\b/i;
    
    if (!especificadoresValidos.test(resto)) {
      return {
        valido: false,
        error: 'El número catastral debe ubicarse luego del nombre de la calle (ej: "Pasaje Urquiza 520").'
      };
    }
  }

  const partes = dir.split(' ');
  const nexosValidos = [
    'de', 'del', 'la', 'las', 'los', 'san', 'santa', 'el', 
    'av', 'av.', 'b°', 'pje', 'pje.', 'dpto', 'piso', 'pb', 'mz', 'lote'
  ];

  for (const p of partes) {
    const min = p.toLowerCase();
    
    if (/^\d+[a-zA-Z]?$/.test(min) || /^s\/n$/i.test(min) || /^(\d+[a-zA-Z]?,?)$/.test(min)) continue;

    if (min.length < 3 && !nexosValidos.includes(min)) {
      return {
        valido: false,
        error: `El fragmento "${p}" no parece válido. Verifique que el nombre de la calle no esté cortado.`
      };
    }

    if (/(\w{2,3})\1{1,}/.test(min) || /asdf|qwer|zxcv|dasd|dada/.test(min)) {
      return {
        valido: false,
        error: `El domicilio contiene patrones o secuencias de prueba no permitidas ("${p}").`
      };
    }
  }

  const formateada = partes
    .map(p => {
      const min = p.toLowerCase();
      if (/^\d+[a-zA-Z]?$/.test(p) || /^s\/n$/i.test(p)) return p.toUpperCase();
      if (nexosValidos.includes(min)) return min;
      return p.charAt(0).toUpperCase() + min.slice(1).toLowerCase();
    })
    .join(' ');

  return { valido: true, direccionLimpia: formateada };
};

// HU02: Listado de alumnos
export const getAlumnos = async () => {
  try {
    const { data, error } = await supabase
      .from('alumnos')
      .select('*')
      .order('apellido', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  } catch (err) {
    console.error('Error en getAlumnos:', err);
    throw err;
  }
};

// HU01: Alta de alumno
export const createAlumno = async ({ nombre, apellido, dni, email, telefono, direccion }) => {
  try {
    const valNombre = normalizarYValidarNombre(nombre, 'nombre');
    if (!valNombre.valido) throw new Error(valNombre.error);

    const valApellido = normalizarYValidarNombre(apellido, 'apellido');
    if (!valApellido.valido) throw new Error(valApellido.error);

    const checkDni = validarDniEstudiante(dni);
    if (!checkDni.valido) throw new Error(checkDni.error);

    const checkTel = validarYNormalizarTelefono(telefono);
    if (!checkTel.valido) throw new Error(checkTel.error);

    const checkEmail = validarEmailReal(email, checkTel.telefonoLimpio);
    if (!checkEmail.valido) throw new Error(checkEmail.error);

    const checkDir = validarDireccionReal(direccion);
    if (!checkDir.valido) throw new Error(checkDir.error);

    const { data: dniExistente } = await supabase
      .from('alumnos')
      .select('id')
      .eq('dni', checkDni.dniLimpio)
      .maybeSingle();

    if (dniExistente) {
      throw new Error(`Ya existe un alumno registrado con el DNI ${checkDni.dniLimpio}.`);
    }

    const { data: nombreExistente } = await supabase
      .from('alumnos')
      .select('id')
      .ilike('nombre', valNombre.textoLimpio)
      .ilike('apellido', valApellido.textoLimpio)
      .maybeSingle();

    if (nombreExistente) {
      throw new Error(`Ya existe un alumno registrado como "${valNombre.textoLimpio} ${valApellido.textoLimpio}".`);
    }

    if (checkEmail.emailLimpio) {
      const { data: emailExistente } = await supabase
        .from('alumnos')
        .select('id')
        .ilike('email', checkEmail.emailLimpio)
        .maybeSingle();

      if (emailExistente) {
        throw new Error(`El correo "${checkEmail.emailLimpio}" ya está en uso.`);
      }
    }

    const { data, error } = await supabase
      .from('alumnos')
      .insert([
        {
          nombre: valNombre.textoLimpio,
          apellido: valApellido.textoLimpio,
          dni: checkDni.dniLimpio,
          email: checkEmail.emailLimpio,
          telefono: checkTel.telefonoLimpio,
          direccion: checkDir.direccionLimpia,
        },
      ])
      .select()
      .single();

    if (error) throw new Error(error.message);

    return data;
  } catch (err) {
    console.error('Fallo en createAlumno:', err);
    throw err;
  }
};
// HU12: Modificar datos de alumno existente
export const updateAlumno = async (id, { nombre, apellido, dni, email, telefono, direccion, activo }) => {
  try {
    const valNombre = normalizarYValidarNombre(nombre, 'nombre');
    if (!valNombre.valido) throw new Error(valNombre.error);

    const valApellido = normalizarYValidarNombre(apellido, 'apellido');
    if (!valApellido.valido) throw new Error(valApellido.error);

    const checkDni = validarDniEstudiante(dni);
    if (!checkDni.valido) throw new Error(checkDni.error);

    const checkTel = validarYNormalizarTelefono(telefono);
    if (!checkTel.valido) throw new Error(checkTel.error);

    const checkEmail = validarEmailReal(email, checkTel.telefonoLimpio);
    if (!checkEmail.valido) throw new Error(checkEmail.error);

    const checkDir = validarDireccionReal(direccion);
    if (!checkDir.valido) throw new Error(checkDir.error);

    // Validar que el DNI no pertenezca a OTRO alumno distinto al que editamos
    const { data: dniExistente } = await supabase
      .from('alumnos')
      .select('id')
      .eq('dni', checkDni.dniLimpio)
      .neq('id', id)
      .maybeSingle();

    if (dniExistente) {
      throw new Error(`Ya existe otro alumno registrado con el DNI ${checkDni.dniLimpio}.`);
    }

    const { data, error } = await supabase
      .from('alumnos')
      .update({
        nombre: valNombre.textoLimpio,
        apellido: valApellido.textoLimpio,
        dni: checkDni.dniLimpio,
        email: checkEmail.emailLimpio,
        telefono: checkTel.telefonoLimpio,
        direccion: checkDir.direccionLimpia
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  } catch (err) {
    console.error('Fallo en updateAlumno:', err);
    throw err;
  }
};