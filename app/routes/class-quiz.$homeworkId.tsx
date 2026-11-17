/**
 * @file class-quiz.$homeworkId.tsx
 * @description 先生が宿題・課題として出した語彙クイズ（SQL 42）を生徒が解くページ
 *
 *  - 日本語の単語を見て・聞いて、英語の意味を 4 つから選ぶ
 *  - 何度でも挑戦できる。1 回終えるごとに点数を edu_quiz_attempts に記録する（先生は最高点・回数・最後にやった日を見る）
 *  - 採点はサーバーで行う。ブラウザには正解の印を送らない（選択肢の中にあるだけ）
 *  - そのクラスの生徒で、その宿題の対象の人だけが開ける
 */
import { json, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useFetcher, useLoaderData } from '@remix-run/react';
import { Volume2, CheckCircle2, XCircle, RotateCcw, ArrowRight, Languages } from 'lucide-react';
import PageLayout, { type PageLayoutRef } from '~/components/layout/PageLayout';
import { createAdminSupabaseClient } from '~/lib/supabase.server';
import { getSessionUser } from '~/lib/teacher.server';
import { getStudentQuizAssignment, loadQuizStats } from '~/lib/assignments.server';
import { assignmentKindLabel } from '~/lib/teacher-config';
import { useSoundEffect } from '~/hooks/useSoundEffect';

type Question = { id: string; jp: string; kana: string | null; audioUrl: string | null; options: string[] };

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function loader({ request, context, params }: LoaderFunctionArgs) {
  const { user, headers } = await getSessionUser(request, context);
  if (!user) return json({ status: 'signin' as const }, { headers });

  const admin = createAdminSupabaseClient(context);
  const found = await getStudentQuizAssignment(admin, String(params.homeworkId ?? ''), user.id);
  if (!found || found.items.length < 2) return json({ status: 'notfound' as const }, { headers });

  // 選択肢: 正解 + ほかの単語の意味から 3 つ（重ならないように）。どれが正解かは送らない
  const meanings = found.items.map((i) => i.english);
  const questions: Question[] = shuffle(found.items).map((it) => {
    const others = shuffle(meanings.filter((m) => m.toLowerCase() !== it.english.toLowerCase())).slice(0, 3);
    return { id: it.id, jp: it.jp, kana: it.kana, audioUrl: it.audioUrl, options: shuffle([it.english, ...others]) };
  });

  const [stat] = await loadQuizStats(admin, [found.homework.id], [user.id]);
  return json(
    {
      status: 'ok' as const,
      homework: found.homework,
      questions,
      record: stat ? { best: stat.best, total: stat.total, attempts: stat.attempts } : null,
    },
    { headers }
  );
}

export async function action({ request, context, params }: ActionFunctionArgs) {
  const { user } = await getSessionUser(request, context);
  if (!user) return json({ ok: false as const, error: 'Please sign in again.' }, { status: 401 });

  const admin = createAdminSupabaseClient(context);
  const found = await getStudentQuizAssignment(admin, String(params.homeworkId ?? ''), user.id);
  if (!found) return json({ ok: false as const, error: 'This quiz is no longer available.' }, { status: 404 });

  let answers: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(String((await request.formData()).get('answers') ?? '{}'));
    if (parsed && typeof parsed === 'object') answers = parsed;
  } catch {
    answers = {};
  }

  const results = found.items.map((it) => {
    const chosen = typeof answers[it.id] === 'string' ? (answers[it.id] as string) : '';
    return { id: it.id, jp: it.jp, answer: it.english, chosen, correct: chosen.trim().toLowerCase() === it.english.trim().toLowerCase() };
  });
  const score = results.filter((r) => r.correct).length;
  const total = results.length;

  const { error } = await admin.from('edu_quiz_attempts').insert({ homework_id: found.homework.id, user_id: user.id, score, total });
  if (error) {
    console.error('[class-quiz] save attempt failed:', error.message);
    return json({ ok: false as const, error: 'Could not save your score. Please try again.' }, { status: 500 });
  }

  const [stat] = await loadQuizStats(admin, [found.homework.id], [user.id]);
  return json({
    ok: true as const,
    score,
    total,
    results,
    record: stat ? { best: stat.best, total: stat.total, attempts: stat.attempts } : null,
  });
}

/** 日本語を読み上げる（録音があればそれ、なければブラウザの読み上げ） */
function speakJapanese(text: string, audioUrl: string | null, audioRef: React.MutableRefObject<HTMLAudioElement | null>) {
  try {
    audioRef.current?.pause();
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.play().catch(() => speakJapanese(text, null, audioRef));
      return;
    }
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    u.rate = 0.9;
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang?.startsWith('ja'));
    if (voice) u.voice = voice;
    window.speechSynthesis.speak(u);
  } catch {
    // 読み上げできない端末でも、問題は解ける
  }
}

export default function ClassQuizPage() {
  const data = useLoaderData<typeof loader>();
  const layoutRef = useRef<PageLayoutRef>(null);

  return (
    <PageLayout ref={layoutRef}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {data.status === 'signin' ? (
          <Notice title="Please sign in">
            Sign in to do the vocabulary quiz from your teacher.{' '}
            <button type="button" onClick={() => layoutRef.current?.openAuthModal?.('signin')} className="text-blue-700 font-semibold hover:underline bg-transparent border-none p-0 cursor-pointer">
              Sign in
            </button>
          </Notice>
        ) : data.status === 'notfound' ? (
          <Notice title="Quiz not found">
            This quiz may have been removed by your teacher, or it was not set for you.{' '}
            <Link to="/my-account" className="text-blue-700 font-semibold hover:underline">Back to My Account</Link>
          </Notice>
        ) : (
          <QuizRunner key={data.homework.id} data={data} />
        )}
      </div>
    </PageLayout>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-2">
      <h1 className="text-lg font-bold text-slate-800">{title}</h1>
      <p className="text-sm text-slate-700">{children}</p>
    </div>
  );
}

type OkData = Extract<ReturnType<typeof useLoaderData<typeof loader>>, { status: 'ok' }>;

function QuizRunner({ data }: { data: OkData }) {
  const fetcher = useFetcher<typeof action>();
  const { playCompleteSound } = useSoundEffect();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [round, setRound] = useState(0); // 「もう一度」で問題の順番と選択肢を並べ替える
  const questions = useMemo(
    () => (round === 0 ? data.questions : shuffle(data.questions).map((q) => ({ ...q, options: shuffle(q.options) }))),
    [data.questions, round]
  );
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const current = questions[index];
  const chosen = current ? answers[current.id] : undefined;
  const isLast = index === questions.length - 1;
  const result = fetcher.data && fetcher.data.ok ? fetcher.data : null;
  const record = result?.record ?? data.record;

  const say = useCallback((q: Question) => speakJapanese(q.kana || q.jp, q.audioUrl, audioRef), []);

  // 問題が変わったら読み上げる（「始める」を押した後なので、ブラウザに止められない）
  useEffect(() => {
    if (started && !submitted && current) say(current);
  }, [started, submitted, current, say]);

  useEffect(() => {
    if (result) playCompleteSound();
  }, [result, playCompleteSound]);

  const submit = () => {
    setSubmitted(true);
    fetcher.submit({ answers: JSON.stringify(answers) }, { method: 'post' });
  };
  const restart = () => {
    setRound((r) => r + 1);
    setIndex(0);
    setAnswers({});
    setSubmitted(false);
    setStarted(true);
  };

  const header = (
    <div className="space-y-1">
      <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 inline-flex items-center gap-1">
        <Languages className="w-3.5 h-3.5" /> {assignmentKindLabel(data.homework.kind)} · Vocabulary quiz
      </p>
      <h1 className="text-xl font-bold text-slate-800">{data.homework.title}</h1>
      <p className="text-xs text-slate-500" suppressHydrationWarning>
        Due {new Date(data.homework.dueAt).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
        {record && <> · Your best score: <strong>{record.best}/{record.total}</strong> ({record.attempts} {record.attempts === 1 ? 'try' : 'tries'})</>}
      </p>
    </div>
  );

  // 結果
  if (submitted) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-5">
        {header}
        {fetcher.state !== 'idle' || !fetcher.data ? (
          <p className="text-sm text-slate-600">Checking your answers…</p>
        ) : !fetcher.data.ok ? (
          <div className="space-y-3">
            <p className="text-sm text-red-700">{fetcher.data.error}</p>
            <button type="button" onClick={submit} className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-md cursor-pointer">Try saving again</button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <p className="text-4xl font-extrabold text-indigo-700">{fetcher.data.score}/{fetcher.data.total}</p>
              <p className="text-sm text-slate-600">
                {fetcher.data.score === fetcher.data.total ? 'Perfect! すばらしい！' : 'Your score has been saved. Your teacher can see your best score.'}
              </p>
            </div>
            <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
              {fetcher.data.results.map((r) => (
                <li key={r.id} className="px-3 py-2 flex items-start gap-2 text-sm">
                  {r.correct
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-label="correct" />
                    : <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" aria-label="wrong" />}
                  <span className="min-w-0">
                    <span lang="ja" className="font-semibold text-slate-800">{r.jp}</span>
                    <span className="text-slate-600"> = {r.answer}</span>
                    {!r.correct && <span className="block text-xs text-red-600">Your answer: {r.chosen || '(no answer)'}</span>}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <button type="button" onClick={restart} className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-md cursor-pointer inline-flex items-center justify-center gap-1.5">
                <RotateCcw className="w-4 h-4" /> Try again
              </button>
              <Link to="/my-account" className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-semibold rounded-md text-center hover:bg-slate-50">
                Back to My Account
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 始める前
  if (!started) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-5">
        {header}
        <p className="text-sm text-slate-700">
          {questions.length} words. Listen to each Japanese word and choose its English meaning. Your score is checked at the end.
          You can try as many times as you like.
        </p>
        <button type="button" onClick={() => setStarted(true)} className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-md cursor-pointer inline-flex items-center gap-1.5">
          Start <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // 問題
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-5">
      {header}
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden" aria-hidden>
        <div className="h-full bg-indigo-500 transition-all" style={{ width: `${(index / questions.length) * 100}%` }} />
      </div>
      <p className="text-xs text-slate-500">Question {index + 1} of {questions.length}</p>

      <div className="text-center space-y-2">
        <p lang="ja" className="text-4xl font-bold text-slate-900">{current.jp}</p>
        {current.kana && <p lang="ja" className="text-sm text-slate-500">{current.kana}</p>}
        <button type="button" onClick={() => say(current)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full px-3 py-1.5 cursor-pointer hover:bg-indigo-100">
          <Volume2 className="w-4 h-4" /> Listen again
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup" aria-label="Choose the English meaning">
        {current.options.map((opt) => (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={chosen === opt}
            onClick={() => setAnswers((prev) => ({ ...prev, [current.id]: opt }))}
            className={`p-3 rounded-xl border text-sm text-left cursor-pointer transition ${
              chosen === opt ? 'border-indigo-500 bg-indigo-50 font-semibold text-indigo-800' : 'border-slate-200 hover:border-indigo-300 text-slate-800'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>

      <div className="flex justify-between gap-2">
        <button type="button" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}
          className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-semibold rounded-md cursor-pointer disabled:opacity-40">
          Back
        </button>
        {isLast ? (
          <button type="button" onClick={submit} disabled={!chosen}
            className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-md cursor-pointer disabled:opacity-50">
            Finish &amp; check
          </button>
        ) : (
          <button type="button" onClick={() => setIndex((i) => i + 1)} disabled={!chosen}
            className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-md cursor-pointer disabled:opacity-50 inline-flex items-center gap-1">
            Next <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export const meta: MetaFunction = () => [
  { title: 'Vocabulary Quiz | AI Yamato Japanese Hub' },
  { name: 'robots', content: 'noindex, nofollow' },
];
