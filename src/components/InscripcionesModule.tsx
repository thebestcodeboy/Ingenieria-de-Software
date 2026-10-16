'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { listarOpcionesInscripcion, inscribirAlumnoCursoAdministrativo, inscribirAlumnoClaseParticularAdministrativo, type OpcionesInscripcion } from '../services/inscripcionesAdmin';
import { filtrarAlumnos } from '../domain/busquedaAlumno';
import { useAuth } from '../context/AuthContext';
import styles from './InscripcionesModule.module.css';

const fecha = (valor: string) => valor.split('-').reverse().join('/');

export default function InscripcionesModule() {
  const { role } = useAuth();
  const [opciones, setOpciones] = useState<OpcionesInscripcion>({ alumnos: [], cursos: [], sesiones: [] });
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [indice, setIndice] = useState(-1);
  const [alumnoId, setAlumnoId] = useState('');
  const [cursoId, setCursoId] = useState('');
  const [tipoActividad, setTipoActividad] = useState<'curso' | 'particular'>('curso');
  const [claseParticularId, setClaseParticularId] = useState('');
  const [profesorId, setProfesorId] = useState('');
  const buscador = useRef<HTMLInputElement>(null);

  // Mesa de Entrada, Admin y Gerente tienen permiso pleno
  const puedeGestionarRol = useMemo(() => {
    if (!role) return true;
    const r = role.toLowerCase().trim();
    return r === 'mesa_entrada' || r.includes('mesa') || r.includes('admin') || r.includes('gerente');
  }, [role]);

  useEffect(() => {
    let vigente = true;
    listarOpcionesInscripcion()
      .then((data) => { if (vigente) setOpciones(data); })
      .catch((e) => { if (vigente) setError(e instanceof Error ? e.message : 'No se pudieron cargar las inscripciones.'); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, []);

  const alumnos = filtrarAlumnos(opciones.alumnos, busqueda).slice(0, 30);
  const opcionesActividad = tipoActividad === 'curso' ? opciones.cursos : (opciones.clases_particulares || []);
  const sesionesCurso = tipoActividad === 'curso'
    ? opciones.sesiones.filter((s) => s.curso_id === cursoId)
    : (opciones.sesiones_particulares || []).filter((s) => s.clase_particular_id === claseParticularId);
  const docentes = [...new Map(sesionesCurso.map((s) => [s.profesor_id, s.docente])).entries()];
  const sesiones = sesionesCurso.filter((s) => s.profesor_id === profesorId);
  const alumno = opciones.alumnos.find((a) => a.id === alumnoId);
  const curso = opciones.cursos.find((c) => c.id === cursoId);
  const claseParticular = opciones.clases_particulares?.find((c) => c.id === claseParticularId);
  const actividadId = tipoActividad === 'curso' ? cursoId : claseParticularId;
  const actividadNombre = tipoActividad === 'curso' ? curso?.nombre : claseParticular?.nombre;
  const sinCupo = sesiones.some((s) => !s.cupo_maximo || s.cupo_maximo <= 0);
  const completas = sesiones.filter((s) => !!s.cupo_maximo && s.confirmados >= s.cupo_maximo).length;
  const puedeConfirmar = !!alumno && !!sesiones.length && !sinCupo && !guardando && puedeGestionarRol;

  function elegirAlumno(id: string) {
    const elegido = opciones.alumnos.find((a) => a.id === id);
    if (!elegido) return;
    setAlumnoId(id);
    setBusqueda(elegido.apellido + ', ' + elegido.nombre);
    setAbierto(false);
    setIndice(-1);
    setResultado('');
    setError('');
    buscador.current?.focus();
  }

  async function confirmar(event: React.FormEvent) {
    event.preventDefault();
    if (!puedeConfirmar) return;
    setGuardando(true);
    setError('');
    setResultado('');
    try {
      const filas = tipoActividad === 'curso'
        ? await inscribirAlumnoCursoAdministrativo(cursoId, profesorId, alumnoId)
        : await inscribirAlumnoClaseParticularAdministrativo(claseParticularId, profesorId, alumnoId);
      const confirmadas = filas.filter((f) => f.estado === 'confirmado').length;
      const espera = filas.filter((f) => f.estado === 'en_espera').length;
      setResultado(`Inscripción de ${alumno?.apellido}, ${alumno?.nombre} en ${actividadNombre}: ${confirmadas} clases confirmadas y ${espera} en lista de espera.`);
      try {
        setOpciones(await listarOpcionesInscripcion());
      } catch {
        setError('La inscripción se guardó, pero no se pudieron actualizar los cupos. Recargá la pantalla.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la inscripción.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className={styles.module} style={{ maxWidth: '100%' }}>
      <header className={styles.header}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a' }}>Inscripciones</h1>
        <p style={{ fontSize: '14.5px', color: '#64748b' }}>Registrá al alumno en un curso de ingreso o una clase particular y revisá las fechas antes de confirmar.</p>
      </header>

      {!puedeGestionarRol && (
        <div role="alert" className={styles.error}>
          No tenés permiso para gestionar inscripciones.
        </div>
      )}

      {error && <div role="alert" className={styles.error}>{error}</div>}
      {resultado && <div role="status" className={styles.success}>{resultado}</div>}

      {cargando ? (
        <div className={styles.card} role="status">Cargando alumnos y cursos…</div>
      ) : (
        <form onSubmit={confirmar}>
          <fieldset disabled={guardando || !puedeGestionarRol} className={styles.layout}>
            <div className={styles.card}>
              <h2><span className={styles.step}>1</span> Alumno</h2>
              <label htmlFor="buscar-alumno" className={styles.label}>Buscar alumno <span>*</span></label>
              <p id="ayuda-alumno" className={styles.help}>Escribí nombre, apellido, DNI o legajo y seleccioná un resultado.</p>
              <div className={styles.search} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setAbierto(false); }}>
                <input
                  ref={buscador}
                  id="buscar-alumno"
                  role="combobox"
                  autoComplete="off"
                  aria-autocomplete="list"
                  aria-expanded={abierto && !alumno}
                  aria-controls="resultados-alumnos"
                  aria-activedescendant={abierto && indice >= 0 && alumnos[indice] ? 'alumno-' + alumnos[indice].id : undefined}
                  aria-describedby="ayuda-alumno"
                  value={busqueda}
                  placeholder="Buscar alumno…"
                  onFocus={() => { if (!alumno) setAbierto(true); }}
                  onChange={(e) => { setBusqueda(e.target.value); setAlumnoId(''); setAbierto(true); setIndice(-1); setResultado(''); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') { setAbierto(false); setIndice(-1); return; }
                    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                      e.preventDefault(); setAbierto(true);
                      setIndice((i) => alumnos.length ? (e.key === 'ArrowDown' ? Math.min(i + 1, alumnos.length - 1) : Math.max(i - 1, 0)) : -1);
                    }
                    if (e.key === 'Enter' && !alumno) {
                      e.preventDefault();
                      if (abierto && indice >= 0 && alumnos[indice]) elegirAlumno(alumnos[indice].id);
                    }
                  }}
                />
                {abierto && !alumno && (
                  <div id="resultados-alumnos" role="listbox" aria-label="Alumnos encontrados" className={styles.results}>
                    {alumnos.map((a, i) => (
                      <div
                        key={a.id}
                        id={'alumno-' + a.id}
                        role="option"
                        aria-selected={indice === i}
                        className={indice === i ? styles.highlight : styles.option}
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseEnter={() => setIndice(i)}
                        onClick={() => elegirAlumno(a.id)}
                      >
                        <strong>{a.apellido}, {a.nombre}</strong>
                        <small>{a.dni ? 'DNI ' + a.dni : 'DNI no informado'}{a.legajo ? ' · ' + a.legajo : ''}</small>
                      </div>
                    ))}
                    {!alumnos.length && <p className={styles.empty}>No encontramos alumnos activos con esos datos.</p>}
                    {alumnos.length === 30 && <p className={styles.help}>Seguí escribiendo para precisar la búsqueda.</p>}
                  </div>
                )}
              </div>

              {alumno && (
                <div className={styles.selected}>
                  <div>
                    <small>Alumno seleccionado</small>
                    <strong>{alumno.apellido}, {alumno.nombre}</strong>
                    <small>{alumno.dni ? 'DNI ' + alumno.dni : ''}{alumno.legajo ? ' · ' + alumno.legajo : ''}</small>
                  </div>
                  <button type="button" className={styles.link} onClick={() => { setAlumnoId(''); setBusqueda(''); setAbierto(true); setIndice(-1); setResultado(''); buscador.current?.focus(); }}>
                    Cambiar
                  </button>
                </div>
              )}

              <h2 className={styles.secondStep}><span className={styles.step}>2</span> Actividad y docente</h2>
              <label htmlFor="tipo-actividad-inscripcion" className={styles.label}>Tipo de actividad <span>*</span></label>
              <select id="tipo-actividad-inscripcion" value={tipoActividad} onChange={(e) => { setTipoActividad(e.target.value as 'curso' | 'particular'); setCursoId(''); setClaseParticularId(''); setProfesorId(''); setResultado(''); }}>
                <option value="curso">Curso de ingreso</option><option value="particular">Clase particular</option>
              </select>
              <label htmlFor="curso-inscripcion" className={styles.label}>{tipoActividad === 'curso' ? 'Curso de ingreso' : 'Clase particular'} <span>*</span></label>
              <select id="curso-inscripcion" required value={actividadId} onMouseDown={(e) => { if (window.innerHeight - e.currentTarget.getBoundingClientRect().bottom < 420) e.currentTarget.scrollIntoView({ block: 'start' }); }} onFocus={(e) => { if (window.innerHeight - e.currentTarget.getBoundingClientRect().bottom < 420) e.currentTarget.scrollIntoView({ block: 'start' }); }} onChange={(e) => { tipoActividad === 'curso' ? setCursoId(e.target.value) : setClaseParticularId(e.target.value); setProfesorId(''); setResultado(''); }}>
                <option value="">Seleccioná {tipoActividad === 'curso' ? 'un curso' : 'una clase particular'}</option>
                {opcionesActividad.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              {!opcionesActividad.length && <p className={styles.help}>No hay {tipoActividad === 'curso' ? 'cursos activos con período vigente' : 'clases particulares activas con turnos futuros'} disponibles.</p>}
              {curso && <p className={styles.period}>Período del curso: {fecha(curso.fecha_inicio)} al {fecha(curso.fecha_fin)}</p>}
              
              <label htmlFor="docente-inscripcion" className={styles.label}>Docente <span>*</span></label>
              <select id="docente-inscripcion" required disabled={!actividadId || guardando} value={profesorId} onChange={(e) => { setProfesorId(e.target.value); setResultado(''); }}>
                <option value="">Seleccioná un docente</option>
                {docentes.map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
              </select>
              {actividadId && !docentes.length && <p className={styles.help}>No hay fechas futuras con docentes activos para esta actividad.</p>}
            </div>

            <aside className={styles.card}>
              <h2><span className={styles.step}>3</span> Resumen de inscripción</h2>
              <dl className={styles.summary}>
                <dt>Alumno</dt><dd>{alumno ? alumno.apellido + ', ' + alumno.nombre : 'Pendiente de selección'}</dd>
                <dt>{tipoActividad === 'curso' ? 'Curso' : 'Clase particular'}</dt><dd>{actividadNombre || 'Pendiente de selección'}</dd>
                <dt>Docente</dt><dd>{docentes.find(([id]) => id === profesorId)?.[1] || 'Pendiente de selección'}</dd>
              </dl>
              <div className={styles.stats}>
                <div><strong>{sesiones.length}</strong><span>Clases incluidas</span></div>
                <div><strong>{completas}</strong><span>Sin vacantes</span></div>
              </div>
              <p className={styles.help}>Las clases sin vacantes quedan en lista de espera. Las inscripciones existentes se conservan sin duplicarse.</p>
              {sinCupo && <p role="alert" className={styles.error}>Configurá el cupo de todas las clases antes de confirmar.</p>}
              <button type="submit" className={styles.confirm} disabled={!puedeConfirmar}>
                {guardando ? 'Guardando inscripción…' : 'Confirmar inscripción'}
              </button>
              {!alumno && <p className={styles.help}>Seleccioná un alumno del buscador para continuar.</p>}
            </aside>

            <div className={styles.sessions}>
              <div className={styles.tableHeader}>
                <h2>Clases incluidas</h2>
                <span>{sesiones.length} sesiones</span>
              </div>
              {!sesiones.length ? (
                <p className={styles.empty}>Seleccioná una actividad y un docente para ver las fechas, horarios y vacantes.</p>
              ) : (
                <div className={styles.tableScroll}>
                  <table>
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Horario</th>
                        <th>Materia</th>
                        <th style={{ textAlign: 'center' }}>Disponibilidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sesiones.map((s) => {
                        const vacantes = Math.max(0, (s.cupo_maximo || 0) - s.confirmados);
                        return (
                          <tr key={s.id}>
                            <td style={{ color: '#0f172a', fontWeight: 600 }}>{fecha(s.fecha)}</td>
                            <td style={{ color: '#334155' }}>{s.hora_inicio.slice(0, 5)} – {s.hora_fin.slice(0, 5)}</td>
                            <td style={{ color: '#0b1e33', fontWeight: 600 }}>{s.materia || 'Sin materia'}</td>
                            <td style={{ textAlign: 'center' }}>
                              <span style={{
                                display: 'inline-block',
                                padding: '4px 10px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 700,
                                backgroundColor: !s.cupo_maximo ? '#fff7ed' : vacantes ? '#f0fdf4' : '#fff7ed',
                                color: !s.cupo_maximo ? '#9a3412' : vacantes ? '#15803d' : '#9a3412',
                                border: `1px solid ${!s.cupo_maximo ? '#fed7aa' : vacantes ? '#bbf7d0' : '#fed7aa'}`
                              }}>
                                {!s.cupo_maximo ? 'Cupo sin configurar' : vacantes ? `${vacantes} vacantes` : 'Lista de espera'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </fieldset>
        </form>
      )}
    </section>
  );
}
