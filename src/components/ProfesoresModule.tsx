'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  getProfesores, 
  createProfesor, 
  validarDniArgentino, 
  validarTelefonoArgentino, 
  calcularYValidarCuil 
} from '../services/profesores';
import { getMaterias } from '../services/materias';

interface Profesor {
  id: string | number;
  nombre: string;
  apellido: string;
  dni: string;
  email?: string;
  telefono?: string;
  materias_ids?: (string | number)[];
  turnos?: string[];
}

interface Materia {
  id: string | number;
  nombre: string;
  nivel: string;
  area?: string;
}

const TURNOS_DISPONIBLES = ['Mañana', 'Tarde', 'Noche'];

export default function ProfesoresModule() {
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Búsqueda
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modal y formulario HU03
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [formNombre, setFormNombre] = useState<string>('');
  const [formApellido, setFormApellido] = useState<string>('');
  const [formDni, setFormDni] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formTelefono, setFormTelefono] = useState<string>('');
  const [selectedMaterias, setSelectedMaterias] = useState<(string | number)[]>([]);
  const [selectedTurnos, setSelectedTurnos] = useState<string[]>(['Mañana', 'Tarde']);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Ficha detallada de profesor
  const [selectedProfesor, setSelectedProfesor] = useState<Profesor | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [profsData, matsData] = await Promise.all([getProfesores(), getMaterias()]);
      setProfesores(profsData || []);
      setMaterias(matsData || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al conectar con la base de datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Cálculo en tiempo real del CUIL con Módulo 11 cuando el DNI tiene 8 dígitos
  const cuilCalculado = useMemo(() => {
    if (formDni.length === 8) {
      const res = calcularYValidarCuil(formDni);
      return res ? res.cuil : 'DNI inválido para CUIL';
    }
    return '';
  }, [formDni]);

  const handleOpenModal = () => {
    setFormNombre('');
    setFormApellido('');
    setFormDni('');
    setFormEmail('');
    setFormTelefono('');
    setSelectedMaterias([]);
    setSelectedTurnos(['Mañana', 'Tarde']);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormError(null);
  };

  // Sanitizador estricto de texto: sin números ni símbolos
  const handleNombreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormError(null);
    const soloLetras = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
    setFormNombre(soloLetras);
  };

  const handleApellidoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormError(null);
    const soloLetras = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
    setFormApellido(soloLetras);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // 1. Validar Nombre y Apellido
    const nom = formNombre.trim().replace(/\s+/g, ' ').toUpperCase();
    const ape = formApellido.trim().replace(/\s+/g, ' ').toUpperCase();

    if (!nom || nom.length < 2 || nom.length > 40) {
      setFormError('El nombre debe tener entre 2 y 40 caracteres.');
      return;
    }

    if (!ape || ape.length < 2 || ape.length > 40) {
      setFormError('El apellido debe tener entre 2 y 40 caracteres.');
      return;
    }

    // 2. Validar DNI
    const checkDni = validarDniArgentino(formDni);
    if (!checkDni.valido) {
      setFormError(checkDni.error);
      return;
    }

    // 3. Validar Teléfono
    const checkTel = validarTelefonoArgentino(formTelefono);
    if (!checkTel.valido) {
      setFormError(checkTel.error);
      return;
    }

    // 4. Validar Materias
    if (selectedMaterias.length === 0) {
      setFormError('Debe asociar al menos una materia al profesor.');
      return;
    }

    try {
      setFormSubmitting(true);
      await createProfesor({
        nombre: nom,
        apellido: ape,
        dni: checkDni.dniLimpio,
        email: formEmail,
        telefono: checkTel.telefonoLimpio,
        materiasIds: selectedMaterias,
        turnos: selectedTurnos
      });

      setSuccessMsg(`Profesor ${ape}, ${nom} registrado correctamente.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      handleCloseModal();
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'No se pudo registrar el profesor.');
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
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1e3a5f')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0b1e33')}
        >
          <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span> Registrar Profesor
        </button>
      </div>

      {/* Alertas */}
      {errorMsg && !isModalOpen && (
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
      {successMsg && (
        <div style={{
          backgroundColor: '#f0fdf4',
          border: '1px solid #86efac',
          color: '#15803d',
          padding: '10px 14px',
          borderRadius: '6px',
          fontSize: '13px',
          marginBottom: '16px'
        }}>
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

      {/* Tabla institucional */}
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
                width: '30%'
              }}>
                PROFESOR
              </th>
              <th style={{
                padding: '14px 24px',
                fontWeight: 700,
                color: '#0f172a',
                fontSize: '12px',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                width: '15%'
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
                width: '35%'
              }}>
                MATERIAS HABILITADAS
              </th>
              <th style={{
                padding: '14px 24px',
                fontWeight: 700,
                color: '#0f172a',
                fontSize: '12px',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                width: '10%'
              }}>
                TURNOS
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
                <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#475569', fontWeight: 500 }}>
                  Cargando nómina de profesores...
                </td>
              </tr>
            ) : profesoresFiltrados.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '54px 20px', textAlign: 'center', color: '#64748b' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>
                    No se encontraron profesores registrados
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    Registra un nuevo docente con el botón superior "+ Registrar Profesor".
                  </div>
                </td>
              </tr>
            ) : (
              profesoresFiltrados.map((prof) => {
                const materiasNombres = (prof.materias_ids || [])
                  .map((id) => materias.find((m) => String(m.id) === String(id))?.nombre)
                  .filter(Boolean);

                return (
                  <tr
                    key={prof.id}
                    style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer', transition: 'background-color 0.15s ease' }}
                    onClick={() => setSelectedProfesor(prof)}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                  >
                    <td style={{ padding: '16px 24px', color: '#0f172a', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase' }}>
                      {prof.apellido}, {prof.nombre}
                    </td>

                    <td style={{ padding: '16px 24px', color: '#0b1e33', fontWeight: 700, fontSize: '13.5px', letterSpacing: '0.02em' }}>
                      {prof.dni}
                    </td>

                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {materiasNombres.length > 0 ? (
                          materiasNombres.map((nom, idx) => (
                            <span
                              key={idx}
                              style={{
                                display: 'inline-block',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 700,
                                backgroundColor: '#f1f5f9',
                                color: '#0b1e33',
                                border: '1px solid #cbd5e1'
                              }}
                            >
                              {nom}
                            </span>
                          ))
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '12px' }}>Sin materias</span>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {(prof.turnos || []).map((t, idx) => (
                          <span
                            key={idx}
                            style={{
                              display: 'inline-block',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              backgroundColor: '#f8fafc',
                              color: '#475569',
                              border: '1px solid #e2e8f0'
                            }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProfesor(prof);
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

      {/* Modal Ficha Docente */}
      {selectedProfesor && (
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
            maxWidth: '560px',
            padding: '32px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '26px' }}>
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
                flexShrink: 0
              }}>
                {selectedProfesor.nombre?.charAt(0)}{selectedProfesor.apellido?.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#0f172a', textTransform: 'uppercase' }}>
                  {selectedProfesor.apellido} {selectedProfesor.nombre}
                </h2>
                <div style={{ marginTop: '6px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0b1e33' }}>
                    DNI: {selectedProfesor.dni}
                  </span>
                  <span style={{ color: '#cbd5e1' }}>•</span>
                  <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 700, color: '#475569' }}>
                    CUIL: {calcularYValidarCuil(selectedProfesor.dni)?.cuil || '-'}
                  </span>
                </div>
              </div>
              <span style={{
                display: 'inline-block',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 700,
                backgroundColor: '#f0fdf4',
                color: '#15803d',
                border: '1px solid #86efac'
              }}>
                DOCENTE ACTIVO
              </span>
            </div>

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
                <span style={{ display: 'block', fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>
                  Teléfono
                </span>
                <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: 500, marginTop: '2px', display: 'block' }}>
                  {selectedProfesor.telefono ? `+54 9 ${selectedProfesor.telefono}` : 'No registrado'}
                </span>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>
                  Turnos Habilitados
                </span>
                <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: 700, marginTop: '2px', display: 'block' }}>
                  {(selectedProfesor.turnos || []).join(', ') || 'Sin turnos'}
                </span>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ display: 'block', fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>
                  Correo Electrónico
                </span>
                <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: 500, marginTop: '2px', display: 'block' }}>
                  {selectedProfesor.email || 'No registrado'}
                </span>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ display: 'block', fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
                  Asignaturas Habilitadas
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {(selectedProfesor.materias_ids || []).map((id) => {
                    const m = materias.find((mat) => String(mat.id) === String(id));
                    return (
                      <span
                        key={id}
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #cbd5e1',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#0b1e33'
                        }}
                      >
                        {m?.nombre || `ID: ${id}`}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSelectedProfesor(null)}
                style={{
                  backgroundColor: '#0b1e33',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 24px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Registrar Nuevo Profesor */}
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
              Registrar Nuevo Profesor
            </h2>

            {formError && (
              <div style={{
                backgroundColor: '#fee2e2',
                border: '1px solid #fca5a5',
                color: '#991b1b',
                padding: '9px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                marginBottom: '16px'
              }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                    Nombre *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={40}
                    placeholder="Ej: LUCAS"
                    value={formNombre}
                    onChange={handleNombreChange}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '13px',
                      color: '#0f172a',
                      boxSizing: 'border-box',
                      textTransform: 'uppercase',
                      fontWeight: 500
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                    Apellido *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={40}
                    placeholder="Ej: PAEPS"
                    value={formApellido}
                    onChange={handleApellidoChange}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '13px',
                      color: '#0f172a',
                      boxSizing: 'border-box',
                      textTransform: 'uppercase',
                      fontWeight: 500
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                    DNI (8 dígitos) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    placeholder="Ej: 45678690"
                    value={formDni}
                    onChange={(e) => setFormDni(e.target.value.replace(/\D/g, ''))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '13px',
                      color: '#0b1e33',
                      boxSizing: 'border-box',
                      fontWeight: 700
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                    CUIL (Módulo 11)
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    placeholder="Generando..."
                    value={cuilCalculado}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      color: '#0b1e33',
                      backgroundColor: '#f1f5f9',
                      fontWeight: 700,
                      boxSizing: 'border-box',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                    Teléfono (10 dígitos)
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="Ej: 3874869843"
                    value={formTelefono}
                    onChange={(e) => setFormTelefono(e.target.value.replace(/\D/g, ''))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '13px',
                      color: '#0f172a',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    maxLength={60}
                    placeholder="Ej: profesor@ejemplo.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '13px',
                      color: '#0f172a',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Selector múltiple de materias */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                  Materias que puede dictar * ({selectedMaterias.length} seleccionadas)
                </label>
                <div style={{
                  maxHeight: '140px',
                  overflowY: 'auto',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '8px',
                  backgroundColor: '#f8fafc',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  {materias.length === 0 ? (
                    <span style={{ fontSize: '12px', color: '#94a3b8', padding: '6px' }}>No hay materias registradas.</span>
                  ) : (
                    materias.map((mat) => (
                      <label
                        key={mat.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 8px',
                          borderRadius: '4px',
                          backgroundColor: selectedMaterias.includes(mat.id) ? '#ffffff' : 'transparent',
                          cursor: 'pointer',
                          fontSize: '12px',
                          color: '#0f172a'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedMaterias.includes(mat.id)}
                          onChange={() => toggleMateria(mat.id)}
                          style={{ cursor: 'pointer' }}
                        />
                        <span style={{ fontWeight: 600 }}>{mat.nombre}</span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>({mat.nivel})</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Turnos */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                  Turnos Disponibles
                </label>
                <div style={{ display: 'flex', gap: '16px' }}>
                  {TURNOS_DISPONIBLES.map((t) => (
                    <label key={t} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={selectedTurnos.includes(t)}
                        onChange={() => toggleTurno(t)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span>{t}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={handleCloseModal}
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
                  disabled={formSubmitting}
                  style={{
                    backgroundColor: '#0b1e33',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '9px 20px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#ffffff',
                    cursor: formSubmitting ? 'not-allowed' : 'pointer',
                    opacity: formSubmitting ? 0.7 : 1
                  }}
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