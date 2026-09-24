import { supabase } from '../lib/supabaseClient';

/**
 * Autentica un usuario en el portal correspondiente (alumno o profesor).
 * Permite ingresar tanto con el username institucional (ej: "acolque22", "prof.agimenez")
 * como con el correo completo.
 *
 * @param {string} identificador - Username institucional o email.
 * @param {string} password - Contraseña ingresada.
 * @param {'alumno' | 'profesor'} rolEsperado - Portal desde donde intenta ingresar.
 */
export async function loginPortal(identificador, password, rolEsperado) {
  if (!identificador || !password) {
    throw new Error('Debe completar el usuario y la contraseña.');
  }

  const limpio = String(identificador).trim().toLowerCase();

  // Si ingresó solo el usuario, armamos el email institucional según el portal
  let emailAuth = limpio;
  if (!limpio.includes('@')) {
    const dominio = rolEsperado === 'alumno' ? 'alumno.ateneo.com' : 'profesor.ateneo.com';
    emailAuth = `${limpio}@${dominio}`;
  }

  // 1. Intentar inicio de sesión en Supabase Auth
  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailAuth,
    password: String(password).trim(),
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
      throw new Error('Usuario o contraseña incorrectos.');
    }
    if (msg.includes('email not confirmed')) {
      throw new Error('La cuenta aún no fue confirmada institucionalmente.');
    }
    throw new Error(error.message || 'Error al validar credenciales.');
  }

  const user = data.user;
  const userMetadata = user?.user_metadata || {};
  const rolReal = userMetadata.rol;

  // 2. Control estricto de roles: evitar que un alumno ingrese al portal de profesores o viceversa
  if (rolReal !== rolEsperado) {
    await supabase.auth.signOut();
    throw new Error(`Esta cuenta no tiene permisos para acceder al portal de ${rolEsperado}s.`);
  }

  return {
    user,
    session: data.session,
    rol: rolReal,
    nombreCompleto: userMetadata.nombre || '',
    debeCambiarPass: Boolean(userMetadata.debe_cambiar_pass),
  };
}

/**
 * Cierra la sesión activa en el navegador.
 */
export async function logoutPortal() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error al cerrar sesión:', error);
    throw error;
  }
}

/**
 * Permite cambiar la contraseña provisoria (DNI) por una definitiva en el primer ingreso.
 *
 * @param {string} nuevaPassword - Nueva clave elegida por el usuario.
 */
export async function actualizarPasswordPrimerIngreso(nuevaPassword) {
  if (!nuevaPassword || nuevaPassword.length < 6) {
    throw new Error('La nueva contraseña debe tener al menos 6 caracteres.');
  }

  const { data, error } = await supabase.auth.updateUser({
    password: nuevaPassword,
    data: {
      debe_cambiar_pass: false, // Se desactiva el flag de primer ingreso
    },
  });

  if (error) {
    console.error('Error al actualizar contraseña:', error);
    throw new Error(error.message || 'No se pudo actualizar la contraseña.');
  }

  return data.user;
}