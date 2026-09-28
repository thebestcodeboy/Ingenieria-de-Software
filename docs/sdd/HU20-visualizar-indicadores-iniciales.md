# HU20 — Visualizar indicadores iniciales

## Estado de la especificación

- Estado SDD: **implementada localmente; pendiente de validación del Product Owner con datos reales**.
- Actor: empleado autenticado de Mesa de Entrada.
- Objetivo: resumir el estado general de la actividad académica desde la opción **Inicio**.
- Última revisión: 28 de septiembre de 2026.

## Historia

**Como** empleado de Mesa de Entrada,

**quiero** consultar un panel de indicadores,

**para** conocer rápidamente el estado general de la actividad académica.

## Alcance

Incluye cantidades de entidades activas, aulas activas, turnos totales, clases y aulas utilizadas durante el día, ocupación agregada, estados de disponibilidad, actualización manual y estados de carga, vacío y error.

No incluye tendencias históricas, filtros por período, exportación, edición de datos, alertas ni navegación desde cada indicador.

## Decisiones de dominio

| ID | Decisión |
|---|---|
| RN-HU20-01 | Un registro es activo salvo que `activo = false` o su estado sea `inactivo`, `cancelado` o `cancelada`. |
| RN-HU20-02 | “Cursos activos” corresponde a registros activos de `cursos_ingreso`. |
| RN-HU20-03 | El total de turnos representa todos los turnos persistidos, incluidos los cancelados. |
| RN-HU20-04 | Las clases de hoy excluyen turnos cancelados. |
| RN-HU20-05 | Cupos, inscriptos y estados de disponibilidad excluyen turnos cancelados. |
| RN-HU20-06 | Un turno sin `cupo_maximo` se clasifica como “Sin cupo definido”. |
| RN-HU20-07 | Un turno con cupo y ocupación menor al cupo se clasifica como “Disponible”. |
| RN-HU20-08 | Un turno con cupo y ocupación igual o superior al cupo se clasifica como “Completo”. |
| RN-HU20-09 | La fecha del día se calcula en `America/Argentina/Buenos_Aires`. |
| RN-HU20-10 | Actualizar vuelve a consultar la fuente persistida; no recalcula sobre una copia anterior. |
| RN-HU20-11 | Un aula utilizada hoy es un `aula_numero` distinto, no vacío, asignado a por lo menos un turno vigente del día. Varias clases en la misma aula cuentan una sola vez. |

El modelo versionado no declara todavía una columna de cancelación. La implementación reconoce de forma defensiva `estado`, `status` o `activo = false`; cuando se formalice el estado del turno, deberá consolidarse en un único campo.

## Contrato de datos

Entrada del cálculo:

- filas de `alumnos`, `profesores`, `materias` y `cursos_ingreso`;
- filas consolidadas de `vista_calendario`;
- fecha local actual en formato `YYYY-MM-DD`.

Salida:

| Campo | Significado |
|---|---|
| `totalAlumnos` | Alumnos activos. |
| `totalProfesores` | Profesores activos. |
| `totalMaterias` | Materias activas. |
| `totalCursos` | Cursos de ingreso activos. |
| `totalAulas` | Aulas activas o registradas. |
| `totalTurnos` | Turnos persistidos. |
| `clasesHoy` | Turnos no cancelados programados para hoy. |
| `aulasUtilizadasHoy` | Aulas distintas asignadas a turnos no cancelados de hoy. |
| `totalInscriptos` | Suma de ocupaciones de turnos no cancelados. |
| `cupoTotal` | Suma de cupos definidos de turnos no cancelados. |
| `turnosDisponibles` | Turnos con lugares. |
| `turnosCompletos` | Turnos con cupo agotado o excedido. |
| `turnosSinCupo` | Turnos sin cupo definido. |

## Criterios de aceptación refinados

### CA-01 — Acceso

Dado un empleado de Mesa de Entrada, cuando selecciona **Inicio**, entonces visualiza el panel de indicadores.

### CA-02 — Entidades activas

Dado que existen entidades activas e inactivas, cuando carga el panel, entonces muestra únicamente las cantidades activas de alumnos, profesores, materias, cursos de ingreso y aulas.

### CA-03 — Actividad programada

Dado el conjunto de turnos, cuando carga el panel, entonces muestra el total persistido y la cantidad no cancelada programada para el día local.

### CA-04 — Comparación de ocupación

Dado que existen turnos no cancelados, cuando carga el panel, entonces compara gráficamente la suma de inscriptos con la suma de cupos definidos e informa ambos valores.

### CA-05 — Disponibilidad

Dado el conjunto de turnos no cancelados, cuando carga el panel, entonces diferencia disponibles, completos y sin cupo definido.

### CA-06 — Cancelaciones

Dado un turno cancelado, cuando se calculan ocupación y disponibilidad, entonces ese turno no modifica ninguno de esos indicadores ni las clases del día.

### CA-07 — Actualización

Dado un panel visible, cuando el empleado selecciona **Actualizar**, entonces se consultan nuevamente todas las fuentes y se indica la fecha y hora de la actualización exitosa.

### CA-08 — Estados de interfaz

Dada una consulta pendiente, vacía o fallida, entonces el panel muestra respectivamente un estado de carga, ausencia de actividad o error con acción de reintento.

### CA-09 — Uso diario de aulas

Dadas varias clases vigentes del día, cuando el panel calcula el uso de aulas, entonces muestra la cantidad de aulas distintas asignadas, sin duplicarlas y sin incluir las utilizadas solamente por clases canceladas.

## Estrategia de implementación

1. Mantener reglas y agregaciones en una función pura de dominio.
2. Usar un servicio único para consultar las cinco fuentes en paralelo.
3. Renderizar un componente cliente con carga inicial y actualización manual.
4. Integrar el componente únicamente en la rama administrativa de **Inicio**.
5. Probar clasificación, cancelaciones, activos y escenario vacío sin depender de Supabase.

## Trazabilidad

| Criterio | Regla | Evidencia |
|---|---|---|
| CA-01 | Acceso administrativo | `page.tsx` + `DashboardModule` |
| CA-02 | RN-HU20-01/02 | Prueba de activos |
| CA-03 | RN-HU20-03/04/09 | Prueba de resumen |
| CA-04 | RN-HU20-05 | Prueba de ocupación + barras UI |
| CA-05 | RN-HU20-06/07/08 | Prueba de clasificación |
| CA-06 | RN-HU20-04/05 | Prueba de cancelados |
| CA-07 | RN-HU20-10 | Botón Actualizar |
| CA-08 | Estados de consulta | Componente UI |
| CA-09 | RN-HU20-11 | Prueba de aulas distintas |

## Definition of Done

- [x] Especificación y decisiones registradas.
- [x] Reglas de agregación aisladas y probadas.
- [x] Servicio de consulta implementado.
- [x] Panel integrado en Inicio.
- [x] Carga, vacío, error y actualización representados.
- [x] Cancelados excluidos de disponibilidad y ocupación.
- [ ] Validación del Product Owner con datos reales.
- [ ] Confirmación y versionado del campo canónico de cancelación.
