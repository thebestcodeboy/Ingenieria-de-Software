'use client';

import { useCallback, useMemo, useState } from 'react';
import CalendarioBase, { DialogoClase, ETIQUETAS_ESTADO, estadoEvento, fechaLegible, hora, type EventoCalendario } from './CalendarioBase';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Inscripcion = any;

const ETIQUETAS = { porDar: 'Próxima' };
const ETIQUETAS_ALUMNO = { ...ETIQUETAS_ESTADO, ...ETIQUETAS };

// Calendario del alumno: conserva visibles las clases canceladas y las clases pasadas se ven en gris.
export default function CalendarioAlumno({ inscripciones, onCancelarFecha }: {
  inscripciones: Inscripcion[];
  onCancelarFecha: (inscripcion: Inscripcion) => void;
}) {
  const [seleccionada, setSeleccionada] = useState<Inscripcion | null>(null);
  const alCambiarRango = useCallback(() => {}, []); // los datos ya están cargados en el portal

  const eventos = useMemo<EventoCalendario<Inscripcion>[]>(() => inscripciones
    .filter((ins) => ins.turnos_clase?.fecha && ins.turnos_clase?.hora_inicio)
    .map((ins) => {
      const t = ins.turnos_clase;
      const profesor = t.profesores?.apellido || t.profesores?.nombre || 'Docente';
      const materia = t.cursos_ingreso?.nombre ? t.materias?.nombre : null;
      return {
        id: String(ins.id),
        fecha: t.fecha,
        hora_inicio: t.hora_inicio,
        hora_fin: t.hora_fin,
        titulo: t.cursos_ingreso?.nombre || t.clases_particulares?.nombre || t.materias?.nombre || 'Clase',
        subtitulo: [materia && `Materia: ${materia}`, `Prof. ${profesor}`].filter(Boolean).join(' · '),
        pie: t.aula_numero ? `Aula ${t.aula_numero}` : undefined,
        marca: [ins.estado === 'en_espera' ? 'En espera' : '', t.reprogramado ? '↻ Reprogramada' : ''].filter(Boolean).join(' · ') || undefined,
        cancelado: ins.estado === 'cancelado' || Boolean(t.cancelado) || t.estado === 'cancelado',
        datos: ins,
      };
    }), [inscripciones]);

  const t = seleccionada?.turnos_clase;
  const evSel = seleccionada && eventos.find((e) => e.datos === seleccionada);
  const tipoSel = evSel && t ? estadoEvento(evSel, t.fecha, new Date(), true) : 'porDar';
  const cancelada = Boolean(seleccionada && (seleccionada.estado === 'cancelado' || seleccionada.turnos_clase?.cancelado || seleccionada.turnos_clase?.estado === 'cancelado'));
  const esFutura = Boolean(t?.fecha && t?.hora_inicio && new Date(`${t.fecha}T${t.hora_inicio}`) > new Date());

  return (
    <CalendarioBase<Inscripcion>
      eyebrow="Portal del alumno"
      titulo="Mi calendario"
      descripcion="Tus clases inscriptas. Las canceladas se muestran en rojo."
      eventos={eventos}
      cargando={false}
      atenuarPasadas
      espaciosLibres
      etiquetas={ETIQUETAS}
      onRangoCambio={alCambiarRango}
      onSeleccionar={(ev) => setSeleccionada(ev.datos)}
    >
      {seleccionada && t && evSel && (
        <DialogoClase
          titulo={evSel.titulo}
          subtitulo={evSel.subtitulo}
          estado={{ tipo: tipoSel, texto: ETIQUETAS_ALUMNO[tipoSel] }}
          reprogramada={Boolean(t.reprogramado)}
          detalles={[
            ['Fecha', fechaLegible(t.fecha)],
            ['Horario', `${hora(t.hora_inicio)} – ${hora(t.hora_fin)}`],
            ['Aula', String(t.aula_numero ?? 'Sin asignar')],
            ...(seleccionada.estado === 'en_espera' ? [['Inscripción', 'En lista de espera'] as [string, string]] : []),
            ...(cancelada ? [['Estado', seleccionada.estado === 'cancelado' ? 'Inscripción cancelada' : 'Clase cancelada'] as [string, string]] : []),
          ]}
          onCerrar={() => setSeleccionada(null)}
          acciones={esFutura && !cancelada ? [{ texto: 'Cancelar esta fecha', peligro: true, onClick: () => { const ins = seleccionada; setSeleccionada(null); onCancelarFecha(ins); } }] : []}
        />
      )}
    </CalendarioBase>
  );
}
