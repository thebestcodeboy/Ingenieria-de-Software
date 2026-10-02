import test from 'node:test';
import assert from 'node:assert/strict';
import { agruparActividadesCobro, construirVinculoPago } from '../src/domain/pagoAcademico.ts';
const inscripcion = (id, fecha, estado = 'confirmado', curso = 'c1') => ({ id, estado, turnos_clase: { id: 't'+id, fecha, hora_inicio: '09:00:00', hora_fin: '10:00:00', curso_id: curso, materia_id: 'm1', profesor_id: 'p1', materias: { nombre: 'Química' }, cursos_ingreso: { nombre: 'Medicina' }, profesores: { nombre: 'Ana', apellido: 'Pérez' } } });
test('agrupa sesiones y excluye espera e inscripciones canceladas', () => {
  const grupos = agruparActividadesCobro([inscripcion('1','2026-10-01'),inscripcion('2','2026-10-08'),inscripcion('3','2026-10-15','en_espera'),inscripcion('4','2026-10-22','cancelado')]);
  assert.equal(grupos.length,1); assert.equal(grupos[0].sesiones.length,2);
});
test('vincula el mes elegido, no el mes de emisión, y conserva las sesiones cubiertas', () => {
  const [g] = agruparActividadesCobro([inscripcion('1','2026-10-01'),inscripcion('2','2026-11-01')]);
  const pago = construirVinculoPago(g,'Mes','2026-10',1,'');
  assert.equal(pago.periodo_hasta,'2026-10-31');
  assert.deepEqual(pago.detalle_academico.inscripciones,['1']);
  assert.match(pago.concepto,/Medicina/); assert.match(pago.concepto,/Pérez/);
});
test('calcula semanas a través de fin de mes y múltiples meses', () => {
  const [g] = agruparActividadesCobro([inscripcion('1','2026-12-30'),inscripcion('2','2027-01-02')]);
  assert.equal(construirVinculoPago(g,'Semana','2026-12-28',1,'').periodo_hasta,'2027-01-03');
  assert.equal(construirVinculoPago(g,'Mes','2026-12',2,'').periodo_hasta,'2027-01-31');
});
test('un pago por clase identifica una única sesión', () => {
  const [g] = agruparActividadesCobro([inscripcion('1','2026-10-01'),inscripcion('2','2026-10-08')]);
  const p = construirVinculoPago(g,'Clase','',1,'2');
  assert.equal(p.inscripcion_id,'2'); assert.equal(p.periodo_desde,'2026-10-08');
  assert.throws(()=>construirVinculoPago(g,'Clase','',2,'2'));
});
test('rechaza períodos inválidos, sin clases y actividad faltante', () => {
  const [g] = agruparActividadesCobro([inscripcion('1','2026-10-01')]);
  for(const periodo of ['2026-13','2026-11']) assert.throws(()=>construirVinculoPago(g,'Mes',periodo,1,''));
  assert.throws(()=>construirVinculoPago(undefined,'Mes','2026-10',1,''));
});
