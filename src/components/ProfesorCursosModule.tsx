'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  anotarseCursoProfesor,
  listarCursosProfesor,
  type CursoPortalProfesor,
} from '@/services/profesorPortal';

export default function ProfesorCursosModule() {
  const [cursos, setCursos] = useState<CursoPortalProfesor[]>([]);
  const [seleccionado, setSeleccionado] = useState<CursoPortalProfesor | null>(null);
  const [cargando, setCargando] = useState(true);
  const [anotandoId, setAnotandoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const resultado = await listarCursosProfesor();
      setCursos(resultado);
      setSeleccionado((actual) =>
        actual ? resultado.find((curso) => curso.curso_id === actual.curso_id) ?? null : null,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los cursos.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    let vigente = true;

    listarCursosProfesor()
      .then((resultado) => {
        if (vigente) setCursos(resultado);
      })
      .catch((cause: unknown) => {
        if (vigente) {
          setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los cursos.');
        }
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, []);

  const misCursos = useMemo(() => cursos.filter((curso) => curso.anotado), [cursos]);
  const disponibles = useMemo(() => cursos.filter((curso) => !curso.anotado), [cursos]);

  async function anotarme(curso: CursoPortalProfesor) {
    setAnotandoId(curso.curso_id);
    setError(null);
    setExito(null);
    try {
      await anotarseCursoProfesor(curso.curso_id);
      setExito(`Te anotaste correctamente en ${curso.nombre}.`);
      await cargar();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo completar la inscripción.');
    } finally {
      setAnotandoId(null);
    }
  }

  function tarjeta(curso: CursoPortalProfesor, propio: boolean) {
    return (
      <article key={curso.curso_id} style={{ backgroundColor: '#ffffff', border: `1px solid ${propio ? '#bfdbfe' : '#e2e8f0'}`, borderRadius: '9px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '13px', boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px' }}>
          <div>
            <span style={{ color: propio ? '#1d4ed8' : '#64748b', fontSize: '10px', fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
              {propio ? 'Curso que dictás' : 'Disponible'}
            </span>
            <h3 style={{ color: '#0f172a', fontSize: '16px', margin: '5px 0 3px' }}>{curso.nombre}</h3>
            <p style={{ color: '#64748b', fontSize: '12px', lineHeight: 1.5, margin: 0 }}>
              {curso.descripcion || 'Sin descripción registrada.'}
            </p>
          </div>
          {propio && (
            <div aria-label={`${curso.cantidad_alumnos} alumnos`} style={{ backgroundColor: '#eff6ff', borderRadius: '8px', color: '#1d4ed8', flexShrink: 0, minWidth: '72px', padding: '9px 10px', textAlign: 'center' }}>
              <strong style={{ display: 'block', fontSize: '20px', lineHeight: 1 }}>{curso.cantidad_alumnos}</strong>
              <span style={{ fontSize: '10px', fontWeight: 700 }}>ALUMNOS</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {curso.materias.map((materia) => (
            <span key={materia} style={{ backgroundColor: '#f1f5f9', borderRadius: '999px', color: '#475569', fontSize: '10.5px', fontWeight: 600, padding: '4px 8px' }}>
              {materia}
            </span>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
          {propio ? (
            <button type="button" onClick={() => setSeleccionado(curso)} style={styles.botonSecundario}>
              Ver detalle
            </button>
          ) : (
            <button type="button" disabled={anotandoId === curso.curso_id} onClick={() => void anotarme(curso)} style={{ ...styles.botonPrimario, opacity: anotandoId === curso.curso_id ? 0.65 : 1 }}>
              {anotandoId === curso.curso_id ? 'Anotando...' : 'Anotarme al curso'}
            </button>
          )}
        </div>
      </article>
    );
  }

  return (
    <section aria-labelledby="titulo-cursos-docente">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', marginBottom: '22px' }}>
        <div>
          <span style={{ color: '#2563eb', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Portal docente</span>
          <h1 id="titulo-cursos-docente" style={{ color: '#0f172a', fontSize: '24px', margin: '5px 0 4px' }}>Mis cursos</h1>
          <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>Consultá los cursos que dictás y anotate en ofertas compatibles con tus materias.</p>
        </div>
        <button type="button" onClick={() => void cargar()} disabled={cargando} style={styles.botonSecundario}>Actualizar</button>
      </div>

      {error && <div role="alert" style={styles.error}>{error}</div>}
      {exito && <div role="status" style={styles.exito}>{exito}</div>}

      {cargando ? (
        <div style={styles.estado}>Cargando cursos...</div>
      ) : (
        <>
          <div style={styles.encabezadoSeccion}>
            <h2 style={styles.tituloSeccion}>Cursos que dictás</h2>
            <span style={styles.contador}>{misCursos.length}</span>
          </div>
          {misCursos.length === 0 ? (
            <div style={styles.estado}>Todavía no estás anotado en ningún curso.</div>
          ) : (
            <div style={styles.grilla}>{misCursos.map((curso) => tarjeta(curso, true))}</div>
          )}

          <div style={{ ...styles.encabezadoSeccion, marginTop: '30px' }}>
            <h2 style={styles.tituloSeccion}>Cursos disponibles</h2>
            <span style={styles.contador}>{disponibles.length}</span>
          </div>
          {disponibles.length === 0 ? (
            <div style={styles.estado}>No hay otros cursos compatibles con tus materias.</div>
          ) : (
            <div style={styles.grilla}>{disponibles.map((curso) => tarjeta(curso, false))}</div>
          )}
        </>
      )}

      {seleccionado && (
        <div role="presentation" onMouseDown={() => setSeleccionado(null)} style={styles.fondoModal}>
          <div role="dialog" aria-modal="true" aria-labelledby="detalle-curso-docente" onMouseDown={(event) => event.stopPropagation()} style={styles.modal}>
            <span style={{ color: '#2563eb', fontSize: '10px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Curso asignado</span>
            <h2 id="detalle-curso-docente" style={{ color: '#0f172a', fontSize: '20px', margin: '6px 0' }}>{seleccionado.nombre}</h2>
            <p style={{ color: '#64748b', fontSize: '13px', lineHeight: 1.55 }}>{seleccionado.descripcion || 'Sin descripción registrada.'}</p>
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '18px 0', padding: '16px' }}>
              <div><span style={styles.etiqueta}>Alumnos inscriptos</span><strong style={styles.valor}>{seleccionado.cantidad_alumnos}</strong></div>
              <div><span style={styles.etiqueta}>Materias relacionadas</span><strong style={styles.valor}>{seleccionado.materias.length}</strong></div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
              {seleccionado.materias.map((materia) => <span key={materia} style={{ backgroundColor: '#eff6ff', borderRadius: '999px', color: '#1d4ed8', fontSize: '11px', padding: '5px 9px' }}>{materia}</span>)}
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
  encabezadoSeccion: { alignItems: 'center', display: 'flex', gap: '8px', marginBottom: '11px' },
  tituloSeccion: { color: '#334155', fontSize: '14px', margin: 0 },
  contador: { backgroundColor: '#e2e8f0', borderRadius: '999px', color: '#475569', fontSize: '10px', fontWeight: 700, padding: '3px 7px' },
  estado: { backgroundColor: '#ffffff', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#64748b', fontSize: '13px', padding: '28px', textAlign: 'center' },
  error: { backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '7px', color: '#991b1b', fontSize: '12px', marginBottom: '16px', padding: '10px 12px' },
  exito: { backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '7px', color: '#166534', fontSize: '12px', marginBottom: '16px', padding: '10px 12px' },
  botonPrimario: { backgroundColor: '#0b1e33', border: 0, borderRadius: '6px', color: '#ffffff', cursor: 'pointer', fontSize: '12px', fontWeight: 700, padding: '9px 13px' },
  botonSecundario: { backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#334155', cursor: 'pointer', fontSize: '12px', fontWeight: 700, padding: '8px 12px' },
  fondoModal: { alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.55)', display: 'flex', inset: 0, justifyContent: 'center', padding: '24px', position: 'fixed', zIndex: 1000 },
  modal: { backgroundColor: '#ffffff', borderRadius: '10px', boxShadow: '0 24px 70px rgba(15,23,42,.24)', maxWidth: '510px', padding: '24px', width: '100%' },
  etiqueta: { color: '#64748b', display: 'block', fontSize: '10px', fontWeight: 700, marginBottom: '4px', textTransform: 'uppercase' },
  valor: { color: '#0f172a', display: 'block', fontSize: '22px' },
};
