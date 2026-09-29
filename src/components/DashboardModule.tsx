'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ResumenDashboard } from '../domain/dashboard';
import { getDashboardSummary } from '../services/dashboard';

const VACIO: ResumenDashboard = {
  totalAlumnos: 0,
  totalProfesores: 0,
  totalMaterias: 0,
  totalCursos: 0,
  totalAulas: 0,
  totalTurnos: 0,
  clasesHoy: 0,
  aulasUtilizadasHoy: 0,
  totalInscriptos: 0,
  cupoTotal: 0,
  turnosDisponibles: 0,
  turnosCompletos: 0,
  turnosSinCupo: 0,
  hayActividad: false,
};

const tarjetas = [
  { campo: 'totalAlumnos', etiqueta: 'Alumnos activos', color: '#2563eb', fondo: '#eff6ff' },
  { campo: 'totalProfesores', etiqueta: 'Profesores activos', color: '#7c3aed', fondo: '#f5f3ff' },
  { campo: 'totalMaterias', etiqueta: 'Materias registradas', color: '#0891b2', fondo: '#ecfeff' },
  { campo: 'totalCursos', etiqueta: 'Cursos registrados', color: '#059669', fondo: '#ecfdf5' },
  { campo: 'totalAulas', etiqueta: 'Aulas activas', color: '#d97706', fondo: '#fffbeb' },
] as const;

function porcentaje(valor: number, maximo: number): number {
  if (maximo <= 0) return 0;
  return Math.min(100, Math.round((valor / maximo) * 100));
}

export default function DashboardModule() {
  const [resumen, setResumen] = useState<ResumenDashboard>(VACIO);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState('');
  const [actualizado, setActualizado] = useState<Date | null>(null);

  const cargar = useCallback(async (esActualizacion = false) => {
    if (esActualizacion) setActualizando(true);
    setError('');
    try {
      const datos = await getDashboardSummary();
      setResumen(datos);
      setActualizado(new Date());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los indicadores.');
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, []);

  useEffect(() => {
    getDashboardSummary()
      .then((datos) => {
        setResumen(datos);
        setActualizado(new Date());
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los indicadores.');
      })
      .finally(() => setCargando(false));
  }, []);

  if (cargando) {
    return (
      <section aria-busy="true" aria-live="polite" style={styles.estadoCentral}>
        <div style={styles.spinner} />
        <strong>Cargando indicadores…</strong>
        <span style={styles.textoSecundario}>Consultando la actividad académica actual.</span>
      </section>
    );
  }

  if (error && !actualizado) {
    return (
      <section role="alert" style={{ ...styles.estadoCentral, borderColor: '#fecaca', backgroundColor: '#fff7f7' }}>
        <strong style={{ color: '#b91c1c' }}>No pudimos cargar el panel</strong>
        <span style={styles.textoSecundario}>{error}</span>
        <button type="button" onClick={() => void cargar()} style={styles.botonPrimario}>Reintentar</button>
      </section>
    );
  }

  const maximoOcupacion = Math.max(resumen.cupoTotal, resumen.totalInscriptos, 1);
  const totalEstados = resumen.turnosDisponibles + resumen.turnosCompletos + resumen.turnosSinCupo;

  return (
    <section aria-labelledby="titulo-dashboard">
      <header style={styles.cabecera}>
        <div>
          <p style={styles.sobretitulo}>Mesa de Entrada · Resumen institucional</p>
          <h1 id="titulo-dashboard" style={styles.titulo}>Panel de indicadores</h1>
          <p style={styles.textoSecundario}>
            {actualizado
              ? `Actualizado ${actualizado.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}`
              : 'Sin actualización registrada'}
          </p>
        </div>
        <button type="button" onClick={() => void cargar(true)} disabled={actualizando} style={{ ...styles.botonPrimario, opacity: actualizando ? 0.65 : 1 }}>
          {actualizando ? 'Actualizando…' : '↻ Actualizar'}
        </button>
      </header>

      {error && (
        <div role="alert" style={styles.avisoError}>
          <span>{error} Se conservan los últimos datos cargados.</span>
          <button type="button" onClick={() => void cargar(true)} style={styles.botonTexto}>Reintentar</button>
        </div>
      )}

      {!resumen.hayActividad ? (
        <div style={styles.estadoCentral}>
          <strong>Todavía no hay actividad para mostrar</strong>
          <span style={styles.textoSecundario}>Los indicadores aparecerán cuando existan registros académicos.</span>
        </div>
      ) : (
        <>
          <div style={styles.grillaTarjetas}>
            {tarjetas.map(({ campo, etiqueta, color, fondo }) => (
              <article key={campo} style={styles.tarjeta}>
                <div aria-hidden="true" style={{ ...styles.iconoTarjeta, color, backgroundColor: fondo }}>●</div>
                <div>
                  <div style={styles.valorTarjeta}>{resumen[campo]}</div>
                  <div style={styles.etiquetaTarjeta}>{etiqueta}</div>
                </div>
              </article>
            ))}
          </div>

          <div style={styles.grillaActividad}>
            <article style={{ ...styles.tarjeta, alignItems: 'center' }}>
              <div>
                <div style={styles.etiquetaTarjeta}>Turnos totales</div>
                <div style={styles.valorGrande}>{resumen.totalTurnos}</div>
                <div style={styles.nota}>Incluye el registro histórico de turnos.</div>
              </div>
            </article>
            <article style={{ ...styles.tarjeta, alignItems: 'center', borderLeft: '4px solid #2563eb' }}>
              <div>
                <div style={styles.etiquetaTarjeta}>Clases programadas hoy</div>
                <div style={styles.valorGrande}>{resumen.clasesHoy}</div>
                <div style={styles.nota}>No incluye clases canceladas.</div>
              </div>
            </article>
            <article style={{ ...styles.tarjeta, alignItems: 'center', borderLeft: '4px solid #d97706' }}>
              <div>
                <div style={styles.etiquetaTarjeta}>Aulas utilizadas hoy</div>
                <div style={styles.valorGrande}>{resumen.aulasUtilizadasHoy}</div>
                <div style={styles.nota}>Aulas distintas con clases vigentes asignadas.</div>
              </div>
            </article>
          </div>

          <div style={styles.grillaPaneles}>
            <article style={styles.panel}>
              <h2 style={styles.tituloPanel}>Ocupación general</h2>
              <p style={styles.textoSecundario}>Alumnos inscriptos frente a los cupos definidos.</p>
              <div style={styles.filaMetrica}>
                <strong>{resumen.totalInscriptos} inscriptos</strong>
                <span>{porcentaje(resumen.totalInscriptos, resumen.cupoTotal)}% del cupo</span>
              </div>
              <div style={styles.pista} aria-label={`${resumen.totalInscriptos} alumnos inscriptos`}>
                <div style={{ ...styles.barra, width: `${porcentaje(resumen.totalInscriptos, maximoOcupacion)}%`, backgroundColor: '#2563eb' }} />
              </div>
              <div style={styles.filaMetrica}>
                <strong>{resumen.cupoTotal} cupos totales</strong>
                <span>{Math.max(0, resumen.cupoTotal - resumen.totalInscriptos)} lugares libres</span>
              </div>
              <div style={styles.pista} aria-label={`${resumen.cupoTotal} cupos totales`}>
                <div style={{ ...styles.barra, width: `${porcentaje(resumen.cupoTotal, maximoOcupacion)}%`, backgroundColor: '#94a3b8' }} />
              </div>
              {resumen.cupoTotal === 0 && <p style={styles.nota}>Aún no hay cupos definidos para comparar.</p>}
            </article>

            <article style={styles.panel}>
              <h2 style={styles.tituloPanel}>Estado de los turnos</h2>
              <p style={styles.textoSecundario}>Disponibilidad actual, sin contar turnos cancelados.</p>
              <div style={styles.barraEstados} aria-label={`${totalEstados} turnos clasificados`}>
                {totalEstados > 0 && <>
                  <div title="Disponibles" style={{ width: `${(resumen.turnosDisponibles / totalEstados) * 100}%`, backgroundColor: '#10b981' }} />
                  <div title="Completos" style={{ width: `${(resumen.turnosCompletos / totalEstados) * 100}%`, backgroundColor: '#ef4444' }} />
                  <div title="Sin cupo" style={{ width: `${(resumen.turnosSinCupo / totalEstados) * 100}%`, backgroundColor: '#f59e0b' }} />
                </>}
              </div>
              <div style={styles.listaEstados}>
                <Estado color="#10b981" etiqueta="Disponibles" valor={resumen.turnosDisponibles} />
                <Estado color="#ef4444" etiqueta="Completos" valor={resumen.turnosCompletos} />
                <Estado color="#f59e0b" etiqueta="Sin cupo definido" valor={resumen.turnosSinCupo} />
              </div>
              {totalEstados === 0 && <p style={styles.nota}>No hay turnos vigentes para clasificar.</p>}
            </article>
          </div>
        </>
      )}
    </section>
  );
}

function Estado({ color, etiqueta, valor }: { color: string; etiqueta: string; valor: number }) {
  return <div style={styles.estadoFila}><span style={{ ...styles.punto, backgroundColor: color }} /><span style={{ flex: 1 }}>{etiqueta}</span><strong>{valor}</strong></div>;
}

const styles: Record<string, React.CSSProperties> = {
  cabecera: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', marginBottom: '24px' },
  sobretitulo: { margin: '0 0 6px', color: '#2563eb', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' },
  titulo: { margin: 0, color: '#0f172a', fontSize: '28px', lineHeight: 1.2 },
  textoSecundario: { color: '#64748b', fontSize: '13px', lineHeight: 1.5 },
  botonPrimario: { border: 0, borderRadius: '7px', padding: '10px 15px', backgroundColor: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer' },
  botonTexto: { border: 0, background: 'transparent', color: '#b91c1c', fontWeight: 700, cursor: 'pointer' },
  avisoError: { display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '18px', padding: '12px 14px', border: '1px solid #fecaca', borderRadius: '7px', backgroundColor: '#fff7f7', color: '#b91c1c', fontSize: '13px' },
  estadoCentral: { minHeight: '280px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '10px', padding: '40px', border: '1px solid #e2e8f0', borderRadius: '10px', backgroundColor: '#fff', textAlign: 'center' },
  spinner: { width: '28px', height: '28px', border: '3px solid #dbeafe', borderTopColor: '#2563eb', borderRadius: '50%' },
  grillaTarjetas: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '16px', marginBottom: '16px' },
  grillaActividad: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '16px' },
  grillaPaneles: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: '16px' },
  tarjeta: { display: 'flex', gap: '14px', minHeight: '112px', padding: '20px', border: '1px solid #e2e8f0', borderRadius: '10px', backgroundColor: '#fff', boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)' },
  iconoTarjeta: { width: '42px', height: '42px', display: 'grid', placeItems: 'center', flexShrink: 0, borderRadius: '9px', fontSize: '15px' },
  valorTarjeta: { color: '#0f172a', fontSize: '26px', fontWeight: 800, lineHeight: 1.1 },
  valorGrande: { marginTop: '5px', color: '#0f172a', fontSize: '34px', fontWeight: 800 },
  etiquetaTarjeta: { marginTop: '5px', color: '#475569', fontSize: '13px', fontWeight: 600 },
  nota: { margin: '7px 0 0', color: '#94a3b8', fontSize: '12px' },
  panel: { padding: '22px', border: '1px solid #e2e8f0', borderRadius: '10px', backgroundColor: '#fff', boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)' },
  tituloPanel: { margin: '0 0 4px', color: '#0f172a', fontSize: '17px' },
  filaMetrica: { display: 'flex', justifyContent: 'space-between', gap: '12px', margin: '20px 0 7px', color: '#334155', fontSize: '12px' },
  pista: { height: '10px', overflow: 'hidden', borderRadius: '999px', backgroundColor: '#e2e8f0' },
  barra: { height: '100%', minWidth: 0, borderRadius: '999px', transition: 'width 250ms ease' },
  barraEstados: { display: 'flex', height: '14px', overflow: 'hidden', margin: '24px 0 20px', borderRadius: '999px', backgroundColor: '#e2e8f0' },
  listaEstados: { display: 'flex', flexDirection: 'column', gap: '12px' },
  estadoFila: { display: 'flex', alignItems: 'center', gap: '9px', color: '#475569', fontSize: '13px' },
  punto: { width: '9px', height: '9px', borderRadius: '50%' },
};
