'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { loginPortal, actualizarPasswordPrimerIngreso } from '../services/authPortales';
import { getRoleFromUser } from '../services/auth';

type PortalType = 'alumno' | 'profesor' | 'staff'; // staff = Mesa de Entrada + Gerencia

interface FieldErrors {
  identifier?: string;
  password?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export default function LoginView() {
  const { login, logout } = useAuth();

  // Por defecto el portal público arranca en 'alumno'
  const [portal, setPortal] = useState<PortalType>('alumno');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [requiereCambioPass, setRequiereCambioPass] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPass, setUpdatingPass] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [generalSuccess, setGeneralSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const esStaff = portal === 'staff';

  const getPlaceholder = () => {
    switch (portal) {
      case 'alumno':
        return 'Usuario (ej: acolque22)';
      case 'profesor':
        return 'Usuario (ej: prof.agimenez)';
      case 'staff':
        return 'personal@ateneo.com';
      default:
        return 'usuario@ateneo.com';
    }
  };

  const getLabelIdentifier = () => {
    return esStaff ? 'Correo institucional' : 'Usuario institucional';
  };

  const validateLoginForm = (): boolean => {
    const errors: FieldErrors = {};
    const cleanId = identifier.trim();

    if (!cleanId) {
      errors.identifier = esStaff
        ? 'El correo electrónico es obligatorio.'
        : 'El usuario institucional es obligatorio.';
    } else if (esStaff && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanId)) {
      errors.identifier = 'Ingresá un formato de correo válido (ej: usuario@ateneo.com).';
    }

    if (!password) {
      errors.password = 'La contraseña es obligatoria.';
    } else if (password.length < 6) {
      errors.password = 'La contraseña debe contener al menos 6 caracteres.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePasswordChangeForm = (): boolean => {
    const errors: FieldErrors = {};

    if (!newPassword) {
      errors.newPassword = 'Debe ingresar una nueva contraseña.';
    } else if (newPassword.length < 6) {
      errors.newPassword = 'La nueva contraseña debe tener al menos 6 caracteres.';
    }

    if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setGeneralError(null);
    setGeneralSuccess(null);

    if (!validateLoginForm()) return;

    setLoading(true);

    try {
      if (esStaff) {
        // Login para Mesa de Entrada y Gerencia
        const { user, error } = await login(identifier.trim(), password);

        if (error) {
          const rawMsg = (error.message || error.error_description || '').toLowerCase();
          if (
            rawMsg.includes('invalid') ||
            rawMsg.includes('credentials') ||
            rawMsg.includes('grant') ||
            rawMsg.includes('incorrect')
          ) {
            setGeneralError('Correo o contraseña incorrectos. Verificá los datos ingresados.');
          } else if (rawMsg.includes('not confirmed') || rawMsg.includes('unconfirmed')) {
            setGeneralError('Esta cuenta aún no ha sido confirmada en el sistema.');
          } else if (rawMsg.includes('too many requests') || rawMsg.includes('rate limit')) {
            setGeneralError('Demasiados intentos fallidos. Por seguridad, aguardá unos minutos.');
          } else {
            setGeneralError(error.message || 'No se pudo iniciar sesión. Verificá tus credenciales.');
          }
          return;
        }

        // Validar que el usuario autenticado sea realmente staff (gerente o mesa_entrada)
        const userRole = getRoleFromUser(user);
        if (userRole !== 'gerente' && userRole !== 'mesa_entrada') {
          await logout();
          setGeneralError('Acceso denegado: Esta cuenta no posee permisos de personal administrativo o gerencial.');
          return;
        }

        // Si es válido, AuthContext actualiza la sesión automáticamente
      } else {
        // Login para Alumnos y Profesores (portal institucional)
        const resultado = await loginPortal(identifier.trim(), password, portal);

        if (resultado.debeCambiarPass) {
          setRequiereCambioPass(true);
          setGeneralSuccess('Primer ingreso detectado: configurá una contraseña definitiva.');
        } else {
          window.location.reload();
        }
      }
    } catch (err: any) {
      console.warn('No se pudo iniciar sesión:', err);
      const rawMsg = (err?.message || '').toLowerCase();

      if (rawMsg.includes('invalid') || rawMsg.includes('incorrectos') || rawMsg.includes('credentials')) {
        setGeneralError('Usuario o contraseña incorrectos. Verificá los datos ingresados.');
      } else if (rawMsg.includes('permisos')) {
        setGeneralError(err.message);
      } else {
        setGeneralError(err.message || 'Ocurrió un error inesperado al iniciar sesión.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setGeneralError(null);

    if (!validatePasswordChangeForm()) return;

    setUpdatingPass(true);
    try {
      await actualizarPasswordPrimerIngreso(newPassword);
      setGeneralSuccess('¡Contraseña actualizada correctamente! Ingresando al portal...');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setGeneralError(err.message || 'No se pudo actualizar la contraseña provisoria.');
    } finally {
      setUpdatingPass(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#071322',
      backgroundImage: 'radial-gradient(circle at 50% 20%, #0f2744 0%, #071322 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '30px',
      boxSizing: 'border-box',
      fontFamily: 'inherit'
    }}>
      {/* TARJETA PRINCIPAL */}
      <div style={{
        width: '100%',
        maxWidth: '1020px',
        minHeight: '620px',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.45)',
        display: 'flex',
        border: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        
        {/* PANEL IZQUIERDO INSTITUCIONAL */}
        <div style={{
          flex: '1.05',
          backgroundColor: '#0b1e33',
          padding: '48px 44px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-20%',
            left: '-20%',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(37,99,235,0.25) 0%, rgba(11,30,51,0) 70%)',
            pointerEvents: 'none'
          }} />

          {/* Logo y Nombre */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', zIndex: 1 }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              backgroundColor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
              padding: '4px',
              flexShrink: 0
            }}>
              <svg viewBox="0 0 120 120" width="34" height="34" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M60 12L24 95H38L47 73H73L82 95H96L60 12Z" fill="#0b1e33" />
                <polygon points="60,32 51,56 69,56" fill="#ffffff" />
                <path d="M26 62C48 54 72 54 94 62C85 58 60 51 26 62Z" fill="#94a3b8" />
                <rect x="53" y="54" width="2.5" height="26" fill="#ffffff" />
              </svg>
            </div>
            <div>
              <div style={{ color: '#ffffff', fontWeight: 800, fontSize: '17px', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                Instituto Ateneo
              </div>
              <div style={{ color: '#94a3b8', fontSize: '13px', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                Plataforma de Gestión Integral
              </div>
            </div>
          </div>

          <div style={{ zIndex: 1, margin: 'auto 0' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#f8fafc', lineHeight: 1.3, margin: '0 0 14px 0' }}>
              Control y gestión académica centralizada.
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '15.5px', lineHeight: 1.6, margin: 0 }}>
              Accedé a los legajos de alumnos, cronograma de turnos, cursos preparatorios y nómina docente con seguridad de accesos por rol.
            </p>
          </div>

          <div style={{ color: '#64748b', fontSize: '13.5px', zIndex: 1 }}>
            &copy; {new Date().getFullYear()} Instituto Ateneo. Acceso institucional.
          </div>
        </div>

        {/* PANEL DERECHO DE FORMULARIO */}
        <div style={{
          flex: '1.15',
          backgroundColor: '#ffffff',
          padding: '48px 44px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative'
        }}>
          {/* BOTÓN SUPERIOR DERECHO: TOGGLE STAFF / GENERAL */}
          {!requiereCambioPass && (
            <button
              type="button"
              onClick={() => {
                setPortal(esStaff ? 'alumno' : 'staff');
                setFieldErrors({});
                setGeneralError(null);
                setIdentifier('');
                setPassword('');
              }}
              title={esStaff ? 'Volver a portales de alumnos y docentes' : 'Acceso a Mesa de Entrada y Gerencia'}
              style={{
                position: 'absolute',
                top: '24px',
                right: '28px',
                background: esStaff ? '#0b1e33' : '#f8fafc',
                color: esStaff ? '#38bdf8' : '#475569',
                border: esStaff ? '1px solid #1e3a5f' : '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '7px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '13.5px',
                fontWeight: 600,
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}
              onMouseEnter={(e) => {
                if (!esStaff) {
                  e.currentTarget.style.color = '#0b1e33';
                  e.currentTarget.style.borderColor = '#94a3b8';
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                }
              }}
              onMouseLeave={(e) => {
                if (!esStaff) {
                  e.currentTarget.style.color = '#475569';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                }
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>{esStaff ? 'Volver a Portales' : 'Acceso Personal'}</span>
            </button>
          )}

          {!requiereCambioPass ? (
            <div>
              {/* SOLO 2 BOTONES EN LA VISTA PRINCIPAL: ALUMNOS Y PROFESORES */}
              {!esStaff ? (
                <div style={{
                  display: 'flex',
                  backgroundColor: '#f1f5f9',
                  padding: '4px',
                  borderRadius: '8px',
                  marginBottom: '28px',
                  gap: '4px'
                }}>
                  <button
                    type="button"
                    onClick={() => { setPortal('alumno'); setFieldErrors({}); setGeneralError(null); }}
                    style={{
                      flex: 1,
                      padding: '9px 4px',
                      fontSize: '14.5px',
                      fontWeight: portal === 'alumno' ? 700 : 600,
                      border: 'none',
                      borderRadius: '6px',
                      backgroundColor: portal === 'alumno' ? '#0b1e33' : 'transparent',
                      color: portal === 'alumno' ? '#ffffff' : '#64748b',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Alumnos
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPortal('profesor'); setFieldErrors({}); setGeneralError(null); }}
                    style={{
                      flex: 1,
                      padding: '9px 4px',
                      fontSize: '14.5px',
                      fontWeight: portal === 'profesor' ? 700 : 600,
                      border: 'none',
                      borderRadius: '6px',
                      backgroundColor: portal === 'profesor' ? '#0b1e33' : 'transparent',
                      color: portal === 'profesor' ? '#ffffff' : '#64748b',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Profesores
                  </button>
                </div>
              ) : (
                /* BADGE INSTITUCIONAL CUANDO ENTRA A PERSONAL */
                <div style={{
                  marginBottom: '20px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#e0f2fe',
                  color: '#0369a1',
                  border: '1px solid #bae6fd',
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#0284c7' }}></span>
                  Mesa de Entrada & Gerencia
                </div>
              )}

              {/* Título de la sección */}
              <div style={{ marginBottom: '22px' }}>
                <h1 style={{ fontSize: '23px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
                  {esStaff ? 'Acceso de Personal' : portal === 'alumno' ? 'Portal del Estudiante' : 'Portal Docente'}
                </h1>
                <p style={{ color: '#64748b', fontSize: '15px', margin: 0 }}>
                  {esStaff
                    ? 'Ingresá con tu correo institucional (Mesa de Entrada o Gerencia).'
                    : 'Ingresá con tu usuario y contraseña asignada.'}
                </p>
              </div>

              {/* Cartel de Error con feedback visual claro */}
              {generalError && (
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  backgroundColor: '#fef2f2',
                  border: '1.5px solid #fca5a5',
                  color: '#991b1b',
                  padding: '11px 13px',
                  borderRadius: '6px',
                  fontSize: '14.5px',
                  lineHeight: 1.4,
                  marginBottom: '18px'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ flexShrink: 0, marginTop: '2px' }}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{generalError}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
                    {getLabelIdentifier()}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      autoCapitalize="none"
                      autoCorrect="off"
                      value={identifier}
                      onChange={(e) => {
                        setIdentifier(e.target.value);
                        if (fieldErrors.identifier) setFieldErrors({ ...fieldErrors, identifier: undefined });
                      }}
                      placeholder={getPlaceholder()}
                      style={{
                        width: '100%',
                        padding: '11px 12px 11px 38px',
                        borderRadius: '6px',
                        border: `1.5px solid ${fieldErrors.identifier ? '#ef4444' : '#cbd5e1'}`,
                        backgroundColor: fieldErrors.identifier ? '#fff5f5' : '#ffffff',
                        fontSize: '15px',
                        outline: 'none',
                        color: '#0f172a',
                        boxSizing: 'border-box'
                      }}
                    />
                    <span style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: fieldErrors.identifier ? '#ef4444' : '#94a3b8',
                      display: 'flex'
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="7" r="4" />
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      </svg>
                    </span>
                  </div>
                  {fieldErrors.identifier && (
                    <p style={{ color: '#dc2626', fontSize: '13.5px', margin: '4px 0 0 2px' }}>
                      &bull; {fieldErrors.identifier}
                    </p>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
                    Contraseña
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: undefined });
                      }}
                      placeholder="••••••••"
                      style={{
                        width: '100%',
                        padding: '11px 38px 11px 38px',
                        borderRadius: '6px',
                        border: `1.5px solid ${fieldErrors.password ? '#ef4444' : '#cbd5e1'}`,
                        backgroundColor: fieldErrors.password ? '#fff5f5' : '#ffffff',
                        fontSize: '15px',
                        outline: 'none',
                        color: '#0f172a',
                        boxSizing: 'border-box'
                      }}
                    />
                    <span style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: fieldErrors.password ? '#ef4444' : '#94a3b8',
                      display: 'flex'
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex'
                      }}
                    >
                      {showPassword ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                          <line x1="2" y1="2" x2="22" y2="22" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p style={{ color: '#dc2626', fontSize: '13.5px', margin: '4px 0 0 2px' }}>
                      &bull; {fieldErrors.password}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px',
                    marginTop: '8px',
                    backgroundColor: '#0b1e33',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.8 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 6px rgba(11, 30, 51, 0.25)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#162a42'; }}
                  onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#0b1e33'; }}
                >
                  {loading ? 'Validando credenciales...' : esStaff ? 'Ingresar como Personal' : 'Iniciar Sesión'}
                </button>
              </form>
            </div>
          ) : (
            /* VISTA: CAMBIO CONTRASEÑA OBLIGATORIA PRIMER INGRESO */
            <div>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 10px auto'
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
                  Configurá tu Contraseña
                </h2>
                <p style={{ color: '#64748b', fontSize: '14.5px', margin: 0 }}>
                  Por seguridad institucional, reemplazá tu contraseña provisoria por una definitiva.
                </p>
              </div>

              {generalSuccess && (
                <div style={{
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#15803d',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  marginBottom: '14px'
                }}>
                  {generalSuccess}
                </div>
              )}

              {generalError && (
                <div style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  marginBottom: '14px'
                }}>
                  {generalError}
                </div>
              )}

              <form onSubmit={handlePasswordUpdateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '5px' }}>
                    Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (fieldErrors.newPassword) setFieldErrors({ ...fieldErrors, newPassword: undefined });
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: `1.5px solid ${fieldErrors.newPassword ? '#ef4444' : '#cbd5e1'}`,
                      fontSize: '15px',
                      color: '#0f172a',
                      boxSizing: 'border-box'
                    }}
                  />
                  {fieldErrors.newPassword && (
                    <p style={{ color: '#dc2626', fontSize: '13.5px', margin: '4px 0 0 2px' }}>
                      &bull; {fieldErrors.newPassword}
                    </p>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '5px' }}>
                    Confirmar Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Repetí la contraseña"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (fieldErrors.confirmPassword) setFieldErrors({ ...fieldErrors, confirmPassword: undefined });
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: `1.5px solid ${fieldErrors.confirmPassword ? '#ef4444' : '#cbd5e1'}`,
                      fontSize: '15px',
                      color: '#0f172a',
                      boxSizing: 'border-box'
                    }}
                  />
                  {fieldErrors.confirmPassword && (
                    <p style={{ color: '#dc2626', fontSize: '13.5px', margin: '4px 0 0 2px' }}>
                      &bull; {fieldErrors.confirmPassword}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={updatingPass}
                  style={{
                    marginTop: '6px',
                    padding: '11px',
                    backgroundColor: '#15803d',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: updatingPass ? 'not-allowed' : 'pointer',
                    opacity: updatingPass ? 0.8 : 1
                  }}
                >
                  {updatingPass ? 'Guardando nueva clave...' : 'Guardar y Continuar'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}