import assert from 'node:assert/strict';
import test from 'node:test';
import { validarCupo } from '../src/domain/cupo.ts';

test('acepta un entero positivo cuando no hay inscriptos', () => {
  assert.equal(validarCupo(1, 0), null);
});

test('acepta un cupo igual a la cantidad de inscriptos', () => {
  assert.equal(validarCupo(5, 5), null);
});

test('acepta aumentar el cupo', () => {
  assert.equal(validarCupo(20, 8), null);
});

test('rechaza cero, negativos y decimales', () => {
  assert.match(validarCupo(0, 0), /entero mayor que cero/);
  assert.match(validarCupo(-1, 0), /entero mayor que cero/);
  assert.match(validarCupo(2.5, 0), /entero mayor que cero/);
});

test('rechaza un cupo menor que los inscriptos', () => {
  assert.equal(
    validarCupo(7, 8),
    'El cupo no puede ser menor que los 8 alumnos ya inscriptos.',
  );
});
