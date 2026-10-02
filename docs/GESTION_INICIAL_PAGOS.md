# Cobros vinculados a actividades académicas

Antes de usar el formulario actualizado, ejecutar en el SQL Editor de Supabase la migración
`supabase/migrations/20261002190000_detalle_academico_pagos.sql`.

El formulario permite cobrar únicamente inscripciones confirmadas en turnos no cancelados.
Una actividad reúne las sesiones del mismo curso o clase particular y docente.
Por clase se elige una sesión; por semana se indica la fecha inicial y la cantidad de semanas;
por mes se indica el mes inicial y la cantidad de meses. El período debe contener al menos
una sesión con inscripción confirmada. La fecha de operación sigue siendo la fecha del cobro.

Se guardan la inscripción de referencia, fechas de cobertura y una copia del detalle académico
incluyendo los identificadores de las sesiones cubiertas. El concepto automático se conserva
en el historial y en el recibo existente. Los registros históricos no se reescriben.
Los borradores anteriores deben completar la actividad y el período antes de confirmarse.

Verificación manual después de aplicar la migración:
- Alumno sin inscripciones: no permite confirmar.
- Alumno inscripto en un curso y una particular: ofrece ambas actividades.
- Cobro por clase: muestra y guarda la sesión elegida.
- Cobro mensual emitido en otro mes: el recibo muestra el período abonado.
- Suspender y reanudar: conserva actividad, período, importe y referencia.
- Cancelación de la inscripción antes de confirmar: la base rechaza el vínculo.
- Recibos anteriores: mantienen su concepto y pueden imprimirse.

No se calculan saldos, deudas ni aranceles, ni se bloquean cobros repetidos.
