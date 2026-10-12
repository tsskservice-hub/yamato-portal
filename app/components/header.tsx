import React from 'react';
import { Link } from '@remix-run/react';
import { Coins, User, Key, UserPlus } from 'lucide-react';

type HeaderProps = {
  title?: string;
};

export default function Header({ title = "AI Yamato Japanese Hub" }: HeaderProps) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* ロゴ・画像リンク（クリックでホームへ） */}
        <Link to="/" className="flex items-center space-x-3 group">
          <img 
            src="/jptutoraiyamato.png" 
            alt="AI Yamato Logo" 
            className="w-10 h-10 object-contain rounded-xl shadow-sm group-hover:scale-105 transition-transform" 
          />
          <div>
            <span className="font-bold text-lg text-slate-900 tracking-tight">{title}</span>
          </div>
        </Link>

        <div className="flex items-center space-x-4">
          {/* クレジット残高表示 */}
          <div className="hidden sm:flex items-center space-x-1.5 bg-slate-100 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-700">
            <Coins className="w-4 h-4 text-amber-500" />
            <span>Credits: <strong className="text-slate-900">120 pts</strong></span>
          </div>

          {/* パスキー認証ログイン・新規登録ボタン */}
          <div className="flex items-center space-x-2">
            <Link
              to="/login"
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <Key className="w-4 h-4 text-slate-600" />
              <span>Passkey Login</span>
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
            >
              <UserPlus className="w-4 h-4 text-indigo-100" />
              <span>Sign Up</span>
            </Link>
          </div>

          {/* ユーザープロフィール */}
          <div className="flex items-center space-x-2 border-l border-slate-200 pl-4">
            <div className="w-9 h-9 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-semibold shadow-inner">
              <User className="w-5 h-5" />
            </div>
            <div className="hidden md:block text-left text-xs">
              <p className="font-semibold text-slate-900">Tomonari Sasaki</p>
              <p className="text-slate-500">Teacher / Administrator</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}