/**
 * @file PricingSection.tsx
 * @description 料金プランおよびクレジットパック、消費ガイドのセクションコンポーネント
 */
import React from 'react';
import { Link } from '@remix-run/react';
import { Flame, Check, Coins, Loader2 } from 'lucide-react';
import { PRICE_PLANS, CREDIT_CONSUMPTION_GUIDE, CAMPAIGN_NOTICE } from '../data/price-plans';

interface PricingSectionProps {
  isDarkMode: boolean;
  checkoutLoadingPriceId: string | null;
  onCheckout: (priceId: string) => void;
  onOpenAuthModal: (mode: 'signin' | 'signup') => void;
}

export function PricingSection({
  isDarkMode,
  checkoutLoadingPriceId,
  onCheckout,
  onOpenAuthModal,
}: PricingSectionProps) {
  return (
    <section className="space-y-12 text-center" id="pricing">
      <div className="space-y-4 max-w-3xl mx-auto">
        <h2 className="text-3xl font-extrabold tracking-tight">Choose Your Plan & Credit Packs</h2>
        <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          Start for free with daily credits, or top up with prepaid charge packs for intensive study.
        </p>
             
        <div className="p-4 rounded-2xl bg-gradient-to-r from-red-600/10 via-orange-600/10 to-amber-600/10 border border-red-500/30 flex items-center justify-center space-x-2 text-xs sm:text-sm font-semibold text-red-700 dark:text-red-300 shadow-sm">
          <Flame className="w-4 h-4 text-red-600 shrink-0 animate-bounce" />
          <span>{CAMPAIGN_NOTICE.rawText}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
        {/* Free Plan */}
        <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{PRICE_PLANS.free.name}</span>
            <div>
              <span className="text-4xl font-black">{PRICE_PLANS.free.price}</span>
              <span className="text-xs text-slate-500 ml-1">{PRICE_PLANS.free.period}</span>
            </div>
            <div className="inline-block px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 text-xs font-bold">
              {PRICE_PLANS.free.badge}
            </div>
            <p className="text-xs text-slate-500">{PRICE_PLANS.free.description}</p>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              {PRICE_PLANS.free.features.map((feat: string, idx: number) => (
                <li key={idx} className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-blue-600" /><span>{feat}</span></li>
              ))}
            </ul>
          </div>
          <button 
            onClick={() => onOpenAuthModal('signup')}
            className="mt-6 w-full py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {PRICE_PLANS.free.ctaText}
          </button>
        </div>

        {/* Starter Pack */}
        <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">{PRICE_PLANS.starter.name}</span>
            <div>
              <span className="text-4xl font-black">{PRICE_PLANS.starter.price}</span>
              <span className="text-xs text-slate-500 ml-1">{PRICE_PLANS.starter.period}</span>
            </div>
            <div className="inline-block px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 text-xs font-bold leading-normal">
              {PRICE_PLANS.starter.badge}
            </div>
            <p className="text-xs text-slate-500">{PRICE_PLANS.starter.description}</p>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              {PRICE_PLANS.starter.features.map((feat: string, idx: number) => (
                <li key={idx} className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-blue-600" /><span>{feat}</span></li>
              ))}
            </ul>
          </div>
          <div className="mt-6 space-y-3">
            <button 
              onClick={() => onCheckout(PRICE_PLANS.starter.id)} 
              disabled={checkoutLoadingPriceId === PRICE_PLANS.starter.id}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-600/20 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              {checkoutLoadingPriceId === PRICE_PLANS.starter.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Buy Starter Pack</span>
            </button>
            <p className="text-[10px] text-center text-slate-400 dark:text-slate-500">
              By purchasing, you agree to our <Link to="/terms" className="underline hover:text-slate-600">Terms</Link> & <Link to="/disclaimer" className="underline hover:text-slate-600">Disclaimer</Link>.
            </p>
          </div>
        </div>

        {/* Standard Pack */}
        <div className={`p-6 rounded-3xl border-2 border-blue-600 flex flex-col justify-between relative ${isDarkMode ? 'bg-slate-900' : 'bg-white'} shadow-xl`}>
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-blue-600 text-white text-[10px] font-extrabold uppercase tracking-widest rounded-full">
            Most Popular
          </div>
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">{PRICE_PLANS.standard.name}</span>
            <div>
              <span className="text-4xl font-black">{PRICE_PLANS.standard.price}</span>
              <span className="text-xs text-slate-500 ml-1">{PRICE_PLANS.standard.period}</span>
            </div>
            <div className="inline-block px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 text-xs font-bold leading-normal">
              {PRICE_PLANS.standard.badge}
            </div>
            <p className="text-xs text-slate-500">{PRICE_PLANS.standard.description}</p>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              {PRICE_PLANS.standard.features.map((feat: string, idx: number) => (
                <li key={idx} className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-blue-600" /><span>{feat}</span></li>
              ))}
            </ul>
          </div>
          <div className="mt-6 space-y-3">
            <button 
              onClick={() => onCheckout(PRICE_PLANS.standard.id)} 
              disabled={checkoutLoadingPriceId === PRICE_PLANS.standard.id}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-600/20 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              {checkoutLoadingPriceId === PRICE_PLANS.standard.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Buy Standard Pack</span>
            </button>
            <p className="text-[10px] text-center text-slate-400 dark:text-slate-500">
              By purchasing, you agree to our <Link to="/terms" className="underline hover:text-slate-600">Terms</Link> & <Link to="/disclaimer" className="underline hover:text-slate-600">Disclaimer</Link>.
            </p>
          </div>
        </div>

        {/* Pro Intensivist */}
        <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-600">{PRICE_PLANS.pro.name}</span>
            <div>
              <span className="text-4xl font-black">{PRICE_PLANS.pro.price}</span>
              <span className="text-xs text-slate-500 ml-1">{PRICE_PLANS.pro.period}</span>
            </div>
            <div className="inline-block px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-600 text-xs font-bold leading-normal">
              {PRICE_PLANS.pro.badge}
            </div>
            <p className="text-xs text-slate-500">{PRICE_PLANS.pro.description}</p>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              {PRICE_PLANS.pro.features.map((feat: string, idx: number) => (
                <li key={idx} className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-purple-600" /><span>{feat}</span></li>
              ))}
            </ul>
          </div>
          <div className="mt-6 space-y-3">
            <button 
              onClick={() => onCheckout(PRICE_PLANS.pro.id)} 
              disabled={checkoutLoadingPriceId === PRICE_PLANS.pro.id}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-purple-600/20 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              {checkoutLoadingPriceId === PRICE_PLANS.pro.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Buy Pro Pack</span>
            </button>
            <p className="text-[10px] text-center text-slate-400 dark:text-slate-500">
              By purchasing, you agree to our <Link to="/terms" className="underline hover:text-slate-600">Terms</Link> & <Link to="/disclaimer" className="underline hover:text-slate-600">Disclaimer</Link>.
            </p>
          </div>
        </div>
      </div>

      <div id="pricing-credits-guide" className={`max-w-2xl mx-auto p-4 rounded-2xl border text-xs ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'} shadow-sm scroll-mt-20`}>
        <div className="flex items-center justify-center space-x-2 font-bold mb-3">
          <Coins className="w-4 h-4 text-amber-500" />
          <span>Credit Consumption Guide (Max Cap Guard Active)</span>
        </div>
        <div className="space-y-2 text-slate-500">
          {CREDIT_CONSUMPTION_GUIDE.map((row: { item: string; cost: string }, idx: number) => (
            <div key={idx} className="flex justify-between border-b border-slate-500/10 pb-1.5 last:border-0 last:pb-0">
              <span>{row.item}</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">{row.cost}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}