'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { eventoEnFecha } from '@/domain/calendario';
import styles from './CalendarioBase.module.css';

export type Vista = 'hoy' | 'semana' | 'mes' | 'anio';
export type EstadoClase = 'porDar' | 'pasado' | 'cancelado' | 'completo';

export type EventoCalendario<T = unknown> = {
  id: string;
  fecha: string | null;
  dia_semana?: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  titulo: string;
  subtitulo?: string;
  pie?: string;
  marca?: string;
  cancelado?: boolean;
  completo?: boolean;
  datos: T;
};

export const ETIQUETAS_ESTADO: Record<EstadoClase, string> = {
  porDar: 'Por dar',
  pasado: 'Dictada',
  cancelado: 'Cancelada',
  completo: 'Cupo completo',
};

const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function fechaLocal(valor: Date) {
  return `${valor.getFullYear()}-${String(valor.getMonth() + 1).padStart(2, '0')}-${String(valor.getDate()).padStart(2, '0')}`;
}
export function diaDesdeSql(valor: string) {
  const [a, m, d] = valor.slice(0, 10).split('-').map(Number);
  return new Date(a, m - 1, d);
}
export function sumarDias(valor: string, cantidad: number) {
  const fecha = diaDesdeSql(valor);
  fecha.setDate(fecha.getDate() + cantidad);
  return fechaLocal(fecha);
}
export function fechaLegible(valor: string) {
  const d = diaDesdeSql(valor);
  return `${dias[d.getDay()]} ${d.getDate()} de ${meses[d.getMonth()]}`;
}
export function hora(h: string | null) {
  return h?.slice(0, 5) ?? '--:--';
}
function inicioSemana(valor: string) {
  const d = diaDesdeSql(valor);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return fechaLocal(d);
}
function listarFechas(desde: string, hasta: string) {
  const out: string[] = [];
  for (let f = desde; f <= hasta; f = sumarDias(f, 1)) out.push(f);
  return out;
}
function minutos(h: string | null) {
  return h ? Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5)) : 0;
}

/** Una clase ya terminada se marca como "pasada" (gris) si se pide atenuarla. */
export function estadoEvento(ev: EventoCalendario<unknown>, fecha: string, ahora: Date, atenuarPasadas: boolean): EstadoClase {
  if (ev.cancelado) return 'cancelado';
  if (atenuarPasadas && new Date(`${fecha}T${ev.hora_fin || '23:59'}`) < ahora) return 'pasado';
  if (ev.completo) return 'completo';
  return 'porDar';
}

type Props<T> = {
  eyebrow?: string;
  titulo: string;
  descripcion?: string;
  eventos: EventoCalendario<T>[];
  cargando: boolean;
  error?: string;
  mensaje?: string;
  vistaInicial?: Vista;
  atenuarPasadas?: boolean;
  espaciosLibres?: boolean;
  etiquetas?: Partial<Record<EstadoClase, string>>;
  filtros?: ReactNode;
  onRangoCambio: (desde: string, hasta: string) => void;
  onReintentar?: () => void;
  onSeleccionar: (evento: EventoCalendario<T>, fecha: string) => void;
  children?: ReactNode;
};

export default function CalendarioBase<T>({
  eyebrow, titulo, descripcion, eventos, cargando, error, mensaje, vistaInicial = 'mes',
  atenuarPasadas = false, espaciosLibres = false, etiquetas, filtros,
  onRangoCambio, onReintentar, onSeleccionar, children,
}: Props<T>) {
  const [vista, setVista] = useState<Vista>(vistaInicial);
  const [fecha, setFecha] = useState(() => fechaLocal(new Date()));
  const etiqueta = { ...ETIQUETAS_ESTADO, ...etiquetas };
  const hoy = fechaLocal(new Date());
  const ahora = new Date();
  const ref = diaDesdeSql(fecha);

  const desde = vista === 'hoy' ? hoy : vista === 'anio' ? `${ref.getFullYear()}-01-01` : vista === 'mes' ? fechaLocal(new Date(ref.getFullYear(), ref.getMonth(), 1)) : inicioSemana(fecha);
  const hasta = vista === 'hoy' ? hoy : vista === 'anio' ? `${ref.getFullYear()}-12-31` : vista === 'mes' ? fechaLocal(new Date(ref.getFullYear(), ref.getMonth() + 1, 0)) : sumarDias(desde, 6);

  const avisarRango = useRef(onRangoCambio);
  useEffect(() => { avisarRango.current = onRangoCambio; });
  useEffect(() => { avisarRango.current(desde, hasta); }, [desde, hasta]);

  const fechasRango = listarFechas(desde, hasta);

  const porDia = new Map<string, EventoCalendario<T>[]>();
  for (const f of fechasRango) {
    porDia.set(f, eventos.filter((e) => eventoEnFecha(e, f)).sort((a, b) => (a.hora_inicio || '').localeCompare(b.hora_inicio || '')));
  }

  const total = fechasRango.reduce((n, f) => n + (porDia.get(f)?.length ?? 0), 0);

  function navegar(delta: number) {
    setFecha(vista === 'anio' ? fechaLocal(new Date(ref.getFullYear() + delta, ref.getMonth(), 1)) : vista === 'mes' ? fechaLocal(new Date(ref.getFullYear(), ref.getMonth() + delta, 1)) : sumarDias(fecha, delta * 7));
  }
  function irADia(f: string) { setFecha(f); setVista('semana'); }
  function irAMes(mes: number) { setFecha(fechaLocal(new Date(ref.getFullYear(), mes, 1))); setVista('mes'); }
  const nombreVista = vista === 'hoy' ? 'Hoy' : vista === 'mes' ? 'Mes' : vista === 'anio' ? 'Año' : 'Semana';
  const unidad = { ant: vista === 'anio' ? 'Año anterior' : vista === 'mes' ? 'Mes anterior' : 'Semana anterior', sig: vista === 'anio' ? 'Año siguiente' : vista === 'mes' ? 'Mes siguiente' : 'Semana siguiente' };

  const leyenda: EstadoClase[] = ['porDar', ...(atenuarPasadas ? ['pasado' as const] : []), 'cancelado', ...(eventos.some((e) => e.completo) ? ['completo' as const] : [])];
  const leyendaClase: Record<EstadoClase, string> = { porDar: styles.legendPorDar, pasado: styles.legendPasado, cancelado: styles.legendCancelado, completo: styles.legendCompleto };

  // Cancelada y ya pasada: gris (pasó) con marcas rojas (se canceló).
  const extra = (ev: EventoCalendario<T>, f: string, e: EstadoClase) => (atenuarPasadas && e === 'cancelado' && new Date(`${f}T${ev.hora_fin || '23:59'}`) < ahora ? styles.pasadoCancel : '');
  function etiquetaAria(ev: EventoCalendario<T>, e: EstadoClase) {
    const estadoTexto = e === 'cancelado' && ev.datos && (ev.datos as { estado?: string }).estado === 'cancelado' ? 'Dado de baja' : etiqueta[e];
    return `${ev.titulo}, ${hora(ev.hora_inicio)} a ${hora(ev.hora_fin)}${ev.pie ? ', ' + ev.pie : ''}, ${estadoTexto}`;
  }

  function textoEstadoEvento(ev: EventoCalendario<T>, estado: EstadoClase) {
    return estado === 'cancelado' && ev.datos && (ev.datos as { estado?: string }).estado === 'cancelado' ? 'Dado de baja' : etiqueta[estado];
  }

  const offsetMes = (new Date(ref.getFullYear(), ref.getMonth(), 1).getDay() + 6) % 7;
  const diasMes = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
  const celdasMes = Math.ceil((offsetMes + diasMes) / 7) * 7;

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
          <h1>{titulo}</h1>
          {descripcion && <p>{descripcion}</p>}
        </div>
        <div className={styles.controls}>
          <div className={styles.switcher} role="group" aria-label="Vista del calendario">
            {(['hoy', 'semana', 'mes', 'anio'] as Vista[]).map((v) => (
              <button key={v} type="button" aria-pressed={vista === v} onClick={() => { if (v === 'hoy') setFecha(hoy); setVista(v); }}>
                {v === 'hoy' ? 'Hoy' : v === 'semana' ? 'Semana' : v === 'mes' ? 'Mes' : 'Año'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {filtros && <div className={styles.filters}>{filtros}</div>}

      <div className={styles.toolbar}>
        <div className={styles.navigation}>
          {vista !== 'hoy' && <button type="button" onClick={() => navegar(-1)} aria-label={unidad.ant}>‹</button>}
          <h2>{vista === 'hoy' ? fechaLegible(hoy) : vista === 'anio' ? String(ref.getFullYear()) : vista === 'mes' ? `${meses[ref.getMonth()]} de ${ref.getFullYear()}` : `${fechaLegible(desde)} — ${fechaLegible(hasta)}`}</h2>
          {vista !== 'hoy' && <button type="button" onClick={() => navegar(1)} aria-label={unidad.sig}>›</button>}
        </div>
        <span className={styles.count}>{total} {total === 1 ? 'clase' : 'clases'}</span>
      </div>

      <div className={styles.legend} aria-label="Estados de las clases">
        {leyenda.map((e) => <span key={e} className={`${styles.legendItem} ${leyendaClase[e]}`}>{etiqueta[e]}</span>)}
      </div>

      {error && <div role="alert" className={styles.error}>{error} {onReintentar && <button type="button" onClick={onReintentar}>Reintentar</button>}</div>}
      {mensaje && <div role="status" className={styles.success}>{mensaje}</div>}

      {cargando ? <div className={styles.loading} role="status">Cargando clases…</div> : (
        <div className={styles.weekScroll} aria-label={`Vista ${nombreVista}`}>
          {vista === 'anio' ? (
            <div className={styles.year}>
              {meses.map((nombreMes, m) => {
                const off = (new Date(ref.getFullYear(), m, 1).getDay() + 6) % 7;
                const n = new Date(ref.getFullYear(), m + 1, 0).getDate();
                const clasesMes = Array.from({ length: n }, (_, i) => (porDia.get(fechaLocal(new Date(ref.getFullYear(), m, i + 1))) ?? []).length).reduce((a, b) => a + b, 0);
                return (
                  <div key={nombreMes} className={styles.miniMonth}>
                    <button type="button" className={styles.miniTitle} onClick={() => irAMes(m)} aria-label={`Ver ${nombreMes} de ${ref.getFullYear()}`}><span>{nombreMes}</span><small>{clasesMes} {clasesMes === 1 ? 'clase' : 'clases'}</small></button>
                    <div className={styles.miniGrid}>
                      {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <span key={i} className={styles.miniWeekday}>{d}</span>)}
                      {Array.from({ length: off }, (_, i) => <span key={`v${i}`} />)}
                      {Array.from({ length: n }, (_, i) => {
                        const f = fechaLocal(new Date(ref.getFullYear(), m, i + 1));
                        const cl = porDia.get(f) ?? [];
                        const pasado = atenuarPasadas && f < hoy;
                        const todasCanc = cl.length > 0 && cl.every((e) => e.cancelado);
                        const tono = pasado ? (!cl.length ? styles.miniPastDay : todasCanc ? styles.miniPastCancel : styles.miniPast) : !cl.length ? '' : todasCanc ? styles.miniCancel : styles.miniHas;
                        return <button type="button" key={f} className={`${styles.miniDay} ${tono} ${f === hoy ? styles.miniToday : ''}`} onClick={() => irADia(f)} aria-label={`${fechaLegible(f)}${cl.length ? `, ${cl.length} ${cl.length === 1 ? 'clase' : 'clases'}` : ''}`}>{i + 1}</button>;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : vista === 'mes' ? (
            <div className={styles.month}>
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => <div key={d} className={styles.monthWeekday}>{d}</div>)}
              {Array.from({ length: celdasMes }, (_, i) => {
                const f = fechaLocal(new Date(ref.getFullYear(), ref.getMonth(), i - offsetMes + 1));
                const enMes = diaDesdeSql(f).getMonth() === ref.getMonth();
                const clases = enMes ? porDia.get(f) ?? [] : [];
                const esPasado = atenuarPasadas && enMes && f < hoy;
                const claseCelda = [styles.monthCell, !enMes && styles.otherMonth, esPasado && styles.pastCell, f === hoy && styles.monthToday].filter(Boolean).join(' ');
                return (
                  <div key={f} className={claseCelda}>
                    <button type="button" className={styles.monthDate} onClick={() => irADia(f)} aria-label={`Ver ${fechaLegible(f)}`}>{diaDesdeSql(f).getDate()}</button>
                    {clases.slice(0, 3).map((ev) => {
                      const e = estadoEvento(ev, f, ahora, atenuarPasadas);
                      return (
                        <button type="button" key={`${f}-${ev.id}`} className={`${styles.monthEvent} ${styles[e]} ${extra(ev, f, e)}`} onClick={() => onSeleccionar(ev, f)} aria-label={etiquetaAria(ev, e)}>
                          <span>{ev.cancelado ? '✕ ' : ''}{hora(ev.hora_inicio)}</span><strong>{ev.titulo}</strong>{ev.pie && <small>{ev.pie}</small>}<em>{textoEstadoEvento(ev, e)}</em>
                        </button>
                      );
                    })}
                    {clases.length > 3 && <button type="button" className={styles.more} onClick={() => irADia(f)}>+{clases.length - 3} clases más</button>}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={vista === 'hoy' ? styles.day : styles.week}>
              {fechasRango.map((f) => {
                const clases = porDia.get(f) ?? [];
                const esPasado = atenuarPasadas && f < hoy;
                return (
                  <div key={f} className={`${styles.column} ${esPasado ? styles.pastColumn : ''}`}>
                    <h3 className={f === hoy ? styles.currentDay : styles.dayTitle}>{fechaLegible(f)}{f === hoy && <span>Hoy</span>}</h3>
                    {!clases.length ? <div className={styles.free}>Sin clases programadas</div> : clases.map((ev, i) => {
                      const prev = clases[i - 1];
                      const hueco = espaciosLibres && prev?.hora_fin && ev.hora_inicio ? Math.max(0, minutos(ev.hora_inicio) - minutos(prev.hora_fin)) : 0;
                      const e = estadoEvento(ev, f, ahora, atenuarPasadas);
                      return (
                        <div key={`${f}-${ev.id}`}>
                          {hueco >= 15 && <div className={styles.gap}>Espacio libre · {hueco} min</div>}
                          <button type="button" className={`${styles.event} ${styles[e]} ${extra(ev, f, e)}`} onClick={() => onSeleccionar(ev, f)} aria-label={etiquetaAria(ev, e)}>
                            <span className={styles.eventTop}><span>{hora(ev.hora_inicio)} – {hora(ev.hora_fin)}</span><span className={styles.badge}>{textoEstadoEvento(ev, e)}</span></span>
                            <strong>{ev.titulo}</strong>
                            {ev.subtitulo && <span className={styles.activity}>{ev.subtitulo}</span>}
                            {(ev.pie || ev.marca) && <span className={styles.eventBottom}>{ev.pie && <span>{ev.pie}</span>}{ev.marca && <span>{ev.marca}</span>}</span>}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

/** Ventana de detalle con el mismo aspecto para todos los roles. */
export function DialogoClase({ eyebrow = 'Detalle de la clase', titulo, subtitulo, estado, reprogramada = false, detalles, acciones = [], ocupado = false, onCerrar, children }: {
  eyebrow?: string;
  titulo: string;
  subtitulo?: string;
  /** Estado de la clase: se muestra destacado arriba (Dictada, Cancelada, Por dar…). */
  estado?: { tipo: EstadoClase; texto: string };
  reprogramada?: boolean;
  detalles: [string, string][];
  acciones?: { texto: string; onClick: () => void; peligro?: boolean }[];
  ocupado?: boolean;
  onCerrar: () => void;
  children?: ReactNode;
}) {
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape' && !ocupado) onCerrar(); };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [ocupado, onCerrar]);
  return (
    <div className={styles.overlay} role="presentation" onMouseDown={() => !ocupado && onCerrar()}>
      <div role="dialog" aria-modal="true" aria-labelledby="detalle-clase" className={styles.dialog} onMouseDown={(e) => e.stopPropagation()}>
        <div className={styles.dialogHead}>
          <div><span className={styles.eyebrow}>{eyebrow}</span><h2 id="detalle-clase">{titulo}</h2></div>
          <button type="button" aria-label="Cerrar detalle" onClick={onCerrar}>×</button>
        </div>
        {estado && <div><span className={`${styles.statusPill} ${styles[`pill_${estado.tipo}`]}`}>{estado.tipo === 'pasado' ? '✓ ' : estado.tipo === 'cancelado' ? '✕ ' : ''}{estado.texto}</span>{reprogramada && <span className={`${styles.statusPill} ${styles.pillExtra}`}>↻ Reprogramada</span>}</div>}
        {subtitulo && <p className={styles.dialogSub}>{subtitulo}</p>}
        <dl className={styles.details}>{detalles.map(([k, v]) => <div key={k} style={{ display: 'contents' }}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        {children}
        <div className={styles.dialogActions}>
          {acciones.map((a) => <button key={a.texto} type="button" className={a.peligro ? styles.danger : undefined} disabled={ocupado} onClick={a.onClick}>{a.texto}</button>)}
          <button type="button" onClick={onCerrar}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

/** Lista de personas (alumnos inscriptos) con el mismo diseño en todos los roles. */
export function Nomina({ titulo, items, vacio, cargando = false }: {
  titulo: string;
  items: { id: string; nombre: string; detalle?: string }[];
  vacio: string;
  cargando?: boolean;
}) {
  return (
    <>
      <h3>{titulo} ({items.length})</h3>
      {cargando ? <p className={styles.muted}>Cargando nómina…</p> : items.length
        ? <ul className={styles.roster}>{items.map((a) => <li key={a.id}><span>{a.nombre}</span>{a.detalle && <small>{a.detalle}</small>}</li>)}</ul>
        : <p className={styles.muted}>{vacio}</p>}
    </>
  );
}
