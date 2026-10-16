import { supabase } from '@/lib/supabaseClient';
import type { ClaseSinAlumnosProfesor, FilaAsistencia } from '@/domain/asistencias';
export async function listarAsistencias(rol?: string | null): Promise<FilaAsistencia[]> {
 if (rol === 'mesa_entrada' || rol === 'gerente') {
  const { error: permiso } = await supabase.rpc('validar_operador_inscripciones');
  if (permiso) throw new Error(permiso.code === '42501'
   ? 'Tu cuenta no está habilitada para gestionar asistencias. Solicitá la habilitación al administrador.'
   : permiso.message);
 }
 const { data, error } = await supabase.rpc('listar_bitacora_asistencias');
 if (error) {
  if (error.message.includes('ROL_ADMINISTRATIVO_NO_HABILITADO')) {
   throw new Error('Tu cuenta no está habilitada para gestionar asistencias. Solicitá la habilitación al administrador.');
  }
  throw new Error(error.code === 'PGRST202' ? 'Falta aplicar la migración de HU26 en Supabase.' : error.message);
 }
 return data ?? [];
}
export async function listarClasesSinAlumnosProfesor(): Promise<ClaseSinAlumnosProfesor[]> {
 const { data, error } = await supabase.rpc('listar_clases_sin_alumnos_asistencia');
 if (error) throw new Error(error.code === 'PGRST202' ? 'Falta aplicar la migración de asistencias para ver los turnos sin alumnos confirmados.' : error.message);
 return data ?? [];
}
export async function guardarAsistencia(fila: FilaAsistencia, estado: string, nota: string, observacion: string, motivo: string) {
 const { error } = await supabase.rpc('registrar_asistencia', { p_inscripcion_id: fila.inscripcion_id, p_turno_id: fila.turno_id, p_estado: estado, p_nota: nota, p_observacion: observacion, p_motivo: motivo, p_anterior_id: fila.versiones[0]?.id ?? null });
 if (error) throw new Error(error.message);
}
