import { supabase } from '@/lib/supabaseClient';
import type { FilaAsistencia } from '@/domain/asistencias';
export async function listarAsistencias(): Promise<FilaAsistencia[]> {
 const { data, error } = await supabase.rpc('listar_bitacora_asistencias');
 if (error) throw new Error(error.code === 'PGRST202' ? 'Falta aplicar la migración de HU26 en Supabase.' : error.message);
 return data ?? [];
}
export async function guardarAsistencia(fila: FilaAsistencia, estado: string, nota: string, observacion: string, motivo: string) {
 const { error } = await supabase.rpc('registrar_asistencia', { p_inscripcion_id: fila.inscripcion_id, p_turno_id: fila.turno_id, p_estado: estado, p_nota: nota, p_observacion: observacion, p_motivo: motivo, p_anterior_id: fila.versiones[0]?.id ?? null });
 if (error) throw new Error(error.message);
}
