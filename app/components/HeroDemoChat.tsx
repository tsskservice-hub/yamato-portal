/**
 * @file HeroDemoChat.tsx
 * @description ヒーローセクションおよび自動デモチャット・デイリークイズバナーコンポーネント
 */
import React, { useState, useEffect, useRef } from 'react';
import { Flame, ArrowRight, ArrowDown, Send } from 'lucide-react';

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

interface HeroDemoChatProps {
  isDarkMode: boolean;
  user: any;
  hasCompletedTodayQuiz: boolean;
  onOpenAuthModal: (mode: 'signin' | 'signup') => void;
  onOpenQuizModal: () => void;
  validateFeatureCredits: (featureType: 'textAi' | 'imageAi') => Promise<boolean>;
}

export function HeroDemoChat({
  isDarkMode,
  user,
  hasCompletedTodayQuiz,
  onOpenAuthModal,
  onOpenQuizModal,
  validateFeatureCredits,
}: HeroDemoChatProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [chatHistory, setChatHistory] = useState<Array<{ user: string; yamato?: string }>>([]);
  const [typedInputText, setTypedInputText] = useState('');        
  const [isSending, setIsSending] = useState(false);                 
  const [isThinking, setIsThinking] = useState(false);

  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatHistory, isThinking, typedInputText]);

  useEffect(() => {
    let isMounted = true;
    const currentConv = DEMO_CONVERSATIONS[currentStep];

    const runDemoSequence = async () => {
      if (!isMounted) return;
      setTypedInputText('');
      setIsSending(false);
      setIsThinking(false);

      await new Promise((r) => setTimeout(r, 600));
      if (!isMounted) return;

      for (let i = 1; i <= currentConv.user.length; i++) {
        if (!isMounted) return;
        setTypedInputText(currentConv.user.slice(0, i));
        await new Promise((r) => setTimeout(r, 45));
      }

      await new Promise((r) => setTimeout(r, 200));
      if (!isMounted) return;

      setIsSending(true);
      await new Promise((r) => setTimeout(r, 350));
      if (!isMounted) return;

      setIsSending(false);
      setTypedInputText('');
      setChatHistory((prev) => [...prev, { user: currentConv.user }]);

      await new Promise((r) => setTimeout(r, 400));
      if (!isMounted) return;

      setIsThinking(true);
      await new Promise((r) => setTimeout(r, 3000));
      if (!isMounted) return;

      setIsThinking(false);
      setChatHistory((prev) => {
        const updated = [...prev];
        const lastItem = updated[updated.length - 1];
        if (lastItem) {
          lastItem.yamato = currentConv.yamato;
        }
        return updated;
      });

      if (currentStep === DEMO_CONVERSATIONS.length - 1) {
        await new Promise((r) => setTimeout(r, 4000));
        if (!isMounted) return;
        setChatHistory([]);
        setCurrentStep(0);
      } else {
        await new Promise((r) => setTimeout(r, 2000));
        if (!isMounted) return;
        setCurrentStep((prev) => prev + 1);
      }
    };

    runDemoSequence();

    return () => {
      isMounted = false;
    };
  }, [currentStep]);

  return (
    <section className="text-center space-y-6 max-w-4xl mx-auto">
      <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200 shadow-sm">
        <Flame className="w-3.5 h-3.5 text-red-600 animate-pulse" />
        <span>Decades of Expertise in Japanese Language Education</span>
      </div>

      <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight">
        <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-red-600 bg-clip-text text-transparent">
          Japanese Tutor AI Yamato
        </span>
        <span className="block text-2xl sm:text-3xl font-bold mt-3 text-slate-700 dark:text-slate-300">
          Your Gateway to Japanese Mastery
        </span>
      </h1>

      <p className={`text-base sm:text-lg max-w-2xl mx-auto ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
        Backed by decades of expert classroom teaching, now available to learners worldwide. Experience precision AI-driven Japanese tutoring tailored to your unique goals.
      </p>

      {/* Daily Quiz Banner */}
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
              {!user 
                ? "Sign in to take today's quiz and earn 2 free credits! ✨" 
                : hasCompletedTodayQuiz 
                ? "You've already completed today's quiz! Come back tomorrow for more ✨" 
                : "Answer correctly to earn 2 credits! (Available once per day)"}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            if (!user) {
              onOpenAuthModal('signup');
            } else {
              onOpenQuizModal();
            }
          }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
            user && hasCompletedTodayQuiz 
              ? "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300" 
              : "bg-red-600 hover:bg-red-700 text-white shadow-red-600/20"
          }`}
        >
          <span>{!user ? "Sign In to Play Quiz" : hasCompletedTodayQuiz ? "View Quiz Results & Explanation" : "Take Today's Quiz"}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Auto Demo Chat Box */}
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

        {/* チャット会話の蓄積表示エリア */}
        <div 
          ref={chatScrollRef}
          className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4 mb-4 h-[220px] overflow-y-auto flex flex-col scroll-smooth shadow-inner"
        >
          {chatHistory.length === 0 && !isThinking && (
            <div className="my-auto text-center text-xs text-slate-400 dark:text-slate-500 italic">
              AI Yamato demo is starting...
            </div>
          )}

          {chatHistory.map((exchange, idx) => (
            <div key={idx} className="space-y-3">
              <div className="flex justify-end">
                <div className="max-w-[85%] p-3 rounded-xl rounded-br-xs text-xs sm:text-sm shadow-xs text-left bg-blue-600 text-white font-medium">
                  <p>{exchange.user}</p>
                </div>
              </div>

              <div className="flex justify-start">
                {exchange.yamato ? (
                  <div className="max-w-[85%] p-3 rounded-xl rounded-bl-xs text-xs sm:text-sm shadow-xs text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 font-medium leading-relaxed">
                    <p>{exchange.yamato}</p>
                  </div>
                ) : (
                  isThinking && idx === chatHistory.length - 1 && (
                    <div className="p-3 rounded-xl rounded-bl-xs text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 flex items-center space-x-2 shadow-xs">
                      <span className="inline-block animate-spin text-sm">🤖</span>
                      <span className="italic font-medium animate-pulse">かんがえちゅう...</span>
                    </div>
                  )
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center space-x-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 mb-4 shadow-xs">
          <div className="flex-grow px-3 py-1.5 text-xs sm:text-sm text-slate-700 dark:text-slate-200 flex items-center">
            {typedInputText ? (
              <span>{typedInputText}</span>
            ) : (
              <span className="text-slate-400 dark:text-slate-500">Ask Yamato a question...</span>
            )}
            {!isSending && <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-blue-600 animate-pulse"></span>}
          </div>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm transition-all duration-200 ${
            isSending ? 'bg-blue-700 scale-95 ring-2 ring-blue-400/50 text-white' : 'bg-blue-600 text-white opacity-90'
          }`}>
            <Send className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between border border-blue-200 dark:border-blue-800/50 rounded-xl p-3 bg-blue-50/50 dark:bg-blue-950/20 text-sm gap-3">
          <div className="flex flex-col space-y-1.5 text-xs text-slate-600 dark:text-slate-300 px-2 text-center sm:text-left font-medium">
            <div className="flex items-center space-x-2">
              <span>✨</span>
              <span>Want to chat with Yamato-sensei? (Requires login & 2 credits for text chat)</span>
              <a 
                href="#pricing-credits-guide" 
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('pricing-credits-guide')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:underline font-bold ml-1 cursor-pointer bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-md"
                title="View Credit Consumption Guide"
              >
                <span>Guide</span>
                <ArrowDown className="w-3 h-3 animate-bounce" />
              </a>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 pl-5">
              Answer today's Daily Quiz to earn 2 credits, or sign up now to receive 10 welcome credits!
            </div>
          </div>
          <button 
            onClick={async () => {
              if (!user) {
                onOpenAuthModal('signup');
              } else if (await validateFeatureCredits('textAi')) {
                alert("You can chat directly with Yamato-sensei using the chat widget in the bottom right corner!");
              }
            }}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap"
          >
            <span>{user ? "Chat with Yamato" : "Free Sign Up"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}