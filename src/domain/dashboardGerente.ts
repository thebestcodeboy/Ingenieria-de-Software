export type FilaGerencial = Record<string, unknown>;

export type CursoDemanda = {
  nombre: string;
  inscriptos: number;
};

export type ActividadDemanda = CursoDemanda & {
  tipo: 'Curso de ingreso' | 'Clase particular';
  clave: string;
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
  demandaActividades: ActividadDemanda[];
  actividadMayorDemanda: ActividadDemanda | null;
  actividadMenorDemanda: ActividadDemanda | null;
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
  return Boolean(turno.curso_id ?? turno.curso_nombre ?? turno.nombre_curso ?? turno.cursos_ingreso)
    || tipo.includes('curso') || tipo.includes('ingreso');
}

function esClaseParticular(turno: FilaGerencial): boolean {
  const tipo = normalizar(turno.tipo_actividad ?? turno.actividad_tipo ?? turno.tipo);
  return Boolean(turno.clase_particular_id ?? turno.clase_particular_nombre ?? turno.clases_particulares)
    || tipo.includes('particular');
}

function nombreCurso(turno: FilaGerencial): string {
  const relation = turno.cursos_ingreso && typeof turno.cursos_ingreso === 'object'
    ? (turno.cursos_ingreso as Record<string, unknown>).nombre
    : null;
  const nombre = relation ?? turno.actividad_nombre ?? turno.curso_nombre ?? turno.nombre_curso ?? 'Curso sin nombre';
  return String(nombre).trim() || 'Curso sin nombre';
}

function idTurno(fila: FilaGerencial): string {
  return String(fila.turno_id ?? fila.id ?? '').trim();
}

function idCurso(turno: FilaGerencial): string {
  const id = String(turno.curso_id ?? '').trim();
  return id || `nombre:${normalizar(nombreCurso(turno))}`;
}

function nombreClaseParticular(turno: FilaGerencial): string {
  const relation = turno.clases_particulares && typeof turno.clases_particulares === 'object'
    ? (turno.clases_particulares as Record<string, unknown>).nombre
    : null;
  const nombre = relation ?? turno.clase_particular_nombre ?? turno.actividad_nombre ?? turno.materia_nombre;
  return String(nombre ?? 'Clase particular sin nombre').trim() || 'Clase particular sin nombre';
}

function claveActividad(turno: FilaGerencial, tipo: ActividadDemanda['tipo'], nombre: string): string {
  const id = String(tipo === 'Curso de ingreso' ? turno.curso_id ?? '' : turno.clase_particular_id ?? '').trim();
  return `${tipo}:${id || normalizar(nombre)}`;
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
  const actividadesPorClave = new Map<string, { nombre: string; tipo: ActividadDemanda['tipo']; alumnos: Set<string> }>();
  const actividadPorTurno = new Map<string, string>();
  const inscriptosConfirmadosPorTurno = new Map<string, Set<string>>();
  let inscriptosConCupo = 0;
  let cuposDefinidos = 0;

  for (const inscripcion of inscripcionesVigentes) {
    if (normalizar(inscripcion.estado) !== 'confirmado') continue;
    const turnoId = String(inscripcion.turno_id ?? '').trim();
    const alumnoId = String(inscripcion.alumno_id ?? '').trim();
    if (!turnoId || !alumnoId) continue;
    if (!inscriptosConfirmadosPorTurno.has(turnoId)) inscriptosConfirmadosPorTurno.set(turnoId, new Set());
    inscriptosConfirmadosPorTurno.get(turnoId)?.add(alumnoId);
  }

  for (const turno of turnosMes) {
    const curso = esCursoIngreso(turno);
    const particular = !curso && esClaseParticular(turno);
    if (!curso && !particular) continue;
    const tipo: ActividadDemanda['tipo'] = curso ? 'Curso de ingreso' : 'Clase particular';
    const nombre = curso ? nombreCurso(turno) : nombreClaseParticular(turno);
    const clave = curso ? idCurso(turno) : claveActividad(turno, tipo, nombre);
    if (!actividadesPorClave.has(clave)) {
      actividadesPorClave.set(clave, { nombre, tipo, alumnos: new Set<string>() });
    }
    const turnoId = idTurno(turno);
    if (turnoId) actividadPorTurno.set(turnoId, clave);

    if (curso) {
      const inscriptos = turno.inscriptos_actuales === undefined
        ? (inscriptosConfirmadosPorTurno.get(turnoId)?.size ?? 0)
        : numeroNoNegativo(turno.inscriptos_actuales);
      const cupo = numeroNoNegativo(turno.cupo_maximo);
      if (cupo > 0) {
        inscriptosConCupo += inscriptos;
        cuposDefinidos += cupo;
      }
    }
  }

  for (const inscripcion of inscripcionesVigentes) {
    const clave = actividadPorTurno.get(String(inscripcion.turno_id ?? '').trim());
    const alumnoId = String(inscripcion.alumno_id ?? '').trim();
    if (clave && alumnoId) {
      actividadesPorClave.get(clave)?.alumnos.add(alumnoId);
    }
  }

  const actividades = [...actividadesPorClave.entries()]
    .map(([clave, { nombre, tipo, alumnos }]) => ({ nombre, tipo, clave, inscriptos: alumnos.size }))
    .sort((a, b) => b.inscriptos - a.inscriptos || a.nombre.localeCompare(b.nombre, 'es') || a.tipo.localeCompare(b.tipo, 'es'));
  const cursos = actividades.filter((actividad) => actividad.tipo === 'Curso de ingreso')
    .map(({ nombre, inscriptos }) => ({ nombre, inscriptos }));
  const cursosAscendentes = [...cursos]
    .sort((a, b) => a.inscriptos - b.inscriptos || a.nombre.localeCompare(b.nombre, 'es'));
  const actividadesAscendentes = [...actividades]
    .sort((a, b) => a.inscriptos - b.inscriptos || a.nombre.localeCompare(b.nombre, 'es') || a.tipo.localeCompare(b.tipo, 'es'));
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
    demandaActividades: actividades,
    actividadMayorDemanda: actividades[0] ?? null,
    actividadMenorDemanda: actividadesAscendentes[0] ?? null,
    clasesProgramadasMes: turnosMes.length,
    promedioSemanalClases,
    hayActividad: inscripcionesMesActual > 0 || inscripcionesMesAnterior > 0 || turnosMes.length > 0,
  };
}
