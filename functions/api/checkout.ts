export interface Env {
  STRIPE_SECRET_KEY: string;
}

export const onRequestPost = async (context: any) => {
  try {
    const { request, env } = context;

    // リクエストボディから priceId を取得
    const body = await request.json() as { priceId?: string; userId?: string };
    const { priceId, userId } = body;

    if (!priceId) {
      return new Response(
        JSON.stringify({ error: 'Price ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!env.STRIPE_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: 'Stripe secret key is not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 戻り先URL（決済成功時・キャンセル時）
    const url = new URL(request.url);
    const origin = `${url.protocol}//${url.host}`;
    const successUrl = `${origin}/?success=true`;
    const cancelUrl = `${origin}/?canceled=true`;

    // 価格IDに応じて付与するクレジット数を設定
    let creditsToGrant = 1000; // デフォルト（Starter Pack）
    if (priceId === 'price_1UDmkoZZJezqyZ9eR0I8cvUk') {
      creditsToGrant = 1000;
    }
    // 必要に応じて他のプランも追加可能
    // else if (priceId === 'price_1xxxx_standard') { creditsToGrant = 2800; }
    // else if (priceId === 'price_1xxxx_pro') { creditsToGrant = 6000; }

    // Stripeの Checkout Sessions APIに送るパラメータをURLSearchParamsで構築
    const stripeParams = new URLSearchParams();
    stripeParams.append('mode', 'payment');
    stripeParams.append('success_url', successUrl);
    stripeParams.append('cancel_url', cancelUrl);
    stripeParams.append('line_items[0][price]', priceId);
    stripeParams.append('line_items[0][quantity]', '1');

    // Webhook側（stripe.ts）が読み取れるメタデータキー名で登録
    if (userId) {
      stripeParams.append('metadata[supabase_user_id]', userId);
    }
    stripeParams.append('metadata[credits]', creditsToGrant.toString());

    // 実際のヘッダー調整
    const responseHeaders = {
      'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    const stripeResponseFinal = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: responseHeaders,
      body: stripeParams.toString(),
    });

    const session: any = await stripeResponseFinal.json();

    if (!stripeResponseFinal.ok) {
      console.error('Stripe API Error:', session);
      return new Response(
        JSON.stringify({ error: session.error?.message || 'Failed to create checkout session' }),
        { status: stripeResponseFinal.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 生成されたチェックアウトセッションのURLを返却
    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('Checkout session creation error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};