'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';

const DIAS_NOMBRES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export default function ProfesorCalendarioPlaceholder() {
  const [fechaReferencia, setFechaReferencia] = useState<Date>(new Date());
  const [turnos, setTurnos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const formatISO = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const diasSemana = useMemo(() => {
    const d = new Date(fechaReferencia);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const lunes = new Date(d.setDate(diff));

    const arr: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const temp = new Date(lunes);
      temp.setDate(lunes.getDate() + i);
      arr.push(temp);
    }
    return arr;
  }, [fechaReferencia]);

  const cargarTurnosDocente = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prof } = await supabase
        .from('profesores')
        .select('id')
        .eq('email', user.email)
        .single();

      if (!prof) return;

      const { data } = await supabase
        .from('turnos_clase')
        .select('*, materias(nombre), aulas(nombre)')
        .eq('profesor_id', prof.id);

      setTurnos(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarTurnosDocente();
  }, []);

  const navegarSemana = (paso: number) => {
    const n = new Date(fechaReferencia);
    n.setDate(n.getDate() + paso * 7);
    setFechaReferencia(n);
  };

  return (
    <div style={{ width: '100%', boxSizing: 'border-box' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
        <div>
          <span style={{ color: '#2563eb', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Portal Docente
          </span>
          <h1 style={{ margin: '4px 0 2px' }}>Mi Calendario Académico</h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '14.5px' }}>
            Vista de clases, turnos y horarios asignados con diseño unificado
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => navegarSemana(-1)}
            style={{ padding: '8px 14px', backgroundColor: '#f1f5f9', border: '1.5px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
          >
            ← Anterior
          </button>
          <button
            onClick={() => setFechaReferencia(new Date())}
            style={{ padding: '8px 16px', backgroundColor: '#0b1e33', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
          >
            Hoy
          </button>
          <button
            onClick={() => navegarSemana(1)}
            style={{ padding: '8px 14px', backgroundColor: '#f1f5f9', border: '1.5px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
          >
            Siguiente →
          </button>
        </div>
      </header>

      {/* DISEÑO SEMANAL CON FORMATO UNIFICADO (HU31) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px' }}>
        {diasSemana.map((dia, idx) => {
          const iso = formatISO(dia);
          const esHoy = formatISO(new Date()) === iso;
          const nombreDia = DIAS_NOMBRES[dia.getDay()];

          const clasesDia = turnos.filter((t) => {
            const matchFecha = t.fecha === iso;
            const matchPeriodica = !t.fecha && t.dia_semana && t.dia_semana.toLowerCase().includes(nombreDia);
            return matchFecha || matchPeriodica;
          });

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
                {loading ? (
                  <span style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', marginTop: '16px' }}>Cargando...</span>
                ) : clasesDia.length === 0 ? (
                  <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', marginTop: '16px' }}>Sin clases</span>
                ) : (
                  clasesDia.map((c, cIdx) => {
                    const esCancelado = c.estado === 'cancelado';
                    return (
                      <div
                        key={cIdx}
                        style={{
                          backgroundColor: esCancelado ? '#fef2f2' : '#f8fafc',
                          border: `1px solid ${esCancelado ? '#fca5a5' : '#cbd5e1'}`,
                          borderLeft: `4px solid ${esCancelado ? '#dc2626' : '#2563eb'}`,
                          borderRadius: '6px',
                          padding: '10px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11.5px', fontWeight: 700, color: esCancelado ? '#991b1b' : '#1e3a8a' }}>
                            {c.hora_inicio?.slice(0, 5)} - {c.hora_fin?.slice(0, 5)}
                          </span>
                          {esCancelado && (
                            <span style={{ fontSize: '9.5px', fontWeight: 800, color: '#991b1b' }}>⊘ CANCELADO</span>
                          )}
                        </div>

                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: '4px 0' }}>
                          {c.materias?.nombre || 'Clase'}
                        </div>

                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          Aula: <strong>{c.aulas?.nombre || (c.aula_numero ? `Aula ${c.aula_numero}` : 'S/A')}</strong>
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
    </div>
  );
}