/**
 * @file StudentView.tsx
 * @description クラスのライブゲーム：生徒の画面
 *
 * この画面は「表示」と「どれを選んだか」を送るだけ。正解かどうか・金貨・宝箱の中身は、
 * すべてサーバーから届いた結果をそのまま表示する（ここで書き換えても点数は変わらない）。
 * みんなでジグソー（mode = 'jigsaw'）では、正解するとピースが届き、盤面の空いているマスをタップして置く。
 */
import React, { useEffect, useRef, useState } from 'react';
import { Box, Spinner, nameReason, primaryBtn } from './HostView';
import { CLOSED_MESSAGES, QUESTION_SET_LABELS, formatClock, useCountdown, useLiveGameSocket } from './useLiveGameSocket';
import {
  JANKEN_VOICE_LEAD_MS,
  JankenDuel,
  JankenTargetPicker,
  sayJankenPon,
  type DuelResult,
  type DuelStart,
  type JankenTarget,
} from './JankenPanels';
import { SpeedPanel, speedPanelKey, type SpeedResult, type SpeedStart } from './SpeedPanel';
import { StudentYamato, sayMondaiDesu, type YamatoAnswered, type YamatoEnd, type YamatoStart } from './YamatoQuiz';
import { JigsawBoard, JigsawBoxPicture, progressPercent, type JigsawBoardInfo } from './Jigsaw';

type StudentState = {
  status: 'lobby' | 'running' | 'ended';
  endsAt: number;
  className: string;
  questionSet: string;
  nameMode: 'free' | 'preset';
  name: string | null;
  coins: number;
  chestPending: boolean;
  jankenCard?: boolean;
  mode?: 'coins' | 'jigsaw';
  contributions?: number;
  jigsaw?: JigsawBoardInfo | null;
};

/** ジグソー：いま持っているピース */
type HeldPiece = { pid: string; data: string; expiresAt: number };

type PublicQuestion = {
  qid: string;
  label: string;
  prompt: string;
  promptIsJapanese: boolean;
  options: string[];
  optionsAreJapanese: boolean;
};

type Result = { qid: string; correct: boolean; correctIndex: number; chest: boolean };
type ChestResult = {
  box: number;
  item: { id: string; name: string; nameJa: string; description: string };
  before: number;
  coins: number;
  targets?: JankenTarget[];
  noTargets?: boolean;
};
type Final = {
  mode?: 'coins' | 'jigsaw';
  contributions?: number;
  jigsaw?: JigsawBoardInfo | null;
  coins: number;
  correct: number;
  answered: number;
  rank: number | null;
  total: number;
  top: { name: string; coins: number; contributions?: number }[];
};

/** 正解・不正解を見せる時間 */
const RESULT_MS = 900;
const CHEST_RESULT_MS = 2200;
/** じゃんけんの結果を見せる時間 */
const DUEL_RESULT_MS = 3000;
/** 早押しタイムの結果を見せる時間 */
const SPEED_RESULT_MS = 2500;
/** ヤマトの問題が終わったあと、正解と上位を見せる時間 */
const YAMATO_END_MS = 4000;
/** 早押しタイムでお休みになったお知らせを見せる時間 */
const NOTICE_MS = 3500;

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
  const [jankenTargets, setJankenTargets] = useState<JankenTarget[] | null>(null);
  const [targetsFailed, setTargetsFailed] = useState(false);
  const [duel, setDuel] = useState<DuelStart | null>(null);
  const [duelResult, setDuelResult] = useState<DuelResult | null>(null);
  const [speed, setSpeed] = useState<SpeedStart | null>(null);
  const [speedResult, setSpeedResult] = useState<SpeedResult | null>(null);
  const [speedWrong, setSpeedWrong] = useState(false);
  const [speedRetry, setSpeedRetry] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [yamato, setYamato] = useState<YamatoStart | null>(null);
  const [yamatoAnswered, setYamatoAnswered] = useState<YamatoAnswered | null>(null);
  const [yamatoEnd, setYamatoEnd] = useState<YamatoEnd | null>(null);
  const [yamatoRetry, setYamatoRetry] = useState(0);
  const [held, setHeld] = useState<HeldPiece | null>(null);
  const [wrongSlot, setWrongSlot] = useState<number | null>(null);
  const lastPickRef = useRef<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const { status: socketStatus, closedCode, send } = useLiveGameSocket(gameId, (msg) => {
    switch (msg.t) {
      case 'student':
        setOffset(msg.now - Date.now());
        setState(msg);
        if (msg.chestPending) setChestOpen(true);
        if (msg.jankenCard) send({ t: 'refreshTargets' });
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
        if (msg.piece) break; // ジグソー：このあと届くピースを置く
        if (msg.bagEmpty) {
          setNotice('🧩 All the pieces are in other hands right now — keep answering!');
          later(() => setNotice(null), NOTICE_MS);
        }
        later(() => {
          if (msg.chest) {
            setChestOpen(true);
          } else {
            send({ t: 'next' });
          }
        }, RESULT_MS);
        break;
      case 'piece':
        setOffset(msg.now - Date.now());
        setWrongSlot(null);
        setHeld({ pid: msg.pid, data: msg.data, expiresAt: msg.expiresAt });
        break;
      case 'placeResult':
        setHeld(null);
        if (msg.correct) {
          setState((s) => (s ? { ...s, contributions: msg.contributions } : s));
          setNotice('🧩 Perfect fit! +1 contribution');
        } else {
          setWrongSlot(lastPickRef.current);
          setNotice("🧩 That piece doesn't go there — it went back to the bag.");
        }
        later(() => setNotice(null), NOTICE_MS);
        later(() => setWrongSlot(null), 1200);
        send({ t: 'next' });
        break;
      case 'pieceGone':
        setHeld(null);
        setNotice(msg.reason === 'TIMEOUT' ? '🧩 Time ran out — the piece went back to the bag.' : '🧩 You passed. The piece went back to the bag.');
        later(() => setNotice(null), NOTICE_MS);
        send({ t: 'next' });
        break;
      case 'placed':
        setState((s) =>
          s && s.jigsaw && !s.jigsaw.placed.includes(msg.slot) ? { ...s, jigsaw: { ...s.jigsaw, placed: [...s.jigsaw.placed, msg.slot] } } : s
        );
        break;
      case 'chestResult':
        setChestResult(msg);
        setState((s) => (s ? { ...s, coins: msg.coins } : s));
        later(() => {
          setChestResult(null);
          setChestOpen(false);
          if (msg.targets) {
            // じゃんけん勝負のカード：相手を選ぶ画面へ
            setTargetsFailed(false);
            setJankenTargets(msg.targets);
          } else {
            send({ t: 'next' });
          }
        }, CHEST_RESULT_MS);
        break;
      case 'jankenTargets':
        setJankenTargets(msg.targets);
        setTargetsFailed(Boolean(msg.failed));
        break;
      case 'duelStart':
        setOffset(msg.now - Date.now());
        setJankenTargets(null);
        setDuelResult(null);
        setDuel(msg);
        break;
      case 'duelResult': {
        setOffset(msg.now - Date.now());
        setDuelResult(msg);
        const offsetNow = msg.now - Date.now();
        const revealIn = msg.revealAt - (Date.now() + offsetNow);
        // 「じゃんけんぽん！」の「ぽん」と、手が開く時刻をそろえる
        later(sayJankenPon, Math.max(0, revealIn - JANKEN_VOICE_LEAD_MS));
        later(() => setState((s) => (s ? { ...s, coins: msg.coins } : s)), Math.max(0, revealIn));
        later(() => {
          setDuel(null);
          setDuelResult(null);
          send({ t: 'next' });
        }, Math.max(0, revealIn) + DUEL_RESULT_MS);
        break;
      }
      case 'duelCancelled':
        setDuel(null);
        setDuelResult(null);
        send({ t: 'next' });
        break;
      case 'speedStart':
        setOffset(msg.now - Date.now());
        setSpeedResult(null);
        setSpeedWrong(Boolean(msg.wrong));
        setSpeed(msg);
        break;
      case 'speedTooFast':
        // 速すぎて数えられなかった。選び直せるようにする
        setSpeedRetry((n) => n + 1);
        break;
      case 'speedWrong':
        setSpeedWrong(true);
        break;
      case 'speedResult':
        setSpeedResult(msg);
        setState((s) => (s ? { ...s, coins: msg.coins } : s));
        later(() => {
          setSpeed(null);
          setSpeedResult(null);
          setSpeedWrong(false);
          send({ t: 'next' });
        }, SPEED_RESULT_MS);
        break;
      case 'speedCancelled':
        setSpeed(null);
        setSpeedResult(null);
        setSpeedWrong(false);
        send({ t: 'next' });
        break;
      case 'yamatoStart':
        setOffset(msg.now - Date.now());
        setYamatoAnswered(null);
        setYamatoEnd(null);
        setYamato(msg);
        if (!msg.answered) sayMondaiDesu();
        break;
      case 'yamatoTooFast':
        setYamatoRetry((n) => n + 1);
        break;
      case 'yamatoAnswered':
        setYamatoAnswered(msg);
        setState((s) => (s ? { ...s, coins: msg.coins } : s));
        break;
      case 'yamatoEnd':
        setYamatoEnd(msg);
        setState((s) => (s ? { ...s, coins: msg.coins } : s));
        later(() => {
          setYamato((y) => (y && y.roundId === msg.roundId ? null : y));
          setYamatoAnswered(null);
          setYamatoEnd(null);
        }, YAMATO_END_MS);
        break;
      case 'speedBye':
        setState((s) => (s ? { ...s, coins: msg.coins } : s));
        setNotice(`⚡ Speed round! You sit this one out — +${msg.bonus} coins.`);
        later(() => setNotice(null), NOTICE_MS);
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

  // 結果発表（ジグソー）
  if (final && final.mode === 'jigsaw' && final.jigsaw) {
    const pct = progressPercent(final.jigsaw);
    return (
      <div className="max-w-xl mx-auto space-y-4">
        <Box>
          <p className="text-xs font-bold tracking-widest text-indigo-500">{pct === 100 ? 'PUZZLE COMPLETE!' : 'TIME UP'}</p>
          <p className="text-4xl font-black text-indigo-600">{pct === 100 ? '🎉 100%' : `${pct}% done`}</p>
          <p className="text-lg font-bold text-slate-800 dark:text-white">You placed {final.contributions ?? 0} pieces</p>
          <ol className="text-left max-w-xs mx-auto space-y-1">
            {final.top.map((t, i) => (
              <li key={i} className="flex justify-between text-sm">
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  {['🥇', '🥈', '🥉', '4.', '5.'][i]} {t.name}
                </span>
                <span className="text-indigo-600 font-bold">🧩 {t.contributions ?? 0}</span>
              </li>
            ))}
          </ol>
        </Box>
        <JigsawBoard board={final.jigsaw} />
        <p className="text-xs text-center text-slate-500">
          {final.jigsaw.title}
          {final.jigsaw.credit ? ` — ${final.jigsaw.credit}` : ''}
        </p>
      </div>
    );
  }

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

  const noticeBar = notice ? (
    <div className="max-w-xl mx-auto text-center text-sm font-bold bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-2">
      {notice}
    </div>
  ) : null;

  const headerBar = (
    <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3">
      <div className="min-w-0">
        <p className="text-[11px] text-slate-500 truncate">{state.className} · {QUESTION_SET_LABELS[state.questionSet]}</p>
        <p className="font-bold text-slate-800 dark:text-white truncate">{state.name}</p>
      </div>
      {state.status === 'running' && <p className="text-2xl font-black tabular-nums text-indigo-600">{formatClock(left)}</p>}
      {state.mode === 'jigsaw' ? (
        <p className="text-2xl font-black text-indigo-600 tabular-nums">🧩 {state.contributions ?? 0}</p>
      ) : (
        <p className="text-2xl font-black text-amber-500 tabular-nums">🪙 {state.coins}</p>
      )}
    </div>
  );
  // 早押しタイムでお休みになったお知らせは、ヘッダーのすぐ下に出す
  const header = (
    <>
      {headerBar}
      {noticeBar}
    </>
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

  // 早押しタイム（ペアの対決）
  if (state.status === 'running' && speed) {
    return (
      <div className="max-w-xl mx-auto space-y-4">
        {header}
        <SpeedPanel
          key={speedPanelKey(speed.matchId, speedRetry)}
          match={speed}
          result={speedResult}
          wrong={speedWrong}
          offset={offset}
          onAnswer={(choice) => send({ t: 'speedAnswer', matchId: speed.matchId, choice })}
        />
      </div>
    );
  }

  // じゃんけん（挑んだ・挑まれた）
  if (state.status === 'running' && duel) {
    return (
      <div className="max-w-xl mx-auto space-y-4">
        {header}
        <JankenDuel key={duel.duelId} duel={duel} result={duelResult} offset={offset} onHand={(hand) => send({ t: 'hand', duelId: duel.duelId, hand })} />
      </div>
    );
  }

  // ヤマトの問題（じゃんけん・早押しタイムが終わってから加わる）
  if (state.status === 'running' && yamato) {
    return (
      <StudentYamato
        key={`${yamato.roundId}-${yamatoRetry}`}
        round={yamato}
        answered={yamatoAnswered}
        end={yamatoEnd}
        offset={offset}
        onAnswer={(choice) => send({ t: 'yamatoAnswer', roundId: yamato.roundId, choice })}
      />
    );
  }

  // じゃんけん勝負のカード：相手を選ぶ
  if (state.status === 'running' && jankenTargets) {
    return (
      <div className="max-w-xl mx-auto space-y-4">
        {header}
        <JankenTargetPicker
          targets={jankenTargets}
          failed={targetsFailed}
          onChallenge={(pid) => send({ t: 'challenge', pid })}
          onRefresh={() => send({ t: 'refreshTargets' })}
          onSkip={() => {
            send({ t: 'skipChallenge' });
            setJankenTargets(null);
            send({ t: 'next' });
          }}
        />
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
              <p className="text-slate-700 dark:text-slate-300">
                {chestResult.noTargets ? 'No one can be challenged right now — you get +3 coins instead!' : chestResult.item.description}
              </p>
              {chestResult.coins !== chestResult.before && (
                <p className="text-2xl font-black text-amber-500">
                  🪙 {chestResult.before} → {chestResult.coins}
                </p>
              )}
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

  // ジグソー：届いたピースを置く
  if (state.status === 'running' && state.jigsaw && held) {
    const secondsLeft = Math.max(0, Math.ceil((held.expiresAt - (Date.now() + offset)) / 1000));
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        {header}
        <div className="bg-white dark:bg-slate-900 border-2 border-indigo-300 rounded-2xl p-4 space-y-3">
          <p className="text-center font-black text-indigo-700">🧩 You got a piece! Tap where it goes.</p>
          <div className="grid gap-4 sm:grid-cols-[1fr_180px] items-start">
            <JigsawBoard
              board={state.jigsaw}
              highlight={wrongSlot}
              onPick={(slot) => {
                lastPickRef.current = slot;
                send({ t: 'place', pid: held.pid, slot });
              }}
            />
            <div className="space-y-3">
              <div className="rounded-xl bg-slate-100 p-2 flex items-center justify-center">
                <img src={held.data} alt="Your piece" className="max-h-40 object-contain" />
              </div>
              <p className="text-xs text-center text-slate-500">About {secondsLeft} s to place it</p>
              <button
                type="button"
                onClick={() => send({ t: 'passPiece', pid: held.pid })}
                className="w-full px-4 py-2 text-sm font-bold rounded-xl bg-slate-100 text-slate-600 cursor-pointer"
              >
                Pass
              </button>
              <JigsawBoxPicture board={state.jigsaw} />
            </div>
          </div>
        </div>
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
              {result.correct ? (state.mode === 'jigsaw' ? 'Correct!' : '+1 🪙 Correct!') : 'Not quite!'}
            </p>
          )}
        </div>
      )}
      {state.mode === 'jigsaw' && state.jigsaw && (
        <div className="space-y-1">
          <p className="text-xs text-center text-slate-500">Class puzzle: {progressPercent(state.jigsaw)}% done</p>
          <JigsawBoard board={state.jigsaw} />
        </div>
      )}
      {socketStatus !== 'open' && <p className="text-center text-xs text-amber-600">Reconnecting…</p>}
    </div>
  );
}
