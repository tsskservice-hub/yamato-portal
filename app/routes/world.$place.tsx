/**
 * @file app/routes/world.$place.tsx
 * @description Yamato Town の 1 つの場所（例: /world/burger-shop）— ほかの学習者との交流 ＋ その場所の AI の話し手
 *
 * ・2026-11-21: 入口を 2 つに分けた（SNS を心配する保護者・学校への対策）
 *     Yamato Town（ここ）… ほかの利用者が見える（決まった文とスタンプだけ。個人のアカウントだけ。usePlaza.ts・SQL 58）
 *                          各場所に AI の話し手が 1 人いて、個人の利用者も声で話せる
 *     Speaking Tasks（/speaking/<id>、routes/speaking.$task.tsx）… ほかの人は見えない。AI と話す課題だけ（学校のアカウントも）
 * ・場所のデータは app/data/world/places.ts（画面は components/world を共通で使う）
 * ・学校のアカウントは開いた時点で /speaking/<id> へ自動で移す（useSchoolAccountRedirect）
 * ・会話は 1 回 3 分・クレジットは CREDIT_COSTS.worldTalk3（サーバーが引く。api/src/handlers/world-handler.ts）
 */
import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from '@remix-run/react';
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
import { useSchoolAccountRedirect } from '~/components/world/useSchoolAccountRedirect';

export const meta: MetaFunction = ({ params }) => {
  const place = findWorldPlace(params.place);
  const title = place ? `${place.title} – Yamato Town` : 'Yamato Town';
  const description = 'Meet other Japanese learners, greet them with set Japanese phrases and stamps, and talk to an AI character in Japanese.';
  return [
    { title: `${title} | AI Yamato Portal` },
    { name: 'description', content: description },
    { property: 'og:title', content: `${title} | AI Yamato Portal` },
    { property: 'og:description', content: description },
  ];
};

export default function WorldPlacePage() {
  const { place: placeId } = useParams();
  const navigate = useNavigate();
  const place = findWorldPlace(placeId);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [talking, setTalking] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [picked, setPicked] = useState<PlazaPlayer | null>(null);
  const sceneState = useRef({ x: place?.start.x ?? 50, y: place?.start.y ?? 84, avatar: 0 });
  // 学校のアカウントは、同じ場所の Speaking Task へ自動で移す
  const gate = useSchoolAccountRedirect(place ? `/speaking/${place.id}` : '/speaking');

  const plaza = usePlaza({
    placeId: place?.id ?? '',
    active: Boolean(place) && signedIn === true && gate === 'ok',
    getStart: () => sceneState.current,
  });

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSignedIn(Boolean(session));
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

  if (gate === 'checking') {
    return (
      <ToolPageWrapper breadcrumbTitle={place.title}>
        <div className="min-h-screen" />
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

  const live = plaza.phase === 'live';
  const others = live ? Object.values(plaza.others) : [];
  const npcName = place.npc.name.toLowerCase();

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
                {place.emoji} {place.title} <span lang="ja" className="text-lg text-slate-500">{place.titleJa}</span>{' '}
                <span className="text-xs font-bold text-indigo-600 align-middle">BETA</span>
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">Meet other learners here, and talk to the {npcName} in Japanese.</p>
            </div>
            <div className="text-xs text-slate-500 text-right">
              👥 Other learners: set phrases and stamps only
              <br />
              🎤 {place.npc.icon} {place.npc.name}: {place.minutes} min · {CREDIT_COSTS.worldTalk3} credits · voice only
            </div>
          </div>

          {signedIn === false && (
            <div className="rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-sm p-4 flex flex-wrap items-center justify-between gap-3">
              <p>Sign in to see and greet other learners, or to talk to the {npcName}.</p>
              <button type="button" onClick={() => requestAuthModal('signin')} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold cursor-pointer">
                Sign in
              </button>
            </div>
          )}

          {!talking && signedIn && (plaza.phase === 'checking' || plaza.phase === 'connecting') && (
            <p className="text-xs text-slate-500">Joining…</p>
          )}

          {!talking && plaza.phase === 'closed' && (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm p-4 flex flex-wrap items-center justify-between gap-3">
              <p>{PLAZA_CLOSED_MESSAGES[plaza.closedCode ?? ''] ?? PLAZA_CLOSED_MESSAGES.SERVER_ERROR}</p>
              <div className="flex gap-2">
                {!['SCHOOL_ACCOUNT', 'SUSPENDED'].includes(plaza.closedCode ?? '') && (
                  <button type="button" onClick={plaza.retry} className="px-3 py-1.5 rounded-lg border border-amber-400 font-bold cursor-pointer">
                    Try again
                  </button>
                )}
                {plaza.closedCode === 'SCHOOL_ACCOUNT' && (
                  <Link to={`/speaking/${place.id}`} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold">
                    Go to Speaking Tasks
                  </Link>
                )}
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
                nickname={live ? plaza.me?.name ?? '' : ''}
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
                  <p className="font-bold text-slate-900 dark:text-white mb-1">
                    🎯 Talking to the {npcName}
                  </p>
                  <ul className="list-disc pl-5 space-y-0.5 text-slate-600 dark:text-slate-300">
                    {place.goals.map((g) => (
                      <li key={g}>{g}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 text-sm text-slate-600 dark:text-slate-300">
                  <p className="font-bold text-slate-900 dark:text-white mb-1">🕹️ How it works</p>
                  <p>
                    Walk with the arrow keys (or W A S D), or tap the floor. Greet other learners with a set phrase or a stamp. Tap another learner
                    to block or report them. To talk to the {npcName}, go to the green circle and press “Talk” (or E).
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
              {place.npc.icon} Talk to the {npcName}?
            </p>
            <ul className="text-sm text-slate-600 dark:text-slate-300 list-disc pl-5 space-y-1">
              <li>
                The conversation lasts up to <b>{place.minutes} minutes</b> and uses <b>{CREDIT_COSTS.worldTalk3} credits</b>.
              </li>
              <li>Your browser will ask to use the microphone. No camera is used.</li>
              <li>Record what you want to say in Japanese, check the text, then send it. What you say is shown on screen but not saved.</li>
              <li>The {npcName}&apos;s words are hidden at first so you can practise listening. You can show them any time.</li>
              <li>When the conversation ends, you get feedback that matches your learning pace (no extra credits).</li>
              {live && <li>Other learners cannot hear you or the {npcName}. They only see that you are talking.</li>}
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
      {plaza.phase === 'needs-agree' && <PlazaRulesModal onAgree={plaza.agree} onCancel={() => navigate('/world')} />}

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
