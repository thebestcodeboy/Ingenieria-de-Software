'use client';

import React, { useState, useEffect } from 'react';
import { getMaterias, createMateria, updateMateria } from '../services/materias';

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

  // Estado del modal unificado (Alta / Edición)
  const [editingId, setEditingId] = useState<string | number | null>(null);
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
      setMaterias(data);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al cargar el catálogo de materias.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterias();
  }, []);

  const handleOpenModal = () => {
    setEditingId(null);
    setFormNombre('');
    setFormNivel('Universitario');
    setFormArea(AREAS_UNIVERSITARIAS[0]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleEdit = (materia: Materia) => {
    setEditingId(materia.id);
    setFormNombre(materia.nombre || '');
    const nivelUpper = (materia.nivel || '').toLowerCase();
    const esUniv = nivelUpper.includes('univ');
    setFormNivel(esUniv ? 'Universitario' : 'Secundario');
    
    setFormArea(materia.area || AREAS_UNIVERSITARIAS[0]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingId(null);
    setIsModalOpen(false);
    setFormError(null);
  };

  // Validación de escritura en tiempo real (bloquea números por completo)
  const handleNombreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormError(null);
    const val = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s\-]/g, '');
    setFormNombre(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    try {
      setFormSubmitting(true);
      const payload = {
        nombre: formNombre,
        nivel: formNivel,
        area: formNivel === 'Universitario' ? formArea : undefined
      };

      if (editingId) {
        await updateMateria(editingId, payload);
        setSuccessMsg(`Materia "${formNombre.trim().toUpperCase()}" modificada con éxito.`);
      } else {
        await createMateria(payload);
        setSuccessMsg(`Materia "${formNombre.trim().toUpperCase()}" registrada con éxito.`);
      }

      setTimeout(() => setSuccessMsg(null), 4000);
      handleCloseModal();
      await fetchMaterias();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'No se pudo guardar la materia.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Filtrado reactivo
  const materiasFiltradas = materias.filter((m) => {
    const matchNombre = m.nombre?.toLowerCase().includes(searchTerm.toLowerCase());
    const nivelNorm = m.nivel?.toLowerCase() || '';
    const matchNivel =
      filterNivel === 'TODOS' ||
      (filterNivel === 'Universitario' && nivelNorm.includes('univ')) ||
      (filterNivel === 'Secundario' && (nivelNorm.includes('secun') || !nivelNorm.includes('univ')));
    return matchNombre && matchNivel;
  });

  return (
    <div style={{ width: '100%', padding: '32px 40px', boxSizing: 'border-box', color: '#0f172a' }}>
      
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
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
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1e3a5f'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0b1e33'}
        >
          <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span> Registrar Materia
        </button>
      </div>

      {/* Alertas Globales */}
      {errorMsg && (
        <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px' }}>
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px' }}>
          {successMsg}
        </div>
      )}

      {/* Filtros */}
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
            style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px', color: '#0f172a', backgroundColor: 'transparent', fontWeight: 500 }}
          />
        </div>
        <div style={{ width: '220px' }}>
          <select
            value={filterNivel}
            onChange={(e) => setFilterNivel(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              border: '1.5px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '13px',
              backgroundColor: '#ffffff',
              color: '#0f172a',
              fontWeight: 500,
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="TODOS">Todos los niveles</option>
            <option value="Secundario">Nivel Secundario</option>
            <option value="Universitario">Nivel Universitario</option>
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(15, 23, 42, 0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #cbd5e1', backgroundColor: '#f1f5f9' }}>
              <th style={{ padding: '14px 20px', fontWeight: 700, color: '#0f172a', fontSize: '12px', letterSpacing: '0.06em', textTransform: 'uppercase', width: '34%' }}>NOMBRE ASIGNATURA</th>
              <th style={{ padding: '14px 20px', fontWeight: 700, color: '#0f172a', fontSize: '12px', letterSpacing: '0.06em', textTransform: 'uppercase', width: '18%' }}>NIVEL EDUCATIVO</th>
              <th style={{ padding: '14px 20px', fontWeight: 700, color: '#0f172a', fontSize: '12px', letterSpacing: '0.06em', textTransform: 'uppercase', width: '24%' }}>ÁREA / CARRERA</th>
              <th style={{ padding: '14px 20px', fontWeight: 700, color: '#0f172a', fontSize: '12px', letterSpacing: '0.06em', textTransform: 'uppercase', width: '14%' }}>ESTADO</th>
              <th style={{ padding: '14px 20px', textAlign: 'center', fontWeight: 700, color: '#0f172a', fontSize: '12px', letterSpacing: '0.06em', textTransform: 'uppercase', width: '10%' }}>ACCIÓN</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#475569', fontWeight: 500 }}>
                  Cargando catálogo de materias...
                </td>
              </tr>
            ) : materiasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '54px 20px', textAlign: 'center', color: '#64748b' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>No se encontraron materias registradas</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Utiliza el botón superior &quot;+ Registrar Materia&quot; para dar de alta una asignatura.</div>
                </td>
              </tr>
            ) : (
              materiasFiltradas.map((materia) => {
                const nivelTexto = materia.nivel || 'Secundario';
                const esUniversitario = nivelTexto.toLowerCase().includes('univ');

                return (
                  <tr key={materia.id} style={{ borderBottom: '1px solid #e2e8f0', transition: 'background-color 0.15s ease' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}>
                    <td style={{ padding: '16px 20px', color: '#0f172a', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase' }}>
                      {materia.nombre}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{
                        backgroundColor: esUniversitario ? '#e0e7ff' : '#fef3c7',
                        color: esUniversitario ? '#3730a3' : '#92400e',
                        fontSize: '11px',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontWeight: 600,
                        border: `1px solid ${esUniversitario ? '#c7d2fe' : '#fde68a'}`
                      }}>
                        {esUniversitario ? 'Universitario' : 'Secundario'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', color: '#475569', fontSize: '12.5px', fontWeight: 500 }}>
                      {esUniversitario ? (
                        materia.area || '-'
                      ) : (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '12px' }}>No aplica</span>
                      )}
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
                        onClick={() => handleEdit(materia)}
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

      {/* Modal Registrar / Modificar Materia */}
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
              {editingId ? 'Modificar Materia' : 'Registrar Nueva Materia'}
            </h2>

            {formError && (
              <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '9px 14px', borderRadius: '6px', fontSize: '12px', marginBottom: '16px' }}>
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
                  placeholder="Ej: Análisis Matemático I"
                  value={formNombre}
                  onChange={handleNombreChange}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '13px', color: '#0f172a', boxSizing: 'border-box', textTransform: 'uppercase', fontWeight: 500 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                  Nivel Educativo *
                </label>
                <select
                  value={formNivel}
                  onChange={(e) => setFormNivel(e.target.value as 'Secundario' | 'Universitario')}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '13px', backgroundColor: '#ffffff', color: '#0f172a', fontWeight: 500, boxSizing: 'border-box', cursor: 'pointer' }}
                >
                  <option value="Universitario">Nivel Universitario</option>
                  <option value="Secundario">Nivel Secundario</option>
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
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                      fontWeight: 500,
                      boxSizing: 'border-box',
                      cursor: 'pointer'
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