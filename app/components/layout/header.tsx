/**
 * @file header.tsx
 * @description ポータル共通ヘッダー（教師ダッシュボードボタンをニックネームの左隣に追加版）
 */
import React from 'react';
import { Link } from '@remix-run/react';
import { Coins, KeyRound, ShieldCheck, LogOut, User, HelpCircle, GraduationCap } from 'lucide-react';

type HeaderProps = {
  title?: string;
  user?: any;
  credits?: number;
  nickname?: string;
  isTeacher?: boolean; // 💡 教師フラグを受け取るプロパティ
  isTeacherPending?: boolean; // 💡 先生の申請が審査中（控えめな「in review」ボタンを出す）
  onOpenAuth?: (mode: 'signin' | 'signup') => void;
  onSignOut?: () => void;
};

export default function Header({ 
  title = "AI Yamato Japanese Hub", 
  user, 
  credits = 10, 
  nickname = "",
  isTeacher = false, // 💡 デフォルトは false
  isTeacherPending = false,
  onOpenAuth,
  onSignOut 
}: HeaderProps) {
  const trimmedNickname = nickname ? nickname.trim() : "";
  const displayNickname = trimmedNickname !== "" ? trimmedNickname : "Set Nickname";

  return (
    <header className="bg-white/80 border-slate-200 text-slate-900 backdrop-blur-md border-b sticky top-0 z-50 shadow-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* 左側グループ：ロゴ ＆ クイックジャンプボタン */}
        <div className="flex items-center space-x-6">
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

          {/* どのページからでも LP（/）の該当セクションへ飛ぶ。スクロールは _index.tsx がハッシュを見て行う */}
          <div className="hidden md:flex items-center space-x-1.5">
              {/* ジャンプ先（左から VCE, Junior, References, Games, General。色は全て別色） */}
              {[
                { href: '/#section-vce', label: 'VCE', color: 'bg-red-500/10 text-red-600 hover:bg-red-500/20' },
                { href: '/#section-junior', label: 'Junior', color: 'bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20' },
                // 幅を節約するため References / Games / General は絵文字のみ（名前は title と aria-label で補う）
                { href: '/#section-references', label: '📚', title: 'References', color: 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20' },
                { href: '/#section-games', label: '🎮', title: 'Games', color: 'bg-purple-500/10 text-purple-600 hover:bg-purple-500/20' },
                { href: '/#section-general', label: '🌍', title: 'General', color: 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20' },
              ].map(({ href, label, title, color }) => (
                <Link
                  key={href}
                  to={href}
                  title={title}
                  aria-label={title}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center ${color}`}
                >
                  {label}
                </Link>
              ))}
          </div>
        </div>

        {/* 右側グループ：ユーザー情報、プラン、FAQ、My Account、認証ボタン */}
        <div className="flex items-center space-x-3">
          {/* 💡 教師かつログイン中の場合のみ、ニックネームの左隣にダッシュボードボタンを表示 */}
          {user && isTeacher && (
            <Link 
              to="/teacher-dashboard"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer shadow-xs bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
              title="Teacher Control Panel"
            >
              <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
              <span>Teacher Panel</span>
            </Link>
          )}
          {/* 💡 審査中の先生：学校アカウントの確認に戻れるよう、控えめな見た目で出す（ページ側は審査中の案内だけを表示する） */}
          {user && !isTeacher && isTeacherPending && (
            <Link
              to="/teacher-dashboard"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-dashed transition-all cursor-pointer bg-white border-slate-300 text-slate-500 hover:bg-slate-50"
              title="Your teacher account is being reviewed"
            >
              <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
              <span>Teacher Panel (in review)</span>
            </Link>
          )}

          {/* 1. Nickname (ログイン時のみ表示) */}
          {user && (
            <Link 
              to="/my-account"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer shadow-xs bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
              title="Click to change your nickname in Account Settings"
            >
              <User className="w-3.5 h-3.5 text-blue-500" />
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
            className="text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all hidden sm:flex items-center space-x-1 border-slate-200 hover:bg-slate-100 text-slate-700"
          >
            <span>Pricing</span>
          </Link>

          {/* 4. FAQ */}
          <Link 
            to="/faq" 
            className="text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all hidden sm:flex items-center space-x-1 border-slate-200 hover:bg-slate-100 text-slate-700"
          >
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>FAQ</span>
          </Link>

          {/* 5. My Account */}
          <Link 
            to="/my-account" 
            className="text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all flex items-center space-x-1 border-slate-200 hover:bg-slate-100 text-slate-700"
          >
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>My Account</span>
          </Link>

          {/* 6. Sign In / Sign Out */}
          {user ? (
            <button 
              onClick={onSignOut}
              className="text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all flex items-center space-x-1 cursor-pointer border-slate-200 hover:bg-slate-100 text-slate-700"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          ) : (
            <>
              <button 
                onClick={() => onOpenAuth?.('signin')}
                className="text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all hidden sm:flex items-center space-x-1 cursor-pointer border-slate-200 hover:bg-slate-100 text-slate-700"
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