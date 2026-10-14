'use client';

import { useEffect, useRef, useState } from 'react';
import { etiquetasAsistencia, estadoVigente, filtrarAsistencias, resumirAsistencias, type EstadoAsistencia, type FilaAsistencia } from '@/domain/asistencias';
import { listarAsistencias, guardarAsistencia } from '@/services/asistencias';
import { useAuth } from '@/context/AuthContext';
import { usePagination } from './Pagination';
import styles from './AsistenciasModule.module.css';

function fechaLegible(fecha: string) { return fecha.split('-').reverse().join('/'); }
function Estado({ estado }: { estado: EstadoAsistencia }) {
  return <span className={`${styles.badge} ${styles[estado]}`}><svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/>{estado === 'asistio' ? <path d="m6 12 4 4 8-8"/> : estado === 'falto' ? <path d="m8 8 8 8m0-8-8 8"/> : estado === 'cancelada' ? <path d="m5 5 14 14"/> : <path d="M12 6v6l4 2"/>}</svg>{etiquetasAsistencia[estado]}</span>;
}

export default function AsistenciasModule({ turnoId = '' }: { turnoId?: string }) {
  const { role } = useAuth();
  const esAlumno = role === 'alumno';
  const [ahora, setAhora] = useState(() => Date.now());
  const [filas, setFilas] = useState<FilaAsistencia[]>([]);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const filtrosIniciales = { alumno: '', materia: '', desde: '', hasta: '', estado: '', turno: turnoId };
  const [filtros, setFiltros] = useState(filtrosIniciales);
  const [editando, setEditando] = useState<FilaAsistencia | null>(null);
  const [estado, setEstado] = useState('asistio');
  const [nota, setNota] = useState('');
  const [observacion, setObservacion] = useState('');
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);
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
  function abrirRegistro(f: FilaAsistencia) {
    setEditando(f); setEstado(f.versiones[0]?.estado ?? 'asistio'); setNota(f.versiones[0]?.nota ?? '');
    setObservacion(f.versiones[0]?.observacion ?? ''); setMotivo(''); setErrorGuardado('');
  }

  return <section className={styles.root} aria-label="Bitácora de asistencias">
    <h1>{esAlumno ? 'Mi bitácora de asistencias' : 'Bitácora de asistencias'}</h1>
    <p>{esAlumno ? 'Consultá tus clases, notas y observaciones.' : 'Registro y seguimiento de asistencias por clase.'} Sin registrar no cuenta como falta.</p>
    <div className={styles.filters}>
      <label>Fecha desde<input type="date" value={filtros.desde} max={filtros.hasta || undefined} onChange={e => setFiltros({...filtros,desde:e.target.value})}/></label>
      <label>Fecha hasta<input type="date" value={filtros.hasta} min={filtros.desde} onChange={e => setFiltros({...filtros,hasta:e.target.value})}/></label>
      <label>Materia<select value={filtros.materia} onChange={e => setFiltros({...filtros,materia:e.target.value})}><option value="">Todas las materias</option>{opciones('materia_id','materia').map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}</select></label>
      {!esAlumno && <label>Alumno<select value={filtros.alumno} onChange={e => setFiltros({...filtros,alumno:e.target.value})}><option value="">Todos los alumnos</option>{opciones('alumno_id','alumno').map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}</select></label>}
      {!turnoId && <label>Clase<select value={filtros.turno} onChange={e => setFiltros({...filtros,turno:e.target.value})}><option value="">Todas las clases</option>{opciones('turno_id','actividad').map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}</select></label>}
      <label>Estado<select value={filtros.estado} onChange={e => setFiltros({...filtros,estado:e.target.value})}><option value="">Todos los estados</option>{Object.entries(etiquetasAsistencia).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <div className={styles.filterActions}><button onClick={() => setFiltros(filtrosIniciales)}>Limpiar filtros</button><button className={styles.primary} disabled={cargando} onClick={() => void cargar()}>{cargando ? 'Actualizando…' : 'Actualizar'}</button></div>
    </div>
    {error && <div className={styles.alert} role="alert">{error}</div>}
    <div className={styles.stats}>{Object.entries(resumen).map(([k,v]) => <div className={styles.stat} key={k}><Estado estado={k as EstadoAsistencia}/><strong>{cargando ? '—' : v}</strong></div>)}</div>
    {cargando ? <div className={styles.empty} role="status">Cargando bitácora…</div> : error ? <div className={styles.empty}><strong>No se pudo consultar la bitácora</strong>Usá Actualizar para volver a intentarlo.</div> : !visibles.length ? <div className={styles.empty}><strong>{filas.length ? 'No hay resultados para estos filtros' : 'Todavía no hay clases para mostrar'}</strong>{filas.length ? 'Probá cambiar el rango de fechas o limpiar los filtros.' : 'Las clases aparecerán cuando tengas inscripciones disponibles.'}</div> :
      <div className={styles.tableBox}><div className={styles.tableScroll}><table><caption className="sr-only">Asistencias por inscripción, ordenadas por fecha y hora de clase</caption><thead><tr><th scope="col">Fecha</th><th scope="col">Horario</th><th scope="col">Materia / actividad</th>{!esAlumno && <th scope="col">Alumno</th>}<th scope="col">Estado</th><th scope="col">Nota / observación</th><th scope="col">Historial</th>{!esAlumno && <th scope="col">Acciones</th>}</tr></thead><tbody>
      {elementosPaginados.map(f => <tr key={f.inscripcion_id}>
        <td className={styles.dateCell}>{fechaLegible(f.fecha)}</td><td className={styles.dateCell}>{f.hora_inicio?.slice(0,5) ?? '—'}</td>
        <td className={styles.classCell}><strong>{f.materia}</strong><small>{f.actividad}</small></td>{!esAlumno && <td>{f.alumno}</td>}
        <td><Estado estado={estadoVigente(f)}/></td><td className={styles.noteCell}>{f.versiones[0]?.nota || '—'}{f.versiones[0]?.observacion && <small>{f.versiones[0].observacion}</small>}</td>
        <td>{f.versiones.length ? <details><summary>Ver historial ({f.versiones.length})</summary><div className={styles.history}>{f.versiones.map(v => <p key={v.id}><strong>Versión {v.version} · {etiquetasAsistencia[v.estado]}</strong><br/>{new Date(v.cargado_en).toLocaleString('es-AR',{timeZone:'America/Argentina/Buenos_Aires'})}<br/>Autor: {v.autor_id}{v.nota && <><br/>Nota: {v.nota}</>}{v.observacion && <><br/>Observación: {v.observacion}</>}{v.motivo && <><br/>Motivo: {v.motivo}</>}</p>)}</div></details> : <span style={{color:'#94a3b8'}}>Sin registros</span>}</td>
        {!esAlumno && <td>{f.editable && f.inscripcion_estado === 'confirmado' && !f.cancelada && f.hora_inicio && Date.parse(`${f.fecha}T${f.hora_inicio}-03:00`) <= ahora ? <button onClick={() => abrirRegistro(f)}>{f.versiones.length ? 'Corregir' : 'Registrar'}</button> : <span style={{color:'#94a3b8',fontSize:12}}>{f.cancelada ? 'Cancelada' : f.inscripcion_estado !== 'confirmado' ? 'Solo consulta' : 'Sin carga disponible'}</span>}</td>}
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
