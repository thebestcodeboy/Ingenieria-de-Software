'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { getCalendarioAdmin, getInscriptosTurno } from '../services/calendarioAdmin';

interface TurnoEvento {
  id?: string | number;
  turno_id?: string | number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  aula_numero?: string | number;
  tipo_actividad?: string;
  actividad_nombre?: string;
  materia_nombre?: string;
  profesor_id?: string;
  profesor_nombre_completo?: string;
  cupo_maximo?: number;
  inscriptos_actuales?: number;
  lugares_disponibles?: number;
}

interface InscriptoDetalle {
  inscripcionId: string | number;
  alumnoId: string | number;
  nombre: string;
  apellido: string;
  dni: string | number;
  telefono?: string;
  legajo?: string;
}

export default function CalendarioAdminModule() {
  const [vista, setVista] = useState<'dia' | 'semana'>('semana');
  const [fechaReferencia, setFechaReferencia] = useState<Date>(new Date());

  const [eventos, setEventos] = useState<TurnoEvento[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Filtros
  const [filtroMateria, setFiltroMateria] = useState<string>('');
  const [filtroProfesor, setFiltroProfesor] = useState<string>('');
  const [filtroAula, setFiltroAula] = useState<string>('');

  // Modal
  const [turnoSeleccionado, setTurnoSeleccionado] = useState<TurnoEvento | null>(null);
  const [inscriptos, setInscriptos] = useState<InscriptoDetalle[]>([]);
  const [loadingInscriptos, setLoadingInscriptos] = useState<boolean>(false);

  const formatISO = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const { fechaDesde, fechaHasta, diasSemana } = useMemo(() => {
    if (vista === 'dia') {
      const f = formatISO(fechaReferencia);
      return { fechaDesde: f, fechaHasta: f, diasSemana: [fechaReferencia] };
    }

    const d = new Date(fechaReferencia);
    const day = d.getDay();
    const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
    const lunes = new Date(d.setDate(diffToMonday));

    const dias: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const temp = new Date(lunes);
      temp.setDate(lunes.getDate() + i);
      dias.push(temp);
    }

    return {
      fechaDesde: formatISO(dias[0]),
      fechaHasta: formatISO(dias[6]),
      diasSemana: dias,
    };
  }, [vista, fechaReferencia]);

  const cargarEventos = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const data = await getCalendarioAdmin(fechaDesde, fechaHasta);
      setEventos(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al conectar con la agenda.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarEventos();
  }, [fechaDesde, fechaHasta]);

  const navegarPeriodo = (paso: number) => {
    const nueva = new Date(fechaReferencia);
    if (vista === 'dia') {
      nueva.setDate(nueva.getDate() + paso);
    } else {
      nueva.setDate(nueva.getDate() + paso * 7);
    }
    setFechaReferencia(nueva);
  };

  const irAHoy = () => {
    setFechaReferencia(new Date());
  };

  const eventosFiltrados = useMemo(() => {
    return eventos.filter((ev) => {
      const materiaTxt = (ev.materia_nombre || ev.actividad_nombre || '').toLowerCase();
      const profTxt = (ev.profesor_nombre_completo || '').toLowerCase();
      const aulaTxt = String(ev.aula_numero || '').toLowerCase();

      const matchMat = !filtroMateria || materiaTxt.includes(filtroMateria.toLowerCase());
      const matchProf = !filtroProfesor || profTxt.includes(filtroProfesor.toLowerCase());
      const matchAula = !filtroAula || aulaTxt.includes(filtroAula.toLowerCase());

      return matchMat && matchProf && matchAula;
    });
  }, [eventos, filtroMateria, filtroProfesor, filtroAula]);

  const handleAbrirDetalle = async (turno: TurnoEvento) => {
    setTurnoSeleccionado(turno);
    const turnoId = turno.turno_id || turno.id;
    if (!turnoId) return;

    try {
      setLoadingInscriptos(true);
      const data = await getInscriptosTurno(turnoId);
      setInscriptos(data);
    } catch (e) {
      console.error(e);
      setInscriptos([]);
    } finally {
      setLoadingInscriptos(false);
    }
  };

  return (
    <div style={{ width: '100%', padding: '32px 40px', boxSizing: 'border-box', color: '#0f172a' }}>
      
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
            Agenda Institucional y Turnos
          </h1>
          <p style={{ color: '#475569', fontSize: '13px', margin: '4px 0 0 0', fontWeight: 500 }}>
            Mesa de Entrada &bull; Control centralizado de clases, aulas y ocupación
          </p>
        </div>

        <div style={{ display: 'flex', backgroundColor: '#e2e8f0', padding: '3px', borderRadius: '8px', gap: '4px' }}>
          <button
            onClick={() => setVista('dia')}
            style={{
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              backgroundColor: vista === 'dia' ? '#0b1e33' : 'transparent',
              color: vista === 'dia' ? '#ffffff' : '#475569',
              transition: 'all 0.15s ease'
            }}
          >
            Día
          </button>
          <button
            onClick={() => setVista('semana')}
            style={{
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              backgroundColor: vista === 'semana' ? '#0b1e33' : 'transparent',
              color: vista === 'semana' ? '#ffffff' : '#475569',
              transition: 'all 0.15s ease'
            }}
          >
            Semana
          </button>
        </div>
      </div>

      {/* Navegación y Filtros */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '8px',
        padding: '12px 18px',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => navegarPeriodo(-1)}
            style={{
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '7px 12px',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              color: '#0b1e33'
            }}
          >
            &larr; Anterior
          </button>
          <button
            onClick={irAHoy}
            style={{
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '7px 14px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              color: '#0b1e33'
            }}
          >
            Hoy
          </button>
          <button
            onClick={() => navegarPeriodo(1)}
            style={{
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '7px 12px',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              color: '#0b1e33'
            }}
          >
            Siguiente &rarr;
          </button>
        </div>

        <div style={{ fontSize: '15px', fontWeight: 700, color: '#0b1e33', textTransform: 'capitalize' }}>
          {vista === 'dia' ? (
            fechaReferencia.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
          ) : (
            `Semana del ${diasSemana[0]?.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} al ${diasSemana[6]?.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}`
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Filtrar materia..."
            value={filtroMateria}
            onChange={(e) => setFiltroMateria(e.target.value)}
            style={{ padding: '7px 10px', fontSize: '12px', borderRadius: '6px', border: '1.5px solid #cbd5e1', width: '130px' }}
          />
          <input
            type="text"
            placeholder="Filtrar profesor..."
            value={filtroProfesor}
            onChange={(e) => setFiltroProfesor(e.target.value)}
            style={{ padding: '7px 10px', fontSize: '12px', borderRadius: '6px', border: '1.5px solid #cbd5e1', width: '130px' }}
          />
          <input
            type="text"
            placeholder="Aula..."
            value={filtroAula}
            onChange={(e) => setFiltroAula(e.target.value)}
            style={{ padding: '7px 10px', fontSize: '12px', borderRadius: '6px', border: '1.5px solid #cbd5e1', width: '70px' }}
          />
        </div>
      </div>

      {errorMsg && (
        <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px' }}>
          {errorMsg}
        </div>
      )}

      {/* Contenido Principal */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontWeight: 500, backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
          Cargando turnos desde la base de datos...
        </div>
      ) : vista === 'semana' ? (
        /* VISTA SEMANAL */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px' }}>
          {diasSemana.map((dia, idx) => {
            const diaISO = formatISO(dia);
            const esHoy = formatISO(new Date()) === diaISO;
            const turnosDelDia = eventosFiltrados.filter((ev) => ev.fecha === diaISO);

            return (
              <div
                key={idx}
                style={{
                  backgroundColor: '#ffffff',
                  border: `1.5px solid ${esHoy ? '#0b1e33' : '#e2e8f0'}`,
                  borderRadius: '8px',
                  minHeight: '460px',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}
              >
                <div style={{
                  padding: '10px',
                  textAlign: 'center',
                  backgroundColor: esHoy ? '#0b1e33' : '#f8fafc',
                  color: esHoy ? '#ffffff' : '#1e293b',
                  borderBottom: '1px solid #e2e8f0'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {dia.toLocaleDateString('es-AR', { weekday: 'short' })}
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 800 }}>
                    {dia.getDate()}
                  </div>
                </div>

                <div style={{ padding: '8px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
                  {turnosDelDia.length === 0 ? (
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', marginTop: '16px' }}>
                      Sin clases
                    </span>
                  ) : (
                    turnosDelDia.map((ev, eIdx) => {
                      const inscriptos = Number(ev.inscriptos_actuales || 0);
                      const cupo = Number(ev.cupo_maximo || 0);
                      const lleno = cupo > 0 && inscriptos >= cupo;

                      return (
                        <div
                          key={eIdx}
                          onClick={() => handleAbrirDetalle(ev)}
                          style={{
                            backgroundColor: '#f8fafc',
                            border: `1px solid ${lleno ? '#fca5a5' : '#cbd5e1'}`,
                            borderLeft: `3.5px solid ${lleno ? '#dc2626' : '#2563eb'}`,
                            borderRadius: '5px',
                            padding: '8px 10px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#eff6ff'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                        >
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#1e3a8a' }}>
                            {ev.hora_inicio?.slice(0, 5)} - {ev.hora_fin?.slice(0, 5)}
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', margin: '2px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {ev.materia_nombre || ev.actividad_nombre || 'Clase'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#475569' }}>
                            Aula: <strong>{ev.aula_numero || 'S/A'}</strong>
                          </div>
                          <div style={{ fontSize: '10.5px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {ev.profesor_nombre_completo || 'Sin profesor'}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                            <span style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '1px 5px',
                              borderRadius: '3px',
                              backgroundColor: lleno ? '#fee2e2' : '#f1f5f9',
                              color: lleno ? '#991b1b' : '#334155'
                            }}>
                              {inscriptos}/{cupo} insc.
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VISTA DIARIA */
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
          {eventosFiltrados.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>No hay turnos registrados para esta fecha</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>Comprobá los filtros activos o navegá a otro día.</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                  <th style={{ padding: '12px 18px', fontWeight: 700, width: '14%' }}>HORARIO</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700, width: '28%' }}>MATERIA / ACTIVIDAD</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700, width: '22%' }}>DOCENTE</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700, width: '10%', textAlign: 'center' }}>AULA</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700, width: '14%', textAlign: 'center' }}>OCUPACIÓN</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700, width: '12%', textAlign: 'center' }}>ACCIÓN</th>
                </tr>
              </thead>
              <tbody>
                {eventosFiltrados.map((ev, idx) => {
                  const inscriptos = Number(ev.inscriptos_actuales || 0);
                  const cupo = Number(ev.cupo_maximo || 0);
                  const lleno = cupo > 0 && inscriptos >= cupo;

                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '14px 18px', fontWeight: 700, color: '#0b1e33' }}>
                        {ev.hora_inicio?.slice(0, 5)} - {ev.hora_fin?.slice(0, 5)} hs
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 600, color: '#0f172a' }}>
                        {ev.materia_nombre || ev.actividad_nombre || 'Clase'}
                      </td>
                      <td style={{ padding: '14px 18px', color: '#334155' }}>
                        {ev.profesor_nombre_completo || 'Sin profesor'}
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'center', fontWeight: 700 }}>
                        {ev.aula_numero || '-'}
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: lleno ? '#fee2e2' : '#f0fdf4',
                          color: lleno ? '#991b1b' : '#15803d',
                          border: `1px solid ${lleno ? '#fca5a5' : '#bbf7d0'}`
                        }}>
                          {inscriptos} / {cupo} alumnos
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleAbrirDetalle(ev)}
                          style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #94a3b8',
                            color: '#0b1e33',
                            borderRadius: '5px',
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Ver Nómina
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal Ficha y Nómina */}
      {turnoSeleccionado && (
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
          zIndex: 120,
          backdropFilter: 'blur(2px)'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '560px',
            padding: '28px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>
                  Ficha de Turno Institucional
                </span>
                <h2 style={{ fontSize: '19px', fontWeight: 700, margin: '2px 0 0 0', color: '#0f172a' }}>
                  {turnoSeleccionado.materia_nombre || turnoSeleccionado.actividad_nombre}
                </h2>
              </div>
              <button
                onClick={() => setTurnoSeleccionado(null)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>
            </div>

            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12.5px' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600 }}>FECHA Y HORA</span>
                <strong style={{ color: '#0f172a' }}>{turnoSeleccionado.fecha} ({turnoSeleccionado.hora_inicio?.slice(0, 5)} a {turnoSeleccionado.hora_fin?.slice(0, 5)} hs)</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600 }}>AULA</span>
                <strong style={{ color: '#0f172a' }}>Aula {turnoSeleccionado.aula_numero || 'Sin asignar'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600 }}>PROFESOR</span>
                <strong style={{ color: '#0f172a' }}>{turnoSeleccionado.profesor_nombre_completo || 'Sin asignar'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600 }}>OCUPACIÓN</span>
                <strong style={{ color: '#0f172a' }}>{inscriptos.length} de {turnoSeleccionado.cupo_maximo || 0} lugares ({turnoSeleccionado.lugares_disponibles ?? 0} disponibles)</strong>
              </div>
            </div>

            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: '0 0 10px 0' }}>
              Alumnos Inscriptos ({inscriptos.length})
            </h3>

            {loadingInscriptos ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '12.5px' }}>
                Cargando alumnos inscriptos...
              </div>
            ) : inscriptos.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '12.5px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
                No hay alumnos inscriptos en este turno.
              </div>
            ) : (
              <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '8px 12px', fontWeight: 700 }}>ALUMNO</th>
                      <th style={{ padding: '8px 12px', fontWeight: 700 }}>DNI</th>
                      <th style={{ padding: '8px 12px', fontWeight: 700 }}>CONTACTO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inscriptos.map((al, aIdx) => (
                      <tr key={aIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0f172a' }}>
                          {al.apellido}, {al.nombre}
                        </td>
                        <td style={{ padding: '8px 12px', color: '#334155' }}>{al.dni}</td>
                        <td style={{ padding: '8px 12px', color: '#64748b' }}>{al.telefono || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setTurnoSeleccionado(null)}
                style={{
                  backgroundColor: '#0b1e33',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '9px 18px',
                  fontSize: '13px',
                  fontWeight: 600,
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