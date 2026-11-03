/**
 * @file tower-defense.tsx
 * @description 生徒用タイピング防衛戦 (自キャラ左右移動・手裏剣発射・時間経過スピードアップ対応版)
 */
import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import React, { useEffect, useRef, useState } from 'react';
import { Link } from '@remix-run/react';
import { ToolPageWrapper } from '../components/ToolPageWrapper';
import type { PageLayoutRef } from '../components/PageLayout';
import { generateModuleMeta } from '../utils/seoMeta';
import { supabase } from '../lib/supabaseClient';

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
  x: number; // 画面上の横位置 (%) [10% 〜 90%]
  y: number; // 迫ってくる距離 (0% = 遠く, 90% = 防衛ライン)
}

interface FlyingShuriken {
  id: number;
  x: number;
  startY: number;
  targetY: number;
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

export default function StudentTowerDefensePage() {
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
      alert('✨ 認証成功！ゲームが一時的に解放されました。');
    } else {
      alert('❌ パスコードが違います。');
    }
  };

  return (
    <ToolPageWrapper layoutRef={layoutRef} breadcrumbTitle="Typing Tower Defense">
      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        <header className="bg-white border border-slate-200 p-5 rounded-xl flex justify-between items-center shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-800">🇯🇵 AI Yamato タイピング防衛戦</h1>
            <p className="text-xs text-slate-500 mt-0.5">VCE Japanese Typing Practice</p>
          </div>
          <Link
            to="/teacher-dashboard"
            className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-3.5 py-2 rounded-lg border border-indigo-200 transition no-underline inline-flex items-center"
          >
            教師用ダッシュボードへ ↗
          </Link>
        </header>

        {isAccessible ? (
          <GameArena />
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-6 shadow-sm">
            <div className="w-16 h-16 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center mx-auto text-3xl shadow-inner">
              🔒
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">このエリアは現在ロックされています</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                授業の課題を終わらせるか、先生から伝えられたパスコードを入力してください。早く終わった生徒は先生が個別に解放してくれます！
              </p>
            </div>

            <form onSubmit={handlePasscodeSubmit} className="flex gap-2 max-w-xs mx-auto">
              <input
                type="text"
                maxLength={4}
                placeholder="4桁コード"
                value={inputPasscode}
                onChange={(e) => setInputPasscode(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-4 py-2 text-center text-lg font-mono tracking-widest w-full text-slate-900 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 font-bold px-4 py-2 rounded-lg text-white text-sm cursor-pointer shadow-sm transition"
              >
                解除
              </button>
            </form>
          </div>
        )}
      </div>
    </ToolPageWrapper>
  );
}

function GameArena() {
  const [score, setScore] = useState(0);
  const [hp, setHp] = useState(5);
  const [enemies, setEnemies] = useState<ActiveEnemy[]>([]);
  const [shurikens, setShurikens] = useState<FlyingShuriken[]>([]);
  const [playerX, setPlayerX] = useState(50); // プレイヤーの横位置 (%) [10 〜 90]
  const [inputVal, setInputVal] = useState('');
  const [isGameOver, setIsGameOver] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0); // スピード倍率

  // 1. 15秒ごとにスピードを加速させるタイマー
  useEffect(() => {
    if (isGameOver) return;
    const speedTimer = setInterval(() => {
      setSpeedMultiplier((prev) => prev + 0.3); // 15秒ごとにスピードアップ
    }, 15000);

    return () => clearInterval(speedTimer);
  }, [isGameOver]);

  // 2. 一定間隔で新しい鬼を出現させる
  useEffect(() => {
    if (isGameOver) return;

    const spawnInterval = setInterval(() => {
      const template = ENEMY_POOL[Math.floor(Math.random() * ENEMY_POOL.length)];
      const newEnemy: ActiveEnemy = {
        id: Date.now() + Math.random(),
        char: template.char,
        romaji: template.romaji,
        x: Math.floor(Math.random() * 80) + 10, // 10%〜90%の横位置
        y: 0,
      };
      setEnemies((prev) => [...prev, newEnemy]);
    }, 2500);

    return () => clearInterval(spawnInterval);
  }, [isGameOver]);

  // 3. 鬼を移動させる ＆ スピード倍率を反映
  useEffect(() => {
    if (isGameOver) return;

    const moveInterval = setInterval(() => {
      setEnemies((prev) => {
        const nextEnemies: ActiveEnemy[] = [];
        let lostHp = 0;

        prev.forEach((enemy) => {
          const nextY = enemy.y + 0.8 * speedMultiplier; // スピード倍率を掛ける
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

  // 4. 左右矢印キーでプレイヤーを移動させる
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isGameOver) return;
    if (e.key === 'ArrowLeft') {
      setPlayerX((prev) => Math.max(10, prev - 6));
    } else if (e.key === 'ArrowRight') {
      setPlayerX((prev) => Math.min(90, prev + 6));
    }
  };

  // 5. ローマ字タイピング処理（正面の鬼にヒットするかチェック）
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isGameOver) return;
    const val = e.target.value.toLowerCase();
    setInputVal(val);

    // 一致するローマ字の鬼を探す
    const matchedEnemy = enemies.find((enemy) => enemy.romaji === val);

    if (matchedEnemy) {
      // プレイヤーと鬼の横位置のズレが近いかチェック（±15%以内なら正面とみなす）
      const isAligned = Math.abs(playerX - matchedEnemy.x) <= 15;

      if (isAligned) {
        // ヒット！手裏剣を自キャラの位置(playerX)から発射
        const newShuriken: FlyingShuriken = {
          id: Date.now() + Math.random(),
          x: playerX,
          startY: 90,
          targetY: matchedEnemy.y,
        };
        setShurikens((prev) => [...prev, newShuriken]);

        setTimeout(() => {
          setEnemies((prev) => prev.filter((enemy) => enemy.id !== matchedEnemy.id));
          setShurikens((prev) => prev.filter((s) => s.id !== newShuriken.id));
        }, 150);

        setScore((s) => s + 100);
        setInputVal('');
      } else {
        // 位置がずれている場合は、移動のヒントを出すか、そのまま残す
        // （ここでは位置を合わせてね！という演出としてあえて外すことも可能ですが入力だけリセット）
      }
    }
  };

  const restartGame = () => {
    setScore(0);
    setHp(5);
    setEnemies([]);
    setShurikens([]);
    setPlayerX(50);
    setInputVal('');
    setSpeedMultiplier(1.0);
    setIsGameOver(false);
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 text-center space-y-4 shadow-xl text-white" tabIndex={0} onKeyDown={handleKeyDown}>
      {/* ステータスバー */}
      <div className="flex justify-between items-center bg-slate-800 p-3 rounded-xl border border-slate-700 text-sm">
        <span className="text-red-400 font-bold">❤️ HP: {'❤️'.repeat(hp)}</span>
        <span className="text-amber-300 font-bold">⚡ スピードLv: {speedMultiplier.toFixed(1)}x</span>
        <span className="text-emerald-400 font-bold">SCORE: {score} pt</span>
      </div>

      {/* ゲームフィールド */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl h-80 relative overflow-hidden flex flex-col justify-between p-4">
        {isGameOver ? (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center space-y-4 z-20">
            <h2 className="text-2xl font-black text-red-500">ゲームオーバー</h2>
            <p className="text-sm text-slate-300">スコア: {score} pt</p>
            <button
              onClick={restartGame}
              className="bg-indigo-600 hover:bg-indigo-700 font-bold px-6 py-2.5 rounded-xl text-white text-sm transition cursor-pointer"
            >
              もう一度挑戦する
            </button>
          </div>
        ) : (
          <>
            <div className="text-xs text-slate-500 tracking-wider flex justify-between">
              <span>▼ 鬼のエリア ▼</span>
              <span className="text-indigo-400">← → キーで左右に移動できます</span>
            </div>

            {/* 迫ってくる鬼たち */}
            <div className="absolute inset-0 pointer-events-none">
              {enemies.map((enemy) => {
                const isCloseToPlayer = Math.abs(playerX - enemy.x) <= 15;
                return (
                  <div
                    key={enemy.id}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-100 flex flex-col items-center"
                    style={{ left: `${enemy.x}%`, top: `${enemy.y}%` }}
                  >
                    <span className="text-3xl animate-bounce">👹</span>
                    <div className={`px-2.5 py-0.5 rounded text-sm font-black text-white shadow-md ${isCloseToPlayer ? 'bg-emerald-600 border border-emerald-300 animate-pulse' : 'bg-red-600/90 border border-red-400'}`}>
                      {enemy.char}
                    </div>
                  </div>
                );
              })}

              {/* 発射された手裏剣 */}
              {shurikens.map((s) => (
                <div
                  key={s.id}
                  className="absolute text-xl transition-all duration-150 transform -translate-x-1/2 -translate-y-1/2 animate-spin"
                  style={{ left: `${s.x}%`, top: `${s.targetY}%` }}
                >
                  ✨
                </div>
              ))}
            </div>

            {/* 防衛ライン上のプレイヤー（忍者） */}
            <div className="absolute bottom-6 transform -translate-x-1/2 transition-all duration-75 flex flex-col items-center" style={{ left: `${playerX}%` }}>
              <span className="text-xs text-indigo-300 font-bold mb-0.5">あなた</span>
              <span className="text-3xl">🥷</span>
            </div>

            {/* 防衛ライン */}
            <div className="border-t-2 border-dashed border-indigo-500/50 pt-2 flex justify-between items-center text-xs text-indigo-300 font-bold mt-auto">
              <span>🏰 防衛ライン</span>
            </div>
          </>
        )}
      </div>

      {/* キー入力欄 */}
      <div className="max-w-xs mx-auto space-y-2">
        <input
          type="text"
          autoFocus
          disabled={isGameOver}
          value={inputVal}
          onChange={handleInputChange}
          placeholder="矢印キーで移動 ＆ ローマ字入力"
          className="bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-center text-lg font-mono text-white w-full focus:outline-none focus:border-emerald-500 shadow-inner"
        />
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => setPlayerX((prev) => Math.max(10, prev - 10))}
            className="bg-slate-700 hover:bg-slate-600 px-4 py-1.5 rounded text-xs font-bold text-slate-200 cursor-pointer"
          >
            ◀ 左へ移動
          </button>
          <button
            onClick={() => setPlayerX((prev) => Math.min(90, prev + 10))}
            className="bg-slate-700 hover:bg-slate-600 px-4 py-1.5 rounded text-xs font-bold text-slate-200 cursor-pointer"
          >
            右へ移動 ▶
          </button>
        </div>
      </div>
    </div>
  );
}