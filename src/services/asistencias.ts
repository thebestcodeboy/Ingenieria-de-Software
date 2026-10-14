import { supabase } from '@/lib/supabaseClient';
import type { FilaAsistencia } from '@/domain/asistencias';
export async function listarAsistencias(rol?: string | null): Promise<FilaAsistencia[]> {
 if (rol === 'mesa_entrada' || rol === 'gerente') {
  const { error: permiso } = await supabase.rpc('validar_operador_inscripciones');
  if (permiso) throw new Error(permiso.code === '42501'
   ? 'Tu cuenta muestra un rol administrativo, pero Supabase no tiene habilitado ese permiso. Verificá el rol en app_metadata de la cuenta.'
   : permiso.message);
 }
 const { data, error } = await supabase.rpc('listar_bitacora_asistencias');
 if (error) throw new Error(error.code === 'PGRST202' ? 'Falta aplicar la migración de HU26 en Supabase.' : error.message);
 return data ?? [];
}
export async function guardarAsistencia(fila: FilaAsistencia, estado: string, nota: string, observacion: string, motivo: string) {
 const { error } = await supabase.rpc('registrar_asistencia', { p_inscripcion_id: fila.inscripcion_id, p_turno_id: fila.turno_id, p_estado: estado, p_nota: nota, p_observacion: observacion, p_motivo: motivo, p_anterior_id: fila.versiones[0]?.id ?? null });
 if (error) throw new Error(error.message);
}
