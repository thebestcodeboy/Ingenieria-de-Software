const colores = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#db2777', '#0891b2'];
const coloresMedio: Record<string, string> = {
  Efectivo: '#059669', Transferencia: '#2563eb', 'Mercado Pago': '#7c3aed',
  'Tarjeta de Débito': '#d97706', 'Tarjeta de Crédito': '#db2777',
};
const pesos = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const porcentaje = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 });

function escapar(valor: string) {
  return valor.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c]!);
}

export function graficoTorta(datos: Array<{ nombre: string; importe: number }>): string {
  const filas = datos.filter(d => Number.isFinite(d.importe) && d.importe > 0);
  const total = filas.reduce((suma, d) => suma + d.importe, 0);
  if (!total) return '<p style="padding:24px;text-align:center;color:#64748b">Sin recaudación para los filtros seleccionados.</p>';
  
  let acumulado = 0;
  const sectores = filas.map((d, i) => {
    const fraccion = d.importe / total;
    const inicio = acumulado * Math.PI * 2 - Math.PI / 2;
    acumulado += fraccion;
    const fin = acumulado * Math.PI * 2 - Math.PI / 2;
    const medio = (inicio + fin) / 2;
    const color = coloresMedio[d.nombre] ?? colores[i % colores.length];
    const texto = `${porcentaje.format(fraccion * 100)}%`;
    const etiqueta = escapar(`${d.nombre}: ${pesos.format(d.importe)} (${texto})`);
    const figura = filas.length === 1
      ? `<circle cx="120" cy="120" r="110" fill="${color}"><title>${etiqueta}</title></circle>`
      : `<path d="M120 120 L${120 + 110 * Math.cos(inicio)} ${120 + 110 * Math.sin(inicio)} A110 110 0 ${fraccion > .5 ? 1 : 0} 1 ${120 + 110 * Math.cos(fin)} ${120 + 110 * Math.sin(fin)} Z" fill="${color}" stroke="#fff" stroke-width="2"><title>${etiqueta}</title></path>`;
    return { d, color, texto, figura, medio, fraccion };
  });

  const etiquetas = sectores.filter(d => d.fraccion >= .05).map(d => {
    const radio = filas.length === 1 ? 0 : 73;
    return `<text x="${120 + radio * Math.cos(d.medio)}" y="${120 + radio * Math.sin(d.medio)}" text-anchor="middle" dominant-baseline="middle" fill="#fff" stroke="#0f172a" stroke-width="2" paint-order="stroke" font-size="14" font-weight="700">${d.texto}</text>`;
  }).join('');

  const leyenda = sectores.map(({ d, color, texto }) => `<li style="display:flex;align-items:center;gap:10px;margin:10px 0;color:#334155;font-size:13px"><span aria-hidden="true" style="width:12px;height:12px;flex-shrink:0;border-radius:3px;background:${color}"></span><span><strong>${escapar(d.nombre)}</strong><br>${escapar(pesos.format(d.importe))} · ${texto}</span></li>`).join('');
  
  return `<div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:24px;margin:20px 0;break-inside:avoid"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" role="img" aria-label="Distribución de la recaudación por medio de pago" style="width:240px;max-width:100%;height:auto;flex-shrink:0"><title>Recaudación por medio de pago. Total ${escapar(pesos.format(total))}</title>${sectores.map(d => d.figura).join('')}${etiquetas}</svg><div><p style="margin:0;color:#64748b;font-size:13px">Total recaudado<strong style="display:block;font-size:22px;color:#0f172a">${escapar(pesos.format(total))}</strong></p><ul style="list-style:none;margin:12px 0 0;padding:0">${leyenda}</ul></div></div>`;
}