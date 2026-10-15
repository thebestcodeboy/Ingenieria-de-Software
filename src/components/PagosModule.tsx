'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { listarPagos, generarNumeroComprobante, listarInscripcionesCobro, listarObligacionesAlumno, type ObligacionPago } from '../services/pagos';
import RegistrarObligacionModal from './RegistrarObligacionModal';

import { agruparActividadesCobro, calcularSaldosPorAlumno, construirVinculoPago, fechaASemanaIso, type InscripcionCobro, type ModalidadPago, type VinculoPago } from '../domain/pagoAcademico';

export interface PagoConDetalle {
  obligacion_id?: string | null;
  inscripcion_id?: string | null;
  periodo_desde?: string | null;
  periodo_hasta?: string | null;
  detalle_academico?: VinculoPago['detalle_academico'] | null;
  id: string;
  comprobante: string;
  alumno_id: string;
  concepto: string;
  modalidad?: ModalidadPago;
  cantidad?: number;
  importe: number;
  medio_pago: 'Efectivo' | 'Transferencia' | 'Tarjeta de Débito' | 'Tarjeta de Crédito' | 'Mercado Pago';
  fecha: string;
  observaciones?: string | null;
  estado: 'CONFIRMADO' | 'BORRADOR' | 'CANCELADO' | 'ANULADO' | 'PENDIENTE' | 'RECHAZADO';
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

const PRESENTACION_ESTADO: Record<PagoConDetalle['estado'], { icono: string; color: string; fondo: string; borde: string }> = {
  CONFIRMADO: { icono: '✓', color: '#166534', fondo: '#f0fdf4', borde: '#bbf7d0' },
  PENDIENTE: { icono: '◷', color: '#92400e', fondo: '#fffbeb', borde: '#fde68a' },
  RECHAZADO: { icono: '!', color: '#991b1b', fondo: '#fef2f2', borde: '#fecaca' },
  BORRADOR: { icono: '…', color: '#1e40af', fondo: '#eff6ff', borde: '#bfdbfe' },
  CANCELADO: { icono: '×', color: '#991b1b', fondo: '#fef2f2', borde: '#fecaca' },
  ANULADO: { icono: '×', color: '#991b1b', fondo: '#fef2f2', borde: '#fecaca' }
};

function escaparTextoRecibo(texto: string): string {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export default function PagosModule() {
  const [pagos, setPagos] = useState<PagoConDetalle[]>([]);
  const [alumnos, setAlumnos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const fechaHoy = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Vista principal: Historial
  const [vistaActual, setVistaActual] = useState<'historial' | 'terminal'>('historial');

  // Filtros de historial y Paginación
  const [busqueda, setBusqueda] = useState('');
  const [filtroMedio, setFiltroMedio] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [paginaActual, setPaginaActual] = useState(1);
  const elementosPorPagina = 8;

  // Borrador si se reanuda
  const [pagoBorradorId, setPagoBorradorId] = useState<string | null>(null);

  // Formulario Terminal
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<any | null>(null);
  const [textoBusquedaAlumno, setTextoBusquedaAlumno] = useState('');
  const [mostrarDropdownAlumnos, setMostrarDropdownAlumnos] = useState(false);

  // Modalidad antes que Concepto
  const cantidad = 1;
  const [precioUnitario, setPrecioUnitario] = useState<number>(0);
  const [actividadInscripcionId, setActividadInscripcionId] = useState('');
  const [sesionId, setSesionId] = useState('');
  const [periodoAbonado, setPeriodoAbonado] = useState('');
  const [selectorMesAbierto, setSelectorMesAbierto] = useState(false);
  const [anioSelectorMes, setAnioSelectorMes] = useState(() => new Date().getFullYear());
  const [modalidadCurso, setModalidadCurso] = useState<'Semana' | 'Mes'>('Mes');
  const [inscripcionesCobro, setInscripcionesCobro] = useState<{ alumnoId: string; filas: InscripcionCobro[]; error: string }>({ alumnoId: '', filas: [], error: '' });
  const alumnoCobroId = alumnoSeleccionado?.id ? String(alumnoSeleccionado.id) : '';
  const cargandoActividades = Boolean(alumnoCobroId && inscripcionesCobro.alumnoId !== alumnoCobroId);

  useEffect(() => {
    if (!alumnoCobroId) return;
    let vigente = true;
    listarInscripcionesCobro(alumnoCobroId).then(filas => {
      if (vigente) setInscripcionesCobro({ alumnoId: alumnoCobroId, filas, error: '' });
    }).catch((error: unknown) => {
      if (vigente) setInscripcionesCobro({ alumnoId: alumnoCobroId, filas: [], error: error instanceof Error ? error.message : 'No se pudieron cargar las inscripciones.' });
    });
    return () => { vigente = false; };
  }, [alumnoCobroId]);

  const actividades = useMemo(() => agruparActividadesCobro(inscripcionesCobro.alumnoId === alumnoCobroId ? inscripcionesCobro.filas : []), [inscripcionesCobro, alumnoCobroId]);
  const actividadElegida = actividades.find(a => a.sesiones.some(s => s.id === actividadInscripcionId));
  const modalidad: ModalidadPago = actividadElegida?.clave.startsWith('particular:') ? 'Clase' : modalidadCurso;
  
  const datosCobro = useMemo(() => {
    try { return { vinculo: construirVinculoPago(actividadElegida, modalidad, periodoAbonado, cantidad, sesionId), error: '' }; }
    catch (error: unknown) { return { vinculo: null, error: error instanceof Error ? error.message : 'Revisá el detalle del cobro.' }; }
  }, [actividadElegida, modalidad, periodoAbonado, cantidad, sesionId]);

  const mesesDelAnio = Array.from({ length: 12 }, (_, mes) =>
    new Intl.DateTimeFormat('es-AR', { month: 'long' }).format(new Date(2025, mes, 1))
  );
  const mesAbonadoVisible = /^\d{4}-\d{2}$/.test(periodoAbonado)
    ? new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(
      new Date(Number(periodoAbonado.slice(0, 4)), Number(periodoAbonado.slice(5, 7)) - 1, 1)
    )
    : '';

  const abrirSelectorMes = () => {
    if (selectorMesAbierto) {
      setSelectorMesAbierto(false);
      return;
    }
    const anioActual = Number(periodoAbonado.slice(0, 4));
    setAnioSelectorMes(Number.isInteger(anioActual) && anioActual > 0 ? anioActual : new Date().getFullYear());
    setSelectorMesAbierto(true);
  };

  const seleccionarMesAbonado = (mes: number) => {
    setPeriodoAbonado(`${anioSelectorMes}-${String(mes + 1).padStart(2, '0')}`);
    setSelectorMesAbierto(false);
  };

  const [medioPago, setMedioPago] = useState<'Efectivo' | 'Transferencia' | 'Tarjeta de Débito' | 'Tarjeta de Crédito' | 'Mercado Pago'>('Efectivo');
  const [fechaCobro, setFechaCobro] = useState(fechaHoy);
  const [montoRecibido, setMontoRecibido] = useState<number>(0);
  const [nroReferencia, setNroReferencia] = useState('');

  // Modales
  const [pagoRecienCreado, setPagoRecienCreado] = useState<PagoConDetalle | null>(null);
  const [linkPagoMercadoPago, setLinkPagoMercadoPago] = useState<string | null>(null);
  const [comprobanteSeleccionado, setComprobanteSeleccionado] = useState<PagoConDetalle | null>(null);
  const [mostrarObligacion, setMostrarObligacion] = useState(false);
  const [obligacionesAlumno, setObligacionesAlumno] = useState<ObligacionPago[]>([]);
  const [obligacionId, setObligacionId] = useState('');

  // Feedback
  const [mensajeExito, setMensajeExito] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [pagosData, { data: alumnosData }] = await Promise.all([
        listarPagos(),
        supabase.from('alumnos').select('id, nombre, apellido, legajo, dni, email').order('apellido', { ascending: true })
      ]);
      setPagos((pagosData as PagoConDetalle[]) || []);
      setAlumnos(alumnosData || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al conectar los datos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    if (!alumnoCobroId) return;
    let vigente = true;
    listarObligacionesAlumno(alumnoCobroId)
      .then((filas) => { if (vigente) setObligacionesAlumno(filas); })
      .catch((err: unknown) => { if (vigente) setErrorMsg(err instanceof Error ? err.message : 'No se pudieron cargar las obligaciones.'); });
    return () => { vigente = false; };
  }, [alumnoCobroId]);

  const totalACobrar = useMemo(() => {
    const unit = Math.max(0, precioUnitario || 0);
    const cant = Math.max(1, cantidad || 1);
    return unit * cant;
  }, [precioUnitario, cantidad]);

  const vuelto = useMemo(() => {
    if (medioPago !== 'Efectivo') return 0;
    const recibido = Math.max(0, montoRecibido || 0);
    if (recibido <= totalACobrar) return 0;
    return recibido - totalACobrar;
  }, [medioPago, montoRecibido, totalACobrar]);

  useEffect(() => {
    if (medioPago === 'Efectivo') {
      setMontoRecibido(totalACobrar);
    }
  }, [totalACobrar, medioPago]);

  const alumnosSugeridos = useMemo(() => {
    if (!textoBusquedaAlumno.trim()) return alumnos.slice(0, 8);
    const q = textoBusquedaAlumno.toLowerCase().trim();
    return alumnos.filter(a =>
      (a.nombre || '').toLowerCase().includes(q) ||
      (a.apellido || '').toLowerCase().includes(q) ||
      (a.legajo || '').toLowerCase().includes(q) ||
      String(a.dni ?? '').toLowerCase().includes(q)
    ).slice(0, 10);
  }, [alumnos, textoBusquedaAlumno]);

  const pagosFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return pagos.filter(p => {
      const matchTexto = 
        (p.comprobante || '').toLowerCase().includes(q) ||
        (p.concepto || '').toLowerCase().includes(q) ||
        (p.alumnos?.nombre || '').toLowerCase().includes(q) ||
        (p.alumnos?.apellido || '').toLowerCase().includes(q) ||
        (p.alumnos?.legajo || '').toLowerCase().includes(q);

      const matchMedio = filtroMedio === 'todos' || p.medio_pago === filtroMedio;
      const matchEstado = filtroEstado === 'todos' || p.estado === filtroEstado;
      return matchTexto && matchMedio && matchEstado;
    });
  }, [pagos, busqueda, filtroMedio, filtroEstado]);

  const totalPaginas = Math.ceil(pagosFiltrados.length / elementosPorPagina) || 1;
  const pagosPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * elementosPorPagina;
    return pagosFiltrados.slice(inicio, inicio + elementosPorPagina);
  }, [pagosFiltrados, paginaActual]);

  const saldosPorAlumno = useMemo(() => calcularSaldosPorAlumno(alumnos, pagos), [alumnos, pagos]);
  const saldosVisibles = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return saldosPorAlumno.filter(saldo =>
      !q || `${saldo.apellido} ${saldo.nombre} ${saldo.legajo || ''}`.toLowerCase().includes(q)
    );
  }, [saldosPorAlumno, busqueda]);
  const totalDeudaRegistrada = useMemo(() => saldosPorAlumno.reduce((total, saldo) => total + saldo.saldoAdeudado, 0), [saldosPorAlumno]);

  const handleSeleccionarAlumno = (al: any) => {
    setAlumnoSeleccionado(al);
    setModalidadCurso('Mes');
    setObligacionesAlumno([]);
    setObligacionId('');
    setActividadInscripcionId(''); setSesionId(''); setPeriodoAbonado(''); setErrorMsg('');
    setTextoBusquedaAlumno(`${al.apellido}, ${al.nombre} (${al.legajo || 'Sin Legajo'}) - DNI: ${al.dni}`);
    setMostrarDropdownAlumnos(false);
  };

  const limpiarFormulario = () => {
    setPagoBorradorId(null);
    setAlumnoSeleccionado(null);
    setTextoBusquedaAlumno('');
    setActividadInscripcionId(''); setSesionId(''); setPeriodoAbonado('');
    setObligacionId('');
    setModalidadCurso('Mes');
    setPrecioUnitario(0);
    setMontoRecibido(0);
    setNroReferencia('');
    setLinkPagoMercadoPago(null);
    setFechaCobro(fechaHoy);
  };

  const handleReanudarBorrador = (p: PagoConDetalle) => {
    setPagoBorradorId(p.id);
    setObligacionId(p.obligacion_id || '');
    if (p.alumnos) {
      setAlumnoSeleccionado(p.alumnos);
      setTextoBusquedaAlumno(`${p.alumnos.apellido}, ${p.alumnos.nombre} (${p.alumnos.legajo || 'Sin Legajo'}) - DNI: ${p.alumnos.dni}`);
    }
    setActividadInscripcionId(p.inscripcion_id || '');
    setSesionId(p.modalidad === 'Clase' ? p.inscripcion_id || '' : '');
    setModalidadCurso(p.modalidad === 'Semana' ? 'Semana' : 'Mes');
    const requiereRevision = (p.cantidad || 1) !== 1;
    const periodoReanudado = p.modalidad === 'Semana'
      ? p.periodo_desde ? fechaASemanaIso(p.periodo_desde) : ''
      : p.modalidad === 'Mes' ? p.periodo_desde?.slice(0,7) || '' : '';
    setPeriodoAbonado(periodoReanudado);
    setSelectorMesAbierto(false);
    setErrorMsg(requiereRevision ? 'Este borrador cubría varias unidades. Revisá el período y el precio antes de confirmar.' : '');
    setPrecioUnitario(requiereRevision ? 0 : p.importe || 0);
    setMedioPago(p.medio_pago);
    setNroReferencia((p.observaciones || '').replace(/^(?:N°\s*)?Ref:\s*/i, ''));
    setFechaCobro(p.fecha >= fechaHoy ? p.fecha : fechaHoy);
    setVistaActual('terminal');
  };

  const handleMarcarCancelado = async (id: string) => {
    if (!confirm('¿Confirma cancelar definitivamente esta operación? Quedará archivada y no podrá ser reactivada.')) return;
    try {
      const { error } = await supabase
        .from('pagos')
        .update({ estado: 'CANCELADO' })
        .eq('id', id);

      if (error) throw error;
      setMensajeExito('Operación cancelada y archivada correctamente.');
      await cargarDatos();
      setTimeout(() => setMensajeExito(''), 3500);
    } catch (err: any) {
      alert(`Error al cancelar: ${err.message}`);
    }
  };

  const handleSuspenderBorrador = async () => {
    if (!alumnoSeleccionado) {
      setErrorMsg('Debe vincular un alumno antes de suspender en borrador.');
      return;
    }
    if (!datosCobro.vinculo) { setErrorMsg(datosCobro.error); return; }
    if (precioUnitario <= 0) {
      setErrorMsg('El precio unitario debe ser mayor a cero.');
      return;
    }

    try {
      setGuardando(true);
      const conceptoCompleto = datosCobro.vinculo.concepto;

      if (pagoBorradorId) {
        const { error } = await supabase
          .from('pagos')
          .update({
            alumno_id: alumnoSeleccionado.id,
            obligacion_id: obligacionId || null,
            ...datosCobro.vinculo,
            concepto: conceptoCompleto,
            modalidad,
            cantidad,
            importe: totalACobrar,
            medio_pago: medioPago,
            fecha: fechaCobro,
            observaciones: medioPago === 'Efectivo' ? null : `Ref: ${nroReferencia.trim()}`,
            estado: 'BORRADOR'
          })
          .eq('id', pagoBorradorId);

        if (error) throw error;
      } else {
        const nuevoComp = await generarNumeroComprobante();
        const { error } = await supabase
          .from('pagos')
          .insert([{
            comprobante: nuevoComp,
            alumno_id: alumnoSeleccionado.id,
            obligacion_id: obligacionId || null,
            ...datosCobro.vinculo,
            concepto: conceptoCompleto,
            modalidad,
            cantidad,
            importe: totalACobrar,
            medio_pago: medioPago,
            fecha: fechaCobro,
            observaciones: medioPago === 'Efectivo' ? null : `Ref: ${nroReferencia.trim()}`,
            estado: 'BORRADOR'
          }]);

        if (error) throw error;
      }

      setMensajeExito('Operación suspendida con éxito. Ha quedado guardada como PENDIENTE (BORRADOR).');
      limpiarFormulario();
      await cargarDatos();
      setVistaActual('historial');
      setTimeout(() => setMensajeExito(''), 4500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al suspender el pago.');
    } finally {
      setGuardando(false);
    }
  };

  const handleConfirmarCobro = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!alumnoSeleccionado) {
      setErrorMsg('Debe seleccionar un alumno para procesar el cobro.');
      return;
    }
    if (!datosCobro.vinculo) { setErrorMsg(datosCobro.error); return; }
    if (precioUnitario <= 0 || totalACobrar <= 0) {
      setErrorMsg('El importe debe ser un valor positivo y mayor a cero.');
      return;
    }
    if (fechaCobro < fechaHoy) {
      setErrorMsg('No está permitido registrar pagos con fechas pasadas.');
      return;
    }
    if (medioPago === 'Efectivo' && montoRecibido < totalACobrar) {
      setErrorMsg('El monto recibido no puede ser inferior al total de la operación.');
      return;
    }
    if (medioPago !== 'Efectivo' && medioPago !== 'Mercado Pago' && !nroReferencia.trim()) {
      setErrorMsg('Debe ingresar el número de referencia u operación.');
      return;
    }
    
    try {
      setGuardando(true);
      const conceptoCompleto = datosCobro.vinculo.concepto;
      const nuevoComp = pagoBorradorId ? null : await generarNumeroComprobante();

      let externalPaymentId = null;
      let estadoInicial: 'CONFIRMADO' | 'PENDIENTE' = 'CONFIRMADO';
      let preferenceId: string | null = null;
      let checkoutUrl: string | null = null;

      if (medioPago === 'Mercado Pago') {
        const mpRes = await fetch('/api/pagos/mercadopago', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            importe: totalACobrar,
            description: conceptoCompleto,
            payer_email: alumnoSeleccionado.email,
            external_reference: pagoBorradorId || nuevoComp
          })
        });
        const mpData = await mpRes.json();
        if (!mpRes.ok) throw new Error(mpData.error || 'Error al conectar con Mercado Pago');
        preferenceId = mpData.preference_id?.toString() || null;
        checkoutUrl = mpData.checkout_url || null;
        if (!checkoutUrl) throw new Error('Mercado Pago no devolvió un enlace de Checkout.');
        estadoInicial = 'PENDIENTE';
      }

      let pagoConfirmadoResult: PagoConDetalle;
      const observacionesFinal = medioPago === 'Efectivo' 
        ? null 
        : medioPago === 'Mercado Pago' 
          ? `Mercado Pago Preferencia: ${preferenceId || 'Generada'}` 
          : `N° Ref: ${nroReferencia.trim()}`;

      if (pagoBorradorId) {
        const { data, error } = await supabase
          .from('pagos')
          .update({
            alumno_id: alumnoSeleccionado.id,
            obligacion_id: obligacionId || null,
            ...datosCobro.vinculo,
            concepto: conceptoCompleto,
            modalidad,
            cantidad,
            importe: totalACobrar,
            medio_pago: medioPago,
            fecha: fechaCobro,
            observaciones: observacionesFinal,
            estado: estadoInicial,
            external_payment_id: externalPaymentId
          })
          .eq('id', pagoBorradorId)
          .select('*, alumnos(id, nombre, apellido, legajo, dni, email)')
          .single();

        if (error) throw error;
        pagoConfirmadoResult = data as PagoConDetalle;
      } else {
        const { data, error } = await supabase
          .from('pagos')
          .insert([{
            comprobante: nuevoComp ?? await generarNumeroComprobante(),
            alumno_id: alumnoSeleccionado.id,
            obligacion_id: obligacionId || null,
            ...datosCobro.vinculo,
            concepto: conceptoCompleto,
            modalidad,
            cantidad,
            importe: totalACobrar,
            medio_pago: medioPago,
            fecha: fechaCobro,
            observaciones: observacionesFinal,
            estado: estadoInicial,
            external_payment_id: externalPaymentId
          }])
          .select('*, alumnos(id, nombre, apellido, legajo, dni, email)')
          .single();

        if (error) throw error;
        pagoConfirmadoResult = data as PagoConDetalle;
      }

      limpiarFormulario();
      await cargarDatos();
      setPagoRecienCreado(pagoConfirmadoResult);
      setLinkPagoMercadoPago(checkoutUrl);
      setVistaActual('historial');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar el cobro.');
    } finally {
      setGuardando(false);
    }
  };

  const handleDescargarPDF = (pago: PagoConDetalle) => {
    const ventanaImpresion = window.open('', '_blank');
    if (!ventanaImpresion) {
      alert('Por favor habilita las ventanas emergentes en tu navegador.');
      return;
    }

    const apellidoLimpio = (pago.alumnos?.apellido || 'ALUMNO').toUpperCase().replace(/\s+/g, '_');
    const nombreLimpio = (pago.alumnos?.nombre || '').toUpperCase().replace(/\s+/g, '_');
    const nombreArchivoPDF = `${pago.comprobante}_${apellidoLimpio}_${nombreLimpio}`;

    const cantVal = pago.cantidad || 1;
    const totalFormateado = Number(pago.importe).toLocaleString('es-AR', { minimumFractionDigits: 2 });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${nombreArchivoPDF}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          * { box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0b1e33; background: #ffffff; margin: 0; padding: 0; font-size: 11px; }
          .recibo-marco { border: 2px solid #0b1e33; padding: 18px 20px; }
          .tabla-header { width: 100%; border-collapse: collapse; border-bottom: 2px solid #0b1e33; padding-bottom: 12px; margin-bottom: 12px; }
          .tabla-header td { vertical-align: middle; }
          .logo-col { width: 48%; }
          .centro-col { width: 8%; text-align: center; vertical-align: middle; border-left: 2px solid #0b1e33; border-right: 2px solid #0b1e33; padding: 0 4px; }
          .letra-box { display: inline-block; background: #0b1e33; color: #ffffff; font-weight: 800; font-size: 20px; padding: 4px 10px; margin-bottom: 4px; }
          .datos-fiscales-col { width: 44%; padding-left: 18px; font-size: 10px; line-height: 1.45; color: #334155; }
          .marca-header { display: flex; align-items: center; gap: 12px; }
          .img-logo { width: 62px; height: 62px; object-fit: contain; }
          .titulo-instituto { font-size: 19px; font-weight: 800; color: #0b1e33; letter-spacing: 0.8px; margin: 0 0 2px 0; text-transform: uppercase; }
          .subtitulo-instituto { font-size: 9.5px; color: #2563eb; font-weight: 800; letter-spacing: 0.6px; text-transform: uppercase; }
          .barra-recibo { border: 1.5px solid #0b1e33; background-color: #f8fafc; font-weight: 700; font-size: 11.5px; display: flex; justify-content: space-between; padding: 7px 14px; margin: 12px 0; }
          .box-alumno { border: 1.5px solid #0b1e33; margin-bottom: 14px; }
          .barra-alumno-header { background-color: #e2e8f0; border-bottom: 1.5px solid #0b1e33; padding: 6px 12px; font-weight: 800; font-size: 10.5px; display: grid; grid-template-columns: 1.2fr 1.2fr 2fr; gap: 8px; }
          .cuerpo-alumno { padding: 10px 14px; font-size: 10.5px; line-height: 1.55; background-color: #ffffff; }
          .cuerpo-alumno table { width: 100%; border-collapse: collapse; }
          .cuerpo-alumno td { padding: 2px 0; }
          .box-conceptos { border: 1.5px solid #0b1e33; min-height: 380px; display: flex; flex-direction: column; justify-content: space-between; margin-bottom: 14px; }
          .tabla-conceptos { width: 100%; border-collapse: collapse; }
          .tabla-conceptos th { background-color: #0b1e33; color: #ffffff; font-size: 10.5px; font-weight: 700; padding: 8px 12px; text-align: left; }
          .tabla-conceptos td { padding: 14px 12px; font-size: 11.5px; vertical-align: top; border-bottom: 1px solid #e2e8f0; }
          .total-barra { background-color: #f8fafc; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; font-size: 14px; font-weight: 800; border-top: 1.5px solid #0b1e33; }
          .leyenda-legal { border-top: 1px dashed #94a3b8; margin-top: 14px; padding-top: 8px; font-size: 9px; color: #64748b; text-align: justify; line-height: 1.35; }
        </style>
      </head>
      <body>
        <div class="recibo-marco">
          <table class="tabla-header">
            <tr>
              <td class="logo-col">
                <div class="marca-header">
                  <img src="/logo.png" alt="Instituto Ateneo" class="img-logo" onerror="this.style.display='none'" />
                  <div>
                    <h1 class="titulo-instituto">INSTITUTO ATENEO</h1>
                    <div class="subtitulo-instituto">CONOCIMIENTO SIN LÍMITES</div>
                  </div>
                </div>
              </td>
              <td class="centro-col">
                <div class="letra-box">X</div>
                <div style="font-size:7px; font-weight:700; color:#0b1e33;">DOC. NO VÁLIDO</div>
              </td>
              <td class="datos-fiscales-col">
                <div><strong>COMPROBANTE INTERNO DE COBRO</strong></div>
                <div>Fecha de Emisión: <strong>${pago.fecha}</strong></div>
                <div>Medio de Pago: <strong>${pago.medio_pago}</strong></div>
              </td>
            </tr>
          </table>

          <div class="barra-recibo">
            <div>Fecha: <strong>${pago.fecha}</strong></div>
            <div>RECIBO N°: <strong>${pago.comprobante}</strong></div>
          </div>

          <div class="box-alumno">
            <div class="barra-alumno-header">
              <div>DNI: <strong>${pago.alumnos?.dni || '—'}</strong></div>
              <div>LEGAJO: <strong>${pago.alumnos?.legajo || 'Sin Legajo'}</strong></div>
              <div>ALUMNO: <strong>${pago.alumnos?.apellido?.toUpperCase() || ''}, ${pago.alumnos?.nombre?.toUpperCase() || ''}</strong></div>
            </div>
          </div>

          <div class="box-conceptos">
            <table class="tabla-conceptos">
              <thead>
                <tr>
                  <th>C O N C E P T O S</th>
                  <th style="text-align: center;">CANTIDAD</th>
                  <th style="text-align: right;">IMPORTE</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>${escaparTextoRecibo(pago.concepto)}</strong></td>
                  <td style="text-align: center;">${cantVal}</td>
                  <td style="text-align: right; font-weight: 700;">$ ${totalFormateado}</td>
                </tr>
              </tbody>
            </table>
            <div class="total-barra">
              <span>TOTAL ACREDITADO:</span>
              <span style="font-size: 18px; color: #15803d;">$ ${totalFormateado}</span>
            </div>
          </div>
        </div>
        <script>window.onload = function() { window.print(); };</script>
      </body>
      </html>
    `;

    ventanaImpresion.document.open();
    ventanaImpresion.document.write(htmlContent);
    ventanaImpresion.document.close();
  };

  return (
    <div style={{ width: '100%', boxSizing: 'border-box' }}>
      {mostrarObligacion && (
        <RegistrarObligacionModal
          alumnos={alumnos}
          onClose={() => setMostrarObligacion(false)}
          onSuccess={() => {
            setMostrarObligacion(false);
            setMensajeExito('Obligación registrada correctamente.');
            setTimeout(() => setMensajeExito(''), 3500);
          }}
        />
      )}
      
      {/* 1. TERMINAL DE FACTURACIÓN Y COBRO */}
      {vistaActual === 'terminal' ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <button
              onClick={() => { limpiarFormulario(); setVistaActual('historial'); }}
              style={{ backgroundColor: 'transparent', border: 'none', color: '#2563eb', fontWeight: 700, fontSize: '15px', cursor: 'pointer', padding: 0 }}
            >
              ← Volver al historial de cobros
            </button>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={handleSuspenderBorrador}
                disabled={guardando || !alumnoSeleccionado}
                style={{ padding: '9px 16px', backgroundColor: (!alumnoSeleccionado || guardando) ? '#94a3b8' : '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}
              >
                <span>Suspender</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pagoBorradorId) handleMarcarCancelado(pagoBorradorId);
                  limpiarFormulario();
                  setVistaActual('historial');
                }}
                style={{ padding: '9px 16px', backgroundColor: '#ffffff', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '6px', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancelar Operación
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '22px' }}>
            <h1 style={{ margin: 0, color: '#0f172a', fontSize: '25px', fontWeight: 700 }}>Terminal de Facturación y Cobro</h1>
          </div>

          {errorMsg && (
            <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '8px', marginBottom: '20px', fontSize: '15px', fontWeight: 600 }}>
              {errorMsg}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: '24px', alignItems: 'start' }}>
            
            {/* PANEL IZQUIERDO */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '28px' }}>
              <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase' }}>
                1. Selección del Estudiante
              </h2>

              <div style={{ position: 'relative', marginBottom: '18px' }}>
                <input
                  type="text"
                  placeholder="Escribe para buscar alumno..."
                  value={textoBusquedaAlumno}
                  onFocus={() => setMostrarDropdownAlumnos(true)}
                  onChange={(e) => {
                    setTextoBusquedaAlumno(e.target.value);
                    setAlumnoSeleccionado(null);
                    setObligacionesAlumno([]);
                    setObligacionId('');
                    setActividadInscripcionId(''); setSesionId('');
                    setMostrarDropdownAlumnos(true);
                  }}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '15px', boxSizing: 'border-box' }}
                />

                {mostrarDropdownAlumnos && alumnosSugeridos.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', zIndex: 20, maxHeight: '220px', overflowY: 'auto', marginTop: '4px' }}>
                    {alumnosSugeridos.map(al => (
                      <div
                        key={al.id}
                        onClick={() => handleSeleccionarAlumno(al)}
                        style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                      >
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{al.apellido}, {al.nombre}</div>
                        <div style={{ fontSize: '13px', color: '#64748b' }}>DNI: {al.dni} | Legajo: <strong>{al.legajo || 'Sin Legajo'}</strong></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {alumnoSeleccionado && (
                <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '14px', marginBottom: '22px' }}>
                  <div style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>{alumnoSeleccionado.apellido}, {alumnoSeleccionado.nombre}</div>
                  <div style={{ fontSize: '14px', color: '#334155' }}>DNI: {alumnoSeleccionado.dni} | Legajo: {alumnoSeleccionado.legajo || 'S/L'}</div>
                </div>
              )}

              <h2 style={{ margin: '24px 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase' }}>
                2. Detalle del Cobro
              </h2>

              <div style={{ display: 'grid', gap: '12px', marginBottom: '18px' }}>
                <label style={{ fontSize: '14px', fontWeight: 700, color: '#334155' }}>
                  Obligación asociada
                  <select
                    value={obligacionId}
                    disabled={!alumnoSeleccionado}
                    onChange={(e) => {
                      const id = e.target.value;
                      setObligacionId(id);
                      const obligacion = obligacionesAlumno.find((item) => item.id === id);
                      if (obligacion) setPrecioUnitario(Number(obligacion.saldo_pendiente));
                    }}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '6px' }}
                  >
                    <option value="">Cobro sin obligación asociada</option>
                    {obligacionesAlumno.map((obligacion) => (
                      <option key={obligacion.id} value={obligacion.id}>
                        {obligacion.concepto} · saldo ${Number(obligacion.saldo_pendiente).toLocaleString('es-AR')}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={{ fontSize: '14px', fontWeight: 700, color: '#334155' }}>
                  Actividad que abona *
                  <select
                    value={actividadElegida?.sesiones[0].id || ''}
                    disabled={!alumnoSeleccionado || cargandoActividades}
                    onChange={(e) => {
                      setActividadInscripcionId(e.target.value);
                      setSesionId('');
                      setPeriodoAbonado('');
                      const elegida = actividades.find((item) => item.sesiones.some((sesion) => sesion.id === e.target.value));
                      setModalidadCurso(elegida?.modalidadCobro === 'Semana' ? 'Semana' : 'Mes');
                      const obligacion = obligacionesAlumno.find((item) => item.id === obligacionId);
                      setPrecioUnitario(obligacion ? Number(obligacion.saldo_pendiente) : Number(elegida?.precio || 0));
                    }}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '6px' }}
                  >
                    <option value="">{cargandoActividades ? 'Cargando inscripciones...' : 'Seleccioná un curso o clase particular'}</option>
                    {actividades.map(a => <option key={a.clave} value={a.sesiones[0].id}>{a.nombre} · {a.materias.join(', ')} · {a.docente}</option>)}
                  </select>
                </label>

                {actividadElegida && modalidad !== 'Clase' && (
                  <label style={{ fontSize: '14px', fontWeight: 700, color: '#334155' }}>Modalidad de cobro *
                    <select value={modalidadCurso} onChange={e => { setModalidadCurso(e.target.value as 'Semana' | 'Mes'); setPeriodoAbonado(''); setPrecioUnitario(0); }}
                      style={{ width: '100%', padding: '10px 12px', marginTop: '6px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                      <option value="Semana">Semana</option>
                      <option value="Mes">Mes</option>
                    </select>
                  </label>
                )}
              </div>

              {datosCobro.vinculo && (
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Precio unitario ($) *
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={precioUnitario || ''}
                    onChange={e => setPrecioUnitario(Math.max(0, parseFloat(e.target.value) || 0))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '16px', boxSizing: 'border-box' }}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Fecha de Operación *</label>
                <input
                  type="date"
                  required
                  min={fechaHoy}
                  value={fechaCobro}
                  onChange={(e) => setFechaCobro(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '15px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* PANEL DERECHO */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '28px' }}>
              <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase' }}>
                3. Forma de Cobro
              </h2>

              <form onSubmit={handleConfirmarCobro} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Medio de Pago *</label>
                  <select
                    value={medioPago}
                    onChange={(e: any) => setMedioPago(e.target.value)}
                    style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '15px', fontWeight: 600 }}
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia bancaria</option>
                    <option value="Tarjeta de Débito">Tarjeta de débito</option>
                    <option value="Tarjeta de Crédito">Tarjeta de crédito</option>
                    <option value="Mercado Pago">Mercado Pago (Link / QR)</option>
                  </select>
                </div>

                {medioPago === 'Efectivo' ? (
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Monto Recibido ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={montoRecibido || ''}
                      onChange={(e) => setMontoRecibido(Math.max(0, parseFloat(e.target.value) || 0))}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '18px', fontWeight: 700 }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: '#475569' }}>Vuelto:</span>
                      <span style={{ fontSize: '19px', fontWeight: 800, color: vuelto > 0 ? '#15803d' : '#64748b' }}>
                        ${vuelto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Nº de Referencia *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Op. #981240"
                      value={nroReferencia}
                      onChange={(e) => setNroReferencia(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '15px' }}
                    />
                  </div>
                )}

                <div style={{ padding: '14px 0', borderTop: '2px dashed #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>TOTAL:</span>
                    <span style={{ fontSize: '25px', fontWeight: 800, color: '#15803d' }}>
                      ${totalACobrar.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={guardando || !alumnoSeleccionado || totalACobrar <= 0}
                  style={{ width: '100%', padding: '13px', backgroundColor: (!alumnoSeleccionado || totalACobrar <= 0) ? '#94a3b8' : '#0b1e33', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 700, cursor: 'pointer' }}
                >
                  {guardando ? 'Generando...' : 'Confirmar Cobro y Generar Recibo'}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        /* 2. HISTORIAL DE PAGOS */
        <div>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h1 style={{ margin: 0, color: '#0f172a', fontSize: '25px', fontWeight: 800 }}>Gestión Inicial de Pagos y Cobros</h1>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setMostrarObligacion(true)}
                style={{ padding: '10px 18px', backgroundColor: '#ffffff', color: '#0b1e33', border: '1px solid #0b1e33', borderRadius: '6px', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}
              >
                Registrar ajuste manual
              </button>
              <button
                onClick={() => { limpiarFormulario(); setVistaActual('terminal'); }}
                style={{ padding: '10px 18px', backgroundColor: '#0b1e33', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}
              >
                Registrar nuevo cobro
              </button>
            </div>
          </header>

          {mensajeExito && (
            <div style={{ padding: '12px 16px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: '7px', marginBottom: '16px', fontWeight: 600 }}>
              {mensajeExito}
            </div>
          )}

          {/* FILTROS */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '18px', flexWrap: 'wrap' }}>
            <input
              type="search"
              placeholder="Buscar por comprobante, concepto, alumno o legajo..."
              value={busqueda}
              onChange={(e) => { setBusqueda(e.target.value); setPaginaActual(1); }}
              style={{ flex: 1, minWidth: '280px', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '15px' }}
            />
            <select
              value={filtroEstado}
              onChange={(e) => { setFiltroEstado(e.target.value); setPaginaActual(1); }}
              style={{ padding: '0 14px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#ffffff', fontWeight: 600 }}
            >
              <option value="todos">Todos los Estados</option>
              <option value="CONFIRMADO">Confirmados</option>
              <option value="PENDIENTE">Pendientes de acreditación</option>
              <option value="RECHAZADO">Rechazados</option>
              <option value="BORRADOR">Pendientes (Borrador)</option>
              <option value="CANCELADO">Cancelados</option>
            </select>
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#ffffff' }}>
            <table style={{ width: '100%', minWidth: '950px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '15px' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '13.5px', fontWeight: 800, textTransform: 'uppercase' }}>
                  <th style={{ padding: '14px 16px' }}>Comprobante</th>
                  <th style={{ padding: '14px 16px' }}>Fecha</th>
                  <th style={{ padding: '14px 16px' }}>Alumno / Legajo</th>
                  <th style={{ padding: '14px 16px' }}>Concepto</th>
                  <th style={{ padding: '14px 16px' }}>Medio de Pago</th>
                  <th style={{ padding: '14px 16px' }}>Importe</th>
                  <th style={{ padding: '14px 16px' }}>Estado</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>Cargando registros contables...</td></tr>
                ) : pagosPaginados.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>No se encontraron comprobantes registrados.</td></tr>
                ) : (
                  pagosPaginados.map((p) => {
                    const esBorrador = p.estado === 'BORRADOR';
                    const esCancelado = p.estado === 'CANCELADO' || p.estado === 'ANULADO';
                    const presentacionEstado = PRESENTACION_ESTADO[p.estado];

                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 700 }}>{p.comprobante}</td>
                        <td style={{ padding: '12px 16px', color: '#475569' }}>{p.fecha}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <strong style={{ display: 'block' }}>{p.alumnos?.apellido}, {p.alumnos?.nombre}</strong>
                          <span style={{ fontSize: '13px', color: '#64748b' }}>Leg: {p.alumnos?.legajo || 'S/L'}</span>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#334155' }}>{p.concepto}</td>
                        <td style={{ padding: '12px 16px', color: '#475569' }}>{p.medio_pago}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#15803d' }}>
                          ${Number(p.importe).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '12.5px', fontWeight: 700, backgroundColor: presentacionEstado.fondo, color: presentacionEstado.color, border: `1px solid ${presentacionEstado.borde}` }}>
                            {esBorrador ? 'PENDIENTE (BORRADOR)' : p.estado}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          {esBorrador ? (
                            <button onClick={() => handleReanudarBorrador(p)} style={{ padding: '6px 10px', backgroundColor: '#2563eb', border: 'none', borderRadius: '5px', color: '#ffffff', fontWeight: 700, cursor: 'pointer' }}>
                              Reanudar Cobro
                            </button>
                          ) : !esCancelado && (
                            <button onClick={() => setComprobanteSeleccionado(p)} style={{ padding: '6px 12px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '5px', fontWeight: 700, cursor: 'pointer' }}>
                              Ver Recibo Oficial
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL PAGO CREADO */}
      {pagoRecienCreado && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 120, backgroundColor: 'rgba(15,23,42,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', width: '100%', maxWidth: '460px', padding: '36px 32px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '21px', fontWeight: 800, margin: '0 0 6px 0' }}>¡Cobro registrado con éxito!</h2>
            <p style={{ fontSize: '15px', color: '#64748b', margin: '0 0 20px 0' }}>Comprobante <strong>{pagoRecienCreado.comprobante}</strong> generado.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={() => handleDescargarPDF(pagoRecienCreado)} style={{ width: '100%', padding: '12px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                Descargar PDF
              </button>
              <button onClick={() => { setPagoRecienCreado(null); setLinkPagoMercadoPago(null); }} style={{ width: '100%', padding: '11px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                Volver al Menú Principal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RECIBO OFICIAL */}
      {comprobanteSeleccionado && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 110, backgroundColor: 'rgba(15,23,42,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', width: '100%', maxWidth: '620px', padding: '36px', border: '2px solid #0b1e33' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0b1e33' }}>RECIBO OFICIAL: {comprobanteSeleccionado.comprobante}</h2>
            <p style={{ fontSize: '15px', margin: '10px 0' }}><strong>Alumno:</strong> {comprobanteSeleccionado.alumnos?.apellido}, {comprobanteSeleccionado.alumnos?.nombre}</p>
            <p style={{ fontSize: '15px', margin: '10px 0' }}><strong>Concepto:</strong> {comprobanteSeleccionado.concepto}</p>
            <p style={{ fontSize: '18px', fontWeight: 800, color: '#15803d', margin: '15px 0' }}>Total: ${Number(comprobanteSeleccionado.importe).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => handleDescargarPDF(comprobanteSeleccionado)} style={{ padding: '9px 16px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}>
                Descargar PDF
              </button>
              <button onClick={() => setComprobanteSeleccionado(null)} style={{ padding: '9px 16px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}