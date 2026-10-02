import type { InscripcionCobro, VinculoPago } from '../domain/pagoAcademico';
import { supabase } from '../lib/supabaseClient';

export interface Pago {
  inscripcion_id?: string | null;
  periodo_desde?: string | null;
  periodo_hasta?: string | null;
  detalle_academico?: VinculoPago['detalle_academico'] | null;
  id: string;
  comprobante: string;
  alumno_id: string;
  concepto: string;
  importe: number;
  medio_pago: 'Efectivo' | 'Transferencia' | 'Tarjeta de Débito' | 'Tarjeta de Crédito';
  fecha: string;
  observaciones?: string;
  estado: 'CONFIRMADO' | 'ANULADO';
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
  alumno_id: string;
  concepto: string;
  importe: number;
  medio_pago: string;
  fecha: string;
  observaciones?: string;
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
    comprobante,
    alumno_id: form.alumno_id,
    inscripcion_id: form.inscripcion_id,
    periodo_desde: form.periodo_desde,
    periodo_hasta: form.periodo_hasta,
    detalle_academico: form.detalle_academico,
    concepto: form.concepto.trim(),
    importe: form.importe,
    medio_pago: form.medio_pago,
    fecha: form.fecha || new Date().toISOString().split('T')[0],
    observaciones: form.observaciones?.trim() || null,
    estado: 'CONFIRMADO'
  };

  const { data, error } = await supabase
    .from('pagos')
    .insert([payload])
    .select(`*, alumnos(id, nombre, apellido, legajo, dni, email)`)
    .single();

  if (error) throw new Error(`No se pudo registrar el pago: ${error.message}`);
  return data;
}

// Anulación lógica (conserva trazabilidad requerida en HU21)
export async function anularPago(pagoId: string): Promise<void> {
  const { error } = await supabase
    .from('pagos')
    .update({ estado: 'ANULADO' })
    .eq('id', pagoId);

  if (error) throw new Error(`Error al anular el pago: ${error.message}`);
}
export async function listarInscripcionesCobro(alumnoId: string): Promise<InscripcionCobro[]> {
  const { data, error } = await supabase.from('inscripciones')
    .select('id, estado, turnos_clase(id, fecha, hora_inicio, hora_fin, curso_id, clase_particular_id, materia_id, profesor_id, estado, cancelado, materias(nombre), cursos_ingreso(nombre), clases_particulares(nombre), profesores(nombre, apellido))')
    .eq('alumno_id', alumnoId).eq('estado', 'confirmado');
  if (error) throw new Error('No se pudieron consultar las inscripciones del alumno: ' + error.message);
  return (data ?? []) as unknown as InscripcionCobro[];
}
