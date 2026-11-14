/**
 * @file class-game.tsx
 * @description クラス全員で遊ぶライブゲーム（Class Live Game）
 *
 * ・先生: クラス・問題の種類・時間（1〜15 分）・名前の決め方を選んで部屋を作り、プロジェクターに映す。
 * ・生徒: このページを開いてログインするだけ。参加コードはなく、自分のクラスの部屋にだけ入れる。
 * ・クラスのゲームロック（先生ダッシュボード）は、このゲームには効かない（先生が自分で始めるため）。
 * 部屋は api（yamato-api）の Durable Object。問題・判定・金貨はすべてサーバーで行う。
 */
import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from '@remix-run/react';
import { LogIn } from 'lucide-react';
import { ToolPageWrapper } from '~/components/layout/ToolPageWrapper';
import type { PageLayoutRef } from '~/components/layout/PageLayout';
import { supabase } from '~/lib/supabaseClient';
import { YAMATO_API_BASE, yamatoFetch } from '~/lib/yamatoApi';
import { Box, HostView, Spinner, primaryBtn } from '~/components/class-game/HostView';
import { StudentView } from '~/components/class-game/StudentView';
import { QUESTION_SET_LABELS } from '~/components/class-game/useLiveGameSocket';

export async function loader({ request }: LoaderFunctionArgs) {
  return json({ portalContent: null, currentPath: new URL(request.url).pathname });
}

export const meta: MetaFunction = () => [
  { title: 'Class Live Game | JP Tutor AI Yamato' },
  { name: 'description', content: 'A live Japanese game for the whole class, run by your teacher.' },
  { name: 'robots', content: 'noindex, nofollow' },
];

type Mine =
  | { role: 'teacher'; classes: { id: string; name: string; activeGameId: string | null }[] }
  | { role: 'student'; inClass: boolean; game: { id: string; status: string } | null };

type PageState =
  | { kind: 'loading' }
  | { kind: 'login' }
  | { kind: 'error' }
  | { kind: 'mine'; mine: Mine };

/** 生徒が部屋の開始を待っているとき、何秒ごとに確かめるか */
const STUDENT_POLL_MS = 5000;

export default function ClassGamePage() {
  const layoutRef = useRef<PageLayoutRef>(null);
  const [page, setPage] = useState<PageState>({ kind: 'loading' });
  const [hostGameId, setHostGameId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setPage({ kind: 'login' });
      return;
    }
    try {
      const res = await yamatoFetch(`${YAMATO_API_BASE}/api/live-game/mine`);
      if (res.status === 401) return setPage({ kind: 'login' });
      if (!res.ok) throw new Error(`live-game/mine ${res.status}`);
      setPage({ kind: 'mine', mine: (await res.json()) as Mine });
    } catch (err) {
      console.error('[class-game] load failed:', err);
      setPage((prev) => (prev.kind === 'mine' ? prev : { kind: 'error' }));
    }
  }, []);

  useEffect(() => {
    load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') load();
    });
    return () => subscription?.unsubscribe();
  }, [load]);

  // 生徒：部屋がまだないあいだは、ときどき確かめる
  const waitingStudent = page.kind === 'mine' && page.mine.role === 'student' && page.mine.inClass && !page.mine.game;
  useEffect(() => {
    if (!waitingStudent) return;
    const timer = setInterval(() => {
      if (!document.hidden) load();
    }, STUDENT_POLL_MS);
    return () => clearInterval(timer);
  }, [waitingStudent, load]);

  let body: React.ReactNode;
  if (page.kind === 'loading') {
    body = <Spinner text="Checking your class…" />;
  } else if (page.kind === 'login') {
    body = (
      <Box>
        <div className="w-14 h-14 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto">
          <LogIn className="w-7 h-7 text-indigo-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Log in to join your class game</h2>
        <button type="button" onClick={() => layoutRef.current?.openAuthModal('signin')} className={primaryBtn}>
          Log in
        </button>
      </Box>
    );
  } else if (page.kind === 'error') {
    body = (
      <Box>
        <p className="text-slate-700 dark:text-slate-300">We could not check your class. Please try again.</p>
        <button type="button" onClick={load} className={primaryBtn}>Try again</button>
      </Box>
    );
  } else if (page.mine.role === 'teacher') {
    body = hostGameId ? (
      <HostView
        gameId={hostGameId}
        onNewGame={() => {
          setHostGameId(null);
          load();
        }}
      />
    ) : (
      <TeacherSetup classes={page.mine.classes} onOpen={setHostGameId} />
    );
  } else if (!page.mine.inClass) {
    body = (
      <Box>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">You are not in a class yet</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Class games are for students in a teacher's class. Ask your teacher how to join their class on{' '}
          <Link to="/my-account" className="text-indigo-600 underline">My Account</Link>.
        </p>
      </Box>
    );
  } else if (!page.mine.game) {
    body = (
      <Box>
        <div className="inline-block animate-pulse text-5xl">⏳</div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Waiting for your teacher</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          The game will open here automatically when your teacher starts it.
        </p>
      </Box>
    );
  } else {
    body = <StudentView gameId={page.mine.game.id} />;
  }

  return (
    <ToolPageWrapper layoutRef={layoutRef} breadcrumbTitle="Class Live Game">
      <div className="mx-auto max-w-5xl px-4 py-8">{body}</div>
    </ToolPageWrapper>
  );
}

function TeacherSetup({
  classes,
  onOpen,
}: {
  classes: { id: string; name: string; activeGameId: string | null }[];
  onOpen: (gameId: string) => void;
}) {
  const [classId, setClassId] = useState(classes[0]?.id ?? '');
  const [questionSet, setQuestionSet] = useState<'hiragana' | 'katakana' | 'kanji'>('hiragana');
  const [durationMin, setDurationMin] = useState(10);
  const [nameMode, setNameMode] = useState<'free' | 'preset'>('preset');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!classes.length) {
    return (
      <Box>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Create a class first</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Class games are played by the students in your class. Create a class in the{' '}
          <Link to="/teacher-dashboard" className="text-indigo-600 underline">Teacher Dashboard</Link>.
        </p>
      </Box>
    );
  }

  const selected = classes.find((c) => c.id === classId);

  const create = async () => {
    if (selected?.activeGameId && !window.confirm('This class already has an open game. Close it and start a new one?')) return;
    setBusy(true);
    setError(null);
    try {
      const res = await yamatoFetch(`${YAMATO_API_BASE}/api/live-game/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId, questionSet, durationMin, nameMode }),
      });
      const data = (await res.json().catch(() => ({}))) as { gameId?: string; message?: string; error?: string };
      if (!res.ok || !data.gameId) throw new Error(data.message || data.error || `HTTP ${res.status}`);
      onOpen(data.gameId);
    } catch (err: any) {
      setError(err?.message || 'Could not create the game.');
    } finally {
      setBusy(false);
    }
  };

  const option = (active: boolean) =>
    `px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition cursor-pointer ${
      active ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
    }`;

  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6">
      <div>
        <p className="text-xs font-bold tracking-widest text-indigo-500">CLASS LIVE GAME</p>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Start a game for your class</h1>
        <p className="text-sm text-slate-500 mt-1">
          Only students in the class you choose can join — there is no code to share. Scores are kept on the server, so they
          can't be changed from a student's device. This game works even when class games are locked.
        </p>
      </div>

      {classes.length > 1 && (
        <Field label="Class">
          <select value={classId} onChange={(e) => setClassId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900">
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
      )}

      <Field label="Questions">
        <div className="flex flex-wrap gap-2">
          {(['hiragana', 'katakana', 'kanji'] as const).map((s) => (
            <button key={s} type="button" onClick={() => setQuestionSet(s)} className={option(questionSet === s)}>
              {QUESTION_SET_LABELS[s]}
            </button>
          ))}
        </div>
        {questionSet === 'kanji' && <p className="text-xs text-slate-500 mt-2">Readings and meanings are mixed.</p>}
      </Field>

      <Field label={`Time: ${durationMin} min`}>
        <input
          type="range"
          min={1}
          max={15}
          value={durationMin}
          onChange={(e) => setDurationMin(Number(e.target.value))}
          className="w-full accent-indigo-600"
        />
      </Field>

      <Field label="Display names">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setNameMode('preset')} className={option(nameMode === 'preset')}>
            Names chosen by AI Yamato
          </button>
          <button type="button" onClick={() => setNameMode('free')} className={option(nameMode === 'free')}>
            Students choose their names
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          {nameMode === 'preset'
            ? 'Each student gets a fun name like “Onigiri” or “Tanuki”.'
            : 'Students type a name (up to 12 characters). You can rename or remove anyone.'}
        </p>
      </Field>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex flex-wrap gap-2 justify-end">
        {selected?.activeGameId && (
          <button
            type="button"
            onClick={() => onOpen(selected.activeGameId!)}
            className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 text-sm font-bold rounded-xl cursor-pointer hover:bg-slate-50"
          >
            Return to the open game
          </button>
        )}
        <button type="button" disabled={busy} onClick={create} className={`${primaryBtn} disabled:opacity-50`}>
          {busy ? 'Creating…' : 'Create game room'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">{label}</p>
      {children}
    </div>
  );
}
