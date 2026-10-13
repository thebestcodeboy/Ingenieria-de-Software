# HU27 — Indicadores gerenciales de pagos y morosidad

## Historia

**Como** gerente, **quiero** ver indicadores de recaudación, flujo de caja y morosidad acompañados de conclusiones, **para** tomar decisiones sobre la gestión económica del instituto.

## Alcance

El panel es de solo lectura. Incluye recaudación del período, mes y semana; comparación mensual del año seleccionado contra el anterior; flujo por medio de pago; deuda vencida; ingresos por actividad; ranking de deudores; filtros y conclusiones automáticas.

No modifica pagos u obligaciones, no proyecta ingresos y no aplica intereses.

## Fuente temporal

- `src/data/indicadoresFinancierosDemo.ts`: pagos y obligaciones locales para demostrar la HU27 sin escribir en la única base productiva compartida.
- Los datos conservan la forma prevista para pagos y obligaciones reales, de modo que el dominio y la interfaz puedan reutilizarse al integrar la fuente definitiva.
- La pantalla debe advertir que los datos son de demostración.

La ausencia de un pago no demuestra una deuda. Una deuda existe únicamente cuando hay una obligación con saldo positivo y vencimiento anterior a la fecha de corte.

## Reglas de negocio

| ID | Regla |
|---|---|
| RN-01 | Solo el rol `gerente` puede acceder a los indicadores. |
| RN-02 | La recaudación incluye solo pagos con estado `CONFIRMADO`. |
| RN-03 | El período anterior tiene igual cantidad de días y termina el día anterior al período filtrado. |
| RN-04 | La comparación anual contiene los doce meses del año de la fecha final y los doce del año anterior. |
| RN-05 | El flujo de caja agrupa importe y participación por medio de pago. |
| RN-06 | Hay mora cuando `saldo_pendiente > 0` y `fecha_vencimiento < fecha_corte`. |
| RN-07 | La antigüedad se divide en hasta 30, 31–60 y más de 60 días. |
| RN-08 | La cantidad de deudores cuenta alumnos distintos; el monto suma todas sus obligaciones vencidas. |
| RN-09 | Los filtros de período, actividad y medio se combinan. El medio de pago no afecta la deuda. |
| RN-10 | Cada conclusión menciona el dato observado y propone una acción. |
| RN-11 | Fechas y moneda usan formato argentino y zona `America/Argentina/Buenos_Aires`. |
| RN-12 | Cada gráfico tiene una tabla equivalente con filas alternadas. |

## Criterios verificables

1. Se muestran recaudación del período, mes y semana, comparadas con sus períodos anteriores.
2. El gráfico anual compara los doce meses del año seleccionado contra el anterior, incluso con meses en cero.
3. El flujo de caja muestra importe y porcentaje por medio de pago.
4. La morosidad informa deudores únicos, monto total y tres tramos de antigüedad.
5. Se muestran ingresos por curso o materia y ranking descendente de deudores.
6. Cada bloque presenta una conclusión automática.
7. Los filtros recalculan todos los indicadores aplicables.
8. Cada gráfico incluye una tabla de apoyo con filas alternadas.
9. Existen datos locales con el año anterior completo y los meses transcurridos del actual.
10. Un usuario sin rol Gerente no accede al panel financiero.

## Estrategia de validación

- Pruebas unitarias para períodos, anulaciones, filtros, agrupaciones, tramos y alumnos únicos.
- Compilación TypeScript/Next.js.
- Revisión visual con datos abundantes y con filtros sin resultados.
