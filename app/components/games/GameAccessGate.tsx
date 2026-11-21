/**
 * @file GameAccessGate.tsx
 * @description ゲームのページ共通の「遊べるか」の確認
 *
 * - ログインしていなければ「ログインして遊ぶ」を出す（ログアウトで先生のロックを回避できないように）
 * - 先生がクラスのゲームをロックしていれば、ロック中の案内を出す
 * - 遊べるときだけ children（ゲーム本体）を表示する
 *
 * 確認そのもの（30 秒ごとの再確認など）は useGameAccess が行う。
 * 先生がロック／ロック解除すると、開いたままのゲームもしばらくすると自動で閉じる／開く。
 */
import React, { type ReactNode, type RefObject } from 'react';
import { Lock, LogIn, RefreshCw } from 'lucide-react';
import type { PageLayoutRef } from '~/components/layout/PageLayout';
import { useGameAccess } from '~/components/games/useGameAccess';

type Props = {
  layoutRef: RefObject<PageLayoutRef | null> | React.MutableRefObject<PageLayoutRef | null>;
  /** 遊べるときに表示するゲーム。ticket は iframe のゲーム（GameFrame）に渡す */
  children: (ticket: string) => ReactNode;
};

export function GameAccessGate({ layoutRef, children }: Props) {
  const { state, retry } = useGameAccess();

  if (state.status === 'allowed') return <>{children(state.ticket)}</>;

  const box = 'max-w-xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-4 shadow-sm';

  if (state.status === 'checking') {
    return (
      <div className="py-16 text-center" role="status">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-3" />
        <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Getting the game ready…</p>
      </div>
    );
  }

  if (state.status === 'login') {
    return (
      <div className={box}>
        <div className="w-14 h-14 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto">
          <LogIn className="w-7 h-7 text-indigo-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Log in to play</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Games are free with an AI Yamato account. Log in, or create a free account, to start playing.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <button
            type="button"
            onClick={() => layoutRef.current?.openAuthModal('signin')}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition cursor-pointer"
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => layoutRef.current?.openAuthModal('signup')}
            className="px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-sm font-bold rounded-xl transition cursor-pointer"
          >
            Create a free account
          </button>
        </div>
      </div>
    );
  }

  if (state.status === 'locked') {
    return (
      <div className={box} role="status">
        <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7 text-amber-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Games are locked right now</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Your teacher has locked games{state.className ? <> for <strong>{state.className}</strong></> : null}. Please listen to your
          teacher. This page will open by itself when your teacher unlocks games.
        </p>
      </div>
    );
  }

  return (
    <div className={box} role="alert">
      <h2 className="text-xl font-bold text-slate-800 dark:text-white">Could not open the game</h2>
      <p className="text-sm text-slate-600 dark:text-slate-400">Please check your internet connection and try again.</p>
      <button
        type="button"
        onClick={retry}
        className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition cursor-pointer"
      >
        <RefreshCw className="w-4 h-4" /> Try again
      </button>
    </div>
  );
}
