import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularResumenDashboard } from '../src/domain/dashboard.ts';

test('calcula entidades activas, actividad diaria, ocupación y disponibilidad', () => {
  const resumen = calcularResumenDashboard({
    alumnos: [{ activo: true }, { activo: false }, {}],
    profesores: [{ estado: 'activo' }, { estado: 'inactivo' }],
    materias: [{}, {}],
    cursos: [{ activo: true }, { estado: 'cancelado' }],
    aulas: [{ numero: 1 }, { numero: 2, activo: true }, { numero: 3, activo: false }],
    turnos: [
      { fecha: '2026-09-28', aula_numero: 1, cupo_maximo: 10, inscriptos_actuales: 6 },
      { fecha: '2026-09-28', aula_numero: 1, cupo_maximo: 5, inscriptos_actuales: 5 },
      { fecha: '2026-09-29', aula_numero: 2, cupo_maximo: null, inscriptos_actuales: 0 },
    ],
  }, '2026-09-28');

  assert.deepEqual(resumen, {
    totalAlumnos: 2,
    totalProfesores: 1,
    totalMaterias: 2,
    totalCursos: 1,
    totalAulas: 2,
    totalTurnos: 3,
    clasesHoy: 2,
    aulasUtilizadasHoy: 1,
    totalInscriptos: 11,
    cupoTotal: 15,
    turnosDisponibles: 1,
    turnosCompletos: 1,
    turnosSinCupo: 1,
    hayActividad: true,
  });
});

test('excluye turnos cancelados de hoy, ocupación y disponibilidad, pero no del total', () => {
  const resumen = calcularResumenDashboard({
    turnos: [
      { fecha: '2026-09-28', aula_numero: 1, estado: 'cancelada', cupo_maximo: 20, inscriptos_actuales: 12 },
      { fecha: '2026-09-28', aula_numero: 2, status: 'cancelled', cupo_maximo: null, inscriptos_actuales: 3 },
      { fecha: '2026-09-28', aula_numero: 3, cupo_maximo: 8, inscriptos_actuales: 2 },
    ],
  }, '2026-09-28');

  assert.equal(resumen.totalTurnos, 3);
  assert.equal(resumen.clasesHoy, 1);
  assert.equal(resumen.aulasUtilizadasHoy, 1);
  assert.equal(resumen.totalInscriptos, 2);
  assert.equal(resumen.cupoTotal, 8);
  assert.equal(resumen.turnosDisponibles, 1);
  assert.equal(resumen.turnosCompletos, 0);
  assert.equal(resumen.turnosSinCupo, 0);
});

test('representa correctamente la ausencia total de información', () => {
  const resumen = calcularResumenDashboard({}, '2026-09-28');
  assert.equal(resumen.hayActividad, false);
  assert.equal(resumen.totalTurnos, 0);
  assert.equal(resumen.cupoTotal, 0);
});
