-- Autorizar únicamente la cuenta administrativa indicada.
do $$
begin
  if not exists (select 1 from auth.users where lower(email) = 'gerente@ateneo.com') then
    raise exception 'No se encontró la cuenta gerente@ateneo.com en Supabase Auth.';
  end if;
  update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"rol":"gerente"}'::jsonb
    where lower(email) = 'gerente@ateneo.com';
end;
$$;

-- Guardado transaccional con permisos administrativos comprobados en el servidor.
create or replace function public.guardar_curso_ingreso(
  p_nombre text, p_descripcion text, p_fecha_inicio date, p_fecha_fin date,
  p_materias uuid[], p_activo boolean default true, p_curso_id uuid default null
) returns public.cursos_ingreso
language plpgsql security definer set search_path = '' as $$
declare v_rol text; v_curso public.cursos_ingreso; v_ids uuid[];
begin
  select lower(coalesce(u.raw_app_meta_data ->> 'rol', u.raw_app_meta_data ->> 'role', ''))
    into v_rol from auth.users u where u.id = (select auth.uid());
  if v_rol is null or v_rol not in ('gerente', 'gerencia', 'mesa_entrada', 'admin', 'administrador') then
    raise exception using errcode = '42501', message = 'Tu cuenta no tiene permisos administrativos para guardar cursos. Contactá al administrador.';
  end if;
  if p_nombre is null or length(trim(p_nombre)) < 4 then raise exception 'Completá el nombre del curso.'; end if;
  if p_fecha_inicio is null or p_fecha_fin is null or p_fecha_fin < p_fecha_inicio then
    raise exception 'Completá un período válido para el curso.';
  end if;
  if p_activo is null then raise exception 'Seleccioná el estado del curso.'; end if;
  select array_agg(distinct id) into v_ids from unnest(p_materias) id where id is not null;
  if coalesce(cardinality(v_ids), 0) = 0 then raise exception 'Seleccioná al menos una materia universitaria.'; end if;
  if exists (
    select 1 from unnest(v_ids) mid
    where not exists (
      select 1 from public.materias m where m.id = mid and lower(m.nivel::text) like '%univ%'
        and (coalesce(m.activo, true) or (p_curso_id is not null and exists (
          select 1 from public.curso_ingreso_materias r where r.curso_id = p_curso_id and r.materia_id = m.id
        )))
    )
  ) then raise exception 'Las materias deben ser universitarias y estar activas, salvo las ya asociadas al curso.'; end if;
  if exists (
    select 1 from public.cursos_ingreso c where upper(trim(c.nombre)) = upper(trim(p_nombre))
      and (p_curso_id is null or c.id <> p_curso_id)
  ) then raise exception 'Ya existe un curso con ese nombre.'; end if;
  if p_curso_id is null then
    insert into public.cursos_ingreso(nombre, descripcion, fecha_inicio, fecha_fin, activo)
      values (upper(trim(p_nombre)), nullif(trim(p_descripcion), ''), p_fecha_inicio, p_fecha_fin, p_activo)
      returning * into v_curso;
  else
    update public.cursos_ingreso set nombre = upper(trim(p_nombre)),
      descripcion = nullif(trim(p_descripcion), ''), fecha_inicio = p_fecha_inicio,
      fecha_fin = p_fecha_fin, activo = p_activo
      where id = p_curso_id returning * into v_curso;
    if not found then raise exception 'El curso ya no existe. Actualizá el listado.'; end if;
  end if;
  delete from public.curso_ingreso_materias r where r.curso_id = v_curso.id and not (r.materia_id = any(v_ids));
  insert into public.curso_ingreso_materias(curso_id, materia_id)
    select v_curso.id, mid from unnest(v_ids) mid
    where not exists (
      select 1 from public.curso_ingreso_materias r where r.curso_id = v_curso.id and r.materia_id = mid
    );
  return v_curso;
end;
$$;
revoke all on function public.guardar_curso_ingreso(text,text,date,date,uuid[],boolean,uuid) from public, anon;
grant execute on function public.guardar_curso_ingreso(text,text,date,date,uuid[],boolean,uuid) to authenticated;
notify pgrst, 'reload schema';
