/**
 * @file PageLayout.tsx
 * @description ポータル共通レイアウト（認証ロジック・モーダル完全内包・ref対応版・共通パンくずリスト自動生成・カスタマイズ可能スクロールトップボタン内蔵版）
 */
import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { useRouteLoaderData, useLocation, Link } from "@remix-run/react";
import { KeyRound, ShieldCheck, X, ArrowRight, Fingerprint, Mail, CheckCircle2, ChevronDown, ChevronUp, Lock, Sparkles, Home, ChevronRight } from "lucide-react";
import Header from "./header";
import Footer from "./Footer";
import { supabase } from "../lib/supabaseClient";
import { signUpAndRegisterPasskey, signInWithPasskey } from "../lib/passkey";

export type PageLayoutRef = {
  openAuthModal: (mode: 'signin' | 'signup' | string) => void;
};

type PageLayoutProps = {
  children: React.ReactNode;
  user?: any;
  credits?: number;
  nickname?: string;
  learningPace?: "steady" | "normal" | "accelerated"; 
  isDarkMode?: boolean;
  breadcrumbTitle?: string; // 💡 個別ページでカスタム名称を指定したい場合のオプション
  scrollTopClassName?: string; // 💡 個別ページからスクロールトップボタンのスタイル/色を上書きするためのオプション
  onSignOut?: () => void | Promise<void>; // 💡 各ルートファイルからの渡されるサインアウト処理に対応
};

const PageLayout = forwardRef<PageLayoutRef, PageLayoutProps>(({  
  children,  
  user: propUser,  
  credits: propCredits,  
  nickname: propNickname,
  learningPace: propLearningPace, 
  isDarkMode = false,
  breadcrumbTitle,
  scrollTopClassName = "bg-white border-2 border-blue-500 text-blue-500 hover:bg-blue-50", // 💡 デフォルト：枠青線、三角青、背景白
  onSignOut: propOnSignOut
}, ref) => {
  const rootData = useRouteLoaderData("root") as {  
    user?: any;  
    credits?: number;  
    nickname?: string;  
    learningPace?: "steady" | "normal" | "accelerated"; 
  } | undefined;

  const location = useLocation();

  // 💡 Scroll to top states & listener
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

  // 💡 パス名から自動でパンくずの項目を生成するロジック
  const generateBreadcrumbs = () => {
    const paths = location.pathname.split("/").filter(Boolean);
    const crumbs: { label: string; path: string }[] = [];
    
    let currentPath = "";
    paths.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      let label = segment.replace(/-/g, " ");
      label = label.charAt(0).toUpperCase() + label.slice(1);
      
      if (segment === "eoy-writing") label = "EOY Writing Practice";
      if (segment === "kanji-grammar-checker") label = "Kanji & Grammar Checker";
      if (segment === "dashboard") label = "Dashboard";

      if (index === paths.length - 1 && breadcrumbTitle) {
        label = breadcrumbTitle;
      }

      crumbs.push({ label, path: currentPath });
    });

    return crumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  const [user, setUser] = useState<any>(propUser !== undefined ? propUser : (rootData?.user ?? null));
  const [credits, setCredits] = useState<number>(propCredits !== undefined ? propCredits : (rootData?.credits ?? 10));
  const [nickname, setNickname] = useState<string>(propNickname !== undefined ? propNickname : (rootData?.nickname ?? ""));

  const rawLearningPace = propLearningPace !== undefined ? propLearningPace : rootData?.learningPace;
  const learningPace: "steady" | "normal" | "accelerated" = 
    (rawLearningPace === "steady" || rawLearningPace === "normal" || rawLearningPace === "accelerated")
      ? rawLearningPace
      : "normal";

  const fetchUserData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('credits, nickname')
        .eq('id', userId)
        .single();
      
      if (data && !error) {
        setCredits((data as any).credits ?? 10);
        if ((data as any).nickname) {
          setNickname((data as any).nickname);
        }
      }
    } catch (err) {
      console.error('Failed to fetch user data:', err);
    }
  };

  useEffect(() => {
    if (propUser !== undefined) setUser(propUser);
    if (propCredits !== undefined) setCredits(propCredits);
    if (propNickname !== undefined) setNickname(propNickname);
  }, [propUser, propCredits, propNickname]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
      if (propUser === undefined) {
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchUserData(session.user.id);
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    if (propOnSignOut) {
      await propOnSignOut();
    } else {
      await supabase.auth.signOut();
    }
    setUser(null);
    setNickname("");
  };

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [isGuideStep, setIsGuideStep] = useState(false);
  const [isToggleOpen, setIsToggleOpen] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleOpenAuthModal = (mode: 'signin' | 'signup' | string) => {
    setAuthMode(mode === 'signup' ? 'signup' : 'signin');
    setAuthError(null);
    setEmailInput('');
    setIsToggleOpen(false);
    if (mode === 'signup') {
      setIsGuideStep(true);
    } else {
      setIsGuideStep(false);
    }
    setIsAuthModalOpen(true);
  };

  useImperativeHandle(ref, () => ({
    openAuthModal: (mode: 'signin' | 'signup' | string) => {
      handleOpenAuthModal(mode);
    }
  }));

  const handlePasskeyAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      const isSignup = authMode === 'signup';
      if (isSignup) {
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
      setIsGuideStep(false);
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || 'Passkey authentication failed. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const resolvedNickname = nickname && nickname.trim() !== "" ? nickname : "My friend";

  return (
    <div className={`flex flex-col min-h-screen ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-white text-slate-900'}`}>
      <Header 
        user={user} 
        credits={credits} 
        nickname={resolvedNickname} 
        onOpenAuth={handleOpenAuthModal} 
        onSignOut={handleSignOut} 
      />

      {/* 🍞 共通パンくずリスト（トップページ '/' 以外の階層でのみ表示） */}
      {location.pathname !== "/" && (
        <nav aria-label="Breadcrumb" className={`w-full border-b px-4 py-2.5 text-xs sm:text-sm font-medium ${isDarkMode ? 'bg-slate-900/60 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
          <div className="max-w-4xl mx-auto flex items-center space-x-2 overflow-x-auto whitespace-nowrap">
            <Link to="/" className="flex items-center gap-1 hover:text-blue-600 transition-colors">
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </Link>
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <div key={crumb.path} className="flex items-center space-x-2">
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {isLast ? (
                    <span className={`font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                      {crumb.label}
                    </span>
                  ) : (
                    <Link to={crumb.path} className="hover:text-blue-600 transition-colors">
                      {crumb.label}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </nav>
      )}

      <main className="flex-grow">
        {children}
      </main>
      
      <Footer onOpenAuth={handleOpenAuthModal} />

      {/* ⬆️ ページトップへ戻るボタン（デフォルト：枠青線、三角青、背景白） */}
      {showScrollTop && (
        <div className="fixed bottom-24 right-6 z-40">
          <button
            type="button"
            onClick={scrollToTop}
            className={`w-10 h-10 rounded-full shadow-lg transition-all cursor-pointer text-xs font-bold flex items-center justify-center ${scrollTopClassName}`}
            title="ページトップへ戻る"
          >
            ▲
          </button>
        </div>
      )}

      {/* 共通のパスキー認証・登録モーダル */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md rounded-3xl p-6 sm:p-8 border shadow-2xl relative ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}>
            <button 
              onClick={() => {
                setIsAuthModalOpen(false);
                setIsGuideStep(false);
              }}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-500/15 transition-colors text-slate-400 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {isGuideStep && authMode === 'signup' ? (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-500/30">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-extrabold tracking-tight">
                    Welcome to AI Yamato! 🌸
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Get started instantly with secure, passwordless authentication.
                  </p>
                </div>

                <div>
                  <button 
                    onClick={() => setIsGuideStep(false)}
                    className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <span>Get Started (Register Passkey)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsToggleOpen(!isToggleOpen)}
                    className="w-full flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline bg-transparent border-none p-0 cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> What is a Passkey & Why is it secure?
                    </span>
                    {isToggleOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {isToggleOpen && (
                    <div className="mt-3 space-y-4 text-left animate-fadeIn">
                      <div className="space-y-2.5">
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-start space-x-2.5">
                          <div className="w-5 h-5 rounded-lg bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</div>
                          <div className="text-[11px] space-y-0.5">
                            <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                              <Mail className="w-3 h-3" /> Enter Email Address
                            </p>
                            <p className="text-slate-500 dark:text-slate-400">Register with your email.</p>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-start space-x-2.5">
                          <div className="w-5 h-5 rounded-lg bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</div>
                          <div className="text-[11px] space-y-0.5">
                            <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                              <Fingerprint className="w-3 h-3" /> Biometric Authentication
                            </p>
                            <p className="text-slate-500 dark:text-slate-400">Use Touch ID, Face ID, or Windows Hello.</p>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-start space-x-2.5">
                          <div className="w-5 h-5 rounded-lg bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</div>
                          <div className="text-[11px] space-y-0.5">
                            <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> One-Touch Login
                            </p>
                            <p className="text-slate-500 dark:text-slate-400">Log in instantly without passwords next time!</p>
                          </div>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 text-[11px] text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed">
                        <p className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-blue-600" /> How Passkeys Keep You Safe 🔒
                        </p>
                        <p>
                          ✨ <strong>Device-Based Security:</strong> Passkeys use your own device's screen lock (such as your fingerprint, face scan, or PIN) to log you in.
                        </p>
                        <p>
                          🛡️ <strong>Extremely Secure & Easy:</strong> Because your login key stays safely inside your personal device, it cannot be guessed or stolen by hackers. 🚀
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
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
                      <button type="button" onClick={() => setAuthMode('signin')} className="text-blue-600 font-semibold hover:underline bg-transparent border-none p-0 cursor-pointer">
                        Sign In
                      </button>
                    </p>
                  ) : (
                    <p className="text-slate-500">
                      New to AI Yamato?{' '}
                      <button type="button" onClick={() => { setAuthMode('signup'); setIsGuideStep(true); }} className="text-blue-600 font-semibold hover:underline bg-transparent border-none p-0 cursor-pointer">
                        Create Account
                      </button>
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

PageLayout.displayName = "PageLayout";

export default PageLayout;