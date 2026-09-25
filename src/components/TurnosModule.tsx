'use client';

import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  definirCupoTurno,
  listarTurnosConCupo,
  validarCupo,
  obtenerDatosTurnos,
  registrarTurno,
  type TurnoConCupo,
} from '../services/turnos';

type FiltroCupo = 'todos' | 'sin_cupo' | 'con_lugar' | 'completos';

interface FormNuevoTurno {
  actividadTipo: 'curso' | 'particular';
  actividadId: string;
  materiaId: string;
  profesorId: string;
  aulaNumero: string;
  cupoMaximo: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
}

const initialNuevoTurnoForm: FormNuevoTurno = {
  actividadTipo: 'curso',
  actividadId: '',
  materiaId: '',
  profesorId: '',
  aulaNumero: '',
  cupoMaximo: '',
  fecha: '',
  horaInicio: '',
  horaFin: '',
};

function formatearNombre(texto: string | null | undefined): string {
  if (!texto) return '';
  return texto
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((palabra) => palabra.charAt(0).toUpperCase() + palabra.slice(1))
    .join(' ');
}

const formatoFecha = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function mostrarFecha(fecha: string | null): string {
  if (!fecha) return 'Sin fecha';
  const valor = new Date(`${fecha.slice(0, 10)}T12:00:00`);
  return Number.isNaN(valor.getTime()) ? fecha : formatoFecha.format(valor);
}

function mostrarHora(hora: string | null): string {
  return hora?.slice(0, 5) || '--:--';
}

function estadoDelTurno(turno: TurnoConCupo) {
  if (turno.cupo_maximo === null) {
    return {
      etiqueta: 'SIN CUPO',
      fondo: '#fff7ed',
      color: '#9a3412',
      borde: '#fed7aa',
    };
  }

  if ((turno.lugares_disponibles ?? 0) <= 0) {
    return {
      etiqueta: 'COMPLETO',
      fondo: '#fef2f2',
      color: '#b91c1c',
      borde: '#fecaca',
    };
  }

  return {
    etiqueta: 'CON LUGAR',
    fondo: '#f0fdf4',
    color: '#166534',
    borde: '#bbf7d0',
  };
}

export default function TurnosModule() {
  const [turnos, setTurnos] = useState<TurnoConCupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<FiltroCupo>('todos');

  // Modal Edición de Cupo
  const [turnoSeleccionado, setTurnoSeleccionado] = useState<TurnoConCupo | null>(null);
  const [cupoIngresado, setCupoIngresado] = useState('');
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Modal Programar Nuevo Turno
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  const [formNuevo, setFormNuevo] = useState<FormNuevoTurno>(initialNuevoTurnoForm);
  const [guardandoNuevo, setGuardandoNuevo] = useState(false);
  const [errorNuevo, setErrorNuevo] = useState('');
  const [datosAuxiliares, setDatosAuxiliares] = useState<{
    cursos: any[];
    particulares: any[];
    materias: any[];
    profesores: any[];
    profesorMaterias: any[];
    cursoMaterias: any[];
    aulas: any[];
  }>({
    cursos: [],
    particulares: [],
    materias: [],
    profesores: [],
    profesorMaterias: [],
    cursoMaterias: [],
    aulas: [],
  });

  const cargarDatosAuxiliares = useCallback(async () => {
    try {
      const aux = await obtenerDatosTurnos();
      setDatosAuxiliares({
        cursos: aux.cursos || [],
        particulares: aux.particulares || [],
        materias: aux.materias || [],
        profesores: aux.profesores || [],
        profesorMaterias: aux.profesorMaterias || [],
        cursoMaterias: aux.cursoMaterias || [],
        aulas: aux.aulas || [],
      });
    } catch (err) {
      console.error('Error al precargar datos auxiliares:', err);
    }
  }, []);

  const cargarTurnos = useCallback(async () => {
    try {
      setLoading(true);
      const datos = await listarTurnosConCupo();
      setTurnos(datos);
    } catch (error) {
      setErrorCarga(error instanceof Error ? error.message : 'No se pudieron cargar los turnos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarTurnos();
    cargarDatosAuxiliares();
  }, [cargarTurnos, cargarDatosAuxiliares]);

  const handleAbrirModalCrear = async () => {
    setErrorNuevo('');
    await cargarDatosAuxiliares();
    setModalCrearAbierto(true);
  };

  const actividadesDisponibles =
    formNuevo.actividadTipo === 'curso' ? datosAuxiliares.cursos : datosAuxiliares.particulares;
  const actividadSeleccionada = actividadesDisponibles.find(
    (a) => String(a.id) === String(formNuevo.actividadId)
  );

  const materiasDisponibles = useMemo(() => {
    if (!formNuevo.actividadId) return [];

    if (formNuevo.actividadTipo === 'particular') {
      const m = datosAuxiliares.materias.filter(
        (mat) => String(mat.id) === String(actividadSeleccionada?.materia_id)
      );
      return m.length > 0 ? m : datosAuxiliares.materias;
    }

    const materiaIds = datosAuxiliares.cursoMaterias
      .filter((r) => String(r.curso_id) === String(formNuevo.actividadId))
      .map((r) => String(r.materia_id));

    const filtradas = datosAuxiliares.materias.filter((mat) => materiaIds.includes(String(mat.id)));
    return filtradas.length > 0 ? filtradas : datosAuxiliares.materias;
  }, [
    datosAuxiliares.cursoMaterias,
    datosAuxiliares.materias,
    formNuevo.actividadId,
    formNuevo.actividadTipo,
    actividadSeleccionada,
  ]);

  const profesoresHabilitados = useMemo(() => {
    if (!formNuevo.materiaId) return [];

    const matIdStr = String(formNuevo.materiaId).trim();
    const desdeRelacion = new Set(
      datosAuxiliares.profesorMaterias
        .filter((r) => String(r.materia_id).trim() === matIdStr)
        .map((r) => String(r.profesor_id).trim())
    );

    return datosAuxiliares.profesores
      .filter((p) => {
        const enRel = desdeRelacion.has(String(p.id).trim());
        const enArray =
          Array.isArray(p.materias_ids) &&
          p.materias_ids.some((m: any) => String(m).trim() === matIdStr);
        return enRel || enArray;
      })
      .sort((a, b) => a.apellido.localeCompare(b.apellido));
  }, [datosAuxiliares.profesorMaterias, datosAuxiliares.profesores, formNuevo.materiaId]);

  const aulaSeleccionadaCrear = useMemo(() => {
    return datosAuxiliares.aulas.find((a) => String(a.numero) === String(formNuevo.aulaNumero));
  }, [datosAuxiliares.aulas, formNuevo.aulaNumero]);

  const aulaDelTurnoEditar = useMemo(() => {
    if (!turnoSeleccionado?.aula_numero) return null;
    return datosAuxiliares.aulas.find(
      (a) => String(a.numero) === String(turnoSeleccionado.aula_numero)
    );
  }, [datosAuxiliares.aulas, turnoSeleccionado]);

  const handleNuevoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setErrorNuevo('');

    if (name === 'actividadTipo') {
      setFormNuevo({ ...initialNuevoTurnoForm, actividadTipo: value as 'curso' | 'particular' });
      return;
    }

    if (name === 'actividadId') {
      const selectedActivity = actividadesDisponibles.find((a) => String(a.id) === String(value));
      setFormNuevo({
        ...formNuevo,
        actividadId: value,
        materiaId: formNuevo.actividadTipo === 'particular' ? selectedActivity?.materia_id || '' : '',
        profesorId: '',
      });
      return;
    }

    if (name === 'materiaId') {
      setFormNuevo({ ...formNuevo, materiaId: value, profesorId: '' });
      return;
    }

    if (name === 'aulaNumero') {
      const aula = datosAuxiliares.aulas.find((a) => String(a.numero) === String(value));
      setFormNuevo({
        ...formNuevo,
        aulaNumero: value,
        cupoMaximo: aula?.capacidad ? String(aula.capacidad) : formNuevo.cupoMaximo,
      });
      return;
    }

    setFormNuevo({ ...formNuevo, [name]: value });
  };

  const handleCrearTurnoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNuevo('');

    const camposObligatorios = [
      formNuevo.actividadId,
      formNuevo.materiaId,
      formNuevo.profesorId,
      formNuevo.aulaNumero,
      formNuevo.fecha,
      formNuevo.horaInicio,
      formNuevo.horaFin,
    ];

    if (camposObligatorios.some((c) => !c)) {
      setErrorNuevo('Completá actividad, materia, profesor, aula, fecha y horario.');
      return;
    }

    if (formNuevo.horaFin <= formNuevo.horaInicio) {
      setErrorNuevo('La hora de finalización debe ser posterior a la hora de inicio.');
      return;
    }

    if (formNuevo.cupoMaximo) {
      const cupoNum = Number(formNuevo.cupoMaximo);
      if (cupoNum <= 0) {
        setErrorNuevo('El cupo debe ser un número entero mayor a cero.');
        return;
      }
      if (aulaSeleccionadaCrear && cupoNum > aulaSeleccionadaCrear.capacidad) {
        setErrorNuevo(
          `El cupo (${cupoNum}) no puede superar la capacidad física del aula (${aulaSeleccionadaCrear.capacidad} bancos).`
        );
        return;
      }
    }

    try {
      setGuardandoNuevo(true);
      await registrarTurno({
        ...formNuevo,
        cupoMaximo: formNuevo.cupoMaximo ? Number(formNuevo.cupoMaximo) : null,
      });
      setMensajeExito('El turno fue programado correctamente.');
      setModalCrearAbierto(false);
      setFormNuevo(initialNuevoTurnoForm);
      await cargarTurnos();
    } catch (saveError: any) {
      setErrorNuevo(`No se pudo programar el turno: ${saveError.message}`);
    } finally {
      setGuardandoNuevo(false);
    }
  };

  const turnosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase('es');

    return turnos.filter((turno) => {
      const coincideTexto = [
        turno.materia_nombre,
        turno.actividad_nombre,
        turno.profesor_nombre_completo,
        turno.aula_numero,
        turno.fecha,
      ].some((valor) => String(valor ?? '').toLocaleLowerCase('es').includes(termino));

      if (!coincideTexto) return false;
      if (filtro === 'sin_cupo') return turno.cupo_maximo === null;
      if (filtro === 'con_lugar') return (turno.lugares_disponibles ?? 0) > 0;
      if (filtro === 'completos') {
        return turno.cupo_maximo !== null && (turno.lugares_disponibles ?? 0) <= 0;
      }

      return true;
    });
  }, [busqueda, filtro, turnos]);

  function abrirEdicion(turno: TurnoConCupo) {
    setTurnoSeleccionado(turno);
    setCupoIngresado(turno.cupo_maximo?.toString() ?? '');
    setErrorFormulario(null);
    setMensajeExito(null);
  }

  function cerrarEdicion() {
    if (guardando) return;
    setTurnoSeleccionado(null);
    setCupoIngresado('');
    setErrorFormulario(null);
  }

  async function guardarCupo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!turnoSeleccionado) return;

    const valorNormalizado = cupoIngresado.trim();
    if (!/^[1-9]\d*$/.test(valorNormalizado)) {
      setErrorFormulario('El cupo debe ser un número entero mayor que cero.');
      return;
    }

    const nuevoCupo = Number(valorNormalizado);

    // Validación 1: Mínimo inscriptos actuales
    const errorValidacion = validarCupo(nuevoCupo, turnoSeleccionado.inscriptos_actuales);
    if (errorValidacion) {
      setErrorFormulario(errorValidacion);
      return;
    }

    // Validación 2: Máximo capacidad física del aula
    if (aulaDelTurnoEditar?.capacidad && nuevoCupo > aulaDelTurnoEditar.capacidad) {
      setErrorFormulario(
        `El cupo (${nuevoCupo}) no puede superar la capacidad física del aula (${aulaDelTurnoEditar.capacidad} bancos).`
      );
      return;
    }

    setGuardando(true);
    setErrorFormulario(null);

    try {
      const resultado = await definirCupoTurno(
        turnoSeleccionado.turno_id,
        nuevoCupo,
        turnoSeleccionado.inscriptos_actuales
      );

      setTurnos((actuales) =>
        actuales.map((turno) =>
          turno.turno_id === resultado.turno_id
            ? {
                ...turno,
                cupo_maximo: resultado.cupo_maximo,
                inscriptos_actuales: resultado.inscriptos_actuales,
                lugares_disponibles: resultado.lugares_disponibles,
              }
            : turno
        )
      );
      setMensajeExito(`Cupo actualizado a ${resultado.cupo_maximo} alumnos.`);
      setTurnoSeleccionado(null);
      setCupoIngresado('');
    } catch (error) {
      setErrorFormulario(error instanceof Error ? error.message : 'No se pudo guardar el cupo.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section aria-labelledby="titulo-turnos">
      <header style={styles.encabezado}>
        <div>
          <h1 id="titulo-turnos" style={styles.titulo}>
            Turnos y Clases
          </h1>
          <p style={styles.subtitulo}>
            Programación académica y administración de plazas disponibles.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={styles.resumen} aria-label={`${turnos.length} turnos disponibles`}>
            <strong>{turnos.length}</strong>
            <span>turnos</span>
          </div>

          <button type="button" onClick={handleAbrirModalCrear} style={styles.botonCrear}>
            + Programar Turno
          </button>
        </div>
      </header>

      {mensajeExito && (
        <div role="status" style={styles.mensajeExito}>
          {mensajeExito}
        </div>
      )}

      {errorCarga && (
        <div role="alert" style={styles.mensajeError}>
          <span>{errorCarga}</span>
          <button type="button" onClick={() => cargarTurnos()} style={styles.botonReintentar}>
            Reintentar
          </button>
        </div>
      )}

      <div style={styles.filtros}>
        <label style={styles.buscador}>
          <span aria-hidden="true">⌕</span>
          <span style={styles.soloLectores}>Buscar turnos</span>
          <input
            type="search"
            placeholder="Buscar por materia, profesor, aula o fecha..."
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            style={styles.inputBusqueda}
          />
        </label>

        <label>
          <span style={styles.soloLectores}>Filtrar por estado de cupo</span>
          <select
            value={filtro}
            onChange={(event) => setFiltro(event.target.value as FiltroCupo)}
            style={styles.select}
          >
            <option value="todos">Todos los turnos</option>
            <option value="sin_cupo">Sin cupo definido</option>
            <option value="con_lugar">Con lugares</option>
            <option value="completos">Completos</option>
          </select>
        </label>
      </div>

      <div style={styles.tablaContenedor}>
        <table style={styles.tabla}>
          <thead>
            <tr style={styles.filaEncabezado}>
              <th style={styles.th}>Fecha y horario</th>
              <th style={styles.th}>Materia / actividad</th>
              <th style={styles.th}>Profesor</th>
              <th style={styles.th}>Aula</th>
              <th style={styles.th}>Estado / cupo</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={styles.estadoVacio}>
                  Cargando turnos...
                </td>
              </tr>
            ) : turnosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={6} style={styles.estadoVacio}>
                  <strong style={styles.estadoVacioTitulo}>
                    {turnos.length === 0 ? 'No hay turnos programados' : 'No hay coincidencias'}
                  </strong>
                  <span>
                    {turnos.length === 0
                      ? 'Podés programar una clase haciendo clic en "+ Programar Turno".'
                      : 'Probá con otra búsqueda o estado de cupo.'}
                  </span>
                </td>
              </tr>
            ) : (
              turnosFiltrados.map((turno) => {
                const estado = estadoDelTurno(turno);

                return (
                  <tr key={turno.turno_id} style={styles.fila}>
                    <td style={styles.td}>
                      <strong style={styles.valorPrincipal}>{mostrarFecha(turno.fecha)}</strong>
                      <span style={styles.valorSecundario}>
                        {mostrarHora(turno.hora_inicio)}–{mostrarHora(turno.hora_fin)}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <strong style={styles.valorPrincipal}>
                        {formatearNombre(turno.materia_nombre) || 'Sin materia'}
                      </strong>
                      {turno.actividad_nombre && (
                        <span style={styles.valorSecundario}>
                          {formatearNombre(turno.actividad_nombre)}
                        </span>
                      )}
                    </td>
                    <td style={styles.td}>
                      {formatearNombre(turno.profesor_nombre_completo) || 'Sin asignar'}
                    </td>
                    <td style={styles.td}>
                      {turno.aula_numero === null ? 'Sin asignar' : `Aula ${turno.aula_numero}`}
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.estado,
                          backgroundColor: estado.fondo,
                          color: estado.color,
                          borderColor: estado.borde,
                        }}
                      >
                        {estado.etiqueta}
                      </span>
                      <span style={styles.ocupacion}>
                        {turno.inscriptos_actuales} / {turno.cupo_maximo ?? '—'} inscriptos
                      </span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => abrirEdicion(turno)}
                        style={styles.botonEditar}
                      >
                        {turno.cupo_maximo === null ? 'Definir cupo' : 'Editar cupo'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL: PROGRAMAR TURNO */}
      {modalCrearAbierto && (
        <div
          style={styles.modalFondo}
          role="presentation"
          onMouseDown={() => !guardandoNuevo && setModalCrearAbierto(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            style={{
              ...styles.modal,
              maxWidth: '520px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div style={styles.modalEncabezado}>
              <div>
                <h2 style={styles.modalTitulo}>Programar turno de clase</h2>
              </div>
              <button
                type="button"
                onClick={() => !guardandoNuevo && setModalCrearAbierto(false)}
                style={styles.botonCerrar}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCrearTurnoSubmit} style={{ marginTop: '16px' }}>
              <label style={styles.labelModal} htmlFor="actividadTipo">
                Tipo de actividad
              </label>
              <select
                id="actividadTipo"
                name="actividadTipo"
                value={formNuevo.actividadTipo}
                onChange={handleNuevoChange}
                style={styles.inputModal}
              >
                <option value="curso">Curso de ingreso</option>
                <option value="particular">Clase particular</option>
              </select>

              <label style={styles.labelModal} htmlFor="actividadId">
                Actividad
              </label>
              <select
                id="actividadId"
                name="actividadId"
                value={formNuevo.actividadId}
                onChange={handleNuevoChange}
                style={styles.inputModal}
              >
                <option value="">Seleccioná una actividad</option>
                {actividadesDisponibles.map((a) => (
                  <option key={a.id} value={a.id}>
                    {formatearNombre(a.nombre)}
                  </option>
                ))}
              </select>

              <label style={styles.labelModal} htmlFor="materiaId">
                Materia
              </label>
              <select
                id="materiaId"
                name="materiaId"
                value={formNuevo.materiaId}
                onChange={handleNuevoChange}
                style={styles.inputModal}
                disabled={!formNuevo.actividadId}
              >
                <option value="">Seleccioná una materia</option>
                {materiasDisponibles.map((m) => (
                  <option key={m.id} value={m.id}>
                    {formatearNombre(m.nombre)}
                  </option>
                ))}
              </select>

              <label style={styles.labelModal} htmlFor="profesorId">
                Profesor asignado
              </label>
              <select
                id="profesorId"
                name="profesorId"
                value={formNuevo.profesorId}
                onChange={handleNuevoChange}
                style={styles.inputModal}
                disabled={!formNuevo.materiaId}
              >
                <option value="">
                  {profesoresHabilitados.length === 0
                    ? 'No hay profesores habilitados para esta materia'
                    : 'Seleccioná un profesor'}
                </option>
                {profesoresHabilitados.map((p) => (
                  <option key={p.id} value={p.id}>
                    {formatearNombre(p.apellido)}, {formatearNombre(p.nombre)}
                  </option>
                ))}
              </select>

              {/* Selector de Aula limpio y descriptivo */}
              <label style={styles.labelModal} htmlFor="aulaNumero">
                Aula
              </label>
              <select
                id="aulaNumero"
                name="aulaNumero"
                value={formNuevo.aulaNumero}
                onChange={handleNuevoChange}
                style={styles.inputModal}
              >
                <option value="">Seleccioná un aula</option>
                {datosAuxiliares.aulas.map((aula) => {
                  const desc = aula.descripcion?.trim();
                  const tieneNombreDistinto =
                    desc &&
                    desc.toLowerCase() !== 'aula' &&
                    desc.toLowerCase() !== `aula ${aula.numero}`.toLowerCase();

                  const detalle = tieneNombreDistinto ? ` - ${desc}` : '';
                  const capacidadStr = ` (Capacidad: ${aula.capacidad || 25} bancos)`;

                  return (
                    <option key={aula.numero} value={aula.numero}>
                      {`Aula ${aula.numero}${detalle}${capacidadStr}`}
                    </option>
                  );
                })}
              </select>

              {/* Cupo editable vinculado al aula */}
              {formNuevo.aulaNumero && (
                <div style={{ marginTop: '12px' }}>
                  <label style={styles.labelModal} htmlFor="cupoMaximo">
                    Cupo de la clase {aulaSeleccionadaCrear ? `(Capacidad del aula: ${aulaSeleccionadaCrear.capacidad || 25} bancos)` : ''}
                  </label>
                  <input
                    id="cupoMaximo"
                    name="cupoMaximo"
                    type="number"
                    min="1"
                    max={aulaSeleccionadaCrear?.capacidad || undefined}
                    value={formNuevo.cupoMaximo}
                    onChange={handleNuevoChange}
                    placeholder="Cantidad máxima de alumnos"
                    style={styles.inputModal}
                  />
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '11px' }}>
                    Se cargó por defecto la capacidad del aula. Podés reducir el cupo si no deseás llenar todos los bancos.
                  </p>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: '8px', marginTop: '10px' }}>
                <div>
                  <label style={styles.labelModal} htmlFor="fecha">
                    Fecha
                  </label>
                  <input
                    id="fecha"
                    name="fecha"
                    type="date"
                    value={formNuevo.fecha}
                    onChange={handleNuevoChange}
                    style={styles.inputModal}
                  />
                </div>
                <div>
                  <label style={styles.labelModal} htmlFor="horaInicio">
                    Inicio
                  </label>
                  <input
                    id="horaInicio"
                    name="horaInicio"
                    type="time"
                    value={formNuevo.horaInicio}
                    onChange={handleNuevoChange}
                    style={styles.inputModal}
                  />
                </div>
                <div>
                  <label style={styles.labelModal} htmlFor="horaFin">
                    Fin
                  </label>
                  <input
                    id="horaFin"
                    name="horaFin"
                    type="time"
                    value={formNuevo.horaFin}
                    onChange={handleNuevoChange}
                    style={styles.inputModal}
                  />
                </div>
              </div>

              {errorNuevo && (
                <div role="alert" style={{ ...styles.errorFormulario, marginTop: '12px' }}>
                  {errorNuevo}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setModalCrearAbierto(false)}
                  disabled={guardandoNuevo}
                  style={styles.botonCancelar}
                >
                  Cancelar
                </button>
                <button type="submit" disabled={guardandoNuevo} style={styles.botonGuardar}>
                  {guardandoNuevo ? 'Guardando...' : 'Programar Turno'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR CUPO */}
      {turnoSeleccionado && (
        <div style={styles.modalFondo} role="presentation" onMouseDown={cerrarEdicion}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-modal-cupo"
            style={{
              ...styles.modal,
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div style={styles.modalEncabezado}>
              <div>
                <h2 id="titulo-modal-cupo" style={styles.modalTitulo}>
                  {turnoSeleccionado.cupo_maximo === null ? 'Definir cupo' : 'Editar cupo'}
                </h2>
              </div>
              <button
                type="button"
                onClick={cerrarEdicion}
                style={styles.botonCerrar}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div style={styles.detalleTurno}>
              <strong>{formatearNombre(turnoSeleccionado.materia_nombre) || 'Clase sin materia'}</strong>
              <span>
                {mostrarFecha(turnoSeleccionado.fecha)} · {mostrarHora(turnoSeleccionado.hora_inicio)}–
                {mostrarHora(turnoSeleccionado.hora_fin)}
              </span>
              <span>
                {turnoSeleccionado.aula_numero ? `Aula ${turnoSeleccionado.aula_numero}` : 'Sin aula asignada'}
                {aulaDelTurnoEditar?.capacidad ? ` (Capacidad física: ${aulaDelTurnoEditar.capacidad} bancos)` : ''}
              </span>
              <span>{turnoSeleccionado.inscriptos_actuales} alumnos inscriptos actualmente</span>
            </div>

            <form onSubmit={guardarCupo} noValidate>
              <label htmlFor="cupo-maximo" style={styles.label}>
                Cupo máximo {aulaDelTurnoEditar?.capacidad ? `(Máximo permitido: ${aulaDelTurnoEditar.capacidad})` : ''}
              </label>
              <input
                id="cupo-maximo"
                name="cupoMaximo"
                type="number"
                inputMode="numeric"
                min={turnoSeleccionado.inscriptos_actuales || 1}
                max={aulaDelTurnoEditar?.capacidad || undefined}
                step="1"
                required
                autoFocus
                value={cupoIngresado}
                onChange={(event) => {
                  setCupoIngresado(event.target.value);
                  setErrorFormulario(null);
                }}
                aria-describedby="ayuda-cupo error-cupo"
                aria-invalid={Boolean(errorFormulario)}
                style={{
                  ...styles.inputCupo,
                  borderColor: errorFormulario ? '#dc2626' : '#cbd5e1',
                }}
              />
              <p id="ayuda-cupo" style={styles.ayuda}>
                {aulaDelTurnoEditar?.capacidad
                  ? `Debe ser entre ${turnoSeleccionado.inscriptos_actuales || 1} y ${aulaDelTurnoEditar.capacidad} alumnos (capacidad física del aula).`
                  : 'Ingresá un entero mayor que cero. No puede ser menor que los alumnos inscriptos.'}
              </p>
              <p id="error-cupo" role="alert" style={styles.errorFormulario}>
                {errorFormulario ?? ''}
              </p>

              <div style={styles.modalAcciones}>
                <button
                  type="button"
                  onClick={cerrarEdicion}
                  disabled={guardando}
                  style={styles.botonCancelar}
                >
                  Cancelar
                </button>
                <button type="submit" disabled={guardando} style={styles.botonGuardar}>
                  {guardando ? 'Guardando...' : 'Guardar cupo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  encabezado: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', marginBottom: '24px' },
  titulo: { margin: 0, color: '#0f172a', fontSize: '24px', fontWeight: 700, letterSpacing: '-0.025em' },
  subtitulo: { margin: '5px 0 0', color: '#64748b', fontSize: '13px' },
  resumen: { display: 'flex', alignItems: 'baseline', gap: '6px', padding: '8px 12px', border: '1px solid #dbe4ee', borderRadius: '7px', backgroundColor: '#fff', color: '#475569', fontSize: '12px' },
  botonCrear: { padding: '9px 15px', backgroundColor: '#0b1e33', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', transition: 'background-color 0.15s ease' },
  mensajeExito: { marginBottom: '16px', padding: '11px 14px', border: '1px solid #bbf7d0', borderRadius: '7px', backgroundColor: '#f0fdf4', color: '#166534', fontSize: '13px', fontWeight: 600 },
  mensajeError: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '16px', padding: '11px 14px', border: '1px solid #fecaca', borderRadius: '7px', backgroundColor: '#fef2f2', color: '#991b1b', fontSize: '13px' },
  botonReintentar: { border: 0, background: 'transparent', color: '#991b1b', cursor: 'pointer', fontWeight: 700, textDecoration: 'underline' },
  filtros: { display: 'flex', gap: '12px', marginBottom: '18px' },
  buscador: { flex: 1, display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#fff', color: '#64748b' },
  inputBusqueda: { width: '100%', border: 0, outline: 0, backgroundColor: 'transparent', color: '#1e293b', fontFamily: 'inherit', fontSize: '13px' },
  select: { height: '100%', minHeight: '39px', padding: '0 14px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#fff', color: '#334155', fontFamily: 'inherit', fontSize: '13px', fontWeight: 500 },
  soloLectores: { position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 },
  tablaContenedor: { overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)' },
  tabla: { width: '100%', minWidth: '920px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' },
  filaEncabezado: { borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' },
  th: { padding: '12px 18px', color: '#64748b', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' },
  fila: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '14px 18px', color: '#334155', verticalAlign: 'middle' },
  valorPrincipal: { display: 'block', color: '#0f172a', fontWeight: 600 },
  valorSecundario: { display: 'block', marginTop: '3px', color: '#64748b', fontSize: '11px' },
  estado: { display: 'inline-block', padding: '3px 7px', border: '1px solid', borderRadius: '4px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.03em' },
  ocupacion: { display: 'block', marginTop: '5px', color: '#475569', fontSize: '11px' },
  botonEditar: { padding: '7px 11px', border: '1px solid #cbd5e1', borderRadius: '5px', backgroundColor: '#fff', color: '#0b1e33', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: 600 },
  estadoVacio: { padding: '60px 20px', color: '#64748b', textAlign: 'center' },
  estadoVacioTitulo: { display: 'block', marginBottom: '5px', color: '#1e293b', fontSize: '14px' },
  modalFondo: { position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backgroundColor: 'rgba(15, 23, 42, 0.55)' },
  modal: { width: '100%', maxWidth: '460px', padding: '24px', borderRadius: '10px', backgroundColor: '#fff', boxShadow: '0 24px 60px rgba(15, 23, 42, 0.25)' },
  modalEncabezado: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' },
  modalTitulo: { margin: 0, color: '#0f172a', fontSize: '20px', fontWeight: 700 },
  botonCerrar: { border: 0, background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: '25px', lineHeight: 1 },
  detalleTurno: { display: 'flex', flexDirection: 'column', gap: '3px', margin: '20px 0', padding: '13px 14px', border: '1px solid #e2e8f0', borderRadius: '7px', backgroundColor: '#f8fafc', color: '#475569', fontSize: '12px' },
  label: { display: 'block', marginBottom: '7px', color: '#334155', fontSize: '13px', fontWeight: 700 },
  labelModal: { display: 'block', margin: '12px 0 4px', color: '#334155', fontSize: '12px', fontWeight: 700 },
  inputModal: { width: '100%', padding: '9px 11px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#fff', color: '#0f172a', fontSize: '13px', boxSizing: 'border-box' },
  inputCupo: { width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1px solid', borderRadius: '6px', outline: 0, color: '#0f172a', fontFamily: 'inherit', fontSize: '15px' },
  ayuda: { margin: '7px 0 0', color: '#64748b', fontSize: '11px', lineHeight: 1.45 },
  errorFormulario: { minHeight: '18px', margin: '6px 0 0', color: '#b91c1c', fontSize: '12px', fontWeight: 600 },
  modalAcciones: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' },
  botonCancelar: { padding: '9px 15px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#fff', color: '#475569', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 },
  botonGuardar: { padding: '9px 16px', border: '1px solid #0b1e33', borderRadius: '6px', backgroundColor: '#0b1e33', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 },
};