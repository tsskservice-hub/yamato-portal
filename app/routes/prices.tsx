/**
 * @file prices.tsx
 * @description 料金プランページ（Supabase PRICE_PLANS 100%動的連動・DataErrorState版）
 * 模範: terms.tsx
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useRouteLoaderData } from "@remix-run/react";
import type { MetaFunction } from "@remix-run/cloudflare";
import { ShieldCheck, Check, Coins, Flame, ChevronDown, ChevronUp, SlidersHorizontal, HelpCircle, ExternalLink } from "lucide-react";
import PageLayout, { PageLayoutRef } from "../components/PageLayout";
import DataErrorState from "../components/DataErrorState";
import { fetchPricePlansData, PricePlansKnowledge } from "../data/price-plans";
import { supabase } from "../lib/supabaseClient";

export const meta: MetaFunction = () => {
  return [
    { title: "Pricing & Plans - JP Tutor AI Yamato" },
    {
      name: "description",
      content: "Explore flexible pricing plans and credit packs for AI Yamato Japanese tutoring.",
    },
  ];
};

export default function Prices() {
  // 💡 terms.tsx 模範の独立ステート管理
  const [priceData, setPriceData] = useState<PricePlansKnowledge | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  const [isSpecsOpen, setIsSpecsOpen] = useState(false);
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);
  const pageLayoutRef = useRef<PageLayoutRef>(null);

  // root.tsx からユーザー情報を取得
  const rootData = useRouteLoaderData("root") as { user?: any } | undefined;
  const user = rootData?.user ?? null;

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const isDarkModeActive = savedTheme === "dark" || (!savedTheme && document.documentElement.classList.contains("dark"));
    if (isDarkModeActive) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // 💡 Supabase から非同期フェッチ
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await fetchPricePlansData(supabase);
      if (result && result.pricePlans) {
        setPriceData(result);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error("Failed to load price plans from Supabase:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCheckout = async (priceId: string) => {
    if (!user) {
      pageLayoutRef.current?.openAuthModal('signin');
      return;
    }

    try {
      setLoadingPriceId(priceId);
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: priceId,
          userId: user.id,
        }),
      });

      const data = await res.json() as any;
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to create checkout session.');
      }
    } catch (err: any) {
      console.error(err);
      alert('An error occurred during checkout.');
    } finally {
      setLoadingPriceId(null);
    }
  };

  // 1. ローディング状態
  if (loading) {
    return (
      <PageLayout ref={pageLayoutRef}>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium text-sm">Loading Pricing & Plans...</p>
        </div>
      </PageLayout>
    );
  }

  // 2. 💡 データ取得失敗時の DataErrorState フォールバック
  if (error || !priceData) {
    return (
      <PageLayout ref={pageLayoutRef}>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 px-4 py-16 max-w-4xl mx-auto">
          <DataErrorState
            title="Pricing Plans Unavailable"
            message="Failed to load pricing plans from the database. Please check your network connection and try again."
            errorMessage="Failed to fetch key 'PRICE_PLANS' from app_knowledge table in Supabase."
            onRetry={loadData}
          />
        </div>
      </PageLayout>
    );
  }

  // 3. 正常取得時のコンテンツ展開
  const { pricePlans, campaignNotice, creditConsumptionGuide } = priceData;

  return (
    <PageLayout ref={pageLayoutRef}>
      <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300">
        <main className="flex-grow">
          <section className="pt-14 pb-8 px-4 sm:px-6 lg:px-8 text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-xs sm:text-sm font-medium mb-4 shadow-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>Transparent & Flexible Pricing</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
              Plans & Credit Packs
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Start for free with daily credits, or top up with prepaid charge packs for intensive study.
            </p>

            {/* クレジット消費ガイド ＆ FAQへのダイレクトリンク */}
            <div className="max-w-xl mx-auto mt-6 p-5 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm text-xs text-left">
              <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                <div className="flex items-center space-x-2 font-bold text-slate-800 dark:text-slate-200 text-sm">
                  <Coins className="w-4 h-4 text-amber-500" />
                  <span>Credit Consumption Guide</span>
                </div>
                <Link
                  to="/faq"
                  className="inline-flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer text-[11px]"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Why 6 credits for 2 images?</span>
                  <ExternalLink className="w-3 h-3 ml-0.5" />
                </Link>
              </div>

              <div className="space-y-2 text-slate-500 dark:text-slate-400">
                {creditConsumptionGuide.map((row, idx) => (
                  <div key={idx} className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5 last:border-0 last:pb-0">
                    <span>{row.item}</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{row.cost}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
            {/* キャンペーン通知バナー */}
            {campaignNotice && (
              <div className="text-center space-y-4 max-w-3xl mx-auto mb-12">
                <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 border border-blue-500/30 flex items-center justify-center space-x-2 text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300 shadow-sm">
                  <Flame className="w-4 h-4 text-orange-500 shrink-0 animate-bounce" />
                  <span>{campaignNotice.rawText}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left items-stretch">
              {/* Free Plan */}
              {pricePlans.free && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm">
                  <div className="space-y-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{pricePlans.free.name}</span>
                    <div>
                      <span className="text-4xl font-black text-slate-900 dark:text-white">{pricePlans.free.price}</span>
                      <span className="text-xs text-slate-500 ml-1">{pricePlans.free.period}</span>
                    </div>
                    {pricePlans.free.badge && (
                      <div className="inline-block px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 text-xs font-bold">
                        {pricePlans.free.badge}
                      </div>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{pricePlans.free.description}</p>
                    <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                      {pricePlans.free.features.map((feat: string, idx: number) => (
                        <li key={idx} className="flex items-center space-x-2">
                          <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-6 space-y-3">
                    <Link
                      to={pricePlans.free.ctaLink || "/"}
                      className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-center transition-all block"
                    >
                      {pricePlans.free.ctaText || "Get Started Free"}
                    </Link>
                  </div>
                </div>
              )}

              {/* Starter Pack */}
              {pricePlans.starter && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm">
                  <div className="space-y-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600">{pricePlans.starter.name}</span>
                    <div>
                      <span className="text-4xl font-black text-slate-900 dark:text-white">{pricePlans.starter.price}</span>
                      <span className="text-xs text-slate-500 ml-1">{pricePlans.starter.period}</span>
                    </div>
                    {pricePlans.starter.badge && (
                      <div className="inline-block px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 text-xs font-bold leading-normal">
                        {pricePlans.starter.badge}
                      </div>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{pricePlans.starter.description}</p>
                    <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                      {pricePlans.starter.features.map((feat: string, idx: number) => (
                        <li key={idx} className="flex items-center space-x-2">
                          <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-6 space-y-3">
                    <button
                      type="button"
                      onClick={() => handleCheckout(pricePlans.starter.id)}
                      disabled={loadingPriceId === pricePlans.starter.id}
                      className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white text-center shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <span>{loadingPriceId === pricePlans.starter.id ? 'Processing...' : (pricePlans.starter.ctaText || 'Buy Starter Pack')}</span>
                    </button>
                    <p className="text-[10px] text-center text-slate-400 dark:text-slate-500">
                      By purchasing, you agree to our <Link to="/terms" className="underline hover:text-slate-600">Terms</Link> & <Link to="/disclaimer" className="underline hover:text-slate-600">Disclaimer</Link>.
                    </p>
                  </div>
                </div>
              )}

              {/* Standard Pack */}
              {pricePlans.standard && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border-2 border-blue-600 flex flex-col justify-between shadow-xl relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-blue-600 text-white text-[10px] font-extrabold uppercase tracking-widest rounded-full shadow-sm">
                    Most Popular
                  </div>
                  <div className="space-y-4 pt-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600">{pricePlans.standard.name}</span>
                    <div>
                      <span className="text-4xl font-black text-slate-900 dark:text-white">{pricePlans.standard.price}</span>
                      <span className="text-xs text-slate-500 ml-1">{pricePlans.standard.period}</span>
                    </div>
                    {pricePlans.standard.badge && (
                      <div className="inline-block px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 text-xs font-bold leading-normal">
                        {pricePlans.standard.badge}
                      </div>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{pricePlans.standard.description}</p>
                    <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                      {pricePlans.standard.features.map((feat: string, idx: number) => (
                        <li key={idx} className="flex items-center space-x-2">
                          <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-6 space-y-3">
                    <button
                      type="button"
                      onClick={() => handleCheckout(pricePlans.standard.id)}
                      disabled={loadingPriceId === pricePlans.standard.id}
                      className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white text-center shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <span>{loadingPriceId === pricePlans.standard.id ? 'Processing...' : (pricePlans.standard.ctaText || 'Buy Standard Pack')}</span>
                    </button>
                    <p className="text-[10px] text-center text-slate-400 dark:text-slate-500">
                      By purchasing, you agree to our <Link to="/terms" className="underline hover:text-slate-600">Terms</Link> & <Link to="/disclaimer" className="underline hover:text-slate-600">Disclaimer</Link>.
                    </p>
                  </div>
                </div>
              )}

              {/* Pro Intensivist */}
              {pricePlans.pro && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm">
                  <div className="space-y-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-600">{pricePlans.pro.name}</span>
                    <div>
                      <span className="text-4xl font-black text-slate-900 dark:text-white">{pricePlans.pro.price}</span>
                      <span className="text-xs text-slate-500 ml-1">{pricePlans.pro.period}</span>
                    </div>
                    {pricePlans.pro.badge && (
                      <div className="inline-block px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-600 text-xs font-bold leading-normal">
                        {pricePlans.pro.badge}
                      </div>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{pricePlans.pro.description}</p>
                    <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                      {pricePlans.pro.features.map((feat: string, idx: number) => (
                        <li key={idx} className="flex items-center space-x-2">
                          <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-6 space-y-3">
                    <button
                      type="button"
                      onClick={() => handleCheckout(pricePlans.pro.id)}
                      disabled={loadingPriceId === pricePlans.pro.id}
                      className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-center shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <span>{loadingPriceId === pricePlans.pro.id ? 'Processing...' : (pricePlans.pro.ctaText || 'Buy Pro Pack')}</span>
                    </button>
                    <p className="text-[10px] text-center text-slate-400 dark:text-slate-500">
                      By purchasing, you agree to our <Link to="/terms" className="underline hover:text-slate-600">Terms</Link> & <Link to="/disclaimer" className="underline hover:text-slate-600">Disclaimer</Link>.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 詳細スペック表のトグル */}
            <div className="mt-10">
              <button
                type="button"
                onClick={() => setIsSpecsOpen(!isSpecsOpen)}
                className="w-full py-4 px-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-200 shadow-sm cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                  <span>View Detailed Plan Specs & Study Volume Estimates</span>
                </div>
                {isSpecsOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
              </button>

              {isSpecsOpen && (
                <div className="mt-4 space-y-4">
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center shadow-sm">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">Plan Specifications & Learning Volume Breakdown</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">All tiers grant full access to all AI Yamato features; differences lie solely in credit allocation and volume.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left items-stretch">
                    {/* Free Plan Spec */}
                    {pricePlans.free && (
                      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                        <div className="font-bold text-slate-700 dark:text-slate-300 text-sm pb-2 border-b border-slate-100 dark:border-slate-800">
                          {pricePlans.free.name}
                        </div>
                        <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                          <li><strong className="text-slate-900 dark:text-white">Daily Earnings:</strong> {pricePlans.free.regularCredits} Credits</li>
                          <li><strong className="text-slate-900 dark:text-white">Badge:</strong> {pricePlans.free.badge}</li>
                        </ul>
                      </div>
                    )}

                    {/* Starter Pack Spec */}
                    {pricePlans.starter && (
                      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                        <div className="font-bold text-blue-600 text-sm pb-2 border-b border-slate-100 dark:border-slate-800">
                          {pricePlans.starter.name} ({pricePlans.starter.price})
                        </div>
                        <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                          <li><strong className="text-slate-900 dark:text-white">Total Credits:</strong> {(pricePlans.starter.regularCredits + pricePlans.starter.bonusCredits).toLocaleString()}</li>
                          <li><strong className="text-slate-900 dark:text-white">Bonus Expiry:</strong> {pricePlans.starter.expiryDate || 'Oct 29'}</li>
                        </ul>
                      </div>
                    )}

                    {/* Standard Pack Spec */}
                    {pricePlans.standard && (
                      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border-2 border-blue-600 shadow-xl space-y-4 relative">
                        <div className="font-bold text-blue-600 text-sm pb-2 border-b border-slate-100 dark:border-slate-800">
                          {pricePlans.standard.name} ({pricePlans.standard.price})
                        </div>
                        <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                          <li><strong className="text-slate-900 dark:text-white">Total Credits:</strong> {(pricePlans.standard.regularCredits + pricePlans.standard.bonusCredits).toLocaleString()}</li>
                          <li><strong className="text-slate-900 dark:text-white">Bonus Expiry:</strong> {pricePlans.standard.expiryDate || 'Oct 29'}</li>
                        </ul>
                      </div>
                    )}

                    {/* Pro Intensivist Spec */}
                    {pricePlans.pro && (
                      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                        <div className="font-bold text-purple-600 text-sm pb-2 border-b border-slate-100 dark:border-slate-800">
                          {pricePlans.pro.name} ({pricePlans.pro.price})
                        </div>
                        <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                          <li><strong className="text-slate-900 dark:text-white">Total Credits:</strong> {(pricePlans.pro.regularCredits + pricePlans.pro.bonusCredits).toLocaleString()}</li>
                          <li><strong className="text-slate-900 dark:text-white">Bonus Expiry:</strong> {pricePlans.pro.expiryDate || 'Oct 29'}</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </PageLayout>
  );
}