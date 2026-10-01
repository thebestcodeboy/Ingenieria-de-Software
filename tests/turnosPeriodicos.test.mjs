import test from 'node:test';
import assert from 'node:assert/strict';
import { generarFechasSemanales } from '../src/domain/turnosPeriodicos.ts';

test('genera una fecha semanal hasta completar la duración en meses', () => {
  const fechas = generarFechasSemanales('2026-10-02', 1);

  assert.deepEqual(fechas, [
    '2026-10-02',
    '2026-10-09',
    '2026-10-16',
    '2026-10-23',
    '2026-10-30',
  ]);
});

test('rechaza fechas y duraciones inválidas', () => {
  assert.throws(() => generarFechasSemanales('2026-02-30', 1));
  assert.throws(() => generarFechasSemanales('2026-10-02', 13));
});