import test from 'node:test';
import assert from 'node:assert/strict';
import { validarAlumnoActivoParaInscripcion } from '../src/utils/alumnoInscripcion.ts';

test('rechaza alumnos inactivos para inscribirse', () => {
  const resultado = validarAlumnoActivoParaInscripcion({ activo: false });

  assert.equal(resultado.valido, false);
  assert.match(resultado.motivo, /inactiva|inactivo/i);
});

test('permite inscripciones para alumnos activos', () => {
  const resultado = validarAlumnoActivoParaInscripcion({ activo: true });

  assert.equal(resultado.valido, true);
  assert.equal(resultado.motivo, '');
});
