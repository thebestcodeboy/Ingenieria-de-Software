'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { getAulas, createAula, updateAula } from '../services/aulas';

function mensajeDeError(error, mensajePorDefecto) {
  return error instanceof Error ? error.message : mensajePorDefecto;
}

export default function AulasModule() {
  const [aulas, setAulas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [searchTerm, setSearchTerm] = useState('');

  // Modal y formulario de creación/edición
  const [editingNumero, setEditingNumero] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    numero: '',
    descripcion: '',
    capacidad: '25',
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
    setFormData({ numero: '', descripcion: '', capacidad: '25' });
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
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleNumericChange = (e) => {
    setErrorMsg('');
    const onlyDigits = e.target.value.replace(/\D/g, '');
    setFormData({ ...formData, [e.target.name]: onlyDigits });
  };

  const handleInputChange = (e) => {
    setErrorMsg('');
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
          descripcion: formData.descripcion,
          capacidad: cap,
        });
        setSuccessMsg(`Aula ${editingNumero} modificada correctamente.`);
      } else {
        await createAula({
          numero: num,
          descripcion: formData.descripcion.trim() || `Aula ${num}`,
          capacidad: cap,
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
    if (!term) return aulas;
    return aulas.filter((a) => {
      const numStr = String(a.numero || '');
      const desc = (a.descripcion || '').toLowerCase();
      return numStr.includes(term) || desc.includes(term);
    });
  }, [aulas, searchTerm]);

  return (
    <div style={{ width: '100%', padding: '32px 40px', boxSizing: 'border-box', color: '#0f172a' }}>
      
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
            Nómina de Aulas
          </h1>
          <p style={{ color: '#475569', fontSize: '13px', margin: '4px 0 0 0', fontWeight: 500 }}>
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
          <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span> Registrar Aula
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
            placeholder="Buscar aula por número o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px', color: '#0f172a', backgroundColor: 'transparent', fontWeight: 500 }}
          />
        </div>
      </div>

      {/* Tabla de Aulas */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(15, 23, 42, 0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #cbd5e1', backgroundColor: '#f1f5f9' }}>
              <th style={{ padding: '14px 20px', fontWeight: 700, color: '#0f172a', fontSize: '12px', letterSpacing: '0.06em', textTransform: 'uppercase', width: '20%' }}>NÚMERO</th>
              <th style={{ padding: '14px 20px', fontWeight: 700, color: '#0f172a', fontSize: '12px', letterSpacing: '0.06em', textTransform: 'uppercase', width: '38%' }}>NOMBRE / DESCRIPCIÓN</th>
              <th style={{ padding: '14px 20px', fontWeight: 700, color: '#0f172a', fontSize: '12px', letterSpacing: '0.06em', textTransform: 'uppercase', width: '18%' }}>CAPACIDAD FÍSICA</th>
              <th style={{ padding: '14px 20px', fontWeight: 700, color: '#0f172a', fontSize: '12px', letterSpacing: '0.06em', textTransform: 'uppercase', width: '12%', textAlign: 'center' }}>ESTADO</th>
              <th style={{ padding: '14px 20px', textAlign: 'center', fontWeight: 700, color: '#0f172a', fontSize: '12px', letterSpacing: '0.06em', textTransform: 'uppercase', width: '12%' }}>ACCIÓN</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#475569', fontWeight: 500 }}>
                  Cargando nómina de aulas...
                </td>
              </tr>
            ) : aulasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '54px 20px', textAlign: 'center', color: '#64748b' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>No se encontraron aulas registradas</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Utiliza el botón superior &quot;+ Registrar Aula&quot; para crear una nueva.</div>
                </td>
              </tr>
            ) : (
              aulasFiltradas.map((aula) => (
                <tr
                  key={aula.numero}
                  style={{ borderBottom: '1px solid #e2e8f0', transition: 'background-color 0.15s ease' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                >
                  <td style={{ padding: '16px 20px', color: '#0b1e33', fontWeight: 700, fontSize: '14px' }}>
                    Aula {aula.numero}
                  </td>
                  <td style={{ padding: '16px 20px', color: '#0f172a', fontWeight: 600, fontSize: '13px' }}>
                    {aula.descripcion || `Aula ${aula.numero}`}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{
                      backgroundColor: '#e0e7ff',
                      color: '#3730a3',
                      fontSize: '11px',
                      padding: '3px 8px',
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
                      HABILITADA
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                    <button
                      onClick={() => handleEdit(aula)}
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
              ))
            )}
          </tbody>
        </table>
      </div>

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
            maxWidth: '460px',
            padding: '28px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            boxSizing: 'border-box'
          }}>
            <h2 style={{ fontSize: '19px', fontWeight: 700, margin: '0 0 20px 0', color: '#0f172a' }}>
              {editingNumero ? `Modificar Aula ${editingNumero}` : 'Registrar Nueva Aula'}
            </h2>

            {errorMsg && (
              <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '9px 14px', borderRadius: '6px', fontSize: '12px', marginBottom: '16px' }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: editingNumero ? '#64748b' : '#1e293b', marginBottom: '6px' }}>
                    Número de Aula * {editingNumero && '(No modificable)'}
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
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '13px',
                      color: editingNumero ? '#475569' : '#0b1e33',
                      backgroundColor: editingNumero ? '#f1f5f9' : '#ffffff',
                      boxSizing: 'border-box',
                      fontWeight: 700,
                      cursor: editingNumero ? 'not-allowed' : 'text'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                    Capacidad Física *
                  </label>
                  <input
                    type="text"
                    name="capacidad"
                    required
                    placeholder="Ej: 25"
                    value={formData.capacidad}
                    onChange={handleNumericChange}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '13px', color: '#0f172a', boxSizing: 'border-box', fontWeight: 500 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                  Nombre / Descripción
                </label>
                <input
                  type="text"
                  name="descripcion"
                  placeholder="Ej: Aula 11 - Laboratorio de Computación"
                  value={formData.descripcion}
                  onChange={handleInputChange}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '13px', color: '#0f172a', boxSizing: 'border-box', fontWeight: 500 }}
                />
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