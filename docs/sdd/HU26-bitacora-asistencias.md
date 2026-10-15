# HU26 — Bitácora de asistencias del alumno

## Historia

Como empleado de Mesa de Entrada, profesor o alumno, quiero registrar y consultar las asistencias a clase como una bitácora, para conocer el historial del alumno: clases asistidas, canceladas, notas y observaciones.

## Estado inicial

El proyecto cuenta con alumnos, inscripciones por turno, calendario administrativo y portales de profesor y alumno. No existe actualmente un registro de asistencias ni un historial de correcciones. Esta especificación precede a su implementación; sus criterios todavía no se consideran completados.

## Reglas de negocio

| ID | Regla |
|---|---|
| RN-01 | La unidad de registro es la inscripción de un alumno en un turno concreto; no el curso completo. |
| RN-02 | Los estados son Asistió, Faltó y Clase cancelada. La ausencia de registro se muestra como Sin registrar y no cuenta como falta. |
| RN-03 | Mesa de Entrada puede registrar y corregir asistencias. El profesor puede hacerlo solamente en sus clases asignadas. |
| RN-04 | El alumno consulta exclusivamente su bitácora y no puede registrar ni corregir asistencias. Los permisos se verifican en Supabase, además de la interfaz. |
| RN-05 | Solo se admite carga normal sobre inscripciones confirmadas; una inscripción en espera o cancelada no habilita marcar presencia o falta. |
| RN-06 | No se registran presencias ni faltas antes del inicio de una clase. Se usa la zona horaria de Buenos Aires. |
| RN-07 | Cada registro admite nota libre y observación opcionales. La nota no presupone una escala numérica de evaluación. |
| RN-08 | Cada versión guarda autor autenticado, fecha y hora del servidor, estado, nota y observación. El cliente no puede elegir autor ni fecha de auditoría. |
| RN-09 | Una corrección crea una versión nueva con referencia a la anterior y motivo obligatorio; el original no se modifica ni se elimina. La versión vigente se usa en el resumen. |
| RN-10 | La cancelación del turno genera una versión Clase cancelada para sus alumnos confirmados, conservando el historial previo. Nunca suma una falta. |
| RN-11 | La bitácora se ordena por fecha y hora de clase e incluye materia, actividad, estado, nota, observación y datos de carga. |
| RN-12 | Los filtros por alumno, materia, rango inclusivo de fechas y estado se combinan. El resumen refleja los registros vigentes del conjunto filtrado. |
| RN-13 | Los estados llevan íconos SVG simples, texto y color; no se distinguen exclusivamente por color. |

## Modelo propuesto

- Tabla de versiones de asistencia: inscripción, número de versión, referencia a versión anterior, estado, nota, observación, motivo de corrección, usuario autor y fecha de carga.
- Restricciones para impedir dos versiones iniciales o dos sucesoras de una misma versión. Las correcciones concurrentes se rechazan para evitar sobreescrituras silenciosas.
- Sin permisos de modificación ni eliminación directa de versiones desde el navegador.
- Operación de carga transaccional: verifica rol, profesor asignado, inscripción y horario, bloquea la inscripción y agrega la versión.
- Consulta de bitácora autorizada: Mesa consulta por alumno, el profesor solo registros de sus clases y el alumno solo sus propias inscripciones.
- La consulta devuelve la versión vigente y permite consultar sus versiones anteriores.
- Integración de cancelaciones con el mecanismo existente de turnos cancelados.

## Accesos previstos

1. Mesa de Entrada: sección Asistencias para elegir clase, registrar su lista de alumnos y consultar una bitácora individual.
2. Profesor: acceso desde Mis clases, limitado a sus turnos.
3. Calendario: acción Asistencias en el detalle de la clase que abre la misma lista.
4. Alumno: sección Mi bitácora con filtros y resumen, sin controles de edición.

## Criterios de aceptación y comprobación

| Criterio | Comprobación |
|---|---|
| Registrar desde profesor, Mesa y calendario | Los tres accesos abren el registro de la misma clase y persisten sobre la misma inscripción. |
| Asistió, Faltó y Clase cancelada | Marcar ejemplos de cada estado; cancelar una clase y comprobar que no aumenta el contador de faltas. |
| Solo inscriptos | Rechazar desde la API una inscripción inexistente, de otro turno, en espera o cancelada. |
| Notas y observaciones | Guardar, volver a consultar y corregir ambos campos. |
| Autor, fecha y correcciones trazadas | Corregir un registro y comprobar ambas versiones con sus autores y fechas; rechazar UPDATE y DELETE directos. |
| Bitácora cronológica con filtros | Combinar materia, fechas y estado y verificar orden y resultados. |
| Resumen por estado | Contar una sola vez cada inscripción según su versión vigente; no sumar las versiones históricas. |
| Portal del alumno de solo lectura | Un alumno ve su historial; intentar consultar otro alumno o guardar cambios se rechaza en Supabase. |
| Íconos por estado | Comprobar ícono, etiqueta y color diferenciados, con nombres accesibles. |

## Secuencia de implementación

1. Persistencia, permisos, consulta y auditoría de correcciones en Supabase.
2. Servicio y reglas de dominio para estados, filtros y resumen; pruebas de permisos y correcciones.
3. Lista de asistencia reutilizable e integración en Mesa, profesor y calendario.
4. Bitácora individual y portal del alumno de solo lectura.
5. Validación de los nueve criterios, compilación y guía de aplicación de la migración.

## Casos límite

- Ningún registro: resumen en cero y estado Sin registrar, sin faltas inferidas.
- Dos operadores corrigen simultáneamente: uno guarda y el otro debe recargar la última versión.
- Clase cancelada con una asistencia previa: la cancelación queda como nueva versión y conserva el original.
- Inscripción cancelada posteriormente: conservar los registros históricos ya existentes.
- Sin materias o resultados dentro del filtro: mostrar un estado vacío claro.
- No se insertan datos ficticios ni se aplican migraciones a la base compartida automáticamente.
