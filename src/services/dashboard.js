import { supabase } from '../lib/supabaseClient';

export const getDashboardSummary = async () => {
  try {
    const [alumnosRes, profesoresRes, materiasRes, turnosRes] = await Promise.all([
      supabase.from('alumnos').select('*', { count: 'exact', head: true }),
      supabase.from('profesores').select('*', { count: 'exact', head: true }),
      supabase.from('materias').select('*', { count: 'exact', head: true }),
      supabase.from('turnos_clase').select('*', { count: 'exact', head: true }),
    ]);

    const today = new Date().toISOString().split('T')[0];
    const { data: turnosHoy, error: turnosHoyErr } = await supabase
      .from('vista_calendario')
      .select('*')
      .eq('fecha', today)
      .order('hora_inicio', { ascending: true });

    if (turnosHoyErr) {
      console.warn('Aviso al cargar turnos de hoy:', turnosHoyErr.message);
    }

    return {
      totalAlumnos: alumnosRes.count || 0,
      totalProfesores: profesoresRes.count || 0,
      totalMaterias: materiasRes.count || 0,
      totalTurnos: turnosRes.count || 0,
      turnosHoy: turnosHoy || []
    };
  } catch (error) {
    console.error('Error al obtener datos del dashboard:', error);
    throw error;
  }
};
