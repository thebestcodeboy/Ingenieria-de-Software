import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const importe = Number(body.importe ?? body.total);
    const { description, payer_email } = body;
    const externalReference = String(body.external_reference ?? '').trim();
    const accessToken = process.env.MP_ACCESS_TOKEN?.trim();

    if (!accessToken) {
      return NextResponse.json({ error: 'Falta MP_ACCESS_TOKEN en .env.local. Reiniciá el servidor después de configurarlo.' }, { status: 500 });
    }

    if (!Number.isFinite(importe) || importe <= 0) {
      return NextResponse.json({ error: 'El importe es inválido para procesar en Mercado Pago.' }, { status: 400 });
    }
    if (!externalReference) {
      return NextResponse.json({ error: 'Falta la referencia local del pago.' }, { status: 400 });
    }

    const notificationUrl = process.env.MP_NOTIFICATION_URL?.trim();
    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        items: [{
          id: externalReference,
          title: description || 'Pago de arancel - Instituto Ateneo',
          quantity: 1,
          currency_id: 'ARS',
          unit_price: importe
        }],
        external_reference: externalReference,
        ...(payer_email ? { payer: { email: payer_email } } : {}),
        ...(notificationUrl ? { notification_url: notificationUrl } : {})
      })
    });

    const mpData = await mpResponse.json().catch(() => ({}));

    if (!mpResponse.ok) {
      const error = mpData.message || 'Error al conectar con la pasarela de Mercado Pago';
      const authorizationRejected = mpResponse.status === 401 || mpResponse.status === 403;
      return NextResponse.json({
        error: authorizationRejected ? `Mercado Pago rechazó MP_ACCESS_TOKEN: ${error}` : error
      }, { status: authorizationRejected ? 502 : 400 });
    }

    const checkoutUrl = accessToken.startsWith('TEST-') ? mpData.sandbox_init_point : mpData.init_point;
    if (!checkoutUrl) {
      return NextResponse.json({ error: 'Mercado Pago no devolvió el enlace de Checkout.' }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      preference_id: mpData.id?.toString(),
      checkout_url: checkoutUrl,
      status: 'PENDIENTE'
    });

  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno en el servidor de pagos.' }, { status: 500 });
  }
}