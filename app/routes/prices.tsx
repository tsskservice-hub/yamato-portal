/**
 * @file prices.tsx
 * @description 料金プランページ（price-plans.ts 連携版・PageLayout完全連動版・FAQダイレクト遷移対応）
 */
import { useState, useEffect } from "react";
import { Link, useRouteLoaderData } from "@remix-run/react";
import type { MetaFunction } from "@remix-run/cloudflare";
import { ShieldCheck, Check, Coins, Flame, ChevronDown, ChevronUp, SlidersHorizontal, HelpCircle, ExternalLink } from "lucide-react";
import PageLayout, { PageLayoutRef } from "../components/PageLayout";
import { PRICE_PLANS, CREDIT_CONSUMPTION_GUIDE, CAMPAIGN_NOTICE } from "../data/price-plans";
import { useRef } from "react";

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
  const [isSpecsOpen, setIsSpecsOpen] = useState(false);
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);
  const pageLayoutRef = useRef<PageLayoutRef>(null);

  // 💡 root.tsx からユーザー情報を取得して判定に使用
  const rootData = useRouteLoaderData("root") as {
    user?: any;
  } | undefined;
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

  const handleCheckout = async (priceId: string) => {
    if (!user) {
      // 未ログインの場合はPageLayout内の認証モーダルを 'signin' で開く
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
                  to="/faq#portal_credit_costs_and_discounts"
                  className="inline-flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer text-[11px]"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Why 6 credits for 2 images?</span>
                  <ExternalLink className="w-3 h-3 ml-0.5" />
                </Link>
              </div>

              <div className="space-y-2 text-slate-500 dark:text-slate-400">
                {CREDIT_CONSUMPTION_GUIDE.map((row: { item: string; cost: string }, idx: number) => (
                  <div key={idx} className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5 last:border-0 last:pb-0">
                    <span>{row.item}</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{row.cost}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
            <div className="text-center space-y-4 max-w-3xl mx-auto mb-12">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 border border-blue-500/30 flex items-center justify-center space-x-2 text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300 shadow-sm">
                <Flame className="w-4 h-4 text-orange-500 shrink-0 animate-bounce" />
                <span>{CAMPAIGN_NOTICE.rawText}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left items-stretch">
              
              {/* Free Plan */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm">
                <div className="space-y-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{PRICE_PLANS.free.name}</span>
                  <div>
                    <span className="text-4xl font-black text-slate-900 dark:text-white">{PRICE_PLANS.free.price}</span>
                    <span className="text-xs text-slate-500 ml-1">{PRICE_PLANS.free.period}</span>
                  </div>
                  <div className="inline-block px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 text-xs font-bold">
                    {PRICE_PLANS.free.badge}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{PRICE_PLANS.free.description}</p>
                  <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                    {PRICE_PLANS.free.features.map((feat: string, idx: number) => (
                      <li key={idx} className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-blue-600 shrink-0" /><span>{feat}</span></li>
                    ))}
                  </ul>
                </div>
                <div className="mt-6 space-y-3">
                  <Link
                    to={PRICE_PLANS.free.ctaLink || "/"}
                    className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-center transition-all block"
                  >
                    {PRICE_PLANS.free.ctaText}
                  </Link>
                </div>
              </div>

              {/* Starter Pack */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm">
                <div className="space-y-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600">{PRICE_PLANS.starter.name}</span>
                  <div>
                    <span className="text-4xl font-black text-slate-900 dark:text-white">{PRICE_PLANS.starter.price}</span>
                    <span className="text-xs text-slate-500 ml-1">{PRICE_PLANS.starter.period}</span>
                  </div>
                  <div className="inline-block px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 text-xs font-bold leading-normal">
                    {PRICE_PLANS.starter.badge}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{PRICE_PLANS.starter.description}</p>
                  <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                    {PRICE_PLANS.starter.features.map((feat: string, idx: number) => (
                      <li key={idx} className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-blue-600 shrink-0" /><span>{feat}</span></li>
                    ))}
                  </ul>
                </div>
                <div className="mt-6 space-y-3">
                  <button
                    onClick={() => handleCheckout(PRICE_PLANS.starter.id)}
                    disabled={loadingPriceId === PRICE_PLANS.starter.id}
                    className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white text-center shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span>{loadingPriceId === PRICE_PLANS.starter.id ? 'Processing...' : 'Buy Starter Pack'}</span>
                  </button>
                  <p className="text-[10px] text-center text-slate-400 dark:text-slate-500">
                    By purchasing, you agree to our <Link to="/terms" className="underline hover:text-slate-600">Terms</Link> & <Link to="/disclaimer" className="underline hover:text-slate-600">Disclaimer</Link>.
                  </p>
                </div>
              </div>

              {/* Standard Pack */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border-2 border-blue-600 flex flex-col justify-between shadow-xl relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-blue-600 text-white text-[10px] font-extrabold uppercase tracking-widest rounded-full shadow-sm">
                  Most Popular
                </div>
                <div className="space-y-4 pt-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600">{PRICE_PLANS.standard.name}</span>
                  <div>
                    <span className="text-4xl font-black text-slate-900 dark:text-white">{PRICE_PLANS.standard.price}</span>
                    <span className="text-xs text-slate-500 ml-1">{PRICE_PLANS.standard.period}</span>
                  </div>
                  <div className="inline-block px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 text-xs font-bold leading-normal">
                    {PRICE_PLANS.standard.badge}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{PRICE_PLANS.standard.description}</p>
                  <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                    {PRICE_PLANS.standard.features.map((feat: string, idx: number) => (
                      <li key={idx} className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-blue-600 shrink-0" /><span>{feat}</span></li>
                    ))}
                  </ul>
                </div>
                <div className="mt-6 space-y-3">
                  <button
                    onClick={() => handleCheckout(PRICE_PLANS.standard.id)}
                    disabled={loadingPriceId === PRICE_PLANS.standard.id}
                    className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white text-center shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span>{loadingPriceId === PRICE_PLANS.standard.id ? 'Processing...' : 'Buy Standard Pack'}</span>
                  </button>
                  <p className="text-[10px] text-center text-slate-400 dark:text-slate-500">
                    By purchasing, you agree to our <Link to="/terms" className="underline hover:text-slate-600">Terms</Link> & <Link to="/disclaimer" className="underline hover:text-slate-600">Disclaimer</Link>.
                  </p>
                </div>
              </div>

              {/* Pro Intensivist */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm">
                <div className="space-y-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-600">{PRICE_PLANS.pro.name}</span>
                  <div>
                    <span className="text-4xl font-black text-slate-900 dark:text-white">{PRICE_PLANS.pro.price}</span>
                    <span className="text-xs text-slate-500 ml-1">{PRICE_PLANS.pro.period}</span>
                  </div>
                  <div className="inline-block px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-600 text-xs font-bold leading-normal">
                    {PRICE_PLANS.pro.badge}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{PRICE_PLANS.pro.description}</p>
                  <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                    {PRICE_PLANS.pro.features.map((feat: string, idx: number) => (
                      <li key={idx} className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-purple-600 shrink-0" /><span>{feat}</span></li>
                    ))}
                  </ul>
                </div>
                <div className="mt-6 space-y-3">
                  <button
                    onClick={() => handleCheckout(PRICE_PLANS.pro.id)}
                    disabled={loadingPriceId === PRICE_PLANS.pro.id}
                    className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-center shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span>{loadingPriceId === PRICE_PLANS.pro.id ? 'Processing...' : 'Buy Pro Pack'}</span>
                  </button>
                  <p className="text-[10px] text-center text-slate-400 dark:text-slate-500">
                    By purchasing, you agree to our <Link to="/terms" className="underline hover:text-slate-600">Terms</Link> & <Link to="/disclaimer" className="underline hover:text-slate-600">Disclaimer</Link>.
                  </p>
                </div>
              </div>

            </div>

            {/* 詳細スペック表のトグル */}
            <div className="mt-10">
              <button
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
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                      <div className="font-bold text-slate-700 dark:text-slate-300 text-sm pb-2 border-b border-slate-100 dark:border-slate-800">Free Plan</div>
                      <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                        <li><strong className="text-slate-900 dark:text-white">Daily Earnings:</strong> 4 Credits (Promo until Oct 29)</li>
                        <li><strong className="text-slate-900 dark:text-white">Credit Expiry:</strong> 7 days</li>
                      </ul>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                      <div className="font-bold text-blue-600 text-sm pb-2 border-b border-slate-100 dark:border-slate-800">Starter Pack ($10)</div>
                      <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                        <li><strong className="text-slate-900 dark:text-white">Total Credits:</strong> 2,000</li>
                        <li><strong className="text-slate-900 dark:text-white">Bonus Expiry:</strong> Oct 29</li>
                      </ul>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border-2 border-blue-600 shadow-xl space-y-4 relative">
                      <div className="font-bold text-blue-600 text-sm pb-2 border-b border-slate-100 dark:border-slate-800">Standard ($25)</div>
                      <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                        <li><strong className="text-slate-900 dark:text-white">Total Credits:</strong> 5,600</li>
                        <li><strong className="text-slate-900 dark:text-white">Bonus Expiry:</strong> Oct 29</li>
                      </ul>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                      <div className="font-bold text-purple-600 text-sm pb-2 border-b border-slate-100 dark:border-slate-800">Pro Intensivist ($50)</div>
                      <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                        <li><strong className="text-slate-900 dark:text-white">Total Credits:</strong> 12,000</li>
                        <li><strong className="text-slate-900 dark:text-white">Bonus Expiry:</strong> Oct 29</li>
                      </ul>
                    </div>
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