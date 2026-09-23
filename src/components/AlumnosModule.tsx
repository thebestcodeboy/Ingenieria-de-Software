'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { 
  getAlumnos, 
  createAlumno, 
  calcularCuilArgentino, 
  validarDireccionReal 
} from '../services/alumnos';

export default function AlumnosModule() {
  const [alumnos, setAlumnos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal HU01 - Registrar Alumno
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    dni: '',
    telefono: '',
    email: '',
    direccion: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // HU02 - Consultar Ficha del Alumno (Solo lectura)
  const [selectedAlumno, setSelectedAlumno] = useState<any | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const data = await getAlumnos();
      setAlumnos(data || []);
    } catch (err: any) {
      console.error('Error al cargar alumnos:', err);
      const msg = err?.message || 'Error al conectar con la base de datos';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const cuilCalculado = useMemo(() => {
    if (formData.dni.length === 8) {
      const res = calcularCuilArgentino(formData.dni);
      return res ? res.cuit : '';
    }
    return '';
  }, [formData.dni]);

  const filteredAlumnos = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return alumnos;
    return alumnos.filter((a) => {
      const fullName = `${a.apellido || ''} ${a.nombre || ''}`.toLowerCase();
      const dniStr = String(a.dni || '');
      const legajoStr = String(a.legajo || '').toLowerCase();
      return fullName.includes(term) || dniStr.includes(term) || legajoStr.includes(term);
    });
  }, [alumnos, searchTerm]);

  // Formato formal en MAYÚSCULAS para legajos
  const obtenerLegajo = (alumno: any, index: number) => {
    if (alumno.legajo) return String(alumno.legajo).toUpperCase();
    return `LEG-2026-${String(index + 1).padStart(4, '0')}`;
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    const filteredValue = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
    setFormData({ ...formData, [e.target.name]: filteredValue });
  };

  const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    const onlyDigits = e.target.value.replace(/\D/g, '');
    setFormData({ ...formData, [e.target.name]: onlyDigits });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validarYFormatearTexto = (texto: string, campo: string) => {
    const limpio = texto.trim().replace(/\s+/g, ' ');

    if (!limpio) {
      return { error: `El campo ${campo} es obligatorio.` };
    }

    if (limpio.length < 3) {
      return { error: `El ${campo} debe tener al menos 3 caracteres.` };
    }

    const palabras = limpio.split(' ');
    const nexosPermitidos = ['de', 'del', 'la', 'las', 'los', 'di', 'da', 'san', 'santa'];

    for (let i = 0; i < palabras.length; i++) {
      const p = palabras[i].toLowerCase();

      if (p.length === 1) {
        return { error: `El ${campo} no puede contener letras sueltas o espacios intermedios.` };
      }

      if (p.length < 4 && !nexosPermitidos.includes(p)) {
        return { error: `"${palabras[i]}" no parece un ${campo} completo. Verifique que no haya espacios en medio de la palabra.` };
      }

      if (/(\w{2,3})\1{1,}/.test(p) || /asdf|qwer|zxcv|1234/.test(p)) {
        return { error: `El ${campo} contiene secuencias de caracteres no permitidas.` };
      }
    }

    return { limpio: limpio.toUpperCase() };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // 1. Nombre y Apellido
    const nomResult = validarYFormatearTexto(formData.nombre, 'nombre');
    if (nomResult.error) {
      setErrorMsg(nomResult.error);
      return;
    }

    const apeResult = validarYFormatearTexto(formData.apellido, 'apellido');
    if (apeResult.error) {
      setErrorMsg(apeResult.error);
      return;
    }

    // 2. DNI
    const dniLimpio = formData.dni.trim();
    if (dniLimpio.length !== 8) {
      setErrorMsg('El DNI debe contener exactamente 8 dígitos.');
      return;
    }
    const dniNum = parseInt(dniLimpio, 10);
    if (dniNum < 10000000 || dniNum > 56000000) {
      setErrorMsg('El DNI no corresponde a un rango demográfico válido (10 a 56 millones).');
      return;
    }
    if (/^(\d)\1{7}$/.test(dniLimpio)) {
      setErrorMsg('El DNI no puede ser un número repetido.');
      return;
    }
    if (dniLimpio.includes('123456') || dniLimpio.includes('654321') || dniLimpio.endsWith('000000')) {
      setErrorMsg('El DNI contiene una secuencia de prueba no permitida.');
      return;
    }

    // 3. Teléfono
    let telLimpio = formData.telefono.replace(/\D/g, '');
    if (telLimpio) {
      if (telLimpio.length === 11 && telLimpio.startsWith('0')) {
        telLimpio = telLimpio.slice(1);
      }
      if (telLimpio.length !== 10 && telLimpio.length !== 12 && telLimpio.length !== 13) {
        setErrorMsg('El teléfono debe contener 10 dígitos (código de área + número local. Ej: 2914476052).');
        return;
      }
    }

    // 4. Correo Electrónico
    const emailLimpio = formData.email.trim().toLowerCase();
    if (emailLimpio) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(emailLimpio)) {
        setErrorMsg('El formato del correo electrónico es inválido.');
        return;
      }
      const [usuario] = emailLimpio.split('@');
      if (telLimpio && usuario === telLimpio) {
        setErrorMsg('El correo electrónico no puede ser el mismo número de teléfono.');
        return;
      }
      if (/(\w{2,3})\1{2,}/.test(usuario) || /asdf|qwer|zxcv|test|prueba/.test(usuario)) {
        setErrorMsg('El correo electrónico contiene patrones de prueba no permitidos.');
        return;
      }
    }

    // 5. Domicilio
    const checkDir = validarDireccionReal(formData.direccion);
    if (!checkDir.valido) {
      setErrorMsg(checkDir.error || 'El domicilio no es válido.');
      return;
    }

    try {
      setSubmitting(true);
      await createAlumno({
        nombre: nomResult.limpio,
        apellido: apeResult.limpio,
        dni: dniLimpio,
        telefono: telLimpio || null,
        email: emailLimpio || null,
        direccion: checkDir.direccionLimpia,
      });

      setFormData({ nombre: '', apellido: '', dni: '', telefono: '', email: '', direccion: '' });
      setShowModal(false);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al registrar el alumno.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ 
      width: '100%', 
      padding: '32px 40px', 
      boxSizing: 'border-box',
      color: '#0f172a' 
    }}>
      
      {/* Encabezado */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#0f172a',
            margin: 0,
            letterSpacing: '-0.02em'
          }}>
            Padrón de Alumnos
          </h1>
          <p style={{ color: '#475569', fontSize: '13px', margin: '4px 0 0 0', fontWeight: 500 }}>
            {alumnos.length} {alumnos.length === 1 ? 'estudiante matriculado' : 'estudiantes matriculados'}
          </p>
        </div>

        <button
          onClick={() => { setErrorMsg(''); setShowModal(true); }}
          style={{
            backgroundColor: '#0b1e33',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            padding: '10px 20px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 4px rgba(11, 30, 51, 0.12)',
            transition: 'background-color 0.15s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1e3a5f'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0b1e33'}
        >
          <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span> Registrar Alumno
        </button>
      </div>

      {errorMsg && !showModal && (
        <div style={{
          backgroundColor: '#fee2e2',
          border: '1px solid #fca5a5',
          color: '#991b1b',
          padding: '10px 14px',
          borderRadius: '6px',
          fontSize: '13px',
          marginBottom: '16px'
        }}>
          {errorMsg}
        </div>
      )}

      {/* Buscador */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          border: '1.5px solid #cbd5e1',
          borderRadius: '6px',
          padding: '10px 14px',
          gap: '10px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
        }}>
          <span style={{ color: '#334155', display: 'flex' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Buscar por apellido, nombre o DNI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              width: '100%',
              fontSize: '13px',
              color: '#0f172a',
              backgroundColor: 'transparent',
              fontWeight: 500
            }}
          />
        </div>
      </div>

      {/* Tabla institucional: APELLIDO, NOMBRE (con coma) */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 2px 4px rgba(15, 23, 42, 0.05)'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #cbd5e1', backgroundColor: '#f1f5f9' }}>
              <th style={{ 
                padding: '14px 24px', 
                fontWeight: 700, 
                color: '#0f172a', 
                fontSize: '12px', 
                letterSpacing: '0.06em', 
                textTransform: 'uppercase', 
                width: '58%' 
              }}>
                APELLIDO Y NOMBRE
              </th>
              <th style={{ 
                padding: '14px 24px', 
                fontWeight: 700, 
                color: '#0f172a', 
                fontSize: '12px', 
                letterSpacing: '0.06em', 
                textTransform: 'uppercase', 
                width: '22%' 
              }}>
                DNI
              </th>
              <th style={{ 
                padding: '14px 24px', 
                fontWeight: 700, 
                color: '#0f172a', 
                fontSize: '12px', 
                letterSpacing: '0.06em', 
                textTransform: 'uppercase', 
                width: '10%', 
                textAlign: 'center' 
              }}>
                ESTADO
              </th>
              <th style={{ 
                padding: '14px 24px', 
                textAlign: 'center', 
                fontWeight: 700, 
                color: '#0f172a', 
                fontSize: '12px', 
                letterSpacing: '0.06em', 
                textTransform: 'uppercase', 
                width: '10%' 
              }}>
                ACCIÓN
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#475569', fontWeight: 500 }}>
                  Cargando padrón de alumnos...
                </td>
              </tr>
            ) : filteredAlumnos.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '54px 20px', textAlign: 'center', color: '#64748b' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>
                    No se encontraron alumnos registrados
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    Registra un nuevo estudiante con el botón superior "+ Registrar Alumno".
                  </div>
                </td>
              </tr>
            ) : (
              filteredAlumnos.map((a, idx) => {
                const esActivo = a.activo !== false && a.estado !== 'INACTIVO';
                const legajoTexto = obtenerLegajo(a, idx);

                return (
                  <tr 
                    key={a.id || a.alumno_id || idx} 
                    style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer', transition: 'background-color 0.15s ease' }}
                    onClick={() => setSelectedAlumno({ ...a, legajoVisual: legajoTexto })}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                  >
                    {/* Apellido y Nombre CON COMA */}
                    <td style={{ padding: '16px 24px', color: '#0f172a', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase' }}>
                      {a.apellido}, {a.nombre}
                    </td>

                    {/* DNI */}
                    <td style={{ padding: '16px 24px', color: '#0b1e33', fontWeight: 700, fontSize: '13.5px', letterSpacing: '0.02em' }}>
                      {a.dni}
                    </td>

                    {/* Estado */}
                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        backgroundColor: esActivo ? '#f0fdf4' : '#fef2f2',
                        color: esActivo ? '#15803d' : '#b91c1c',
                        border: `1px solid ${esActivo ? '#86efac' : '#fca5a5'}`
                      }}>
                        {esActivo ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </td>

                    {/* Acción */}
                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAlumno({ ...a, legajoVisual: legajoTexto });
                        }}
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #94a3b8',
                          color: '#0b1e33',
                          borderRadius: '5px',
                          padding: '6px 14px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#0b1e33';
                          e.currentTarget.style.color = '#ffffff';
                          e.currentTarget.style.borderColor = '#0b1e33';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#ffffff';
                          e.currentTarget.style.color = '#0b1e33';
                          e.currentTarget.style.borderColor = '#94a3b8';
                        }}
                      >
                        Ver Ficha
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* HU02: Modal Ficha del Alumno (Opción B: Legajo • DNI-LE-LC separados formalmente) */}
      {selectedAlumno && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 110,
          backdropFilter: 'blur(2px)'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '580px',
            padding: '32px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            boxSizing: 'border-box'
          }}>
            {/* Cabecera de la ficha */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '26px' }}>
              {/* Avatar oscuro original (#0b1e33) */}
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '10px',
                backgroundColor: '#0b1e33',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                fontWeight: 700,
                textTransform: 'uppercase',
                flexShrink: 0,
                boxShadow: '0 2px 4px rgba(11, 30, 51, 0.2)'
              }}>
                {selectedAlumno.nombre?.charAt(0)}{selectedAlumno.apellido?.charAt(0)}
              </div>
              
              <div style={{ flex: 1 }}>
                {/* Nombre SIN COMA */}
                <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
                  {selectedAlumno.apellido} {selectedAlumno.nombre}
                </h2>
                {/* Opción B: Separador sutil • entre Legajo y DNI */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap' }}>
                  <span style={{ 
                    fontSize: '12px', 
                    fontFamily: 'monospace', 
                    fontWeight: 700, 
                    color: '#0b1e33', 
                    backgroundColor: '#f1f5f9', 
                    border: '1px solid #cbd5e1', 
                    padding: '3px 8px', 
                    borderRadius: '4px',
                    textTransform: 'uppercase'
                  }}>
                    {(selectedAlumno.legajo || selectedAlumno.legajoVisual).toUpperCase()}
                  </span>
                  <span style={{ color: '#cbd5e1', fontWeight: 700 }}>•</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0b1e33' }}>
                    DNI-LE-LC: {selectedAlumno.dni}
                  </span>
                </div>
              </div>

              <span style={{
                display: 'inline-block',
                padding: '5px 10px',
                borderRadius: '5px',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.04em',
                backgroundColor: (selectedAlumno.activo !== false && selectedAlumno.estado !== 'INACTIVO') ? '#f0fdf4' : '#fef2f2',
                color: (selectedAlumno.activo !== false && selectedAlumno.estado !== 'INACTIVO') ? '#15803d' : '#b91c1c',
                border: `1px solid ${(selectedAlumno.activo !== false && selectedAlumno.estado !== 'INACTIVO') ? '#86efac' : '#fca5a5'}`
              }}>
                {(selectedAlumno.activo !== false && selectedAlumno.estado !== 'INACTIVO') ? 'ACTIVO' : 'INACTIVO'}
              </span>
            </div>

            {/* Datos del expediente */}
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '20px 24px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              rowGap: '18px',
              columnGap: '20px',
              marginBottom: '26px'
            }}>
              <div>
                <span style={{ display: 'block', fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  CUIL
                </span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '2px', display: 'block' }}>
                  {calcularCuilArgentino(selectedAlumno.dni)?.cuit || '-'}
                </span>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Teléfono
                </span>
                <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: 500, marginTop: '2px', display: 'block' }}>
                  {selectedAlumno.telefono || 'No registrado'}
                </span>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ display: 'block', fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Correo Electrónico
                </span>
                <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: 500, marginTop: '2px', display: 'block' }}>
                  {selectedAlumno.email || 'No registrado'}
                </span>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ display: 'block', fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Domicilio
                </span>
                <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: 500, marginTop: '2px', display: 'block' }}>
                  {selectedAlumno.direccion || 'No registrado'}
                </span>
              </div>
            </div>

            {/* Pie del modal */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSelectedAlumno(null)}
                style={{
                  backgroundColor: '#0b1e33',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 24px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#ffffff',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(11, 30, 51, 0.15)'
                }}
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HU01: Modal Registrar Nuevo Alumno */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          backdropFilter: 'blur(2px)'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '500px',
            padding: '28px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            boxSizing: 'border-box'
          }}>
            <h2 style={{ fontSize: '19px', fontWeight: 700, margin: '0 0 20px 0', color: '#0f172a' }}>
              Registrar Nuevo Alumno
            </h2>

            {errorMsg && (
              <div style={{
                backgroundColor: '#fee2e2',
                border: '1px solid #fca5a5',
                color: '#991b1b',
                padding: '9px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                marginBottom: '16px'
              }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                    Nombre
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    required
                    placeholder="Ej: PABLO"
                    value={formData.nombre}
                    onChange={handleTextChange}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '13px', color: '#0f172a', boxSizing: 'border-box', textTransform: 'uppercase', fontWeight: 500 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                    Apellido
                  </label>
                  <input
                    type="text"
                    name="apellido"
                    required
                    placeholder="Ej: PÉREZ"
                    value={formData.apellido}
                    onChange={handleTextChange}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '13px', color: '#0f172a', boxSizing: 'border-box', textTransform: 'uppercase', fontWeight: 500 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                    DNI
                  </label>
                  <input
                    type="text"
                    name="dni"
                    required
                    maxLength={8}
                    placeholder="Ej: 45849876"
                    value={formData.dni}
                    onChange={handleNumericChange}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '13px', color: '#0b1e33', boxSizing: 'border-box', fontWeight: 700 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                    CUIL
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    placeholder="Generando..."
                    value={cuilCalculado}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', color: '#0b1e33', backgroundColor: '#f1f5f9', fontWeight: 700, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                    Teléfono
                  </label>
                  <input
                    type="text"
                    name="telefono"
                    maxLength={13}
                    placeholder="Ej: 3874123456"
                    value={formData.telefono}
                    onChange={handleNumericChange}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '13px', color: '#0f172a', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                    Domicilio (Opcional)
                  </label>
                  <input
                    type="text"
                    name="direccion"
                    placeholder="Ej: Av. Belgrano 1234"
                    value={formData.direccion}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '13px', color: '#0f172a', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="Ej: alumno@ejemplo.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '13px', color: '#0f172a', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    backgroundColor: 'transparent',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '9px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    backgroundColor: '#0b1e33',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '9px 20px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#ffffff',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1
                  }}
                >
                  {submitting ? 'Guardando...' : 'Guardar Alumno'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}