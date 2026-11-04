/**
 * @file character-maze.tsx
 * @description 迷宮の文字探し 〜タイピング・アドベンチャー〜 (本格迷路・蛇回避・ローマ字タイピング)
 */
import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import React, { useEffect, useRef, useState } from 'react';
import { Link } from '@remix-run/react';
import { ToolPageWrapper } from '~/components/ToolPageWrapper';
import type { PageLayoutRef } from '~/components/PageLayout';
import { generateModuleMeta } from '~/utils/seoMeta';
import { supabase } from '~/lib/supabaseClient';

// 11x11 の迷路マップ (1: 壁, 0: 通路)
const MAZE_GRID = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],
  [1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

// 通路の座標リスト (アイテムやへびを置く候補地)
const PATH_COORDS: { x: number; y: number }[] = [];
MAZE_GRID.forEach((row, y) => {
  row.forEach((cell, x) => {
    if (cell === 0 && !(x === 1 && y === 1)) {
      PATH_COORDS.push({ x, y });
    }
  });
});

const CHARACTER_POOL = [
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
  { char: 'サ', romaji: 'sa' },
  { char: 'シ', romaji: 'shi' },
  { char: 'ス', romaji: 'su' },
  { char: '日', romaji: 'nichi' },
  { char: '本', romaji: 'hon' },
  { char: '水', romaji: 'mizu' },
  { char: '火', romaji: 'hi' },
];

interface ItemNode {
  id: number;
  char: string;
  romaji: string;
  x: number;
  y: number;
}

interface SnakeNode {
  id: number;
  x: number;
  y: number;
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

export default function CharacterMazePage() {
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
    <ToolPageWrapper layoutRef={layoutRef} breadcrumbTitle="迷宮の文字探し">
      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        <header className="bg-white border border-slate-200 p-5 rounded-xl flex justify-between items-center shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-800">🧭 迷宮の文字探し 〜タイピング・アドベンチャー〜</h1>
            <p className="text-xs text-slate-500 mt-0.5">Character Maze - VCE Japanese Practice</p>
          </div>
          <Link
            to="/teacher-dashboard"
            className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-3.5 py-2 rounded-lg border border-indigo-200 transition no-underline inline-flex items-center"
          >
            教師用ダッシュボードへ ↗
          </Link>
        </header>

        {isAccessible ? (
          <CharacterMazeArena />
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

function CharacterMazeArena() {
  const [score, setScore] = useState(0);
  const [collectedCount, setCollectedCount] = useState(0);
  const [hp, setHp] = useState(5);
  
  const [playerX, setPlayerX] = useState(1);
  const [playerY, setPlayerY] = useState(1);

  const [items, setItems] = useState<ItemNode[]>([]);
  const [snakes, setSnakes] = useState<SnakeNode[]>([]);

  const [activeQuizItem, setActiveQuizItem] = useState<ItemNode | null>(null);
  const [typingInput, setTypingInput] = useState('');
  const [quizFeedback, setQuizFeedback] = useState<string | null>(null);

  const [isGoalReached, setIsGoalReached] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  const spawnInitialEntities = () => {
    const shuffledPaths = [...PATH_COORDS].sort(() => 0.5 - Math.random());
    
    const initialItems: ItemNode[] = [];
    const charPoolShuffled = [...CHARACTER_POOL].sort(() => 0.5 - Math.random());
    for (let i = 0; i < 5 && i < shuffledPaths.length; i++) {
      const pos = shuffledPaths[i];
      initialItems.push({
        id: Date.now() + i,
        char: charPoolShuffled[i].char,
        romaji: charPoolShuffled[i].romaji,
        x: pos.x,
        y: pos.y,
      });
    }
    setItems(initialItems);

    const initialSnakes: SnakeNode[] = [];
    for (let i = 5; i < 8 && i < shuffledPaths.length; i++) {
      const pos = shuffledPaths[i];
      initialSnakes.push({
        id: Date.now() + 100 + i,
        x: pos.x,
        y: pos.y,
      });
    }
    setSnakes(initialSnakes);
  };

  useEffect(() => {
    spawnInitialEntities();
  }, []);

  useEffect(() => {
    if (isGameOver || activeQuizItem || isGoalReached) return;

    const snakeInterval = setInterval(() => {
      setSnakes((prevSnakes) =>
        prevSnakes.map((snake) => {
          const directions = [
            { dx: 0, dy: -1 },
            { dx: 0, dy: 1 },
            { dx: -1, dy: 0 },
            { dx: 1, dy: 0 },
          ];
          const validMoves = directions.filter(
            (d) => MAZE_GRID[snake.y + d.dy]?.[snake.x + d.dx] === 0
          );
          if (validMoves.length > 0) {
            const move = validMoves[Math.floor(Math.random() * validMoves.length)];
            return { ...snake, x: snake.x + move.dx, y: snake.y + move.dy };
          }
          return snake;
        })
      );
    }, 1200);

    return () => clearInterval(snakeInterval);
  }, [isGameOver, activeQuizItem, isGoalReached]);

  useEffect(() => {
    if (isGameOver || activeQuizItem || isGoalReached) return;

    snakes.forEach((snake) => {
      if (snake.x === playerX && snake.y === playerY) {
        setHp((h) => {
          const updated = h - 1;
          if (updated <= 0) setIsGameOver(true);
          return Math.max(0, updated);
        });
        setPlayerX(1);
        setPlayerY(1);
      }
    });

    items.forEach((item) => {
      if (item.x === playerX && item.y === playerY && !activeQuizItem) {
        setActiveQuizItem(item);
        setTypingInput('');
        setQuizFeedback(null);
      }
    });

    if (playerX === 9 && playerY === 9 && collectedCount >= 3) {
      setIsGoalReached(true);
    }
  }, [playerX, playerY, snakes, items, activeQuizItem, isGameOver, isGoalReached, collectedCount]);

  useEffect(() => {
    const handleKeyDownGlobal = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'w', 'a', 's', 'd'].includes(e.key)) {
        e.preventDefault();
      }

      if (isGameOver || activeQuizItem || isGoalReached) return;

      let dx = 0;
      let dy = 0;
      if (e.key === 'ArrowLeft' || e.key === 'a') dx = -1;
      else if (e.key === 'ArrowRight' || e.key === 'd') dx = 1;
      else if (e.key === 'ArrowUp' || e.key === 'w') dy = -1;
      else if (e.key === 'ArrowDown' || e.key === 's') dy = 1;

      if (dx !== 0 || dy !== 0) {
        const nextX = playerX + dx;
        const nextY = playerY + dy;
        if (MAZE_GRID[nextY]?.[nextX] === 0) {
          setPlayerX(nextX);
          setPlayerY(nextY);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDownGlobal);
    return () => window.removeEventListener('keydown', handleKeyDownGlobal);
  }, [playerX, playerY, isGameOver, activeQuizItem, isGoalReached]);

  const handleQuizSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuizItem) return;

    if (typingInput.toLowerCase().trim() === activeQuizItem.romaji) {
      setQuizFeedback('正解！ 🎉');
      setTimeout(() => {
        setScore((s) => s + 200);
        setCollectedCount((c) => c + 1);
        setItems((prev) => prev.filter((i) => i.id !== activeQuizItem.id));
        setActiveQuizItem(null);
        setTypingInput('');
        setQuizFeedback(null);
      }, 800);
    } else {
      setQuizFeedback('ざんねん！不正解 🌀 文字が別の通路に逃げました…');
      setTimeout(() => {
        const randomPath = PATH_COORDS[Math.floor(Math.random() * PATH_COORDS.length)];
        setItems((prev) =>
          prev.map((i) =>
            i.id === activeQuizItem.id
              ? { ...i, x: randomPath.x, y: randomPath.y }
              : i
          )
        );
        setActiveQuizItem(null);
        setTypingInput('');
        setQuizFeedback(null);
      }, 1200);
    }
  };

  const restartGame = () => {
    setScore(0);
    setCollectedCount(0);
    setHp(5);
    setPlayerX(1);
    setPlayerY(1);
    setIsGoalReached(false);
    setIsGameOver(false);
    setActiveQuizItem(null);
    spawnInitialEntities();
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 text-center space-y-4 shadow-xl text-white">
      <div className="flex justify-between items-center bg-slate-800 p-3 rounded-xl border border-slate-700 text-sm">
        <span className="text-red-400 font-bold">❤️ HP: {'❤️'.repeat(hp)}</span>
        <span className="text-amber-300 font-bold">🎒 獲得文字: {collectedCount} / 3個以上でゴール！</span>
        <span className="text-emerald-400 font-bold">SCORE: {score} pt</span>
      </div>

      <div className="bg-slate-950 border border-slate-800 rounded-xl h-[420px] relative overflow-hidden flex items-center justify-center p-4 shadow-inner">
        {isGameOver ? (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center space-y-4 z-30">
            <h2 className="text-2xl font-black text-red-500">ゲームオーバー</h2>
            <p className="text-sm text-slate-300">へびの攻撃に倒れてしまいました…</p>
            <button
              onClick={restartGame}
              className="bg-indigo-600 hover:bg-indigo-700 font-bold px-6 py-2.5 rounded-xl text-white text-sm transition cursor-pointer"
            >
              もう一度挑戦する
            </button>
          </div>
        ) : isGoalReached ? (
          <div className="absolute inset-0 bg-indigo-950/90 flex flex-col items-center justify-center space-y-4 z-30">
            <h2 className="text-2xl font-black text-amber-400">🎉 ゴール達成！大勝利！</h2>
            <p className="text-sm text-slate-200">見事に迷宮を抜けて文字を集めました！ (スコア: {score} pt)</p>
            <button
              onClick={restartGame}
              className="bg-emerald-600 hover:bg-emerald-700 font-bold px-6 py-2.5 rounded-xl text-white text-sm transition cursor-pointer"
            >
              もう一度遊ぶ
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-11 gap-1 w-80 h-80 bg-slate-900 p-2 rounded-lg border border-slate-700 relative">
            {MAZE_GRID.map((row, y) =>
              row.map((cell, x) => {
                const isPlayer = playerX === x && playerY === y;
                const isGoal = x === 9 && y === 9;
                const item = items.find((i) => i.x === x && i.y === y);
                const snake = snakes.find((s) => s.x === x && s.y === y);

                return (
                  <div
                    key={`${x}-${y}`}
                    className={`flex items-center justify-center rounded text-xs font-bold transition-all ${
                      cell === 1
                        ? 'bg-slate-800 border border-slate-700'
                        : 'bg-slate-950'
                    }`}
                  >
                    {isPlayer ? (
                      <span className="text-xl animate-pulse">🧝</span>
                    ) : isGoal ? (
                      <span className={`text-xl ${collectedCount >= 3 ? 'animate-bounce' : 'opacity-40'}`}>🏰</span>
                    ) : item ? (
                      <span className="bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded font-black text-xs shadow">
                        {item.char}
                      </span>
                    ) : snake ? (
                      <span className="text-lg">🐍</span>
                    ) : null}
                  </div>
                );
              })
            )}

            {activeQuizItem && (
              <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 z-40 space-y-3">
                <div className="bg-slate-800 border-2 border-indigo-500 rounded-2xl p-5 max-w-xs w-full text-center space-y-3 shadow-2xl">
                  <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold">文字ゲット！読み方を答えよう</span>
                  <div className="text-5xl font-black text-amber-400 my-1 animate-bounce">
                    {activeQuizItem.char}
                  </div>
                  <p className="text-xs text-slate-300">ローマ字で入力してね</p>

                  <form onSubmit={handleQuizSubmit} className="space-y-2">
                    <input
                      type="text"
                      autoFocus
                      value={typingInput}
                      onChange={(e) => setTypingInput(e.target.value)}
                      placeholder="例: a, shi..."
                      className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-center text-lg font-mono text-white w-full focus:outline-none focus:border-emerald-500 shadow-inner"
                    />
                    <button
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold py-2 rounded-lg text-white text-xs transition cursor-pointer"
                    >
                      回答する ↵
                    </button>
                  </form>

                  {quizFeedback && (
                    <div className="text-xs font-bold text-amber-300 animate-pulse pt-1">
                      {quizFeedback}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="max-w-xs mx-auto space-y-1">
        <div className="flex justify-center">
          <button
            onClick={() => {
              if (MAZE_GRID[playerY - 1]?.[playerX] === 0) setPlayerY((p) => p - 1);
            }}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-600 px-6 py-1.5 rounded text-xs font-bold text-slate-200 cursor-pointer"
          >
            ▲ 上へ
          </button>
        </div>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => {
              if (MAZE_GRID[playerY]?.[playerX - 1] === 0) setPlayerX((p) => p - 1);
            }}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-600 px-6 py-1.5 rounded text-xs font-bold text-slate-200 cursor-pointer"
          >
            ◀ 左へ
          </button>
          <button
            onClick={() => {
              if (MAZE_GRID[playerY]?.[playerX + 1] === 0) setPlayerX((p) => p + 1);
            }}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-600 px-6 py-1.5 rounded text-xs font-bold text-slate-200 cursor-pointer"
          >
            右へ ▶
          </button>
        </div>
        <div className="flex justify-center">
          <button
            onClick={() => {
              if (MAZE_GRID[playerY + 1]?.[playerX] === 0) setPlayerY((p) => p + 1);
            }}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-600 px-6 py-1.5 rounded text-xs font-bold text-slate-200 cursor-pointer"
          >
            ▼ 下へ
          </button>
        </div>
      </div>
    </div>
  );
}