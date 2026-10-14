# Implementación de HU27

## Instalación

1. Integrar y aplicar las migraciones de HU24.
2. Aplicar `supabase/migrations/20261014150000_hu27_obligaciones_indicadores.sql`.
3. Aplicar `supabase/migrations/20261014170000_aplicar_pagos_a_obligaciones.sql`.
4. Aplicar `supabase/migrations/20261014171000_vincular_obligaciones_a_inscripciones.sql`.
5. Aplicar `supabase/migrations/20261014172000_tarifas_y_obligaciones_automaticas.sql`.
6. Verificar que Gerencia tenga `app_metadata.rol = gerente` y Mesa de Entrada `app_metadata.rol = mesa_entrada`.
7. Iniciar la aplicación y abrir **Reportes > Económicos**.

La migración no inserta datos de prueba ni modifica pagos existentes.

## Fuentes

- `pagos`: recaudación confirmada, fecha, medio de pago y actividad académica.
- `obligaciones_pago`: importe original, saldo pendiente y fecha de vencimiento.
- `obtener_indicadores_financieros_hu27()`: RPC de solo lectura habilitada exclusivamente para Gerencia.

Los cursos y las clases particulares tienen una tarifa editable. Al confirmar una inscripción con tarifa configurada se genera la obligación correspondiente. **Gestión de Pagos** conserva un ajuste manual para casos excepcionales. Los pagos confirmados reducen el saldo; los pendientes, rechazados, borradores o anulados no lo hacen.

## Verificación

- Ejecutar `npm test`.
- Ejecutar `npm run build`.
- Probar filtros por rango, actividad y medio de pago.
- Confirmar que pagos no confirmados no suman a la recaudación.
- Confirmar que una obligación sin saldo o no vencida no aparece como mora.
- Registrar una obligación vencida desde **Gestión de Pagos** y comprobar que aparece en la morosidad de Gerencia.
- Asociar un cobro confirmado a la obligación y comprobar que el saldo baja; al cancelarlo o anularlo, comprobar que el saldo se restituye.
- Confirmar que usuarios sin rol Gerente no pueden ejecutar la RPC ni leer obligaciones.
