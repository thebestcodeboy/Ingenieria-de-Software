import { supabase } from '@/lib/supabaseClient';
import { validarCupo } from '@/domain/cupo';

export { validarCupo } from '@/domain/cupo';

export interface FranjaDisponibilidad {
  franja: 'Mañana' | 'Tarde' | 'Noche';
  horaInicio: string;
  horaFin: string;
}

export type TurnoConCupo = {
  turno_id: string;
  fecha: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  materia_nombre: string | null;
  actividad_nombre: string | null;
  profesor_id?: string | null;
  profesor_nombre_completo: string | null;
  aula_numero: string | number | null;
  cupo_maximo: number | null;
  inscriptos_actuales: number;
  lugares_disponibles: number | null;
  estado?: string | null; // HU14: 'activo' | 'cancelado'
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
  turnoIdExcluir?: string;
}

export interface ReprogramarTurnoPayload {
  turnoId: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  aulaNumero: string | number;
  profesorId: string;
  materiaId?: string;
}

const CAMPOS_TURNO = [
  'turno_id',
  'fecha',
  'hora_inicio',
  'hora_fin',
  'materia_nombre',
  'actividad_nombre',
  'profesor_id',
  'profesor_nombre_completo',
  'aula_numero',
  'cupo_maximo',
  'inscriptos_actuales',
  'lugares_disponibles',
  'estado',
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
    profesor_id: fila.profesor_id ? String(fila.profesor_id) : null,
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
    estado: fila.estado ? String(fila.estado) : 'activo',
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
 * HU08 y HU16: Carga entidades maestras incluyendo disponibilidad horaria docente
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
    supabase.from('profesores').select('id, nombre, apellido, materias_ids, turnos, disponibilidad, activo'),
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
 * HU14 y HU16: Validación de disponibilidad horaria docente y control de superposición
 * Los turnos cancelados se ignoran para liberar la franja horaria.
 */
export async function validarDisponibilidadProfesor(
  profesorId: string,
  fecha: string,
  horaInicio: string,
  horaFin: string,
  turnoIdExcluir?: string
): Promise<{ valido: boolean; motivo?: string }> {
  const { data: prof, error: profError } = await supabase
    .from('profesores')
    .select('nombre, apellido, turnos, disponibilidad, activo')
    .eq('id', profesorId)
    .single();

  if (profError || !prof) {
    return { valido: false, motivo: 'No se encontró el profesor seleccionado.' };
  }

  if (prof.activo === false) {
    return { valido: false, motivo: 'El profesor seleccionado no se encuentra en estado ACTIVO.' };
  }

  const nombreDocente = `${prof.apellido}, ${prof.nombre}`;
  const disponibilidad: FranjaDisponibilidad[] = Array.isArray(prof.disponibilidad)
    ? prof.disponibilidad
    : [];

  if (disponibilidad.length > 0) {
    const encajaEnAlgunaFranja = disponibilidad.some((franja) => {
      return horaInicio >= franja.horaInicio && horaFin <= franja.horaFin;
    });

    if (!encajaEnAlgunaFranja) {
      const franjasTexto = disponibilidad
        .map((f) => `${f.franja} (${f.horaInicio} a ${f.horaFin})`)
        .join(', ');
      return {
        valido: false,
        motivo: `El horario seleccionado (${horaInicio} a ${horaFin}) no coincide con la disponibilidad configurada de ${nombreDocente}. Sus franjas habilitadas son: ${franjasTexto}.`,
      };
    }
  }

  let query = supabase
    .from('turnos_clase')
    .select('id, hora_inicio, hora_fin, estado')
    .eq('profesor_id', profesorId)
    .eq('fecha', fecha)
    .neq('estado', 'cancelado');

  if (turnoIdExcluir) {
    query = query.neq('id', turnoIdExcluir);
  }

  const { data: turnosMismoDia, error: queryError } = await query;

  if (queryError) {
    console.error('Error al verificar turnos de profesor:', queryError);
  } else if (turnosMismoDia && turnosMismoDia.length > 0) {
    const solapado = turnosMismoDia.find((t) => {
      const tInicio = String(t.hora_inicio).slice(0, 5);
      const tFin = String(t.hora_fin).slice(0, 5);
      return horaInicio < tFin && horaFin > tInicio;
    });

    if (solapado) {
      const solapadoInicio = String(solapado.hora_inicio).slice(0, 5);
      const solapadoFin = String(solapado.hora_fin).slice(0, 5);
      return {
        valido: false,
        motivo: `${nombreDocente} ya tiene asignada otra clase activa en ese horario (${solapadoInicio} a ${solapadoFin}) el día ${fecha}.`,
      };
    }
  }

  return { valido: true };
}

/**
 * HU14: Control de superposición de aula
 * Impide asignar un aula si ya está ocupada por otro turno activo en el mismo horario.
 */
export async function validarDisponibilidadAula(
  aulaNumero: string | number,
  fecha: string,
  horaInicio: string,
  horaFin: string,
  turnoIdExcluir?: string
): Promise<{ valido: boolean; motivo?: string }> {
  let query = supabase
    .from('turnos_clase')
    .select('id, hora_inicio, hora_fin, estado')
    .eq('aula_numero', aulaNumero)
    .eq('fecha', fecha)
    .neq('estado', 'cancelado');

  if (turnoIdExcluir) {
    query = query.neq('id', turnoIdExcluir);
  }

  const { data: turnosAula, error: queryError } = await query;

  if (queryError) {
    console.error('Error al verificar ocupación de aula:', queryError);
  } else if (turnosAula && turnosAula.length > 0) {
    const solapado = turnosAula.find((t) => {
      const tInicio = String(t.hora_inicio).slice(0, 5);
      const tFin = String(t.hora_fin).slice(0, 5);
      return horaInicio < tFin && horaFin > tInicio;
    });

    if (solapado) {
      const solapadoInicio = String(solapado.hora_inicio).slice(0, 5);
      const solapadoFin = String(solapado.hora_fin).slice(0, 5);
      return {
        valido: false,
        motivo: `El Aula ${aulaNumero} ya está ocupada por otra clase en ese horario (${solapadoInicio} a ${solapadoFin}) el día ${fecha}.`,
      };
    }
  }

  return { valido: true };
}

/**
 * HU08, HU14 y HU16: Registrar nuevo turno
 */
export async function registrarTurno(payload: FormNuevoTurnoPayload) {
  if (payload.horaInicio >= payload.horaFin) {
    throw new Error('La hora de finalización debe ser posterior a la hora de inicio.');
  }

  const chequeoProfesor = await validarDisponibilidadProfesor(
    payload.profesorId,
    payload.fecha,
    payload.horaInicio,
    payload.horaFin,
    payload.turnoIdExcluir
  );
  if (!chequeoProfesor.valido) {
    throw new Error(chequeoProfesor.motivo);
  }

  const chequeoAula = await validarDisponibilidadAula(
    payload.aulaNumero,
    payload.fecha,
    payload.horaInicio,
    payload.horaFin,
    payload.turnoIdExcluir
  );
  if (!chequeoAula.valido) {
    throw new Error(chequeoAula.motivo);
  }

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
    estado: 'activo',
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

/**
 * HU14: Cancelar turno de clase (Baja lógica, mantiene historial)
 */
export async function cancelarTurno(turnoId: string) {
  const { data, error } = await supabase
    .from('turnos_clase')
    .update({ estado: 'cancelado' })
    .eq('id', turnoId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message || 'No se pudo cancelar el turno.');
  }

  return data;
}

/**
 * HU14: Reprogramar turno de clase (modificar fecha, horario, aula y profesor)
 */
export async function reprogramarTurno(payload: ReprogramarTurnoPayload) {
  if (payload.horaInicio >= payload.horaFin) {
    throw new Error('La hora de finalización debe ser posterior a la hora de inicio.');
  }

  const chequeoProfesor = await validarDisponibilidadProfesor(
    payload.profesorId,
    payload.fecha,
    payload.horaInicio,
    payload.horaFin,
    payload.turnoId
  );
  if (!chequeoProfesor.valido) {
    throw new Error(chequeoProfesor.motivo);
  }

  const chequeoAula = await validarDisponibilidadAula(
    payload.aulaNumero,
    payload.fecha,
    payload.horaInicio,
    payload.horaFin,
    payload.turnoId
  );
  if (!chequeoAula.valido) {
    throw new Error(chequeoAula.motivo);
  }

  const { data, error } = await supabase
    .from('turnos_clase')
    .update({
      fecha: payload.fecha,
      hora_inicio: payload.horaInicio,
      hora_fin: payload.horaFin,
      aula_numero: Number(payload.aulaNumero) || payload.aulaNumero,
      profesor_id: payload.profesorId,
    })
    .eq('id', payload.turnoId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message || 'No se pudo reprogramar el turno.');
  }

  return data;
}