# Implementación de HU09

## Estado actual

La implementación local permite consultar turnos, buscar y filtrar por estado de cupo, abrir un formulario para definir o editar el máximo y validar las reglas básicas.

La base remota todavía no tiene aplicada la migración de HU09. Hasta instalarla, el formulario mostrará que la función `definir_cupo_turno` no existe. Tampoco hay turnos visibles en Supabase para una prueba manual completa.

## Archivos principales

| Archivo | Responsabilidad |
|---|---|
| `src/domain/cupo.ts` | Regla pura: entero positivo y nunca menor que inscriptos. |
| `src/services/turnos.ts` | Consulta `vista_calendario` e invoca la operación de dominio de Supabase. |
| `src/components/TurnosModule.tsx` | Listado, filtros, formulario, mensajes y actualización visual. |
| `supabase/migrations/20260923160000_hu09_definir_cupo.sql` | Restricción, triggers y función transaccional de PostgreSQL. |
| `tests/cupo.test.mjs` | Casos automatizados de la validación de cupo. |

## Flujo implementado

1. `TurnosModule` solicita los turnos al servicio.
2. El servicio lee la vista `vista_calendario`.
3. El empleado selecciona “Definir cupo” o “Editar cupo”.
4. El formulario rechaza vacío, cero, negativos, decimales y valores menores a los inscriptos.
5. El servicio invoca `definir_cupo_turno` mediante RPC.
6. PostgreSQL bloquea el turno, vuelve a contar inscripciones y guarda sólo si la regla sigue siendo válida.
7. El resultado actualizado vuelve a la interfaz.

La validación aparece en dos lugares por motivos distintos: la interfaz brinda respuesta rápida y PostgreSQL garantiza consistencia aunque existan operaciones simultáneas o clientes diferentes.

## Qué protege la migración

- `CHECK`: impide cupos no nulos menores o iguales a cero.
- Trigger sobre `turnos_clase`: impide reducir el cupo debajo de la ocupación.
- Trigger sobre `inscripciones`: impide inscribir sin cupo o cuando el turno está completo.
- Función `definir_cupo_turno`: concentra la operación de HU09 y usa bloqueo de fila para coordinar escrituras simultáneas.

La función usa `security invoker`: conserva los permisos y políticas RLS del usuario que la llama. No utiliza `service_role` ni una función privilegiada desde el navegador.

## Aplicación pendiente en Supabase

Debe ejecutarse el contenido de:

```text
supabase/migrations/20260923160000_hu09_definir_cupo.sql
```

Puede aplicarse desde Supabase SQL Editor o, cuando el proyecto esté vinculado con Supabase CLI, mediante el flujo de migraciones del equipo. Antes de aplicarla conviene conservar una copia de seguridad y confirmar las políticas RLS actuales.

No se debe copiar una secret key al repositorio para aplicar esta migración.

## Datos observados el 23/09/2026

Conteos visibles mediante la publishable key y las políticas actuales:

| Recurso | Filas visibles |
|---|---:|
| `alumnos` | 20 |
| `profesores` | 0 |
| `materias` | 0 |
| `turnos_clase` | 0 |
| `inscripciones` | 0 |
| `vista_calendario` | 0 |

Los datos de Supabase son compartidos y no dependen de una rama Git. El código del módulo de alumnos sí está en `origin/feature/alumnos` y todavía no fue fusionado en `development`.

## Verificaciones ejecutadas

- `npm run lint`: correcto.
- `npm test`: cinco pruebas aprobadas.
- `npm run build`: compilación de producción y TypeScript correctos.
- `GET http://localhost:3000`: respuesta HTTP 200.

## Pruebas pendientes

- aplicar la migración remota;
- crear o disponer de un turno de prueba mediante HU08;
- definir y volver a consultar un cupo;
- probar reducción igual y menor a los inscriptos;
- probar bloqueo de inscripción sin cupo y con cupo completo;
- probar concurrencia sobre el último lugar;
- confirmar RLS para lectura y modificación.
