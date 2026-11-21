/**
 * @file app/routes/progress.tsx
 * @description My Progress（/progress）— 学習の達成具合を 1 ページで見る
 *
 *   ・教科書準拠レッスンの 6 つのタスク（edu_student_progress）
 *   ・文化タスク（CULTURE_TASKS。レッスンの文化タスクが終わっていれば完了）
 *   ・言語テスト（Language tests）（test_attempts。SQL 62）: 回数・最初・最高・最近 3 回の平均・伸び（少しずつ / 急な伸び）・苦手な字
 *   ・先生の語彙クイズ（edu_quiz_attempts）
 *   ・ブラインドタッチ（この端末のブラウザだけに残る記録）
 *
 * 読むのはサーバー（本人か確かめてから管理者キー）。My Account とテストのページからリンクする。
 */
import React, { useEffect, useMemo, useState } from 'react';
import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import { Link, useLoaderData } from '@remix-run/react';
import { ToolPageWrapper } from '~/components/layout/ToolPageWrapper';
import { createAdminSupabaseClient } from '~/lib/supabase.server';
import { getSessionUser } from '~/lib/teacher.server';
import { CULTURE_TASKS } from '~/data/culture-tasks';
import { newSlugFor } from '~/data/lesson-slugs';
import { readTypingProgress, TYPING_LESSON_COUNT, type TypingBest } from '~/data/typing-progress';
import { requestAuthModal } from '~/utils/openAuthModal';

export const meta: MetaFunction = () => [
  { title: 'My Progress | AI Yamato Portal' },
  { name: 'robots', content: 'noindex' },
];

const TASKS = [
  { key: 'vocabulary', label: 'Vocabulary', short: 'V' },
  { key: 'listening', label: 'Listening', short: 'L' },
  { key: 'reading', label: 'Reading', short: 'R' },
  { key: 'speaking', label: 'Speaking', short: 'S' },
  { key: 'writing', label: 'Writing', short: 'W' },
  { key: 'culture', label: 'Culture', short: 'C' },
] as const;

/** 急な伸び（Breakthrough）とみなす: 前回までの最高より 1 文字あたりこれ以上速い */
const BREAKTHROUGH_MS = 500;
/** 遅いとみなす 1 文字の時間 */
const SLOW_MS = 4000;

type LessonRow = { id: string; slug: string; title: string; done: string[] };
type UnitRow = { title: string; lessons: LessonRow[] };
type Attempt = { at: string; scope: string; count: number; correct: number; avgMs: number; totalMs: number };
type WeakItem = { c: string; misses: number; slow: number; seen: number; avgMs: number };
type TestSummary = { key: string; attempts: Attempt[]; weak: WeakItem[] };
type QuizRow = { title: string; best: number; total: number; tries: number; last: string };

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { user, headers } = await getSessionUser(request, context);
  if (!user) return json({ signedIn: false as const }, { headers });

  const admin = createAdminSupabaseClient(context);
  const [topicsRes, progressRes, attemptsRes, quizRes] = await Promise.all([
    admin.from('edu_topics').select('*, edu_lessons (*)').order('sort_order', { ascending: true }),
    admin.from('edu_student_progress').select('lesson_id, task_key, is_completed').eq('user_id', user.id).eq('is_completed', true),
    admin
      .from('test_attempts')
      .select('test_key, scope, item_count, correct_count, total_ms, avg_ms, details, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(500),
    admin.from('edu_quiz_attempts').select('homework_id, score, total, created_at').eq('user_id', user.id).limit(1000),
  ]);

  // レッスン
  const done = new Map<string, Set<string>>();
  for (const p of (progressRes.data ?? []) as any[]) {
    const id = String(p.lesson_id);
    if (!done.has(id)) done.set(id, new Set());
    done.get(id)!.add(String(p.task_key));
  }
  const units: UnitRow[] = [];
  const lessonIdBySlug = new Map<string, string>();
  for (const topic of (topicsRes.data ?? []) as any[]) {
    if (topic.is_coming_soon) continue;
    const lessons = [...(topic.edu_lessons ?? [])].sort((a: any, b: any) => (a.lesson_order ?? 0) - (b.lesson_order ?? 0));
    if (lessons.length === 0) continue;
    units.push({
      title: topic.title_en || topic.slug,
      lessons: lessons.map((l: any, i: number) => {
        const slug = l.slug ? newSlugFor(l.slug) || l.slug : '';
        if (slug) lessonIdBySlug.set(slug, String(l.id));
        return {
          id: String(l.id),
          slug,
          title: `Lesson ${i + 1}${l.title_en || l.title ? `: ${l.title_en || l.title}` : ''}`,
          done: [...(done.get(String(l.id)) ?? [])],
        };
      }),
    });
  }

  // 文化タスク（使うレッスンのどれかで文化タスクが終わっていれば完了）
  const culture = Object.entries(CULTURE_TASKS).map(([id, t]) => ({
    id,
    title: t.title,
    done: (t.lessons ?? []).some((l) => {
      const lid = lessonIdBySlug.get(newSlugFor(l.slug) || l.slug);
      return Boolean(lid && done.get(lid)?.has('culture'));
    }),
  }));

  // 言語テスト（Language tests）
  const byKey = new Map<string, any[]>();
  for (const a of (attemptsRes.data ?? []) as any[]) {
    if (!byKey.has(a.test_key)) byKey.set(a.test_key, []);
    byKey.get(a.test_key)!.push(a);
  }
  const tests: TestSummary[] = [...byKey.entries()].map(([key, list]) => {
    // 苦手な字: 最近 5 回の結果から
    const stats = new Map<string, { misses: number; slow: number; seen: number; ms: number }>();
    for (const a of list.slice(-5)) {
      for (const d of Array.isArray(a.details) ? a.details : []) {
        const c = String(d?.c ?? '');
        if (!c) continue;
        const s = stats.get(c) ?? { misses: 0, slow: 0, seen: 0, ms: 0 };
        s.seen += 1;
        s.ms += Number(d?.ms) || 0;
        if (!d?.ok) s.misses += 1;
        else if (Number(d?.ms) > SLOW_MS) s.slow += 1;
        stats.set(c, s);
      }
    }
    const weak = [...stats.entries()]
      .map(([c, s]) => ({ c, misses: s.misses, slow: s.slow, seen: s.seen, avgMs: Math.round(s.ms / s.seen) }))
      .filter((w) => w.misses > 0 || w.slow > 0)
      .sort((a, b) => b.misses - a.misses || b.slow - a.slow || b.avgMs - a.avgMs)
      .slice(0, 16);
    return {
      key,
      weak,
      attempts: list.map((a) => ({
        at: String(a.created_at),
        scope: String(a.scope ?? 'all'),
        count: Number(a.item_count),
        correct: Number(a.correct_count),
        avgMs: Number(a.avg_ms),
        totalMs: Number(a.total_ms),
      })),
    };
  });

  // 先生の語彙クイズ
  const quizzes: QuizRow[] = [];
  const quizAttempts = (quizRes.data ?? []) as any[];
  if (quizAttempts.length) {
    const hwIds = [...new Set(quizAttempts.map((q) => String(q.homework_id)))];
    const { data: hws } = await admin.from('edu_homework').select('id, title').in('id', hwIds);
    const titles = new Map((hws ?? []).map((h: any) => [String(h.id), String(h.title)]));
    for (const id of hwIds) {
      const list = quizAttempts.filter((q) => String(q.homework_id) === id);
      const best = list.reduce((b, q) => (q.score / q.total > b.score / b.total ? q : b), list[0]);
      quizzes.push({
        title: titles.get(id) ?? 'Vocabulary quiz',
        best: Number(best.score),
        total: Number(best.total),
        tries: list.length,
        last: list.map((q) => String(q.created_at)).sort().pop() ?? '',
      });
    }
  }

  return json({ signedIn: true as const, units, culture, tests, quizzes }, { headers });
}

// ---------------------------------------------------------------------
// 画面
// ---------------------------------------------------------------------

const card = 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm';
const sec = (ms: number) => `${(ms / 1000).toFixed(2)} s`;
const day = (iso: string) => (iso ? new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : '');
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

const TEST_NAMES: Record<string, { title: string; to: string }> = {
  'kanji-vce200': { title: 'VCE Kanji 200', to: '/test/kanji' },
};

export default function ProgressPage() {
  const data = useLoaderData<typeof loader>();
  const [typing, setTyping] = useState<Record<string, TypingBest>>({});
  useEffect(() => setTyping(readTypingProgress()), []);

  if (!data.signedIn) {
    return (
      <ToolPageWrapper breadcrumbTitle="My Progress">
        <div className="max-w-xl mx-auto p-8 text-center space-y-3">
          <h1 className="text-2xl font-black text-slate-900">My Progress</h1>
          <p className="text-slate-600">Sign in to see your lessons, culture tasks and test results in one place.</p>
          <button type="button" onClick={() => requestAuthModal('signin')} className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold">
            Sign in
          </button>
        </div>
      </ToolPageWrapper>
    );
  }

  const { units, culture, tests, quizzes } = data;
  const lessonCount = units.reduce((n, u) => n + u.lessons.length, 0);
  const taskTotal = lessonCount * TASKS.length;
  const taskDone = units.reduce((n, u) => n + u.lessons.reduce((m, l) => m + l.done.filter((k) => TASKS.some((t) => t.key === k)).length, 0), 0);
  const cultureDone = culture.filter((c) => c.done).length;
  const testRuns = tests.reduce((n, t) => n + t.attempts.length, 0);
  const typingPassed = Object.values(typing).filter((t) => t?.passed).length;

  return (
    <ToolPageWrapper breadcrumbTitle="My Progress">
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 sm:py-10 px-4">
        <main className="max-w-5xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">My Progress</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Everything you have done, in one place.</p>
          </div>

          {/* ひと目でわかる数字 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Summary href="#lessons" label="Lesson tasks" value={`${taskDone} / ${taskTotal}`} percent={pct(taskDone, taskTotal)} color="bg-orange-500" />
            <Summary href="#culture" label="Culture tasks" value={`${cultureDone} / ${culture.length}`} percent={pct(cultureDone, culture.length)} color="bg-amber-500" />
            <Summary href="#tests" label="Language tests taken" value={String(testRuns)} color="bg-indigo-500" />
            <Summary
              href="#typing"
              label="Typing lessons"
              value={`${typingPassed} / ${TYPING_LESSON_COUNT}`}
              percent={pct(typingPassed, TYPING_LESSON_COUNT)}
              color="bg-emerald-500"
            />
          </div>

          {/* レッスン */}
          <section id="lessons" className={`${card} p-5 scroll-mt-20`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Lessons</h2>
              <p className="text-xs text-slate-500">
                {TASKS.map((t) => `${t.short} = ${t.label}`).join(' · ')}
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {units.map((u) => {
                const uDone = u.lessons.reduce((n, l) => n + l.done.length, 0);
                const uTotal = u.lessons.length * TASKS.length;
                return (
                  <div key={u.title} className="border border-slate-200 dark:border-slate-800 rounded-xl p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-black text-slate-900 dark:text-white">{u.title}</p>
                      <span className="text-xs font-bold text-slate-500">{pct(uDone, uTotal)}%</span>
                    </div>
                    <Bar percent={pct(uDone, uTotal)} color="bg-orange-500" />
                    <div className="mt-2 space-y-1.5">
                      {u.lessons.map((l) => (
                        <Link
                          key={l.id}
                          to={l.slug ? `/lessons/${l.slug}` : '/lessons'}
                          className="flex items-center justify-between gap-2 text-sm rounded-lg px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <span className="truncate text-slate-700 dark:text-slate-200">{l.title}</span>
                          <span className="flex gap-1 shrink-0">
                            {TASKS.map((t) => {
                              const ok = l.done.includes(t.key);
                              return (
                                <span
                                  key={t.key}
                                  title={`${t.label}: ${ok ? 'done' : 'not yet'}`}
                                  className={`w-6 h-6 rounded-md text-[11px] font-black flex items-center justify-center ${
                                    ok ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                  }`}
                                >
                                  {t.short}
                                </span>
                              );
                            })}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 文化 */}
          <section id="culture" className={`${card} p-5 scroll-mt-20`}>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-3">Culture tasks</h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {culture.map((c) => (
                <Link
                  key={c.id}
                  to="/culture"
                  className={`flex items-center gap-2 text-sm rounded-xl border px-3 py-2 ${
                    c.done ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-300'
                  }`}
                >
                  <span className="font-black">{c.done ? '✓' : '○'}</span>
                  <span className="truncate">{c.title}</span>
                </Link>
              ))}
            </div>
          </section>

          {/* 言語テスト（Language tests） */}
          <section id="tests" className={`${card} p-5 scroll-mt-20 space-y-4`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Language tests</h2>
              <Link to="/test" className="text-sm font-bold text-indigo-600 underline">
                All tests →
              </Link>
            </div>
            {Object.entries(TEST_NAMES).map(([key, info]) => {
              const t = tests.find((x) => x.key === key);
              return t ? <TestCard key={key} title={info.title} to={info.to} summary={t} /> : <EmptyTest key={key} title={info.title} to={info.to} />;
            })}
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {['Hiragana', 'Katakana', 'Vocabulary', 'Sentences'].map((name) => (
                <div key={name} className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 px-3 py-2 text-sm text-slate-500">
                  {name} <span className="text-[10px] font-bold uppercase">· coming soon</span>
                </div>
              ))}
            </div>
          </section>

          {/* 先生の語彙クイズ */}
          {quizzes.length > 0 && (
            <section className={`${card} p-5`}>
              <h2 className="text-xl font-black text-slate-900 dark:text-white mb-3">Class vocabulary quizzes</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-200 dark:border-slate-800">
                      <th className="py-1.5 pr-3">Quiz</th>
                      <th className="py-1.5 pr-3">Best</th>
                      <th className="py-1.5 pr-3">Tries</th>
                      <th className="py-1.5">Last</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quizzes.map((q) => (
                      <tr key={q.title + q.last} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="py-1.5 pr-3">{q.title}</td>
                        <td className="py-1.5 pr-3 font-bold">
                          {q.best} / {q.total} ({pct(q.best, q.total)}%)
                        </td>
                        <td className="py-1.5 pr-3">{q.tries}</td>
                        <td className="py-1.5">{day(q.last)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ブラインドタッチ */}
          <section id="typing" className={`${card} p-5 scroll-mt-20`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Touch typing</h2>
              <Link to="/test/typing" className="text-sm font-bold text-indigo-600 underline">
                Practise →
              </Link>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              {typingPassed} of {TYPING_LESSON_COUNT} lessons passed
              {typingPassed > 0 && ` · best speed ${Math.max(...Object.values(typing).map((t) => t?.kpm ?? 0))} keys per minute`}
            </p>
            <Bar percent={pct(typingPassed, TYPING_LESSON_COUNT)} color="bg-emerald-500" />
            <p className="text-xs text-slate-400 mt-2">Typing progress is kept on this device only.</p>
          </section>
        </main>
      </div>
    </ToolPageWrapper>
  );
}

function Summary({ href, label, value, percent, color }: { href: string; label: string; value: string; percent?: number; color: string }) {
  return (
    <a href={href} className={`${card} p-4 hover:border-indigo-300 transition`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-2xl font-black text-slate-900 dark:text-white">{value}</p>
      {percent !== undefined && <Bar percent={percent} color={color} />}
    </a>
  );
}

function Bar({ percent, color }: { percent: number; color: string }) {
  return (
    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-2" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full ${color}`} style={{ width: `${percent}%` }} />
    </div>
  );
}

function EmptyTest({ title, to }: { title: string; to: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between gap-2">
      <p className="font-bold text-slate-900 dark:text-white">{title}</p>
      <Link to={to} className="text-sm font-bold text-indigo-600 underline">
        Take your first test →
      </Link>
    </div>
  );
}

function TestCard({ title, to, summary }: { title: string; to: string; summary: TestSummary }) {
  const all = summary.attempts;
  // 範囲の違う回を比べないよう、伸びは「全部（all）」の回で見る。全部の回が無ければ、すべての回で見る
  const full = all.filter((a) => a.scope === 'all');
  const series = full.length ? full : all;
  const accuracy = (a: Attempt) => pct(a.correct, a.count);
  const first = series[0];
  const latest = series[series.length - 1];
  const best = series.reduce((b, a) => (a.avgMs < b.avgMs ? a : b), series[0]);
  const worst = series.reduce((b, a) => (a.avgMs > b.avgMs ? a : b), series[0]);
  const recent = series.slice(-3);
  const recentAvg = recent.reduce((n, a) => n + a.avgMs, 0) / recent.length;
  const prevBest = series.length > 1 ? Math.min(...series.slice(0, -1).map((a) => a.avgMs)) : null;
  const breakthrough = prevBest !== null && prevBest - latest.avgMs >= BREAKTHROUGH_MS;
  const trend =
    series.length < 2
      ? 'First result — come back and beat it!'
      : breakthrough
        ? '🚀 Breakthrough! Your latest test was much faster than ever before.'
        : latest.avgMs < first.avgMs
          ? '📈 Steady growth — you are getting faster little by little.'
          : 'Keep going — practise your weak kanji below.';

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-black text-slate-900 dark:text-white">
          {title} <span className="text-xs font-bold text-slate-400">· {all.length} attempts</span>
        </p>
        <Link to={to} className="text-sm font-bold text-indigo-600 underline">
          Try again →
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
        <Stat label="First" value={sec(first.avgMs)} sub={`${accuracy(first)}% · ${day(first.at)}`} />
        <Stat label="Best" value={sec(best.avgMs)} sub={`${accuracy(best)}% · ${day(best.at)}`} strong />
        <Stat label="Slowest" value={sec(worst.avgMs)} sub={`${accuracy(worst)}% · ${day(worst.at)}`} />
        <Stat label="Last 3 average" value={sec(recentAvg)} sub={`${recent.length} test${recent.length > 1 ? 's' : ''}`} />
        <Stat label="Latest" value={sec(latest.avgMs)} sub={`${accuracy(latest)}% · ${day(latest.at)}`} />
      </div>
      <p className="text-xs text-slate-500">
        Seconds per kanji (lower is better){full.length ? ', full 200-kanji tests only' : ''}. Target: 3 seconds.
      </p>
      {series.length > 1 && <Sparkline values={series.map((a) => a.avgMs)} highlightLast={breakthrough} />}
      <p className={`text-sm font-bold ${breakthrough ? 'text-indigo-600' : 'text-slate-700 dark:text-slate-200'}`}>{trend}</p>
      {summary.weak.length > 0 && (
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">Kanji to practise (from your last 5 tests)</p>
          <div className="flex flex-wrap gap-1.5">
            {summary.weak.map((w) => (
              <span
                key={w.c}
                title={`${w.misses} wrong, ${w.slow} slow, average ${sec(w.avgMs)}`}
                className={`rounded-lg border px-2 py-1 text-center ${w.misses ? 'border-rose-300 bg-rose-50' : 'border-amber-300 bg-amber-50'}`}
              >
                <span className="text-xl block leading-none text-slate-900">{w.c}</span>
                <span className="text-[10px] text-slate-500">{w.misses ? `✗${w.misses}` : `${(w.avgMs / 1000).toFixed(1)}s`}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub, strong }: { label: string; value: string; sub: string; strong?: boolean }) {
  return (
    <div className={`rounded-lg p-2 ${strong ? 'bg-indigo-50 border border-indigo-200' : 'bg-slate-50 dark:bg-slate-800'}`}>
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="font-black font-mono text-slate-900 dark:text-white">{value}</p>
      <p className="text-[10px] text-slate-500">{sub}</p>
    </div>
  );
}

/** 1 文字あたりの秒数の移り変わり（下に行くほど速い＝良い） */
function Sparkline({ values, highlightLast }: { values: number[]; highlightLast: boolean }) {
  const pts = useMemo(() => {
    const max = Math.max(...values);
    const min = Math.min(...values);
    const span = Math.max(max - min, 1);
    return values.map((v, i) => ({ x: values.length === 1 ? 50 : (i / (values.length - 1)) * 100, y: 10 + ((max - v) / span) * 80 }));
  }, [values]);
  const last = pts[pts.length - 1];
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-16" aria-label="Seconds per kanji over time. Higher on the chart means faster.">
      <polyline points={pts.map((p) => `${p.x},${100 - p.y}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" className="text-indigo-500" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={100 - p.y} r="2.5" vectorEffect="non-scaling-stroke" className="fill-indigo-500" />
      ))}
      {highlightLast && <circle cx={last.x} cy={100 - last.y} r="5" className="fill-amber-400" vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}
