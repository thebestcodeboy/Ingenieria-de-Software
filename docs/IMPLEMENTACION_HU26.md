# Implementación HU26 — Bitácora de asistencias

Se incorporaron versiones inmutables por inscripción, registro y corrección transaccionales con control de concurrencia, filtros combinables, resumen vigente y consulta del historial. Mesa accede desde Asistencias y el detalle del calendario; el profesor desde Asistencias o Mis clases; el alumno desde Mi bitácora.

## Instalación

Aplicar en orden las migraciones previas y luego `supabase/migrations/20261014180000_hu26_bitacora_asistencias.sql` mediante el procedimiento habitual de Supabase. Esta entrega no modifica la base compartida ni genera datos de ejemplo.

Los roles administrativos deben estar en `auth.users.raw_app_meta_data` (rol/role), igual que las inscripciones administrativas. Los profesores necesitan `auth_user_id` y acceso habilitado; los alumnos se vinculan por email institucional, conforme al portal existente. La consulta aplica estos permisos en el servidor y la tabla no concede acceso directo al navegador.

Clase cancelada se genera al cancelar el turno; no puede cargarse manualmente sin cancelar la clase. Los turnos cancelados antes de esta migración se muestran como cancelados sin inventar versiones de auditoría. El autor se muestra por su identificador autenticado. Los horarios se validan en Buenos Aires y las fechas de auditoría se generan en el servidor.

## Verificación

Pruebas de dominio: sin registro no implica falta, correcciones cuentan solo su versión vigente, cancelación no suma falta y filtros combinados incluyen los extremos. Se ejecutó la suite del proyecto.

Pendiente de validación en una base de prueba después de instalar: registro y corrección con Mesa y profesor asignado; rechazo para profesor ajeno y alumno; consulta exclusivamente propia; rechazo de INSERT/UPDATE/DELETE directos; espera y cancelación; clase futura; dos correcciones con la misma versión; cancelación conservando versiones previas. No se consideran verificados estos escenarios mediante las pruebas de dominio.

## Corrección de acceso administrativo vacío

Si el menú muestra Mesa de Entrada pero `raw_app_meta_data` no contiene su rol, la consulta no habilita permisos administrativos aunque existan inscripciones confirmadas. No se debe usar `user_metadata` para concederlos porque el usuario puede editarlo.

1. Aplicar `20261014190000_hu26_error_permisos_bitacora.sql` después de la migración inicial HU26. La API distingue el rol administrativo heredado sin habilitar de un resultado vacío.
2. Para la cuenta de Mesa diagnosticada, revisar y reemplazar el email en `supabase/scripts/habilitar_mesa_asistencias.sql`; ejecutarlo manualmente en SQL Editor. Solo modifica la cuenta exacta y conserva sus demás metadatos. No se aplica automáticamente.
3. Cerrar sesión e ingresar otra vez; abrir Asistencias y actualizar. Sin filtros, deben aparecer las 36 inscripciones confirmadas reportadas, si siguen existiendo en la misma base.
4. Antes de habilitar la cuenta debe mostrarse el error de permisos. Después, probar guardado y correcciones. Comprobar que alumno y profesor conservan su alcance y no acceden a la función interna.

La consulta en SQL Editor sin simular una sesión autenticada no representa los permisos del usuario del portal.

## Nombre del autor en el historial

Aplicar `20261014200000_hu26_nombre_autor.sql` después de las migraciones HU26 anteriores. La consulta agrega `autor_nombre` desde los metadatos de la cuenta (`nombre`, `full_name` o `name`) y conserva `autor_id`. No devuelve emails ni habilita acceso a `auth.users` desde el navegador.

Recargar la bitácora y abrir el historial de un registro existente: debe mostrar el nombre disponible y el ID de cuenta debajo. Si la cuenta no tiene nombre, indica “Nombre no disponible”; completar el nombre de esa cuenta en Supabase para que se muestre. El nombre se resuelve al consultar y puede cambiar con el perfil; la identidad persistida de cada versión sigue siendo el ID autenticado. No se modifica ningún registro histórico.
