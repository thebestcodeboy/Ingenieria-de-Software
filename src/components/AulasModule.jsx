'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { getAulas, createAula, updateAula } from '../services/aulas';
import { Pagination, usePagination } from './Pagination';

function mensajeDeError(error, mensajePorDefecto) {
  return error instanceof Error ? error.message : mensajePorDefecto;
}

export default function AulasModule() {
  const [aulas, setAulas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos'); // 'todos' | 'activos' | 'inactivos'

  // Modal y formulario de creación/edición
  const [editingNumero, setEditingNumero] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    numero: '',
    descripcion: '',
    capacidad: '25',
    activo: true,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const data = await getAulas();
      setAulas(data || []);
    } catch (err) {
      setErrorMsg(mensajeDeError(err, 'Error al cargar las aulas del instituto.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = () => {
    setEditingNumero(null);
    setFormData({ numero: '', descripcion: '', capacidad: '25', activo: true });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingNumero(null);
    setIsModalOpen(false);
    setErrorMsg('');
  };

  const handleEdit = (aula) => {
    setEditingNumero(aula.numero);
    setFormData({
      numero: String(aula.numero),
      descripcion: aula.descripcion || '',
      capacidad: String(aula.capacidad || 25),
      activo: aula.activo !== false,
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleNumericChange = (e) => {
    setErrorMsg('');
    const onlyDigits = e.target.value.replace(/\D/g, '');
    setFormData({ ...formData, [e.target.name]: onlyDigits });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const num = Number(formData.numero);
    const cap = Number(formData.capacidad);

    if (!num || num <= 0) {
      setErrorMsg('El número de aula debe ser mayor a 0.');
      return;
    }

    if (!cap || cap <= 0) {
      setErrorMsg('La capacidad física debe ser de al menos 1 alumno/banco.');
      return;
    }

    try {
      setFormSubmitting(true);

      if (editingNumero) {
        await updateAula(editingNumero, {
          descripcion: formData.descripcion.trim() || `Aula ${editingNumero}`,
          capacidad: cap,
          activo: formData.activo,
        });

        // Verificamos contra el servidor que el cambio realmente se aplicó
        const data = await getAulas();
        setAulas(data || []);
        const guardada = (data || []).find((a) => String(a.numero) === String(editingNumero));
        if (guardada && (guardada.activo !== false) !== formData.activo) {
          setErrorMsg('El servidor no aplicó el cambio de estado. Revisá la sesión y los permisos de la tabla aulas.');
          return;
        }

        setSuccessMsg(`Aula ${editingNumero} modificada correctamente.`);
      } else {
        await createAula({
          numero: num,
          descripcion: `Aula ${num}`,
          capacidad: cap,
          activo: formData.activo,
        });
        setSuccessMsg(`Aula ${num} registrada correctamente.`);
      }

      setTimeout(() => setSuccessMsg(''), 4000);
      handleCloseModal();
      await loadData();
    } catch (err) {
      setErrorMsg(mensajeDeError(err, 'Error al guardar el aula.'));
    } finally {
      setFormSubmitting(false);
    }
  };

  const aulasFiltradas = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return aulas.filter((a) => {
      const activo = a.activo !== false;
      if (filtroEstado === 'activos' && !activo) return false;
      if (filtroEstado === 'inactivos' && activo) return false;
      if (!term) return true;
      const numStr = String(a.numero || '');
      const desc = (a.descripcion || '').toLowerCase();
      return numStr.includes(term) || desc.includes(term);
    });
  }, [aulas, searchTerm, filtroEstado]);

  const {
    elementosPaginados: aulasPaginadas,
    paginaActual,
    totalPaginas,
    cambiarPagina,
  } = usePagination(aulasFiltradas, JSON.stringify([searchTerm, filtroEstado]), 10);

  return (
    <div style={{ width: '100%', padding: '32px 40px', boxSizing: 'border-box', color: '#0f172a', fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}>
      
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
            Nómina de Aulas
          </h1>
          <p style={{ color: '#475569', fontSize: '16px', margin: '4px 0 0 0', fontWeight: 500 }}>
            {aulas.length} {aulas.length === 1 ? 'sala registrada' : 'salas registradas'}
          </p>
        </div>

        <button
          onClick={handleOpenModal}
          style={{
            backgroundColor: '#0b1e33',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            padding: '11px 22px',
            fontSize: '16px',
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
          <span style={{ fontSize: '19px', lineHeight: 1 }}>+</span> Registrar Aula
        </button>
      </div>

      {errorMsg && !isModalOpen && (
        <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '12px 16px', borderRadius: '6px', fontSize: '16px', marginBottom: '16px', fontWeight: 500 }}>
          {errorMsg}
        </div>
      )}
      {successMsg && !isModalOpen && (
        <div role="status" aria-live="polite" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: '12px 16px', borderRadius: '6px', fontSize: '16px', marginBottom: '16px', fontWeight: 500 }}>
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Buscar aula por número o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ border: 'none', outline: 'none', width: '100%', fontSize: '16px', color: '#0f172a', backgroundColor: 'transparent', fontWeight: 500 }}
          />
        </div>

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          aria-label="Filtrar por estado"
          style={{
            padding: '10px 14px',
            borderRadius: '6px',
            border: '1.5px solid #cbd5e1',
            fontSize: '15px',
            fontWeight: 600,
            color: '#0f172a',
            backgroundColor: '#ffffff',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}
        >
          <option value="todos">Todos los estados</option>
          <option value="activos">Activos</option>
          <option value="inactivos">Inactivos</option>
        </select>
      </div>

      {/* Tabla de Aulas */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', overflowX: 'auto', boxShadow: '0 2px 4px rgba(15, 23, 42, 0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '16px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #cbd5e1', backgroundColor: '#f1f5f9' }}>
              <th style={{ padding: '15px 20px', fontWeight: 800, color: '#0f172a', fontSize: '15px', letterSpacing: '0.05em', textTransform: 'uppercase', width: '20%' }}>NÚMERO</th>
              <th style={{ padding: '15px 20px', fontWeight: 800, color: '#0f172a', fontSize: '15px', letterSpacing: '0.05em', textTransform: 'uppercase', width: '38%' }}>NOMBRE / DESCRIPCIÓN</th>
              <th style={{ padding: '15px 20px', fontWeight: 800, color: '#0f172a', fontSize: '15px', letterSpacing: '0.05em', textTransform: 'uppercase', width: '18%' }}>CAPACIDAD FÍSICA</th>
              <th style={{ padding: '15px 20px', fontWeight: 800, color: '#0f172a', fontSize: '15px', letterSpacing: '0.05em', textTransform: 'uppercase', width: '12%', textAlign: 'center' }}>ESTADO</th>
              <th style={{ padding: '15px 20px', textAlign: 'center', fontWeight: 800, color: '#0f172a', fontSize: '15px', letterSpacing: '0.05em', textTransform: 'uppercase', width: '12%' }}>ACCIÓN</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: '#475569', fontWeight: 500, fontSize: '16px' }}>
                  Cargando nómina de aulas...
                </td>
              </tr>
            ) : aulasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '54px 20px', textAlign: 'center', color: '#64748b' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '17px' }}>No se encontraron aulas registradas</div>
                </td>
              </tr>
            ) : (
              aulasPaginadas.map((aula) => {
                const activo = aula.activo !== false;
                return (
                  <tr
                    key={aula.numero}
                    style={{ borderBottom: '1px solid #e2e8f0', transition: 'background-color 0.15s ease' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                  >
                    <td style={{ padding: '16px 20px', color: '#0b1e33', fontWeight: 700, fontSize: '16px' }}>
                      Aula {aula.numero}
                    </td>
                    <td style={{ padding: '16px 20px', color: '#0f172a', fontWeight: 600, fontSize: '16px' }}>
                      {aula.descripcion || `Aula ${aula.numero}`}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{
                        backgroundColor: '#e0e7ff',
                        color: '#3730a3',
                        fontSize: '14px',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontWeight: 600,
                        border: '1px solid #c7d2fe',
                        display: 'inline-block'
                      }}>
                        {aula.capacidad || 25} bancos
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <span style={{
                        backgroundColor: activo ? '#f0fdf4' : '#fef2f2',
                        color: activo ? '#15803d' : '#991b1b',
                        border: `1.5px solid ${activo ? '#bbf7d0' : '#fca5a5'}`,
                        padding: '4px 12px',
                        borderRadius: '5px',
                        fontSize: '14px',
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                        display: 'inline-block'
                      }}>
                        {activo ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleEdit(aula)}
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1.5px solid #94a3b8',
                          color: '#0b1e33',
                          borderRadius: '6px',
                          padding: '7px 16px',
                          fontSize: '15px',
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
      <Pagination paginaActual={paginaActual} totalPaginas={totalPaginas} onCambiarPagina={cambiarPagina} />

      {/* Modal Registrar / Modificar Aula */}
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
            maxHeight: 'calc(100dvh - 32px)',
            overflowY: 'auto',
            padding: '30px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            boxSizing: 'border-box'
          }}>
            <h2 style={{ fontSize: '21px', fontWeight: 800, margin: '0 0 20px 0', color: '#0f172a' }}>
              {editingNumero ? `Modificar Aula ${editingNumero}` : 'Registrar Nueva Aula'}
            </h2>

            {errorMsg && (
              <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '10px 14px', borderRadius: '6px', fontSize: '15px', marginBottom: '16px' }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'start' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '15px', fontWeight: 700, color: editingNumero ? '#64748b' : '#1e293b', marginBottom: '6px' }}>
                    Número de Aula *
                  </label>
                  <input
                    type="text"
                    name="numero"
                    required
                    readOnly={Boolean(editingNumero)}
                    disabled={Boolean(editingNumero)}
                    placeholder="Ej: 11"
                    value={formData.numero}
                    onChange={handleNumericChange}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '6px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '16px',
                      color: editingNumero ? '#475569' : '#0b1e33',
                      backgroundColor: editingNumero ? '#f1f5f9' : '#ffffff',
                      boxSizing: 'border-box',
                      fontWeight: 700,
                      cursor: editingNumero ? 'not-allowed' : 'text'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '15px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                    Capacidad Física *
                  </label>
                  <input
                    type="text"
                    name="capacidad"
                    required
                    placeholder="Ej: 25"
                    value={formData.capacidad}
                    onChange={handleNumericChange}
                    style={{ width: '100%', padding: '11px 14px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '16px', color: '#0f172a', boxSizing: 'border-box', fontWeight: 500 }}
                  />
                </div>
              </div>

              {/* Selector de Estado al final del formulario */}
              {editingNumero && (
                <div>
                  <label style={{ display: 'block', fontSize: '15px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                    Estado *
                  </label>
                  <select
                    value={formData.activo ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, activo: e.target.value === 'true' })}
                    style={{ width: '100%', padding: '11px 14px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '16px', backgroundColor: '#ffffff', color: '#0f172a', fontWeight: 600, boxSizing: 'border-box', cursor: 'pointer' }}
                  >
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  style={{ backgroundColor: 'transparent', border: '1.5px solid #cbd5e1', borderRadius: '6px', padding: '10px 18px', fontSize: '15.5px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  style={{ backgroundColor: '#0b1e33', border: 'none', borderRadius: '6px', padding: '10px 22px', fontSize: '15.5px', fontWeight: 700, color: '#ffffff', cursor: formSubmitting ? 'not-allowed' : 'pointer', opacity: formSubmitting ? 0.7 : 1 }}
                >
                  {formSubmitting ? 'Guardando...' : editingNumero ? 'Guardar Cambios' : 'Registrar Aula'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}