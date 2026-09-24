'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { loginPortal, actualizarPasswordPrimerIngreso } from '../services/authPortales';

type PortalType = 'admin' | 'alumno' | 'profesor';

interface FieldErrors {
  identifier?: string;
  password?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export default function LoginView() {
  const { login } = useAuth(); // Para el login administrativo tradicional

  // Tipo de portal seleccionado
  const [portal, setPortal] = useState<PortalType>('admin');

  // Campos de formulario
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Estados para el flujo de primer ingreso (cambio de contraseña inicial)
  const [requiereCambioPass, setRequiereCambioPass] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPass, setUpdatingPass] = useState(false);

  // Estados de feedback y carga
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [generalSuccess, setGeneralSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getPlaceholder = () => {
    switch (portal) {
      case 'alumno':
        return 'Usuario (ej: acolque22)';
      case 'profesor':
        return 'Usuario (ej: prof.agimenez)';
      default:
        return 'mesa@ateneo.com';
    }
  };

  const getLabelIdentifier = () => {
    return portal === 'admin' ? 'Correo electrónico' : 'Usuario institucional';
  };

  const validateLoginForm = (): boolean => {
    const errors: FieldErrors = {};
    const cleanId = identifier.trim();

    if (!cleanId) {
      errors.identifier = portal === 'admin' 
        ? 'El correo electrónico es obligatorio.' 
        : 'El usuario institucional es obligatorio.';
    } else if (portal === 'admin' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanId)) {
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
    setGeneralError(null);
    setGeneralSuccess(null);

    if (!validateLoginForm()) return;

    setLoading(true);

    try {
      if (portal === 'admin') {
        // Login tradicional del panel administrativo
        await login(identifier.trim(), password);
      } else {
        // Autenticación con authPortales
        const resultado = await loginPortal(identifier, password, portal);

        if (resultado.debeCambiarPass) {
          setRequiereCambioPass(true);
          setGeneralSuccess('Primer ingreso detectado: configurá una contraseña definitiva.');
        } else {
          // Sesión iniciada con éxito; redirigir o actualizar contexto
          window.location.reload();
        }
      }
    } catch (err: any) {
      const rawMsg = (err?.message || '').toLowerCase();

      if (rawMsg.includes('invalid') || rawMsg.includes('incorrectos')) {
        setGeneralError('Usuario o contraseña incorrectos. Verificá los datos ingresados.');
      } else if (rawMsg.includes('permisos')) {
        setGeneralError(err.message);
      } else if (rawMsg.includes('not confirmed')) {
        setGeneralError('Esta cuenta aún no ha sido confirmada en el sistema.');
      } else if (rawMsg.includes('too many requests') || rawMsg.includes('rate limit')) {
        setGeneralError('Demasiados intentos fallidos. Por seguridad, aguardá unos minutos.');
      } else {
        setGeneralError(err.message || 'No se pudo iniciar sesión. Consultá con Mesa de Entrada.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: '#0b1e33',
      fontFamily: 'inherit'
    }}>
      {/* Panel Izquierdo: Branding Ateneo */}
      <div style={{
        flex: '1.1',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '56px 64px',
        backgroundColor: '#0b1e33',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '-15%',
          left: '-20%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,99,235,0.2) 0%, rgba(11,30,51,0) 70%)',
          pointerEvents: 'none'
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', zIndex: 1 }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '10px',
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.3)',
            padding: '4px',
            flexShrink: 0
          }}>
            <svg viewBox="0 0 120 120" width="36" height="36" fill="none" xmlns="http://www.w3.org/2000/svg">
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
            <div style={{ color: '#ffffff', fontWeight: 800, fontSize: '15px', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              Instituto Ateneo
            </div>
            <div style={{ color: '#94a3b8', fontSize: '11px', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
              Plataforma de Gestión Integral
            </div>
          </div>
        </div>

        {/* Copy institucional */}
        <div style={{ maxWidth: '440px', zIndex: 1 }}>
          <h2 style={{ fontSize: '32px', fontWeight: 700, color: '#f8fafc', lineHeight: 1.25, margin: '0 0 16px 0' }}>
            Control y gestión académica centralizada.
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
            Accedé a los legajos de alumnos, cronograma de turnos, cursos preparatorios y nómina docente con seguridad de accesos por rol.
          </p>
        </div>

        <div style={{ color: '#64748b', fontSize: '12px', zIndex: 1 }}>
          &copy; {new Date().getFullYear()} Instituto Ateneo. Acceso institucional.
        </div>
      </div>

      {/* Panel Derecho: Formulario */}
      <div style={{
        flex: '1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        backgroundColor: '#f8fafc'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '430px',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '36px 32px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.02)'
        }}>

          {!requiereCambioPass ? (
            /* --- VISTA: INICIO DE SESIÓN --- */
            <>
              {/* Selector de Portales */}
              <div style={{
                display: 'flex',
                backgroundColor: '#f1f5f9',
                padding: '3px',
                borderRadius: '8px',
                marginBottom: '24px',
                gap: '2px'
              }}>
                <button
                  type="button"
                  onClick={() => { setPortal('admin'); setFieldErrors({}); setGeneralError(null); }}
                  style={{
                    flex: 1,
                    padding: '8px 4px',
                    fontSize: '11.5px',
                    fontWeight: portal === 'admin' ? 700 : 600,
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: portal === 'admin' ? '#0b1e33' : 'transparent',
                    color: portal === 'admin' ? '#ffffff' : '#64748b',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Mesa Entrada
                </button>
                <button
                  type="button"
                  onClick={() => { setPortal('alumno'); setFieldErrors({}); setGeneralError(null); }}
                  style={{
                    flex: 1,
                    padding: '8px 4px',
                    fontSize: '11.5px',
                    fontWeight: portal === 'alumno' ? 700 : 600,
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: portal === 'alumno' ? '#0b1e33' : 'transparent',
                    color: portal === 'alumno' ? '#ffffff' : '#64748b',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Alumnos
                </button>
                <button
                  type="button"
                  onClick={() => { setPortal('profesor'); setFieldErrors({}); setGeneralError(null); }}
                  style={{
                    flex: 1,
                    padding: '8px 4px',
                    fontSize: '11.5px',
                    fontWeight: portal === 'profesor' ? 700 : 600,
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: portal === 'profesor' ? '#0b1e33' : 'transparent',
                    color: portal === 'profesor' ? '#ffffff' : '#64748b',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Profesores
                </button>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
                  {portal === 'admin' && 'Panel Administrativo'}
                  {portal === 'alumno' && 'Portal del Estudiante'}
                  {portal === 'profesor' && 'Portal Docente'}
                </h1>
                <p style={{ color: '#64748b', fontSize: '12.5px', margin: 0 }}>
                  {portal === 'admin'
                    ? 'Ingresá con tu correo institucional asignado.'
                    : 'Ingresá con tu usuario y contraseña (inicialmente tu DNI).'}
                </p>
              </div>

              {/* Feedback Error */}
              {generalError && (
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  lineHeight: 1.4,
                  marginBottom: '18px'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{generalError}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Campo Identificador */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
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
                        padding: '10px 12px 10px 38px',
                        borderRadius: '6px',
                        border: `1.5px solid ${fieldErrors.identifier ? '#ef4444' : '#cbd5e1'}`,
                        backgroundColor: fieldErrors.identifier ? '#fff5f5' : '#ffffff',
                        fontSize: '13px',
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
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="7" r="4" />
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      </svg>
                    </span>
                  </div>
                  {fieldErrors.identifier && (
                    <p style={{ color: '#dc2626', fontSize: '11.5px', margin: '4px 0 0 2px' }}>
                      &bull; {fieldErrors.identifier}
                    </p>
                  )}
                </div>

                {/* Campo Contraseña */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
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
                      placeholder={portal === 'admin' ? '••••••••' : 'DNI o contraseña elegida'}
                      style={{
                        width: '100%',
                        padding: '10px 38px 10px 38px',
                        borderRadius: '6px',
                        border: `1.5px solid ${fieldErrors.password ? '#ef4444' : '#cbd5e1'}`,
                        backgroundColor: fieldErrors.password ? '#fff5f5' : '#ffffff',
                        fontSize: '13px',
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
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                          <line x1="2" y1="2" x2="22" y2="22" />
                        </svg>
                      ) : (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p style={{ color: '#dc2626', fontSize: '11.5px', margin: '4px 0 0 2px' }}>
                      &bull; {fieldErrors.password}
                    </p>
                  )}
                </div>

                {/* Botón Iniciar Sesión */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '11px',
                    marginTop: '6px',
                    backgroundColor: '#0b1e33',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.8 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 4px rgba(11, 30, 51, 0.2)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#162a42'; }}
                  onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#0b1e33'; }}
                >
                  {loading ? (
                    <>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 0.8s linear infinite' }}>
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                      <span>Validando credenciales...</span>
                    </>
                  ) : (
                    'Iniciar Sesión'
                  )}
                </button>
              </form>

              <div style={{
                marginTop: '24px',
                borderTop: '1px solid #f1f5f9',
                paddingTop: '16px',
                textAlign: 'center',
                fontSize: '11.5px',
                color: '#94a3b8'
              }}>
                ¿Olvidaste tu contraseña? Solicitá un reseteo en Mesa de Entrada.
              </div>
            </>
          ) : (
            /* --- VISTA: ACTUALIZACIÓN DE CONTRASEÑA EN PRIMER INGRESO --- */
            <div>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 10px auto'
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
                  Configurá tu Contraseña
                </h2>
                <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>
                  Por seguridad institucional, reemplazá tu contraseña provisoria (DNI) por una personal.
                </p>
              </div>

              {generalSuccess && (
                <div style={{
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#15803d',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
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
                  fontSize: '12px',
                  marginBottom: '14px'
                }}>
                  {generalError}
                </div>
              )}

              <form onSubmit={handlePasswordUpdateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1e293b', marginBottom: '5px' }}>
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
                      fontSize: '13px',
                      color: '#0f172a',
                      boxSizing: 'border-box'
                    }}
                  />
                  {fieldErrors.newPassword && (
                    <p style={{ color: '#dc2626', fontSize: '11.5px', margin: '4px 0 0 2px' }}>
                      &bull; {fieldErrors.newPassword}
                    </p>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1e293b', marginBottom: '5px' }}>
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
                      fontSize: '13px',
                      color: '#0f172a',
                      boxSizing: 'border-box'
                    }}
                  />
                  {fieldErrors.confirmPassword && (
                    <p style={{ color: '#dc2626', fontSize: '11.5px', margin: '4px 0 0 2px' }}>
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
                    fontSize: '13px',
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

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}