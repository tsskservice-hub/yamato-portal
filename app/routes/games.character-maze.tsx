/**
 * @file character-maze.tsx
 * @description Surface Labyrinth Character Search 〜Typing Adventure〜 (Straight Line Snake Movement)
 */
import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import React, { useEffect, useRef, useState } from 'react';
import { Link } from '@remix-run/react';
import { ToolPageWrapper } from '~/components/ToolPageWrapper';
import type { PageLayoutRef } from '~/components/PageLayout';
import { generateModuleMeta } from '~/utils/seoMeta';
import { supabase } from '~/lib/supabaseClient';

// 15x15 Expanded Maze Map (1: Wall, 0: Path)
const MAZE_GRID = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],
  [1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
  [1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

const PATH_COORDS: { x: number; y: number }[] = [];
MAZE_GRID.forEach((row, y) => {
  row.forEach((cell, x) => {
    if (cell === 0 && !(x === 1 && y === 1)) {
      PATH_COORDS.push({ x, y });
    }
  });
});

const CHARACTER_POOLS = {
  hiragana: [
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
    { char: 'た', romaji: 'ta' },
    { char: 'ち', romaji: 'chi' },
    { char: 'つ', romaji: 'tsu' },
    { char: 'て', romaji: 'te' },
    { char: 'と', romaji: 'to' },
  ],
  katakana: [
    { char: 'ア', romaji: 'a' },
    { char: 'イ', romaji: 'i' },
    { char: 'ウ', romaji: 'u' },
    { char: 'エ', romaji: 'e' },
    { char: 'オ', romaji: 'o' },
    { char: 'カ', romaji: 'ka' },
    { char: 'キ', romaji: 'ki' },
    { char: 'ク', romaji: 'ku' },
    { char: 'ケ', romaji: 'ke' },
    { char: 'コ', romaji: 'ko' },
    { char: 'サ', romaji: 'sa' },
    { char: 'シ', romaji: 'shi' },
    { char: 'ス', romaji: 'su' },
    { char: 'セ', romaji: 'se' },
    { char: 'ソ', romaji: 'so' },
    { char: 'タ', romaji: 'ta' },
    { char: 'チ', romaji: 'chi' },
    { char: 'ツ', romaji: 'tsu' },
    { char: 'テ', romaji: 'te' },
    { char: 'ト', romaji: 'to' },
  ],
  kanji: [
    { char: '日', romaji: 'nichi' },
    { char: '本', romaji: 'hon' },
    { char: '水', romaji: 'mizu' },
    { char: '火', romaji: 'hi' },
    { char: '木', romaji: 'ki' },
    { char: '金', romaji: 'kin' },
    { char: '土', romaji: 'do' },
    { char: '川', romaji: 'kawa' },
    { char: '山', romaji: 'yama' },
    { char: '田', romaji: 'ta' },
    { char: '月', romaji: 'tsuki' },
    { char: '雨', romaji: 'ame' },
    { char: '車', romaji: 'kuruma' },
    { char: '門', romaji: 'mon' },
    { char: '空', romaji: 'sora' },
    { char: '学校', romaji: 'gakkou' },
    { char: '先生', romaji: 'sensei' },
    { char: '友達', romaji: 'tomodachi' },
    { char: '日本語', romaji: 'nihongo' },
    { char: '桜', romaji: 'sakura' },
  ],
};

type CharacterMode = 'hiragana' | 'katakana' | 'kanji';

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
  dx: number;
  dy: number;
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
      alert('✨ 認証に成功しました！ゲームが一時的にロック解除されました。');
    } else {
      alert('❌ パスコードが違います。');
    }
  };

  return (
    <ToolPageWrapper layoutRef={layoutRef} breadcrumbTitle="Character Maze">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <header className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <h1 className="text-xl font-bold text-slate-800">🧭 地表の迷宮 キャラクターサーチ 〜タイピングアドベンチャー〜</h1>
          <p className="text-xs text-slate-500 mt-0.5">迷宮文字集め・ひらがな/カタカナ/漢字タイピング練習</p>
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
                課題を完了するか、先生から提供されたパスコードを入力してください。
              </p>
            </div>

            <form onSubmit={handlePasscodeSubmit} className="flex gap-2 max-w-xs mx-auto">
              <input
                type="text"
                maxLength={4}
                placeholder="4桁のコード"
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
  const [selectedMode, setSelectedMode] = useState<CharacterMode | null>(null);

  const [score, setScore] = useState(0);
  const [totalItemsCount, setTotalItemsCount] = useState(0);
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

  const startGameWithMode = (mode: CharacterMode) => {
    setSelectedMode(mode);
    const pool = CHARACTER_POOLS[mode];
    const shuffledPaths = [...PATH_COORDS].sort(() => 0.5 - Math.random());
    
    const spawnCount = Math.min(pool.length, shuffledPaths.length);
    setTotalItemsCount(spawnCount);

    const initialItems: ItemNode[] = [];
    const poolShuffled = [...pool].sort(() => 0.5 - Math.random());
    for (let i = 0; i < spawnCount; i++) {
      const pos = shuffledPaths[i];
      initialItems.push({
        id: Date.now() + i,
        char: poolShuffled[i].char,
        romaji: poolShuffled[i].romaji,
        x: pos.x,
        y: pos.y,
      });
    }
    setItems(initialItems);
    setCollectedCount(0);
    setScore(0);
    setHp(5);
    setPlayerX(1);
    setPlayerY(1);
    setIsGoalReached(false);
    setIsGameOver(false);

    // 2匹のヘビを離れた場所（右上と左下付近）からスタートさせる
    const snake1Pos = shuffledPaths[Math.floor(shuffledPaths.length * 0.2)] || { x: 13, y: 1 };
    const snake2Pos = shuffledPaths[Math.floor(shuffledPaths.length * 0.8)] || { x: 1, y: 13 };
    
    setSnakes([
      { id: 1, x: snake1Pos.x, y: snake1Pos.y, dx: 0, dy: 1 },
      { id: 2, x: snake2Pos.x, y: snake2Pos.y, dx: -1, dy: 0 },
    ]);
  };

  // 2匹の蛇の移動ロジック
  useEffect(() => {
    if (!selectedMode || isGameOver || activeQuizItem || isGoalReached) return;

    const snakeInterval = setInterval(() => {
      setSnakes((prevSnakes) =>
        prevSnakes.map((snake) => {
          const nextX = snake.x + snake.dx;
          const nextY = snake.y + snake.dy;

          if (MAZE_GRID[nextY]?.[nextX] === 0) {
            return { ...snake, x: nextX, y: nextY };
          }

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
            const currentDirValid = validMoves.some((d) => d.dx === snake.dx && d.dy === snake.dy);
            const chosenMove = currentDirValid
              ? { dx: snake.dx, dy: snake.dy }
              : validMoves[Math.floor(Math.random() * validMoves.length)];

            return {
              ...snake,
              x: snake.x + chosenMove.dx,
              y: snake.y + chosenMove.dy,
              dx: chosenMove.dx,
              dy: chosenMove.dy,
            };
          }

          return snake;
        })
      );
    }, 850);

    return () => clearInterval(snakeInterval);
  }, [selectedMode, isGameOver, activeQuizItem, isGoalReached]);

  // 当たり判定
  useEffect(() => {
    if (!selectedMode || isGameOver || activeQuizItem || isGoalReached) return;

    // プレイヤーがどちらかの蛇にぶつかったか
    const hitSnake = snakes.some((snake) => snake.x === playerX && snake.y === playerY);
    if (hitSnake) {
      setHp((h) => {
        const updated = h - 1;
        if (updated <= 0) setIsGameOver(true);
        return Math.max(0, updated);
      });
      setPlayerX(1);
      setPlayerY(1);
    }

    items.forEach((item) => {
      if (item.x === playerX && item.y === playerY && !activeQuizItem) {
        setActiveQuizItem(item);
        setTypingInput('');
        setQuizFeedback(null);
      }
    });

    // ゴール位置は右下 (13, 13)
    if (playerX === 13 && playerY === 13 && totalItemsCount > 0 && collectedCount >= totalItemsCount) {
      setIsGoalReached(true);
    }
  }, [playerX, playerY, snakes, items, activeQuizItem, isGameOver, isGoalReached, collectedCount, totalItemsCount, selectedMode]);

  // キーボード操作
  useEffect(() => {
    if (!selectedMode) return;

    const handleKeyDownGlobal = (e: KeyboardEvent) => {
      if (activeQuizItem) return;

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'w', 'a', 's', 'd'].includes(e.key)) {
        e.preventDefault();
      }

      if (isGameOver || isGoalReached) return;

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
  }, [playerX, playerY, isGameOver, activeQuizItem, isGoalReached, selectedMode]);

  const handleQuizSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuizItem) return;

    if (typingInput.toLowerCase().trim() === activeQuizItem.romaji) {
      setQuizFeedback('正解！ 🎉 文字をゲットしました！');
      setTimeout(() => {
        setScore((s) => s + 200);
        setCollectedCount((c) => c + 1);
        setItems((prev) => prev.filter((i) => i.id !== activeQuizItem.id));
        setActiveQuizItem(null);
        setTypingInput('');
        setQuizFeedback(null);
      }, 800);
    } else {
      setQuizFeedback('不正解… 🌀 文字が別の場所に逃げ出しました！');
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
    setSelectedMode(null);
  };

  // モード選択画面
  if (!selectedMode) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-6 shadow-xl text-slate-800">
        <h2 className="text-2xl font-black text-slate-800">学習モードを選んでください</h2>
        <p className="text-sm text-slate-600">迷宮に出現させたい文字の種類を選択してください。</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-md mx-auto">
          <button
            onClick={() => startGameWithMode('hiragana')}
            className="bg-indigo-50 hover:bg-indigo-100 border-2 border-indigo-400 p-6 rounded-2xl transition shadow-sm cursor-pointer flex flex-col items-center space-y-2"
          >
            <span className="text-3xl font-black text-indigo-600">あいう</span>
            <span className="font-bold text-slate-700">ひらがな</span>
          </button>

          <button
            onClick={() => startGameWithMode('katakana')}
            className="bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-400 p-6 rounded-2xl transition shadow-sm cursor-pointer flex flex-col items-center space-y-2"
          >
            <span className="text-3xl font-black text-emerald-600">アイウ</span>
            <span className="font-bold text-slate-700">カタカナ</span>
          </button>

          <button
            onClick={() => startGameWithMode('kanji')}
            className="bg-amber-50 hover:bg-amber-100 border-2 border-amber-400 p-6 rounded-2xl transition shadow-sm cursor-pointer flex flex-col items-center space-y-2"
          >
            <span className="text-3xl font-black text-amber-600">日本</span>
            <span className="font-bold text-slate-700">漢字</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-6 shadow-xl text-slate-800">
      {/* Status Bar */}
      <div className="flex flex-wrap justify-between items-center bg-slate-100 p-4 rounded-xl border border-slate-200 text-sm shadow-inner gap-2">
        <span className="text-red-500 font-bold">❤️ HP: {'❤️'.repeat(hp)}</span>
        <span className="text-indigo-600 font-bold">🎒 収集: {collectedCount} / {totalItemsCount} (全回収で城へ！)</span>
        <span className="text-emerald-600 font-bold">スコア: {score} pt</span>
        <button
          onClick={restartGame}
          className="text-xs bg-slate-200 hover:bg-slate-300 px-3 py-1.5 rounded-lg font-bold text-slate-700 transition"
        >
          モード変更
        </button>
      </div>

      {/* Game Field (Enlarged) */}
      <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl h-[620px] relative overflow-hidden flex items-center justify-center p-4 shadow-inner">
        {isGameOver ? (
          <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center space-y-4 z-30">
            <h2 className="text-3xl font-black text-red-600">ゲームオーバー</h2>
            <p className="text-sm text-slate-600">ヘビに捕まってしまいました…</p>
            <button
              onClick={() => startGameWithMode(selectedMode)}
              className="bg-indigo-600 hover:bg-indigo-700 font-bold px-8 py-3 rounded-xl text-white text-base transition cursor-pointer shadow-md"
            >
              もう一度挑戦する
            </button>
          </div>
        ) : isGoalReached ? (
          <div className="absolute inset-0 bg-indigo-50/95 flex flex-col items-center justify-center space-y-4 z-30">
            <h2 className="text-3xl font-black text-amber-600">🎉 全文字クリア！ゴール達成！</h2>
            <p className="text-sm text-slate-700">すべての文字を正しく回収して迷宮を突破しました！ (スコア: {score} pt)</p>
            <button
              onClick={restartGame}
              className="bg-emerald-600 hover:bg-emerald-700 font-bold px-8 py-3 rounded-xl text-white text-base transition cursor-pointer shadow-md"
            >
              別のモードで遊ぶ
            </button>
          </div>
        ) : (
          <div className="relative w-[540px] h-[540px] bg-slate-700 p-2 rounded-xl border-4 border-slate-800 shadow-lg">
            {/* Maze Grid (15x15) */}
            <div className="w-full h-full grid grid-cols-15 grid-rows-15 bg-slate-700">
              {MAZE_GRID.map((row, y) =>
                row.map((cell, x) => {
                  const isPlayer = playerX === x && playerY === y;
                  const isGoal = x === 13 && y === 13;
                  const item = items.find((i) => i.x === x && i.y === y);
                  const matchedSnake = snakes.find((s) => s.x === x && s.y === y);
                  const canGoal = collectedCount >= totalItemsCount;

                  return (
                    <div
                      key={`${x}-${y}`}
                      className={`w-full h-full flex items-center justify-center text-xs font-bold select-none ${
                        cell === 1
                          ? 'bg-slate-700 border border-slate-600/40' // Wall
                          : 'bg-white' // Path
                      }`}
                    >
                      {isPlayer ? (
                        <span className="text-xl animate-pulse">🧝</span>
                      ) : isGoal ? (
                        <span className={`text-xl ${canGoal ? 'animate-bounce' : 'opacity-40'}`}>🏰</span>
                      ) : item ? (
                        <span className="bg-amber-400 text-slate-900 px-1 py-0.5 rounded font-black text-[10px] shadow-md border border-amber-200">
                          {item.char}
                        </span>
                      ) : matchedSnake ? (
                        <span className="text-base transition-all duration-300">🐍</span>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>

            {/* Quiz Modal */}
            {activeQuizItem && (
              <div className="absolute inset-0 bg-slate-900/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 z-40 space-y-4">
                <div className="bg-white border-2 border-indigo-500 rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
                  <span className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-full font-bold">文字を発見！ローマ字を入力してね</span>
                  <div className="text-6xl font-black text-amber-500 my-2 animate-bounce">
                    {activeQuizItem.char}
                  </div>
                  <p className="text-xs text-slate-600">正しいローマ字の読み方を入力してください（例: ka, shi, nichi）</p>

                  <form onSubmit={handleQuizSubmit} className="space-y-3">
                    <input
                      type="text"
                      autoFocus
                      value={typingInput}
                      onChange={(e) => setTypingInput(e.target.value)}
                      placeholder="ここに入力..."
                      className="bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3 text-center text-xl font-mono text-slate-900 w-full focus:outline-none focus:border-indigo-600 shadow-inner"
                    />
                    <button
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold py-3 rounded-xl text-white text-sm transition cursor-pointer shadow-md"
                    >
                      決定 ↵
                    </button>
                  </form>

                  {quizFeedback && (
                    <div className="text-sm font-bold text-amber-600 animate-pulse pt-2">
                      {quizFeedback}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* On-screen Controls */}
      <div className="max-w-xs mx-auto space-y-2">
        <div className="flex justify-center">
          <button
            onClick={() => {
              if (activeQuizItem || isGameOver || isGoalReached) return;
              if (MAZE_GRID[playerY - 1]?.[playerX] === 0) setPlayerY((p) => p - 1);
            }}
            className="bg-slate-100 hover:bg-slate-200 border border-slate-300 px-8 py-2.5 rounded-xl text-sm font-bold text-slate-700 cursor-pointer shadow-sm transition"
          >
            ▲ 上
          </button>
        </div>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => {
              if (activeQuizItem || isGameOver || isGoalReached) return;
              if (MAZE_GRID[playerY]?.[playerX - 1] === 0) setPlayerX((p) => p - 1);
            }}
            className="bg-slate-100 hover:bg-slate-200 border border-slate-300 px-8 py-2.5 rounded-xl text-sm font-bold text-slate-700 cursor-pointer shadow-sm transition"
          >
            ◀ 左
          </button>
          <button
            onClick={() => {
              if (activeQuizItem || isGameOver || isGoalReached) return;
              if (MAZE_GRID[playerY]?.[playerX + 1] === 0) setPlayerX((p) => p - 1);
            }}
            className="bg-slate-100 hover:bg-slate-200 border border-slate-300 px-8 py-2.5 rounded-xl text-sm font-bold text-slate-700 cursor-pointer shadow-sm transition"
          >
            右 ▶
          </button>
        </div>
        <div className="flex justify-center">
          <button
            onClick={() => {
              if (activeQuizItem || isGameOver || isGoalReached) return;
              if (MAZE_GRID[playerY + 1]?.[playerX] === 0) setPlayerY((p) => p + 1);
            }}
            className="bg-slate-100 hover:bg-slate-200 border border-slate-300 px-8 py-2.5 rounded-xl text-sm font-bold text-slate-700 cursor-pointer shadow-sm transition"
          >
            ▼ 下
          </button>
        </div>
      </div>
    </div>
  );
}