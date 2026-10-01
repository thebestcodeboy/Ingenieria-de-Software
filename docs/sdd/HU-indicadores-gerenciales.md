# HU - Visualizar indicadores gerenciales

## Estado de la especificacion

- Estado SDD: **implementada localmente; pendiente de validacion con datos reales**.
- Actor: usuario autenticado con rol `gerente`.
- Objetivo: resumir inscripciones, demanda y actividad academica del mes.
- Ultima revision: 1 de octubre de 2026.

## Historia

**Como** gerente,

**quiero** consultar indicadores mensuales sobre inscripciones, demanda y actividad academica,

**para** evaluar el desempeno general de la institucion y apoyar la toma de decisiones.

## Alcance

Incluye nuevas inscripciones del mes, comparacion con el mes anterior, ocupacion de cursos, cursos con mayor y menor demanda, promedio semanal de clases, actualizacion manual y estados de carga, vacio y error.

No incluye exportacion, filtros de fechas, proyecciones, indicadores economicos ni modificacion de datos.

## Decisiones de dominio

| ID | Decision |
|---|---|
| RN-GER-01 | Los periodos son meses calendario calculados en `America/Argentina/Buenos_Aires`. |
| RN-GER-02 | Una inscripcion pertenece al mes de su `created_at`; se admite `fecha_inscripcion` como compatibilidad. |
| RN-GER-03 | Las inscripciones con estado `cancelado`, `cancelada` o `cancelled` no se contabilizan. |
| RN-GER-04 | Ocupacion, demanda y actividad mensual excluyen turnos cancelados. |
| RN-GER-05 | Ocupacion y demanda consideran solo turnos identificados como cursos de ingreso. |
| RN-GER-06 | La ocupacion promedio es ponderada: suma de inscriptos / suma de cupos definidos y positivos. |
| RN-GER-07 | La demanda de un curso es la suma de sus inscriptos en turnos vigentes del mes. |
| RN-GER-08 | Ante empate de demanda se usa el nombre del curso en orden alfabetico. |
| RN-GER-09 | El promedio semanal divide las clases vigentes del mes por `ceil(diasDelMes / 7)`. |
| RN-GER-10 | Actualizar vuelve a consultar Supabase y conserva los ultimos datos si falla una recarga. |
| RN-GER-11 | El servicio rechaza la consulta si la sesion no pertenece al rol `gerente`; la interfaz tambien restringe el modulo. |

## Contrato de datos

Entrada del calculo:

- inscripciones con fecha y estado;
- turnos consolidados de `vista_calendario`;
- fecha local de referencia en formato `YYYY-MM-DD`.

Salida:

| Campo | Significado |
|---|---|
| `inscripcionesMesActual` | Inscripciones vigentes creadas durante el mes actual. |
| `inscripcionesMesAnterior` | Inscripciones vigentes creadas durante el mes anterior. |
| `diferenciaInscripciones` | Diferencia absoluta entre ambos meses. |
| `variacionInscripciones` | Variacion porcentual respecto del mes anterior; `null` si no existe base comparable. |
| `ocupacionPromedio` | Porcentaje agregado de ocupacion de cursos del mes. |
| `demandaCursos` | Cursos del mes ordenados por cantidad de inscriptos para el grafico de barras. |
| `cursoMayorDemanda` | Curso con mas inscriptos del mes. |
| `cursoMenorDemanda` | Curso con menos inscriptos del mes. |
| `clasesProgramadasMes` | Turnos vigentes programados durante el mes. |
| `promedioSemanalClases` | Promedio de clases vigentes por semana del mes. |
| `hayActividad` | Indica si existe informacion mensual para presentar. |

## Criterios de aceptacion refinados

### CA-01 - Inscripciones mensuales

Dadas inscripciones vigentes de distintos meses, cuando carga el panel, entonces muestra las del mes actual y las compara con las del mes anterior.

### CA-02 - Ocupacion

Dados turnos de cursos con cupos definidos, cuando carga el panel, entonces muestra el porcentaje agregado de ocupacion sin incluir turnos cancelados.

### CA-03 - Demanda

Dados cursos con actividad durante el mes, cuando carga el panel, entonces identifica el de mayor y el de menor demanda.
La comparacion se presenta mediante barras verticales, con desplazamiento horizontal cuando la cantidad de cursos excede el ancho disponible.

### CA-04 - Actividad academica

Dados turnos vigentes del mes, cuando carga el panel, entonces muestra el total y el promedio semanal de clases programadas.

### CA-05 - Actualizacion y estados

Cuando la consulta esta pendiente, vacia o falla, entonces se muestran estados claros; al seleccionar **Actualizar**, se vuelven a consultar las fuentes persistidas.

### CA-06 - Acceso

Dado un usuario sin rol `gerente`, cuando intenta consultar el modulo, entonces no se ejecuta la consulta y se presenta acceso restringido.

## Estrategia de implementacion

1. Mantener periodos, filtros y agregaciones en una funcion pura de dominio.
2. Probar comparacion mensual, cancelaciones, ocupacion, demanda y vacio sin depender de Supabase.
3. Consultar inscripciones y calendario mediante un servicio con control de rol.
4. Renderizar un componente cliente independiente con carga, error, vacio y actualizacion.
5. Reemplazar el placeholder de **Reportes** sin modificar el flujo de login.

## Trazabilidad

| Criterio | Evidencia esperada |
|---|---|
| CA-01 | Prueba de comparacion mensual + tarjetas del panel |
| CA-02 | Prueba de ocupacion y cancelaciones + barra de ocupacion |
| CA-03 | Prueba de demanda + panel de cursos destacados |
| CA-04 | Prueba de promedio semanal + tarjeta de actividad |
| CA-05 | Estados y boton del componente |
| CA-06 | Guardia del servicio + proteccion en `page.tsx` |

## Definition of Done

- [x] Especificacion y reglas documentadas.
- [x] Pruebas de dominio implementadas.
- [x] Servicio conectado a Supabase.
- [x] Panel integrado en Reportes.
- [x] Estados de carga, vacio, error y actualizacion implementados.
- [x] Verificacion automatizada completada.
- [ ] Validacion con datos reales por el Product Owner.
