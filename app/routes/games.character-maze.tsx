/**
 * @file character-maze.tsx
 * @description 迷宮の文字探し 〜タイピング・アドベンチャー〜 (ヘびを避けながら文字を集めてローマ字入力)
 */
import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import React, { useEffect, useRef, useState } from 'react';
import { Link } from '@remix-run/react';
import { ToolPageWrapper } from '~/components/ToolPageWrapper';
import type { PageLayoutRef } from '~/components/PageLayout';
import { generateModuleMeta } from '~/utils/seoMeta';
import { supabase } from '~/lib/supabaseClient';

// 獲得対象の文字プール (ひらがな・カタカナ・漢字)
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
  x: number; // パーセント (%)
  y: number; // パーセント (%)
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
  
  // プレイヤーの位置 (%)
  const [playerX, setPlayerX] = useState(10);
  const [playerY, setPlayerY] = useState(10);

  // マップ上のアイテム（文字）一覧
  const [items, setItems] = useState<ItemNode[]>([]);
  // マップ上のへび一覧
  const [snakes, setSnakes] = useState<SnakeNode[]>([]);

  // クイズ（文字を獲得したとき）の状態
  const [activeQuizItem, setActiveQuizItem] = useState<ItemNode | null>(null);
  const [typingInput, setTypingInput] = useState('');
  const [quizFeedback, setQuizFeedback] = useState<string | null>(null);

  // ゴール状態
  const [isGoalReached, setIsGoalReached] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  // 初期配置（アイテム5個、へび3匹、ゴール位置は右下固定 90%, 90%）
  const spawnInitialEntities = () => {
    const initialItems: ItemNode[] = [];
    const shuffled = [...CHARACTER_POOL].sort(() => 0.5 - Math.random());
    for (let i = 0; i < 5; i++) {
      initialItems.push({
        id: Date.now() + i,
        char: shuffled[i].char,
        romaji: shuffled[i].romaji,
        x: Math.floor(Math.random() * 70) + 15,
        y: Math.floor(Math.random() * 70) + 15,
      });
    }
    setItems(initialItems);

    const initialSnakes: SnakeNode[] = [
      { id: 1, x: 30, y: 30, dx: 0.8, dy: 0.5 },
      { id: 2, x: 70, y: 20, dx: -0.6, dy: 0.7 },
      { id: 3, x: 50, y: 70, dx: 0.7, dy: -0.6 },
    ];
    setSnakes(initialSnakes);
  };

  useEffect(() => {
    spawnInitialEntities();
  }, []);

  // へびの移動とプレイヤー衝突判定
  useEffect(() => {
    if (isGameOver || activeQuizItem || isGoalReached) return;

    const gameInterval = setInterval(() => {
      // 1. へびを動かす
      setSnakes((prevSnakes) =>
        prevSnakes.map((snake) => {
          let nextX = snake.x + snake.dx;
          let nextY = snake.y + snake.dy;
          let nextDx = snake.dx;
          let nextDy = snake.dy;

          if (nextX <= 5 || nextX >= 95) nextDx *= -1;
          if (nextY <= 5 || nextY >= 95) nextDy *= -1;

          return { ...snake, x: nextX, y: nextY, dx: nextDx, dy: nextDy };
        })
      );

      // 2. プレイヤーとへびの当たり判定
      setSnakes((prevSnakes) => {
        prevSnakes.forEach((snake) => {
          const dist = Math.hypot(playerX - snake.x, playerY - snake.y);
          if (dist < 6) {
            setHp((h) => {
              const updated = h - 1;
              if (updated <= 0) setIsGameOver(true);
              return Math.max(0, updated);
            });
            setPlayerX((px) => Math.max(10, px - 10));
            setPlayerY((py) => Math.max(10, py - 10));
          }
        });
        return prevSnakes;
      });

      // 3. プレイヤーとアイテムの接触判定
      items.forEach((item) => {
        const dist = Math.hypot(playerX - item.x, playerY - item.y);
        if (dist < 6 && !activeQuizItem) {
          setActiveQuizItem(item);
          setTypingInput('');
          setQuizFeedback(null);
        }
      });

      // 4. ゴール到達判定（右下 90%, 90% 近辺かつ文字3つ以上）
      const goalDist = Math.hypot(playerX - 90, playerY - 90);
      if (goalDist < 8 && collectedCount >= 3) {
        setIsGoalReached(true);
      }
    }, 100);

    return () => clearInterval(gameInterval);
  }, [playerX, playerY, items, activeQuizItem, isGameOver, isGoalReached, collectedCount]);

  // 矢印キー・WASDキーによるプレイヤー移動
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isGameOver || activeQuizItem || isGoalReached) return;

    const step = 6;
    if (e.key === 'ArrowLeft' || e.key === 'a') {
      setPlayerX((prev) => Math.max(5, prev - step));
    } else if (e.key === 'ArrowRight' || e.key === 'd') {
      setPlayerX((prev) => Math.min(95, prev + step));
    } else if (e.key === 'ArrowUp' || e.key === 'w') {
      setPlayerY((prev) => Math.max(5, prev - step));
    } else if (e.key === 'ArrowDown' || e.key === 's') {
      setPlayerY((prev) => Math.min(95, prev + step));
    }
  };

  // クイズ回答時の処理
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
      setQuizFeedback('ざんねん！不正解 🌀 文字が別の場所に逃げました…');
      setTimeout(() => {
        setItems((prev) =>
          prev.map((i) =>
            i.id === activeQuizItem.id
              ? {
                  ...i,
                  x: Math.floor(Math.random() * 75) + 10,
                  y: Math.floor(Math.random() * 75) + 10,
                }
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
    setPlayerX(10);
    setPlayerY(10);
    setIsGoalReached(false);
    setIsGameOver(false);
    setActiveQuizItem(null);
    spawnInitialEntities();
  };

  return (
    <div
      className="bg-slate-900 border border-slate-700 rounded-2xl p-6 text-center space-y-4 shadow-xl text-white outline-none focus:ring-2 focus:ring-indigo-500"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* ステータスバー */}
      <div className="flex justify-between items-center bg-slate-800 p-3 rounded-xl border border-slate-700 text-sm">
        <span className="text-red-400 font-bold">❤️ HP: {'❤️'.repeat(hp)}</span>
        <span className="text-amber-300 font-bold">🎒 獲得した文字: {collectedCount} / 3個以上でゴールへ！</span>
        <span className="text-emerald-400 font-bold">SCORE: {score} pt</span>
      </div>

      {/* ゲームフィールド（迷路エリア） */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl h-96 relative overflow-hidden flex flex-col justify-between p-4 shadow-inner">
        {isGameOver ? (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center space-y-4 z-30">
            <h2 className="text-2xl font-black text-red-500">ゲームオーバー</h2>
            <p className="text-sm text-slate-300">へびの攻撃に耐えきれず倒れてしまいました…</p>
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
          <>
            <div className="text-xs text-slate-400 tracking-wider flex justify-between items-center">
              <span>▼ 迷宮エリア (矢印キー or WASDで移動) ▼</span>
              <span className={`px-2 py-0.5 rounded font-bold ${collectedCount >= 3 ? 'bg-emerald-600 text-white animate-pulse' : 'bg-slate-800 text-slate-300'}`}>
                {collectedCount >= 3 ? '🚪 ゴールが開きました（右下へ！）' : '🚪 ゴール：右下 (文字3つ集めよう)'}
              </span>
            </div>

            {/* ゴール地点アイコン */}
            <div
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 ${collectedCount >= 3 ? 'animate-bounce' : 'opacity-40'}`}
              style={{ left: '90%', top: '90%' }}
            >
              <span className="text-2xl">🏰</span>
              <span className="text-[10px] font-bold text-amber-300 bg-black/60 px-1 rounded">ゴール</span>
            </div>

            {/* マップ上のアイテム（文字） */}
            {items.map((item) => (
              <div
                key={item.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 animate-pulse"
                style={{ left: `${item.x}%`, top: `${item.y}%` }}
              >
                <div className="bg-amber-500 text-slate-950 font-black text-lg px-2.5 py-1 rounded-lg border-2 border-yellow-200 shadow-lg">
                  {item.char}
                </div>
              </div>
            ))}

            {/* へび */}
            {snakes.map((snake) => (
              <div
                key={snake.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 text-2xl z-10 transition-all duration-100"
                style={{ left: `${snake.x}%`, top: `${snake.y}%` }}
              >
                🐍
              </div>
            ))}

            {/* プレイヤー（冒険者） */}
            <div
              className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-20 transition-all duration-75"
              style={{ left: `${playerX}%`, top: `${playerY}%` }}
            >
              <span className="text-xs text-indigo-300 font-bold bg-black/60 px-1 rounded">あなた</span>
              <span className="text-3xl">🧝</span>
            </div>

            {/* クイズモーダル */}
            {activeQuizItem && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 z-40 space-y-4">
                <div className="bg-slate-800 border-2 border-indigo-500 rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
                  <span className="text-xs bg-indigo-600 text-white px-2 py-1 rounded-full font-bold">文字をゲット！読み方を答えよう</span>
                  <div className="text-6xl font-black text-amber-400 my-2 animate-bounce">
                    {activeQuizItem.char}
                  </div>
                  <p className="text-xs text-slate-300">この文字の読み方をローマ字で入力してね</p>

                  <form onSubmit={handleQuizSubmit} className="space-y-3">
                    <input
                      type="text"
                      autoFocus
                      value={typingInput}
                      onChange={(e) => setTypingInput(e.target.value)}
                      placeholder="例: a, shi, hon..."
                      className="bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-center text-xl font-mono text-white w-full focus:outline-none focus:border-emerald-500 shadow-inner"
                    />
                    <button
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold py-2.5 rounded-lg text-white text-sm transition cursor-pointer shadow-sm"
                    >
                      回答する ↵
                    </button>
                  </form>

                  {quizFeedback && (
                    <div className="text-sm font-bold text-amber-300 animate-pulse pt-2">
                      {quizFeedback}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 操作ボタン（スマホ・タブレットや補助用） */}
      <div className="max-w-xs mx-auto space-y-2">
        <div className="flex justify-center">
          <button
            onClick={() => setPlayerY((prev) => Math.max(5, prev - 8))}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-600 px-6 py-2 rounded-lg text-xs font-bold text-slate-200 cursor-pointer"
          >
            ▲ 上へ
          </button>
        </div>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => setPlayerX((prev) => Math.max(5, prev - 8))}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-600 px-6 py-2 rounded-lg text-xs font-bold text-slate-200 cursor-pointer"
          >
            ◀ 左へ
          </button>
          <button
            onClick={() => setPlayerX((prev) => Math.min(95, prev + 8))}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-600 px-6 py-2 rounded-lg text-xs font-bold text-slate-200 cursor-pointer"
          >
            右へ ▶
          </button>
        </div>
        <div className="flex justify-center">
          <button
            onClick={() => setPlayerY((prev) => Math.min(95, prev + 8))}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-600 px-6 py-2 rounded-lg text-xs font-bold text-slate-200 cursor-pointer"
          >
            ▼ 下へ
          </button>
        </div>
      </div>
    </div>
  );
}