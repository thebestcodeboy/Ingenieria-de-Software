export function validarCupo(cupo: number, inscriptosActuales: number): string | null {
  if (!Number.isInteger(cupo) || cupo <= 0) {
    return 'El cupo debe ser un número entero mayor que cero.';
  }

  if (cupo < inscriptosActuales) {
    return `El cupo no puede ser menor que los ${inscriptosActuales} alumnos ya inscriptos.`;
  }

  return null;
}
