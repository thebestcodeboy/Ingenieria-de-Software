-- Distingue falta de permisos administrativos de una bitácora legítimamente vacía.
-- Conserva la consulta existente y sus permisos por inscripción.
alter function public.listar_bitacora_asistencias() rename to listar_bitacora_asistencias_interna;
revoke all on function public.listar_bitacora_asistencias_interna() from public, anon, authenticated;

create function public.listar_bitacora_asistencias()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_app text;
  v_legacy text;
begin
  if auth.uid() is null then
    raise exception 'SESION_REQUERIDA' using errcode = '42501';
  end if;
  select lower(coalesce(u.raw_app_meta_data->>'rol', u.raw_app_meta_data->>'role', '')),
         lower(coalesce(u.raw_user_meta_data->>'rol', u.raw_user_meta_data->>'role', ''))
    into v_app, v_legacy from auth.users u where u.id = auth.uid();
  if v_app in ('mesa_entrada','gerente','gerencia','admin','administrador') then
    perform public.validar_operador_inscripciones();
  elsif coalesce(v_app,'') = '' and v_legacy in ('mesa_entrada','gerente','gerencia','admin','administrador') then
    -- El metadato editable solo permite detectar configuración incompleta, nunca conceder acceso.
    raise exception 'ROL_ADMINISTRATIVO_NO_HABILITADO' using errcode = '42501';
  end if;
  return public.listar_bitacora_asistencias_interna();
end;
$$;
revoke all on function public.listar_bitacora_asistencias() from public, anon;
grant execute on function public.listar_bitacora_asistencias() to authenticated;
