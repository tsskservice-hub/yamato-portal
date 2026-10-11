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
  Loader2 
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { signUpAndRegisterPasskey, signInWithPasskey } from '../lib/passkey';

export const STRIPE_PRICES = {
  starter: 'price_1UOmko2ZJezqyZ9eR0l8cvUk',
  standard: 'price_1xxxx_standard',
  pro: 'price_1xxxx_pro',
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

// AI出力テキストの整形関数（HTMLエスケープと改行コードの保持）
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

  // Auth modal states
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [emailInput, setEmailInput] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

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

  // Auth and session handling
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    if (queryParams.get('success') === 'true') {
      alert('Payment successful! Your credits have been updated.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }

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

  const fetchUserCredits = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', userId)
        .single();
      if (data && !error) {
        const typedData = data as { credits?: number };
        setCredits(typedData.credits ?? 10);
      }
    } catch (err) {
      console.error('Failed to fetch credits:', err);
    }
  };

  const handlePasskeyAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      if (authMode === 'signup') {
        if (!emailInput) {
          throw new Error('Please enter your email address for passkey registration.');
        }
        await signUpAndRegisterPasskey(emailInput);
        alert('Passkey registration successful! Welcome to AI Yamato.');
      } else {
        await signInWithPasskey();
        alert('Passkey sign in successful!');
      }
      setIsAuthModalOpen(false);
      setEmailInput('');
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || 'Passkey authentication failed. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const handleCheckout = async (priceId: string) => {
    if (!user) {
      setAuthMode('signup');
      setIsAuthModalOpen(true);
      return;
    }

    try {
      setCheckoutLoadingPriceId(priceId);

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: priceId,
          userId: user.id,
        }),
      });

      const data = (await response.json()) as any;

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

  return (
    <div className={`min-h-screen font-sans ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} transition-colors duration-300 relative flex flex-col justify-between`}>
      {/* 1. Navbar */}
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-md flex items-center justify-center bg-blue-600">
              <img src="/jptutoraiyamato.png" alt="AI Yamato Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-extrabold tracking-tight text-lg bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              JP Tutor AI <span className="text-xs uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold ml-1">Yamato</span>
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {user ? (
              <>
                <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                  <Coins className="w-3.5 h-3.5" />
                  <span>Credits: {credits}</span>
                </div>
                <button 
                  onClick={handleSignOut}
                  className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all flex items-center space-x-1 ${isDarkMode ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'}`}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => { setAuthMode('signin'); setIsAuthModalOpen(true); }}
                  className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all flex items-center space-x-1 ${isDarkMode ? 'border-slate-700 hover:bg-slate-800 text-slate-200' : 'border-slate-200 hover:bg-slate-100 text-slate-700'}`}
                >
                  <KeyRound className="w-3.5 h-3.5 text-blue-500" />
                  <span>Passkey Sign In</span>
                </button>

                <button 
                  onClick={() => { setAuthMode('signup'); setIsAuthModalOpen(true); }}
                  className="text-xs font-semibold px-4 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all flex items-center space-x-1"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Register Passkey</span>
                </button>
              </>
            )}

            <button className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all ${isDarkMode ? 'border-slate-700 hover:bg-slate-800 text-slate-200' : 'border-slate-200 hover:bg-slate-100 text-slate-700'}`}>
              Pricing & Plans
            </button>

            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-full border transition-all ${isDarkMode ? 'border-slate-700 bg-slate-800 text-amber-400' : 'border-slate-200 bg-slate-100 text-slate-600'}`}
              aria-label="Toggle Theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Yamato</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-20 flex-grow w-full">
         
        {/* 2. Hero Section with Typing Auto Demo */}
        <section className="text-center space-y-6 max-w-4xl mx-auto">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 shadow-sm">
            <Award className="w-3.5 h-3.5 text-blue-600" />
            <span>Decades of Expertise in Japanese Language Education</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight">
            Your Gateway to <br />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-pink-600 bg-clip-text text-transparent">
              Japanese Mastery
            </span>
          </h1>

          <p className={`text-base sm:text-lg max-w-2xl mx-auto ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Backed by decades of expert classroom teaching, now available to learners worldwide. Experience precision AI-driven Japanese tutoring tailored to your unique goals.
          </p>

          <div className={`mt-8 p-4 sm:p-6 rounded-2xl border shadow-2xl backdrop-blur-sm ${isDarkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-700/20">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold">侍</div>
                <span className="font-bold text-sm">AI Yamato (Auto Demo)</span>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-medium animate-pulse">● Live Demo</span>
              </div>
              <div className="text-xs text-slate-400 bg-slate-500/10 px-2.5 py-1 rounded-md">
                Step {currentStep + 1} / {DEMO_CONVERSATIONS.length}
              </div>
            </div>

            <div className="flex items-center justify-between bg-slate-500/5 p-2.5 rounded-xl mb-4 text-xs font-medium">
              <span className="text-slate-500">Auto Playback Preview</span>
              <div className="flex space-x-1 bg-slate-500/10 p-1 rounded-lg">
                <span className="px-3 py-1 rounded bg-blue-600 text-white shadow-sm">Zero API Cost</span>
              </div>
            </div>

            {/* User Message Bubble */}
            <div className="flex justify-end mb-4">
              <div className="max-w-[85%] p-3.5 rounded-2xl rounded-tr-sm text-xs sm:text-sm shadow-sm text-left bg-blue-600 text-white font-medium">
                <p>{displayedUserText}
                  <span className="inline-block w-1.5 h-3 ml-0.5 bg-white animate-pulse"></span>
                </p>
              </div>
            </div>

            {/* Yamato Response Bubble */}
            <div className={`p-4 rounded-xl flex items-start space-x-3 mb-4 text-left ${isDarkMode ? 'bg-slate-800/60' : 'bg-blue-50/50'}`}>
              <div className="w-8 h-8 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center text-white text-xs">侍</div>
              <div className="text-sm space-y-1">
                <p className="font-medium leading-relaxed">
                  {displayedYamatoText}
                  {isTypingYamato && displayedYamatoText.length < DEMO_CONVERSATIONS[currentStep].yamato.length && (
                    <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-blue-500 animate-pulse"></span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between border border-slate-500/30 rounded-xl p-3 bg-slate-500/5 text-sm gap-3">
              <div className="flex items-center space-x-2 text-xs text-slate-500 px-2 text-center sm:text-left">
                <span>🚀</span>
                <span>Want to ask Yamato your own questions?</span>
              </div>
              <button 
                onClick={() => { setAuthMode('signup'); setIsAuthModalOpen(true); }}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap"
              >
                <span>Launch App (Free Register)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>

        {/* 3. Pricing & Credit Packs */}
        <section className="space-y-12 text-center">
          <div className="space-y-3">
            <h2 className="text-3xl font-extrabold tracking-tight">Choose Your Plan & Credit Packs</h2>
            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Start for free with daily credits, or top up with prepaid charge packs for intensive study.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            {/* Free Plan */}
            <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Free Plan</span>
                <div>
                  <span className="text-4xl font-black">$0</span>
                  <span className="text-xs text-slate-500 ml-1">/ forever</span>
                </div>
                <div className="inline-block px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 text-xs font-bold">
                  Daily 2 Free Credits
                </div>
                <p className="text-xs text-slate-500">Recharged daily upon login. Enjoy basic chat, traditional games, and Genkoyoshi editor tools.</p>
                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <li className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-blue-600" /><span>Daily Login Credits</span></li>
                  <li className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-blue-600" /><span>Free Traditional Games & Tools</span></li>
                </ul>
              </div>
              <button 
                onClick={() => { setAuthMode('signup'); setIsAuthModalOpen(true); }}
                className="mt-6 w-full py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Get Started Free
              </button>
            </div>

            {/* Starter Pack */}
            <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Starter Pack</span>
                <div>
                  <span className="text-4xl font-black">$10</span>
                  <span className="text-xs text-slate-500 ml-1">AUD</span>
                </div>
                <div className="inline-block px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 text-xs font-bold">
                  1,000 Credits
                </div>
                <p className="text-xs text-slate-500">Great for beginners. Ideal for a few essay corrections or voice roleplay sessions.</p>
                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <li className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-blue-600" /><span>Standard AI Chat & Q&A</span></li>
                  <li className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-blue-600" /><span>Pay-as-you-go flexibility</span></li>
                </ul>
              </div>
              <button 
                onClick={() => handleCheckout(STRIPE_PRICES.starter)} 
                disabled={checkoutLoadingPriceId === STRIPE_PRICES.starter}
                className="mt-6 w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-600/20 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                {checkoutLoadingPriceId === STRIPE_PRICES.starter && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Buy Starter Pack</span>
              </button>
            </div>

            {/* Standard Pack */}
            <div className={`p-6 rounded-3xl border-2 border-blue-600 flex flex-col justify-between relative ${isDarkMode ? 'bg-slate-900' : 'bg-white'} shadow-xl`}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-blue-600 text-white text-[10px] font-extrabold uppercase tracking-widest rounded-full">
                Most Popular
              </div>
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Standard Pack</span>
                <div>
                  <span className="text-4xl font-black">$25</span>
                  <span className="text-xs text-slate-500 ml-1">AUD</span>
                </div>
                <div className="inline-block px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 text-xs font-bold">
                  2,800 Credits (Approx. 10% Bonus)
                </div>
                <p className="text-xs text-slate-500">Our most popular choice. Perfect for regular study routines and test preparation.</p>
                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <li className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-blue-600" /><span>10% Bonus Credit Value</span></li>
                  <li className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-blue-600" /><span>Regular Study & Test Practice</span></li>
                </ul>
              </div>
              <button 
                onClick={() => handleCheckout(STRIPE_PRICES.standard)} 
                disabled={checkoutLoadingPriceId === STRIPE_PRICES.standard}
                className="mt-6 w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-600/20 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                {checkoutLoadingPriceId === STRIPE_PRICES.standard && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Buy Standard Pack</span>
              </button>
            </div>

            {/* Pro Intensivist */}
            <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-600">Pro Intensivist</span>
                <div>
                  <span className="text-4xl font-black">$50</span>
                  <span className="text-xs text-slate-500 ml-1">AUD</span>
                </div>
                <div className="inline-block px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-600 text-xs font-bold">
                  6,000 Credits (Approx. 20% Bonus)
                </div>
                <p className="text-xs text-slate-500">For heavy users and premium-intensive drills. Maximum value with 20% bonus credits.</p>
                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <li className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-purple-600" /><span>20% Bonus Credit Value</span></li>
                  <li className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-purple-600" /><span>VCE Exam Prep & Essays</span></li>
                </ul>
              </div>
              <button 
                onClick={() => handleCheckout(STRIPE_PRICES.pro)} 
                disabled={checkoutLoadingPriceId === STRIPE_PRICES.pro}
                className="mt-6 w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-purple-600/20 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                {checkoutLoadingPriceId === STRIPE_PRICES.pro && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Buy Pro Pack</span>
              </button>
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
              <div className="flex justify-between pt-0.5"><span>Mini Games & Drills</span> <span className="font-semibold text-emerald-600">Free / 0.5 credits</span></div>
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
            {/* 1. eoy-oral-drill */}
            <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm hover:border-blue-500/50 transition-colors`}>
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <Mic className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base">EOY Oral Drill</h3>
                <p className="text-xs text-slate-500 leading-relaxed">Targeted practice drills focusing on conversational fluidity and pronunciation for VCE oral exams.</p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-500/10 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Module</span>
                <Link to="/eoy-oral-drill" className="text-blue-600 font-bold flex items-center space-x-1 hover:underline cursor-pointer">
                  <span>Open Page</span> <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* 2. eoy-oral-elaborate */}
            <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm hover:border-blue-500/50 transition-colors`}>
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                  <Mic className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base">EOY Oral Elaboration</h3>
                <p className="text-xs text-slate-500 leading-relaxed">Deep-dive elaboration strategies and AI-assisted vocabulary building for Section 2 Detailed Study.</p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-500/10 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Module</span>
                <Link to="/eoy-oral-elaborate" className="text-indigo-600 font-bold flex items-center space-x-1 hover:underline cursor-pointer">
                  <span>Open Page</span> <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* 3. eoy-oral-mock */}
            <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm hover:border-blue-500/50 transition-colors`}>
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                  <Mic className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base">EOY Oral Mock Exam</h3>
                <p className="text-xs text-slate-500 leading-relaxed">Full-length simulated VCE oral exam environment with real-time AI examiner evaluation and scoring.</p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-500/10 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Module</span>
                <Link to="/eoy-oral-mock" className="text-purple-600 font-bold flex items-center space-x-1 hover:underline cursor-pointer">
                  <span>Open Page</span> <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* 4. eoy-writing */}
            <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm hover:border-pink-500/50 transition-colors`}>
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-600 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base">EOY Writing Exam Tutor</h3>
                <p className="text-xs text-slate-500 leading-relaxed">Comprehensive writing exam practice suite featuring 110 original prompts and structured feedback.</p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-500/10 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Module</span>
                <Link to="/eoy-writing" className="text-pink-600 font-bold flex items-center space-x-1 hover:underline cursor-pointer">
                  <span>Open Page</span> <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* 5. game-igo */}
            <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm hover:border-emerald-500/50 transition-colors`}>
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Gamepad2 className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base">Go (Igo) Mini Game</h3>
                <p className="text-xs text-slate-500 leading-relaxed">Traditional Japanese board game mini-app with AI play modes to relax and build strategic thinking.</p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-500/10 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Mini Game</span>
                <Link to="/game-igo" className="text-emerald-600 font-bold flex items-center space-x-1 hover:underline cursor-pointer">
                  <span>Open Game</span> <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* 6. genkoyoshi-editor */}
            <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm hover:border-amber-500/50 transition-colors`}>
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Grid className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base">Genkoyoshi Editor</h3>
                <p className="text-xs text-slate-500 leading-relaxed">Digital manuscript paper editor for precise Japanese character layout, counting, and PDF export.</p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-500/10 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Free Tool</span>
                <Link to="/genkoyoshi-editor" className="text-amber-600 font-bold flex items-center space-x-1 hover:underline cursor-pointer">
                  <span>Open Editor</span> <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* 7. oral-exam-questions */}
            <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm hover:border-blue-500/50 transition-colors`}>
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base">Oral Exam Questions</h3>
                <p className="text-xs text-slate-500 leading-relaxed">Curated database of official and practice VCE oral examination questions with audio samples.</p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-500/10 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Reference</span>
                <Link to="/oral-exam-questions" className="text-blue-600 font-bold flex items-center space-x-1 hover:underline cursor-pointer">
                  <span>View Questions</span> <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* 8. prices */}
            <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm hover:border-purple-500/50 transition-colors`}>
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                  <Coins className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base">Pricing & Plans Page</h3>
                <p className="text-xs text-slate-500 leading-relaxed">Dedicated standalone pricing and credit pack selection page with detailed feature breakdowns.</p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-500/10 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Billing</span>
                <Link to="/prices" className="text-purple-600 font-bold flex items-center space-x-1 hover:underline cursor-pointer">
                  <span>View Pricing</span> <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* 9. test-yamato (追加) */}
            <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm hover:border-cyan-500/50 transition-colors`}>
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base">Test Yamato Sandbox</h3>
                <p className="text-xs text-slate-500 leading-relaxed">Experimental testing playground for trying out new AI Yamato features, UI widgets, and prompt flows.</p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-500/10 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Sandbox</span>
                <Link to="/test-yamato" className="text-cyan-600 font-bold flex items-center space-x-1 hover:underline cursor-pointer">
                  <span>Open Sandbox</span> <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom Play & Learn Badge Bar */}
        <div className="flex justify-center">
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full border border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400 text-xs font-bold shadow-sm">
            <Gamepad2 className="w-4 h-4" />
            <span>Play & Learn</span>
          </div>
        </div>

      </main>

      {/* 🤖 右下常駐エリア（AIチューター窓 & 上に戻るボタンを一体化して配置） */}
      <aside aria-label="AI Yamato" className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {showScrollTop && (
          <button
            type="button"
            onClick={scrollToTop}
            className="bg-amber-600 hover:bg-amber-700 text-white p-3 rounded-full shadow-lg transition-all cursor-pointer text-sm flex items-center justify-center"
            title="Scroll to top"
          >
            ⬆️
          </button>
        )}

        {!isAiTutorOpen ? (
          <button
            type="button"
            onClick={() => setIsAiTutorOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all cursor-pointer text-sm"
          >
            <span>🤖</span>
            <span>AI Yamato</span>
          </button>
        ) : (
          <div
            ref={aiChatRef}
            className={`bg-white border-2 border-emerald-300 rounded-2xl p-5 shadow-2xl flex flex-col transition-all ${
              isAiFullscreen
                ? "w-screen h-screen rounded-none border-none p-6 sm:p-10 overflow-auto"
                : "w-80 sm:w-96 h-[500px] min-w-[280px] min-h-[350px] max-w-[90vw] max-h-[85vh] resize overflow-auto"
            }`}
          >
            <div className="w-full h-full flex flex-col">
              <div className="flex items-center justify-between border-b pb-2 mb-3 shrink-0">
                <h3 className="text-sm font-bold text-emerald-900 flex items-center gap-2 m-0">
                  <span>🤖</span> 日本語Tutor AI Yamato
                </h3>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={toggleAiFullscreen}
                    className="text-slate-500 hover:text-slate-700 text-xs font-bold px-2 py-1 rounded-md transition cursor-pointer border border-slate-200"
                    title={isAiFullscreen ? "元の大きさに戻す" : "デバイスの画面に合わせて最大化"}
                  >
                    {isAiFullscreen ? "🗗 縮小" : "🗖 最大化"}
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

              {/* 学習レベル選択UI */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 mb-3 flex items-center justify-between shrink-0">
                <span className="text-xs font-bold text-emerald-900">Learning Pace</span>
                <div className="inline-flex rounded-lg bg-white p-0.5 shadow-xs border border-emerald-200">
                  {(["steady", "normal", "accelerated"] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setTutorLevel(level)}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold capitalize transition ${
                        tutorLevel === level
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-slate-600 hover:text-emerald-700"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* チャット履歴エリア */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 overflow-y-auto space-y-2.5 flex-grow mb-3">
                {tutorMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[95%] p-2.5 rounded-xl text-xs leading-relaxed whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "bg-emerald-600 text-white rounded-br-xs"
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
                            <div className="mt-2 rounded-lg overflow-hidden border border-emerald-200 bg-emerald-50/50 p-1">
                              <img
                                src={msg.imageUrl}
                                alt="AI Yamato Visual Explanation"
                                onClick={() => setModalImageSrc(msg.imageUrl || null)}
                                className="w-full h-auto rounded-md object-contain max-h-48 cursor-pointer hover:opacity-95 transition"
                                title="クリックして画像を拡大"
                              />
                              <p className="text-[10px] text-emerald-800 text-center mt-1 font-medium cursor-pointer" onClick={() => setModalImageSrc(msg.imageUrl || null)}>
                                ✨ ヤマト特製図解・イラスト（クリックして拡大）
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

              {/* 入力フォーム & 図解生成チェックボックス */}
              <form onSubmit={handleSendTutorMessage} className="flex flex-col gap-2 shrink-0">
                <div className="flex items-center gap-2 px-1">
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={requestVisualAid}
                      onChange={(e) => setRequestVisualAid(e.target.checked)}
                      disabled={isTutorLoading}
                      className="rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
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
                    className="flex-grow p-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
                  />
                  <button
                    type="submit"
                    disabled={isTutorLoading || !tutorInput.trim()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    Send
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </aside>

      {/* 画像拡大表示用モーダル（Lightbox） */}
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
            <p className="text-xs text-slate-600 mt-2 font-medium">✨ ヤマト特製図解・イラスト（拡大表示）</p>
          </div>
        </div>
      )}

      {/* Passkey Authentication / Registration Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md rounded-3xl p-6 sm:p-8 border shadow-2xl relative ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}>
            <button 
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-500/10 transition-colors text-slate-400 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-500/30">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-extrabold tracking-tight">
                  {authMode === 'signup' ? 'Create Account with Passkey' : 'Sign In with Passkey'}
                </h3>
                <p className="text-xs text-slate-500">
                  {authMode === 'signup' 
                    ? 'Register securely using biometrics, Touch ID, Face ID, or a security key.' 
                    : 'Authenticate instantly with your registered biometric passkey.'}
                </p>
              </div>

              {authError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium">
                  {authError}
                </div>
              )}

              <form onSubmit={handlePasskeyAuth} className="space-y-4">
                {authMode === 'signup' && (
                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-semibold text-slate-500">Email Address</label>
                    <input 
                      type="email"
                      required
                      placeholder="your.email@school.vic.edu.au"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 focus:border-blue-500 text-slate-100' : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900'}`}
                    />
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{authLoading ? 'Verifying Passkey...' : authMode === 'signup' ? 'Register Passkey' : 'Sign In'}</span>
                </button>
              </form>

              <div className="text-center text-xs">
                {authMode === 'signup' ? (
                  <p className="text-slate-500">
                    Already have a passkey?{' '}
                    <button onClick={() => setAuthMode('signin')} className="text-blue-600 font-semibold hover:underline bg-transparent border-none p-0 cursor-pointer">
                      Sign In
                    </button>
                  </p>
                ) : (
                  <p className="text-slate-500">
                    New to AI Yamato?{' '}
                    <button onClick={() => setAuthMode('signup')} className="text-blue-600 font-semibold hover:underline bg-transparent border-none p-0 cursor-pointer">
                      Create Account
                    </button>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className={`border-t py-8 text-center text-xs text-slate-500 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <p>© 2026 JP Tutor AI Yamato. All rights reserved.</p>
      </footer>
    </div>
  );
}