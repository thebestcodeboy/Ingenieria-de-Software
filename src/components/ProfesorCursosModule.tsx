'use client';

import { useCallback, useEffect, useState } from 'react';
import { listarCursosProfesor, type CursoPortalProfesor } from '@/services/profesorPortal';
import styles from './ProfesorCursosModule.module.css';

export default function ProfesorCursosModule() {
  const [cursos, setCursos] = useState<CursoPortalProfesor[]>([]);
  const [seleccionado, setSeleccionado] = useState<CursoPortalProfesor | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          <div className={styles.grid}>
            {cursos.map((curso) => (
              <article key={curso.curso_id} className={styles.card}>
                <div className={styles.cardBody}>
                  <h2 className={styles.courseName}>{curso.nombre}</h2>
                  <p className={styles.description}>{curso.descripcion || 'Sin descripción registrada.'}</p>
                </div>
                <div className={styles.subjects}>
                  <h3 className={styles.subjectsTitle}>Materias</h3>
                  {curso.materias.length > 0 ? (
                    <div className={styles.tags}>
                      {curso.materias.map((materia) => <span key={materia} className={styles.tag}>{materia}</span>)}
                    </div>
                  ) : (
                    <p className={styles.noSubjects}>Sin materias registradas.</p>
                  )}
                </div>
                <div className={styles.cardFooter}>
                  <p className={styles.students}><strong>{curso.cantidad_alumnos}</strong> {curso.cantidad_alumnos === 1 ? 'alumno inscripto' : 'alumnos inscriptos'}</p>
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
            <div className={styles.modalStudents}>
              <span>Alumnos inscriptos</span>
              <strong>{seleccionado.cantidad_alumnos}</strong>
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
