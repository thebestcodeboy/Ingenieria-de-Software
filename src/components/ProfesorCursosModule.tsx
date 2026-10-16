'use client';

import { useCallback, useEffect, useState } from 'react';
import { listarAlumnosCursoProfesor, listarClasesParticularesProfesor, listarCursosProfesor, type AlumnoCursoProfesor, type CursoPortalProfesor } from '@/services/profesorPortal';
import styles from './ProfesorCursosModule.module.css';

function iniciales(nombre: string) {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean);
  return (palabras.length > 1 ? palabras[0][0] + palabras[1][0] : (palabras[0] ?? '?').slice(0, 2)).toUpperCase();
}

async function cargarTodo(): Promise<CursoPortalProfesor[]> {
  const [ingreso, particulares] = await Promise.all([
    listarCursosProfesor(),
    listarClasesParticularesProfesor(),
  ]);
  return [...ingreso.filter((curso) => curso.anotado), ...particulares];
}

export default function ProfesorCursosModule() {
  const [cursos, setCursos] = useState<CursoPortalProfesor[]>([]);
  const [vista, setVista] = useState<'ingreso' | 'particular'>('ingreso');
  const [seleccionado, setSeleccionado] = useState<CursoPortalProfesor | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alumnos, setAlumnos] = useState<AlumnoCursoProfesor[]>([]);
  const [cargandoAlumnos, setCargandoAlumnos] = useState(false);
  const [errorAlumnos, setErrorAlumnos] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setCursos(await cargarTodo());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los cursos asignados.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    let vigente = true;
    cargarTodo()
      .then((resultado) => {
        if (vigente) setCursos(resultado);
      })
      .catch((cause: unknown) => {
        if (vigente) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los cursos asignados.');
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, []);

  useEffect(() => {
    if (!seleccionado) return;
    let vigente = true;
    setAlumnos([]); setErrorAlumnos(''); setCargandoAlumnos(true);
    listarAlumnosCursoProfesor(seleccionado.curso_id, seleccionado.tipo)
      .then((v) => { if (vigente) setAlumnos(v); })
      .catch((e: unknown) => { if (vigente) setErrorAlumnos(e instanceof Error ? e.message : 'No se pudo cargar la nómina.'); })
      .finally(() => { if (vigente) setCargandoAlumnos(false); });
    return () => { vigente = false; };
  }, [seleccionado]);

  const cursosIngreso = cursos.filter((curso) => curso.tipo !== 'particular');
  const clasesParticulares = cursos.filter((curso) => curso.tipo === 'particular');
  const cursosVisibles = vista === 'particular' ? clasesParticulares : cursosIngreso;
  const banners = [styles.banner0, styles.banner1, styles.banner2, styles.banner3];

  useEffect(() => {
    if (!seleccionado) return;
    const cerrarConEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSeleccionado(null);
    };
    window.addEventListener('keydown', cerrarConEscape);
    return () => window.removeEventListener('keydown', cerrarConEscape);
  }, [seleccionado]);

  return (
    <section aria-labelledby="titulo-cursos-docente" className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 id="titulo-cursos-docente" className={styles.title}>{vista === 'particular' ? 'Mis clases particulares' : 'Mis cursos'}</h1>
          <p className={styles.subtitle}>{vista === 'particular' ? 'Consultá las clases particulares asignadas y sus alumnos.' : 'Consultá los cursos de ingreso que Mesa de Entrada te asignó.'}</p>
        </div>
        <button type="button" onClick={() => void cargar()} disabled={cargando} className={styles.refresh}>Actualizar</button>
      </header>

      <div className={styles.tabs} role="group" aria-label="Actividades docentes">
        <button type="button" aria-pressed={vista === 'ingreso'} onClick={() => setVista('ingreso')} className={`${styles.tab} ${vista === 'ingreso' ? styles.tabActive : ''}`}>
          Mis cursos <span>{cursosIngreso.length}</span>
        </button>
        <button type="button" aria-pressed={vista === 'particular'} onClick={() => setVista('particular')} className={`${styles.tab} ${vista === 'particular' ? styles.tabActive : ''}`}>
          Mis clases particulares <span>{clasesParticulares.length}</span>
        </button>
      </div>

      {error && <div role="alert" className={styles.error}>{error}</div>}

      {cargando ? (
        <div role="status" className={styles.state}>Cargando cursos...</div>
      ) : cursosVisibles.length === 0 ? (
        <div className={styles.state}>{vista === 'particular' ? 'Todavía no tenés clases particulares asignadas.' : 'Todavía no tenés cursos de ingreso asignados por Mesa de Entrada.'}</div>
      ) : (
        <>
          <p className={styles.count}>{cursosVisibles.length} {vista === 'particular' ? (cursosVisibles.length === 1 ? 'clase particular asignada' : 'clases particulares asignadas') : (cursosVisibles.length === 1 ? 'curso de ingreso asignado' : 'cursos de ingreso asignados')}</p>
          <div className={styles.list}>
            {cursosVisibles.map((curso, index) => (
              <article key={`${curso.tipo ?? 'ingreso'}-${curso.curso_id}`} className={styles.card}>
                <div className={`${styles.cardBanner} ${banners[index % banners.length]}`}>
                  <span className={styles.levelBadge}>{curso.tipo === 'particular' ? 'CLASE PARTICULAR' : 'CURSO DE INGRESO'}</span>
                  <span className={styles.enrollmentBadge}>{curso.cantidad_alumnos} {curso.cantidad_alumnos === 1 ? 'ALUMNO' : 'ALUMNOS'}</span>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardMain}>
                    <h2 className={styles.courseName}>{curso.nombre}</h2>
                    <p className={styles.description}>{curso.descripcion || 'Sin descripción registrada.'}</p>
                    {curso.materias.length > 0 ? (
                      <div className={styles.tags} aria-label="Materias del curso">
                        {curso.materias.map((materia) => <span key={materia} className={styles.tag}>{materia}</span>)}
                      </div>
                    ) : (
                      <p className={styles.noSubjects}>Sin materias registradas.</p>
                    )}
                  </div>
                  <button type="button" onClick={() => setSeleccionado(curso)} className={styles.detailButton} aria-label={`Ver alumnos de ${curso.nombre}`}>Ver alumnos</button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {seleccionado && (
        <div role="presentation" onMouseDown={() => setSeleccionado(null)} className={styles.backdrop}>
          <div role="dialog" aria-modal="true" aria-labelledby="detalle-curso-docente" onMouseDown={(event) => event.stopPropagation()} className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.modalLabel}>{seleccionado.tipo === 'particular' ? 'Clase particular' : 'Curso de ingreso'}</p>
                <h2 id="detalle-curso-docente" className={styles.modalTitle}>{seleccionado.nombre}</h2>
              </div>
              <button type="button" onClick={() => setSeleccionado(null)} className={styles.closeIcon} aria-label="Cerrar detalle">×</button>
            </div>
            <p className={styles.modalDescription}>{seleccionado.descripcion || 'Sin descripción registrada.'}</p>
            <div className={styles.modalSection}>
              <h3>Materias</h3>
              {seleccionado.materias.length > 0 ? (
                <div className={styles.tags}>
                  {seleccionado.materias.map((materia) => <span key={materia} className={styles.tag}>{materia}</span>)}
                </div>
              ) : (
                <p className={styles.noSubjects}>Sin materias registradas.</p>
              )}
            </div>
            <div className={styles.modalSection}>
                <h3>Alumnos inscriptos <span className={styles.modalCount}>{cargandoAlumnos ? seleccionado.cantidad_alumnos : alumnos.length}</span></h3>
              {cargandoAlumnos ? <p className={styles.noSubjects}>Cargando alumnos…</p> : errorAlumnos ? <p className={styles.error} role="alert">{errorAlumnos}</p> : alumnos.length === 0 ? <p className={styles.noSubjects}>Todavía no hay alumnos inscriptos.</p> : (
                <ul className={styles.students_list}>
                  {alumnos.map((a) => (
                    <li key={a.id} className={styles.alumno}>
                      <div className={styles.alumnoHeader}>
                        <span className={styles.alumnoAvatar} aria-hidden="true">{iniciales(`${a.nombre} ${a.apellido}`)}</span>
                        <div className={styles.alumnoIdentity}>
                          <strong>{a.apellido}, {a.nombre}</strong>
                          <span>{a.email || 'Correo no registrado'}</span>
                        </div>
                      </div>
                      <dl>
                        <div><dt>DNI</dt><dd>{a.dni ?? '—'}</dd></div>
                        <div><dt>Legajo</dt><dd>{a.legajo || '—'}</dd></div>
                        <div><dt>Teléfono</dt><dd>{a.telefono || '—'}</dd></div>
                        <div><dt>Dirección</dt><dd>{a.direccion || '—'}</dd></div>
                        <div className={styles.alumnoClases}><dt>Clases</dt><dd>{a.clases}</dd></div>
                      </dl>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button type="button" onClick={() => setSeleccionado(null)} className={styles.closeButton}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
