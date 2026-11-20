/**
 * @file app/routes/world.$place.tsx
 * @description 会話練習の空間（Yamato Town）の 1 つの場所（例: /world/burger-shop）
 *
 * ・場所のデータは app/data/world/places.ts。画面は共通（components/world）
 * ・アバターを動かして AI のキャラクターに近づき、「Talk」で声の会話を始める（ログインと、AI 体験かプラン が必要）
 * ・会話は 1 回 3 分・クレジットは CREDIT_COSTS.worldTalk3（サーバーが引く。api/src/handlers/world-handler.ts）
 * ・モードは 2 つ（2026-11-21）
 *     Practise alone … 1 人で練習（だれでも。学校のアカウントも）
 *     Together       … ほかの利用者も見える（個人のアカウントだけ。決まった文とスタンプだけ。usePlaza.ts・SQL 58）
 */
import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from '@remix-run/react';
import type { MetaFunction } from '@remix-run/cloudflare';
import { ToolPageWrapper } from '~/components/layout/ToolPageWrapper';
import { WorldScene } from '~/components/world/WorldScene';
import { WorldTalk } from '~/components/world/WorldTalk';
import { PLAZA_CLOSED_MESSAGES, usePlaza, type PlazaPlayer } from '~/components/world/usePlaza';
import { PlazaChatBar, PlazaPlayerMenu, PlazaRulesModal } from '~/components/world/PlazaControls';
import { findWorldPlace } from '~/data/world/places';
import { CREDIT_COSTS } from '~/data/credit-costs';
import { supabase } from '~/lib/supabaseClient';
import { requestAuthModal } from '~/utils/openAuthModal';

export const meta: MetaFunction = ({ params }) => {
  const place = findWorldPlace(params.place);
  const title = place ? `${place.title} – Yamato Town` : 'Yamato Town';
  const description = place
    ? `${place.description} Walk around and talk to an AI character in Japanese – voice only, no camera.`
    : 'Practise everyday Japanese conversations with AI characters.';
  return [
    { title: `${title} | AI Yamato Portal` },
    { name: 'description', content: description },
    { property: 'og:title', content: `${title} | AI Yamato Portal` },
    { property: 'og:description', content: description },
  ];
};

export default function WorldPlacePage() {
  const { place: placeId } = useParams();
  const place = findWorldPlace(placeId);
  const [nickname, setNickname] = useState('');
  const [signedIn, setSignedIn] = useState(false);
  const [talking, setTalking] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [mode, setMode] = useState<'solo' | 'together'>('solo');
  const [picked, setPicked] = useState<PlazaPlayer | null>(null);
  const sceneState = useRef({ x: place?.start.x ?? 50, y: place?.start.y ?? 84, avatar: 0 });

  const plaza = usePlaza({
    placeId: place?.id ?? '',
    active: mode === 'together' && Boolean(place) && signedIn,
    getStart: () => sceneState.current,
  });

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSignedIn(Boolean(session));
      if (!session) return;
      const { data } = await supabase.from('profiles').select('nickname').eq('id', session.user.id).maybeSingle();
      if (data?.nickname) setNickname(String(data.nickname));
    })();
  }, []);

  // AI と話している間は、ほかの人に「話し中」と見せる
  useEffect(() => {
    if (plaza.phase === 'live') plaza.setTalking(talking);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [talking, plaza.phase]);

  // お知らせ（ブロック・報告しました）は少しで消す
  useEffect(() => {
    if (!plaza.notice) return;
    const t = setTimeout(plaza.clearNotice, 6000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plaza.notice]);

  if (!place) {
    return (
      <ToolPageWrapper breadcrumbTitle="Yamato Town">
        <div className="max-w-xl mx-auto p-8 text-center space-y-3">
          <p className="text-slate-700">This place does not exist.</p>
          <Link to="/world" className="text-indigo-600 font-bold underline">
            Back to Yamato Town
          </Link>
        </div>
      </ToolPageWrapper>
    );
  }

  const askToTalk = () => {
    if (!signedIn) {
      requestAuthModal('signin');
      return;
    }
    setConfirming(true);
  };

  const chooseTogether = () => {
    if (!signedIn) {
      requestAuthModal('signin');
      return;
    }
    setMode('together');
  };

  const live = mode === 'together' && plaza.phase === 'live';
  const others = live ? Object.values(plaza.others) : [];
  const modeButton = (active: boolean) =>
    `px-4 py-2 rounded-xl text-sm font-bold cursor-pointer transition ${
      active ? 'bg-indigo-600 text-white shadow' : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200'
    }`;

  return (
    <ToolPageWrapper breadcrumbTitle={place.title}>
      <div className="min-h-screen bg-amber-50/40 dark:bg-slate-950 py-6 sm:py-10 px-4">
        <main className="max-w-5xl mx-auto space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <Link to="/world" className="text-xs font-bold text-indigo-600 underline">
                ← Yamato Town
              </Link>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {place.emoji} {place.title} <span lang="ja" className="text-lg text-slate-500">{place.titleJa}</span>
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">{place.description}</p>
            </div>
            <div className="text-xs text-slate-500 text-right">
              🎤 Voice only — no camera
              <br />
              {place.minutes} min · {CREDIT_COSTS.worldTalk3} credits per conversation
            </div>
          </div>

          {/* モード */}
          {!talking && (
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setMode('solo')} className={modeButton(mode === 'solo')}>
                🧍 Practise alone
              </button>
              <button type="button" onClick={chooseTogether} className={modeButton(mode === 'together')}>
                👥 Together <span className="text-[10px] font-bold opacity-80">BETA</span>
              </button>
              <span className="text-xs text-slate-500">
                {mode === 'solo'
                  ? 'Only you and the clerk.'
                  : live
                    ? 'Other learners can see you. Set phrases and stamps only.'
                    : plaza.phase === 'checking' || plaza.phase === 'connecting'
                      ? 'Joining…'
                      : ''}
              </span>
            </div>
          )}

          {mode === 'together' && plaza.phase === 'closed' && (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm p-4 flex flex-wrap items-center justify-between gap-3">
              <p>{PLAZA_CLOSED_MESSAGES[plaza.closedCode ?? ''] ?? PLAZA_CLOSED_MESSAGES.SERVER_ERROR}</p>
              <div className="flex gap-2">
                {!['SCHOOL_ACCOUNT', 'SUSPENDED'].includes(plaza.closedCode ?? '') && (
                  <button type="button" onClick={plaza.retry} className="px-3 py-1.5 rounded-lg border border-amber-400 font-bold cursor-pointer">
                    Try again
                  </button>
                )}
                <button type="button" onClick={() => setMode('solo')} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold cursor-pointer">
                  Practise alone
                </button>
              </div>
            </div>
          )}

          {plaza.notice && (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm p-3">{plaza.notice}</div>
          )}

          {!talking ? (
            <>
              <WorldScene
                place={place}
                nickname={live ? plaza.me?.name ?? '' : nickname}
                disabled={confirming || Boolean(picked)}
                onTalk={askToTalk}
                stateRef={sceneState}
                onMove={live ? plaza.sendMove : undefined}
                onAvatarChange={live ? plaza.setAvatar : undefined}
                others={others}
                bubbles={live ? plaza.bubbles : undefined}
                myPid={live ? plaza.me?.pid : undefined}
                onPickOther={setPicked}
              />
              {live && (
                <PlazaChatBar phrases={plaza.phrases} stamps={plaza.stamps} onSay={plaza.say} onStamp={plaza.stamp} othersCount={others.length} />
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 text-sm">
                  <p className="font-bold text-slate-900 dark:text-white mb-1">🎯 Your mission</p>
                  <ul className="list-disc pl-5 space-y-0.5 text-slate-600 dark:text-slate-300">
                    {place.goals.map((g) => (
                      <li key={g}>{g}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 text-sm text-slate-600 dark:text-slate-300">
                  <p className="font-bold text-slate-900 dark:text-white mb-1">🕹️ How to play</p>
                  <p>
                    Walk with the arrow keys (or W A S D), or tap the floor. Go to the green circle in front of the {place.npc.name.toLowerCase()} and
                    press “Talk” (or E). On your turn, press “Record” (Space), speak in Japanese and press “Stop”. Check the text, then send it
                    (Enter) or record again. The menu and useful phrases will be on screen.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <WorldTalk place={place} onClose={() => setTalking(false)} />
          )}
        </main>
      </div>

      {/* 始める前の確認（クレジットとマイク） */}
      {confirming && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={() => setConfirming(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-lg font-black text-slate-900 dark:text-white">
              {place.npc.icon} Talk to the {place.npc.name.toLowerCase()}?
            </p>
            <ul className="text-sm text-slate-600 dark:text-slate-300 list-disc pl-5 space-y-1">
              <li>
                The conversation lasts up to <b>{place.minutes} minutes</b> and uses <b>{CREDIT_COSTS.worldTalk3} credits</b>.
              </li>
              <li>Your browser will ask to use the microphone. No camera is used.</li>
              <li>Record what you want to say in Japanese, check the text, then send it. What you say is shown on screen but not saved.</li>
              <li>The {place.npc.name.toLowerCase()}&apos;s words are hidden at first so you can practise listening. You can show them any time.</li>
              <li>When the conversation ends, you get feedback that matches your learning pace (no extra credits).</li>
              {live && <li>Other learners cannot hear you or the clerk. They only see that you are talking to the clerk.</li>}
            </ul>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirming(false)} className="px-4 py-2 rounded-xl border border-slate-300 font-bold cursor-pointer">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirming(false);
                  setTalking(true);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
              >
                🎤 Start talking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 「みんなで」の決まり（はじめてのとき） */}
      {mode === 'together' && plaza.phase === 'needs-agree' && <PlazaRulesModal onAgree={plaza.agree} onCancel={() => setMode('solo')} />}

      {/* ほかの人を押したとき */}
      {picked && (
        <PlazaPlayerMenu
          player={picked}
          onClose={() => setPicked(null)}
          onBlock={() => {
            plaza.block(picked.pid);
            setPicked(null);
          }}
          onReport={(reason) => {
            plaza.report(picked.pid, reason);
            setPicked(null);
          }}
        />
      )}
    </ToolPageWrapper>
  );
}
