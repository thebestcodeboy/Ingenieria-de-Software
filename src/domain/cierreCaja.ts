export const MEDIOS_PAGO_CIERRE = [
  'Efectivo',
  'Transferencia',
  'Tarjeta de Débito',
  'Tarjeta de Crédito',
  'Mercado Pago'
] as const;

export type MedioPagoCierre = typeof MEDIOS_PAGO_CIERRE[number];

export interface PagoCierre {
  importe: number;
  medio_pago: MedioPagoCierre;
}

export interface TotalesCierre {
  porMedio: Record<MedioPagoCierre, number>;
  totalGeneral: number;
  efectivoEsperado: number;
}

function redondearImporte(importe: number): number {
  return Math.round((importe + Number.EPSILON) * 100) / 100;
}

export function calcularTotalesCierre(pagos: PagoCierre[]): TotalesCierre {
  const porMedio = Object.fromEntries(MEDIOS_PAGO_CIERRE.map(medio => [medio, 0])) as Record<MedioPagoCierre, number>;

  for (const pago of pagos) {
    porMedio[pago.medio_pago] = redondearImporte(porMedio[pago.medio_pago] + Number(pago.importe));
  }

  return {
    porMedio,
    totalGeneral: redondearImporte(Object.values(porMedio).reduce((total, importe) => total + importe, 0)),
    efectivoEsperado: porMedio.Efectivo
  };
}

export function calcularDiferencia(efectivoContado: number, efectivoEsperado: number): number {
  return redondearImporte(Number(efectivoContado) - Number(efectivoEsperado));
}