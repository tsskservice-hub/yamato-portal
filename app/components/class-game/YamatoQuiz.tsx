/**
 * @file YamatoQuiz.tsx
 * @description クラスのライブゲーム：ヤマトの問題（クラス全員）の画面
 *
 * 合図：画面が暗くなり、ヤマトのマーク（サイトのアイコン）だけが現れる。ヤマトは姿を見せない。
 * 少しするとマークが上に移り、問題が開く。正解の番号は締め切りまでサーバーから届かない。
 * 生徒用（StudentYamato）と、プロジェクター用（HostYamato）がある。
 */
import React, { useEffect, useState } from 'react';

export type YamatoQuestion = {
  qid: string;
  label: string;
  prompt: string;
  promptIsJapanese: boolean;
  options: string[];
  optionsAreJapanese: boolean;
};

export type YamatoStart = {
  roundId: string;
  question: YamatoQuestion;
  /** サーバーの時計で、問題が開く時刻 */
  opensAt: number;
  deadline: number;
  answered: boolean;
};

export type YamatoAnswered = { roundId: string; correct: boolean; rank: number | null; reward: number };
export type YamatoEnd = { roundId: string; correctIndex: number; top: { name: string; reward: number }[] };

const MARK_SRC = '/jptutoraiyamato.png';

/** 「問題です」の合図の音声（ブラウザの日本語読み上げ。無い端末では音なし） */
export function sayMondaiDesu() {
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance('問題です');
    u.lang = 'ja-JP';
    u.rate = 0.9;
    u.pitch = 0.8;
    const ja = window.speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith('ja'));
    if (ja) u.voice = ja;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {
    // 音が出せなくてもゲームは続ける
  }
}

function useServerNow(offset: number) {
  const [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now() + offset), 100);
    return () => clearInterval(timer);
  }, [offset]);
  return now;
}

/** 暗い画面と、現れるマーク。open になるとマークが上に移る */
function DarkStage({ open, children }: { open: boolean; children?: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="fixed inset-0 z-[60] bg-slate-950 text-white overflow-y-auto">
      <div className="min-h-full flex flex-col items-center px-4 py-6">
        <img
          src={MARK_SRC}
          alt="AI Yamato"
          className="transition-all ease-out"
          style={{
            transitionDuration: '1200ms',
            opacity: visible ? 1 : 0,
            width: open ? 56 : 160,
            height: open ? 56 : 160,
            marginTop: open ? 0 : '30vh',
            filter: visible ? 'drop-shadow(0 0 24px rgba(255,255,255,0.35))' : 'none',
          }}
        />
        {children}
      </div>
    </div>
  );
}

function OptionGrid({
  q,
  picked,
  correctIndex,
  disabled,
  onPick,
  large = false,
}: {
  q: YamatoQuestion;
  picked: number | null;
  correctIndex: number | null;
  disabled: boolean;
  onPick?: (i: number) => void;
  large?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 w-full">
      {q.options.map((opt, i) => {
        let tone = 'border-white/20 bg-white/5 hover:bg-white/15 text-white';
        if (correctIndex !== null) {
          tone = i === correctIndex ? 'border-emerald-400 bg-emerald-500/30 text-white' : i === picked ? 'border-rose-400 bg-rose-500/20 text-white/70' : 'border-white/10 bg-white/5 text-white/40';
        } else if (picked === i) {
          tone = 'border-amber-300 bg-amber-400/20 text-white';
        } else if (disabled) {
          tone = 'border-white/10 bg-white/5 text-white/40';
        }
        return (
          <button
            key={i}
            type="button"
            disabled={disabled || !onPick}
            onClick={() => onPick?.(i)}
            className={`rounded-2xl border-2 px-3 py-3 font-bold transition cursor-pointer disabled:cursor-default ${tone} ${
              large ? 'min-h-[88px] text-3xl' : `min-h-[64px] ${q.optionsAreJapanese ? 'text-2xl' : 'text-lg'}`
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function TopList({ top }: { top: { name: string; reward: number }[] }) {
  if (!top.length) return <p className="text-white/60 text-center">No correct answers yet…</p>;
  return (
    <ol className="w-full space-y-1">
      {top.map((t, i) => (
        <li key={i} className="flex justify-between rounded-lg bg-white/5 px-3 py-1.5">
          <span className="font-bold">
            {i + 1}. {t.name}
          </span>
          <span className="font-black text-amber-300">+{t.reward} 🪙</span>
        </li>
      ))}
    </ol>
  );
}

export function StudentYamato({
  round,
  answered,
  end,
  offset,
  onAnswer,
}: {
  round: YamatoStart;
  answered: YamatoAnswered | null;
  end: YamatoEnd | null;
  offset: number;
  onAnswer: (choice: number) => void;
}) {
  const now = useServerNow(offset);
  const [picked, setPicked] = useState<number | null>(null);
  const open = now >= round.opensAt;
  const secondsLeft = Math.max(0, Math.ceil((round.deadline - now) / 1000));
  const q = round.question;

  return (
    <DarkStage open={open}>
      {open && (
        <div className="w-full max-w-xl space-y-5 mt-6">
          <div className="flex items-center justify-between text-white/70 text-sm font-bold">
            <span>{q.label}</span>
            {!end && <span className="text-2xl font-black text-amber-300 tabular-nums">{secondsLeft}</span>}
          </div>
          <p className={`text-center font-black ${q.promptIsJapanese ? 'text-7xl' : 'text-2xl sm:text-3xl leading-snug'}`}>{q.prompt}</p>
          <OptionGrid
            q={q}
            picked={picked}
            correctIndex={end ? end.correctIndex : null}
            disabled={picked !== null || round.answered || !!answered || !!end}
            onPick={(i) => {
              setPicked(i);
              onAnswer(i);
            }}
          />
          {!end && answered && (
            <p className={`text-center text-xl font-black ${answered.correct ? 'text-emerald-300' : 'text-white/70'}`}>
              {answered.correct
                ? answered.reward > 0
                  ? `Correct! You were #${answered.rank} — +${answered.reward} 🪙`
                  : `Correct! (#${answered.rank} — only the top 10 get coins)`
                : 'Answer received… wait for the result.'}
            </p>
          )}
          {!end && !answered && round.answered && <p className="text-center text-white/70">Answer received… wait for the result.</p>}
          {end && (
            <div className="space-y-3">
              <p className="text-center font-bold text-white/80">Fastest correct answers</p>
              <TopList top={end.top} />
            </div>
          )}
        </div>
      )}
    </DarkStage>
  );
}

export type YamatoHostState = {
  roundId: string;
  question: YamatoQuestion;
  opensAt: number;
  deadline: number;
  ended: boolean;
  correctIndex: number | null;
  answeredCount: number;
  top: { name: string; reward: number }[];
};

/** プロジェクター用：問題と、正解した人が 1 位から順に並んでいく様子 */
export function HostYamato({ round, offset, playerCount }: { round: YamatoHostState; offset: number; playerCount: number }) {
  const now = useServerNow(offset);
  const open = now >= round.opensAt;
  const secondsLeft = Math.max(0, Math.ceil((round.deadline - now) / 1000));
  const q = round.question;
  useEffect(() => {
    sayMondaiDesu();
  }, [round.roundId]);

  return (
    <DarkStage open={open}>
      {open && (
        <div className="w-full max-w-5xl grid gap-8 lg:grid-cols-[3fr_2fr] mt-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between text-white/70 font-bold">
              <span>{q.label}</span>
              <span className="text-4xl font-black text-amber-300 tabular-nums">{round.ended ? '' : secondsLeft}</span>
            </div>
            <p className={`text-center font-black ${q.promptIsJapanese ? 'text-9xl' : 'text-4xl leading-snug'}`}>{q.prompt}</p>
            <OptionGrid q={q} picked={null} correctIndex={round.correctIndex} disabled large={!q.optionsAreJapanese ? false : true} />
            <p className="text-center text-white/60">
              {round.answeredCount} / {playerCount} answered
            </p>
          </div>
          <div className="space-y-3">
            <p className="font-bold text-white/80">Fastest correct answers</p>
            <TopList top={round.top} />
          </div>
        </div>
      )}
    </DarkStage>
  );
}
