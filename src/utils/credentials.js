/**
 * Normaliza un texto: elimina tildes, eñes y caracteres especiales,
 * devolviendo solo letras en minúscula.
 */
function cleanString(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita acentos y diacríticos
    .toLowerCase()
    .replace(/ñ/g, 'n')
    .replace(/[^a-z]/g, ''); // solo deja letras a-z
}

/**
 * Genera el username institucional para Alumnos estilo SAG:
 * inicial del primer nombre + primer apellido + correlativo del legajo
 * Ejemplos:
 *   - "Agustín", "Colque", "LEG-2026-0022" -> "acolque22"
 *   - "Juan Carlos", "Pérez Gómez", "LEG-2026-0005" -> "jperez5"
 */
export function generateStudentUsername(nombre, apellido, legajo) {
  if (!nombre || !apellido) return '';

  // Tomar primer nombre y primer apellido
  const primerNombre = String(nombre).trim().split(/\s+/)[0] || '';
  const primerApellido = String(apellido).trim().split(/\s+/)[0] || '';

  const inicial = cleanString(primerNombre).charAt(0);
  const apeLimpio = cleanString(primerApellido);

  // Extraer el número final del legajo (ej: "LEG-2026-0022" -> 22)
  const match = String(legajo || '').match(/\d+$/);
  const numeroCorrelativo = match ? parseInt(match[0], 10) : '';

  return `${inicial}${apeLimpio}${numeroCorrelativo}`;
}

/**
 * Genera el username institucional para Profesores:
 * prefijo institucional "prof." + inicial del primer nombre + primer apellido
 * Ejemplos:
 *   - "Alberto", "Giménez" -> "prof.agimenez"
 *   - "María Laura", "Rodríguez" -> "prof.mrodriguez"
 */
export function generateTeacherUsername(nombre, apellido) {
  if (!nombre || !apellido) return '';

  const primerNombre = String(nombre).trim().split(/\s+/)[0] || '';
  const primerApellido = String(apellido).trim().split(/\s+/)[0] || '';

  const inicial = cleanString(primerNombre).charAt(0);
  const apeLimpio = cleanString(primerApellido);

  return `prof.${inicial}${apeLimpio}`;
}