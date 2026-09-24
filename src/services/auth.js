import { supabase } from '../lib/supabaseClient';

/**
 * Inicia sesión en Supabase con email y contraseña
 */
export async function loginWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
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
 * Obtiene el rol normalizado a partir de los metadatos del usuario
 */
export function getRoleFromUser(user) {
  if (!user || !user.user_metadata) return null;
  return user.user_metadata.rol || null;
}