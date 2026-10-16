'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import CalendarioBase, { DialogoClase, ETIQUETAS_ESTADO, Nomina, estadoEvento, fechaLegible, fechaLocal, hora, type EventoCalendario } from './CalendarioBase';
import { cancelarTurnoProfesor, listarCalendarioProfesorAvanzado, type TurnoAvanzadoProfesor } from '@/services/profesorPortal';

// Calendario del profesor: mismo diseño que Mesa, Gerencia y Alumno. Las clases pasadas se muestran en gris.
export default function ProfesorCalendarioPlaceholder({ onIrAAsistencias }: { onIrAAsistencias?: (turnoId: string) => void }) {
  const [turnos, setTurnos] = useState<TurnoAvanzadoProfesor[]>([]);
  const [rango, setRango] = useState<{ desde: string; hasta: string } | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [seleccionado, setSeleccionado] = useState<TurnoAvanzadoProfesor | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const hoy = fechaLocal(new Date());

  const alCambiarRango = useCallback((desde: string, hasta: string) => {
    setCargando(true);
    setError('');
    setMensaje('');
    setRango({ desde, hasta });
  }, []);

  useEffect(() => {
    if (!rango) return;
    let vigente = true;
    // La consulta del servidor admite hasta 31 días: la vista Año se pide mes por mes.
    const tramos: Promise<TurnoAvanzadoProfesor[]>[] = [];
    for (let d = rango.desde; d <= rango.hasta; ) {
      const [y, m] = d.split('-').map(Number);
      const finMes = fechaLocal(new Date(y, m, 0));
      const fin = finMes < rango.hasta ? finMes : rango.hasta;
      tramos.push(listarCalendarioProfesorAvanzado(d, fin));
      d = fechaLocal(new Date(y, m, 1));
    }
    Promise.all(tramos).then((v) => v.flat())
      .then((v) => { if (vigente) setTurnos(v); })
      .catch((e) => { if (vigente) setError(e instanceof Error ? e.message : 'No se pudo cargar el calendario.'); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [rango]);

  const eventos = useMemo<EventoCalendario<TurnoAvanzadoProfesor>[]>(() => turnos.map((t) => ({
    id: t.turno_id,
    fecha: t.fecha,
    hora_inicio: t.hora_inicio,
    hora_fin: t.hora_fin,
    titulo: t.materia_nombre,
    subtitulo: t.actividad_nombre,
    pie: `Aula ${t.aula_numero ?? 'sin asignar'}`,
    marca: t.reprogramado ? '↻ Reprogramada' : undefined,
    cancelado: t.cancelado,
    datos: t,
  })), [turnos]);

  const recargar = () => { setCargando(true); setRango((r) => (r ? { ...r } : r)); };

  async function cancelar() {
    if (!seleccionado) return;
    setCancelando(true);
    setError('');
    try {
      await cancelarTurnoProfesor(seleccionado.turno_id);
      setSeleccionado(null);
      setMensaje('La clase quedó cancelada y permanece visible en el calendario.');
      recargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cancelar la clase.');
    } finally {
      setCancelando(false);
    }
  }

  const evSel = seleccionado && eventos.find((e) => e.datos === seleccionado);
  const puedeCancelar = seleccionado && !seleccionado.cancelado && seleccionado.fecha >= hoy;
  const tipoSel = evSel && seleccionado ? estadoEvento(evSel, seleccionado.fecha, new Date(), true) : 'porDar';
  // La asistencia se carga desde el inicio de la clase y desde el módulo Asistencias.
  const puedeTomarAsistencia = seleccionado && !seleccionado.cancelado && Boolean(seleccionado.hora_inicio) && new Date(`${seleccionado.fecha}T${seleccionado.hora_inicio}`) <= new Date();

  return (
    <CalendarioBase<TurnoAvanzadoProfesor>
      eyebrow="Portal docente"
      titulo="Mi calendario"
      descripcion="Clases, materias y espacios libres de tu agenda. Las clases pasadas se ven en gris."
      eventos={eventos}
      cargando={cargando}
      error={error}
      mensaje={mensaje}
      atenuarPasadas
      espaciosLibres
      onRangoCambio={alCambiarRango}
      onReintentar={recargar}
      onSeleccionar={(ev) => setSeleccionado(ev.datos)}
    >
      {seleccionado && evSel && (
        <DialogoClase
          titulo={seleccionado.materia_nombre}
          subtitulo={seleccionado.actividad_nombre}
          estado={{ tipo: tipoSel, texto: ETIQUETAS_ESTADO[tipoSel] }}
          reprogramada={seleccionado.reprogramado}
          detalles={[
            ['Fecha', fechaLegible(seleccionado.fecha)],
            ['Horario', `${hora(seleccionado.hora_inicio)} – ${hora(seleccionado.hora_fin)}`],
            ['Aula', String(seleccionado.aula_numero ?? 'Sin asignar')],
            ['Cupo', String(seleccionado.cupo_maximo ?? 'Sin definir')],
          ]}
          ocupado={cancelando}
          onCerrar={() => setSeleccionado(null)}
          acciones={[
            ...(puedeTomarAsistencia && onIrAAsistencias ? [{ texto: 'Tomar asistencia', onClick: () => onIrAAsistencias(seleccionado.turno_id) }] : []),
            ...(puedeCancelar ? [{ texto: cancelando ? 'Cancelando…' : 'Cancelar clase', peligro: true, onClick: () => void cancelar() }] : []),
          ]}
        >
          <Nomina
            titulo="Alumnos inscriptos"
            vacio="Todavía no hay alumnos inscriptos."
            items={seleccionado.alumnos.map((a) => ({ id: a.id, nombre: `${a.apellido}, ${a.nombre}`, detalle: a.estado === 'en_espera' ? 'En espera' : 'Confirmado' }))}
          />
        </DialogoClase>
      )}
    </CalendarioBase>
  );
}
