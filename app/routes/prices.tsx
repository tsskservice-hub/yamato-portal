import { useState, useEffect } from "react";
import { Link } from "@remix-run/react";
import { Sparkles, ArrowRight, ShieldCheck, Check, ShoppingBag, GraduationCap, Mic, Coins, Flame, ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";
import PageLayout from "../components/PageLayout";

// ----------------------------------------------------------------------
// 添付画像の価格表およびクレジットパック仕様に完全に準拠した一元管理データ
// ----------------------------------------------------------------------
export const PRICING_PLANS = {
  free: {
    name: "FREE PLAN",
    price: "$0",
    period: "/ forever",
    badge: "Daily Quiz Credits (Promo: 4 Credits until Oct 29)",
    description: "Log in daily and answer Japanese quizzes correctly to earn credits. Valid for 7 days.",
    features: [
      "Daily Quiz & Login Credits",
      "Genkoyoshi Editor & Basic Tools",
    ],
    ctaText: "Get Started Free",
    ctaLink: "/",
  },
  starter: {
    name: "STARTER PACK",
    price: "$10",
    period: "AUD",
    badge: "2,000 Credits (1,000 unexpired + 1,000 bonus until Oct 29)",
    description: "Great for beginners. Ideal for a few essay corrections or voice roleplay sessions.",
    features: [
      "Standard AI Chat & Q&A",
      "Pay-as-you-go flexibility",
    ],
    stripePriceKey: 'starter',
  },
  standard: {
    name: "STANDARD PACK",
    price: "$25",
    period: "AUD",
    badge: "5,600 Credits (2,800 unexpired + 2,800 bonus until Oct 29)",
    description: "Our most popular choice. Perfect for regular study routines and test preparation.",
    features: [
      "Double Value Promotion",
      "Regular Study & Test Practice",
    ],
    isMostPopular: true,
    stripePriceKey: 'standard',
  },
  pro: {
    name: "PRO INTENSIVIST",
    price: "$50",
    period: "AUD",
    badge: "12,000 Credits (6,000 unexpired + 6,000 bonus until Oct 29)",
    description: "For heavy users and premium-intensive drills. Maximum value with doubled bonus credits.",
    features: [
      "Double Value Promotion",
      "Exam Prep & Intensive Essays",
    ],
    stripePriceKey: 'pro',
  },
};

export const CREDIT_CONSUMPTION_GUIDE = [
  { item: "Text Chat (Q&A / Vocabulary)", cost: "1-2 credits / turn" },
  { item: "Essay / Genkoyoshi Correctors", cost: "20-30 credits / session" },
  { item: "Oral Exam / Voice Roleplay", cost: "15-25 credits / min" },
  { item: "Mini Games & Drills", cost: "Free / 0.5 credits" },
];

export default function Prices() {
  const [isDark, setIsDark] = useState(true);
  const [isSpecsOpen, setIsSpecsOpen] = useState(false); // スペック表のトグル状態

  useEffect(() => {
    document.title = "Pricing & Plans - JP Tutor AI Yamato";
    
    const savedTheme = localStorage.getItem("theme");
    const isDarkModeActive = savedTheme === "dark" || (!savedTheme && document.documentElement.classList.contains("dark"));
    
    setIsDark(isDarkModeActive);
    if (isDarkModeActive) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  return (
    <PageLayout>
      <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300">
        
        <main className="flex-grow">
          
          {/* ページタイトル */}
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

            {/* クレジット消費ガイドボックス（Credit Consumption Guide）をタイトルの下に配置 */}
            <div className="max-w-xl mx-auto mt-6 p-4 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm text-xs text-left">
              <div className="flex items-center justify-center space-x-2 font-bold mb-3 text-slate-800 dark:text-slate-200">
                <Coins className="w-4 h-4 text-amber-500" />
                <span>Credit Consumption Guide</span>
              </div>
              <div className="space-y-2 text-slate-500 dark:text-slate-400">
                {CREDIT_CONSUMPTION_GUIDE.map((row, idx) => (
                  <div key={idx} className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                    <span>{row.item}</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{row.cost}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* クレジットパックおよび価格表セクション（添付画像完全準拠） */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
            <div className="text-center space-y-4 max-w-3xl mx-auto mb-12">
              {/* 期間限定キャンペーンバナー */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 border border-blue-500/30 flex items-center justify-center space-x-2 text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300 shadow-sm">
                <Flame className="w-4 h-4 text-orange-500 shrink-0 animate-bounce" />
                <span>Limited-Time Campaign (Until October 29): Paid packs include bonus credits useable until October 29! Standard base credits are unexpired.</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left items-stretch">
              
              {/* Free Plan */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm">
                <div className="space-y-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{PRICING_PLANS.free.name}</span>
                  <div>
                    <span className="text-4xl font-black text-slate-900 dark:text-white">{PRICING_PLANS.free.price}</span>
                    <span className="text-xs text-slate-500 ml-1">{PRICING_PLANS.free.period}</span>
                  </div>
                  <div className="inline-block px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 text-xs font-bold">
                    {PRICING_PLANS.free.badge}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{PRICING_PLANS.free.description}</p>
                  <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                    {PRICING_PLANS.free.features.map((feat, idx) => (
                      <li key={idx} className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-blue-600 shrink-0" /><span>{feat}</span></li>
                    ))}
                  </ul>
                </div>
                <div className="mt-6 space-y-3">
                  <Link
                    to={PRICING_PLANS.free.ctaLink}
                    className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-center transition-all block"
                  >
                    {PRICING_PLANS.free.ctaText}
                  </Link>
                </div>
              </div>

              {/* Starter Pack */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm">
                <div className="space-y-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600">{PRICING_PLANS.starter.name}</span>
                  <div>
                    <span className="text-4xl font-black text-slate-900 dark:text-white">{PRICING_PLANS.starter.price}</span>
                    <span className="text-xs text-slate-500 ml-1">{PRICING_PLANS.starter.period}</span>
                  </div>
                  <div className="inline-block px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 text-xs font-bold leading-normal">
                    {PRICING_PLANS.starter.badge}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{PRICING_PLANS.starter.description}</p>
                  <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                    {PRICING_PLANS.starter.features.map((feat, idx) => (
                      <li key={idx} className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-blue-600 shrink-0" /><span>{feat}</span></li>
                    ))}
                  </ul>
                </div>
                <div className="mt-6 space-y-3">
                  <a
                    href="#checkout"
                    className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white text-center shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>Buy Starter Pack</span>
                  </a>
                  <p className="text-[10px] text-center text-slate-400 dark:text-slate-500">
                    By purchasing, you agree to our <Link to="/terms" className="underline hover:text-slate-600">Terms</Link> & <Link to="/disclaimer" className="underline hover:text-slate-600">Disclaimer</Link>.
                  </p>
                </div>
              </div>

              {/* Standard Pack (Most Popular) */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border-2 border-blue-600 flex flex-col justify-between shadow-xl relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-blue-600 text-white text-[10px] font-extrabold uppercase tracking-widest rounded-full shadow-sm">
                  Most Popular
                </div>
                <div className="space-y-4 pt-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600">{PRICING_PLANS.standard.name}</span>
                  <div>
                    <span className="text-4xl font-black text-slate-900 dark:text-white">{PRICING_PLANS.standard.price}</span>
                    <span className="text-xs text-slate-500 ml-1">{PRICING_PLANS.standard.period}</span>
                  </div>
                  <div className="inline-block px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 text-xs font-bold leading-normal">
                    {PRICING_PLANS.standard.badge}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{PRICING_PLANS.standard.description}</p>
                  <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                    {PRICING_PLANS.standard.features.map((feat, idx) => (
                      <li key={idx} className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-blue-600 shrink-0" /><span>{feat}</span></li>
                    ))}
                  </ul>
                </div>
                <div className="mt-6 space-y-3">
                  <a
                    href="#checkout"
                    className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white text-center shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>Buy Standard Pack</span>
                  </a>
                  <p className="text-[10px] text-center text-slate-400 dark:text-slate-500">
                    By purchasing, you agree to our <Link to="/terms" className="underline hover:text-slate-600">Terms</Link> & <Link to="/disclaimer" className="underline hover:text-slate-600">Disclaimer</Link>.
                  </p>
                </div>
              </div>

              {/* Pro Intensivist */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm">
                <div className="space-y-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-600">{PRICING_PLANS.pro.name}</span>
                  <div>
                    <span className="text-4xl font-black text-slate-900 dark:text-white">{PRICING_PLANS.pro.price}</span>
                    <span className="text-xs text-slate-500 ml-1">{PRICING_PLANS.pro.period}</span>
                  </div>
                  <div className="inline-block px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-600 text-xs font-bold leading-normal">
                    {PRICING_PLANS.pro.badge}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{PRICING_PLANS.pro.description}</p>
                  <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                    {PRICING_PLANS.pro.features.map((feat, idx) => (
                      <li key={idx} className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-purple-600 shrink-0" /><span>{feat}</span></li>
                    ))}
                  </ul>
                </div>
                <div className="mt-6 space-y-3">
                  <a
                    href="#checkout"
                    className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-center shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>Buy Pro Pack</span>
                  </a>
                  <p className="text-[10px] text-center text-slate-400 dark:text-slate-500">
                    By purchasing, you agree to our <Link to="/terms" className="underline hover:text-slate-600">Terms</Link> & <Link to="/disclaimer" className="underline hover:text-slate-600">Disclaimer</Link>.
                  </p>
                </div>
              </div>

            </div>

            {/* 💡 トグルで開閉可能な縦割り詳細スペック表（価格カードと完全同幅・文字サイズ拡大） */}
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
                <div className="mt-4 space-y-4 animate-fadeIn">
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center shadow-sm">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">Plan Specifications & Learning Volume Breakdown</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">All tiers grant full access to all AI Yamato features; differences lie solely in credit allocation and volume.</p>
                  </div>

                  {/* 価格カードと同じ 4カラム構造（grid-cols-1 sm:grid-cols-2 lg:grid-cols-4）で完全同幅・文字サイズ拡大 (text-sm) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left items-stretch">
                    
                    {/* Free Plan Specs */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
                      <div>
                        <div className="font-bold text-slate-700 dark:text-slate-300 text-sm pb-2 border-b border-slate-100 dark:border-slate-800">Free Plan</div>
                        <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300 mt-4">
                          <li><strong className="text-slate-900 dark:text-white">Daily Earnings:</strong> 4 Credits (Promo until Oct 29, normally 2)</li>
                          <li><strong className="text-slate-900 dark:text-white">Cost per Credit:</strong> Free</li>
                          <li><strong className="text-slate-900 dark:text-white">Essay Practice:</strong> ~0.2 sessions / day</li>
                          <li><strong className="text-slate-900 dark:text-white">Credit Expiry:</strong> 7 days</li>
                          <li><strong className="text-slate-900 dark:text-white">Feature Access:</strong> Full AI Chat & Tools</li>
                        </ul>
                      </div>
                    </div>

                    {/* Starter Pack Specs */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
                      <div>
                        <div className="font-bold text-blue-600 text-sm pb-2 border-b border-slate-100 dark:border-slate-800">Starter Pack ($10)</div>
                        <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300 mt-4">
                          <li><strong className="text-slate-900 dark:text-white">Total Credits:</strong> 2,000</li>
                          <li><strong className="text-slate-900 dark:text-white">Cost efficiency:</strong> Standard</li>
                          <li><strong className="text-slate-900 dark:text-white">Essay Practice:</strong> ~6–8 sessions</li>
                          <li><strong className="text-slate-900 dark:text-white">Voice Roleplay:</strong> ~40–50 mins</li>
                          <li><strong className="text-slate-900 dark:text-white">Bonus Expiry:</strong> Oct 29</li>
                        </ul>
                      </div>
                    </div>

                    {/* Standard Pack Specs */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border-2 border-blue-600 shadow-xl space-y-4 flex flex-col justify-between relative">
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-blue-600 text-white text-[10px] font-extrabold uppercase tracking-widest rounded-full shadow-sm">
                        Popular Specs
                      </div>
                      <div>
                        <div className="font-bold text-blue-600 text-sm pb-2 border-b border-slate-100 dark:border-slate-800 pt-1">Standard ($25)</div>
                        <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300 mt-4">
                          <li><strong className="text-slate-900 dark:text-white">Total Credits:</strong> 5,600 (+120% value)</li>
                          <li><strong className="text-slate-900 dark:text-white">Cost efficiency:</strong> High Value</li>
                          <li><strong className="text-slate-900 dark:text-white">Essay Practice:</strong> ~18–22 sessions</li>
                          <li><strong className="text-slate-900 dark:text-white">Voice Roleplay:</strong> ~110–140 mins</li>
                          <li><strong className="text-slate-900 dark:text-white">Bonus Expiry:</strong> Oct 29</li>
                        </ul>
                      </div>
                    </div>

                    {/* Pro Intensivist Specs */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
                      <div>
                        <div className="font-bold text-purple-600 text-sm pb-2 border-b border-slate-100 dark:border-slate-800">Pro Intensivist ($50)</div>
                        <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300 mt-4">
                          <li><strong className="text-slate-900 dark:text-white">Total Credits:</strong> 12,000 (Maximum)</li>
                          <li><strong className="text-slate-900 dark:text-white">Cost efficiency:</strong> Best Value</li>
                          <li><strong className="text-slate-900 dark:text-white">Essay Practice:</strong> ~40–50 sessions</li>
                          <li><strong className="text-slate-900 dark:text-white">Voice Roleplay:</strong> ~240–300 mins</li>
                          <li><strong className="text-slate-900 dark:text-white">Bonus Expiry:</strong> Oct 29</li>
                        </ul>
                      </div>
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