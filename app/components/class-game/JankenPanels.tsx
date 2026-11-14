/**
 * @file JankenPanels.tsx
 * @description クラスのライブゲーム：じゃんけん勝負の画面（相手を選ぶ／手を選ぶ／同時に開く）
 *
 * 勝ち負けと金貨の移動はサーバーが決める。この画面は、サーバーが指定した時刻（revealAt）に
 * 「じゃんけんぽん！」の音声と両方の手を出すだけ。相手の手は、その時まで端末に届かない。
 */
import React, { useEffect, useState } from 'react';

export type Hand = 'rock' | 'scissors' | 'paper';
export type JankenTarget = { pid: string; name: string; coins: number };
export type DuelStart = {
  duelId: string;
  role: 'challenger' | 'challenged';
  opponentName: string;
  /** サーバーの時計での締め切り */
  deadline: number;
  chosen: boolean;
};
export type DuelResult = {
  duelId: string;
  yourHand: Hand;
  opponentHand: Hand;
  opponentName: string;
  outcome: 'win' | 'lose' | 'draw';
  delta: number;
  coins: number;
  /** サーバーの時計で、手を見せる時刻 */
  revealAt: number;
};

export const HAND_EMOJI: Record<Hand, string> = { rock: '✊', scissors: '✌️', paper: '✋' };
const HAND_LABEL: Record<Hand, string> = { rock: 'Guu', scissors: 'Choki', paper: 'Paa' };
const HANDS: Hand[] = ['rock', 'scissors', 'paper'];

/** 「じゃんけんぽん！」の音声。ブラウザの読み上げ（日本語）を使う。読み上げがない端末では音なし */
export const JANKEN_VOICE_LEAD_MS = 1200;
export function sayJankenPon() {
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance('じゃんけんぽん！');
    u.lang = 'ja-JP';
    u.rate = 1.15;
    const ja = window.speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith('ja'));
    if (ja) u.voice = ja;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {
    // 音が出せなくてもゲームは続ける
  }
}

export function JankenTargetPicker({
  targets,
  failed,
  onChallenge,
  onSkip,
  onRefresh,
}: {
  targets: JankenTarget[];
  failed: boolean;
  onChallenge: (pid: string) => void;
  onSkip: () => void;
  onRefresh: () => void;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-rose-300 rounded-2xl p-6 space-y-4 text-center">
      <p className="text-4xl">✊✌️✋</p>
      <h2 className="text-2xl font-black text-slate-900 dark:text-white">じゃんけん勝負！</h2>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Choose someone to challenge. The loser gives <b>half of their coins</b> to the winner — that could be you, so choose
        carefully! A draw means nothing happens.
      </p>
      {failed && <p className="text-sm text-amber-600">That person can't be challenged right now. Choose someone else.</p>}
      {targets.length ? (
        <div className="grid grid-cols-2 gap-2">
          {targets.map((t) => (
            <button
              key={t.pid}
              type="button"
              onClick={() => onChallenge(t.pid)}
              className="rounded-xl border-2 border-slate-200 hover:border-rose-400 hover:bg-rose-50 px-3 py-3 cursor-pointer transition"
            >
              <span className="block font-bold text-slate-800 dark:text-white truncate">{t.name}</span>
              <span className="block text-sm font-black text-amber-600">🪙 {t.coins}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">No one can be challenged right now.</p>
      )}
      <div className="flex justify-center gap-2">
        <button type="button" onClick={onRefresh} className="px-4 py-2 text-sm font-bold rounded-xl border border-slate-300 text-slate-600 cursor-pointer">
          Refresh
        </button>
        <button type="button" onClick={onSkip} className="px-4 py-2 text-sm font-bold rounded-xl bg-slate-100 text-slate-600 cursor-pointer">
          Skip
        </button>
      </div>
    </div>
  );
}

export function JankenDuel({
  duel,
  result,
  offset,
  onHand,
}: {
  duel: DuelStart;
  result: DuelResult | null;
  /** サーバーの時計 − 端末の時計 */
  offset: number;
  onHand: (hand: Hand) => void;
}) {
  const [mine, setMine] = useState<Hand | null>(null);
  const [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now() + offset), 100);
    return () => clearInterval(timer);
  }, [offset]);

  const secondsLeft = Math.max(0, Math.ceil((duel.deadline - now) / 1000));
  const revealed = result !== null && now >= result.revealAt;
  const chosen = mine !== null || duel.chosen;

  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-rose-300 rounded-2xl p-6 space-y-5 text-center">
      <p className="text-sm font-bold text-rose-600">
        {duel.role === 'challenged' ? `${duel.opponentName} challenged you!` : `You challenged ${duel.opponentName}!`}
      </p>

      {!result && (
        <>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Choose your hand</h2>
          <div className="flex justify-center gap-3">
            {HANDS.map((h) => (
              <button
                key={h}
                type="button"
                disabled={chosen}
                onClick={() => {
                  setMine(h);
                  onHand(h);
                }}
                className={`w-24 h-24 rounded-2xl border-2 text-5xl transition cursor-pointer disabled:cursor-default ${
                  mine === h ? 'border-rose-500 bg-rose-50 scale-105' : chosen ? 'border-slate-200 opacity-40' : 'border-slate-200 hover:border-rose-400 hover:bg-rose-50'
                }`}
              >
                {HAND_EMOJI[h]}
                <span className="block text-xs font-bold text-slate-500">{HAND_LABEL[h]}</span>
              </button>
            ))}
          </div>
          <p className="text-sm text-slate-500">
            {chosen ? `Waiting for ${duel.opponentName}…` : `${secondsLeft} s — if you don't choose, a hand is picked for you.`}
          </p>
        </>
      )}

      {result && !revealed && <p className="text-4xl font-black text-rose-600 animate-pulse py-10">じゃんけん…</p>}

      {result && revealed && (
        <>
          <p className="text-3xl font-black text-rose-600">ぽん！</p>
          <div className="flex items-center justify-center gap-6">
            <div>
              <p className="text-7xl">{HAND_EMOJI[result.yourHand]}</p>
              <p className="text-sm font-bold text-slate-600">You</p>
            </div>
            <p className="text-xl font-black text-slate-400">vs</p>
            <div>
              <p className="text-7xl">{HAND_EMOJI[result.opponentHand]}</p>
              <p className="text-sm font-bold text-slate-600 truncate max-w-[8rem]">{result.opponentName}</p>
            </div>
          </div>
          <p
            className={`text-2xl font-black ${
              result.outcome === 'win' ? 'text-emerald-600' : result.outcome === 'lose' ? 'text-rose-600' : 'text-slate-600'
            }`}
          >
            {result.outcome === 'win'
              ? `You win! +${result.delta} 🪙`
              : result.outcome === 'lose'
              ? `You lose… ${result.delta} 🪙`
              : 'Draw! Nothing happens.'}
          </p>
        </>
      )}
    </div>
  );
}
