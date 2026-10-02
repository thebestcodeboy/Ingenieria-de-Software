'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { useAuth } from '../context/AuthContext';
import type { ResumenGerencial } from '../domain/dashboardGerente';
import { getDashboardGerenteSummary } from '../services/dashboardGerente';

const VACIO: ResumenGerencial = {
  inscripcionesMesActual: 0,
  inscripcionesMesAnterior: 0,
  diferenciaInscripciones: 0,
  variacionInscripciones: null,
  ocupacionPromedio: 0,
  demandaCursos: [],
  cursoMayorDemanda: null,
  cursoMenorDemanda: null,
  clasesProgramadasMes: 0,
  promedioSemanalClases: 0,
  hayActividad: false,
};

function etiquetaPeriodo(desplazamiento = 0): string {
  const ahora = new Date();
  const fecha = new Date(ahora.getFullYear(), ahora.getMonth() + desplazamiento, 1);
  return new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(fecha);
}

export default function DashboardGerenteModule() {
  const { role } = useAuth();
  const [resumen, setResumen] = useState<ResumenGerencial>(VACIO);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState('');
  const [actualizado, setActualizado] = useState<Date | null>(null);

  const cargar = useCallback(async (esActualizacion = false) => {
    if (esActualizacion) setActualizando(true);
    setError('');
    try {
      const datos = await getDashboardGerenteSummary();
      setResumen(datos);
      setActualizado(new Date());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los indicadores gerenciales.');
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, []);

  useEffect(() => {
    if (role !== 'gerente') return;
    getDashboardGerenteSummary()
      .then((datos) => {
        setResumen(datos);
        setActualizado(new Date());
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los indicadores gerenciales.');
      })
      .finally(() => setCargando(false));
  }, [role]);

  if (role !== 'gerente') {
    return <section role="alert" style={styles.restringido}>Acceso restringido: esta sección requiere rol de Gerencia.</section>;
  }

  if (cargando) {
    return (
      <section aria-busy="true" aria-live="polite" style={styles.estadoCentral}>
        <div style={styles.spinner} />
        <strong>Cargando indicadores gerenciales...</strong>
        <span style={styles.textoSecundario}>Analizando inscripciones y actividad del mes.</span>
      </section>
    );
  }

  if (error && !actualizado) {
    return (
      <section role="alert" style={{ ...styles.estadoCentral, borderColor: '#fecaca', backgroundColor: '#fff7f7' }}>
        <strong style={{ color: '#b91c1c' }}>No pudimos cargar el panel gerencial</strong>
        <span style={styles.textoSecundario}>{error}</span>
        <button type="button" onClick={() => void cargar()} style={styles.botonPrimario}>Reintentar</button>
      </section>
    );
  }

  const tendenciaPositiva = resumen.diferenciaInscripciones >= 0;
  const maximoInscripciones = Math.max(resumen.inscripcionesMesActual, resumen.inscripcionesMesAnterior, 1);

  return (
    <section aria-labelledby="titulo-dashboard-gerente">
      <header style={styles.cabecera}>
        <div>
          <p style={styles.sobretitulo}>Gerencia · Resumen mensual</p>
          <h1 id="titulo-dashboard-gerente" style={styles.titulo}>Indicadores gerenciales</h1>
          <p style={styles.textoSecundario}>
            {actualizado
              ? `Actualizado ${actualizado.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}`
              : 'Sin actualización registrada'}
          </p>
        </div>
        <button type="button" onClick={() => void cargar(true)} disabled={actualizando} style={{ ...styles.botonPrimario, opacity: actualizando ? 0.65 : 1 }}>
          {actualizando ? 'Actualizando...' : '↻ Actualizar'}
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
          <strong>No hay actividad mensual para mostrar</strong>
          <span style={styles.textoSecundario}>Los indicadores aparecerán cuando existan inscripciones o clases en el período.</span>
        </div>
      ) : (
        <>
          <div style={styles.grillaTarjetas}>
            <Tarjeta valor={resumen.inscripcionesMesActual} etiqueta="Nuevas inscripciones" nota={etiquetaPeriodo()} color="#2563eb" fondo="#eff6ff" />
            <Tarjeta
              valor={`${tendenciaPositiva ? '+' : ''}${resumen.diferenciaInscripciones}`}
              etiqueta="Variación mensual"
              nota={resumen.variacionInscripciones === null ? 'Sin base comparable' : `${resumen.variacionInscripciones}% respecto del mes anterior`}
              color={tendenciaPositiva ? '#059669' : '#dc2626'}
              fondo={tendenciaPositiva ? '#ecfdf5' : '#fef2f2'}
            />
            <Tarjeta valor={`${resumen.ocupacionPromedio}%`} etiqueta="Ocupación de cursos" nota="Cupos definidos del mes" color="#7c3aed" fondo="#f5f3ff" />
            <Tarjeta valor={resumen.promedioSemanalClases} etiqueta="Clases por semana" nota={`${resumen.clasesProgramadasMes} programadas en el mes`} color="#d97706" fondo="#fffbeb" />
          </div>

          <div style={styles.grillaPaneles}>
            <article style={styles.panel}>
              <h2 style={styles.tituloPanel}>Inscripciones mensuales</h2>
              <p style={styles.textoSecundario}>Comparación entre el mes actual y el anterior.</p>
              <BarraComparacion etiqueta={etiquetaPeriodo()} valor={resumen.inscripcionesMesActual} maximo={maximoInscripciones} color="#2563eb" />
              <BarraComparacion etiqueta={etiquetaPeriodo(-1)} valor={resumen.inscripcionesMesAnterior} maximo={maximoInscripciones} color="#94a3b8" />
            </article>

            <article style={styles.panel}>
              <h2 style={styles.tituloPanel}>Ocupación promedio de cursos</h2>
              <p style={styles.textoSecundario}>Inscriptos frente a cupos definidos, sin turnos cancelados.</p>
              <div style={styles.ocupacionValor}>{resumen.ocupacionPromedio}%</div>
              <div style={styles.pista} aria-label={`${resumen.ocupacionPromedio}% de ocupación`}>
                <div style={{ ...styles.barra, width: `${resumen.ocupacionPromedio}%`, backgroundColor: '#7c3aed' }} />
              </div>
              {resumen.ocupacionPromedio === 0 && <p style={styles.nota}>No hay cupos definidos con ocupación en el mes.</p>}
            </article>

            <article style={{ ...styles.panel, gridColumn: '1 / -1' }}>
              <h2 style={styles.tituloPanel}>Demanda de cursos</h2>
              <p style={styles.textoSecundario}>Cantidad de alumnos únicos por curso de ingreso durante el mes.</p>
              <GraficoDemanda
                cursos={resumen.demandaCursos}
                mayor={resumen.cursoMayorDemanda}
                menor={resumen.cursoMenorDemanda}
              />
              <Demanda etiqueta="Mayor demanda" curso={resumen.cursoMayorDemanda} color="#059669" />
              <Demanda etiqueta="Menor demanda" curso={resumen.cursoMenorDemanda} color="#d97706" />
            </article>
          </div>
        </>
      )}
    </section>
  );
}

function Tarjeta({ valor, etiqueta, nota, color, fondo }: { valor: string | number; etiqueta: string; nota: string; color: string; fondo: string }) {
  return (
    <article style={styles.tarjeta}>
      <div aria-hidden="true" style={{ ...styles.iconoTarjeta, color, backgroundColor: fondo }}>●</div>
      <div><div style={styles.valorTarjeta}>{valor}</div><div style={styles.etiquetaTarjeta}>{etiqueta}</div><div style={styles.nota}>{nota}</div></div>
    </article>
  );
}

function BarraComparacion({ etiqueta, valor, maximo, color }: { etiqueta: string; valor: number; maximo: number; color: string }) {
  return (
    <div style={{ marginTop: '18px' }}>
      <div style={styles.filaMetrica}><span style={{ textTransform: 'capitalize' }}>{etiqueta}</span><strong>{valor}</strong></div>
      <div style={styles.pista}><div style={{ ...styles.barra, width: `${(valor / maximo) * 100}%`, backgroundColor: color }} /></div>
    </div>
  );
}

function Demanda({ etiqueta, curso, color }: { etiqueta: string; curso: ResumenGerencial['cursoMayorDemanda']; color: string }) {
  return (
    <div style={styles.demandaFila}>
      <span style={{ ...styles.punto, backgroundColor: color }} />
      <div style={{ flex: 1 }}><div style={styles.demandaEtiqueta}>{etiqueta}</div><strong>{curso?.nombre ?? 'Sin información'}</strong></div>
      <span style={styles.demandaValor}>{curso ? `${curso.inscriptos} inscriptos` : '-'}</span>
    </div>
  );
}

function GraficoDemanda({ cursos = [], mayor, menor }: {
  cursos: ResumenGerencial['demandaCursos'];
  mayor: ResumenGerencial['cursoMayorDemanda'];
  menor: ResumenGerencial['cursoMenorDemanda'];
}) {
  if (cursos.length === 0) {
    return <div style={styles.graficoVacio}>No hay cursos con actividad durante el mes.</div>;
  }

  const maximo = Math.max(...cursos.map((curso) => curso.inscriptos), 1);

  return (
    <div style={styles.graficoScroll}>
      <div style={{ ...styles.graficoBarras, minWidth: `${Math.max(100, cursos.length * 104)}px` }}>
        {cursos.map((curso) => {
          const esMayor = curso.nombre === mayor?.nombre;
          const esMenor = !esMayor && curso.nombre === menor?.nombre;
          const color = esMayor ? '#059669' : esMenor ? '#d97706' : '#2563eb';
          const altura = curso.inscriptos === 0 ? 0 : Math.max(8, (curso.inscriptos / maximo) * 100);

          return (
            <div key={curso.nombre} style={styles.columnaGrafico} aria-label={`${curso.nombre}: ${curso.inscriptos} inscriptos`}>
              <strong style={styles.valorBarra}>{curso.inscriptos}</strong>
              <div style={styles.areaBarra}>
                <div title={`${curso.nombre}: ${curso.inscriptos}`} style={{ ...styles.barraVertical, height: `${altura}%`, backgroundColor: color }} />
              </div>
              <span title={curso.nombre} style={styles.nombreCurso}>{curso.nombre}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  cabecera: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', marginBottom: '24px' },
  sobretitulo: { margin: '0 0 6px', color: '#7c3aed', fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' },
  titulo: { margin: 0, color: '#0f172a', fontSize: '28px', lineHeight: 1.2 },
  textoSecundario: { margin: '5px 0 0', color: '#64748b', fontSize: '15px', lineHeight: 1.5 },
  botonPrimario: { border: 0, borderRadius: '7px', padding: '10px 15px', backgroundColor: '#7c3aed', color: '#fff', fontWeight: 700, cursor: 'pointer' },
  botonTexto: { border: 0, background: 'transparent', color: '#b91c1c', fontWeight: 700, cursor: 'pointer' },
  avisoError: { display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '18px', padding: '12px 14px', border: '1px solid #fecaca', borderRadius: '7px', backgroundColor: '#fff7f7', color: '#b91c1c', fontSize: '15px' },
  estadoCentral: { minHeight: '280px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '10px', padding: '40px', border: '1px solid #e2e8f0', borderRadius: '10px', backgroundColor: '#fff', textAlign: 'center' },
  restringido: { padding: '32px', border: '1px solid #fca5a5', borderRadius: '8px', backgroundColor: '#fee2e2', color: '#991b1b', textAlign: 'center', fontSize: '15px', fontWeight: 600 },
  spinner: { width: '28px', height: '28px', border: '3px solid #ede9fe', borderTopColor: '#7c3aed', borderRadius: '50%' },
  grillaTarjetas: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px', marginBottom: '16px' },
  grillaPaneles: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' },
  tarjeta: { display: 'flex', gap: '14px', minHeight: '118px', padding: '20px', border: '1px solid #e2e8f0', borderRadius: '10px', backgroundColor: '#fff', boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)', boxSizing: 'border-box' },
  iconoTarjeta: { width: '42px', height: '42px', display: 'grid', placeItems: 'center', flexShrink: 0, borderRadius: '9px', fontSize: '17px' },
  valorTarjeta: { color: '#0f172a', fontSize: '26px', fontWeight: 800, lineHeight: 1.1 },
  etiquetaTarjeta: { marginTop: '5px', color: '#475569', fontSize: '15px', fontWeight: 600 },
  nota: { margin: '7px 0 0', color: '#94a3b8', fontSize: '14px' },
  panel: { padding: '22px', border: '1px solid #e2e8f0', borderRadius: '10px', backgroundColor: '#fff', boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)' },
  tituloPanel: { margin: '0 0 4px', color: '#0f172a', fontSize: '18px' },
  filaMetrica: { display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '7px', color: '#334155', fontSize: '14px' },
  pista: { height: '10px', overflow: 'hidden', borderRadius: '999px', backgroundColor: '#e2e8f0' },
  barra: { height: '100%', minWidth: 0, borderRadius: '999px', transition: 'width 250ms ease' },
  ocupacionValor: { margin: '26px 0 10px', color: '#0f172a', fontSize: '38px', fontWeight: 800 },
  demandaFila: { display: 'flex', alignItems: 'center', gap: '10px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', color: '#334155', fontSize: '15px' },
  demandaEtiqueta: { marginBottom: '3px', color: '#64748b', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.04em' },
  demandaValor: { color: '#475569', fontSize: '14px', whiteSpace: 'nowrap' },
  punto: { width: '9px', height: '9px', flexShrink: 0, borderRadius: '50%' },
  graficoScroll: { marginTop: '24px', overflowX: 'auto', paddingBottom: '8px' },
  graficoBarras: { height: '250px', display: 'flex', alignItems: 'stretch', gap: '14px', padding: '8px 8px 0', borderBottom: '1px solid #cbd5e1' },
  columnaGrafico: { minWidth: '90px', flex: 1, display: 'grid', gridTemplateRows: '22px 170px 48px', justifyItems: 'center', alignItems: 'end' },
  valorBarra: { color: '#334155', fontSize: '14px' },
  areaBarra: { width: '54px', height: '160px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  barraVertical: { width: '100%', minHeight: 0, borderRadius: '6px 6px 0 0', transition: 'height 250ms ease' },
  nombreCurso: { maxWidth: '96px', alignSelf: 'start', marginTop: '7px', overflow: 'hidden', color: '#475569', fontSize: '13px', lineHeight: 1.25, textAlign: 'center', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' },
  graficoVacio: { marginTop: '20px', padding: '34px', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#64748b', fontSize: '15px', textAlign: 'center' },
};
