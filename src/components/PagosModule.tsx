'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { listarPagos, generarNumeroComprobante, listarInscripcionesCobro } from '../services/pagos';

import { agruparActividadesCobro, construirVinculoPago, type InscripcionCobro, type VinculoPago } from '../domain/pagoAcademico';

export interface PagoConDetalle {
  inscripcion_id?: string | null;
  periodo_desde?: string | null;
  periodo_hasta?: string | null;
  detalle_academico?: VinculoPago['detalle_academico'] | null;
  id: string;
  comprobante: string;
  alumno_id: string;
  concepto: string;
  modalidad?: 'Clase' | 'Semana' | 'Mes' | string;
  cantidad?: number;
  importe: number;
  medio_pago: 'Efectivo' | 'Transferencia' | 'Tarjeta de Débito' | 'Tarjeta de Crédito';
  fecha: string;
  observaciones?: string | null;
  estado: 'CONFIRMADO' | 'BORRADOR' | 'CANCELADO' | 'ANULADO';
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
  const modalidad = actividadElegida?.clave.startsWith('particular:') ? 'Clase' : 'Mes';
  const datosCobro = useMemo(() => {
    try { return { vinculo: construirVinculoPago(actividadElegida, modalidad, periodoAbonado, cantidad, sesionId), error: '' }; }
    catch (error: unknown) { return { vinculo: null, error: error instanceof Error ? error.message : 'Revisá el detalle del cobro.' }; }
  }, [actividadElegida, modalidad, periodoAbonado, cantidad, sesionId]);
  const concepto = datosCobro.vinculo?.concepto ?? '';


  const [medioPago, setMedioPago] = useState<'Efectivo' | 'Transferencia' | 'Tarjeta de Débito' | 'Tarjeta de Crédito'>('Efectivo');
  const [fechaCobro, setFechaCobro] = useState(fechaHoy);
  const [montoRecibido, setMontoRecibido] = useState<number>(0);
  const [nroReferencia, setNroReferencia] = useState('');

  // Modales
  const [pagoRecienCreado, setPagoRecienCreado] = useState<PagoConDetalle | null>(null);
  const [comprobanteSeleccionado, setComprobanteSeleccionado] = useState<PagoConDetalle | null>(null);

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

  const handleSeleccionarAlumno = (al: any) => {
    setAlumnoSeleccionado(al);
    setActividadInscripcionId(''); setSesionId(''); setPeriodoAbonado(''); setErrorMsg('');
    setTextoBusquedaAlumno(`${al.apellido}, ${al.nombre} (${al.legajo || 'Sin Legajo'}) - DNI: ${al.dni}`);
    setMostrarDropdownAlumnos(false);
  };

  const limpiarFormulario = () => {
    setPagoBorradorId(null);
    setAlumnoSeleccionado(null);
    setTextoBusquedaAlumno('');
    setActividadInscripcionId(''); setSesionId(''); setPeriodoAbonado('');
    setPrecioUnitario(0);
    setMontoRecibido(0);
    setNroReferencia('');
    setFechaCobro(fechaHoy);
  };

  const handleReanudarBorrador = (p: PagoConDetalle) => {
    setPagoBorradorId(p.id);
    if (p.alumnos) {
      setAlumnoSeleccionado(p.alumnos);
      setTextoBusquedaAlumno(`${p.alumnos.apellido}, ${p.alumnos.nombre} (${p.alumnos.legajo || 'Sin Legajo'}) - DNI: ${p.alumnos.dni}`);
    }
    setActividadInscripcionId(p.inscripcion_id || '');
    setSesionId(p.modalidad === 'Clase' ? p.inscripcion_id || '' : '');
    const requiereRevision = (p.cantidad || 1) !== 1 || p.modalidad === 'Semana';
    setPeriodoAbonado(!requiereRevision && p.modalidad === 'Mes' ? p.periodo_desde?.slice(0,7) || '' : '');
    setErrorMsg(requiereRevision ? 'Este borrador cubría varias unidades o semanas. Seleccioná un mes o una clase e indicá su precio antes de confirmar.' : '');
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
    if (medioPago !== 'Efectivo' && !nroReferencia.trim()) {
      setErrorMsg('Debe ingresar el número de referencia u operación.');
      return;
    }

    try {
      setGuardando(true);
      const conceptoCompleto = datosCobro.vinculo.concepto;

      let pagoConfirmadoResult: PagoConDetalle;

      if (pagoBorradorId) {
        const { data, error } = await supabase
          .from('pagos')
          .update({
            alumno_id: alumnoSeleccionado.id,
            ...datosCobro.vinculo,
            concepto: conceptoCompleto,
            modalidad,
            cantidad,
            importe: totalACobrar,
            medio_pago: medioPago,
            fecha: fechaCobro,
            observaciones: medioPago === 'Efectivo' ? null : `N° Ref: ${nroReferencia.trim()}`,
            estado: 'CONFIRMADO'
          })
          .eq('id', pagoBorradorId)
          .select('*, alumnos(id, nombre, apellido, legajo, dni, email)')
          .single();

        if (error) throw error;
        pagoConfirmadoResult = data as PagoConDetalle;
      } else {
        const nuevoComp = await generarNumeroComprobante();
        const { data, error } = await supabase
          .from('pagos')
          .insert([{
            comprobante: nuevoComp,
            alumno_id: alumnoSeleccionado.id,
            ...datosCobro.vinculo,
            concepto: conceptoCompleto,
            modalidad,
            cantidad,
            importe: totalACobrar,
            medio_pago: medioPago,
            fecha: fechaCobro,
            observaciones: medioPago === 'Efectivo' ? null : `N° Ref: ${nroReferencia.trim()}`,
            estado: 'CONFIRMADO'
          }])
          .select('*, alumnos(id, nombre, apellido, legajo, dni, email)')
          .single();

        if (error) throw error;
        pagoConfirmadoResult = data as PagoConDetalle;
      }

      limpiarFormulario();
      await cargarDatos();
      setPagoRecienCreado(pagoConfirmadoResult);
      setVistaActual('historial');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar el cobro.');
    } finally {
      setGuardando(false);
    }
  };

  // Descarga directa a PDF con nombre dinámico y layout proporcional A4
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
    const unitarioFormateado = (Number(pago.importe) / cantVal).toLocaleString('es-AR', { minimumFractionDigits: 2 });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${nombreArchivoPDF}</title>
        <style>
          @page { 
            size: A4 portrait; 
            margin: 12mm; 
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            color: #0b1e33;
            background: #ffffff;
            margin: 0;
            padding: 0;
            font-size: 11px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .recibo-marco {
            border: 2px solid #0b1e33;
            padding: 18px 20px;
          }
          .tabla-header {
            width: 100%;
            border-collapse: collapse;
            border-bottom: 2px solid #0b1e33;
            padding-bottom: 12px;
            margin-bottom: 12px;
          }
          .tabla-header td {
            vertical-align: middle;
          }
          .logo-col {
            width: 48%;
          }
          .centro-col {
            width: 8%;
            text-align: center;
            vertical-align: middle;
            border-left: 2px solid #0b1e33;
            border-right: 2px solid #0b1e33;
            padding: 0 4px;
          }
          .letra-box {
            display: inline-block;
            background: #0b1e33;
            color: #ffffff;
            font-weight: 800;
            font-size: 20px;
            padding: 4px 10px;
            margin-bottom: 4px;
          }
          .datos-fiscales-col {
            width: 44%;
            padding-left: 18px;
            font-size: 10px;
            line-height: 1.45;
            color: #334155;
          }
          .marca-header {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .img-logo {
            width: 62px;
            height: 62px;
            object-fit: contain;
          }
          .titulo-instituto {
            font-size: 19px;
            font-weight: 800;
            color: #0b1e33;
            letter-spacing: 0.8px;
            margin: 0 0 2px 0;
            text-transform: uppercase;
          }
          .subtitulo-instituto {
            font-size: 9.5px;
            color: #2563eb;
            font-weight: 800;
            letter-spacing: 0.6px;
            text-transform: uppercase;
          }
          .barra-recibo {
            border: 1.5px solid #0b1e33;
            background-color: #f8fafc;
            font-weight: 700;
            font-size: 11.5px;
            display: flex;
            justify-content: space-between;
            padding: 7px 14px;
            margin: 12px 0;
          }
          .box-alumno {
            border: 1.5px solid #0b1e33;
            margin-bottom: 14px;
          }
          .barra-alumno-header {
            background-color: #e2e8f0;
            border-bottom: 1.5px solid #0b1e33;
            padding: 6px 12px;
            font-weight: 800;
            font-size: 10.5px;
            display: grid;
            grid-template-columns: 1.2fr 1.2fr 2fr;
            gap: 8px;
          }
          .cuerpo-alumno {
            padding: 10px 14px;
            font-size: 10.5px;
            line-height: 1.55;
            background-color: #ffffff;
          }
          .cuerpo-alumno table {
            width: 100%;
            border-collapse: collapse;
          }
          .cuerpo-alumno td {
            padding: 2px 0;
          }
          .box-conceptos {
            border: 1.5px solid #0b1e33;
            min-height: 380px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            margin-bottom: 14px;
          }
          .tabla-conceptos {
            width: 100%;
            border-collapse: collapse;
          }
          .tabla-conceptos th {
            background-color: #0b1e33;
            color: #ffffff;
            font-size: 10.5px;
            font-weight: 700;
            padding: 8px 12px;
            text-align: left;
            letter-spacing: 0.5px;
          }
          .tabla-conceptos td {
            padding: 14px 12px;
            font-size: 11.5px;
            vertical-align: top;
            border-bottom: 1px solid #e2e8f0;
          }
          .total-barra {
            background-color: #f8fafc;
            padding: 12px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 14px;
            font-weight: 800;
            border-top: 1.5px solid #0b1e33;
          }
          .leyenda-legal {
            border-top: 1px dashed #94a3b8;
            margin-top: 14px;
            padding-top: 8px;
            font-size: 9px;
            color: #64748b;
            text-align: justify;
            line-height: 1.35;
          }
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
                    <div style="font-size: 9.5px; color: #64748b; margin-top: 2px;">Gestión Académica e Integral</div>
                  </div>
                </div>
              </td>

              <td class="centro-col">
                <div class="letra-box">X</div>
                <div style="font-size:7px; font-weight:700; color:#0b1e33; line-height: 1.2;">DOC. NO VÁLIDO<br>COMO FACTURA</div>
              </td>

              <td class="datos-fiscales-col">
                <div><strong>COMPROBANTE INTERNO DE COBRO</strong></div>
                <div>Actividad: Enseñanza y Capacitación Académica</div>
                <div>Condición: Sujeto Exento / Régimen Educativo</div>
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
            <div class="cuerpo-alumno">
              <table>
                <tr>
                  <td style="width: 50%;"><strong>Institución:</strong> Instituto Ateneo Presencial</td>
                  <td style="width: 50%;"><strong>Modalidad:</strong> ${pago.modalidad || 'Regular'}</td>
                </tr>
                <tr>
                  <td><strong>Correo Institucional:</strong> ${pago.alumnos?.email || 'No registrado'}</td>
                  <td><strong>Terminal de Emisión:</strong> Mesa de Entrada</td>
                </tr>
              </table>
            </div>
          </div>

          <div class="box-conceptos">
            <table class="tabla-conceptos">
              <thead>
                <tr>
                  <th style="width: 55%;">C O N C E P T O S</th>
                  <th style="width: 15%; text-align: center;">FECHA APLIC.</th>
                  <th style="width: 12%; text-align: center;">CANTIDAD</th>
                  <th style="width: 18%; text-align: right;">IMPORTE</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong style="color: #0f172a; font-size: 12px;">${escaparTextoRecibo(pago.concepto)}</strong>
                    ${pago.observaciones ? `<div style="font-size:10px; color:#64748b; margin-top:4px;">${pago.observaciones}</div>` : ''}
                  </td>
                  <td style="text-align: center; color: #475569;">${pago.periodo_desde ? pago.periodo_desde + ' al ' + pago.periodo_hasta : pago.fecha.slice(0, 7)}</td>
                  <td style="text-align: center; color: #475569;">${cantVal}</td>
                  <td style="text-align: right; font-weight: 700; color: #0f172a;">$ ${totalFormateado}</td>
                </tr>
              </tbody>
            </table>

            <div class="total-barra">
              <span>TOTAL ACREDITADO:</span>
              <span style="font-size: 18px; color: #15803d; font-weight: 800;">$ ${totalFormateado}</span>
            </div>
          </div>

          <div class="leyenda-legal">
            Imputación formal de cobro en legajo del Alumno. Para el caso de registrarse más de un concepto asociado a una misma liquidación, dicho comprobante interno será archivado y conservado digitalmente en el sistema institucional conforme a la normativa de aranceles y cuotas del establecimiento.
          </div>
        </div>

        <script>
          window.onload = function() {
            document.title = "${nombreArchivoPDF}";
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    ventanaImpresion.document.open();
    ventanaImpresion.document.write(htmlContent);
    ventanaImpresion.document.close();
  };

  return (
    <div style={{ width: '100%', boxSizing: 'border-box' }}>
      
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
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '9px 16px',
                  backgroundColor: (!alumnoSeleccionado || guardando) ? '#94a3b8' : '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: (!alumnoSeleccionado || guardando) ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
                <span>Suspender</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (pagoBorradorId) {
                    handleMarcarCancelado(pagoBorradorId);
                  }
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
            <h1 style={{ margin: 0, color: '#0f172a', fontSize: '25px', fontWeight: 700, letterSpacing: '-0.025em' }}>
              Terminal de Facturación y Cobro
            </h1>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '15px' }}>
              Mesa de Entrada · Registro formal de ingresos académicos.
            </p>
          </div>

          {errorMsg && (
            <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '8px', marginBottom: '20px', fontSize: '15px', fontWeight: 600 }}>
              {errorMsg}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: '24px', alignItems: 'start' }}>
            
            {/* PANEL IZQUIERDO */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              
              <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                1. Selección del Estudiante
              </h2>

              <div style={{ position: 'relative', marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Buscar por Apellido, Nombre, Legajo o DNI *
                </label>
                <input
                  type="text"
                  placeholder="Escribe para buscar alumno..."
                  value={textoBusquedaAlumno}
                  onFocus={() => setMostrarDropdownAlumnos(true)}
                  onChange={(e) => {
                    setTextoBusquedaAlumno(e.target.value);
                    setAlumnoSeleccionado(null);
                    setActividadInscripcionId(''); setSesionId('');
                    setMostrarDropdownAlumnos(true);
                  }}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '15px', boxSizing: 'border-box', outline: 'none' }}
                />

                {mostrarDropdownAlumnos && alumnosSugeridos.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                    zIndex: 20,
                    maxHeight: '220px',
                    overflowY: 'auto',
                    marginTop: '4px'
                  }}>
                    {alumnosSugeridos.map(al => (
                      <div
                        key={al.id}
                        onClick={() => handleSeleccionarAlumno(al)}
                        style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                          {al.apellido}, {al.nombre}
                        </div>
                        <div style={{ fontSize: '13px', color: '#64748b' }}>
                          DNI: {al.dni} | Legajo: <strong>{al.legajo || 'Sin Legajo'}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {alumnoSeleccionado && (
                <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '14px', marginBottom: '22px' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Alumno Vinculado
                  </span>
                  <div style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: '4px 0 2px 0' }}>
                    {alumnoSeleccionado.apellido}, {alumnoSeleccionado.nombre}
                  </div>
                  <div style={{ fontSize: '14px', color: '#334155' }}>
                    DNI: {alumnoSeleccionado.dni} | Legajo: {alumnoSeleccionado.legajo || 'S/L'} | Email: {alumnoSeleccionado.email || '—'}
                  </div>
                </div>
              )}

              <h2 style={{ margin: '24px 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                2. Detalle del Cobro
              </h2>

              <div style={{ display: 'grid', gap: '12px', marginBottom: '18px' }}>
                <label style={{ fontSize: '14px', fontWeight: 700, color: '#334155' }}>
                  Actividad que abona *
                  <select value={actividadElegida?.sesiones[0].id || ''} disabled={!alumnoSeleccionado || cargandoActividades}
                    onChange={(e) => { setActividadInscripcionId(e.target.value); setSesionId(''); setPeriodoAbonado(''); setPrecioUnitario(0); }}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '6px' }}>
                    <option value="">{cargandoActividades ? 'Cargando inscripciones...' : 'Seleccioná un curso o una clase particular'}</option>
                    {actividades.map(a => <option key={a.clave} value={a.sesiones[0].id}>{a.nombre} · {a.materias.join(', ')} · {a.docente}</option>)}
                  </select>
                </label>
                {inscripcionesCobro.error && <p role="alert" style={{ color: '#b91c1c', margin: 0 }}>{inscripcionesCobro.error}</p>}
                {alumnoSeleccionado && !cargandoActividades && !actividades.length && !inscripcionesCobro.error && <p style={{ color: '#64748b', margin: 0 }}>Este alumno no tiene inscripciones confirmadas disponibles para cobrar.</p>}
                {actividadElegida && (modalidad === 'Clase' ? (
                  <label style={{ fontSize: '14px', fontWeight: 700, color: '#334155' }}>Clase que abona *
                    <select value={sesionId} onChange={e => setSesionId(e.target.value)} disabled={!actividadElegida}
                      style={{ width: '100%', padding: '10px 12px', marginTop: '6px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                      <option value="">Seleccioná una sesión</option>
                      {actividadElegida?.sesiones.map(s => <option key={s.id} value={s.id}>{s.turnos_clase?.fecha} · {s.turnos_clase?.hora_inicio.slice(0,5)} a {s.turnos_clase?.hora_fin.slice(0,5)} · {s.turnos_clase?.materias?.nombre}</option>)}
                    </select>
                  </label>
                ) : (
                  <label style={{ fontSize: '14px', fontWeight: 700, color: '#334155' }}>Mes abonado *
                    <input type="month" value={periodoAbonado}
                      onChange={e => setPeriodoAbonado(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', marginTop: '6px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                  </label>
                ))}
                {actividadElegida && (periodoAbonado || sesionId) && datosCobro.error && <p role="alert" style={{ color: '#b91c1c', margin: 0 }}>{datosCobro.error}</p>}
                {datosCobro.vinculo && <div style={{ backgroundColor: '#eff6ff', padding: '12px', borderRadius: '8px', color: '#1e3a8a', fontSize: '15px' }}>{datosCobro.vinculo.concepto}</div>}
              </div>

              {datosCobro.vinculo && <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  {modalidad === 'Mes' ? 'Precio del mes ($)' : 'Precio de la clase ($)'} *
                </label>
                <input type="number" min="0.01" step="0.01" required value={precioUnitario || ''}
                  onKeyDown={e => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                  onChange={e => setPrecioUnitario(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder={modalidad === 'Mes' ? 'Ingresá el importe del mes seleccionado' : 'Ingresá el importe de esta clase'}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '16px', boxSizing: 'border-box' }} />
              </div>}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Fecha de Operación *
                  </label>
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

            </div>

            {/* PANEL DERECHO */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '28px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                3. Forma de Cobro
              </h2>

              <form onSubmit={handleConfirmarCobro} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Medio de Pago *
                  </label>
                  <select
                    value={medioPago}
                    onChange={(e: any) => setMedioPago(e.target.value)}
                    style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '15px', backgroundColor: '#ffffff', fontWeight: 600, color: '#0f172a' }}
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia bancaria</option>
                    <option value="Tarjeta de Débito">Tarjeta de débito</option>
                    <option value="Tarjeta de Crédito">Tarjeta de crédito</option>
                  </select>
                </div>

                {medioPago === 'Efectivo' ? (
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Monto Recibido en Mano ($) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={montoRecibido || ''}
                      onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                      onChange={(e) => setMontoRecibido(Math.max(0, parseFloat(e.target.value) || 0))}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '18px', fontWeight: 700, boxSizing: 'border-box' }}
                    />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: '#475569' }}>Vuelto a entregar:</span>
                      <span style={{ fontSize: '19px', fontWeight: 800, color: vuelto > 0 ? '#15803d' : '#64748b' }}>
                        ${vuelto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Nº de Referencia / Comprobante de Operación *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Op. #981240 / Lote 412"
                      value={nroReferencia}
                      onChange={(e) => setNroReferencia(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '15px', boxSizing: 'border-box' }}
                    />
                  </div>
                )}

                <div style={{ padding: '14px 0', borderTop: '2px dashed #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#64748b', marginBottom: '6px' }}>
                    <span>{modalidad === 'Mes' ? 'Importe del mes:' : 'Importe de la clase:'}</span>
                    <span>${totalACobrar.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                      Total Operación:
                    </span>
                    <span style={{ fontSize: '25px', fontWeight: 800, color: '#15803d' }}>
                      ${totalACobrar.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={guardando || !alumnoSeleccionado || totalACobrar <= 0 || !datosCobro.vinculo}
                  style={{
                    width: '100%',
                    padding: '13px',
                    backgroundColor: (!alumnoSeleccionado || totalACobrar <= 0) ? '#94a3b8' : '#0b1e33',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: 700,
                    cursor: (!alumnoSeleccionado || totalACobrar <= 0 || guardando) ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 6px -1px rgba(11,30,51,0.2)'
                  }}
                >
                  {guardando ? 'Generando Recibo...' : 'Confirmar Cobro y Generar Recibo'}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        /* 2. HISTORIAL DE PAGOS */
        <div>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h1 style={{ margin: 0, color: '#0f172a', fontSize: '25px', fontWeight: 800, letterSpacing: '-0.025em' }}>
                Gestión Inicial de Pagos y Cobros
              </h1>
            </div>

            <button
              onClick={() => { limpiarFormulario(); setVistaActual('terminal'); }}
              style={{ padding: '10px 18px', backgroundColor: '#0b1e33', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}
            >
              + Registrar Nuevo Cobro
            </button>
          </header>

          {mensajeExito && (
            <div style={{ padding: '12px 16px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: '7px', marginBottom: '16px', fontSize: '15px', fontWeight: 600 }}>
              {mensajeExito}
            </div>
          )}

          {/* BARRA DE FILTROS Y ESTADOS */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '18px', flexWrap: 'wrap' }}>
            <input
              type="search"
              placeholder="Buscar por comprobante, concepto, alumno o legajo..."
              value={busqueda}
              onChange={(e) => { setBusqueda(e.target.value); setPaginaActual(1); }}
              style={{ flex: 1, minWidth: '280px', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '15px', outline: 'none' }}
            />

            <select
              value={filtroEstado}
              onChange={(e) => { setFiltroEstado(e.target.value); setPaginaActual(1); }}
              style={{ padding: '0 14px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#ffffff', fontSize: '15px', color: '#0f172a', fontWeight: 600 }}
            >
              <option value="todos">Todos los Estados</option>
              <option value="CONFIRMADO">Confirmados</option>
              <option value="BORRADOR">Pendientes (Borrador)</option>
              <option value="CANCELADO">Cancelados</option>
            </select>

            <select
              value={filtroMedio}
              onChange={(e) => { setFiltroMedio(e.target.value); setPaginaActual(1); }}
              style={{ padding: '0 14px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#ffffff', fontSize: '15px', color: '#0f172a', fontWeight: 600 }}
            >
              <option value="todos">Todos los medios de pago</option>
              <option value="Efectivo">Efectivo</option>
              <option value="Transferencia">Transferencia</option>
              <option value="Tarjeta de Débito">Tarjeta de Débito</option>
              <option value="Tarjeta de Crédito">Tarjeta de Crédito</option>
            </select>
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <table style={{ width: '100%', minWidth: '950px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '15px' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '13.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                  <tr>
                    <td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>Cargando registros contables...</td>
                  </tr>
                ) : pagosPaginados.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>No se encontraron comprobantes registrados.</td>
                  </tr>
                ) : (
                  pagosPaginados.map((p) => {
                    const esBorrador = p.estado === 'BORRADOR';
                    const esCancelado = p.estado === 'CANCELADO' || p.estado === 'ANULADO';

                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: esBorrador ? '#fffbeb' : esCancelado ? '#fef2f2' : 'transparent', opacity: esCancelado ? 0.75 : 1 }}>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>{p.comprobante}</td>
                        <td style={{ padding: '12px 16px', color: '#475569' }}>{p.fecha}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <strong style={{ color: '#0f172a', display: 'block' }}>{p.alumnos?.apellido}, {p.alumnos?.nombre}</strong>
                          <span style={{ fontSize: '13px', color: '#64748b' }}>DNI: {p.alumnos?.dni || '—'} | Leg: {p.alumnos?.legajo || 'S/L'}</span>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#334155' }}>{p.concepto}</td>
                        <td style={{ padding: '12px 16px', color: '#475569' }}>{p.medio_pago}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: esBorrador ? '#b45309' : esCancelado ? '#991b1b' : '#15803d', fontSize: '16px' }}>
                          ${Number(p.importe).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '12.5px',
                            fontWeight: 700,
                            backgroundColor: esBorrador ? '#fef3c7' : esCancelado ? '#fee2e2' : '#f0fdf4',
                            color: esBorrador ? '#92400e' : esCancelado ? '#991b1b' : '#166534',
                            border: `1px solid ${esBorrador ? '#fde68a' : esCancelado ? '#fca5a5' : '#bbf7d0'}`
                          }}>
                            {esBorrador ? 'PENDIENTE (BORRADOR)' : p.estado}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                            {esBorrador ? (
                              <>
                                <button
                                  onClick={() => handleReanudarBorrador(p)}
                                  style={{ padding: '6px 10px', backgroundColor: '#2563eb', border: 'none', borderRadius: '5px', fontSize: '13px', fontWeight: 700, color: '#ffffff', cursor: 'pointer' }}
                                >
                                  Reanudar Cobro
                                </button>
                                <button
                                  onClick={() => handleMarcarCancelado(p.id)}
                                  style={{ padding: '6px 10px', backgroundColor: '#fff', border: '1px solid #fca5a5', borderRadius: '5px', fontSize: '13px', fontWeight: 700, color: '#dc2626', cursor: 'pointer' }}
                                >
                                  Cancelar
                                </button>
                              </>
                            ) : esCancelado ? (
                              <span title="Operación anulada e inmutable" style={{ fontSize: '15px', color: '#dc2626', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 8px' }}>
                                ⊘ Cancelado
                              </span>
                            ) : (
                              <button
                                onClick={() => setComprobanteSeleccionado(p)}
                                style={{ padding: '6px 12px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '5px', fontSize: '13px', fontWeight: 700, color: '#0b1e33', cursor: 'pointer' }}
                              >
                                Ver Recibo Oficial
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* BARRA DE PAGINACIÓN */}
          {totalPaginas > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '14px', marginTop: '20px', paddingBottom: '20px' }}>
              <button
                onClick={() => setPaginaActual(p => Math.max(p - 1, 1))}
                disabled={paginaActual === 1}
                style={{ padding: '7px 14px', borderRadius: '6px', border: '1.5px solid #cbd5e1', backgroundColor: paginaActual === 1 ? '#f1f5f9' : '#ffffff', color: '#0f172a', fontSize: '14px', fontWeight: 700, cursor: paginaActual === 1 ? 'not-allowed' : 'pointer' }}
              >
                Anterior
              </button>
              <span style={{ fontSize: '15px', fontWeight: 600, color: '#334155' }}>
                Página {paginaActual} de {totalPaginas}
              </span>
              <button
                onClick={() => setPaginaActual(p => Math.min(p + 1, totalPaginas))}
                disabled={paginaActual === totalPaginas}
                style={{ padding: '7px 14px', borderRadius: '6px', border: '1.5px solid #cbd5e1', backgroundColor: paginaActual === totalPaginas ? '#f1f5f9' : '#ffffff', color: '#0f172a', fontSize: '14px', fontWeight: 700, cursor: paginaActual === totalPaginas ? 'not-allowed' : 'pointer' }}
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODAL COBRO REGISTRADO CON ÉXITO */}
      {pagoRecienCreado && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 120, backgroundColor: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', width: '100%', maxWidth: '460px', maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto', padding: '36px 32px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)', border: '1px solid #e2e8f0' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', border: '2px solid #bbf7d0' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            
            <h2 style={{ fontSize: '21px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
              ¡Cobro Registrado con Éxito!
            </h2>
            <p style={{ fontSize: '15px', color: '#64748b', margin: '0 0 20px 0' }}>
              Comprobante <strong>{pagoRecienCreado.comprobante}</strong> generado en el sistema.
            </p>

            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', marginBottom: '24px', textAlign: 'left', fontSize: '14.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>DNI:</span>
                <strong>{pagoRecienCreado.alumnos?.dni || '—'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Legajo:</span>
                <strong>{pagoRecienCreado.alumnos?.legajo || 'Sin Legajo'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Alumno:</span>
                <strong>{pagoRecienCreado.alumnos?.apellido}, {pagoRecienCreado.alumnos?.nombre}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '8px', marginTop: '4px' }}>
                <span style={{ color: '#0f172a', fontWeight: 700 }}>Total Abonado:</span>
                <strong style={{ color: '#15803d', fontSize: '16px' }}>${Number(pagoRecienCreado.importe).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => handleDescargarPDF(pagoRecienCreado)}
                style={{ width: '100%', padding: '12px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(37,99,235,0.2)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Descargar PDF</span>
              </button>

              <button
                onClick={() => setPagoRecienCreado(null)}
                style={{ width: '100%', padding: '11px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}
              >
                Volver al Menú Principal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALLE DE RECIBO OFICIAL (DESDE EL HISTORIAL) */}
      {comprobanteSeleccionado && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 110, backgroundColor: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', width: '100%', maxWidth: '620px', maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto', padding: '36px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)', border: '2px solid #0b1e33' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0b1e33', paddingBottom: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img 
                  src="/logo.png" 
                  alt="Ateneo" 
                  style={{ width: '52px', height: '52px', objectFit: 'contain' }} 
                  onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} 
                />
                <div>
                  <div style={{ fontSize: '19px', fontWeight: 800, color: '#0b1e33', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    INSTITUTO ATENEO
                  </div>
                  <div style={{ fontSize: '13px', color: '#2563eb', fontWeight: 700 }}>CONOCIMIENTO SIN LÍMITES</div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>RECIBO OFICIAL DE COBRO</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>{comprobanteSeleccionado.comprobante}</div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>Fecha: {comprobanteSeleccionado.fecha}</div>
              </div>
            </div>

            <div style={{ backgroundColor: '#f8fafc', border: '1.5px solid #0b1e33', borderRadius: '8px', padding: '14px 18px', marginBottom: '18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px', fontSize: '14.5px' }}>
                <div><span style={{ color: '#64748b' }}>Comprobante:</span> <strong>{comprobanteSeleccionado.comprobante}</strong></div>
                <div><span style={{ color: '#64748b' }}>Fecha:</span> <strong>{comprobanteSeleccionado.fecha}</strong></div>
                <div><span style={{ color: '#64748b' }}>DNI:</span> <strong>{comprobanteSeleccionado.alumnos?.dni || '—'}</strong></div>
                <div><span style={{ color: '#64748b' }}>Legajo:</span> <strong>{comprobanteSeleccionado.alumnos?.legajo || 'Sin Legajo'}</strong></div>
                <div><span style={{ color: '#64748b' }}>Alumno:</span> <strong>{comprobanteSeleccionado.alumnos?.apellido}, {comprobanteSeleccionado.alumnos?.nombre}</strong></div>
                <div><span style={{ color: '#64748b' }}>Medio de Pago:</span> <strong>{comprobanteSeleccionado.medio_pago}</strong></div>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: '20px', border: '1.5px solid #0b1e33' }}>
              <thead>
                <tr style={{ backgroundColor: '#0b1e33', color: '#ffffff', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' }}>
                  <th style={{ padding: '8px 12px' }}>CONCEPTO / DESCRIPCIÓN</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>CANTIDAD</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>PRECIO UNITARIO</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>SUBTOTAL</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e2e8f0', fontSize: '14.5px' }}>
                  <td style={{ padding: '12px' }}>
                    <strong>{comprobanteSeleccionado.concepto}</strong>
                    {comprobanteSeleccionado.observaciones && <div style={{ fontSize: '13px', color: '#64748b' }}>{comprobanteSeleccionado.observaciones}</div>}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>{comprobanteSeleccionado.cantidad || 1}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    ${(Number(comprobanteSeleccionado.importe) / (comprobanteSeleccionado.cantidad || 1)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700 }}>
                    ${Number(comprobanteSeleccionado.importe).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', backgroundColor: '#f8fafc', padding: '14px 18px', borderRadius: '8px', border: '1.5px solid #0b1e33' }}>
              <span style={{ fontSize: '16px', fontWeight: 800, color: '#0b1e33', textTransform: 'uppercase' }}>TOTAL COBRADO:</span>
              <span style={{ fontSize: '23px', fontWeight: 800, color: '#15803d' }}>
                ${Number(comprobanteSeleccionado.importe).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
              <span style={{ fontSize: '13px', color: '#94a3b8' }}>Operación procesada en Mesa de Entrada</span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => handleDescargarPDF(comprobanteSeleccionado)}
                  style={{ padding: '9px 16px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Descargar PDF
                </button>
                <button
                  onClick={() => setComprobanteSeleccionado(null)}
                  style={{ padding: '9px 16px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}