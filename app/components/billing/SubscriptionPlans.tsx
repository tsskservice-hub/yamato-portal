/**
 * @file SubscriptionPlans.tsx
 * @description 料金ページの上 2 つのセクション
 *   1. Subscription plans（Free・Basic・Plus。月額と年払いを切り替え）
 *   2. One-off payments（AI 体験・3-Month Pass・6-Month Pass。自動更新しない）
 *   3 つ目のセクション（Top-up credits）は prices.tsx（kl_app の PRICE_PLANS）
 *
 * 値段とクレジット数は app/data/billing-plans.ts。買えるかどうかの最終判断はサーバー（create-checkout-session）。
 * 自動更新・解約の方法・クレジットの期限は、オーストラリアの消費者法に合わせて、ボタンの近くにはっきり書く。
 */
import React, { useEffect, useState } from 'react';
import { Link } from '@remix-run/react';
import { PLAN_OFFERS, type MyPlan, type PlanKey } from '~/data/billing-plans';
import type { PlanConfig } from '~/data/price-plans';
import { fetchMyPlan, formatDate, startPlanCheckout } from './billing-client';
import { FreePlanFeatures } from './FreePlanFeatures';
import { supabase } from '~/lib/supabaseClient';

const dollars = (cents: number) => `A$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;

const card = 'bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm';
/** 購入ボタンの下に出す同意の文（クレジットパックのカードと同じ） */
function AgreeNote() {
  return (
    <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 mt-2">
      By purchasing, you agree to our{' '}
      <Link to="/legal/terms" className="underline hover:text-slate-600">
        Terms
      </Link>{' '}
      &{' '}
      <Link to="/legal/disclaimer" className="underline hover:text-slate-600">
        Disclaimer
      </Link>
      .
    </p>
  );
}

const btn = 'w-full py-3 px-4 rounded-xl font-bold text-sm text-center transition-all cursor-pointer disabled:opacity-50 block';

export function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="text-center space-y-2">
      <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">{title}</h2>
      <p className="text-sm text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">{subtitle}</p>
    </div>
  );
}

export function SubscriptionPlans({
  signedIn,
  onSignIn,
  freePlan,
}: {
  signedIn: boolean;
  onSignIn: () => void;
  /** フリープランのカード（kl_app の PRICE_PLANS.free） */
  freePlan?: PlanConfig;
}) {
  const [interval, setInterval] = useState<'month' | 'year'>('month');
  const [myPlan, setMyPlan] = useState<MyPlan | null>(null);
  const [busy, setBusy] = useState<PlanKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ログインの判定は、サーバーのクッキー（signedIn）だけでなく、ブラウザのログイン情報も見る
  // （クッキーの期限が切れていても、ブラウザがログインしていれば買えるようにする。支払いの処理もブラウザの情報を使う）
  useEffect(() => {
    fetchMyPlan().then(setMyPlan);
  }, [signedIn]);

  const buy = async (key: PlanKey) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return onSignIn();
    setBusy(key);
    setError(await startPlanCheckout(key));
    setBusy(null);
  };

  const discount = myPlan?.first_plan_coupon === 'FIRST_SUB_TRIAL' ? 2 : myPlan?.first_plan_coupon === 'FIRST_SUB' ? 1 : myPlan ? 0 : 1;
  const hasSubscription = Boolean(myPlan?.plan);
  // パスとサブスクは同時に持てない（サーバーも確かめる）
  const hasPass = Boolean(myPlan?.season_ends_at);
  const yearly = interval === 'year';

  const planCard = (tier: 'basic' | 'plus') => {
    const monthly = PLAN_OFFERS[`${tier}_monthly` as PlanKey];
    const key = (yearly ? `${tier}_yearly` : `${tier}_monthly`) as PlanKey;
    const offer = PLAN_OFFERS[key];
    const featured = tier === 'plus';
    return (
      <div className={card}>
        <div className="space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            {tier === 'basic' ? 'Basic' : 'Plus'}
          </span>
          <div>
            <span className="text-4xl font-black text-slate-900 dark:text-white">{dollars(offer.priceCents)}</span>
            <span className="text-xs text-slate-500 ml-1">{yearly ? '/ year' : '/ month'}</span>
          </div>
          {yearly && (
            <p className="text-xs font-bold text-emerald-700">
              = {dollars(Math.round(offer.priceCents / 12))} / month on average (monthly plan: {dollars(monthly.priceCents)} / month)
            </p>
          )}
          <p className="text-sm text-slate-600 dark:text-slate-300">
            All lessons and VCE tools + <b>{offer.credits} AI credits every month</b>
            {featured ? '. For students who practise with AI a lot.' : '.'}
          </p>
          <p className="text-xs text-slate-500">Each month’s credits expire 2 months after you receive them.</p>
        </div>
        <button
          type="button"
          onClick={() => buy(key)}
          disabled={busy !== null || hasSubscription || hasPass}
          className={`${btn} mt-6 bg-indigo-600 hover:bg-indigo-700 text-white`}
        >
          {busy === key
            ? 'Opening…'
            : hasSubscription
              ? 'You have a plan'
              : hasPass
                ? 'Available after your pass ends'
                : `Choose ${tier === 'basic' ? 'Basic' : 'Plus'}`}
        </button>
        <AgreeNote />
      </div>
    );
  };

  return (
    <>
      {/* ---------- 1. Subscription plans ---------- */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-6">
        <SectionHeading
          title="Subscription plans"
          subtitle="Full access to all lessons and VCE tools, with AI credits every month. Renews automatically — cancel any time."
        />
        <div className="text-center space-y-2">
          {discount > 0 && (
            <p className="inline-block text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              🎁 A${discount} off your first plan or pass{discount === 2 ? ' (thank you for trying the AI Trial!)' : ''}
            </p>
          )}
          {myPlan?.plan && (
            <p className="text-sm font-bold text-indigo-600">
              You’re on the {myPlan.plan === 'basic' ? 'Basic' : 'Plus'} plan. Manage it from My Account.
            </p>
          )}
          {hasPass && (
            <p className="text-sm font-bold text-indigo-600">
              Your pass is active until {formatDate(myPlan!.season_ends_at)}. You can start a subscription after it ends.
            </p>
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
          {/* Free（kl_app の PRICE_PLANS.free） */}
          {freePlan && (
            <div className={card}>
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{freePlan.name}</span>
                <div>
                  <span className="text-4xl font-black text-slate-900 dark:text-white">{freePlan.price}</span>
                  <span className="text-xs text-slate-500 ml-1">{freePlan.period}</span>
                </div>
                {freePlan.badge && (
                  <div className="inline-block px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 text-xs font-bold">{freePlan.badge}</div>
                )}
                <p className="text-sm text-slate-600 dark:text-slate-300">{freePlan.description}</p>
                <FreePlanFeatures />
              </div>
              <Link
                to={freePlan.ctaLink || '/'}
                className={`${btn} mt-6 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200`}
              >
                {freePlan.ctaText || 'Get Started Free'}
              </Link>
            </div>
          )}
          {planCard('basic')}
          {planCard('plus')}
        </div>

        <div className="max-w-3xl mx-auto text-xs text-slate-500 dark:text-slate-400 space-y-1.5 leading-relaxed">
          <p>
            <b>Automatic renewal:</b> Basic and Plus renew automatically every month or every year until you cancel. Yearly members get an
            email reminder before each renewal.
          </p>
          <p>
            <b>Cancel any time:</b> once you have subscribed, a “Manage plan, card and receipts” button appears in My Account (under
            “Your plan”). Press it to cancel on the secure Stripe page. Your plan stays active until the end of the period you have paid for.
          </p>
        </div>
      </section>

      {/* ---------- 2. One-off payments ---------- */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-6">
        <SectionHeading
          title="One-off payments"
          subtitle="Pay once — these never renew. Try the AI features, or get full access for a few months of focused study, for example before an exam."
        />
        {myPlan?.season_ends_at && (
          <p className="text-center text-sm font-bold text-indigo-600">
            Your pass is active until {formatDate(myPlan.season_ends_at)}. Buying another pass adds its months after that date.
          </p>
        )}
        {hasSubscription && (
          <p className="text-center text-sm font-bold text-indigo-600">
            Your subscription already gives you full access. For more AI credits, see Top-up credits below.
          </p>
        )}
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
                <b>{PLAN_OFFERS.ai_trial.credits} AI credits</b> to try any AI feature. One per person. Your A$1 comes back as a discount
                when you choose a plan or pass.
              </p>
              <p className="text-xs text-slate-500">Credits can be used for 1 year.</p>
            </div>
            <button
              type="button"
              onClick={() => buy('ai_trial')}
              disabled={busy !== null || Boolean(myPlan?.trial_done) || Boolean(myPlan?.paid_access)}
              className={`${btn} mt-6 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200`}
            >
              {myPlan?.trial_done ? 'Trial used' : myPlan?.paid_access ? 'Included in your plan' : busy === 'ai_trial' ? 'Opening…' : 'Try AI for A$1'}
            </button>
            <AgreeNote />
          </div>

          {/* 3-Month Pass / 6-Month Pass */}
          {(['season_3m', 'season_6m'] as const).map((key) => {
            const o = PLAN_OFFERS[key];
            return (
              <div key={key} className={card}>
                <div className="space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-600">{o.name}</span>
                  <div>
                    <span className="text-4xl font-black text-slate-900 dark:text-white">{dollars(o.priceCents)}</span>
                    <span className="text-xs text-slate-500 ml-1">one payment</span>
                  </div>
                  <p className="text-xs font-bold text-emerald-700">= {dollars(Math.round(o.priceCents / (o.months ?? 1)))} / month</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Full access for {o.months} months + <b>{o.credits.toLocaleString()} AI credits</b> up front. For focused study, for
                    example in the months before an exam.
                  </p>
                  <p className="text-xs text-slate-500">Credits can be used until the pass ends. Does not renew.</p>
                </div>
                <button
                  type="button"
                  onClick={() => buy(key)}
                  disabled={busy !== null || hasSubscription}
                  className={`${btn} mt-6 bg-amber-500 hover:bg-amber-600 text-white`}
                >
                  {busy === key ? 'Opening…' : hasSubscription ? 'Included in your subscription' : hasPass ? `Extend with ${o.name}` : `Choose ${o.name}`}
                </button>
                <AgreeNote />
              </div>
            );
          })}
        </div>
        {error && <p className="text-center text-sm text-rose-600">{error}</p>}
        <p className="max-w-3xl mx-auto text-xs text-slate-500 dark:text-slate-400 text-center">
          Prices are in Australian dollars. Payments are processed securely by Stripe.
        </p>
      </section>

      {/* ---------- クレジットの有効期限（買った日から数える。種類ごとに長さが違う） ---------- */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 text-sm text-slate-700 dark:text-slate-300">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">How long do credits last?</h3>
          <p>
            Credits expire a set time <b>after the day you buy</b> — not at the end of a calendar month. How long they last depends on what
            you buy:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <b>Basic and Plus (monthly or yearly):</b> each month’s credits last <b>2 months</b> from the day you receive them. You
              receive them on the same date each month. <i>Example: subscribe on 28 January → the credits you get that day expire on
              28 March, and the credits you get on 28 February expire on 28 April.</i>
            </li>
            <li>
              <b>3-Month and 6-Month Pass:</b> credits last until the pass ends. <i>Example: buy a 6-Month Pass on 5 May → your credits
              expire on 5 November.</i>
            </li>
            <li>
              <b>AI Trial and top-ups:</b> credits last <b>1 year</b>. <i>Example: buy a top-up on 10 March 2027 → those credits expire on
              10 March 2028.</i>
            </li>
            <li>
              <b>Daily quiz credits:</b> last <b>7 days</b>.
            </li>
          </ul>
          <p className="text-xs text-slate-500">
            When you use AI, the credits that expire soonest are used first. You can see your credit history in My Account.
          </p>
        </div>
      </section>
    </>
  );
}
