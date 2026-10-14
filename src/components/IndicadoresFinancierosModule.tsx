'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { calcularIndicadoresFinancieros } from '../domain/indicadoresFinancieros';
import type { FilaFinanciera, FiltrosFinancieros, ResumenFinanciero } from '../domain/indicadoresFinancieros';
import { cargarDatosFinancieros } from '../services/indicadoresFinancieros';

const pesos = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

function hoyArgentina() {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date());
  const valores = Object.fromEntries(partes.map(({ type, value }) => [type, value]));
  return `${valores.year}-${valores.month}-${valores.day}`;
}

function variacionTexto(valor: number | null) {
  if (valor === null) return 'Sin base comparable';
  return `${valor > 0 ? '+' : ''}${valor}% respecto del período anterior`;
}

function escaparHtml(valor: unknown) {
  return String(valor ?? '').replace(/[&<>"']/g, (caracter) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[caracter]!);
}

function filasTabla(encabezados: string[], filas: Array<Array<string | number>>) {
  return `<table><thead><tr>${encabezados.map((x) => `<th>${escaparHtml(x)}</th>`).join('')}</tr></thead><tbody>${filas.map((fila) => `<tr>${fila.map((x) => `<td>${escaparHtml(x)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

function graficoBarrasInforme(datos: Array<{ nombre: string; importe: number }>, color: string) {
  const maximo = Math.max(...datos.map((item) => item.importe), 1);
  return `<div class="barras">${datos.map((item) => `<div class="barra-fila"><div class="barra-etiqueta"><span>${escaparHtml(item.nombre)}</span><strong>${escaparHtml(pesos.format(item.importe))}</strong></div><div class="pista"><div class="barra" style="width:${item.importe / maximo * 100}%;background:${color}"></div></div></div>`).join('')}</div>`;
}

function abrirInformePdf(resumen: ResumenFinanciero, filtros: FiltrosFinancieros) {
  const ventana = window.open('', '_blank', 'width=1000,height=800');
  if (!ventana) return;
  const anio = Number(filtros.hasta.slice(0, 4));
  const maximoMensual = Math.max(...resumen.serieMensual.flatMap((item) => [item.actual, item.anterior]), 1);
  const graficoMensual = `<div class="mensual">${resumen.serieMensual.map((item) => `<div class="mes"><div class="columnas"><i style="height:${item.anterior / maximoMensual * 100}%;background:#94a3b8"></i><i style="height:${item.actual / maximoMensual * 100}%;background:#2563eb"></i></div><span>${item.etiqueta}</span></div>`).join('')}</div>`;
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Informe gerencial</title><style>
    @page{size:A4;margin:14mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}body{font-family:Arial,sans-serif;margin:0;color:#1e293b;font-size:11px}h1{margin:0;color:#0f766e;font-size:24px}h2{margin:0 0 10px;font-size:16px;color:#0f172a}.encabezado{display:flex;justify-content:space-between;border-bottom:3px solid #0f766e;padding-bottom:12px}.muted{color:#64748b}.aviso{margin:12px 0;padding:8px 10px;background:#fffbeb;border:1px solid #fde68a;color:#92400e;border-radius:6px}.metricas{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:14px 0}.metrica{padding:10px;border:1px solid #cbd5e1;border-radius:7px}.metrica strong{display:block;font-size:16px;color:#0f172a;margin-bottom:4px}.panel{break-inside:avoid;margin:0 0 12px;padding:12px;border:1px solid #cbd5e1;border-radius:8px}.dos{display:grid;grid-template-columns:1fr 1fr;gap:12px}table{width:100%;border-collapse:collapse;margin-top:9px}th,td{padding:6px;border-bottom:1px solid #e2e8f0;text-align:left}th{background:#e2e8f0}tbody tr:nth-child(even){background:#f8fafc}.barras{margin:8px 0}.barra-fila{margin:6px 0}.barra-etiqueta{display:flex;justify-content:space-between}.pista{height:8px;background:#e2e8f0;border-radius:8px;overflow:hidden}.barra{height:100%;border-radius:8px}.mensual{display:flex;height:135px;gap:5px;border-bottom:1px solid #94a3b8}.mes{flex:1;display:grid;grid-template-rows:1fr 18px;text-align:center}.columnas{display:flex;align-items:flex-end;justify-content:center;gap:2px}.columnas i{display:block;width:35%;min-height:1px}.conclusion{margin-top:9px;padding:8px;background:#f0f9ff;border-left:3px solid #0284c7;color:#0c4a6e}.pie{margin-top:12px;text-align:center;color:#64748b}@media print{body{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}.barra,.pista,.columnas i,th,.conclusion,.aviso{visibility:visible!important}.no-print{display:none}}
  </style></head><body>
    <header class="encabezado"><div><h1>Instituto Ateneo</h1><strong>Informe gerencial de pagos y morosidad</strong></div><div class="muted">Período<br><strong>${escaparHtml(filtros.desde)} a ${escaparHtml(filtros.hasta)}</strong></div></header>
    <div class="aviso">Fuente: pagos y obligaciones registrados en el sistema.</div>
    <section class="metricas">
      <div class="metrica"><strong>${pesos.format(resumen.totalPeriodo)}</strong>Recaudación del período</div>
      <div class="metrica"><strong>${pesos.format(resumen.totalMes)}</strong>Recaudación mensual</div>
      <div class="metrica"><strong>${pesos.format(resumen.totalSemana)}</strong>Recaudación semanal</div>
      <div class="metrica"><strong>${pesos.format(resumen.morosidad.importe)}</strong>${resumen.morosidad.alumnos} alumnos con deuda</div>
    </section>
    <section class="panel"><h2>Pagos mensuales: ${anio} vs. ${anio - 1}</h2>${graficoMensual}${filasTabla(['Mes', String(anio), String(anio - 1)], resumen.serieMensual.map((x) => [x.etiqueta, pesos.format(x.actual), pesos.format(x.anterior)]))}<div class="conclusion">${escaparHtml(resumen.conclusiones.comparacionAnual)}</div></section>
    <div class="dos">
      <section class="panel"><h2>Flujo de caja</h2>${graficoBarrasInforme(resumen.flujoPorMedio, '#2563eb')}${filasTabla(['Medio', 'Importe', '%'], resumen.flujoPorMedio.map((x) => [x.nombre, pesos.format(x.importe), x.porcentaje]))}<div class="conclusion">${escaparHtml(resumen.conclusiones.mediosPago)}</div></section>
      <section class="panel"><h2>Antigüedad de mora</h2>${graficoBarrasInforme(resumen.morosidad.tramos, '#dc2626')}${filasTabla(['Tramo', 'Alumnos', 'Saldo'], resumen.morosidad.tramos.map((x) => [x.nombre, x.alumnos, pesos.format(x.importe)]))}<div class="conclusion">${escaparHtml(resumen.conclusiones.morosidad)}</div></section>
    </div>
    <div class="dos">
      <section class="panel"><h2>Ingresos por actividad</h2>${graficoBarrasInforme(resumen.ingresosPorActividad, '#059669')}${filasTabla(['Actividad', 'Ingresos'], resumen.ingresosPorActividad.map((x) => [x.nombre, pesos.format(x.importe)]))}</section>
      <section class="panel"><h2>Ranking de deudores</h2>${filasTabla(['Alumno', 'Saldo', 'Antigüedad'], resumen.rankingDeudores.map((x) => [x.alumno, pesos.format(x.importe), `${x.diasMaximos} días`]))}<div class="conclusion">${escaparHtml(resumen.conclusiones.deudores)}</div></section>
    </div>
    <div class="pie">Generado el ${new Intl.DateTimeFormat('es-AR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date())}</div>
    <script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script>
  </body></html>`;
  ventana.document.open();
  ventana.document.write(html);
  ventana.document.close();
}

export default function IndicadoresFinancierosModule() {
  const hoy = hoyArgentina();
  const [detalle, setDetalle] = useState<'recaudacion' | 'caja' | 'morosidad' | 'actividades' | null>(null);
  const [pagos, setPagos] = useState<FilaFinanciera[]>([]);
  const [obligaciones, setObligaciones] = useState<FilaFinanciera[]>([]);
  const [actividades, setActividades] = useState<string[]>([]);
  const [medios, setMedios] = useState<string[]>([]);
  const [filtros, setFiltros] = useState<FiltrosFinancieros>({ desde: `${hoy.slice(0, 4)}-01-01`, hasta: hoy, actividad: 'todos', medioPago: 'todos' });
  const [fechasEdicion, setFechasEdicion] = useState({ desde: `${hoy.slice(0, 4)}-01-01`, hasta: hoy });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = async () => {
    setCargando(true); setError('');
    try {
      const datos = await cargarDatosFinancieros();
      setPagos(datos.pagos); setObligaciones(datos.obligaciones); setActividades(datos.actividades); setMedios(datos.mediosPago);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los indicadores financieros.');
    } finally { setCargando(false); }
  };

  useEffect(() => {
    cargarDatosFinancieros()
      .then((datos) => {
        setPagos(datos.pagos); setObligaciones(datos.obligaciones); setActividades(datos.actividades); setMedios(datos.mediosPago);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'No se pudieron cargar los indicadores financieros.'))
      .finally(() => setCargando(false));
  }, []);

  const resumen = useMemo<ResumenFinanciero | null>(() => {
    try { return calcularIndicadoresFinancieros(pagos, obligaciones, filtros); }
    catch { return null; }
  }, [pagos, obligaciones, filtros]);
  const fechasValidas = /^\d{4}-\d{2}-\d{2}$/.test(fechasEdicion.desde)
    && /^\d{4}-\d{2}-\d{2}$/.test(fechasEdicion.hasta)
    && fechasEdicion.desde <= fechasEdicion.hasta;
  const actualizarFecha = (campo: 'desde' | 'hasta', valor: string) => {
    const siguientes = { ...fechasEdicion, [campo]: valor };
    setFechasEdicion(siguientes);
    if (/^\d{4}-\d{2}-\d{2}$/.test(siguientes.desde)
      && /^\d{4}-\d{2}-\d{2}$/.test(siguientes.hasta)
      && siguientes.desde <= siguientes.hasta) {
      setFiltros((actuales) => ({ ...actuales, desde: siguientes.desde, hasta: siguientes.hasta }));
    }
  };

  if (cargando) return <div aria-busy="true" style={s.estado}>Cargando indicadores económicos...</div>;
  if (error) return <div role="alert" style={{ ...s.estado, color: '#991b1b', borderColor: '#fecaca' }}><strong>{error}</strong><button style={s.boton} onClick={() => void cargar()}>Reintentar</button></div>;
  if (!resumen) return <div role="alert" style={s.estado}>El período seleccionado no es válido.</div>;

  const anio = filtros.hasta.slice(0, 4);
  return (
    <section aria-labelledby="titulo-finanzas" style={{ marginTop: 28 }}>
      <header style={s.cabecera}>
        <div><h2 id="titulo-finanzas" style={s.titulo}>Pagos y morosidad</h2><p style={s.secundario}>Recaudación, caja y cartera vencida con conclusiones para la toma de decisiones.</p></div>
        <div style={s.acciones}>
          <button type="button" disabled={!fechasValidas} style={{ ...s.botonSecundario, opacity: fechasValidas ? 1 : 0.55 }} onClick={() => abrirInformePdf(resumen, filtros)}>Descargar informe PDF</button>
          <button type="button" style={s.boton} onClick={() => void cargar()}>Actualizar</button>
        </div>
      </header>

      <div style={s.filtros}>
        <Campo label="Desde"><input type="date" value={fechasEdicion.desde} max={fechasEdicion.hasta || undefined} onChange={(e) => actualizarFecha('desde', e.target.value)} style={s.control} /></Campo>
        <Campo label="Hasta"><input type="date" value={fechasEdicion.hasta} min={fechasEdicion.desde || undefined} onChange={(e) => actualizarFecha('hasta', e.target.value)} style={s.control} /></Campo>
        <Campo label="Curso o materia"><select value={filtros.actividad} onChange={(e) => setFiltros({ ...filtros, actividad: e.target.value })} style={s.control}><option value="todos">Todas las actividades</option>{actividades.map((a) => <option key={a}>{a}</option>)}</select></Campo>
        <Campo label="Medio de pago"><select value={filtros.medioPago} onChange={(e) => setFiltros({ ...filtros, medioPago: e.target.value })} style={s.control}><option value="todos">Todos los medios</option>{medios.map((m) => <option key={m}>{m}</option>)}</select></Campo>
      </div>
      {!fechasValidas && <p role="alert" style={s.errorFecha}>Completá ambas fechas y verificá que “Desde” no sea posterior a “Hasta”.</p>}

      <div style={s.tarjetas}>
        <Metrica titulo="Recaudación" valor={pesos.format(resumen.totalPeriodo)} detalle={variacionTexto(resumen.variacionPeriodo)} conclusion={resumen.conclusiones.recaudacion} onClick={() => setDetalle('recaudacion')} />
        <Metrica titulo="Flujo de caja" valor={pesos.format(resumen.totalPeriodo)} detalle={`${resumen.flujoPorMedio.length} medios de pago`} conclusion={resumen.conclusiones.mediosPago} onClick={() => setDetalle('caja')} />
        <Metrica titulo="Morosidad" valor={pesos.format(resumen.morosidad.importe)} detalle={`${resumen.morosidad.alumnos} alumnos con deuda`} conclusion={resumen.conclusiones.morosidad} alerta={resumen.morosidad.importe > 0} onClick={() => setDetalle('morosidad')} />
        <Metrica titulo="Ingresos por actividad" valor={resumen.ingresosPorActividad[0]?.nombre ?? 'Sin datos'} detalle={resumen.ingresosPorActividad[0] ? pesos.format(resumen.ingresosPorActividad[0].importe) : 'Sin ingresos'} conclusion={resumen.conclusiones.actividades} onClick={() => setDetalle('actividades')} />
      </div>

      {detalle === 'recaudacion' && <DetalleModal titulo="Recaudación" onClose={() => setDetalle(null)}>
        <Panel titulo={`Pagos mensuales: ${anio} vs. ${Number(anio) - 1}`} subtitulo="Variación de ingresos por mes">
          <GraficoAnual datos={resumen.serieMensual} />
          <Tabla encabezados={['Mes', anio, String(Number(anio) - 1), 'Variación']} filas={resumen.serieMensual.map((m) => [m.etiqueta, pesos.format(m.actual), pesos.format(m.anterior), variacionTexto(m.anterior ? Math.round((m.actual - m.anterior) / m.anterior * 1000) / 10 : null)])} />
          <Conclusion texto={resumen.conclusiones.comparacionAnual} />
        </Panel>
      </DetalleModal>}

      {detalle === 'caja' && <DetalleModal titulo="Flujo de caja" onClose={() => setDetalle(null)}>
        <Panel titulo="Flujo de caja" subtitulo="Distribución por medio de pago">
          <Barras datos={resumen.flujoPorMedio} color="#2563eb" />
          <Tabla encabezados={['Medio', 'Importe', 'Participación']} filas={resumen.flujoPorMedio.map((x) => [x.nombre, pesos.format(x.importe), `${x.porcentaje}%`])} />
          <Conclusion texto={resumen.conclusiones.mediosPago} />
        </Panel>
      </DetalleModal>}

      {detalle === 'morosidad' && <DetalleModal titulo="Morosidad" onClose={() => setDetalle(null)}>
        <div style={s.dosColumnas}>
        <Panel titulo="Antigüedad de mora" subtitulo="Saldo vencido a la fecha de corte">
          <Barras datos={resumen.morosidad.tramos.map((x) => ({ nombre: x.nombre, importe: x.importe, porcentaje: resumen.morosidad.importe ? x.importe / resumen.morosidad.importe * 100 : 0 }))} color="#dc2626" />
          <Tabla encabezados={['Tramo', 'Alumnos', 'Saldo']} filas={resumen.morosidad.tramos.map((x) => [x.nombre, x.alumnos, pesos.format(x.importe)])} />
          <Conclusion texto={resumen.conclusiones.morosidad} />
        </Panel>
        <Panel titulo="Ranking de alumnos deudores" subtitulo="Prioridad por saldo y mayor antigüedad">
          <Tabla encabezados={['Posición', 'Alumno', 'Saldo pendiente', 'Antigüedad máxima']} filas={resumen.rankingDeudores.map((x, i) => [i + 1, x.alumno, pesos.format(x.importe), `${x.diasMaximos} días`])} vacio="No hay alumnos con deuda vencida." />
          <Conclusion texto={resumen.conclusiones.deudores} />
        </Panel>
        </div>
      </DetalleModal>}

      {detalle === 'actividades' && <DetalleModal titulo="Ingresos por actividad" onClose={() => setDetalle(null)}>
        <Panel titulo="Ingresos por curso o materia" subtitulo="Actividades que explican la recaudación del período">
          <Barras datos={resumen.ingresosPorActividad} color="#059669" />
          <Tabla encabezados={['Actividad', 'Ingresos', 'Participación']} filas={resumen.ingresosPorActividad.map((x) => [x.nombre, pesos.format(x.importe), `${x.porcentaje}%`])} />
          <Conclusion texto={resumen.conclusiones.actividades} />
        </Panel>
      </DetalleModal>}
    </section>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) { return <label style={s.campo}><span>{label}</span>{children}</label>; }
function Metrica({ titulo, valor, detalle, conclusion, alerta = false, onClick }: { titulo: string; valor: string; detalle: string; conclusion: string; alerta?: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} aria-label={`Ver detalle de ${titulo}`} style={{ ...s.metrica, borderColor: alerta ? '#fecaca' : '#e2e8f0' }}><span style={s.contenidoMetrica}><span style={s.valor}>{valor}</span><strong style={s.etiqueta}>{titulo}</strong><span style={s.detalle}>{detalle}</span><span style={s.miniConclusion}>{conclusion}</span><span style={s.verDetalle}>Ver detalle</span></span></button>;
}
function DetalleModal({ titulo, onClose, children }: { titulo: string; onClose: () => void; children: React.ReactNode }) {
  return <div role="presentation" style={s.modalFondo} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="titulo-detalle-financiero" style={s.modal}>
      <header style={s.modalCabecera}><h2 id="titulo-detalle-financiero" style={s.modalTitulo}>{titulo}</h2><button type="button" onClick={onClose} style={s.cerrar}>Cerrar</button></header>
      <div style={s.modalContenido}>{children}</div>
    </section>
  </div>;
}
function Panel({ titulo, subtitulo, children }: { titulo: string; subtitulo: string; children: React.ReactNode }) { return <article style={s.panel}><h3 style={s.panelTitulo}>{titulo}</h3><p style={s.secundario}>{subtitulo}</p>{children}</article>; }
function Conclusion({ texto }: { texto: string }) { return <div style={s.conclusion}><div><strong>Conclusión automática</strong><p style={{ margin: '3px 0 0' }}>{texto}</p></div></div>; }

function Barras({ datos, color }: { datos: Array<{ nombre: string; importe: number; porcentaje: number }>; color: string }) {
  const maximo = Math.max(...datos.map((x) => x.importe), 1);
  if (!datos.length) return <div style={s.vacio}>Sin datos para los filtros seleccionados.</div>;
  return <div style={{ margin: '20px 0' }}>{datos.map((x) => <div key={x.nombre} style={{ marginBottom: 12 }}><div style={s.filaBarra}><span>{x.nombre}</span><strong>{pesos.format(x.importe)}</strong></div><div style={s.pista}><div style={{ ...s.barra, width: `${x.importe / maximo * 100}%`, background: color }} /></div></div>)}</div>;
}

function GraficoAnual({ datos }: { datos: ResumenFinanciero['serieMensual'] }) {
  const maximo = Math.max(...datos.flatMap((x) => [x.actual, x.anterior]), 1);
  return <div style={s.graficoAnual}>{datos.map((x) => <div key={x.mes} style={s.mes}><div style={s.columnas}><div title={`${x.etiqueta}: ${pesos.format(x.anterior)}`} style={{ ...s.columna, height: `${x.anterior / maximo * 100}%`, background: '#94a3b8' }} /><div title={`${x.etiqueta}: ${pesos.format(x.actual)}`} style={{ ...s.columna, height: `${x.actual / maximo * 100}%`, background: '#2563eb' }} /></div><span>{x.etiqueta}</span></div>)}</div>;
}

function Tabla({ encabezados, filas, vacio = 'Sin datos para mostrar.' }: { encabezados: string[]; filas: Array<Array<string | number>>; vacio?: string }) {
  return <div style={s.tablaContenedor}><table style={s.tabla}><thead><tr>{encabezados.map((h) => <th key={h} style={s.th}>{h}</th>)}</tr></thead><tbody>{filas.length ? filas.map((fila, i) => <tr key={i} style={{ background: i % 2 ? '#f8fafc' : '#fff' }}>{fila.map((celda, j) => <td key={j} style={s.td}>{celda}</td>)}</tr>) : <tr><td colSpan={encabezados.length} style={s.td}>{vacio}</td></tr>}</tbody></table></div>;
}

const s: Record<string, CSSProperties> = {
  cabecera: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 18 },
  sobretitulo: { margin: '0 0 5px', color: '#047857', fontSize: 13, fontWeight: 800, letterSpacing: '.07em', textTransform: 'uppercase' },
  titulo: { margin: 0, fontSize: 26, color: '#0f172a' }, secundario: { margin: '5px 0 0', color: '#64748b', fontSize: 14 },
  boton: { border: 0, borderRadius: 7, padding: '10px 15px', background: '#0b1e33', color: '#fff', fontWeight: 700, cursor: 'pointer' },
  acciones: { display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 },
  botonSecundario: { border: '1px solid #0b1e33', borderRadius: 7, padding: '9px 14px', background: '#fff', color: '#0b1e33', fontWeight: 700, cursor: 'pointer' },
  filtros: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, padding: 16, marginBottom: 16, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 10 },
  errorFecha: { margin: '-7px 0 16px', color: '#b91c1c', fontSize: 13, fontWeight: 700 },
  campo: { display: 'grid', gap: 6, color: '#334155', fontSize: 13, fontWeight: 700 }, control: { width: '100%', padding: '9px 10px', border: '1px solid #94a3b8', borderRadius: 6, background: '#fff', color: '#0f172a', boxSizing: 'border-box' },
  tarjetas: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 16 },
  metrica: { minHeight: 175, display: 'flex', padding: 18, textAlign: 'left', cursor: 'pointer', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxSizing: 'border-box', font: 'inherit' }, contenidoMetrica: { display: 'flex', width: '100%', flexDirection: 'column', alignItems: 'flex-start' }, valor: { display: 'block', color: '#0f172a', fontSize: 22, fontWeight: 800 }, etiqueta: { display: 'block', color: '#334155', fontSize: 14, marginTop: 3 }, detalle: { display: 'block', color: '#64748b', fontSize: 12, marginTop: 5 }, miniConclusion: { display: 'block', margin: '9px 0 0', color: '#475569', fontSize: 12, lineHeight: 1.4 }, verDetalle: { display: 'block', marginTop: 'auto', paddingTop: 10, color: '#0f766e', fontSize: 12, fontWeight: 800, textDecoration: 'underline' },
  modalFondo: { position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: 20, background: 'rgba(15, 23, 42, .62)' },
  modal: { width: 'min(1050px, 96vw)', maxHeight: '90vh', overflow: 'hidden', borderRadius: 14, background: '#f8fafc', boxShadow: '0 24px 70px rgba(15, 23, 42, .3)' },
  modalCabecera: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #cbd5e1', background: '#fff' }, modalTitulo: { margin: 0, color: '#0f172a', fontSize: 21 }, cerrar: { padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 7, background: '#fff', color: '#334155', cursor: 'pointer', fontSize: 13, fontWeight: 700 }, modalContenido: { maxHeight: 'calc(90vh - 71px)', overflowY: 'auto', padding: 18 },
  dosColumnas: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }, panel: { marginBottom: 16, padding: 20, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 }, panelTitulo: { margin: 0, color: '#0f172a', fontSize: 18 },
  conclusion: { display: 'flex', gap: 10, marginTop: 16, padding: 13, border: '1px solid #bae6fd', borderRadius: 8, background: '#f0f9ff', color: '#0c4a6e', fontSize: 13, lineHeight: 1.45 },
  filaBarra: { display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 5, color: '#334155', fontSize: 13 }, pista: { height: 11, overflow: 'hidden', background: '#e2e8f0', borderRadius: 999 }, barra: { height: '100%', borderRadius: 999 },
  graficoAnual: { height: 230, display: 'flex', alignItems: 'stretch', gap: 6, overflowX: 'auto', margin: '22px 0 16px', borderBottom: '1px solid #cbd5e1' }, mes: { minWidth: 48, flex: 1, display: 'grid', gridTemplateRows: '1fr 26px', alignItems: 'end', textAlign: 'center', color: '#64748b', fontSize: 11 }, columnas: { height: 190, display: 'flex', gap: 3, alignItems: 'flex-end', justifyContent: 'center' }, columna: { width: '38%', minHeight: 1, borderRadius: '4px 4px 0 0' },
  tablaContenedor: { overflowX: 'auto', marginTop: 14 }, tabla: { width: '100%', borderCollapse: 'collapse', fontSize: 13 }, th: { padding: '10px 12px', background: '#e2e8f0', color: '#1e293b', textAlign: 'left', whiteSpace: 'nowrap' }, td: { padding: '9px 12px', borderBottom: '1px solid #e2e8f0', color: '#334155' }, vacio: { margin: '18px 0', padding: 24, textAlign: 'center', color: '#64748b', border: '1px dashed #cbd5e1', borderRadius: 8 }, estado: { minHeight: 160, display: 'grid', placeItems: 'center', gap: 12, padding: 30, border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff' },
};
