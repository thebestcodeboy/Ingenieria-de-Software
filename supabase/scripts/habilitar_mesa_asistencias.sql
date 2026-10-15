-- Ejecutar manualmente en SQL Editor con una cuenta administradora de Supabase.
-- Reemplazar el marcador por la cuenta de Mesa verificada por el responsable.
-- No ejecutar como migración automática ni promover todas las cuentas heredadas.
begin;
do $$
declare
  v_email text := 'REEMPLAZAR_EMAIL_MESA';
  v_usuario auth.users%rowtype;
  v_rol_actual text;
begin
  if v_email = 'REEMPLAZAR_EMAIL_MESA' then
    raise exception 'Reemplazá REEMPLAZAR_EMAIL_MESA por el email de la cuenta verificada.';
  end if;
  select * into strict v_usuario from auth.users where lower(email) = lower(trim(v_email)) for update;
  v_rol_actual := lower(coalesce(v_usuario.raw_app_meta_data->>'rol', v_usuario.raw_app_meta_data->>'role', ''));
  if v_rol_actual not in ('', 'mesa_entrada') then
    raise exception 'La cuenta ya tiene otro rol confiable; revisar antes de modificar.';
  end if;
  if lower(coalesce(v_usuario.raw_user_meta_data->>'rol', v_usuario.raw_user_meta_data->>'role', '')) <> 'mesa_entrada' then
    raise exception 'La cuenta no coincide con la cuenta de Mesa diagnosticada.';
  end if;
  update auth.users
     set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('rol', 'mesa_entrada')
   where id = v_usuario.id;
end $$;
commit;
-- Cerrar sesión y volver a ingresar para actualizar los metadatos de la sesión.
