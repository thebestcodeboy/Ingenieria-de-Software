create table if not exists public.profesor_materia (
  profesor_id uuid not null references public.profesores(id) on delete cascade,
  materia_id uuid not null references public.materias(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profesor_id, materia_id)
);

grant select, insert, update, delete on public.profesor_materia to authenticated;

alter table public.profesor_materia enable row level security;

drop policy if exists profesor_materia_lectura_autenticada on public.profesor_materia;
create policy profesor_materia_lectura_autenticada
  on public.profesor_materia
  for select
  to authenticated
  using (true);

drop policy if exists profesor_materia_escritura_administrativa on public.profesor_materia;
create policy profesor_materia_escritura_administrativa
  on public.profesor_materia
  for all
  to authenticated
  using (
    lower(coalesce(
      (select auth.jwt()) -> 'user_metadata' ->> 'rol',
      (select auth.jwt()) -> 'user_metadata' ->> 'role',
      ''
    )) in ('gerente', 'gerencia', 'mesa_entrada', 'admin', 'administrador')
  )
  with check (
    lower(coalesce(
      (select auth.jwt()) -> 'user_metadata' ->> 'rol',
      (select auth.jwt()) -> 'user_metadata' ->> 'role',
      ''
    )) in ('gerente', 'gerencia', 'mesa_entrada', 'admin', 'administrador')
  );

insert into public.profesor_materia (profesor_id, materia_id)
select distinct p.id, m.id
  from public.profesores p
  cross join lateral (
    select case
      when jsonb_typeof(to_jsonb(p.materias_ids)) = 'array'
        then to_jsonb(p.materias_ids)
      when jsonb_typeof(to_jsonb(p.materias_ids)) = 'string'
        and (to_jsonb(p.materias_ids) #>> '{}') ~ '^\s*\['
        then (to_jsonb(p.materias_ids) #>> '{}')::jsonb
      else '[]'::jsonb
    end as valores
  ) materias_json
  cross join lateral jsonb_array_elements_text(materias_json.valores) materia_id(valor)
  join public.materias m on m.id::text = materia_id.valor
on conflict (profesor_id, materia_id) do nothing;

comment on table public.profesor_materia is
  'Materias que cada profesor está habilitado a dictar.';

notify pgrst, 'reload schema';