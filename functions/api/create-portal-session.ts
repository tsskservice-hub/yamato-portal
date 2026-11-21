/**
 * @file functions/api/create-portal-session.ts
 * @description Stripe のお客様用ページ（Customer portal）を開く。解約・カードの変更・領収書の確認ができる
 *
 * ・本人はログイン情報（アクセストークン）から決める
 * ・お客様 ID は stripe_customers（51_subscriptions.sql）から。まだ何も買っていない人は開けない
 * ・本番は公開用（live）、プレビュー・localhost は sandbox（test）の Stripe を使う
 */
import { createClient } from '@supabase/supabase-js';
import { isProductionHost } from '../../app/utils/developerOnly';

const DEFAULT_SUPABASE_URL = 'https://ybquwzoreecxxbewjpdn.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_kxxOp7nY3OuRNYp_Cxl5Sw_QtVCG_te';

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export const onRequestPost = async (context: any) => {
  try {
    const { request, env } = context;
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) return json({ error: 'Please log in to continue.' }, 401);

    const supabaseUrl = env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
    const supabase = createClient(supabaseUrl, PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) return json({ error: 'Please log in to continue.' }, 401);

    if (!env.STRIPE_SECRET_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('create-portal-session: STRIPE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY is missing.');
      return json({ error: 'Server configuration error' }, 500);
    }
    const url = new URL(request.url);
    if (isProductionHost(url.hostname) !== String(env.STRIPE_SECRET_KEY).includes('_live_')) {
      console.error(`Stripe key mode mismatch: host=${url.hostname}`);
      return json({ error: 'Server configuration error' }, 500);
    }

    const admin = createClient(supabaseUrl, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: row } = await admin.from('stripe_customers').select('customer_id').eq('user_id', authData.user.id).maybeSingle();
    if (!row?.customer_id) return json({ error: 'You have no plan or purchases to manage yet.' }, 404);

    const params = new URLSearchParams();
    params.append('customer', row.customer_id);
    params.append('return_url', `${url.protocol}//${url.host}/my-account`);
    const res = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || !data?.url) {
      console.error('Stripe portal session error:', data?.error?.message || 'Unknown Stripe error');
      return json({ error: 'Could not open the plan management page. Please try again.' }, 400);
    }
    return json({ url: data.url }, 200);
  } catch (err: any) {
    console.error('create-portal-session error:', err?.message);
    return json({ error: 'Could not open the plan management page. Please try again.' }, 500);
  }
};
