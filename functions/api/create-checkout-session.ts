export interface Env {
  STRIPE_SECRET_KEY: string;
}

export const onRequestPost = async (context: any) => {
  try {
    const { request, env } = context;
    const body = await request.json() as { priceId?: string; userId?: string };
    const { priceId, userId } = body;

    if (!priceId) return new Response(JSON.stringify({ error: 'Price ID is required' }), { status: 400 });
    if (!env.STRIPE_SECRET_KEY) return new Response(JSON.stringify({ error: 'Stripe secret key missing' }), { status: 500 });

    const url = new URL(request.url);
    const origin = `${url.protocol}//${url.host}`;

    // プラン等に応じた付与クレジット数設定
    let creditsToGrant = 1000;

    const stripeParams = new URLSearchParams();
    stripeParams.append('mode', 'payment');
    stripeParams.append('success_url', `${origin}/?success=true`);
    stripeParams.append('cancel_url', `${origin}/?canceled=true`);
    stripeParams.append('line_items[price]', priceId);
    stripeParams.append('line_items[quantity]', '1');

    if (userId) stripeParams.append('metadata[supabase_user_id]', userId);
    stripeParams.append('metadata[credits]', creditsToGrant.toString());

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: stripeParams.toString(),
    });

    const session: any = await response.json();
    return new Response(JSON.stringify({ url: session.url }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};