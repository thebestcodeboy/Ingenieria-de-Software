-- DEMOSTRACIÓN: datos ficticios. Ejecutar completo en Supabase SQL Editor como postgres.
-- NO se ejecuta automáticamente. Requiere las migraciones existentes, incluidas HU27.
-- 4 profesores, 10 alumnos, 10 materias, 3 cursos, 7 particulares.
-- 6 semanas: 96 turnos, 222 inscripciones, 62 obligaciones y 61 pagos.
-- Dos morosos NUEVOS: Emilia $20.000 y Tomás $50.000 a la fecha de corte.
-- No borra ni actualiza registros académicos preexistentes; ante colisiones, aborta.
-- Agrega 3 carreras solo si no existen y 1 aula nueva para no cruzar aulas existentes.
-- Todo el lote se confirma o revierte junto. Una segunda ejecución completa se omite.
-- Las cuentas de acceso NO se crean aquí: habilitarlas desde Alumnos/Profesores en la app.
-- El estado académico es ACTIVO; acceso_portal queda false hasta crear credenciales.
-- Mercado Pago es solamente un medio registrado: NO ejecuta ningún cobro externo.
-- No se deshabilitan triggers, RLS ni reglas de cupos/pagos.

begin;
set local timezone = 'America/Argentina/Buenos_Aires';
set local lock_timeout = '10s';
select pg_advisory_xact_lock(hashtext('ateneo-demo-calendarios-2026-v1'));

-- Identificadores deterministas exclusivos de este lote, sin extensiones adicionales.
create or replace function pg_temp.demo_id(clave text) returns uuid
language sql immutable as $$ select md5('ateneo-demo-calendarios-2026-v1:' || clave)::uuid $$;

create temp table demo_config on commit drop as
select date '2026-10-19' as inicio, date '2026-11-27' as fin,
       current_date as corte,
       'DEMO CALENDARIOS OCT-NOV 2026 V1'::text as marca;

create temp table demo_prof(n integer primary key, nombre text, apellido text, dni text, franja text) on commit drop;
insert into demo_prof values
 (1,'VALERIA','SUÁREZ','30482716','Mañana'),
 (2,'MARTÍN','PEREYRA','32715804','Tarde'),
 (3,'LUCIANA','TORRES','34206591','Mañana'),
 (4,'NICOLÁS','MEDINA','29843627','Tarde');

create temp table demo_alumno(n integer primary key, nombre text, apellido text, dni text, curso integer) on commit drop;
insert into demo_alumno values
 (1,'SOFÍA','GONZÁLEZ','47182635',1), (2,'MATEO','RODRÍGUEZ','46759208',1),
 (3,'VALENTINA','LÓPEZ','48031746',1), (4,'BENJAMÍN','FERNÁNDEZ','47608193',1),
 (5,'MARTINA','DÍAZ','46925817',2), (6,'JOAQUÍN','ROMERO','48217054',2),
 (7,'CATALINA','ACOSTA','47394682',2), (8,'SANTIAGO','RUIZ','46813529',3),
 (9,'EMILIA','HERRERA','48105936',3), (10,'TOMÁS','CASTRO','47562401',3);

create temp table demo_curso(n integer primary key, nombre text, carrera text, precio numeric) on commit drop;
insert into demo_curso values
 (1,'INGRESO A INGENIERÍA','INGENIERÍA',60000),
 (2,'INGRESO A ARQUITECTURA','ARQUITECTURA',55000),
 (3,'INGRESO A CIENCIAS ECONÓMICAS','CIENCIAS ECONÓMICAS',50000);

create temp table demo_materia(n integer primary key, nombre text, profesor integer, curso integer) on commit drop;
insert into demo_materia values
 (1,'MATEMÁTICA PARA INGENIERÍA',1,1), (2,'ÁLGEBRA INICIAL',1,3),
 (3,'GEOMETRÍA ANALÍTICA',1,2), (4,'FÍSICA PARA INGENIERÍA',2,1),
 (5,'QUÍMICA GENERAL',2,1), (6,'DIBUJO TÉCNICO',3,2),
 (7,'INTRODUCCIÓN AL DISEÑO ARQUITECTÓNICO',3,2), (8,'SISTEMAS DE REPRESENTACIÓN',3,2),
 (9,'CONTABILIDAD BÁSICA',4,3), (10,'INTRODUCCIÓN A LA ECONOMÍA',4,3);

create temp table demo_particular(n integer primary key, nombre text, materia integer, alumno integer, precio numeric) on commit drop;
insert into demo_particular values
 (1,'APOYO DE ÁLGEBRA INICIAL',2,1,12000),
 (2,'APOYO DE GEOMETRÍA ANALÍTICA',3,3,12000),
 (3,'APOYO DE FÍSICA PARA INGENIERÍA',4,2,15000),
 (4,'APOYO DE QUÍMICA GENERAL',5,4,15000),
 (5,'APOYO DE DIBUJO TÉCNICO',6,5,14000),
 (6,'APOYO DE CONTABILIDAD BÁSICA',9,8,13000),
 (7,'APOYO DE INTRODUCCIÓN A LA ECONOMÍA',10,9,13000);

-- Día ISO: lunes=1. Solo 2 turnos diarios como máximo por persona en este lote.
create temp table demo_horario(n integer primary key, dia integer, hora time, materia integer, curso integer, particular integer) on commit drop;
insert into demo_horario values
 (1,1,'08:00',1,1,null), (2,1,'10:00',2,null,1), (3,1,'14:00',9,3,null),
 (4,2,'08:00',6,2,null), (5,2,'10:00',6,null,5),
 (6,2,'14:00',4,1,null), (7,2,'16:00',4,null,3),
 (8,3,'08:00',2,3,null), (9,3,'10:00',3,null,2), (10,3,'14:00',10,null,7),
 (11,4,'08:00',7,2,null), (12,4,'14:00',5,1,null), (13,4,'16:00',5,null,4),
 (14,5,'08:00',8,2,null), (15,5,'14:00',10,3,null), (16,5,'16:00',9,null,6);

create temp table demo_resultado(estado text, aula integer, fecha_corte date) on commit drop;

do $$
declare
 cfg record; r record; ob record; v_aula integer; v_carrera public.carreras.id%type;
 v_inscripcion uuid; v_pago numeric; v_cantidad integer; v_mora numeric; v_total numeric;
 v_numero_pago integer := 0;
begin
 select * into cfg from demo_config;
 -- El marcador es el ID del curso 1; no actualizamos datos en una repetición.
 if exists(select 1 from public.cursos_ingreso where id=pg_temp.demo_id('curso:1')) then
   if (select count(*) from public.turnos_clase t where t.id in
       (select pg_temp.demo_id('turno:' || s || ':' || h.n) from generate_series(0,5) s cross join demo_horario h)) <> 96
      or (select count(*) from public.inscripciones i where i.alumno_id in
       (select pg_temp.demo_id('alumno:' || n) from demo_alumno)) <> 222 then
     raise exception 'El lote ya existe pero fue modificado o está incompleto. Revisar antes de repetir.';
   end if;
   insert into demo_resultado values ('LOTE YA EXISTENTE: no se insertó ni modificó nada',null,cfg.corte);
   return;
 end if;
 if cfg.inicio <= cfg.corte or extract(isodow from cfg.inicio)<>1 or cfg.fin<>cfg.inicio+39 then
   raise exception 'Configurar inicio en un lunes FUTURO y fin=inicio+39 días. Las reglas actuales rechazan inscripciones pasadas.';
 end if;
 -- Fallar antes de escribir si faltan las partes esenciales de HU27.
 if to_regclass('public.obligaciones_pago') is null or
    to_regprocedure('public.generar_obligacion_inscripcion()') is null or
    to_regprocedure('public.recalcular_obligacion_pago(uuid)') is null then
   raise exception 'Faltan migraciones HU27: obligaciones, tarifas automáticas y aplicación de pagos.';
 end if;
 if not exists(select 1 from pg_trigger where tgrelid='public.inscripciones'::regclass
      and tgname='generar_obligacion_al_confirmar_inscripcion' and tgenabled<>'D') then
   raise exception 'El trigger de obligaciones automáticas no está habilitado.';
 end if;
 if exists(select 1 from public.profesores p join demo_prof d on p.dni::text=d.dni)
    or exists(select 1 from public.alumnos a join demo_alumno d on a.dni::text=d.dni) then
   raise exception 'Algún DNI ficticio ya existe. Cambiar el DNI en las tablas temporales; no se reutilizan ni pisan personas.';
 end if;
 if exists(select 1 from public.materias m join demo_materia d on upper(trim(m.nombre))=d.nombre)
    or exists(select 1 from public.cursos_ingreso c join demo_curso d on upper(trim(c.nombre))=d.nombre)
    or exists(select 1 from public.clases_particulares p join demo_particular d on upper(trim(p.nombre))=d.nombre) then
   raise exception 'Ya existe algún nombre de materia/curso/particular del ejemplo. Ajustar el nombre en este archivo para crear registros nuevos.';
 end if;
 -- Aula exclusiva: la nueva numeración se obtiene del máximo existente bajo bloqueo.
 lock table public.aulas in share row exclusive mode;
 select coalesce(max(numero::integer),0)+1 into v_aula from public.aulas;
 insert into public.aulas(numero,descripcion,capacidad,activo)
 values(v_aula,'AULA DEMO OCT-NOV 2026',12,true);

 -- Carreras de catálogo. Se reutiliza solo la carrera, nunca personas o actividades.
 for r in select * from demo_curso order by n loop
   select id into v_carrera from public.carreras where upper(trim(nombre))=r.carrera order by id limit 1;
   if v_carrera is null then
     insert into public.carreras(nombre) values(r.carrera) returning id into v_carrera;
   end if;
   insert into public.materias(id,nombre,nivel,area,activo)
   select pg_temp.demo_id('materia:' || m.n),m.nombre,'Universitario',r.carrera,true
   from demo_materia m where m.curso=r.n;
   insert into public.carrera_materias(carrera_id,materia_id)
   select v_carrera,pg_temp.demo_id('materia:' || n) from demo_materia where curso=r.n;
   insert into public.cursos_ingreso(id,nombre,descripcion,activo,fecha_inicio,fecha_fin,precio,modalidad_cobro,plazo_vencimiento_dias)
   values(pg_temp.demo_id('curso:' || r.n),r.nombre,cfg.marca,true,cfg.inicio,cfg.fin,r.precio,'MES',10);
   insert into public.curso_ingreso_materias(curso_id,materia_id)
   select pg_temp.demo_id('curso:' || r.n),pg_temp.demo_id('materia:' || m.n)
   from demo_materia m where m.curso=r.n and m.n<>3; -- Geometría se ofrece solo como particular.
 end loop;
 for r in select * from demo_prof order by n loop
   -- jsonb_populate_record respeta el tipo real de DNI, arrays y disponibilidad del esquema.
   insert into public.profesores(id,nombre,apellido,dni,email,telefono,activo,acceso_portal,materias_ids,turnos,disponibilidad)
   select p.id,p.nombre,p.apellido,p.dni,p.email,p.telefono,p.activo,p.acceso_portal,p.materias_ids,p.turnos,p.disponibilidad
   from jsonb_populate_record(null::public.profesores,jsonb_build_object(
     'id',pg_temp.demo_id('profesor:' || r.n),'nombre',r.nombre,'apellido',r.apellido,'dni',r.dni,
     'email','demo.profesor' || r.n || '@example.invalid','telefono','351555' || lpad((1000+r.n)::text,4,'0'),
     'activo',true,'acceso_portal',false,
     'materias_ids',(select jsonb_agg(pg_temp.demo_id('materia:' || n)) from demo_materia where profesor=r.n),
     'turnos',jsonb_build_array(r.franja),
     'disponibilidad',jsonb_build_array(jsonb_build_object('franja',r.franja,
        'horaInicio',case when r.franja='Mañana' then '08:00' else '14:00' end,
        'horaFin',case when r.franja='Mañana' then '12:00' else '18:00' end)))) p;
   insert into public.profesor_materia(profesor_id,materia_id)
   select pg_temp.demo_id('profesor:' || r.n),pg_temp.demo_id('materia:' || n) from demo_materia where profesor=r.n;
 end loop;
 for r in select * from demo_alumno order by n loop
   insert into public.alumnos(id,nombre,apellido,dni,email,telefono,direccion,activo,acceso_portal)
   select a.id,a.nombre,a.apellido,a.dni,a.email,a.telefono,a.direccion,a.activo,a.acceso_portal
   from jsonb_populate_record(null::public.alumnos,jsonb_build_object(
     'id',pg_temp.demo_id('alumno:' || r.n),'nombre',r.nombre,'apellido',r.apellido,'dni',r.dni,
     'email','demo.alumno' || r.n || '@example.invalid','telefono','351555' || lpad((2000+r.n)::text,4,'0'),
     'direccion','Calle de Demostración ' || (100+r.n),'activo',true,'acceso_portal',false)) a;
 end loop;
 insert into public.clases_particulares(id,nombre,materia_id,nivel,activo,precio,plazo_vencimiento_dias)
 select pg_temp.demo_id('particular:' || n),nombre,pg_temp.demo_id('materia:' || materia),'universitario',true,precio,0
 from demo_particular;

 -- 16 sesiones semanales durante 6 semanas; un solo aula, sin solapamientos.
 insert into public.turnos_clase(id,tipo_actividad,materia_id,profesor_id,aula_numero,cupo_maximo,fecha,hora_inicio,hora_fin,curso_id,clase_particular_id,estado,cancelado,serie_id)
 select pg_temp.demo_id('turno:' || s || ':' || h.n),
   case when h.curso is not null then 'curso_ingreso' else 'clase_particular' end,
   pg_temp.demo_id('materia:' || h.materia),pg_temp.demo_id('profesor:' || m.profesor),v_aula,
   case when h.curso is not null then 8 else 3 end,
   cfg.inicio+s*7+h.dia-1,h.hora,h.hora+interval '1 hour',
   case when h.curso is not null then pg_temp.demo_id('curso:' || h.curso) end,
   case when h.particular is not null then pg_temp.demo_id('particular:' || h.particular) end,
   'activo',false,pg_temp.demo_id('serie:' || h.n)
 from generate_series(0,5) s cross join demo_horario h join demo_materia m on m.n=h.materia;

 insert into public.inscripciones(id,alumno_id,turno_id,estado)
 select pg_temp.demo_id('inscripcion:' || a.n || ':' || s || ':' || h.n),pg_temp.demo_id('alumno:' || a.n),
   pg_temp.demo_id('turno:' || s || ':' || h.n),'confirmado'
 from generate_series(0,5) s cross join demo_horario h
 join demo_alumno a on (h.curso is not null and a.curso=h.curso)
   or exists(select 1 from demo_particular p where p.n=h.particular and p.alumno=a.n)
 order by s,h.dia,h.hora,a.n;

 select count(*) into v_cantidad from public.obligaciones_pago o
 where o.alumno_id in(select pg_temp.demo_id('alumno:' || n) from demo_alumno);
 if v_cantidad<>62 then raise exception 'Se esperaban 62 obligaciones automáticas; se obtuvieron %. Todo el lote se revierte.',v_cantidad; end if;

 -- Anticipo del primer mes: emitido antes de hoy y vencido ayer, sin inventar clases pasadas.
 -- Solo se ajustan obligaciones recién creadas para estos diez alumnos.
 update public.obligaciones_pago o set fecha_emision=cfg.corte-10,fecha_vencimiento=cfg.corte-1
 where o.alumno_id in(select pg_temp.demo_id('alumno:' || n) from demo_alumno)
   and o.clave_facturacion like 'curso:%'
   and o.periodo_desde=date_trunc('month',cfg.inicio)::date;

 -- Se pagan también noviembre y las particulares por adelantado: quedan SOLO dos morosos.
 for ob in select o.*,a.n as alumno_n from public.obligaciones_pago o
   join demo_alumno a on o.alumno_id=pg_temp.demo_id('alumno:' || a.n)
   order by a.n,o.periodo_desde,o.clave_facturacion
 loop
   v_pago:=ob.importe_original;
   if ob.clave_facturacion like 'curso:%' and ob.periodo_desde=date_trunc('month',cfg.inicio)::date then
     if ob.alumno_n=10 then continue; end if;
     if ob.alumno_n=9 then v_pago:=30000; end if;
   end if;
   v_numero_pago := v_numero_pago + 1;
   -- Comprobante corto (11 caracteres), único por pago y exclusivo del lote.
   -- Se conserva la inscripción real y el período realmente cubierto por el pago.
   insert into public.pagos(id,comprobante,alumno_id,obligacion_id,inscripcion_id,periodo_desde,periodo_hasta,
     detalle_academico,concepto,modalidad,cantidad,importe,medio_pago,fecha,estado,observaciones)
   select pg_temp.demo_id('pago:' || ob.id),
     'DEMO26-' || lpad(v_numero_pago::text,4,'0'),ob.alumno_id,ob.id,ob.inscripcion_id,ob.periodo_desde,ob.periodo_hasta,
     jsonb_build_object('actividad',ob.actividad_nombre,'docente',concat_ws(', ',p.apellido,p.nombre),
       'materias',jsonb_build_array(m.nombre),'inscripciones',jsonb_build_array(ob.inscripcion_id::text)),
     ob.concepto,case when t.curso_id is not null then 'Mes' else 'Clase' end,1,v_pago,
     case (ob.alumno_n-1)%3 when 0 then 'Efectivo' when 1 then 'Transferencia' else 'Mercado Pago' end,
     cfg.corte,'CONFIRMADO',cfg.marca || ' · pago simulado, sin transacción externa'
   from public.inscripciones i join public.turnos_clase t on t.id=i.turno_id
   join public.profesores p on p.id=t.profesor_id join public.materias m on m.id=t.materia_id
   where i.id=ob.inscripcion_id;
 end loop;

 -- Comprobaciones transaccionales: cualquier diferencia aborta TODA la carga.
 select count(*),coalesce(sum(saldo_pendiente),0) into v_cantidad,v_mora
 from public.obligaciones_pago where alumno_id in(select pg_temp.demo_id('alumno:' || n) from demo_alumno)
   and saldo_pendiente>0 and fecha_vencimiento<cfg.corte;
 if v_cantidad<>2 or v_mora<>70000 then raise exception 'Mora inesperada: % obligaciones, $%.',v_cantidad,v_mora; end if;
 if exists(select 1 from public.turnos_clase where profesor_id in
   (select pg_temp.demo_id('profesor:' || n) from demo_prof) group by profesor_id,fecha having count(*)>3) then
   raise exception 'Un profesor tiene más de tres clases diarias.';
 end if;
 if exists(select 1 from public.inscripciones i join public.turnos_clase t on t.id=i.turno_id
   where i.alumno_id in(select pg_temp.demo_id('alumno:' || n) from demo_alumno)
   group by i.alumno_id,t.fecha having count(*)>3) then raise exception 'Un alumno tiene más de tres clases diarias.'; end if;
 if exists(select 1 from public.turnos_clase a join public.turnos_clase b on a.id<b.id and a.fecha=b.fecha
   and a.hora_inicio<b.hora_fin and b.hora_inicio<a.hora_fin
   where a.aula_numero=v_aula and (a.aula_numero=b.aula_numero or a.profesor_id=b.profesor_id)) then
   raise exception 'Se detectó una superposición de aula o profesor.';
 end if;
 if exists(select 1 from public.inscripciones a join public.inscripciones b on a.alumno_id=b.alumno_id and a.id<b.id
   join public.turnos_clase ta on ta.id=a.turno_id join public.turnos_clase tb on tb.id=b.turno_id
   where a.alumno_id in(select pg_temp.demo_id('alumno:' || n) from demo_alumno)
   and ta.fecha=tb.fecha and ta.hora_inicio<tb.hora_fin and tb.hora_inicio<ta.hora_fin) then
   raise exception 'Se detectó una superposición de alumno.';
 end if;
 if (select count(*) from public.inscripciones where alumno_id in(select pg_temp.demo_id('alumno:' || n) from demo_alumno))<>222
   or (select count(*) from public.pagos where observaciones like cfg.marca || '%')<>61 then
   raise exception 'Cantidad de inscripciones o pagos inesperada.';
 end if;
 select sum(importe) into v_total from public.pagos where observaciones like cfg.marca || '%';
 if v_total<>1604000 then raise exception 'Recaudación inesperada: $% (esperado $1.604.000).',v_total; end if;
 insert into demo_resultado values ('LOTE CREADO CORRECTAMENTE',v_aula,cfg.corte);
end;
$$;

-- Resultados: solo este lote, no los demás alumnos/morosos del instituto.
select * from demo_resultado;
select p.apellido,p.nombre,p.dni,p.activo,p.acceso_portal from public.profesores p
where p.id in(select pg_temp.demo_id('profesor:' || n) from demo_prof) order by p.apellido;
select a.apellido,a.nombre,a.dni,a.activo,c.nombre as curso from demo_alumno d
join public.alumnos a on a.id=pg_temp.demo_id('alumno:' || d.n)
join public.cursos_ingreso c on c.id=pg_temp.demo_id('curso:' || d.curso) order by a.apellido;
select a.apellido,a.nombre,sum(o.saldo_pendiente) as deuda_vencida
from public.obligaciones_pago o join public.alumnos a on a.id=o.alumno_id cross join demo_config c
where a.id in(select pg_temp.demo_id('alumno:' || n) from demo_alumno)
and o.saldo_pendiente>0 and o.fecha_vencimiento<c.corte group by a.id,a.apellido,a.nombre order by a.apellido;
select medio_pago,count(*) as pagos,sum(importe) as recaudacion from public.pagos
where observaciones like (select marca || '%' from demo_config) group by medio_pago order by medio_pago;
commit;
