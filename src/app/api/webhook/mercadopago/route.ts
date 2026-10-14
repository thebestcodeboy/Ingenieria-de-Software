import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const paymentId = body.data?.id || body.id;
    if (!paymentId || (body.type && body.type !== 'payment')) {
      return NextResponse.json({ received: true });
    }

    const accessToken = process.env.MP_ACCESS_TOKEN?.trim();
    if (!accessToken) {
      return NextResponse.json({ error: 'Falta MP_ACCESS_TOKEN en el servidor.' }, { status: 500 });
    }
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Falta configurar Supabase para procesar el webhook.' }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(String(paymentId))}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const paymentInfo = await mpRes.json().catch(() => ({}));
    if (!mpRes.ok) {
      return NextResponse.json({ error: paymentInfo.message || 'No se pudo verificar el pago en Mercado Pago.' }, { status: 502 });
    }

    const nuevoEstado: 'CONFIRMADO' | 'RECHAZADO' | 'PENDIENTE' =
      paymentInfo.status === 'approved' ? 'CONFIRMADO' :
      paymentInfo.status === 'rejected' ? 'RECHAZADO' : 'PENDIENTE';
    const externalReference = String(paymentInfo.external_reference ?? '').trim();
    const cambios = { estado: nuevoEstado, external_payment_id: String(paymentId) };

    if (externalReference) {
      const porId = await supabase.from('pagos').update(cambios)
        .eq('id', externalReference).eq('estado', 'PENDIENTE')
        .select('id').maybeSingle();
      if (porId.error) throw porId.error;

      if (!porId.data) {
        const porComprobante = await supabase.from('pagos').update(cambios)
          .eq('comprobante', externalReference).eq('estado', 'PENDIENTE')
          .select('id').maybeSingle();
        if (porComprobante.error) throw porComprobante.error;
      }
    } else {
      const porPagoExterno = await supabase.from('pagos').update(cambios)
        .eq('external_payment_id', String(paymentId)).eq('estado', 'PENDIENTE');
      if (porPagoExterno.error) throw porPagoExterno.error;
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error al procesar el webhook.' }, { status: 500 });
  }
}
