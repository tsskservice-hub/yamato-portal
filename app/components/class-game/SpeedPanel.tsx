/**
 * @file SpeedPanel.tsx
 * @description クラスのライブゲーム：早押しタイム（ペアの対決）の画面
 *
 * 2 人に同じ問題が同時に届き、サーバーに正解が先に届いたほうの勝ち。
 * 勝ち負け・金貨・正解の番号は、すべてサーバーから届いたものを表示するだけ。
 */
import React, { useEffect, useState } from 'react';

export type SpeedStart = {
  matchId: string;
  opponentName: string;
  question: {
    qid: string;
    label: string;
    prompt: string;
    promptIsJapanese: boolean;
    options: string[];
    optionsAreJapanese: boolean;
  };
  /** サーバーの時計での締め切り */
  deadline: number;
  wrong: boolean;
};

export type SpeedResult = {
  matchId: string;
  outcome: 'win' | 'lose' | 'draw';
  delta: number;
  coins: number;
  correctIndex: number;
  opponentName: string;
};

export function SpeedPanel({
  match,
  result,
  wrong,
  offset,
  onAnswer,
}: {
  match: SpeedStart;
  result: SpeedResult | null;
  wrong: boolean;
  /** サーバーの時計 − 端末の時計 */
  offset: number;
  onAnswer: (choice: number) => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now() + offset), 100);
    return () => clearInterval(timer);
  }, [offset]);
  const secondsLeft = Math.max(0, Math.ceil((match.deadline - now) / 1000));
  const q = match.question;
  const locked = picked !== null || wrong || result !== null;

  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-amber-300 rounded-2xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-lg font-black text-amber-600">⚡ Speed round!</p>
        {!result && <p className="text-2xl font-black tabular-nums text-amber-600">{secondsLeft}</p>}
      </div>
      <p className="text-center text-sm font-bold text-slate-600 dark:text-slate-300">
        vs <span className="text-slate-900 dark:text-white">{match.opponentName}</span> — first correct answer wins!
      </p>
      <p className="text-center text-sm font-bold text-slate-500">{q.label}</p>
      <p className={`text-center font-black text-slate-900 dark:text-white ${q.promptIsJapanese ? 'text-7xl' : 'text-5xl'}`}>{q.prompt}</p>
      <div className="grid grid-cols-2 gap-3">
        {q.options.map((opt, i) => {
          let tone = 'border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-300 text-slate-800';
          if (result) {
            if (i === result.correctIndex) tone = 'border-emerald-400 bg-emerald-50 text-emerald-800';
            else if (i === picked) tone = 'border-rose-400 bg-rose-50 text-rose-800';
            else tone = 'border-slate-200 bg-slate-50 text-slate-400';
          } else if (picked === i) {
            tone = wrong ? 'border-rose-400 bg-rose-50 text-rose-800' : 'border-amber-400 bg-amber-50 text-amber-800';
          } else if (locked) {
            tone = 'border-slate-200 bg-slate-50 text-slate-400';
          }
          return (
            <button
              key={i}
              type="button"
              disabled={locked}
              onClick={() => {
                setPicked(i);
                onAnswer(i);
              }}
              className={`min-h-[64px] rounded-2xl border-2 px-3 py-3 font-bold transition cursor-pointer disabled:cursor-default ${tone} ${
                q.optionsAreJapanese ? 'text-2xl' : 'text-lg'
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {!result && wrong && <p className="text-center font-bold text-rose-600">Not quite! Waiting for {match.opponentName}…</p>}
      {result && (
        <p
          className={`text-center text-2xl font-black ${
            result.outcome === 'win' ? 'text-emerald-600' : result.outcome === 'lose' ? 'text-rose-600' : 'text-slate-600'
          }`}
        >
          {result.outcome === 'win'
            ? `You were faster! +${result.delta} 🪙`
            : result.outcome === 'lose'
            ? `${result.opponentName} was faster… ${result.delta} 🪙`
            : 'Draw! Nothing happens.'}
        </p>
      )}
    </div>
  );
}

/** speedTooFast を受けたとき、選び直せるように panel を作り直すためのキー */
export function speedPanelKey(matchId: string, retry: number) {
  return `${matchId}-${retry}`;
}
