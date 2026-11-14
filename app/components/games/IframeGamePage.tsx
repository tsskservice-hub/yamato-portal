/**
 * @file IframeGamePage.tsx
 * @description HTML ゲーム（将棋・囲碁・花札・数独・都道府県パズル・ひらがな神経衰弱）のページの中身
 *  見出し → GameAccessGate（ログイン・先生のロック）→ GameFrame（iframe・高さ自動・全画面）
 */
import React, { type RefObject } from 'react';
import type { PageLayoutRef } from '~/components/layout/PageLayout';
import { GameAccessGate } from '~/components/games/GameAccessGate';
import { GameFrame, type GameVariant } from '~/components/games/GameFrame';

type Props = {
  layoutRef: RefObject<PageLayoutRef | null> | React.MutableRefObject<PageLayoutRef | null>;
  name: string;
  title: string;
  description: string;
  variants?: GameVariant[];
};

export function IframeGamePage({ layoutRef, name, title, description, variants }: Props) {
  return (
    <div className="min-h-screen bg-[#f4f1ea] dark:bg-slate-950 pb-16">
      <main className="max-w-6xl mx-auto px-2 sm:px-4 pt-6 sm:pt-8 space-y-4">
        <header className="text-center px-2">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 font-medium">{description}</p>
        </header>
        <GameAccessGate layoutRef={layoutRef}>
          {(ticket) => (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
              <GameFrame name={name} title={title} ticket={ticket} variants={variants} />
            </div>
          )}
        </GameAccessGate>
      </main>
    </div>
  );
}
