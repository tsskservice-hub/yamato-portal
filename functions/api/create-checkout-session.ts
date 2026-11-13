import { createClient } from '@supabase/supabase-js';
import { getPlanByPriceId } from '../../app/data/price-plans';

// 公開しても安全な値（ブラウザ側と同じ publishable key）。ログイン情報の確認だけに使う
const DEFAULT_SUPABASE_URL = 'https://ybquwzoreecxxbewjpdn.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_kxxOp7nY3OuRNYp_Cxl5Sw_QtVCG_te';

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export interface Env {
  STRIPE_SECRET_KEY: string;
  SUPABASE_URL?: string;
}

export const onRequestPost = async (context: any) => {
  try {
    const { request, env } = context;
    // 🔐 購入者はログイン情報（アクセストークン）から特定する。body.userId は使わない
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) return json({ error: 'Please log in to purchase credits.' }, 401);

    const supabase = createClient(env.SUPABASE_URL || DEFAULT_SUPABASE_URL, PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) return json({ error: 'Please log in to purchase credits.' }, 401);
    const userId = authData.user.id;

    const body = await request.json() as { priceId?: string };
    const { priceId } = body;

    if (!priceId) return json({ error: 'Price ID is required' }, 400);
    if (!env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY is missing.');
      return json({ error: 'Server configuration error' }, 500);
    }

    // priceId に一致するプラン情報を取得
    const plan = getPlanByPriceId(priceId);
    if (!plan) {
      return json({ error: 'Invalid price ID' }, 400);
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

    stripeParams.append('client_reference_id', userId);
    stripeParams.append('metadata[supabase_user_id]', userId);
    
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
      console.error('Stripe checkout session error:', session.error?.message || 'Unknown Stripe error');
      return json({ error: 'Could not start checkout. Please try again.' }, 400);
    }

    return json({ url: session.url }, 200);
  } catch (err: any) {
    console.error('create-checkout-session error:', err?.message);
    return json({ error: 'Could not start checkout. Please try again.' }, 500);
  }
};