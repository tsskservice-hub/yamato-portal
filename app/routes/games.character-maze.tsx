/**
 * @file games.character-maze.tsx
 * @description Character Maze ~Typing Adventure~
 *  迷路の中の文字を集め（ローマ字を入力して回収）、ヘビをよけて、全部集めたら右下の城へ。
 *  文字は Supabase の kl_character から読む（memory-match と同じ表）。
 *   - ひらがな／カタカナ: 清音・濁音と半濁音・拗音・すべて から選ぶ。答えは romaji 列
 *   - 漢字: カテゴリ（category 列）から選ぶ。答えは訓読み（kun_romaji）か音読み（on_romaji）のどちらでも正解
 *  ローマ字の別の綴り（si / shi など）は受け付けない（DB の綴りだけ）。
 *  ログインと先生のゲームのロックは GameAccessGate が確認する。
 */
import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLoaderData } from '@remix-run/react';
import { ToolPageWrapper } from '~/components/layout/ToolPageWrapper';
import type { PageLayoutRef } from '~/components/layout/PageLayout';
import { GameAccessGate } from '~/components/games/GameAccessGate';
import { DataErrorState } from '~/components/DataErrorState';
import { generateModuleMeta } from '~/utils/seoMeta';
import { shuffle } from '~/utils/shuffle';
import { supabase } from '~/lib/supabaseClient';

// ------------------------------------------------------------------
// Maze
// ------------------------------------------------------------------

// 15x15 (1: wall, 0: path). Start top-left (1,1), castle bottom-right (13,13)
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
const SIZE = MAZE_GRID.length;

type Point = { x: number; y: number };
const START: Point = { x: 1, y: 1 };
const GOAL: Point = { x: 13, y: 13 };
const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y;
const keyOf = (p: Point) => `${p.x},${p.y}`;
const isPath = (x: number, y: number) => MAZE_GRID[y]?.[x] === 0;

/** 文字やヘビを置ける通路（スタートと城は除く） */
const FREE_CELLS: Point[] = [];
MAZE_GRID.forEach((row, y) =>
  row.forEach((cell, x) => {
    const p = { x, y };
    if (cell === 0 && !same(p, START) && !same(p, GOAL)) FREE_CELLS.push(p);
  })
);

const ITEM_COUNT = 20;
const START_HP = 5;
const SNAKE_STEP_MS = 850;
/** ヘビに当たった後、スタートに戻ってからこの間は当たらない */
const SHIELD_MS = 2000;
/** ヘビはスタートからこれ以上（縦横のマス数の合計）離れた所から出てくる */
const SNAKE_MIN_DISTANCE = 10;
const POINTS_PER_CHAR = 200;

const DIRECTIONS: Point[] = [
  { x: 0, y: -1 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
];

// ------------------------------------------------------------------
// Characters (kl_character)
// ------------------------------------------------------------------

type Script = 'hiragana' | 'katakana' | 'kanji';
type KanaSet = 'basic' | 'dakuten' | 'combo' | 'all';

/** answers: 正解として受け付けるローマ字 / reading: 答えの表示（漢字は「訓 / 音」）/ group: かなのセットか漢字のカテゴリ */
type MazeChar = { char: string; answers: string[]; reading: string; group: string };
type MazePools = Record<Script, MazeChar[]>;

const KANA_GROUP: Record<string, Exclude<KanaSet, 'all'>> = {
  清音: 'basic',
  濁音: 'dakuten',
  半濁音: 'dakuten',
  拗音: 'combo',
};

const KANA_SETS: Array<{ key: KanaSet; label: string; example: Record<'hiragana' | 'katakana', string> }> = [
  { key: 'basic', label: 'Basic sounds', example: { hiragana: 'あ い う', katakana: 'ア イ ウ' } },
  { key: 'dakuten', label: 'Dakuten & handakuten', example: { hiragana: 'が ざ ぱ', katakana: 'ガ ザ パ' } },
  { key: 'combo', label: 'Combinations', example: { hiragana: 'きゃ しゅ', katakana: 'キャ シュ' } },
  { key: 'all', label: 'All', example: { hiragana: 'あ〜ぴょ', katakana: 'ア〜ピョ' } },
];

const clean = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);

  let portalContent = null;
  try {
    const { data: portalData } = await supabase.from('portal_settings').select('content').eq('key', 'PORTAL_CONTENT').single();
    portalContent = portalData?.content || null;
  } catch (e) {}

  const pools: MazePools = { hiragana: [], katakana: [], kanji: [] };
  let loadError: string | null = null;
  try {
    const { data, error } = await supabase
      .from('kl_character')
      .select('character, romaji, kun_romaji, on_romaji, char_type, category, sort_order')
      .in('char_type', ['hiragana', 'katakana', 'kanji'])
      .order('sort_order', { ascending: true, nullsFirst: false })
      .limit(1000);
    if (error) throw error;

    for (const r of (data ?? []) as any[]) {
      const char = clean(r.character);
      if (!char) continue;
      if (r.char_type === 'hiragana' || r.char_type === 'katakana') {
        const romaji = clean(r.romaji).toLowerCase();
        if (!romaji) continue;
        pools[r.char_type as 'hiragana' | 'katakana'].push({
          char,
          answers: [romaji],
          reading: romaji,
          group: KANA_GROUP[clean(r.category)] ?? 'basic',
        });
      } else {
        const readings = [clean(r.kun_romaji).toLowerCase(), clean(r.on_romaji).toLowerCase()].filter(Boolean);
        if (readings.length === 0) continue;
        pools.kanji.push({
          char,
          answers: [...new Set(readings)],
          reading: [...new Set(readings)].join(' / '),
          group: clean(r.category) || 'Other',
        });
      }
    }
    if (pools.hiragana.length + pools.katakana.length + pools.kanji.length === 0) {
      loadError = 'No characters were returned from the database.';
    }
  } catch (e) {
    loadError = 'Characters could not be loaded from the database. Please try again later.';
  }

  return json({ portalContent, currentPath: url.pathname, pools, loadError });
}

export const meta: MetaFunction<typeof loader> = ({ data }: { data: any }) => {
  return generateModuleMeta(data?.portalContent || null, data?.currentPath || '');
};

export default function CharacterMazePage() {
  const layoutRef = useRef<PageLayoutRef>(null);
  const { pools, loadError } = useLoaderData<typeof loader>() as unknown as { pools: MazePools; loadError: string | null };

  return (
    <ToolPageWrapper layoutRef={layoutRef} breadcrumbTitle="Character Maze">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-6">
        <header className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <h1 className="text-xl font-bold text-slate-800">🧭 Character Maze ~Typing Adventure~</h1>
          <p className="text-xs text-slate-500 mt-0.5">Collect characters in the maze: hiragana, katakana and kanji typing practice</p>
        </header>

        <GameAccessGate layoutRef={layoutRef}>
          {() =>
            loadError ? (
              <DataErrorState title="Unable to Load Data" errorMessage={`Failed to load characters (kl_character): ${loadError}`} />
            ) : (
              <CharacterMazeArena pools={pools} />
            )
          }
        </GameAccessGate>
      </div>
    </ToolPageWrapper>
  );
}

// ------------------------------------------------------------------
// Game
// ------------------------------------------------------------------

interface ItemNode extends MazeChar, Point {
  id: number;
}

interface SnakeNode extends Point {
  id: number;
  dx: number;
  dy: number;
}

type Feedback = { ok: boolean; text: string };

/** occupied に入っていない通路を 1 つ選ぶ（なければ null） */
function pickFreeCell(occupied: Set<string>): Point | null {
  const free = FREE_CELLS.filter((p) => !occupied.has(keyOf(p)));
  return free.length ? free[Math.floor(Math.random() * free.length)] : null;
}

/** ヘビの次の 1 マス。まっすぐ進むことが多いが、分かれ道ではときどき曲がる。行き止まり以外では引き返さない */
function stepSnake(s: SnakeNode): SnakeNode {
  const open = DIRECTIONS.filter((d) => isPath(s.x + d.x, s.y + d.y));
  if (open.length === 0) return s;
  const forward = open.filter((d) => !(d.x === -s.dx && d.y === -s.dy));
  const choices = forward.length ? forward : open;
  const canGoStraight = choices.some((d) => d.x === s.dx && d.y === s.dy);
  const dir = canGoStraight && (choices.length === 1 || Math.random() < 0.7)
    ? { x: s.dx, y: s.dy }
    : choices[Math.floor(Math.random() * choices.length)];
  return { ...s, x: s.x + dir.x, y: s.y + dir.y, dx: dir.x, dy: dir.y };
}

function CharacterMazeArena({ pools }: { pools: MazePools }) {
  // ---- setup ----
  const [script, setScript] = useState<Script>('hiragana');
  const [kanaSet, setKanaSet] = useState<KanaSet>('basic');
  const [kanjiCategory, setKanjiCategory] = useState('all');
  const [playing, setPlaying] = useState(false);

  const kanjiCategories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const k of pools.kanji) counts.set(k.group, (counts.get(k.group) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0], 'en'));
  }, [pools.kanji]);

  const selectedPool = useMemo(() => {
    if (script === 'kanji') return kanjiCategory === 'all' ? pools.kanji : pools.kanji.filter((k) => k.group === kanjiCategory);
    const list = pools[script];
    return kanaSet === 'all' ? list : list.filter((k) => k.group === kanaSet);
  }, [pools, script, kanaSet, kanjiCategory]);

  // ---- game state ----
  const [score, setScore] = useState(0);
  const [totalItemsCount, setTotalItemsCount] = useState(0);
  const [collectedCount, setCollectedCount] = useState(0);
  const [hp, setHp] = useState(START_HP);
  const [player, setPlayer] = useState<Point>(START);
  const [items, setItems] = useState<ItemNode[]>([]);
  const [snakes, setSnakes] = useState<SnakeNode[]>([]);
  const [shielded, setShielded] = useState(false);

  const [activeQuizItem, setActiveQuizItem] = useState<ItemNode | null>(null);
  const [typingInput, setTypingInput] = useState('');
  const [quizFeedback, setQuizFeedback] = useState<Feedback | null>(null);
  /** 答えを送ってから結果を閉じるまで（この間は送れない。二重に得点しないため） */
  const [answering, setAnswering] = useState(false);

  const [isGoalReached, setIsGoalReached] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  const active = playing && !activeQuizItem && !isGameOver && !isGoalReached;
  const activeRef = useRef(active);
  activeRef.current = active;
  const quizOpenRef = useRef(false);
  quizOpenRef.current = Boolean(activeQuizItem);
  const playerRef = useRef(player);
  playerRef.current = player;
  const snakesRef = useRef(snakes);
  snakesRef.current = snakes;

  const shieldUntilRef = useRef(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (fn: () => void, ms: number) => {
    timersRef.current.push(setTimeout(fn, ms));
  };
  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };
  useEffect(() => clearTimers, []);

  const startGame = () => {
    clearTimers();
    const chars = shuffle(selectedPool).slice(0, ITEM_COUNT);
    const cells = shuffle(FREE_CELLS);
    const itemCells = cells.slice(0, chars.length);
    const used = new Set(itemCells.map(keyOf));

    setItems(chars.map((c, i) => ({ ...c, id: i + 1, ...itemCells[i] })));
    setTotalItemsCount(chars.length);
    setCollectedCount(0);
    setScore(0);
    setHp(START_HP);
    setPlayer(START);
    setActiveQuizItem(null);
    setQuizFeedback(null);
    setTypingInput('');
    setAnswering(false);
    setIsGoalReached(false);
    setIsGameOver(false);
    setShielded(false);
    shieldUntilRef.current = 0;

    // ヘビ 2 匹は、スタートから離れた、文字と重ならない所から出てくる
    const far = cells.filter((p) => !used.has(keyOf(p)) && Math.abs(p.x - START.x) + Math.abs(p.y - START.y) >= SNAKE_MIN_DISTANCE);
    const spawn = far.slice(0, 2);
    setSnakes(
      spawn.map((p, i) => {
        const dir = DIRECTIONS.find((d) => isPath(p.x + d.x, p.y + d.y)) ?? { x: 0, y: 0 };
        return { id: i + 1, x: p.x, y: p.y, dx: dir.x, dy: dir.y };
      })
    );
    setPlaying(true);
  };

  const backToSetup = () => {
    clearTimers();
    setPlaying(false);
    setActiveQuizItem(null);
  };

  // ---- player movement (keyboard and on-screen buttons share this) ----
  const move = useCallback((dx: number, dy: number) => {
    if (!activeRef.current) return;
    setPlayer((p) => (isPath(p.x + dx, p.y + dy) ? { x: p.x + dx, y: p.y + dy } : p));
  }, []);

  useEffect(() => {
    if (!playing) return;
    const KEYS: Record<string, Point> = {
      arrowup: { x: 0, y: -1 }, w: { x: 0, y: -1 },
      arrowdown: { x: 0, y: 1 }, s: { x: 0, y: 1 },
      arrowleft: { x: -1, y: 0 }, a: { x: -1, y: 0 },
      arrowright: { x: 1, y: 0 }, d: { x: 1, y: 0 },
    };
    const onKey = (e: KeyboardEvent) => {
      if (quizOpenRef.current) return; // typing the answer
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select')) return;
      const dir = KEYS[e.key.toLowerCase()];
      if (!dir) return;
      e.preventDefault();
      move(dir.x, dir.y);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [playing, move]);

  // ---- snakes (they wait while a quiz is open, and while the tab is hidden) ----
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => {
      if (document.hidden) return;
      setSnakes((prev) => prev.map(stepSnake));
    }, SNAKE_STEP_MS);
    return () => clearInterval(timer);
  }, [active]);

  // ---- collisions: snake, character, castle ----
  useEffect(() => {
    if (!active) return;

    if (snakes.some((s) => same(s, player)) && Date.now() >= shieldUntilRef.current) {
      shieldUntilRef.current = Date.now() + SHIELD_MS;
      setShielded(true);
      later(() => setShielded(false), SHIELD_MS);
      setHp((h) => Math.max(0, h - 1));
      setPlayer(START);
      return;
    }

    const item = items.find((i) => same(i, player));
    if (item) {
      setActiveQuizItem(item);
      setTypingInput('');
      setQuizFeedback(null);
      setAnswering(false);
      return;
    }

    if (same(player, GOAL) && totalItemsCount > 0 && items.length === 0) setIsGoalReached(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, player, snakes, items, totalItemsCount]);

  useEffect(() => {
    if (playing && hp <= 0) setIsGameOver(true);
  }, [playing, hp]);

  // ---- answering ----
  const handleQuizSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const item = activeQuizItem;
    const guess = typingInput.trim().toLowerCase();
    if (!item || answering || !guess) return;
    setAnswering(true);

    if (item.answers.includes(guess)) {
      setQuizFeedback({ ok: true, text: `Correct! ${item.char} = ${item.reading} (+${POINTS_PER_CHAR} pt)` });
      later(() => {
        setScore((s) => s + POINTS_PER_CHAR);
        setCollectedCount((c) => c + 1);
        setItems((prev) => prev.filter((i) => i.id !== item.id));
        setActiveQuizItem(null);
        setAnswering(false);
      }, 900);
    } else {
      setQuizFeedback({ ok: false, text: `Not quite: ${item.char} is "${item.reading}". It ran away to another spot!` });
      later(() => {
        setItems((prev) => {
          // 他の文字・プレイヤー・ヘビ・城と重ならない所へ逃げる
          const occupied = new Set([
            ...prev.filter((i) => i.id !== item.id).map(keyOf),
            keyOf(playerRef.current),
            ...snakesRef.current.map(keyOf),
          ]);
          const spot = pickFreeCell(occupied);
          return spot ? prev.map((i) => (i.id === item.id ? { ...i, ...spot } : i)) : prev;
        });
        setActiveQuizItem(null);
        setAnswering(false);
      }, 2000);
    }
  };

  // ------------------------------------------------------------------
  // Setup screen
  // ------------------------------------------------------------------
  if (!playing) {
    const scriptBtn = (s: Script, sample: string, label: string, color: string) => (
      <button
        key={s}
        type="button"
        aria-pressed={script === s}
        onClick={() => setScript(s)}
        className={`p-4 rounded-2xl border-2 transition cursor-pointer flex flex-col items-center gap-1 ${
          script === s ? `${color} shadow-md` : 'bg-white border-slate-200 hover:bg-slate-50'
        }`}
      >
        <span className="text-2xl sm:text-3xl font-black text-slate-800">{sample}</span>
        <span className="font-bold text-slate-700 text-sm">{label}</span>
      </button>
    );

    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-8 text-center space-y-6 shadow-xl text-slate-800">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-slate-800">Choose your characters</h2>
          <p className="text-sm text-slate-600">
            Walk onto a character and type its reading in romaji to collect it. Avoid the snakes 🐍, collect them all, then reach the castle 🏰.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-md mx-auto">
          {scriptBtn('hiragana', 'あいう', 'Hiragana', 'bg-indigo-50 border-indigo-400')}
          {scriptBtn('katakana', 'アイウ', 'Katakana', 'bg-emerald-50 border-emerald-400')}
          {scriptBtn('kanji', '日本', 'Kanji', 'bg-amber-50 border-amber-400')}
        </div>

        {script === 'kanji' ? (
          <label className="block max-w-md mx-auto text-left text-sm font-semibold text-slate-700 space-y-1">
            <span>Kanji category</span>
            <select
              value={kanjiCategory}
              onChange={(e) => setKanjiCategory(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="all">All kanji ({pools.kanji.length})</option>
              {kanjiCategories.map(([name, count]) => (
                <option key={name} value={name}>{name} ({count})</option>
              ))}
            </select>
            <span className="block text-xs font-normal text-slate-500">Either reading is correct: the kun reading (e.g. yama) or the on reading (e.g. san).</span>
          </label>
        ) : (
          <div role="group" aria-label="Character set" className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-xl mx-auto">
            {KANA_SETS.map((s) => {
              const count = s.key === 'all' ? pools[script].length : pools[script].filter((k) => k.group === s.key).length;
              return (
                <button
                  key={s.key}
                  type="button"
                  aria-pressed={kanaSet === s.key}
                  onClick={() => setKanaSet(s.key)}
                  className={`px-3 py-2 rounded-xl border text-sm transition cursor-pointer ${
                    kanaSet === s.key ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="block font-bold">{s.label}</span>
                  <span className={`block text-xs ${kanaSet === s.key ? 'text-slate-300' : 'text-slate-500'}`}>
                    {s.example[script]} · {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="space-y-2">
          <button
            type="button"
            onClick={startGame}
            disabled={selectedPool.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 font-bold px-8 py-3 rounded-xl text-white text-base transition cursor-pointer shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Start
          </button>
          <p className="text-xs text-slate-500">
            {selectedPool.length === 0
              ? 'No characters are available for this choice yet.'
              : `${Math.min(ITEM_COUNT, selectedPool.length)} characters will appear in the maze.`}
          </p>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Maze screen
  // ------------------------------------------------------------------
  const canGoal = items.length === 0;
  const dpadBtn = 'bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border border-slate-300 w-16 h-14 sm:w-20 rounded-xl text-lg font-bold text-slate-700 cursor-pointer shadow-sm transition select-none touch-manipulation';

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-6 text-center space-y-4 sm:space-y-6 shadow-xl text-slate-800">
      {/* Status bar */}
      <div className="flex flex-wrap justify-between items-center bg-slate-100 p-3 sm:p-4 rounded-xl border border-slate-200 text-sm shadow-inner gap-2">
        <span className="text-red-500 font-bold" aria-label={`HP ${hp} of ${START_HP}`}>❤️ {'❤️'.repeat(hp)}{'🤍'.repeat(Math.max(0, START_HP - hp))}</span>
        <span className="text-indigo-600 font-bold">🎒 {collectedCount} / {totalItemsCount}</span>
        <span className="text-emerald-600 font-bold">Score: {score} pt</span>
        <button
          type="button"
          onClick={backToSetup}
          className="text-xs bg-slate-200 hover:bg-slate-300 px-3 py-1.5 rounded-lg font-bold text-slate-700 transition cursor-pointer"
        >
          Change characters
        </button>
      </div>
      <p className="text-xs text-slate-500 -mt-2">
        {canGoal ? 'All characters collected! Go to the castle 🏰 in the bottom-right corner.' : 'Collect every character, then go to the castle 🏰. Move with the arrow keys, WASD, or the buttons.'}
      </p>

      {/* Field */}
      <div className="relative bg-slate-50 border-2 border-slate-200 rounded-2xl p-2 sm:p-4 shadow-inner">
        <div className="relative w-full max-w-[540px] aspect-square mx-auto bg-slate-700 p-1 sm:p-2 rounded-xl border-4 border-slate-800 shadow-lg">
          <div
            className="w-full h-full grid bg-slate-700"
            style={{
              gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${SIZE}, minmax(0, 1fr))`,
              fontSize: 'clamp(10px, 4vw, 22px)',
            }}
          >
            {MAZE_GRID.map((row, y) =>
              row.map((cell, x) => {
                const here = { x, y };
                const isPlayer = same(player, here);
                const isGoal = same(GOAL, here);
                const item = items.find((i) => same(i, here));
                const snake = snakes.find((s) => same(s, here));
                return (
                  <div
                    key={`${x}-${y}`}
                    className={`flex items-center justify-center select-none leading-none overflow-hidden ${
                      cell === 1 ? 'bg-slate-700 border border-slate-600/40' : 'bg-white'
                    }`}
                  >
                    {isPlayer ? (
                      <span className={shielded ? 'animate-pulse opacity-60' : ''} aria-label="You">🧝</span>
                    ) : snake ? (
                      <span aria-label="Snake">🐍</span>
                    ) : isGoal ? (
                      <span className={canGoal ? 'animate-bounce' : 'opacity-40'} aria-label="Castle">🏰</span>
                    ) : item ? (
                      <span
                        className="bg-amber-400 text-slate-900 rounded font-black shadow-md border border-amber-200 px-[0.1em] py-[0.05em]"
                        style={{ fontSize: item.char.length > 1 ? '0.5em' : '0.7em' }}
                      >
                        {item.char}
                      </span>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {isGameOver && (
          <div className="absolute inset-0 bg-white/95 rounded-2xl flex flex-col items-center justify-center gap-4 z-30 p-4">
            <h2 className="text-3xl font-black text-red-600">Game Over</h2>
            <p className="text-sm text-slate-600">The snakes caught you… You collected {collectedCount} of {totalItemsCount} characters.</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <button type="button" onClick={startGame} className="bg-indigo-600 hover:bg-indigo-700 font-bold px-6 py-3 rounded-xl text-white transition cursor-pointer shadow-md">
                Try again
              </button>
              <button type="button" onClick={backToSetup} className="bg-white border border-slate-300 hover:bg-slate-50 font-bold px-6 py-3 rounded-xl text-slate-700 transition cursor-pointer">
                Change characters
              </button>
            </div>
          </div>
        )}

        {isGoalReached && (
          <div className="absolute inset-0 bg-indigo-50/95 rounded-2xl flex flex-col items-center justify-center gap-4 z-30 p-4">
            <h2 className="text-2xl sm:text-3xl font-black text-amber-600">🎉 You reached the castle!</h2>
            <p className="text-sm text-slate-700">You collected all {totalItemsCount} characters and escaped the maze! (Score: {score} pt)</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <button type="button" onClick={startGame} className="bg-emerald-600 hover:bg-emerald-700 font-bold px-6 py-3 rounded-xl text-white transition cursor-pointer shadow-md">
                Play again
              </button>
              <button type="button" onClick={backToSetup} className="bg-white border border-slate-300 hover:bg-slate-50 font-bold px-6 py-3 rounded-xl text-slate-700 transition cursor-pointer">
                Change characters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* On-screen controls (touch screens) */}
      <div className="flex flex-col items-center gap-2" aria-label="Move">
        <button type="button" onClick={() => move(0, -1)} className={dpadBtn} aria-label="Up">▲</button>
        <div className="flex gap-2">
          <button type="button" onClick={() => move(-1, 0)} className={dpadBtn} aria-label="Left">◀</button>
          <button type="button" onClick={() => move(0, 1)} className={dpadBtn} aria-label="Down">▼</button>
          <button type="button" onClick={() => move(1, 0)} className={dpadBtn} aria-label="Right">▶</button>
        </div>
      </div>

      {/* Quiz (over the whole screen so it fits on phones too) */}
      {activeQuizItem && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true" aria-label="Type the reading">
          <div className="bg-white border-2 border-indigo-500 rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <span className="inline-block text-xs bg-indigo-600 text-white px-3 py-1 rounded-full font-bold">You found a character! Type its reading</span>
            <div className="text-6xl font-black text-amber-500 my-2">{activeQuizItem.char}</div>
            <p className="text-xs text-slate-600">
              {script === 'kanji'
                ? 'Type its kun or on reading in romaji (e.g. yama or san)'
                : 'Type its romaji (e.g. ka, shi, kya)'}
            </p>

            <form onSubmit={handleQuizSubmit} className="space-y-3">
              <input
                type="text"
                autoFocus
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={typingInput}
                disabled={answering}
                onChange={(e) => setTypingInput(e.target.value)}
                placeholder="Type here..."
                aria-label="Reading in romaji"
                className="bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3 text-center text-xl font-mono text-slate-900 w-full focus:outline-none focus:border-indigo-600 shadow-inner disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={answering || !typingInput.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold py-3 rounded-xl text-white text-sm transition cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Enter ↵
              </button>
            </form>

            {quizFeedback && (
              <p role="status" className={`text-sm font-bold pt-1 ${quizFeedback.ok ? 'text-emerald-600' : 'text-amber-600'}`}>
                {quizFeedback.text}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
