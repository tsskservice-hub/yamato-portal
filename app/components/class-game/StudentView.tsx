/**
 * @file StudentView.tsx
 * @description クラスのライブゲーム：生徒の画面
 *
 * この画面は「表示」と「どれを選んだか」を送るだけ。正解かどうか・金貨・宝箱の中身は、
 * すべてサーバーから届いた結果をそのまま表示する（ここで書き換えても点数は変わらない）。
 */
import React, { useEffect, useRef, useState } from 'react';
import { Box, Spinner, nameReason, primaryBtn } from './HostView';
import { CLOSED_MESSAGES, QUESTION_SET_LABELS, formatClock, useCountdown, useLiveGameSocket } from './useLiveGameSocket';

type StudentState = {
  status: 'lobby' | 'running' | 'ended';
  endsAt: number;
  className: string;
  questionSet: string;
  nameMode: 'free' | 'preset';
  name: string | null;
  coins: number;
  chestPending: boolean;
};

type PublicQuestion = {
  qid: string;
  label: string;
  prompt: string;
  promptIsJapanese: boolean;
  options: string[];
  optionsAreJapanese: boolean;
};

type Result = { qid: string; correct: boolean; correctIndex: number; chest: boolean };
type ChestResult = { box: number; item: { name: string; nameJa: string; description: string }; before: number; coins: number };
type Final = { coins: number; correct: number; answered: number; rank: number | null; total: number; top: { name: string; coins: number }[] };

/** 正解・不正解を見せる時間 */
const RESULT_MS = 900;
const CHEST_RESULT_MS = 2200;

export function StudentView({ gameId }: { gameId: string }) {
  const [state, setState] = useState<StudentState | null>(null);
  const [offset, setOffset] = useState(0);
  const [question, setQuestion] = useState<PublicQuestion | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [chestOpen, setChestOpen] = useState(false);
  const [chestResult, setChestResult] = useState<ChestResult | null>(null);
  const [final, setFinal] = useState<Final | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const { status: socketStatus, closedCode, send } = useLiveGameSocket(gameId, (msg) => {
    switch (msg.t) {
      case 'student':
        setOffset(msg.now - Date.now());
        setState(msg);
        if (msg.chestPending) setChestOpen(true);
        break;
      case 'question':
        setQuestion(msg);
        setPicked(null);
        setResult(null);
        break;
      case 'tooFast':
        setPicked(null);
        break;
      case 'result':
        setResult(msg);
        setState((s) => (s ? { ...s, coins: msg.coins } : s));
        later(() => {
          if (msg.chest) {
            setChestOpen(true);
          } else {
            send({ t: 'next' });
          }
        }, RESULT_MS);
        break;
      case 'chestResult':
        setChestResult(msg);
        setState((s) => (s ? { ...s, coins: msg.coins } : s));
        later(() => {
          setChestResult(null);
          setChestOpen(false);
          send({ t: 'next' });
        }, CHEST_RESULT_MS);
        break;
      case 'final':
        setFinal(msg);
        setQuestion(null);
        setState((s) => (s ? { ...s, status: 'ended', coins: msg.coins } : s));
        break;
      case 'nameRejected':
        setNameError(nameReason(msg.reason));
        break;
    }
  });
  const left = useCountdown(state?.status === 'running' ? state.endsAt : 0, offset);

  if (socketStatus === 'closed' && !final) {
    return (
      <Box>
        <p className="text-slate-700 dark:text-slate-300">{CLOSED_MESSAGES[closedCode ?? ''] ?? 'The game was closed.'}</p>
      </Box>
    );
  }
  if (!state) return <Spinner text="Joining the game…" />;

  // 結果発表
  if (final) {
    return (
      <Box>
        <p className="text-xs font-bold tracking-widest text-indigo-500">GAME OVER</p>
        <p className="text-5xl font-black text-amber-500">🪙 {final.coins}</p>
        {final.rank && (
          <p className="text-xl font-bold text-slate-800 dark:text-white">
            You came #{final.rank} of {final.total}!
          </p>
        )}
        <p className="text-sm text-slate-500">
          {final.correct} correct out of {final.answered}
        </p>
        <ol className="text-left max-w-xs mx-auto space-y-1">
          {final.top.map((t, i) => (
            <li key={i} className="flex justify-between text-sm">
              <span className="font-bold text-slate-700 dark:text-slate-200">
                {['🥇', '🥈', '🥉', '4.', '5.'][i]} {t.name}
              </span>
              <span className="text-amber-600 font-bold">🪙 {t.coins}</span>
            </li>
          ))}
        </ol>
      </Box>
    );
  }

  // 名前を決める（自由モード）
  if (!state.name) {
    return (
      <Box>
        <p className="text-xs font-bold tracking-widest text-indigo-500">{state.className}</p>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Choose your game name</h2>
        <p className="text-sm text-slate-500">Up to 12 characters. Your teacher can see who you are.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setNameError(null);
            send({ t: 'setName', name: nameInput });
          }}
          className="flex gap-2 justify-center"
        >
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            maxLength={12}
            autoFocus
            className="flex-1 max-w-[220px] px-3 py-2 border border-slate-300 rounded-xl text-slate-900"
          />
          <button type="submit" className={primaryBtn}>OK</button>
        </form>
        {nameError && <p className="text-sm text-rose-600">{nameError}</p>}
      </Box>
    );
  }

  const header = (
    <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3">
      <div className="min-w-0">
        <p className="text-[11px] text-slate-500 truncate">{state.className} · {QUESTION_SET_LABELS[state.questionSet]}</p>
        <p className="font-bold text-slate-800 dark:text-white truncate">{state.name}</p>
      </div>
      {state.status === 'running' && <p className="text-2xl font-black tabular-nums text-indigo-600">{formatClock(left)}</p>}
      <p className="text-2xl font-black text-amber-500 tabular-nums">🪙 {state.coins}</p>
    </div>
  );

  // 待合
  if (state.status === 'lobby') {
    return (
      <div className="max-w-xl mx-auto space-y-4">
        {header}
        <Box>
          <p className="text-lg font-bold text-slate-800 dark:text-white">You're in! 🎉</p>
          <p className="text-slate-600 dark:text-slate-300">
            You are <span className="font-black text-indigo-600">{state.name}</span>. Wait for your teacher to start.
          </p>
          {socketStatus !== 'open' && <p className="text-xs text-amber-600">Reconnecting…</p>}
        </Box>
      </div>
    );
  }

  // 宝箱
  if (chestOpen) {
    return (
      <div className="max-w-xl mx-auto space-y-4">
        {header}
        <Box>
          {chestResult ? (
            <>
              <p className="text-sm text-slate-500">You found…</p>
              <p className="text-3xl font-black text-slate-900 dark:text-white">{chestResult.item.nameJa}</p>
              <p className="text-lg font-bold text-indigo-600">{chestResult.item.name}</p>
              <p className="text-slate-700 dark:text-slate-300">{chestResult.item.description}</p>
              <p className="text-2xl font-black text-amber-500">
                🪙 {chestResult.before} → {chestResult.coins}
              </p>
            </>
          ) : (
            <>
              <p className="text-xl font-bold text-slate-800 dark:text-white">Treasure! Pick a chest 🎁</p>
              <div className="flex justify-center gap-3">
                {[0, 1, 2].map((box) => (
                  <button
                    key={box}
                    type="button"
                    onClick={() => send({ t: 'openChest', box })}
                    className="text-6xl p-3 rounded-2xl border-2 border-amber-300 bg-amber-50 hover:bg-amber-100 hover:scale-105 transition cursor-pointer"
                  >
                    🧰
                  </button>
                ))}
              </div>
            </>
          )}
        </Box>
      </div>
    );
  }

  // 問題
  return (
    <div className="max-w-xl mx-auto space-y-4">
      {header}
      {!question ? (
        <Spinner text="Next question…" />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
          <p className="text-center text-sm font-bold text-slate-500">{question.label}</p>
          <p className={`text-center font-black text-slate-900 dark:text-white ${question.promptIsJapanese ? 'text-7xl' : 'text-5xl'}`}>
            {question.prompt}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {question.options.map((opt, i) => {
              let tone = 'border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 text-slate-800';
              if (result) {
                if (i === result.correctIndex) tone = 'border-emerald-400 bg-emerald-50 text-emerald-800';
                else if (i === picked) tone = 'border-rose-400 bg-rose-50 text-rose-800';
                else tone = 'border-slate-200 bg-slate-50 text-slate-400';
              } else if (picked === i) {
                tone = 'border-indigo-400 bg-indigo-50 text-indigo-800';
              }
              return (
                <button
                  key={i}
                  type="button"
                  disabled={picked !== null}
                  onClick={() => {
                    setPicked(i);
                    send({ t: 'answer', qid: question.qid, choice: i });
                  }}
                  className={`min-h-[64px] rounded-2xl border-2 px-3 py-3 font-bold transition cursor-pointer disabled:cursor-default ${tone} ${
                    question.optionsAreJapanese ? 'text-2xl' : 'text-lg'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          {result && (
            <p className={`text-center text-lg font-black ${result.correct ? 'text-emerald-600' : 'text-rose-600'}`}>
              {result.correct ? '+1 🪙 Correct!' : 'Not quite!'}
            </p>
          )}
        </div>
      )}
      {socketStatus !== 'open' && <p className="text-center text-xs text-amber-600">Reconnecting…</p>}
    </div>
  );
}
