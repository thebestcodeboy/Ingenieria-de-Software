'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// ÍCONOS SVG VECTORIALES
const Icons = {
  Inicio: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1V9.5z" />
    </svg>
  ),
  Alumnos: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  ),
  Profesores: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Materias: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
  Cursos: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  Particulares: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  Turnos: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Calendario: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Inscripciones: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M9 14l2 2 4-4" />
    </svg>
  ),
  Reportes: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  Config: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  Search: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  EmptyBox: () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      <line x1="12" y1="11" x2="12" y2="17" />
      <line x1="9" y1="14" x2="15" y2="14" />
    </svg>
  )
};

export default function AteneoLayout() {
  const [activeTab, setActiveTab] = useState('turnos');
  const [data, setData] = useState({
    totalAlumnos: 0,
    totalProfesores: 0,
    totalMaterias: 0,
    totalTurnos: 0,
    turnosHoy: [] as any[],
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterState, setFilterState] = useState('todos');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        const [alumnosRes, profesoresRes, materiasRes, turnosRes] = await Promise.all([
          supabase.from('alumnos').select('*', { count: 'exact', head: true }),
          supabase.from('profesores').select('*', { count: 'exact', head: true }),
          supabase.from('materias').select('*', { count: 'exact', head: true }),
          supabase.from('turnos_clase').select('*', { count: 'exact', head: true }),
        ]);

        const today = new Date().toISOString().split('T')[0];
        const { data: turnosHoy } = await supabase
          .from('vista_calendario')
          .select('*')
          .eq('fecha', today)
          .order('hora_inicio', { ascending: true });

        setData({
          totalAlumnos: alumnosRes.count || 0,
          totalProfesores: profesoresRes.count || 0,
          totalMaterias: materiasRes.count || 0,
          totalTurnos: turnosRes.count || 0,
          turnosHoy: turnosHoy || [],
        });
      } catch (err) {
        console.error('Error cargando datos:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const menuItems = [
    { id: 'inicio', label: 'Inicio', Icon: Icons.Inicio },
    { id: 'alumnos', label: 'Alumnos', Icon: Icons.Alumnos },
    { id: 'profesores', label: 'Profesores', Icon: Icons.Profesores },
    { id: 'materias', label: 'Materias', Icon: Icons.Materias },
    { id: 'cursos', label: 'Cursos de Ingreso', Icon: Icons.Cursos },
    { id: 'particulares', label: 'Clases Particulares', Icon: Icons.Particulares },
    { id: 'turnos', label: 'Turnos y Clases', Icon: Icons.Turnos },
    { id: 'calendario', label: 'Calendario', Icon: Icons.Calendario },
    { id: 'inscripciones', label: 'Inscripciones', Icon: Icons.Inscripciones },
    { id: 'reportes', label: 'Reportes', Icon: Icons.Reportes },
  ];

  return (
    <>
      {/* Importación de fuente Plus Jakarta Sans */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: '#f4f6f8', // Gris perla limpio de fondo
        fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif',
        color: '#1e293b'
      }}>
        
        {/* SIDEBAR AZUL MARINO ATENEO */}
        <aside style={{
          width: '240px',
          backgroundColor: '#0b1e33', // Azul marino profundo institucional
          borderRight: '1px solid #162a42',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '24px 0',
          flexShrink: 0
        }}>
          <div>
            {/* Header del Sidebar con Logo Ateneo */}
            <div style={{
              padding: '0 20px 22px 20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
                flexShrink: 0,
                padding: '3px'
              }}>
                {/* Isotipo: Letra A en serifa + Columna clásica acanalada + Arco */}
                <svg viewBox="0 0 120 120" width="34" height="34" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M60 12L24 95H38L47 73H73L82 95H96L60 12Z" fill="#0b1e33" />
                  <polygon points="60,32 51,56 69,56" fill="#ffffff" />
                  <path d="M26 62C48 54 72 54 94 62C85 58 60 51 26 62Z" fill="#94a3b8" />
                  <path d="M50 48H70V51H50V48Z" fill="#ffffff" />
                  <path d="M48 49C48 47.5 49.5 46.5 51 46.5H69C70.5 46.5 72 47.5 72 49H48Z" fill="#0b1e33" />
                  <rect x="52" y="51" width="16" height="2" fill="#0b1e33" />
                  <rect x="53" y="54" width="2.5" height="26" fill="#ffffff" />
                  <rect x="57" y="54" width="2" height="26" fill="#ffffff" />
                  <rect x="61" y="54" width="2" height="26" fill="#ffffff" />
                  <rect x="64.5" y="54" width="2.5" height="26" fill="#ffffff" />
                  <rect x="50" y="80" width="20" height="2.5" fill="#ffffff" />
                  <rect x="48" y="82.5" width="24" height="2" fill="#0b1e33" />
                </svg>
              </div>
              <div>
                <div style={{
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '13px',
                  letterSpacing: '0.6px',
                  textTransform: 'uppercase'
                }}>
                  Instituto Ateneo
                </div>
                <div style={{
                  color: '#94a3b8',
                  fontSize: '11px',
                  fontWeight: 400,
                  marginTop: '1px'
                }}>
                  Gestión Académica
                </div>
              </div>
            </div>

            {/* Menú de Ítems */}
            <nav style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '3px', padding: '0 12px' }}>
              {menuItems.map(({ id, label, Icon }) => {
                const isActive = activeTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: isActive ? 'rgba(37, 99, 235, 0.18)' : 'transparent',
                      color: isActive ? '#ffffff' : '#94a3b8',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: isActive ? 600 : 400,
                      textAlign: 'left',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{
                      display: 'flex',
                      color: isActive ? '#60a5fa' : '#64748b'
                    }}>
                      <Icon />
                    </span>
                    <span>{label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Footer de Configuración */}
          <div style={{ padding: '0 16px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px' }}>
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: 'transparent',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500
              }}
            >
              <span style={{ display: 'flex', color: '#64748b' }}><Icons.Config /></span>
              <span>Configuración</span>
            </button>
          </div>
        </aside>

        {/* ÁREA PRINCIPAL BLANCO & GRIS */}
        <main style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>
          
          {/* Header Principal */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px'
          }}>
            <div>
              <h1 style={{
                fontSize: '22px',
                fontWeight: 700,
                color: '#0f172a',
                letterSpacing: '-0.02em',
                margin: 0
              }}>
                {menuItems.find(m => m.id === activeTab)?.label || 'Turnos y Clases'}
              </h1>
              <p style={{ color: '#64748b', fontSize: '13px', margin: '3px 0 0 0', fontWeight: 400 }}>
                {data.turnosHoy.length} clases programadas para hoy
              </p>
            </div>

            <button
              onClick={() => alert(`Acción: Nuevo registro en ${activeTab}`)}
              style={{
                backgroundColor: '#0b1e33',
                color: '#ffffff',
                border: '1px solid #0b1e33',
                borderRadius: '6px',
                padding: '9px 18px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 1px 2px rgba(11, 30, 51, 0.1)',
                transition: 'all 0.15s ease'
              }}
            >
              <span style={{ fontSize: '15px', lineHeight: 1 }}>+</span> Agregar
            </button>
          </div>

          {/* Filtros: Buscador y Select */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '18px' }}>
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '8px 12px',
              gap: '10px'
            }}>
              <Icons.Search />
              <input
                type="text"
                placeholder="Buscar por materia, profesor o aula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  width: '100%',
                  fontSize: '13px',
                  color: '#1e293b',
                  backgroundColor: 'transparent',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <select
              value={filterState}
              onChange={(e) => setFilterState(e.target.value)}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '0 14px',
                fontSize: '13px',
                color: '#334155',
                cursor: 'pointer',
                outline: 'none',
                fontFamily: 'inherit',
                fontWeight: 500
              }}
            >
              <option value="todos">Todos los registros</option>
              <option value="con_cupo">Con cupo disponible</option>
              <option value="completos">Completos</option>
            </select>
          </div>

          {/* Contenedor Tarjeta Blanca con Bordes Grises Suaves */}
          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                  <th style={{ padding: '12px 18px', fontWeight: 600, color: '#64748b', fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>ID / Horario</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600, color: '#64748b', fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Materia / Actividad</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600, color: '#64748b', fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Profesor</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600, color: '#64748b', fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Aula</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600, color: '#64748b', fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Estado / Cupo</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600, color: '#64748b', fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
                      <div style={{ fontSize: '13px', fontWeight: 500 }}>Sincronizando registros...</div>
                    </td>
                  </tr>
                ) : data.turnosHoy.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '64px 20px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                        <Icons.EmptyBox />
                      </div>
                      <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '14px' }}>
                        No hay registros disponibles
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                        Utiliza el botón superior "+ Agregar" para programar una nueva clase.
                      </div>
                    </td>
                  </tr>
                ) : (
                  data.turnosHoy.map((turno: any, index: number) => {
                    const tieneLugar = (turno.lugares_disponibles ?? 1) > 0;
                    return (
                      <tr key={turno.turno_id || index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '14px 18px', color: '#0f172a', fontWeight: 600 }}>
                          {turno.hora_inicio?.slice(0, 5)} - {turno.hora_fin?.slice(0, 5)}
                        </td>
                        <td style={{ padding: '14px 18px', color: '#0f172a', fontWeight: 500 }}>
                          {turno.materia_nombre}
                          {turno.actividad_nombre && (
                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 400, marginTop: '2px' }}>
                              {turno.actividad_nombre}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '14px 18px', color: '#334155' }}>
                          {turno.profesor_nombre_completo}
                        </td>
                        <td style={{ padding: '14px 18px', color: '#334155' }}>
                          Aula {turno.aula_numero}
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: tieneLugar ? '#f1f5f9' : '#fef2f2',
                            color: tieneLugar ? '#0b1e33' : '#b91c1c',
                            border: `1px solid ${tieneLugar ? '#cbd5e1' : '#fecaca'}`
                          }}>
                            {tieneLugar ? 'ACTIVO' : 'COMPLETO'} ({turno.inscriptos_actuales}/{turno.cupo_maximo || '-'})
                          </span>
                        </td>
                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          <button
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#64748b',
                              padding: '4px'
                            }}
                            title="Editar"
                          >
                            ✏️
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </main>
      </div>
    </>
  );
}