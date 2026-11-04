/**
 * @file PricingSection.tsx
 * @description 料金プランおよびクレジットパック、消費ガイドのセクションコンポーネント（動的データ対応版）
 */
import React, { useState, useEffect } from 'react';
import { Link } from '@remix-run/react';
import { Flame, Check, Coins, Loader2 } from 'lucide-react';
import { fetchPricePlansData, PricePlansKnowledge } from '../data/price-plans';
import { supabase } from '../lib/supabaseClient';

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
  const [priceData, setPriceData] = useState<PricePlansKnowledge | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await fetchPricePlansData(supabase);
        if (data && data.pricePlans) {
          setPriceData(data);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("Failed to load price plans:", err);
        setError(true);
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

  if (error || !priceData || !priceData.pricePlans) {
    return null;
  }

  const { pricePlans, creditConsumptionGuide, campaignNotice } = priceData;

  return (
    <section className="space-y-12 text-center" id="pricing">
      <div className="space-y-4 max-w-3xl mx-auto">
        <h2 className="text-3xl font-extrabold tracking-tight">Choose Your Plan & Credit Packs</h2>
        <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          Start for free with daily credits, or top up with prepaid charge packs for intensive study.
        </p>
           
        {campaignNotice && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-red-600/10 via-orange-600/10 to-amber-600/10 border border-red-500/30 flex items-center justify-center space-x-2 text-xs sm:text-sm font-semibold text-red-700 dark:text-red-300 shadow-sm">
            <Flame className="w-4 h-4 text-red-600 shrink-0 animate-bounce" />
            <span>{campaignNotice.rawText || campaignNotice.description}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
        {/* Free Plan */}
        {pricePlans.free && (
          <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{pricePlans.free.name}</span>
              <div>
                <span className="text-4xl font-black">{pricePlans.free.price}</span>
                <span className="text-xs text-slate-500 ml-1">{pricePlans.free.period}</span>
              </div>
              {pricePlans.free.badge && (
                <div className="inline-block px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 text-xs font-bold">
                  {pricePlans.free.badge}
                </div>
              )}
              <p className="text-xs text-slate-500">{pricePlans.free.description}</p>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                {pricePlans.free.features.map((feat: string, idx: number) => (
                  <li key={idx} className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-blue-600" /><span>{feat}</span></li>
                ))}
              </ul>
            </div>
            <button 
              onClick={() => onOpenAuthModal('signup')}
              className="mt-6 w-full py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {pricePlans.free.ctaText || "Get Started Free"}
            </button>
          </div>
        )}

        {/* Starter Pack */}
        {pricePlans.starter && (
          <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">{pricePlans.starter.name}</span>
              <div>
                <span className="text-4xl font-black">{pricePlans.starter.price}</span>
                <span className="text-xs text-slate-500 ml-1">{pricePlans.starter.period}</span>
              </div>
              {pricePlans.starter.badge && (
                <div className="inline-block px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 text-xs font-bold leading-normal">
                  {pricePlans.starter.badge}
                </div>
              )}
              <p className="text-xs text-slate-500">{pricePlans.starter.description}</p>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                {pricePlans.starter.features.map((feat: string, idx: number) => (
                  <li key={idx} className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-blue-600" /><span>{feat}</span></li>
                ))}
              </ul>
            </div>
            <div className="mt-6 space-y-3">
              <button 
                onClick={() => onCheckout(pricePlans.starter!.id)} 
                disabled={checkoutLoadingPriceId === pricePlans.starter.id}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-600/20 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                {checkoutLoadingPriceId === pricePlans.starter.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{pricePlans.starter.ctaText || "Buy Starter Pack"}</span>
              </button>
              <p className="text-[10px] text-center text-slate-400 dark:text-slate-500">
                By purchasing, you agree to our <Link to="/terms" className="underline hover:text-slate-600">Terms</Link> & <Link to="/disclaimer" className="underline hover:text-slate-600">Disclaimer</Link>.
              </p>
            </div>
          </div>
        )}

        {/* Standard Pack */}
        {pricePlans.standard && (
          <div className={`p-6 rounded-3xl border-2 border-blue-600 flex flex-col justify-between relative ${isDarkMode ? 'bg-slate-900' : 'bg-white'} shadow-xl`}>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-blue-600 text-white text-[10px] font-extrabold uppercase tracking-widest rounded-full">
              Most Popular
            </div>
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">{pricePlans.standard.name}</span>
              <div>
                <span className="text-4xl font-black">{pricePlans.standard.price}</span>
                <span className="text-xs text-slate-500 ml-1">{pricePlans.standard.period}</span>
              </div>
              {pricePlans.standard.badge && (
                <div className="inline-block px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 text-xs font-bold leading-normal">
                  {pricePlans.standard.badge}
                </div>
              )}
              <p className="text-xs text-slate-500">{pricePlans.standard.description}</p>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                {pricePlans.standard.features.map((feat: string, idx: number) => (
                  <li key={idx} className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-blue-600" /><span>{feat}</span></li>
                ))}
              </ul>
            </div>
            <div className="mt-6 space-y-3">
              <button 
                onClick={() => onCheckout(pricePlans.standard!.id)} 
                disabled={checkoutLoadingPriceId === pricePlans.standard.id}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-600/20 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                {checkoutLoadingPriceId === pricePlans.standard.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{pricePlans.standard.ctaText || "Buy Standard Pack"}</span>
              </button>
              <p className="text-[10px] text-center text-slate-400 dark:text-slate-500">
                By purchasing, you agree to our <Link to="/terms" className="underline hover:text-slate-600">Terms</Link> & <Link to="/disclaimer" className="underline hover:text-slate-600">Disclaimer</Link>.
              </p>
            </div>
          </div>
        )}

        {/* Pro Intensivist */}
        {pricePlans.pro && (
          <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-600">{pricePlans.pro.name}</span>
              <div>
                <span className="text-4xl font-black">{pricePlans.pro.price}</span>
                <span className="text-xs text-slate-500 ml-1">{pricePlans.pro.period}</span>
              </div>
              {pricePlans.pro.badge && (
                <div className="inline-block px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-600 text-xs font-bold leading-normal">
                  {pricePlans.pro.badge}
                </div>
              )}
              <p className="text-xs text-slate-500">{pricePlans.pro.description}</p>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                {pricePlans.pro.features.map((feat: string, idx: number) => (
                  <li key={idx} className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-purple-600" /><span>{feat}</span></li>
                ))}
              </ul>
            </div>
            <div className="mt-6 space-y-3">
              <button 
                onClick={() => onCheckout(pricePlans.pro!.id)} 
                disabled={checkoutLoadingPriceId === pricePlans.pro.id}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-purple-600/20 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                {checkoutLoadingPriceId === pricePlans.pro.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{pricePlans.pro.ctaText || "Buy Pro Pack"}</span>
              </button>
              <p className="text-[10px] text-center text-slate-400 dark:text-slate-500">
                By purchasing, you agree to our <Link to="/terms" className="underline hover:text-slate-600">Terms</Link> & <Link to="/disclaimer" className="underline hover:text-slate-600">Disclaimer</Link>.
              </p>
            </div>
          </div>
        )}
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