'use client';

import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import LoginView from '../components/LoginView';
import AlumnosModule from '../components/AlumnosModule';
import ProfesoresModule from '../components/ProfesoresModule';
import MateriasModule from '../components/MateriasModule';
import CursosIngresoModule from '../components/CursosIngresoModule';
import ClasesParticularesModule from '../components/ClasesParticularesModule';
import TurnosModule from '../components/TurnosModule';
import CalendarioAdminModule from '../components/CalendarioAdminModule';
import PortalAlumnoModule from '../components/PortalAlumnoModule';

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
  Logout: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
};

const ADMIN_MENU_ITEMS = [
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

const ALUMNO_MENU_ITEMS = [
  { id: 'cursos', label: 'Cursos', Icon: Icons.Cursos },
  { id: 'inscripcion', label: 'Mis Cursos para anotarse', Icon: Icons.Materias },
  { id: 'calendario', label: 'Calendario de turnos', Icon: Icons.Calendario },
];

export default function AteneoLayout() {
  const { user, role, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('cursos');

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f4f6f8' }}>
        Cargando sesión...
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  const menuItems = role === 'alumno' ? ALUMNO_MENU_ITEMS : ADMIN_MENU_ITEMS;
  const nombreUsuario = user?.email ? user.email.split('@')[0].toUpperCase() : 'USUARIO';
  const iniciales = nombreUsuario.slice(0, 2);

  const handleAbrirPerfil = () => {
    window.dispatchEvent(new CustomEvent('abrir-perfil-alumno'));
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f4f6f8', fontFamily: 'inherit', color: '#1e293b' }}>
      {/* SIDEBAR PRINCIPAL */}
      <aside style={{ width: '240px', backgroundColor: '#0b1e33', borderRight: '1px solid #162a42', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '24px 0 16px 0', flexShrink: 0 }}>
        <div>
          <div style={{ padding: '0 20px 22px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '8px', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)', flexShrink: 0, padding: '3px' }}>
              <svg viewBox="0 0 120 120" width="34" height="34" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M60 12L24 95H38L47 73H73L82 95H96L60 12Z" fill="#0b1e33" />
                <polygon points="60,32 51,56 69,56" fill="#ffffff" />
                <path d="M26 62C48 54 72 54 94 62C85 58 60 51 26 62Z" fill="#94a3b8" />
                <rect x="53" y="54" width="2.5" height="26" fill="#ffffff" />
              </svg>
            </div>
            <div>
              <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '13px', textTransform: 'uppercase' }}>Instituto Ateneo</div>
              <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '1px' }}>Gestión Académica</div>
            </div>
          </div>

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
                    textAlign: 'left'
                  }}
                >
                  <span style={{ display: 'flex', color: isActive ? '#60a5fa' : '#64748b' }}><Icon /></span>
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* FOOTER SIDEBAR INTERACTIVO: AL TOCAR EL USUARIO ABRE EL PERFIL */}
        <div style={{ padding: '12px 14px 0 14px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div 
            onClick={handleAbrirPerfil}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              marginBottom: '10px', 
              padding: '6px 8px',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            title="Hacé clic para ver tus datos de perfil institucional"
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#38bdf8',
              color: '#0b1e33',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '12px',
              flexShrink: 0
            }}>
              {iniciales}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Usuario</div>
              <div style={{ color: '#ffffff', fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {nombreUsuario}
              </div>
            </div>
          </div>

          <button
            onClick={() => logout()}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '8px 10px', borderRadius: '6px', border: 'none', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}
          >
            <span style={{ display: 'flex' }}><Icons.Logout /></span>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main style={{ flex: 1, padding: '32px 40px', overflowY: 'auto', backgroundColor: '#f4f6f8' }}>
        {role === 'alumno' ? (
          <PortalAlumnoModule activeTab={activeTab} />
        ) : activeTab === 'alumnos' ? (
          <AlumnosModule />
        ) : activeTab === 'profesores' ? (
          <ProfesoresModule />
        ) : activeTab === 'materias' ? (
          <MateriasModule />
        ) : activeTab === 'cursos' ? (
          <CursosIngresoModule />
        ) : activeTab === 'particulares' ? (
          <ClasesParticularesModule />
        ) : activeTab === 'turnos' ? (
          <TurnosModule />
        ) : activeTab === 'calendario' ? (
          <CalendarioAdminModule />
        ) : (
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '48px', textAlign: 'center', color: '#64748b' }}>
            Módulo en preparación.
          </div>
        )}
      </main>
    </div>
  );
}