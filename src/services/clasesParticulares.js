import { supabase } from '../lib/supabaseClient';

export const obtenerMaterias = async () => {
  const { data, error } = await supabase
    .from('materias')
    .select('id, nombre')
    .order('nombre', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const obtenerClasesParticulares = async () => {
  const { data, error } = await supabase
    .from('clases_particulares')
    .select('id, nombre, materia_id, nivel, created_at, materias ( id, nombre )')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const registrarClaseParticular = async ({ nombre, materiaId, nivel }) => {
  const { data, error } = await supabase
    .from('clases_particulares')
    .insert({
      nombre: nombre.trim(),
      materia_id: materiaId,
      nivel: nivel.toLowerCase()
    })
    .select('id, nombre, materia_id, nivel, created_at, materias ( id, nombre )')
    .single();

  if (error) throw error;
  return data;
};
