import { supabase } from '@/lib/supabaseClient';

export type CursoPortalProfesor = {
  curso_id: string;
  nombre: string;
  descripcion: string | null;
  materias: string[];
  anotado: boolean;
  cantidad_alumnos: number;
  tipo?: 'ingreso' | 'particular';
};

export type TurnoCalendarioProfesor = {
  turno_id: string;
  fecha: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  materia_nombre: string;
  actividad_nombre: string;
  aula_numero: string | null;
  cantidad_alumnos: number;
};

function normalizarCurso(fila: Record<string, unknown>): CursoPortalProfesor {
  return {
    curso_id: String(fila.curso_id),
    nombre: String(fila.nombre ?? 'Curso sin nombre'),
    descripcion: fila.descripcion ? String(fila.descripcion) : null,
    materias: Array.isArray(fila.materias)
      ? fila.materias.map((materia) => String(materia))
      : [],
    anotado: Boolean(fila.anotado),
    cantidad_alumnos: Number(fila.cantidad_alumnos ?? 0),
    tipo: 'ingreso',
  };
}

function mensajeError(error: { code?: string; message?: string }) {
  const detalle = `${error.code ?? ''} ${error.message ?? ''}`;

  if (detalle.includes('PROFESOR_NO_VINCULADO')) {
    return 'Tu cuenta todavía no está vinculada con un profesor. Solicitá la habilitación en Mesa de Entrada.';
  }
  if (detalle.includes('CURSO_NO_COMPATIBLE')) {
    return 'No podés anotarte porque el curso no contiene una materia que tengas habilitada.';
  }
  if (detalle.includes('CLASE_PARTICULAR_NO_ASIGNADA')) {
    return 'La clase particular no está asignada a tu cuenta docente.';
  }
  if (error.code === 'PGRST202') {
    return 'El portal docente todavía no fue instalado en Supabase. Aplicá la migración correspondiente.';
  }
  return error.message || 'No se pudo completar la operación.';
}

export async function listarCursosProfesor(): Promise<CursoPortalProfesor[]> {
  const { data, error } = await supabase.rpc('listar_cursos_portal_profesor');

  if (error) throw new Error(mensajeError(error));

  return (data ?? []).map((fila: Record<string, unknown>) => normalizarCurso(fila));
}

export async function listarClasesParticularesProfesor(): Promise<CursoPortalProfesor[]> {
  const { data, error } = await supabase.rpc('listar_clases_particulares_profesor');

  if (error) {
    if (error.code === 'PGRST202') throw new Error('Falta aplicar la migración mis_cursos_clases_particulares en Supabase.');
    throw new Error(mensajeError(error));
  }

  return (data ?? []).map((fila: Record<string, unknown>) => {
    const materia = fila.materia ? String(fila.materia) : '';
    const nivel = fila.nivel ? String(fila.nivel) : '';
    return {
      curso_id: String(fila.clase_id),
      nombre: String(fila.nombre ?? 'Clase particular'),
      descripcion: `Clase particular${materia ? ` de ${materia}` : ''}${nivel ? ` · nivel ${nivel}` : ''}.`,
      materias: materia ? [materia] : [],
      anotado: true,
      cantidad_alumnos: Number(fila.cantidad_alumnos ?? 0),
      tipo: 'particular' as const,
    };
  });
}

export async function listarCalendarioProfesor(
  desde: string,
  hasta: string,
): Promise<TurnoCalendarioProfesor[]> {
  const { data, error } = await supabase.rpc('listar_calendario_profesor', {
    p_desde: desde,
    p_hasta: hasta,
  });

  if (error) throw new Error(mensajeError(error));

  return (data ?? []).map((fila: Record<string, unknown>) => ({
    turno_id: String(fila.turno_id),
    fecha: String(fila.fecha),
    hora_inicio: fila.hora_inicio ? String(fila.hora_inicio) : null,
    hora_fin: fila.hora_fin ? String(fila.hora_fin) : null,
    materia_nombre: String(fila.materia_nombre ?? 'Sin materia'),
    actividad_nombre: String(fila.actividad_nombre ?? 'Clase'),
    aula_numero: fila.aula_numero == null ? null : String(fila.aula_numero),
    cantidad_alumnos: Number(fila.cantidad_alumnos ?? 0),
  }));
}

export async function cancelarTurnoProfesor(turnoId: string): Promise<void> {
  const { error } = await supabase.rpc('cancelar_turno_profesor', {
    p_turno_id: turnoId,
  });

  if (error) {
    const detalle = `${error.code ?? ''} ${error.message ?? ''}`;
    if (detalle.includes('TURNO_NO_ASIGNADO')) {
      throw new Error('Solo podés cancelar una clase que tenés asignada.');
    }
    if (detalle.includes('TURNO_PASADO')) {
      throw new Error('No se puede cancelar una clase que ya pasó.');
    }
    if (detalle.includes('TURNO_YA_CANCELADO')) {
      throw new Error('Esta clase ya fue cancelada.');
    }
    throw new Error(mensajeError(error));
  }
}

export type AlumnoCalendarioProfesor = { id: string; nombre: string; apellido: string; estado: string };
export type TurnoAvanzadoProfesor = {
  turno_id: string; fecha: string; hora_inicio: string | null; hora_fin: string | null;
  materia_nombre: string; actividad_nombre: string; aula_numero: string | null;
  cupo_maximo: number | null; cancelado: boolean; reprogramado: boolean; alumnos: AlumnoCalendarioProfesor[];
};
export async function listarCalendarioProfesorAvanzado(desde: string, hasta: string): Promise<TurnoAvanzadoProfesor[]> {
  const { data, error } = await supabase.rpc('listar_calendario_profesor_avanzado', { p_desde: desde, p_hasta: hasta });
  if (error) throw new Error(mensajeError(error));
  return (data ?? []) as TurnoAvanzadoProfesor[];
}

export type AlumnoCursoProfesor = {
  id: string; nombre: string; apellido: string; dni: string | number | null; legajo: string | null;
  email: string | null; telefono: string | null; direccion: string | null; clases: number; primera_clase: string | null;
};
export async function listarAlumnosCursoProfesor(cursoId: string, tipo: 'ingreso' | 'particular' = 'ingreso'): Promise<AlumnoCursoProfesor[]> {
  const { data, error } = tipo === 'particular'
    ? await supabase.rpc('listar_alumnos_clase_particular_profesor', { p_clase_id: cursoId })
    : await supabase.rpc('listar_alumnos_curso_profesor', { p_curso_id: cursoId });
  if (error) {
    if (error.code === 'PGRST202') {
      throw new Error(tipo === 'particular'
        ? 'Falta aplicar la migración de clases particulares del portal docente en Supabase.'
        : 'Falta aplicar la migración listar_alumnos_curso_profesor en Supabase.');
    }
    throw new Error(mensajeError(error));
  }
  return (data ?? []) as AlumnoCursoProfesor[];
}
