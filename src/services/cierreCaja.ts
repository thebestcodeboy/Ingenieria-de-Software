import { supabase } from '../lib/supabaseClient';
import type { MedioPagoCierre } from '../domain/cierreCaja';

export interface PagoPendienteCierre {
  id: string;
  comprobante: string;
  fecha: string;
  concepto: string;
  importe: number;
  medio_pago: MedioPagoCierre;
  alumnos?: { nombre: string; apellido: string; legajo: string | null } | null;
}

export interface DetalleCierreCaja {
  id: string;
  pago_id: string;
  pago_fecha: string;
  pago_comprobante: string;
  alumno_nombre: string;
  alumno_legajo: string | null;
  concepto: string;
  medio_pago: MedioPagoCierre;
  importe: number;
}

export interface CorreccionCierreCaja {
  id: string;
  pago_id: string | null;
  responsable_nombre: string;
  creado_en: string;
  medio_pago: MedioPagoCierre;
  importe: number;
  motivo: string;
}

export interface CierreCaja {
  id: string;
  numero_comprobante: string;
  fecha: string;
  emitido_en: string;
  responsable_id: string;
  responsable_nombre: string;
  totales_por_medio: Record<MedioPagoCierre, number>;
  total_general: number;
  efectivo_esperado: number;
  efectivo_contado: number;
  diferencia: number;
  observacion: string | null;
  detalles: DetalleCierreCaja[];
  correcciones: CorreccionCierreCaja[];
}

export async function listarCobrosPendientesCierre(fecha: string, responsableId: string): Promise<PagoPendienteCierre[]> {
  const [{ data: pagos, error: errorPagos }, { data: detalles, error: errorDetalles }] = await Promise.all([
    supabase.from('pagos')
      .select('id, comprobante, fecha, concepto, importe, medio_pago, alumnos(nombre, apellido, legajo)')
      .eq('fecha', fecha)
      .eq('estado', 'CONFIRMADO')
      .or(`registrado_por.eq.${responsableId},registrado_por.is.null`)
      .order('created_at', { ascending: true }),
    supabase.from('caja_cierre_detalles').select('pago_id')
  ]);

  if (errorPagos) throw new Error(`No se pudieron cargar los cobros: ${errorPagos.message}`);
  if (errorDetalles) throw new Error(`No se pudo verificar qué cobros ya fueron cerrados: ${errorDetalles.message}`);

  const cerrados = new Set((detalles ?? []).map(detalle => detalle.pago_id));
  return ((pagos ?? []) as unknown as PagoPendienteCierre[]).filter(pago => !cerrados.has(pago.id));
}

export async function cerrarCaja(
  fecha: string,
  pagos: PagoPendienteCierre[],
  efectivoContado: number,
  observacion: string
): Promise<string> {
  const { data, error } = await supabase.rpc('cerrar_caja', {
    p_fecha: fecha,
    p_pago_ids: pagos.map(pago => pago.id),
    p_efectivo_contado: efectivoContado,
    p_observacion: observacion.trim() || null
  });

  if (error) throw new Error(error.message);
  return data as string;
}

export async function listarHistorialCierres(filtros: {
  fechaDesde?: string;
  fechaHasta?: string;
  responsableId?: string;
  soloResponsableId?: string;
} = {}): Promise<CierreCaja[]> {
  let consulta = supabase.from('caja_cierres')
    .select('*, detalles:caja_cierre_detalles(*), correcciones:caja_correcciones(*)')
    .order('emitido_en', { ascending: false });

  if (filtros.fechaDesde) consulta = consulta.gte('fecha', filtros.fechaDesde);
  if (filtros.fechaHasta) consulta = consulta.lte('fecha', filtros.fechaHasta);
  if (filtros.soloResponsableId) consulta = consulta.eq('responsable_id', filtros.soloResponsableId);
  else if (filtros.responsableId) consulta = consulta.eq('responsable_id', filtros.responsableId);

  const { data, error } = await consulta;
  if (error) throw new Error(`No se pudo consultar el historial de cierres: ${error.message}`);
  return (data ?? []) as unknown as CierreCaja[];
}

export async function obtenerCierreCaja(id: string): Promise<CierreCaja> {
  const { data, error } = await supabase.from('caja_cierres')
    .select('*, detalles:caja_cierre_detalles(*), correcciones:caja_correcciones(*)')
    .eq('id', id)
    .single();

  if (error) throw new Error(`No se pudo cargar el comprobante de cierre: ${error.message}`);
  return data as unknown as CierreCaja;
}

export async function registrarCorreccionCaja(
  cierreId: string,
  pagoId: string | null,
  medioPago: MedioPagoCierre,
  importe: number,
  motivo: string
): Promise<void> {
  const { error } = await supabase.rpc('registrar_correccion_caja', {
    p_cierre_id: cierreId,
    p_pago_id: pagoId,
    p_medio_pago: medioPago,
    p_importe: importe,
    p_motivo: motivo.trim()
  });

  if (error) throw new Error(error.message);
}