/**
 * @file functions/api/create-checkout-session.ts
 * @description Stripe の支払い画面（Checkout）を開く
 *
 * body:
 *   { plan: PlanKey }  … AI 体験・サブスク（月額・年払い）・シーズンプラン（app/data/billing-plans.ts）
 *   { priceId }        … クレジットパック（kl_app の PRICE_PLANS。プランを使っている人だけが買える）
 *
 * ・買う人はログイン情報（アクセストークン）から決める。body の userId は使わない
 * ・買えるかどうか（体験は 1 回だけ・同じサブスクを二重に契約しない・パックはプランの人だけ）はここで確かめる
 * ・初めてプランを買う人には、割引クーポン（FIRST_SUB_TRIAL / FIRST_SUB）を自動で付ける
 * ・クレジットを渡すのは Webhook（functions/api/webhook/stripe.ts）だけ
 * ・本番は公開用（live）、プレビュー・localhost は sandbox（test）の Stripe を使う
 */
import { createClient } from '@supabase/supabase-js';
import { getPlanByPriceId, fetchPricePlansData, PlanConfig } from '../../app/data/price-plans';
import { isProductionHost } from '../../app/utils/developerOnly';
import { PLAN_OFFERS, isPlanKey, type PlanKey } from '../../app/data/billing-plans';

// 公開しても安全な値（ブラウザ側と同じ publishable key）。ログイン情報の確認だけに使う
const DEFAULT_SUPABASE_URL = 'https://ybquwzoreecxxbewjpdn.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_kxxOp7nY3OuRNYp_Cxl5Sw_QtVCG_te';

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export interface Env {
  STRIPE_SECRET_KEY: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

async function stripeRequest(env: Env, method: 'GET' | 'POST', path: string, params?: URLSearchParams) {
  const url = `https://api.stripe.com/v1/${path}${method === 'GET' && params ? `?${params}` : ''}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: method === 'POST' && params ? params.toString() : undefined,
  });
  const data: any = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

export const onRequestPost = async (context: any) => {
  try {
    const { request } = context;
    const env = context.env as Env;
    // 🔐 購入者はログイン情報（アクセストークン）から特定する
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) return json({ error: 'Please log in to continue.' }, 401);

    const supabaseUrl = env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
    const supabase = createClient(supabaseUrl, PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) return json({ error: 'Please log in to continue.' }, 401);
    const user = authData.user;

    if (!env.STRIPE_SECRET_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('create-checkout-session: STRIPE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY is missing.');
      return json({ error: 'Server configuration error' }, 500);
    }

    const url = new URL(request.url);
    // 🧪 鍵と環境が食い違っていたら止める（プレビューで本物の支払い／本番でテスト決済、を防ぐ）
    const isProduction = isProductionHost(url.hostname);
    const keyIsLive = env.STRIPE_SECRET_KEY.includes('_live_');
    if (isProduction !== keyIsLive) {
      console.error(`Stripe key mode mismatch: host=${url.hostname}, liveKey=${keyIsLive}`);
      return json({ error: 'Server configuration error' }, 500);
    }

    const admin = createClient(supabaseUrl, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const body = (await request.json().catch(() => ({}))) as { priceId?: string; plan?: string };
    const origin = `${url.protocol}//${url.host}`;

    const { data: paidAccess } = await admin.rpc('has_paid_access', { p_user_id: user.id });
    const { data: customerRow } = await admin.from('stripe_customers').select('customer_id').eq('user_id', user.id).maybeSingle();

    const params = new URLSearchParams();
    params.append('client_reference_id', user.id);
    params.append('metadata[supabase_user_id]', user.id);
    if (customerRow?.customer_id) {
      params.append('customer', customerRow.customer_id);
    } else if (user.email) {
      params.append('customer_email', user.email);
    }

    if (isPlanKey(body.plan)) {
      // ---------- AI 体験・サブスク・シーズンプラン ----------
      const key: PlanKey = body.plan;
      const offer = PLAN_OFFERS[key];

      if (offer.kind === 'trial') {
        const { data: trial } = await admin.from('ai_trials').select('id').eq('user_id', user.id).maybeSingle();
        if (trial) return json({ error: 'You have already used the AI Trial.' }, 400);
        if (paidAccess) return json({ error: 'Your plan already includes AI credits, so you don’t need the AI Trial.' }, 400);
      }
      if (offer.kind === 'subscription') {
        const { data: active } = await admin
          .from('subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .in('status', ['active', 'trialing', 'past_due'])
          .limit(1);
        if (active && active.length) {
          return json({ error: 'You already have a subscription. You can manage it from My Account.' }, 400);
        }
      }

      // Stripe の価格を Lookup key で探し、値段が決めたとおりかを確かめる
      const priceSearch = new URLSearchParams();
      priceSearch.append('lookup_keys[]', key);
      priceSearch.append('active', 'true');
      const found = await stripeRequest(env, 'GET', 'prices', priceSearch);
      const price = found.data?.data?.[0];
      if (!found.ok || !price || price.unit_amount !== offer.priceCents || String(price.currency).toLowerCase() !== 'aud') {
        console.error(`create-checkout-session: price for ${key} not found or does not match`, found.data?.error?.message);
        return json({ error: 'This plan is not available right now. Please try again later.' }, 500);
      }

      params.append('line_items[0][price]', price.id);
      params.append('line_items[0][quantity]', '1');
      params.append('metadata[kind]', offer.kind);
      params.append('metadata[plan_key]', key);
      params.append('success_url', `${origin}/my-account?checkout=success`);
      params.append('cancel_url', `${origin}/prices?checkout=canceled`);

      // AI 体験はカード払いだけにする。カードの指紋で「カード 1 枚につき 1 回」を守るため
      // （Link など、カード以外の支払い方法では指紋が取れない。2026-11-18 の staging のテストで "(no card)" になった）
      // 今の Stripe の API では payment_method_types は使えない（支払い方法は管理画面で決める）ので、
      // カード以外を「除く」指定にする。Apple Pay・Google Pay はカード払いの一種なので残る
      if (offer.kind === 'trial') {
        ['link', 'klarna', 'zip', 'afterpay_clearpay', 'paypal'].forEach((type, i) =>
          params.append(`excluded_payment_method_types[${i}]`, type)
        );
      }

      if (offer.kind === 'subscription') {
        params.append('mode', 'subscription');
        params.append('subscription_data[metadata][supabase_user_id]', user.id);
        params.append('subscription_data[metadata][plan_key]', key);
      } else {
        params.append('mode', 'payment');
        params.append('payment_intent_data[metadata][supabase_user_id]', user.id);
        params.append('payment_intent_data[metadata][plan_key]', key);
        if (!customerRow?.customer_id) params.append('customer_creation', 'always');
      }

      // 初めてのプラン購入なら割引（体験を済ませた人は A$2、まだの人は A$1）
      if (offer.kind !== 'trial') {
        const { data: coupon } = await admin.rpc('first_plan_coupon', { p_user_id: user.id });
        if (typeof coupon === 'string' && coupon) params.append('discounts[0][coupon]', coupon);
      }
    } else if (body.priceId) {
      // ---------- クレジットパック（プランを使っている人だけ） ----------
      if (!paidAccess) {
        return json({ error: 'Credit packs are available to members with a plan. Please choose a plan first.' }, 403);
      }
      // クレジット数はブラウザから受け取らず、必ずここで決める
      const pricePlans = await fetchPricePlansData(supabase as any, url.hostname);
      const plan = pricePlans?.pricePlans
        ? getPlanByPriceId(pricePlans.pricePlans as Record<string, PlanConfig>, body.priceId)
        : undefined;
      if (!plan || plan.id === 'free' || plan.regularCredits + plan.bonusCredits <= 0) {
        return json({ error: 'Invalid price ID' }, 400);
      }
      params.append('mode', 'payment');
      params.append('success_url', `${origin}/?success=true`);
      params.append('cancel_url', `${origin}/?canceled=true`);
      params.append('line_items[0][price]', body.priceId);
      params.append('line_items[0][quantity]', '1');
      params.append('metadata[kind]', 'pack');
      params.append('metadata[regular_credits]', plan.regularCredits.toString());
      params.append('metadata[bonus_credits]', plan.bonusCredits.toString());
      params.append('metadata[bonus_expiry]', plan.expiryDate || '');
      if (!customerRow?.customer_id) params.append('customer_creation', 'always');
    } else {
      return json({ error: 'Please choose a plan.' }, 400);
    }

    const created = await stripeRequest(env, 'POST', 'checkout/sessions', params);
    if (!created.ok || !created.data?.url) {
      const detail = created.data?.error?.message || 'Unknown Stripe error';
      console.error('Stripe checkout session error:', detail);
      // テスト環境（sandbox）では、原因を画面にも出す（本番では出さない）
      return json({ error: keyIsLive ? 'Could not start checkout. Please try again.' : `Could not start checkout (test mode): ${detail}` }, 400);
    }
    return json({ url: created.data.url }, 200);
  } catch (err: any) {
    console.error('create-checkout-session error:', err?.message);
    const live = String(context?.env?.STRIPE_SECRET_KEY || '').includes('_live_');
    return json({ error: live ? 'Could not start checkout. Please try again.' : `Could not start checkout (test mode): ${err?.message}` }, 500);
  }
};
