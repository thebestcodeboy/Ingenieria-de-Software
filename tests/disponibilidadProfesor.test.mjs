import test from 'node:test';
import assert from 'node:assert/strict';
import { validarHorarioProfesor } from '../src/domain/disponibilidadProfesor.ts';

test('una franja de mañana sin detalle no permite programar por la tarde', () => {
  const profesor = { turnos: ['Mañana'], disponibilidad: [] };
  assert.equal(validarHorarioProfesor(profesor, '08:00', '12:00'), null);
  assert.match(validarHorarioProfesor(profesor, '14:00', '15:00'), /fuera/);
  assert.match(validarHorarioProfesor(profesor, '11:30', '12:30'), /fuera/);
});
test('respeta disponibilidad detallada y formatos serializados', () => {
  const profesor = { turnos: ['Mañana'], disponibilidad: JSON.stringify([{ franja: 'Mañana', horaInicio: '09:00:00', horaFin: '11:00:00' }]) };
  assert.equal(validarHorarioProfesor(profesor, '09:00', '11:00'), null);
  assert.match(validarHorarioProfesor(profesor, '08:00', '10:00'), /fuera/);
});
test('rechaza profesores sin franjas y horarios inválidos', () => {
  assert.match(validarHorarioProfesor({}, '09:00', '10:00'), /no tiene/);
  assert.match(validarHorarioProfesor({ turnos: ['Mañana'] }, '10:00', '09:00'), /posterior/);
});
