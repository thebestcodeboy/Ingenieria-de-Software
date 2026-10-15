'use client';

import AsistenciasModule from './AsistenciasModule';
import React, { useState, useEffect, useMemo } from 'react';
import { getCalendarioAdmin, getInscriptosTurno } from '../services/calendarioAdmin';
import { eventoEnFecha } from '../domain/calendario';

interface TurnoEvento {
  id?: string | number;
  turno_id?: string | number;
  fecha: string | null;
  dia_semana?: string | null;
  hora_inicio: string;
  hora_fin: string;
  aula_numero?: string | number;
  tipo_actividad?: string;
  actividad_nombre?: string;
  materia_nombre?: string;
  profesor_id?: string;
  profesor_nombre_completo?: string;
  cupo_maximo?: number | null;
  inscriptos_actuales?: number;
  lugares_disponibles?: number | null;
  estado?: string | null;
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
  const [fechaReferencia, setFechaReferencia] = useState<Date>(() => new Date());

  const [eventos, setEventos] = useState<TurnoEvento[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Filtros
  const [filtroMateria, setFiltroMateria] = useState<string>('');
  const [filtroProfesor, setFiltroProfesor] = useState<string>('');
  const [filtroAula, setFiltroAula] = useState<string>('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');

  // Modal Detalle
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
      setEventos(data || []);
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

      const esCancelado = ev.estado === 'cancelado';
      if (filtroEstado === 'activos' && esCancelado) return false;
      if (filtroEstado === 'cancelados' && !esCancelado) return false;

      return matchMat && matchProf && matchAula && (vista !== 'dia' || eventoEnFecha(ev, fechaDesde));
    });
  }, [eventos, filtroMateria, filtroProfesor, filtroAula, filtroEstado, vista, fechaDesde]);

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
    <div style={{ width: '100%', boxSizing: 'border-box' }}>
      
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ margin: 0 }}>Agenda Institucional y Turnos</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: '14.5px' }}>
            Mesa de Entrada · Control centralizado de clases, aulas y ocupación
          </p>
        </div>

        <div style={{ display: 'flex', backgroundColor: '#e2e8f0', padding: '3px', borderRadius: '8px', gap: '4px' }}>
          <button
            onClick={() => setVista('dia')}
            style={{
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              backgroundColor: vista === 'dia' ? '#0b1e33' : 'transparent',
              color: vista === 'dia' ? '#ffffff' : '#475569',
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
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              backgroundColor: vista === 'semana' ? '#0b1e33' : 'transparent',
              color: vista === 'semana' ? '#ffffff' : '#475569',
            }}
          >
            Semana
          </button>
        </div>
      </div>

      {/* Navegación y Filtros */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '12px 18px', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => navegarPeriodo(-1)}
            style={{ padding: '8px 14px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, color: '#0b1e33' }}
          >
            ← Anterior
          </button>
          <button
            onClick={irAHoy}
            style={{ padding: '8px 16px', backgroundColor: '#0b1e33', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
          >
            Hoy
          </button>
          <button
            onClick={() => navegarPeriodo(1)}
            style={{ padding: '8px 14px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, color: '#0b1e33' }}
          >
            Siguiente →
          </button>
        </div>

        <div style={{ fontSize: '15px', fontWeight: 800, color: '#0b1e33', textTransform: 'capitalize' }}>
          {vista === 'dia'
            ? fechaReferencia.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
            : `Semana del ${diasSemana[0]?.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} al ${diasSemana[6]?.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}`}
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            style={{ padding: '7px 12px', fontSize: '13px', borderRadius: '6px', border: '1.5px solid #cbd5e1', color: '#0b1e33', fontWeight: 600 }}
          >
            <option value="todos">Todos los estados</option>
            <option value="activos">Solo activos</option>
            <option value="cancelados">Solo cancelados</option>
          </select>
          <input
            type="text"
            placeholder="Filtrar materia..."
            value={filtroMateria}
            onChange={(e) => setFiltroMateria(e.target.value)}
            style={{ padding: '7px 12px', fontSize: '13px', borderRadius: '6px', width: '130px' }}
          />
          <input
            type="text"
            placeholder="Profesor..."
            value={filtroProfesor}
            onChange={(e) => setFiltroProfesor(e.target.value)}
            style={{ padding: '7px 12px', fontSize: '13px', borderRadius: '6px', width: '120px' }}
          />
          <input
            type="text"
            placeholder="Aula..."
            value={filtroAula}
            onChange={(e) => setFiltroAula(e.target.value)}
            style={{ padding: '7px 12px', fontSize: '13px', borderRadius: '6px', width: '70px' }}
          />
        </div>
      </div>

      {errorMsg && (
        <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '12px 16px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' }}>
          {errorMsg}
        </div>
      )}

      {/* Grilla Semanal con eventoEnFecha */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', backgroundColor: '#ffffff', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '15px' }}>
          Cargando agenda de turnos...
        </div>
      ) : vista === 'semana' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px' }}>
          {diasSemana.map((dia, idx) => {
            const diaISO = formatISO(dia);
            const esHoy = formatISO(new Date()) === diaISO;
            const turnosDelDia = eventosFiltrados.filter((ev) => eventoEnFecha(ev, diaISO));

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
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '12px 10px',
                    textAlign: 'center',
                    backgroundColor: esHoy ? '#0b1e33' : '#f8fafc',
                    color: esHoy ? '#ffffff' : '#1e293b',
                    borderBottom: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ fontSize: '11.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {dia.toLocaleDateString('es-AR', { weekday: 'short' })}
                  </div>
                  <div style={{ fontSize: '17px', fontWeight: 800 }}>{dia.getDate()}</div>
                </div>

                <div style={{ padding: '8px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
                  {turnosDelDia.length === 0 ? (
                    <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', marginTop: '16px' }}>
                      Sin clases
                    </span>
                  ) : (
                    turnosDelDia.map((ev, eIdx) => {
                      const esCancelado = ev.estado === 'cancelado';
                      const inscriptos = Number(ev.inscriptos_actuales || 0);
                      const cupo = Number(ev.cupo_maximo || 0);
                      const lleno = !esCancelado && cupo > 0 && inscriptos >= cupo;
                      const esPeriodico = !ev.fecha && !!ev.dia_semana;

                      return (
                        <div
                          key={eIdx}
                          onClick={() => handleAbrirDetalle(ev)}
                          style={{
                            backgroundColor: esCancelado ? '#fef2f2' : '#f8fafc',
                            border: `1px solid ${esCancelado ? '#fca5a5' : lleno ? '#fca5a5' : '#cbd5e1'}`,
                            borderLeft: `4px solid ${esCancelado ? '#dc2626' : lleno ? '#dc2626' : '#2563eb'}`,
                            borderRadius: '6px',
                            padding: '10px',
                            cursor: 'pointer',
                            opacity: esCancelado ? 0.8 : 1,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11.5px', fontWeight: 700, color: esCancelado ? '#991b1b' : '#1e3a8a' }}>
                              {ev.hora_inicio?.slice(0, 5)} - {ev.hora_fin?.slice(0, 5)}
                            </span>
                            {esCancelado ? (
                              <span style={{ fontSize: '9.5px', fontWeight: 800, color: '#991b1b' }}>⊘ CANCELADO</span>
                            ) : esPeriodico ? (
                              <span style={{ fontSize: '9.5px', fontWeight: 800, color: '#92400e', backgroundColor: '#fef3c7', padding: '1px 5px', borderRadius: '3px' }}>
                                PERIÓDICA
                              </span>
                            ) : null}
                          </div>

                          <div style={{ fontSize: '13px', fontWeight: 700, color: esCancelado ? '#64748b' : '#0f172a', margin: '4px 0', textDecoration: esCancelado ? 'line-through' : 'none' }}>
                            {ev.materia_nombre || ev.actividad_nombre || 'Clase'}
                          </div>

                          <div style={{ fontSize: '12px', color: '#475569' }}>
                            Aula: <strong>{ev.aula_numero || 'S/A'}</strong>
                          </div>

                          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                            {ev.profesor_nombre_completo || 'Sin profesor'}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                            {esCancelado ? (
                              <span style={{ fontSize: '11px', color: '#991b1b', fontStyle: 'italic', fontWeight: 600 }}>
                                Horario liberado
                              </span>
                            ) : (
                              <span style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: lleno ? '#fee2e2' : '#f0fdf4',
                                color: lleno ? '#991b1b' : '#15803d',
                                border: `1px solid ${lleno ? '#fca5a5' : '#bbf7d0'}`,
                              }}>
                                {inscriptos}/{cupo} insc.
                              </span>
                            )}
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
        /* Vista Diaria */
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
          {eventosFiltrados.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '16px' }}>No hay turnos registrados para esta fecha</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: '16%' }}>HORARIO</th>
                  <th style={{ width: '28%' }}>MATERIA / ACTIVIDAD</th>
                  <th style={{ width: '22%' }}>DOCENTE</th>
                  <th style={{ width: '10%', textAlign: 'center' }}>AULA</th>
                  <th style={{ width: '14%', textAlign: 'center' }}>ESTADO / CUPO</th>
                  <th style={{ width: '10%', textAlign: 'center' }}>ACCIÓN</th>
                </tr>
              </thead>
              <tbody>
                {eventosFiltrados.map((ev, idx) => {
                  const esCancelado = ev.estado === 'cancelado';
                  const inscriptos = Number(ev.inscriptos_actuales || 0);
                  const cupo = Number(ev.cupo_maximo || 0);
                  const lleno = !esCancelado && cupo > 0 && inscriptos >= cupo;

                  return (
                    <tr key={idx} style={{ opacity: esCancelado ? 0.75 : 1 }}>
                      <td>
                        <strong>{ev.hora_inicio?.slice(0, 5)} - {ev.hora_fin?.slice(0, 5)} hs</strong>
                      </td>
                      <td>
                        <strong>{ev.materia_nombre || ev.actividad_nombre || 'Clase'}</strong>
                      </td>
                      <td style={{ color: '#334155' }}>
                        {ev.profesor_nombre_completo || 'Sin profesor'}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>
                        {ev.aula_numero || '-'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {esCancelado ? (
                          <span className="badge-hu28 badge-hu28-cancelado">
                            <span>⊘</span> CANCELADO
                          </span>
                        ) : lleno ? (
                          <span className="badge-hu28 badge-hu28-completo">
                            <span>▲</span> {inscriptos}/{cupo} COMPLETO
                          </span>
                        ) : (
                          <span className="badge-hu28 badge-hu28-disponible">
                            <span>✓</span> {inscriptos}/{cupo} DISPONIBLE
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => handleAbrirDetalle(ev)}
                          style={{ padding: '6px 12px', border: '1px solid #94a3b8', borderRadius: '5px', backgroundColor: '#ffffff', color: '#0b1e33', cursor: 'pointer', fontWeight: 700 }}
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

      {/* MODAL FICHA Y NÓMINA */}
      {turnoSeleccionado && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 120, backgroundColor: 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(2px)' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '560px', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: turnoSeleccionado.estado === 'cancelado' ? '#dc2626' : '#2563eb', textTransform: 'uppercase' }}>
                  Ficha de Turno
                </span>
                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '2px 0 0 0', color: '#0f172a' }}>
                  {turnoSeleccionado.materia_nombre || turnoSeleccionado.actividad_nombre}
                </h2>
              </div>
              <button onClick={() => setTurnoSeleccionado(null)} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#64748b' }}>
                ×
              </button>
            </div>

            <details style={{ marginBottom: '16px' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 700, color: '#2563eb', fontSize: '14px' }}>Asistencias de esta clase</summary>
              <div style={{ marginTop: '10px' }}>
                <AsistenciasModule key={String(turnoSeleccionado.turno_id ?? turnoSeleccionado.id)} turnoId={String(turnoSeleccionado.turno_id ?? turnoSeleccionado.id)} />
              </div>
            </details>

            <div
              style={{
                backgroundColor: turnoSeleccionado.estado === 'cancelado' ? '#fef2f2' : '#f8fafc',
                border: `1px solid ${
                  turnoSeleccionado.estado === 'cancelado' ? '#fed7aa' : '#e2e8f0'
                }`,
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '20px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                fontSize: '14.5px',
              }}
            >
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '13px', fontWeight: 600 }}>
                  FECHA Y HORA
                </span>
                <strong style={{ color: '#0f172a' }}>
                  {turnoSeleccionado.fecha || `Recurrente (${turnoSeleccionado.dia_semana || 'Semanal'})`} ({turnoSeleccionado.hora_inicio?.slice(0, 5)} a{' '}
                  {turnoSeleccionado.hora_fin?.slice(0, 5)} hs)
                </strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '13px', fontWeight: 600 }}>
                  AULA
                </span>
                <strong style={{ color: '#0f172a' }}>
                  Aula {turnoSeleccionado.aula_numero || 'Sin asignar'}
                </strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '13px', fontWeight: 600 }}>
                  PROFESOR
                </span>
                <strong style={{ color: '#0f172a' }}>
                  {turnoSeleccionado.profesor_nombre_completo || 'Sin asignar'}
                </strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '13px', fontWeight: 600 }}>
                  ESTADO
                </span>
                <strong
                  style={{
                    color: turnoSeleccionado.estado === 'cancelado' ? '#dc2626' : '#166534',
                    textTransform: 'uppercase',
                  }}
                >
                  {turnoSeleccionado.estado || 'activo'}
                </strong>
              </div>
            </div>

            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 10px 0' }}>Alumnos Inscriptos ({inscriptos.length})</h3>

            {loadingInscriptos ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Cargando nómina...</div>
            ) : inscriptos.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                No hay alumnos inscriptos en este turno.
              </div>
            ) : (
              <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Alumno</th>
                      <th>DNI</th>
                      <th>Contacto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inscriptos.map((al, aIdx) => (
                      <tr key={aIdx}>
                        <td><strong>{al.apellido}, {al.nombre}</strong></td>
                        <td>{al.dni}</td>
                        <td>{al.telefono || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setTurnoSeleccionado(null)}
                style={{ backgroundColor: '#0b1e33', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '9px 18px', cursor: 'pointer', fontWeight: 700 }}
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