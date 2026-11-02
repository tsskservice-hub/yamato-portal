/**
 * @file header.tsx
 * @description ポータル共通ヘッダー（ロゴの右隣にクイックジャンプボタンを追加版・Yamatoの枠を削除・ホーム画面のみ表示・ダークモード切替ボタン追加）
 */
import React from 'react';
import { Link, useLocation } from '@remix-run/react';
import { Coins, KeyRound, ShieldCheck, LogOut, User, HelpCircle, Sun, Moon } from 'lucide-react';

type HeaderProps = {
  title?: string;
  user?: any;
  credits?: number;
  nickname?: string; // 💡 ユーザーのニックネームを受け取るプロパティ
  isDarkMode?: boolean; // 💡 ダークモード状態
  onToggleDarkMode?: () => void; // 💡 ダークモード切り替えハンドラー
  onOpenAuth?: (mode: 'signin' | 'signup') => void;
  onSignOut?: () => void;
};

export default function Header({ 
  title = "AI Yamato Japanese Hub", 
  user, 
  credits = 10, 
  nickname = "",
  isDarkMode = false,
  onToggleDarkMode,
  onOpenAuth, 
  onSignOut 
}: HeaderProps) {
  const location = useLocation();
  const isHome = location.pathname === '/';

  // 💡 ユーザーが入力中の文字（nickname）があればそれを最優先で表示し、
  // 完全な未入力・空白のときのみ "Set Nickname" を表示する
  const trimmedNickname = nickname ? nickname.trim() : "";
  const displayNickname = trimmedNickname !== "" ? trimmedNickname : "Set Nickname";

  return (
    <header className={`${isDarkMode ? 'bg-slate-900/80 border-slate-800 text-slate-100' : 'bg-white/80 border-slate-200 text-slate-900'} backdrop-blur-md border-b sticky top-0 z-50 shadow-xs transition-colors`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* 左側グループ：ロゴ ＆ クイックジャンプボタン */}
        <div className="flex items-center space-x-6">
          {/* ロゴ・画像リンク（クリックでホームへ） */}
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-md flex items-center justify-center bg-red-600">
              <img 
                src="/jptutoraiyamato.png" 
                alt="AI Yamato Logo" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
              />
            </div>
            <span className="font-extrabold tracking-tight text-lg bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent hidden sm:inline">
              JP Tutor AI Yamato
            </span>
          </Link>

          {/* 💡 クイックジャンプボタン（ロゴの右隣：ホーム画面でのみ表示） */}
          {isHome && (
            <div className="hidden md:flex items-center space-x-2">
              <a 
                href="/#section-general" 
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center space-x-1 ${isDarkMode ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20'}`}
              >
                <span>🌐</span>
                <span>General</span>
              </a>
              <a 
                href="/#section-vce" 
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center space-x-1 ${isDarkMode ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-red-500/10 text-red-600 hover:bg-red-500/20'}`}
              >
                <span>🇦🇺</span>
                <span>VCE</span>
              </a>
            </div>
          )}
        </div>

        {/* 右側グループ：ユーザー情報、プラン、FAQ、My Account、認証ボタン ＋ ダークモード切替 */}
        <div className="flex items-center space-x-3">
          {/* 1. Nickname (ログイン時のみ表示) */}
          {user && (
            <Link 
              to="/my-account"
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer shadow-xs ${isDarkMode ? 'bg-blue-950/60 border-blue-800 text-blue-300 hover:bg-blue-900/60' : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'}`}
              title="Click to change your nickname in Account Settings"
            >
              <User className="w-3.5 h-3.5 text-blue-500" />
              <span>{displayNickname}</span>
            </Link>
          )}

          {/* 2. Credit (ログイン時のみ表示) */}
          {user && (
            <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${isDarkMode ? 'bg-amber-950/50 border-amber-800 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
              <Coins className="w-3.5 h-3.5" />
              <span>Credits: {credits}</span>
            </div>
          )}

          {/* 3. Pricing */}
          <Link 
            to="/prices" 
            className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all hidden sm:flex items-center space-x-1 ${isDarkMode ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'}`}
          >
            <span>Pricing</span>
          </Link>

          {/* 4. FAQ */}
          <Link 
            to="/faq" 
            className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all hidden sm:flex items-center space-x-1 ${isDarkMode ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'}`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>FAQ</span>
          </Link>

          {/* 5. My Account */}
          <Link 
            to="/my-account" 
            className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all flex items-center space-x-1 ${isDarkMode ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'}`}
          >
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>My Account</span>
          </Link>

          {/* 6. Sign In / Sign Out */}
          {user ? (
            <button 
              onClick={onSignOut}
              className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all flex items-center space-x-1 cursor-pointer ${isDarkMode ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'}`}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          ) : (
            <>
              <button 
                onClick={() => onOpenAuth?.('signin')}
                className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all hidden sm:flex items-center space-x-1 cursor-pointer ${isDarkMode ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'}`}
              >
                <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                <span>Sign In</span>
              </button>

              <button 
                onClick={() => onOpenAuth?.('signup')}
                className="text-xs font-semibold px-4 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all flex items-center space-x-1 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Free Sign Up</span>
              </button>
            </>
          )}

          {/* 7. ダークモード切替ボタン（一番右側・最端に配置） */}
          {onToggleDarkMode && (
            <button
              onClick={onToggleDarkMode}
              className={`p-2 rounded-full border transition-colors cursor-pointer flex items-center justify-center ${isDarkMode ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-indigo-600 hover:bg-slate-200'}`}
              aria-label="Toggle Dark Mode"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}