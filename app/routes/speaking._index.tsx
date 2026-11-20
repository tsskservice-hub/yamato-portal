/**
 * @file app/routes/speaking._index.tsx
 * @description Speaking Tasks（/speaking）— サイトにあるスピーキングの課題を 1 か所にまとめたページ
 *   1. AI のキャラクターと会話する課題（ヤマトバーガーなど。/speaking/<id>、データは app/data/world/places.ts）
 *   2. 教科書準拠レッスンのスピーキング課題（各レッスンの 6 つの課題のうちの 1 つ。edu_topics / edu_lessons から）
 *   3. VCE の口頭試験の練習（/vce/speaking/...）
 */
import React from 'react';
import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import { Link, useLoaderData } from '@remix-run/react';
import { ToolPageWrapper } from '~/components/layout/ToolPageWrapper';
import { WORLD_PLACES, WORLD_PLACES_COMING_SOON } from '~/data/world/places';
import { CREDIT_COSTS } from '~/data/credit-costs';
import { newSlugFor } from '~/data/lesson-slugs';
import { supabase } from '~/lib/supabaseClient';

const TITLE = 'Speaking Tasks';
const DESCRIPTION = 'All speaking tasks in one place: conversations with AI characters, lesson speaking tasks and VCE oral exam practice.';

export const meta: MetaFunction = () => [
  { title: `${TITLE} | AI Yamato Portal` },
  { name: 'description', content: DESCRIPTION },
  { property: 'og:title', content: `${TITLE} | AI Yamato Portal` },
  { property: 'og:description', content: DESCRIPTION },
];

type LessonLink = { key: string; unit: string; title: string; to: string };

export async function loader(_: LoaderFunctionArgs) {
  const lessons: LessonLink[] = [];
  try {
    const { data } = await supabase
      .from('edu_topics')
      .select('*, edu_lessons (*)')
      .order('sort_order', { ascending: true });
    for (const topic of (data || []) as any[]) {
      if (topic.is_coming_soon) continue;
      const list = [...(topic.edu_lessons || [])].sort((a: any, b: any) => (a.lesson_order ?? 0) - (b.lesson_order ?? 0));
      list.forEach((lesson: any, i: number) => {
        const slug = lesson.slug ? newSlugFor(lesson.slug) || lesson.slug : null;
        if (!slug) return;
        lessons.push({
          key: String(lesson.id ?? slug),
          unit: topic.title_en || topic.slug,
          title: `Lesson ${i + 1}: ${lesson.title_en || lesson.title || ''}`.trim(),
          to: `/lessons/${slug}`,
        });
      });
    }
  } catch {
    /* レッスンが読めなくても、ほかの課題は出す */
  }
  return json({ lessons });
}

const VCE_ORAL = [
  { title: 'Oral Drill', description: 'Answer real EOY oral exam questions one by one.', to: '/vce/speaking/eoy-oral-drill' },
  { title: 'Oral Elaborate', description: 'Practise giving longer, more detailed answers.', to: '/vce/speaking/eoy-oral-elaborate' },
  { title: 'Oral Mock Exam', description: 'A full mock oral exam with an examiner and a report.', to: '/vce/speaking/eoy-oral-mock' },
  { title: 'Oral Superb', description: 'Free conversation with AI Yamato in real time.', to: '/vce/speaking/eoy-oral-superb' },
];

const card =
  'block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md hover:border-orange-400 transition';

export default function SpeakingTasksPage() {
  const { lessons } = useLoaderData<typeof loader>();

  // ユニットごとにまとめる
  const units: [string, LessonLink[]][] = [];
  for (const l of lessons) {
    const last = units[units.length - 1];
    if (last && last[0] === l.unit) last[1].push(l);
    else units.push([l.unit, [l]]);
  }

  return (
    <ToolPageWrapper breadcrumbTitle={TITLE}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 sm:py-12 px-4">
        <main className="max-w-5xl mx-auto space-y-8">
          <div className="bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-3xl p-6 sm:p-10 shadow-xl space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider bg-white/20 w-fit px-3 py-1 rounded-full">🎤 Speaking</p>
            <h1 className="text-3xl sm:text-4xl font-black">{TITLE}</h1>
            <p className="max-w-2xl text-white/90">{DESCRIPTION}</p>
          </div>

          <nav aria-label="Speaking task types" className="flex flex-wrap gap-2 text-sm">
            <a href="#conversations" className="px-4 py-1.5 rounded-full border border-orange-200 bg-orange-50 text-orange-700 font-semibold">
              Conversations with AI
            </a>
            <a href="#lessons" className="px-4 py-1.5 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 font-semibold">
              Lesson speaking tasks
            </a>
            <a href="#vce" className="px-4 py-1.5 rounded-full border border-red-200 bg-red-50 text-red-700 font-semibold">
              VCE oral exam
            </a>
          </nav>

          {/* 1. AI のキャラクターとの会話 */}
          <section id="conversations" className="space-y-3 scroll-mt-20">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Conversations with AI characters</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Walk up to a character and talk in Japanese with your voice. {CREDIT_COSTS.worldTalk3} credits for up to 3 minutes. No camera.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {WORLD_PLACES.map((p) => (
                <Link key={p.id} to={`/speaking/${p.id}`} className={card}>
                  <p className="text-4xl">{p.emoji}</p>
                  <p className="mt-2 text-lg font-black text-slate-900 dark:text-white">
                    {p.title} <span lang="ja" className="text-sm text-slate-500">{p.titleJa}</span>
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{p.description}</p>
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
          </section>

          {/* 2. レッスンのスピーキング課題 */}
          <section id="lessons" className="space-y-3 scroll-mt-20">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Lesson speaking tasks</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Every textbook lesson has a speaking task. Open a lesson and find “Speaking” in its six tasks.
            </p>
            {units.length === 0 ? (
              <p className="text-sm text-slate-500">
                See all lessons on the{' '}
                <Link to="/lessons" className="text-indigo-600 font-bold underline">
                  Lessons page
                </Link>
                .
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {units.map(([unit, list]) => (
                  <div key={unit} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
                    <p className="font-black text-slate-900 dark:text-white mb-2">{unit}</p>
                    <div className="space-y-1.5">
                      {list.map((l) => (
                        <Link
                          key={l.key}
                          to={l.to}
                          className="block text-sm px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-700 dark:text-slate-200"
                        >
                          🎤 {l.title}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 3. VCE */}
          <section id="vce" className="space-y-3 scroll-mt-20">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">VCE oral exam practice</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">For Year 11–12 students preparing for the VCE Japanese oral exam.</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {VCE_ORAL.map((v) => (
                <Link key={v.to} to={v.to} className={card}>
                  <p className="font-black text-slate-900 dark:text-white">{v.title}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{v.description}</p>
                </Link>
              ))}
            </div>
          </section>
        </main>
      </div>
    </ToolPageWrapper>
  );
}
