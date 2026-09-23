'use client';

import React, { useState, useEffect } from 'react';
import { getMaterias, createMateria } from '../services/materias';

interface Materia {
  id: string | number;
  nombre: string;
  nivel: string;
  area?: string | null;
}

const AREAS_UNIVERSITARIAS = [
  'Ingeniería y Ciencias Exactas',
  'Medicina y Ciencias de la Salud',
  'Economía y Ciencias Económicas'
];

export default function MateriasModule() {
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filtros de búsqueda
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterNivel, setFilterNivel] = useState<string>('TODOS');

  // Estado del modal de alta
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [formNombre, setFormNombre] = useState<string>('');
  const [formNivel, setFormNivel] = useState<'Secundario' | 'Universitario'>('Universitario');
  const [formArea, setFormArea] = useState<string>(AREAS_UNIVERSITARIAS[0]);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchMaterias = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await getMaterias();
      setMaterias(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cargar el catálogo de materias.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterias();
  }, []);

  const handleOpenModal = () => {
    setFormNombre('');
    setFormNivel('Universitario');
    setFormArea(AREAS_UNIVERSITARIAS[0]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (formNombre.trim().length < 3) {
      setFormError('El nombre de la materia debe contener al menos 3 caracteres.');
      return;
    }

    try {
      setFormSubmitting(true);
      await createMateria({
        nombre: formNombre,
        nivel: formNivel,
        area: formNivel === 'Universitario' ? formArea : undefined
      });

      setSuccessMsg(`Materia "${formNombre.trim()}" registrada con éxito.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      handleCloseModal();
      await fetchMaterias();
    } catch (err: any) {
      setFormError(err.message || 'No se pudo registrar la materia.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Filtrado reactivo en tabla tolerante a mayúsculas/minúsculas
  const materiasFiltradas = materias.filter((m) => {
    const matchNombre = m.nombre?.toLowerCase().includes(searchTerm.toLowerCase());
    const nivelNorm = m.nivel?.toLowerCase() || '';
    const matchNivel =
      filterNivel === 'TODOS' ||
      (filterNivel === 'Universitario' && nivelNorm.includes('univ')) ||
      (filterNivel === 'Secundario' && (nivelNorm.includes('secun') || !nivelNorm.includes('univ')));
    return matchNombre && matchNivel;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Catálogo de Materias</h1>
          <p className="text-sm text-slate-500">Gestión de asignaturas para cursos de ingreso y apoyo académico</p>
        </div>
        <button
          onClick={handleOpenModal}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors shadow-sm flex items-center gap-2"
        >
          <span>+</span> Registrar Materia
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

      {/* Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Buscar por nombre de materia..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="w-full sm:w-60">
          <select
            value={filterNivel}
            onChange={(e) => setFilterNivel(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TODOS">Todos los niveles</option>
            <option value="Secundario">Nivel Secundario</option>
            <option value="Universitario">Nivel Universitario</option>
          </select>
        </div>
      </div>

      {/* Tabla de Resultados */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3">Nombre Asignatura</th>
                <th className="px-6 py-3">Nivel Educativo</th>
                <th className="px-6 py-3">Área / Carrera</th>
                <th className="px-6 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-slate-400">
                    Cargando catálogo...
                  </td>
                </tr>
              ) : materiasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-slate-400">
                    No se encontraron materias registradas con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                materiasFiltradas.map((materia: any) => {
                  const nivelTexto = materia.nivel || 'Secundario';
                  const esUniversitario = nivelTexto.toLowerCase().includes('univ');

                  return (
                    <tr key={materia.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">{materia.nombre}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                            esUniversitario
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {esUniversitario ? 'Universitario' : 'Secundario'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {esUniversitario ? (
                          materia.area || '-'
                        ) : (
                          <span className="text-slate-400 italic">No aplica</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Activa
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Registro de Materia */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-800">Registrar Nueva Materia</h2>
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
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nombre de la Materia *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Análisis Matemático I"
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nivel Educativo *
                </label>
                <select
                  value={formNivel}
                  onChange={(e) => {
                    const nuevoNivel = e.target.value as 'Secundario' | 'Universitario';
                    setFormNivel(nuevoNivel);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Universitario">Nivel Universitario</option>
                  <option value="Secundario">Nivel Secundario</option>
                </select>
              </div>

              {formNivel === 'Universitario' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Área o Carrera Universitaria *
                  </label>
                  <select
                    value={formArea}
                    onChange={(e) => setFormArea(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {AREAS_UNIVERSITARIAS.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {formSubmitting ? 'Guardando...' : 'Guardar Materia'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}