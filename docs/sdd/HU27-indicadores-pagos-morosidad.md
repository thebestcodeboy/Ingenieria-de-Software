# HU27 — Indicadores gerenciales de pagos y morosidad

## Historia

**Como** gerente, **quiero** ver indicadores de recaudación, flujo de caja y morosidad acompañados de conclusiones, **para** tomar decisiones sobre la gestión económica del instituto.

## Alcance

HU27 es un módulo de consulta. Muestra recaudación, comparación mensual, flujo por medio de pago, deuda vencida, ingresos por actividad, ranking de deudores, filtros, conclusiones automáticas e informe imprimible.

El reporte no crea, modifica ni anula pagos u obligaciones. Como soporte operativo mínimo, Gestión de Pagos permite registrar una obligación y asociarle cobros. No administra planes de cuotas, intereses, refinanciaciones o facturación.

## Contrato de datos

- `pagos` proviene de HU24. Solo los registros `CONFIRMADO` integran la recaudación.
- `obligaciones_pago` contiene el importe esperado, saldo pendiente y vencimiento.
- La ausencia de un pago no demuestra una deuda.
- Un pago `PENDIENTE` o `RECHAZADO` es una operación no acreditada y no constituye por sí mismo una obligación.
- Hay mora únicamente cuando una obligación tiene saldo positivo y su vencimiento es anterior a la fecha de corte.

La administración completa de obligaciones corresponde a una historia futura de cuentas por cobrar. HU27 incorpora la estructura, la consulta y un alta mínima para poder probar sus indicadores con datos generados desde la web.

## Reglas de negocio

| ID | Regla |
|---|---|
| RN-01 | Solo Gerencia puede consultar indicadores y obligaciones. |
| RN-02 | La recaudación incluye exclusivamente pagos `CONFIRMADO`. |
| RN-03 | El período anterior tiene igual cantidad de días y termina el día anterior al período filtrado. |
| RN-04 | La comparación anual contiene los doce meses del año seleccionado y los doce del anterior. |
| RN-05 | El flujo de caja agrupa importe y participación por medio de pago. |
| RN-06 | Hay mora cuando `saldo_pendiente > 0` y `fecha_vencimiento < fecha_corte`. |
| RN-07 | La antigüedad se divide en hasta 30, 31–60 y más de 60 días. |
| RN-08 | La cantidad de deudores cuenta alumnos distintos. |
| RN-09 | Los filtros de período, actividad y medio se combinan; el medio no afecta la deuda. |
| RN-10 | Cada conclusión explica el dato y propone una acción. |
| RN-11 | Fechas y moneda usan formato argentino. |
| RN-12 | Cada gráfico tiene una tabla equivalente con filas alternadas. |

## Criterios verificables

1. Se muestran recaudación del período, mes y semana comparadas con períodos anteriores.
2. El gráfico anual compara el año seleccionado con el anterior.
3. El flujo de caja muestra importe y porcentaje por medio de pago.
4. La morosidad informa deudores únicos, monto y tres tramos de antigüedad.
5. Se muestran ingresos por actividad y ranking de deudores.
6. Cada bloque presenta una conclusión automática.
7. Los filtros recalculan los indicadores aplicables.
8. Cada gráfico incluye una tabla con filas alternadas.
9. El informe puede guardarse como PDF.
10. Un usuario sin rol Gerente no puede ejecutar la consulta financiera.

## Casos límite

- Pagos pendientes, rechazados, anulados o cancelados no suman recaudación.
- Varias obligaciones del mismo alumno suman su saldo, pero cuentan un único deudor.
- Un vencimiento igual a la fecha de corte todavía no está vencido.
- Sin datos se muestran ceros y estados vacíos comprensibles.
- Un rango invertido se rechaza.

## Validación

- Pruebas unitarias de períodos, estados, filtros, agrupaciones, tramos y alumnos únicos.
- Compilación TypeScript y Next.js.
- Verificación de permisos mediante RLS y RPC.
- Revisión visual con datos reales y estados vacíos.
