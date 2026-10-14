import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularDiferencia, calcularTotalesCierre } from '../src/domain/cierreCaja.ts';

test('calcula totales por medio y total general en centavos', () => {
  const totales = calcularTotalesCierre([
    { importe: 100.1, medio_pago: 'Efectivo' },
    { importe: 0.2, medio_pago: 'Efectivo' },
    { importe: 500, medio_pago: 'Transferencia' },
    { importe: 12.35, medio_pago: 'Mercado Pago' }
  ]);

  assert.equal(totales.porMedio.Efectivo, 100.3);
  assert.equal(totales.porMedio.Transferencia, 500);
  assert.equal(totales.porMedio['Tarjeta de Débito'], 0);
  assert.equal(totales.porMedio['Tarjeta de Crédito'], 0);
  assert.equal(totales.porMedio['Mercado Pago'], 12.35);
  assert.equal(totales.efectivoEsperado, 100.3);
  assert.equal(totales.totalGeneral, 612.65);
});

test('la diferencia es efectivo contado menos efectivo esperado y queda redondeada', () => {
  assert.equal(calcularDiferencia(99.99, 100), -0.01);
  assert.equal(calcularDiferencia(120, 100), 20);
  assert.equal(calcularDiferencia(100, 100), 0);
});