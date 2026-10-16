'use client';

import { useCallback, useEffect, useState } from 'react';
import { listarAlumnosCursoProfesor, listarCursosProfesor, type AlumnoCursoProfesor, type CursoPortalProfesor } from '@/services/profesorPortal';
import styles from './ProfesorCursosModule.module.css';

function iniciales(nombre: string) {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean);
  return (palabras.length > 1 ? palabras[0][0] + palabras[1][0] : (palabras[0] ?? '?').slice(0, 2)).toUpperCase();
}

export default function ProfesorCursosModule() {
  const [cursos, setCursos] = useState<CursoPortalProfesor[]>([]);
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
      const resultado = await listarCursosProfesor();
      setCursos(resultado.filter((curso) => curso.anotado));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los cursos asignados.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    let vigente = true;
    listarCursosProfesor()
      .then((resultado) => {
        if (vigente) setCursos(resultado.filter((curso) => curso.anotado));
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
    listarAlumnosCursoProfesor(seleccionado.curso_id)
      .then((v) => { if (vigente) setAlumnos(v); })
      .catch((e: unknown) => { if (vigente) setErrorAlumnos(e instanceof Error ? e.message : 'No se pudo cargar la nómina.'); })
      .finally(() => { if (vigente) setCargandoAlumnos(false); });
    return () => { vigente = false; };
  }, [seleccionado]);

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
          <h1 id="titulo-cursos-docente" className={styles.title}>Mis cursos</h1>
          <p className={styles.subtitle}>Consultá los cursos que Mesa de Entrada te asignó.</p>
        </div>
        <button type="button" onClick={() => void cargar()} disabled={cargando} className={styles.refresh}>Actualizar</button>
      </header>

      {error && <div role="alert" className={styles.error}>{error}</div>}

      {cargando ? (
        <div role="status" className={styles.state}>Cargando cursos...</div>
      ) : cursos.length === 0 ? (
        <div className={styles.state}>Todavía no tenés cursos asignados por Mesa de Entrada.</div>
      ) : (
        <>
          <p className={styles.count}>{cursos.length} {cursos.length === 1 ? 'curso asignado' : 'cursos asignados'}</p>
          <div className={styles.list}>
            {cursos.map((curso) => (
              <article key={curso.curso_id} className={styles.card}>
                <div className={styles.avatar} aria-hidden="true">{iniciales(curso.nombre)}</div>
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
                <div className={styles.cardSide}>
                  <p className={styles.students}><strong>{curso.cantidad_alumnos}</strong><span>{curso.cantidad_alumnos === 1 ? 'alumno inscripto' : 'alumnos inscriptos'}</span></p>
                  <button type="button" onClick={() => setSeleccionado(curso)} className={styles.detailButton} aria-label={`Ver detalle de ${curso.nombre}`}>Ver detalle</button>
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
                <p className={styles.modalLabel}>Detalle del curso</p>
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
              <h3>Alumnos inscriptos ({cargandoAlumnos ? seleccionado.cantidad_alumnos : alumnos.length})</h3>
              {cargandoAlumnos ? <p className={styles.noSubjects}>Cargando alumnos…</p> : errorAlumnos ? <p className={styles.error} role="alert">{errorAlumnos}</p> : alumnos.length === 0 ? <p className={styles.noSubjects}>Todavía no hay alumnos inscriptos.</p> : (
                <ul className={styles.students_list}>
                  {alumnos.map((a) => (
                    <li key={a.id} className={styles.alumno}>
                      <strong>{a.apellido}, {a.nombre}</strong>
                      <dl>
                        <div><dt>DNI</dt><dd>{a.dni ?? '—'}</dd></div>
                        <div><dt>Legajo</dt><dd>{a.legajo || '—'}</dd></div>
                        <div><dt>Email</dt><dd>{a.email || '—'}</dd></div>
                        <div><dt>Teléfono</dt><dd>{a.telefono || '—'}</dd></div>
                        <div><dt>Dirección</dt><dd>{a.direccion || '—'}</dd></div>
                        <div><dt>Clases</dt><dd>{a.clases}</dd></div>
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
