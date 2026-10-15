export type FilaFinanciera = Record<string, unknown>;
export type FiltrosFinancieros = { desde: string; hasta: string; actividad: string; medioPago: string };
export type SerieMensual = { mes: number; etiqueta: string; actual: number; anterior: number };
export type Distribucion = { nombre: string; importe: number; porcentaje: number };
export type TramoMora = { clave: 'hasta_30' | '31_60' | 'mas_60'; nombre: string; alumnos: number; importe: number };
export type RankingDeudor = { alumnoId: string; alumno: string; importe: number; diasMaximos: number };

export type ResumenFinanciero = {
  totalPeriodo: number; totalPeriodoAnterior: number; variacionPeriodo: number | null;
  totalMes: number; totalMesAnterior: number; variacionMes: number | null;
  totalSemana: number; totalSemanaAnterior: number; variacionSemana: number | null;
  serieMensual: SerieMensual[]; flujoPorMedio: Distribucion[];
  morosidad: { alumnos: number; importe: number; tramos: TramoMora[] };
  ingresosPorActividad: Distribucion[]; rankingDeudores: RankingDeudor[];
  conclusiones: Record<'recaudacion' | 'mes' | 'semana' | 'comparacionAnual' | 'mediosPago' | 'morosidad' | 'actividades' | 'deudores', string>;
};

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const DIA = 86_400_000;
const txt = (valor: unknown) => String(valor ?? '').trim();
const fecha = (valor: unknown) => txt(valor).slice(0, 10);
const utc = (valor: string) => new Date(`${valor}T00:00:00Z`);
const importe = (valor: unknown) => { const n = Number(valor); return Number.isFinite(n) && n > 0 ? n : 0; };
const entre = (valor: string, desde: string, hasta: string) => valor >= desde && valor <= hasta;

function moverDias(valor: string, dias: number) {
  const f = utc(valor); f.setUTCDate(f.getUTCDate() + dias); return f.toISOString().slice(0, 10);
}
function variacion(actual: number, anterior: number) {
  return anterior > 0 ? Math.round(((actual - anterior) / anterior) * 1000) / 10 : null;
}
function actividad(fila: FilaFinanciera) {
  const detalle = fila.detalle_academico as Record<string, unknown> | null;
  return txt(fila.actividad_nombre ?? fila.curso_nombre ?? fila.materia_nombre ?? detalle?.actividad ?? fila.concepto) || 'Sin actividad';
}
function coincide(nombre: string, filtro: string) { return filtro === 'todos' || nombre === filtro; }
function sumar(pagos: FilaFinanciera[], desde: string, hasta: string) {
  return pagos.reduce((s, p) => s + (entre(fecha(p.fecha), desde, hasta) ? importe(p.importe) : 0), 0);
}
function rangoMes(ref: string, delta = 0): [string, string] {
  const f = utc(ref); const inicio = new Date(Date.UTC(f.getUTCFullYear(), f.getUTCMonth() + delta, 1));
  const fin = new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth() + 1, 0));
  return [inicio.toISOString().slice(0, 10), fin.toISOString().slice(0, 10)];
}
function rangoSemana(ref: string, delta = 0): [string, string] {
  const f = utc(ref); const dia = f.getUTCDay() || 7; f.setUTCDate(f.getUTCDate() - dia + 1 + delta * 7);
  const inicio = f.toISOString().slice(0, 10); return [inicio, moverDias(inicio, 6)];
}
function distribuir(filas: Array<{ nombre: string; importe: number }>): Distribucion[] {
  const mapa = new Map<string, number>();
  filas.forEach((f) => mapa.set(f.nombre, (mapa.get(f.nombre) ?? 0) + f.importe));
  const total = [...mapa.values()].reduce((s, n) => s + n, 0);
  return [...mapa].map(([nombre, valor]) => ({ nombre, importe: valor, porcentaje: total ? Math.round(valor / total * 1000) / 10 : 0 }))
    .sort((a, b) => b.importe - a.importe || a.nombre.localeCompare(b.nombre, 'es'));
}
function pesos(valor: number) { return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(valor); }
function concluirComparacion(nombre: string, actual: number, anterior: number) {
  if (!actual && !anterior) return `No hubo ${nombre}; conviene verificar la carga de cobranzas.`;
  if (!anterior) return `La ${nombre} alcanzó ${pesos(actual)} sin base comparable; conviene esperar otro período antes de proyectar.`;
  const cambio = variacion(actual, anterior) ?? 0;
  if (cambio >= 10) return `La ${nombre} aumentó ${cambio}%; conviene sostener las actividades que impulsaron el crecimiento.`;
  if (cambio <= -10) return `La ${nombre} cayó ${Math.abs(cambio)}%; conviene revisar vencimientos y acciones de cobranza.`;
  return `La ${nombre} se mantuvo estable (${cambio}%); conviene controlar que acompañe los vencimientos.`;
}

export function calcularIndicadoresFinancieros(pagos: FilaFinanciera[], obligaciones: FilaFinanciera[], filtros: FiltrosFinancieros): ResumenFinanciero {
  if (!filtros.desde || !filtros.hasta || filtros.desde > filtros.hasta) throw new Error('El período seleccionado no es válido.');
  const pagosBase = pagos.filter((p) => txt(p.estado).toUpperCase() === 'CONFIRMADO'
    && (filtros.medioPago === 'todos' || txt(p.medio_pago) === filtros.medioPago)
    && coincide(actividad(p), filtros.actividad));
  const dias = Math.floor((utc(filtros.hasta).getTime() - utc(filtros.desde).getTime()) / DIA) + 1;
  const finAnterior = moverDias(filtros.desde, -1); const inicioAnterior = moverDias(finAnterior, -(dias - 1));
  const totalPeriodo = sumar(pagosBase, filtros.desde, filtros.hasta); const totalPeriodoAnterior = sumar(pagosBase, inicioAnterior, finAnterior);
  const [mesDesde, mesHasta] = rangoMes(filtros.hasta); const [mesAntDesde, mesAntHasta] = rangoMes(filtros.hasta, -1);
  const [semDesde, semHasta] = rangoSemana(filtros.hasta); const [semAntDesde, semAntHasta] = rangoSemana(filtros.hasta, -1);
  const totalMes = sumar(pagosBase, mesDesde, mesHasta); const totalMesAnterior = sumar(pagosBase, mesAntDesde, mesAntHasta);
  const totalSemana = sumar(pagosBase, semDesde, semHasta); const totalSemanaAnterior = sumar(pagosBase, semAntDesde, semAntHasta);
  const anio = Number(filtros.hasta.slice(0, 4));
  const serieMensual = MESES.map((etiqueta, i) => {
    const actual = `${anio}-${String(i + 1).padStart(2, '0')}`; const anterior = `${anio - 1}-${String(i + 1).padStart(2, '0')}`;
    return { mes: i + 1, etiqueta,
      actual: pagosBase.filter((p) => fecha(p.fecha).startsWith(actual)).reduce((s, p) => s + importe(p.importe), 0),
      anterior: pagosBase.filter((p) => fecha(p.fecha).startsWith(anterior)).reduce((s, p) => s + importe(p.importe), 0) };
  });
  const pagosPeriodo = pagosBase.filter((p) => entre(fecha(p.fecha), filtros.desde, filtros.hasta));
  const flujoPorMedio = distribuir(pagosPeriodo.map((p) => ({ nombre: txt(p.medio_pago) || 'Sin informar', importe: importe(p.importe) })));
  const ingresosPorActividad = distribuir(pagosPeriodo.map((p) => ({ nombre: actividad(p), importe: importe(p.importe) })));

  const deudas = obligaciones.filter((d) => importe(d.saldo_pendiente ?? d.importe) > 0 && fecha(d.fecha_vencimiento) < filtros.hasta && coincide(actividad(d), filtros.actividad));
  const tramos: TramoMora[] = [
    { clave: 'hasta_30', nombre: 'Hasta 30 días', alumnos: 0, importe: 0 },
    { clave: '31_60', nombre: '31 a 60 días', alumnos: 0, importe: 0 },
    { clave: 'mas_60', nombre: 'Más de 60 días', alumnos: 0, importe: 0 },
  ];
  const idsTramo = new Map(tramos.map((t) => [t.clave, new Set<string>()])); const ranking = new Map<string, RankingDeudor>();
  deudas.forEach((d) => {
    const demora = Math.max(1, Math.floor((utc(filtros.hasta).getTime() - utc(fecha(d.fecha_vencimiento)).getTime()) / DIA));
    const clave: TramoMora['clave'] = demora <= 30 ? 'hasta_30' : demora <= 60 ? '31_60' : 'mas_60';
    const id = txt(d.alumno_id) || txt(d.alumno_nombre); const saldo = importe(d.saldo_pendiente ?? d.importe); const tramo = tramos.find((t) => t.clave === clave)!;
    tramo.importe += saldo; idsTramo.get(clave)?.add(id); const previo = ranking.get(id);
    ranking.set(id, { alumnoId: id, alumno: txt(d.alumno_nombre) || 'Alumno sin nombre', importe: (previo?.importe ?? 0) + saldo, diasMaximos: Math.max(previo?.diasMaximos ?? 0, demora) });
  });
  tramos.forEach((t) => { t.alumnos = idsTramo.get(t.clave)?.size ?? 0; });
  const rankingDeudores = [...ranking.values()].sort((a, b) => b.importe - a.importe || b.diasMaximos - a.diasMaximos);
  const deudaTotal = deudas.reduce((s, d) => s + importe(d.saldo_pendiente ?? d.importe), 0);
  const anualActual = serieMensual.reduce((s, m) => s + m.actual, 0); const anualAnterior = serieMensual.reduce((s, m) => s + m.anterior, 0);
  const medio = flujoPorMedio[0]; const principal = ingresosPorActividad[0]; const critica = tramos[2];
  return {
    totalPeriodo, totalPeriodoAnterior, variacionPeriodo: variacion(totalPeriodo, totalPeriodoAnterior),
    totalMes, totalMesAnterior, variacionMes: variacion(totalMes, totalMesAnterior),
    totalSemana, totalSemanaAnterior, variacionSemana: variacion(totalSemana, totalSemanaAnterior),
    serieMensual, flujoPorMedio, morosidad: { alumnos: rankingDeudores.length, importe: deudaTotal, tramos }, ingresosPorActividad, rankingDeudores,
    conclusiones: {
      recaudacion: concluirComparacion('recaudación del período', totalPeriodo, totalPeriodoAnterior),
      mes: concluirComparacion('recaudación mensual', totalMes, totalMesAnterior),
      semana: concluirComparacion('recaudación semanal', totalSemana, totalSemanaAnterior),
      comparacionAnual: concluirComparacion('recaudación anual acumulada', anualActual, anualAnterior),
      mediosPago: medio ? `${medio.nombre} concentra el ${medio.porcentaje}% de los cobros; conviene asegurar su conciliación y continuidad operativa.` : 'No hay cobros en el período; conviene revisar filtros y carga.',
      morosidad: !deudaTotal ? 'No hay obligaciones vencidas; conviene mantener recordatorios preventivos.' : critica.importe ? `La deuda total es ${pesos(deudaTotal)} y ${pesos(critica.importe)} supera 60 días; conviene priorizar ese tramo.` : `La deuda total es ${pesos(deudaTotal)} y aún no supera 60 días; conviene actuar antes de que envejezca.`,
      actividades: principal ? `${principal.nombre} lidera los ingresos con ${pesos(principal.importe)}; conviene comparar su demanda y capacidad.` : 'No hay ingresos atribuibles a actividades en el período.',
      deudores: rankingDeudores[0] ? `${rankingDeudores[0].alumno} encabeza el saldo pendiente con ${pesos(rankingDeudores[0].importe)}; conviene contactar primero los casos de mayor monto y antigüedad.` : 'No hay alumnos en mora para priorizar.',
    },
  };
}
