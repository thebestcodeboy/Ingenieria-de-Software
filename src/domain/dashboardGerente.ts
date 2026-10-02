export type FilaGerencial = Record<string, unknown>;

export type CursoDemanda = {
  nombre: string;
  inscriptos: number;
};

export type ResumenGerencial = {
  inscripcionesMesActual: number;
  inscripcionesMesAnterior: number;
  diferenciaInscripciones: number;
  variacionInscripciones: number | null;
  ocupacionPromedio: number;
  demandaCursos: CursoDemanda[];
  cursoMayorDemanda: CursoDemanda | null;
  cursoMenorDemanda: CursoDemanda | null;
  clasesProgramadasMes: number;
  promedioSemanalClases: number;
  hayActividad: boolean;
};

type DatosGerenciales = {
  inscripciones?: FilaGerencial[];
  turnos?: FilaGerencial[];
};

const ESTADOS_CANCELADOS = new Set(['cancelado', 'cancelada', 'cancelled']);

function normalizar(valor: unknown): string {
  return String(valor ?? '').trim().toLowerCase();
}

function estaCancelado(fila: FilaGerencial): boolean {
  return fila.cancelado === true
    || fila.activo === false
    || ESTADOS_CANCELADOS.has(normalizar(fila.estado ?? fila.status));
}

function numeroNoNegativo(valor: unknown): number {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0 ? numero : 0;
}

function fechaFila(fila: FilaGerencial): string {
  return String(fila.created_at ?? fila.fecha_inscripcion ?? fila.fecha ?? '').slice(0, 10);
}

function periodo(fecha: string): string {
  return fecha.slice(0, 7);
}

function periodoAnterior(fechaReferencia: string): string {
  const [anio, mes] = fechaReferencia.split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 2, 1));
  return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, '0')}`;
}

function diasDelMes(fechaReferencia: string): number {
  const [anio, mes] = fechaReferencia.split('-').map(Number);
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

function esCursoIngreso(turno: FilaGerencial): boolean {
  const tipo = normalizar(turno.tipo_actividad ?? turno.actividad_tipo ?? turno.tipo);
  return tipo.includes('curso') || Boolean(turno.curso_nombre ?? turno.nombre_curso);
}

function nombreCurso(turno: FilaGerencial): string {
  const nombre = turno.actividad_nombre ?? turno.curso_nombre ?? turno.nombre_curso ?? 'Curso sin nombre';
  return String(nombre).trim() || 'Curso sin nombre';
}

function idTurno(fila: FilaGerencial): string {
  return String(fila.turno_id ?? fila.id ?? '').trim();
}

function idCurso(turno: FilaGerencial): string {
  const id = String(turno.curso_id ?? '').trim();
  return id || `nombre:${normalizar(nombreCurso(turno))}`;
}

export function calcularResumenGerencial(
  { inscripciones = [], turnos = [] }: DatosGerenciales,
  fechaReferencia: string,
): ResumenGerencial {
  const mesActual = periodo(fechaReferencia);
  const mesAnterior = periodoAnterior(fechaReferencia);
  const inscripcionesVigentes = inscripciones.filter((fila) => !estaCancelado(fila));
  const inscripcionesMesActual = inscripcionesVigentes.filter(
    (fila) => periodo(fechaFila(fila)) === mesActual,
  ).length;
  const inscripcionesMesAnterior = inscripcionesVigentes.filter(
    (fila) => periodo(fechaFila(fila)) === mesAnterior,
  ).length;
  const diferenciaInscripciones = inscripcionesMesActual - inscripcionesMesAnterior;
  const variacionInscripciones = inscripcionesMesAnterior > 0
    ? Math.round((diferenciaInscripciones / inscripcionesMesAnterior) * 100)
    : null;

  const turnosMes = turnos.filter(
    (turno) => periodo(fechaFila(turno)) === mesActual && !estaCancelado(turno),
  );
  const turnosCursos = turnosMes.filter(esCursoIngreso);
  const cursosPorClave = new Map<string, { nombre: string; alumnos: Set<string> }>();
  const cursoPorTurno = new Map<string, string>();
  let inscriptosConCupo = 0;
  let cuposDefinidos = 0;

  for (const turno of turnosCursos) {
    const nombre = nombreCurso(turno);
    const claveCurso = idCurso(turno);
    if (!cursosPorClave.has(claveCurso)) {
      cursosPorClave.set(claveCurso, { nombre, alumnos: new Set<string>() });
    }
    const turnoId = idTurno(turno);
    if (turnoId) cursoPorTurno.set(turnoId, claveCurso);

    const inscriptos = numeroNoNegativo(turno.inscriptos_actuales);

    const cupo = numeroNoNegativo(turno.cupo_maximo);
    if (cupo > 0) {
      inscriptosConCupo += inscriptos;
      cuposDefinidos += cupo;
    }
  }


  for (const inscripcion of inscripcionesVigentes) {
    const claveCurso = cursoPorTurno.get(String(inscripcion.turno_id ?? '').trim());
    const alumnoId = String(inscripcion.alumno_id ?? '').trim();
    if (claveCurso && alumnoId) {
      cursosPorClave.get(claveCurso)?.alumnos.add(alumnoId);
    }
  }

  const cursos = [...cursosPorClave.values()]
    .map(({ nombre, alumnos }) => ({ nombre, inscriptos: alumnos.size }))
    .sort((a, b) => b.inscriptos - a.inscriptos || a.nombre.localeCompare(b.nombre, 'es'));
  const cursosAscendentes = [...cursos]
    .sort((a, b) => a.inscriptos - b.inscriptos || a.nombre.localeCompare(b.nombre, 'es'));
  const ocupacionPromedio = cuposDefinidos > 0
    ? Math.min(100, Math.round((inscriptosConCupo / cuposDefinidos) * 100))
    : 0;
  const semanasDelMes = Math.ceil(diasDelMes(fechaReferencia) / 7);
  const promedioSemanalClases = turnosMes.length > 0
    ? Number((turnosMes.length / semanasDelMes).toFixed(1))
    : 0;

  return {
    inscripcionesMesActual,
    inscripcionesMesAnterior,
    diferenciaInscripciones,
    variacionInscripciones,
    ocupacionPromedio,
    demandaCursos: cursos,
    cursoMayorDemanda: cursos[0] ?? null,
    cursoMenorDemanda: cursosAscendentes[0] ?? null,
    clasesProgramadasMes: turnosMes.length,
    promedioSemanalClases,
    hayActividad: inscripcionesMesActual > 0 || inscripcionesMesAnterior > 0 || turnosMes.length > 0,
  };
}
