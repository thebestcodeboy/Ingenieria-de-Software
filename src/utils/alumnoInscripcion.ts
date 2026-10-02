export function validarAlumnoActivoParaInscripcion(alumno: Record<string, unknown> | null | undefined) {
  if (!alumno) {
    return {
      valido: false,
      motivo: 'No se pudo identificar tu cuenta de alumno.',
    };
  }

  const activo = alumno.activo;
  const estado = typeof alumno.estado === 'string' ? alumno.estado.toLowerCase() : '';

  if (activo === false || estado === 'inactivo') {
    return {
      valido: false,
      motivo: 'Tu cuenta está inactiva y no puede realizar nuevas inscripciones. Contactá a Mesa de Entrada.',
    };
  }

  return {
    valido: true,
    motivo: '',
  };
}
