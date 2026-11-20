/**
 * @file PlazaControls.tsx
 * @description Yamato Town の「みんなで（Together）」モードの部品
 *   ・PlazaChatBar   … 決まった日本語の文とスタンプのボタン（自由なチャットはない）
 *   ・PlazaRulesModal … 入る前の決まりへの同意（18 歳未満は保護者の許可）
 *   ・PlazaPlayerMenu … ほかの人を押したときの「ブロック」「報告」
 */
import React, { useState } from 'react';
import type { PlazaPlayer } from './usePlaza';
import { AVATARS } from './WorldScene';

export function PlazaChatBar({
  phrases,
  stamps,
  onSay,
  onStamp,
  othersCount,
}: {
  phrases: { ja: string; en: string }[];
  stamps: string[];
  onSay: (i: number) => void;
  onStamp: (i: number) => void;
  othersCount: number;
}) {
  // 押しすぎ防止（サーバーも 2.5 秒に 1 回しか受け付けない）
  const [cooling, setCooling] = useState(false);
  const press = (fn: () => void) => {
    if (cooling) return;
    fn();
    setCooling(true);
    setTimeout(() => setCooling(false), 2500);
  };
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-slate-900 dark:text-white">💬 Say something</p>
        <p className="text-xs text-slate-500">
          {othersCount === 0 ? 'Nobody else is here right now.' : `${othersCount} other ${othersCount === 1 ? 'learner' : 'learners'} here`}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {phrases.map((p, i) => (
          <button
            key={p.ja}
            type="button"
            disabled={cooling}
            onClick={() => press(() => onSay(i))}
            title={p.en}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-indigo-400 text-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-left"
          >
            <span lang="ja" className="font-bold text-slate-800 dark:text-slate-100">
              {p.ja}
            </span>
            <span className="block text-[10px] text-slate-500">{p.en}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {stamps.map((s, i) => (
          <button
            key={s}
            type="button"
            disabled={cooling}
            onClick={() => press(() => onStamp(i))}
            className="text-2xl w-10 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label={`Stamp ${s}`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PlazaRulesModal({ onAgree, onCancel }: { onAgree: () => Promise<string | null>; onCancel: () => void }) {
  const [age, setAge] = useState(false);
  const [kind, setKind] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setBusy(true);
    setError(null);
    const err = await onAgree();
    setBusy(false);
    if (err) setError(err);
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={onCancel}>
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-lg font-black text-slate-900 dark:text-white">👥 Together mode rules</p>
        <ul className="text-sm text-slate-600 dark:text-slate-300 list-disc pl-5 space-y-1.5">
          <li>You can see other learners walking around the shop, and they can see you.</li>
          <li>
            You can only use <b>set Japanese phrases and stamps</b>. There is no free chat, no voice between users, no private messages
            and no friend requests.
          </li>
          <li>
            Your real name and nickname are <b>never shown</b>. You get a random town name (for example, たぬき 27) each time you come in.
          </li>
          <li>Your conversation with the AI clerk is still just between you and the clerk. Others only see “talking to the clerk”.</li>
          <li>
            If someone bothers you, tap their avatar to <b>block</b> or <b>report</b> them. Reports are checked by our team, and people who
            are reported can be removed.
          </li>
          <li>Accounts linked to a school class are not able to use Together mode.</li>
        </ul>
        <div className="space-y-2 text-sm">
          <label className="flex gap-2 items-start cursor-pointer">
            <input type="checkbox" checked={age} onChange={(e) => setAge(e.target.checked)} className="mt-1" />
            <span className="text-slate-800 dark:text-slate-100">
              I am 18 or older, <b>or</b> my parent or guardian has said I can use Together mode.
            </span>
          </label>
          <label className="flex gap-2 items-start cursor-pointer">
            <input type="checkbox" checked={kind} onChange={(e) => setKind(e.target.checked)} className="mt-1" />
            <span className="text-slate-800 dark:text-slate-100">I will be kind to other learners and follow these rules.</span>
          </label>
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl border border-slate-300 font-bold cursor-pointer">
            Practise alone
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!age || !kind || busy}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? 'Saving…' : 'Agree and join'}
          </button>
        </div>
      </div>
    </div>
  );
}

const REPORT_REASONS: { id: 'spam' | 'following' | 'unkind' | 'other'; label: string }[] = [
  { id: 'spam', label: 'Sending too many phrases or stamps' },
  { id: 'following', label: 'Following me around' },
  { id: 'unkind', label: 'Being unkind' },
  { id: 'other', label: 'Something else' },
];

export function PlazaPlayerMenu({
  player,
  onBlock,
  onReport,
  onClose,
}: {
  player: PlazaPlayer;
  onBlock: () => void;
  onReport: (reason: 'spam' | 'following' | 'unkind' | 'other') => void;
  onClose: () => void;
}) {
  const [reporting, setReporting] = useState(false);
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 max-w-sm w-full space-y-3" onClick={(e) => e.stopPropagation()}>
        <p className="text-lg font-black text-slate-900 dark:text-white">
          {AVATARS[player.avatar] ?? AVATARS[0]} <span lang="ja">{player.name}</span>
        </p>
        {!reporting ? (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-300">Is this person bothering you?</p>
            <div className="grid gap-2">
              <button
                type="button"
                onClick={onBlock}
                className="px-4 py-2 rounded-xl border-2 border-slate-300 font-bold text-slate-800 dark:text-slate-100 cursor-pointer"
              >
                🚫 Block — we will not see each other
              </button>
              <button
                type="button"
                onClick={() => setReporting(true)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
              >
                🚩 Report to the AI Yamato team
              </button>
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-slate-500 font-bold cursor-pointer">
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-300">What happened? (This person will also be blocked.)</p>
            <div className="grid gap-2">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onReport(r.id)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-left text-sm font-bold text-slate-800 dark:text-slate-100 hover:border-rose-400 cursor-pointer"
                >
                  {r.label}
                </button>
              ))}
              <button type="button" onClick={() => setReporting(false)} className="px-4 py-2 rounded-xl text-slate-500 font-bold cursor-pointer">
                Back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
