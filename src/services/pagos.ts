import type { InscripcionCobro, ModalidadPago, VinculoPago } from '../domain/pagoAcademico';
import { supabase } from '../lib/supabaseClient';

export interface Pago {
  obligacion_id?: string | null;
  inscripcion_id?: string | null;
  periodo_desde?: string | null;
  periodo_hasta?: string | null;
  detalle_academico?: VinculoPago['detalle_academico'] | null;
  id: string;
  comprobante: string;
  alumno_id: string;
  modalidad?: ModalidadPago;
  cantidad?: number;
  concepto: string;
  importe: number;
  medio_pago: 'Efectivo' | 'Transferencia' | 'Tarjeta de Débito' | 'Tarjeta de Crédito' | 'Mercado Pago';
  fecha: string;
  observaciones?: string;
  estado: 'CONFIRMADO' | 'ANULADO' | 'CANCELADO' | 'BORRADOR' | 'PENDIENTE' | 'RECHAZADO';
  external_payment_id?: string | null;
  created_at: string;
  alumnos?: {
    id: string;
    nombre: string;
    apellido: string;
    legajo: string;
    dni: string;
    email: string;
  };
}

export interface FormNuevoPago extends VinculoPago {
  obligacion_id?: string | null;
  alumno_id: string;
  modalidad?: ModalidadPago;
  concepto: string;
  importe: number;
  medio_pago: string;
  fecha: string;
  observaciones?: string;
}

export interface ObligacionPago {
  id: string;
  alumno_id: string;
  inscripcion_id?: string | null;
  curso_id?: string | null;
  materia_id?: string | null;
  periodo_desde?: string | null;
  periodo_hasta?: string | null;
  actividad_nombre: string;
  concepto: string;
  importe_original: number;
  saldo_pendiente: number;
  fecha_emision: string;
  fecha_vencimiento: string;
  estado: 'PENDIENTE' | 'PARCIAL' | 'PAGADA' | 'ANULADA';
}

export type NuevaObligacionPago = Omit<ObligacionPago, 'id' | 'saldo_pendiente' | 'estado'>;

export async function listarObligacionesAlumno(alumnoId: string): Promise<ObligacionPago[]> {
  const { data, error } = await supabase
    .from('obligaciones_pago')
    .select('id, alumno_id, inscripcion_id, curso_id, materia_id, periodo_desde, periodo_hasta, actividad_nombre, concepto, importe_original, saldo_pendiente, fecha_emision, fecha_vencimiento, estado')
    .eq('alumno_id', alumnoId)
    .in('estado', ['PENDIENTE', 'PARCIAL'])
    .gt('saldo_pendiente', 0)
    .order('fecha_vencimiento', { ascending: true });
  if (error) throw new Error(`No se pudieron consultar las obligaciones: ${error.message}`);
  return (data ?? []) as ObligacionPago[];
}

export async function registrarObligacionPago(nueva: NuevaObligacionPago): Promise<ObligacionPago> {
  const { data, error } = await supabase
    .from('obligaciones_pago')
    .insert([{ ...nueva, saldo_pendiente: nueva.importe_original, estado: 'PENDIENTE' }])
    .select('id, alumno_id, inscripcion_id, curso_id, materia_id, periodo_desde, periodo_hasta, actividad_nombre, concepto, importe_original, saldo_pendiente, fecha_emision, fecha_vencimiento, estado')
    .single();
  if (error) throw new Error(`No se pudo registrar la obligación: ${error.message}`);
  return data as ObligacionPago;
}

// Genera un comprobante secuencial: REC-2026-0001
export async function generarNumeroComprobante(): Promise<string> {
  const anio = new Date().getFullYear();
  const { data, error } = await supabase
    .from('pagos')
    .select('comprobante')
    .ilike('comprobante', `REC-${anio}-%`)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    return `REC-${anio}-0001`;
  }

  const ultimoNum = parseInt(data[0].comprobante.split('-')[2] || '0', 10);
  const nuevoNum = String(ultimoNum + 1).padStart(4, '0');
  return `REC-${anio}-${nuevoNum}`;
}

export async function listarPagos(): Promise<Pago[]> {
  const { data, error } = await supabase
    .from('pagos')
    .select(`
      *,
      alumnos (
        id,
        nombre,
        apellido,
        legajo,
        dni,
        email
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Error al consultar pagos: ${error.message}`);
  return data || [];
}

export async function registrarPago(form: FormNuevoPago): Promise<Pago> {
  if (!form.inscripcion_id || !form.periodo_desde || !form.periodo_hasta) throw new Error('Debe seleccionar la inscripción y el período abonado.');
  if (!form.alumno_id) throw new Error('Debe seleccionar un alumno.');
  if (!form.concepto.trim()) throw new Error('El concepto es obligatorio.');
  if (isNaN(form.importe) || form.importe <= 0) throw new Error('El importe debe ser numérico y mayor que cero.');

  const comprobante = await generarNumeroComprobante();

  const payload = {
    obligacion_id: form.obligacion_id || null,
    comprobante,
    alumno_id: form.alumno_id,
    inscripcion_id: form.inscripcion_id,
    periodo_desde: form.periodo_desde,
    periodo_hasta: form.periodo_hasta,
    detalle_academico: form.detalle_academico,
    concepto: form.concepto.trim(),
    importe: form.importe,
    medio_pago: form.medio_pago,
    ...(form.modalidad ? { modalidad: form.modalidad } : {}),
    fecha: form.fecha || new Date().toISOString().split('T')[0],
    observaciones: form.observaciones?.trim() || null,
    estado: form.medio_pago === 'Mercado Pago' ? 'PENDIENTE' : 'CONFIRMADO'
  };

  const { data, error } = await supabase
    .from('pagos')
    .insert([payload])
    .select(`*, alumnos(id, nombre, apellido, legajo, dni, email)`)
    .single();

  if (error) throw new Error(`No se pudo registrar el pago: ${error.message}`);
  return data;
}

export async function anularPago(pagoId: string): Promise<void> {
  const { error } = await supabase
    .from('pagos')
    .update({ estado: 'ANULADO' })
    .eq('id', pagoId);

  if (error) throw new Error(`Error al anular el pago: ${error.message}`);
}

export async function listarInscripcionesCobro(alumnoId: string): Promise<InscripcionCobro[]> {
  const { data, error } = await supabase.from('inscripciones')
    .select('id, estado, turnos_clase(id, fecha, hora_inicio, hora_fin, curso_id, clase_particular_id, materia_id, profesor_id, estado, cancelado, materias(nombre), cursos_ingreso(nombre, precio, modalidad_cobro), clases_particulares(nombre, precio), profesores(nombre, apellido))')
    .eq('alumno_id', alumnoId).eq('estado', 'confirmado');
  if (error) throw new Error('No se pudieron consultar las inscripciones del alumno: ' + error.message);
  return (data ?? []) as unknown as InscripcionCobro[];
}
