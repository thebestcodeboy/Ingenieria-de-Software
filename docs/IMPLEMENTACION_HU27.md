# Implementación de HU27

## Instalación

1. Integrar y aplicar las migraciones de HU24.
2. Aplicar `supabase/migrations/20261014150000_hu27_obligaciones_indicadores.sql`.
3. Verificar que el usuario Gerente tenga `app_metadata.rol = gerente`.
4. Iniciar la aplicación y abrir **Reportes > Económicos**.

La migración no inserta datos de prueba ni modifica pagos existentes.

## Fuentes

- `pagos`: recaudación confirmada, fecha, medio de pago y actividad académica.
- `obligaciones_pago`: importe original, saldo pendiente y fecha de vencimiento.
- `obtener_indicadores_financieros_hu27()`: RPC de solo lectura habilitada exclusivamente para Gerencia.

La carga y administración cotidiana de obligaciones queda fuera del alcance de HU27. Hasta que exista ese módulo, las obligaciones pueden cargarse mediante herramientas administrativas de Supabase.

## Verificación

- Ejecutar `npm test`.
- Ejecutar `npm run build`.
- Probar filtros por rango, actividad y medio de pago.
- Confirmar que pagos no confirmados no suman a la recaudación.
- Confirmar que una obligación sin saldo o no vencida no aparece como mora.
- Confirmar que usuarios sin rol Gerente no pueden ejecutar la RPC ni leer obligaciones.
