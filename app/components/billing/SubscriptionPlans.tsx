/**
 * @file SubscriptionPlans.tsx
 * @description 料金ページの「プラン」部分（AI 体験・Basic/Plus の月額と年払い・VCE シーズンプラン）
 *
 * 値段とクレジット数は app/data/billing-plans.ts。買えるかどうかの最終判断はサーバー（create-checkout-session）。
 * 自動更新と解約の方法は、オーストラリアの消費者法に合わせて、ボタンの近くにはっきり書く。
 */
import React, { useEffect, useState } from 'react';
import { PLAN_OFFERS, type MyPlan, type PlanKey } from '~/data/billing-plans';
import { fetchMyPlan, formatDate, startPlanCheckout } from './billing-client';

const dollars = (cents: number) => `A$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;

export function SubscriptionPlans({ signedIn, onSignIn }: { signedIn: boolean; onSignIn: () => void }) {
  const [interval, setInterval] = useState<'month' | 'year'>('month');
  const [myPlan, setMyPlan] = useState<MyPlan | null>(null);
  const [busy, setBusy] = useState<PlanKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!signedIn) return setMyPlan(null);
    fetchMyPlan().then(setMyPlan);
  }, [signedIn]);

  const buy = async (key: PlanKey) => {
    if (!signedIn) return onSignIn();
    setBusy(key);
    setError(await startPlanCheckout(key));
    setBusy(null);
  };

  const discount = myPlan?.first_plan_coupon === 'FIRST_SUB_TRIAL' ? 2 : myPlan?.first_plan_coupon === 'FIRST_SUB' ? 1 : signedIn ? 0 : 1;
  const hasSubscription = Boolean(myPlan?.plan);
  const basic = PLAN_OFFERS[interval === 'month' ? 'basic_monthly' : 'basic_yearly'];
  const plus = PLAN_OFFERS[interval === 'month' ? 'plus_monthly' : 'plus_yearly'];
  const per = interval === 'month' ? '/ month' : '/ year';

  const card = 'bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm';
  const btn = 'w-full py-3 px-4 rounded-xl font-bold text-sm text-center transition-all cursor-pointer disabled:opacity-50';

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">Plans</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
          All lessons and VCE tools, plus AI credits every month. Credits you don’t use carry over to the next month.
        </p>
        {discount > 0 && (
          <p className="inline-block text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            🎁 A${discount} off your first plan{discount === 2 ? ' (thank you for trying AI Yamato!)' : ''}
          </p>
        )}
        {myPlan?.plan && (
          <p className="text-sm font-bold text-indigo-600">
            You’re on the {myPlan.plan === 'basic' ? 'Basic' : 'Plus'} plan. Manage it from My Account.
          </p>
        )}
        {myPlan?.season_ends_at && (
          <p className="text-sm font-bold text-indigo-600">Your VCE Exam Season plan is active until {formatDate(myPlan.season_ends_at)}.</p>
        )}
      </div>

      <div className="flex justify-center">
        <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 p-1 bg-white dark:bg-slate-900">
          {(['month', 'year'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setInterval(v)}
              className={`px-4 py-2 rounded-lg text-sm font-bold cursor-pointer ${
                interval === v ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {v === 'month' ? 'Monthly' : 'Yearly · 15% off'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {/* AI 体験 */}
        <div className={card}>
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">AI Trial</span>
            <div>
              <span className="text-4xl font-black text-slate-900 dark:text-white">{dollars(PLAN_OFFERS.ai_trial.priceCents)}</span>
              <span className="text-xs text-slate-500 ml-1">one-off</span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {PLAN_OFFERS.ai_trial.credits} AI credits to try any AI feature. One per person. Your A$1 comes back as a discount when you
              choose a plan.
            </p>
          </div>
          <button
            type="button"
            onClick={() => buy('ai_trial')}
            disabled={busy !== null || Boolean(myPlan?.trial_done) || Boolean(myPlan?.paid_access)}
            className={`${btn} mt-6 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200`}
          >
            {myPlan?.trial_done ? 'Trial used' : myPlan?.paid_access ? 'Included in your plan' : busy === 'ai_trial' ? 'Opening…' : 'Try AI for A$1'}
          </button>
        </div>

        {/* Basic */}
        <div className={card}>
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Basic</span>
            <div>
              <span className="text-4xl font-black text-slate-900 dark:text-white">{dollars(basic.priceCents)}</span>
              <span className="text-xs text-slate-500 ml-1">{per}</span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              All lessons and VCE tools + <b>{basic.credits} AI credits every month</b>.
            </p>
          </div>
          <button
            type="button"
            onClick={() => buy(interval === 'month' ? 'basic_monthly' : 'basic_yearly')}
            disabled={busy !== null || hasSubscription}
            className={`${btn} mt-6 bg-indigo-600 hover:bg-indigo-700 text-white`}
          >
            {busy?.startsWith('basic') ? 'Opening…' : 'Choose Basic'}
          </button>
        </div>

        {/* Plus */}
        <div className={`${card} ring-2 ring-indigo-500`}>
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Plus</span>
            <div>
              <span className="text-4xl font-black text-slate-900 dark:text-white">{dollars(plus.priceCents)}</span>
              <span className="text-xs text-slate-500 ml-1">{per}</span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              All lessons and VCE tools + <b>{plus.credits} AI credits every month</b>. For students who practise with AI a lot.
            </p>
          </div>
          <button
            type="button"
            onClick={() => buy(interval === 'month' ? 'plus_monthly' : 'plus_yearly')}
            disabled={busy !== null || hasSubscription}
            className={`${btn} mt-6 bg-indigo-600 hover:bg-indigo-700 text-white`}
          >
            {busy?.startsWith('plus') ? 'Opening…' : 'Choose Plus'}
          </button>
        </div>
      </div>

      {/* VCE シーズンプラン */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {(['season_3m', 'season_6m'] as const).map((key) => {
          const o = PLAN_OFFERS[key];
          return (
            <div key={key} className={card}>
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600">VCE Exam Season · {o.months} months</span>
                <div>
                  <span className="text-4xl font-black text-slate-900 dark:text-white">{dollars(o.priceCents)}</span>
                  <span className="text-xs text-slate-500 ml-1">one payment</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Everything in Basic for {o.months} months + <b>{o.credits.toLocaleString()} AI credits</b> up front, to use any time
                  during the season. <b>Does not renew.</b>
                </p>
              </div>
              <button
                type="button"
                onClick={() => buy(key)}
                disabled={busy !== null}
                className={`${btn} mt-6 bg-amber-500 hover:bg-amber-600 text-white`}
              >
                {busy === key ? 'Opening…' : `Choose ${o.months} months`}
              </button>
            </div>
          );
        })}
      </div>

      {error && <p className="text-center text-sm text-rose-600">{error}</p>}

      {/* 自動更新・解約・クレジットの期限（消費者法のため、はっきり書く） */}
      <div className="max-w-3xl mx-auto text-xs text-slate-500 dark:text-slate-400 space-y-1.5 leading-relaxed">
        <p>
          <b>Automatic renewal:</b> Basic and Plus renew automatically every month or year until you cancel. Yearly members get an
          email reminder before each renewal. VCE Exam Season plans and the AI Trial are one-off payments and never renew.
        </p>
        <p>
          <b>Cancel any time:</b> go to My Account → “Manage plan, card and receipts”. Your plan stays active until the end of the
          period you have paid for.
        </p>
        <p>
          <b>Credits:</b> monthly plan credits can be used until the end of the following month. VCE Exam Season credits last until the
          season ends. AI Trial and credit-pack credits last 1 year. Credit packs are top-ups for members with a plan.
        </p>
        <p>Prices are in Australian dollars. Payments are processed securely by Stripe.</p>
      </div>
    </section>
  );
}
