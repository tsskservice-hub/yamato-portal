/**
 * @file PlanSection.tsx
 * @description マイアカウントの「Your plan」。今のプラン・次の更新日・解約の予約と、
 *   Stripe のお客様用ページ（解約・カード変更・領収書）を開くボタン
 */
import React, { useEffect, useState } from 'react';
import { Link } from '@remix-run/react';
import type { MyPlan } from '~/data/billing-plans';
import { fetchMyPlan, formatDate, openBillingPortal } from './billing-client';

const PLAN_LABEL: Record<string, string> = { basic: 'Basic', plus: 'Plus' };

export function PlanSection({ userId }: { userId?: string }) {
  const [plan, setPlan] = useState<MyPlan | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justPaid, setJustPaid] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const paid = params.get('checkout') === 'success';
    setJustPaid(paid);
    const load = async () => {
      const p = await fetchMyPlan();
      if (!cancelled) {
        setPlan(p);
        setLoaded(true);
      }
      return p;
    };
    load().then((p) => {
      // 支払い直後は、Stripe からの通知が届くまで少しかかることがあるので、もう一度読む
      if (paid && !p?.paid_access && !p?.trial_done) setTimeout(load, 4000);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!userId || !loaded) return null;

  const manage = async () => {
    setBusy(true);
    setError(await openBillingPortal());
    setBusy(false);
  };

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-3">
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Your plan</h2>
      {justPaid && (
        <p className="text-sm rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-2">
          Thank you! Your payment was received. It can take a few seconds for your plan and credits to appear.
        </p>
      )}

      {plan?.plan ? (
        <div className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
          <p className="text-base font-bold text-slate-900 dark:text-white">
            {PLAN_LABEL[plan.plan]} · {plan.interval === 'year' ? 'yearly' : 'monthly'}
          </p>
          {plan.status === 'past_due' && (
            <p className="text-rose-600 font-bold">Your last payment didn’t go through. Please update your card.</p>
          )}
          {plan.cancel_at_period_end ? (
            <p>
              Cancelled — your plan stays active until <b>{formatDate(plan.period_end)}</b> and will not renew.
            </p>
          ) : (
            <p>
              Renews automatically on <b>{formatDate(plan.period_end)}</b>. You can cancel any time before then.
            </p>
          )}
        </div>
      ) : plan?.season_ends_at ? (
        <div className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
          <p className="text-base font-bold text-slate-900 dark:text-white">VCE Exam Season</p>
          <p>
            Active until <b>{formatDate(plan.season_ends_at)}</b>. It does not renew automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
          <p className="text-base font-bold text-slate-900 dark:text-white">Free plan</p>
          {!plan?.ai_unlocked && <p>To use the AI features, start with the AI Trial (A$1 for 100 credits) or choose a plan.</p>}
          <Link to="/prices" className="inline-block text-indigo-600 font-bold underline">
            See plans
          </Link>
        </div>
      )}

      {plan?.has_customer && (
        <div className="pt-1">
          <button
            type="button"
            onClick={manage}
            disabled={busy}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
          >
            {busy ? 'Opening…' : 'Manage plan, card and receipts'}
          </button>
          <p className="text-xs text-slate-500 mt-1">You can cancel, change your card and download receipts on the secure Stripe page.</p>
        </div>
      )}
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </section>
  );
}
