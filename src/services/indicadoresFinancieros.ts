import { supabase } from '../lib/supabaseClient';
import { getRoleFromUser } from './auth';
import { calcularIndicadoresFinancieros } from '../domain/indicadoresFinancieros';
import type { FiltrosFinancieros } from '../domain/indicadoresFinancieros';
import { datosFinancierosDemo } from '../data/indicadoresFinancierosDemo';

export async function cargarDatosFinancieros() {
  const { data: sesion, error } = await supabase.auth.getSession();
  if (error) throw new Error('No se pudo validar la sesión del gerente.');

  const usuario = sesion.session?.user;
  if (!usuario || getRoleFromUser(usuario) !== 'gerente') {
    throw new Error('Acceso restringido: se requiere el rol Gerente.');
  }

  return datosFinancierosDemo();
}

export async function getIndicadoresFinancieros(filtros: FiltrosFinancieros) {
  const datos = await cargarDatosFinancieros();
  return { ...datos, resumen: calcularIndicadoresFinancieros(datos.pagos, datos.obligaciones, filtros) };
}
