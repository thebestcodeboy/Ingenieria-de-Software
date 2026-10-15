import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularIndicadoresFinancieros } from '../src/domain/indicadoresFinancieros.ts';

const pagos = [
  { fecha: '2026-10-05', importe: 100000, estado: 'CONFIRMADO', medio_pago: 'Efectivo', detalle_academico: { actividad: 'Medicina' } },
  { fecha: '2026-10-06', importe: 50000, estado: 'CONFIRMADO', medio_pago: 'Transferencia', detalle_academico: { actividad: 'Medicina' } },
  { fecha: '2026-09-15', importe: 100000, estado: 'CONFIRMADO', medio_pago: 'Efectivo', detalle_academico: { actividad: 'Medicina' } },
  { fecha: '2026-09-20', importe: 30000, estado: 'ANULADO', medio_pago: 'Efectivo', detalle_academico: { actividad: 'Medicina' } },
  { fecha: '2026-10-07', importe: 45000, estado: 'PENDIENTE', medio_pago: 'Mercado Pago', detalle_academico: { actividad: 'Medicina' } },
  { fecha: '2026-10-07', importe: 35000, estado: 'RECHAZADO', medio_pago: 'Mercado Pago', detalle_academico: { actividad: 'Medicina' } },
  { fecha: '2025-10-05', importe: 90000, estado: 'CONFIRMADO', medio_pago: 'Efectivo', detalle_academico: { actividad: 'Medicina' } },
  { fecha: '2026-10-08', importe: 70000, estado: 'CONFIRMADO', medio_pago: 'Tarjeta', detalle_academico: { actividad: 'Derecho' } },
];

const deudas = [
  { alumno_id: 'a1', alumno_nombre: 'Ana Pérez', fecha_vencimiento: '2026-10-10', saldo_pendiente: 40000, actividad_nombre: 'Medicina' },
  { alumno_id: 'a1', alumno_nombre: 'Ana Pérez', fecha_vencimiento: '2026-09-10', saldo_pendiente: 30000, actividad_nombre: 'Medicina' },
  { alumno_id: 'a2', alumno_nombre: 'Juan López', fecha_vencimiento: '2026-07-01', saldo_pendiente: 50000, actividad_nombre: 'Derecho' },
  { alumno_id: 'a3', alumno_nombre: 'Sin mora', fecha_vencimiento: '2026-10-31', saldo_pendiente: 10000, actividad_nombre: 'Medicina' },
];

test('calcula recaudacion y excluye pagos anulados, pendientes o rechazados', () => {
  const r = calcularIndicadoresFinancieros(pagos, deudas, { desde: '2026-10-01', hasta: '2026-10-31', actividad: 'todos', medioPago: 'todos' });
  assert.equal(r.totalPeriodo, 220000);
  assert.equal(r.totalPeriodoAnterior, 100000);
  assert.equal(r.totalMes, 220000);
  assert.equal(r.serieMensual[9].actual, 220000);
  assert.equal(r.serieMensual[9].anterior, 90000);
  assert.match(r.conclusiones.recaudacion, /conviene/i);
});

test('compara la semana de la fecha de corte con la semana anterior', () => {
  const r = calcularIndicadoresFinancieros(pagos, [], { desde: '2026-10-01', hasta: '2026-10-08', actividad: 'todos', medioPago: 'todos' });
  assert.equal(r.totalSemana, 220000);
  assert.equal(r.totalSemanaAnterior, 0);
});

test('combina filtros de actividad y medio de pago', () => {
  const r = calcularIndicadoresFinancieros(pagos, deudas, { desde: '2026-10-01', hasta: '2026-10-31', actividad: 'Medicina', medioPago: 'Efectivo' });
  assert.equal(r.totalPeriodo, 100000);
  assert.deepEqual(r.flujoPorMedio.map((x) => x.nombre), ['Efectivo']);
  assert.deepEqual(r.ingresosPorActividad.map((x) => x.nombre), ['Medicina']);
  assert.equal(r.morosidad.importe, 70000);
});

test('cuenta deudores unicos y clasifica antiguedad', () => {
  const r = calcularIndicadoresFinancieros(pagos, deudas, { desde: '2026-10-01', hasta: '2026-10-31', actividad: 'todos', medioPago: 'todos' });
  assert.equal(r.morosidad.alumnos, 2);
  assert.equal(r.morosidad.importe, 120000);
  assert.deepEqual(r.morosidad.tramos.map((x) => [x.alumnos, x.importe]), [[1, 40000], [1, 30000], [1, 50000]]);
  assert.deepEqual(r.rankingDeudores.map((x) => x.alumno), ['Ana Pérez', 'Juan López']);
});

test('rechaza un rango invertido', () => {
  assert.throws(() => calcularIndicadoresFinancieros([], [], { desde: '2026-10-31', hasta: '2026-10-01', actividad: 'todos', medioPago: 'todos' }), /no es válido/);
});
