'use client';

import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  definirCupoTurno,
  listarTurnosConCupo,
  validarCupo,
  obtenerDatosTurnos,
  registrarTurno,
  registrarTurnosSemanales,
  reprogramarTurno,
  reprogramarTurnoPeriodico,
  cancelarTurno,
  type TurnoConCupo,
} from '../services/turnos';
import { Pagination, usePagination } from './Pagination';

type FiltroCupo = 'todos' | 'activos' | 'cancelados' | 'sin_cupo' | 'con_lugar' | 'completos';

interface FormNuevoTurno {
  actividadTipo: 'curso' | 'particular';
  actividadId: string;
  materiaId: string;
  franjaFiltro: string;
  profesorId: string;
  aulaNumero: string;
  cupoMaximo: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
}

interface FormReprogramarTurno {
  turnoId: string;
  materiaId: string;
  materiaNombre: string;
  franjaFiltro: string;
  profesorId: string;
  aulaNumero: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  repetirSemanal: boolean;
  mesesRepeticion: string;
}

const initialNuevoTurnoForm: FormNuevoTurno = {
  actividadTipo: 'curso',
  actividadId: '',
  materiaId: '',
  franjaFiltro: '',
  profesorId: '',
  aulaNumero: '',
  cupoMaximo: '',
  fecha: '',
  horaInicio: '',
  horaFin: '',
};

function fechaLocalParaInput(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

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

function renderBadgeEstado(turno: TurnoConCupo) {
  if (turno.estado === 'cancelado') {
    return (
      <span
        style={{
          backgroundColor: '#fef2f2',
          color: '#991b1b',
          border: '1.5px solid #fca5a5',
          padding: '4px 12px',
          borderRadius: '5px',
          fontSize: '14px',
          fontWeight: 800,
          letterSpacing: '0.04em',
          userSelect: 'none',
          display: 'inline-block'
        }}
      >
        CANCELADO
      </span>
    );
  }

  if (turno.cupo_maximo === null) {
    return (
      <span
        style={{
          backgroundColor: '#f8fafc',
          color: '#94a3b8',
          border: '1px solid #e2e8f0',
          padding: '4px 10px',
          borderRadius: '5px',
          fontSize: '14px',
          fontWeight: 700,
          letterSpacing: '0.03em',
          userSelect: 'none',
          display: 'inline-block'
        }}
      >
        SIN CUPO
      </span>
    );
  }

  if ((turno.lugares_disponibles ?? 0) <= 0) {
    return (
      <span
        style={{
          backgroundColor: '#fef2f2',
          color: '#b91c1c',
          border: '1.5px solid #fecaca',
          padding: '4px 12px',
          borderRadius: '5px',
          fontSize: '14px',
          fontWeight: 800,
          letterSpacing: '0.04em',
          userSelect: 'none',
          display: 'inline-block'
        }}
      >
        COMPLETO
      </span>
    );
  }

  return (
    <span
      style={{
        backgroundColor: '#f0fdf4',
        color: '#15803d',
        border: '1.5px solid #bbf7d0',
        padding: '4px 12px',
        borderRadius: '5px',
        fontSize: '14px',
        fontWeight: 800,
        letterSpacing: '0.04em',
        userSelect: 'none',
        display: 'inline-block'
      }}
    >
      CON LUGAR
    </span>
  );
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
  const [repetirSemanal, setRepetirSemanal] = useState(false);
  const [mesesRepeticion, setMesesRepeticion] = useState('1');

  // Modal Reprogramar Turno
  const [modalReprogramarAbierto, setModalReprogramarAbierto] = useState(false);
  const [formReprogramar, setFormReprogramar] = useState<FormReprogramarTurno | null>(null);
  const [guardandoReprogramacion, setGuardandoReprogramacion] = useState(false);
  const [errorReprogramar, setErrorReprogramar] = useState('');

  // Modal Cancelar Turno
  const [turnoParaCancelar, setTurnoParaCancelar] = useState<TurnoConCupo | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [errorCancelacion, setErrorCancelacion] = useState('');

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
    setFormNuevo({ ...initialNuevoTurnoForm, fecha: fechaLocalParaInput(new Date()) });
    setRepetirSemanal(false);
    setMesesRepeticion('1');
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

  const profesoresHabilitadosCrear = useMemo(() => {
    if (!formNuevo.materiaId) return [];

    const matIdStr = String(formNuevo.materiaId).trim();
    const desdeRelacion = new Set(
      datosAuxiliares.profesorMaterias
        .filter((r) => String(r.materia_id).trim() === matIdStr)
        .map((r) => String(r.profesor_id).trim())
    );

    return datosAuxiliares.profesores
      .filter((p) => {
        if (p.activo === false) return false;

        const enRel = desdeRelacion.has(String(p.id).trim());
        const enArray =
          Array.isArray(p.materias_ids) &&
          p.materias_ids.some((m: any) => String(m).trim() === matIdStr);
        if (!enRel && !enArray) return false;

        if (formNuevo.franjaFiltro) {
          const tieneFranjaEnDisp =
            Array.isArray(p.disponibilidad) &&
            p.disponibilidad.some((d: any) => d.franja === formNuevo.franjaFiltro);
          const tieneFranjaEnTurnos =
            Array.isArray(p.turnos) && p.turnos.includes(formNuevo.franjaFiltro);

          if (!tieneFranjaEnDisp && !tieneFranjaEnTurnos) return false;
        }

        return true;
      })
      .sort((a, b) => a.apellido.localeCompare(b.apellido));
  }, [
    datosAuxiliares.profesorMaterias,
    datosAuxiliares.profesores,
    formNuevo.materiaId,
    formNuevo.franjaFiltro,
  ]);

  const profesorSeleccionadoCrear = useMemo(() => {
    return profesoresHabilitadosCrear.find((p) => String(p.id) === String(formNuevo.profesorId));
  }, [profesoresHabilitadosCrear, formNuevo.profesorId]);

  const profesoresHabilitadosReprogramar = useMemo(() => {
    if (!formReprogramar?.materiaId) return datosAuxiliares.profesores.filter((p) => p.activo !== false);

    const matIdStr = String(formReprogramar.materiaId).trim();
    const desdeRelacion = new Set(
      datosAuxiliares.profesorMaterias
        .filter((r) => String(r.materia_id).trim() === matIdStr)
        .map((r) => String(r.profesor_id).trim())
    );

    return datosAuxiliares.profesores
      .filter((p) => {
        if (p.activo === false) return false;

        const enRel = desdeRelacion.has(String(p.id).trim());
        const enArray =
          Array.isArray(p.materias_ids) &&
          p.materias_ids.some((m: any) => String(m).trim() === matIdStr);
        if (!enRel && !enArray) return false;

        if (formReprogramar.franjaFiltro) {
          const tieneFranjaEnDisp =
            Array.isArray(p.disponibilidad) &&
            p.disponibilidad.some((d: any) => d.franja === formReprogramar.franjaFiltro);
          const tieneFranjaEnTurnos =
            Array.isArray(p.turnos) && p.turnos.includes(formReprogramar.franjaFiltro);

          if (!tieneFranjaEnDisp && !tieneFranjaEnTurnos) return false;
        }

        return true;
      })
      .sort((a, b) => a.apellido.localeCompare(b.apellido));
  }, [
    datosAuxiliares.profesorMaterias,
    datosAuxiliares.profesores,
    formReprogramar?.materiaId,
    formReprogramar?.franjaFiltro,
  ]);

  const profesorSeleccionadoReprogramar = useMemo(() => {
    if (!formReprogramar?.profesorId) return null;
    return datosAuxiliares.profesores.find((p) => String(p.id) === String(formReprogramar.profesorId));
  }, [datosAuxiliares.profesores, formReprogramar?.profesorId]);

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
        franjaFiltro: '',
      });
      return;
    }

    if (name === 'materiaId') {
      setFormNuevo({ ...formNuevo, materiaId: value, profesorId: '', franjaFiltro: '' });
      return;
    }

    if (name === 'franjaFiltro') {
      setFormNuevo({ ...formNuevo, franjaFiltro: value, profesorId: '' });
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
      const payload = {
        ...formNuevo,
        cupoMaximo: formNuevo.cupoMaximo ? Number(formNuevo.cupoMaximo) : null,
      };
      const turnosCreados = repetirSemanal
        ? await registrarTurnosSemanales(payload, Number(mesesRepeticion))
        : [await registrarTurno(payload)];
      setMensajeExito(turnosCreados.length > 1
        ? `Se programaron ${turnosCreados.length} clases semanales correctamente.`
        : 'El turno fue programado correctamente.');
      setModalCrearAbierto(false);
      setFormNuevo(initialNuevoTurnoForm);
      await cargarTurnos();
    } catch (saveError: any) {
      const msg = saveError.message || 'No se pudo programar el turno.';
      if (msg.includes('PROFESOR_INACTIVO')) {
        setErrorNuevo('El profesor seleccionado no se encuentra en estado ACTIVO.');
      } else {
        setErrorNuevo(msg);
      }
    } finally {
      setGuardandoNuevo(false);
    }
  };

  const handleAbrirReprogramar = async (turno: TurnoConCupo) => {
    setErrorReprogramar('');
    await cargarDatosAuxiliares();

    const materiaEncontrada = datosAuxiliares.materias.find(
      (m) => m.nombre?.trim().toLowerCase() === turno.materia_nombre?.trim().toLowerCase()
    );

    setFormReprogramar({
      turnoId: turno.turno_id,
      materiaId: materiaEncontrada ? String(materiaEncontrada.id) : '',
      materiaNombre: turno.materia_nombre || 'Sin materia',
      franjaFiltro: '',
      profesorId: turno.profesor_id ? String(turno.profesor_id) : '',
      aulaNumero: turno.aula_numero ? String(turno.aula_numero) : '',
      fecha: turno.fecha ? turno.fecha.slice(0, 10) : '',
      horaInicio: turno.hora_inicio ? turno.hora_inicio.slice(0, 5) : '',
      horaFin: turno.hora_fin ? turno.hora_fin.slice(0, 5) : '',
      repetirSemanal: false,
      mesesRepeticion: '1',
    });

    setModalReprogramarAbierto(true);
  };

  const handleReprogramarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formReprogramar) return;
    setErrorReprogramar('');

    if (
      !formReprogramar.fecha ||
      !formReprogramar.horaInicio ||
      !formReprogramar.horaFin ||
      !formReprogramar.aulaNumero ||
      !formReprogramar.profesorId
    ) {
      setErrorReprogramar('Todos los campos son obligatorios.');
      return;
    }

    if (formReprogramar.horaFin <= formReprogramar.horaInicio) {
      setErrorReprogramar('La hora de finalización debe ser posterior a la hora de inicio.');
      return;
    }

    try {
      setGuardandoReprogramacion(true);
      const payload = {
        turnoId: formReprogramar.turnoId,
        fecha: formReprogramar.fecha,
        horaInicio: formReprogramar.horaInicio,
        horaFin: formReprogramar.horaFin,
        aulaNumero: formReprogramar.aulaNumero,
        profesorId: formReprogramar.profesorId,
        materiaId: formReprogramar.materiaId,
      };
      const resultado = formReprogramar.repetirSemanal
        ? await reprogramarTurnoPeriodico(payload, Number(formReprogramar.mesesRepeticion))
        : { cantidadProgramada: 1, turnoActualizado: await reprogramarTurno(payload) };

      setMensajeExito(resultado.cantidadProgramada > 1
        ? `El turno fue reprogramado y se programaron ${resultado.cantidadProgramada - 1} clases semanales adicionales.`
        : 'El turno fue reprogramado correctamente.');
      setModalReprogramarAbierto(false);
      setFormReprogramar(null);
      await cargarTurnos();
    } catch (err: any) {
      setErrorReprogramar(err.message || 'No se pudo reprogramar el turno.');
    } finally {
      setGuardandoReprogramacion(false);
    }
  };

  const handleConfirmarCancelacion = async () => {
    if (!turnoParaCancelar) return;
    try {
      setCancelando(true);
      await cancelarTurno(turnoParaCancelar.turno_id);
      setMensajeExito('El turno ha sido cancelado y su horario quedó liberado.');
      setTurnoParaCancelar(null);
      await cargarTurnos();
    } catch (err: any) {
      setErrorCancelacion(err.message || 'No se pudo cancelar el turno.');
    } finally {
      setCancelando(false);
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

      if (filtro === 'activos') return turno.estado !== 'cancelado';
      if (filtro === 'cancelados') return turno.estado === 'cancelado';
      if (filtro === 'sin_cupo') return turno.estado !== 'cancelado' && turno.cupo_maximo === null;
      if (filtro === 'con_lugar') return turno.estado !== 'cancelado' && (turno.lugares_disponibles ?? 0) > 0;
      if (filtro === 'completos') {
        return turno.estado !== 'cancelado' && turno.cupo_maximo !== null && (turno.lugares_disponibles ?? 0) <= 0;
      }

      return true;
    });
  }, [busqueda, filtro, turnos]);

  const {
    elementosPaginados: turnosPaginados,
    paginaActual,
    totalPaginas,
    cambiarPagina,
  } = usePagination(turnosFiltrados, JSON.stringify([busqueda, filtro]));

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

    const errorValidacion = validarCupo(nuevoCupo, turnoSeleccionado.inscriptos_actuales);
    if (errorValidacion) {
      setErrorFormulario(errorValidacion);
      return;
    }

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
    <div style={{ width: '100%', padding: '32px 40px', boxSizing: 'border-box', color: '#0f172a', fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}>
      {/* Encabezado EXACTO ALUMNO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
            Turnos y Clases
          </h1>
          <p style={{ color: '#475569', fontSize: '16px', margin: '4px 0 0 0', fontWeight: 500 }}>
            Programación académica, reprogramación y administración de cupos
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ padding: '8px 14px', border: '1.5px solid #cbd5e1', borderRadius: '7px', backgroundColor: '#fff', color: '#475569', fontSize: '15px', fontWeight: 600 }}>
            {turnos.length} turnos
          </span>
          <button
            type="button"
            onClick={handleAbrirModalCrear}
            style={{
              backgroundColor: '#0b1e33',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '11px 22px',
              fontSize: '16px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 4px rgba(11, 30, 51, 0.12)',
              transition: 'background-color 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1e3a5f'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0b1e33'}
          >
            <span style={{ fontSize: '19px', lineHeight: 1 }}>+</span> Programar Turno
          </button>
        </div>
      </div>

      {mensajeExito && (
        <div role="status" aria-live="polite" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: '12px 16px', borderRadius: '6px', fontSize: '16px', marginBottom: '16px', fontWeight: 500 }}>
          {mensajeExito}
        </div>
      )}

      {errorCarga && (
        <div role="alert" style={{ backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '12px 16px', borderRadius: '6px', fontSize: '16px', marginBottom: '16px', fontWeight: 500, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{errorCarga}</span>
          <button type="button" onClick={() => cargarTurnos()} style={{ border: 0, background: 'transparent', color: '#991b1b', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
            Reintentar
          </button>
        </div>
      )}

      {/* Buscador y Filtro EXACTO ALUMNO */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          border: '1.5px solid #cbd5e1',
          borderRadius: '6px',
          padding: '10px 14px',
          gap: '10px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
        }}>
          <span style={{ color: '#334155', display: 'flex' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="search"
            placeholder="Buscar por materia, profesor, aula o fecha..."
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              width: '100%',
              fontSize: '16px',
              color: '#0f172a',
              backgroundColor: 'transparent',
              fontWeight: 500
            }}
          />
        </div>

        <select
          value={filtro}
          onChange={(event) => setFiltro(event.target.value as FiltroCupo)}
          style={{ padding: '10px 16px', border: '1.5px solid #cbd5e1', borderRadius: '6px', fontSize: '16px', backgroundColor: '#ffffff', color: '#0f172a', fontWeight: 600, cursor: 'pointer' }}
        >
          <option value="todos">Todos los turnos</option>
          <option value="activos">Solo activos</option>
          <option value="cancelados">Solo cancelados (Historial)</option>
          <option value="con_lugar">Con lugares disponibles</option>
          <option value="completos">Completos</option>
          <option value="sin_cupo">Sin cupo definido</option>
        </select>
      </div>

      {/* Tabla con fuentes oscuras y badges con bordes */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', overflowX: 'auto', boxShadow: '0 2px 4px rgba(15, 23, 42, 0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '16px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #cbd5e1', backgroundColor: '#f1f5f9' }}>
              <th style={{ padding: '15px 20px', fontWeight: 800, color: '#0f172a', fontSize: '15px', letterSpacing: '0.05em', textTransform: 'uppercase', width: '16%' }}>FECHA Y HORARIO</th>
              <th style={{ padding: '15px 20px', fontWeight: 800, color: '#0f172a', fontSize: '15px', letterSpacing: '0.05em', textTransform: 'uppercase', width: '26%' }}>MATERIA / ACTIVIDAD</th>
              <th style={{ padding: '15px 20px', fontWeight: 800, color: '#0f172a', fontSize: '15px', letterSpacing: '0.05em', textTransform: 'uppercase', width: '20%' }}>PROFESOR</th>
              <th style={{ padding: '15px 20px', fontWeight: 800, color: '#0f172a', fontSize: '15px', letterSpacing: '0.05em', textTransform: 'uppercase', width: '12%' }}>AULA</th>
              <th style={{ padding: '15px 20px', textAlign: 'center', fontWeight: 800, color: '#0f172a', fontSize: '15px', letterSpacing: '0.05em', textTransform: 'uppercase', width: '14%' }}>ESTADO / CUPO</th>
              <th style={{ padding: '15px 20px', textAlign: 'center', fontWeight: 800, color: '#0f172a', fontSize: '15px', letterSpacing: '0.05em', textTransform: 'uppercase', width: '12%' }}>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#475569', fontWeight: 500, fontSize: '16px' }}>
                  Cargando turnos...
                </td>
              </tr>
            ) : turnosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '54px 20px', textAlign: 'center', color: '#64748b' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '17px' }}>
                    {turnos.length === 0 ? 'No hay turnos programados' : 'No hay coincidencias'}
                  </div>
                  <div style={{ fontSize: '15px', color: '#64748b', marginTop: '4px' }}>
                    {turnos.length === 0
                      ? 'Podés programar una clase haciendo clic en "+ Programar Turno".'
                      : 'Probá con otra búsqueda o filtro.'}
                  </div>
                </td>
              </tr>
            ) : (
              turnosPaginados.map((turno) => {
                const esCancelado = turno.estado === 'cancelado';

                return (
                  <tr
                    key={turno.turno_id}
                    style={{
                      borderBottom: '1px solid #e2e8f0',
                      transition: 'background-color 0.15s ease',
                      opacity: esCancelado ? 0.75 : 1,
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                  >
                    <td style={{ padding: '16px 20px' }}>
                      <strong
                        style={{
                          display: 'block',
                          fontSize: '16px',
                          textDecoration: esCancelado ? 'line-through' : 'none',
                          color: esCancelado ? '#64748b' : '#0f172a',
                        }}
                      >
                        {mostrarFecha(turno.fecha)}
                      </strong>
                      <span style={{ display: 'block', marginTop: '3px', color: '#475569', fontSize: '14px', fontWeight: 600 }}>
                        {mostrarHora(turno.hora_inicio)}–{mostrarHora(turno.hora_fin)}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <strong style={{ display: 'block', color: '#0b1e33', fontSize: '16px' }}>
                        {formatearNombre(turno.materia_nombre) || 'Sin materia'}
                      </strong>
                      {turno.actividad_nombre && (
                        <span style={{ display: 'block', marginTop: '3px', color: '#475569', fontSize: '14px' }}>
                          {formatearNombre(turno.actividad_nombre)}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '16px 20px', color: '#0f172a', fontWeight: 600 }}>
                      {formatearNombre(turno.profesor_nombre_completo) || 'Sin asignar'}
                    </td>
                    <td style={{ padding: '16px 20px', color: '#0b1e33', fontWeight: 700 }}>
                      {turno.aula_numero === null ? 'Sin asignar' : `Aula ${turno.aula_numero}`}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      {renderBadgeEstado(turno)}
                      {!esCancelado && (
                        <span style={{ display: 'block', marginTop: '5px', color: '#475569', fontSize: '13.5px', fontWeight: 600 }}>
                          {turno.inscriptos_actuales} / {turno.cupo_maximo ?? '—'} inscriptos
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      {esCancelado ? (
                        <span style={{ fontSize: '14px', color: '#94a3b8', fontStyle: 'italic' }}>
                          Historial (Sin acciones)
                        </span>
                      ) : (
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => abrirEdicion(turno)}
                            style={{
                              backgroundColor: '#ffffff',
                              border: '1.5px solid #cbd5e1',
                              borderRadius: '5px',
                              padding: '6px 10px',
                              color: '#0b1e33',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: 700,
                            }}
                            title="Modificar capacidad de alumnos"
                          >
                            Cupo
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAbrirReprogramar(turno)}
                            style={{
                              backgroundColor: '#f0f9ff',
                              border: '1.5px solid #0284c7',
                              borderRadius: '5px',
                              padding: '6px 10px',
                              color: '#0369a1',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: 700,
                            }}
                            title="Cambiar fecha, hora, aula o profesor"
                          >
                            Reprogramar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setErrorCancelacion('');
                              setTurnoParaCancelar(turno);
                            }}
                            style={{
                              backgroundColor: '#fef2f2',
                              border: '1.5px solid #fca5a5',
                              borderRadius: '5px',
                              padding: '6px 10px',
                              color: '#dc2626',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: 700,
                            }}
                            title="Cancelar clase y liberar horario"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination paginaActual={paginaActual} totalPaginas={totalPaginas} onCambiarPagina={cambiarPagina} />

      {/* MODAL: PROGRAMAR NUEVO TURNO */}
      {modalCrearAbierto && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(2px)' }}
          role="presentation"
          onMouseDown={() => !guardandoNuevo && setModalCrearAbierto(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              padding: '28px',
              width: '100%',
              maxWidth: '540px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
              <h2 style={{ margin: 0, color: '#0f172a', fontSize: '21px', fontWeight: 800 }}>Programar turno de clase</h2>
              <button
                type="button"
                onClick={() => !guardandoNuevo && setModalCrearAbierto(false)}
                style={{ border: 0, background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: '24px', lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCrearTurnoSubmit} style={{ marginTop: '16px' }}>
              <label style={{ display: 'block', margin: '12px 0 4px', color: '#1e293b', fontSize: '14px', fontWeight: 700 }} htmlFor="actividadTipo">
                Tipo de actividad
              </label>
              <select
                id="actividadTipo"
                name="actividadTipo"
                value={formNuevo.actividadTipo}
                onChange={handleNuevoChange}
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#fff', color: '#0f172a', fontSize: '15px' }}
              >
                <option value="curso">Curso de ingreso</option>
                <option value="particular">Clase particular</option>
              </select>

              <label style={{ display: 'block', margin: '12px 0 4px', color: '#1e293b', fontSize: '14px', fontWeight: 700 }} htmlFor="actividadId">
                Nombre de Actividad
              </label>
              <select
                id="actividadId"
                name="actividadId"
                value={formNuevo.actividadId}
                onChange={handleNuevoChange}
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#fff', color: '#0f172a', fontSize: '15px' }}
              >
                <option value="">Seleccioná una actividad</option>
                {actividadesDisponibles.map((a) => (
                  <option key={a.id} value={a.id}>
                    {formatearNombre(a.nombre)}
                  </option>
                ))}
              </select>

              <label style={{ display: 'block', margin: '12px 0 4px', color: '#1e293b', fontSize: '14px', fontWeight: 700 }} htmlFor="materiaId">
                Materia
              </label>
              <select
                id="materiaId"
                name="materiaId"
                value={formNuevo.materiaId}
                onChange={handleNuevoChange}
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#fff', color: '#0f172a', fontSize: '15px' }}
                disabled={!formNuevo.actividadId}
              >
                <option value="">Seleccioná una materia</option>
                {materiasDisponibles.map((m) => (
                  <option key={m.id} value={m.id}>
                    {formatearNombre(m.nombre)}
                  </option>
                ))}
              </select>

              <label style={{ display: 'block', margin: '12px 0 4px', color: '#1e293b', fontSize: '14px', fontWeight: 700 }} htmlFor="franjaFiltro">
                Franja horaria deseada
              </label>
              <select
                id="franjaFiltro"
                name="franjaFiltro"
                value={formNuevo.franjaFiltro}
                onChange={handleNuevoChange}
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#fff', color: '#0f172a', fontSize: '15px' }}
                disabled={!formNuevo.materiaId}
              >
                <option value="">Todas las franjas (Cualquiera)</option>
                <option value="Mañana">Mañana</option>
                <option value="Tarde">Tarde</option>
                <option value="Noche">Noche</option>
              </select>

              <label style={{ display: 'block', margin: '12px 0 4px', color: '#1e293b', fontSize: '14px', fontWeight: 700 }} htmlFor="profesorId">
                Profesor asignado
              </label>
              <select
                id="profesorId"
                name="profesorId"
                value={formNuevo.profesorId}
                onChange={handleNuevoChange}
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#fff', color: '#0f172a', fontSize: '15px' }}
                disabled={!formNuevo.materiaId}
              >
                <option value="">
                  {profesoresHabilitadosCrear.length === 0
                    ? formNuevo.franjaFiltro
                      ? `No hay profesores para esta materia en el turno ${formNuevo.franjaFiltro}`
                      : 'No hay profesores habilitados para esta materia'
                    : 'Seleccioná un profesor'}
                </option>
                {profesoresHabilitadosCrear.map((p) => {
                  const dispStr =
                    Array.isArray(p.disponibilidad) && p.disponibilidad.length > 0
                      ? p.disponibilidad.map((d: any) => `${d.franja} (${d.horaInicio}-${d.horaFin})`).join(', ')
                      : (p.turnos || []).join(', ');
                  const detalleDisp = dispStr ? ` [${dispStr}]` : ' [Sin franjas]';

                  return (
                    <option key={p.id} value={p.id}>
                      {formatearNombre(p.apellido)}, {formatearNombre(p.nombre)}
                      {detalleDisp}
                    </option>
                  );
                })}
              </select>

              {profesorSeleccionadoCrear && (
                <div
                  style={{
                    marginTop: '8px',
                    padding: '8px 12px',
                    backgroundColor: '#f0fdf4',
                    border: '1.5px solid #bbf7d0',
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: '#166534',
                  }}
                >
                  <strong>Disponibilidad horaria: </strong>
                  {Array.isArray(profesorSeleccionadoCrear.disponibilidad) &&
                  profesorSeleccionadoCrear.disponibilidad.length > 0 ? (
                    profesorSeleccionadoCrear.disponibilidad.map((d: any, idx: number) => (
                      <span key={idx} style={{ marginRight: '8px' }}>
                        • {d.franja}: <strong>{d.horaInicio} a {d.horaFin}</strong>
                      </span>
                    ))
                  ) : (
                    <span>Turnos: {(profesorSeleccionadoCrear.turnos || []).join(', ') || 'Sin definir'}</span>
                  )}
                </div>
              )}

              <label style={{ display: 'block', margin: '12px 0 4px', color: '#1e293b', fontSize: '14px', fontWeight: 700 }} htmlFor="aulaNumero">
                Aula
              </label>
              <select
                id="aulaNumero"
                name="aulaNumero"
                value={formNuevo.aulaNumero}
                onChange={handleNuevoChange}
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#fff', color: '#0f172a', fontSize: '15px' }}
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

              {formNuevo.aulaNumero && (
                <div style={{ marginTop: '12px' }}>
                  <label style={{ display: 'block', margin: '12px 0 4px', color: '#1e293b', fontSize: '14px', fontWeight: 700 }} htmlFor="cupoMaximo">
                    Cupo de la clase{' '}
                    {aulaSeleccionadaCrear
                      ? `(Capacidad del aula: ${aulaSeleccionadaCrear.capacidad || 25} bancos)`
                      : ''}
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
                    style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #cbd5e1', borderRadius: '6px', fontSize: '15px', color: '#0f172a' }}
                  />
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13.5px' }}>
                    Se cargó por defecto la capacidad del aula. Podés reducir el cupo si no deseás llenar todos los bancos.
                  </p>
                </div>
              )}

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.4fr 1fr 1fr',
                  gap: '8px',
                  marginTop: '10px',
                }}
              >
                <div>
                  <label style={{ display: 'block', margin: '12px 0 4px', color: '#1e293b', fontSize: '14px', fontWeight: 700 }} htmlFor="fecha">
                    Fecha
                  </label>
                  <input
                    id="fecha"
                    name="fecha"
                    type="date"
                    value={formNuevo.fecha}
                    onChange={handleNuevoChange}
                    style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #cbd5e1', borderRadius: '6px', fontSize: '15px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', margin: '12px 0 4px', color: '#1e293b', fontSize: '14px', fontWeight: 700 }} htmlFor="horaInicio">
                    Inicio
                  </label>
                  <input
                    id="horaInicio"
                    name="horaInicio"
                    type="time"
                    value={formNuevo.horaInicio}
                    onChange={handleNuevoChange}
                    style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #cbd5e1', borderRadius: '6px', fontSize: '15px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', margin: '12px 0 4px', color: '#1e293b', fontSize: '14px', fontWeight: 700 }} htmlFor="horaFin">
                    Fin
                  </label>
                  <input
                    id="horaFin"
                    name="horaFin"
                    type="time"
                    value={formNuevo.horaFin}
                    onChange={handleNuevoChange}
                    style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #cbd5e1', borderRadius: '6px', fontSize: '15px' }}
                  />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', fontSize: '15px', fontWeight: 600, color: '#334155' }}>
                <input
                  type="checkbox"
                  checked={repetirSemanal}
                  onChange={(e) => setRepetirSemanal(e.target.checked)}
                />
                Repetir semanalmente
              </label>
              {repetirSemanal && (
                <div style={{ marginTop: '8px' }}>
                  <label style={{ display: 'block', margin: '12px 0 4px', color: '#1e293b', fontSize: '14px', fontWeight: 700 }} htmlFor="mesesRepeticion">Duración</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      id="mesesRepeticion"
                      type="number"
                      min="1"
                      max="12"
                      value={mesesRepeticion}
                      onChange={(e) => setMesesRepeticion(e.target.value)}
                      style={{ width: '100px', padding: '11px 14px', border: '1.5px solid #cbd5e1', borderRadius: '6px', fontSize: '15px' }}
                    />
                    <span style={{ fontSize: '15px', color: '#475569' }}>meses, desde la fecha indicada</span>
                  </div>
                </div>
              )}

              {errorNuevo && (
                <div
                  role="alert"
                  style={{
                    marginTop: '12px',
                    padding: '10px 14px',
                    backgroundColor: '#fef2f2',
                    border: '1.5px solid #fca5a5',
                    borderRadius: '6px',
                    color: '#991b1b',
                    fontSize: '15px',
                  }}
                >
                  {errorNuevo}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setModalCrearAbierto(false)}
                  disabled={guardandoNuevo}
                  style={{ padding: '10px 18px', border: '1.5px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#fff', color: '#475569', cursor: 'pointer', fontSize: '15.5px', fontWeight: 600 }}
                >
                  Cancelar
                </button>
                <button type="submit" disabled={guardandoNuevo} style={{ padding: '10px 22px', border: 'none', borderRadius: '6px', backgroundColor: '#0b1e33', color: '#fff', cursor: 'pointer', fontSize: '15.5px', fontWeight: 700 }}>
                  {guardandoNuevo ? 'Validando...' : 'Programar Turno'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REPROGRAMAR TURNO */}
      {modalReprogramarAbierto && formReprogramar && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(2px)' }}
          role="presentation"
          onMouseDown={() => !guardandoReprogramacion && setModalReprogramarAbierto(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              padding: '28px',
              width: '100%',
              maxWidth: '540px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
              <div>
                <h2 style={{ margin: 0, color: '#0f172a', fontSize: '21px', fontWeight: 800 }}>Reprogramar turno de clase</h2>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '15px' }}>
                  Materia:{' '}
                  <strong style={{ color: '#0f172a' }}>
                    {formatearNombre(formReprogramar.materiaNombre)}
                  </strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => !guardandoReprogramacion && setModalReprogramarAbierto(false)}
                style={{ border: 0, background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: '24px', lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleReprogramarSubmit} style={{ marginTop: '16px' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.4fr 1fr 1fr',
                  gap: '8px',
                }}
              >
                <div>
                  <label style={{ display: 'block', margin: '12px 0 4px', color: '#1e293b', fontSize: '14px', fontWeight: 700 }} htmlFor="reprog-fecha">
                    Nueva Fecha
                  </label>
                  <input
                    id="reprog-fecha"
                    name="fecha"
                    type="date"
                    value={formReprogramar.fecha}
                    onChange={(e) =>
                      setFormReprogramar({ ...formReprogramar, fecha: e.target.value })
                    }
                    style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #cbd5e1', borderRadius: '6px', fontSize: '15px' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', margin: '12px 0 4px', color: '#1e293b', fontSize: '14px', fontWeight: 700 }} htmlFor="reprog-horaInicio">
                    Nuevo Inicio
                  </label>
                  <input
                    id="reprog-horaInicio"
                    name="horaInicio"
                    type="time"
                    value={formReprogramar.horaInicio}
                    onChange={(e) =>
                      setFormReprogramar({ ...formReprogramar, horaInicio: e.target.value })
                    }
                    style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #cbd5e1', borderRadius: '6px', fontSize: '15px' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', margin: '12px 0 4px', color: '#1e293b', fontSize: '14px', fontWeight: 700 }} htmlFor="reprog-horaFin">
                    Nuevo Fin
                  </label>
                  <input
                    id="reprog-horaFin"
                    name="horaFin"
                    type="time"
                    value={formReprogramar.horaFin}
                    onChange={(e) =>
                      setFormReprogramar({ ...formReprogramar, horaFin: e.target.value })
                    }
                    style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #cbd5e1', borderRadius: '6px', fontSize: '15px' }}
                    required
                  />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', fontSize: '15px', fontWeight: 600, color: '#334155' }}>
                <input
                  type="checkbox"
                  checked={formReprogramar.repetirSemanal}
                  onChange={(e) => setFormReprogramar({ ...formReprogramar, repetirSemanal: e.target.checked })}
                />
                Repetir semanalmente
              </label>
              {formReprogramar.repetirSemanal && (
                <div style={{ marginTop: '8px' }}>
                  <label style={{ display: 'block', margin: '12px 0 4px', color: '#1e293b', fontSize: '14px', fontWeight: 700 }} htmlFor="reprog-mesesRepeticion">Duración</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      id="reprog-mesesRepeticion"
                      type="number"
                      min="1"
                      max="12"
                      value={formReprogramar.mesesRepeticion}
                      onChange={(e) => setFormReprogramar({ ...formReprogramar, mesesRepeticion: e.target.value })}
                      style={{ width: '100px', padding: '11px 14px', border: '1.5px solid #cbd5e1', borderRadius: '6px', fontSize: '15px' }}
                    />
                    <span style={{ fontSize: '15px', color: '#475569' }}>meses, desde la nueva fecha</span>
                  </div>
                </div>
              )}

              <label style={{ display: 'block', margin: '12px 0 4px', color: '#1e293b', fontSize: '14px', fontWeight: 700 }} htmlFor="reprog-franjaFiltro">
                Franja horaria deseada (Filtro)
              </label>
              <select
                id="reprog-franjaFiltro"
                value={formReprogramar.franjaFiltro}
                onChange={(e) =>
                  setFormReprogramar({
                    ...formReprogramar,
                    franjaFiltro: e.target.value,
                    profesorId: '',
                  })
                }
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #cbd5e1', borderRadius: '6px', fontSize: '15px' }}
              >
                <option value="">Todas las franjas (Cualquiera)</option>
                <option value="Mañana">Mañana</option>
                <option value="Tarde">Tarde</option>
                <option value="Noche">Noche</option>
              </select>

              <label style={{ display: 'block', margin: '12px 0 4px', color: '#1e293b', fontSize: '14px', fontWeight: 700 }} htmlFor="reprog-profesorId">
                Profesor asignado
              </label>
              <select
                id="reprog-profesorId"
                value={formReprogramar.profesorId}
                onChange={(e) =>
                  setFormReprogramar({ ...formReprogramar, profesorId: e.target.value })
                }
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #cbd5e1', borderRadius: '6px', fontSize: '15px' }}
                required
              >
                <option value="">Seleccioná un profesor</option>
                {profesoresHabilitadosReprogramar.map((p) => {
                  const dispStr =
                    Array.isArray(p.disponibilidad) && p.disponibilidad.length > 0
                      ? p.disponibilidad.map((d: any) => `${d.franja} (${d.horaInicio}-${d.horaFin})`).join(', ')
                      : (p.turnos || []).join(', ');
                  const detalleDisp = dispStr ? ` [${dispStr}]` : ' [Sin franjas]';

                  return (
                    <option key={p.id} value={p.id}>
                      {formatearNombre(p.apellido)}, {formatearNombre(p.nombre)}
                      {detalleDisp}
                    </option>
                  );
                })}
              </select>

              {profesorSeleccionadoReprogramar && (
                <div
                  style={{
                    marginTop: '8px',
                    padding: '8px 12px',
                    backgroundColor: '#f0fdf4',
                    border: '1.5px solid #bbf7d0',
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: '#166534',
                  }}
                >
                  <strong>Disponibilidad horaria docente: </strong>
                  {Array.isArray(profesorSeleccionadoReprogramar.disponibilidad) &&
                  profesorSeleccionadoReprogramar.disponibilidad.length > 0 ? (
                    profesorSeleccionadoReprogramar.disponibilidad.map((d: any, idx: number) => (
                      <span key={idx} style={{ marginRight: '8px' }}>
                        • {d.franja}: <strong>{d.horaInicio} a {d.horaFin}</strong>
                      </span>
                    ))
                  ) : (
                    <span>
                      Turnos: {(profesorSeleccionadoReprogramar.turnos || []).join(', ') || 'Sin definir'}
                    </span>
                  )}
                </div>
              )}

              <label style={{ display: 'block', margin: '12px 0 4px', color: '#1e293b', fontSize: '14px', fontWeight: 700 }} htmlFor="reprog-aulaNumero">
                Aula
              </label>
              <select
                id="reprog-aulaNumero"
                value={formReprogramar.aulaNumero}
                onChange={(e) =>
                  setFormReprogramar({ ...formReprogramar, aulaNumero: e.target.value })
                }
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #cbd5e1', borderRadius: '6px', fontSize: '15px' }}
                required
              >
                <option value="">Seleccioná un aula</option>
                {datosAuxiliares.aulas.map((aula) => (
                  <option key={aula.numero} value={aula.numero}>
                    {`Aula ${aula.numero} (Capacidad: ${aula.capacidad || 25} bancos)`}
                  </option>
                ))}
              </select>

              {errorReprogramar && (
                <div
                  role="alert"
                  style={{
                    marginTop: '14px',
                    padding: '10px 14px',
                    backgroundColor: '#fef2f2',
                    border: '1.5px solid #fca5a5',
                    borderRadius: '6px',
                    color: '#991b1b',
                    fontSize: '14px',
                  }}
                >
                  {errorReprogramar}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setModalReprogramarAbierto(false)}
                  disabled={guardandoReprogramacion}
                  style={{ padding: '10px 18px', border: '1.5px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#fff', color: '#475569', cursor: 'pointer', fontSize: '15.5px', fontWeight: 600 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoReprogramacion}
                  style={{ padding: '10px 22px', border: 'none', borderRadius: '6px', backgroundColor: '#0b1e33', color: '#fff', cursor: 'pointer', fontSize: '15.5px', fontWeight: 700 }}
                >
                  {guardandoReprogramacion ? 'Validando...' : 'Confirmar Reprogramación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR CANCELACIÓN */}
      {turnoParaCancelar && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backgroundColor: 'rgba(15, 23, 42, 0.65)' }}
          role="presentation"
          onMouseDown={() => !cancelando && setTurnoParaCancelar(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '28px', width: '100%', maxWidth: '440px', border: '1.5px solid #dc2626' }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: 0, color: '#991b1b', fontSize: '21px', fontWeight: 800 }}>¿Cancelar este turno de clase?</h2>
            <p style={{ margin: '14px 0', fontSize: '15.5px', color: '#334155', lineHeight: 1.5 }}>
              Estás a punto de cancelar la clase de{' '}
              <strong>{formatearNombre(turnoParaCancelar.materia_nombre)}</strong> programada para el día{' '}
              <strong>{mostrarFecha(turnoParaCancelar.fecha)}</strong> de{' '}
              <strong>
                {mostrarHora(turnoParaCancelar.hora_inicio)} a {mostrarHora(turnoParaCancelar.hora_fin)}
              </strong>.
            </p>
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: '#fff7ed',
                border: '1.5px solid #fed7aa',
                borderRadius: '6px',
                fontSize: '14.5px',
                color: '#9a3412',
                marginBottom: '16px',
              }}
            >
              • El turno permanecerá visible en el historial con la etiqueta <strong>CANCELADO</strong>.
              <br />• Se liberará la disponibilidad horaria del aula y del profesor.
            </div>

            {errorCancelacion && (
              <div role="alert" style={{ marginBottom: '14px', color: '#991b1b', fontSize: '14px', fontWeight: 700 }}>
                {errorCancelacion}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setTurnoParaCancelar(null)}
                disabled={cancelando}
                style={{ padding: '10px 18px', border: '1.5px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#fff', color: '#475569', cursor: 'pointer', fontSize: '15.5px', fontWeight: 600 }}
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleConfirmarCancelacion}
                disabled={cancelando}
                style={{
                  padding: '10px 22px',
                  borderRadius: '6px',
                  backgroundColor: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  fontSize: '15.5px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {cancelando ? 'Cancelando...' : 'Sí, Cancelar Turno'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR CUPO */}
      {turnoSeleccionado && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backgroundColor: 'rgba(15, 23, 42, 0.65)' }} role="presentation" onMouseDown={cerrarEdicion}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-modal-cupo"
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '28px',
              width: '100%',
              maxWidth: '480px',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: '1.5px solid #0b1e33'
            }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
              <h2 id="titulo-modal-cupo" style={{ margin: 0, color: '#0f172a', fontSize: '21px', fontWeight: 800 }}>
                {turnoSeleccionado.cupo_maximo === null ? 'Definir cupo' : 'Editar cupo'}
              </h2>
              <button
                type="button"
                onClick={cerrarEdicion}
                style={{ border: 0, background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: '24px', lineHeight: 1 }}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', margin: '18px 0', padding: '14px 16px', border: '1.5px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#334155', fontSize: '15px' }}>
              <strong style={{ color: '#0f172a', fontSize: '16px' }}>{formatearNombre(turnoSeleccionado.materia_nombre) || 'Clase sin materia'}</strong>
              <span>
                {mostrarFecha(turnoSeleccionado.fecha)} · {mostrarHora(turnoSeleccionado.hora_inicio)}–
                {mostrarHora(turnoSeleccionado.hora_fin)}
              </span>
              <span>
                {turnoSeleccionado.aula_numero ? `Aula ${turnoSeleccionado.aula_numero}` : 'Sin aula asignada'}
                {aulaDelTurnoEditar?.capacidad ? ` (Capacidad física: ${aulaDelTurnoEditar.capacidad} bancos)` : ''}
              </span>
              <span style={{ fontWeight: 700, color: '#0b1e33' }}>{turnoSeleccionado.inscriptos_actuales} alumnos inscriptos actualmente</span>
            </div>

            <form onSubmit={guardarCupo} noValidate>
              <label htmlFor="cupo-maximo" style={{ display: 'block', marginBottom: '7px', color: '#1e293b', fontSize: '15px', fontWeight: 700 }}>
                Cupo máximo{' '}
                {aulaDelTurnoEditar?.capacidad
                  ? `(Máximo permitido: ${aulaDelTurnoEditar.capacidad})`
                  : ''}
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
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '11px 14px',
                  border: `1.5px solid ${errorFormulario ? '#dc2626' : '#cbd5e1'}`,
                  borderRadius: '6px',
                  outline: 0,
                  color: '#0f172a',
                  fontFamily: 'inherit',
                  fontSize: '17px',
                  fontWeight: 700
                }}
              />
              <p id="ayuda-cupo" style={{ margin: '7px 0 0', color: '#64748b', fontSize: '14px', lineHeight: 1.45 }}>
                {aulaDelTurnoEditar?.capacidad
                  ? `Debe ser entre ${turnoSeleccionado.inscriptos_actuales || 1} y ${aulaDelTurnoEditar.capacidad} alumnos (capacidad física del aula).`
                  : 'Ingresá un entero mayor que cero. No puede ser menor que los alumnos inscriptos.'}
              </p>
              {errorFormulario && (
                <p id="error-cupo" role="alert" style={{ minHeight: '18px', margin: '6px 0 0', color: '#b91c1c', fontSize: '14px', fontWeight: 700 }}>
                  {errorFormulario}
                </p>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={cerrarEdicion}
                  disabled={guardando}
                  style={{ padding: '10px 18px', border: '1.5px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#fff', color: '#475569', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: '15.5px' }}
                >
                  Cancelar
                </button>
                <button type="submit" disabled={guardando} style={{ padding: '10px 22px', border: 'none', borderRadius: '6px', backgroundColor: '#0b1e33', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '15.5px' }}>
                  {guardando ? 'Guardando...' : 'Guardar cupo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
