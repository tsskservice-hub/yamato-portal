import { useState, useEffect } from "react";
import { Link } from "@remix-run/react";
import { Sparkles, ArrowRight, ShieldCheck, Check, ShoppingBag, GraduationCap, Mic, Coins, Flame } from "lucide-react";
import { Header } from "../components/header";

// ----------------------------------------------------------------------
// 添付画像の価格表およびクレジットパック仕様に完全に準拠した一元管理データ
// ----------------------------------------------------------------------
export const PRICING_PLANS = {
  free: {
    name: "FREE PLAN",
    price: "$0",
    period: "/ forever",
    badge: "Daily 5 Credits (Promo: 2 + 3 Free)",
    description: "Recharged daily upon login. Enjoy basic chat, traditional games, and Genkoyoshi editor tools.",
    features: [
      "Daily Login Credits",
      "Free Traditional Games & Tools",
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
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300">
      
      {/* 共通ヘッダーコンポーネント */}
      <Header />

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
              <Link
                to={PRICING_PLANS.free.ctaLink}
                className="mt-6 w-full py-3 px-4 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-center transition-all"
              >
                {PRICING_PLANS.free.ctaText}
              </Link>
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
              <a
                href="#checkout"
                className="mt-6 w-full py-3 px-4 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white text-center shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-1.5"
              >
                <span>Buy Starter Pack</span>
              </a>
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
              <a
                href="#checkout"
                className="mt-6 w-full py-3 px-4 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white text-center shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-1.5"
              >
                <span>Buy Standard Pack</span>
              </a>
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
              <a
                href="#checkout"
                className="mt-6 w-full py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-center shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-1.5"
              >
                <span>Buy Pro Pack</span>
              </a>
            </div>

          </div>

          {/* クレジット消費ガイドボックス（Credit Consumption Guide） */}
          <div className="max-w-2xl mx-auto mt-12 p-5 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm text-xs">
            <div className="flex items-center justify-center space-x-2 font-bold mb-4 text-slate-800 dark:text-slate-200">
              <Coins className="w-4 h-4 text-amber-500" />
              <span>Credit Consumption Guide</span>
            </div>
            <div className="space-y-2.5 text-slate-500 dark:text-slate-400">
              {CREDIT_CONSUMPTION_GUIDE.map((row, idx) => (
                <div key={idx} className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span>{row.item}</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{row.cost}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-slate-100 dark:bg-slate-950 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} JP Tutor AI Yamato. All rights reserved.</p>
          <div className="flex space-x-6 mt-4 sm:mt-0">
            <Link to="/" className="hover:text-slate-700 dark:hover:text-slate-400 transition-colors">Home</Link>
            <span className="hover:text-slate-700 dark:hover:text-slate-400 transition-colors">Powered by AI Yamato</span>
          </div>
        </div>
      </footer>
    </div>
  );
}