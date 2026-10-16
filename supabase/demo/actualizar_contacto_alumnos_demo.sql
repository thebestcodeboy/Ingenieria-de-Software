-- Actualiza contactos, descripciones y numeración del lote ya cargado.
-- Agrega dos materias de secundario activas, sin crear nuevos turnos o deudas.
-- Datos ficticios: calles de Córdoba con numeraciones ilustrativas.
-- Correos de ejemplo con formato habitual; no se verifica la existencia de los buzones.
-- NO modifica auth.users, username_institucional, acceso_portal, DNI ni contraseñas.
-- Ejecutar completo en SQL Editor como postgres, después de la carga del lote.
begin;
set local lock_timeout = '10s';
select pg_advisory_xact_lock(hashtext('ateneo-demo-calendarios-2026-v1'));

create temp table demo_contactos (
 n integer primary key, dni text, email text, direccion text
) on commit drop;
insert into demo_contactos values
 (1,'47182635','sofia.gonzalez26@gmail.com','Av. Colón 1248, Córdoba'),
 (2,'46759208','mateo.rodriguez26@outlook.com','Av. General Paz 635, Córdoba'),
 (3,'48031746','valentina.lopez26@gmail.com','Obispo Trejo 942, Córdoba'),
 (4,'47608193','benjamin.fernandez26@outlook.com','Independencia 1156, Córdoba'),
 (5,'46925817','martina.diaz26@gmail.com','Ituzaingó 784, Córdoba'),
 (6,'48217054','joaquin.romero26@outlook.com','Buenos Aires 1320, Córdoba'),
 (7,'47394682','catalina.acosta26@gmail.com','San Jerónimo 468, Córdoba'),
 (8,'46813529','santiago.ruiz26@outlook.com','Av. Pueyrredón 925, Córdoba'),
 (9,'48105936','emilia.herrera26@gmail.com','Duarte Quirós 1462, Córdoba'),
 (10,'47562401','tomas.castro26@outlook.com','27 de Abril 1085, Córdoba');

do $$
declare cantidad integer; r record; v_id uuid;
begin
 select count(*) into cantidad from public.alumnos a join demo_contactos d
   on a.id=md5('ateneo-demo-calendarios-2026-v1:alumno:' || d.n)::uuid
   and a.dni::text=d.dni;
 if cantidad<>10 then
   raise exception 'Se esperaban los 10 alumnos del lote original; se encontraron %. No se modifica nada.',cantidad;
 end if;

 if (select count(*) from public.cursos_ingreso where id in (
   select md5('ateneo-demo-calendarios-2026-v1:curso:' || n)::uuid from generate_series(1,3) n))<>3 then
   raise exception 'No están los tres cursos del lote original. No se modifica nada.';
 end if;

 update public.alumnos a set email=d.email,direccion=d.direccion
 from demo_contactos d
 where a.id=md5('ateneo-demo-calendarios-2026-v1:alumno:' || d.n)::uuid
   and a.dni::text=d.dni;

 update public.cursos_ingreso c set descripcion=d.descripcion
 from (values
   (1,'Preparación para el ingreso a Ingeniería: matemática, física y química, con ejercicios y resolución de problemas.'),
   (2,'Preparación para el ingreso a Arquitectura: dibujo técnico, diseño y representación espacial mediante actividades prácticas.'),
   (3,'Preparación para Ciencias Económicas: álgebra, contabilidad y economía, con ejercicios y análisis de casos.')) d(n,descripcion)
 where c.id=md5('ateneo-demo-calendarios-2026-v1:curso:' || d.n)::uuid;

 -- Solo el aula expresamente indicada por el usuario.
 update public.aulas set descripcion='Aula' where numero=16;

 for r in select * from (values
   (1,'MATEMÁTICA DEL CICLO ORIENTADO','Matemática'),
   (2,'LENGUA Y PRODUCCIÓN ESCRITA','Lengua')) d(n,nombre,area)
 loop
   v_id:=md5('ateneo-demo-calendarios-2026-v1:secundario:' || r.n)::uuid;
   if exists(select 1 from public.materias where id=v_id and (nombre<>r.nombre or nivel<>'Secundario')) then
     raise exception 'La materia de secundario del lote fue modificada. Revisar antes de repetir.';
   end if;
   if not exists(select 1 from public.materias where id=v_id) then
     if exists(select 1 from public.materias where upper(trim(nombre))=r.nombre and lower(nivel)='secundario') then
       raise exception 'Ya existe la materia secundaria %. Ajustar el nombre antes de ejecutar.',r.nombre;
     end if;
     insert into public.materias(id,nombre,nivel,area,activo)
     values(v_id,r.nombre,'Secundario',r.area,true);
   end if;
 end loop;
end;
$$;

-- Reserva la numeración durante la actualización. Se conserva fecha, importe,
-- estado, obligaciones y demás datos del pago. Solo cambia comprobante.
-- Toma el MAYOR número REC existente por año (también reconoce rec en minúsculas).
-- Solo renumera comprobantes DEMO26 del lote: repetir no vuelve a numerarlos.
lock table public.pagos in share row exclusive mode;
create temp table demo_recibos on commit drop as
with maximos as (
 select substring(comprobante from 5 for 4)::integer as anio,
        max(split_part(comprobante,'-',3)::bigint) as ultimo
 from public.pagos where comprobante ~* '^REC-[0-9]{4}-[0-9]+$'
 group by 1
), pendientes as (
 select p.id,p.comprobante as anterior,extract(year from p.fecha)::integer as anio,
        coalesce(m.ultimo,0)+row_number() over (
          partition by extract(year from p.fecha) order by p.created_at,p.id) as numero
 from public.pagos p join demo_contactos d
   on p.alumno_id=md5('ateneo-demo-calendarios-2026-v1:alumno:' || d.n)::uuid
 left join maximos m on m.anio=extract(year from p.fecha)::integer
 where p.comprobante like 'DEMO26-%'
   and p.observaciones like 'DEMO CALENDARIOS OCT-NOV 2026 V1%'
)
select id,anterior,'REC-' || anio || '-' || lpad(numero::text,greatest(4,length(numero::text)),'0') as nuevo
from pendientes;

update public.pagos p set comprobante=d.nuevo from demo_recibos d where p.id=d.id;

select a.apellido,a.nombre,a.email,a.direccion,a.username_institucional,a.acceso_portal
from public.alumnos a join demo_contactos d
 on a.id=md5('ateneo-demo-calendarios-2026-v1:alumno:' || d.n)::uuid
order by a.apellido,a.nombre;
select c.nombre,c.descripcion from public.cursos_ingreso c
where c.id in(select md5('ateneo-demo-calendarios-2026-v1:curso:' || n)::uuid from generate_series(1,3) n)
order by c.nombre;
select numero,descripcion from public.aulas where numero=16;
select nombre,nivel,activo from public.materias
where id in(select md5('ateneo-demo-calendarios-2026-v1:secundario:' || n)::uuid from generate_series(1,2) n);
select anterior,nuevo from demo_recibos order by nuevo;
commit;
