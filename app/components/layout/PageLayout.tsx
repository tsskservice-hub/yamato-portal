/**
 * @file PageLayout.tsx
 * @description ポータル共通レイアウト（リアルタイムクレジット同期・英語無料登録ガード・認証モーダル・共通パンくずモジュール連携統合版 / isTeacher対応・常時ライトモード）
 */
import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { useRouteLoaderData, useLocation } from "@remix-run/react";
import { 
  KeyRound, 
  ShieldCheck, 
  X, 
  ArrowRight, 
  Fingerprint, 
  Mail, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Lock, 
  Sparkles,
  UserPlus,
  GraduationCap
} from "lucide-react";
import { GOOGLE_SIGNUP_URL, SCHOOL_PURPOSE_TEXT, TEACHER_LIMITS, emailDomain, isFreeEmailDomain } from "../../lib/teacher-config";
import { SchoolPicker, type SchoolValue } from "../SchoolPicker";
import Header from "./header";
import Footer from "./Footer";
import { Breadcrumbs } from "./Breadcrumbs"; // 💡 切り出したパンくずモジュールのインポート
import { supabase } from "../../lib/supabaseClient";
import { signUpAndRegisterPasskey, signInWithPasskey } from "../../lib/passkey";

/**
 * 💡 リアルタイムクレジット更新通知ヘルパー関数
 */
export const notifyCreditsUpdated = (newCredits?: number) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("yamato:credits-updated", { detail: newCredits })
    );
  }
};

export type PageLayoutRef = {
  openAuthModal: (mode: 'signin' | 'signup' | string) => void;
};

type PageLayoutProps = {
  children: React.ReactNode;
  user?: any;
  credits?: number;
  nickname?: string;
  learningPace?: "steady" | "normal" | "accelerated"; 
  breadcrumbTitle?: string;
  onSignOut?: () => void | Promise<void>;
  requireAuth?: boolean;
  error?: boolean;
  errorMessage?: string;
};

const PageLayout = forwardRef<PageLayoutRef, PageLayoutProps>(({  
  children,  
  user: propUser,  
  credits: propCredits,  
  nickname: propNickname,
  learningPace: propLearningPace, 
  breadcrumbTitle,
  onSignOut: propOnSignOut,
  requireAuth,
  error = false,
  errorMessage
}, ref) => {
  const rootData = useRouteLoaderData("root") as {  
    user?: any;  
    credits?: number;  
    nickname?: string;  
    learningPace?: "steady" | "normal" | "accelerated"; 
    isTeacher?: boolean; // 💡 ルートデータからの教師フラグ
    isTeacherPending?: boolean; // 💡 先生の申請が審査中
  } | undefined;

  const location = useLocation();

  const [user, setUser] = useState<any>(propUser !== undefined ? propUser : (rootData?.user ?? null));
  const [credits, setCredits] = useState<number>(propCredits !== undefined ? propCredits : (rootData?.credits ?? 10));
  const [nickname, setNickname] = useState<string>(propNickname !== undefined ? propNickname : (rootData?.nickname ?? ""));
  const isTeacher = rootData?.isTeacher ?? false; // 💡 教師判定フラグの取得
  const isTeacherPending = rootData?.isTeacherPending ?? false;

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

  // 💡 リアルタイムクレジット同期イベントの監視設定
  useEffect(() => {
    const handleCreditsUpdated = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (typeof customEvent.detail === "number") {
        setCredits(customEvent.detail);
      } else if (user?.id) {
        fetchUserData(user.id);
      } else {
        supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
          if (session?.user) {
            fetchUserData(session.user.id);
          }
        });
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("yamato:credits-updated", handleCreditsUpdated);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("yamato:credits-updated", handleCreditsUpdated);
      }
    };
  }, [user]);

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

  // 認証モーダル・パスキーのステート管理
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [isGuideStep, setIsGuideStep] = useState(false);
  const [isToggleOpen, setIsToggleOpen] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  // 💡 先生用アカウント登録（「Are you a Japanese teacher?」から入る）
  const [isTeacherInfoOpen, setIsTeacherInfoOpen] = useState(false);
  const [isTeacherSignup, setIsTeacherSignup] = useState(false);
  const [teacherSchool, setTeacherSchool] = useState<SchoolValue>({ state: '', schoolName: '', schoolRefId: null });

  const handleOpenAuthModal = (mode: 'signin' | 'signup' | string) => {
    setAuthMode(mode === 'signup' ? 'signup' : 'signin');
    setAuthError(null);
    setEmailInput('');
    setIsToggleOpen(false);
    setIsTeacherInfoOpen(false);
    setIsTeacherSignup(false);
    setTeacherSchool({ state: '', schoolName: '', schoolRefId: null });
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
        const asTeacher = isTeacherSignup;
        // 先生は学校のメールで登録する（あとで同じ学校のメールの Google アカウントで確認するため）
        if (asTeacher && isFreeEmailDomain(emailDomain(emailInput))) {
          throw new Error('Please sign up with your school email address, not a personal email.');
        }
        await signUpAndRegisterPasskey(emailInput, {
          asTeacher,
          state: teacherSchool.state,
          schoolName: teacherSchool.schoolName,
          schoolRefId: teacherSchool.schoolRefId,
        });
        alert(asTeacher
          ? 'Thanks! Your teacher account request has been sent. We check every teacher account before classes can be created. You can use AI Yamato as usual in the meantime.'
          : 'Passkey registration successful! Welcome to AI Yamato.');
        if (asTeacher) {
          // 先生用アカウントは教師ダッシュボードへ（承認されるまでは審査中の案内が出る）
          window.location.href = '/teacher-dashboard';
          return;
        }
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

  const publicPaths = ["/", "/privacy", "/terms", "/disclaimer", "/prices", "/faq", "/contact"];
  const isPublicPage = publicPaths.includes(location.pathname);

  const shouldRequireAuth = requireAuth !== undefined 
    ? requireAuth 
    : (!isPublicPage && !user);

  return (
    <div className="flex flex-col min-h-screen bg-white text-slate-900">
      {/* ヘッダー（isTeacher を正しく渡すように修正） */}
      <Header 
        user={user} 
        credits={credits} 
        nickname={resolvedNickname} 
        isTeacher={isTeacher}
        isTeacherPending={isTeacherPending}
        onOpenAuth={handleOpenAuthModal}
        onSignOut={handleSignOut} 
      />

      {/* 🍞 共通パンくずリストモジュール */}
      <Breadcrumbs pathname={location.pathname} breadcrumbTitle={breadcrumbTitle} />

      {/* メインコンテンツエリア */}
      <main className="flex-grow relative">
        {shouldRequireAuth ? (
          <div className="min-h-[70vh] flex items-center justify-center p-4 sm:p-8 bg-slate-50/50">
            <div className="w-full max-w-lg rounded-3xl p-8 sm:p-10 border shadow-2xl text-center space-y-6 bg-white border-slate-200">
              <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-blue-500/30 animate-bounce">
                <Lock className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-300">
                  Free Member Exclusive
                </span>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-800">
                  Unlock Full Access for Free 🌸
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                  This practice tool and content are exclusive to free registered members. Create your free account in seconds with Passkey (Biometrics) to get started!
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Features included with your free account:</span>
                </div>
                <ul className="space-y-1.5 text-slate-600 pl-6 list-disc">
                  <li>Interactive VCE Japanese Oral Exam Practice (Section 1 & 2) with AI Yamato</li>
                  <li>VCE Japanese Writing Practice with Genkoyoshi Editor & instant AI feedback</li>
                  <li>Kanji & Grammar Checker with digital answer analysis</li>
                  <li>Daily login bonus credits for continuous learning</li>
                </ul>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleOpenAuthModal('signup')}
                  className="w-full py-4 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-xl shadow-blue-600/30 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <UserPlus className="w-5 h-5" />
                  <span>Sign Up Free Now (10s Passkey)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <p className="text-xs text-slate-500">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => handleOpenAuthModal('signin')}
                    className="text-blue-600 font-bold hover:underline bg-transparent border-none p-0 cursor-pointer"
                  >
                    Sign In
                  </button>
                </p>
              </div>
            </div>
          </div>
        ) : (
          children
        )}
      </main>
       
      <Footer onOpenAuth={handleOpenAuthModal} />

      {/* 認証・登録モーダル */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl p-6 sm:p-8 border shadow-2xl relative bg-white border-slate-200 text-slate-900">
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
                  <p className="text-xs text-slate-500">
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

                {/* 💡 先生向けフック：クリックすると先生用アカウントの案内が開く */}
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70">
                  <button
                    type="button"
                    onClick={() => setIsTeacherInfoOpen(!isTeacherInfoOpen)}
                    aria-expanded={isTeacherInfoOpen}
                    className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left bg-transparent border-none cursor-pointer"
                  >
                    <span className="flex items-center gap-2 text-xs font-bold text-indigo-700">
                      <GraduationCap className="w-4 h-4" /> Are you a Japanese teacher?
                    </span>
                    {isTeacherInfoOpen ? <ChevronUp className="w-4 h-4 text-indigo-600" /> : <ChevronDown className="w-4 h-4 text-indigo-600" />}
                  </button>

                  {isTeacherInfoOpen && (
                    <div className="px-4 pb-4 space-y-3 text-left animate-fadeIn">
                      <p className="text-[11px] text-slate-700 leading-relaxed">
                        We have a <strong>free teacher account</strong> (limited features) with its own Teacher Dashboard:
                      </p>
                      <ul className="text-[11px] text-slate-700 space-y-1 list-disc pl-4">
                        <li>Set lesson tasks on AI Yamato as homework for your class</li>
                        <li>Track each student&apos;s progress on every task</li>
                        <li>See what percentage of homework each student completed over any period</li>
                        <li>View your students&apos; handwritten writing submissions</li>
                      </ul>
                      <p className="text-[10px] text-slate-500">
                        Free plan: {TEACHER_LIMITS.maxClasses} class with up to {TEACHER_LIMITS.maxStudentsPerClass} students. Need more classes? Ask us about a school plan.
                      </p>
                      <div className="rounded-lg bg-white border border-indigo-200 p-3 space-y-1.5">
                        <p className="text-[11px] font-bold text-indigo-800">Before you sign up</p>
                        <ol className="text-[11px] text-slate-700 space-y-1 list-decimal pl-4">
                          <li>Sign up with your <strong>school email address</strong> (not a personal email).</li>
                          <li>
                            You will need a <strong>Google account with that school email</strong>. If your school uses Google, you already have one.
                            If not, first create a free one on{' '}
                            <a href={GOOGLE_SIGNUP_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-700 underline">
                              Google&apos;s sign-up page
                            </a>
                            : choose <strong>&quot;Use your existing email&quot;</strong> and enter your school email.
                          </li>
                          <li>After signing up, verify that Google account on your Teacher Dashboard. We then review your teacher account.</li>
                        </ol>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        To protect students, every teacher account is checked before you can create a class. Students join with an account from
                        your school or a personal invite code you hand out, and you approve each one. Teacher accounts do not include extra AI credits.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setIsTeacherSignup(true);
                          setIsGuideStep(false);
                        }}
                        className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>Create a Free Teacher Account</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsToggleOpen(!isToggleOpen)}
                    className="w-full flex items-center justify-between text-xs font-bold text-blue-600 hover:underline bg-transparent border-none p-0 cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> What is a Passkey & Why is it secure?
                    </span>
                    {isToggleOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {isToggleOpen && (
                    <div className="mt-3 space-y-4 text-left animate-fadeIn">
                      <div className="space-y-2.5">
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start space-x-2.5">
                          <div className="w-5 h-5 rounded-lg bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</div>
                          <div className="text-[11px] space-y-0.5">
                            <p className="font-bold text-slate-800 flex items-center gap-1">
                              <Mail className="w-3 h-3" /> Enter Email Address
                            </p>
                            <p className="text-slate-500">Register with your email.</p>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start space-x-2.5">
                          <div className="w-5 h-5 rounded-lg bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</div>
                          <div className="text-[11px] space-y-0.5">
                            <p className="font-bold text-slate-800 flex items-center gap-1">
                              <Fingerprint className="w-3 h-3" /> Biometric Authentication
                            </p>
                            <p className="text-slate-500">Use Touch ID, Face ID, or Windows Hello.</p>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start space-x-2.5">
                          <div className="w-5 h-5 rounded-lg bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</div>
                          <div className="text-[11px] space-y-0.5">
                            <p className="font-bold text-slate-800 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> One-Touch Login
                            </p>
                            <p className="text-slate-500">Log in instantly without passwords next time!</p>
                          </div>
                        </div>
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
                    {authMode === 'signup'
                      ? (isTeacherSignup ? 'Create a Free Teacher Account' : 'Create Account with Passkey')
                      : 'Sign In with Passkey'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {authMode === 'signup'
                      ? 'Register securely using biometrics, Touch ID, Face ID, or a security key.'
                      : 'Authenticate instantly with your registered biometric passkey.'}
                  </p>
                  {authMode === 'signup' && isTeacherSignup && (
                    <p className="text-[11px] text-indigo-700">
                      Not a teacher?{' '}
                      <button type="button" onClick={() => setIsTeacherSignup(false)} className="font-semibold underline bg-transparent border-none p-0 cursor-pointer text-indigo-700">
                        Create a student account instead
                      </button>
                    </p>
                  )}
                </div>

                {authError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium">
                    {authError}
                  </div>
                )}

                <form onSubmit={handlePasskeyAuth} className="space-y-4">
                  {authMode === 'signup' && (
                    <div className="space-y-1.5 text-left">
                      <label className="text-xs font-semibold text-slate-500">{isTeacherSignup ? 'School Email Address' : 'Email Address'}</label>
                      <input
                        type="email"
                        required
                        placeholder={isTeacherSignup ? 'your.name@yourschool.edu.au' : 'your.email@school.vic.edu.au'}
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900"
                      />
                      {isTeacherSignup && (
                        <p className="text-[10px] text-slate-500">
                          Use your school email. You&apos;ll verify a Google account with this email on your Teacher Dashboard. No Google account
                          for it yet?{' '}
                          <a href={GOOGLE_SIGNUP_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-700 underline">
                            Create one first
                          </a>{' '}
                          (choose &quot;Use your existing email&quot;).
                        </p>
                      )}
                    </div>
                  )}

                  {authMode === 'signup' && isTeacherSignup && (
                    <div className="space-y-1.5 text-left">
                      <SchoolPicker
                        value={teacherSchool}
                        onChange={setTeacherSchool}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                        labelClassName="block text-xs font-semibold text-slate-500 mb-1.5"
                        inputClassName="w-full px-3 py-2.5 rounded-xl border text-sm outline-none bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900"
                        stateLabel="State"
                        schoolLabel="School"
                      />
                      <p className="text-[10px] text-slate-500">
                        Your school helps us confirm your teacher account. {SCHOOL_PURPOSE_TEXT}
                      </p>
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