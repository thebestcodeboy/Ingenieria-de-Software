import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularResumenGerencial } from '../src/domain/dashboardGerente.ts';

test('compara inscripciones del mes actual con el anterior', () => {
  const resumen = calcularResumenGerencial({
    inscripciones: [
      { created_at: '2026-10-02T12:00:00Z', estado: 'confirmado' },
      { created_at: '2026-10-18T12:00:00Z', estado: 'lista_espera' },
      { created_at: '2026-10-20T12:00:00Z', estado: 'cancelado' },
      { created_at: '2026-09-05T12:00:00Z', estado: 'confirmado' },
      { fecha_inscripcion: '2026-09-20', estado: 'confirmado' },
    ],
  }, '2026-10-15');

  assert.equal(resumen.inscripcionesMesActual, 2);
  assert.equal(resumen.inscripcionesMesAnterior, 2);
  assert.equal(resumen.diferenciaInscripciones, 0);
  assert.equal(resumen.variacionInscripciones, 0);
});

test('calcula ocupacion, demanda y actividad mensual sin turnos cancelados', () => {
  const resumen = calcularResumenGerencial({
    inscripciones: [
      { turno_id: 'med-1', alumno_id: 'alumno-1', estado: 'confirmado' },
      { turno_id: 'med-2', alumno_id: 'alumno-1', estado: 'confirmado' },
      { turno_id: 'med-1', alumno_id: 'alumno-2', estado: 'confirmado' },
      { turno_id: 'ing-1', alumno_id: 'alumno-2', estado: 'confirmado' },
      { turno_id: 'ing-1', alumno_id: 'alumno-3', estado: 'en_espera' },
      { turno_id: 'ing-1', alumno_id: 'alumno-4', estado: 'cancelado' },
    ],
    turnos: [
      { turno_id: 'med-1', curso_id: 'med', fecha: '2026-10-03', tipo_actividad: 'curso_ingreso', actividad_nombre: 'Ingreso Medicina', cupo_maximo: 20, inscriptos_actuales: 15 },
      { turno_id: 'med-2', curso_id: 'med', fecha: '2026-10-10', tipo_actividad: 'curso_ingreso', actividad_nombre: 'Ingreso Medicina', cupo_maximo: 10, inscriptos_actuales: 5 },
      { turno_id: 'ing-1', curso_id: 'ing', fecha: '2026-10-12', tipo_actividad: 'curso_ingreso', actividad_nombre: 'Ingreso Ingenieria', cupo_maximo: 10, inscriptos_actuales: 2 },
      { turno_id: 'der-1', curso_id: 'der', fecha: '2026-10-14', tipo_actividad: 'curso_ingreso', actividad_nombre: 'Ingreso Derecho', cupo_maximo: null, inscriptos_actuales: 0 },
      { fecha: '2026-10-16', tipo_actividad: 'curso_ingreso', actividad_nombre: 'Curso cancelado', cupo_maximo: 40, inscriptos_actuales: 40, estado: 'cancelado' },
      { fecha: '2026-10-18', tipo_actividad: 'clase_particular', actividad_nombre: 'Matematica', cupo_maximo: 5, inscriptos_actuales: 5 },
      { fecha: '2026-09-18', tipo_actividad: 'curso_ingreso', actividad_nombre: 'Mes anterior', cupo_maximo: 10, inscriptos_actuales: 10 },
    ],
  }, '2026-10-15');

  assert.equal(resumen.ocupacionPromedio, 55);
  assert.deepEqual(resumen.demandaCursos, [
    { nombre: 'Ingreso Ingenieria', inscriptos: 2 },
    { nombre: 'Ingreso Medicina', inscriptos: 2 },
    { nombre: 'Ingreso Derecho', inscriptos: 0 },
  ]);
  assert.deepEqual(resumen.cursoMayorDemanda, { nombre: 'Ingreso Ingenieria', inscriptos: 2 });
  assert.deepEqual(resumen.cursoMenorDemanda, { nombre: 'Ingreso Derecho', inscriptos: 0 });
  assert.equal(resumen.clasesProgramadasMes, 5);
  assert.equal(resumen.promedioSemanalClases, 1);
});

test('informa variacion no comparable y estado vacio sin actividad', () => {
  const resumen = calcularResumenGerencial({
    inscripciones: [{ created_at: '2026-10-03', estado: 'confirmado' }],
  }, '2026-10-15');

  assert.equal(resumen.variacionInscripciones, null);
  assert.equal(resumen.hayActividad, true);

  const vacio = calcularResumenGerencial({}, '2026-10-15');
  assert.equal(vacio.hayActividad, false);
  assert.equal(vacio.ocupacionPromedio, 0);
  assert.deepEqual(vacio.demandaCursos, []);
  assert.equal(vacio.cursoMayorDemanda, null);
});
