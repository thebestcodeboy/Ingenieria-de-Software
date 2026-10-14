'use client';

<<<<<<< HEAD
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
=======
import { useCallback, useEffect, useMemo, useState } from 'react';
import { cancelarTurnoProfesor, listarCalendarioProfesorAvanzado, type TurnoAvanzadoProfesor } from '@/services/profesorPortal';
import styles from './ProfesorCalendarioAvanzado.module.css';

type Vista = 'dia' | 'semana' | 'mes';
const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
function fechaLocal(valor: Date) { return `${valor.getFullYear()}-${String(valor.getMonth()+1).padStart(2,'0')}-${String(valor.getDate()).padStart(2,'0')}`; }
function diaDesdeSql(valor: string) { const [a,m,d] = valor.split('-').map(Number); return new Date(a,m-1,d); }
function sumarDias(valor: string, cantidad: number) { const fecha=diaDesdeSql(valor); fecha.setDate(fecha.getDate()+cantidad); return fechaLocal(fecha); }
function fechaLegible(valor: string) { const d=diaDesdeSql(valor); return `${dias[d.getDay()]} ${d.getDate()} de ${meses[d.getMonth()]}`; }
function hora(h: string | null) { return h?.slice(0,5) ?? '--:--'; }
function estado(t: TurnoAvanzadoProfesor, ahora: Date) {
  if (t.cancelado) return 'cancelado';
  if (new Date(`${t.fecha}T${t.hora_fin || '23:59'}`) < ahora) return 'pasado';
  return 'porDar';
}
const etiquetas: Record<string,string> = { cancelado:'Cancelada', pasado:'Pasada', porDar:'Por dar' };
function inicioSemana(valor: string) { const d=diaDesdeSql(valor); d.setDate(d.getDate() - ((d.getDay()+6)%7)); return fechaLocal(d); }

export default function ProfesorCalendarioPlaceholder() {
  const [vista,setVista]=useState<Vista>('mes');
  const [fecha,setFecha]=useState(()=>fechaLocal(new Date()));
  const [turnos,setTurnos]=useState<TurnoAvanzadoProfesor[]>([]);
  const [cargando,setCargando]=useState(true);
  const [error,setError]=useState('');
  const [mensaje,setMensaje]=useState('');
  const [seleccionado,setSeleccionado]=useState<TurnoAvanzadoProfesor|null>(null);
  const [cancelando,setCancelando]=useState(false);
  const hoy=fechaLocal(new Date());
  const mesActual=diaDesdeSql(fecha);
  const desde=vista==='mes'?fechaLocal(new Date(mesActual.getFullYear(),mesActual.getMonth(),1)):vista==='semana'?inicioSemana(fecha):fecha;
  const hasta=vista==='mes'?fechaLocal(new Date(mesActual.getFullYear(),mesActual.getMonth()+1,0)):vista==='semana'?sumarDias(desde,6):fecha;
  const fechas=useMemo(()=>Array.from({length:vista==='semana'?7:1},(_,i)=>sumarDias(desde,i)),[desde,vista]);
  const cargar=useCallback(async()=>{setCargando(true);setError('');try{setTurnos(await listarCalendarioProfesorAvanzado(desde,hasta));}catch(e){setError(e instanceof Error?e.message:'No se pudo cargar el calendario.');}finally{setCargando(false);}},[desde,hasta]);
  useEffect(()=>{let vigente=true;listarCalendarioProfesorAvanzado(desde,hasta).then(v=>{if(vigente)setTurnos(v);}).catch(e=>{if(vigente)setError(e instanceof Error?e.message:'No se pudo cargar el calendario.');}).finally(()=>{if(vigente)setCargando(false);});return()=>{vigente=false;};},[desde,hasta]);
  function navegar(delta:number){setFecha(vista==='mes'?fechaLocal(new Date(mesActual.getFullYear(),mesActual.getMonth()+delta,1)):sumarDias(fecha,delta*(vista==='semana'?7:1)));setCargando(true);setMensaje('');}
  function volverAHoy() {
    const destino=fechaLocal(new Date());
    setFecha(destino);
    setVista('dia');
    setMensaje('');
    if (vista==='dia' && fecha===destino) void cargar();
    else setCargando(true);
  }
  async function cancelar(){if(!seleccionado)return;setCancelando(true);setError('');try{await cancelarTurnoProfesor(seleccionado.turno_id);setSeleccionado(null);setMensaje('La clase quedó cancelada y permanece visible en el calendario.');await cargar();}catch(e){setError(e instanceof Error?e.message:'No se pudo cancelar la clase.');}finally{setCancelando(false);}}
  const ahora=new Date();
  return <section className={styles.page}>
    <header className={styles.header}><div><span className={styles.eyebrow}>Portal docente</span><h1>Mi calendario</h1><p>Clases, materias y espacios libres de tu agenda.</p></div>
      <div className={styles.controls}><div className={styles.switcher} role="group" aria-label="Vista del calendario">
        <button type="button" aria-pressed={vista==='semana'} onClick={()=>{if(vista!=='semana'){setVista('semana');setCargando(true);}}}>Semana</button>
        <button type="button" aria-pressed={vista==='mes'} onClick={()=>{if(vista!=='mes'){setVista('mes');setCargando(true);}}}>Mes</button>
      </div><button type="button" className={styles.today} aria-pressed={vista==='dia'} onClick={volverAHoy}>Hoy</button></div>
    </header>
    <div className={styles.toolbar}>
      <div className={styles.navigation}><button type="button" onClick={()=>navegar(-1)} aria-label={vista==='mes'?'Mes anterior':vista==='semana'?'Semana anterior':'Día anterior'}>‹</button>
        <h2>{vista==='mes'?`${meses[mesActual.getMonth()]} de ${mesActual.getFullYear()}`:vista==='dia'?fechaLegible(fecha):`${fechaLegible(desde)} — ${fechaLegible(hasta)}`}</h2>
        <button type="button" onClick={()=>navegar(1)} aria-label={vista==='mes'?'Mes siguiente':vista==='semana'?'Semana siguiente':'Día siguiente'}>›</button></div>
      <span className={styles.count}>{turnos.length} {turnos.length===1?'clase':'clases'}</span>
    </div>
    <div className={styles.legend} aria-label="Estados de las clases">
      <span className={styles.legendItem + ' ' + styles.legendPorDar}>Por dar</span>
      <span className={styles.legendItem + ' ' + styles.legendPasado}>Pasada</span>
      <span className={styles.legendItem + ' ' + styles.legendCancelado}>Cancelada</span>
    </div>
    {error && <div role="alert" className={styles.error}>{error} <button type="button" onClick={()=>void cargar()}>Reintentar</button></div>}
    {mensaje && <div role="status" className={styles.success}>{mensaje}</div>}
    {cargando ? <div className={styles.loading} role="status">Cargando clases…</div> :
    <div className={styles.weekScroll}>{vista==='mes' ? <div className={styles.month}>
      {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d=><div key={d} className={styles.monthWeekday}>{d}</div>)}
      {Array.from({length:Math.ceil((((new Date(mesActual.getFullYear(),mesActual.getMonth(),1).getDay()+6)%7)+new Date(mesActual.getFullYear(),mesActual.getMonth()+1,0).getDate())/7)*7},(_,i)=>{
        const offset=(new Date(mesActual.getFullYear(),mesActual.getMonth(),1).getDay()+6)%7;
        const f=fechaLocal(new Date(mesActual.getFullYear(),mesActual.getMonth(),i-offset+1));
        const enMes=diaDesdeSql(f).getMonth()===mesActual.getMonth();
        const clases=turnos.filter(t=>t.fecha===f).sort((a,b)=>(a.hora_inicio||'').localeCompare(b.hora_inicio||''));
        return <div key={f} className={styles.monthCell + ' ' + (!enMes?styles.otherMonth:'') + ' ' + (f===hoy?styles.monthToday:'')}>
          <button type="button" className={styles.monthDate} onClick={()=>{setFecha(f);setVista('dia');setCargando(true);}} aria-label={'Ver '+fechaLegible(f)}>{diaDesdeSql(f).getDate()}</button>
          {enMes&&clases.slice(0,3).map(t=>{const e=estado(t,ahora);return <button type="button" key={t.turno_id} className={styles.monthEvent + ' ' + styles[e]} onClick={()=>setSeleccionado(t)}
            aria-label={t.materia_nombre+', '+hora(t.hora_inicio)+' a '+hora(t.hora_fin)+', aula '+(t.aula_numero||'sin asignar')+', '+etiquetas[e]}>
            <span>{t.cancelado?'✕ ':t.reprogramado?'↻ ':''}{hora(t.hora_inicio)}</span><strong>{t.materia_nombre}</strong><small>Aula {t.aula_numero??'—'}</small><em>{etiquetas[e]}</em>
          </button>})}
          {enMes&&clases.length>3&&<button type="button" className={styles.more} onClick={()=>{setFecha(f);setVista('dia');setCargando(true);}}>+{clases.length-3} clases más</button>}
        </div>;
      })}
    </div> : <div className={vista==='semana'?styles.week:styles.day}>
      {fechas.map(f=>{const clases=turnos.filter(t=>t.fecha===f).sort((a,b)=>(a.hora_inicio||'').localeCompare(b.hora_inicio||''));return <div key={f} className={styles.column}>
        <h3 className={f===hoy?styles.currentDay:styles.dayTitle}>{fechaLegible(f)}{f===hoy&&<span>Hoy</span>}</h3>
        {!clases.length?<div className={styles.free}>Sin clases programadas</div>:clases.map((t,i)=>{
          const prev=clases[i-1];const gap=prev&&prev.hora_fin&&t.hora_inicio?Math.max(0,Number(t.hora_inicio.slice(0,2))*60+Number(t.hora_inicio.slice(3,5))-Number(prev.hora_fin.slice(0,2))*60-Number(prev.hora_fin.slice(3,5))):0;
          const e=estado(t,ahora);return <div key={t.turno_id}>{gap>=15&&<div className={styles.gap}>Espacio libre · {gap} min</div>}
            <button type="button" className={`${styles.event} ${styles[e]}`} onClick={()=>setSeleccionado(t)} aria-label={`${t.materia_nombre}, ${hora(t.hora_inicio)} a ${hora(t.hora_fin)}, aula ${t.aula_numero||'sin asignar'}, ${etiquetas[e]}`}>
              <span className={styles.eventTop}><span>{hora(t.hora_inicio)} – {hora(t.hora_fin)}</span><span className={styles.badge}>{etiquetas[e]}</span></span>
              <strong>{t.materia_nombre}</strong><span className={styles.activity}>{t.actividad_nombre}</span>
              <span className={styles.eventBottom}>Aula {t.aula_numero??'sin asignar'}{t.reprogramado&&<span title="Reprogramada">↻ Reprogramada</span>}{t.cancelado&&<span title="Cancelada">✕</span>}</span>
            </button></div>;
        })}</div>;})}
    </div>}</div>}
    {seleccionado&&<div className={styles.overlay} role="presentation" onMouseDown={()=>!cancelando&&setSeleccionado(null)}>
      <div role="dialog" aria-modal="true" aria-labelledby="detalle-clase" className={styles.dialog} onMouseDown={e=>e.stopPropagation()}>
        <div className={styles.dialogHead}><div><span className={styles.eyebrow}>Detalle de la clase</span><h2 id="detalle-clase">{seleccionado.materia_nombre}</h2></div><button type="button" aria-label="Cerrar detalle" onClick={()=>setSeleccionado(null)}>×</button></div>
        <p>{seleccionado.actividad_nombre}</p>
        <dl className={styles.details}><dt>Fecha</dt><dd>{fechaLegible(seleccionado.fecha)}</dd><dt>Horario</dt><dd>{hora(seleccionado.hora_inicio)} – {hora(seleccionado.hora_fin)}</dd><dt>Aula</dt><dd>{seleccionado.aula_numero??'Sin asignar'}</dd><dt>Estado</dt><dd>{etiquetas[estado(seleccionado,ahora)]}{seleccionado.reprogramado?' · Reprogramada':''}</dd><dt>Cupo</dt><dd>{seleccionado.cupo_maximo??'Sin definir'}</dd></dl>
        <h3>Alumnos inscriptos ({seleccionado.alumnos.length})</h3>
        {seleccionado.alumnos.length?<ul className={styles.roster}>{seleccionado.alumnos.map(a=><li key={a.id}><span>{a.apellido}, {a.nombre}</span><small>{a.estado==='en_espera'?'En espera':'Confirmado'}</small></li>)}</ul>:<p className={styles.muted}>Todavía no hay alumnos inscriptos.</p>}
        <div className={styles.dialogActions}>{!seleccionado.cancelado&&seleccionado.fecha>=hoy&&<button type="button" className={styles.danger} disabled={cancelando} onClick={()=>void cancelar()}>{cancelando?'Cancelando…':'Cancelar clase'}</button>}<button type="button" onClick={()=>setSeleccionado(null)}>Cerrar</button></div>
      </div></div>}
  </section>;
}
>>>>>>> origin/hu23-25-29
