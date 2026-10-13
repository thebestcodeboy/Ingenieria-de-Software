# Implementación de HU27

## Uso

1. Iniciar la aplicación e ingresar con el rol Gerente.
2. Abrir **Reportes**.
3. La HU27 usa exclusivamente los datos locales de `src/data/indicadoresFinancierosDemo.ts`.

No requiere migraciones ni escribe datos en Supabase. La pantalla identifica claramente que los importes son de demostración.

## Componentes

- El archivo de demostración contiene pagos del año anterior completo, pagos del año actual y obligaciones en los tres tramos de mora.
- El servicio valida que la sesión corresponda a un Gerente y devuelve los datos locales; no consulta ni modifica tablas financieras.
- El dominio calcula períodos, comparaciones, distribuciones, mora, rankings y conclusiones.
- La interfaz integra HU27 dentro del panel de Reportes de Gerencia.

## Verificación

- Ejecutar `npm test`.
- Ejecutar `npm run build`.
- Probar los filtros por rango, actividad y medio.
- Confirmar que un usuario sin rol Gerente recibe acceso restringido.
- Confirmar visualmente la leyenda de datos de demostración.
