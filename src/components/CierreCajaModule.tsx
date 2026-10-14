'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { calcularDiferencia, calcularTotalesCierre, MEDIOS_PAGO_CIERRE } from '../domain/cierreCaja';
import {
  cerrarCaja,
  listarCobrosPendientesCierre,
  listarHistorialCierres,
  obtenerCierreCaja,
  registrarCorreccionCaja,
  type CierreCaja,
  type PagoPendienteCierre
} from '../services/cierreCaja';

const hoyLocal = () => {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
};

const dinero = (importe: number) => `$${Number(importe || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

function escaparHtml(valor: string): string {
  return valor.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export default function CierreCajaModule({ onVolver }: { onVolver: () => void }) {
  const { user } = useAuth();
  const [pestana, setPestana] = useState<'cierre' | 'historial'>('cierre');
  const [fecha, setFecha] = useState(hoyLocal);
  const [pagos, setPagos] = useState<PagoPendienteCierre[]>([]);
  const [cargandoPagos, setCargandoPagos] = useState(true);
  const [efectivoContado, setEfectivoContado] = useState('');
  const [observacion, setObservacion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [cierres, setCierres] = useState<CierreCaja[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [responsableFiltro, setResponsableFiltro] = useState('');
  const [comprobante, setComprobante] = useState<CierreCaja | null>(null);
  const [correccionPagoId, setCorreccionPagoId] = useState('');
  const [correccionMedio, setCorreccionMedio] = useState<(typeof MEDIOS_PAGO_CIERRE)[number]>('Efectivo');
  const [correccionImporte, setCorreccionImporte] = useState('');
  const [correccionMotivo, setCorreccionMotivo] = useState('');

  const totales = calcularTotalesCierre(pagos);
  const diferencia = calcularDiferencia(Number(efectivoContado || 0), totales.efectivoEsperado);
  const responsables = Array.from(new Map(cierres.map(cierre => [cierre.responsable_id, cierre.responsable_nombre])).entries());
  const historialVisible = cierres.filter(cierre => !responsableFiltro || cierre.responsable_id === responsableFiltro);

  useEffect(() => {
    if (!user?.id) return;
    let vigente = true;
    listarCobrosPendientesCierre(fecha, user.id).then(filas => {
      if (vigente) {
        setPagos(filas);
        setEfectivoContado(String(calcularTotalesCierre(filas).efectivoEsperado));
        setObservacion('');
      }
    }).catch((err: unknown) => {
      if (vigente) setError(err instanceof Error ? err.message : 'No se pudieron cargar los cobros pendientes.');
    }).finally(() => {
      if (vigente) setCargandoPagos(false);
    });
    return () => { vigente = false; };
  }, [fecha, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    let vigente = true;
    listarHistorialCierres({ fechaDesde, fechaHasta }).then(filas => {
      if (vigente) setCierres(filas);
    }).catch((err: unknown) => {
      if (vigente) setError(err instanceof Error ? err.message : 'No se pudo cargar el historial.');
    }).finally(() => {
      if (vigente) setCargandoHistorial(false);
    });
    return () => { vigente = false; };
  }, [fechaDesde, fechaHasta, user?.id]);

  const handleCerrarCaja = async () => {
    setError('');
    setMensaje('');
    if (!pagos.length) return;
    if (!efectivoContado.trim() || !Number.isFinite(Number(efectivoContado)) || Number(efectivoContado) < 0) {
      setError('Ingresá un importe válido para el efectivo contado.');
      return;
    }
    if (diferencia !== 0 && !observacion.trim()) {
      setError('La observación es obligatoria cuando existe una diferencia de efectivo.');
      return;
    }

    try {
      setGuardando(true);
      const cierreId = await cerrarCaja(fecha, pagos, Number(efectivoContado), observacion);
      const nuevoCierre = await obtenerCierreCaja(cierreId);
      setComprobante(nuevoCierre);
      setMensaje(`Caja cerrada. Comprobante ${nuevoCierre.numero_comprobante}.`);
      setPestana('historial');
      const filas = await listarHistorialCierres({ fechaDesde, fechaHasta });
      setCierres(filas);
      setPagos([]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo cerrar la caja.');
    } finally {
      setGuardando(false);
    }
  };

  const handleImprimir = (cierre: CierreCaja) => {
    const ventana = window.open('', '_blank');
    if (!ventana) {
      setError('Habilitá las ventanas emergentes para imprimir el comprobante.');
      return;
    }

    const filasDetalle = cierre.detalles.map(detalle => `
      <tr>
        <td>${escaparHtml(detalle.pago_comprobante)}</td>
        <td>${escaparHtml(detalle.pago_fecha)}</td>
        <td>${escaparHtml(detalle.alumno_nombre)}${detalle.alumno_legajo ? ` · ${escaparHtml(detalle.alumno_legajo)}` : ''}</td>
        <td>${escaparHtml(detalle.concepto)}</td>
        <td>${escaparHtml(detalle.medio_pago)}</td>
        <td class="importe">${dinero(detalle.importe)}</td>
      </tr>`).join('');
    const filasTotales = MEDIOS_PAGO_CIERRE.map(medio => `
      <tr><td>${escaparHtml(medio)}</td><td class="importe">${dinero(cierre.totales_por_medio[medio])}</td></tr>`).join('');

    ventana.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escaparHtml(cierre.numero_comprobante)}</title>
      <style>
        @page { size: A4 portrait; margin: 15mm; }
        * { box-sizing: border-box; }
        body { color: #172b35; font: 12px Arial, sans-serif; margin: 0; }
        h1 { font-size: 22px; margin: 0 0 5px; }
        p { margin: 4px 0; }
        header { border-bottom: 3px solid #147d70; padding-bottom: 14px; }
        .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 7px 20px; margin: 16px 0; }
        table { border-collapse: collapse; width: 100%; }
        th { background: #e9f3f0; text-align: left; }
        th, td { border-bottom: 1px solid #d8e1df; padding: 7px 6px; vertical-align: top; }
        .importe { text-align: right; white-space: nowrap; }
        .resumen { margin: 20px 0 0 auto; max-width: 330px; }
        .total { border-top: 2px solid #147d70; font-size: 14px; font-weight: bold; }
        .diferencia { margin-top: 10px; padding: 10px; background: #f2f6f5; }
        @media print { button { display: none; } }
      </style></head><body>
      <header><h1>Instituto Ateneo · Cierre de caja</h1><p>Comprobante ${escaparHtml(cierre.numero_comprobante)}</p></header>
      <section class="meta">
        <div><strong>Fecha de caja:</strong> ${escaparHtml(cierre.fecha)}</div>
        <div><strong>Emitido:</strong> ${new Date(cierre.emitido_en).toLocaleString('es-AR')}</div>
        <div><strong>Responsable:</strong> ${escaparHtml(cierre.responsable_nombre)}</div>
        <div><strong>Cobros incluidos:</strong> ${cierre.detalles.length}</div>
      </section>
      <table><thead><tr><th>Recibo</th><th>Fecha</th><th>Alumno</th><th>Concepto</th><th>Medio</th><th class="importe">Importe</th></tr></thead>
      <tbody>${filasDetalle}</tbody></table>
      <table class="resumen"><thead><tr><th>Totales por medio</th><th class="importe">Importe</th></tr></thead><tbody>${filasTotales}
      <tr class="total"><td>Total general</td><td class="importe">${dinero(cierre.total_general)}</td></tr></tbody></table>
      <div class="diferencia"><p><strong>Efectivo esperado:</strong> ${dinero(cierre.efectivo_esperado)}</p>
      <p><strong>Efectivo contado:</strong> ${dinero(cierre.efectivo_contado)}</p>
      <p><strong>Diferencia:</strong> ${dinero(cierre.diferencia)}</p>
      ${cierre.observacion ? `<p><strong>Observación:</strong> ${escaparHtml(cierre.observacion)}</p>` : ''}</div>
      <script>window.onload = () => window.print();</script></body></html>`);
    ventana.document.close();
  };

  const handleRegistrarCorreccion = async () => {
    if (!comprobante) return;
    setError('');
    if (!Number.isFinite(Number(correccionImporte)) || Number(correccionImporte) === 0 || !correccionMotivo.trim()) {
      setError('Ingresá un importe distinto de cero y el motivo de la corrección.');
      return;
    }

    try {
      setGuardando(true);
      await registrarCorreccionCaja(comprobante.id, correccionPagoId || null, correccionMedio, Number(correccionImporte), correccionMotivo);
      setComprobante(await obtenerCierreCaja(comprobante.id));
      setCorreccionImporte('');
      setCorreccionMotivo('');
      setCorreccionPagoId('');
      setMensaje('Movimiento correctivo registrado. El cierre original permanece sin cambios.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el movimiento correctivo.');
    } finally {
      setGuardando(false);
    }
  };

  const botonPestana = (id: 'cierre' | 'historial', texto: string) => (
    <button type="button" onClick={() => { setPestana(id); setError(''); }} aria-pressed={pestana === id}
      style={{ padding: '9px 13px', border: '1px solid #b8cbc7', borderBottom: pestana === id ? '3px solid #147d70' : '1px solid #b8cbc7', background: pestana === id ? '#e9f3f0' : '#fff', color: '#173d3a', fontWeight: 700, cursor: 'pointer' }}>
      {texto}
    </button>
  );

  return (
    <main style={{ width: '100%', color: '#1d3338' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
        <div>
          <button type="button" onClick={onVolver} style={{ padding: 0, marginBottom: 8, background: 'none', border: 0, color: '#147d70', fontWeight: 700, cursor: 'pointer' }}>← Volver a pagos</button>
          <h1 style={{ margin: 0, fontSize: 25, color: '#183238' }}>Cierre de caja</h1>
          <p style={{ margin: '3px 0 0', color: '#63777a' }}>Conciliación de cobros y comprobantes inmutables</p>
        </div>
        <div style={{ display: 'flex', gap: 0 }}>
          {botonPestana('cierre', 'Cerrar caja')}
          {botonPestana('historial', 'Historial de cierres')}
        </div>
      </header>

      {mensaje && <div role="status" style={{ marginBottom: 14, padding: '11px 14px', background: '#eaf6ed', border: '1px solid #b6dfbf', color: '#246238' }}>{mensaje}</div>}
      {error && <div role="alert" style={{ marginBottom: 14, padding: '11px 14px', background: '#fff1ef', border: '1px solid #efb8af', color: '#8f3028' }}>{error}</div>}

      {pestana === 'cierre' ? (
        <section>
          <div style={{ display: 'flex', alignItems: 'end', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
            <label style={{ display: 'grid', gap: 5, fontWeight: 700, color: '#40585b' }}>
              Fecha de caja
              <input type="date" value={fecha} onChange={e => { setCargandoPagos(true); setPagos([]); setEfectivoContado(''); setError(''); setFecha(e.target.value); }} style={{ padding: '9px 11px', border: '1px solid #b8cbc7', background: '#fff' }} />
            </label>
            <span style={{ paddingBottom: 9, color: '#63777a' }}>Responsable: <strong>{user?.user_metadata?.nombre || user?.email || 'Usuario'}</strong></span>
          </div>

          {cargandoPagos ? <p style={{ padding: 24, color: '#63777a' }}>Cargando cobros pendientes...</p> : pagos.length === 0 ? (
            <div role="status" style={{ padding: 24, border: '1px solid #bfd3cf', background: '#f3f8f6', color: '#355d58' }}>
              No hay cobros pendientes de cierre para esta fecha y responsable.
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto', border: '1px solid #cbd8d6', background: '#fff' }}>
                <table style={{ width: '100%', minWidth: 780, borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ background: '#e9f3f0', color: '#31504f' }}><tr>
                    {['Comprobante', 'Alumno', 'Concepto', 'Medio de pago', 'Importe'].map((titulo, indice) => <th key={titulo} style={{ padding: '11px 12px', textAlign: indice === 4 ? 'right' : 'left' }}>{titulo}</th>)}
                  </tr></thead>
                  <tbody>{pagos.map(pago => <tr key={pago.id} style={{ borderTop: '1px solid #e3eae8' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700 }}>{pago.comprobante}</td>
                    <td style={{ padding: '10px 12px' }}>{pago.alumnos ? `${pago.alumnos.apellido}, ${pago.alumnos.nombre}` : 'Alumno sin datos'}</td>
                    <td style={{ padding: '10px 12px' }}>{pago.concepto}</td>
                    <td style={{ padding: '10px 12px' }}>{pago.medio_pago}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{dinero(pago.importe)}</td>
                  </tr>)}</tbody>
                </table>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, margin: '18px 0' }}>
                <div style={{ padding: 16, borderLeft: '4px solid #147d70', background: '#edf5f2' }}>
                  <strong style={{ display: 'block', marginBottom: 8 }}>Totales por medio</strong>
                  {MEDIOS_PAGO_CIERRE.map(medio => <div key={medio} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, color: '#49605f', padding: '3px 0' }}><span>{medio}</span><span>{dinero(totales.porMedio[medio])}</span></div>)}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #c6d8d3', marginTop: 7, paddingTop: 8, fontWeight: 800 }}><span>Total general</span><span>{dinero(totales.totalGeneral)}</span></div>
                </div>
                <div style={{ padding: 16, borderLeft: '4px solid #b77a28', background: '#fbf5e9' }}>
                  <label style={{ display: 'grid', gap: 7, fontWeight: 700 }}>
                    Efectivo contado
                    <input type="number" min="0" step="0.01" value={efectivoContado} onChange={e => setEfectivoContado(e.target.value)} style={{ width: '100%', padding: '10px 11px', border: '1px solid #d7c69e', background: '#fff', fontSize: 18, fontWeight: 700 }} />
                  </label>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 13, fontWeight: 700 }}><span>Efectivo esperado</span><span>{dinero(totales.efectivoEsperado)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, color: diferencia === 0 ? '#246238' : '#9b3d2d', fontWeight: 800 }}><span>Diferencia</span><span>{dinero(diferencia)}</span></div>
                  {diferencia !== 0 && <label style={{ display: 'grid', gap: 6, marginTop: 13, fontWeight: 700, color: '#68482b' }}>
                    Observación obligatoria
                    <textarea value={observacion} onChange={e => setObservacion(e.target.value)} rows={3} maxLength={1000} placeholder="Motivo de la diferencia" style={{ padding: 9, border: '1px solid #d7c69e', resize: 'vertical' }} />
                  </label>}
                </div>
              </div>
              <button type="button" onClick={handleCerrarCaja} disabled={guardando || !pagos.length || (diferencia !== 0 && !observacion.trim())}
                style={{ padding: '11px 18px', border: 0, background: guardando || !pagos.length || (diferencia !== 0 && !observacion.trim()) ? '#9aaead' : '#147d70', color: '#fff', fontWeight: 800, cursor: guardando ? 'wait' : 'pointer' }}>
                {guardando ? 'Cerrando caja...' : 'Cerrar caja y generar comprobante'}
              </button>
            </>
          )}
        </section>
      ) : (
        <section>
          <div style={{ display: 'flex', alignItems: 'end', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <label style={{ display: 'grid', gap: 5, color: '#40585b', fontWeight: 700 }}>Desde<input type="date" value={fechaDesde} onChange={e => { setCargandoHistorial(true); setFechaDesde(e.target.value); }} style={{ padding: '8px 10px', border: '1px solid #b8cbc7' }} /></label>
            <label style={{ display: 'grid', gap: 5, color: '#40585b', fontWeight: 700 }}>Hasta<input type="date" value={fechaHasta} onChange={e => { setCargandoHistorial(true); setFechaHasta(e.target.value); }} style={{ padding: '8px 10px', border: '1px solid #b8cbc7' }} /></label>
            <label style={{ display: 'grid', gap: 5, color: '#40585b', fontWeight: 700 }}>Responsable
              <select value={responsableFiltro} onChange={e => setResponsableFiltro(e.target.value)} style={{ minWidth: 190, padding: '9px 10px', border: '1px solid #b8cbc7', background: '#fff' }}>
                <option value="">Todos</option>
                {responsables.map(([id, nombre]) => <option value={id} key={id}>{nombre}</option>)}
              </select>
            </label>
          </div>
          <div style={{ overflowX: 'auto', border: '1px solid #cbd8d6', background: '#fff' }}>
            <table style={{ width: '100%', minWidth: 800, borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ background: '#e9f3f0', color: '#31504f' }}><tr>
                {['Comprobante', 'Fecha', 'Emitido', 'Responsable', 'Cobros', 'Total', 'Diferencia', ''].map((titulo, indice) => <th key={`${titulo}-${indice}`} style={{ padding: '11px 10px', textAlign: indice > 4 && indice < 7 ? 'right' : 'left' }}>{titulo}</th>)}
              </tr></thead>
              <tbody>
                {cargandoHistorial ? <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#63777a' }}>Cargando cierres...</td></tr>
                  : historialVisible.length === 0 ? <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#63777a' }}>No hay cierres para los filtros seleccionados.</td></tr>
                    : historialVisible.map(cierre => <tr key={cierre.id} style={{ borderTop: '1px solid #e3eae8' }}>
                      <td style={{ padding: '10px', fontWeight: 800 }}>{cierre.numero_comprobante}</td>
                      <td style={{ padding: '10px' }}>{cierre.fecha}</td>
                      <td style={{ padding: '10px' }}>{new Date(cierre.emitido_en).toLocaleString('es-AR')}</td>
                      <td style={{ padding: '10px' }}>{cierre.responsable_nombre}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>{cierre.detalles?.length ?? 0}</td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700 }}>{dinero(cierre.total_general)}</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: Number(cierre.diferencia) === 0 ? '#246238' : '#9b3d2d', fontWeight: 700 }}>{dinero(cierre.diferencia)}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}><button type="button" onClick={() => { setComprobante(cierre); setError(''); }} style={{ padding: '7px 10px', border: '1px solid #9cbab4', background: '#f5faf8', color: '#17675e', fontWeight: 700, cursor: 'pointer' }}>Ver comprobante</button></td>
                    </tr>)}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {comprobante && <div role="dialog" aria-modal="true" aria-labelledby="titulo-comprobante" style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'grid', placeItems: 'center', padding: 18, background: 'rgba(20, 39, 42, .62)' }}>
        <section style={{ width: 'min(900px, 100%)', maxHeight: '90vh', overflow: 'auto', padding: 22, background: '#fff', borderTop: '5px solid #147d70', color: '#1d3338' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'start' }}>
            <div><h2 id="titulo-comprobante" style={{ margin: 0 }}>Cierre de caja · {comprobante.numero_comprobante}</h2><p style={{ margin: '5px 0', color: '#63777a' }}>{comprobante.fecha} · {comprobante.responsable_nombre} · {new Date(comprobante.emitido_en).toLocaleString('es-AR')}</p></div>
            <button type="button" onClick={() => setComprobante(null)} aria-label="Cerrar comprobante" style={{ border: 0, background: 'transparent', color: '#526669', fontSize: 22, cursor: 'pointer' }}>×</button>
          </div>
          {error && <p role="alert" style={{ padding: 9, background: '#fff1ef', color: '#8f3028' }}>{error}</p>}
          <div style={{ overflowX: 'auto', marginTop: 14 }}><table style={{ width: '100%', minWidth: 680, borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: '#e9f3f0' }}><tr>{['Recibo', 'Alumno', 'Concepto', 'Medio', 'Importe'].map(titulo => <th key={titulo} style={{ padding: 8 }}>{titulo}</th>)}</tr></thead>
            <tbody>{comprobante.detalles.map(detalle => <tr key={detalle.id} style={{ borderTop: '1px solid #e3eae8' }}><td style={{ padding: 8 }}>{detalle.pago_comprobante}</td><td style={{ padding: 8 }}>{detalle.alumno_nombre}</td><td style={{ padding: 8 }}>{detalle.concepto}</td><td style={{ padding: 8 }}>{detalle.medio_pago}</td><td style={{ padding: 8, textAlign: 'right' }}>{dinero(detalle.importe)}</td></tr>)}</tbody>
          </table></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 8, marginTop: 14 }}>
            {MEDIOS_PAGO_CIERRE.map(medio => <div key={medio} style={{ padding: 10, background: '#f3f8f6' }}>{medio}<strong style={{ display: 'block' }}>{dinero(comprobante.totales_por_medio[medio])}</strong></div>)}
          </div>
          <p style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #147d70', paddingTop: 10, fontSize: 17, fontWeight: 800 }}><span>Total general</span><span>{dinero(comprobante.total_general)}</span></p>
          <p>Efectivo esperado: <strong>{dinero(comprobante.efectivo_esperado)}</strong> · Contado: <strong>{dinero(comprobante.efectivo_contado)}</strong> · Diferencia: <strong>{dinero(comprobante.diferencia)}</strong></p>
          {comprobante.observacion && <p><strong>Observación:</strong> {comprobante.observacion}</p>}
          <section style={{ marginTop: 18, borderTop: '1px solid #d9e4e1', paddingTop: 14 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>Movimientos correctivos</h3>
            <p style={{ margin: '0 0 10px', color: '#63777a', fontSize: 13 }}>Se registran como movimientos nuevos; no alteran este comprobante.</p>
            {comprobante.correcciones?.length ? <div style={{ display: 'grid', gap: 7, marginBottom: 12 }}>
              {comprobante.correcciones.map(correccion => {
                const pagoVinculado = comprobante.detalles.find(detalle => detalle.pago_id === correccion.pago_id);
                return <div key={correccion.id} style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, padding: 9, background: '#f5f8f7', borderLeft: '3px solid #b77a28' }}>
                  <span>{pagoVinculado ? `${pagoVinculado.pago_comprobante} · ` : ''}{correccion.medio_pago} · {correccion.motivo}<small style={{ display: 'block', color: '#63777a' }}>{correccion.responsable_nombre} · {new Date(correccion.creado_en).toLocaleString('es-AR')}</small></span>
                  <strong>{dinero(correccion.importe)}</strong>
                </div>;
              })}
            </div> : <p style={{ margin: '0 0 12px', color: '#63777a' }}>Sin movimientos correctivos.</p>}
            <details>
              <summary style={{ color: '#17675e', fontWeight: 700, cursor: 'pointer' }}>Registrar movimiento correctivo</summary>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, padding: '12px 0' }}>
                <label style={{ display: 'grid', gap: 5 }}>Cobro relacionado
                  <select value={correccionPagoId} onChange={e => setCorreccionPagoId(e.target.value)} style={{ padding: 9, border: '1px solid #b8cbc7', background: '#fff' }}>
                    <option value="">Ajuste general del cierre</option>
                    {comprobante.detalles.map(detalle => <option key={detalle.pago_id} value={detalle.pago_id}>{detalle.pago_comprobante} · {detalle.alumno_nombre}</option>)}
                  </select>
                </label>
                <label style={{ display: 'grid', gap: 5 }}>Medio de pago
                  <select value={correccionMedio} onChange={e => setCorreccionMedio(e.target.value as typeof correccionMedio)} style={{ padding: 9, border: '1px solid #b8cbc7', background: '#fff' }}>
                    {MEDIOS_PAGO_CIERRE.map(medio => <option key={medio} value={medio}>{medio}</option>)}
                  </select>
                </label>
                <label style={{ display: 'grid', gap: 5 }}>Importe del movimiento (+/-)
                  <input type="number" step="0.01" value={correccionImporte} onChange={e => setCorreccionImporte(e.target.value)} style={{ padding: 9, border: '1px solid #b8cbc7' }} />
                </label>
                <label style={{ display: 'grid', gap: 5, gridColumn: '1 / -1' }}>Motivo obligatorio
                  <textarea value={correccionMotivo} onChange={e => setCorreccionMotivo(e.target.value)} rows={2} maxLength={1000} style={{ padding: 9, border: '1px solid #b8cbc7', resize: 'vertical' }} />
                </label>
              </div>
              <button type="button" disabled={guardando || !Number(correccionImporte) || !correccionMotivo.trim()} onClick={handleRegistrarCorreccion} style={{ padding: '8px 12px', border: 0, background: '#17675e', color: '#fff', fontWeight: 700, cursor: guardando ? 'wait' : 'pointer' }}>{guardando ? 'Registrando...' : 'Guardar nuevo movimiento'}</button>
            </details>
          </section>
          <div style={{ display: 'flex', justifyContent: 'end', gap: 9, marginTop: 18 }}>
            <button type="button" onClick={() => handleImprimir(comprobante)} style={{ padding: '9px 14px', border: 0, background: '#147d70', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Imprimir / Guardar PDF</button>
            <button type="button" onClick={() => setComprobante(null)} style={{ padding: '9px 14px', border: '1px solid #b8cbc7', background: '#fff', color: '#40585b', fontWeight: 700, cursor: 'pointer' }}>Cerrar</button>
          </div>
        </section>
      </div>}
    </main>
  );
}