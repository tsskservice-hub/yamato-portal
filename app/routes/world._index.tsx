/**
 * @file app/routes/world._index.tsx
 * @description 会話練習の空間（Yamato Town）の入り口。場所の一覧（app/data/world/places.ts）
 */
import React from 'react';
import { Link } from '@remix-run/react';
import type { MetaFunction } from '@remix-run/cloudflare';
import { ToolPageWrapper } from '~/components/layout/ToolPageWrapper';
import { WORLD_PLACES } from '~/data/world/places';

const TITLE = 'Yamato Town';
const DESCRIPTION =
  'Walk around a little Japanese town and practise real conversations with AI characters – ordering food, shopping and more. Voice only, no camera.';

export const meta: MetaFunction = () => [
  { title: `${TITLE} | AI Yamato Portal` },
  { name: 'description', content: DESCRIPTION },
  { property: 'og:title', content: `${TITLE} | AI Yamato Portal` },
  { property: 'og:description', content: DESCRIPTION },
];

/** これから作る場所（一覧に「Coming soon」で出す） */
const COMING_SOON = [
  { emoji: '🏪', title: 'Convenience store', titleJa: 'コンビニ' },
  { emoji: '🚏', title: 'Bus stop', titleJa: 'バスてい' },
  { emoji: '🏫', title: 'School', titleJa: 'がっこう' },
  { emoji: '☕', title: 'Café', titleJa: 'カフェ' },
];

export default function WorldIndexPage() {
  return (
    <ToolPageWrapper breadcrumbTitle={TITLE}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 sm:py-12 px-4">
        <main className="max-w-5xl mx-auto space-y-8">
          <div className="bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-3xl p-6 sm:p-10 shadow-xl space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider bg-white/20 w-fit px-3 py-1 rounded-full">🗾 Speaking practice</p>
            <h1 className="text-3xl sm:text-4xl font-black">{TITLE}</h1>
            <p className="max-w-2xl text-white/90">{DESCRIPTION}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
              <p className="font-bold text-slate-900 dark:text-white">🧍 Practise alone</p>
              <p className="text-slate-600 dark:text-slate-300">Just you and the AI characters. Available for every account, including school accounts.</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
              <p className="font-bold text-slate-900 dark:text-white">
                👥 Together <span className="text-[10px] font-bold text-indigo-600">BETA</span>
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                See other learners in the same place and greet them with set Japanese phrases and stamps. No free chat, no voice between users,
                and no real names. Personal accounts only.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {WORLD_PLACES.map((p) => (
              <Link
                key={p.id}
                to={`/world/${p.id}`}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md hover:border-amber-400 transition"
              >
                <p className="text-4xl">{p.emoji}</p>
                <p className="mt-2 text-lg font-black text-slate-900 dark:text-white">
                  {p.title} <span lang="ja" className="text-sm text-slate-500">{p.titleJa}</span>
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">{p.description}</p>
              </Link>
            ))}
            {COMING_SOON.map((p) => (
              <div key={p.title} className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-5 opacity-60">
                <p className="text-4xl">{p.emoji}</p>
                <p className="mt-2 text-lg font-black text-slate-700 dark:text-slate-200">
                  {p.title} <span lang="ja" className="text-sm text-slate-500">{p.titleJa}</span>
                </p>
                <p className="text-xs font-bold text-slate-500">Coming soon</p>
              </div>
            ))}
          </div>
        </main>
      </div>
    </ToolPageWrapper>
  );
}
