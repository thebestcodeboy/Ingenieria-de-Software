export type ModalidadPago = 'Clase' | 'Semana' | 'Mes';
export type PagoParaSaldo = { alumno_id: string; importe: number; estado: string };
export type AlumnoParaSaldo = { id: string; nombre: string; apellido: string; legajo?: string | null };
export type SaldoPorAlumno = {
  id: string;
  nombre: string;
  apellido: string;
  legajo?: string | null;
  totalCobrado: number;
  montoPendiente: number;
  montoRechazado: number;
  saldoAdeudado: number;
};

export type InscripcionCobro = {
  id: string; estado: string;
  turnos_clase: {
    id: string; fecha: string; hora_inicio: string; hora_fin: string;
    curso_id?: string | null; clase_particular_id?: string | null; materia_id?: string | null;
    profesor_id?: string | null; estado?: string | null; cancelado?: boolean;
    cursos_ingreso?: { nombre: string; precio?: number; modalidad_cobro?: 'MES' | 'SEMANA' } | null;
    clases_particulares?: { nombre: string; precio?: number } | null;
    materias?: { nombre: string } | null;
    profesores?: { nombre: string; apellido: string } | null;
  } | null;
};
export type ActividadCobro = { clave: string; nombre: string; docente: string; materias: string[]; sesiones: InscripcionCobro[]; precio?: number; modalidadCobro?: ModalidadPago };
export type DetalleAcademico = { actividad: string; docente: string; materias: string[]; inscripciones: string[] };
export type VinculoPago = { inscripcion_id: string; periodo_desde: string; periodo_hasta: string; detalle_academico: DetalleAcademico; concepto: string };

export function agruparActividadesCobro(inscripciones: InscripcionCobro[]): ActividadCobro[] {
  const grupos = new Map<string, ActividadCobro>();
  for (const ins of inscripciones) {
    const t = ins.turnos_clase;
    if (ins.estado !== 'confirmado' || !t || t.cancelado || t.estado === 'cancelado') continue;
    const clave = (t.curso_id ? 'curso:' + t.curso_id : 'particular:' + (t.clase_particular_id ?? t.materia_id ?? t.id)) + ':' + (t.profesor_id ?? '');
    if (!grupos.has(clave)) grupos.set(clave, {
      clave, nombre: t.cursos_ingreso ? 'Curso de ingreso: ' + t.cursos_ingreso.nombre : 'Clase particular: ' + (t.clases_particulares?.nombre ?? t.materias?.nombre ?? 'Sin nombre'),
      docente: [t.profesores?.apellido, t.profesores?.nombre].filter(Boolean).join(', '),
      precio: Number(t.cursos_ingreso?.precio ?? t.clases_particulares?.precio ?? 0),
      modalidadCobro: t.curso_id ? (t.cursos_ingreso?.modalidad_cobro === 'SEMANA' ? 'Semana' : 'Mes') : 'Clase',
      materias: [], sesiones: [],
    });
    const grupo = grupos.get(clave)!;
    if (t.materias?.nombre && !grupo.materias.includes(t.materias.nombre)) grupo.materias.push(t.materias.nombre);
    grupo.sesiones.push(ins);
  }
  return [...grupos.values()].map(g => ({ ...g, sesiones: g.sesiones.sort((a,b) => a.turnos_clase!.fecha.localeCompare(b.turnos_clase!.fecha) || a.id.localeCompare(b.id)) }));
}

function fechaValida(texto: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) throw new Error('Seleccioná una fecha válida para el período abonado.');
  const fecha = new Date(texto + 'T12:00:00Z');
  if (!Number.isFinite(fecha.getTime()) || fecha.toISOString().slice(0,10) !== texto) throw new Error('La fecha del período no es válida.');
  return fecha;
}

export function fechaASemanaIso(texto: string): string {
  const fecha = fechaValida(texto);
  const jueves = new Date(fecha);
  jueves.setUTCDate(fecha.getUTCDate() + 3 - ((fecha.getUTCDay() + 6) % 7));
  const anio = jueves.getUTCFullYear();
  const cuatroDeEnero = new Date(Date.UTC(anio, 0, 4));
  const inicioPrimeraSemana = new Date(cuatroDeEnero);
  inicioPrimeraSemana.setUTCDate(cuatroDeEnero.getUTCDate() - ((cuatroDeEnero.getUTCDay() + 6) % 7));
  const lunes = new Date(fecha);
  lunes.setUTCDate(fecha.getUTCDate() - ((fecha.getUTCDay() + 6) % 7));
  const numeroSemana = Math.round((lunes.getTime() - inicioPrimeraSemana.getTime()) / 604800000) + 1;
  return `${anio}-W${String(numeroSemana).padStart(2, '0')}`;
}

function inicioSemanaIso(periodo: string): string {
  const coincidencia = /^(\d{4})-W(\d{2})$/.exec(periodo);
  if (!coincidencia) throw new Error('Seleccioná una semana válida para el período abonado.');

  const anio = Number(coincidencia[1]);
  const numeroSemana = Number(coincidencia[2]);
  if (numeroSemana < 1 || numeroSemana > 53) throw new Error('La semana seleccionada no es válida.');

  const cuatroDeEnero = new Date(Date.UTC(anio, 0, 4));
  const lunes = new Date(cuatroDeEnero);
  lunes.setUTCDate(cuatroDeEnero.getUTCDate() - ((cuatroDeEnero.getUTCDay() + 6) % 7) + (numeroSemana - 1) * 7);
  const fechaInicio = lunes.toISOString().slice(0, 10);
  if (fechaASemanaIso(fechaInicio) !== periodo) throw new Error('La semana seleccionada no existe.');
  return fechaInicio;
}

export function calcularSaldosPorAlumno(
  alumnos: AlumnoParaSaldo[],
  pagos: PagoParaSaldo[]
): SaldoPorAlumno[] {
  const saldos = new Map(alumnos.map(alumno => [alumno.id, {
    ...alumno,
    totalCobrado: 0,
    montoPendiente: 0,
    montoRechazado: 0,
    saldoAdeudado: 0,
  }]));

  for (const pago of pagos) {
    const saldo = saldos.get(pago.alumno_id);
    if (!saldo) continue;
    const importe = Number(pago.importe);
    if (!Number.isFinite(importe) || importe <= 0) continue;

    if (pago.estado === 'CONFIRMADO') saldo.totalCobrado += importe;
    if (pago.estado === 'PENDIENTE') saldo.montoPendiente += importe;
    if (pago.estado === 'RECHAZADO') saldo.montoRechazado += importe;
  }

  return [...saldos.values()]
    .map(saldo => ({ ...saldo, saldoAdeudado: saldo.montoPendiente + saldo.montoRechazado }))
    .filter(saldo => saldo.totalCobrado > 0 || saldo.saldoAdeudado > 0)
    .sort((a, b) => b.saldoAdeudado - a.saldoAdeudado || a.apellido.localeCompare(b.apellido));
}

export function construirVinculoPago(actividad: ActividadCobro | undefined, modalidad: ModalidadPago, periodo: string, cantidad: number, sesionId: string): VinculoPago {
  if (!actividad) throw new Error('Seleccioná una actividad en la que el alumno esté inscripto.');
  if (!Number.isSafeInteger(cantidad) || cantidad < 1) throw new Error('La cantidad debe ser un entero mayor que cero.');
  let desde: string;
  let hasta: string;
  let sesiones: InscripcionCobro[];
  if (modalidad === 'Clase') {
    const sesion = actividad.sesiones.find(s => s.id === sesionId);
    if (!sesion || cantidad !== 1) throw new Error('Seleccioná una única clase para este cobro.');
    desde = hasta = sesion.turnos_clase!.fecha;
    fechaValida(desde);
    sesiones = [sesion];
  } else {
    if (modalidad === 'Mes' && !/^\d{4}-\d{2}$/.test(periodo)) throw new Error('Seleccioná el mes abonado.');
    desde = modalidad === 'Mes' ? periodo + '-01' : modalidad === 'Semana' && /^\d{4}-W\d{2}$/.test(periodo) ? inicioSemanaIso(periodo) : periodo;
    const fin = fechaValida(desde);
    if (modalidad === 'Mes') {
      fin.setUTCMonth(fin.getUTCMonth() + cantidad);
      fin.setUTCDate(0);
    } else if (modalidad === 'Semana') {
      fin.setUTCDate(fin.getUTCDate() + cantidad * 7 - 1);
    }
    if (!Number.isFinite(fin.getTime())) throw new Error('El período seleccionado no es válido.');
    hasta = fin.toISOString().slice(0,10);
    sesiones = actividad.sesiones.filter(s => s.turnos_clase!.fecha >= desde && s.turnos_clase!.fecha <= hasta);
    if (!sesiones.length) throw new Error('No hay clases con inscripción confirmada para esa actividad en el período seleccionado.');
  }
  const cobertura = modalidad === 'Clase'
    ? 'Clase del ' + desde + ' (' + sesiones[0].turnos_clase!.hora_inicio.slice(0,5) + ' a ' + sesiones[0].turnos_clase!.hora_fin.slice(0,5) + ')'
    : (modalidad === 'Semana' ? 'Semana: ' : 'Período: ') + desde + ' al ' + hasta;
  const concepto = [actividad.nombre, actividad.materias.join(', '), actividad.docente ? 'Docente: ' + actividad.docente : '', cobertura].filter(Boolean).join(' · ');
  return { inscripcion_id: sesiones[0].id, periodo_desde: desde, periodo_hasta: hasta,
    detalle_academico: { actividad: actividad.nombre, docente: actividad.docente, materias: actividad.materias, inscripciones: sesiones.map(s => s.id) }, concepto };
}
