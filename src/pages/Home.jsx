import React, { useEffect, useState } from 'react';
import { getDashboardSummary } from '../services/dashboard';

export default function Home({ onNavigate }) {
  const [data, setData] = useState({
    totalAlumnos: 0,
    totalProfesores: 0,
    totalMaterias: 0,
    totalTurnos: 0,
    turnosHoy: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await getDashboardSummary();
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const modulos = [
    {
      id: 'alumnos',
      titulo: 'Gestión de Alumnos',
      subtitulo: 'HU01 & HU02: Alta y consulta de fichas',
      icono: '👨‍🎓',
      color: '#3b82f6',
      badge: `${data.totalAlumnos} Registrados`
    },
    {
      id: 'profesores',
      titulo: 'Nómina Docente',
      subtitulo: 'HU03 & HU04: Profesores y materias dictadas',
      icono: '👨‍🏫',
      color: '#10b981',
      badge: `${data.totalProfesores} Activos`
    },
    {
      id: 'materias',
      titulo: 'Catálogo de Materias',
      subtitulo: 'HU05: Registro de asignaturas',
      icono: '📚',
      color: '#f59e0b',
      badge: `${data.totalMaterias} Disponibles`
    },
    {
      id: 'calendario',
      titulo: 'Calendario & Turnos',
      subtitulo: 'HU08 a HU11: Agenda, cupos e inscripciones',
      icono: '📅',
      color: '#8b5cf6',
      badge: `${data.totalTurnos} Programados`
    }
  ];

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Instituto Ateneo</h1>
          <p style={styles.subtitle}>Panel de Administración y Operaciones Académicas</p>
        </div>
        <div style={styles.dateBadge}>
          {new Date().toLocaleDateString('es-AR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      </header>

      <section style={styles.grid}>
        {modulos.map((mod) => (
          <div
            key={mod.id}
            style={styles.card}
            onClick={() => onNavigate && onNavigate(mod.id)}
          >
            <div style={{ ...styles.cardIcon, backgroundColor: `${mod.color}15`, color: mod.color }}>
              {mod.icono}
            </div>
            <div style={styles.cardContent}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>{mod.titulo}</h3>
                <span style={{ ...styles.badge, backgroundColor: `${mod.color}20`, color: mod.color }}>
                  {loading ? '...' : mod.badge}
                </span>
              </div>
              <p style={styles.cardSubtitle}>{mod.subtitulo}</p>
            </div>
          </div>
        ))}
      </section>

      <section style={styles.agendaSection}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Clases Programadas para Hoy</h2>
          <span style={styles.counterBadge}>
            {data.turnosHoy.length} {data.turnosHoy.length === 1 ? 'clase' : 'clases'}
          </span>
        </div>

        {loading ? (
          <p style={styles.infoText}>Cargando agenda de hoy...</p>
        ) : data.turnosHoy.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>No hay clases programadas para el día de hoy.</p>
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeadRow}>
                  <th style={styles.th}>Horario</th>
                  <th style={styles.th}>Materia / Actividad</th>
                  <th style={styles.th}>Profesor</th>
                  <th style={styles.th}>Aula</th>
                  <th style={styles.th}>Cupo & Ocupación</th>
                </tr>
              </thead>
              <tbody>
                {data.turnosHoy.map((t) => (
                  <tr key={t.turno_id} style={styles.tr}>
                    <td style={styles.tdBold}>{t.hora_inicio?.slice(0, 5)} - {t.hora_fin?.slice(0, 5)}</td>
                    <td style={styles.td}>
                      <span style={styles.materiaBadge}>{t.materia_nombre}</span>
                      {t.actividad_nombre && <small style={styles.actividadSub}> ({t.actividad_nombre})</small>}
                    </td>
                    <td style={styles.td}>{t.profesor_nombre_completo}</td>
                    <td style={styles.td}>Aula {t.aula_numero}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.cupoBadge,
                        backgroundColor: t.lugares_disponibles === 0 ? '#fee2e2' : '#e0f2fe',
                        color: t.lugares_disponibles === 0 ? '#b91c1c' : '#0369a1'
                      }}>
                        {t.inscriptos_actuales} / {t.cupo_maximo || 'Sin cupo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px 20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#1f2937'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: '20px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    margin: 0,
    color: '#111827'
  },
  subtitle: {
    fontSize: '15px',
    color: '#6b7280',
    margin: '4px 0 0 0'
  },
  dateBadge: {
    backgroundColor: '#f3f4f6',
    padding: '8px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '500',
    color: '#4b5563',
    textTransform: 'capitalize'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '20px',
    marginBottom: '40px'
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    padding: '20px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
  },
  cardIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    flexShrink: 0
  },
  cardContent: {
    flex: 1
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px'
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    margin: 0,
    color: '#111827'
  },
  badge: {
    fontSize: '11px',
    fontWeight: '600',
    padding: '2px 8px',
    borderRadius: '12px'
  },
  cardSubtitle: {
    fontSize: '12px',
    color: '#6b7280',
    margin: 0,
    lineHeight: '1.4'
  },
  agendaSection: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    margin: 0,
    color: '#111827'
  },
  counterBadge: {
    backgroundColor: '#eff6ff',
    color: '#1d4ed8',
    padding: '2px 8px',
    borderRadius: '9999px',
    fontSize: '12px',
    fontWeight: '600'
  },
  tableWrapper: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left'
  },
  tableHeadRow: {
    borderBottom: '1px solid #e5e7eb'
  },
  th: {
    padding: '12px 14px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#4b5563',
    backgroundColor: '#f9fafb'
  },
  tr: {
    borderBottom: '1px solid #f3f4f6'
  },
  td: {
    padding: '12px 14px',
    fontSize: '14px',
    color: '#374151'
  },
  tdBold: {
    padding: '12px 14px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#111827'
  },
  materiaBadge: {
    fontWeight: '500',
    color: '#1f2937'
  },
  actividadSub: {
    color: '#6b7280',
    fontSize: '12px'
  },
  cupoBadge: {
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '12px'
  }
};
