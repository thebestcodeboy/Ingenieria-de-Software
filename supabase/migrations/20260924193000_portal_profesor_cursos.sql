-- Portal docente: vincular la identidad Auth con el profesor y permitir
-- que se anote en cursos compatibles con las materias que dicta.

alter table public.profesores
  add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null;

-- Vincula accesos docentes creados antes de incorporar auth_user_id.
update public.profesores p
   set auth_user_id = u.id
  from auth.users u
 where p.auth_user_id is null
   and p.username_institucional is not null
   and lower(u.email) = lower(p.username_institucional || '@profesor.ateneo.com');

create table if not exists public.profesor_curso (
  profesor_id uuid not null references public.profesores(id) on delete cascade,
  curso_id uuid not null references public.cursos_ingreso(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profesor_id, curso_id)
);

alter table public.profesor_curso enable row level security;
revoke all on table public.profesor_curso from anon, authenticated;

create or replace function public.listar_cursos_portal_profesor()
returns table (
  curso_id uuid,
  nombre text,
  descripcion text,
  materias text[],
  anotado boolean,
  cantidad_alumnos bigint
)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_profesor_id uuid;
begin
  select p.id
    into v_profesor_id
    from public.profesores p
   where p.auth_user_id = (select auth.uid())
     and coalesce(p.acceso_portal, false) = true;

  if v_profesor_id is null then
    raise exception using
      errcode = '42501',
      message = 'PROFESOR_NO_VINCULADO';
  end if;

  return query
  select
    c.id,
    c.nombre::text,
    c.descripcion::text,
    coalesce(
      array_agg(distinct m.nombre::text order by m.nombre::text)
        filter (where m.id is not null),
      array[]::text[]
    ) as materias,
    (pc.profesor_id is not null) as anotado,
    case
      when pc.profesor_id is null then 0::bigint
      else (
        select count(distinct i.alumno_id)
          from public.turnos_clase t
          join public.inscripciones i on i.turno_id = t.id
         where t.curso_id = c.id
      )
    end as cantidad_alumnos
  from public.cursos_ingreso c
  join public.curso_ingreso_materias cim on cim.curso_id = c.id
  join public.materias m on m.id = cim.materia_id
  join public.profesor_materia pm
    on pm.materia_id = cim.materia_id
   and pm.profesor_id = v_profesor_id
  left join public.profesor_curso pc
    on pc.curso_id = c.id
   and pc.profesor_id = v_profesor_id
  group by c.id, c.nombre, c.descripcion, pc.profesor_id
  order by (pc.profesor_id is not null) desc, c.nombre;
end;
$$;

create or replace function public.anotarme_curso_profesor(p_curso_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profesor_id uuid;
begin
  select p.id
    into v_profesor_id
    from public.profesores p
   where p.auth_user_id = (select auth.uid())
     and coalesce(p.acceso_portal, false) = true;

  if v_profesor_id is null then
    raise exception using
      errcode = '42501',
      message = 'PROFESOR_NO_VINCULADO';
  end if;

  if not exists (
    select 1
      from public.curso_ingreso_materias cim
      join public.profesor_materia pm
        on pm.materia_id = cim.materia_id
       and pm.profesor_id = v_profesor_id
     where cim.curso_id = p_curso_id
  ) then
    raise exception using
      errcode = '22023',
      message = 'CURSO_NO_COMPATIBLE';
  end if;

  insert into public.profesor_curso (profesor_id, curso_id)
  values (v_profesor_id, p_curso_id)
  on conflict (profesor_id, curso_id) do nothing;
end;
$$;

revoke all on function public.listar_cursos_portal_profesor() from public;
revoke all on function public.anotarme_curso_profesor(uuid) from public;
grant execute on function public.listar_cursos_portal_profesor() to authenticated;
grant execute on function public.anotarme_curso_profesor(uuid) to authenticated;

comment on table public.profesor_curso is
  'Cursos de ingreso que cada profesor eligió dictar desde el portal docente.';
comment on function public.listar_cursos_portal_profesor() is
  'Lista cursos compatibles con el profesor autenticado y sus alumnos únicos.';
comment on function public.anotarme_curso_profesor(uuid) is
  'Anota al profesor autenticado en un curso compatible con sus materias.';
