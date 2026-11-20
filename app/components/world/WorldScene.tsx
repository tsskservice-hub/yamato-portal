/**
 * @file WorldScene.tsx
 * @description 会話練習の空間（Yamato Town）の場面。アバターを動かして、AI のキャラクターに近づくと話しかけられる
 *
 * ・動かし方: 矢印キー / WASD、または床をタップ（クリック）すると、そこへ歩く
 * ・近づくと「Talk」のボタンが出る（Enter / E キーでも話しかけられる）
 * ・カメラは使わない（アバターと声だけ）
 * ・「みんなで（Together）」モードでは、ほかの利用者のアバター・決まった文の吹き出し・スタンプも出す（usePlaza.ts）。
 *   ほかの人のアバターを押すと、ブロック・報告のメニュー（onPickOther）
 * ・座標は場面の幅・高さに対する %
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { WorldPlace } from '~/data/world/places';
import type { PlazaBubble, PlazaPlayer } from './usePlaza';

const SPEED = 0.6; // 1 フレームに動く %（約 60 フレーム／秒）
const TALK_DISTANCE = 12;
/** アバター（api の PLAZA_AVATARS と同じ順。「みんなで」モードでは番号で送る） */
export const AVATARS = ['🧑‍🎓', '👩‍🎓', '👨‍🎓', '🐱', '🐶', '🦊'];

type Point = { x: number; y: number };

function blocked(place: WorldPlace, p: Point) {
  if (p.x < 3 || p.x > 97 || p.y < 4 || p.y > 96) return true;
  return place.walls.some((w) => p.x > w.x1 - 2 && p.x < w.x2 + 2 && p.y > w.y1 - 2 && p.y < w.y2 + 3);
}

export function WorldScene({
  place,
  nickname,
  disabled,
  onTalk,
  stateRef,
  onMove,
  onAvatarChange,
  others,
  bubbles,
  myPid,
  onPickOther,
}: {
  place: WorldPlace;
  /** 自分のアバターの下に出す名前（「みんなで」モードでは町の名前） */
  nickname: string;
  /** 会話中は動けない */
  disabled: boolean;
  /** AI のキャラクターに話しかける。無いとき（Yamato Town の交流だけの画面）は話しかける目印・ボタンを出さない */
  onTalk?: () => void;
  /** 今の位置とアバター（ページが読む。「みんなで」につなぐときに使う） */
  stateRef?: React.MutableRefObject<{ x: number; y: number; avatar: number }>;
  onMove?: (p: Point) => void;
  onAvatarChange?: (index: number) => void;
  /** 「みんなで」モードのほかの人 */
  others?: PlazaPlayer[];
  /** pid → 吹き出し（自分の分は myPid で探す） */
  bubbles?: Record<string, PlazaBubble>;
  myPid?: string;
  onPickOther?: (player: PlazaPlayer) => void;
}) {
  const [pos, setPos] = useState<Point>(() => (stateRef?.current ? { x: stateRef.current.x, y: stateRef.current.y } : place.start));
  const [avatarIndex, setAvatarIndex] = useState(() => stateRef?.current?.avatar ?? 0);
  const avatar = AVATARS[avatarIndex] ?? AVATARS[0];
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;
  useEffect(() => {
    if (stateRef) stateRef.current = { x: pos.x, y: pos.y, avatar: avatarIndex };
  }, [pos, avatarIndex, stateRef]);
  useEffect(() => {
    onMoveRef.current?.(pos);
  }, [pos]);
  const keys = useRef(new Set<string>());
  const target = useRef<Point | null>(null);
  const posRef = useRef(pos);
  posRef.current = pos;
  const sceneRef = useRef<HTMLDivElement>(null);

  const near = Boolean(onTalk) && Math.hypot(pos.x - place.npc.talkX, pos.y - place.npc.talkY) < TALK_DISTANCE;

  // 動かす（キーと、タップした場所へ歩く）
  useEffect(() => {
    let raf = 0;
    const step = () => {
      raf = requestAnimationFrame(step);
      if (disabled) return;
      let dx = 0;
      let dy = 0;
      const k = keys.current;
      if (k.has('arrowleft') || k.has('a')) dx -= 1;
      if (k.has('arrowright') || k.has('d')) dx += 1;
      if (k.has('arrowup') || k.has('w')) dy -= 1;
      if (k.has('arrowdown') || k.has('s')) dy += 1;
      if (dx || dy) {
        target.current = null;
      } else if (target.current) {
        dx = target.current.x - posRef.current.x;
        dy = target.current.y - posRef.current.y;
        if (Math.hypot(dx, dy) < SPEED) {
          target.current = null;
          return;
        }
      } else {
        return;
      }
      const len = Math.hypot(dx, dy) || 1;
      const p = posRef.current;
      const next = { x: p.x + (dx / len) * SPEED, y: p.y + (dy / len) * SPEED };
      // ぶつかったら、横か縦の片方だけでも進む
      if (!blocked(place, next)) setPos(next);
      else if (!blocked(place, { x: next.x, y: p.y })) setPos({ x: next.x, y: p.y });
      else if (!blocked(place, { x: p.x, y: next.y })) setPos({ x: p.x, y: next.y });
      else target.current = null;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [disabled, place]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const k = e.key.toLowerCase();
      if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'd', 'w', 's'].includes(k)) {
        keys.current.add(k);
        e.preventDefault();
      }
      if ((k === 'enter' || k === 'e') && !disabled && onTalk) {
        const p = posRef.current;
        if (Math.hypot(p.x - place.npc.talkX, p.y - place.npc.talkY) < TALK_DISTANCE) onTalk();
      }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [disabled, onTalk, place]);

  const walkTo = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled || !sceneRef.current) return;
      const r = sceneRef.current.getBoundingClientRect();
      target.current = { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 };
    },
    [disabled]
  );

  return (
    <div className="space-y-3">
      <div
        ref={sceneRef}
        onPointerDown={walkTo}
        className="relative w-full aspect-[16/10] rounded-3xl overflow-hidden border-4 border-amber-700/40 shadow-xl select-none touch-none cursor-pointer"
        style={{ background: place.floor }}
        role="application"
        aria-label={`${place.title}. Use the arrow keys or tap the floor to walk. Go to the ${place.npc.name} to talk.`}
      >
        {/* 壁・カウンター */}
        {place.walls.map((w, i) => (
          <div
            key={i}
            className="absolute rounded-lg shadow-md flex items-center justify-center text-white/90 text-xs font-bold"
            style={{ left: `${w.x1}%`, top: `${w.y1}%`, width: `${w.x2 - w.x1}%`, height: `${w.y2 - w.y1}%`, background: w.color }}
          >
            {w.label}
          </div>
        ))}

        {/* もの */}
        {place.things.map((t, i) => (
          <div
            key={i}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
            style={{ left: `${t.x}%`, top: `${t.y}%` }}
          >
            <span style={{ fontSize: `${t.size ?? 1.8}rem`, lineHeight: 1 }}>{t.icon}</span>
            {t.label && <span className="text-[10px] font-bold text-amber-900 bg-white/70 rounded px-1 mt-0.5">{t.label}</span>}
          </div>
        ))}

        {/* 話しかける場所の目印 */}
        {onTalk && <div
          className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed pointer-events-none transition ${
            near ? 'border-emerald-500 bg-emerald-300/30' : 'border-amber-600/40'
          }`}
          style={{ left: `${place.npc.talkX}%`, top: `${place.npc.talkY}%`, width: '9%', aspectRatio: '1' }}
        />}

        {/* AI のキャラクター */}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
          style={{ left: `${place.npc.x}%`, top: `${place.npc.y}%` }}
        >
          <span className="text-4xl sm:text-5xl leading-none drop-shadow">{place.npc.icon}</span>
          <span className="text-[10px] sm:text-xs font-bold bg-white/90 text-slate-800 rounded-full px-2 mt-0.5 shadow">
            {place.npc.nameJa}
          </span>
        </div>

        {/* ほかの人（「みんなで」モード）。押すとブロック・報告のメニュー */}
        {(others ?? []).map((o) => {
          const b = bubbles?.[o.pid];
          return (
            <button
              key={o.pid}
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onPickOther?.(o)}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer transition-[left,top] duration-200 ease-linear"
              style={{ left: `${o.x}%`, top: `${o.y}%` }}
              aria-label={`${o.name}. Options`}
              title={`${o.name} — block or report`}
            >
              {b && <Bubble bubble={b} />}
              {o.talking && !b && (
                <span className="mb-1 text-[10px] font-bold bg-white/90 text-slate-600 rounded-full px-2 py-0.5 shadow">💬 talking to the clerk</span>
              )}
              <span className="text-3xl sm:text-4xl leading-none drop-shadow opacity-90">{AVATARS[o.avatar] ?? AVATARS[0]}</span>
              <span lang="ja" className="text-[10px] sm:text-xs font-bold bg-white/90 text-slate-700 rounded-full px-2 mt-0.5 shadow max-w-[8rem] truncate">
                {o.name}
              </span>
            </button>
          );
        })}

        {/* 自分のアバター */}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
          style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
        >
          {myPid && bubbles?.[myPid] && <Bubble bubble={bubbles[myPid]} />}
          {near && !disabled && !(myPid && bubbles?.[myPid]) && (
            <span className="mb-1 text-[10px] sm:text-xs font-bold bg-emerald-600 text-white rounded-full px-2 py-0.5 shadow animate-bounce">
              Talk! (E)
            </span>
          )}
          <span className="text-4xl sm:text-5xl leading-none drop-shadow">{avatar}</span>
          <span className="text-[10px] sm:text-xs font-bold bg-indigo-600 text-white rounded-full px-2 mt-0.5 shadow max-w-[8rem] truncate">
            {nickname || 'You'}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1" aria-label="Choose your avatar">
          {AVATARS.map((a, i) => (
            <button
              key={a}
              type="button"
              onClick={() => {
                if (i === avatarIndex) return;
                setAvatarIndex(i);
                onAvatarChange?.(i);
              }}
              className={`text-2xl w-10 h-10 rounded-xl cursor-pointer ${avatarIndex === i ? 'bg-indigo-100 ring-2 ring-indigo-400' : 'hover:bg-slate-100'}`}
              aria-label={`Avatar ${a}`}
            >
              {a}
            </button>
          ))}
        </div>
        {onTalk && <button
          type="button"
          onClick={onTalk}
          disabled={!near || disabled}
          className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-40 cursor-pointer"
        >
          {near ? `🎤 Talk to the ${place.npc.name.toLowerCase()}` : `Walk to the ${place.npc.name.toLowerCase()} to talk`}
        </button>}
      </div>
    </div>
  );
}

/** 決まった文の吹き出し・スタンプ */
function Bubble({ bubble }: { bubble: PlazaBubble }) {
  return bubble.stamp ? (
    <span className="mb-1 text-3xl leading-none animate-bounce">{bubble.text}</span>
  ) : (
    <span lang="ja" className="mb-1 text-xs sm:text-sm font-bold bg-white text-slate-800 border border-slate-300 rounded-2xl px-2.5 py-1 shadow max-w-[11rem] text-center">
      {bubble.text}
    </span>
  );
}
