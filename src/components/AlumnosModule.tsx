'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { 
  getAlumnos, 
  createAlumno,
  updateAlumno,
  cambiarEstadoAlumno,
  calcularCuilArgentino, 
  validarDireccionReal 
} from '../services/alumnos';
import { generateStudentUsername } from '../utils/credentials';

type Alumno = {
  id?: string;
  alumno_id?: string;
  nombre: string;
  apellido: string;
  dni: string | number;
  legajo?: string;
  legajoVisual?: string;
  activo?: boolean;
  estado?: string;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  acceso_portal?: boolean;
  username_institucional?: string | null;
};

type CredencialesModal = {
  nombreCompleto: string;
  legajo: string;
  usuario: string;
  claveProvisoria: string;
};

function mensajeDeError(error: unknown, mensajePorDefecto: string): string {
  return error instanceof Error ? error.message : mensajePorDefecto;
}

export default function AlumnosModule() {
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterEstado, setFilterEstado] = useState<string>('TODOS');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Modal Registrar Alumno
  const [showModal, setShowModal] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    dni: '',
    telefono: '',
    email: '',
    direccion: '',
  });
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Modal de Credenciales Web
  const [credencialesModal, setCredencialesModal] = useState<CredencialesModal | null>(null);
  const [copiado, setCopiado] = useState<boolean>(false);
  const [generandoAcceso, setGenerandoAcceso] = useState<boolean>(false);

  // Ficha y Edición del Alumno
  const [selectedAlumno, setSelectedAlumno] = useState<Alumno | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editSubmitting, setEditSubmitting] = useState<boolean>(false);
  const [editFormData, setEditFormData] = useState({
    nombre: '',
    apellido: '',
    dni: '',
    telefono: '',
    email: '',
    direccion: '',
    activo: true
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const data = await getAlumnos();
      setAlumnos(data || []);
    } catch (err: unknown) {
      setErrorMsg(mensajeDeError(err, 'Error al conectar con la base de datos'));
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

  const obtenerLegajo = (alumno: Alumno, index: number) => {
    if (alumno.legajo) return String(alumno.legajo).toUpperCase();
    return `LEG-2026-${String(index + 1).padStart(4, '0')}`;
  };

  const estaAlumnoActivo = (alumno: Alumno) => {
    if (alumno.activo !== undefined && alumno.activo !== null) {
      return Boolean(alumno.activo);
    }
    if (alumno.estado) {
      return alumno.estado.toUpperCase() === 'ACTIVO';
    }
    return true;
  };

  const filteredAlumnos = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return alumnos.filter((a) => {
      const fullName = `${a.apellido || ''} ${a.nombre || ''}`.toLowerCase();
      const dniStr = String(a.dni || '');
      const legajoStr = String(a.legajo || '').toLowerCase();
      const matchTerm = !term || fullName.includes(term) || dniStr.includes(term) || legajoStr.includes(term);
      const matchEstado = filterEstado === 'TODOS' || estaAlumnoActivo(a) === (filterEstado === 'ACTIVO');
      return matchTerm && matchEstado;
    });
  }, [alumnos, searchTerm, filterEstado]);

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
    if (!limpio) return { error: `El campo ${campo} es obligatorio.` };
    if (limpio.length < 3) return { error: `El ${campo} debe tener al menos 3 caracteres.` };

    const palabras = limpio.split(' ');
    const nexosPermitidos = ['de', 'del', 'la', 'las', 'los', 'di', 'da', 'san', 'santa'];

    for (let i = 0; i < palabras.length; i++) {
      const p = palabras[i].toLowerCase();
      if (p.length === 1) return { error: `El ${campo} no puede contener letras sueltas.` };
      if (p.length < 4 && !nexosPermitidos.includes(p)) {
        return { error: `"${palabras[i]}" no parece un ${campo} completo.` };
      }
      if (/(\w{2,3})\1{1,}/.test(p) || /asdf|qwer|zxcv|1234/.test(p)) {
        return { error: `El ${campo} contiene secuencias de caracteres no permitidas.` };
      }
    }
    return { limpio: limpio.toUpperCase() };
  };

  const copiarCredenciales = () => {
    if (!credencialesModal) return;
    const texto = `INSTITUTO ATENEO - ACCESO ALUMNO\nEstudiante: ${credencialesModal.nombreCompleto}\nLegajo: ${credencialesModal.legajo}\nUsuario: ${credencialesModal.usuario}\nContraseña provisoria: ${credencialesModal.claveProvisoria}`;
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  const handleHabilitarAcceso = async (alumno: Alumno) => {
    try {
      setGenerandoAcceso(true);
      setErrorMsg('');

      const alumnoId = alumno.id || alumno.alumno_id;
      const legajoTexto = alumno.legajo || alumno.legajoVisual || obtenerLegajo(alumno, 0);
      const username = generateStudentUsername(alumno.nombre, alumno.apellido, legajoTexto);

      const res = await fetch('/api/alumnos/crear-acceso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alumnoId,
          nombre: alumno.nombre,
          apellido: alumno.apellido,
          dni: String(alumno.dni),
          legajo: legajoTexto,
          username,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo habilitar el acceso.');

      const updated: Alumno = {
        ...alumno,
        acceso_portal: true,
        username_institucional: data.usuario,
      };
      setSelectedAlumno(updated);

      setCredencialesModal({
        nombreCompleto: `${alumno.apellido}, ${alumno.nombre}`,
        legajo: legajoTexto,
        usuario: data.usuario,
        claveProvisoria: data.claveProvisoria,
      });

      await loadData();
    } catch (err: unknown) {
      alert(mensajeDeError(err, 'Error al habilitar credenciales'));
    } finally {
      setGenerandoAcceso(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      setEditSubmitting(true);
      const alumnoId = selectedAlumno?.id || selectedAlumno?.alumno_id;
      if (!alumnoId) throw new Error('No se pudo identificar al alumno.');

      await updateAlumno(alumnoId, editFormData);
      
      const estadoActual = estaAlumnoActivo(selectedAlumno);
      if (estadoActual !== editFormData.activo) {
        await cambiarEstadoAlumno(alumnoId, editFormData.activo);
      }
      
      setSuccessMsg('Alumno modificado correctamente.');
      setTimeout(() => setSuccessMsg(''), 4000);
      
      setIsEditing(false);
      setSelectedAlumno(null);
      await loadData(); 
    } catch (err: unknown) {
      setErrorMsg(mensajeDeError(err, 'Error al modificar el alumno.'));
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const nomResult = validarYFormatearTexto(formData.nombre, 'nombre');
    if (nomResult.error) return setErrorMsg(nomResult.error);

    const apeResult = validarYFormatearTexto(formData.apellido, 'apellido');
    if (apeResult.error) return setErrorMsg(apeResult.error);

    const dniLimpio = formData.dni.trim();
    if (dniLimpio.length !== 8) return setErrorMsg('El DNI debe contener exactamente 8 dígitos.');
    
    const dniNum = parseInt(dniLimpio, 10);
    if (dniNum < 10000000 || dniNum > 56000000) {
      return setErrorMsg('El DNI no corresponde a un rango demográfico válido (10 a 56 millones).');
    }
    if (/^(\d)\1{7}$/.test(dniLimpio)) return setErrorMsg('El DNI no puede ser un número repetido.');

    let telLimpio = formData.telefono.replace(/\D/g, '');
    if (telLimpio) {
      if (telLimpio.length === 11 && telLimpio.startsWith('0')) telLimpio = telLimpio.slice(1);
      if (telLimpio.length !== 10 && telLimpio.length !== 12 && telLimpio.length !== 13) {
        return setErrorMsg('El teléfono debe contener 10 dígitos (código de área + número local. Ej: 3874123456).');
      }
    }

    const emailLimpio = formData.email.trim().toLowerCase();
    if (emailLimpio) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(emailLimpio)) return setErrorMsg('El formato del correo electrónico es inválido.');
    }

    const checkDir = validarDireccionReal(formData.direccion);
    if (!checkDir.valido) return setErrorMsg(checkDir.error || 'El domicilio no es válido.');

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

      setSuccessMsg('Alumno registrado correctamente.');
      setTimeout(() => setSuccessMsg(''), 4000);

      setFormData({ nombre: '', apellido: '', dni: '', telefono: '', email: '', direccion: '' });
      setShowModal(false);
      await loadData();
    } catch (err: unknown) {
      setErrorMsg(mensajeDeError(err, 'Error al registrar el alumno.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ width: '100%', padding: '32px 40px', boxSizing: 'border-box', color: '#0f172a', fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}>
      
      {/* Encabezado con mayor jerarquía */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
            Padrón de Alumnos
          </h1>
          <p style={{ color: '#475569', fontSize: '14px', margin: '4px 0 0 0', fontWeight: 500 }}>
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
            padding: '11px 22px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 4px rgba(11, 30, 51, 0.12)',
            transition: 'background-color 0.15s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1e3a5f'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0b1e33'}
        >
          <span style={{ fontSize: '18px', lineHeight: 1 }}>+</span> Registrar Alumno
        </button>
      </div>

      {errorMsg && !showModal && !isEditing && (
        <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '12px 16px', borderRadius: '6px', fontSize: '14px', marginBottom: '16px', fontWeight: 500 }}>
          {errorMsg}
        </div>
      )}

      {successMsg && !showModal && !isEditing && (
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: '12px 16px', borderRadius: '6px', fontSize: '14px', marginBottom: '16px', fontWeight: 500 }}>
          {successMsg}
        </div>
      )}

      {/* Buscador y Filtro con tipografía de 14px */}
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
              fontSize: '14px',
              color: '#0f172a',
              backgroundColor: 'transparent',
              fontWeight: 500
            }}
          />
        </div>
        <select
          aria-label="Filtrar alumnos por estado"
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value)}
          style={{ padding: '10px 16px', border: '1.5px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', backgroundColor: '#ffffff', color: '#0f172a', fontWeight: 600, cursor: 'pointer' }}
        >
          <option value="TODOS">Todos los estados</option>
          <option value="ACTIVO">Activos</option>
          <option value="INACTIVO">Inactivos</option>
        </select>
      </div>

      {/* Tabla con fuentes aumentadas a 13.5px / 14px */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(15, 23, 42, 0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #cbd5e1', backgroundColor: '#f1f5f9' }}>
              <th style={{ padding: '15px 20px', fontWeight: 800, color: '#0f172a', fontSize: '13px', letterSpacing: '0.05em', textTransform: 'uppercase', width: '38%' }}>APELLIDO Y NOMBRE</th>
              <th style={{ padding: '15px 20px', fontWeight: 800, color: '#0f172a', fontSize: '13px', letterSpacing: '0.05em', textTransform: 'uppercase', width: '22%' }}>DNI</th>
              <th style={{ padding: '15px 20px', fontWeight: 800, color: '#0f172a', fontSize: '13px', letterSpacing: '0.05em', textTransform: 'uppercase', width: '14%', textAlign: 'center' }}>ESTADO</th>
              <th style={{ padding: '15px 20px', fontWeight: 800, color: '#0f172a', fontSize: '13px', letterSpacing: '0.05em', textTransform: 'uppercase', width: '14%', textAlign: 'center' }}>PORTAL WEB</th>
              <th style={{ padding: '15px 20px', textAlign: 'center', fontWeight: 800, color: '#0f172a', fontSize: '13px', letterSpacing: '0.05em', textTransform: 'uppercase', width: '12%' }}>ACCIÓN</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: '#475569', fontWeight: 500, fontSize: '14px' }}>
                  Cargando padrón de alumnos...
                </td>
              </tr>
            ) : filteredAlumnos.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '54px 20px', textAlign: 'center', color: '#64748b' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '15px' }}>No se encontraron alumnos registrados</div>
                  <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Utiliza el botón superior &quot;+ Registrar Alumno&quot; para dar de alta a un estudiante.</div>
                </td>
              </tr>
            ) : (
              filteredAlumnos.map((alumno, idx) => {
                const legajoTexto = obtenerLegajo(alumno, idx);
                const activo = estaAlumnoActivo(alumno);

                return (
                  <tr 
                    key={alumno.id || alumno.alumno_id || idx} 
                    style={{ borderBottom: '1px solid #e2e8f0', transition: 'background-color 0.15s ease' }} 
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'} 
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                  >
                    <td style={{ padding: '16px 20px', color: '#0f172a', fontWeight: 600, fontSize: '14px', textTransform: 'uppercase' }}>
                      {alumno.apellido}, {alumno.nombre}
                    </td>
                    <td style={{ padding: '16px 20px', color: '#0b1e33', fontWeight: 700, fontSize: '14px' }}>
                      {String(alumno.dni).padStart(8, '0')}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <span
                        style={{
                          backgroundColor: activo ? '#f0fdf4' : '#fef2f2',
                          color: activo ? '#15803d' : '#991b1b',
                          border: `1.5px solid ${activo ? '#bbf7d0' : '#fca5a5'}`,
                          padding: '4px 12px',
                          borderRadius: '5px',
                          fontSize: '12px',
                          fontWeight: 800,
                          letterSpacing: '0.04em',
                          userSelect: 'none',
                          display: 'inline-block'
                        }}
                      >
                        {activo ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: '5px',
                        fontSize: '12px',
                        fontWeight: 700,
                        letterSpacing: '0.03em',
                        backgroundColor: alumno.acceso_portal ? '#eff6ff' : '#f8fafc',
                        color: alumno.acceso_portal ? '#1d4ed8' : '#94a3b8',
                        border: `1px solid ${alumno.acceso_portal ? '#bfdbfe' : '#e2e8f0'}`
                      }}>
                        {alumno.acceso_portal ? 'HABILITADO' : 'SIN ACCESO'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <button
                        onClick={() => setSelectedAlumno({ ...alumno, legajoVisual: legajoTexto })}
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1.5px solid #94a3b8',
                          color: '#0b1e33',
                          borderRadius: '6px',
                          padding: '7px 16px',
                          fontSize: '13px',
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

      {/* MODAL FICHA / EDICIÓN */}
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
            maxWidth: isEditing ? '540px' : '600px',
            padding: '32px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            boxSizing: 'border-box',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            {!isEditing ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '22px' }}>
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
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    flexShrink: 0
                  }}>
                    {selectedAlumno.nombre?.charAt(0)}{selectedAlumno.apellido?.charAt(0)}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#0f172a', textTransform: 'uppercase' }}>
                        {selectedAlumno.apellido} {selectedAlumno.nombre}
                      </h2>
                      <span style={{
                        display: 'inline-block',
                        backgroundColor: estaAlumnoActivo(selectedAlumno) ? '#f0fdf4' : '#f1f5f9',
                        color: estaAlumnoActivo(selectedAlumno) ? '#15803d' : '#64748b',
                        border: `1.5px solid ${estaAlumnoActivo(selectedAlumno) ? '#bbf7d0' : '#cbd5e1'}`,
                        padding: '3px 10px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 700,
                        letterSpacing: '0.04em'
                      }}>
                        {estaAlumnoActivo(selectedAlumno) ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '6px' }}>
                      <span style={{ 
                        fontSize: '13px', 
                        fontFamily: 'monospace', 
                        fontWeight: 700, 
                        color: '#0b1e33', 
                        backgroundColor: '#f1f5f9', 
                        border: '1px solid #cbd5e1', 
                        padding: '3px 8px', 
                        borderRadius: '4px' 
                      }}>
                        {String(selectedAlumno.legajo || selectedAlumno.legajoVisual || obtenerLegajo(selectedAlumno, 0)).toUpperCase()}
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#475569' }}>
                        DNI: {selectedAlumno.dni}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '20px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  rowGap: '16px',
                  columnGap: '20px',
                  marginBottom: '22px'
                }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>CUIL</span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{calcularCuilArgentino(selectedAlumno.dni)?.cuit || '-'}</span>
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Teléfono</span>
                    <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: 600 }}>{selectedAlumno.telefono || 'No registrado'}</span>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ display: 'block', fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Correo Electrónico</span>
                    <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: 600 }}>{selectedAlumno.email || 'No registrado'}</span>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ display: 'block', fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Domicilio</span>
                    <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: 600 }}>{selectedAlumno.direccion || 'No registrado'}</span>
                  </div>
                </div>

                {/* TARJETA PORTAL */}
                <div style={{
                  backgroundColor: selectedAlumno.acceso_portal ? '#f0fdf4' : '#f8fafc',
                  border: `1.5px dashed ${selectedAlumno.acceso_portal ? '#86efac' : '#cbd5e1'}`,
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '14px'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Portal de Alumnos</span>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: selectedAlumno.acceso_portal ? '#dcfce7' : '#e2e8f0',
                        color: selectedAlumno.acceso_portal ? '#15803d' : '#64748b'
                      }}>
                        {selectedAlumno.acceso_portal ? 'HABILITADO' : 'SIN ACCESO'}
                      </span>
                    </div>
                    
                    <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                      {selectedAlumno.acceso_portal ? (
                        <span>
                          Usuario: <strong style={{ color: '#0b1e33', fontFamily: 'monospace', fontSize: '13.5px' }}>{selectedAlumno.username_institucional}</strong> &bull; Clave provisoria: <strong style={{ color: '#0b1e33' }}>DNI ({selectedAlumno.dni})</strong>
                        </span>
                      ) : (
                        'Habilitar únicamente si cursará de forma regular y requiere usuario web.'
                      )}
                    </p>
                  </div>

                  {!selectedAlumno.acceso_portal ? (
                    <button
                      type="button"
                      disabled={generandoAcceso}
                      onClick={() => handleHabilitarAcceso(selectedAlumno)}
                      style={{
                        backgroundColor: '#0b1e33',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '9px 16px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: generandoAcceso ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap',
                        opacity: generandoAcceso ? 0.7 : 1
                      }}
                    >
                      {generandoAcceso ? 'Habilitando...' : 'Habilitar Acceso'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setCredencialesModal({
                          nombreCompleto: `${selectedAlumno.apellido}, ${selectedAlumno.nombre}`,
                          legajo: String(selectedAlumno.legajo || selectedAlumno.legajoVisual || ''),
                          usuario: selectedAlumno.username_institucional || '',
                          claveProvisoria: String(selectedAlumno.dni),
                        });
                      }}
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #86efac',
                        color: '#15803d',
                        borderRadius: '6px',
                        padding: '8px 14px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      Ver Credenciales
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setEditFormData({
                        nombre: selectedAlumno.nombre,
                        apellido: selectedAlumno.apellido,
                        dni: String(selectedAlumno.dni),
                        telefono: selectedAlumno.telefono || '',
                        email: selectedAlumno.email || '',
                        direccion: selectedAlumno.direccion || '',
                        activo: estaAlumnoActivo(selectedAlumno)
                      });
                      setIsEditing(true);
                      setErrorMsg('');
                    }}
                    style={{
                      backgroundColor: '#f1f5f9',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '10px 22px',
                      fontSize: '13.5px',
                      fontWeight: 700,
                      color: '#0b1e33',
                      cursor: 'pointer'
                    }}
                  >
                    Editar Datos
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedAlumno(null)}
                    style={{
                      backgroundColor: '#0b1e33',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '10px 22px',
                      fontSize: '13.5px',
                      fontWeight: 700,
                      color: '#ffffff',
                      cursor: 'pointer'
                    }}
                  >
                    Cerrar Ficha
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 20px 0', color: '#0f172a' }}>
                  Modificar Alumno
                </h2>

                {errorMsg && (
                  <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px' }}>
                    {errorMsg}
                  </div>
                )}

                <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>Nombre *</label>
                      <input
                        type="text"
                        required
                        value={editFormData.nombre}
                        onChange={(e) => { setErrorMsg(''); setEditFormData({...editFormData, nombre: e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '')}); }}
                        style={{ width: '100%', padding: '11px 14px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '14px', color: '#0f172a', boxSizing: 'border-box', textTransform: 'uppercase', fontWeight: 500 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>Apellido *</label>
                      <input
                        type="text"
                        required
                        value={editFormData.apellido}
                        onChange={(e) => { setErrorMsg(''); setEditFormData({...editFormData, apellido: e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '')}); }}
                        style={{ width: '100%', padding: '11px 14px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '14px', color: '#0f172a', boxSizing: 'border-box', textTransform: 'uppercase', fontWeight: 500 }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>
                        DNI * (No modificable)
                      </label>
                      <input
                        type="text"
                        required
                        readOnly
                        disabled
                        value={editFormData.dni}
                        style={{
                          width: '100%',
                          padding: '11px 14px',
                          borderRadius: '6px',
                          border: '1.5px solid #cbd5e1',
                          fontSize: '14px',
                          color: '#475569',
                          backgroundColor: '#f1f5f9',
                          boxSizing: 'border-box',
                          fontWeight: 700,
                          cursor: 'not-allowed'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>Teléfono</label>
                      <input
                        type="text"
                        maxLength={13}
                        value={editFormData.telefono}
                        onChange={(e) => { setErrorMsg(''); setEditFormData({...editFormData, telefono: e.target.value.replace(/\D/g, '')}); }}
                        style={{ width: '100%', padding: '11px 14px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '14px', color: '#0f172a', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>Correo Electrónico</label>
                    <input
                      type="email"
                      value={editFormData.email}
                      onChange={(e) => { setErrorMsg(''); setEditFormData({...editFormData, email: e.target.value}); }}
                      style={{ width: '100%', padding: '11px 14px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '14px', color: '#0f172a', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>Domicilio</label>
                    <input
                      type="text"
                      value={editFormData.direccion}
                      onChange={(e) => { setErrorMsg(''); setEditFormData({...editFormData, direccion: e.target.value}); }}
                      style={{ width: '100%', padding: '11px 14px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '14px', color: '#0f172a', boxSizing: 'border-box' }}
                    />
                  </div>

                  {/* SELECTOR FORMAL DE ESTADO AL FINAL DEL FORMULARIO */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>Estado del Alumno *</label>
                    <select
                      value={editFormData.activo ? 'activo' : 'inactivo'}
                      onChange={(e) => setEditFormData({ ...editFormData, activo: e.target.value === 'activo' })}
                      style={{ width: '100%', padding: '11px 14px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '14px', backgroundColor: '#ffffff', color: '#0f172a', fontWeight: 600, boxSizing: 'border-box', cursor: 'pointer' }}
                    >
                      <option value="activo">Activo</option>
                      <option value="inactivo">Inactivo</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                    <button
                      type="button"
                      onClick={() => { setIsEditing(false); setErrorMsg(''); }}
                      style={{ backgroundColor: 'transparent', border: '1.5px solid #cbd5e1', borderRadius: '6px', padding: '10px 18px', fontSize: '13.5px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={editSubmitting}
                      style={{ backgroundColor: '#0b1e33', border: 'none', borderRadius: '6px', padding: '10px 22px', fontSize: '13.5px', fontWeight: 700, color: '#ffffff', cursor: editSubmitting ? 'not-allowed' : 'pointer', opacity: editSubmitting ? 0.7 : 1 }}
                    >
                      {editSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR ALUMNO */}
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
            maxWidth: '540px',
            padding: '30px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            boxSizing: 'border-box',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 20px 0', color: '#0f172a' }}>
              Registrar Nuevo Alumno
            </h2>

            {errorMsg && (
              <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px' }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>Nombre *</label>
                  <input
                    type="text"
                    name="nombre"
                    required
                    placeholder="Ej: PABLO"
                    value={formData.nombre}
                    onChange={handleTextChange}
                    style={{ width: '100%', padding: '11px 14px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '14px', color: '#0f172a', boxSizing: 'border-box', textTransform: 'uppercase', fontWeight: 500 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>Apellido *</label>
                  <input
                    type="text"
                    name="apellido"
                    required
                    placeholder="Ej: PÉREZ"
                    value={formData.apellido}
                    onChange={handleTextChange}
                    style={{ width: '100%', padding: '11px 14px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '14px', color: '#0f172a', boxSizing: 'border-box', textTransform: 'uppercase', fontWeight: 500 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>DNI *</label>
                  <input
                    type="text"
                    name="dni"
                    required
                    maxLength={8}
                    placeholder="Ej: 45849876"
                    value={formData.dni}
                    onChange={handleNumericChange}
                    style={{ width: '100%', padding: '11px 14px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '14px', color: '#0b1e33', boxSizing: 'border-box', fontWeight: 700 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>CUIL</label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    placeholder="Generando..."
                    value={cuilCalculado}
                    style={{ width: '100%', padding: '11px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', color: '#0b1e33', backgroundColor: '#f1f5f9', fontWeight: 700, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>Teléfono</label>
                  <input
                    type="text"
                    name="telefono"
                    maxLength={13}
                    placeholder="Ej: 3874123456"
                    value={formData.telefono}
                    onChange={handleNumericChange}
                    style={{ width: '100%', padding: '11px 14px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '14px', color: '#0f172a', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>Domicilio (Opcional)</label>
                  <input
                    type="text"
                    name="direccion"
                    placeholder="Ej: Av. Belgrano 1234"
                    value={formData.direccion}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '11px 14px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '14px', color: '#0f172a', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>Correo Electrónico</label>
                <input
                  type="email"
                  name="email"
                  placeholder="Ej: alumno@ejemplo.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '14px', color: '#0f172a', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ backgroundColor: 'transparent', border: '1.5px solid #cbd5e1', borderRadius: '6px', padding: '10px 18px', fontSize: '13.5px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ backgroundColor: '#0b1e33', border: 'none', borderRadius: '6px', padding: '10px 22px', fontSize: '13.5px', fontWeight: 700, color: '#ffffff', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}
                >
                  {submitting ? 'Guardando...' : 'Guardar Alumno'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CREDENCIALES */}
      {credencialesModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 130,
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '480px',
            padding: '32px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            boxSizing: 'border-box'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                backgroundColor: '#f0fdf4',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px auto'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <h2 style={{ fontSize: '19px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
                Acceso Institucional Habilitado
              </h2>
              <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>
                Entregá estas credenciales al alumno para su ingreso al portal.
              </p>
            </div>

            <div style={{
              backgroundColor: '#f8fafc',
              border: '1.5px solid #cbd5e1',
              borderRadius: '8px',
              padding: '18px 20px',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
                Ficha de Acceso &bull; {credencialesModal.legajo}
              </div>

              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, display: 'block' }}>ESTUDIANTE</span>
                <span style={{ fontSize: '14.5px', fontWeight: 800, color: '#0f172a' }}>{credencialesModal.nombreCompleto}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, display: 'block' }}>USUARIO</span>
                  <span style={{
                    display: 'inline-block',
                    marginTop: '2px',
                    fontFamily: 'monospace',
                    fontSize: '15px',
                    fontWeight: 700,
                    color: '#0b1e33',
                    backgroundColor: '#e2e8f0',
                    padding: '4px 8px',
                    borderRadius: '4px'
                  }}>
                    {credencialesModal.usuario}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, display: 'block' }}>CLAVE PROVISORIA</span>
                  <span style={{
                    display: 'inline-block',
                    marginTop: '2px',
                    fontFamily: 'monospace',
                    fontSize: '15px',
                    fontWeight: 700,
                    color: '#0b1e33',
                    backgroundColor: '#e2e8f0',
                    padding: '4px 8px',
                    borderRadius: '4px'
                  }}>
                    {credencialesModal.claveProvisoria}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={copiarCredenciales}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  backgroundColor: copiado ? '#15803d' : '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: copiado ? '#ffffff' : '#0b1e33',
                  borderRadius: '6px',
                  padding: '11px',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {copiado ? '¡Copiado!' : 'Copiar Credenciales'}
              </button>

              <button
                type="button"
                onClick={() => setCredencialesModal(null)}
                style={{
                  backgroundColor: '#0b1e33',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '6px',
                  padding: '11px 20px',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}