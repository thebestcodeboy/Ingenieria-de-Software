import { supabase } from '../lib/supabaseClient';
import { calcularResumenGerencial } from '../domain/dashboardGerente';
import { getRoleFromUser } from './auth';

function fechaArgentina() {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const valores = Object.fromEntries(partes.map(({ type, value }) => [type, value]));
  return `${valores.year}-${valores.month}-${valores.day}`;
}

export async function getDashboardGerenteSummary() {
  const { data: sesionData, error: sesionError } = await supabase.auth.getSession();
  if (sesionError) throw new Error('No se pudo validar la sesion del gerente.');

  const usuario = sesionData.session?.user;
  if (!usuario || getRoleFromUser(usuario) !== 'gerente') {
    throw new Error('Acceso restringido: se requiere el rol gerente.');
  }

  const [inscripcionesRes, turnosRes] = await Promise.all([
    supabase.from('inscripciones').select('*'),
    supabase.from('vista_calendario').select('*'),
  ]);

  const consultaFallida = [inscripcionesRes, turnosRes].find((consulta) => consulta.error);
  if (consultaFallida?.error) {
    throw new Error(`No se pudieron cargar los indicadores gerenciales: ${consultaFallida.error.message}`);
  }

  return calcularResumenGerencial({
    inscripciones: inscripcionesRes.data || [],
    turnos: turnosRes.data || [],
  }, fechaArgentina());
}
