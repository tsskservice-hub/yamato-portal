/**
 * @file PricingSection.tsx
 * @description トップページの料金の紹介（Free・Basic・Plus の 3 枚と「See all plans」）。詳しくは料金ページ（/prices）
 *
 * ・Free のカードは kl_app の PRICE_PLANS.free、Basic・Plus の値段とクレジットは app/data/billing-plans.ts
 * ・クレジットパック（Top Up）はプランの人だけが買えるので、ここには出さない（料金ページの 3 つ目のセクション）
 * ・クレジットの消費ガイドは、今までどおりここにも出す
 * ・props は前のまま受け取る（_index.tsx を変えないため）。買うのは料金ページなので onCheckout は使わない
 */
import React, { useState, useEffect } from 'react';
import { Link } from '@remix-run/react';
import { Flame, Coins, Loader2 } from 'lucide-react';
import { fetchPricePlansData, PricePlansKnowledge } from '../data/price-plans';
import { PLAN_OFFERS } from '../data/billing-plans';
import { supabase } from '../lib/supabaseClient';

interface PricingSectionProps {
  isDarkMode: boolean;
  checkoutLoadingPriceId: string | null;
  onCheckout: (priceId: string) => void;
  onOpenAuthModal: (mode: 'signin' | 'signup') => void;
}

const dollars = (cents: number) => `A$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;

export function PricingSection({ isDarkMode }: PricingSectionProps) {
  const [priceData, setPriceData] = useState<PricePlansKnowledge | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await fetchPricePlansData(supabase);
        if (data && data.pricePlans) setPriceData(data);
      } catch (err) {
        console.error('Failed to load price plans:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <section className="space-y-12 text-center py-12" id="pricing">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
        <p className="text-xs text-slate-400">Loading pricing plans...</p>
      </section>
    );
  }

  const free = priceData?.pricePlans?.free;
  const creditConsumptionGuide = priceData?.creditConsumptionGuide;
  const campaignNotice = priceData?.campaignNotice;
  const card = `p-6 rounded-3xl border flex flex-col justify-between ${
    isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
  } shadow-sm`;
  const muted = isDarkMode ? 'text-slate-400' : 'text-slate-600';

  const paidCard = (tier: 'basic' | 'plus') => {
    const offer = PLAN_OFFERS[tier === 'basic' ? 'basic_monthly' : 'plus_monthly'];
    const yearly = PLAN_OFFERS[tier === 'basic' ? 'basic_yearly' : 'plus_yearly'];
    const featured = tier === 'plus';
    return (
      <div className={`${card} ${featured ? 'border-2 border-indigo-500' : ''}`}>
        <div className="space-y-3">
          <span className={`text-xs font-bold uppercase tracking-wider ${featured ? 'text-indigo-600' : 'text-slate-500'}`}>
            {tier === 'basic' ? 'Basic' : 'Plus'}
          </span>
          <div>
            <span className="text-4xl font-black">{dollars(offer.priceCents)}</span>
            <span className="text-xs text-slate-500 ml-1">/ month</span>
          </div>
          <p className={`text-xs font-bold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
            or {dollars(yearly.priceCents)} / year (15% off)
          </p>
          <p className={`text-sm ${muted}`}>
            All lessons and VCE tools + <b>{offer.credits} AI credits every month</b>.
          </p>
        </div>
      </div>
    );
  };

  return (
    <section className="space-y-10 text-center" id="pricing">
      <div className="space-y-4 max-w-3xl mx-auto">
        <h2 className="text-3xl font-extrabold tracking-tight">Plans</h2>
        <p className={`text-sm ${muted}`}>
          Start for free. Choose a plan for full access to all lessons and VCE tools, with AI credits every month.
        </p>
        {campaignNotice && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-red-600/10 via-orange-600/10 to-amber-600/10 border border-red-500/30 flex items-center justify-center space-x-2 text-xs sm:text-sm font-semibold text-red-700 dark:text-red-300 shadow-sm">
            <Flame className="w-4 h-4 text-red-600 shrink-0 animate-bounce" />
            <span>{campaignNotice.rawText || campaignNotice.description}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-5xl mx-auto">
        {free && (
          <div className={card}>
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{free.name}</span>
              <div>
                <span className="text-4xl font-black">{free.price}</span>
                <span className="text-xs text-slate-500 ml-1">{free.period}</span>
              </div>
              <p className={`text-sm ${muted}`}>{free.description}</p>
            </div>
          </div>
        )}
        {paidCard('basic')}
        {paidCard('plus')}
      </div>

      <div className="space-y-2">
        <Link
          to="/prices"
          className="inline-block px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-colors"
        >
          See all plans
        </Link>
        <p className={`text-xs ${muted}`}>
          Also available: a {dollars(PLAN_OFFERS.ai_trial.priceCents)} AI Trial, and 3-month or 6-month passes that don’t renew.
        </p>
      </div>

      {creditConsumptionGuide && creditConsumptionGuide.length > 0 && (
        <div id="pricing-credits-guide" className={`max-w-2xl mx-auto p-4 rounded-2xl border text-xs ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'} shadow-sm scroll-mt-20`}>
          <div className="flex items-center justify-center space-x-2 font-bold mb-3">
            <Coins className="w-4 h-4 text-amber-500" />
            <span>Credit Consumption Guide</span>
          </div>
          <div className="space-y-2 text-slate-500">
            {creditConsumptionGuide.map((row, idx) => (
              <div key={idx} className="flex justify-between border-b border-slate-500/10 pb-1.5 last:border-0 last:pb-0">
                <span>{row.item}</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{row.cost}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
