import { getPlanByPriceId } from '../../app/data/price-plans';

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

    // priceId に一致するプラン情報を取得
    const plan = getPlanByPriceId(priceId);
    if (!plan) {
      return new Response(JSON.stringify({ error: 'Invalid price ID' }), { status: 400 });
    }

    const url = new URL(request.url);
    const origin = `${url.protocol}//${url.host}`;

    const stripeParams = new URLSearchParams();
    stripeParams.append('mode', 'payment');
    stripeParams.append('success_url', `${origin}/?success=true`);
    stripeParams.append('cancel_url', `${origin}/?canceled=true`);
    
    // 配列のインデックス [0] を付与
    stripeParams.append('line_items[0][price]', priceId);
    stripeParams.append('line_items[0][quantity]', '1');

    if (userId) stripeParams.append('metadata[supabase_user_id]', userId);
    
    // 通常クレジット、ボーナスクレジット、有効期限をメタデータに設定
    stripeParams.append('metadata[regular_credits]', plan.regularCredits.toString());
    stripeParams.append('metadata[bonus_credits]', plan.bonusCredits.toString());
    stripeParams.append('metadata[bonus_expiry]', plan.expiryDate || '');

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: stripeParams.toString(),
    });

    const session: any = await response.json();

    // Stripe側からエラーが返ってきた場合の対策
    if (!response.ok || !session.url) {
      const errorMessage = session.error?.message || 'Unknown Stripe error';
      return new Response(JSON.stringify({ error: errorMessage }), { status: 400 });
    }

    return new Response(JSON.stringify({ url: session.url }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};