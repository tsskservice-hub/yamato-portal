/**
 * @file test.typing.tsx
 * @description ブラインドタッチ（キーボードを見ずに打つ）を段階的に学ぶページ
 *
 * 段階: ホームポジション → 上の列 → 下の列 → 英単語 → ローマ字のかな → 日本語の単語。
 * 画面のキーボードは指ごとに色分けし、次に押すキーとその指を示す。
 * 間違えたキーでは先に進まない（正しいキーを押すまで待つ）。正確さ 95% 以上で合格。
 * 進み具合はその端末のブラウザにだけ残す（localStorage）。
 */
import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@remix-run/react';
import { ToolPageWrapper } from '~/components/layout/ToolPageWrapper';
import { TYPING_STORE_KEY } from '~/data/typing-progress';

export async function loader({ request }: LoaderFunctionArgs) {
  return json({ currentPath: new URL(request.url).pathname });
}

export const meta: MetaFunction = () => [
  { title: 'Touch Typing | JP Tutor AI Yamato' },
  { name: 'description', content: 'Learn to type without looking at the keyboard, step by step, then type Japanese in romaji.' },
];

// ---------------------------------------------------------------------
// 指とキー
// ---------------------------------------------------------------------

type Finger = 'lp' | 'lr' | 'lm' | 'li' | 'ri' | 'rm' | 'rr' | 'rp' | 'th';

const FINGER_OF: Record<string, Finger> = {};
const setF = (keys: string, f: Finger) => keys.split('').forEach((k) => (FINGER_OF[k] = f));
setF('qaz', 'lp');
setF('wsx', 'lr');
setF('edc', 'lm');
setF('rfvtgb', 'li');
setF('yhnujm', 'ri');
setF('ik,', 'rm');
setF('ol.', 'rr');
setF("p;/'", 'rp');
FINGER_OF[' '] = 'th';

const FINGER_NAME: Record<Finger, string> = {
  lp: 'Left little finger',
  lr: 'Left ring finger',
  lm: 'Left middle finger',
  li: 'Left index finger',
  ri: 'Right index finger',
  rm: 'Right middle finger',
  rr: 'Right ring finger',
  rp: 'Right little finger',
  th: 'Thumb',
};

/** 左右で同じ指は同じ色 */
const FINGER_COLOR: Record<Finger, { key: string; dot: string }> = {
  lp: { key: 'bg-fuchsia-100 border-fuchsia-300', dot: 'bg-fuchsia-400' },
  rp: { key: 'bg-fuchsia-100 border-fuchsia-300', dot: 'bg-fuchsia-400' },
  lr: { key: 'bg-sky-100 border-sky-300', dot: 'bg-sky-400' },
  rr: { key: 'bg-sky-100 border-sky-300', dot: 'bg-sky-400' },
  lm: { key: 'bg-emerald-100 border-emerald-300', dot: 'bg-emerald-400' },
  rm: { key: 'bg-emerald-100 border-emerald-300', dot: 'bg-emerald-400' },
  li: { key: 'bg-amber-100 border-amber-300', dot: 'bg-amber-400' },
  ri: { key: 'bg-amber-100 border-amber-300', dot: 'bg-amber-400' },
  th: { key: 'bg-slate-100 border-slate-300', dot: 'bg-slate-400' },
};

const KEY_ROWS = ['qwertyuiop', 'asdfghjkl;', 'zxcvbnm,./'];

// ---------------------------------------------------------------------
// レッスン
// ---------------------------------------------------------------------

interface Token {
  /** 上に小さく出す文字（かな） */
  label?: string;
  /** 打つ文字 */
  text: string;
}

interface Lesson {
  id: string;
  stage: string;
  title: string;
  /** 新しく覚えるキー（キーボードの絵で強調する） */
  newKeys: string;
  tip: string;
  make: () => Token[];
}

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const shuffle = <T,>(arr: T[]) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** 覚えたキーで、文字のかたまりを作る。新しいキーを多めに出す */
function letterDrill(learned: string, fresh: string, groups = 12): Token[] {
  const all = learned.split('');
  const neu = fresh.replace(/ /g, '').split('');
  const out: Token[] = [];
  for (let g = 0; g < groups; g++) {
    const len = 2 + Math.floor(Math.random() * 3);
    let w = '';
    for (let i = 0; i < len; i++) w += Math.random() < 0.6 ? pick(neu) : pick(all);
    out.push({ text: w });
  }
  return out;
}

function kanaDrill(pairs: [string, string][], count = 14): Token[] {
  const out: Token[] = [];
  let pool: [string, string][] = [];
  while (out.length < count) {
    if (pool.length === 0) pool = shuffle(pairs);
    const [label, text] = pool.pop()!;
    out.push({ label, text });
  }
  return out;
}

const K = (s: string): [string, string][] =>
  s.split(' ').map((p) => {
    const [kana, romaji] = p.split(':');
    return [kana, romaji];
  });

const KANA = {
  vowels: K('あ:a い:i う:u え:e お:o'),
  k: K('か:ka き:ki く:ku け:ke こ:ko'),
  s: K('さ:sa し:shi す:su せ:se そ:so'),
  t: K('た:ta ち:chi つ:tsu て:te と:to'),
  n: K('な:na に:ni ぬ:nu ね:ne の:no'),
  h: K('は:ha ひ:hi ふ:fu へ:he ほ:ho'),
  m: K('ま:ma み:mi む:mu め:me も:mo'),
  y: K('や:ya ゆ:yu よ:yo'),
  r: K('ら:ra り:ri る:ru れ:re ろ:ro'),
  w: K('わ:wa を:wo ん:nn'),
};
const ALL_KANA = Object.values(KANA).flat();

const JP_WORDS = K(
  'すし:sushi さくら:sakura ねこ:neko いぬ:inu やま:yama かわ:kawa うみ:umi はな:hana そら:sora ひと:hito ' +
    'つくえ:tsukue ふね:fune おかし:okashi あした:ashita きもの:kimono ともだち:tomodachi せんせい:sensei ' +
    'ありがとう:arigatou おはよう:ohayou さようなら:sayounara すきやき:sukiyaki たこやき:takoyaki',
);

const EN_WORDS =
  'the and you that was for are with his they one have this from word but what some can out other were all there when use your how said each she which their time will way about many then them write would like these her long make thing see him two has look more day could come did number sound most people over know water than call first who may down side been now find'.split(
    ' ',
  );

const HOME = 'asdfjkl;';

const LESSONS: Lesson[] = [
  { id: 'h1', stage: 'Home row', title: 'F and J', newKeys: 'fj', tip: 'Find the small bumps on F and J with your index fingers. They are your home.', make: () => letterDrill('fj', 'fj') },
  { id: 'h2', stage: 'Home row', title: 'D and K', newKeys: 'dk', tip: 'Middle fingers rest on D and K.', make: () => letterDrill('fjdk', 'dk') },
  { id: 'h3', stage: 'Home row', title: 'S and L', newKeys: 'sl', tip: 'Ring fingers rest on S and L.', make: () => letterDrill('fjdksl', 'sl') },
  { id: 'h4', stage: 'Home row', title: 'A and ;', newKeys: 'a;', tip: 'Little fingers rest on A and ;.', make: () => letterDrill(HOME, 'a;') },
  { id: 'h5', stage: 'Home row', title: 'G and H', newKeys: 'gh', tip: 'Reach one key inward with your index fingers, then come back home.', make: () => letterDrill(HOME + 'gh', 'gh') },
  { id: 't1', stage: 'Top row', title: 'R and U', newKeys: 'ru', tip: 'Index fingers reach up. Keep the other fingers on the home row.', make: () => letterDrill(HOME + 'ghru', 'ru') },
  { id: 't2', stage: 'Top row', title: 'E and I', newKeys: 'ei', tip: 'Middle fingers reach up.', make: () => letterDrill(HOME + 'ghruei', 'ei') },
  { id: 't3', stage: 'Top row', title: 'W and O', newKeys: 'wo', tip: 'Ring fingers reach up.', make: () => letterDrill(HOME + 'ghrueiwo', 'wo') },
  { id: 't4', stage: 'Top row', title: 'Q and P', newKeys: 'qp', tip: 'Little fingers reach up.', make: () => letterDrill(HOME + 'ghrueiwoqp', 'qp') },
  { id: 't5', stage: 'Top row', title: 'T and Y', newKeys: 'ty', tip: 'Index fingers reach up and inward.', make: () => letterDrill(HOME + 'ghrueiwoqpty', 'ty') },
  { id: 'b1', stage: 'Bottom row', title: 'V and M', newKeys: 'vm', tip: 'Index fingers reach down.', make: () => letterDrill(HOME + 'ghrueiwoqptyvm', 'vm') },
  { id: 'b2', stage: 'Bottom row', title: 'C and ,', newKeys: 'c,', tip: 'Middle fingers reach down.', make: () => letterDrill(HOME + 'ghrueiwoqptyvmc', 'c,') },
  { id: 'b3', stage: 'Bottom row', title: 'X and .', newKeys: 'x.', tip: 'Ring fingers reach down.', make: () => letterDrill(HOME + 'ghrueiwoqptyvmcx', 'x.') },
  { id: 'b4', stage: 'Bottom row', title: 'B, N and Z', newKeys: 'bnz', tip: 'B and N: index fingers reach down and inward. Z: left little finger.', make: () => letterDrill(HOME + 'ghrueiwoqptyvmcxbnz', 'bnz') },
  { id: 'e1', stage: 'English words', title: 'Common words', newKeys: '', tip: 'Use every finger. Keep your eyes on the screen, not on your hands.', make: () => shuffle(EN_WORDS).slice(0, 14).map((text) => ({ text })) },
  { id: 'r1', stage: 'Japanese in romaji', title: 'あいうえお', newKeys: 'aiueo', tip: 'Every Japanese sound ends in one of these five vowels.', make: () => kanaDrill(KANA.vowels) },
  { id: 'r2', stage: 'Japanese in romaji', title: 'か・さ rows', newKeys: 'ks', tip: 'し is shi (not si).', make: () => kanaDrill([...KANA.k, ...KANA.s]) },
  { id: 'r3', stage: 'Japanese in romaji', title: 'た・な rows', newKeys: 'tn', tip: 'ち is chi and つ is tsu.', make: () => kanaDrill([...KANA.t, ...KANA.n]) },
  { id: 'r4', stage: 'Japanese in romaji', title: 'は・ま rows', newKeys: 'hm', tip: 'ふ is fu (not hu).', make: () => kanaDrill([...KANA.h, ...KANA.m]) },
  { id: 'r5', stage: 'Japanese in romaji', title: 'や・ら・わ rows and ん', newKeys: 'yrwn', tip: 'を is wo. ん is written n, but when you type Japanese on a computer you press n twice (nn).', make: () => kanaDrill([...KANA.y, ...KANA.r, ...KANA.w]) },
  { id: 'r6', stage: 'Japanese in romaji', title: 'All basic kana', newKeys: '', tip: 'Mix of everything so far.', make: () => kanaDrill(ALL_KANA, 20) },
  { id: 'r7', stage: 'Japanese in romaji', title: 'Japanese words', newKeys: '', tip: 'Long vowels are typed as you write them in kana: ありがとう = arigatou.', make: () => shuffle(JP_WORDS).slice(0, 10).map(([label, text]) => ({ label, text })) },
];

const PASS_ACCURACY = 95;

// ---------------------------------------------------------------------
// 進み具合（この端末だけ）
// ---------------------------------------------------------------------

interface Best {
  accuracy: number;
  kpm: number;
  passed: boolean;
}
const STORE_KEY = TYPING_STORE_KEY;

function loadProgress(): Record<string, Best> {
  try {
    return JSON.parse(window.localStorage.getItem(STORE_KEY) || '{}');
  } catch {
    return {};
  }
}
function saveProgress(p: Record<string, Best>) {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(p));
  } catch {
    /* 保存できなくても続ける */
  }
}

// ---------------------------------------------------------------------
// 画面
// ---------------------------------------------------------------------

export default function TypingPage() {
  const [progress, setProgress] = useState<Record<string, Best>>({});
  const [lessonIdx, setLessonIdx] = useState<number | null>(null);

  useEffect(() => setProgress(loadProgress()), []);

  const record = useCallback((id: string, accuracy: number, kpm: number) => {
    setProgress((prev) => {
      const old = prev[id];
      const passed = accuracy >= PASS_ACCURACY;
      const next = {
        ...prev,
        [id]: {
          accuracy: Math.max(old?.accuracy ?? 0, accuracy),
          kpm: passed ? Math.max(old?.kpm ?? 0, kpm) : old?.kpm ?? 0,
          passed: Boolean(old?.passed || passed),
        },
      };
      saveProgress(next);
      return next;
    });
  }, []);

  return (
    <ToolPageWrapper>
      <div className="min-h-screen bg-slate-50 text-slate-800 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Link to="/test" className="text-sm text-indigo-600 hover:underline">
            ← All tests
          </Link>
          <h1 className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">Touch Typing</h1>
          <p className="mt-1 text-sm text-slate-600">
            Learn to type without looking at the keyboard. It helps in every subject, not only Japanese.
          </p>

          {lessonIdx === null ? (
            <LessonList progress={progress} onOpen={setLessonIdx} />
          ) : (
            <LessonRunner
              key={LESSONS[lessonIdx].id + ':' + lessonIdx}
              lesson={LESSONS[lessonIdx]}
              hasNext={lessonIdx + 1 < LESSONS.length}
              onDone={(acc, kpm) => record(LESSONS[lessonIdx].id, acc, kpm)}
              onNext={() => setLessonIdx(lessonIdx + 1)}
              onBack={() => setLessonIdx(null)}
            />
          )}
        </div>
      </div>
    </ToolPageWrapper>
  );
}

function HomePositionGuide() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-3">
      <h2 className="font-bold text-slate-900">Before you start: the home position</h2>
      <ol className="list-decimal pl-5 text-sm text-slate-700 space-y-1">
        <li>
          Put your left fingers on <b>A S D F</b> and your right fingers on <b>J K L ;</b>.
        </li>
        <li>
          Feel the small bumps on <b>F</b> and <b>J</b>. Your index fingers always come back to them.
        </li>
        <li>Rest your thumbs on the space bar.</li>
        <li>Each finger presses only the keys of its own colour, then returns home.</li>
        <li>Look at the screen, not your hands. Accuracy first, speed later.</li>
      </ol>
      <Keyboard highlight={null} emphasise={HOME} />
      <FingerLegend />
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
        ⌨️ This page needs a physical keyboard. Turn Japanese input off (type in English mode).
      </p>
    </div>
  );
}

function LessonList({ progress, onOpen }: { progress: Record<string, Best>; onOpen: (i: number) => void }) {
  const stages = useMemo(() => {
    const m = new Map<string, number[]>();
    LESSONS.forEach((l, i) => {
      if (!m.has(l.stage)) m.set(l.stage, []);
      m.get(l.stage)!.push(i);
    });
    return [...m.entries()];
  }, []);
  const firstOpen = LESSONS.findIndex((l) => !progress[l.id]?.passed);

  return (
    <div className="mt-6 space-y-5">
      <HomePositionGuide />
      {stages.map(([stage, idxs]) => (
        <div key={stage} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
          <h2 className="font-bold text-slate-900 mb-3">{stage}</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {idxs.map((i) => {
              const l = LESSONS[i];
              const p = progress[l.id];
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => onOpen(i)}
                  className={`text-left border rounded-xl px-4 py-3 hover:bg-indigo-50 transition-colors ${
                    i === firstOpen ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">
                      {i + 1}. {l.title}
                    </span>
                    {p?.passed ? (
                      <span className="text-xs font-bold text-emerald-700">✓ {p.kpm} keys/min</span>
                    ) : i === firstOpen ? (
                      <span className="text-xs font-bold text-indigo-600">Next</span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <p className="text-xs text-slate-400 text-center">Your progress is kept in this browser only.</p>
    </div>
  );
}

function LessonRunner(props: {
  lesson: Lesson;
  hasNext: boolean;
  onDone: (accuracy: number, kpm: number) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const { lesson, hasNext, onDone, onNext, onBack } = props;
  const [tokens, setTokens] = useState<Token[]>(() => lesson.make());
  const stream = useMemo(() => tokens.map((t) => t.text).join(' '), [tokens]);
  const [pos, setPos] = useState(0);
  const [errors, setErrors] = useState(0);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [imeWarning, setImeWarning] = useState(false);
  const [finished, setFinished] = useState<{ accuracy: number; kpm: number } | null>(null);
  const startRef = useRef<number | null>(null);
  const errorAt = useRef<Set<number>>(new Set());

  const restart = () => {
    setTokens(lesson.make());
    setPos(0);
    setErrors(0);
    setFinished(null);
    startRef.current = null;
    errorAt.current = new Set();
  };

  useEffect(() => {
    if (finished) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.isComposing || e.key === 'Process') {
        setImeWarning(true);
        return;
      }
      if (e.key.length !== 1) return;
      e.preventDefault();
      setImeWarning(false);
      const expected = stream[pos];
      if (startRef.current === null) startRef.current = performance.now();
      if (e.key.toLowerCase() === expected) {
        const next = pos + 1;
        setPos(next);
        if (next >= stream.length) {
          const minutes = Math.max((performance.now() - startRef.current) / 60000, 1 / 60);
          const accuracy = Math.round((stream.length / (stream.length + errors)) * 100);
          const kpm = Math.round(stream.length / minutes);
          setFinished({ accuracy, kpm });
          onDone(accuracy, kpm);
        }
      } else {
        setErrors((n) => n + 1);
        errorAt.current.add(pos);
        setWrongFlash(true);
        window.setTimeout(() => setWrongFlash(false), 150);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stream, pos, errors, finished, onDone]);

  const nextChar = finished ? null : stream[pos] ?? null;
  const finger = nextChar ? FINGER_OF[nextChar] : null;

  // 文字の位置 → どの単語の何文字目か
  let offset = 0;
  const tokenStarts = tokens.map((t) => {
    const s = offset;
    offset += t.text.length + 1;
    return s;
  });

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-sm text-slate-500 hover:text-slate-700 underline">
          ← Lessons
        </button>
        <span className="text-xs text-slate-400">{lesson.stage}</span>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6">
        <h2 className="text-xl font-black text-slate-900">{lesson.title}</h2>
        <p className="text-sm text-slate-600 mt-1">{lesson.tip}</p>

        {!finished ? (
          <>
            <div
              className={`mt-5 flex flex-wrap gap-x-4 gap-y-3 font-mono text-2xl sm:text-3xl p-4 rounded-xl border-2 transition-colors ${
                wrongFlash ? 'border-rose-400 bg-rose-50' : 'border-slate-200 bg-slate-50'
              }`}
            >
              {tokens.map((t, ti) => (
                <div key={ti} className="flex flex-col items-start">
                  {t.label && <span className="text-sm font-sans text-slate-500 mb-0.5">{t.label}</span>}
                  <span>
                    {t.text.split('').map((ch, ci) => {
                      const at = tokenStarts[ti] + ci;
                      const cls =
                        at < pos
                          ? errorAt.current.has(at)
                            ? 'text-rose-500'
                            : 'text-emerald-600'
                          : at === pos
                            ? 'bg-indigo-600 text-white rounded'
                            : 'text-slate-400';
                      return (
                        <span key={ci} className={`px-0.5 ${cls}`}>
                          {ch}
                        </span>
                      );
                    })}
                    {tokenStarts[ti] + t.text.length === pos && ti < tokens.length - 1 && (
                      <span className="px-0.5 bg-indigo-600 text-white rounded">␣</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-slate-600">
                {nextChar && finger ? (
                  <>
                    Next: <b className="font-mono">{nextChar === ' ' ? 'space' : nextChar}</b> —{' '}
                    <span className="inline-flex items-center gap-1">
                      <span className={`inline-block w-3 h-3 rounded-full ${FINGER_COLOR[finger].dot}`} />
                      {FINGER_NAME[finger]}
                    </span>
                  </>
                ) : null}
              </span>
              <span className="text-slate-500">
                {pos} / {stream.length} · mistakes {errors}
              </span>
            </div>
            {imeWarning && (
              <p className="mt-2 text-sm font-bold text-rose-600">
                Japanese input is on. Switch to English input (e.g. press 英数 or Caps Lock on a Mac, 半角/全角 on Windows).
              </p>
            )}
            {pos === 0 && <p className="mt-2 text-xs text-slate-400">Start typing — the timer starts with your first key.</p>}
          </>
        ) : (
          <div className="mt-5 text-center space-y-3">
            <p className={`text-2xl font-black ${finished.accuracy >= PASS_ACCURACY ? 'text-emerald-600' : 'text-amber-600'}`}>
              {finished.accuracy >= PASS_ACCURACY ? '✓ Passed!' : 'Almost — try again'}
            </p>
            <p className="text-slate-700">
              Accuracy <b>{finished.accuracy}%</b> (pass: {PASS_ACCURACY}%) · Speed <b>{finished.kpm}</b> keys per minute
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <button type="button" onClick={restart} className="border border-slate-300 hover:bg-slate-50 rounded-lg px-4 py-2">
                Again
              </button>
              {hasNext && (
                <button
                  type="button"
                  onClick={onNext}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg px-5 py-2"
                >
                  Next lesson →
                </button>
              )}
            </div>
          </div>
        )}

        <div className="mt-6">
          <Keyboard highlight={nextChar} emphasise={lesson.newKeys} />
        </div>
      </div>
    </div>
  );
}

function Keyboard({ highlight, emphasise }: { highlight: string | null; emphasise: string }) {
  const indent = ['ml-0', 'ml-4 sm:ml-6', 'ml-8 sm:ml-12'];
  const keyEl = (k: string) => {
    const f = FINGER_OF[k];
    const isNext = highlight === k;
    const isNew = emphasise.includes(k);
    return (
      <div
        key={k}
        className={`relative w-7 h-8 sm:w-10 sm:h-10 border rounded-md flex items-center justify-center font-mono text-sm sm:text-base uppercase select-none ${
          FINGER_COLOR[f].key
        } ${isNext ? 'ring-4 ring-indigo-500 scale-110 font-black' : ''} ${isNew && !isNext ? 'font-bold ring-1 ring-slate-500' : ''}`}
      >
        {k}
        {(k === 'f' || k === 'j') && <span className="absolute bottom-1 w-2 h-0.5 bg-slate-500 rounded" />}
      </div>
    );
  };
  return (
    <div className="flex flex-col items-center gap-1 overflow-x-auto">
      {KEY_ROWS.map((row, r) => (
        <div key={r} className={`flex gap-1 ${indent[r]}`}>
          {row.split('').map(keyEl)}
        </div>
      ))}
      <div
        className={`mt-1 h-8 sm:h-10 w-48 sm:w-72 border rounded-md flex items-center justify-center text-xs text-slate-500 ${
          FINGER_COLOR.th.key
        } ${highlight === ' ' ? 'ring-4 ring-indigo-500 font-bold' : ''}`}
      >
        space
      </div>
    </div>
  );
}

function FingerLegend() {
  const items: [string, string][] = [
    ['Little fingers', FINGER_COLOR.lp.dot],
    ['Ring fingers', FINGER_COLOR.lr.dot],
    ['Middle fingers', FINGER_COLOR.lm.dot],
    ['Index fingers', FINGER_COLOR.li.dot],
    ['Thumbs', FINGER_COLOR.th.dot],
  ];
  return (
    <div className="flex flex-wrap justify-center gap-3 text-xs text-slate-600">
      {items.map(([name, dot]) => (
        <span key={name} className="inline-flex items-center gap-1">
          <span className={`inline-block w-3 h-3 rounded-full ${dot}`} />
          {name}
        </span>
      ))}
    </div>
  );
}
