'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { cancelarTurnoProfesor, listarCalendarioProfesor, type TurnoCalendarioProfesor } from '@/services/profesorPortal';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS = ['DOM.', 'LUN.', 'MAR.', 'MIÉ.', 'JUE.', 'VIE.', 'SÁB.'];

function fechaSql(anio: number, mes: number, dia: number) {
  return `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function horaCorta(hora: string | null) {
  return hora?.slice(0, 5) ?? '--:--';
}

export default function ProfesorCalendarioPlaceholder() {
  const hoy = new Date();
  const [mesVisible, setMesVisible] = useState(() => new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  const [turnos, setTurnos] = useState<TurnoCalendarioProfesor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [turnoParaCancelar, setTurnoParaCancelar] = useState<TurnoCalendarioProfesor | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const anio = mesVisible.getFullYear();
  const mes = mesVisible.getMonth();
  const ultimoNumero = new Date(anio, mes + 1, 0).getDate();
  const primerDia = fechaSql(anio, mes, 1);
  const ultimoDia = fechaSql(anio, mes, ultimoNumero);
  const fechaHoy = fechaSql(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setTurnos(await listarCalendarioProfesor(primerDia, ultimoDia));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cargar el calendario.');
    } finally {
      setCargando(false);
    }
  }, [primerDia, ultimoDia]);

  async function confirmarCancelacion() {
    if (!turnoParaCancelar) return;
    setCancelando(true);
    setError(null);
    try {
      await cancelarTurnoProfesor(turnoParaCancelar.turno_id);
      setMensaje('La clase fue cancelada y ya no aparecerá en las agendas de los alumnos.');
      setTurnoParaCancelar(null);
      await cargar();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cancelar la clase.');
    } finally {
      setCancelando(false);
    }
  }

  useEffect(() => {
    let vigente = true;
    listarCalendarioProfesor(primerDia, ultimoDia)
      .then((resultado) => {
        if (vigente) setTurnos(resultado);
      })
      .catch((cause: unknown) => {
        if (vigente) setError(cause instanceof Error ? cause.message : 'No se pudo cargar el calendario.');
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [primerDia, ultimoDia]);

  const turnosPorFecha = useMemo(() => {
    const agrupados = new Map<string, TurnoCalendarioProfesor[]>();
    turnos.forEach((turno) => agrupados.set(turno.fecha, [...(agrupados.get(turno.fecha) ?? []), turno]));
    return agrupados;
  }, [turnos]);

  const celdas = useMemo(() => {
    const resultado: Array<{ clave: string; dia: number | null; fecha: string | null }> = [];
    const espaciosIniciales = new Date(anio, mes, 1).getDay();
    for (let indice = 0; indice < espaciosIniciales; indice += 1) resultado.push({ clave: `inicio-${indice}`, dia: null, fecha: null });
    for (let dia = 1; dia <= ultimoNumero; dia += 1) {
      const fecha = fechaSql(anio, mes, dia);
      resultado.push({ clave: fecha, dia, fecha });
    }
    while (resultado.length % 7 !== 0) resultado.push({ clave: `fin-${resultado.length}`, dia: null, fecha: null });
    return resultado;
  }, [anio, mes, ultimoNumero]);

  function cambiarMes(diferencia: number) {
    setCargando(true);
    setError(null);
    setMesVisible(new Date(anio, mes + diferencia, 1));
  }

  function volverAHoy() {
    setCargando(true);
    setError(null);
    setMesVisible(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  }

  return (
    <section aria-labelledby="titulo-calendario-docente">
      <div style={{ marginBottom: '24px' }}>
        <span style={{ color: '#2563eb', fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Portal docente</span>
        <h1 id="titulo-calendario-docente" style={{ color: '#0f172a', fontSize: '25px', margin: '5px 0 4px' }}>Mi calendario</h1>
        <p style={{ color: '#64748b', fontSize: '15px', margin: 0 }}>Consultá las clases que tenés asignadas.</p>
      </div>

      <div style={{ backgroundColor: '#ffffff', border: '1px solid #94a3b8', borderRadius: '7px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #94a3b8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button type="button" onClick={() => cambiarMes(-1)} aria-label="Mes anterior" style={botonNavegacion}>‹</button>
            <h2 style={{ margin: 0, fontSize: '19px', color: '#0b1e33', minWidth: '190px', textAlign: 'center' }}>{MESES[mes]} de {anio}</h2>
            <button type="button" onClick={() => cambiarMes(1)} aria-label="Mes siguiente" style={botonNavegacion}>›</button>
            <button type="button" onClick={volverAHoy} style={{ ...botonNavegacion, width: 'auto', padding: '0 12px', fontSize: '13px' }}>Hoy</button>
          </div>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#2563eb' }}>{turnos.length} {turnos.length === 1 ? 'clase programada' : 'clases programadas'}</span>
        </div>

        {error && <div role="alert" style={{ margin: '14px', padding: '12px', borderRadius: '7px', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '14px', display: 'flex', justifyContent: 'space-between', gap: '12px' }}><span>{error}</span><button type="button" onClick={() => void cargar()} style={{ border: 0, background: 'transparent', color: '#b91c1c', fontWeight: 700, cursor: 'pointer' }}>Reintentar</button></div>}
        {mensaje && <div role="status" style={{ margin: '14px', padding: '12px', borderRadius: '7px', backgroundColor: '#f0fdf4', color: '#166534', fontSize: '14px' }}>{mensaje}</div>}

        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(110px, 1fr))', backgroundColor: '#1e293b', color: '#ffffff', textAlign: 'center', fontSize: '13px', fontWeight: 700, minWidth: '770px' }}>
            {DIAS.map((dia) => <div key={dia} style={{ padding: '8px 4px', borderRight: '1px solid #334155' }}>{dia}</div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(110px, 1fr))', minWidth: '770px' }}>
            {celdas.map((celda, indice) => {
              const clases = celda.fecha ? turnosPorFecha.get(celda.fecha) ?? [] : [];
              const esHoy = celda.fecha === fechaHoy;
              const esPasado = Boolean(celda.fecha && celda.fecha < fechaHoy);
              return (
                <div key={celda.clave} style={{ backgroundColor: celda.dia === null ? '#f1f5f9' : esPasado ? '#fff1f2' : '#ffffff', borderRight: (indice + 1) % 7 === 0 ? 'none' : '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1', minHeight: '128px', padding: '6px', boxSizing: 'border-box' }}>
                  {celda.dia !== null && <><div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: esHoy ? '#2563eb' : esPasado ? '#fee2e2' : 'transparent', color: esHoy ? '#ffffff' : esPasado ? '#b91c1c' : '#334155', display: 'grid', placeItems: 'center', fontSize: '14px', fontWeight: 700, marginBottom: '5px' }}>{celda.dia}</div><div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>{clases.map((turno) => <article key={turno.turno_id} title={`${turno.actividad_nombre} · Aula ${turno.aula_numero ?? 'sin asignar'}`} style={{ backgroundColor: esPasado ? '#dc2626' : '#2563eb', color: '#ffffff', borderRadius: '5px', padding: '6px', fontSize: '12px', lineHeight: 1.3, boxShadow: '0 1px 2px rgba(0,0,0,0.12)' }}><strong style={{ display: 'block', fontSize: '12.5px', textTransform: 'uppercase' }}>{turno.materia_nombre}</strong><span style={{ display: 'block', color: esPasado ? '#fee2e2' : '#dbeafe' }}>{turno.actividad_nombre}</span><span style={{ display: 'block', color: esPasado ? '#fee2e2' : '#dbeafe' }}>{horaCorta(turno.hora_inicio)} - {horaCorta(turno.hora_fin)}</span><span style={{ display: 'block', color: esPasado ? '#fecaca' : '#e0e7ff' }}>Aula {turno.aula_numero ?? 'sin asignar'} · {turno.cantidad_alumnos} alumnos</span>{!esPasado && <button type="button" onClick={() => { setMensaje(null); setTurnoParaCancelar(turno); }} style={{ marginTop: '6px', padding: '4px 6px', border: '1px solid rgba(255,255,255,0.65)', borderRadius: '4px', backgroundColor: '#991b1b', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Cancelar esta clase</button>}</article>)}</div></>}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ padding: '9px 12px', backgroundColor: '#f8fafc', color: '#64748b', fontSize: '13px' }}>{cargando ? 'Cargando tus clases...' : turnos.length === 0 && !error ? 'No tenés clases asignadas durante este mes.' : 'Azul: clases próximas. Rojo: clases cuya fecha ya pasó. Solo se muestran turnos asignados por Mesa de Entrada.'}</div>
      </div>
      {turnoParaCancelar && (
        <div role="presentation" onMouseDown={() => !cancelando && setTurnoParaCancelar(null)} style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: '20px', backgroundColor: 'rgba(15, 23, 42, 0.55)' }}>
          <div role="dialog" aria-modal="true" aria-labelledby="titulo-cancelar-clase-docente" onMouseDown={(event) => event.stopPropagation()} style={{ width: '100%', maxWidth: '420px', padding: '24px', borderRadius: '8px', backgroundColor: '#fff', boxShadow: '0 20px 40px rgba(15, 23, 42, 0.2)' }}>
            <h2 id="titulo-cancelar-clase-docente" style={{ margin: '0 0 10px', color: '#0f172a', fontSize: '19px' }}>¿Cancelar esta clase?</h2>
            <p style={{ margin: '0 0 20px', color: '#475569', fontSize: '15px', lineHeight: 1.5 }}>
              Se cancelará solo la sesión del {turnoParaCancelar.fecha}. Los alumnos dejarán de verla en su agenda; las demás fechas del curso no cambiarán.
            </p>
            {error && <div role="alert" style={{ marginBottom: '14px', padding: '10px', borderRadius: '5px', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '14px' }}>{error}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" disabled={cancelando} onClick={() => setTurnoParaCancelar(null)} style={{ padding: '9px 13px', border: '1px solid #cbd5e1', borderRadius: '5px', backgroundColor: '#fff', color: '#334155', cursor: 'pointer' }}>Volver</button>
              <button type="button" disabled={cancelando} onClick={() => void confirmarCancelacion()} style={{ padding: '9px 13px', border: '0', borderRadius: '5px', backgroundColor: '#b91c1c', color: '#fff', fontWeight: 700, cursor: cancelando ? 'wait' : 'pointer' }}>{cancelando ? 'Cancelando...' : 'Confirmar cancelación'}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

const botonNavegacion = { border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#0f172a', borderRadius: '6px', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 700, fontSize: '18px', display: 'grid', placeItems: 'center' } as const;
