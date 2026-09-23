'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  getCursosIngreso,
  getMateriasDisponibles,
  createCursoIngreso
} from '../services/cursosIngreso';

export default function CursosIngresoModule() {
  const [cursos, setCursos] = useState<any[]>([]);
  const [materias, setMaterias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal HU06 - Registrar Curso de Ingreso
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    materiasSeleccionadas: [] as string[],
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // HU06 - Detalle / Ficha del Curso
  const [selectedCurso, setSelectedCurso] = useState<any | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const [cursosData, materiasData] = await Promise.all([
        getCursosIngreso(),
        getMateriasDisponibles(),
      ]);
      setCursos(cursosData || []);
      setMaterias(materiasData || []);
    } catch (err: any) {
      console.error('Error al cargar datos de cursos de ingreso:', err);
      const msg = err?.message || 'Error al conectar con la base de datos';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredCursos = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return cursos;
    return cursos.filter((c) => {
      const nombre = (c.nombre || '').toLowerCase();
      const desc = (c.descripcion || '').toLowerCase();
      const matNames = (c.curso_ingreso_materias || [])
        .map((cim: any) => cim.materias?.nombre || '')
        .join(' ')
        .toLowerCase();
      return nombre.includes(term) || desc.includes(term) || matNames.includes(term);
    });
  }, [cursos, searchTerm]);

  const handleCheckboxChange = (materiaId: string) => {
    setErrorMsg('');
    setFormData((prev) => {
      const yaSeleccionada = prev.materiasSeleccionadas.includes(materiaId);
      if (yaSeleccionada) {
        return {
          ...prev,
          materiasSeleccionadas: prev.materiasSeleccionadas.filter((id) => id !== materiaId),
        };
      } else {
        return {
          ...prev,
          materiasSeleccionadas: [...prev.materiasSeleccionadas, materiaId],
        };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Validación HU06: al menos una materia asociada
    if (formData.materiasSeleccionadas.length === 0) {
      setErrorMsg('Debe seleccionar al menos una materia para el curso de ingreso.');
      return;
    }

    try {
      setSubmitting(true);
      await createCursoIngreso({
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        materiasIds: formData.materiasSeleccionadas,
      });

      setFormData({ nombre: '', descripcion: '', materiasSeleccionadas: [] });
      setShowModal(false);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al registrar el curso de ingreso.');
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
            Cursos de Ingreso
          </h1>
          <p style={{ color: '#475569', fontSize: '13px', margin: '4px 0 0 0', fontWeight: 500 }}>
            {cursos.length} {cursos.length === 1 ? 'curso registrado' : 'cursos registrados'}
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg('');
            setFormData({ nombre: '', descripcion: '', materiasSeleccionadas: [] });
            setShowModal(true);
          }}
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
          <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span> Registrar Curso
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
            placeholder="Buscar por nombre de curso o materia asociada..."
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

      {/* Tabla institucional de Cursos */}
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
                width: '35%'
              }}>
                CURSO DE INGRESO
              </th>
              <th style={{
                padding: '14px 24px',
                fontWeight: 700,
                color: '#0f172a',
                fontSize: '12px',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                width: '45%'
              }}>
                MATERIAS ASOCIADAS
              </th>
              <th style={{
                padding: '14px 24px',
                textAlign: 'center',
                fontWeight: 700,
                color: '#0f172a',
                fontSize: '12px',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                width: '20%'
              }}>
                ACCIÓN
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} style={{ padding: '40px', textAlign: 'center', color: '#475569', fontWeight: 500 }}>
                  Cargando cursos de ingreso...
                </td>
              </tr>
            ) : filteredCursos.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: '54px 20px', textAlign: 'center', color: '#64748b' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>
                    No se encontraron cursos de ingreso registrados
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    Registra un nuevo curso con el botón superior "+ Registrar Curso".
                  </div>
                </td>
              </tr>
            ) : (
              filteredCursos.map((c, idx) => {
                const listaMaterias = (c.curso_ingreso_materias || [])
                  .map((rel: any) => rel.materias?.nombre)
                  .filter(Boolean);

                return (
                  <tr
                    key={c.id || idx}
                    style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer', transition: 'background-color 0.15s ease' }}
                    onClick={() => setSelectedCurso(c)}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                  >
                    <td style={{ padding: '16px 24px', color: '#0f172a', fontWeight: 600, fontSize: '13px' }}>
                      <div style={{ fontWeight: 700, color: '#0b1e33' }}>{c.nombre}</div>
                      {c.descripcion && (
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                          {c.descripcion}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {listaMaterias.length > 0 ? (
                          listaMaterias.map((nom: string, i: number) => (
                            <span
                              key={i}
                              style={{
                                backgroundColor: '#f1f5f9',
                                color: '#1e293b',
                                border: '1px solid #cbd5e1',
                                borderRadius: '4px',
                                padding: '3px 8px',
                                fontSize: '11px',
                                fontWeight: 600,
                              }}
                            >
                              {nom}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: '12px', color: '#94a3b8' }}>Sin materias</span>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCurso(c);
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
                          transition: 'all 0.15s ease',
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
                        Ver Detalle
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* HU06: Modal Detalle del Curso */}
      {selectedCurso && (
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
          backdropFilter: 'blur(2px)',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '540px',
            padding: '32px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            boxSizing: 'border-box',
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              {selectedCurso.nombre}
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '6px', marginBottom: '20px' }}>
              {selectedCurso.descripcion || 'Sin descripción registrada.'}
            </p>

            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '18px 20px',
              marginBottom: '24px',
            }}>
              <span style={{ display: 'block', fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                Materias Curriculares del Ingreso
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {(selectedCurso.curso_ingreso_materias || []).map((rel: any, idx: number) => (
                  <span
                    key={idx}
                    style={{
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '5px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    {rel.materias?.nombre || 'Materia'}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSelectedCurso(null)}
                style={{
                  backgroundColor: '#0b1e33',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 24px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#ffffff',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(11, 30, 51, 0.15)',
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HU06: Modal Registrar Nuevo Curso de Ingreso */}
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
          backdropFilter: 'blur(2px)',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '520px',
            padding: '28px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            boxSizing: 'border-box',
          }}>
            <h2 style={{ fontSize: '19px', fontWeight: 700, margin: '0 0 16px 0', color: '#0f172a' }}>
              Registrar Curso de Ingreso
            </h2>

            {errorMsg && (
              <div style={{
                backgroundColor: '#fee2e2',
                border: '1px solid #fca5a5',
                color: '#991b1b',
                padding: '9px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                marginBottom: '16px',
              }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                  Nombre del Curso <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Ingreso a Ingeniería 2027"
                  value={formData.nombre}
                  onChange={(e) => {
                    setErrorMsg('');
                    setFormData({ ...formData, nombre: e.target.value });
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    color: '#0f172a',
                    boxSizing: 'border-box',
                    fontWeight: 500,
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                  Descripción (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: Curso intensivo preuniversitario de materias exactas"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    color: '#0f172a',
                    boxSizing: 'border-box',
                    fontWeight: 500,
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                  Materias del Curso (Seleccione al menos una) <span style={{ color: '#dc2626' }}>*</span>
                </label>

                <div style={{
                  maxHeight: '140px',
                  overflowY: 'auto',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  backgroundColor: '#f8fafc',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}>
                  {materias.length === 0 ? (
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      No hay materias registradas en el sistema. Debe registrar al menos una antes.
                    </span>
                  ) : (
                    materias.map((mat) => {
                      const checked = formData.materiasSeleccionadas.includes(mat.id);
                      return (
                        <label
                          key={mat.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '13px',
                            color: '#1e293b',
                            cursor: 'pointer',
                            fontWeight: checked ? 600 : 400,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleCheckboxChange(mat.id)}
                            style={{ accentColor: '#0b1e33', cursor: 'pointer' }}
                          />
                          {mat.nombre}
                        </label>
                      );
                    })
                  )}
                </div>
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
                    cursor: 'pointer',
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
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? 'Guardando...' : 'Guardar Curso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}