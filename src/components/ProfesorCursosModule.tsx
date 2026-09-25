'use client';

import { useCallback, useEffect, useState } from 'react';
import { listarCursosProfesor, type CursoPortalProfesor } from '@/services/profesorPortal';

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

  return (
    <section aria-labelledby="titulo-cursos-docente">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', marginBottom: '22px' }}>
        <div>
          <span style={{ color: '#2563eb', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Portal docente</span>
          <h1 id="titulo-cursos-docente" style={{ color: '#0f172a', fontSize: '24px', margin: '5px 0 4px' }}>Mis cursos</h1>
          <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>Consultá los cursos que Mesa de Entrada te asignó.</p>
        </div>
        <button type="button" onClick={() => void cargar()} disabled={cargando} style={styles.botonSecundario}>Actualizar</button>
      </div>

      {error && <div role="alert" style={styles.error}>{error}</div>}

      {cargando ? (
        <div style={styles.estado}>Cargando cursos...</div>
      ) : cursos.length === 0 ? (
        <div style={styles.estado}>Todavía no tenés cursos asignados por Mesa de Entrada.</div>
      ) : (
        <div style={styles.grilla}>
          {cursos.map((curso) => (
            <article key={curso.curso_id} style={styles.tarjeta}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px' }}>
                <div>
                  <span style={styles.sobretitulo}>Curso asignado</span>
                  <h2 style={{ color: '#0f172a', fontSize: '16px', margin: '5px 0 3px' }}>{curso.nombre}</h2>
                  <p style={{ color: '#64748b', fontSize: '12px', lineHeight: 1.5, margin: 0 }}>{curso.descripcion || 'Sin descripción registrada.'}</p>
                </div>
                <div aria-label={`${curso.cantidad_alumnos} alumnos`} style={styles.alumnos}>
                  <strong style={{ display: 'block', fontSize: '20px', lineHeight: 1 }}>{curso.cantidad_alumnos}</strong>
                  <span style={{ fontSize: '10px', fontWeight: 700 }}>ALUMNOS</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {curso.materias.map((materia) => <span key={materia} style={styles.materia}>{materia}</span>)}
              </div>
              <button type="button" onClick={() => setSeleccionado(curso)} style={styles.botonSecundario}>Ver detalle</button>
            </article>
          ))}
        </div>
      )}

      {seleccionado && (
        <div role="presentation" onMouseDown={() => setSeleccionado(null)} style={styles.fondoModal}>
          <div role="dialog" aria-modal="true" aria-labelledby="detalle-curso-docente" onMouseDown={(event) => event.stopPropagation()} style={styles.modal}>
            <span style={styles.sobretitulo}>Curso asignado por Mesa de Entrada</span>
            <h2 id="detalle-curso-docente" style={{ color: '#0f172a', fontSize: '20px', margin: '6px 0' }}>{seleccionado.nombre}</h2>
            <p style={{ color: '#64748b', fontSize: '13px' }}>{seleccionado.descripcion || 'Sin descripción registrada.'}</p>
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', margin: '18px 0' }}>
              <span style={styles.etiqueta}>Alumnos inscriptos</span>
              <strong style={{ color: '#0f172a', display: 'block', fontSize: '22px' }}>{seleccionado.cantidad_alumnos}</strong>
            </div>
            <button type="button" onClick={() => setSeleccionado(null)} style={styles.botonPrimario}>Cerrar</button>
          </div>
        </div>
      )}
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  grilla: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' },
  tarjeta: { backgroundColor: '#ffffff', border: '1px solid #bfdbfe', borderRadius: '9px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '13px' },
  sobretitulo: { color: '#1d4ed8', fontSize: '10px', fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase' },
  alumnos: { backgroundColor: '#eff6ff', borderRadius: '8px', color: '#1d4ed8', flexShrink: 0, minWidth: '72px', padding: '9px 10px', textAlign: 'center' },
  materia: { backgroundColor: '#f1f5f9', borderRadius: '999px', color: '#475569', fontSize: '10.5px', fontWeight: 600, padding: '4px 8px' },
  estado: { backgroundColor: '#ffffff', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#64748b', fontSize: '13px', padding: '28px', textAlign: 'center' },
  error: { backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '7px', color: '#991b1b', fontSize: '12px', marginBottom: '16px', padding: '10px 12px' },
  botonPrimario: { backgroundColor: '#0b1e33', border: 0, borderRadius: '6px', color: '#ffffff', cursor: 'pointer', fontSize: '12px', fontWeight: 700, padding: '9px 13px' },
  botonSecundario: { alignSelf: 'flex-start', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#334155', cursor: 'pointer', fontSize: '12px', fontWeight: 700, padding: '8px 12px' },
  fondoModal: { alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.55)', display: 'flex', inset: 0, justifyContent: 'center', padding: '24px', position: 'fixed', zIndex: 1000 },
  modal: { backgroundColor: '#ffffff', borderRadius: '10px', boxShadow: '0 24px 70px rgba(15,23,42,.24)', maxWidth: '510px', padding: '24px', width: '100%' },
  etiqueta: { color: '#64748b', display: 'block', fontSize: '10px', fontWeight: 700, marginBottom: '4px', textTransform: 'uppercase' },
};
