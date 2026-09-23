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
