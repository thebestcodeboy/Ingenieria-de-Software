import { supabase } from '../lib/supabaseClient';
import { calcularResumenDashboard } from '../domain/dashboard';

function fechaHoyArgentina() {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const valor = Object.fromEntries(partes.map(({ type, value }) => [type, value]));
  return `${valor.year}-${valor.month}-${valor.day}`;
}

export const getDashboardSummary = async () => {
  const [alumnosRes, profesoresRes, materiasRes, cursosRes, aulasRes, turnosRes] = await Promise.all([
    supabase.from('alumnos').select('*'),
    supabase.from('profesores').select('*'),
    supabase.from('materias').select('*'),
    supabase.from('cursos_ingreso').select('*'),
    supabase.from('aulas').select('*'),
    supabase.from('vista_calendario').select('*'),
  ]);

  const consultas = [alumnosRes, profesoresRes, materiasRes, cursosRes, aulasRes, turnosRes];
  const consultaFallida = consultas.find((consulta) => consulta.error);
  if (consultaFallida?.error) {
    throw new Error(`No se pudieron cargar los indicadores: ${consultaFallida.error.message}`);
  }

  return calcularResumenDashboard({
    alumnos: alumnosRes.data || [],
    profesores: profesoresRes.data || [],
    materias: materiasRes.data || [],
    cursos: cursosRes.data || [],
    aulas: aulasRes.data || [],
    turnos: turnosRes.data || [],
  }, fechaHoyArgentina());
};
