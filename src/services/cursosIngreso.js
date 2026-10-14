import { supabase } from '../lib/supabaseClient';

async function asegurarPermisoAdministrativo() {
  const { data: sesionData, error: sesionError } = await supabase.auth.getSession();
  if (sesionError || !sesionData?.session?.user) {
    throw new Error('Tu sesión ha expirado. Por favor, volvé a iniciar sesión.');
  }

  const user = sesionData.session.user;
  const rawRole = (
    user.app_metadata?.rol ||
    user.app_metadata?.role ||
    user.user_metadata?.rol ||
    user.user_metadata?.role ||
    ''
  ).toLowerCase().trim();

  // Acepta mesa_entrada, mesa de entrada, gerente o admin
  const tienePermiso =
    rawRole === 'mesa_entrada' ||
    rawRole === 'mesa de entrada' ||
    rawRole === 'gerente' ||
    rawRole === 'admin' ||
    rawRole.includes('mesa');

  if (!tienePermiso) {
    // Si no está en metadata, comprobar en perfiles
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .maybeSingle();

    const rolPerfil = (perfil?.rol || '').toLowerCase().trim();
    if (rolPerfil.includes('mesa') || rolPerfil.includes('gerente') || rolPerfil.includes('admin')) {
      return true;
    }

    throw new Error('Tu cuenta no tiene permisos administrativos para guardar cursos. Contactá al administrador.');
  }

  return true;
}

export async function getCursosIngreso() {
  const { data, error } = await supabase
    .from('cursos_ingreso')
    .select(`
      id,
      nombre,
      descripcion,
      activo,
      fecha_inicio,
      fecha_fin,
      curso_ingreso_materias (
        materia_id,
        materias (
          id,
          nombre,
          nivel
        )
      )
    `)
    .order('nombre', { ascending: true });

  if (error) {
    console.error('Error al obtener cursos de ingreso:', error);
    throw error;
  }
  return data || [];
}

export async function getMateriasDisponibles() {
  const { data, error } = await supabase
    .from('materias')
    .select('id, nombre, nivel, activo')
    .eq('activo', true)
    .order('nombre', { ascending: true });

  if (error) {
    console.error('Error al obtener materias:', error);
    throw error;
  }
  return data || [];
}

export async function createCursoIngreso({ nombre, descripcion, fechaInicio, fechaFin, materiasIds }) {
  await asegurarPermisoAdministrativo();

  const cleanNombre = nombre?.trim();
  if (!cleanNombre) {
    throw new Error('El nombre del curso es obligatorio.');
  }

  if (!materiasIds || materiasIds.length === 0) {
    throw new Error('Debe asociar al menos una materia universitaria al curso.');
  }

  const { data: cursoCreado, error: cursoError } = await supabase
    .from('cursos_ingreso')
    .insert([
      {
        nombre: cleanNombre,
        descripcion: descripcion?.trim() || null,
        fecha_inicio: fechaInicio || null,
        fecha_fin: fechaFin || null,
        activo: true
      }
    ])
    .select()
    .single();

  if (cursoError) {
    console.error('Error en createCursoIngreso:', cursoError);
    if (cursoError.message?.includes('violates row-level security')) {
      throw new Error('Tu cuenta no tiene permisos administrativos para guardar cursos. Contactá al administrador.');
    }
    throw new Error(cursoError.message || 'Error al registrar el curso de ingreso.');
  }

  if (cursoCreado && materiasIds.length > 0) {
    const filasRelacion = materiasIds.map((materiaId) => ({
      curso_id: cursoCreado.id,
      materia_id: materiaId
    }));

    const { error: relError } = await supabase
      .from('curso_ingreso_materias')
      .insert(filasRelacion);

    if (relError) {
      console.warn('Advertencia al asociar materias al curso:', relError.message);
    }
  }

  return cursoCreado;
}

export async function updateCursoIngreso(id, { nombre, descripcion, fechaInicio, fechaFin, activo, materiasIds }) {
  await asegurarPermisoAdministrativo();

  const cleanNombre = nombre?.trim();
  if (!cleanNombre) {
    throw new Error('El nombre del curso es obligatorio.');
  }

  const payload = {
    nombre: cleanNombre,
    descripcion: descripcion?.trim() || null,
    fecha_inicio: fechaInicio || null,
    fecha_fin: fechaFin || null,
    activo: Boolean(activo)
  };

  const { data: cursoActualizado, error: cursoError } = await supabase
    .from('cursos_ingreso')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (cursoError) {
    console.error('Error en updateCursoIngreso:', cursoError);
    if (cursoError.message?.includes('violates row-level security')) {
      throw new Error('Tu cuenta no tiene permisos administrativos para guardar cursos. Contactá al administrador.');
    }
    throw new Error(cursoError.message || 'Error al actualizar el curso de ingreso.');
  }

  if (materiasIds && materiasIds.length > 0) {
    await supabase
      .from('curso_ingreso_materias')
      .delete()
      .eq('curso_id', id);

    const nuevasFilas = materiasIds.map((materiaId) => ({
      curso_id: id,
      materia_id: materiaId
    }));

    const { error: relError } = await supabase
      .from('curso_ingreso_materias')
      .insert(nuevasFilas);

    if (relError) {
      console.warn('Advertencia al actualizar materias del curso:', relError.message);
    }
  }

  return cursoActualizado;
}

export async function cambiarEstadoCursoIngreso(id, activo) {
  await asegurarPermisoAdministrativo();

  const { data, error } = await supabase
    .from('cursos_ingreso')
    .update({ activo: Boolean(activo) })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message || 'No se pudo cambiar el estado del curso.');
  }
  return data;
}