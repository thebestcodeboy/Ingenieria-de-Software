export type FilaIndicador = Record<string, unknown>;

export type ResumenDashboard = {
  totalAlumnos: number;
  totalProfesores: number;
  totalMaterias: number;
  totalCursos: number;
  totalAulas: number;
  totalTurnos: number;
  clasesHoy: number;
  aulasUtilizadasHoy: number;
  totalInscriptos: number;
  cupoTotal: number;
  turnosDisponibles: number;
  turnosCompletos: number;
  turnosSinCupo: number;
  hayActividad: boolean;
};

const ESTADOS_NO_ACTIVOS = new Set(['inactivo', 'inactiva', 'cancelado', 'cancelada', 'cancelled']);
const ESTADOS_CANCELADOS = new Set(['cancelado', 'cancelada', 'cancelled']);

function estadoNormalizado(fila: FilaIndicador): string {
  return String(fila.estado ?? fila.status ?? '').trim().toLowerCase();
}

export function estaActivo(fila: FilaIndicador): boolean {
  return fila.activo !== false && !ESTADOS_NO_ACTIVOS.has(estadoNormalizado(fila));
}

export function estaCancelado(fila: FilaIndicador): boolean {
  return fila.activo === false || ESTADOS_CANCELADOS.has(estadoNormalizado(fila));
}

function numeroNoNegativo(valor: unknown): number {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0 ? numero : 0;
}

type DatosDashboard = {
  alumnos?: FilaIndicador[];
  profesores?: FilaIndicador[];
  materias?: FilaIndicador[];
  cursos?: FilaIndicador[];
  aulas?: FilaIndicador[];
  turnos?: FilaIndicador[];
};

export function calcularResumenDashboard(
  { alumnos = [], profesores = [], materias = [], cursos = [], aulas = [], turnos = [] }: DatosDashboard,
  fechaHoy: string,
): ResumenDashboard {
  const turnosVigentes = turnos.filter((turno) => !estaCancelado(turno));
  const turnosHoy = turnosVigentes.filter((turno) => turno.fecha === fechaHoy);
  const aulasUtilizadasHoy = new Set(
    turnosHoy
      .map((turno) => turno.aula_numero)
      .filter((aula) => aula !== null && aula !== undefined && String(aula).trim() !== '')
      .map(String),
  ).size;
  let totalInscriptos = 0;
  let cupoTotal = 0;
  let turnosDisponibles = 0;
  let turnosCompletos = 0;
  let turnosSinCupo = 0;

  for (const turno of turnosVigentes) {
    const inscriptos = numeroNoNegativo(turno.inscriptos_actuales);
    const tieneCupo = turno.cupo_maximo !== null && turno.cupo_maximo !== undefined;
    totalInscriptos += inscriptos;

    if (!tieneCupo) {
      turnosSinCupo += 1;
      continue;
    }

    const cupo = numeroNoNegativo(turno.cupo_maximo);
    cupoTotal += cupo;
    if (inscriptos >= cupo) turnosCompletos += 1;
    else turnosDisponibles += 1;
  }

  const resumen = {
    totalAlumnos: alumnos.filter(estaActivo).length,
    totalProfesores: profesores.filter(estaActivo).length,
    totalMaterias: materias.filter(estaActivo).length,
    totalCursos: cursos.filter(estaActivo).length,
    totalAulas: aulas.filter(estaActivo).length,
    totalTurnos: turnos.length,
    clasesHoy: turnosHoy.length,
    aulasUtilizadasHoy,
    totalInscriptos,
    cupoTotal,
    turnosDisponibles,
    turnosCompletos,
    turnosSinCupo,
  };

  return {
    ...resumen,
    hayActividad: Object.values(resumen).some((valor) => valor > 0),
  };
}
