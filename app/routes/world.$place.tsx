/**
 * @file app/routes/world.$place.tsx
 * @description Yamato Town の 1 つの場所（例: /world/burger-shop）— ほかの学習者との交流だけ
 *
 * ・2026-11-21: AI の店員と話す練習は Speaking Tasks（/speaking/<id>、routes/speaking.$task.tsx）に分けた。
 *   ここは「みんなで（Together）」だけ: ほかの利用者が見え、決まった文とスタンプであいさつする
 * ・個人のアカウントだけ（学校のアカウントは入れない）。usePlaza.ts・SQL 58
 * ・場所の絵は app/data/world/places.ts（画面は components/world を共通で使う）
 */
import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from '@remix-run/react';
import type { MetaFunction } from '@remix-run/cloudflare';
import { ToolPageWrapper } from '~/components/layout/ToolPageWrapper';
import { WorldScene } from '~/components/world/WorldScene';
import { PLAZA_CLOSED_MESSAGES, usePlaza, type PlazaPlayer } from '~/components/world/usePlaza';
import { PlazaChatBar, PlazaPlayerMenu, PlazaRulesModal } from '~/components/world/PlazaControls';
import { findWorldPlace } from '~/data/world/places';
import { supabase } from '~/lib/supabaseClient';
import { requestAuthModal } from '~/utils/openAuthModal';

export const meta: MetaFunction = ({ params }) => {
  const place = findWorldPlace(params.place);
  const title = place ? `${place.title} – Yamato Town` : 'Yamato Town';
  const description = 'Meet other Japanese learners and greet them with set Japanese phrases and stamps.';
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
  const [picked, setPicked] = useState<PlazaPlayer | null>(null);
  const sceneState = useRef({ x: place?.start.x ?? 50, y: place?.start.y ?? 84, avatar: 0 });

  const plaza = usePlaza({
    placeId: place?.id ?? '',
    active: Boolean(place) && signedIn === true,
    getStart: () => sceneState.current,
  });

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSignedIn(Boolean(session));
    })();
  }, []);

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

  const live = plaza.phase === 'live';
  const others = live ? Object.values(plaza.others) : [];

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
              <p className="text-sm text-slate-600 dark:text-slate-300">Meet other learners here and greet them in Japanese.</p>
            </div>
            <div className="text-xs text-slate-500 text-right">
              👥 Set phrases and stamps only
              <br />
              No free chat · no voice · personal accounts only
            </div>
          </div>

          {signedIn === false && (
            <div className="rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-sm p-4 flex flex-wrap items-center justify-between gap-3">
              <p>Sign in to see and greet other learners.</p>
              <button type="button" onClick={() => requestAuthModal('signin')} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold cursor-pointer">
                Sign in
              </button>
            </div>
          )}

          {signedIn && (plaza.phase === 'checking' || plaza.phase === 'connecting') && (
            <p className="text-xs text-slate-500">Joining…</p>
          )}

          {plaza.phase === 'closed' && (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm p-4 flex flex-wrap items-center justify-between gap-3">
              <p>{PLAZA_CLOSED_MESSAGES[plaza.closedCode ?? ''] ?? PLAZA_CLOSED_MESSAGES.SERVER_ERROR}</p>
              <div className="flex gap-2">
                {!['SCHOOL_ACCOUNT', 'SUSPENDED'].includes(plaza.closedCode ?? '') && (
                  <button type="button" onClick={plaza.retry} className="px-3 py-1.5 rounded-lg border border-amber-400 font-bold cursor-pointer">
                    Try again
                  </button>
                )}
                <Link to={`/speaking/${place.id}`} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold">
                  Speaking task instead
                </Link>
              </div>
            </div>
          )}

          {plaza.notice && (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm p-3">{plaza.notice}</div>
          )}

          <WorldScene
            place={place}
            nickname={live ? plaza.me?.name ?? '' : ''}
            disabled={Boolean(picked)}
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

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 text-sm text-slate-600 dark:text-slate-300">
            <p className="font-bold text-slate-900 dark:text-white mb-1">🕹️ How it works</p>
            <p>
              Walk with the arrow keys (or W A S D), or tap the floor. Choose a set phrase or a stamp to greet the people around you. Tap
              another learner to block or report them.
            </p>
            <p className="mt-2">
              Want to talk with the {place.npc.name.toLowerCase()} in Japanese?{' '}
              <Link to={`/speaking/${place.id}`} className="text-indigo-600 font-bold underline">
                Try the speaking task
              </Link>
              .
            </p>
          </div>
        </main>
      </div>

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
