import { supabase } from '@/lib/supabaseClient';

export type CursoPortalProfesor = {
  curso_id: string;
  nombre: string;
  descripcion: string | null;
  materias: string[];
  anotado: boolean;
  cantidad_alumnos: number;
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

export async function anotarseCursoProfesor(cursoId: string): Promise<void> {
  const { error } = await supabase.rpc('anotarme_curso_profesor', {
    p_curso_id: cursoId,
  });

  if (error) throw new Error(mensajeError(error));
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
