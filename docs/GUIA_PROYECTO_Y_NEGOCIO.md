# Instituto Ateneo — Guía del proyecto y visión de negocio

## Para qué existe el sistema

El sistema busca centralizar la gestión académica y administrativa del Instituto Ateneo. Su valor no está sólo en guardar datos: debe ayudar al personal a planificar clases, conocer la disponibilidad real y evitar decisiones contradictorias entre alumnos, profesores, materias, aulas, turnos e inscripciones.

La fuente de verdad de la operación es PostgreSQL, administrado por Supabase. La interfaz muestra ese estado y debe ejecutar reglas de negocio seguras; no debe inventar disponibilidad sólo en el navegador.

## Visión del producto

> Brindar al personal del Instituto Ateneo una herramienta única, clara y confiable para organizar la actividad académica, reducir errores administrativos y conocer el estado real de cada clase.

### Actores principales

- Empleado administrativo: registra, consulta y actualiza la operación académica.
- Alumno: persona que puede quedar asociada a materias, cursos o turnos mediante inscripciones.
- Profesor: docente asignado a materias y clases.
- Product Owner: prioriza valor, aclara reglas y acepta resultados; no decide sólo pantallas, sino el comportamiento del negocio.

### Resultados de negocio esperados

- evitar inscripciones por encima de la capacidad planificada;
- evitar clases habilitadas sin planificación de cupo;
- disponer de información consistente para atención y planificación;
- reducir controles manuales y datos duplicados;
- conservar reglas comprensibles y comprobables.

### Indicadores posibles

- cantidad de intentos de sobreinscripción bloqueados;
- porcentaje de turnos futuros con cupo definido;
- cantidad de inconsistencias de ocupación;
- tiempo promedio para configurar y consultar un turno;
- incidencias administrativas causadas por información desactualizada.

## Qué hace hoy el programa

El proyecto presenta un panel administrativo con navegación visual para alumnos, profesores, materias, cursos de ingreso, clases particulares, turnos, calendario, inscripciones y reportes.

La ruta actualmente activa:

- consulta cantidades de alumnos, profesores, materias y turnos;
- consulta la agenda del día desde `vista_calendario`;
- muestra horario, materia/actividad, profesor, aula, ocupación y cupo;
- ofrece búsqueda y filtro visual;
- todavía no implementa las altas ni ediciones anunciadas por sus botones.

El proyecto está en una etapa temprana: tiene una interfaz demostrativa conectada a datos, pero no todos los módulos del menú están implementados.

## Contexto del backlog

El tablero de trabajo es [Instituto Ateneo en Trello](https://trello.com/b/mxhW3XA8/instituto-ateneo). HU09 figura en **In Progress** y HU11 en **To Do** como la siguiente historia asignada al mismo responsable.

La secuencia de negocio relevante es:

1. HU08 programa el turno con actividad, profesor, aula, fecha y horario.
2. HU09 establece el cupo máximo de ese turno.
3. HU10 inscribe un alumno sin exceder las plazas.
4. HU11 permite consultar los turnos activos por día y semana.

Esta separación evita que HU09 incorpore responsabilidades de otras historias. HU09 no crea turnos, no implementa la pantalla de inscripción y no construye todavía el calendario semanal. Sí debe producir un cupo persistido y una regla segura que HU10 pueda respetar.

HU11, según el backlog, no incluye filtros por profesor, materia, aula o franja, vista mensual, exportación ni turnos recurrentes. La pantalla actual puede servir como base visual, pero sólo muestra la agenda del día y no satisface todavía la consulta semanal.

## Arquitectura actual

```text
Navegador
  └─ Next.js + React
       └─ cliente de Supabase
            └─ API administrada por Supabase
                 └─ PostgreSQL
```

### Tecnologías

- Next.js 16: estructura, compilación y ejecución de la aplicación web.
- React 19: componentes y estado de interfaz.
- TypeScript 5: tipado de parte del frontend; todavía convive con JavaScript.
- Supabase: PostgreSQL alojado y API de acceso a datos.
- Tailwind CSS 4: disponible, aunque la pantalla principal usa mayormente estilos inline.
- ESLint: controles estáticos de calidad.
- npm: administración de dependencias y scripts.

### Por qué Supabase sin Prisma

Supabase expone una API sobre PostgreSQL y su SDK permite consumirla. Por eso el proyecto puede consultar la base sin un ORM. Prisma sería otra estrategia: normalmente se ejecutaría en un backend de Next.js y accedería a PostgreSQL mediante una conexión de servidor.

No usar ORM no elimina la necesidad de diseñar correctamente tablas y relaciones, versionar migraciones, aplicar restricciones en la base, configurar RLS y probar reglas de negocio y concurrencia.

## Datos de negocio observados

El código y el esquema público permiten confirmar estas entidades:

- `alumnos`;
- `profesores`;
- `materias`;
- `turnos_clase`;
- `inscripciones`;
- `vista_calendario` como vista de consulta consolidada.

Para HU09 son relevantes:

- `turnos_clase.id`: identifica la clase programada;
- `turnos_clase.cupo_maximo`: conserva el límite;
- `inscripciones.turno_id`: asocia una inscripción al turno;
- `vista_calendario.inscriptos_actuales`: ocupación calculada;
- `vista_calendario.lugares_disponibles`: disponibilidad calculada.

## Explicación de HU09 desde negocio

El cupo responde “¿cuántos alumnos puede aceptar esta clase concreta?”. No responde cuántas aulas existen ni define la capacidad general de una materia.

Ejemplo:

- El instituto posee 10 aulas.
- El turno de Matemática del lunes usa el aula 3.
- El administrador define un cupo de 25.
- Si hay 18 inscriptos, quedan 7 lugares.
- Si hay 25, el turno está completo.
- Si no se definió cupo, la inscripción permanece cerrada.

Que el aula se llame “Aula 3” o que existan diez aulas no limita el turno a diez estudiantes. Son conceptos diferentes: **asignación de espacio** y **cantidad de plazas**.

## Cómo se trabaja con SDD

SDD significa Specification-Driven Development: la especificación guía el desarrollo.

El flujo aplicado es:

1. comprender el problema y el valor de negocio;
2. revisar el sistema existente;
3. aclarar términos y reglas;
4. transformar criterios generales en ejemplos comprobables;
5. decidir dónde se garantiza cada regla;
6. definir pruebas antes de implementar;
7. escribir el código que satisface la especificación;
8. demostrar los criterios al Product Owner.

La especificación no es sólo documentación final. Funciona como contrato compartido entre negocio, desarrollo y pruebas.

## Responsabilidad del Product Owner

Como Product Owner, las preguntas principales no deberían ser “¿qué botón agregamos?” o “¿qué librería usamos?”, sino:

- ¿qué problema del instituto resolvemos?;
- ¿qué resultado tiene valor?;
- ¿qué comportamiento se considera correcto?;
- ¿qué casos límite pueden afectar la operación?;
- ¿qué queda dentro y fuera de alcance?;
- ¿qué evidencia necesito para aceptar la historia?

El PO no necesita indicar cómo escribir SQL o React. Sí debe decidir, por ejemplo, qué inscripciones consumen cupo, qué roles pueden modificarlo y si un turno pasado puede editarse.

## Por qué las reglas críticas van en la base

Una validación del formulario mejora la experiencia, pero puede ser evitada o quedar desactualizada. Además, dos personas pueden operar al mismo tiempo.

Si queda un lugar y dos inscripciones leen esa disponibilidad a la vez, ambas podrían intentar guardarse. La base de datos debe resolver esa competencia de forma atómica para que sólo una tenga éxito. Esta es una regla de consistencia, no meramente de presentación.

También conviene que la base impida un cupo cero o negativo aunque la operación llegue desde otra pantalla o integración.

## `NULL` no significa cero

- `NULL`: todavía no se definió el cupo; la clase no está habilitada para inscripciones.
- `0`: sería un cupo configurado sin plazas, pero HU09 exige enteros mayores que cero, por lo tanto es inválido.
- Cupo 20 con 20 inscriptos: el cupo está definido, pero la clase está completa.

Esta distinción permite explicar correctamente el estado y evita confundir “pendiente de configuración” con “completo”.

## Seguridad con Supabase

La publishable key puede estar en el navegador; no concede permisos ilimitados por sí sola. La seguridad real depende de autenticación y políticas RLS.

Una secret key o `service_role` nunca debe incluirse en variables `NEXT_PUBLIC_*`, porque quedaría expuesta al navegador y podría eludir las políticas de seguridad.

Para afirmar que sólo empleados administrativos modifican cupos, el proyecto todavía necesita autenticación, roles y políticas verificables.

## Estado técnico y deuda actual

- `src/app/page.tsx` concentra consulta, lógica y una interfaz extensa en un único componente cliente.
- `src/services/turnos.js` y otros servicios están vacíos.
- `src/pages/Home.jsx` contiene contenido legado duplicado y texto de comandos incrustado; ESLint no puede analizarlo.
- Hay textos con problemas de codificación de caracteres.
- No existen pruebas automatizadas en el repositorio.
- No existen migraciones o esquema SQL versionados.
- No hay autenticación o autorización implementadas en el código visible.
- La navegación cambia el rótulo activo, pero no implementa módulos separados.
- El diagnóstico de ESLint previo a HU09 informa cinco errores y una advertencia.

Estas deudas no invalidan la idea del producto, pero deben considerarse al planificar una implementación confiable.

## Preguntas típicas de examen

### ¿Por qué el cupo pertenece al turno?

Porque cada clase programada puede tener una planificación diferente aunque comparta materia, profesor o aula con otras clases.

### ¿Por qué no alcanza con validar el número en React?

Porque el navegador no es una frontera de seguridad y puede haber operaciones concurrentes. La base debe proteger la invariante.

### ¿Qué es una invariante?

Una condición que siempre debe mantenerse. En HU09: el cupo, si existe, es positivo y nunca queda por debajo de la ocupación válida.

### ¿Por qué una vista para el calendario?

Porque reúne datos de varias entidades y valores calculados en una forma cómoda para consultar. Una vista facilita lectura, pero las reglas de escritura deben protegerse aparte.

### ¿Por qué se necesita una operación atómica?

Para que leer la ocupación, validar y guardar se comporten como una sola unidad. Así otro proceso no puede cambiar el estado en el medio y producir sobreinscripción.

### ¿Qué aporta RLS?

Permite definir en PostgreSQL qué filas y operaciones puede realizar cada usuario. Es especialmente importante cuando el frontend consume Supabase directamente.

### ¿Supabase reemplaza a Prisma?

No son equivalentes. Para este proyecto, la API y el SDK de Supabase cubren el acceso a datos que podría motivar un ORM. Prisma podría agregarse en una arquitectura con backend, pero no es obligatorio.

### ¿Cómo demuestra el PO que HU09 está terminada?

Ejecutando los escenarios acordados, incluyendo valores inválidos, reducción al límite, reducción por debajo de inscriptos, persistencia, falta de cupo, turno completo, permisos y concurrencia.

## Documentos relacionados

- Especificación detallada: [`sdd/HU09-definir-cupo-clase.md`](sdd/HU09-definir-cupo-clase.md).
- Especificación de calendario personal: [`sdd/HU11-calendario-personal-diario-semanal.md`](sdd/HU11-calendario-personal-diario-semanal.md).
- Entrada general del repositorio: [`../README.md`](../README.md).
