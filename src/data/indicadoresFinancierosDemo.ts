import type { FilaFinanciera } from '../domain/indicadoresFinancieros';

const actividades = ['Ingreso a Medicina', 'Matemática CBC', 'Química', 'Física'];
const mediosPago = ['Efectivo', 'Transferencia', 'Mercado Pago'];
const importesActuales = [480000, 525000, 570000, 610000, 655000, 690000, 735000, 780000, 820000, 865000, 910000, 955000];
const importesAnteriores = [410000, 445000, 475000, 505000, 540000, 565000, 595000, 625000, 650000, 680000, 705000, 735000];

function fechaMes(anio: number, mes: number, dia: number) {
  return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function moverDias(fecha: Date, dias: number) {
  const resultado = new Date(fecha);
  resultado.setDate(resultado.getDate() + dias);
  return resultado.toISOString().slice(0, 10);
}

function crearPagos(anio: number, importes: number[], hastaMes = 12): FilaFinanciera[] {
  return importes.slice(0, hastaMes).flatMap((total, indice) => {
    const mes = indice + 1;
    return [0, 1, 2].map((parte) => ({
      id: `demo-pago-${anio}-${mes}-${parte}`,
      fecha: fechaMes(anio, mes, 6 + parte * 8),
      importe: Math.round(total * [0.32, 0.41, 0.27][parte]),
      medio_pago: mediosPago[parte],
      estado: 'CONFIRMADO',
      concepto: actividades[(indice + parte) % actividades.length],
      detalle_academico: { actividad: actividades[(indice + parte) % actividades.length] },
    }));
  });
}

export function datosFinancierosDemo() {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mesActual = hoy.getMonth() + 1;
  const pagos = [
    ...crearPagos(anio - 1, importesAnteriores),
    ...crearPagos(anio, importesActuales, mesActual),
  ];

  const obligaciones: FilaFinanciera[] = [
    ['alumno-1', 'Ana Gómez', 'Ingreso a Medicina', 95000, -12],
    ['alumno-2', 'Bruno Díaz', 'Matemática CBC', 128000, -38],
    ['alumno-3', 'Carla López', 'Química', 172000, -74],
    ['alumno-4', 'Diego Ruiz', 'Física', 86000, -22],
    ['alumno-3', 'Carla López', 'Ingreso a Medicina', 64000, -95],
    ['alumno-5', 'Elena Torres', 'Matemática CBC', 119000, -48],
  ].map(([alumnoId, alumno, actividad, saldo, dias], indice) => ({
    id: `demo-obligacion-${indice + 1}`,
    alumno_id: alumnoId,
    alumno_nombre: alumno,
    actividad_nombre: actividad,
    importe_original: saldo,
    saldo_pendiente: saldo,
    fecha_vencimiento: moverDias(hoy, Number(dias)),
    estado: 'PENDIENTE',
  }));

  return { pagos, obligaciones, actividades: [...actividades], mediosPago: [...mediosPago] };
}
