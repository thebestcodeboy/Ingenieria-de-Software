import React, { useEffect, useState } from 'react';
import {
  obtenerClasesParticulares,
  obtenerMaterias,
  registrarClaseParticular
} from '../services/clasesParticulares';

const initialForm = { nombre: '', materiaId: '', nivel: '' };
const niveles = [
  { value: 'universitario', label: 'Universitario' },
  { value: 'secundario', label: 'Secundario' }
];

export default function ClasesParticularesModule() {
  const [form, setForm] = useState(initialForm);
  const [materias, setMaterias] = useState([]);
  const [clases, setClases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
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

    loadData();
  }, []);

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!form.nombre.trim() || !form.materiaId || !form.nivel) {
      setError('Completá el nombre, la materia y el nivel para registrar la clase.');
      return;
    }

    try {
      setSaving(true);
      const clase = await registrarClaseParticular(form);
      setClases([clase, ...clases]);
      setForm(initialForm);
      setSuccess('La clase particular quedó registrada y disponible para programar un turno.');
    } catch (saveError) {
      setError(`No se pudo registrar la clase: ${saveError.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Clases particulares</h1>
          <p style={styles.subtitle}>Registrá propuestas de apoyo universitario o secundario.</p>
        </div>
        <div style={styles.count}>{clases.length} registradas</div>
      </header>

      <div style={styles.layout}>
        <form onSubmit={handleSubmit} style={styles.formCard}>
          <h2 style={styles.cardTitle}>Nueva clase particular</h2>
          <p style={styles.cardSubtitle}>La fecha, el aula y el profesor se asignan al programar el turno.</p>

          <label style={styles.label} htmlFor="nombre">Nombre de la actividad</label>
          <input
            id="nombre"
            name="nombre"
            value={form.nombre}
            onChange={handleChange}
            placeholder="Ej. Apoyo de Matemática"
            style={styles.input}
            maxLength={120}
          />

          <label style={styles.label} htmlFor="materiaId">Materia</label>
          <select id="materiaId" name="materiaId" value={form.materiaId} onChange={handleChange} style={styles.input}>
            <option value="">Seleccioná una materia</option>
            {materias.map((materia) => (
              <option key={materia.id} value={materia.id}>{materia.nombre.trim()}</option>
            ))}
          </select>

          <fieldset style={styles.fieldset}>
            <legend style={styles.label}>Nivel</legend>
            <div style={styles.levels}>
              {niveles.map((nivel) => (
                <label key={nivel.value} style={{ ...styles.levelOption, ...(form.nivel === nivel.value ? styles.selectedLevel : {}) }}>
                  <input type="radio" name="nivel" value={nivel.value} checked={form.nivel === nivel.value} onChange={handleChange} />
                  {nivel.label}
                </label>
              ))}
            </div>
          </fieldset>

          {error && <p role="alert" style={styles.error}>{error}</p>}
          {success && <p role="status" style={styles.success}>{success}</p>}

          <button type="submit" disabled={saving || loading} style={styles.submit}>
            {saving ? 'Guardando...' : 'Registrar clase particular'}
          </button>
        </form>

        <div style={styles.listCard}>
          <div style={styles.listHeader}>
            <div>
              <h2 style={styles.cardTitle}>Actividades disponibles</h2>
              <p style={styles.cardSubtitle}>Propuestas listas para programar un turno.</p>
            </div>
          </div>

          {loading ? (
            <p style={styles.empty}>Cargando materias y clases...</p>
          ) : clases.length === 0 ? (
            <p style={styles.empty}>Todavía no hay clases particulares registradas.</p>
          ) : (
            <div style={styles.list}>
              {clases.map((clase) => (
                <article key={clase.id} style={styles.item}>
                  <div>
                    <h3 style={styles.itemTitle}>{clase.nombre}</h3>
                    <p style={styles.itemMeta}>{clase.materias?.nombre?.trim() || 'Materia sin nombre'}</p>
                  </div>
                  <span style={styles.levelBadge}>{clase.nivel}</span>
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
  layout: { display: 'grid', gridTemplateColumns: 'minmax(280px, 390px) minmax(360px, 1fr)', gap: '20px', alignItems: 'start' },
  formCard: { backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '24px' },
  listCard: { backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '24px', minHeight: '300px' },
  cardTitle: { margin: 0, color: '#0f172a', fontSize: '17px', fontWeight: 700 },
  cardSubtitle: { margin: '6px 0 22px', color: '#64748b', fontSize: '12px', lineHeight: 1.5 },
  label: { display: 'block', margin: '16px 0 7px', color: '#334155', fontSize: '12px', fontWeight: 700 },
  input: { width: '100%', padding: '10px 11px', border: '1px solid #cbd5e1', borderRadius: '5px', backgroundColor: '#fff', color: '#0f172a', fontSize: '13px' },
  fieldset: { margin: 0, padding: 0, border: 0 },
  levels: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' },
  levelOption: { display: 'flex', alignItems: 'center', gap: '7px', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '5px', color: '#475569', fontSize: '12px', cursor: 'pointer' },
  selectedLevel: { borderColor: '#2563eb', backgroundColor: '#eff6ff', color: '#1d4ed8' },
  error: { margin: '16px 0 0', padding: '10px', borderRadius: '5px', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '12px' },
  success: { margin: '16px 0 0', padding: '10px', borderRadius: '5px', backgroundColor: '#f0fdf4', color: '#15803d', fontSize: '12px' },
  submit: { width: '100%', marginTop: '20px', padding: '11px 14px', border: 0, borderRadius: '5px', backgroundColor: '#2563eb', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' },
  listHeader: { borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' },
  empty: { margin: '42px 0', textAlign: 'center', color: '#94a3b8', fontSize: '13px' },
  list: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '18px' },
  item: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '14px', border: '1px solid #e2e8f0', borderRadius: '6px' },
  itemTitle: { margin: 0, color: '#1e293b', fontSize: '14px', fontWeight: 700 },
  itemMeta: { margin: '5px 0 0', color: '#64748b', fontSize: '12px' },
  levelBadge: { flexShrink: 0, padding: '5px 8px', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#475569', fontSize: '11px', fontWeight: 700 }
};
