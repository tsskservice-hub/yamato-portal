/**
 * @file _index.tsx
 * @description AI Yamato Portal のランディングページ（入力欄タイピング＋思考中＋一括回答デモ版）
 */
import React, { useState, useEffect, useRef } from 'react';
import { Link, useRouteLoaderData } from '@remix-run/react';
import { 
  Sparkles, 
  Coins, 
  Moon, 
  Sun, 
  FileText, 
  Grid, 
  Mic, 
  Gamepad2, 
  Check, 
  ArrowRight, 
  ShieldCheck, 
  Award, 
  X, 
  KeyRound, 
  LogOut, 
  Loader2,
  Flame,
  ShoppingBag,
  GraduationCap,
  UserCheck,
  Gauge,
  Send
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import PageLayout from '../components/PageLayout';

// 🤖 コンシェルジュ専用チャットウィジェットのインポート
import { ChatYamatoConcierge } from '../components/ChatYamatoConcierge';

// 💡 共通の price-plans から price-plans およびキャンペーン文言をインポート
import { PRICE_PLANS, CREDIT_CONSUMPTION_GUIDE, CAMPAIGN_NOTICE } from '../data/price-plans';

// 💡 Quiz data and helper functions imported from external file
import { getTodayQuiz, DAILY_QUIZZES, QuizItem } from '../data/quizzes';

// ★法的・サポートコンテンツデータをインポート
import { LEGAL_CONTENT } from '../data/legal-content';

// Auto demo conversations in English
const DEMO_CONVERSATIONS = [
  {
    user: "How do I practice Japanese writing?",
    yamato: "Hello!🌸 You can use our EOY Writing Exam Tutor with 110 original prompts, Genkoyoshi layout tools, and instant AI feedback."
  },
  {
    user: "Can I practice oral conversations here?",
    yamato: "Yes! Our EOY Oral Mock Exam module provides realistic voice interaction and real-time AI examiner scoring."
  },
  {
    user: "How do credits work?",
    yamato: "Chats and vocabulary Q&A cost 1-2 credits. You also get daily free credits upon login, or you can top up anytime!"
  }
];

export default function Home() {
  // 💡 root.tsx の loader からユーザー情報・ニックネーム・クレジット・学習ペースを自動取得
  const rootData = useRouteLoaderData("root") as {
    user?: any;
    nickname?: string;
    credits?: number;
    plan?: string;
    learningPace?: "steady" | "normal" | "accelerated";
  } | undefined;

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [user, setUser] = useState<any>(rootData?.user ?? null);
  const [credits, setCredits] = useState<number>(rootData?.credits ?? 10);
  const [nickname, setNickname] = useState<string>(rootData?.nickname ?? "");
  
  // ★追加: rootData から学習ペースを取得（デフォルトは normal）
  const [learningPace, setLearningPace] = useState<"steady" | "normal" | "accelerated">(
    rootData?.learningPace ?? "normal"
  );

  const [checkoutLoadingPriceId, setCheckoutLoadingPriceId] = useState<string | null>(null);

  // 💡 初回プロフィール設定モーダル用ステート
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [welcomeNickname, setWelcomeNickname] = useState('');
  const [welcomePace, setWelcomePace] = useState('normal');
  const [isSavingWelcome, setIsSavingWelcome] = useState(false);

  // 💡 認証モーダル関連のステートは PageLayout 側へ集約
  const pageLayoutAuthOpenRef = useRef<((mode: 'signin' | 'signup') => void) | null>(null);

  // 💡 Daily Quiz States
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [hasCompletedTodayQuiz, setHasCompletedTodayQuiz] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [isQuizCorrect, setIsQuizCorrect] = useState(false);
  const currentQuiz: QuizItem = getTodayQuiz();

  // Auto demo states for hero section
  const [currentStep, setCurrentStep] = useState(0);
  const [typedInputText, setTypedInputText] = useState('');         // 下部入力欄にタイピングされるテキスト
  const [displayedUserText, setDisplayedUserText] = useState('');   // チャット欄に表示されるユーザーメッセージ（入力完了時に一括設定）
  const [displayedYamatoText, setDisplayedYamatoText] = useState(''); // ヤマトの返答テキスト
  const [isThinking, setIsThinking] = useState(false);
  const [isAnswerShown, setIsAnswerShown] = useState(false);

  // Scroll to top states & listener
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // デモの進行管理（入力欄タイピング ➔ 吹き出しにユーザーメッセージ出現 ➔ 思考中 ➔ ヤマト回答一括表示）
  useEffect(() => {
    const currentConv = DEMO_CONVERSATIONS[currentStep];
    let timeout: NodeJS.Timeout;

    // 1. デモ画面下部の入力欄に一文字ずつ文字が打ち込まれていく演出
    if (typedInputText.length < currentConv.user.length) {
      timeout = setTimeout(() => {
        setTypedInputText(currentConv.user.slice(0, typedInputText.length + 1));
      }, 45);
    } 
    // 2. 入力完了後、送信されてチャット欄にユーザーの吹き出しが一括で現れ、入力欄をクリア
    else if (!displayedUserText && typedInputText === currentConv.user) {
      timeout = setTimeout(() => {
        setDisplayedUserText(currentConv.user);
        setTypedInputText('');
      }, 300);
    } 
    // 3. ユーザー吹き出し出現後、少し待って「Yamato is thinking...」状態へ
    else if (displayedUserText && !isThinking && !isAnswerShown && !displayedYamatoText) {
      timeout = setTimeout(() => {
        setIsThinking(true);
      }, 300);
    } 
    // 4. 思考中アニメーションを約1.5秒間表示したあと、ヤマトの答えを一括で表示
    else if (isThinking) {
      timeout = setTimeout(() => {
        setIsThinking(false);
        setDisplayedYamatoText(currentConv.yamato);
        setIsAnswerShown(true);
      }, 1500);
    } 
    // 5. 返答表示後、3秒間静止してから次の会話サイクルへリセット
    else if (isAnswerShown) {
      timeout = setTimeout(() => {
        setTypedInputText('');
        setDisplayedUserText('');
        setDisplayedYamatoText('');
        setIsThinking(false);
        setIsAnswerShown(false);
        setCurrentStep((prev) => (prev + 1) % DEMO_CONVERSATIONS.length);
      }, 3000);
    }

    return () => clearTimeout(timeout);
  }, [typedInputText, displayedUserText, displayedYamatoText, isThinking, isAnswerShown, currentStep]);

  // ユーザーデータ（クレジット・学習ペース等）の取得関数
  const fetchUserData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('credits, last_quiz_date, nickname, learning_pace')
        .eq('id', userId)
        .single();
      
      if (data && !error) {
        const typedData = data as { credits?: number; last_quiz_date?: string; nickname?: string; learning_pace?: "steady" | "normal" | "accelerated" };
        setCredits(typedData.credits ?? 10);
        if (typedData.nickname) {
          setNickname(typedData.nickname);
        }
        if (typedData.learning_pace) {
          setLearningPace(typedData.learning_pace);
        }

        const todayStr = new Date().toISOString().split('T')[0];
        if (typedData.last_quiz_date === todayStr) {
          setHasCompletedTodayQuiz(true);
        }
      }
    } catch (err) {
      console.error('Failed to fetch user data:', err);
    }
  };

  // Auth and session handling
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchUserData(currentUser.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchUserData(currentUser.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 決済成功リダイレクトの検知 & クレジット再取得
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    if (queryParams.get('success') === 'true') {
      alert('Payment completed! Your credits have been updated.');
      if (user) {
        fetchUserData(user.id);
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user]);

  // Daily Quiz Answer Handler
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setNickname("");
  };

  const handleOpenAuthModal = (mode: 'signin' | 'signup') => {
    if (pageLayoutAuthOpenRef.current) {
      pageLayoutAuthOpenRef.current(mode);
    }
  };

  // 購入ボタン押下処理
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

  const portalContextData = {
    pricePlans: PRICE_PLANS,
    creditGuide: CREDIT_CONSUMPTION_GUIDE,
    todayQuiz: getTodayQuiz(),
    allQuizzes: DAILY_QUIZZES,
    legalContent: LEGAL_CONTENT,
  };

  return (
    <PageLayout 
      user={user} 
      credits={credits} 
      nickname={nickname} 
      learningPace={learningPace} 
      onSignOut={handleSignOut}
      isDarkMode={isDarkMode}
    >
      <div className={`min-h-screen font-sans ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} transition-colors duration-300 relative flex flex-col justify-between`}>
        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-20 flex-grow w-full">
            
          {/* 2. Hero Section with YamatoChat-style Auto Demo */}
          <section className="text-center space-y-6 max-w-4xl mx-auto">
            <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200 shadow-sm">
              <Flame className="w-3.5 h-3.5 text-red-600 animate-pulse" />
              <span>Decades of Expertise in Japanese Language Education</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight">
              Your Gateway to <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-red-600 bg-clip-text text-transparent">
                Japanese Mastery
              </span>
            </h1>

            <p className={`text-base sm:text-lg max-w-2xl mx-auto ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Backed by decades of expert classroom teaching, now available to learners worldwide. Experience precision AI-driven Japanese tutoring tailored to your unique goals.
            </p>

            {/* 💡 Daily Quiz Banner for Logged-in Users */}
            {user && (
              <div className="max-w-3xl mx-auto p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-red-600/10 border border-blue-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm text-left">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-md">
                    🧠
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 px-2 py-0.5 rounded bg-red-500/10">Daily Challenge</span>
                      <span className="text-xs font-bold text-blue-700 dark:text-blue-300">+2 Credits</span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Today's Japanese & Culture Quiz</h3>
                    <p className="text-xs text-slate-500">
                      {hasCompletedTodayQuiz 
                        ? "You've already completed today's quiz! Come back tomorrow for more ✨" 
                        : "Answer correctly to earn 2 credits! (Available once per day)"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (!hasCompletedTodayQuiz) {
                      setSelectedOption(null);
                      setIsAnswerSubmitted(false);
                      setIsQuizCorrect(false);
                    }
                    setIsQuizModalOpen(true);
                  }}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
                    hasCompletedTodayQuiz 
                      ? "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300" 
                      : "bg-red-600 hover:bg-red-700 text-white shadow-red-600/20"
                  }`}
                >
                  <span>{hasCompletedTodayQuiz ? "View Quiz Results & Explanation" : "Take Today's Quiz"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className={`mt-8 p-5 sm:p-6 rounded-2xl border-2 border-blue-400 shadow-2xl backdrop-blur-sm text-left ${isDarkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white'}`}>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <span className="text-base">🤖</span>
                  <span className="font-bold text-sm text-blue-900 dark:text-blue-200">Japanese Tutor AI Yamato (Auto Demo)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 font-bold animate-pulse">● Live Demo</span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md font-medium">
                  Step {currentStep + 1} / {DEMO_CONVERSATIONS.length}
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50 rounded-xl p-2.5 mb-4 flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 dark:text-blue-300">Learning Pace (Demo)</span>
                <div className="inline-flex rounded-lg bg-white dark:bg-slate-900 p-0.5 shadow-xs border border-blue-200 dark:border-blue-800">
                  <span className="px-2.5 py-1 rounded-md text-[10px] font-bold capitalize bg-blue-600 text-white shadow-xs">normal</span>
                </div>
              </div>

              {/* チャット会話の表示エリア */}
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 mb-4 min-h-[140px] flex flex-col justify-center">
                {/* ユーザーメッセージ（送信完了後に一括表示） */}
                {displayedUserText && (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] p-3 rounded-xl rounded-br-xs text-xs sm:text-sm shadow-xs text-left bg-blue-600 text-white font-medium">
                      <p>{displayedUserText}</p>
                    </div>
                  </div>
                )}

                {/* ヤマトの思考中 or 返答メッセージ */}
                <div className="flex justify-start">
                  {isThinking ? (
                    <div className="p-3 rounded-xl rounded-bl-xs text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 flex items-center space-x-2 shadow-xs">
                      <span className="inline-block animate-spin text-sm">🤖</span>
                      <span className="italic font-medium animate-pulse">Yamato is thinking...</span>
                    </div>
                  ) : (
                    isAnswerShown && displayedYamatoText && (
                      <div className="max-w-[85%] p-3 rounded-xl rounded-bl-xs text-xs sm:text-sm shadow-xs text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 font-medium leading-relaxed">
                        <p>{displayedYamatoText}</p>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* ★ デモ画面下部の入力フィールド（ここに文字がタイピングされていく演出） */}
              <div className="flex items-center space-x-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 mb-4 shadow-xs">
                <div className="flex-grow px-3 py-1.5 text-xs sm:text-sm text-slate-700 dark:text-slate-200 flex items-center">
                  {typedInputText ? (
                    <span>{typedInputText}</span>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500">Ask Yamato a question...</span>
                  )}
                  {/* 点滅カーソル */}
                  <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-blue-600 animate-pulse"></span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm opacity-90">
                  <Send className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between border border-blue-200 dark:border-blue-800/50 rounded-xl p-3 bg-blue-50/50 dark:bg-blue-950/20 text-sm gap-3">
                <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-300 px-2 text-center sm:text-left font-medium">
                  <span>✨</span>
                  <span>Want to ask Yamato your own questions?</span>
                </div>
                <button 
                  onClick={() => handleOpenAuthModal('signup')}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap"
                >
                  <span>Try App (Free Sign Up)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </section>

        {/* 3. Pricing & Credit Packs */}
        <section className="space-y-12 text-center">
          <div className="space-y-4 max-w-3xl mx-auto">
            <h2 className="text-3xl font-extrabold tracking-tight">Choose Your Plan & Credit Packs</h2>
            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Start for free with daily credits, or top up with prepaid charge packs for intensive study.</p>
               
            {/* 💡 共通の CAMPAIGN_NOTICE からインポートした文言を表示 */}
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
                onClick={() => handleOpenAuthModal('signup')}
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
                  onClick={() => handleCheckout(PRICE_PLANS.starter.id)} 
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
                  onClick={() => handleCheckout(PRICE_PLANS.standard.id)} 
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
                  onClick={() => handleCheckout(PRICE_PLANS.pro.id)} 
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

          <div className={`max-w-2xl mx-auto p-4 rounded-2xl border text-xs ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
            <div className="flex items-center justify-center space-x-2 font-bold mb-3">
              <Coins className="w-4 h-4 text-amber-500" />
              <span>Credit Consumption Guide</span>
            </div>
            <div className="space-y-2 text-slate-500">
              {CREDIT_CONSUMPTION_GUIDE.map((row: { item: string; cost: string }, idx: number) => (
                <div key={idx} className="flex justify-between border-b border-slate-500/10 pb-1.5">
                  <span>{row.item}</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{row.cost}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. Additional Portal Pages Navigation Cards (Divided into 2 Sections) */}
        <section className="space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-extrabold tracking-tight">Portal Pages & Modules</h2>
            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Direct access to all specialized exam prep modules, tools, and learning spaces.</p>
          </div>

          {/* 🌏 Section 1: Global & General Japanese Learners */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <span className="text-2xl">🌍</span>
              <h3 className="text-xl font-extrabold tracking-tight">Section 1: Global & General Japanese Learners</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* General Genkoyoshi Editor */}
              <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm hover:border-blue-500/50 transition-colors`}>
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                    <Grid className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-base">Genkoyoshi Editor (General)</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">Digital manuscript paper editor for precise Japanese character layout, counting, and PDF export for general learners.</p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-500/10 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Free Tool</span>
                  <Link to="/genkoyoshi-editor-general" className="text-blue-600 font-bold flex items-center space-x-1 hover:underline cursor-pointer">
                    <span>Open Editor</span> <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              {/* Game (Igo / Go) */}
              <div className={`p-6 rounded-3xl border opacity-75 flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                      <Gamepad2 className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-500/10 text-slate-500">Coming Soon</span>
                  </div>
                  <h4 className="font-bold text-base">Go (Igo) Mini Game</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">Traditional Japanese board game mini-app with AI play modes to relax and build strategic thinking.</p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-500/10 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Mini Game</span>
                  <span className="text-slate-400 font-medium cursor-not-allowed">Coming Soon</span>
                </div>
              </div>
            </div>
          </div>

          {/* 🐨🦘🇦🇺 Section 2: Victorian Curriculum & VCE Students (Victoria,Australia) */}
          <div className="space-y-6 pt-6">
            <div className="flex items-center space-x-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <span className="text-2xl">🇦🇺🐨🦘</span>
              <h3 className="text-xl font-extrabold tracking-tight">Section 2: Victorian Curriculum & VCE Students (Australia)</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* VCE Genkoyoshi Editor */}
              <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm hover:border-red-500/50 transition-colors`}>
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center">
                    <Grid className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-base">Genkoyoshi Editor (VCE)</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">Specialized VCE manuscript editor with strict Victorian curriculum criteria check and AI essay advisor.</p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-500/10 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">VCE Tool</span>
                  <Link to="/genkoyoshi-editor-vce" className="text-red-600 font-bold flex items-center space-x-1 hover:underline cursor-pointer">
                    <span>Open VCE Editor</span> <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              {/* eoy-oral-drill */}
              <div className={`p-6 rounded-3xl border opacity-75 flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                      <Mic className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-500/10 text-slate-500">Coming Soon</span>
                  </div>
                  <h4 className="font-bold text-base">EOY Oral Drill</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">Targeted practice drills focusing on conversational fluidity and pronunciation for VCE oral exams.</p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-500/10 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Module</span>
                  <span className="text-slate-400 font-medium cursor-not-allowed">Coming Soon</span>
                </div>
              </div>

              {/* eoy-oral-elaborate */}
              <div className={`p-6 rounded-3xl border opacity-75 flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                      <Mic className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-500/10 text-slate-500">Coming Soon</span>
                  </div>
                  <h4 className="font-bold text-base">EOY Oral Elaboration</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">Deep-dive elaboration strategies and AI-assisted vocabulary building for Section 2 Detailed Study.</p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-500/10 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Module</span>
                  <span className="text-slate-400 font-medium cursor-not-allowed">Coming Soon</span>
                </div>
              </div>

              {/* eoy-oral-mock */}
              <div className={`p-6 rounded-3xl border opacity-75 flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                      <Mic className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-500/10 text-slate-500">Coming Soon</span>
                  </div>
                  <h4 className="font-bold text-base">EOY Oral Mock Exam</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">Full-length simulated VCE oral exam environment with real-time AI examiner evaluation and scoring.</p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-500/10 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Module</span>
                  <span className="text-slate-400 font-medium cursor-not-allowed">Coming Soon</span>
                </div>
              </div>

              {/* eoy-writing */}
              <div className={`p-6 rounded-3xl border opacity-75 flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-500/10 text-slate-500">Coming Soon</span>
                  </div>
                  <h4 className="font-bold text-base">EOY Writing Exam Tutor</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">Comprehensive writing exam practice suite featuring 110 original prompts and structured feedback.</p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-500/10 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Module</span>
                  <span className="text-slate-400 font-medium cursor-not-allowed">Coming Soon</span>
                </div>
              </div>

              {/* oral-exam-questions */}
              <div className={`p-6 rounded-3xl border opacity-75 flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-500/10 text-slate-500">Coming Soon</span>
                  </div>
                  <h4 className="font-bold text-base">Oral Exam Questions</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">Curated database of official and practice VCE oral examination questions with audio samples.</p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-500/10 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Reference</span>
                  <span className="text-slate-400 font-medium cursor-not-allowed">Coming Soon</span>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

        {/* 🤖 右下に常駐するコンシェルジュヤマト */}
        <ChatYamatoConcierge 
          additionalContext={portalContextData} 
          initialLearningPace={learningPace}
          userId={user?.id}
        />

        {/* ページトップへ戻るボタン */}
        {showScrollTop && (
          <div className="fixed bottom-24 right-6 z-40">
            <button
              type="button"
              onClick={scrollToTop}
              className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all cursor-pointer text-sm flex items-center justify-center"
              title="Scroll to top"
            >
              ⬆️
            </button>
          </div>
        )}

        {/* 💡 Daily Quiz Modal */}
        {isQuizModalOpen && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setIsQuizModalOpen(false)}
          >
            <div 
              className={`w-full max-w-lg rounded-3xl p-6 sm:p-8 border shadow-2xl relative ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setIsQuizModalOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-500/15 transition-colors text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-blue-500/30">
                    🧠
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 px-2 py-0.5 rounded bg-red-500/10">Daily Challenge (+2 Credits)</span>
                    <h3 className="text-lg font-extrabold tracking-tight">Today's Japanese & Culture Quiz</h3>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-left">
                  <p className="text-sm font-semibold leading-relaxed">{currentQuiz.question}</p>
                </div>

                <div className="space-y-2.5">
                  {currentQuiz.options.map((option, idx) => {
                    let btnStyle = "border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20";
                    if (isAnswerSubmitted || hasCompletedTodayQuiz) {
                      if (idx === currentQuiz.answer) {
                        btnStyle = "bg-blue-500/10 border-blue-500 text-blue-700 dark:text-blue-300 font-bold";
                      } else if (idx === selectedOption) {
                        btnStyle = "bg-red-500/10 border-red-500 text-red-600";
                      } else {
                        btnStyle = "opacity-50 border-slate-200 dark:border-slate-700";
                      }
                    }

                    return (
                      <button
                        key={idx}
                        disabled={isAnswerSubmitted || hasCompletedTodayQuiz}
                        onClick={() => handleAnswerQuiz(idx)}
                        className={`w-full p-3.5 rounded-xl border text-xs sm:text-sm text-left transition-all flex items-center justify-between cursor-pointer ${btnStyle}`}
                      >
                        <span>{option}</span>
                        {(isAnswerSubmitted || hasCompletedTodayQuiz) && idx === currentQuiz.answer && <Check className="w-4 h-4 text-blue-600" />}
                      </button>
                    );
                  })}
                </div>

                {(isAnswerSubmitted || hasCompletedTodayQuiz) && (
                  <div className={`p-4 rounded-2xl border text-xs space-y-2 text-left ${hasCompletedTodayQuiz && !isAnswerSubmitted ? 'bg-blue-500/10 border-blue-500/30 text-blue-800 dark:text-blue-200' : isQuizCorrect ? 'bg-blue-500/10 border-blue-500/30 text-blue-800 dark:text-blue-200' : 'bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-200'}`}>
                    <p className="font-bold">
                      {hasCompletedTodayQuiz && !isAnswerSubmitted 
                        ? "✨ You have already completed today's quiz! (Credits earned: +2)" 
                        : isQuizCorrect 
                        ? "🎉 Correct! You earned 2 credits!" 
                        : "💪 Incorrect! Try again tomorrow!"}
                    </p>
                    <p className="leading-relaxed text-slate-600 dark:text-slate-300">{currentQuiz.explanation}</p>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setIsQuizModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-bold transition cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}