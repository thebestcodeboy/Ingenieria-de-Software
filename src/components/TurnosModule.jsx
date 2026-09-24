import React, { useEffect, useMemo, useState } from 'react';
import { obtenerDatosTurnos, registrarTurno } from '../services/turnos';

const initialForm = {
  actividadTipo: 'curso',
  actividadId: '',
  materiaId: '',
  profesorId: '',
  aulaNumero: '',
  fecha: '',
  horaInicio: '',
  horaFin: ''
};

const formatTime = (value) => value?.slice(0, 5) || '';

export default function TurnosModule() {
  const [form, setForm] = useState(initialForm);
  const [data, setData] = useState({
    cursos: [], particulares: [], materias: [], profesores: [],
    profesorMaterias: [], cursoMaterias: [], aulas: [], turnos: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        setData(await obtenerDatosTurnos());
      } catch (loadError) {
        setError(`No se pudieron cargar los datos: ${loadError.message}`);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const actividades = form.actividadTipo === 'curso' ? data.cursos : data.particulares;
  const actividadSeleccionada = actividades.find((actividad) => actividad.id === form.actividadId);

  const materiasDisponibles = useMemo(() => {
    if (form.actividadTipo === 'particular') {
      return data.materias.filter((materia) => materia.id === actividadSeleccionada?.materia_id);
    }

    const materiaIds = data.cursoMaterias
      .filter((relation) => relation.curso_id === form.actividadId)
      .map((relation) => relation.materia_id);
    return data.materias.filter((materia) => materiaIds.includes(materia.id));
  }, [data.cursoMaterias, data.materias, form.actividadId, form.actividadTipo, actividadSeleccionada?.materia_id]);

  const profesoresDisponibles = useMemo(() => {
    const profesorIds = data.profesorMaterias
      .filter((relation) => relation.materia_id === form.materiaId)
      .map((relation) => relation.profesor_id);
    return data.profesores.filter((profesor) => profesorIds.includes(profesor.id));
  }, [data.profesorMaterias, data.profesores, form.materiaId]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setError('');
    setSuccess('');

    if (name === 'actividadTipo') {
      setForm({ ...initialForm, actividadTipo: value });
      return;
    }

    if (name === 'actividadId') {
      const selectedActivity = actividades.find((actividad) => actividad.id === value);
      setForm({
        ...form,
        actividadId: value,
        materiaId: form.actividadTipo === 'particular' ? selectedActivity?.materia_id || '' : '',
        profesorId: ''
      });
      return;
    }

    if (name === 'materiaId') {
      setForm({ ...form, materiaId: value, profesorId: '' });
      return;
    }

    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const requiredFields = [form.actividadId, form.materiaId, form.profesorId, form.aulaNumero, form.fecha, form.horaInicio, form.horaFin];
    if (requiredFields.some((field) => !field)) {
      setError('Completá actividad, materia, profesor, aula, fecha y horario.');
      return;
    }

    if (form.horaFin <= form.horaInicio) {
      setError('La hora de finalización debe ser posterior a la hora de inicio.');
      return;
    }

    try {
      setSaving(true);
      const turno = await registrarTurno(form);
      setData({ ...data, turnos: [...data.turnos, turno].sort((first, second) => `${first.fecha}${first.hora_inicio}`.localeCompare(`${second.fecha}${second.hora_inicio}`)) });
      setForm(initialForm);
      setSuccess('El turno fue programado correctamente.');
    } catch (saveError) {
      setError(`No se pudo programar el turno: ${saveError.message}`);
    } finally {
      setSaving(false);
    }
  };

  const getMateria = (id) => data.materias.find((materia) => materia.id === id)?.nombre?.trim() || 'Materia';
  const getProfesor = (id) => {
    const profesor = data.profesores.find((item) => item.id === id);
    return profesor ? `${profesor.nombre} ${profesor.apellido}`.trim() : 'Profesor';
  };
  const getActividad = (turno) => {
    const activity = turno.clase_particular_id
      ? data.particulares.find((item) => item.id === turno.clase_particular_id)
      : data.cursos.find((item) => item.id === turno.curso_id);
    return activity?.nombre || 'Actividad';
  };

  return (
    <section>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Programar turno de clase</h1>
          <p style={styles.subtitle}>Organizá un encuentro con actividad, materia, profesor, aula y horario.</p>
        </div>
        <div style={styles.count}>{data.turnos.length} turnos</div>
      </header>

      <div style={styles.layout}>
        <form onSubmit={handleSubmit} style={styles.formCard}>
          <h2 style={styles.cardTitle}>Nuevo turno</h2>
          <p style={styles.cardSubtitle}>Los controles de solapamiento y disponibilidad avanzada corresponden al incremento 2.</p>

          <label style={styles.label} htmlFor="actividadTipo">Tipo de actividad</label>
          <select id="actividadTipo" name="actividadTipo" value={form.actividadTipo} onChange={handleChange} style={styles.input}>
            <option value="curso">Curso de ingreso</option>
            <option value="particular">Clase particular</option>
          </select>

          <label style={styles.label} htmlFor="actividadId">Actividad</label>
          <select id="actividadId" name="actividadId" value={form.actividadId} onChange={handleChange} style={styles.input}>
            <option value="">Seleccioná una actividad</option>
            {actividades.map((actividad) => <option key={actividad.id} value={actividad.id}>{actividad.nombre}</option>)}
          </select>

          <label style={styles.label} htmlFor="materiaId">Materia</label>
          <select id="materiaId" name="materiaId" value={form.materiaId} onChange={handleChange} style={styles.input} disabled={!form.actividadId}>
            <option value="">Seleccioná una materia</option>
            {materiasDisponibles.map((materia) => <option key={materia.id} value={materia.id}>{materia.nombre.trim()}</option>)}
          </select>

          <label style={styles.label} htmlFor="profesorId">Profesor</label>
          <select id="profesorId" name="profesorId" value={form.profesorId} onChange={handleChange} style={styles.input} disabled={!form.materiaId}>
            <option value="">Seleccioná un profesor</option>
            {profesoresDisponibles.map((profesor) => <option key={profesor.id} value={profesor.id}>{profesor.nombre} {profesor.apellido}</option>)}
          </select>

          <label style={styles.label} htmlFor="aulaNumero">Aula</label>
          <select id="aulaNumero" name="aulaNumero" value={form.aulaNumero} onChange={handleChange} style={styles.input}>
            <option value="">Seleccioná un aula</option>
            {data.aulas.map((aula) => <option key={aula.numero} value={aula.numero}>{aula.descripcion || `Aula ${aula.numero}`}</option>)}
          </select>

          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="fecha">Fecha</label>
              <input id="fecha" name="fecha" type="date" value={form.fecha} onChange={handleChange} style={styles.input} />
            </div>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="horaInicio">Inicio</label>
              <input id="horaInicio" name="horaInicio" type="time" value={form.horaInicio} onChange={handleChange} style={styles.input} />
            </div>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="horaFin">Fin</label>
              <input id="horaFin" name="horaFin" type="time" value={form.horaFin} onChange={handleChange} style={styles.input} />
            </div>
          </div>

          {error && <p role="alert" style={styles.error}>{error}</p>}
          {success && <p role="status" style={styles.success}>{success}</p>}
          <button type="submit" disabled={saving || loading} style={styles.submit}>{saving ? 'Guardando...' : 'Programar turno'}</button>
        </form>

        <div style={styles.listCard}>
          <h2 style={styles.cardTitle}>Calendario de turnos</h2>
          <p style={styles.cardSubtitle}>Turnos registrados con todos sus datos básicos.</p>
          {loading ? <p style={styles.empty}>Cargando agenda...</p> : data.turnos.length === 0 ? <p style={styles.empty}>Todavía no hay turnos programados.</p> : (
            <div style={styles.list}>
              {data.turnos.map((turno) => (
                <article key={turno.id} style={styles.item}>
                  <div>
                    <p style={styles.date}>{turno.fecha}</p>
                    <h3 style={styles.itemTitle}>{getActividad(turno)}</h3>
                    <p style={styles.itemMeta}>{getMateria(turno.materia_id)} · {getProfesor(turno.profesor_id)}</p>
                  </div>
                  <div style={styles.itemAside}>
                    <strong>{formatTime(turno.hora_inicio)} - {formatTime(turno.hora_fin)}</strong>
                    <span>Aula {turno.aula_numero}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '28px' },
  eyebrow: { margin: '0 0 6px', color: '#2563eb', fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' },
  title: { margin: 0, color: '#0f172a', fontSize: '25px', fontWeight: 750 },
  subtitle: { margin: '6px 0 0', color: '#64748b', fontSize: '14px' },
  count: { padding: '8px 12px', backgroundColor: '#e0f2fe', borderRadius: '6px', color: '#0369a1', fontSize: '12px', fontWeight: 700 },
  layout: { display: 'grid', gridTemplateColumns: 'minmax(300px, 420px) minmax(380px, 1fr)', gap: '20px', alignItems: 'start' },
  formCard: { backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '24px' },
  listCard: { backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '24px', minHeight: '300px' },
  cardTitle: { margin: 0, color: '#0f172a', fontSize: '17px', fontWeight: 700 },
  cardSubtitle: { margin: '6px 0 20px', color: '#64748b', fontSize: '12px', lineHeight: 1.5 },
  label: { display: 'block', margin: '14px 0 7px', color: '#334155', fontSize: '12px', fontWeight: 700 },
  input: { width: '100%', padding: '10px 11px', border: '1px solid #cbd5e1', borderRadius: '5px', backgroundColor: '#fff', color: '#0f172a', fontSize: '13px' },
  row: { display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: '8px' },
  field: { minWidth: 0 },
  error: { margin: '16px 0 0', padding: '10px', borderRadius: '5px', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '12px' },
  success: { margin: '16px 0 0', padding: '10px', borderRadius: '5px', backgroundColor: '#f0fdf4', color: '#15803d', fontSize: '12px' },
  submit: { width: '100%', marginTop: '20px', padding: '11px 14px', border: 0, borderRadius: '5px', backgroundColor: '#2563eb', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' },
  empty: { margin: '42px 0', textAlign: 'center', color: '#94a3b8', fontSize: '13px' },
  list: { display: 'flex', flexDirection: 'column', gap: '10px' },
  item: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', padding: '14px 0', borderBottom: '1px solid #e2e8f0' },
  date: { margin: '0 0 5px', color: '#2563eb', fontSize: '11px', fontWeight: 700 },
  itemTitle: { margin: 0, color: '#1e293b', fontSize: '14px', fontWeight: 700 },
  itemMeta: { margin: '5px 0 0', color: '#64748b', fontSize: '12px' },
  itemAside: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px', flexShrink: 0, color: '#475569', fontSize: '12px' }
};
