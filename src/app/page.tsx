'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import AlumnosModule from '../components/AlumnosModule';
import ClasesParticularesModule from '../components/ClasesParticularesModule';
import TurnosModule from '../components/TurnosModule';
import MateriasModule from '../components/MateriasModule';
import ProfesoresModule from '../components/ProfesoresModule';

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
  )
};

export default function AteneoLayout() {
  const [activeTab, setActiveTab] = useState('alumnos');
  const [totalTurnosHoy, setTotalTurnosHoy] = useState(0);

  useEffect(() => {
    async function loadTurnosCount() {
      try {
        const today = new Date().toISOString().split('T')[0];
        const { count } = await supabase
          .from('turnos_clase')
          .select('*', { count: 'exact', head: true })
          .eq('fecha', today);
        setTotalTurnosHoy(count || 0);
      } catch (err) {
        console.warn(err);
      }
    }
    loadTurnosCount();
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
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      width: '100vw',
      backgroundColor: '#f4f6f8',
      color: '#1e293b'
    }}>
      
      {/* SIDEBAR FIJO IZQUIERDO */}
      <aside style={{
        width: '240px',
        minWidth: '240px',
        backgroundColor: '#0b1e33',
        borderRight: '1px solid #162a42',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '24px 0',
        height: '100vh',
        position: 'sticky',
        top: 0
      }}>
        <div>
          {/* Logo Oficial */}
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

          {/* Menú */}
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

        {/* Footer */}
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

      {/* ÁREA DE CONTENIDO */}
      <main style={{ flex: 1, padding: '32px 40px', overflowY: 'auto', backgroundColor: '#f4f6f8' }}>
        {activeTab === 'alumnos' ? (
          <AlumnosModule />
        ) : activeTab === 'profesores' ? (
          <ProfesoresModule />
        ) : activeTab === 'materias' ? (
          <MateriasModule />
        ) : activeTab === 'particulares' ? (
          <ClasesParticularesModule />
        ) : activeTab === 'turnos' ? (
          <TurnosModule />
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  {menuItems.find(m => m.id === activeTab)?.label}
                </h1>
                <p style={{ color: '#64748b', fontSize: '13px', margin: '3px 0 0 0' }}>
                  {totalTurnosHoy} clases programadas para hoy
                </p>
              </div>
            </div>

            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '48px 20px',
              textAlign: 'center',
              color: '#64748b'
            }}>
              Módulo en preparación.
            </div>
          </div>
        )}
      </main>

    </div>
  );
}