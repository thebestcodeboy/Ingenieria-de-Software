type Fila = {
  id?: string | number; fecha?: string | null; dia_semana?: string | null;
  hora_inicio?: string; hora_fin?: string; aula_numero?: string | number;
  tipo_actividad?: string; profesor_id?: string; cupo_maximo?: number | null;
  estado?: string | null; cancelado?: boolean;
  materias?: { nombre?: string } | null; profesores?: { nombre?: string; apellido?: string } | null;
  cursos_ingreso?: { nombre?: string } | null; clases_particulares?: { nombre?: string } | null;
  inscripciones?: { estado?: string }[];
};

export function normalizarEventoCalendario(turno: Fila) {
  const inscriptos = (turno.inscripciones ?? []).filter((i) => i.estado === 'confirmado').length;
  const cupo = turno.cupo_maximo == null ? null : Number(turno.cupo_maximo);
  return {
    turno_id: turno.id, fecha: turno.fecha ?? null, dia_semana: turno.dia_semana,
    hora_inicio: turno.hora_inicio ?? '', hora_fin: turno.hora_fin ?? '',
    aula_numero: turno.aula_numero, tipo_actividad: turno.tipo_actividad,
    materia_nombre: turno.materias?.nombre ?? '',
    actividad_nombre: turno.cursos_ingreso?.nombre ?? turno.clases_particulares?.nombre ?? turno.materias?.nombre ?? '',
    profesor_id: turno.profesor_id,
    profesor_nombre_completo: [turno.profesores?.apellido, turno.profesores?.nombre].filter(Boolean).join(', '),
    cupo_maximo: cupo, inscriptos_actuales: inscriptos,
    lugares_disponibles: cupo === null ? null : Math.max(0, cupo - inscriptos),
    estado: turno.cancelado ? 'cancelado' : (turno.estado ?? 'activo'),
  };
}

export function eventoEnFecha(evento: { fecha?: string | null; dia_semana?: string | null }, fecha: string): boolean {
  if (evento.fecha) return evento.fecha.slice(0, 10) === fecha;
  const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const texto = (evento.dia_semana ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const dia = new Date(fecha + 'T12:00:00').getDay();
  return texto.split(/[^a-z]+/).includes(dias[dia]);
}
