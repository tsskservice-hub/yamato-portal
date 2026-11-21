/**
 * @file app/lib/stripe-cancel.server.ts
 * @description アカウントを削除するときに、その人の Stripe のサブスクをすぐ解約する（2026-11-22）
 *   アカウントが消えたあとも請求が続かないように。利用規約 16 章「Credits and any plan end when the account is deleted」
 *   解約できなかったときは ok: false を返す → 呼ぶ側はアカウントを消さない（請求だけ残るのを防ぐ）
 */

/** まだ請求が続く可能性のある状態（これ以外は解約ずみ・未成立） */
const ACTIVE_STATUSES = ['active', 'trialing', 'past_due', 'unpaid', 'incomplete', 'paused'];

function stripeKey(context: any): string {
  const env = context?.cloudflare?.env || context?.env || {};
  if (env.STRIPE_SECRET_KEY) return String(env.STRIPE_SECRET_KEY);
  try {
    if (typeof process !== 'undefined' && process.env?.STRIPE_SECRET_KEY) return process.env.STRIPE_SECRET_KEY;
  } catch {}
  return '';
}

async function stripeCall(key: string, method: 'GET' | 'DELETE', id: string) {
  const res = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(id)}`, {
    method,
    headers: { Authorization: `Bearer ${key}` },
  });
  const data: any = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

export async function cancelUserSubscriptions(
  admin: any,
  userId: string,
  context: any
): Promise<{ ok: true; cancelled: number } | { ok: false; error: string }> {
  const { data: rows, error } = await admin
    .from('subscriptions')
    .select('id, status')
    .eq('user_id', userId)
    .in('status', ACTIVE_STATUSES);
  if (error) {
    console.error('cancelUserSubscriptions: could not read subscriptions:', error.message);
    return { ok: false, error: 'We could not check your subscription. Please try again.' };
  }
  if (!rows || rows.length === 0) return { ok: true, cancelled: 0 };

  const key = stripeKey(context);
  if (!key) {
    console.error('cancelUserSubscriptions: STRIPE_SECRET_KEY is missing.');
    return { ok: false, error: 'We could not cancel your subscription. Please cancel it in “Manage plan, card and receipts” first, then delete your account.' };
  }

  let cancelled = 0;
  for (const row of rows as { id: string }[]) {
    const res = await stripeCall(key, 'DELETE', row.id);
    if (res.ok) {
      cancelled += 1;
      continue;
    }
    // もう解約ずみ、またはこの環境の Stripe にないサブスク（sandbox で作ったものなど）なら、続ける
    if (res.data?.error?.code === 'resource_missing') continue;
    const check = await stripeCall(key, 'GET', row.id);
    if (check.ok && ['canceled', 'incomplete_expired'].includes(check.data?.status)) continue;
    console.error(`cancelUserSubscriptions: could not cancel ${row.id}:`, res.data?.error?.message);
    return { ok: false, error: 'We could not cancel your subscription. Please cancel it in “Manage plan, card and receipts” first, then delete your account.' };
  }
  return { ok: true, cancelled };
}
