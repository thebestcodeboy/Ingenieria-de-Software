# HU29 – Simplificar el portal del alumno

## Navegación priorizada

El portal presenta las acciones principales en este orden:

1. **Mi calendario:** consulta de clases confirmadas y acceso a la baja de una fecha futura.
2. **Inscribirme:** oferta de cursos y clases. La opción secundaria **Mis cursos** queda dentro de esta sección.
3. **Mis pagos:** comprobantes y estado de pagos vinculados al alumno autenticado.
4. **Bitácora:** actividad cronológica de inscripciones y pagos.

El perfil institucional sigue disponible desde el área de usuario y no compite con las acciones principales.

## Inscripción en tres pasos

1. Elegir una oferta del catálogo.
2. Elegir un docente habilitado.
3. Elegir un horario. La inscripción se confirma al seleccionar el turno; si no quedan cupos, se informa la lista de espera.

La validación de alumno activo, cupos, turnos cancelados y duplicados sigue delegada a las reglas actuales de inscripción.

## Bitácora y datos

La bitácora registra confirmaciones y bajas de inscripción, listas de espera y cambios de estado de pagos. La migración inicial incorpora los pagos existentes y las inscripciones activas/en espera cuando tienen fecha de creación; los eventos nuevos se registran mediante triggers.

No es una auditoría general: quedan postergados el historial de cambios del perfil, accesos/inicios de sesión, comunicaciones y acciones administrativas que no sean cambios de inscripción o pago.

## Funciones agrupadas o postergadas

- **Agrupada:** la consulta de cursos ya anotados pasa a ser una vista secundaria dentro de **Inscribirme**; no se elimina.
- **Conservada como secundaria:** los filtros por nivel del catálogo, el detalle de comisión y los datos del perfil institucional.
- **Postergada:** iniciar pagos o descargar comprobantes desde el portal. **Mis pagos** es de consulta; el cobro se gestiona en Mesa de Entrada.
- **Postergada:** auditoría general de actividad distinta de pagos e inscripciones.

## Prueba de usabilidad pendiente

La aceptación requiere probar el flujo con dos personas ajenas al desarrollo. No se registran observaciones hasta realizar esas sesiones.

### Guion

1. Encontrá la próxima clase en tu calendario.
2. Buscá una oferta y anotate en un turno disponible.
3. Encontrá un pago y explicá si está confirmado o pendiente.
4. Encontrá en la bitácora el movimiento generado por la inscripción.

| Participante | Fecha | Completó inscripción en 3 pasos | Encontró pagos y bitácora sin ayuda | Dudas u observaciones |
| --- | --- | --- | --- | --- |
| Persona 1, ajena al desarrollo | Pendiente | Pendiente | Pendiente | Pendiente |
| Persona 2, ajena al desarrollo | Pendiente | Pendiente | Pendiente | Pendiente |

Registrar también el tiempo de inscripción y cualquier etiqueta o acción que resulte confusa. No incluir datos personales en las observaciones.