/**
 * @file _index.tsx
 * @description AI Yamato Portal のランディングページ
 * 💡 Supabase DAILY_QUIZZES 動的取得 ＆ PORTAL_CONTENT & PRICE_PLANS 完全動的連動版 ＋ 教師自動リダイレクト統合
 */
import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useRouteLoaderData } from '@remix-run/react';
import { ToolPageWrapper } from '../components/ToolPageWrapper';
import PageLayout, { type PageLayoutRef } from '../components/PageLayout';
import { generateModuleMeta } from '../utils/seoMeta';
import { ArrowRight, Check, Coins, FileText, Flame, Gamepad2, Grid, Loader2, Mic, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { HeroDemoChat } from '../components/HeroDemoChat';
import { DailyQuizModal } from '../components/DailyQuizModal';
import { ChatYamatoConcierge } from '../components/ChatYamatoConcierge';
import { DataErrorState } from '../components/DataErrorState';
import { PortalModule, usePortalContent } from '../data/portal-content';
import { PricePlansKnowledge, fetchPricePlansData } from '../data/price-plans';
import { DAILY_QUIZZES, QuizItem, getRandomQuiz } from '../data/quizzes';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  let portalContent = null;
  try {
    const { data: portalData } = await supabase
      .from('portal_settings')
      .select('content')
      .eq('key', 'PORTAL_CONTENT')
      .single();
    portalContent = portalData?.content || null;
  } catch (e) {}

  return json({
    portalContent,
    currentPath: url.pathname,
  });
}

// 💡 最大予想クレジット消費設定
const MAX_ESTIMATED_CREDITS = {
  textAi: 2,   // テキストチャット最大予想
  imageAi: 4,  // 画像生成・ビジュアル解説最大予想
};

export default function Home() {
  const layoutRef = useRef<PageLayoutRef>(null);
  const navigate = useNavigate();

  // root.tsx の loader からユーザー情報を取得
  const rootData = useRouteLoaderData("root") as { 
    user?: any; 
    nickname?: string; 
    credits?: number; 
    plan?: string; 
    learningPace?: "steady" | "normal" | "accelerated"; 
    isTeacher?: boolean; // 教師権限フラグ
  } | undefined;

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [user, setUser] = useState<any>(rootData?.user ?? null);
  const [credits, setCredits] = useState<number>(rootData?.credits ?? 10);
  const nickname = rootData?.nickname ?? "";
  const learningPace = rootData?.learningPace ?? "normal";
  const isTeacher = rootData?.isTeacher ?? false;

  // 💡 先生がログインしている場合、トップページを開いた瞬間に教師ダッシュボードへ自動リダイレクト
  useEffect(() => {
    if (user && isTeacher) {
      navigate('/teacher-dashboard', { replace: true });
    }
  }, [user, isTeacher, navigate]);

  // 💡 PORTAL_CONTENT の動的取得
  const { portalContent, isLoading: isPortalLoading, isError: isPortalError, errorMessage: portalErrorMessage } = usePortalContent(supabase);

  // 💡 PRICE_PLANS の動的取得ステート
  const [priceData, setPriceData] = useState<PricePlansKnowledge | null>(null);
  const [isPriceLoading, setIsPriceLoading] = useState<boolean>(true);
  const [isPriceError, setIsPriceError] = useState<boolean>(false);

  const [checkoutLoadingPriceId, setCheckoutLoadingPriceId] = useState<string | null>(null);

  // 💡 Daily Quiz States
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [hasCompletedTodayQuiz, setHasCompletedTodayQuiz] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [isQuizCorrect, setIsQuizCorrect] = useState(false);

  const [currentQuiz, setCurrentQuiz] = useState<QuizItem>(() => getRandomQuiz(DAILY_QUIZZES) || DAILY_QUIZZES[0]);

  // 💡 Supabase から DAILY_QUIZZES をフェッチしてランダムに1つセット
  useEffect(() => {
    async function fetchDailyQuizFromSupabase() {
      try {
        const { data, error } = await supabase
          .from('app_knowledge')
          .select('data')
          .eq('key', 'DAILY_QUIZZES')
          .single();

        if (!error && data && data.data) {
          const quizList = Array.isArray(data.data) 
            ? data.data 
            : (data.data.quizzes || data.data.DAILY_QUIZZES);

          if (quizList && quizList.length > 0) {
            const random = getRandomQuiz(quizList as QuizItem[]);
            if (random) {
              setCurrentQuiz(random);
              return;
            }
          }
        }

        const { data: quizzesTableData, error: quizzesError } = await supabase
          .from('quizzes')
          .select('*');

        if (!quizzesError && quizzesTableData && quizzesTableData.length > 0) {
          const random = getRandomQuiz(quizzesTableData as QuizItem[]);
          if (random) {
            setCurrentQuiz(random);
            return;
          }
        }
      } catch (err) {
        console.error("Failed to fetch quizzes from Supabase, falling back to local:", err);
      }

      const fallbackRandom = getRandomQuiz(DAILY_QUIZZES);
      if (fallbackRandom) {
        setCurrentQuiz(fallbackRandom);
      }
    }

    fetchDailyQuizFromSupabase();
  }, []);

  // 💡 料金プランを Supabase からフェッチ
  const loadPricePlans = useCallback(async () => {
    setIsPriceLoading(true);
    setIsPriceError(false);
    try {
      const data = await fetchPricePlansData(supabase);
      if (data && data.pricePlans) {
        setPriceData(data);
      } else {
        setIsPriceError(true);
      }
    } catch (err) {
      console.error("Failed to load price plans on home page:", err);
      setIsPriceError(true);
    } finally {
      setIsPriceLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPricePlans();
  }, [loadPricePlans]);

  const fetchUserCredits = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('credits, last_quiz_date')
        .eq('id', userId)
        .single();

      if (data && !error) {
        const typedData = data as { credits?: number; last_quiz_date?: string };
        setCredits(typedData.credits ?? 10);

        const todayStr = new Date().toISOString().split('T')[0];

        if (typedData.last_quiz_date === todayStr) {
          setHasCompletedTodayQuiz(true);
        }
      }
    } catch (err) {
      console.error('Failed to fetch user data:', err);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserCredits(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserCredits(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    if (queryParams.get('success') === 'true') {
      alert('決済が完了しました！クレジットが反映されました。');
      if (user) {
        fetchUserCredits(user.id);
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user]);

  const handleOpenAuthModal = (mode: 'signin' | 'signup') => {
    if (layoutRef.current?.openAuthModal) {
      layoutRef.current.openAuthModal(mode);
    }
  };

  const validateFeatureCredits = async (featureType: 'textAi' | 'imageAi'): Promise<boolean> => {
    if (!user) {
      handleOpenAuthModal('signup');
      return false;
    }
    const requiredCredits = MAX_ESTIMATED_CREDITS[featureType] || 2;
    if (credits < requiredCredits) {
      const confirmed = window.confirm(
        `この機能には約 ${requiredCredits} クレジットが必要です（現在の残高: ${credits} クレジット）。\n料金プランページでクレジットをチャージしますか？`
      );
      if (confirmed) {
        document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
      }
      return false;
    }
    return true;
  };

  const handleAnswerQuiz = async (selectedIndex: number) => {
    if (isAnswerSubmitted || !user) return;
    setSelectedOption(selectedIndex);
    setIsAnswerSubmitted(true);

    const correct = selectedIndex === currentQuiz.answer;
    setIsQuizCorrect(correct);

    if (correct) {
      const todayStr = new Date().toISOString().split('T')[0];
      const newCredits = credits + 2;

      const { error } = await supabase
        .from('profiles')
        .update({ 
          credits: newCredits,
          last_quiz_date: todayStr 
        })
        .eq('id', user.id);

      if (!error) {
        setCredits(newCredits);
        setHasCompletedTodayQuiz(true);
      }
    }
  };

  const handleCheckout = async (priceId: string) => {
    if (!user) {
      alert("ログインが必要です");
      handleOpenAuthModal('signup');
      return;
    }
    try {
      setCheckoutLoadingPriceId(priceId);

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, userId: user.id })
      });

      const data = await response.json() as any;

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned from server.');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      alert(`Checkout error: ${err.message || 'Please try again.'}`);
    } finally {
      setCheckoutLoadingPriceId(null);
    }
  };

  const renderModuleIcon = (iconName: string, className: string) => {
    switch (iconName) {
      case "Grid": return <Grid className={className} />;
      case "Sparkles": return <Sparkles className={className} />;
      case "Mic": return <Mic className={className} />;
      case "FileText": return <FileText className={className} />;
      case "Gamepad2": return <Gamepad2 className={className} />;
      default: return <FileText className={className} />;
    }
  };

  // 💡 7〜10年生（Years 7–10）用モジュールの抽出
  const years7to10Modules = portalContent?.modulesSection?.section2?.modules?.filter(
    (mod: PortalModule) => mod.id === 'vocab-years-7-10' || mod.category === 'Years 7-10'
  ) || [];

  const vceSpeakingModules = portalContent?.modulesSection?.section2?.modules?.filter((mod: PortalModule) => {
    const lowerName = mod.name.toLowerCase();
    const lowerDesc = mod.description.toLowerCase();
    const lowerId = mod.id.toLowerCase();
    return lowerName.includes('speaking') || lowerName.includes('oral') || lowerDesc.includes('oral') || lowerDesc.includes('conversation') || lowerId.includes('oral') || lowerId.includes('speaking') || mod.iconName === 'Mic';
  }) || [];

  const vceWritingModules = portalContent?.modulesSection?.section2?.modules?.filter((mod: PortalModule) => {
    if (mod.id === 'text-types' || mod.id === 'writing-styles' || mod.id === 'vocab-years-7-10' || mod.category === 'Years 7-10') return false;
    const lowerName = mod.name.toLowerCase();
    const lowerDesc = mod.description.toLowerCase();
    const lowerId = mod.id.toLowerCase();
    return !vceSpeakingModules.includes(mod) && (lowerName.includes('writing') || lowerName.includes('essay') || lowerDesc.includes('writing') || lowerDesc.includes('kanji') || lowerDesc.includes('vocabulary') || lowerId.includes('writing') || lowerId.includes('genkoyoshi') || mod.iconName === 'FileText');
  }) || [];

  const categorizedIds = new Set([...vceSpeakingModules, ...vceWritingModules, ...years7to10Modules].map(m => m.id));
  const unassignedModules = portalContent?.modulesSection?.section2?.modules?.filter((mod: PortalModule) => mod.id !== 'text-types' && mod.id !== 'writing-styles' && !categorizedIds.has(mod.id)) || [];
  if (unassignedModules.length > 0) {
    vceWritingModules.push(...unassignedModules);
  }

  // 💡 もし教師判定中でリダイレクト待機中の場合はシンプルなローディングを表示
  if (user && isTeacher) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-sm text-slate-400 font-medium">教師用ダッシュボードへ移動しています...</p>
      </div>
    );
  }

  return (
    <ToolPageWrapper layoutRef={layoutRef}>
      {portalContent && (
        <div className={`min-h-screen font-sans ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} transition-colors duration-300 relative flex flex-col justify-between`}>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-20 flex-grow w-full">
            
            {/* 1. Hero Section ＆ Auto Demo Chat */}
            <HeroDemoChat
              isDarkMode={isDarkMode}
              user={user}
              hasCompletedTodayQuiz={hasCompletedTodayQuiz}
              onOpenAuthModal={handleOpenAuthModal}
              onOpenQuizModal={() => {
                if (!hasCompletedTodayQuiz) {
                  setSelectedOption(null);
                  setIsAnswerSubmitted(false);
                  setIsQuizCorrect(false);
                }
                setIsQuizModalOpen(true);
              }}
              validateFeatureCredits={validateFeatureCredits}
              portalContent={portalContent}
            />

            {/* 2. Pricing & Credit Packs */}
            <section id="pricing" className="space-y-12 text-center">
              <div className="space-y-4 max-w-3xl mx-auto">
                <h2 className="text-3xl font-extrabold tracking-tight">Choose Your Plan & Credit Packs</h2>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Start for free with daily credits, or top up with prepaid charge packs for intensive study.
                </p>
              </div>

              {isPriceLoading ? (
                <div className="py-16 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <p className="text-xs text-slate-400">Loading pricing plans...</p>
                </div>
              ) : isPriceError || !priceData?.pricePlans ? (
                <div className="p-6 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 rounded-2xl text-sm font-semibold">
                  Failed to load pricing packages from Supabase.
                  <button onClick={loadPricePlans} className="ml-3 underline text-blue-600 font-bold">Retry</button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
                    {priceData?.pricePlans?.free && (
                      <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
                        <div className="space-y-4">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{priceData?.pricePlans?.free?.name}</span>
                          <div>
                            <span className="text-4xl font-black">{priceData?.pricePlans?.free?.price}</span>
                            <span className="text-xs text-slate-500 ml-1">{priceData?.pricePlans?.free?.period}</span>
                          </div>
                          {priceData?.pricePlans?.free?.badge && (
                            <div className="inline-block px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 text-xs font-bold">
                              {priceData?.pricePlans?.free?.badge}
                            </div>
                          )}
                          <p className="text-xs text-slate-500">{priceData?.pricePlans?.free?.description}</p>
                          <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                            {priceData?.pricePlans?.free?.features?.map((feat: string, idx: number) => (
                              <li key={idx} className="flex items-center space-x-2">
                                <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <span>{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <button 
                          type="button"
                          onClick={() => handleOpenAuthModal('signup')}
                          className="mt-6 w-full py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          {priceData?.pricePlans?.free?.ctaText || "Get Started Free"}
                        </button>
                      </div>
                    )}

                    {priceData?.pricePlans?.starter && (
                      <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
                        <div className="space-y-4">
                          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">{priceData?.pricePlans?.starter?.name}</span>
                          <div>
                            <span className="text-4xl font-black">{priceData?.pricePlans?.starter?.price}</span>
                            <span className="text-xs text-slate-500 ml-1">{priceData?.pricePlans?.starter?.period}</span>
                          </div>
                          {priceData?.pricePlans?.starter?.badge && (
                            <div className="inline-block px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 text-xs font-bold leading-normal">
                              {priceData?.pricePlans?.starter?.badge}
                            </div>
                          )}
                          <p className="text-xs text-slate-500">{priceData?.pricePlans?.starter?.description}</p>
                          <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                            {priceData?.pricePlans?.starter?.features?.map((feat: string, idx: number) => (
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
                            onClick={() => priceData?.pricePlans?.starter?.id && handleCheckout(priceData.pricePlans.starter.id)} 
                            disabled={checkoutLoadingPriceId === priceData?.pricePlans?.starter?.id}
                            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-600/20 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                          >
                            {checkoutLoadingPriceId === priceData?.pricePlans?.starter?.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            <span>{priceData?.pricePlans?.starter?.ctaText || "Buy Starter Pack"}</span>
                          </button>
                          <p className="text-[10px] text-center text-slate-400 dark:text-slate-500">
                            By purchasing, you agree to our <Link to="/terms" className="underline hover:text-slate-600">Terms</Link> & <Link to="/disclaimer" className="underline hover:text-slate-600">Disclaimer</Link>.
                          </p>
                        </div>
                      </div>
                    )}

                    {priceData?.pricePlans?.standard && (
                      <div className={`p-6 rounded-3xl border-2 border-blue-600 flex flex-col justify-between relative ${isDarkMode ? 'bg-slate-900' : 'bg-white'} shadow-xl`}>
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-blue-600 text-white text-[10px] font-extrabold uppercase tracking-widest rounded-full">
                          Most Popular
                        </div>
                        <div className="space-y-4">
                          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">{priceData?.pricePlans?.standard?.name}</span>
                          <div>
                            <span className="text-4xl font-black">{priceData?.pricePlans?.standard?.price}</span>
                            <span className="text-xs text-slate-500 ml-1">{priceData?.pricePlans?.standard?.period}</span>
                          </div>
                          {priceData?.pricePlans?.standard?.badge && (
                            <div className="inline-block px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 text-xs font-bold leading-normal">
                              {priceData?.pricePlans?.standard?.badge}
                            </div>
                          )}
                          <p className="text-xs text-slate-500">{priceData?.pricePlans?.standard?.description}</p>
                          <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                            {priceData?.pricePlans?.standard?.features?.map((feat: string, idx: number) => (
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
                            onClick={() => priceData?.pricePlans?.standard?.id && handleCheckout(priceData.pricePlans.standard.id)} 
                            disabled={checkoutLoadingPriceId === priceData?.pricePlans?.standard?.id}
                            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-600/20 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                          >
                            {checkoutLoadingPriceId === priceData?.pricePlans?.standard?.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            <span>{priceData?.pricePlans?.standard?.ctaText || "Buy Standard Pack"}</span>
                          </button>
                          <p className="text-[10px] text-center text-slate-400 dark:text-slate-500">
                            By purchasing, you agree to our <Link to="/terms" className="underline hover:text-slate-600">Terms</Link> & <Link to="/disclaimer" className="underline hover:text-slate-600">Disclaimer</Link>.
                          </p>
                        </div>
                      </div>
                    )}

                    {priceData?.pricePlans?.pro && (
                      <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
                        <div className="space-y-4">
                          <span className="text-xs font-bold uppercase tracking-wider text-purple-600">{priceData?.pricePlans?.pro?.name}</span>
                          <div>
                            <span className="text-4xl font-black">{priceData?.pricePlans?.pro?.price}</span>
                            <span className="text-xs text-slate-500 ml-1">{priceData?.pricePlans?.pro?.period}</span>
                          </div>
                          {priceData?.pricePlans?.pro?.badge && (
                            <div className="inline-block px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-600 text-xs font-bold leading-normal">
                              {priceData?.pricePlans?.pro?.badge}
                            </div>
                          )}
                          <p className="text-xs text-slate-500">{priceData?.pricePlans?.pro?.description}</p>
                          <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                            {priceData?.pricePlans?.pro?.features?.map((feat: string, idx: number) => (
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
                            onClick={() => priceData?.pricePlans?.pro?.id && handleCheckout(priceData.pricePlans.pro.id)} 
                            disabled={checkoutLoadingPriceId === priceData?.pricePlans?.pro?.id}
                            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-purple-600/20 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                          >
                            {checkoutLoadingPriceId === priceData?.pricePlans?.pro?.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            <span>{priceData?.pricePlans?.pro?.ctaText || "Buy Pro Pack"}</span>
                          </button>
                          <p className="text-[10px] text-center text-slate-400 dark:text-slate-500">
                            By purchasing, you agree to our <Link to="/terms" className="underline hover:text-slate-600">Terms</Link> & <Link to="/disclaimer" className="underline hover:text-slate-600">Disclaimer</Link>.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {priceData?.creditConsumptionGuide && (
                    <div id="pricing-credits-guide" className={`max-w-2xl mx-auto p-4 rounded-2xl border text-xs ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'} shadow-sm mt-8`}>
                      <div className="flex items-center justify-center space-x-2 font-bold mb-3">
                        <Coins className="w-4 h-4 text-amber-500" />
                        <span>Credit Consumption Guide</span>
                      </div>
                      <div className="space-y-2 text-slate-500">
                        {priceData.creditConsumptionGuide.map((row, idx) => (
                          <div key={idx} className="flex justify-between border-b border-slate-500/10 pb-1.5 last:border-0 last:pb-0">
                            <span>{row.item}</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{row.cost}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>

            {/* 3. Portal Pages & Modules */}
            <section className="space-y-12">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-extrabold tracking-tight">
                  {portalContent.modulesSection.header.title}
                </h2>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {portalContent.modulesSection.header.subtitle}
                </p>
              </div>

              {/* Section 1 */}
              <div id="section-general" className="space-y-4 pt-4">
                <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span className="text-xl">{portalContent.modulesSection.section1.emoji}</span>
                  <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-200">
                    {portalContent.modulesSection.section1.title}
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {portalContent.modulesSection.section1.modules.map((mod: PortalModule) => (
                    <div 
                      key={mod.id} 
                      onClick={async () => {
                        if (mod.isComingSoon) return;
                        if (!mod.creditRequirement || await validateFeatureCredits(mod.creditRequirement)) {
                          navigate(mod.path);
                        }
                      }}
                      className={`p-6 rounded-3xl border flex flex-col justify-between ${
                        mod.isComingSoon 
                          ? 'opacity-75 cursor-not-allowed' 
                          : 'hover:border-blue-500/50 cursor-pointer'
                      } ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm transition-colors`}
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                            {renderModuleIcon(mod.iconName, "w-5 h-5")}
                          </div>
                          {mod.isComingSoon && (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-500/10 text-slate-500">
                              Coming Soon
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-base">{mod.name}</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">{mod.description}</p>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-500/10 flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-medium">{mod.category}</span>
                        {!mod.isComingSoon ? (
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!mod.creditRequirement || await validateFeatureCredits(mod.creditRequirement)) {
                                navigate(mod.path);
                              }
                            }}
                            className="text-blue-600 font-bold flex items-center space-x-1 hover:underline cursor-pointer"
                          >
                            <span>{mod.actionLabel}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="text-slate-400 font-medium cursor-not-allowed">Coming Soon</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 💡 新設: Learn with Games / ゲーミフィケーション・セクション */}
              <div className="space-y-4 pt-6">
                <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span className="text-xl">🎮</span>
                  <h3 className="font-extrabold text-lg text-red-600 dark:text-red-400">
                    Learn with Games & Practice Arena
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div 
                    onClick={() => navigate('/games/tower-defense')}
                    className={`p-6 rounded-3xl border flex flex-col justify-between hover:border-red-500/50 cursor-pointer ${
                      isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                    } shadow-sm transition-colors`}
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center">
                          <Gamepad2 className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-500/10 text-red-600">
                          Interactive
                        </span>
                      </div>
                      <h4 className="font-bold text-base">ひらがな・カタカナ・漢字タワーディフェンス</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Supabase連動の文字マスターを使って、ローマ字タイピングでモンスターを撃破！授業の最後のお楽しみや基礎定着に最適。
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-500/10 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Gamification</span>
                      <span className="text-red-600 font-bold flex items-center space-x-1 hover:underline cursor-pointer">
                        <span>Play Game</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2 */}
              <div id="section-vce" className="space-y-8 pt-6">
                <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span className="text-xl">{portalContent.modulesSection.section2.emoji}</span>
                  <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-200">
                    {portalContent.modulesSection.section2.title}
                  </h3>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-sm font-bold text-red-600 dark:text-red-400">
                    <span>🗣️</span>
                    <h4>VCE Speaking</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {vceSpeakingModules.map((mod: PortalModule) => (
                      <div 
                        key={mod.id} 
                        onClick={async () => {
                          if (mod.isComingSoon) return;
                          if (!mod.creditRequirement || await validateFeatureCredits(mod.creditRequirement)) {
                            navigate(mod.path);
                          }
                        }}
                        className={`p-6 rounded-3xl border flex flex-col justify-between ${
                          mod.isComingSoon 
                            ? 'opacity-75 cursor-not-allowed' 
                            : 'hover:border-red-500/50 cursor-pointer'
                        } ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm transition-colors`}
                      >
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center">
                              {renderModuleIcon(mod.iconName, "w-5 h-5")}
                            </div>
                            {mod.isComingSoon && (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-500/10 text-slate-500">
                                Coming Soon
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-base">{mod.name}</h4>
                          <p className="text-xs text-slate-500 leading-relaxed">{mod.description}</p>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-500/10 flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-medium">{mod.category}</span>
                          {!mod.isComingSoon ? (
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!mod.creditRequirement || await validateFeatureCredits(mod.creditRequirement)) {
                                  navigate(mod.path);
                                }
                              }}
                              className="text-red-600 font-bold flex items-center space-x-1 hover:underline cursor-pointer"
                            >
                              <span>{mod.actionLabel}</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          ) : (
                            <span className="text-slate-400 font-medium cursor-not-allowed">Coming Soon</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <div className="flex items-center space-x-2 text-sm font-bold text-red-600 dark:text-red-400">
                    <span>✍️</span>
                    <h4>VCE Writing</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {vceWritingModules.map((mod: PortalModule) => (
                      <div 
                        key={mod.id} 
                        onClick={async () => {
                          if (mod.isComingSoon) return;
                          if (!mod.creditRequirement || await validateFeatureCredits(mod.creditRequirement)) {
                            navigate(mod.path);
                          }
                        }}
                        className={`p-6 rounded-3xl border flex flex-col justify-between ${
                          mod.isComingSoon 
                            ? 'opacity-75 cursor-not-allowed' 
                            : 'hover:border-red-500/50 cursor-pointer'
                        } ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm transition-colors`}
                      >
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center">
                              {renderModuleIcon(mod.iconName, "w-5 h-5")}
                            </div>
                            {mod.isComingSoon && (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-500/10 text-slate-500">
                                Coming Soon
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-base">{mod.name}</h4>
                          <p className="text-xs text-slate-500 leading-relaxed">{mod.description}</p>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-500/10 flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-medium">{mod.category}</span>
                          {!mod.isComingSoon ? (
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!mod.creditRequirement || await validateFeatureCredits(mod.creditRequirement)) {
                                  navigate(mod.path);
                                }
                              }}
                              className="text-red-600 font-bold flex items-center space-x-1 hover:underline cursor-pointer"
                            >
                              <span>{mod.actionLabel}</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          ) : (
                            <span className="text-slate-400 font-medium cursor-not-allowed">Coming Soon</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {(() => {
                  const referenceModules = portalContent.modulesSection.section2.modules.filter(
                    (m: PortalModule) => m.id === 'text-types' || m.id === 'writing-styles' || m.category === 'Reference Guide'
                  );

                  if (referenceModules.length === 0) return null;

                  return (
                    <div className="space-y-4 pt-4">
                      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                        <span className="text-lg">📚</span>
                        <h4 className="font-bold text-base text-slate-700 dark:text-slate-300">
                          VCE Writing References & Guides
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {referenceModules.map((mod: PortalModule) => (
                          <div
                            key={mod.id}
                            onClick={() => navigate(mod.path)}
                            className={`p-6 rounded-3xl border flex flex-col justify-between hover:border-emerald-500/50 cursor-pointer ${
                              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                            } shadow-sm transition-colors`}
                          >
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                                  {renderModuleIcon(mod.iconName, "w-5 h-5")}
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600">
                                  Reference
                                </span>
                              </div>
                              <h5 className="font-bold text-base">{mod.name}</h5>
                              <p className="text-xs text-slate-500 leading-relaxed">{mod.description}</p>
                            </div>

                            <div className="mt-6 pt-4 border-t border-slate-500/10 flex items-center justify-between text-xs">
                              <span className="text-emerald-600 font-medium">{mod.category}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(mod.path);
                                }}
                                className="text-emerald-600 font-bold flex items-center space-x-1 hover:underline cursor-pointer"
                              >
                                <span>{mod.actionLabel}</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* 💡 Years 7–10 Japanese セクション */}
                {years7to10Modules.length > 0 && (
                  <div className="space-y-4 pt-4">
                    <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                      <span className="text-lg">📖</span>
                      <h4 className="font-bold text-base text-indigo-600 dark:text-indigo-400">
                        Years 7–10 Japanese
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {years7to10Modules.map((mod: PortalModule) => (
                        <div 
                          key={mod.id} 
                          onClick={async () => {
                            if (mod.isComingSoon) return;
                            if (!mod.creditRequirement || await validateFeatureCredits(mod.creditRequirement)) {
                              navigate(mod.path);
                            }
                          }}
                          className={`p-6 rounded-3xl border flex flex-col justify-between ${
                            mod.isComingSoon 
                              ? 'opacity-75 cursor-not-allowed' 
                              : 'hover:border-indigo-500/50 cursor-pointer'
                          } ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm transition-colors`}
                        >
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                                {renderModuleIcon(mod.iconName, "w-5 h-5")}
                              </div>
                              {mod.isComingSoon && (
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-500/10 text-slate-500">
                                  Coming Soon
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-base">{mod.name}</h4>
                            <p className="text-xs text-slate-500 leading-relaxed">{mod.description}</p>
                          </div>

                          <div className="mt-6 pt-4 border-t border-slate-500/10 flex items-center justify-between text-xs">
                            <span className="text-slate-400 font-medium">{mod.category}</span>
                            {!mod.isComingSoon ? (
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (!mod.creditRequirement || await validateFeatureCredits(mod.creditRequirement)) {
                                    navigate(mod.path);
                                  }
                                }}
                                className="text-indigo-600 font-bold flex items-center space-x-1 hover:underline cursor-pointer"
                              >
                                <span>{mod.actionLabel}</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            ) : (
                              <span className="text-slate-400 font-medium cursor-not-allowed">Coming Soon</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </main>

          <ChatYamatoConcierge 
            initialLearningPace={learningPace}
            userId={user?.id}
            credits={credits}
            onOpenAuth={() => handleOpenAuthModal('signup')}
          />

          <DailyQuizModal
            isOpen={isQuizModalOpen}
            onClose={() => setIsQuizModalOpen(false)}
            isDarkMode={isDarkMode}
            currentQuiz={currentQuiz}
            selectedOption={selectedOption}
            isAnswerSubmitted={isAnswerSubmitted}
            hasCompletedTodayQuiz={hasCompletedTodayQuiz}
            isQuizCorrect={isQuizCorrect}
            onAnswer={handleAnswerQuiz}
            portalContent={portalContent}
          />
        </div>
      )}
    </ToolPageWrapper>
  );
}

export const meta: MetaFunction<typeof loader> = ({ data }: { data: any }) => {
  return generateModuleMeta((data as any)?.portalContent || null, (data as any)?.currentPath || "");
};