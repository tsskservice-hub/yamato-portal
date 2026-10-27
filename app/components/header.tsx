/**
 * @file header.tsx
 * @description ポータル共通ヘッダー（ロゴの右隣にクイックジャンプボタンを追加版・Yamatoの枠を削除・ホーム画面のみ表示）
 */
import React from 'react';
import { Link, useLocation } from '@remix-run/react';
import { Coins, KeyRound, ShieldCheck, LogOut, User, HelpCircle } from 'lucide-react';

type HeaderProps = {
  title?: string;
  user?: any;
  credits?: number;
  nickname?: string; // 💡 ユーザーのニックネームを受け取るプロパティ
  onOpenAuth?: (mode: 'signin' | 'signup') => void;
  onSignOut?: () => void;
};

export default function Header({ 
  title = "AI Yamato Japanese Hub", 
  user, 
  credits = 10, 
  nickname = "",
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
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 shadow-xs">
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
                className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 text-xs font-bold transition-colors cursor-pointer inline-flex items-center space-x-1"
              >
                <span>🌐</span>
                <span>General</span>
              </a>
              <a 
                href="/#section-vce" 
                className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500/20 text-xs font-bold transition-colors cursor-pointer inline-flex items-center space-x-1"
              >
                <span>🇦🇺</span>
                <span>VCE</span>
              </a>
            </div>
          )}
        </div>

        {/* 右側グループ：ユーザー情報、プラン、FAQ、My Account、認証ボタン */}
        <div className="flex items-center space-x-3">
          {/* 1. Nickname (ログイン時のみ表示) */}
          {user && (
            <Link 
              to="/my-account"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 transition-all cursor-pointer shadow-xs"
              title="Click to change your nickname in Account Settings"
            >
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span>{displayNickname}</span>
            </Link>
          )}

          {/* 2. Credit (ログイン時のみ表示) */}
          {user && (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border bg-amber-50 border-amber-200 text-amber-700">
              <Coins className="w-3.5 h-3.5" />
              <span>Credits: {credits}</span>
            </div>
          )}

          {/* 3. Pricing */}
          <Link 
            to="/prices" 
            className="text-xs font-semibold px-3.5 py-1.5 rounded-full border border-slate-200 hover:bg-slate-100 text-slate-700 transition-all hidden sm:flex items-center space-x-1"
          >
            <span>Pricing</span>
          </Link>

          {/* 4. FAQ */}
          <Link 
            to="/faq" 
            className="text-xs font-semibold px-3.5 py-1.5 rounded-full border border-slate-200 hover:bg-slate-100 text-slate-700 transition-all hidden sm:flex items-center space-x-1"
          >
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
            <span>FAQ</span>
          </Link>

          {/* 5. My Account */}
          <Link 
            to="/my-account" 
            className="text-xs font-semibold px-3.5 py-1.5 rounded-full border border-slate-200 hover:bg-slate-100 text-slate-700 transition-all flex items-center space-x-1"
          >
            <User className="w-3.5 h-3.5 text-slate-500" />
            <span>My Account</span>
          </Link>

          {/* 6. Sign In / Sign Out */}
          {user ? (
            <button 
              onClick={onSignOut}
              className="text-xs font-semibold px-3.5 py-1.5 rounded-full border border-slate-200 hover:bg-slate-100 text-slate-700 transition-all flex items-center space-x-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          ) : (
            <>
              <button 
                onClick={() => onOpenAuth?.('signin')}
                className="text-xs font-semibold px-3.5 py-1.5 rounded-full border border-slate-200 hover:bg-slate-100 text-slate-700 transition-all hidden sm:flex items-center space-x-1 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-blue-500" />
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
        </div>
      </div>
    </header>
  );
}