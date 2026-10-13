import React from 'react';
import { Link } from '@remix-run/react';
import { Coins, KeyRound, ShieldCheck, LogOut } from 'lucide-react';

type HeaderProps = {
  title?: string;
  user?: any;
  credits?: number;
  onOpenAuth?: (mode: 'signin' | 'signup') => void;
  onSignOut?: () => void;
};

export default function Header({ 
  title = "AI Yamato Japanese Hub", 
  user, 
  credits = 10, 
  onOpenAuth, 
  onSignOut 
}: HeaderProps) {
  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* ロゴ・画像リンク（クリックでホームへ） */}
        <Link to="/" className="flex items-center space-x-2 group">
          <div className="w-9 h-9 rounded-xl overflow-hidden shadow-md flex items-center justify-center bg-red-600">
            <img 
              src="/jptutoraiyamato.png" 
              alt="AI Yamato Logo" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
            />
          </div>
          <span className="font-extrabold tracking-tight text-lg bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            JP Tutor AI <span className="text-xs uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold ml-1">Yamato</span>
          </span>
        </Link>

        <div className="flex items-center space-x-3">
          {user ? (
            <>
              {/* クレジット残高表示 */}
              <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border bg-amber-50 border-amber-200 text-amber-700">
                <Coins className="w-3.5 h-3.5" />
                <span>Credits: {credits}</span>
              </div>
              
              {/* サインアウトボタン */}
              <button 
                onClick={onSignOut}
                className="text-xs font-semibold px-3.5 py-1.5 rounded-full border border-slate-200 hover:bg-slate-100 text-slate-700 transition-all flex items-center space-x-1 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <>
              {/* パスキー認証ログインボタン */}
              <button 
                onClick={() => onOpenAuth?.('signin')}
                className="text-xs font-semibold px-3.5 py-1.5 rounded-full border border-slate-200 hover:bg-slate-100 text-slate-700 transition-all flex items-center space-x-1 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-blue-500" />
                <span>Passkey Sign In</span>
              </button>

              {/* パスキー新規登録ボタン */}
              <button 
                onClick={() => onOpenAuth?.('signup')}
                className="text-xs font-semibold px-4 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all flex items-center space-x-1 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Register Passkey</span>
              </button>
            </>
          )}

          {/* 料金ページへのリンク */}
          <Link to="/prices" className="text-xs font-semibold px-3.5 py-1.5 rounded-full border border-slate-200 hover:bg-slate-100 text-slate-700 transition-all">
            Pricing & Plans
          </Link>
        </div>
      </div>
    </header>
  );
}