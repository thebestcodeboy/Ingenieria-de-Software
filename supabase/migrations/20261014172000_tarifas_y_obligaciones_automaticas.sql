alter table public.cursos_ingreso
  add column if not exists precio numeric(12,2) not null default 0 check (precio >= 0),
  add column if not exists modalidad_cobro text not null default 'MES' check (modalidad_cobro in ('MES', 'SEMANA')),
  add column if not exists plazo_vencimiento_dias integer not null default 10 check (plazo_vencimiento_dias between 0 and 90);

alter table public.clases_particulares
  add column if not exists precio numeric(12,2) not null default 0 check (precio >= 0),
  add column if not exists plazo_vencimiento_dias integer not null default 0 check (plazo_vencimiento_dias between 0 and 90);

alter table public.obligaciones_pago
  add column if not exists clave_facturacion text;

create unique index if not exists obligaciones_pago_clave_unica_idx
  on public.obligaciones_pago (alumno_id, clave_facturacion)
  where clave_facturacion is not null and estado <> 'ANULADA';

create or replace function public.configurar_tarifa_actividad(
  p_tipo text, p_actividad_id uuid, p_precio numeric,
  p_modalidad text default null, p_plazo_vencimiento_dias integer default 10
) returns void
language plpgsql security definer set search_path = '' as $$
declare v_rol text;
begin
  select lower(coalesce(u.raw_app_meta_data->>'rol', u.raw_app_meta_data->>'role', '')) into v_rol
  from auth.users u where u.id = (select auth.uid());
  if v_rol not in ('mesa_entrada', 'gerente', 'gerencia', 'admin', 'administrador') then
    raise exception using errcode = '42501', message = 'No tenés permiso para configurar tarifas.';
  end if;
  if p_precio is null or p_precio <= 0 then raise exception 'El precio debe ser mayor a cero.'; end if;
  if p_plazo_vencimiento_dias is null or p_plazo_vencimiento_dias not between 0 and 90 then raise exception 'El plazo de vencimiento debe estar entre 0 y 90 días.'; end if;

  if upper(p_tipo) = 'CURSO' then
    if upper(coalesce(p_modalidad, '')) not in ('MES', 'SEMANA') then raise exception 'Seleccioná una modalidad mensual o semanal.'; end if;
    update public.cursos_ingreso set precio = p_precio, modalidad_cobro = upper(p_modalidad), plazo_vencimiento_dias = p_plazo_vencimiento_dias where id = p_actividad_id;
  elsif upper(p_tipo) = 'CLASE' then
    update public.clases_particulares set precio = p_precio, plazo_vencimiento_dias = p_plazo_vencimiento_dias where id = p_actividad_id;
  else raise exception 'Tipo de actividad inválido.';
  end if;
  if not found then raise exception 'La actividad no existe.'; end if;
end;
$$;
revoke all on function public.configurar_tarifa_actividad(text,uuid,numeric,text,integer) from public, anon;
grant execute on function public.configurar_tarifa_actividad(text,uuid,numeric,text,integer) to authenticated;

create or replace function public.generar_obligacion_inscripcion()
returns trigger language plpgsql security definer set search_path = ''
set timezone = 'America/Argentina/Buenos_Aires' as $$
declare v_turno public.turnos_clase; v_precio numeric(12,2); v_modalidad text; v_plazo integer;
declare v_desde date; v_hasta date; v_clave text; v_actividad text; v_concepto text;
begin
  if new.estado <> 'confirmado' then return new; end if;
  select * into v_turno from public.turnos_clase where id = new.turno_id;
  if not found or coalesce(v_turno.cancelado, false) or coalesce(v_turno.estado, 'activo') = 'cancelado' then return new; end if;

  if v_turno.curso_id is not null then
    select c.precio, c.modalidad_cobro, c.plazo_vencimiento_dias, 'Curso de ingreso: ' || c.nombre
      into v_precio, v_modalidad, v_plazo, v_actividad from public.cursos_ingreso c where c.id = v_turno.curso_id;
    if v_modalidad = 'SEMANA' then
      v_desde := v_turno.fecha - (extract(isodow from v_turno.fecha)::integer - 1);
      v_hasta := v_desde + 6; v_clave := 'curso:' || v_turno.curso_id || ':semana:' || to_char(v_desde, 'YYYY-MM-DD');
      v_concepto := v_actividad || ' · Semana: ' || v_desde || ' al ' || v_hasta;
    else
      v_desde := date_trunc('month', v_turno.fecha)::date;
      v_hasta := (v_desde + interval '1 month - 1 day')::date; v_clave := 'curso:' || v_turno.curso_id || ':mes:' || to_char(v_desde, 'YYYY-MM');
      v_concepto := v_actividad || ' · Período: ' || v_desde || ' al ' || v_hasta;
    end if;
  elsif v_turno.clase_particular_id is not null then
    select cp.precio, 'CLASE', cp.plazo_vencimiento_dias, 'Clase particular: ' || cp.nombre
      into v_precio, v_modalidad, v_plazo, v_actividad from public.clases_particulares cp where cp.id = v_turno.clase_particular_id;
    v_desde := v_turno.fecha; v_hasta := v_turno.fecha; v_clave := 'clase:' || v_turno.id;
    v_concepto := v_actividad || ' · Clase del ' || v_turno.fecha;
  else return new; end if;
  if coalesce(v_precio, 0) <= 0 then return new; end if;

  insert into public.obligaciones_pago(alumno_id, inscripcion_id, curso_id, materia_id, periodo_desde, periodo_hasta,
    actividad_nombre, concepto, importe_original, saldo_pendiente, fecha_emision, fecha_vencimiento, estado, clave_facturacion)
  values(new.alumno_id, new.id, v_turno.curso_id, v_turno.materia_id, v_desde, v_hasta,
    v_actividad, v_concepto, v_precio, v_precio, current_date, greatest(v_desde, current_date) + v_plazo, 'PENDIENTE', v_clave)
  on conflict (alumno_id, clave_facturacion) where clave_facturacion is not null and estado <> 'ANULADA' do nothing;
  return new;
end;
$$;

drop trigger if exists generar_obligacion_al_confirmar_inscripcion on public.inscripciones;
create trigger generar_obligacion_al_confirmar_inscripcion
after insert or update of estado on public.inscripciones
for each row execute function public.generar_obligacion_inscripcion();

notify pgrst, 'reload schema';
