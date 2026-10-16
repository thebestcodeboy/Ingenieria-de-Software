'use client';

import { useEffect, useRef, useState } from 'react';
import { etiquetasAsistencia, estadoVigente, filtrarAsistencias, resumirAsistencias, type EstadoAsistencia, type FilaAsistencia } from '@/domain/asistencias';
import { listarAsistencias, guardarAsistencia } from '@/services/asistencias';
import { useAuth } from '@/context/AuthContext';
import { usePagination } from './Pagination';
import { fechaLocal, sumarDias } from './CalendarioBase';
import styles from './AsistenciasModule.module.css';

function fechaLegible(fecha: string) { return fecha.split('-').reverse().join('/'); }
function Estado({ estado }: { estado: EstadoAsistencia }) {
  return <span className={`${styles.badge} ${styles[estado]}`}><svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/>{estado === 'asistio' ? <path d="m6 12 4 4 8-8"/> : estado === 'falto' ? <path d="m8 8 8 8m0-8-8 8"/> : estado === 'cancelada' ? <path d="m5 5 14 14"/> : <path d="M12 6v6l4 2"/>}</svg>{etiquetasAsistencia[estado]}</span>;
}

// turnoInicial: llega desde "Tomar asistencia" en el calendario del profesor y deja la bitácora filtrada en esa clase.
function AsistenciasProfesor({ turnoInicial = '' }: { turnoInicial?: string }) {
  const { role } = useAuth();
  const esAlumno = role === 'alumno';
  const [ahora, setAhora] = useState(() => Date.now());
  const [filas, setFilas] = useState<FilaAsistencia[]>([]);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  // El profesor entra viendo las clases de ayer y hoy; para corregir registros más viejos usa los filtros de fecha.
  const hoy = fechaLocal(new Date());
  const ayer = sumarDias(hoy, -1);
  const base = { alumno: '', materia: '', desde: '', hasta: '', estado: '', turno: '' };
  const filtrosIniciales = esAlumno ? base : turnoInicial ? { ...base, turno: turnoInicial } : { ...base, desde: ayer, hasta: hoy };
  const periodos = [
    { id: 'hoy', texto: 'Hoy', desde: hoy, hasta: hoy },
    { id: 'ayerhoy', texto: 'Ayer y hoy', desde: ayer, hasta: hoy },
    { id: 'semana', texto: 'Últimos 7 días', desde: sumarDias(hoy, -6), hasta: hoy },
    { id: 'todo', texto: 'Todo el historial', desde: '', hasta: '' },
  ];
  const [filtros, setFiltros] = useState(filtrosIniciales);
  const [editando, setEditando] = useState<FilaAsistencia | null>(null);
  const [estado, setEstado] = useState('asistio');
  const [nota, setNota] = useState('');
  const [observacion, setObservacion] = useState('');
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [rapido, setRapido] = useState('');
  const [errorRapido, setErrorRapido] = useState('');
  const [errorGuardado, setErrorGuardado] = useState('');
  const editor = useRef<HTMLDivElement>(null);

  async function cargar() {
    setAhora(Date.now()); setCargando(true); setError('');
    try { setFilas(await listarAsistencias(role)); }
    catch(e) { setFilas([]); setError(e instanceof Error ? e.message : 'No se pudo cargar la bitácora'); }
    finally { setCargando(false); }
  }
  useEffect(() => {
    let activo = true;
    listarAsistencias(role).then(datos => { if (activo) { setFilas(datos); setError(''); } })
      .catch(e => { if (activo) { setFilas([]); setError(e instanceof Error ? e.message : 'No se pudo cargar'); } })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [role]);
  useEffect(() => {
    if (!editando) return;
    const anterior = document.activeElement as HTMLElement | null;
    editor.current?.querySelector<HTMLElement>('select')?.focus();
    return () => { anterior?.focus(); };
  }, [editando]);

  const visibles = filtrarAsistencias(filas, filtros);
  const resumen = resumirAsistencias(visibles);
  const { elementosPaginados, paginaActual, totalPaginas, cambiarPagina } = usePagination(visibles, JSON.stringify(filtros), 10);
  const opciones = (campo: 'alumno_id' | 'materia_id' | 'turno_id', nombre: 'alumno' | 'materia' | 'actividad') => [...new Map(filas.map(f => [f[campo], { id: f[campo], nombre: campo === 'turno_id' ? `${fechaLegible(f.fecha)} ${f.hora_inicio?.slice(0,5) ?? ''} · ${f[nombre]}` : f[nombre] }])).values()];
  const puedeRegistrar = (f: FilaAsistencia) => f.editable && f.inscripcion_estado === 'confirmado' && !f.cancelada && Boolean(f.hora_inicio) && Date.parse(`${f.fecha}T${f.hora_inicio}-03:00`) <= ahora;
  // Registro de un clic (sin nota). Para agregar nota u observación se usa "Con nota".
  async function marcar(f: FilaAsistencia, nuevo: 'asistio' | 'falto') {
    setRapido(f.inscripcion_id); setErrorRapido('');
    try { await guardarAsistencia(f, nuevo, '', '', ''); setFilas(await listarAsistencias(role)); setAhora(Date.now()); }
    catch(e) { setErrorRapido(e instanceof Error ? e.message : 'No se pudo guardar la asistencia'); }
    finally { setRapido(''); }
  }
  function abrirRegistro(f: FilaAsistencia) {
    setEditando(f); setEstado(f.versiones[0]?.estado ?? 'asistio'); setNota(f.versiones[0]?.nota ?? '');
    setObservacion(f.versiones[0]?.observacion ?? ''); setMotivo(''); setErrorGuardado('');
  }

  return <section className={styles.root} aria-label="Bitácora de asistencias">
    <h1>{esAlumno ? 'Mi bitácora de asistencias' : 'Bitácora de asistencias'}</h1>
    <p>{esAlumno ? 'Consultá tus clases, notas y observaciones.' : 'Registro y seguimiento de asistencias por clase.'} Sin registrar no cuenta como falta.</p>
    {!esAlumno && <div className={styles.periods} role="group" aria-label="Período de clases">
      <span>Mostrar:</span>
      {periodos.map(p => <button key={p.id} type="button" aria-pressed={filtros.desde === p.desde && filtros.hasta === p.hasta} onClick={() => setFiltros({...filtros, desde: p.desde, hasta: p.hasta, turno: ''})}>{p.texto}</button>)}
      <small>Para corregir asistencias anteriores elegí otras fechas en los filtros o “Todo el historial”.</small>
    </div>}
    <div className={styles.filters}>
      <label>Fecha desde<input type="date" value={filtros.desde} max={filtros.hasta || undefined} onChange={e => setFiltros({...filtros,desde:e.target.value})}/></label>
      <label>Fecha hasta<input type="date" value={filtros.hasta} min={filtros.desde} onChange={e => setFiltros({...filtros,hasta:e.target.value})}/></label>
      <label>Materia<select value={filtros.materia} onChange={e => setFiltros({...filtros,materia:e.target.value})}><option value="">Todas las materias</option>{opciones('materia_id','materia').map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}</select></label>
      {!esAlumno && <label>Alumno<select value={filtros.alumno} onChange={e => setFiltros({...filtros,alumno:e.target.value})}><option value="">Todos los alumnos</option>{opciones('alumno_id','alumno').map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}</select></label>}
      <label>Clase<select value={filtros.turno} onChange={e => setFiltros({...filtros,turno:e.target.value})}><option value="">Todas las clases</option>{opciones('turno_id','actividad').map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}</select></label>
      <label>Estado<select value={filtros.estado} onChange={e => setFiltros({...filtros,estado:e.target.value})}><option value="">Todos los estados</option>{Object.entries(etiquetasAsistencia).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <div className={styles.filterActions}><button onClick={() => setFiltros(filtrosIniciales)}>{esAlumno ? 'Limpiar filtros' : 'Restablecer'}</button><button className={styles.primary} disabled={cargando} onClick={() => void cargar()}>{cargando ? 'Actualizando…' : 'Actualizar'}</button></div>
    </div>
    {error && <div className={styles.alert} role="alert">{error}</div>}
    {errorRapido && <div className={styles.alert} role="alert">{errorRapido}</div>}
    <div className={styles.stats}>{Object.entries(resumen).map(([k,v]) => <div className={styles.stat} key={k}><Estado estado={k as EstadoAsistencia}/><strong>{cargando ? '—' : v}</strong></div>)}</div>
    {cargando ? <div className={styles.empty} role="status">Cargando bitácora…</div> : error ? <div className={styles.empty}><strong>No se pudo consultar la bitácora</strong>Usá Actualizar para volver a intentarlo.</div> : !visibles.length ? <div className={styles.empty}><strong>{filas.length ? 'No hay resultados para estos filtros' : 'Todavía no hay clases para mostrar'}</strong>{filas.length ? (esAlumno ? 'Probá cambiar el rango de fechas o limpiar los filtros.' : 'No hay clases en este período. Elegí “Todo el historial” u otras fechas para ver o corregir asistencias anteriores.') : 'Las clases aparecerán cuando tengas inscripciones disponibles.'}</div> :
      <div className={styles.tableBox}><div className={styles.tableScroll}><table><caption className="sr-only">Asistencias por inscripción, ordenadas por fecha y hora de clase</caption><thead><tr><th scope="col">Fecha</th><th scope="col">Horario</th><th scope="col">Materia / actividad</th>{!esAlumno && <th scope="col">Alumno</th>}<th scope="col">Estado</th><th scope="col">Nota / observación</th><th scope="col">Historial</th>{!esAlumno && <th scope="col">Acciones</th>}</tr></thead><tbody>
      {elementosPaginados.map(f => <tr key={f.inscripcion_id}>
        <td className={styles.dateCell}>{fechaLegible(f.fecha)}</td><td className={styles.dateCell}>{f.hora_inicio?.slice(0,5) ?? '—'}</td>
        <td className={styles.classCell}><strong>{f.materia}</strong><small>{f.actividad}</small></td>{!esAlumno && <td>{f.alumno}</td>}
        <td><Estado estado={estadoVigente(f)}/></td><td className={styles.noteCell}>{f.versiones[0]?.nota || '—'}{f.versiones[0]?.observacion && <small>{f.versiones[0].observacion}</small>}</td>
        <td>{f.versiones.length ? <details><summary>Ver historial ({f.versiones.length})</summary><div className={styles.history}>{f.versiones.map(v => <p key={v.id}><strong>Versión {v.version} · {etiquetasAsistencia[v.estado]}</strong><br/>{new Date(v.cargado_en).toLocaleString('es-AR',{timeZone:'America/Argentina/Buenos_Aires'})}<br/>Autor: {v.autor_nombre || 'Nombre no disponible'}<br/><span style={{color:'#64748b',fontSize:11}}>ID de cuenta: {v.autor_id}</span>{v.nota && <><br/>Nota: {v.nota}</>}{v.observacion && <><br/>Observación: {v.observacion}</>}{v.motivo && <><br/>Motivo: {v.motivo}</>}</p>)}</div></details> : <span style={{color:'#94a3b8'}}>Sin registros</span>}</td>
        {!esAlumno && <td>{puedeRegistrar(f) ? (f.versiones.length ? <button onClick={() => abrirRegistro(f)}>Corregir</button> : <div className={styles.quick}><button className={styles.quickOk} disabled={rapido === f.inscripcion_id} onClick={() => void marcar(f,'asistio')}>Asistió</button><button className={styles.quickNo} disabled={rapido === f.inscripcion_id} onClick={() => void marcar(f,'falto')}>Faltó</button><button disabled={rapido === f.inscripcion_id} onClick={() => abrirRegistro(f)} aria-label={`Registrar con nota a ${f.alumno}`}>Con nota</button></div>) : <span style={{color:'#94a3b8',fontSize:12}}>{f.cancelada ? 'Cancelada' : f.inscripcion_estado !== 'confirmado' ? 'Solo consulta' : 'Sin carga disponible'}</span>}</td>}
      </tr>)}</tbody></table></div><div className={styles.footer}><span>Mostrando {(paginaActual-1)*10+1} a {Math.min(paginaActual*10,visibles.length)} de {visibles.length} registros</span><div style={{display:'flex',gap:10,alignItems:'center'}}><button disabled={paginaActual === 1} onClick={() => cambiarPagina(paginaActual-1)}>Anterior</button><span>Página {paginaActual} de {totalPaginas}</span><button disabled={paginaActual === totalPaginas} onClick={() => cambiarPagina(paginaActual+1)}>Siguiente</button></div></div></div>}
    {editando && <div className={styles.overlay} onKeyDown={e => {
      if(e.key === 'Escape' && !guardando) setEditando(null);
      if(e.key === 'Tab') { const controles=editor.current?.querySelectorAll<HTMLElement>('button:not(:disabled), select, textarea'); if(!controles?.length) return; const primero=controles[0], ultimo=controles[controles.length-1]; if(e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); } else if(!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); } }
    }}><div ref={editor} role="dialog" aria-modal="true" aria-labelledby="titulo-registro-asistencia" className={styles.editor}><h2 id="titulo-registro-asistencia">{editando.versiones.length ? 'Corregir asistencia' : 'Registrar asistencia'}</h2><p>{editando.alumno}<br/>{fechaLegible(editando.fecha)} · {editando.materia}</p>
      <form onSubmit={async e => { e.preventDefault(); setGuardando(true); setErrorGuardado(''); try { await guardarAsistencia(editando,estado,nota,observacion,motivo); setEditando(null); await cargar(); } catch(e) { setErrorGuardado(e instanceof Error ? e.message : 'No se pudo guardar'); } finally { setGuardando(false); } }}>
        {errorGuardado && <div className={styles.alert} role="alert">{errorGuardado}</div>}
        <label>Estado<select value={estado} onChange={e => setEstado(e.target.value)}><option value="asistio">Asistió</option><option value="falto">Faltó</option></select></label>
        <label>Nota (opcional)<textarea value={nota} onChange={e => setNota(e.target.value)} placeholder="Nota de la clase o evaluación"/></label>
        <label>Observación (opcional)<textarea value={observacion} onChange={e => setObservacion(e.target.value)} placeholder="Observaciones sobre esta clase"/></label>
        {editando.versiones.length > 0 && <label>Motivo de la corrección<textarea required value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Explicá por qué se corrige el registro"/></label>}
        <div className={styles.editorActions}><button type="button" disabled={guardando} onClick={() => setEditando(null)}>Cancelar</button><button className={styles.primary} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar asistencia'}</button></div>
      </form></div></div>}
  </section>;
}


type GrupoMateria = { id: string; materia: string; filas: FilaAsistencia[] };

// Vista del alumno: materias en las que está inscripto; cada una abre un modal con todas sus clases y su asistencia.
function AsistenciasAlumno() {
  const { role } = useAuth();
  const [filas, setFilas] = useState<FilaAsistencia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [abierta, setAbierta] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    listarAsistencias(role).then(d => { if (activo) setFilas(d); })
      .catch(e => { if (activo) setError(e instanceof Error ? e.message : 'No se pudo cargar'); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [role]);
  useEffect(() => {
    if (!abierta) return;
    const cerrar = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierta(null); };
    window.addEventListener('keydown', cerrar);
    return () => window.removeEventListener('keydown', cerrar);
  }, [abierta]);

  const grupos: GrupoMateria[] = [...filas.reduce((m, f) => {
    const g = m.get(f.materia_id) ?? { id: f.materia_id, materia: f.materia, filas: [] };
    g.filas.push(f); m.set(f.materia_id, g); return m;
  }, new Map<string, GrupoMateria>()).values()].sort((a, b) => a.materia.localeCompare(b.materia));
  const sel = grupos.find(g => g.id === abierta);
  const ordenadas = (g: GrupoMateria) => [...g.filas].sort((a, b) => (a.fecha + (a.hora_inicio ?? '')).localeCompare(b.fecha + (b.hora_inicio ?? '')));

  return <section className={styles.root} aria-label="Mis asistencias">
    <h1>Mis asistencias</h1>
    <p>Elegí una materia para ver todas tus clases desde que te inscribiste. Sin registrar no cuenta como falta.</p>
    {error && <div className={styles.alert} role="alert">{error}</div>}
    {cargando ? <div className={styles.empty} role="status">Cargando materias…</div> : !grupos.length && !error ? <div className={styles.empty}><strong>Todavía no estás inscripto en ninguna materia</strong>Tus materias aparecerán cuando tengas inscripciones.</div> :
      <div className={styles.subjects}>{grupos.map(g => {
        const r = resumirAsistencias(g.filas);
        return <article key={g.id} className={styles.subject}>
          <h2>{g.materia}</h2>
          <small>{g.filas.length} {g.filas.length === 1 ? 'clase' : 'clases'} · desde el {fechaLegible(ordenadas(g)[0].fecha)}</small>
          <div className={styles.counts}>
            <span className={`${styles.badge} ${styles.asistio}`}>Presente {r.asistio}</span>
            <span className={`${styles.badge} ${styles.falto}`}>Ausente {r.falto}</span>
            <span className={`${styles.badge} ${styles.sin_registrar}`}>Sin registrar {r.sin_registrar}</span>
            {r.cancelada > 0 && <span className={`${styles.badge} ${styles.cancelada}`}>Canceladas {r.cancelada}</span>}
          </div>
          <button type="button" className={styles.primary} onClick={() => setAbierta(g.id)}>Ver clases</button>
        </article>;
      })}</div>}
    {sel && <div className={styles.overlay} role="presentation" onMouseDown={() => setAbierta(null)}>
      <div role="dialog" aria-modal="true" aria-labelledby="titulo-materia" className={styles.editor} style={{ maxWidth: 720 }} onMouseDown={e => e.stopPropagation()}>
        <h2 id="titulo-materia">{sel.materia}</h2>
        <p>Todas tus clases desde que te inscribiste ({sel.filas.length}).</p>
        <div className={styles.tableScroll}><table><thead><tr><th scope="col">Fecha</th><th scope="col">Horario</th><th scope="col">Actividad</th><th scope="col">Asistencia</th><th scope="col">Nota / observación</th></tr></thead><tbody>
          {ordenadas(sel).map(f => <tr key={f.inscripcion_id}>
            <td className={styles.dateCell}>{fechaLegible(f.fecha)}</td><td className={styles.dateCell}>{f.hora_inicio?.slice(0,5) ?? '—'}</td>
            <td>{f.actividad}</td><td><Estado estado={estadoVigente(f)}/></td>
            <td className={styles.noteCell}>{f.versiones[0]?.nota || '—'}{f.versiones[0]?.observacion && <small>{f.versiones[0].observacion}</small>}</td>
          </tr>)}
        </tbody></table></div>
        <div className={styles.editorActions}><button type="button" onClick={() => setAbierta(null)}>Cerrar</button></div>
      </div>
    </div>}
  </section>;
}

export default function AsistenciasModule({ turnoInicial = '' }: { turnoInicial?: string }) {
  const { role } = useAuth();
  return role === 'alumno' ? <AsistenciasAlumno /> : <AsistenciasProfesor turnoInicial={turnoInicial} />;
}
