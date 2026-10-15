create table public.asistencia_versiones (
 id uuid primary key default gen_random_uuid(),
 inscripcion_id uuid not null references public.inscripciones(id),
 version integer not null check (version > 0),
 anterior_id uuid unique references public.asistencia_versiones(id),
 estado text not null check (estado in ('asistio','falto','cancelada')),
 nota text, observacion text, motivo text,
 autor_id uuid references auth.users(id) not null,
 cargado_en timestamptz not null default now(),
 unique(inscripcion_id, version),
 check ((version = 1 and anterior_id is null) or (version > 1 and anterior_id is not null and coalesce(length(trim(motivo)),0) > 0))
);
alter table public.asistencia_versiones enable row level security;
revoke all on public.asistencia_versiones from anon, authenticated;

create function public.puede_consultar_asistencia(p_inscripcion_id uuid, p_editar boolean default false)
returns boolean language sql stable security definer set search_path = '' as $$
 select exists (
 select 1 from public.inscripciones i join public.turnos_clase t on t.id=i.turno_id
 join auth.users u on u.id=auth.uid()
 where i.id=p_inscripcion_id and (
 lower(coalesce(u.raw_app_meta_data->>'rol',u.raw_app_meta_data->>'role','')) in ('mesa_entrada','gerente','gerencia','admin','administrador')
 or exists(select 1 from public.profesores p where p.id=t.profesor_id and p.auth_user_id=u.id and p.acceso_portal=true)
 or (not p_editar and exists(select 1 from public.alumnos a where a.id=i.alumno_id and a.acceso_portal=true and (lower(a.email)=lower(u.email) or lower(a.username_institucional)=split_part(lower(u.email),'@',1))))
 ));
$$;

create function public.registrar_asistencia(p_inscripcion_id uuid, p_turno_id uuid, p_estado text,
 p_nota text default null, p_observacion text default null, p_anterior_id uuid default null, p_motivo text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_i public.inscripciones%rowtype; v_t public.turnos_clase%rowtype; v_v public.asistencia_versiones%rowtype; v_id uuid;
begin
 -- Same lock order as cancellation: class first, enrollment second.
 select * into v_t from public.turnos_clase where id=p_turno_id for update;
 select * into v_i from public.inscripciones where id=p_inscripcion_id and turno_id=p_turno_id for update;
 if v_i.id is null or not public.puede_consultar_asistencia(p_inscripcion_id,true) then raise exception 'ASISTENCIA_NO_AUTORIZADA' using errcode='42501'; end if;
 if v_i.estado <> 'confirmado' then raise exception 'INSCRIPCION_NO_CONFIRMADA'; end if;
 if coalesce(v_t.cancelado,false) or v_t.estado='cancelado' then raise exception 'CLASE_CANCELADA'; end if;
 if p_estado is null or p_estado not in ('asistio','falto') then raise exception 'ESTADO_INVALIDO'; end if;
 if v_t.fecha is null or v_t.hora_inicio is null or (v_t.fecha+v_t.hora_inicio) > timezone('America/Argentina/Buenos_Aires',now()) then raise exception 'CLASE_NO_INICIADA'; end if;
 select * into v_v from public.asistencia_versiones where inscripcion_id=p_inscripcion_id order by version desc limit 1;
 if v_v.id is distinct from p_anterior_id then raise exception 'VERSION_DESACTUALIZADA: recargá la bitácora'; end if;
 if v_v.id is not null and coalesce(length(trim(p_motivo)),0)=0 then raise exception 'MOTIVO_OBLIGATORIO'; end if;
 insert into public.asistencia_versiones(inscripcion_id,version,anterior_id,estado,nota,observacion,motivo,autor_id)
 values(p_inscripcion_id,coalesce(v_v.version,0)+1,v_v.id,p_estado,nullif(trim(p_nota),''),nullif(trim(p_observacion),''),p_motivo,auth.uid()) returning id into v_id;
 return v_id;
end;
$$;

create function public.listar_bitacora_asistencias() returns jsonb language sql stable security definer set search_path = '' as $$
 select coalesce(jsonb_agg(fila order by fecha,hora_inicio,alumno),'[]'::jsonb) from (
 select i.id as inscripcion_id,i.turno_id,i.alumno_id,i.estado as inscripcion_estado,
 concat_ws(' ',a.apellido,a.nombre) as alumno,t.fecha,t.hora_inicio,t.materia_id,
 coalesce(m.nombre,'Sin materia') as materia,coalesce(ci.nombre,cp.nombre,m.nombre,'Clase') as actividad,
 coalesce(t.cancelado,false) or coalesce(t.estado,'')='cancelado' as cancelada,
 public.puede_consultar_asistencia(i.id,true) as editable,
 coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'version',v.version,'estado',v.estado,'nota',v.nota,'observacion',v.observacion,'motivo',v.motivo,'autor_id',v.autor_id,'cargado_en',v.cargado_en) order by v.version desc)
 from public.asistencia_versiones v where v.inscripcion_id=i.id),'[]'::jsonb) as versiones
 from public.inscripciones i join public.turnos_clase t on t.id=i.turno_id join public.alumnos a on a.id=i.alumno_id
 left join public.materias m on m.id=t.materia_id left join public.cursos_ingreso ci on ci.id=t.curso_id left join public.clases_particulares cp on cp.id=t.clase_particular_id
 where public.puede_consultar_asistencia(i.id) and (i.estado='confirmado' or exists(select 1 from public.asistencia_versiones v where v.inscripcion_id=i.id))
 ) fila;
$$;

create function public.cancelacion_asistencia() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_i record; v_v public.asistencia_versiones%rowtype;
begin
 if (coalesce(new.cancelado,false) or new.estado='cancelado') and not (coalesce(old.cancelado,false) or coalesce(old.estado,'')='cancelado') then
 for v_i in select id from public.inscripciones where turno_id=new.id and estado='confirmado' order by id for update loop
 select * into v_v from public.asistencia_versiones where inscripcion_id=v_i.id order by version desc limit 1;
 insert into public.asistencia_versiones(inscripcion_id,version,anterior_id,estado,motivo,autor_id)
 values(v_i.id,coalesce(v_v.version,0)+1,v_v.id,'cancelada','Cancelación del turno',auth.uid());
 end loop;
 end if;
 return new;
end;
$$;
create trigger turno_cancelado_asistencia after update of estado,cancelado on public.turnos_clase for each row execute function public.cancelacion_asistencia();
revoke all on function public.puede_consultar_asistencia(uuid,boolean) from public;
revoke all on function public.registrar_asistencia(uuid,uuid,text,text,text,uuid,text) from public;
revoke all on function public.listar_bitacora_asistencias() from public;
revoke all on function public.cancelacion_asistencia() from public;
grant execute on function public.registrar_asistencia(uuid,uuid,text,text,text,uuid,text) to authenticated;
grant execute on function public.listar_bitacora_asistencias() to authenticated;
