/**
 * @file games.ogre-star-sword.tsx
 * @description Ogre Star Sword ~Typing Defense Game~
 *  鬼（文字）が上から近づいてくる。← → で鬼の真下に移動し、その文字のローマ字を打つと手裏剣で倒せる。
 *  鬼が防衛線に着くと HP が 1 減る。15 秒ごとに鬼が速くなる。
 *
 *  倒したときの音: 斬る音（sword-sound.mp3）→ 倒した数を人の数え方で（ひとり、ふたり … じゅうにん、11 体目からまた ひとり）。
 *  音声ファイルは public/game-assets/ogre-star-sword/ に置く（ファイルがない間は鳴らないだけで、ゲームは動く）。
 *  ログインと先生のゲームのロックは GameAccessGate が確認する。
 */
import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ToolPageWrapper } from '~/components/layout/ToolPageWrapper';
import type { PageLayoutRef } from '~/components/layout/PageLayout';
import { GameAccessGate } from '~/components/games/GameAccessGate';
import { generateModuleMeta } from '~/utils/seoMeta';
import { supabase } from '~/lib/supabaseClient';

const ENEMY_POOL = [
  { char: 'あ', romaji: 'a' },
  { char: 'い', romaji: 'i' },
  { char: 'う', romaji: 'u' },
  { char: 'え', romaji: 'e' },
  { char: 'お', romaji: 'o' },
  { char: 'か', romaji: 'ka' },
  { char: 'き', romaji: 'ki' },
  { char: 'く', romaji: 'ku' },
  { char: 'け', romaji: 'ke' },
  { char: 'こ', romaji: 'ko' },
  { char: 'さ', romaji: 'sa' },
  { char: 'し', romaji: 'shi' },
  { char: 'す', romaji: 'su' },
  { char: 'せ', romaji: 'se' },
  { char: 'そ', romaji: 'so' },
  { char: '日', romaji: 'nichi' },
  { char: '本', romaji: 'hon' },
];

// ---- tuning ----
const START_HP = 5;
const TICK_MS = 100;
const SPAWN_MS = 2500;
const SPEED_UP_MS = 15000;
const SPEED_STEP = 0.3;
const ENEMY_STEP = 0.8; // % of the field per tick at speed 1
const DEFENSE_LINE = 90; // %
/** The ninja must be within this many % (left/right) of an ogre to hit it */
const ALIGN = 5;
const KEY_STEP = 6;
const BUTTON_STEP = 10;
const POINTS = 100;

// ---- sounds (public/game-assets/ogre-star-sword/) ----
const SOUND_DIR = '/game-assets/ogre-star-sword';
const SWORD_SOUND = `${SOUND_DIR}/sword-sound.mp3`;
/** count-1.mp3 = ひとり … count-10.mp3 = じゅうにん. After 10 it starts again from 1. */
const COUNT_SOUNDS = Array.from({ length: 10 }, (_, i) => `${SOUND_DIR}/count-${i + 1}.mp3`);
/** If the sword sound never reports "ended", say the count after this long anyway */
const COUNT_FALLBACK_MS = 1500;

interface ActiveEnemy {
  id: number;
  char: string;
  romaji: string;
  x: number; // horizontal position (%) [10% - 90%]
  y: number; // distance (0% = far, 90% = defense line)
}

interface AttackEffect {
  id: number;
  startX: number;
  targetY: number;
  isHit: boolean;
  hitX?: number;
}

type Phase = 'start' | 'playing' | 'paused' | 'over';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  let portalContent = null;
  try {
    const { data: portalData } = await supabase
      .from('portal_settings')
      .select('content')
      .eq('key', 'PORTAL_CONTENT')
      .single();
    portalContent = portalData?.content || null;
  } catch (e) {}

  return json({
    portalContent,
    currentPath: url.pathname,
  });
}

export const meta: MetaFunction<typeof loader> = ({ data }: { data: any }) => {
  return generateModuleMeta(data?.portalContent || null, data?.currentPath || '');
};

export default function OgreStarSwordPage() {
  const layoutRef = useRef<PageLayoutRef>(null);

  return (
    <ToolPageWrapper layoutRef={layoutRef} breadcrumbTitle="Ogre Star Sword">
      <div className="max-w-xl mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-6">
        <header className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-800">⚔️ Ogre Star Sword 〜Typing Defense Game〜</h1>
            <p className="text-xs text-slate-500 mt-0.5">Ogre Star Sword - VCE Japanese Typing Practice</p>
          </div>
        </header>

        <GameAccessGate layoutRef={layoutRef}>{() => <OgreStarSwordArena />}</GameAccessGate>
      </div>
    </ToolPageWrapper>
  );
}

/**
 * 倒したときの音。最初に Start を押したとき（ブラウザが音を許可する操作の中）に読み込む。
 * ファイルが見つからない音は飛ばす。
 */
function useDefeatSounds() {
  const baseRef = useRef<{ sword: HTMLAudioElement; counts: HTMLAudioElement[] } | null>(null);
  const failedRef = useRef(new Set<string>());
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const load = useCallback(() => {
    if (baseRef.current || typeof Audio === 'undefined') return;
    const make = (src: string) => {
      const a = new Audio(src);
      a.preload = 'auto';
      a.addEventListener('error', () => failedRef.current.add(src), { once: true });
      return a;
    };
    baseRef.current = { sword: make(SWORD_SOUND), counts: COUNT_SOUNDS.map(make) };
  }, []);

  /** 斬る音 → 数（count は 1 から。10 を超えたら 1 に戻る） */
  const playDefeat = useCallback((count: number) => {
    const base = baseRef.current;
    if (!base || mutedRef.current) return;
    const countAudio = base.counts[(count - 1) % COUNT_SOUNDS.length];

    const play = (src: HTMLAudioElement) => {
      if (failedRef.current.has(src.src.replace(location.origin, ''))) return null;
      // 続けて倒したときに前の音を切らないよう、毎回コピーを鳴らす
      const a = src.cloneNode(true) as HTMLAudioElement;
      a.volume = 0.8;
      return a;
    };

    let countPlayed = false;
    const sayCount = () => {
      if (countPlayed || mutedRef.current) return;
      countPlayed = true;
      play(countAudio)?.play().catch(() => {});
    };

    const sword = play(base.sword);
    if (!sword) {
      sayCount();
      return;
    }
    sword.addEventListener('ended', sayCount, { once: true });
    sword.addEventListener('error', sayCount, { once: true });
    sword.play().catch(sayCount);
    setTimeout(sayCount, COUNT_FALLBACK_MS);
  }, []);

  return { load, playDefeat, muted, setMuted };
}

function OgreStarSwordArena() {
  const [phase, setPhase] = useState<Phase>('start');
  const [score, setScore] = useState(0);
  const [defeatCount, setDefeatCount] = useState(0);
  const [hp, setHp] = useState(START_HP);
  const [enemies, setEnemiesState] = useState<ActiveEnemy[]>([]);
  const [attacks, setAttacks] = useState<AttackEffect[]>([]);
  const [playerX, setPlayerX] = useState(50);
  const [inputVal, setInputVal] = useState('');
  const [speed, setSpeed] = useState(1.0);

  const { load: loadSounds, playDefeat, muted, setMuted } = useDefeatSounds();
  const inputRef = useRef<HTMLInputElement>(null);

  // The game loop and the typing handler both read the latest values from these refs
  const enemiesRef = useRef<ActiveEnemy[]>([]);
  const setEnemies = (next: ActiveEnemy[]) => {
    enemiesRef.current = next;
    setEnemiesState(next);
  };
  const playerXRef = useRef(playerX);
  playerXRef.current = playerX;
  const defeatCountRef = useRef(0);
  const speedRef = useRef(1.0);
  const spawnClockRef = useRef(0);
  const speedClockRef = useRef(0);
  const nextIdRef = useRef(1);

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (fn: () => void, ms: number) => {
    timersRef.current.push(setTimeout(fn, ms));
  };
  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

  const focusInput = () => setTimeout(() => inputRef.current?.focus(), 0);

  const startGame = () => {
    loadSounds();
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setScore(0);
    setDefeatCount(0);
    defeatCountRef.current = 0;
    setHp(START_HP);
    setEnemies([]);
    setAttacks([]);
    setPlayerX(50);
    setInputVal('');
    speedRef.current = 1.0;
    setSpeed(1.0);
    spawnClockRef.current = SPAWN_MS - 600; // the first ogre appears soon after starting
    speedClockRef.current = 0;
    setPhase('playing');
    focusInput();
  };

  const resume = () => {
    setPhase('playing');
    focusInput();
  };

  // ---- game loop: spawn, speed up, move (only while playing; pauses when the tab is hidden) ----
  useEffect(() => {
    if (phase !== 'playing') return;
    const timer = setInterval(() => {
      if (document.hidden) {
        setPhase('paused');
        return;
      }

      speedClockRef.current += TICK_MS;
      if (speedClockRef.current >= SPEED_UP_MS) {
        speedClockRef.current = 0;
        speedRef.current = Math.round((speedRef.current + SPEED_STEP) * 10) / 10;
        setSpeed(speedRef.current);
      }

      let list = enemiesRef.current;
      spawnClockRef.current += TICK_MS;
      if (spawnClockRef.current >= SPAWN_MS) {
        spawnClockRef.current = 0;
        const template = ENEMY_POOL[Math.floor(Math.random() * ENEMY_POOL.length)];
        list = [...list, { id: nextIdRef.current++, ...template, x: Math.floor(Math.random() * 80) + 10, y: 0 }];
      }

      let lost = 0;
      const moved: ActiveEnemy[] = [];
      for (const enemy of list) {
        const y = enemy.y + ENEMY_STEP * speedRef.current;
        if (y >= DEFENSE_LINE) lost++;
        else moved.push({ ...enemy, y });
      }
      setEnemies(moved);
      if (lost > 0) setHp((h) => Math.max(0, h - lost));
    }, TICK_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (phase === 'playing' && hp <= 0) setPhase('over');
  }, [phase, hp]);

  // Pause when the tab is hidden (also covers a tab switch between ticks)
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) setPhase((p) => (p === 'playing' ? 'paused' : p));
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const move = (step: number) => {
    if (phase !== 'playing') return;
    setPlayerX((prev) => Math.min(90, Math.max(10, prev + step)));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault(); // keep the text cursor still
      move(-KEY_STEP);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      move(KEY_STEP);
    }
  };

  // ---- romaji input ----
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (phase !== 'playing') return;
    const val = e.target.value.toLowerCase().replace(/\s+/g, '');
    setInputVal(val);

    const matches = enemiesRef.current.filter((enemy) => enemy.romaji === val);
    if (matches.length === 0) return;

    const x = playerXRef.current;
    // Several ogres can have the same kana: hit an aligned one (the one closest to the defense line)
    const target = matches
      .filter((enemy) => Math.abs(x - enemy.x) <= ALIGN)
      .sort((a, b) => b.y - a.y)[0];
    setInputVal('');

    if (target) {
      // Remove the ogre straight away so the same ogre can't be defeated twice
      setEnemies(enemiesRef.current.filter((enemy) => enemy.id !== target.id));
      const attack: AttackEffect = { id: Date.now() + Math.random(), startX: x, targetY: target.y, isHit: true, hitX: target.x };
      setAttacks((prev) => [...prev, attack]);
      later(() => setAttacks((prev) => prev.filter((a) => a.id !== attack.id)), 300);

      defeatCountRef.current += 1;
      setDefeatCount(defeatCountRef.current);
      setScore((s) => s + POINTS);
      playDefeat(defeatCountRef.current);
    } else {
      const miss: AttackEffect = { id: Date.now() + Math.random(), startX: x, targetY: 5, isHit: false };
      setAttacks((prev) => [...prev, miss]);
      later(() => setAttacks((prev) => prev.filter((a) => a.id !== miss.id)), 300);
    }
  };

  // On-screen buttons must not take the focus away from the romaji box
  const keepFocus = (e: React.PointerEvent | React.MouseEvent) => e.preventDefault();

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 sm:p-6 text-center space-y-4 shadow-xl text-white" onKeyDown={handleKeyDown}>
      {/* Status bar */}
      <div className="flex flex-wrap justify-between items-center gap-2 bg-slate-800 p-3 rounded-xl border border-slate-700 text-sm">
        <span className="text-red-400 font-bold" aria-label={`HP ${hp} of ${START_HP}`}>❤️ {'❤️'.repeat(hp)}</span>
        <span className="text-indigo-300 font-bold">🗡️ Defeated: {defeatCount}</span>
        <span className="text-emerald-400 font-bold">SCORE: {score} pt</span>
        <span className="flex gap-1.5">
          <button
            type="button"
            onPointerDown={keepFocus}
            onClick={() => setMuted((m) => !m)}
            aria-pressed={muted}
            aria-label={muted ? 'Sound off' : 'Sound on'}
            className="bg-slate-700 hover:bg-slate-600 px-2.5 py-1 rounded text-xs font-bold cursor-pointer"
          >
            {muted ? '🔇' : '🔊'}
          </button>
          {phase === 'playing' && (
            <button
              type="button"
              onClick={() => setPhase('paused')}
              className="bg-slate-700 hover:bg-slate-600 px-2.5 py-1 rounded text-xs font-bold cursor-pointer"
            >
              ⏸ Pause
            </button>
          )}
        </span>
      </div>

      {/* Game field */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl h-80 relative overflow-hidden flex flex-col justify-between p-4">
        {phase === 'start' && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center gap-3 z-30 p-5">
            <h2 className="text-2xl font-black text-amber-300">⚔️ Defend the castle!</h2>
            <p className="text-sm text-slate-300 leading-relaxed max-w-sm">
              Ogres 👹 carry kana as they march down. Move under an ogre with ← → (or the buttons), then type its romaji to throw
              your star sword. Don&apos;t let them reach the defense line!
            </p>
            <button type="button" onClick={startGame} className="bg-indigo-600 hover:bg-indigo-700 font-bold px-8 py-3 rounded-xl text-white transition cursor-pointer">
              Start
            </button>
          </div>
        )}

        {phase === 'paused' && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center gap-3 z-30">
            <h2 className="text-2xl font-black text-slate-100">⏸ Paused</h2>
            <button type="button" onClick={resume} className="bg-indigo-600 hover:bg-indigo-700 font-bold px-8 py-3 rounded-xl text-white transition cursor-pointer">
              Resume
            </button>
          </div>
        )}

        {phase === 'over' && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center gap-4 z-30">
            <h2 className="text-2xl font-black text-red-500">Game Over</h2>
            <p className="text-sm text-slate-300">Defeated: {defeatCount} ({score} pt)</p>
            <button type="button" onClick={startGame} className="bg-indigo-600 hover:bg-indigo-700 font-bold px-6 py-2.5 rounded-xl text-white text-sm transition cursor-pointer">
              Try Again
            </button>
          </div>
        )}

        <div className="text-xs text-slate-500 tracking-wider flex justify-between gap-2">
          <span>▼ Ogre Domain ▼ (Lv.{speed.toFixed(1)})</span>
          <span className="text-indigo-400 hidden sm:inline">Use ← → to line up, then type!</span>
        </div>

        {/* Star sword trajectories */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          {attacks.map((atk) => (
            <line
              key={atk.id}
              x1={`${atk.startX}%`}
              y1={`${DEFENSE_LINE}%`}
              x2={`${atk.startX}%`}
              y2={`${atk.targetY}%`}
              stroke={atk.isHit ? '#38bdf8' : '#ef4444'}
              strokeWidth="3"
              strokeDasharray="6,6"
              className="animate-pulse"
            />
          ))}
        </svg>

        {/* Ogres */}
        <div className="absolute inset-0 pointer-events-none">
          {enemies.map((enemy) => {
            const aligned = Math.abs(playerX - enemy.x) <= ALIGN;
            return (
              <div
                key={enemy.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-100 flex flex-col items-center"
                style={{ left: `${enemy.x}%`, top: `${enemy.y}%` }}
              >
                <span className="text-3xl">👹</span>
                <div className={`px-2.5 py-0.5 rounded text-sm font-black text-white shadow-md ${aligned ? 'bg-emerald-600 border-2 border-yellow-300 animate-pulse' : 'bg-red-600/90 border border-red-400'}`}>
                  {enemy.char}
                </div>
              </div>
            );
          })}

          {attacks.filter((a) => a.isHit).map((atk) => (
            <div
              key={`hit-${atk.id}`}
              className="absolute text-2xl transform -translate-x-1/2 -translate-y-1/2 z-20 animate-spin"
              style={{ left: `${atk.hitX}%`, top: `${atk.targetY}%` }}
            >
              ✨
            </div>
          ))}
        </div>

        {/* Player (ninja) */}
        <div className="absolute bottom-6 transform -translate-x-1/2 transition-all duration-75 flex flex-col items-center z-20" style={{ left: `${playerX}%` }}>
          <span className="text-xs text-indigo-300 font-bold mb-0.5">You</span>
          <span className="text-3xl">🥷</span>
        </div>

        {/* Defense line */}
        <div className="border-t-2 border-dashed border-indigo-500/50 pt-2 flex justify-between items-center text-xs text-indigo-300 font-bold mt-auto">
          <span>🏰 Defense Line</span>
        </div>
      </div>

      {/* Romaji input and on-screen movement buttons */}
      <div className="max-w-sm mx-auto space-y-2">
        <input
          ref={inputRef}
          type="text"
          disabled={phase !== 'playing'}
          value={inputVal}
          onChange={handleInputChange}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Type the romaji"
          placeholder="Move with ← → and type romaji"
          className="bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-center text-lg font-mono text-white w-full focus:outline-none focus:border-emerald-500 shadow-inner disabled:opacity-50"
        />
        <div className="flex gap-2 justify-center">
          <button
            type="button"
            onPointerDown={keepFocus}
            onMouseDown={keepFocus}
            onClick={() => move(-BUTTON_STEP)}
            className="flex-1 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 py-3 rounded-lg text-sm font-bold text-slate-200 cursor-pointer select-none touch-manipulation"
          >
            ◀ Move Left
          </button>
          <button
            type="button"
            onPointerDown={keepFocus}
            onMouseDown={keepFocus}
            onClick={() => move(BUTTON_STEP)}
            className="flex-1 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 py-3 rounded-lg text-sm font-bold text-slate-200 cursor-pointer select-none touch-manipulation"
          >
            Move Right ▶
          </button>
        </div>
      </div>
    </div>
  );
}
