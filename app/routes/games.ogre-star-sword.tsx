/**
 * @file ogre-star-sword.tsx
 * @description Student Typing Defense Game (Vertical Shuriken Trajectory / Ogre Star Sword - English UI)
 */
import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import React, { useEffect, useRef, useState } from 'react';
import { Link } from '@remix-run/react';
import { ToolPageWrapper } from '~/components/ToolPageWrapper';
import type { PageLayoutRef } from '~/components/PageLayout';
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

interface ActiveEnemy {
  id: number;
  char: string;
  romaji: string;
  x: number; // Horizontal position on screen (%) [10% - 90%]
  y: number; // Distance approaching (0% = far, 90% = defense line)
}

interface AttackEffect {
  id: number;
  startX: number;
  startY: number;
  targetY: number;
  isHit: boolean;
  hitX?: number;
}

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
  const [isGlobalUnlocked, setIsGlobalUnlocked] = useState(false);
  const [isIndividualUnlocked, setIsIndividualUnlocked] = useState(false);
  const [isCodeUnlocked, setIsCodeUnlocked] = useState(false);
  const [inputPasscode, setInputPasscode] = useState('');

  const isAccessible = isGlobalUnlocked || isIndividualUnlocked || isCodeUnlocked;

  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPasscode === '1111') {
      setIsCodeUnlocked(true);
      alert('✨ Authentication successful! The game has been temporarily unlocked.');
    } else {
      alert('❌ Incorrect passcode.');
    }
  };

  return (
    <ToolPageWrapper layoutRef={layoutRef} breadcrumbTitle="Ogre Star Sword">
      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        <header className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-800">⚔️ Ogre Star Sword 〜Typing Defense Game〜</h1>
            <p className="text-xs text-slate-500 mt-0.5">Ogre Star Sword - VCE Japanese Typing Practice</p>
          </div>
        </header>

        {isAccessible ? (
          <OgreStarSwordArena />
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-6 shadow-sm">
            <div className="w-16 h-16 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center mx-auto text-3xl shadow-inner">
              🔒
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">This area is currently locked</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Please complete your class assignment or enter the passcode provided by your teacher.
              </p>
            </div>

            <form onSubmit={handlePasscodeSubmit} className="flex gap-2 max-w-xs mx-auto">
              <input
                type="text"
                maxLength={4}
                placeholder="4-digit code"
                value={inputPasscode}
                onChange={(e) => setInputPasscode(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-4 py-2 text-center text-lg font-mono tracking-widest w-full text-slate-900 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 font-bold px-4 py-2 rounded-lg text-white text-sm cursor-pointer shadow-sm transition"
              >
                Unlock
              </button>
            </form>
          </div>
        )}
      </div>
    </ToolPageWrapper>
  );
}

function OgreStarSwordArena() {
  const [score, setScore] = useState(0);
  const [defeatCount, setDefeatCount] = useState(0);
  const [hp, setHp] = useState(5);
  const [enemies, setEnemies] = useState<ActiveEnemy[]>([]);
  const [attacks, setAttacks] = useState<AttackEffect[]>([]);
  const [playerX, setPlayerX] = useState(50);
  const [inputVal, setInputVal] = useState('');
  const [isGameOver, setIsGameOver] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0);

  // 1. Speed up every 15 seconds
  useEffect(() => {
    if (isGameOver) return;
    const speedTimer = setInterval(() => {
      setSpeedMultiplier((prev) => prev + 0.3);
    }, 15000);

    return () => clearInterval(speedTimer);
  }, [isGameOver]);

  // 2. Spawn new ogres at regular intervals
  useEffect(() => {
    if (isGameOver) return;

    const spawnInterval = setInterval(() => {
      const template = ENEMY_POOL[Math.floor(Math.random() * ENEMY_POOL.length)];
      const newEnemy: ActiveEnemy = {
        id: Date.now() + Math.random(),
        char: template.char,
        romaji: template.romaji,
        x: Math.floor(Math.random() * 80) + 10,
        y: 0,
      };
      setEnemies((prev) => [...prev, newEnemy]);
    }, 2500);

    return () => clearInterval(spawnInterval);
  }, [isGameOver]);

  // 3. Move ogres
  useEffect(() => {
    if (isGameOver) return;

    const moveInterval = setInterval(() => {
      setEnemies((prev) => {
        const nextEnemies: ActiveEnemy[] = [];
        let lostHp = 0;

        prev.forEach((enemy) => {
          const nextY = enemy.y + 0.8 * speedMultiplier;
          if (nextY >= 90) {
            lostHp += 1;
          } else {
            nextEnemies.push({ ...enemy, y: nextY });
          }
        });

        if (lostHp > 0) {
          setHp((h) => {
            const updated = h - lostHp;
            if (updated <= 0) setIsGameOver(true);
            return Math.max(0, updated);
          });
        }

        return nextEnemies;
      });
    }, 100);

    return () => clearInterval(moveInterval);
  }, [isGameOver, speedMultiplier]);

  // 4. Move player with left/right arrow keys
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isGameOver) return;
    if (e.key === 'ArrowLeft') {
      setPlayerX((prev) => Math.max(10, prev - 6));
    } else if (e.key === 'ArrowRight') {
      setPlayerX((prev) => Math.min(90, prev + 6));
    }
  };

  const playVoiceCount = (count: number) => {
    try {
      const audio = new Audio(`/audio/hit-${count}.mp3`);
      audio.volume = 0.8;
      audio.play().catch(() => {});
    } catch (e) {}
  };

  // 5. Romaji input handling
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isGameOver) return;
    const val = e.target.value.toLowerCase();
    setInputVal(val);

    const matchedEnemy = enemies.find((enemy) => enemy.romaji === val);

    if (matchedEnemy) {
      const isAligned = Math.abs(playerX - matchedEnemy.x) <= 5;

      if (isAligned) {
        const newAttack: AttackEffect = {
          id: Date.now() + Math.random(),
          startX: playerX,
          startY: 90,
          targetY: matchedEnemy.y,
          isHit: true,
          hitX: matchedEnemy.x,
        };
        setAttacks((prev) => [...prev, newAttack]);

        setTimeout(() => {
          setEnemies((prev) => prev.filter((enemy) => enemy.id !== matchedEnemy.id));
          setAttacks((prev) => prev.filter((a) => a.id !== newAttack.id));
        }, 200);

        const newCount = defeatCount + 1;
        setScore((s) => s + 100);
        setDefeatCount(newCount);
        setInputVal('');

        playVoiceCount(newCount);
      } else {
        const missedAttack: AttackEffect = {
          id: Date.now() + Math.random(),
          startX: playerX,
          startY: 90,
          targetY: 5,
          isHit: false,
        };
        setAttacks((prev) => [...prev, missedAttack]);

        setTimeout(() => {
          setAttacks((prev) => prev.filter((a) => a.id !== missedAttack.id));
        }, 300);

        setInputVal('');
      }
    }
  };

  const restartGame = () => {
    setScore(0);
    setDefeatCount(0);
    setHp(5);
    setEnemies([]);
    setAttacks([]);
    setPlayerX(50);
    setInputVal('');
    setSpeedMultiplier(1.0);
    setIsGameOver(false);
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 text-center space-y-4 shadow-xl text-white" tabIndex={0} onKeyDown={handleKeyDown}>
      {/* Status Bar */}
      <div className="flex justify-between items-center bg-slate-800 p-3 rounded-xl border border-slate-700 text-sm">
        <span className="text-red-400 font-bold">❤️ HP: {'❤️'.repeat(hp)}</span>
        <span className="text-indigo-300 font-bold animate-pulse">🗣️ Defeated: {defeatCount}</span>
        <span className="text-emerald-400 font-bold">SCORE: {score} pt</span>
      </div>

      {/* Game Field */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl h-80 relative overflow-hidden flex flex-col justify-between p-4">
        {isGameOver ? (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center space-y-4 z-20">
            <h2 className="text-2xl font-black text-red-500">Game Over</h2>
            <p className="text-sm text-slate-300">Defeated: {defeatCount} ({score} pt)</p>
            <button
              onClick={restartGame}
              className="bg-indigo-600 hover:bg-indigo-700 font-bold px-6 py-2.5 rounded-xl text-white text-sm transition cursor-pointer"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            <div className="text-xs text-slate-500 tracking-wider flex justify-between">
              <span>▼ Ogre Domain ▼ (Lv.{speedMultiplier.toFixed(1)})</span>
              <span className="text-indigo-400">Use ← → keys to align and shoot!</span>
            </div>

            {/* Shuriken vertical trajectory SVG */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
              {attacks.map((atk) => (
                <line
                  key={atk.id}
                  x1={`${atk.startX}%`}
                  y1={`${atk.startY}%`}
                  x2={`${atk.startX}%`}
                  y2={`${atk.targetY}%`}
                  stroke={atk.isHit ? '#38bdf8' : '#ef4444'}
                  strokeWidth="3"
                  strokeDasharray="6,6"
                  className="animate-pulse"
                />
              ))}
            </svg>

            {/* Approaching Ogres */}
            <div className="absolute inset-0 pointer-events-none">
              {enemies.map((enemy) => {
                const isExactAligned = Math.abs(playerX - enemy.x) <= 5;
                return (
                  <div
                    key={enemy.id}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-100 flex flex-col items-center"
                    style={{ left: `${enemy.x}%`, top: `${enemy.y}%` }}
                  >
                    <span className="text-3xl animate-bounce">👹</span>
                    <div className={`px-2.5 py-0.5 rounded text-sm font-black text-white shadow-md ${isExactAligned ? 'bg-emerald-600 border-2 border-yellow-300 animate-pulse' : 'bg-red-600/90 border border-red-400'}`}>
                      {enemy.char}
                    </div>
                  </div>
                );
              })}

              {/* Hit effect */}
              {attacks.filter(a => a.isHit).map((atk) => (
                <div
                  key={`shuriken-${atk.id}`}
                  className="absolute text-2xl transition-all transform -translate-x-1/2 -translate-y-1/2 z-20 animate-spin"
                  style={{ left: `${atk.hitX}%`, top: `${atk.targetY}%` }}
                >
                  ✨
                </div>
              ))}
            </div>

            {/* Player (Ninja) */}
            <div className="absolute bottom-6 transform -translate-x-1/2 transition-all duration-75 flex flex-col items-center z-20" style={{ left: `${playerX}%` }}>
              <span className="text-xs text-indigo-300 font-bold mb-0.5">You</span>
              <span className="text-3xl">🥷</span>
            </div>

            {/* Defense Line */}
            <div className="border-t-2 border-dashed border-indigo-500/50 pt-2 flex justify-between items-center text-xs text-indigo-300 font-bold mt-auto">
              <span>🏰 Defense Line</span>
            </div>
          </>
        )}
      </div>

      {/* Key Input Section */}
      <div className="max-w-xs mx-auto space-y-2">
        <input
          type="text"
          autoFocus
          disabled={isGameOver}
          value={inputVal}
          onChange={handleInputChange}
          placeholder="Move with arrows & type Romaji"
          className="bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-center text-lg font-mono text-white w-full focus:outline-none focus:border-emerald-500 shadow-inner"
        />
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => setPlayerX((prev) => Math.max(10, prev - 10))}
            className="bg-slate-700 hover:bg-slate-600 px-4 py-1.5 rounded text-xs font-bold text-slate-200 cursor-pointer"
          >
            ◀ Move Left
          </button>
          <button
            onClick={() => setPlayerX((prev) => Math.min(90, prev + 10))}
            className="bg-slate-700 hover:bg-slate-600 px-4 py-1.5 rounded text-xs font-bold text-slate-200 cursor-pointer"
          >
            Move Right ▶
          </button>
        </div>
      </div>
    </div>
  );
}