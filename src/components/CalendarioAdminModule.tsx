'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCalendarioAdmin, getInscriptosTurno } from '../services/calendarioAdmin';
import { useAuth } from '../context/AuthContext';
import CalendarioBase, { DialogoClase, ETIQUETAS_ESTADO, Nomina, estadoEvento, fechaLegible, hora, type EventoCalendario } from './CalendarioBase';

interface TurnoEvento {
  id?: string | number;
  turno_id?: string | number;
  fecha: string | null;
  dia_semana?: string | null;
  hora_inicio: string;
  hora_fin: string;
  aula_numero?: string | number;
  tipo_actividad?: string;
  actividad_nombre?: string;
  materia_nombre?: string;
  profesor_id?: string;
  profesor_nombre_completo?: string;
  cupo_maximo?: number | null;
  inscriptos_actuales?: number;
  lugares_disponibles?: number | null;
  estado?: string | null;
  reprogramado?: boolean;
}

interface InscriptoDetalle {
  inscripcionId: string | number;
  alumnoId: string | number;
  nombre: string;
  apellido: string;
  dni: string | number;
  telefono?: string;
  legajo?: string;
}

const ETIQUETAS = { porDar: 'Programada' };

// Calendario de Mesa de Entrada y Gerencia: mismo diseño que profesor y alumno.
export default function CalendarioAdminModule() {
  const { role } = useAuth();
  const [turnos, setTurnos] = useState<TurnoEvento[]>([]);
  const [rango, setRango] = useState<{ desde: string; hasta: string } | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [filtroMateria, setFiltroMateria] = useState('');
  const [filtroProfesor, setFiltroProfesor] = useState('');
  const [filtroAula, setFiltroAula] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');

  const [seleccion, setSeleccion] = useState<{ turno: TurnoEvento; fecha: string } | null>(null);
  const [inscriptos, setInscriptos] = useState<InscriptoDetalle[]>([]);
  const [cargandoInscriptos, setCargandoInscriptos] = useState(false);

  const alCambiarRango = useCallback((desde: string, hasta: string) => {
    setCargando(true);
    setErrorMsg('');
    setRango({ desde, hasta });
  }, []);

  useEffect(() => {
    if (!rango) return;
    let vigente = true;
    getCalendarioAdmin(rango.desde, rango.hasta)
      .then((data: TurnoEvento[]) => { if (vigente) setTurnos(data || []); })
      .catch((err: Error) => { if (vigente) setErrorMsg(err.message || 'Error al conectar con la agenda.'); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [rango]);

  const eventos = useMemo<EventoCalendario<TurnoEvento>[]>(() => turnos
    .filter((t) => {
      const cancelado = t.estado === 'cancelado';
      if (filtroEstado === 'activos' && cancelado) return false;
      if (filtroEstado === 'cancelados' && !cancelado) return false;
      const materia = (t.materia_nombre || t.actividad_nombre || '').toLowerCase();
      return (!filtroMateria || materia === filtroMateria.toLowerCase())
        && (!filtroProfesor || (t.profesor_nombre_completo || '') === filtroProfesor)
        && (!filtroAula || String(t.aula_numero || '') === filtroAula);
    })
    .map((t) => {
      const insc = Number(t.inscriptos_actuales || 0);
      const cupo = Number(t.cupo_maximo || 0);
      return {
        id: String(t.turno_id ?? t.id),
        fecha: t.fecha,
        dia_semana: t.dia_semana,
        hora_inicio: t.hora_inicio,
        hora_fin: t.hora_fin,
        titulo: t.materia_nombre || t.actividad_nombre || 'Clase',
        subtitulo: t.profesor_nombre_completo || 'Sin profesor',
        pie: `Aula ${t.aula_numero || 'S/A'} · ${insc}/${cupo} insc.`,
        marca: [!t.fecha && t.dia_semana ? 'Periódica' : '', t.reprogramado ? '↻ Reprogramada' : ''].filter(Boolean).join(' · ') || undefined,
        cancelado: t.estado === 'cancelado',
        completo: cupo > 0 && insc >= cupo,
        datos: t,
      };
    }), [turnos, filtroMateria, filtroProfesor, filtroAula, filtroEstado]);

  // Opciones de los filtros: solo materias, profesores y aulas que tienen turnos en el período cargado.
  const unicos = (valores: string[]) => [...new Set(valores.filter(Boolean))];
  const opcMaterias = useMemo(() => unicos(turnos.map((t) => t.materia_nombre || t.actividad_nombre || '')).sort((a, b) => a.localeCompare(b)), [turnos]);
  const turnosDeMateria = useMemo(
    () => filtroMateria
      ? turnos.filter((t) => (t.materia_nombre || t.actividad_nombre || '') === filtroMateria)
      : turnos,
    [turnos, filtroMateria],
  );
  const opcProfesores = useMemo(
    () => unicos(turnosDeMateria.map((t) => t.profesor_nombre_completo || '')).sort((a, b) => a.localeCompare(b)),
    [turnosDeMateria],
  );
  const opcAulas = useMemo(
    () => unicos(turnosDeMateria.map((t) => String(t.aula_numero ?? ''))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [turnosDeMateria],
  );

  const cambiarMateria = (materia: string) => {
    setFiltroMateria(materia);
    setFiltroProfesor('');
    setFiltroAula('');
  };

  async function abrirDetalle(evento: EventoCalendario<TurnoEvento>, fecha: string) {
    setSeleccion({ turno: evento.datos, fecha });
    setInscriptos([]);
    const turnoId = evento.datos.turno_id || evento.datos.id;
    if (!turnoId) return;
    setCargandoInscriptos(true);
    try { setInscriptos(await getInscriptosTurno(turnoId)); }
    catch (e) { console.error(e); setInscriptos([]); }
    finally { setCargandoInscriptos(false); }
  }

  const evSel = seleccion && eventos.find((e) => e.datos === seleccion.turno);
  const tipoSel = evSel && seleccion ? estadoEvento(evSel, seleccion.fecha, new Date(), true) : 'porDar';
  const estadoSel = { ...ETIQUETAS_ESTADO, ...ETIQUETAS }[tipoSel];

  return (
    <CalendarioBase<TurnoEvento>
      eyebrow={role === 'gerente' ? 'Gerencia' : 'Mesa de Entrada'}
      titulo="Agenda institucional y turnos"
      descripcion="Control centralizado de clases, aulas y ocupación."
      eventos={eventos}
      cargando={cargando}
      error={errorMsg}
      vistaInicial="semana"
      atenuarPasadas
      etiquetas={ETIQUETAS}
      onRangoCambio={alCambiarRango}
      onReintentar={() => setRango((r) => (r ? { ...r } : r))}
      onSeleccionar={abrirDetalle}
      filtros={<>
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} aria-label="Filtrar por estado">
          <option value="todos">Todos los estados</option>
          <option value="activos">Solo activos</option>
          <option value="cancelados">Solo cancelados</option>
        </select>
        <select value={filtroMateria} onChange={(e) => cambiarMateria(e.target.value)} aria-label="Filtrar por materia">
          <option value="">Todas las materias</option>
          {opcMaterias.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={filtroProfesor} onChange={(e) => setFiltroProfesor(e.target.value)} aria-label="Filtrar por profesor">
          <option value="">Todos los profesores</option>
          {opcProfesores.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filtroAula} onChange={(e) => setFiltroAula(e.target.value)} aria-label="Filtrar por aula">
          <option value="">Todas las aulas</option>
          {opcAulas.map((a) => <option key={a} value={a}>Aula {a}</option>)}
        </select>
      </>}
    >
      {seleccion && (
        <DialogoClase
          eyebrow="Ficha de turno"
          titulo={seleccion.turno.materia_nombre || seleccion.turno.actividad_nombre || 'Clase'}
          estado={{ tipo: tipoSel, texto: estadoSel }}
          reprogramada={Boolean(seleccion.turno.reprogramado)}
          detalles={[
            ['Fecha', fechaLegible(seleccion.fecha)],
            ['Horario', `${hora(seleccion.turno.hora_inicio)} – ${hora(seleccion.turno.hora_fin)}`],
            ['Aula', String(seleccion.turno.aula_numero || 'Sin asignar')],
            ['Profesor', seleccion.turno.profesor_nombre_completo || 'Sin asignar'],
            ['Cupo', `${Number(seleccion.turno.inscriptos_actuales || 0)}/${seleccion.turno.cupo_maximo ?? 'Sin definir'}`],
          ]}
          onCerrar={() => setSeleccion(null)}
        >
          <Nomina
            titulo="Alumnos inscriptos"
            cargando={cargandoInscriptos}
            vacio="No hay alumnos inscriptos en este turno."
            items={inscriptos.map((a, i) => ({
              id: `${a.inscripcionId ?? i}`,
              nombre: `${a.apellido}, ${a.nombre}`,
              detalle: `DNI ${a.dni}${a.telefono && a.telefono !== '-' ? ` · ${a.telefono}` : ''}`,
            }))}
          />
        </DialogoClase>
      )}
    </CalendarioBase>
  );
}
