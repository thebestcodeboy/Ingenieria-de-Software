# HU11 — Consultar calendario personal diario y semanal

## Estado de la especificación

- Estado SDD: **borrador listo para validación del Product Owner y del equipo**.
- Estado de implementación: **no iniciada**.
- Fuente del backlog: [tarjeta HU11](https://trello.com/c/QifbiZm9/11-hu11-consultar-calendario-diario-y-semanal).
- Alcance acordado: calendario personal para alumnos y profesores, con vistas diaria y semanal.
- Última revisión: 23 de septiembre de 2026.

## Objetivo de negocio

Permitir que alumnos y profesores conozcan su agenda académica desde una fuente única y confiable. El calendario adapta su contenido a la identidad y al rol de la persona autenticada; no expone indiscriminadamente todos los turnos del instituto.

El valor esperado es reducir consultas administrativas, confusiones de horario y exposición indebida de información de otras personas.

## Descomposición de la historia

HU11 conserva una única capacidad de negocio —consultar el calendario personal—, pero se divide en dos variantes porque cada actor obtiene sus turnos mediante relaciones diferentes.

### HU11A — Calendario del alumno

**Como** alumno autenticado,

**quiero** consultar mis clases por día y semana,

**para** saber cuándo y dónde debo asistir.

### HU11B — Calendario del profesor

**Como** profesor autenticado,

**quiero** consultar las clases que tengo asignadas por día y semana,

**para** organizar mi actividad docente.

Las variantes pueden compartir interfaz y servicios internos, pero conservan reglas de autorización y datos visibles diferentes.

## Decisiones adoptadas por el Product Owner

- El alumno ve únicamente turnos en los que está inscripto.
- El profesor ve únicamente turnos en los que está asignado como docente.
- El profesor ve la cantidad de inscriptos, pero no la nómina ni datos personales desde HU11.
- El calendario administrativo general queda fuera de HU11A/HU11B.
- La semana comienza el lunes y finaliza el domingo.
- La zona horaria funcional es `America/Argentina/Buenos_Aires`.
- Se pueden consultar fechas pasadas y futuras.
- Si el modelo registra una clase cancelada, permanece visible e identificada como cancelada. HU11 no cancela clases.
- La consulta no permite editar turnos, cupos ni inscripciones.
- El MVP no incluye vista mensual, recurrencia, exportación ni filtros avanzados.

## Alcance

Incluye:

- identificar al usuario autenticado y resolver su rol;
- asociar la identidad con un alumno o profesor;
- consultar la agenda del día seleccionado;
- consultar la semana correspondiente a la fecha seleccionada;
- avanzar y retroceder períodos, y regresar a hoy;
- ordenar eventos por fecha y hora;
- mostrar detalles adecuados al rol;
- mostrar carga, error y agenda vacía;
- impedir desde la base el acceso a calendarios ajenos;
- reflejar cambios persistidos al volver a consultar.

No incluye:

- crear, modificar, reprogramar o eliminar turnos;
- definir o modificar cupos;
- inscribir o desinscribir alumnos;
- tomar asistencia;
- mostrar la nómina de una clase;
- enviar notificaciones;
- vista mensual, exportación o clases recurrentes;
- filtros por profesor, materia, aula o franja horaria;
- funcionamiento sin conexión;
- un calendario público sin autenticación.

## Relación con el backlog y dependencias

```text
Autenticación y perfiles
          │
          ├───────────────┐
          ▼               ▼
HU08 programa       HU10 inscribe
turnos y asigna     alumnos a turnos
profesor                  │
          └───────┬───────┘
                  ▼
       HU11 calendario personal
```

- **Autenticación y perfiles** es obligatoria: sin identidad no se puede determinar qué calendario mostrar.
- **HU08** produce turnos con fecha, horario, profesor, actividad y aula; es dependencia directa para ambos roles.
- **HU10** produce la relación alumno–turno mediante `inscripciones`; es dependencia directa de HU11A.
- **HU09** no es obligatoria para consultar horarios. Puede aportar ocupación, pero HU11 no necesita mostrar cupo al alumno.
- Las historias de alumnos, profesores, materias, cursos y clases particulares aportan los datos maestros.

## Glosario

| Concepto | Definición |
|---|---|
| Calendario personal | Turnos que corresponden al usuario autenticado según su rol. |
| Vista diaria | Turnos de una única fecha. |
| Vista semanal | Turnos entre lunes y domingo de una semana. |
| Evento | Representación de un turno dentro del calendario. |
| Identidad | Usuario gestionado por el proveedor de autenticación. |
| Perfil | Relación entre identidad, rol y alumno o profesor del dominio. |
| Turno asignado | Turno cuyo `profesor_id` corresponde al profesor autenticado. |
| Turno inscripto | Turno relacionado con el alumno autenticado mediante `inscripciones`. |

## Actores y permisos

| Actor | Puede consultar | No puede consultar desde HU11 |
|---|---|---|
| Alumno autenticado | Sus turnos inscriptos. | Turnos no inscriptos y calendarios de otros alumnos. |
| Profesor autenticado | Sus turnos asignados y cantidad de inscriptos. | Turnos de otros profesores y datos personales de alumnos. |
| Usuario no autenticado | Nada. | Todo calendario personal. |
| Administrativo | Fuera de HU11A/HU11B. | Su calendario general no se define aquí. |

Ocultar elementos en React no constituye autorización. Las mismas restricciones deben aplicarse en PostgreSQL mediante RLS, una vista segura o una función que respete la identidad del solicitante.

## Reglas de negocio

| ID | Regla |
|---|---|
| RN-HU11-01 | Todo calendario personal requiere una sesión válida. |
| RN-HU11-02 | Cada identidad habilitada resuelve un único perfil activo y un rol reconocido. |
| RN-HU11-03 | Un alumno sólo ve turnos relacionados con su `alumno_id` mediante `inscripciones`. |
| RN-HU11-04 | Un profesor sólo ve turnos cuyo `profesor_id` coincide con su perfil. |
| RN-HU11-05 | La vista diaria incluye únicamente la fecha seleccionada. |
| RN-HU11-06 | La vista semanal comprende desde el lunes hasta el domingo. |
| RN-HU11-07 | Los eventos se ordenan por fecha y hora de inicio. |
| RN-HU11-08 | Los horarios se presentan en `America/Argentina/Buenos_Aires`. |
| RN-HU11-09 | El alumno ve profesor, materia/actividad, aula, fecha, horario y estado. |
| RN-HU11-10 | El profesor ve materia/actividad, aula, fecha, horario, estado y cantidad de inscriptos. |
| RN-HU11-11 | HU11 es de sólo lectura. |
| RN-HU11-12 | Una agenda sin eventos es un resultado válido, no un error. |
| RN-HU11-13 | La siguiente consulta refleja los cambios persistidos y no datos obsoletos del cliente. |
| RN-HU11-14 | Si existe una cancelación, el evento permanece visible como “Cancelada”. |
| RN-HU11-15 | La respuesta no expone identificadores ni datos personales innecesarios. |

## Modelo de identidad propuesto

Supabase Auth almacena identidades en `auth.users`, mientras `alumnos` y `profesores` representan personas del negocio. Se necesita una relación explícita.

```text
auth.users
    │ 1
    │ 1
perfiles
- user_id
- rol: alumno | profesor | administrativo
- alumno_id nullable
- profesor_id nullable
- activo
```

Invariantes:

- `user_id` es único y referencia `auth.users.id`;
- un perfil alumno tiene `alumno_id` y no `profesor_id`;
- un perfil profesor tiene `profesor_id` y no `alumno_id`;
- los identificadores de alumno y profesor no se repiten entre perfiles activos;
- un perfil inactivo no accede al calendario;
- el correo no se usa como clave relacional porque puede cambiar.

Si se eligiera Firebase Auth, este modelo debe adaptarse al identificador externo y a los claims de sus JWT. Para el proyecto actual se recomienda Supabase Auth por su integración directa con PostgreSQL y RLS.

## Origen de los eventos

### Alumno

```text
auth.uid()
→ perfiles.user_id
→ perfiles.alumno_id
→ inscripciones.alumno_id
→ inscripciones.turno_id
→ turnos_clase.id
```

### Profesor

```text
auth.uid()
→ perfiles.user_id
→ perfiles.profesor_id
→ turnos_clase.profesor_id
```

Materia y actividad se resuelven mediante las relaciones de `turnos_clase` o una proyección segura equivalente a `vista_calendario`.

## Criterios de aceptación

### CA-01 — Acceso autenticado

Dado un visitante sin sesión, cuando intenta acceder al calendario personal, entonces no recibe eventos y se le solicita iniciar sesión.

### CA-02 — Resolución del perfil

Dado un usuario autenticado con perfil activo de alumno o profesor, cuando abre el calendario, entonces el sistema identifica su rol y carga la variante correspondiente sin pedirle que seleccione una persona.

### CA-03 — Vista diaria

Dada una fecha seleccionada, cuando activa la vista diaria, entonces ve únicamente sus eventos de esa fecha ordenados por hora.

### CA-04 — Vista semanal

Dada una fecha seleccionada, cuando activa la vista semanal, entonces ve únicamente sus eventos desde el lunes hasta el domingo, ordenados por fecha y hora.

### CA-05 — Navegación temporal

Dado el calendario, cuando avanza, retrocede o selecciona “Hoy”, entonces cambia un día en vista diaria o una semana en vista semanal, y el encabezado informa el período visible.

### CA-06 — Calendario del alumno

Dado un alumno inscripto en determinados turnos, cuando consulta un período, entonces sólo ve esos turnos y no otros turnos disponibles del instituto.

### CA-07 — Datos del alumno

Dado un evento del alumno, cuando consulta su detalle, entonces ve fecha, horario, materia/actividad, profesor, aula y estado, sin controles de edición.

### CA-08 — Calendario del profesor

Dado un profesor con turnos asignados, cuando consulta un período, entonces sólo ve los turnos cuyo `profesor_id` corresponde a su perfil.

### CA-09 — Datos del profesor

Dado un evento del profesor, cuando consulta su detalle, entonces ve fecha, horario, materia/actividad, aula, estado y cantidad de inscriptos, pero no la nómina ni datos personales.

### CA-10 — Agenda vacía

Dado un período sin eventos personales, cuando finaliza la consulta, entonces se muestra “No tenés clases programadas para este período” y no un error.

### CA-11 — Aislamiento entre usuarios

Dado un usuario autenticado, cuando intenta consultar por interfaz o API un calendario ajeno, entonces la base no devuelve esos eventos aunque se alteren solicitudes del navegador.

### CA-12 — Actualización

Dado que un turno o inscripción fue modificado válidamente, cuando vuelve a consultar, entonces el calendario refleja el estado persistido y no una copia obsoleta del cliente.

### CA-13 — Clase cancelada

Dado un turno cancelado que corresponde al usuario, cuando consulta el período, entonces permanece visible e identificado como “Cancelada”. Este criterio queda pendiente mientras el modelo no posea estado de turno.

### CA-14 — Fallo de consulta

Dado un error de red, sesión vencida o fallo de Supabase, cuando no puede cargarse el calendario, entonces se muestra un mensaje comprensible y una opción de reintento, sin presentar una agenda vacía falsa.

### CA-15 — Zona horaria

Dado un turno persistido, cuando se presenta en ambas vistas, entonces fecha y horario corresponden a `America/Argentina/Buenos_Aires`.

## Ejemplos de aceptación

| Rol | Datos | Período | Resultado esperado |
|---|---|---|---|
| Alumno A | Inscripto el martes a Física | Martes | Ve Física. |
| Alumno A | Sin inscripción el miércoles | Miércoles | Ve agenda vacía. |
| Alumno A | Alumno B inscripto el jueves | Semana | No ve el turno exclusivo de B. |
| Profesor P | Asignado lunes y viernes | Semana | Ve ambos turnos ordenados. |
| Profesor P | Otro profesor asignado el martes | Semana | No ve ese turno. |
| Profesor P | Turno con cinco inscriptos | Detalle | Ve cantidad 5, no nombres. |
| Sin sesión | Existen turnos | Cualquiera | No recibe eventos y se solicita login. |

## Diseño funcional

1. El usuario inicia sesión.
2. La aplicación recupera la sesión y resuelve su perfil.
3. El usuario abre “Mi calendario”.
4. Se muestra por defecto el día actual.
5. Puede alternar entre “Día” y “Semana”.
6. Puede navegar al período anterior, siguiente o volver a “Hoy”.
7. Se consulta exclusivamente el intervalo visible.
8. Los eventos aparecen en orden cronológico.
9. El usuario abre un evento y ve sólo los detalles permitidos.
10. Si vence la sesión, se detiene la consulta y se solicita iniciar sesión.

Estados obligatorios:

- cargando sesión;
- cargando calendario;
- calendario con eventos;
- calendario sin eventos;
- error recuperable con reintento;
- sesión ausente o vencida;
- perfil inexistente, inactivo o inconsistente.

En pantallas pequeñas puede usarse una agenda cronológica en lugar de una grilla, conservando período y contenido.

## Contrato de consulta propuesto

```text
obtener_mi_calendario(desde, hasta)
```

| Campo | Tipo | Regla |
|---|---|---|
| `desde` | Fecha | Obligatoria e inclusiva. |
| `hasta` | Fecha | Obligatoria e inclusiva; no anterior a `desde`. |

Identidad y rol no se aceptan como parámetros del navegador: se derivan de la sesión mediante `auth.uid()`.

Salida común: `turno_id`, `fecha`, `hora_inicio`, `hora_fin`, `materia_nombre`, `actividad_nombre`, `aula_numero` y `estado` cuando exista.

Campos por rol:

- alumno: `profesor_nombre_completo`;
- profesor: `inscriptos_actuales`;
- nunca se devuelve la nómina desde HU11.

Errores conceptuales:

| Código | Motivo |
|---|---|
| `NO_AUTENTICADO` | No existe una sesión válida. |
| `PERFIL_NO_ENCONTRADO` | La identidad no está vinculada al dominio. |
| `ROL_NO_ADMITIDO` | El perfil no corresponde a alumno o profesor. |
| `PERFIL_INACTIVO` | La cuenta no está habilitada. |
| `RANGO_INVALIDO` | Las fechas no forman un período válido. |
| `ERROR_CONSULTA` | La fuente de datos no pudo responder. |

## Diseño de datos y seguridad

- La publishable key identifica la aplicación, no al alumno o profesor.
- La identidad surge de la sesión; nunca se confía en un `alumno_id` o `profesor_id` enviado por el cliente.
- Las tablas expuestas deben tener RLS y permisos mínimos para `anon` y `authenticated`.
- `anon` no puede consultar calendarios personales.
- Una vista `security definer` puede omitir RLS. Debe usarse una vista segura con `security_invoker`, políticas verificadas o una función cuidadosamente diseñada.
- `service_role` y claves secretas nunca se incluyen en el cliente Next.js.
- El conteo para profesores devuelve sólo un número agregado.
- La aplicación administrativa conserva permisos separados.
- Todo cambio de esquema, función o política se versiona mediante migraciones.

## Hallazgos actuales

- La aplicación usa Next.js y `@supabase/supabase-js` desde componentes cliente.
- No hay pantalla de login ni gestión de sesión.
- No existe en el código una relación entre `auth.users` y alumnos/profesores.
- `turnos_clase` contiene fecha, horario, profesor, aula, materia/actividad y cupo.
- `inscripciones` relaciona alumnos con turnos.
- `vista_calendario` consolida información, pero se consulta sin limitarla al usuario autenticado.
- El panel actual es administrativo y no diferencia la experiencia de alumno y profesor.
- El esquema observado no expone un estado de cancelación; CA-13 requiere otra decisión de datos.

## Estrategia de pruebas

### Unidad

- cálculo del lunes y domingo;
- navegación diaria y semanal;
- orden cronológico;
- transformación según rol;
- fecha y hora institucional.

### Integración

- resolución por `auth.uid()`;
- consulta del alumno mediante inscripciones;
- consulta del profesor mediante asignaciones;
- límites diarios y semanales;
- actualización después de cambios;
- agenda vacía;
- perfiles inválidos o inactivos.

### Seguridad/RLS

- `anon` no obtiene eventos;
- un alumno no obtiene eventos de otro ni turnos no inscriptos;
- un profesor no obtiene turnos de otro;
- alterar identificadores no amplía acceso;
- el profesor recibe conteos, no datos personales;
- ninguna vista o función saltea políticas.

### Interfaz

- día/semana, anterior, siguiente y “Hoy”;
- encabezado del período;
- detalles correctos por rol;
- carga, vacío, error y reintento;
- teclado y etiquetas accesibles;
- adaptación móvil.

## Trazabilidad

| Criterio | Reglas | Verificación |
|---|---|---|
| CA-01 | RN-HU11-01 | Integración/RLS/UI |
| CA-02 | RN-HU11-02 | Integración |
| CA-03 | RN-HU11-05, 07 | Unidad/integración/UI |
| CA-04 | RN-HU11-06, 07 | Unidad/integración/UI |
| CA-05 | RN-HU11-05, 06 | Unidad/UI |
| CA-06 | RN-HU11-03 | Integración/RLS |
| CA-07 | RN-HU11-09, 11, 15 | UI/seguridad |
| CA-08 | RN-HU11-04 | Integración/RLS |
| CA-09 | RN-HU11-10, 11, 15 | UI/seguridad |
| CA-10 | RN-HU11-12 | UI/integración |
| CA-11 | RN-HU11-03, 04, 15 | RLS/seguridad |
| CA-12 | RN-HU11-13 | Integración/UI |
| CA-13 | RN-HU11-14 | Integración/UI |
| CA-14 | RN-HU11-12 | UI |
| CA-15 | RN-HU11-08 | Unidad/UI |

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Filtrar sólo en React. | Aplicar autorización en PostgreSQL y probar identidades diferentes. |
| Confiar en un ID del navegador. | Derivar identidad y rol de `auth.uid()`. |
| Reutilizar una vista que omite RLS. | Auditar la vista y usar `security_invoker` u operación segura. |
| Duplicar eventos por inscripciones. | Consultar turnos distintos y agregar ocupación por turno. |
| Diferencias por zona horaria. | Probar `America/Argentina/Buenos_Aires` de extremo a extremo. |
| Mezclar panel administrativo y personal. | Separar rutas, contratos y permisos. |
| Mostrar vacío ante un error. | Mantener estados de vacío y error distintos. |

## Definition of Ready

- [x] Variantes alumno y profesor separadas conceptualmente.
- [x] Alcance diario/semanal y exclusiones acordados.
- [x] Datos visibles por rol acordados.
- [x] Zona horaria y límites semanales acordados.
- [ ] Historia transversal de autenticación y roles especificada.
- [ ] Modelo identidad–perfil–persona acordado.
- [ ] Estado de cancelación confirmado o diferido.
- [ ] Contrato y estrategia RLS revisados técnicamente.
- [ ] CA-01 a CA-15 aceptados por el Product Owner.

## Definition of Done

- [ ] Login y sesión disponibles para alumnos y profesores.
- [ ] Perfiles vinculados mediante migración versionada.
- [ ] RLS y permisos mínimos implementados.
- [ ] Consulta diaria y semanal implementada para ambos roles.
- [ ] Alumno limitado a turnos inscriptos.
- [ ] Profesor limitado a turnos asignados y conteos agregados.
- [ ] Navegación y estados de interfaz completos.
- [ ] Pruebas unitarias, integración, RLS y UI en verde.
- [ ] Lint y compilación en verde.
- [ ] Documentación actualizada.
- [ ] Criterios aceptados por el Product Owner.

## Secuencia de implementación

1. Especificar e implementar autenticación, roles y perfiles.
2. Versionar la relación entre identidad, alumnos y profesores.
3. Auditar `vista_calendario`, grants y políticas.
4. Diseñar la consulta segura derivada de `auth.uid()`.
5. Implementar pruebas de aislamiento antes de la interfaz.
6. Implementar el servicio tipado.
7. Construir vista diaria y navegación.
8. Construir vista semanal reutilizando el contrato.
9. Adaptar detalles según rol.
10. Probar con al menos dos alumnos y dos profesores.
11. Actualizar documentación y presentar evidencia al Product Owner.
