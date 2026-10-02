# Inscripciones administrativas
Disponible en Inscripciones para Mesa de Entrada y Gerente.

Aplicar en orden las migraciones de curso completo (20261002160000), períodos de cursos (20261002200000), guardado administrativo (20261002210000) e inscripciones administrativas (20261002220000).

El permiso se valida en el servidor leyendo app_metadata de la cuenta autenticada. No alcanza con cambiar el rol visible o user_metadata. La migración anterior configura gerente@ateneo.com. Para una cuenta de Mesa de Entrada identificada por el administrador, ejecutar desde SQL Editor reemplazando el correo:


```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"rol":"mesa_entrada"}'::jsonb
where lower(email) = lower('REEMPLAZAR_POR_CORREO_DE_MESA');
```

Volver a iniciar sesión después de configurar el rol.

Verificación manual:
- Seleccionar alumno activo, curso vigente y docente. Revisar las clases futuras antes de confirmar.
- Confirmar con cupos disponibles y comprobar las inscripciones en el calendario.
- Repetir la operación y comprobar que no se duplican las inscripciones.
- Completar un cupo y comprobar que las próximas inscripciones quedan en espera.
- Intentar con una cuenta de alumno: las RPC administrativas deben rechazarla.
- Desactivar alumno, curso o docente después de cargar la pantalla: confirmar debe rechazar la operación.

Las clases se inscriben por curso y docente, igual que el flujo existente del alumno. Las clases futuras programadas después de esta operación requieren una nueva inscripción.
No se ejecutaron las migraciones ni verificaciones contra la base remota desde este entorno.
