# HU09 — Definir el cupo de una clase

## Estado de la especificación

- Estado SDD: **borrador listo para validación del Product Owner**.
- Estado de implementación local: **en progreso**. Interfaz, servicio, migración y pruebas unitarias creados; falta aplicar la migración remota y ejecutar pruebas de integración con turnos reales.
- Estado en Trello: **In Progress**, Sprint 1 — Incremento 1 (MVP).
- Fuente del backlog: [tarjeta HU09](https://trello.com/c/RTfvt6ug/9-hu09-definir-cupo-de-una-clase), origen HU-1-11.
- Objetivo: acordar el comportamiento antes de modificar interfaz, servicios o base de datos.
- Última revisión: 23 de septiembre de 2026.

## Historia revisada

**Como** empleado administrativo autorizado del instituto,

**quiero** definir o modificar el cupo máximo de un turno de clase existente,

**para** controlar las inscripciones de acuerdo con las plazas planificadas para esa clase.

### Aclaración de dominio

El aula es el espacio físico asignado a la clase. Que el instituto tenga 10 aulas no implica que una clase tenga un cupo de 10 alumnos. El cupo pertenece al **turno de clase**, no al aula ni al instituto en general.

Una clase sin cupo configurado no está habilitada para recibir inscripciones.

## Evaluación de la HU original

La historia original expresa bien el actor, la necesidad y el valor de negocio. También contiene las reglas centrales. Para volverla implementable y comprobable se agregaron estas precisiones:

1. El actor debe estar autorizado; hoy el proyecto no implementa autenticación ni roles.
2. “Sin cupo” se representará como `NULL`, nunca como cero.
3. El límite debe controlarse en la base de datos, además de la interfaz, para impedir que dos operaciones simultáneas violen la regla.
4. La cantidad de inscriptos se obtiene de las inscripciones persistidas para el turno; falta decidir si en el futuro habrá estados como cancelada o en espera.
5. La consulta debe distinguir claramente entre “sin cupo”, “con lugares” y “completo”.

### Correspondencia con los criterios recibidos

| Criterio original | Criterios refinados | Tipo de cambio |
|---|---|---|
| Seleccionar un turno existente y definir su cupo | CA-01 y CA-02 | Se separa selección de persistencia. |
| Aceptar sólo enteros mayores que cero | CA-03 | Se enumeran entradas inválidas comprobables. |
| No reducir por debajo de los inscriptos | CA-04 y CA-05 | Se separan el límite permitido y el rechazo. |
| Conservar y mostrar el cupo | CA-02 y CA-09 | Se exige volver a leer el dato persistido. |
| Sin cupo no se habilita la inscripción | CA-06 | Se conserva sin modificar su intención. |

CA-07 explicita una consecuencia directa del límite: una clase completa no admite otra inscripción. CA-08 es una condición técnica de consistencia al guardar, no una vista de disponibilidad en tiempo real. CA-10 es una condición transversal de autorización propuesta; debe confirmarse si la autenticación forma parte de este incremento.

## Alcance

Incluye:

- seleccionar un turno de clase existente;
- consultar su cupo y cantidad actual de inscriptos;
- definir por primera vez el cupo;
- modificar un cupo existente;
- validar el valor ingresado;
- impedir una reducción inferior a la ocupación actual;
- persistir y volver a mostrar el valor;
- impedir inscripciones si no hay cupo o si el turno está completo;
- comunicar errores de negocio de forma comprensible.

No incluye en HU09:

- crear o eliminar turnos;
- asignar aulas;
- definir la capacidad física de un aula;
- inscribir o desinscribir alumnos desde esta pantalla;
- lista de espera;
- sobreventa deliberada de plazas;
- historial de cambios de cupo, salvo que el PO lo incorpore.

## Relación con el backlog de Trello

```text
HU08 Programa el turno
        ↓
HU09 Define y conserva su cupo
        ↓
HU10 Inscribe y debe respetar ese cupo

HU11 Consulta los turnos por día y semana
```

- [HU08](https://trello.com/c/N4UWw84a/8-hu08-programar-turno-de-clase) es una dependencia previa: produce el turno existente que HU09 selecciona. No corresponde a HU09 crear turnos, asignar profesor, aula, fecha u horario.
- [HU10](https://trello.com/c/pnYWUYHo/10-hu10-inscribir-alumno-a-una-clase) consume el cupo configurado. Su pantalla y flujo de inscripción quedan fuera de HU09. HU09 debe dejar persistido el dato y preparada la regla de integridad que HU10 respetará al guardar.
- [HU11](https://trello.com/c/QifbiZm9/11-hu11-consultar-calendario-diario-y-semanal) será la siguiente historia de este responsable. Es de consulta diaria/semanal y no incluye filtros avanzados, vista mensual, exportación ni recurrencia.
- La “disponibilidad en tiempo real” está excluida del MVP de HU10. La atomicidad de CA-08 no agrega esa vista: sólo evita superar el cupo cuando se confirma una escritura.

## Glosario

| Concepto | Definición de negocio |
|---|---|
| Turno de clase | Clase programada en una fecha y horario concretos, asociada a materia/actividad, profesor y aula. |
| Cupo máximo | Cantidad máxima de alumnos que pueden mantener una inscripción válida en ese turno. |
| Ocupación | Cantidad de inscripciones que cuentan para consumir cupo. |
| Lugares disponibles | `cupo máximo - ocupación`. Si no hay cupo definido, no se calcula como disponible. |
| Sin cupo definido | Estado de configuración pendiente; bloquea nuevas inscripciones. |
| Turno completo | Turno con cupo definido cuya ocupación es igual al cupo. |
| Empleado administrativo | Usuario autorizado para operar la gestión académica. El mecanismo de roles está pendiente. |

## Reglas de negocio

| ID | Regla |
|---|---|
| RN-HU09-01 | El cupo se define por cada registro de `turnos_clase`. |
| RN-HU09-02 | El cupo sólo admite números enteros mayores que cero. |
| RN-HU09-03 | `NULL` significa “sin cupo definido”; `0` es inválido. |
| RN-HU09-04 | No se puede guardar un cupo menor que la ocupación actual del turno. |
| RN-HU09-05 | Un cupo igual a la ocupación actual es válido y deja al turno completo. |
| RN-HU09-06 | Un turno sin cupo definido no admite nuevas inscripciones. |
| RN-HU09-07 | Un turno completo no admite nuevas inscripciones. |
| RN-HU09-08 | RN-HU09-04, 06 y 07 deben validarse de forma atómica en la base de datos; la validación visual no es suficiente. |
| RN-HU09-09 | La cantidad de aulas del instituto no determina el cupo del turno. |
| RN-HU09-10 | Al volver a consultar el turno se muestra el cupo persistido, no un valor conservado sólo en el navegador. |

## Estados derivados del turno

| Condición | Estado mostrado | ¿Admite inscripción? |
|---|---|---|
| `cupo_maximo IS NULL` | Sin cupo definido | No |
| `ocupación < cupo_maximo` | Con lugares | Sí |
| `ocupación = cupo_maximo` | Completo | No |

Por RN-HU09-04 no debería existir `ocupación > cupo_maximo`. Si aparece por datos heredados, debe mostrarse como inconsistencia y bloquear nuevas inscripciones.

## Criterios de aceptación refinados

### CA-01 — Selección de turno

Dado que el empleado accede a “Turnos y clases”, cuando elige configurar un cupo, entonces puede seleccionar un turno existente y ve fecha, horario, materia/actividad, profesor y aula.

### CA-02 — Alta de un cupo válido

Dado un turno sin cupo definido y sin inscriptos, cuando el empleado ingresa un entero mayor que cero y confirma, entonces el sistema guarda el cupo y lo muestra al volver a consultar el turno.

### CA-03 — Validación del formato

Dado un turno existente, cuando se intenta guardar un valor vacío, cero, negativo, decimal, texto o una notación no entera, entonces el sistema no modifica el cupo y explica que debe ingresarse un entero mayor que cero.

### CA-04 — Reducción permitida

Dado un turno con 5 alumnos inscriptos y cupo 10, cuando el empleado cambia el cupo a 5 o más, entonces el sistema guarda el nuevo valor. Con cupo 5, el turno queda completo.

### CA-05 — Reducción rechazada

Dado un turno con 5 alumnos inscriptos, cuando el empleado intenta establecer un cupo menor que 5, entonces el sistema rechaza la operación, conserva el cupo anterior y muestra la ocupación actual.

### CA-06 — Clase sin cupo

Dado un turno cuyo `cupo_maximo` es `NULL`, cuando se intenta inscribir un alumno, entonces la inscripción se rechaza indicando que primero debe definirse el cupo.

### CA-07 — Clase completa

Dado un turno cuya ocupación es igual a su cupo, cuando se intenta inscribir otro alumno, entonces la inscripción se rechaza por falta de lugares.

### CA-08 — Consistencia concurrente

Dado un turno con un único lugar disponible, cuando dos inscripciones intentan confirmar el último lugar de forma simultánea, entonces sólo una puede concretarse y la otra debe rechazarse.

### CA-09 — Consulta del estado

Dado cualquier turno consultable, cuando se muestra su detalle o listado, entonces se informa cupo máximo, cantidad de inscriptos, lugares disponibles y estado; si el cupo es `NULL`, se muestra “Sin cupo definido” y no “0 lugares”.

### CA-10 — Autorización transversal propuesta

Dado un usuario no autorizado, cuando intenta modificar el cupo por interfaz o API, entonces la operación se rechaza y el dato no cambia. Este criterio queda sujeto a confirmar si autenticación y roles forman parte del Incremento 1.

## Matriz de ejemplos

| Cupo anterior | Inscriptos | Nuevo valor | Resultado esperado |
|---:|---:|---:|---|
| Sin definir | 0 | 20 | Guarda 20; quedan 20 lugares. |
| 20 | 8 | 12 | Guarda 12; quedan 4 lugares. |
| 20 | 8 | 8 | Guarda 8; queda completo. |
| 20 | 8 | 7 | Rechaza; conserva 20. |
| 20 | 0 | 1 | Guarda 1. |
| 20 | 0 | 0 | Rechaza. |
| 20 | 0 | -1 | Rechaza. |
| 20 | 0 | 2.5 | Rechaza. |
| 20 | 0 | texto o vacío | Rechaza. |

## Hallazgos del sistema actual

Confirmados en el repositorio y mediante consultas públicas de sólo lectura a Supabase:

- La ruta activa es `src/app/page.tsx` y funciona como componente cliente.
- La aplicación usa `@supabase/supabase-js` directamente desde el navegador.
- Existen `turnos_clase.id` y `turnos_clase.cupo_maximo`.
- Existe `inscripciones` con, al menos, `id`, `turno_id`, `alumno_id` y `created_at`.
- Existe `vista_calendario` con `turno_id`, `cupo_maximo`, `inscriptos_actuales` y `lugares_disponibles`.
- La pantalla ya representa ocupación y cupo, pero el botón de edición no tiene comportamiento.
- `src/services/turnos.js` está vacío.
- No hay migraciones, esquema SQL ni pruebas versionadas en el repositorio.
- No hay autenticación ni autorización visibles en el código.
- No está confirmado si la base ya posee restricciones, claves foráneas, unicidad o funciones transaccionales para estas reglas.

## Diseño funcional de la interacción

1. El empleado abre “Turnos y clases”.
2. Identifica un turno por fecha, horario, materia, profesor y aula.
3. Selecciona “Definir cupo” o “Editar cupo”.
4. El sistema muestra el cupo actual y la cantidad de inscriptos.
5. El empleado ingresa el nuevo entero.
6. La interfaz valida formato y límite básico.
7. La operación se envía a una única operación de dominio en Supabase.
8. La base vuelve a contar las inscripciones dentro de la misma operación y decide.
9. Si guarda, la pantalla actualiza cupo, lugares disponibles y estado con datos retornados por la base.
10. Si rechaza, la pantalla conserva el valor persistido y muestra una explicación.

## Contrato de aplicación propuesto

La interfaz no debe ejecutar un `update` genérico sobre `turnos_clase`. Debe invocar una operación de dominio única, por ejemplo `definir_cupo_turno`.

Entrada conceptual:

| Campo | Tipo | Regla |
|---|---|---|
| `turnoId` | Identificador del turno | Obligatorio; debe existir. |
| `cupoMaximo` | Entero | Obligatorio; mayor que cero. |

Salida exitosa: identificador, cupo persistido, ocupación recalculada, lugares disponibles y estado derivado.

Errores de dominio esperados:

| Código conceptual | Motivo |
|---|---|
| `CUPO_INVALIDO` | No es un entero mayor que cero. |
| `TURNO_NO_EXISTE` | El turno indicado no existe. |
| `CUPO_MENOR_A_INSCRIPTOS` | El nuevo cupo es menor que la ocupación actual. |
| `NO_AUTORIZADO` | El actor no puede modificar cupos. |
| `CONFLICTO_CONCURRENCIA` | El estado cambió mientras se procesaba la operación. |

Los nombres exactos se confirmarán al diseñar la migración. Este documento define comportamiento, no sintaxis SQL.

## Diseño de datos y consistencia

- `turnos_clase.cupo_maximo` debe ser entero, aceptar `NULL` y restringir valores no nulos a mayores que cero.
- La ocupación debe derivarse de `inscripciones`; no debe escribirse manualmente en dos lugares.
- La reducción del cupo debe bloquear o serializar el turno mientras cuenta inscripciones para evitar una carrera con nuevas altas.
- La operación de inscripción debe proteger el mismo turno, verificar cupo definido y confirmar disponibilidad antes de insertar.
- `vista_calendario` puede ofrecer valores derivados para lectura, pero no reemplaza reglas de escritura.
- Todo cambio de esquema debe quedar versionado como migración en el repositorio.

## Seguridad

La publishable key no representa por sí sola a un empleado autorizado. Para completar CA-10 se necesita autenticación, un rol administrativo verificable y políticas RLS u otra frontera de servidor. Deben impedirse actualizaciones directas que salteen la operación de dominio.

No debe utilizarse `service_role` ni una secret key en el navegador.

## Estrategia de pruebas

### Unidad/dominio

- validación de enteros positivos;
- cálculo de estados derivados;
- traducción de errores a mensajes de interfaz.

### Integración con Supabase

- alta y modificación de cupo;
- persistencia después de volver a consultar;
- rechazo de reducción inválida;
- bloqueo de inscripción sin cupo o con turno completo;
- concurrencia sobre el último lugar;
- permisos y RLS.

### Interfaz

- selección e identificación del turno;
- estados de carga, éxito y error;
- validación accesible del formulario;
- actualización del listado sin datos obsoletos.

## Trazabilidad

| Criterio | Reglas relacionadas | Verificación principal |
|---|---|---|
| CA-01 | RN-HU09-01 | Interfaz/integración |
| CA-02 | RN-HU09-02, 03, 10 | Integración/UI |
| CA-03 | RN-HU09-02, 03 | Unidad/UI/base |
| CA-04 | RN-HU09-04, 05 | Integración |
| CA-05 | RN-HU09-04 | Integración/base |
| CA-06 | RN-HU09-03, 06 | Integración/base |
| CA-07 | RN-HU09-07 | Integración/base |
| CA-08 | RN-HU09-08 | Integración concurrente |
| CA-09 | RN-HU09-10 | UI/integración |
| CA-10 | Autorización | Seguridad/RLS |

## Decisiones adoptadas para el MVP

- Toda fila actual de `inscripciones` consume cupo, porque el esquema no posee estados.
- No se impone un máximo arbitrario; sólo se exige un entero mayor que cero.
- No se incorpora auditoría histórica en HU09.
- Autenticación y roles quedan como dependencia transversal fuera de esta historia.
- No se bloquean turnos finalizados porque el backlog no establece esa regla.
- La interfaz de inscripción corresponde a HU10, aunque la base queda preparada para rechazar inscripciones sin cupo o con turno completo.

Estas decisiones son del incremento actual y pueden revisarse cuando negocio incorpore estados de inscripción, auditoría o autenticación.

## Definition of Ready

- [x] Las decisiones mínimas del MVP quedaron registradas.
- [ ] Se documenta el esquema real y se crea una base de migraciones versionadas.
- [ ] Se define autenticación/autorización o se registra explícitamente como dependencia transversal fuera del alcance del MVP.
- [ ] Se acuerdan los mensajes y el flujo visual.
- [ ] Los escenarios CA-01 a CA-10 son aceptados por desarrollo y PO.

## Definition of Done

- [ ] Restricciones y operación atómica implementadas mediante migración.
- [ ] RLS/autorización verificadas.
- [x] Servicio tipado para HU09 implementado.
- [x] Interfaz de definición/edición implementada y accesible.
- [ ] Consulta muestra cupo persistido y estado correcto.
- [ ] La inscripción respeta ausencia de cupo, turno completo y concurrencia.
- [ ] Pruebas automatizadas de reglas, integración y casos límite en verde.
- [x] Lint y compilación en verde.
- [x] Documentación actualizada.
- [ ] Criterios aceptados por el Product Owner.

## Secuencia de implementación prevista

1. Cerrar decisiones de negocio.
2. Versionar el esquema Supabase actual como línea base.
3. Crear migración con restricciones, autorización y operación atómica.
4. Implementar y probar el contrato de servicio.
5. Implementar la interacción de interfaz.
6. Integrar HU09 con el flujo de inscripción.
7. Ejecutar pruebas de aceptación, seguridad y concurrencia.
8. Actualizar documentación y presentar evidencia al PO.
