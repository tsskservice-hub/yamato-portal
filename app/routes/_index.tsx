/**
 * @file _index.tsx
 * @description AI Yamato Portal のランディングページ（主要セクション・モーダル分離型）
 */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useRouteLoaderData } from '@remix-run/react';
import { supabase } from '../lib/supabaseClient';
import PageLayout, { PageLayoutRef } from '../components/PageLayout';

// 🤖 コンシェルジュ専用チャットウィジェットのインポート
import { ChatYamatoConcierge } from '../components/ChatYamatoConcierge';

// 💡 分離した各コンポーネントのインポート
import { HeroDemoChat } from '../components/HeroDemoChat';
import { PricingSection } from '../components/PricingSection';
import { ModuleCard } from '../components/ModuleCard';
import { DailyQuizModal } from '../components/DailyQuizModal';

// 💡 LPカードモジュールのデータインポート
import { PORTAL_MODULES, ModuleItem } from '../data/lp-card-modules';

// 💡 クイズ関連データのインポート
import { getRandomQuiz, DAILY_QUIZZES, QuizItem } from '../data/quizzes';

// 💡 テキストAI・画像AIの最大予想消費クレジット数（キャップ設定）
const MAX_ESTIMATED_CREDITS = {
  textAi: 2,   // テキストチャット最大予想
  imageAi: 4,  // 画像生成・ビジュアル解説最大予想
};

export default function Home() {
  const navigate = useNavigate();

  // 💡 root.tsx からグローバルデータを安全に取得
  const rootData = useRouteLoaderData("root") as {
    user?: any;
    credits?: number;
    nickname?: string;
    plan?: string;
    learningPace?: "steady" | "normal" | "accelerated";
  } | undefined;

  const [isDarkMode, setIsDarkMode] = useState(false);
   
  // 💡 rootData から初期値を安全に連動
  const [user, setUser] = useState<any>(rootData?.user ?? null);
  const [credits, setCredits] = useState<number>(rootData?.credits ?? 10);
  const [nickname, setNickname] = useState<string>(rootData?.nickname ?? "");
  const [learningPace, setLearningPace] = useState<"steady" | "normal" | "accelerated">(rootData?.learningPace ?? "normal");

  // 💡 ユーザーデータ取得・失効チェック関数 (fetchUserData)
  const fetchUserData = async (userId: string) => {
    try {
      const todayStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Australia/Melbourne',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('credits, last_quiz_date, nickname, learning_pace')
        .eq('id', userId)
        .single();

      if (profile && !error) {
        let currentCredits = profile.credits ?? 10;

        if (profile.last_quiz_date === todayStr) {
          setHasCompletedTodayQuiz(true);
        } else {
          setHasCompletedTodayQuiz(false);
        }

        const { data: expiredLogs } = await supabase
          .from('credit_transactions')
          .select('id, amount')
          .eq('user_id', userId)
          .eq('feature_used', 'dailyQuiz')
          .lt('expires_at', new Date().toISOString())
          .gt('amount', 0);

        if (expiredLogs && expiredLogs.length > 0) {
          const totalExpired = expiredLogs.reduce((sum, log) => sum + log.amount, 0);
          const updatedCredits = Math.max(0, currentCredits - totalExpired);

          await supabase
            .from('profiles')
            .update({ credits: updatedCredits })
            .eq('id', userId);

          const expiredIds = expiredLogs.map(log => log.id);
          await supabase
            .from('credit_transactions')
            .update({ description: 'Expired (7 days limit reached)', amount: 0 })
            .in('id', expiredIds);

          currentCredits = updatedCredits;
        }

        setCredits(currentCredits);
        if (profile.nickname) setNickname(profile.nickname);
        if (profile.learning_pace) setLearningPace(profile.learning_pace);
      }
    } catch (err) {
      console.error('Failed to fetch user data:', err);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchUserData(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const activeSessionUser = session?.user ?? null;
      setUser(activeSessionUser);
      if (activeSessionUser) {
        fetchUserData(activeSessionUser.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const [checkoutLoadingPriceId, setCheckoutLoadingPriceId] = useState<string | null>(null);
  const layoutRef = useRef<PageLayoutRef>(null);

  // 💡 クイズ関連ステート
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [hasCompletedTodayQuiz, setHasCompletedTodayQuiz] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [isQuizCorrect, setIsQuizCorrect] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<QuizItem>(DAILY_QUIZZES[0]);

  useEffect(() => {
    const randomQuiz = getRandomQuiz(DAILY_QUIZZES);
    if (randomQuiz) {
      setCurrentQuiz(randomQuiz);
    }
  }, []);

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    if (queryParams.get('success') === 'true') {
      alert('Payment completed! Your credits have been updated.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // 💡 テキストAI・画像AI利用時のクレジット検証ヘルパー関数
  const validateFeatureCredits = async (featureType: 'textAi' | 'imageAi'): Promise<boolean> => {
    let activeUser = user;
    if (!activeUser) {
      const { data: { session } } = await supabase.auth.getSession();
      activeUser = session?.user ?? null;
    }

    if (!activeUser) {
      alert("やまと先生の機能を利用するにはログインが必要です");
      handleOpenAuthModal('signup');
      return false;
    }

    const maxRequired = MAX_ESTIMATED_CREDITS[featureType];
    if (credits < maxRequired) {
      alert(`この機能を利用するには最大 ${maxRequired} クレジットの余裕が必要です（現在残高: 🪙 ${credits} クレジット）。クレジットをチャージするか、デイリークイズで増やしてくださいね！`);
      const pricingSection = document.getElementById('pricing');
      if (pricingSection) {
        pricingSection.scrollIntoView({ behavior: 'smooth' });
      }
      return false;
    }
    return true;
  };

  // 💡 解答処理ロジック
  const handleAnswerQuiz = async (selectedIndex: number) => {
    let activeUser = user;
    if (!activeUser) {
      const { data: { session } } = await supabase.auth.getSession();
      activeUser = session?.user ?? null;
    }

    if (isAnswerSubmitted || hasCompletedTodayQuiz || !activeUser) return;

    setSelectedOption(selectedIndex);
    setIsAnswerSubmitted(true);

    const correct = selectedIndex === currentQuiz.answer;
    setIsQuizCorrect(correct);

    if (correct) {
      const todayStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Australia/Melbourne',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());
       
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const newCredits = credits + 2;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          credits: newCredits,
          last_quiz_date: todayStr 
        })
        .eq('id', activeUser.id);

      if (!profileError) {
        setCredits(newCredits);
        setHasCompletedTodayQuiz(true);

        await supabase
          .from('credit_transactions')
          .insert({
            user_id: activeUser.id,
            amount: 2,
            feature_used: 'dailyQuiz',
            description: 'Earned from Daily Quiz (+2 credits, valid for 7 days)',
            expires_at: expiresAt
          });
      }
    }
  };

  const handleOpenAuthModal = (mode: 'signin' | 'signup') => {
    if (layoutRef.current) {
      layoutRef.current.openAuthModal(mode);
    }
  };

  const handleCheckout = async (priceId: string) => {
    let activeUser = user;
    if (!activeUser) {
      const { data: { session } } = await supabase.auth.getSession();
      activeUser = session?.user ?? null;
    }

    if (!activeUser) {
      alert("ログインが必要です");
      handleOpenAuthModal('signup');
      return;
    }

    try {
      setCheckoutLoadingPriceId(priceId);

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, userId: activeUser.id })
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

  // 💡 モジュールカードをクリックした際のアクション振り分け
  const handleModuleAction = async (module: ModuleItem) => {
    if (!module.path) return;

    if (module.id === 'genkoyoshi-editor-vce') {
      if (await validateFeatureCredits('imageAi')) {
        navigate(module.path);
      }
    } else if (module.id === 'eoy-writing') {
      if (await validateFeatureCredits('textAi')) {
        navigate(module.path);
      }
    } else if (module.id === 'eoy-writing-custom') {
      if (await validateFeatureCredits('textAi')) {
        navigate(module.path);
      }
    } else {
      navigate(module.path);
    }
  };

  return (
    <PageLayout 
      ref={layoutRef}
      isDarkMode={isDarkMode}
    >
      <div className={`min-h-screen font-sans ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} transition-colors duration-300 relative flex flex-col justify-between`}>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-20 flex-grow w-full">
          
          {/* 1. Hero Section & Auto Demo Chat */}
          <HeroDemoChat
            isDarkMode={isDarkMode}
            user={user}
            hasCompletedTodayQuiz={hasCompletedTodayQuiz}
            onOpenAuthModal={handleOpenAuthModal}
            onOpenQuizModal={() => setIsQuizModalOpen(true)}
            validateFeatureCredits={validateFeatureCredits}
          />

          {/* 2. Pricing & Credit Packs */}
          <PricingSection
            isDarkMode={isDarkMode}
            checkoutLoadingPriceId={checkoutLoadingPriceId}
            onCheckout={handleCheckout}
            onOpenAuthModal={handleOpenAuthModal}
          />

          {/* 3. Portal Pages Navigation Cards */}
          <section className="space-y-12">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-extrabold tracking-tight">Portal Pages & Modules</h2>
              <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Direct access to all specialized exam prep modules, tools, and learning spaces.</p>
            </div>

            {/* Section 1: Global */}
            <div className="space-y-6">
              <div className="flex items-center space-x-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                <span className="text-2xl">🌍</span>
                <h3 className="text-xl font-extrabold tracking-tight">Section 1: Global & General Japanese Learners</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {PORTAL_MODULES
                  .filter((m) => m.category === 'global')
                  .map((module) => (
                    <ModuleCard
                      key={module.id}
                      module={module}
                      isDarkMode={isDarkMode}
                      onActionClick={handleModuleAction}
                    />
                  ))}
              </div>
            </div>

            {/* Section 2: VCE / Australia */}
            <div className="space-y-6 pt-6">
              <div className="flex items-center space-x-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                <span className="text-2xl">🇦🇺🐨🦘</span>
                <h3 className="text-xl font-extrabold tracking-tight">Section 2: Victorian Curriculum & VCE Students (Australia)</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {PORTAL_MODULES
                  .filter((m) => m.category === 'speaking' || m.category === 'writing')
                  .map((module) => (
                    <ModuleCard
                      key={module.id}
                      module={module}
                      isDarkMode={isDarkMode}
                      onActionClick={handleModuleAction}
                    />
                  ))}
              </div>
            </div>
          </section>

        </main>

        {/* 🤖 右下に常駐するコンシェルジュヤマト */}
        <ChatYamatoConcierge
          onOpenAuth={(mode) => handleOpenAuthModal(mode || 'signup')}
        />
         
        {/* 💡 Daily Quiz Modal (切り出したコンポーネントを利用) */}
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
        />
      </div>
    </PageLayout>
  );
}