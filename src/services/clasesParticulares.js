import { supabase } from '../lib/supabaseClient';

export const obtenerMaterias = async () => {
  const { data, error } = await supabase
    .from('materias')
    .select('id, nombre, nivel')
    .order('nombre', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const obtenerClasesParticulares = async () => {
  const { data, error } = await supabase
    .from('clases_particulares')
    .select('id, nombre, materia_id, nivel, activo, created_at, materias ( id, nombre )')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const registrarClaseParticular = async ({ nombre, materiaId, nivel }) => {
  const limpio = nombre.trim().replace(/\s+/g, ' ');

  if (!limpio || limpio.length < 4) {
    throw new Error('El nombre de la actividad debe tener al menos 4 caracteres.');
  }

  if (/\d/.test(limpio)) {
    throw new Error('El nombre de la actividad no puede contener números.');
  }

  const { data, error } = await supabase
    .from('clases_particulares')
    .insert({
      nombre: limpio.toUpperCase(),
      materia_id: materiaId,
      nivel: nivel.toLowerCase(),
      activo: true
    })
    .select('id, nombre, materia_id, nivel, activo, created_at, materias ( id, nombre )')
    .single();

  if (error) throw error;
  return data;
};

export const actualizarClaseParticular = async (id, { nombre, materiaId, nivel, activo }) => {
  const limpio = nombre.trim().replace(/\s+/g, ' ');

  if (!limpio || limpio.length < 4) {
    throw new Error('El nombre de la actividad debe tener al menos 4 caracteres.');
  }

  if (/\d/.test(limpio)) {
    throw new Error('El nombre de la actividad no puede contener números.');
  }

  const { data, error } = await supabase
    .from('clases_particulares')
    .update({
      nombre: limpio.toUpperCase(),
      materia_id: materiaId,
      nivel: nivel.toLowerCase(),
      activo: activo
    })
    .eq('id', id)
    .select('id, nombre, materia_id, nivel, activo, created_at, materias ( id, nombre )')
    .single();

  if (error) throw error;
  return data;
};

export const cambiarEstadoClase = async (id, activoActual) => {
  const { data, error } = await supabase
    .from('clases_particulares')
    .update({ activo: !activoActual })
    .eq('id', id)
    .select('id, activo')
    .single();

  if (error) throw error;
  return data;
};