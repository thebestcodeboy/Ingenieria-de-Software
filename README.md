# Sistema de Gestión Académica — Instituto Ateneo

Aplicación web en desarrollo para centralizar alumnos, profesores, materias, turnos de clase e inscripciones del Instituto Ateneo.

## Documentación

- [Guía del proyecto, arquitectura y visión de negocio](docs/GUIA_PROYECTO_Y_NEGOCIO.md)
- [Especificación SDD de HU09 — Definir cupo de una clase](docs/sdd/HU09-definir-cupo-clase.md)
- [Implementación y verificación de HU09](docs/IMPLEMENTACION_HU09.md)

## Tecnologías principales

- Next.js 16 y React 19
- TypeScript y JavaScript
- Supabase/PostgreSQL
- Tailwind CSS 4
- ESLint y npm

## Ejecución local

Crear `.env.local` en la raíz del proyecto con:

```env
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_REEMPLAZAR
```

No colocar una secret key ni `service_role` en variables `NEXT_PUBLIC_*`.

Instalar dependencias y ejecutar:

```bash
npm install
npm run dev
```

En PowerShell, si la política local bloquea `npm.ps1`, se puede usar `npm.cmd run dev` sin cambiar la configuración de seguridad del sistema.

## Estado actual

El panel principal consulta Supabase y muestra la agenda del día. Varios módulos, acciones y reglas de negocio todavía están pendientes. HU09 se encuentra especificada y a la espera de decisiones de negocio antes de comenzar su implementación.
