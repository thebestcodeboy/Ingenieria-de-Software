-- Nombre visible del autor, conservando autor_id como identidad de auditoria.
-- Solo devuelve nombres de autores de registros autorizados; no expone emails.
create or replace function public.listar_bitacora_asistencias_interna() returns jsonb language sql stable security definer set search_path = '' as $$
 select coalesce(jsonb_agg(fila order by fecha,hora_inicio,alumno),'[]'::jsonb) from (
 select i.id as inscripcion_id,i.turno_id,i.alumno_id,i.estado as inscripcion_estado,
 concat_ws(' ',a.apellido,a.nombre) as alumno,t.fecha,t.hora_inicio,t.materia_id,
 coalesce(m.nombre,'Sin materia') as materia,coalesce(ci.nombre,cp.nombre,m.nombre,'Clase') as actividad,
 coalesce(t.cancelado,false) or coalesce(t.estado,'')='cancelado' as cancelada,
 public.puede_consultar_asistencia(i.id,true) as editable,
 coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'version',v.version,'estado',v.estado,'nota',v.nota,'observacion',v.observacion,'motivo',v.motivo,'autor_id',v.autor_id,'autor_nombre',coalesce(nullif(trim(u.raw_user_meta_data->>'nombre'),''),nullif(trim(u.raw_user_meta_data->>'full_name'),''),nullif(trim(u.raw_user_meta_data->>'name'),''),'Nombre no disponible'),'cargado_en',v.cargado_en) order by v.version desc)
 from public.asistencia_versiones v left join auth.users u on u.id=v.autor_id where v.inscripcion_id=i.id),'[]'::jsonb) as versiones
 from public.inscripciones i join public.turnos_clase t on t.id=i.turno_id join public.alumnos a on a.id=i.alumno_id
 left join public.materias m on m.id=t.materia_id left join public.cursos_ingreso ci on ci.id=t.curso_id left join public.clases_particulares cp on cp.id=t.clase_particular_id
 where public.puede_consultar_asistencia(i.id) and (i.estado='confirmado' or exists(select 1 from public.asistencia_versiones v where v.inscripcion_id=i.id))
 ) fila;
$$;

revoke all on function public.listar_bitacora_asistencias_interna() from public, anon, authenticated;
