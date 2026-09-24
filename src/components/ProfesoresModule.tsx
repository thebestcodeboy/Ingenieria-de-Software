'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { getProfesores, createProfesor, updateProfesor } from '../services/profesores';
import { getMaterias } from '../services/materias';
import { calcularCuilArgentino } from '../services/alumnos';

interface Profesor {
  id: string | number;
  nombre: string;
  apellido: string;
  dni: string | number;
  email?: string | null;
  telefono?: string | null;
  materias_ids?: (string | number)[];
  turnos?: string[];
  activo?: boolean;
}

interface Materia {
  id: string | number;
  nombre: string;
  nivel: string;
  area?: string;
}

const TURNOS_DISPONIBLES = ['Mañana', 'Tarde', 'Noche'];

function mensajeDeError(error: unknown, mensajePorDefecto: string): string {
  return error instanceof Error ? error.message : mensajePorDefecto;
}

export default function ProfesoresModule() {
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modal y formulario unificado
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    dni: '',
    email: '',
    telefono: '',
  });

  const [selectedMaterias, setSelectedMaterias] = useState<(string | number)[]>([]);
  const [selectedTurnos, setSelectedTurnos] = useState<string[]>([]);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const [profsData, matsData] = await Promise.all([getProfesores(), getMaterias()]);
      setProfesores(profsData || []);
      setMaterias(matsData || []);
    } catch (err: unknown) {
      setErrorMsg(mensajeDeError(err, 'Error al cargar los datos institucionales.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = () => {
    setEditingId(null);
    setFormData({ nombre: '', apellido: '', dni: '', email: '', telefono: '' });
    setSelectedMaterias([]);
    setSelectedTurnos([]);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingId(null);
    setIsModalOpen(false);
    setErrorMsg('');
  };

  const handleEdit = (prof: Profesor) => {
    setEditingId(prof.id);
    setFormData({
      nombre: prof.nombre || '',
      apellido: prof.apellido || '',
      dni: String(prof.dni || ''),
      email: prof.email || '',
      telefono: prof.telefono || '',
    });
    let parsedMaterias: (string | number)[] = [];
    if (Array.isArray(prof.materias_ids)) {
      parsedMaterias = prof.materias_ids;
    } else if (typeof prof.materias_ids === 'string') {
      try {
        parsedMaterias = JSON.parse(prof.materias_ids);
      } catch {
        parsedMaterias = [];
      }
    }
    setSelectedMaterias(parsedMaterias);
    setSelectedTurnos(prof.turnos || []);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const toggleMateria = (id: string | number) => {
    setSelectedMaterias((prev) =>
      prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id]
    );
  };

  const toggleTurno = (turno: string) => {
    setSelectedTurnos((prev) =>
      prev.includes(turno) ? prev.filter((t) => t !== turno) : [...prev, turno]
    );
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

  const cuilCalculado = useMemo(() => {
    if (formData.dni.length === 8) {
      const res = calcularCuilArgentino(formData.dni);
      return res ? res.cuit : '';
    }
    return '';
  }, [formData.dni]);

  const validarYFormatearTexto = (texto: string, campo: string) => {
    const limpio = texto.trim().replace(/\s+/g, ' ');
    if (!limpio) return { error: `El campo ${campo} es obligatorio.` };
    if (limpio.length < 3) return { error: `El ${campo} debe tener al menos 3 caracteres.` };

    const palabras = limpio.split(' ');
    const nexosPermitidos = ['de', 'del', 'la', 'las', 'los', 'di', 'da', 'san', 'santa'];

    for (let i = 0; i < palabras.length; i++) {
      const p = palabras[i].toLowerCase();
      if (p.length === 1) return { error: `El ${campo} no puede contener letras sueltas.` };
      if (p.length < 3 && !nexosPermitidos.includes(p)) {
        return { error: `"${palabras[i]}" no parece un ${campo} válido.` };
      }
      if (/(.)\1{3,}/.test(p) || /asdf|qwer|zxcv|1234/.test(p)) {
        return { error: `El ${campo} contiene secuencias no permitidas.` };
      }
    }
    return { limpio: limpio.toUpperCase() };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

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

    let telLimpio = formData.telefono.replace(/\D/g, '');
    if (telLimpio) {
      if (telLimpio.length === 11 && telLimpio.startsWith('0')) {
        telLimpio = telLimpio.slice(1);
      }
      if (telLimpio.length !== 10 && telLimpio.length !== 12 && telLimpio.length !== 13) {
        setErrorMsg('El teléfono debe contener 10 dígitos (código de área + número local. Ej: 3874123456).');
        return;
      }
      if (/(\d)\1{5,}/.test(telLimpio) || /^(\d)\1{9}$/.test(telLimpio)) {
        setErrorMsg('El número de teléfono no puede contener secuencias excesivas de dígitos repetidos.');
        return;
      }
      if (telLimpio.startsWith('1234') || telLimpio.includes('1234567') || telLimpio === '0123456789') {
        setErrorMsg('El número de teléfono contiene una secuencia de prueba no permitida.');
        return;
      }
    }

    const emailLimpio = formData.email.trim().toLowerCase();
    if (emailLimpio) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(emailLimpio)) {
        setErrorMsg('El formato del correo electrónico es inválido.');
        return;
      }
      const [usuario, dominio] = emailLimpio.split('@');
      if (/(\w{2,3})\1{2,}/.test(usuario) || /asdf|qwer|zxcv|test|prueba|qeq/.test(usuario) || /(.)\1{4,}/.test(usuario)) {
        setErrorMsg('El correo electrónico contiene patrones de prueba o secuencias inválidas no permitidas.');
        return;
      }
      if (/(.)\1{4,}/.test(dominio)) {
        setErrorMsg('El dominio del correo electrónico contiene secuencias inválidas.');
        return;
      }
    }

    if (selectedMaterias.length === 0) {
      setErrorMsg('Debe asociar al menos una materia al profesor.');
      return;
    }

    if (selectedTurnos.length === 0) {
      setErrorMsg('Debe seleccionar al menos un turno disponible para el profesor.');
      return;
    }

    try {
      setFormSubmitting(true);
      const payload = {
        nombre: nomResult.limpio,
        apellido: apeResult.limpio,
        dni: dniLimpio,
        email: emailLimpio || null,
        telefono: telLimpio || null,
        materiasIds: selectedMaterias,
        turnos: selectedTurnos,
      };

      if (editingId) {
        await updateProfesor(editingId, payload);
        setSuccessMsg('Profesor modificado correctamente.');
      } else {
        await createProfesor(payload);
        setSuccessMsg('Profesor registrado correctamente.');
      }

      setTimeout(() => setSuccessMsg(''), 4000);
      handleCloseModal();
      await loadData();
    } catch (err: unknown) {
      setErrorMsg(mensajeDeError(err, 'Error al guardar los datos del profesor.'));
    } finally {
      setFormSubmitting(false);
    }
  };

  const profesoresFiltrados = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return profesores;
    return profesores.filter((p) => {
      const nombreCompleto = `${p.apellido || ''} ${p.nombre || ''}`.toLowerCase();
      const dniStr = String(p.dni || '');
      return nombreCompleto.includes(term) || dniStr.includes(term);
    });
  }, [profesores, searchTerm]);

  const obtenerNombreMateria = (mId: string | number) => {
    const encontrada = materias.find((m) => String(m.id).trim() === String(mId).trim());
    return encontrada ? encontrada.nombre : `Materia #${mId}`;
  };

  return (
    <div style={{ width: '100%', padding: '32px 40px', boxSizing: 'border-box', color: '#0f172a' }}>
      
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
            Nómina de Profesores
          </h1>
          <p style={{ color: '#475569', fontSize: '13px', margin: '4px 0 0 0', fontWeight: 500 }}>
            {profesores.length} {profesores.length === 1 ? 'docente registrado' : 'docentes registrados'}
          </p>
        </div>

        <button
          onClick={handleOpenModal}
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
          <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span> Registrar Profesor
        </button>
      </div>

      {errorMsg && !isModalOpen && (
        <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px' }}>
          {errorMsg}
        </div>
      )}
      {successMsg && !isModalOpen && (
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px' }}>
          {successMsg}
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
            placeholder="Buscar profesor por apellido, nombre o DNI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px', color: '#0f172a', backgroundColor: 'transparent', fontWeight: 500 }}
          />
        </div>
      </div>

      {/* Tabla */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(15, 23, 42, 0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #cbd5e1', backgroundColor: '#f1f5f9' }}>
              <th style={{ padding: '14px 20px', fontWeight: 700, color: '#0f172a', fontSize: '12px', letterSpacing: '0.06em', textTransform: 'uppercase', width: '22%' }}>APELLIDO Y NOMBRE</th>
              <th style={{ padding: '14px 20px', fontWeight: 700, color: '#0f172a', fontSize: '12px', letterSpacing: '0.06em', textTransform: 'uppercase', width: '12%' }}>DNI</th>
              <th style={{ padding: '14px 20px', fontWeight: 700, color: '#0f172a', fontSize: '12px', letterSpacing: '0.06em', textTransform: 'uppercase', width: '20%' }}>CONTACTO</th>
              <th style={{ padding: '14px 20px', fontWeight: 700, color: '#0f172a', fontSize: '12px', letterSpacing: '0.06em', textTransform: 'uppercase', width: '18%' }}>MATERIAS HABILITADAS</th>
              <th style={{ padding: '14px 20px', fontWeight: 700, color: '#0f172a', fontSize: '12px', letterSpacing: '0.06em', textTransform: 'uppercase', width: '10%' }}>TURNOS</th>
              <th style={{ padding: '14px 20px', fontWeight: 700, color: '#0f172a', fontSize: '12px', letterSpacing: '0.06em', textTransform: 'uppercase', width: '10%' }}>ESTADO</th>
              <th style={{ padding: '14px 20px', textAlign: 'center', fontWeight: 700, color: '#0f172a', fontSize: '12px', letterSpacing: '0.06em', textTransform: 'uppercase', width: '8%' }}>ACCIÓN</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#475569', fontWeight: 500 }}>
                  Cargando nómina de profesores...
                </td>
              </tr>
            ) : profesoresFiltrados.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '54px 20px', textAlign: 'center', color: '#64748b' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>No se encontraron profesores registrados</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Utiliza el botón superior &quot;+ Registrar Profesor&quot; para dar de alta a un docente.</div>
                </td>
              </tr>
            ) : (
              profesoresFiltrados.map((prof) => {
                let listMids: (string | number)[] = [];
                if (Array.isArray(prof.materias_ids)) {
                  listMids = prof.materias_ids;
                } else if (typeof prof.materias_ids === 'string') {
                  try {
                    listMids = JSON.parse(prof.materias_ids);
                  } catch {
                    listMids = [];
                  }
                }

                return (
                  <tr key={prof.id} style={{ borderBottom: '1px solid #e2e8f0', transition: 'background-color 0.15s ease' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}>
                    <td style={{ padding: '16px 20px', color: '#0f172a', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase' }}>
                      {prof.apellido}, {prof.nombre}
                    </td>
                    <td style={{ padding: '16px 20px', color: '#0b1e33', fontWeight: 700, fontSize: '13.5px' }}>
                      {String(prof.dni).padStart(8, '0')}
                    </td>
                    <td style={{ padding: '16px 20px', color: '#475569', fontSize: '12px' }}>
                      <div>{prof.email || 'Sin correo'}</div>
                      <div style={{ marginTop: '2px', fontWeight: 500 }}>{prof.telefono || 'Sin teléfono'}</div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {listMids.length > 0 ? (
                          listMids.map((mId, idx) => (
                            <span key={idx} style={{ backgroundColor: '#e0e7ff', color: '#3730a3', fontSize: '11px', padding: '3px 8px', borderRadius: '4px', fontWeight: 600, border: '1px solid #c7d2fe' }}>
                              {obtenerNombreMateria(mId)}
                            </span>
                          ))
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '12px' }}>Sin materias</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {(prof.turnos || []).length > 0 ? (
                          (prof.turnos || []).map((t, idx) => (
                            <span key={idx} style={{ backgroundColor: '#f1f5f9', color: '#334155', fontSize: '11px', padding: '3px 8px', borderRadius: '4px', fontWeight: 600, border: '1px solid #cbd5e1' }}>
                              {t}
                            </span>
                          ))
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '12px' }}>-</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{
                        display: 'inline-block',
                        backgroundColor: '#f0fdf4',
                        color: '#15803d',
                        border: '1px solid #bbf7d0',
                        padding: '3px 10px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.04em'
                      }}>
                        ACTIVO
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleEdit(prof)}
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
                        Editar
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Registrar / Modificar Profesor */}
      {isModalOpen && (
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
            maxWidth: '520px',
            padding: '28px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            boxSizing: 'border-box',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ fontSize: '19px', fontWeight: 700, margin: '0 0 20px 0', color: '#0f172a' }}>
              {editingId ? 'Modificar Profesor' : 'Registrar Nuevo Profesor'}
            </h2>

            {errorMsg && (
              <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '9px 14px', borderRadius: '6px', fontSize: '12px', marginBottom: '16px' }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>Nombre *</label>
                  <input
                    type="text"
                    name="nombre"
                    required
                    placeholder="Ej: ALBERTO"
                    value={formData.nombre}
                    onChange={handleTextChange}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '13px', color: '#0f172a', boxSizing: 'border-box', textTransform: 'uppercase', fontWeight: 500 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>Apellido *</label>
                  <input
                    type="text"
                    name="apellido"
                    required
                    placeholder="Ej: GIMÉNEZ"
                    value={formData.apellido}
                    onChange={handleTextChange}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '13px', color: '#0f172a', boxSizing: 'border-box', textTransform: 'uppercase', fontWeight: 500 }}
                  />
                </div>
              </div>

              {/* DNI y CUIL (Bloqueados si se está editando) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: editingId ? '#64748b' : '#1e293b', marginBottom: '6px' }}>
                    DNI * {editingId && '(No modificable)'}
                  </label>
                  <input
                    type="text"
                    name="dni"
                    required
                    maxLength={8}
                    readOnly={Boolean(editingId)}
                    disabled={Boolean(editingId)}
                    placeholder="Ej: 45849876"
                    value={formData.dni}
                    onChange={handleNumericChange}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '13px',
                      color: editingId ? '#475569' : '#0b1e33',
                      backgroundColor: editingId ? '#f1f5f9' : '#ffffff',
                      boxSizing: 'border-box',
                      fontWeight: 700,
                      cursor: editingId ? 'not-allowed' : 'text'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>CUIL</label>
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
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>Teléfono</label>
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
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>Correo Electrónico</label>
                  <input
                    type="email"
                    name="email"
                    placeholder="profesor@ejemplo.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '13px', color: '#0f172a', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Materias Habilitadas */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                  Materias que puede dictar * ({selectedMaterias.length} seleccionadas)
                </label>
                <div style={{ maxHeight: '140px', overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {materias.length === 0 ? (
                    <p style={{ fontSize: '12px', color: '#64748b', padding: '8px', margin: 0 }}>No hay materias disponibles.</p>
                  ) : (
                    materias.map((mat) => (
                      <label key={mat.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', color: '#1e293b', fontWeight: 500 }}>
                        <input
                          type="checkbox"
                          checked={selectedMaterias.map(String).includes(String(mat.id))}
                          onChange={() => toggleMateria(mat.id)}
                          style={{ width: '15px', height: '15px', accentColor: '#0b1e33' }}
                        />
                        <span>{mat.nombre}</span>
                        <span style={{ color: '#64748b', fontSize: '10px' }}>({mat.nivel})</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Turnos Disponibles (Obligatorios) */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                  Turnos Disponibles * ({selectedTurnos.length} seleccionados)
                </label>
                <div style={{ display: 'flex', gap: '16px' }}>
                  {TURNOS_DISPONIBLES.map((t) => (
                    <label key={t} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#1e293b', cursor: 'pointer', fontWeight: 500 }}>
                      <input
                        type="checkbox"
                        checked={selectedTurnos.includes(t)}
                        onChange={() => toggleTurno(t)}
                        style={{ width: '15px', height: '15px', accentColor: '#0b1e33' }}
                      />
                      <span>{t}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  style={{ backgroundColor: 'transparent', border: '1.5px solid #cbd5e1', borderRadius: '6px', padding: '9px 16px', fontSize: '13px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  style={{ backgroundColor: '#0b1e33', border: 'none', borderRadius: '6px', padding: '9px 20px', fontSize: '13px', fontWeight: 600, color: '#ffffff', cursor: formSubmitting ? 'not-allowed' : 'pointer', opacity: formSubmitting ? 0.7 : 1 }}
                >
                  {formSubmitting ? 'Guardando...' : 'Guardar Profesor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}