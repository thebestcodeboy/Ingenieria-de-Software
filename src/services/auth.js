import { supabase } from '../lib/supabaseClient';

/**
 * Inicia sesión en Supabase con email y contraseña
 */
export async function loginWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { user: data?.user ?? null, session: data?.session ?? null, error };
}

/**
 * Cierra la sesión activa
 */
export async function logoutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Obtiene la sesión activa actual
 */
export async function getActiveSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
}

/**
 * Obtiene el rol normalizado a partir de los metadatos o email del usuario
 */
export function getRoleFromUser(user) {
  if (!user) return null;

  const rawRole = (user.app_metadata?.rol || user.app_metadata?.role || user.user_metadata?.rol || user.user_metadata?.role || '').toLowerCase().trim();

  if (rawRole === 'gerente' || rawRole === 'gerencia') {
    return 'gerente';
  }
  if (rawRole === 'profesor' || rawRole === 'docente') {
    return 'profesor';
  }
  if (rawRole === 'alumno' || rawRole === 'estudiante') {
    return 'alumno';
  }
  if (rawRole === 'mesa_entrada' || rawRole === 'admin' || rawRole === 'administrador') {
    return 'mesa_entrada';
  }

  const email = (user.email || '').toLowerCase().trim();
  if (email.startsWith('gerente') || email.startsWith('gerencia')) {
    return 'gerente';
  }

  return rawRole || null;
}