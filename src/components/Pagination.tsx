'use client';

import { useState } from 'react';

interface EstadoPaginacion {
  claveFiltros: string;
  cantidadElementos: number;
  pagina: number;
}

export function usePagination<T>(elementos: T[], claveFiltros: string, elementosPorPagina = 8) {
  const [estado, setEstado] = useState<EstadoPaginacion>({
    claveFiltros,
    cantidadElementos: elementos.length,
    pagina: 1,
  });
  const totalPaginas = Math.max(1, Math.ceil(elementos.length / elementosPorPagina));
  const paginaGuardada = estado.claveFiltros === claveFiltros && estado.cantidadElementos === elementos.length
    ? estado.pagina
    : 1;
  const paginaActual = Math.min(paginaGuardada, totalPaginas);
  const inicio = (paginaActual - 1) * elementosPorPagina;

  const cambiarPagina = (pagina: number) => {
    setEstado({
      claveFiltros,
      cantidadElementos: elementos.length,
      pagina: Math.max(1, Math.min(pagina, totalPaginas)),
    });
  };

  return {
    elementosPaginados: elementos.slice(inicio, inicio + elementosPorPagina),
    paginaActual,
    totalPaginas,
    cambiarPagina,
  };
}

export function Pagination({
  paginaActual,
  totalPaginas,
  onCambiarPagina,
}: {
  paginaActual: number;
  totalPaginas: number;
  onCambiarPagina: (pagina: number) => void;
}) {
  if (totalPaginas <= 1) return null;

  const estiloBoton = (deshabilitado: boolean) => ({
    padding: '7px 14px',
    borderRadius: '6px',
    border: '1.5px solid #cbd5e1',
    backgroundColor: deshabilitado ? '#f1f5f9' : '#ffffff',
    color: '#0f172a',
    fontSize: '14px',
    fontWeight: 700,
    cursor: deshabilitado ? 'not-allowed' : 'pointer',
  });

  return (
    <nav aria-label="Paginación" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginTop: '20px', paddingBottom: '20px' }}>
      <button
        type="button"
        onClick={() => onCambiarPagina(paginaActual - 1)}
        disabled={paginaActual === 1}
        style={estiloBoton(paginaActual === 1)}
      >
        Anterior
      </button>
      <span aria-live="polite" style={{ fontSize: '15px', fontWeight: 600, color: '#334155' }}>
        Página {paginaActual} de {totalPaginas}
      </span>
      <button
        type="button"
        onClick={() => onCambiarPagina(paginaActual + 1)}
        disabled={paginaActual === totalPaginas}
        style={estiloBoton(paginaActual === totalPaginas)}
      >
        Siguiente
      </button>
    </nav>
  );
}