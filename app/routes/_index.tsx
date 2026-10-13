import React, { useState, useEffect, useRef } from 'react';
import { Link } from '@remix-run/react';
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
  GraduationCap
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import PageLayout from '../components/PageLayout';

// 💡 PRICING_PLANS imported from prices.tsx for full synchronization
import { PRICING_PLANS } from './prices';

// 💡 Quiz data and helper functions imported from external file
import { getTodayQuiz, QuizItem } from '../data/quizzes';

export const STRIPE_PRICES = {
  starter: 'price_1UOmko2ZJezqyZ9eR0l8cvUk', // Actual Stripe Price ID
  standard: 'price_1xxxx_standard',          // Update with your actual Stripe Price ID if needed
  pro: 'price_1xxxx_pro',                    // Update with your actual Stripe Price ID if needed
};

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

type ChatMessage = {
  role: "assistant" | "user";
  content: string;
  imageUrl?: string;
};

// AI output text formatting function (HTML escape & line break retention)
function formatAiOutput(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br />");
}

export default function Home() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState<number>(10);
  const [checkoutLoadingPriceId, setCheckoutLoadingPriceId] = useState<string | null>(null);

  // 💡 認証モーダル関連のステートは PageLayout 側へ集約したため、ここでは ref やコールバック用の関数を用意
  const pageLayoutAuthOpenRef = useRef<((mode: 'signin' | 'signup') => void) | null>(null);

  // 💡 Daily Quiz States
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [hasCompletedTodayQuiz, setHasCompletedTodayQuiz] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [isQuizCorrect, setIsQuizCorrect] = useState(false);
  const currentQuiz: QuizItem = getTodayQuiz();

  // Auto demo typing states for hero section
  const [currentStep, setCurrentStep] = useState(0);
  const [displayedUserText, setDisplayedUserText] = useState('');
  const [displayedYamatoText, setDisplayedYamatoText] = useState('');
  const [isTypingYamato, setIsTypingYamato] = useState(false);

  // Bottom-right persistent AI tutor states
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);
  const [isAiTutorOpen, setIsAiTutorOpen] = useState<boolean>(false);
  const [isAiFullscreen, setIsAiFullscreen] = useState<boolean>(false);
  const aiChatRef = useRef<HTMLDivElement>(null);

  const [tutorMessages, setTutorMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hello! I'm AI Yamato (やまと先生). Have any questions about the Japanese language, grammar, kanji, or Japanese culture? Ask me anything!",
    },
  ]);
  const [tutorInput, setTutorInput] = useState<string>("");
  const [isTutorLoading, setIsTutorLoading] = useState<boolean>(false);
  const [requestVisualAid, setRequestVisualAid] = useState<boolean>(false);
  const [modalImageSrc, setModalImageSrc] = useState<string | null>(null);
  const [tutorLevel, setTutorLevel] = useState<"steady" | "normal" | "accelerated">("steady");

  // Scroll to top listener
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

  // Fullscreen toggle for AI chat window
  const toggleAiFullscreen = async () => {
    if (!aiChatRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await aiChatRef.current.requestFullscreen();
        setIsAiFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsAiFullscreen(false);
      }
    } catch (err) {
      console.error("Fullscreen toggle failed:", err);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsAiFullscreen(false);
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // AI Tutor message handler
  const handleSendTutorMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tutorInput.trim() || isTutorLoading) return;

    const userMsg = tutorInput.trim();
    const needsVisual = requestVisualAid;

    setTutorInput("");
    setRequestVisualAid(false);

    const newMessages: ChatMessage[] = [...tutorMessages, { role: "user", content: userMsg }];
    setTutorMessages(newMessages);
    setIsTutorLoading(true);

    try {
      const visualPrompt = needsVisual
        ? `Educational instructional diagram and visual aid for Japanese language learners explaining: ${userMsg}. Clean layout, high quality, professional illustration style.`
        : undefined;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          chatHistory: tutorMessages,
          learningPace: tutorLevel,
          requestVisualAid: needsVisual,
          visualPrompt: visualPrompt,
          appType: "general",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response from AI tutor");
      }

      const data = (await response.json()) as any;
      const replyText = data.reply || "I'm here to help you with your Japanese studies!";
      const imageUrl = data.imageUrl;
      const formattedReply = formatAiOutput(replyText);

      setTutorMessages([
        ...newMessages,
        {
          role: "assistant",
          content: formattedReply,
          imageUrl: imageUrl,
        },
      ]);
    } catch (err) {
      console.error(err);
      setTutorMessages([
        ...newMessages,
        { role: "assistant", content: "Sorry, I encountered an error. Please try asking again!" },
      ]);
    } finally {
      setIsTutorLoading(false);
    }
  };

  // Typing animation effect for Hero demo
  useEffect(() => {
    const currentConv = DEMO_CONVERSATIONS[currentStep];
    let timeout: NodeJS.Timeout;

    if (displayedUserText.length < currentConv.user.length) {
      timeout = setTimeout(() => {
        setDisplayedUserText(currentConv.user.slice(0, displayedUserText.length + 1));
      }, 45);
    } else if (!isTypingYamato && displayedYamatoText.length === 0) {
      timeout = setTimeout(() => {
        setIsTypingYamato(true);
      }, 350);
    } else if (isTypingYamato && displayedYamatoText.length < currentConv.yamato.length) {
      timeout = setTimeout(() => {
        setDisplayedYamatoText(currentConv.yamato.slice(0, displayedYamatoText.length + 1));
      }, 25);
    } else if (isTypingYamato && displayedYamatoText.length === currentConv.yamato.length) {
      timeout = setTimeout(() => {
        setDisplayedUserText('');
        setDisplayedYamatoText('');
        setIsTypingYamato(false);
        setCurrentStep((prev) => (prev + 1) % DEMO_CONVERSATIONS.length);
      }, 3000);
    }

    return () => clearTimeout(timeout);
  }, [displayedUserText, displayedYamatoText, isTypingYamato, currentStep]);

  // クレジット取得関数
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

        // Check if today's quiz has already been completed
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
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserCredits(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserCredits(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. 決済成功リダイレクトの検知 & クレジット再取得
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    if (queryParams.get('success') === 'true') {
      alert('Payment completed! Your credits have been updated.');
      if (user) {
        fetchUserCredits(user.id); // Supabaseから最新残高を再取得
      }
      // URLからクエリパラメータを削除
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user]);

  // 💡 Daily Quiz Answer Handler
  const handleAnswerQuiz = async (selectedIndex: number) => {
    if (isAnswerSubmitted || !user) return;
    setSelectedOption(selectedIndex);
    setIsAnswerSubmitted(true);

    const correct = selectedIndex === currentQuiz.answer;
    setIsQuizCorrect(correct);

    if (correct) {
      const todayStr = new Date().toISOString().split('T')[0];
      const newCredits = credits + 2;

      // Update Supabase credits and last_quiz_date
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
      } else {
        console.error('Failed to update quiz credit rewards:', error);
      }
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const handleOpenAuthModal = (mode: 'signin' | 'signup') => {
    if (pageLayoutAuthOpenRef.current) {
      pageLayoutAuthOpenRef.current(mode);
    }
  };

  // 1. 購入ボタン押下処理
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
        window.location.href = data.url; // Stripeチェックアウトへリダイレクト
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

  return (
    <PageLayout 
      user={user} 
      credits={credits} 
      onSignOut={handleSignOut}
      isDarkMode={isDarkMode}
    >
      <div className={`min-h-screen font-sans ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} transition-colors duration-300 relative flex flex-col justify-between`}>
        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-20 flex-grow w-full">
             
          {/* 2. Hero Section with YamatoChat-style Auto Demo */}
          <section className="text-center space-y-6 max-w-4xl mx-auto">
            {/* アクセントの赤バッジ */}
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

            {/* 💡 Daily Quiz Banner for Logged-in Users (English) */}
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
                  {/* アクセントに赤を使用 */}
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 font-bold animate-pulse">● Live Demo</span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md font-medium">
                  Step {currentStep + 1} / {DEMO_CONVERSATIONS.length}
                </div>
              </div>

              {/* Learning Pace Mock Display */}
              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50 rounded-xl p-2.5 mb-4 flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 dark:text-blue-300">Learning Pace (Demo)</span>
                <div className="inline-flex rounded-lg bg-white dark:bg-slate-900 p-0.5 shadow-xs border border-blue-200 dark:border-blue-800">
                  <span className="px-2.5 py-1 rounded-md text-[10px] font-bold capitalize bg-blue-600 text-white shadow-xs">normal</span>
                </div>
              </div>

              {/* Chat History Preview Area */}
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 mb-4 min-h-[160px] flex flex-col justify-center">
                {/* User Message Bubble */}
                <div className="flex justify-end">
                  <div className="max-w-[85%] p-3 rounded-xl rounded-br-xs text-xs sm:text-sm shadow-xs text-left bg-blue-600 text-white font-medium">
                    <p>{displayedUserText}
                      <span className="inline-block w-1.5 h-3 ml-0.5 bg-white animate-pulse"></span>
                    </p>
                  </div>
                </div>

                {/* Yamato Response Bubble */}
                <div className="flex justify-start">
                  <div className="max-w-[85%] p-3 rounded-xl rounded-bl-xs text-xs sm:text-sm shadow-xs text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 font-medium leading-relaxed">
                    <p>
                      {displayedYamatoText}
                      {isTypingYamato && displayedYamatoText.length < DEMO_CONVERSATIONS[currentStep].yamato.length && (
                        <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-blue-500 animate-pulse"></span>
                      )}
                    </p>
                  </div>
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
               
            {/* Limited Time Campaign Banner (アクセントの赤枠・アイコン) */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-red-600/10 via-orange-600/10 to-amber-600/10 border border-red-500/30 flex items-center justify-center space-x-2 text-xs sm:text-sm font-semibold text-red-700 dark:text-red-300 shadow-sm">
              <Flame className="w-4 h-4 text-red-600 shrink-0 animate-bounce" />
              <span>Limited-Time Campaign (Until October 29): Paid packs include bonus credits useable until October 29! Standard base credits are unexpired.</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            {/* Free Plan */}
            <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{PRICING_PLANS.free.name}</span>
                <div>
                  <span className="text-4xl font-black">{PRICING_PLANS.free.price}</span>
                  <span className="text-xs text-slate-500 ml-1">{PRICING_PLANS.free.period}</span>
                </div>
                <div className="inline-block px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 text-xs font-bold">
                  {PRICING_PLANS.free.badge}
                </div>
                <p className="text-xs text-slate-500">{PRICING_PLANS.free.description}</p>
                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  {PRICING_PLANS.free.features.map((feat, idx) => (
                    <li key={idx} className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-blue-600" /><span>{feat}</span></li>
                  ))}
                </ul>
              </div>
              <button 
                onClick={() => handleOpenAuthModal('signup')}
                className="mt-6 w-full py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {PRICING_PLANS.free.ctaText}
              </button>
            </div>

            {/* Starter Pack */}
            <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600">{PRICING_PLANS.starter.name}</span>
                <div>
                  <span className="text-4xl font-black">{PRICING_PLANS.starter.price}</span>
                  <span className="text-xs text-slate-500 ml-1">{PRICING_PLANS.starter.period}</span>
                </div>
                <div className="inline-block px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 text-xs font-bold leading-normal">
                  {PRICING_PLANS.starter.badge}
                </div>
                <p className="text-xs text-slate-500">{PRICING_PLANS.starter.description}</p>
                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  {PRICING_PLANS.starter.features.map((feat, idx) => (
                    <li key={idx} className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-blue-600" /><span>{feat}</span></li>
                  ))}
                </ul>
              </div>
              <div className="mt-6 space-y-3">
                <button 
                  onClick={() => handleCheckout(STRIPE_PRICES.starter)} 
                  disabled={checkoutLoadingPriceId === STRIPE_PRICES.starter}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-600/20 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  {checkoutLoadingPriceId === STRIPE_PRICES.starter && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Buy Starter Pack</span>
                </button>
                <p className="text-[10px] text-center text-slate-400 dark:text-slate-500">
                  By purchasing, you agree to our <Link to="/terms" className="underline hover:text-slate-600">Terms</Link> & <Link to="/disclaimer" className="underline hover:text-slate-600">Disclaimer</Link>.
                </p>
              </div>
            </div>

            {/* Standard Pack (Most Popular - 青色系に変更) */}
            <div className={`p-6 rounded-3xl border-2 border-blue-600 flex flex-col justify-between relative ${isDarkMode ? 'bg-slate-900' : 'bg-white'} shadow-xl`}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-blue-600 text-white text-[10px] font-extrabold uppercase tracking-widest rounded-full">
                Most Popular
              </div>
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600">{PRICING_PLANS.standard.name}</span>
                <div>
                  <span className="text-4xl font-black">{PRICING_PLANS.standard.price}</span>
                  <span className="text-xs text-slate-500 ml-1">{PRICING_PLANS.standard.period}</span>
                </div>
                <div className="inline-block px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 text-xs font-bold leading-normal">
                  {PRICING_PLANS.standard.badge}
                </div>
                <p className="text-xs text-slate-500">{PRICING_PLANS.standard.description}</p>
                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  {PRICING_PLANS.standard.features.map((feat, idx) => (
                    <li key={idx} className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-blue-600" /><span>{feat}</span></li>
                  ))}
                </ul>
              </div>
              <div className="mt-6 space-y-3">
                <button 
                  onClick={() => handleCheckout(STRIPE_PRICES.standard)} 
                  disabled={checkoutLoadingPriceId === STRIPE_PRICES.standard}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-600/20 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  {checkoutLoadingPriceId === STRIPE_PRICES.standard && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
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
                <span className="text-xs font-bold uppercase tracking-wider text-purple-600">{PRICING_PLANS.pro.name}</span>
                <div>
                  <span className="text-4xl font-black">{PRICING_PLANS.pro.price}</span>
                  <span className="text-xs text-slate-500 ml-1">{PRICING_PLANS.pro.period}</span>
                </div>
                <div className="inline-block px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-600 text-xs font-bold leading-normal">
                  {PRICING_PLANS.pro.badge}
                </div>
                <p className="text-xs text-slate-500">{PRICING_PLANS.pro.description}</p>
                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  {PRICING_PLANS.pro.features.map((feat, idx) => (
                    <li key={idx} className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-purple-600" /><span>{feat}</span></li>
                  ))}
                </ul>
              </div>
              <div className="mt-6 space-y-3">
                <button 
                  onClick={() => handleCheckout(STRIPE_PRICES.pro)} 
                  disabled={checkoutLoadingPriceId === STRIPE_PRICES.pro}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-purple-600/20 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  {checkoutLoadingPriceId === STRIPE_PRICES.pro && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
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
              <div className="flex justify-between border-b border-slate-500/10 pb-1.5"><span>Text Chat (Q&A / Vocabulary)</span> <span className="font-semibold text-slate-700 dark:text-slate-300">1-2 credits / turn</span></div>
              <div className="flex justify-between border-b border-slate-500/10 pb-1.5"><span>Essay / Genkoyoshi Correctors</span> <span className="font-semibold text-slate-700 dark:text-slate-300">20-30 credits / session</span></div>
              <div className="flex justify-between border-b border-slate-500/10 pb-1.5"><span>Oral Exam / Voice Roleplay</span> <span className="font-semibold text-slate-700 dark:text-slate-300">15-25 credits / min</span></div>
              <div className="flex justify-between pt-0.5"><span>Mini Games & Drills</span> <span className="font-semibold text-blue-600">Free / 0.5 credits</span></div>
            </div>
          </div>
        </section>

        {/* 4. Additional Portal Pages Navigation Cards */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-extrabold tracking-tight">Portal Pages & Modules</h2>
            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Direct access to all specialized exam prep modules, tools, and pricing pages.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 1. genkoyoshi-editor (Active / First) */}
            <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm hover:border-red-500/50 transition-colors`}>
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center">
                  <Grid className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base">Genkoyoshi Editor</h3>
                <p className="text-xs text-slate-500 leading-relaxed">Digital manuscript paper editor for precise Japanese character layout, counting, and PDF export.</p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-500/10 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Free Tool</span>
                <Link to="/genkoyoshi-editor" className="text-red-600 font-bold flex items-center space-x-1 hover:underline cursor-pointer">
                  <span>Open Editor</span> <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* 2. eoy-oral-drill (Coming Soon) */}
            <div className={`p-6 rounded-3xl border opacity-75 flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                    <Mic className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-500/10 text-slate-500">Coming Soon</span>
                </div>
                <h3 className="font-bold text-base">EOY Oral Drill</h3>
                <p className="text-xs text-slate-500 leading-relaxed">Targeted practice drills focusing on conversational fluidity and pronunciation for VCE oral exams.</p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-500/10 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Module</span>
                <span className="text-slate-400 font-medium cursor-not-allowed">Coming Soon</span>
              </div>
            </div>

            {/* 3. eoy-oral-elaborate (Coming Soon) */}
            <div className={`p-6 rounded-3xl border opacity-75 flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                    <Mic className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-500/10 text-slate-500">Coming Soon</span>
                </div>
                <h3 className="font-bold text-base">EOY Oral Elaboration</h3>
                <p className="text-xs text-slate-500 leading-relaxed">Deep-dive elaboration strategies and AI-assisted vocabulary building for Section 2 Detailed Study.</p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-500/10 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Module</span>
                <span className="text-slate-400 font-medium cursor-not-allowed">Coming Soon</span>
              </div>
            </div>

            {/* 4. eoy-oral-mock (Coming Soon) */}
            <div className={`p-6 rounded-3xl border opacity-75 flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                    <Mic className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-500/10 text-slate-500">Coming Soon</span>
                </div>
                <h3 className="font-bold text-base">EOY Oral Mock Exam</h3>
                <p className="text-xs text-slate-500 leading-relaxed">Full-length simulated VCE oral exam environment with real-time AI examiner evaluation and scoring.</p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-500/10 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Module</span>
                <span className="text-slate-400 font-medium cursor-not-allowed">Coming Soon</span>
              </div>
            </div>

            {/* 5. eoy-writing (Coming Soon) */}
            <div className={`p-6 rounded-3xl border opacity-75 flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-500/10 text-slate-500">Coming Soon</span>
                </div>
                <h3 className="font-bold text-base">EOY Writing Exam Tutor</h3>
                <p className="text-xs text-slate-500 leading-relaxed">Comprehensive writing exam practice suite featuring 110 original prompts and structured feedback.</p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-500/10 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Module</span>
                <span className="text-slate-400 font-medium cursor-not-allowed">Coming Soon</span>
              </div>
            </div>

            {/* 6. game-igo (Coming Soon) */}
            <div className={`p-6 rounded-3xl border opacity-75 flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                    <Gamepad2 className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-500/10 text-slate-500">Coming Soon</span>
                </div>
                <h3 className="font-bold text-base">Go (Igo) Mini Game</h3>
                <p className="text-xs text-slate-500 leading-relaxed">Traditional Japanese board game mini-app with AI play modes to relax and build strategic thinking.</p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-500/10 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Mini Game</span>
                <span className="text-slate-400 font-medium cursor-not-allowed">Coming Soon</span>
              </div>
            </div>

            {/* 7. oral-exam-questions (Coming Soon) */}
            <div className={`p-6 rounded-3xl border opacity-75 flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-500/10 text-slate-500">Coming Soon</span>
                </div>
                <h3 className="font-bold text-base">Oral Exam Questions</h3>
                <p className="text-xs text-slate-500 leading-relaxed">Curated database of official and practice VCE oral examination questions with audio samples.</p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-500/10 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Reference</span>
                <span className="text-slate-400 font-medium cursor-not-allowed">Coming Soon</span>
              </div>
            </div>
          </div>
        </section>

      </main>

        {/* 🤖 Bottom-right Persistent AI Tutor Area */}
        <aside aria-label="AI Yamato" className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
          {showScrollTop && (
            <button
              type="button"
              onClick={scrollToTop}
              className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all cursor-pointer text-sm flex items-center justify-center"
              title="Scroll to top"
            >
              ⬆️
            </button>
          )}

          {!isAiTutorOpen ? (
            <button
              type="button"
              onClick={() => setIsAiTutorOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all cursor-pointer text-sm"
            >
              <span>🤖</span>
              <span>AI Yamato</span>
            </button>
          ) : (
            <div
              ref={aiChatRef}
              className={`bg-white border-2 border-blue-300 rounded-2xl p-5 shadow-2xl flex flex-col transition-all ${
                isAiFullscreen
                  ? "w-screen h-screen rounded-none border-none p-6 sm:p-10 overflow-auto"
                  : "w-80 sm:w-96 h-[500px] min-w-[280px] min-h-[350px] max-w-[90vw] max-h-[85vh] resize overflow-auto"
              }`}
            >
              <div className="w-full h-full flex flex-col">
                <div className="flex items-center justify-between border-b pb-2 mb-3 shrink-0">
                  <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2 m-0">
                    <span>🤖</span> Japanese Tutor AI Yamato
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={toggleAiFullscreen}
                      className="text-slate-500 hover:text-slate-700 text-xs font-bold px-2 py-1 rounded-md transition cursor-pointer border border-slate-200"
                      title={isAiFullscreen ? "Restore original size" : "Maximize to screen"}
                    >
                      {isAiFullscreen ? "🗗 Minimize" : "🗖 Maximize"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (document.fullscreenElement) {
                          document.exitFullscreen().catch(() => {});
                        }
                        setIsAiTutorOpen(false);
                        setIsAiFullscreen(false);
                      }}
                      className="text-slate-400 hover:text-slate-600 text-xs font-bold px-2 py-1 rounded-md transition cursor-pointer"
                    >
                      ✕ Close
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-3 shrink-0">
                  Ask questions about Japanese language, grammar, kanji, or culture!
                </p>

              {/* Learning Level Selection UI */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 mb-3 flex items-center justify-between shrink-0">
                <span className="text-xs font-bold text-blue-900">Learning Pace</span>
                <div className="inline-flex rounded-lg bg-white p-0.5 shadow-xs border border-blue-200">
                  {(["steady", "normal", "accelerated"] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setTutorLevel(level)}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold capitalize transition ${
                        tutorLevel === level
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-slate-600 hover:text-blue-700"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat History Area */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 overflow-y-auto space-y-2.5 flex-grow mb-3">
                {tutorMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[95%] p-2.5 rounded-xl text-xs leading-relaxed whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "bg-blue-600 text-white rounded-br-xs"
                          : "bg-white border border-slate-200 text-slate-800 rounded-bl-xs shadow-xs"
                      }`}
                    >
                      {msg.role === "user" ? (
                        msg.content
                      ) : (
                        <div className="space-y-2">
                          <div 
                            className="ai-markdown-content overflow-x-auto [&_table]:w-full [&_table]:border-collapse [&_table]:my-2 [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-100 [&_th]:p-1.5 [&_th]:text-left [&_td]:border [&_td]:border-slate-200 [&_td]:p-1.5"
                            dangerouslySetInnerHTML={{ __html: msg.content }}
                          />
                          {msg.imageUrl && (
                            <div className="mt-2 rounded-lg overflow-hidden border border-blue-200 bg-blue-50/50 p-1">
                              <img
                                src={msg.imageUrl}
                                alt="AI Yamato Visual Explanation"
                                onClick={() => setModalImageSrc(msg.imageUrl || null)}
                                className="w-full h-auto rounded-md object-contain max-h-48 cursor-pointer hover:opacity-95 transition"
                                title="Click to enlarge image"
                              />
                              <p className="text-[10px] text-blue-800 text-center mt-1 font-medium cursor-pointer" onClick={() => setModalImageSrc(msg.imageUrl || null)}>
                                ✨ Yamato Custom Diagram & Illustration (Click to Enlarge)
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isTutorLoading && (
                  <div className="text-xs text-slate-500 italic">🤖 AI Yamato is thinking (and creating visual illustration)...</div>
                )}
              </div>

              {/* Input Form & Visual Aid Checkbox */}
              <form onSubmit={handleSendTutorMessage} className="flex flex-col gap-2 shrink-0">
                <div className="flex items-center gap-2 px-1">
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-blue-800 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={requestVisualAid}
                      onChange={(e) => setRequestVisualAid(e.target.checked)}
                      disabled={isTutorLoading}
                      className="rounded border-blue-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span>🎨 explain with diagrams and illustrations</span>
                  </label>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tutorInput}
                    onChange={(e) => setTutorInput(e.target.value)}
                    placeholder="Ask AI tutor anything..."
                    disabled={isTutorLoading}
                    className="flex-grow p-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                  />
                  <button
                    type="submit"
                    disabled={isTutorLoading || !tutorInput.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    Send
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </aside>

        {/* 💡 Daily Quiz Modal (English Instructions & UI) */}
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

        {/* Enlarged Image Modal (Lightbox) */}
        {modalImageSrc && (
          <div 
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setModalImageSrc(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl p-2 shadow-2xl flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setModalImageSrc(null)}
                className="absolute top-3 right-3 bg-slate-800/70 hover:bg-slate-900 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition cursor-pointer z-10"
              >
                ✕
              </button>
              <img
                src={modalImageSrc}
                alt="Enlarged AI Yamato Visual"
                className="max-w-full max-h-[80vh] rounded-lg object-contain"
              />
              <p className="text-xs text-slate-600 mt-2 font-medium">✨ Yamato Custom Diagram & Illustration (Enlarged)</p>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}