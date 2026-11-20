/**
 * @file app/routes/world.$place.tsx
 * @description 会話練習の空間（Yamato Town）の 1 つの場所（例: /world/burger-shop）
 *
 * ・場所のデータは app/data/world/places.ts。画面は共通（components/world）
 * ・アバターを動かして AI のキャラクターに近づき、「Talk」で声の会話を始める（ログインと、AI 体験かプラン が必要）
 * ・会話は 1 回 3 分・クレジットは CREDIT_COSTS.worldTalk3（サーバーが引く。api/src/handlers/world-handler.ts）
 */
import React, { useEffect, useState } from 'react';
import { Link, useParams } from '@remix-run/react';
import type { MetaFunction } from '@remix-run/cloudflare';
import { ToolPageWrapper } from '~/components/layout/ToolPageWrapper';
import { WorldScene } from '~/components/world/WorldScene';
import { WorldTalk } from '~/components/world/WorldTalk';
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

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSignedIn(Boolean(session));
      if (!session) return;
      const { data } = await supabase.from('profiles').select('nickname').eq('id', session.user.id).maybeSingle();
      if (data?.nickname) setNickname(String(data.nickname));
    })();
  }, []);

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

          {!talking ? (
            <>
              <WorldScene place={place} nickname={nickname} disabled={confirming} onTalk={askToTalk} />
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
                  <p>Walk with the arrow keys (or W A S D), or tap the floor. Go to the green circle in front of the {place.npc.name.toLowerCase()} and press “Talk” (or E). Speak in Japanese — the menu and useful phrases will be on screen.</p>
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
              <li>Speak in Japanese. What you say is shown on screen but not saved.</li>
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
    </ToolPageWrapper>
  );
}
