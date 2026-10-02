import test from 'node:test';
import assert from 'node:assert/strict';
import { validarPeriodoCurso, validarFechaCurso, duracionCurso } from '../src/domain/periodoCurso.ts';
test('requiere ambas fechas y rechaza períodos invertidos o inexistentes', () => {
  assert.ok(validarPeriodoCurso('', '2026-10-01'));
  assert.ok(validarPeriodoCurso('2026-10-02', '2026-10-01'));
  assert.ok(validarPeriodoCurso('2026-02-30', '2026-03-01'));
  assert.equal(validarPeriodoCurso('2026-10-01','2026-10-01'),null);
});
test('incluye los límites y rechaza clases fuera del período', () => {
  for(const fecha of ['2026-10-01','2026-10-31']) assert.equal(validarFechaCurso(fecha,'2026-10-01','2026-10-31'),null);
  for(const fecha of ['2026-09-30','2026-11-01']) assert.ok(validarFechaCurso(fecha,'2026-10-01','2026-10-31'));
  assert.ok(validarFechaCurso('2026-10-01',null,null));
});
test('la duración incluye el primer y último día, incluso en año bisiesto', () => {
  assert.equal(duracionCurso('2026-10-01','2026-10-01'),'1 día');
  assert.equal(duracionCurso('2028-02-28','2028-03-01'),'3 días');
});
