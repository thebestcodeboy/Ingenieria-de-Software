import { supabase } from '../lib/supabaseClient';
import { getRoleFromUser } from './auth';
import { calcularIndicadoresFinancieros } from '../domain/indicadoresFinancieros';
import type { FilaFinanciera, FiltrosFinancieros } from '../domain/indicadoresFinancieros';

type RespuestaIndicadores = {
  pagos?: FilaFinanciera[];
  obligaciones?: FilaFinanciera[];
};

function nombreActividad(fila: FilaFinanciera) {
  const detalle = fila.detalle_academico as Record<string, unknown> | null;
  return String(fila.actividad_nombre ?? detalle?.actividad ?? fila.concepto ?? '').trim();
}

export async function cargarDatosFinancieros() {
  const { data: sesion, error: errorSesion } = await supabase.auth.getSession();
  if (errorSesion) throw new Error('No se pudo validar la sesión del gerente.');

  const usuario = sesion.session?.user;
  if (!usuario || getRoleFromUser(usuario) !== 'gerente') {
    throw new Error('Acceso restringido: se requiere el rol Gerente.');
  }

  const { data, error } = await supabase.rpc('obtener_indicadores_financieros_hu27');
  if (error) {
    if (error.code === 'PGRST202' || error.code === '42883') {
      throw new Error('Falta aplicar la migración de indicadores financieros en Supabase.');
    }
    if (error.code === '42501' || error.message.includes('ACCESO_RESTRINGIDO_GERENCIA')) {
      throw new Error('Acceso restringido: se requiere el rol Gerente.');
    }
    throw new Error(`No se pudieron consultar los indicadores financieros: ${error.message}`);
  }

  const respuesta = (data ?? {}) as RespuestaIndicadores;
  const pagos = respuesta.pagos ?? [];
  const obligaciones = respuesta.obligaciones ?? [];
  const actividades = [...new Set([...pagos, ...obligaciones].map(nombreActividad).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'es'));
  const mediosPago = [...new Set(pagos.map((pago) => String(pago.medio_pago ?? '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'es'));

  return { pagos, obligaciones, actividades, mediosPago };
}

export async function getIndicadoresFinancieros(filtros: FiltrosFinancieros) {
  const datos = await cargarDatosFinancieros();
  return { ...datos, resumen: calcularIndicadoresFinancieros(datos.pagos, datos.obligaciones, filtros) };
}
