/**
 * @file HostView.tsx
 * @description クラスのライブゲーム：先生の画面（プロジェクターに映す前提）
 *
 * ・生徒の本当の名前（学校メール・招待ラベル）は、プロジェクターに映らないよう最初は隠す。
 * ・点数はサーバーから届いたものを表示するだけ（この画面で計算しない）。
 */
import React, { useState } from 'react';
import { Crown, Eye, EyeOff, Pencil, Play, Square, UserX, Users, Wifi, WifiOff } from 'lucide-react';
import { CLOSED_MESSAGES, QUESTION_SET_LABELS, formatClock, useCountdown, useLiveGameSocket } from './useLiveGameSocket';

type HostPlayer = {
  userId: string;
  name: string | null;
  label: string;
  coins: number;
  correct: number;
  answered: number;
  online: boolean;
  rank: number | null;
  missed?: Record<string, number>;
};

type HostState = {
  status: 'lobby' | 'running' | 'ended';
  endsAt: number;
  config: { className: string; questionSet: string; durationSec: number; nameMode: 'free' | 'preset' };
  players: HostPlayer[];
  classMissed?: { key: string; count: number }[];
};

export function HostView({ gameId, onNewGame }: { gameId: string; onNewGame: () => void }) {
  const [state, setState] = useState<HostState | null>(null);
  const [offset, setOffset] = useState(0);
  const [showLabels, setShowLabels] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const { status: socketStatus, closedCode, send } = useLiveGameSocket(gameId, (msg) => {
    if (msg.t === 'host') {
      setOffset(msg.now - Date.now());
      setState(msg);
    } else if (msg.t === 'nameRejected') {
      setNotice(nameReason(msg.reason));
    }
  });
  const left = useCountdown(state?.status === 'running' ? state.endsAt : 0, offset);

  if (socketStatus === 'closed') {
    return (
      <Box>
        <p className="text-slate-700 dark:text-slate-300">{CLOSED_MESSAGES[closedCode ?? ''] ?? 'The game was closed.'}</p>
        <button type="button" onClick={onNewGame} className={primaryBtn}>Back</button>
      </Box>
    );
  }
  if (!state) return <Spinner text="Opening the game room…" />;

  const named = state.players.filter((p) => p.name);
  const rename = (p: HostPlayer) => {
    const name = window.prompt(`New display name for ${p.name ?? p.label}:`, p.name ?? '');
    if (name !== null) send({ t: 'rename', userId: p.userId, name });
  };
  const kick = (p: HostPlayer) => {
    if (window.confirm(`Remove ${p.name ?? p.label} from this game? They will not be able to rejoin it.`)) {
      send({ t: 'kick', userId: p.userId });
    }
  };

  return (
    <div className="space-y-6">
      {/* 上部：クラスと設定 */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
        <div>
          <p className="text-xs font-bold tracking-widest text-indigo-500">CLASS LIVE GAME</p>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">{state.config.className}</h2>
          <p className="text-xs text-slate-500">
            {QUESTION_SET_LABELS[state.config.questionSet]} · {state.config.durationSec / 60} min ·{' '}
            {state.config.nameMode === 'free' ? 'Students choose their names' : 'Names chosen by AI Yamato'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 flex items-center gap-1">
            {socketStatus === 'open' ? <Wifi className="w-4 h-4 text-emerald-500" /> : <WifiOff className="w-4 h-4 text-amber-500" />}
            {socketStatus === 'open' ? 'Connected' : 'Reconnecting…'}
          </span>
          <button
            type="button"
            onClick={() => setShowLabels((v) => !v)}
            className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
            title="Only turn this on when your screen is not on the projector"
          >
            {showLabels ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showLabels ? 'Hide who is who' : 'Show who is who'}
          </button>
        </div>
      </div>

      {notice && (
        <div className="text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-2 flex justify-between">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="font-bold cursor-pointer">✕</button>
        </div>
      )}

      {/* 待合 */}
      {state.status === 'lobby' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="text-center space-y-2">
            <p className="text-lg font-bold text-slate-800 dark:text-white">
              Students: open <span className="text-indigo-600">jptutoraiyamato.com/class-game</span> and log in.
            </p>
            <p className="text-sm text-slate-500">No code needed — only students in this class can join.</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <Users className="w-5 h-5" /> {state.players.length} joined
            </p>
            <button
              type="button"
              disabled={named.length === 0}
              onClick={() => send({ t: 'start' })}
              className={`${primaryBtn} flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <Play className="w-4 h-4" /> Start
            </button>
          </div>
          <PlayerGrid players={state.players} showLabels={showLabels} onRename={rename} onKick={kick} />
        </div>
      )}

      {/* ゲーム中 */}
      {state.status === 'running' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-indigo-600 text-white rounded-2xl p-5">
            <p className="text-5xl font-black tabular-nums">{formatClock(left)}</p>
            <button
              type="button"
              onClick={() => window.confirm('End the game now?') && send({ t: 'end' })}
              className="px-4 py-2 bg-white/15 hover:bg-white/25 rounded-xl font-bold text-sm flex items-center gap-2 cursor-pointer"
            >
              <Square className="w-4 h-4" /> End now
            </button>
          </div>
          <Leaderboard players={state.players} showLabels={showLabels} onRename={rename} onKick={kick} />
        </div>
      )}

      {/* 終了 */}
      {state.status === 'ended' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
            <h3 className="text-2xl font-black text-center text-slate-900 dark:text-white mb-4">🏆 Final results</h3>
            <Podium players={named.slice(0, 3)} />
          </div>
          <Leaderboard players={state.players} showLabels={showLabels} />
          {state.classMissed && state.classMissed.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
              <h3 className="font-bold text-slate-800 dark:text-white mb-1">Characters the class missed most</h3>
              <p className="text-xs text-slate-500 mb-3">Number of wrong answers across the class</p>
              <div className="flex flex-wrap gap-2">
                {state.classMissed.map((m) => (
                  <span key={m.key} className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-bold">
                    <span className="text-xl">{m.key}</span> <span className="text-xs">×{m.count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
          {showLabels && <StudentMissedTable players={state.players} />}
          <div className="text-center">
            <button type="button" onClick={onNewGame} className={primaryBtn}>New game</button>
          </div>
        </div>
      )}
    </div>
  );
}

function PlayerGrid({
  players,
  showLabels,
  onRename,
  onKick,
}: {
  players: HostPlayer[];
  showLabels: boolean;
  onRename: (p: HostPlayer) => void;
  onKick: (p: HostPlayer) => void;
}) {
  if (!players.length) return <p className="text-center text-slate-400 py-6">Waiting for students…</p>;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      {players.map((p) => (
        <div key={p.userId} className={`rounded-xl border px-3 py-2 ${p.online ? 'border-indigo-200 bg-indigo-50/50 dark:bg-indigo-950/30' : 'border-slate-200 opacity-60'}`}>
          <div className="flex items-center justify-between gap-1">
            <span className="font-bold text-slate-800 dark:text-white truncate">{p.name ?? <em className="text-slate-400 font-normal">choosing a name…</em>}</span>
            <PlayerActions p={p} onRename={onRename} onKick={onKick} />
          </div>
          {showLabels && <p className="text-[11px] text-slate-500 truncate">{p.label}</p>}
        </div>
      ))}
    </div>
  );
}

function PlayerActions({ p, onRename, onKick }: { p: HostPlayer; onRename: (p: HostPlayer) => void; onKick: (p: HostPlayer) => void }) {
  return (
    <span className="flex items-center gap-1 shrink-0">
      <button type="button" onClick={() => onRename(p)} title="Change name" className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer">
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button type="button" onClick={() => onKick(p)} title="Remove from game" className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer">
        <UserX className="w-3.5 h-3.5" />
      </button>
    </span>
  );
}

function Leaderboard({
  players,
  showLabels,
  onRename,
  onKick,
}: {
  players: HostPlayer[];
  showLabels: boolean;
  onRename?: (p: HostPlayer) => void;
  onKick?: (p: HostPlayer) => void;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 text-xs">
          <tr>
            <th className="px-3 py-2 text-left w-12">#</th>
            <th className="px-3 py-2 text-left">Name</th>
            <th className="px-3 py-2 text-right">Coins</th>
            <th className="px-3 py-2 text-right hidden sm:table-cell">Correct</th>
            {onRename && onKick && <th className="w-16" />}
          </tr>
        </thead>
        <tbody>
          {players.map((p) => (
            <tr key={p.userId} className="border-t border-slate-100 dark:border-slate-800">
              <td className="px-3 py-2 font-bold text-slate-500">{p.rank ?? '–'}</td>
              <td className="px-3 py-2">
                <span className="font-bold text-slate-800 dark:text-white">{p.name ?? '(no name)'}</span>
                {!p.online && <span className="ml-2 text-[10px] text-slate-400">offline</span>}
                {showLabels && <span className="block text-[11px] text-slate-500">{p.label}</span>}
              </td>
              <td className="px-3 py-2 text-right font-black text-amber-600 tabular-nums">🪙 {p.coins}</td>
              <td className="px-3 py-2 text-right text-slate-500 hidden sm:table-cell tabular-nums">
                {p.correct}/{p.answered}
              </td>
              {onRename && onKick && (
                <td className="px-2">
                  <PlayerActions p={p} onRename={onRename} onKick={onKick} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Podium({ players }: { players: HostPlayer[] }) {
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <div className="flex flex-col sm:flex-row justify-center gap-3">
      {players.map((p, i) => (
        <div key={p.userId} className={`flex-1 max-w-xs rounded-2xl border p-4 text-center ${i === 0 ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
          <p className="text-3xl">{medals[i]}</p>
          <p className="font-black text-lg text-slate-900 truncate flex items-center justify-center gap-1">
            {i === 0 && <Crown className="w-4 h-4 text-amber-500" />} {p.name}
          </p>
          <p className="font-bold text-amber-600">🪙 {p.coins}</p>
        </div>
      ))}
    </div>
  );
}

function StudentMissedTable({ players }: { players: HostPlayer[] }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
      <h3 className="font-bold text-slate-800 dark:text-white mb-3">Each student's missed characters</h3>
      <div className="space-y-2">
        {players.map((p) => {
          const missed = Object.entries(p.missed ?? {}).sort((a, b) => b[1] - a[1]);
          return (
            <div key={p.userId} className="text-sm border-t border-slate-100 dark:border-slate-800 pt-2">
              <span className="font-bold text-slate-800 dark:text-white">{p.label}</span>
              <span className="text-slate-500"> ({p.name ?? 'no name'}) · {p.correct}/{p.answered} correct</span>
              <div className="mt-1 text-slate-700 dark:text-slate-300">
                {missed.length ? missed.map(([k, n]) => `${k}×${n}`).join('  ') : 'No mistakes'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function nameReason(reason: string) {
  switch (reason) {
    case 'TAKEN':
      return 'Someone already has that name.';
    case 'TOO_LONG':
      return 'Names can be up to 12 characters.';
    case 'NOT_ALLOWED':
      return 'That name is not allowed.';
    default:
      return 'Please enter a name.';
  }
}

export const primaryBtn =
  'px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition cursor-pointer';

export function Box({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-4 shadow-sm">
      {children}
    </div>
  );
}

export function Spinner({ text }: { text: string }) {
  return (
    <div className="py-16 text-center" role="status">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-3" />
      <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">{text}</p>
    </div>
  );
}

export { nameReason };
