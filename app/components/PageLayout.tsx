/**
 * @file PageLayout.tsx
 * @description ポータル共通レイアウト（ルートデータ自動同期・学習ペースおよびユーザーIDのYamatoChat連携対応版）
 */
import React, { useState } from "react";
import { useRouteLoaderData } from "@remix-run/react";
import { KeyRound, ShieldCheck, X } from "lucide-react";
import Header from "./header";
import Footer from "./Footer";
import YamatoChat from "./YamatoChat"; // ★YamatoChatをインポート
import { signUpAndRegisterPasskey, signInWithPasskey } from "../lib/passkey";

type PageLayoutProps = {
  children: React.ReactNode;
  user?: any;
  credits?: number;
  nickname?: string;
  learningPace?: "steady" | "normal" | "accelerated"; // ★追加: 学習ペースの受け取り用prop
  onOpenAuth?: (mode: 'signin' | 'signup') => void;
  onSignOut?: () => void;
  isDarkMode?: boolean;
};

export default function PageLayout({  
  children,  
  user: propUser,  
  credits: propCredits,  
  nickname: propNickname,
  learningPace: propLearningPace, // ★追加
  onOpenAuth,  
  onSignOut,
  isDarkMode = false
}: PageLayoutProps) {
  // 💡 root.tsx の loader データをルートID "root" をを通じて自動取得
  const rootData = useRouteLoaderData("root") as {  
    user?: any;  
    credits?: number;  
    nickname?: string;  
    plan?: string;
    learningPace?: "steady" | "normal" | "accelerated"; // ★追加
  } | undefined;

  // 💡 優先順位: 
  // 1. プロパティで明示的に渡された値
  // 2. root.tsx のローダーから自動取得できた値
  // 3. デフォルトのフォールバック値
  const user = propUser !== undefined ? propUser : rootData?.user;
  const credits = propCredits !== undefined ? propCredits : (rootData?.credits ?? 10);
  
  // 💡 ニックネームの解決
  const rawNickname = (propNickname !== undefined && propNickname !== null) ? propNickname : rootData?.nickname;
  const nickname = rawNickname && rawNickname.trim() !== "" ? rawNickname : "";

  // 💡 学習ペースの解決（prop > rootData > デフォルト"normal"）
  const rawLearningPace = propLearningPace !== undefined ? propLearningPace : rootData?.learningPace;
  const learningPace: "steady" | "normal" | "accelerated" = 
    (rawLearningPace === "steady" || rawLearningPace === "normal" || rawLearningPace === "accelerated")
      ? rawLearningPace
      : "normal";

  // 💡 認証モーダルおよびパスキー認証のロジックを共通レイアウトへ集約
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [emailInput, setEmailInput] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleOpenAuthModal = (mode: 'signin' | 'signup') => {
    if (onOpenAuth) {
      onOpenAuth(mode);
    }
    setAuthMode(mode);
    setAuthError(null);
    setEmailInput('');
    setIsAuthModalOpen(true);
  };

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

      if (isSignup) {
        window.location.href = "/my-account";
      } else {
        window.location.href = window.location.href;
      }

    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || 'Passkey authentication failed. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header 
        user={user} 
        credits={credits} 
        nickname={nickname} 
        onOpenAuth={handleOpenAuthModal} 
        onSignOut={onSignOut} 
      />
      <main className="flex-grow">
        {children}
      </main>
      
      <Footer onOpenAuth={handleOpenAuthModal} />

      {/* ★ ここで PageLayout 全体に常駐する YamatoChat に学習ペースとユーザーIDを自動反映して渡す */}
      <YamatoChat 
        initialLearningPace={learningPace} 
        userId={user?.id} 
      />

      {/* 共通のパスキー認証・登録モーダル */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md rounded-3xl p-6 sm:p-8 border shadow-2xl relative ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}>
            <button 
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-500/15 transition-colors text-slate-400 cursor-pointer"
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
    </div>
  );
}