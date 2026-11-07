/**
 * @file _index.tsx
 * @description AI Yamato Portal のランディングページ
 * 💡 Supabase kl_app (CONTENT_GENERAL, CONTENT_VCE_SPEAKING, CONTENT_VCE_WRITING, CONTENT_REFERENCE, CONTENT_JUNIOR, CONTENT_GAMES, CONTENT_OTHER) 完全動的連動・エラーハンドリング統合版
 */
import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useRouteLoaderData } from '@remix-run/react';
import { ToolPageWrapper } from '~/components/layout/ToolPageWrapper';
import type { PageLayoutRef } from '~/components/layout/PageLayout';
import { generateModuleMeta } from '~/utils/seoMeta';
import { Loader2 } from 'lucide-react';
import { supabase } from '~/lib/supabaseClient';

// コンポーネントおよびフックのインポート
import { HeroDemoChat } from '~/components/layout/HeroDemoChat';
import { DailyQuizModal } from '~/components/DailyQuizModal';
import { ChatYamatoConcierge } from '~/components/chat/ChatYamatoConcierge';
import { PricingSection } from '~/components/PricingSection';
import { PortalModulesGrid } from '~/components/PortalModulesGrid';

import { useGeneralContent } from '~/data/content-general';
import { useVceSpeakingContent } from '~/data/content-vce-speaking';
import { useVceWritingContent } from '~/data/content-vce-writing';
import { useReferenceContent } from '~/data/content-reference';
import { useJuniorContent } from '~/data/content-junior';
import { useGamesContent } from '~/data/content-games';
import { useOtherContent } from '~/data/content-other';

import { DAILY_QUIZZES, QuizItem, getRandomQuiz } from '~/data/quizzes';
import { fetchPricePlansData } from '~/data/price-plans';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  return json({
    currentPath: url.pathname,
  });
}

// 最大予想クレジット消費設定
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
  const learningPace = rootData?.learningPace ?? "normal";
  const isTeacher = rootData?.isTeacher ?? false;

  // 💡 各分割コンテンツフックの呼び出し (CONTENT_OTHER を追加)
  const { generalData } = useGeneralContent(supabase);
  const { vceSpeakingData } = useVceSpeakingContent(supabase);
  const { vceWritingData } = useVceWritingContent(supabase);
  const { referenceData } = useReferenceContent(supabase);
  const { juniorData } = useJuniorContent(supabase);
  const { gamesData } = useGamesContent(supabase);
  const { otherData } = useOtherContent(supabase);

  // 💡 先生がログインしている場合、トップページを開いた瞬間に教師ダッシュボードへ自動リダイレクト
  useEffect(() => {
    if (user && isTeacher) {
      navigate('/teacher-dashboard', { replace: true });
    }
  }, [user, isTeacher, navigate]);

  // 料金プランの動的取得ステート
  const [isPriceLoading, setIsPriceLoading] = useState<boolean>(true);
  const [isPriceError, setIsPriceError] = useState<boolean>(false);
  const [checkoutLoadingPriceId, setCheckoutLoadingPriceId] = useState<string | null>(null);

  // Daily Quiz States
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [hasCompletedTodayQuiz, setHasCompletedTodayQuiz] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [isQuizCorrect, setIsQuizCorrect] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<QuizItem>(() => getRandomQuiz(DAILY_QUIZZES) || DAILY_QUIZZES[0]);

  // Supabase から DAILY_QUIZZES をフェッチしてランダムに1つセット
  useEffect(() => {
    async function fetchDailyQuizFromSupabase() {
      try {
        const { data, error } = await supabase
          .from('kl_app')
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

  // 料金プランを Supabase からフェッチ
  const loadPricePlans = useCallback(async () => {
    setIsPriceLoading(true);
    setIsPriceError(false);
    try {
      const data = await fetchPricePlansData(supabase);
      if (!data || !data.pricePlans) {
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

  // 教師判定中でリダイレクト待機中の場合のローディング表示
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
      <div className={`min-h-screen font-sans ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-950'} transition-colors duration-300 relative flex flex-col justify-between`}>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-20 flex-grow w-full">
          
          {/* 1. Hero Section ＆ Auto Demo Chat (CONTENT_OTHER の設定を渡す) */}
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
            portalContent={{ 
              modulesSection: { header: { title: "Portal Pages & Modules" } },
              hero: otherData?.hero,
              aiDemoWidget: otherData?.aiDemoWidget,
              dailyChallengeBanner: otherData?.dailyChallengeBanner
            }}
          />

          {/* 2. Pricing & Credit Packs */}
          <PricingSection
            isDarkMode={isDarkMode}
            checkoutLoadingPriceId={checkoutLoadingPriceId}
            onCheckout={handleCheckout}
            onOpenAuthModal={handleOpenAuthModal}
          />

          {/* 3. Portal Modules Grid (分割された各 CONTENT_ モジュールを統合) */}
          <PortalModulesGrid
            generalModules={generalData?.modules || []}
            speakingModules={vceSpeakingData?.modules || []}
            writingModules={vceWritingData?.modules || []}
            referenceModules={referenceData?.modules || []}
            juniorModules={juniorData?.modules || []}
            gamesData={gamesData}
            isDarkMode={isDarkMode}
            onSelectModule={async (mod) => {
              if (mod.isComingSoon) return;
              if (!mod.creditRequirement || await validateFeatureCredits(mod.creditRequirement as 'textAi' | 'imageAi')) {
                navigate(mod.path);
              }
            }}
            onNavigateGames={() => navigate('/games')}
          />
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
          portalContent={otherData}
        />
      </div>
    </ToolPageWrapper>
  );
}

export const meta: MetaFunction<typeof loader> = ({ data }: { data: any }) => {
  return generateModuleMeta(null, (data as any)?.currentPath || "");
};