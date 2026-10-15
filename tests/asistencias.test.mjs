import assert from 'node:assert/strict';
import test from 'node:test';
import { estadoVigente, filtrarAsistencias, resumirAsistencias } from '../src/domain/asistencias.ts';
const fila = { inscripcion_id:'i', alumno_id:'a', materia_id:'m', turno_id:'t', fecha:'2026-10-14', cancelada:false, versiones:[] };
test('sin registro no infiere una falta', () => { assert.equal(estadoVigente(fila),'sin_registrar'); assert.equal(resumirAsistencias([fila]).falto,0); });
test('resumen cuenta solamente versión vigente y cancelación no suma falta', () => {
 const corregida = {...fila, versiones:[{estado:'cancelada'},{estado:'falto'}]};
 assert.deepEqual(resumirAsistencias([corregida]),{asistio:0,falto:0,cancelada:1,sin_registrar:0});
});
test('combina filtros y admite límites inclusivos', () => {
 const filtros={alumno:'a',materia:'m',turno:'t',desde:'2026-10-14',hasta:'2026-10-14',estado:'sin_registrar'};
 assert.equal(filtrarAsistencias([fila],filtros).length,1);
 assert.equal(filtrarAsistencias([fila],{...filtros,materia:'otra'}).length,0);
 assert.equal(filtrarAsistencias([fila],{...filtros,desde:'2026-10-15'}).length,0);
});
