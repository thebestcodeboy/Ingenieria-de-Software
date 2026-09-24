'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  obtenerClasesParticulares,
  obtenerMaterias,
  registrarClaseParticular,
  actualizarClaseParticular,
  cambiarEstadoClase
} from '../services/clasesParticulares';

const initialForm = { nombre: '', materiaId: '', nivel: 'universitario', activo: true };

export default function ClasesParticularesModule() {
  const [form, setForm] = useState(initialForm);
  const [materias, setMaterias] = useState([]);
  const [clases, setClases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Estado para el modal unificado (Crear / Editar)
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterNivel, setFilterNivel] = useState('TODOS');
  const [filterEstado, setFilterEstado] = useState('TODOS'); // Nuevo filtro por estado

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [materiasData, clasesData] = await Promise.all([
        obtenerMaterias(),
        obtenerClasesParticulares()
      ]);
      setMaterias(materiasData);
      setClases(clasesData);
    } catch (loadError) {
      setError(`No se pudieron cargar los datos: ${loadError.message}`);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenRegister = () => {
    setEditingId(null);
    setForm(initialForm);
    setError('');
    setSuccess('');
    setShowModal(true);
  };

  const handleOpenEdit = (clase) => {
    setEditingId(clase.id);
    setForm({
      nombre: clase.nombre || '',
      materiaId: clase.materia_id || '',
      nivel: (clase.nivel || 'universitario').toLowerCase(),
      activo: clase.activo !== false
    });
    setError('');
    setSuccess('');
    setShowModal(true);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    
    if (name === 'nivel') {
      setForm({ ...form, nivel: value, materiaId: '' });
    } else if (name === 'nombre') {
      const soloTexto = value.replace(/[0-9]/g, '');
      setForm({ ...form, nombre: soloTexto });
    } else if (name === 'activo') {
      setForm({ ...form, activo: value === 'true' });
    } else {
      setForm({ ...form, [name]: value });
    }

    setError('');
    setSuccess('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!form.nombre.trim() || !form.materiaId || !form.nivel) {
      setError('Completá el nombre, la materia y el nivel para guardar la clase.');
      return;
    }

    if (/\d/.test(form.nombre)) {
      setError('El nombre de la actividad no puede contener números.');
      return;
    }

    try {
      setSaving(true);
      if (editingId) {
        const actualizada = await actualizarClaseParticular(editingId, form);
        setClases(clases.map((c) => (c.id === editingId ? actualizada : c)));
        setSuccess('Clase particular modificada correctamente.');
      } else {
        const nueva = await registrarClaseParticular({ ...form, activo: true });
        setClases([nueva, ...clases]);
        setSuccess('Clase particular registrada correctamente.');
      }

      setTimeout(() => {
        setSuccess('');
        setShowModal(false);
      }, 2000);
    } catch (saveError) {
      setError(`No se pudo guardar la clase: ${saveError.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEstado = async (id, activoActual) => {
    try {
      setError('');
      await cambiarEstadoClase(id, activoActual);
      setClases(clases.map((c) => (c.id === id ? { ...c, activo: !activoActual } : c)));
    } catch (err) {
      setError(`No se pudo cambiar el estado: ${err.message}`);
    }
  };

  const materiasFiltradasModal = useMemo(() => {
    const nivForm = (form.nivel || '').toLowerCase();
    return materias.filter((m) => {
      const nivMat = (m.nivel || '').toLowerCase();
      if (nivForm.includes('univ')) {
        return nivMat.includes('univ');
      } else {
        return nivMat.includes('secun');
      }
    });
  }, [materias, form.nivel]);

  const clasesFiltradas = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return clases.filter((c) => {
      const nombreAct = (c.nombre || '').toLowerCase();
      const nombreMat = (c.materias?.nombre || '').toLowerCase();
      const matchTerm = nombreAct.includes(term) || nombreMat.includes(term);
      
      const matchNivel =
        filterNivel === 'TODOS' || (c.nivel || '').toLowerCase().includes(filterNivel.toLowerCase());
      
      const estaActivo = c.activo !== false;
      const matchEstado =
        filterEstado === 'TODOS' ||
        (filterEstado === 'ACTIVO' && estaActivo) ||
        (filterEstado === 'INACTIVO' && !estaActivo);

      return matchTerm && matchNivel && matchEstado;
    });
  }, [clases, searchTerm, filterNivel, filterEstado]);

  return (
    <div style={{ width: '100%', padding: '32px 40px', boxSizing: 'border-box', color: '#0f172a' }}>
      
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
            Clases Particulares
          </h1>
          <p style={{ color: '#475569', fontSize: '13px', margin: '4px 0 0 0', fontWeight: 500 }}>
            {clases.length} {clases.length === 1 ? 'propuesta registrada' : 'propuestas registradas'} de apoyo académico
          </p>
        </div>

        <button
          onClick={handleOpenRegister}
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
          <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span> Registrar Clase Particular
        </button>
      </div>

      {success && !showModal && (
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px' }}>
          {success}
        </div>
      )}
      {error && !showModal && (
        <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Filtros de Búsqueda y Desplegables */}
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
            placeholder="Buscar por nombre de actividad o materia..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px', color: '#0f172a', backgroundColor: 'transparent', fontWeight: 500 }}
          />
        </div>

        {/* Filtro de Nivel */}
        <div style={{ width: '200px' }}>
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
            <option value="universitario">Nivel Universitario</option>
            <option value="secundario">Nivel Secundario</option>
          </select>
        </div>

        {/* Filtro de Estado */}
        <div style={{ width: '180px' }}>
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
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
            <option value="TODOS">Todos los estados</option>
            <option value="ACTIVO">Activos</option>
            <option value="INACTIVO">Inactivos</option>
          </select>
        </div>
      </div>

      {/* Tabla Institucional */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(15, 23, 42, 0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #cbd5e1', backgroundColor: '#f1f5f9' }}>
              <th style={{ padding: '14px 20px', fontWeight: 700, color: '#0f172a', fontSize: '12px', letterSpacing: '0.06em', textTransform: 'uppercase', width: '32%' }}>NOMBRE DE LA ACTIVIDAD</th>
              <th style={{ padding: '14px 20px', fontWeight: 700, color: '#0f172a', fontSize: '12px', letterSpacing: '0.06em', textTransform: 'uppercase', width: '26%' }}>MATERIA ASOCIADA</th>
              <th style={{ padding: '14px 20px', fontWeight: 700, color: '#0f172a', fontSize: '12px', letterSpacing: '0.06em', textTransform: 'uppercase', width: '14%' }}>NIVEL</th>
              <th style={{ padding: '14px 20px', fontWeight: 700, color: '#0f172a', fontSize: '12px', letterSpacing: '0.06em', textTransform: 'uppercase', width: '14%' }}>ESTADO</th>
              <th style={{ padding: '14px 20px', textAlign: 'center', fontWeight: 700, color: '#0f172a', fontSize: '12px', letterSpacing: '0.06em', textTransform: 'uppercase', width: '14%' }}>ACCIÓN</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#475569', fontWeight: 500 }}>
                  Cargando clases particulares...
                </td>
              </tr>
            ) : clasesFiltradas.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '54px 20px', textAlign: 'center', color: '#64748b' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>No hay clases particulares que coincidan con los filtros</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Intenta ajustando los filtros de búsqueda superior.</div>
                </td>
              </tr>
            ) : (
              clasesFiltradas.map((c) => {
                const esUniv = (c.nivel || '').toLowerCase().includes('univ');
                const estaActivo = c.activo !== false;

                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid #e2e8f0', transition: 'background-color 0.15s ease' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}>
                    <td style={{ padding: '16px 20px', color: '#0f172a', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase' }}>
                      {c.nombre}
                    </td>
                    <td style={{ padding: '16px 20px', color: '#475569', fontWeight: 500 }}>
                      {c.materias?.nombre ? c.materias.nombre.trim() : 'Materia sin nombre'}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{
                        backgroundColor: esUniv ? '#e0e7ff' : '#fef3c7',
                        color: esUniv ? '#3730a3' : '#92400e',
                        fontSize: '11px',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontWeight: 600,
                        border: `1px solid ${esUniv ? '#c7d2fe' : '#fde68a'}`
                      }}>
                        {esUniv ? 'Universitario' : 'Secundario'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <button
                        onClick={() => handleToggleEstado(c.id, estaActivo)}
                        title="Haz clic para cambiar estado"
                        style={{
                          backgroundColor: estaActivo ? '#f0fdf4' : '#fef2f2',
                          color: estaActivo ? '#15803d' : '#991b1b',
                          border: `1px solid ${estaActivo ? '#bbf7d0' : '#fca5a5'}`,
                          padding: '4px 10px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          letterSpacing: '0.04em',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {estaActivo ? 'ACTIVO' : 'INACTIVO'}
                      </button>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleOpenEdit(c)}
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

      {/* Modal Registrar / Modificar Clase Particular */}
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
            maxWidth: '480px',
            padding: '28px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            boxSizing: 'border-box'
          }}>
            <h2 style={{ fontSize: '19px', fontWeight: 700, margin: '0 0 6px 0', color: '#0f172a' }}>
              {editingId ? 'Modificar Clase Particular' : 'Registrar Clase Particular'}
            </h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 20px 0' }}>
              La fecha, el aula y el profesor se asignan al programar el turno.
            </p>

            {error && (
              <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '9px 14px', borderRadius: '6px', fontSize: '12px', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                  Nombre de la actividad (Solo texto) *
                </label>
                <input
                  id="nombre"
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  placeholder="Ej. Apoyo de Matemática"
                  maxLength={120}
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '13px', color: '#0f172a', boxSizing: 'border-box', fontWeight: 500 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                  Nivel *
                </label>
                <select
                  id="nivel"
                  name="nivel"
                  value={form.nivel}
                  onChange={handleChange}
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '13px', backgroundColor: '#ffffff', color: '#0f172a', fontWeight: 500, boxSizing: 'border-box', cursor: 'pointer' }}
                >
                  <option value="universitario">Nivel Universitario</option>
                  <option value="secundario">Nivel Secundario</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                  Materia *
                </label>
                <select
                  id="materiaId"
                  name="materiaId"
                  value={form.materiaId}
                  onChange={handleChange}
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '13px', backgroundColor: '#ffffff', color: '#0f172a', fontWeight: 500, boxSizing: 'border-box', cursor: 'pointer' }}
                >
                  <option value="">Seleccioná una materia</option>
                  {materiasFiltradasModal.map((materia) => (
                    <option key={materia.id} value={materia.id}>
                      {materia.nombre.trim()}
                    </option>
                  ))}
                </select>
              </div>

              {editingId && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                    Estado *
                  </label>
                  <select
                    id="activo"
                    name="activo"
                    value={form.activo ? 'true' : 'false'}
                    onChange={handleChange}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '13px', backgroundColor: '#ffffff', color: '#0f172a', fontWeight: 500, boxSizing: 'border-box', cursor: 'pointer' }}
                  >
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ backgroundColor: 'transparent', border: '1.5px solid #cbd5e1', borderRadius: '6px', padding: '9px 16px', fontSize: '13px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ backgroundColor: '#0b1e33', border: 'none', borderRadius: '6px', padding: '9px 20px', fontSize: '13px', fontWeight: 600, color: '#ffffff', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
                >
                  {saving ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Registrar clase particular'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}