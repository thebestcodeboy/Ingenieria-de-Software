'use client';

import React, { useState, useEffect } from 'react';
import { getProfesores, createProfesor } from '../services/profesores';
import { getMaterias } from '../services/materias';

interface Profesor {
  id: string | number;
  nombre: string;
  apellido: string;
  dni: string;
  email?: string;
  telefono?: string;
  materias_ids?: (string | number)[];
  turnos?: string[];
}

interface Materia {
  id: string | number;
  nombre: string;
  nivel: string;
  area?: string;
}

const TURNOS_DISPONIBLES = ['Mañana', 'Tarde', 'Noche'];

export default function ProfesoresModule() {
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Búsqueda
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modal y formulario
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [formNombre, setFormNombre] = useState<string>('');
  const [formApellido, setFormApellido] = useState<string>('');
  const [formDni, setFormDni] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formTelefono, setFormTelefono] = useState<string>('');
  const [selectedMaterias, setSelectedMaterias] = useState<(string | number)[]>([]);
  const [selectedTurnos, setSelectedTurnos] = useState<string[]>(['Mañana', 'Tarde']);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [profsData, matsData] = await Promise.all([getProfesores(), getMaterias()]);
      setProfesores(profsData);
      setMaterias(matsData);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cargar los datos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = () => {
    setFormNombre('');
    setFormApellido('');
    setFormDni('');
    setFormEmail('');
    setFormTelefono('');
    setSelectedMaterias([]);
    setSelectedTurnos(['Mañana', 'Tarde']);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormError(null);
  };

  const toggleMateria = (id: string | number) => {
    setSelectedMaterias((prev) =>
      prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id]
    );
  };

  const toggleTurno = (turno: string) => {
    setSelectedTurnos((prev) =>
      prev.includes(turno) ? prev.filter((t) => t !== turno) : [...prev, turno]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (selectedMaterias.length === 0) {
      setFormError('Debe asociar al menos una materia al profesor.');
      return;
    }

    try {
      setFormSubmitting(true);
      await createProfesor({
        nombre: formNombre,
        apellido: formApellido,
        dni: formDni,
        email: formEmail,
        telefono: formTelefono,
        materiasIds: selectedMaterias,
        turnos: selectedTurnos
      });

      setSuccessMsg(`Profesor ${formApellido}, ${formNombre} registrado correctamente.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      handleCloseModal();
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'No se pudo registrar el profesor.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const profesoresFiltrados = profesores.filter((p) => {
    const term = searchTerm.toLowerCase();
    const nombreCompleto = `${p.apellido} ${p.nombre}`.toLowerCase();
    return nombreCompleto.includes(term) || p.dni?.includes(term);
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Nómina de Profesores</h1>
          <p className="text-sm text-slate-500">Gestión de docentes, especialidades y turnos disponibles</p>
        </div>
        <button
          onClick={handleOpenModal}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors shadow-sm flex items-center gap-2"
        >
          <span>+</span> Registrar Profesor
        </button>
      </div>

      {/* Alertas */}
      {errorMsg && (
        <div className="p-4 mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-4 mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg">
          {successMsg}
        </div>
      )}

      {/* Barra de búsqueda */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6">
        <input
          type="text"
          placeholder="Buscar profesor por apellido, nombre o DNI..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Tabla de Profesores */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3">Profesor</th>
                <th className="px-6 py-3">DNI</th>
                <th className="px-6 py-3">Contacto</th>
                <th className="px-6 py-3">Materias Habilitadas</th>
                <th className="px-6 py-3">Turnos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400">
                    Cargando nómina...
                  </td>
                </tr>
              ) : profesoresFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400">
                    No se encontraron profesores registrados.
                  </td>
                </tr>
              ) : (
                profesoresFiltrados.map((prof) => {
                  const materiasNombres = (prof.materias_ids || [])
                    .map((id) => materias.find((m) => String(m.id) === String(id))?.nombre)
                    .filter(Boolean);

                  return (
                    <tr key={prof.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {prof.apellido}, {prof.nombre}
                      </td>
                      <td className="px-6 py-4">{prof.dni}</td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        <div>{prof.email || '-'}</div>
                        <div>{prof.telefono || ''}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {materiasNombres.length > 0 ? (
                            materiasNombres.map((nom, idx) => (
                              <span
                                key={idx}
                                className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded font-medium border border-blue-200"
                              >
                                {nom}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 italic">Sin materias</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1">
                          {(prof.turnos || []).map((t, idx) => (
                            <span
                              key={idx}
                              className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Registro */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 my-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-800">Registrar Nuevo Profesor</h2>
              <button
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Nombre *</label>
                  <input
                    type="text"
                    required
                    value={formNombre}
                    onChange={(e) => setFormNombre(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Apellido *</label>
                  <input
                    type="text"
                    required
                    value={formApellido}
                    onChange={(e) => setFormApellido(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">DNI *</label>
                  <input
                    type="text"
                    required
                    placeholder="Sin puntos"
                    value={formDni}
                    onChange={(e) => setFormDni(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={formTelefono}
                    onChange={(e) => setFormTelefono(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Selector múltiple de materias asociadas */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Materias que puede dictar * ({selectedMaterias.length} seleccionadas)
                </label>
                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1 bg-slate-50">
                  {materias.length === 0 ? (
                    <p className="text-xs text-slate-400 p-2">No hay materias disponibles.</p>
                  ) : (
                    materias.map((mat) => (
                      <label
                        key={mat.id}
                        className="flex items-center gap-2 p-1.5 hover:bg-white rounded cursor-pointer text-xs text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={selectedMaterias.includes(mat.id)}
                          onChange={() => toggleMateria(mat.id)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-medium">{mat.nombre}</span>
                        <span className="text-slate-400 text-[10px]">({mat.nivel})</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Turnos disponibles */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Turnos Disponibles</label>
                <div className="flex gap-4">
                  {TURNOS_DISPONIBLES.map((t) => (
                    <label key={t} className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedTurnos.includes(t)}
                        onChange={() => toggleTurno(t)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>{t}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50"
                >
                  {formSubmitting ? 'Guardando...' : 'Guardar Profesor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}