'use client';

import { useEffect, useMemo, useState } from 'react';
import { agruparActividadesCobro, construirVinculoPago, type ModalidadPago } from '../domain/pagoAcademico';
import { listarInscripcionesCobro, registrarObligacionPago } from '../services/pagos';

type Alumno = { id: string; nombre: string; apellido: string; legajo?: string | null };

export default function RegistrarObligacionModal({ alumnos, onClose, onSuccess }: { alumnos: Alumno[]; onClose: () => void; onSuccess: () => void }) {
  const hoy = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [alumnoId, setAlumnoId] = useState('');
  const [inscripciones, setInscripciones] = useState<Awaited<ReturnType<typeof listarInscripcionesCobro>>>([]);
  const [cargando, setCargando] = useState(false);
  const [actividadClave, setActividadClave] = useState('');
  const [modalidadCurso, setModalidadCurso] = useState<'Semana' | 'Mes'>('Mes');
  const [periodo, setPeriodo] = useState('');
  const [sesionId, setSesionId] = useState('');
  const [importe, setImporte] = useState(0);
  const [emision, setEmision] = useState(hoy);
  const [vencimiento, setVencimiento] = useState(hoy);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const actividades = useMemo(() => agruparActividadesCobro(inscripciones), [inscripciones]);
  const actividad = actividades.find((item) => item.clave === actividadClave);
  const modalidad: ModalidadPago = actividad?.clave.startsWith('particular:') ? 'Clase' : modalidadCurso;

  useEffect(() => {
    if (!alumnoId) return;
    let vigente = true;
    listarInscripcionesCobro(alumnoId)
      .then((filas) => { if (vigente) setInscripciones(filas); })
      .catch((err: unknown) => { if (vigente) setError(err instanceof Error ? err.message : 'No se pudieron cargar las inscripciones.'); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [alumnoId]);

  const cambiarAlumno = (id: string) => {
    setCargando(Boolean(id)); setAlumnoId(id); setInscripciones([]); setActividadClave(''); setPeriodo(''); setSesionId(''); setError('');
  };

  const guardar = async (evento: React.FormEvent) => {
    evento.preventDefault(); setError('');
    if (!alumnoId || !actividad || importe <= 0) return setError('Completá alumno, actividad e importe.');
    if (!emision || !vencimiento || vencimiento < emision) return setError('El vencimiento debe ser igual o posterior a la fecha de emisión.');
    try {
      const vinculo = construirVinculoPago(actividad, modalidad, periodo, 1, sesionId);
      const turno = actividad.sesiones[0].turnos_clase;
      setGuardando(true);
      await registrarObligacionPago({
        alumno_id: alumnoId, inscripcion_id: vinculo.inscripcion_id,
        curso_id: turno?.curso_id ?? null, materia_id: turno?.materia_id ?? null,
        periodo_desde: vinculo.periodo_desde, periodo_hasta: vinculo.periodo_hasta,
        actividad_nombre: actividad.nombre, concepto: vinculo.concepto,
        importe_original: importe, fecha_emision: emision, fecha_vencimiento: vencimiento,
      });
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la obligación.');
    } finally { setGuardando(false); }
  };

  return <div style={s.fondo} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="titulo-obligacion" style={s.modal}>
      <header style={s.cabecera}><div><h2 id="titulo-obligacion" style={s.titulo}>Registrar ajuste manual</h2><p style={s.ayuda}>Usalo para una deuda excepcional. Las tarifas normales se generan al confirmar la inscripción.</p></div><button type="button" onClick={onClose} style={s.cerrar}>Cerrar</button></header>
      <form onSubmit={guardar} style={s.formulario}>
        {error && <div role="alert" style={s.error}>{error}</div>}
        <label style={s.campo}>Alumno<select required value={alumnoId} onChange={(e) => cambiarAlumno(e.target.value)} style={s.control}><option value="">Seleccioná un alumno</option>{alumnos.map((alumno) => <option key={alumno.id} value={alumno.id}>{alumno.apellido}, {alumno.nombre} · {alumno.legajo || 'Sin legajo'}</option>)}</select></label>
        <label style={s.campo}>Curso o clase particular<select required value={actividadClave} disabled={!alumnoId || cargando} onChange={(e) => { setActividadClave(e.target.value); setPeriodo(''); setSesionId(''); }} style={s.control}><option value="">{cargando ? 'Cargando inscripciones...' : 'Seleccioná una inscripción confirmada'}</option>{actividades.map((item) => <option key={item.clave} value={item.clave}>{item.nombre} · {item.materias.join(', ')} · {item.docente}</option>)}</select></label>
        {alumnoId && !cargando && actividades.length === 0 && <p style={s.aviso}>El alumno no tiene inscripciones confirmadas disponibles.</p>}
        {actividad && modalidad !== 'Clase' && <label style={s.campo}>Modalidad<select value={modalidadCurso} onChange={(e) => { setModalidadCurso(e.target.value as 'Semana' | 'Mes'); setPeriodo(''); }} style={s.control}><option value="Mes">Mensual</option><option value="Semana">Semanal</option></select></label>}
        {actividad && modalidad === 'Clase' && <label style={s.campo}>Clase<select required value={sesionId} onChange={(e) => setSesionId(e.target.value)} style={s.control}><option value="">Seleccioná una clase</option>{actividad.sesiones.map((item) => <option key={item.id} value={item.id}>{item.turnos_clase?.fecha} · {item.turnos_clase?.hora_inicio.slice(0, 5)} a {item.turnos_clase?.hora_fin.slice(0, 5)}</option>)}</select></label>}
        {actividad && modalidad !== 'Clase' && <label style={s.campo}>{modalidad === 'Mes' ? 'Mes adeudado' : 'Semana adeudada'}<input required type={modalidad === 'Mes' ? 'month' : 'week'} value={periodo} onChange={(e) => setPeriodo(e.target.value)} style={s.control} /></label>}
        <label style={s.campo}>Importe<input required type="number" min="0.01" step="0.01" value={importe || ''} onChange={(e) => setImporte(Number(e.target.value))} style={s.control} /></label>
        <div style={s.fechas}><label style={s.campo}>Fecha de emisión<input required type="date" value={emision} max={vencimiento || undefined} onChange={(e) => setEmision(e.target.value)} style={s.control} /></label><label style={s.campo}>Fecha de vencimiento<input required type="date" value={vencimiento} min={emision || undefined} onChange={(e) => setVencimiento(e.target.value)} style={s.control} /></label></div>
        <div style={s.acciones}><button type="button" onClick={onClose} style={s.secundario}>Cancelar</button><button type="submit" disabled={guardando || cargando} style={{ ...s.primario, opacity: guardando ? .65 : 1 }}>{guardando ? 'Registrando...' : 'Registrar ajuste'}</button></div>
      </form>
    </section>
  </div>;
}

const s: Record<string, React.CSSProperties> = {
  fondo: { position: 'fixed', inset: 0, zIndex: 150, display: 'grid', placeItems: 'center', padding: 20, background: 'rgba(15,23,42,.65)' }, modal: { width: 'min(620px, 96vw)', maxHeight: '92vh', overflowY: 'auto', borderRadius: 12, background: '#fff', boxShadow: '0 25px 60px rgba(15,23,42,.3)' },
  cabecera: { display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 16, padding: '20px 22px', borderBottom: '1px solid #e2e8f0' }, titulo: { margin: 0, color: '#0f172a', fontSize: 22 }, ayuda: { margin: '5px 0 0', color: '#64748b', fontSize: 14 }, cerrar: { padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 7, background: '#fff', color: '#334155', cursor: 'pointer', fontWeight: 700 },
  formulario: { display: 'grid', gap: 15, padding: 22 }, campo: { display: 'grid', gap: 6, color: '#334155', fontSize: 14, fontWeight: 700 }, control: { width: '100%', padding: '10px 12px', border: '1px solid #94a3b8', borderRadius: 7, background: '#fff', color: '#0f172a', boxSizing: 'border-box', fontSize: 15 }, fechas: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }, error: { padding: 11, border: '1px solid #fecaca', borderRadius: 7, background: '#fef2f2', color: '#991b1b', fontWeight: 600 }, aviso: { margin: 0, color: '#64748b', fontSize: 14 }, acciones: { display: 'flex', justifyContent: 'flex-end', gap: 9, marginTop: 4 }, secundario: { padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: 7, background: '#fff', color: '#334155', cursor: 'pointer', fontWeight: 700 }, primario: { padding: '10px 15px', border: 0, borderRadius: 7, background: '#0b1e33', color: '#fff', cursor: 'pointer', fontWeight: 700 },
};
