/**
 * @file header.tsx
 * @description ポータル共通ヘッダー。広い画面（xl 以上）は全項目を横に並べ、狭い画面はクレジット・新規登録以外を ☰ メニューにまとめる
 */
import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from '@remix-run/react';
import { Coins, KeyRound, ShieldCheck, LogOut, User, HelpCircle, GraduationCap, Menu, X } from 'lucide-react';

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

// どのページからでも LP（/）の該当セクションへ飛ぶ。スクロールは _index.tsx がハッシュを見て行う
// 左から VCE, Junior, References, Games, General。色は全て別色。
// 幅を節約するため References / Games / General は絵文字のみ（名前は title と aria-label で補う）
const SECTION_LINKS = [
  { href: '/#section-vce', label: 'VCE', name: 'VCE', color: 'bg-red-500/10 text-red-600 hover:bg-red-500/20' },
  { href: '/#section-junior', label: 'Junior', name: 'Junior', color: 'bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20' },
  { href: '/#section-references', label: '📚', name: 'References', color: 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20' },
  { href: '/#section-games', label: '🎮', name: 'Games', color: 'bg-purple-500/10 text-purple-600 hover:bg-purple-500/20' },
  { href: '/#section-general', label: '🌍', name: 'General', color: 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20' },
];

const pill = "text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all items-center space-x-1 cursor-pointer border-slate-200 hover:bg-slate-100 text-slate-700 whitespace-nowrap";
const menuRow = "flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer text-left";

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

  // 💡 狭い画面（xl 未満）では、よく使うもの以外をメニュー（☰）にまとめる
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const headerRef = useRef<HTMLElement>(null);

  // ページを移動したら閉じる
  useEffect(() => { setIsMenuOpen(false); }, [location.key]);

  // メニューの外をクリック / Esc で閉じる
  useEffect(() => {
    if (!isMenuOpen) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) setIsMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsMenuOpen(false); };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [isMenuOpen]);

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header ref={headerRef} className="bg-white/80 border-slate-200 text-slate-900 backdrop-blur-md border-b sticky top-0 z-50 shadow-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* 左側グループ：ロゴ ＆ クイックジャンプボタン */}
        <div className="flex items-center gap-4 lg:gap-6 min-w-0">
          <Link to="/" className="flex items-center space-x-2 group shrink-0">
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-md flex items-center justify-center bg-red-600">
              <img
                src="/jptutoraiyamato.png"
                alt="AI Yamato Logo"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            </div>
            <span className="font-extrabold tracking-tight text-lg bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent hidden sm:inline whitespace-nowrap">
              JP Tutor AI Yamato
            </span>
          </Link>

          {/* セクションへのジャンプ（md 以上はヘッダーに並べる。md 未満はメニューの中） */}
          <nav className="hidden md:flex items-center space-x-1.5" aria-label="Sections">
            {SECTION_LINKS.map(({ href, label, name, color }) => (
              <Link
                key={href}
                to={href}
                title={name}
                aria-label={name}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center whitespace-nowrap ${color}`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* 右側グループ */}
        <div className="flex items-center gap-2 xl:gap-3 shrink-0">
          {/* 💡 教師かつログイン中の場合のみ、ニックネームの左隣にダッシュボードボタンを表示（xl 以上。狭い画面はメニュー） */}
          {user && isTeacher && (
            <Link
              to="/teacher-dashboard"
              className="hidden xl:flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer shadow-xs bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 whitespace-nowrap"
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
              className="hidden xl:flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-dashed transition-all cursor-pointer bg-white border-slate-300 text-slate-500 hover:bg-slate-50 whitespace-nowrap"
              title="Your teacher account is being reviewed"
            >
              <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
              <span>Teacher Panel (in review)</span>
            </Link>
          )}

          {/* 1. Nickname（ログイン時のみ。My Account へのリンクを兼ねる。xl 以上） */}
          {user && (
            <Link
              to="/my-account"
              className="hidden xl:flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer shadow-xs bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 max-w-[10rem]"
              title="My Account (change your nickname here)"
            >
              <User className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className="truncate">{displayNickname}</span>
            </Link>
          )}

          {/* 2. Credit（ログイン時のみ。どの幅でも表示。スマホでは数字だけ） */}
          {user && (
            <div
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border bg-amber-50 border-amber-200 text-amber-700 whitespace-nowrap"
              title={`Credits: ${credits}`}
            >
              <Coins className="w-3.5 h-3.5" />
              <span><span className="hidden sm:inline">Credits: </span>{credits}</span>
            </div>
          )}

          {/* 3〜4. Pricing / FAQ（xl 以上）。My Account ボタンはフッターの一番右に移動した */}
          <Link to="/prices" className={`hidden xl:flex ${pill}`}>
            <span>Pricing</span>
          </Link>
          <Link to="/faq" className={`hidden xl:flex ${pill}`}>
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>FAQ</span>
          </Link>

          {/* 6. Sign In / Sign Out */}
          {user ? (
            <button onClick={onSignOut} className={`hidden xl:flex ${pill}`}>
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          ) : (
            <>
              <button onClick={() => onOpenAuth?.('signin')} className={`hidden xl:flex ${pill}`}>
                <KeyRound className="w-3.5 h-3.5 text-blue-500" />
                <span>Sign In</span>
              </button>

              {/* 新規登録は大事なので、どの幅でも表示 */}
              <button
                onClick={() => onOpenAuth?.('signup')}
                className="text-xs font-semibold px-4 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all flex items-center space-x-1 cursor-pointer whitespace-nowrap"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Free Sign Up</span>
              </button>
            </>
          )}

          {/* ☰ メニューボタン（xl 未満） */}
          <button
            type="button"
            onClick={() => setIsMenuOpen((v) => !v)}
            className="xl:hidden p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
            aria-controls="header-menu"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* ☰ メニューの中身（xl 未満） */}
      {isMenuOpen && (
        <div id="header-menu" className="xl:hidden absolute left-0 right-0 top-full bg-white border-b border-slate-200 shadow-lg max-h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 space-y-3">
            {/* セクションへのジャンプ（md 未満だけ。md 以上はヘッダーに出ている） */}
            <div className="md:hidden flex flex-wrap gap-2 pb-3 border-b border-slate-100">
              {SECTION_LINKS.map(({ href, label, name, color }) => (
                <Link
                  key={href}
                  to={href}
                  onClick={closeMenu}
                  className={`px-3 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-1 ${color}`}
                >
                  {label !== name && <span>{label}</span>}
                  <span>{name}</span>
                </Link>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {user && isTeacher && (
                <Link to="/teacher-dashboard" onClick={closeMenu} className={`${menuRow} text-indigo-700`}>
                  <GraduationCap className="w-4 h-4 text-indigo-600" /> Teacher Panel
                </Link>
              )}
              {user && !isTeacher && isTeacherPending && (
                <Link to="/teacher-dashboard" onClick={closeMenu} className={`${menuRow} text-slate-500`}>
                  <GraduationCap className="w-4 h-4 text-slate-400" /> Teacher Panel (in review)
                </Link>
              )}
              {/* ログイン中はニックネーム（広い画面のニックネームボタンと同じ。押すと My Account へ） */}
              {user && (
                <Link to="/my-account" onClick={closeMenu} className={`${menuRow} text-blue-700`}>
                  <User className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="truncate">{displayNickname}</span>
                </Link>
              )}
              <Link to="/prices" onClick={closeMenu} className={menuRow}>
                <Coins className="w-4 h-4 text-amber-500" /> Pricing
              </Link>
              <Link to="/faq" onClick={closeMenu} className={menuRow}>
                <HelpCircle className="w-4 h-4 text-slate-400" /> FAQ
              </Link>
              {user ? (
                <button onClick={() => { closeMenu(); onSignOut?.(); }} className={menuRow}>
                  <LogOut className="w-4 h-4 text-slate-500" /> Sign Out
                </button>
              ) : (
                <button onClick={() => { closeMenu(); onOpenAuth?.('signin'); }} className={menuRow}>
                  <KeyRound className="w-4 h-4 text-blue-500" /> Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
