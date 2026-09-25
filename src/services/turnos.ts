import { supabase } from '@/lib/supabaseClient';
import { validarCupo } from '@/domain/cupo';

export { validarCupo } from '@/domain/cupo';

export type TurnoConCupo = {
  turno_id: string;
  fecha: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  materia_nombre: string | null;
  actividad_nombre: string | null;
  profesor_nombre_completo: string | null;
  aula_numero: string | number | null;
  cupo_maximo: number | null;
  inscriptos_actuales: number;
  lugares_disponibles: number | null;
};

type DefinirCupoResultado = {
  turno_id: string;
  cupo_maximo: number;
  inscriptos_actuales: number;
  lugares_disponibles: number;
};

export interface FormNuevoTurnoPayload {
  actividadTipo: 'curso' | 'particular';
  actividadId: string;
  materiaId: string;
  profesorId: string;
  aulaNumero: string | number;
  cupoMaximo?: number | null;
  fecha: string;
  horaInicio: string;
  horaFin: string;
}

const CAMPOS_TURNO = [
  'turno_id',
  'fecha',
  'hora_inicio',
  'hora_fin',
  'materia_nombre',
  'actividad_nombre',
  'profesor_nombre_completo',
  'aula_numero',
  'cupo_maximo',
  'inscriptos_actuales',
  'lugares_disponibles',
].join(',');

function numeroSeguro(valor: unknown, valorPorDefecto = 0): number {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : valorPorDefecto;
}

function normalizarTurno(fila: Record<string, unknown>): TurnoConCupo {
  const cupo = fila.cupo_maximo === null ? null : numeroSeguro(fila.cupo_maximo);

  return {
    turno_id: String(fila.turno_id),
    fecha: fila.fecha ? String(fila.fecha) : null,
    hora_inicio: fila.hora_inicio ? String(fila.hora_inicio) : null,
    hora_fin: fila.hora_fin ? String(fila.hora_fin) : null,
    materia_nombre: fila.materia_nombre ? String(fila.materia_nombre) : null,
    actividad_nombre: fila.actividad_nombre ? String(fila.actividad_nombre) : null,
    profesor_nombre_completo: fila.profesor_nombre_completo
      ? String(fila.profesor_nombre_completo)
      : null,
    aula_numero:
      fila.aula_numero === null || fila.aula_numero === undefined
        ? null
        : String(fila.aula_numero),
    cupo_maximo: cupo,
    inscriptos_actuales: numeroSeguro(fila.inscriptos_actuales),
    lugares_disponibles:
      fila.lugares_disponibles === null || fila.lugares_disponibles === undefined
        ? null
        : numeroSeguro(fila.lugares_disponibles),
  };
}

export async function listarTurnosConCupo(): Promise<TurnoConCupo[]> {
  const { data, error } = await supabase
    .from('vista_calendario')
    .select(CAMPOS_TURNO)
    .order('fecha', { ascending: true })
    .order('hora_inicio', { ascending: true });

  if (error) {
    throw new Error(`No se pudieron consultar los turnos: ${error.message}`);
  }

  return (data ?? []).map((fila) =>
    normalizarTurno(fila as unknown as Record<string, unknown>),
  );
}

function mensajeDeError(error: { code?: string; message?: string }): string {
  const detalle = `${error.code ?? ''} ${error.message ?? ''}`;

  if (detalle.includes('CUPO_MENOR_A_INSCRIPTOS')) {
    return 'El cupo no puede quedar por debajo de la cantidad de alumnos inscriptos.';
  }

  if (detalle.includes('CUPO_INVALIDO') || error.code === '22023') {
    return 'El cupo debe ser un número entero mayor que cero.';
  }

  if (detalle.includes('TURNO_NO_EXISTE') || error.code === 'P0002') {
    return 'El turno seleccionado ya no existe.';
  }

  if (error.code === 'PGRST202') {
    return 'La función de cupos todavía no fue instalada en Supabase. Aplicá la migración HU09.';
  }

  return error.message || 'No se pudo guardar el cupo.';
}

export async function definirCupoTurno(
  turnoId: string,
  cupoMaximo: number,
  inscriptosActuales: number,
): Promise<DefinirCupoResultado> {
  const errorValidacion = validarCupo(cupoMaximo, inscriptosActuales);

  if (errorValidacion) {
    throw new Error(errorValidacion);
  }

  const { data, error } = await supabase.rpc('definir_cupo_turno', {
    p_turno_id: turnoId,
    p_cupo_maximo: cupoMaximo,
  });

  if (error) {
    throw new Error(mensajeDeError(error));
  }

  const fila = Array.isArray(data) ? data[0] : data;

  if (!fila) {
    throw new Error('Supabase no devolvió el turno actualizado.');
  }

  return {
    turno_id: String(fila.turno_id),
    cupo_maximo: numeroSeguro(fila.cupo_maximo),
    inscriptos_actuales: numeroSeguro(fila.inscriptos_actuales),
    lugares_disponibles: numeroSeguro(fila.lugares_disponibles),
  };
}

/**
 * HU08: Carga las entidades maestras y relaciones para armar los desplegables de nuevo turno
 */
export async function obtenerDatosTurnos() {
  const [
    cursosRes,
    particularesRes,
    materiasRes,
    profesoresRes,
    profesorMateriasRes,
    cursoMateriasRes,
    aulasRes,
  ] = await Promise.all([
    supabase.from('cursos_ingreso').select('id, nombre'),
    supabase.from('clases_particulares').select('id, nombre, materia_id'),
    supabase.from('materias').select('id, nombre'),
    supabase.from('profesores').select('id, nombre, apellido, materias_ids'),
    supabase.from('profesor_materia').select('profesor_id, materia_id'),
    supabase.from('curso_ingreso_materias').select('curso_id, materia_id'),
    supabase.from('aulas').select('numero, descripcion, capacidad'),
  ]);

  if (cursosRes.error) console.error('Error cursos:', cursosRes.error);
  if (materiasRes.error) console.error('Error materias:', materiasRes.error);
  if (profesoresRes.error) console.error('Error profesores:', profesoresRes.error);
  if (profesorMateriasRes.error) console.error('Error profesor_materia:', profesorMateriasRes.error);
  if (cursoMateriasRes.error) console.error('Error curso_ingreso_materias:', cursoMateriasRes.error);
  if (aulasRes.error) console.error('Error aulas:', aulasRes.error);

  return {
    cursos: cursosRes.data || [],
    particulares: particularesRes.data || [],
    materias: materiasRes.data || [],
    profesores: profesoresRes.data || [],
    profesorMaterias: profesorMateriasRes.data || [],
    cursoMaterias: cursoMateriasRes.data || [],
    aulas: aulasRes.data || [],
  };
}

/**
 * HU08: Inserta un nuevo turno en la tabla `turnos_clase`
 */
export async function registrarTurno(payload: FormNuevoTurnoPayload) {
  const esParticular = payload.actividadTipo === 'particular';

  const nuevoRegistro: Record<string, string | number | null> = {
    tipo_actividad: esParticular ? 'clase_particular' : 'curso_ingreso',
    materia_id: payload.materiaId,
    profesor_id: payload.profesorId,
    aula_numero: Number(payload.aulaNumero) || payload.aulaNumero,
    cupo_maximo: payload.cupoMaximo ? Number(payload.cupoMaximo) : null,
    fecha: payload.fecha,
    hora_inicio: payload.horaInicio,
    hora_fin: payload.horaFin,
    curso_id: esParticular ? null : payload.actividadId,
    clase_particular_id: esParticular ? payload.actividadId : null,
  };

  const { data, error } = await supabase
    .from('turnos_clase')
    .insert([nuevoRegistro])
    .select()
    .single();

  if (error) {
    throw new Error(error.message || 'No se pudo registrar el turno en la base de datos.');
  }

  return data;
}
