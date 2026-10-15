# Integración de HU26 y HU27 en nosesaid

Origen: `feature/hu26-27`, commit `5badfa4`.
Base de integración: `nosesaid`, commit `f4bde29`.
Respaldo local: `respaldo/nosesaid`.

Se integraron selectivamente asistencias y reportes financieros, sin fusionar la rama completa.

- Asistencias disponibles para Mesa/Gerencia y profesor; consulta propia para el alumno.
- Acceso a asistencias desde el detalle de los calendarios administrativo y docente.
- Reportes con vistas Económicos y Académicos, filtros e informe imprimible.
- Obligaciones asociadas a pagos, tarifas de cursos y particulares y generación automática de obligaciones para nuevas inscripciones confirmadas con tarifa configurada.
- Se conserva el calendario docente avanzado, cierre de caja, portal del alumno y su bitácora de actividad. La consulta de asistencias del alumno tiene un acceso separado: Mis asistencias.
- Se conserva el procedimiento actual de guardado de cursos de nosesaid, agregando sus campos de tarifa a las mismas operaciones. Las relaciones de materias se normalizan antes de entregarlas a la interfaz.

## Base de datos: pendiente de revisión y aplicación

No se ejecutó SQL ni se consultó el estado de la base compartida. Antes de instalar, revisar el historial de migraciones en la base de destino; no volver a ejecutar migraciones ya aplicadas, especialmente HU26, que crea tablas y funciones sin `IF NOT EXISTS`.

Luego de las migraciones previas del proyecto, aplicar solamente las pendientes en este orden:

1. `20261014150000_hu27_obligaciones_indicadores.sql`
2. `20261014170000_aplicar_pagos_a_obligaciones.sql`
3. `20261014171000_vincular_obligaciones_a_inscripciones.sql`
4. `20261014172000_tarifas_y_obligaciones_automaticas.sql`
5. `20261014180000_hu26_bitacora_asistencias.sql`
6. `20261014190000_hu26_error_permisos_bitacora.sql`
7. `20261014200000_hu26_nombre_autor.sql`

Los servicios de pagos y actividades requieren las columnas nuevas. Desplegar el código después de verificar las migraciones. No se incluyen ni ejecutan scripts de datos de demostración. El script opcional de habilitación de Mesa conserva un marcador de email y debe revisarse manualmente; no forma parte de la instalación automática.

## Verificación local

- `npm test`: 43 pruebas aprobadas.
- `npx tsc --noEmit`: aprobado.
- `npm run build`: aprobado; necesitó acceso de red para descargar las fuentes de Google ya utilizadas por el proyecto.
- ESLint de los módulos nuevos, dominios y servicios de HU26/HU27 y del servicio de cursos adaptado: aprobado.

Pendiente en una base de prueba con las migraciones: verificar permisos de cada rol, registro/corrección/historial de asistencia, cancelación de clase, cobro y reversión de saldo de una obligación, cierre de caja y filtros/impresión de reportes. Las pruebas locales no acreditan esos flujos contra Supabase.
