type AlumnoBuscable = { id: string; nombre: string; apellido: string; dni: string | null; legajo: string | null };

function normalizar(valor: string) {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function filtrarAlumnos<T extends AlumnoBuscable>(alumnos: T[], consulta: string): T[] {
  const terminos = normalizar(consulta).split(/\s+/).filter(Boolean);
  return alumnos.filter(a => {
    const datos = normalizar([a.apellido, a.nombre, a.dni, a.legajo].join(' '));
    return terminos.every(termino => datos.includes(termino));
  });
}
