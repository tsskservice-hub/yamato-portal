/**
 * @file test.kanji.tsx
 * @description VCE 漢字200 スピードテスト（試作）
 *
 * 漢字を 1 つずつ出し、英語の意味を打ってもらう。
 * 結果は「合計時間」と「1 文字あたりの平均秒数」で見る（英語の長い・短いは平均でならす）。
 * 時間は打つ時間も含めて数える。間違えたときに正解を見ている時間は数えない。
 *
 * 試作のため、記録はまだ保存しない（ブラウザで測るだけ）。
 * 本番で記録を残すときは、問題の出題と時間の記録をサーバー側に移す。
 */
import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@remix-run/react';
import { ToolPageWrapper } from '~/components/layout/ToolPageWrapper';
import { supabase } from '~/lib/supabaseClient';
import { acceptedAnswers, isCorrectMeaning } from '~/lib/kanji-meaning-check';

export async function loader({ request }: LoaderFunctionArgs) {
  return json({ currentPath: new URL(request.url).pathname });
}

export const meta: MetaFunction = () => [
  { title: 'VCE Kanji Speed Test | JP Tutor AI Yamato' },
  { name: 'description', content: 'See each VCE kanji and type its English meaning as fast as you can.' },
  { name: 'robots', content: 'noindex' },
];

interface KanjiRow {
  character: string;
  meaning: string | null;
  category: string | null;
  sort_order: number | null;
}

interface Question {
  kanji: string;
  group: string;
  answers: string[];
}

interface Result {
  q: Question;
  typed: string;
  ms: number;
  correct: boolean;
  passed: boolean;
  leftPage: boolean;
}

/** 参照ページ（/reference/200kanji）と同じ並び。ここに無いグループは最後に並べる */
const GROUP_ORDER = [
  'Numbers', 'Counters', 'Season', 'Days of the week', 'Day', 'Time', 'Parts of the body',
  'Positions', 'Directions', 'School life', 'People/family', 'Adjectives/adverbs',
  'Verbs (Movement)', 'Verbs (Body/Senses)', 'Verbs (Lifestyle)', 'Verbs (Activity)', 'Verbs',
  'Country/city', 'Place', 'Travel/transport', 'Food', 'Nature', 'Animals', 'Colours',
  'Repeat sign', 'Miscellaneous',
];

/** 目標: 平均 3 秒 */
const TARGET_SEC = 3;
const GOOD_SEC = 4;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sec(ms: number, digits = 1) {
  return (ms / 1000).toFixed(digits);
}

function clock(ms: number) {
  const total = ms / 1000;
  const m = Math.floor(total / 60);
  const s = total - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, '0')}`;
}

function speedClass(ms: number) {
  if (ms <= TARGET_SEC * 1000) return 'text-emerald-600';
  if (ms <= GOOD_SEC * 1000) return 'text-amber-600';
  return 'text-rose-600';
}

function tierLabel(ms: number) {
  if (ms <= TARGET_SEC * 1000) return 'Excellent';
  if (ms <= GOOD_SEC * 1000) return 'Very good';
  return 'Keep practising';
}

type Phase = 'setup' | 'running' | 'done';

export default function KanjiSpeedTest() {
  const [rows, setRows] = useState<KanjiRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [phase, setPhase] = useState<Phase>('setup');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [randomOrder, setRandomOrder] = useState(true);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [typed, setTyped] = useState('');
  const [review, setReview] = useState<Result | null>(null);
  const [now, setNow] = useState(0);

  const startRef = useRef(0);
  const leftPageRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('kl_character')
          .select('character, meaning, category, sort_order')
          .eq('char_type', 'kanji')
          .order('sort_order', { ascending: true });
        if (error) throw error;
        const list = (data || []) as KanjiRow[];
        setRows(list);
        setSelected(new Set(list.map((r) => r.category || 'Miscellaneous')));
      } catch (e: any) {
        setLoadError(e?.message || 'Could not load the kanji list.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, KanjiRow[]>();
    for (const r of rows) {
      const g = r.category || 'Miscellaneous';
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(r);
    }
    const rank = (g: string) => {
      const i = GROUP_ORDER.indexOf(g);
      return i === -1 ? GROUP_ORDER.length : i;
    };
    return [...map.entries()].sort((a, b) => rank(a[0]) - rank(b[0]));
  }, [rows]);

  const selectedCount = useMemo(
    () => groups.filter(([g]) => selected.has(g)).reduce((n, [, list]) => n + list.length, 0),
    [groups, selected],
  );

  // ---- テストの開始・進行 ----

  const begin = useCallback((qs: Question[]) => {
    if (qs.length === 0) return;
    setQuestions(qs);
    setIndex(0);
    setResults([]);
    setTyped('');
    setReview(null);
    setPhase('running');
  }, []);

  const startFromSetup = () => {
    const qs: Question[] = [];
    for (const [g, list] of groups) {
      if (!selected.has(g)) continue;
      for (const r of list) {
        qs.push({ kanji: r.character, group: g, answers: acceptedAnswers(r.character, r.meaning) });
      }
    }
    begin(randomOrder ? shuffle(qs) : qs);
  };

  // 新しい問題が出た瞬間から時間を数える
  useEffect(() => {
    if (phase !== 'running' || review) return;
    startRef.current = performance.now();
    leftPageRef.current = false;
    setNow(startRef.current);
    inputRef.current?.focus();
  }, [phase, index, review]);

  // 経過時間の表示を更新
  useEffect(() => {
    if (phase !== 'running' || review) return;
    const id = window.setInterval(() => setNow(performance.now()), 100);
    return () => window.clearInterval(id);
  }, [phase, review]);

  // 別のタブ・アプリに切り替えたら、その問題は無効（不正解）にする
  useEffect(() => {
    if (phase !== 'running') return;
    const onVis = () => {
      if (document.visibilityState === 'hidden') leftPageRef.current = true;
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [phase]);

  const goNext = useCallback(() => {
    setReview(null);
    setTyped('');
    if (index + 1 >= questions.length) {
      setPhase('done');
    } else {
      setIndex((i) => i + 1);
    }
  }, [index, questions.length]);

  const submit = (pass: boolean) => {
    if (phase !== 'running' || review) return;
    const q = questions[index];
    if (!q) return;
    const value = pass ? '' : typed;
    if (!pass && !value.trim()) return;
    const ms = performance.now() - startRef.current;
    const leftPage = leftPageRef.current;
    const correct = !pass && !leftPage && isCorrectMeaning(value, q.answers);
    const r: Result = { q, typed: value, ms, correct, passed: pass, leftPage };
    setResults((prev) => [...prev, r]);
    if (correct) {
      goNext();
    } else {
      setReview(r); // 正解を見せる（この時間は数えない）
    }
  };

  const stopEarly = () => {
    setReview(null);
    setPhase('done');
  };

  // 間違いの確認中は Enter で次へ
  useEffect(() => {
    if (!review) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        goNext();
      }
    };
    // 不正解を出した Enter がそのまま次へ進めてしまわないよう、少し待ってから受け付ける
    const t = window.setTimeout(() => window.addEventListener('keydown', onKey), 300);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [review, goNext]);

  // ---- 画面 ----

  return (
    <ToolPageWrapper>
      <div className="min-h-screen bg-slate-50 text-slate-800 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <Link to="/test" className="text-sm text-indigo-600 hover:underline">
              ← All tests
            </Link>
            <h1 className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">VCE Kanji Speed Test</h1>
            <p className="mt-1 text-sm text-slate-600">
              See a kanji, type its English meaning, press Enter. Aim for an average of{' '}
              <b>{TARGET_SEC} seconds or less</b> per kanji.
            </p>
          </div>

          {loading && <p className="text-slate-500">Loading kanji…</p>}
          {loadError && <p className="text-rose-600">{loadError}</p>}

          {!loading && !loadError && phase === 'setup' && (
            <SetupPanel
              groups={groups}
              selected={selected}
              setSelected={setSelected}
              selectedCount={selectedCount}
              randomOrder={randomOrder}
              setRandomOrder={setRandomOrder}
              onStart={startFromSetup}
            />
          )}

          {phase === 'running' && questions[index] && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8">
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>
                  {index + 1} / {questions.length}
                </span>
                <span>
                  Total {clock(results.reduce((n, r) => n + r.ms, 0) + (review ? 0 : now - startRef.current))}
                </span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all"
                  style={{ width: `${(index / questions.length) * 100}%` }}
                />
              </div>

              <div className="text-center my-8">
                <div className="text-8xl sm:text-9xl font-bold text-slate-900 leading-none select-none">
                  {questions[index].kanji}
                </div>
                {!review && (
                  <div className={`mt-4 text-lg font-mono font-bold ${speedClass(now - startRef.current)}`}>
                    {sec(Math.max(0, now - startRef.current))} s
                  </div>
                )}
              </div>

              {!review ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submit(false);
                  }}
                  className="flex flex-col sm:flex-row gap-3"
                >
                  <input
                    ref={inputRef}
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    onPaste={(e) => e.preventDefault()}
                    onDrop={(e) => e.preventDefault()}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        submit(true);
                      }
                    }}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    placeholder="English meaning"
                    aria-label="English meaning"
                    className="flex-1 border-2 border-slate-300 focus:border-indigo-500 outline-none rounded-xl px-4 py-3 text-lg"
                  />
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl px-6 py-3"
                  >
                    Enter
                  </button>
                  <button
                    type="button"
                    onClick={() => submit(true)}
                    className="border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-xl px-4 py-3 text-sm"
                  >
                    I don't know (Esc)
                  </button>
                </form>
              ) : (
                <div className="rounded-xl border-2 border-rose-200 bg-rose-50 p-4">
                  <p className="font-bold text-rose-700">
                    {review.leftPage
                      ? '✗ You left this page during the question, so it does not count.'
                      : review.passed
                        ? 'Skipped'
                        : `✗ "${review.typed}" is not accepted`}
                  </p>
                  <p className="mt-2 text-slate-700">
                    <span className="text-slate-500">Accepted answers: </span>
                    {review.q.answers.join(' / ')}
                  </p>
                  <button
                    type="button"
                    onClick={goNext}
                    className="mt-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg px-5 py-2"
                  >
                    Next (Enter)
                  </button>
                  <p className="mt-2 text-xs text-slate-500">The time you spend reading this is not counted.</p>
                </div>
              )}

              <div className="mt-6 text-right">
                <button type="button" onClick={stopEarly} className="text-xs text-slate-400 hover:text-slate-600 underline">
                  Stop and see results
                </button>
              </div>
            </div>
          )}

          {phase === 'done' && (
            <ResultsPanel
              results={results}
              total={questions.length}
              onRetrySame={() => begin(randomOrder ? shuffle(questions) : questions)}
              onRetryWeak={() => {
                const weak = results.filter((r) => !r.correct || r.ms > GOOD_SEC * 1000).map((r) => r.q);
                begin(shuffle(weak));
              }}
              onSetup={() => setPhase('setup')}
            />
          )}
        </div>
      </div>
    </ToolPageWrapper>
  );
}

function SetupPanel(props: {
  groups: [string, KanjiRow[]][];
  selected: Set<string>;
  setSelected: (s: Set<string>) => void;
  selectedCount: number;
  randomOrder: boolean;
  setRandomOrder: (v: boolean) => void;
  onStart: () => void;
}) {
  const { groups, selected, setSelected, selectedCount, randomOrder, setRandomOrder, onStart } = props;
  const allOn = groups.every(([g]) => selected.has(g));

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900 space-y-1">
        <p>
          ⌨️ <b>A computer with a keyboard is strongly recommended.</b> Typing on a phone is much slower.
        </p>
        <p>• The time includes typing. • Upper/lower case, "to", "the", and colour/color spelling don't matter.</p>
        <p>• Pasting is turned off. • If you switch to another tab or app during a question, that question is marked wrong.</p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-slate-900">Kanji groups</h2>
          <button
            type="button"
            onClick={() => setSelected(new Set(allOn ? [] : groups.map(([g]) => g)))}
            className="text-sm text-indigo-600 hover:underline"
          >
            {allOn ? 'Clear all' : 'Select all'}
          </button>
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          {groups.map(([g, list]) => (
            <label
              key={g}
              className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.has(g)}
                onChange={(e) => {
                  const next = new Set(selected);
                  if (e.target.checked) next.add(g);
                  else next.delete(g);
                  setSelected(next);
                }}
              />
              <span className="flex-1 text-sm">{g}</span>
              <span className="text-xs text-slate-400 tracking-wide">{list.map((r) => r.character).join('')}</span>
            </label>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={randomOrder} onChange={(e) => setRandomOrder(e.target.checked)} />
        Random order
      </label>

      <button
        type="button"
        disabled={selectedCount === 0}
        onClick={onStart}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-black text-lg rounded-xl py-3"
      >
        Start ({selectedCount} kanji)
      </button>
    </div>
  );
}

function ResultsPanel(props: {
  results: Result[];
  total: number;
  onRetrySame: () => void;
  onRetryWeak: () => void;
  onSetup: () => void;
}) {
  const { results, total, onRetrySame, onRetryWeak, onSetup } = props;
  const answered = results.length;
  const totalMs = results.reduce((n, r) => n + r.ms, 0);
  const avgMs = answered ? totalMs / answered : 0;
  const correct = results.filter((r) => r.correct);
  const correctAvg = correct.length ? correct.reduce((n, r) => n + r.ms, 0) / correct.length : 0;
  const tiers = {
    excellent: correct.filter((r) => r.ms <= TARGET_SEC * 1000).length,
    good: correct.filter((r) => r.ms > TARGET_SEC * 1000 && r.ms <= GOOD_SEC * 1000).length,
    slow: correct.filter((r) => r.ms > GOOD_SEC * 1000).length,
    wrong: answered - correct.length,
  };
  const mistakes = results.filter((r) => !r.correct);
  const slowest = [...correct].sort((a, b) => b.ms - a.ms).slice(0, 10);
  const weakCount = results.filter((r) => !r.correct || r.ms > GOOD_SEC * 1000).length;

  const byGroup = new Map<string, Result[]>();
  for (const r of results) {
    if (!byGroup.has(r.q.group)) byGroup.set(r.q.group, []);
    byGroup.get(r.q.group)!.push(r);
  }

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
        {answered < total && (
          <p className="text-sm text-slate-500 mb-3">
            Stopped after {answered} of {total} kanji.
          </p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <Stat label="Total time" value={clock(totalMs)} />
          <Stat label="Average per kanji" value={`${sec(avgMs, 2)} s`} className={speedClass(avgMs)} />
          <Stat label="Correct" value={`${correct.length} / ${answered}`} />
          <Stat label="Average (correct only)" value={correct.length ? `${sec(correctAvg, 2)} s` : '–'} />
        </div>
        {answered > 0 && (
          <p className={`mt-4 text-center font-bold ${speedClass(avgMs)}`}>
            {tierLabel(avgMs)} — average {sec(avgMs, 2)} s (target: {TARGET_SEC} s or less)
          </p>
        )}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
          <Tier color="bg-emerald-100 text-emerald-800" label={`≤ ${TARGET_SEC} s`} n={tiers.excellent} />
          <Tier color="bg-amber-100 text-amber-800" label={`${TARGET_SEC}–${GOOD_SEC} s`} n={tiers.good} />
          <Tier color="bg-orange-100 text-orange-800" label={`over ${GOOD_SEC} s`} n={tiers.slow} />
          <Tier color="bg-rose-100 text-rose-800" label="wrong / skipped" n={tiers.wrong} />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={onRetrySame} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg px-4 py-2">
            Try the same set again
          </button>
          {weakCount > 0 && (
            <button type="button" onClick={onRetryWeak} className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg px-4 py-2">
              Practise mistakes &amp; slow ones ({weakCount})
            </button>
          )}
          <button type="button" onClick={onSetup} className="border border-slate-300 hover:bg-slate-50 rounded-lg px-4 py-2">
            Choose groups
          </button>
        </div>
      </div>

      {mistakes.length > 0 && (
        <Card title={`Mistakes (${mistakes.length})`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="py-1 pr-2">Kanji</th>
                <th className="py-1 pr-2">You typed</th>
                <th className="py-1">Accepted answers</th>
              </tr>
            </thead>
            <tbody>
              {mistakes.map((r, i) => (
                <tr key={i} className="border-b border-slate-100 align-top">
                  <td className="py-1.5 pr-2 text-2xl">{r.q.kanji}</td>
                  <td className="py-1.5 pr-2 text-rose-700">
                    {r.leftPage ? '(left the page)' : r.passed ? '(skipped)' : r.typed}
                  </td>
                  <td className="py-1.5">{r.q.answers.join(' / ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {slowest.length > 0 && (
        <Card title="Slowest correct answers">
          <div className="flex flex-wrap gap-2">
            {slowest.map((r, i) => (
              <div key={i} className="border border-slate-200 rounded-lg px-3 py-1.5 text-center">
                <div className="text-2xl">{r.q.kanji}</div>
                <div className={`text-xs font-mono ${speedClass(r.ms)}`}>{sec(r.ms)} s</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {byGroup.size > 1 && (
        <Card title="By group">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="py-1 pr-2">Group</th>
                <th className="py-1 pr-2">Correct</th>
                <th className="py-1">Average</th>
              </tr>
            </thead>
            <tbody>
              {GROUP_ORDER.concat([...byGroup.keys()].filter((g) => !GROUP_ORDER.includes(g)))
                .filter((g) => byGroup.has(g))
                .map((g) => {
                  const list = byGroup.get(g)!;
                  const avg = list.reduce((n, r) => n + r.ms, 0) / list.length;
                  return (
                    <tr key={g} className="border-b border-slate-100">
                      <td className="py-1.5 pr-2">{g}</td>
                      <td className="py-1.5 pr-2">
                        {list.filter((r) => r.correct).length} / {list.length}
                      </td>
                      <td className={`py-1.5 font-mono ${speedClass(avg)}`}>{sec(avg, 2)} s</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </Card>
      )}

      <p className="text-xs text-slate-400 text-center">This is a trial version. Results are not saved yet.</p>
    </div>
  );
}

function Stat({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-xl font-black font-mono ${className}`}>{value}</div>
    </div>
  );
}

function Tier({ color, label, n }: { color: string; label: string; n: number }) {
  return (
    <div className={`rounded-lg px-3 py-2 ${color}`}>
      <div className="text-xs">{label}</div>
      <div className="text-lg font-bold">{n}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
      <h2 className="font-bold text-slate-900 mb-3">{title}</h2>
      {children}
    </div>
  );
}
