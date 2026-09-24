'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { getMaterias, createMateria } from '../services/materias';

interface Materia {
  id: string | number;
  nombre: string;
  nivel: string;
  area?: string | null;
}

const AREAS_UNIVERSITARIAS = [
  'Ingeniería y Ciencias Exactas',
  'Medicina y Ciencias de la Salud',
  'Economía y Ciencias Económicas'
];

export default function MateriasModule() {
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filtros de búsqueda
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterNivel, setFilterNivel] = useState<string>('TODOS');

  // Modal HU05
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [formNombre, setFormNombre] = useState<string>('');
  const [formNivel, setFormNivel] = useState<'Secundario' | 'Universitario'>('Universitario');
  const [formArea, setFormArea] = useState<string>(AREAS_UNIVERSITARIAS[0]);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchMaterias = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await getMaterias();
      setMaterias(data || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al conectar con la base de datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterias();
  }, []);

  const handleOpenModal = () => {
    setFormNombre('');
    setFormNivel('Universitario');
    setFormArea(AREAS_UNIVERSITARIAS[0]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormError(null);
  };

  // Sanitizador estricto: permite únicamente letras del alfabeto, tildes, ñ y caracteres de numeración romana
  const handleNombreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormError(null);
    const textoFiltrado = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
    setFormNombre(textoFiltrado);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const limpio = formNombre.trim().replace(/\s+/g, ' ').toUpperCase();

    if (!limpio) {
      setFormError('El nombre de la materia es obligatorio.');
      return;
    }

    if (limpio.length < 3 || limpio.length > 50) {
      setFormError('El nombre de la materia debe tener entre 3 y 50 caracteres.');
      return;
    }

    try {
      setFormSubmitting(true);
      await createMateria({
        nombre: limpio,
        nivel: formNivel,
        area: formNivel === 'Universitario' ? formArea : undefined
      });

      setSuccessMsg(`Materia "${limpio}" registrada con éxito.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      handleCloseModal();
      await fetchMaterias();
    } catch (err: any) {
      setFormError(err.message || 'No se pudo registrar la materia.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const materiasFiltradas = useMemo(() => {
    return materias.filter((m) => {
      const matchNombre = m.nombre?.toLowerCase().includes(searchTerm.toLowerCase().trim());
      const nivelNorm = m.nivel?.toLowerCase() || '';
      const matchNivel =
        filterNivel === 'TODOS' ||
        (filterNivel === 'Universitario' && nivelNorm.includes('univ')) ||
        (filterNivel === 'Secundario' && (nivelNorm.includes('secun') || !nivelNorm.includes('univ')));
      return matchNombre && matchNivel;
    });
  }, [materias, searchTerm, filterNivel]);

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
            Catálogo de Materias
          </h1>
          <p style={{ color: '#475569', fontSize: '13px', margin: '4px 0 0 0', fontWeight: 500 }}>
            {materias.length} {materias.length === 1 ? 'asignatura registrada' : 'asignaturas registradas'}
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
          <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span> Registrar Materia
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

      {/* Buscador y Filtro */}
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
            placeholder="Buscar por nombre de materia..."
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

        <select
          value={filterNivel}
          onChange={(e) => setFilterNivel(e.target.value)}
          style={{
            backgroundColor: '#ffffff',
            border: '1.5px solid #cbd5e1',
            borderRadius: '6px',
            padding: '10px 14px',
            fontSize: '13px',
            color: '#0f172a',
            fontWeight: 600,
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="TODOS">TODOS LOS NIVELES</option>
          <option value="Secundario">NIVEL SECUNDARIO</option>
          <option value="Universitario">NIVEL UNIVERSITARIO</option>
        </select>
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
                width: '40%'
              }}>
                NOMBRE ASIGNATURA
              </th>
              <th style={{
                padding: '14px 24px',
                fontWeight: 700,
                color: '#0f172a',
                fontSize: '12px',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                width: '25%'
              }}>
                NIVEL EDUCATIVO
              </th>
              <th style={{
                padding: '14px 24px',
                fontWeight: 700,
                color: '#0f172a',
                fontSize: '12px',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                width: '25%'
              }}>
                ÁREA / CARRERA
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
                ESTADO
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#475569', fontWeight: 500 }}>
                  Cargando catálogo de materias...
                </td>
              </tr>
            ) : materiasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '54px 20px', textAlign: 'center', color: '#64748b' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>
                    No se encontraron materias registradas
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    Registra una nueva materia con el botón superior "+ Registrar Materia".
                  </div>
                </td>
              </tr>
            ) : (
              materiasFiltradas.map((materia: any) => {
                const nivelTexto = materia.nivel || 'Secundario';
                const esUniversitario = nivelTexto.toLowerCase().includes('univ');

                return (
                  <tr
                    key={materia.id}
                    style={{ borderBottom: '1px solid #e2e8f0', transition: 'background-color 0.15s ease' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                  >
                    <td style={{ padding: '16px 24px', color: '#0f172a', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase' }}>
                      {materia.nombre}
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        backgroundColor: esUniversitario ? '#f5f3ff' : '#fffbeb',
                        color: esUniversitario ? '#6d28d9' : '#b45309',
                        border: `1px solid ${esUniversitario ? '#c4b5fd' : '#fde68a'}`
                      }}>
                        {esUniversitario ? 'UNIVERSITARIO' : 'SECUNDARIO'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', color: '#334155', fontWeight: 500, fontSize: '13px' }}>
                      {esUniversitario ? (materia.area || '-') : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No aplica</span>}
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        backgroundColor: '#f0fdf4',
                        color: '#15803d',
                        border: '1px solid #86efac'
                      }}>
                        ACTIVA
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal HU05 */}
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
            maxWidth: '480px',
            padding: '28px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            boxSizing: 'border-box'
          }}>
            <h2 style={{ fontSize: '19px', fontWeight: 700, margin: '0 0 20px 0', color: '#0f172a' }}>
              Registrar Nueva Materia
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
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                  Nombre de la Materia *
                </label>
                <input
                  type="text"
                  required
                  maxLength={50}
                  placeholder="Ej: ANÁLISIS MATEMÁTICO I"
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
                  Nivel Educativo *
                </label>
                <select
                  value={formNivel}
                  onChange={(e) => setFormNivel(e.target.value as 'Secundario' | 'Universitario')}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    color: '#0f172a',
                    boxSizing: 'border-box',
                    fontWeight: 600,
                    backgroundColor: '#ffffff'
                  }}
                >
                  <option value="Universitario">NIVEL UNIVERSITARIO</option>
                  <option value="Secundario">NIVEL SECUNDARIO</option>
                </select>
              </div>

              {formNivel === 'Universitario' && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                    Área o Carrera Universitaria *
                  </label>
                  <select
                    value={formArea}
                    onChange={(e) => setFormArea(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '13px',
                      color: '#0f172a',
                      boxSizing: 'border-box',
                      fontWeight: 500,
                      backgroundColor: '#ffffff'
                    }}
                  >
                    {AREAS_UNIVERSITARIAS.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
                  {formSubmitting ? 'Guardando...' : 'Guardar Materia'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}