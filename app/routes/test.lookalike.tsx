/**
 * @file test.lookalike.tsx
 * @description 似ている文字のテスト（/test/lookalike?type=hiragana | katakana | kanji）
 *
 * 似ている文字（し・つ、シ・ツ、持・待・寺 など）を 1 つずつ出し、
 * かなはローマ字（1 つだけ: shi, chi, tsu, fu, ji, wo, n）、漢字は英語の意味をできるだけ早く正確に打つ。
 * 組み合わせは ~/data/lookalike-sets。漢字の正解は漢字テストと同じ（kl_character.meaning ＋ EXTRA_ANSWERS）。
 *
 * 漢字テストと同じ決まり:
 * ・時間は打つ時間も含める。間違えたときに正解を見ている時間は数えない。
 * ・貼り付け禁止。問題の途中で別のタブ・アプリに切り替えたら、その問題は不正解。
 * ・ログイン中・5 問以上なら /api/test-attempts に送る（サーバーが答え合わせし直す。時間はブラウザで測る試作）。
 */
import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from '@remix-run/react';
import { ToolPageWrapper } from '~/components/layout/ToolPageWrapper';
import { supabase } from '~/lib/supabaseClient';
import { acceptedAnswers, isCorrectMeaning } from '~/lib/kanji-meaning-check';
import {
  KANA_ROMAJI,
  LOOKALIKE_LABELS,
  LOOKALIKE_SETS,
  LOOKALIKE_TARGETS,
  LOOKALIKE_TEST_KEYS,
  isCorrectRomaji,
  isLookalikeType,
  lookalikeChars,
  type LookalikeType,
} from '~/data/lookalike-sets';

export async function loader({ request }: LoaderFunctionArgs) {
  return json({ currentPath: new URL(request.url).pathname });
}

export const meta: MetaFunction = () => [
  { title: 'Look-alike Characters Test | JP Tutor AI Yamato' },
  {
    name: 'description',
    content: 'Hiragana, katakana and kanji that look alike: answer each one as quickly and accurately as you can.',
  },
  { name: 'robots', content: 'noindex' },
];

interface Question {
  c: string;
  /** 正解（表示用） */
  answers: string[];
}

interface Result {
  q: Question;
  typed: string;
  ms: number;
  correct: boolean;
  passed: boolean;
  leftPage: boolean;
  /** 打った答えが、似ている別の字の答えだったとき、その字 */
  mixedWith: string | null;
}

type Phase = 'setup' | 'running' | 'done';
type SaveState = 'idle' | 'saving' | 'saved' | 'signin' | 'short' | 'error';

const TYPES: LookalikeType[] = ['hiragana', 'katakana', 'kanji'];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 混ぜたうえで、同じ字が続けて出ないようにする（できないときだけ続く） */
function shuffleNoRepeat(list: string[]): string[] {
  const rest = shuffle(list);
  const out: string[] = [];
  while (rest.length) {
    const k = rest.findIndex((x) => x !== out[out.length - 1]);
    out.push(rest.splice(k === -1 ? 0 : k, 1)[0]);
  }
  return out;
}

const secText = (ms: number, digits = 1) => (ms / 1000).toFixed(digits);

function clock(ms: number) {
  const total = ms / 1000;
  const m = Math.floor(total / 60);
  const s = total - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, '0')}`;
}

const hasKana = (t: string) => /[぀-ヿ]/.test(t);

export default function LookalikeTest() {
  const [params, setParams] = useSearchParams();
  const type: LookalikeType = isLookalikeType(params.get('type')) ? (params.get('type') as LookalikeType) : 'hiragana';
  const label = LOOKALIKE_LABELS[type];
  const { target, good } = LOOKALIKE_TARGETS[type];
  const sets = LOOKALIKE_SETS[type];

  const speedClass = (ms: number) =>
    ms <= target * 1000 ? 'text-emerald-600' : ms <= good * 1000 ? 'text-amber-600' : 'text-rose-600';

  // 漢字の正解（kl_character から）
  const [kanjiAnswers, setKanjiAnswers] = useState<Map<string, string[]>>(new Map());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingKanji, setLoadingKanji] = useState(false);

  const [phase, setPhase] = useState<Phase>('setup');
  const [selected, setSelected] = useState<Set<number>>(() => new Set(sets.map((_, i) => i)));
  const [rounds, setRounds] = useState(2);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [typed, setTyped] = useState('');
  const [review, setReview] = useState<Result | null>(null);
  const [now, setNow] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const startRef = useRef(0);
  const scopeRef = useRef('all');
  const leftPageRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 種類を変えたら最初から
  useEffect(() => {
    setSelected(new Set(LOOKALIKE_SETS[type].map((_, i) => i)));
    setPhase('setup');
    setResults([]);
    setReview(null);
  }, [type]);

  useEffect(() => {
    if (type !== 'kanji' || kanjiAnswers.size > 0) return;
    setLoadingKanji(true);
    (async () => {
      try {
        const { data, error } = await supabase
          .from('kl_character')
          .select('character, meaning')
          .eq('char_type', 'kanji')
          .in('character', lookalikeChars('kanji'));
        if (error) throw error;
        setKanjiAnswers(new Map((data || []).map((r: any) => [String(r.character), acceptedAnswers(r.character, r.meaning)])));
      } catch (e: any) {
        setLoadError(e?.message || 'Could not load the kanji.');
      } finally {
        setLoadingKanji(false);
      }
    })();
  }, [type, kanjiAnswers.size]);

  const answersFor = useCallback(
    (c: string): string[] => (type === 'kanji' ? kanjiAnswers.get(c) ?? [] : KANA_ROMAJI[c] ? [KANA_ROMAJI[c]] : []),
    [type, kanjiAnswers],
  );

  const isCorrect = useCallback(
    (c: string, input: string) => (type === 'kanji' ? isCorrectMeaning(input, answersFor(c)) : isCorrectRomaji(c, input)),
    [type, answersFor],
  );

  /** 似ている字（同じ組に入っている別の字） */
  const neighbours = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const set of sets) {
      for (const c of set.chars) {
        if (!map.has(c)) map.set(c, new Set());
        set.chars.filter((x) => x !== c).forEach((x) => map.get(c)!.add(x));
      }
    }
    return map;
  }, [sets]);

  const selectedChars = useMemo(
    () => [...new Set(sets.filter((_, i) => selected.has(i)).flatMap((set) => set.chars))].filter((c) => answersFor(c).length > 0),
    [sets, selected, answersFor],
  );

  // ---- テストの開始・進行 ----

  const begin = useCallback((chars: string[]) => {
    if (chars.length === 0) return;
    setQuestions(shuffleNoRepeat(chars).map((c) => ({ c, answers: answersFor(c) })));
    setIndex(0);
    setResults([]);
    setTyped('');
    setReview(null);
    setSaveState('idle');
    setPhase('running');
  }, [answersFor]);

  const startFromSetup = () => {
    scopeRef.current = selected.size === sets.length ? 'all' : sets.filter((_, i) => selected.has(i)).map((set) => set.chars.join('')).join(' ');
    const list: string[] = [];
    for (let r = 0; r < rounds; r++) list.push(...selectedChars);
    begin(list);
  };

  useEffect(() => {
    if (phase !== 'running' || review) return;
    startRef.current = performance.now();
    leftPageRef.current = false;
    setNow(startRef.current);
    inputRef.current?.focus();
  }, [phase, index, review]);

  useEffect(() => {
    if (phase !== 'running' || review) return;
    const id = window.setInterval(() => setNow(performance.now()), 100);
    return () => window.clearInterval(id);
  }, [phase, review]);

  // 別のタブ・アプリに切り替えたら、その問題は無効（不正解）
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
    if (index + 1 >= questions.length) setPhase('done');
    else setIndex((i) => i + 1);
  }, [index, questions.length]);

  const submit = (pass: boolean) => {
    if (phase !== 'running' || review) return;
    const q = questions[index];
    if (!q) return;
    const value = pass ? '' : typed;
    if (!pass && !value.trim()) return;
    const ms = performance.now() - startRef.current;
    const leftPage = leftPageRef.current;
    const correct = !pass && !leftPage && isCorrect(q.c, value);
    let mixedWith: string | null = null;
    if (!correct && !pass && !leftPage) {
      mixedWith = [...(neighbours.get(q.c) ?? [])].find((other) => isCorrect(other, value)) ?? null;
    }
    const r: Result = { q, typed: value, ms, correct, passed: pass, leftPage, mixedWith };
    setResults((prev) => [...prev, r]);
    if (correct) goNext();
    else setReview(r);
  };

  useEffect(() => {
    if (!review) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        goNext();
      }
    };
    const t = window.setTimeout(() => window.addEventListener('keydown', onKey), 300);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [review, goNext]);

  // 終わったら保存（ログイン中・5 問以上）
  useEffect(() => {
    if (phase !== 'done' || saveState !== 'idle') return;
    if (results.length < 5) {
      setSaveState('short');
      return;
    }
    setSaveState('saving');
    fetch('/api/test-attempts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testKey: LOOKALIKE_TEST_KEYS[type],
        scope: scopeRef.current,
        items: results.map((r) => ({ c: r.q.c, typed: r.typed, ms: Math.round(r.ms), passed: r.passed, left: r.leftPage })),
      }),
    })
      .then((res) => setSaveState(res.ok ? 'saved' : res.status === 401 ? 'signin' : 'error'))
      .catch(() => setSaveState('error'));
  }, [phase, results, saveState, type]);

  const running = phase === 'running';
  const current = questions[index];
  const loading = type === 'kanji' && loadingKanji;

  return (
    <ToolPageWrapper>
      <div className="min-h-screen bg-slate-50 text-slate-800 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <Link to="/test" className="text-sm text-indigo-600 hover:underline">
              ← All tests
            </Link>
            <h1 className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">Look-alike Characters Test</h1>
            <p className="mt-1 text-sm text-slate-600">
              Characters that look alike come one at a time. Type the {label.answer} and press Enter — as quickly and accurately as you can. Aim for an
              average of <b>{target} seconds or less</b>.
            </p>
          </div>

          {!running && (
            <div className="flex gap-2 mb-4" role="tablist" aria-label="Character type">
              {TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={t === type}
                  onClick={() => setParams({ type: t }, { replace: true })}
                  className={`flex-1 rounded-xl border-2 px-3 py-2 font-bold text-sm ${
                    t === type ? 'border-indigo-500 bg-indigo-50 text-indigo-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {LOOKALIKE_LABELS[t].title} <span className="font-semibold text-slate-400">{LOOKALIKE_LABELS[t].jp}</span>
                </button>
              ))}
            </div>
          )}

          {loading && <p className="text-slate-500">Loading kanji…</p>}
          {loadError && type === 'kanji' && <p className="text-rose-600">{loadError}</p>}

          {!loading && phase === 'setup' && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
              <Link
                to={`/test/lookalike/answers#${type}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-4 py-3 text-sm transition-colors"
              >
                <span className="text-indigo-900">
                  📖 <b>Optional:</b> check the characters and the answers that are accepted before you start.
                </span>
                <span className="font-bold text-indigo-700 shrink-0">See the list →</span>
              </Link>
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900 space-y-1">
                <p>
                  ⌨️ <b>A computer with a keyboard is strongly recommended.</b> Typing on a phone is much slower.
                </p>
                {type === 'kanji' ? (
                  <p>• Type the English meaning. Upper/lower case, "to", "the", and colour/color spelling don't matter.</p>
                ) : (
                  <p>
                    • Type the romaji with Japanese input <b>off</b>. Only one spelling is correct: <b>shi, chi, tsu, fu, ji, wo, n</b> (not si, ti,
                    tu, hu, zi).
                  </p>
                )}
                <p>• The time includes typing. • Pasting is turned off. • If you switch to another tab or app during a question, that question is marked wrong.</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-bold text-slate-900">Look-alike sets</h2>
                  <button
                    type="button"
                    onClick={() => setSelected(new Set(selected.size === sets.length ? [] : sets.map((_, i) => i)))}
                    className="text-sm text-indigo-600 hover:underline"
                  >
                    {selected.size === sets.length ? 'Clear all' : 'Select all'}
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {sets.map((set, i) => (
                    <label key={i} className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.has(i)}
                        onChange={(e) => {
                          const next = new Set(selected);
                          if (e.target.checked) next.add(i);
                          else next.delete(i);
                          setSelected(next);
                        }}
                      />
                      <span className="text-2xl tracking-widest text-slate-900">{set.chars.join(' ')}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-bold text-slate-900">Each character appears</span>
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRounds(n)}
                    className={`rounded-lg border px-3 py-1 ${rounds === n ? 'border-indigo-500 bg-indigo-50 font-bold text-indigo-800' : 'border-slate-300 hover:bg-slate-50'}`}
                  >
                    {n === 1 ? 'once' : `${n} times`}
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={selectedChars.length === 0}
                onClick={startFromSetup}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-black text-lg rounded-xl py-3"
              >
                Start ({selectedChars.length * rounds} questions)
              </button>
            </div>
          )}

          {running && current && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8">
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>
                  {index + 1} / {questions.length}
                </span>
                <span>Total {clock(results.reduce((n, r) => n + r.ms, 0) + (review ? 0 : now - startRef.current))}</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-indigo-500 transition-all" style={{ width: `${(index / questions.length) * 100}%` }} />
              </div>

              <div className="text-center my-8">
                <div className="text-8xl sm:text-9xl font-bold text-slate-900 leading-none select-none">{current.c}</div>
                {!review && (
                  <div className={`mt-4 text-lg font-mono font-bold ${speedClass(now - startRef.current)}`}>{secText(Math.max(0, now - startRef.current))} s</div>
                )}
              </div>

              {!review ? (
                <>
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
                      placeholder={type === 'kanji' ? 'English meaning' : 'romaji'}
                      aria-label={type === 'kanji' ? 'English meaning' : 'romaji'}
                      className="flex-1 border-2 border-slate-300 focus:border-indigo-500 outline-none rounded-xl px-4 py-3 text-lg"
                    />
                    <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl px-6 py-3">
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
                  {hasKana(typed) && <p className="mt-2 text-sm font-bold text-rose-600">Japanese input is on — switch it off and type in English letters.</p>}
                </>
              ) : (
                <div className="rounded-xl border-2 border-rose-200 bg-rose-50 p-4">
                  <p className="font-bold text-rose-700">
                    {review.leftPage
                      ? '✗ You left this page during the question, so it does not count.'
                      : review.passed
                        ? 'Skipped'
                        : `✗ "${review.typed}" is not accepted`}
                  </p>
                  {review.mixedWith && (
                    <p className="mt-1 text-slate-800">
                      That is the answer for <span className="text-2xl font-bold">{review.mixedWith}</span>. Look again:{' '}
                      <span className="text-2xl font-bold">{review.q.c}</span> ≠ <span className="text-2xl font-bold">{review.mixedWith}</span>
                    </p>
                  )}
                  <p className="mt-2 text-slate-700">
                    <span className="text-slate-500">{review.q.c} = </span>
                    <b>{review.q.answers.join(' / ')}</b>
                  </p>
                  <button type="button" onClick={goNext} className="mt-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg px-5 py-2">
                    Next (Enter)
                  </button>
                  <p className="mt-2 text-xs text-slate-500">The time you spend reading this is not counted.</p>
                </div>
              )}

              <div className="mt-6 text-right">
                <button
                  type="button"
                  onClick={() => {
                    setReview(null);
                    setPhase('done');
                  }}
                  className="text-xs text-slate-400 hover:text-slate-600 underline"
                >
                  Stop and see results
                </button>
              </div>
            </div>
          )}

          {phase === 'done' && (
            <ResultsPanel
              results={results}
              total={questions.length}
              target={target}
              good={good}
              speedClass={speedClass}
              onRetrySame={() => begin(questions.map((q) => q.c))}
              onRetryWeak={() => {
                // 間違えた字・遅かった字と、それに似ている字をまとめて練習する
                const weak = new Set(results.filter((r) => !r.correct || r.ms > good * 1000).map((r) => r.q.c));
                const withNeighbours = new Set<string>();
                weak.forEach((c) => {
                  withNeighbours.add(c);
                  neighbours.get(c)?.forEach((x) => withNeighbours.add(x));
                });
                scopeRef.current = 'review: mistakes & slow ones';
                const list = [...withNeighbours].filter((c) => answersFor(c).length > 0);
                begin([...list, ...list]);
              }}
              onSetup={() => setPhase('setup')}
              saveState={saveState}
            />
          )}
        </div>
      </div>
    </ToolPageWrapper>
  );
}

function ResultsPanel(props: {
  results: Result[];
  total: number;
  target: number;
  good: number;
  speedClass: (ms: number) => string;
  onRetrySame: () => void;
  onRetryWeak: () => void;
  onSetup: () => void;
  saveState: SaveState;
}) {
  const { results, total, target, good, speedClass, onRetrySame, onRetryWeak, onSetup, saveState } = props;
  const answered = results.length;
  const totalMs = results.reduce((n, r) => n + r.ms, 0);
  const avgMs = answered ? totalMs / answered : 0;
  const correct = results.filter((r) => r.correct);
  const mistakes = results.filter((r) => !r.correct);
  const weakCount = new Set(results.filter((r) => !r.correct || r.ms > good * 1000).map((r) => r.q.c)).size;

  // 字ごとの平均（遅い順）
  const byChar = new Map<string, Result[]>();
  for (const r of results) {
    if (!byChar.has(r.q.c)) byChar.set(r.q.c, []);
    byChar.get(r.q.c)!.push(r);
  }
  const charStats = [...byChar.entries()]
    .map(([c, list]) => ({ c, ok: list.filter((r) => r.correct).length, n: list.length, avg: list.reduce((n, r) => n + r.ms, 0) / list.length }))
    .sort((a, b) => a.ok / a.n - b.ok / b.n || b.avg - a.avg);

  // 取り違えた組み合わせ
  const mixups = new Map<string, number>();
  for (const r of mistakes) {
    if (!r.mixedWith) continue;
    const key = `${r.q.c} → ${r.mixedWith}`;
    mixups.set(key, (mixups.get(key) ?? 0) + 1);
  }

  const tier = avgMs <= target * 1000 ? 'Excellent' : avgMs <= good * 1000 ? 'Very good' : 'Keep practising';

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
        {answered < total && <p className="text-sm text-slate-500 mb-3">Stopped after {answered} of {total} questions.</p>}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
          <Stat label="Total time" value={clock(totalMs)} />
          <Stat label="Average per character" value={`${secText(avgMs, 2)} s`} className={speedClass(avgMs)} />
          <Stat label="Correct" value={`${correct.length} / ${answered}`} />
        </div>
        {answered > 0 && (
          <p className={`mt-4 text-center font-bold ${speedClass(avgMs)}`}>
            {tier} — average {secText(avgMs, 2)} s (target: {target} s or less)
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={onRetrySame} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg px-4 py-2">
            Try the same set again
          </button>
          {weakCount > 0 && (
            <button type="button" onClick={onRetryWeak} className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg px-4 py-2">
              Practise mistakes &amp; slow ones, with their look-alikes
            </button>
          )}
          <button type="button" onClick={onSetup} className="border border-slate-300 hover:bg-slate-50 rounded-lg px-4 py-2">
            Choose sets
          </button>
        </div>
      </div>

      {mixups.size > 0 && (
        <Card title="Mixed up">
          <p className="text-sm text-slate-600 mb-2">You gave the answer of a look-alike character:</p>
          <div className="flex flex-wrap gap-2">
            {[...mixups.entries()].map(([k, n]) => (
              <span key={k} className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1 text-xl">
                {k} {n > 1 && <span className="text-sm text-rose-700">×{n}</span>}
              </span>
            ))}
          </div>
        </Card>
      )}

      {mistakes.length > 0 && (
        <Card title={`Mistakes (${mistakes.length})`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="py-1 pr-2">Character</th>
                <th className="py-1 pr-2">You typed</th>
                <th className="py-1">Accepted answers</th>
              </tr>
            </thead>
            <tbody>
              {mistakes.map((r, i) => (
                <tr key={i} className="border-b border-slate-100 align-top">
                  <td className="py-1.5 pr-2 text-2xl">{r.q.c}</td>
                  <td className="py-1.5 pr-2 text-rose-700">
                    {r.leftPage ? '(left the page)' : r.passed ? '(skipped)' : r.typed}
                    {r.mixedWith && <span className="text-slate-500"> (= {r.mixedWith})</span>}
                  </td>
                  <td className="py-1.5">{r.q.answers.join(' / ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {charStats.length > 0 && (
        <Card title="Each character">
          <div className="flex flex-wrap gap-2">
            {charStats.map((s) => (
              <div
                key={s.c}
                className={`border rounded-lg px-3 py-1.5 text-center ${s.ok < s.n ? 'border-rose-300 bg-rose-50' : 'border-slate-200'}`}
                title={`${s.ok} of ${s.n} correct`}
              >
                <div className="text-2xl">{s.c}</div>
                <div className={`text-xs font-mono ${speedClass(s.avg)}`}>{secText(s.avg)} s</div>
                {s.ok < s.n && <div className="text-[10px] text-rose-700">✗{s.n - s.ok}</div>}
              </div>
            ))}
          </div>
        </Card>
      )}

      <p className="text-xs text-slate-500 text-center">
        {saveState === 'saving' && 'Saving your results…'}
        {saveState === 'saved' && (
          <>
            ✓ Saved. See how you are improving on{' '}
            <Link to="/progress" className="text-indigo-600 font-bold underline">
              My Progress
            </Link>
            .
          </>
        )}
        {saveState === 'signin' && 'Sign in to save your results and see your progress over time.'}
        {saveState === 'short' && 'Answer at least 5 questions to save a result.'}
        {saveState === 'error' && 'Your results could not be saved this time.'}
      </p>
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

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
      <h2 className="font-bold text-slate-900 mb-3">{title}</h2>
      {children}
    </div>
  );
}

