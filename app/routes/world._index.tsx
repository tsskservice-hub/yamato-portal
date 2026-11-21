/**
 * @file app/routes/world._index.tsx
 * @description Yamato Town の入り口 — ほかの学習者と交流する場所だけ（2026-11-21〜）
 *   各場所に AI の話し手もいる。ほかの人が見えない練習用の入口は Speaking Tasks（/speaking）。
 *   場所の一覧は app/data/world/places.ts
 */
import React from 'react';
import { Link } from '@remix-run/react';
import type { MetaFunction } from '@remix-run/cloudflare';
import { ToolPageWrapper } from '~/components/layout/ToolPageWrapper';
import { WORLD_PLACES, WORLD_PLACES_COMING_SOON } from '~/data/world/places';
import { CREDIT_COSTS } from '~/data/credit-costs';
import { useSchoolAccountRedirect } from '~/components/world/useSchoolAccountRedirect';

const TITLE = 'Yamato Town';
const DESCRIPTION =
  'Walk around a little Japanese town, meet other Japanese learners and greet each other with set Japanese phrases and stamps. In every place there is an AI character you can talk to.';

export const meta: MetaFunction = () => [
  { title: `${TITLE} | AI Yamato Portal` },
  { name: 'description', content: DESCRIPTION },
  { property: 'og:title', content: `${TITLE} | AI Yamato Portal` },
  { property: 'og:description', content: DESCRIPTION },
];

export default function WorldIndexPage() {
  // 学校のアカウントは Speaking Tasks へ自動で移す
  const gate = useSchoolAccountRedirect('/speaking');
  if (gate === 'checking') return <ToolPageWrapper breadcrumbTitle={TITLE}><div className="min-h-screen" /></ToolPageWrapper>;
  return (
    <ToolPageWrapper breadcrumbTitle={TITLE}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 sm:py-12 px-4">
        <main className="max-w-5xl mx-auto space-y-8">
          <div className="bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-3xl p-6 sm:p-10 shadow-xl space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider bg-white/20 w-fit px-3 py-1 rounded-full">
              👥 Meet other learners · BETA
            </p>
            <h1 className="text-3xl sm:text-4xl font-black">{TITLE}</h1>
            <p className="max-w-2xl text-white/90">{DESCRIPTION}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
              <p className="font-bold text-slate-900 dark:text-white">🛡️ Safe by design</p>
              <p className="text-slate-600 dark:text-slate-300">
                No free chat, no voice between users, and no real names. Personal accounts only. You can block or report anyone.
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
              <p className="font-bold text-slate-900 dark:text-white">🎤 An AI character in every place</p>
              <p className="text-slate-600 dark:text-slate-300">
                Talk to the burger shop clerk, a person at the bus stop, station staff and more, with your voice ({CREDIT_COSTS.worldTalk3} credits for 3 minutes).
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
                <p className="text-sm text-slate-600 dark:text-slate-300">Meet other learners · talk to the {p.npc.name.toLowerCase()} {p.npc.icon}</p>
              </Link>
            ))}
            {WORLD_PLACES_COMING_SOON.map((p) => (
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
