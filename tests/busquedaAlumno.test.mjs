import test from 'node:test';
import assert from 'node:assert/strict';
import { filtrarAlumnos } from '../src/domain/busquedaAlumno.ts';
const alumnos = [
  { id: '1', nombre: 'NAHUEL', apellido: 'PEÑALOSA', dni: '45849876', legajo: 'LEG-2026-0025' },
  { id: '2', nombre: 'SAMUEL', apellido: 'PÉREZ', dni: '30111222', legajo: 'LEG-2026-0001' },
];
test('busca sin tildes, en cualquier orden y por varios términos', () => {
  assert.deepEqual(filtrarAlumnos(alumnos, 'nahuel penalosa').map(a => a.id), ['1']);
  assert.deepEqual(filtrarAlumnos(alumnos, 'perez sam').map(a => a.id), ['2']);
});
test('busca DNI o legajo y excluye alumnos que no coinciden', () => {
  assert.deepEqual(filtrarAlumnos(alumnos, '45849').map(a => a.id), ['1']);
  assert.deepEqual(filtrarAlumnos(alumnos, 'LEG-2026-0025').map(a => a.id), ['1']);
  assert.deepEqual(filtrarAlumnos(alumnos, 'sa').map(a => a.id), ['1', '2']);
  assert.deepEqual(filtrarAlumnos(alumnos, 'inexistente'), []);
  assert.equal(filtrarAlumnos(alumnos, ' ').length, 2);
});
