import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizarEventoCalendario, eventoEnFecha } from '../src/domain/calendario.ts';

test('un turno aislado sin inscriptos tiene datos para el calendario', () => {
  const evento = normalizarEventoCalendario({ id: 't1', fecha: '2026-10-01', cupo_maximo: 10, materias: { nombre: 'Matemática' }, profesores: { nombre: 'Ana', apellido: 'Pérez' }, inscripciones: [] });
  assert.equal(evento.turno_id, 't1');
  assert.equal(evento.materia_nombre, 'Matemática');
  assert.equal(evento.profesor_nombre_completo, 'Pérez, Ana');
  assert.equal(evento.lugares_disponibles, 10);
  assert.equal(eventoEnFecha(evento, '2026-10-01'), true);
  assert.equal(eventoEnFecha(evento, '2026-10-02'), false);
});
test('las ocurrencias semanales conservan su fecha y solo los confirmados consumen cupo', () => {
  const evento = normalizarEventoCalendario({ id: 't2', serie_id: 's1', fecha: '2026-10-08', cupo_maximo: 5, inscripciones: [{ estado: 'confirmado' }, { estado: 'en_espera' }, { estado: 'cancelado' }] });
  assert.equal(evento.inscriptos_actuales, 1);
  assert.equal(evento.lugares_disponibles, 4);
  assert.equal(eventoEnFecha(evento, '2026-10-08'), true);
});
test('eventos periódicos sin fecha aparecen solo en su día, con o sin tildes', () => {
  assert.equal(eventoEnFecha({ fecha: null, dia_semana: 'Miércoles' }, '2026-10-07'), true);
  assert.equal(eventoEnFecha({ fecha: null, dia_semana: 'miercoles' }, '2026-10-08'), false);
});
