/**
 * @file games.memory-match.tsx
 * @description Memory Match — three concentration games (Hiragana,
 * Katakana and Kanji) whose cards are loaded live from the Supabase
 * table `kl_character`, featuring passcode/unlock protection matching character-maze.tsx.
 */
import {
  json,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "@remix-run/cloudflare";
import React, { useEffect, useState, useRef } from "react";
import { useLoaderData } from "@remix-run/react";
import { ToolPageWrapper } from "~/components/layout/ToolPageWrapper";
import type { PageLayoutRef } from "~/components/layout/PageLayout";
import { generateModuleMeta } from "~/utils/seoMeta";
import { supabase } from "~/lib/supabaseClient";

import {
  type PairSource,
  bySortOrder,
} from "~/utils/characterChartUtils";
import { ReferenceChartKana } from "~/components/ReferenceChartKana";
import { ReferenceChartKanji } from "~/components/ReferenceChartKanji";

type GameMode = "hiragana" | "katakana" | "kanji";
type KanjiPairMode = "reading" | "meaning";
type Difficulty = "easy" | "medium" | "hard";

interface LoaderDataShape {
  portalContent: unknown;
  currentPath: string;
  loadError: string | null;
  pools: Record<GameMode, PairSource[]> &
    Record<"kanjiMeaning", PairSource[]>;
  kanjiReadingAvailable: boolean;
}

// ------------------------------------------------------------------
// Loader — read kl_character from Supabase
// ------------------------------------------------------------------

const KL_COLUMNS =
  "id, character, kun_display, kun_reading, kun_romaji, " +
  "on_display, on_romaji, reading_kana, romaji, meaning, " +
  "stroke_count, radical, char_type, grade_level, created_at, " +
  "category, sort_order";

type KlRow = {
  id: string;
  character: string | null;
  kun_display: string | null;
  kun_reading: string | null;
  kun_romaji: string | null;
  on_display: string | null;
  on_romaji: string | null;
  reading_kana: string | null;
  romaji: string | null;
  meaning: string | null;
  stroke_count: number | null;
  radical: string | null;
  char_type: string | null;
  grade_level: string | number | null;
  created_at: string | null;
  category: string | null;
  sort_order: number | null;
};

const clean = (v: string | null | undefined) =>
  (v ?? "").trim();

function byCategoryThenSortOrder(
  a: PairSource,
  b: PairSource,
): number {
  const ca = (a.category ?? "").trim();
  const cb = (b.category ?? "").trim();
  if (ca !== cb) {
    if (ca === "") return 1;
    if (cb === "") return -1;
    const c = ca.localeCompare(cb, "en", {
      sensitivity: "base",
    });
    if (c !== 0) return c;
  }
  return bySortOrder(a, b);
}

function buildPools(rows: KlRow[]) {
  const hiragana: PairSource[] = [];
  const katakana: PairSource[] = [];
  const kanjiReading: PairSource[] = [];
  const kanjiMeaning: PairSource[] = [];

  const orderedRows = [...rows].sort((a, b) =>
    bySortOrder(
      { sortOrder: a.sort_order, front: clean(a.character) },
      { sortOrder: b.sort_order, front: clean(b.character) },
    ),
  );

  for (const r of orderedRows) {
    const ch = clean(r.character);
    if (!ch) continue;
    if (r.char_type === "hiragana" || r.char_type === "katakana") {
      const romaji = clean(r.romaji);
      if (!romaji) continue;
      const item = {
        id: r.id,
        front: ch,
        back: romaji,
        sortOrder: r.sort_order,
      };
      if (r.char_type === "hiragana") hiragana.push(item);
      else katakana.push(item);
    } else if (r.char_type === "kanji") {
      const extras = {
        sortOrder: r.sort_order,
        strokeCount: r.stroke_count,
        radical: clean(r.radical) || undefined,
        gradeLevel: r.grade_level,
        category: clean(r.category) || undefined,
      };
      const kunReading = clean(r.kun_reading);
      const onDisplay = clean(r.on_display);
      const reading = kunReading || onDisplay;
      const readingRomaji = kunReading
        ? clean(r.kun_romaji) || clean(r.on_romaji)
        : clean(r.on_romaji);
      if (reading) {
        kanjiReading.push({
          id: r.id,
          front: ch,
          back: reading,
          backSub: readingRomaji || undefined,
          ...extras,
        });
      }
      const meaning = clean(r.meaning);
      if (meaning) {
        kanjiMeaning.push({
          id: r.id,
          front: ch,
          back: meaning,
          backSub: reading || undefined,
          ...extras,
        });
      }
    }
  }
  hiragana.sort(bySortOrder);
  katakana.sort(bySortOrder);
  kanjiReading.sort(byCategoryThenSortOrder);
  kanjiMeaning.sort(byCategoryThenSortOrder);
  return { hiragana, katakana, kanjiReading, kanjiMeaning };
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);

  let portalContent: unknown = null;
  try {
    const { data: portalData } = await supabase
      .from("portal_settings")
      .select("content")
      .eq("key", "PORTAL_CONTENT")
      .single();
    portalContent = portalData?.content || null;
  } catch (e) {}

  let loadError: string | null = null;
  let pools: LoaderDataShape["pools"] = {
    hiragana: [],
    katakana: [],
    kanji: [],
    kanjiMeaning: [],
  };
  let kanjiReadingAvailable = false;

  try {
    const { data, error } = await supabase
      .from("kl_character")
      .select(KL_COLUMNS)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("character", { ascending: true })
      .limit(1000);
    if (error) throw error;
    const rows = (data ?? []) as unknown as KlRow[];
    const built = buildPools(rows);
    pools = {
      hiragana: built.hiragana,
      katakana: built.katakana,
      kanji: built.kanjiReading,
      kanjiMeaning: built.kanjiMeaning,
    };
    kanjiReadingAvailable = built.kanjiReading.length > 0;
    if (rows.length === 0) {
      loadError = "No characters were returned from the database.";
    }
  } catch (e) {
    loadError =
      "Characters could not be loaded from the database. " +
      "Please try again later.";
  }

  return json({
    portalContent,
    currentPath: url.pathname,
    loadError,
    pools,
    kanjiReadingAvailable,
  });
}

export const meta: MetaFunction<typeof loader> = ({
  data,
}: {
  data: any;
}) => {
  return generateModuleMeta(
    data?.portalContent || null,
    data?.currentPath || "",
  );
};

// ------------------------------------------------------------------
// Game helpers
// ------------------------------------------------------------------

const DIFFICULTIES: Record<
  Difficulty,
  { label: string; pairs: number; cols: number }
> = {
  easy: { label: "Easy", pairs: 8, cols: 4 },
  medium: { label: "Medium", pairs: 12, cols: 6 },
  hard: { label: "Hard", pairs: 18, cols: 6 },
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function uniqueByAnswer(items: PairSource[]): PairSource[] {
  const seen = new Set<string>();
  const out: PairSource[] = [];
  for (const it of items) {
    const key = it.back.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

interface CardState {
  key: string;
  pairId: string;
  kind: "front" | "back";
  text: string;
  sub?: string;
}

function buildDeck(pool: PairSource[], pairCount: number): CardState[] {
  const chosen = shuffle(uniqueByAnswer(pool)).slice(0, pairCount);
  const cards: CardState[] = [];
  for (const p of chosen) {
    cards.push({
      key: `${p.id}-front`,
      pairId: p.id,
      kind: "front",
      text: p.front,
    });
    cards.push({
      key: `${p.id}-back`,
      pairId: p.id,
      kind: "back",
      text: p.back,
      sub: p.backSub,
    });
  }
  return shuffle(cards);
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ------------------------------------------------------------------
// Page Component with Passcode Protection Structure
// ------------------------------------------------------------------

export default function MemoryMatchPage() {
  const layoutRef = useRef<PageLayoutRef>(null);
  const data = useLoaderData<typeof loader>() as unknown as LoaderDataShape;

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
    <ToolPageWrapper layoutRef={layoutRef} breadcrumbTitle="Memory Match">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <header className="mb-6 text-center">
          <p className="text-[11px] font-bold tracking-[0.25em] text-indigo-500 dark:text-indigo-300">
            MEMORY MATCH
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Kana &amp; Kanji Memory Match
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Flip two cards at a time and find every matching pair. Hiragana and Katakana match with their romaji; Kanji match with the reading or the meaning — you choose.
          </p>
        </header>

        {isAccessible ? (
          data.loadError &&
          data.pools.hiragana.length === 0 &&
          data.pools.katakana.length === 0 &&
          data.pools.kanji.length === 0 &&
          data.pools.kanjiMeaning.length === 0 ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              {data.loadError}
            </div>
          ) : (
            <MemoryMatchGame
              pools={data.pools}
              kanjiReadingAvailable={data.kanjiReadingAvailable}
            />
          )
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
            <div className="w-16 h-16 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center mx-auto text-3xl shadow-inner dark:bg-slate-800 dark:border-slate-700">
              🔒
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">このエリアは現在ロックされています</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
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
                className="bg-slate-50 border border-slate-300 rounded-lg px-4 py-2 text-center text-lg font-mono tracking-widest w-full text-slate-900 dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:outline-none focus:border-indigo-500"
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

// ------------------------------------------------------------------
// Game Component
// ------------------------------------------------------------------

function MemoryMatchGame({
  pools,
  kanjiReadingAvailable,
}: {
  pools: LoaderDataShape["pools"];
  kanjiReadingAvailable: boolean;
}) {
  const [mode, setMode] = useState<GameMode>("hiragana");
  const [kanjiPair, setKanjiPair] =
    useState<KanjiPairMode>("reading");
  const [difficulty, setDifficulty] =
    useState<Difficulty>("easy");
  const [showHelp, setShowHelp] = useState(false);
  const [round, setRound] = useState(0);

  const activeKanjiPair: KanjiPairMode =
    kanjiPair === "reading" && !kanjiReadingAvailable
      ? "meaning"
      : kanjiPair;

  const pool: PairSource[] =
    mode === "kanji"
      ? activeKanjiPair === "reading"
        ? pools.kanji
        : pools.kanjiMeaning
      : pools[mode];

  const pairTarget = Math.min(
    DIFFICULTIES[difficulty].pairs,
    uniqueByAnswer(pool).length,
  );

  const [deck, setDeck] = useState<CardState[]>([]);
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const [matchedIds, setMatchedIds] = useState<Set<string>>(
    new Set(),
  );
  const [moves, setMoves] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [started, setStarted] = useState(false);
  const [locked, setLocked] = useState(false);
  const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const won = pairTarget > 0 && matchedIds.size >= pairTarget;
  const accuracy =
    moves === 0 ? 100 : Math.round((matchedIds.size / moves) * 100);
  const stars = won ? (accuracy >= 85 ? 3 : accuracy >= 65 ? 2 : 1) : 0;

  const startGame = React.useCallback(() => {
    if (lockTimer.current) clearTimeout(lockTimer.current);
    setDeck(buildDeck(pool, DIFFICULTIES[difficulty].pairs));
    setOpenKeys([]);
    setMatchedIds(new Set());
    setMoves(0);
    setElapsed(0);
    setStarted(false);
    setLocked(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, round]);

  useEffect(() => {
    startGame();
  }, [startGame]);

  useEffect(() => {
    if (!started || won) return;
    const t = setInterval(
      () => setElapsed((e) => e + 1),
      1000,
    );
    return () => clearInterval(t);
  }, [started, won]);

  const newGame = (
    next?: Partial<{
      mode: GameMode;
      kanjiPair: KanjiPairMode;
      difficulty: Difficulty;
    }>,
  ) => {
    if (next?.mode) setMode(next.mode);
    if (next?.kanjiPair) setKanjiPair(next.kanjiPair);
    if (next?.difficulty) setDifficulty(next.difficulty);
    setRound((r) => r + 1);
  };

  const flipCard = (card: CardState) => {
    if (locked || won) return;
    if (matchedIds.has(card.pairId)) return;
    if (openKeys.includes(card.key)) return;
    if (openKeys.length >= 2) return;
    if (!started) setStarted(true);

    const nextOpen = [...openKeys, card.key];
    setOpenKeys(nextOpen);
    if (nextOpen.length < 2) return;

    setMoves((m) => m + 1);
    const first = deck.find((c) => c.key === nextOpen[0]);
    if (first && first.pairId === card.pairId) {
      setMatchedIds((prev) => new Set(prev).add(card.pairId));
      setOpenKeys([]);
    } else {
      setLocked(true);
      lockTimer.current = setTimeout(() => {
        setOpenKeys([]);
        setLocked(false);
      }, 900);
    }
  };

  const cols = DIFFICULTIES[difficulty].cols;
  const rows = pairTarget > 0 ? Math.ceil((pairTarget * 2) / cols) : 4;
  const [boardWidth, setBoardWidth] = useState(560);
  useEffect(() => {
    const fit = () => {
      const byWidth = Math.min(window.innerWidth - 32, 880);
      const byHeight = Math.max(
        240,
        (window.innerHeight - 430) * (cols / Math.max(rows, 1)),
      );
      setBoardWidth(Math.max(260, Math.min(byWidth, byHeight)));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [cols, rows, round]);

  useEffect(() => {
    if (!showHelp) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowHelp(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showHelp]);

  const modeLabel =
    mode === "hiragana"
      ? "Hiragana"
      : mode === "katakana"
        ? "Katakana"
        : "Kanji";
  const partnerLabel =
    mode === "kanji"
      ? activeKanjiPair === "reading"
        ? "reading"
        : "meaning"
      : "romaji";

  const tabBtn = (active: boolean) =>
    `rounded-full px-4 py-2 text-sm font-bold transition ${
      active
        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
        : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10 dark:hover:bg-white/10"
    }`;
  const segBtn = (active: boolean) =>
    `rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
      active
        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
        : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
    }`;

  return (
    <div>
      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
        <div className="flex gap-2" role="tablist" aria-label="Game">
          {(
            [
              ["hiragana", "Hiragana"],
              ["katakana", "Katakana"],
              ["kanji", "Kanji"],
            ] as [GameMode, string][]
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => newGame({ mode: m })}
              className={tabBtn(mode === m)}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowHelp(true)}
          className="ml-auto rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10 dark:hover:bg-white/10"
        >
          How to Play
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
        <div
          className="flex items-center gap-1 rounded-full bg-slate-100 p-1 dark:bg-white/5"
          aria-label="Difficulty"
        >
          {(
            Object.keys(DIFFICULTIES) as Difficulty[]
          ).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => newGame({ difficulty: d })}
              className={segBtn(difficulty === d)}
            >
              {DIFFICULTIES[d].label} · {DIFFICULTIES[d].pairs} pairs
            </button>
          ))}
        </div>

        {mode === "kanji" && (
          <div
            className="flex items-center gap-1 rounded-full bg-slate-100 p-1 dark:bg-white/5"
            aria-label="Kanji pairs match with"
          >
            <span className="px-2 text-xs font-bold text-slate-400">
              Match kanji with:
            </span>
            <button
              type="button"
              disabled={!kanjiReadingAvailable}
              onClick={() => newGame({ kanjiPair: "reading" })}
              className={`${segBtn(activeKanjiPair === "reading")} disabled:cursor-not-allowed disabled:opacity-40`}
            >
              Reading
            </button>
            <button
              type="button"
              onClick={() => newGame({ kanjiPair: "meaning" })}
              className={segBtn(activeKanjiPair === "meaning")}
            >
              Meaning
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => newGame()}
          className="rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-white shadow-md shadow-amber-500/25 transition hover:bg-amber-400 active:scale-95"
        >
          New Game
        </button>
      </div>

      {/* Stats */}
      <div className="mx-auto mb-4 grid max-w-xl grid-cols-4 gap-2 text-center">
        {[
          ["Pairs Found", `${matchedIds.size} / ${pairTarget}`],
          ["Moves", `${moves}`],
          ["Time", formatTime(elapsed)],
          ["Accuracy", `${moves === 0 ? 100 : accuracy}%`],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl bg-slate-100 px-2 py-2 dark:bg-white/5"
          >
            <p className="text-[10px] font-bold tracking-widest text-slate-400">
              {label.toUpperCase()}
            </p>
            <p className="text-base font-black tabular-nums text-slate-800 dark:text-white">
              {value}
            </p>
          </div>
        ))}
      </div>
      <div
        className="mx-auto mb-5 h-2 max-w-xl overflow-hidden rounded-full bg-slate-200 dark:bg-white/10"
        aria-hidden
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-500"
          style={{
            width:
              pairTarget === 0
                ? "0%"
                : `${(matchedIds.size / pairTarget) * 100}%`,
          }}
        />
      </div>

      {/* Board / empty state / win banner */}
      {pool.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm font-medium text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
          No {modeLabel.toLowerCase()} characters are available for
          this game yet. Please check back later.
        </div>
      ) : pairTarget < DIFFICULTIES[difficulty].pairs ? (
        <p className="mb-3 text-center text-xs font-medium text-slate-400">
          Only {pairTarget} unique pairs are available in the
          database for this mode, so this round uses all of them.
        </p>
      ) : null}

      {pool.length > 0 && (
        <div
          className="mx-auto grid gap-2"
          style={{
            width: boardWidth,
            maxWidth: "100%",
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          }}
        >
          {deck.map((card) => {
            const isMatched = matchedIds.has(card.pairId);
            const isOpen = isMatched || openKeys.includes(card.key);
            return (
              <button
                key={card.key}
                type="button"
                onClick={() => flipCard(card)}
                aria-label={
                  isOpen ? card.text : "Face-down card"
                }
                className="klmm-card aspect-square"
              >
                <span
                  className={`klmm-inner ${isOpen ? "klmm-open" : ""}`}
                >
                  <span className="klmm-face klmm-back-design">
                    <span className="text-[0.55em] font-black tracking-widest text-white/70">
                      ?
                    </span>
                  </span>
                  <span
                    className={`klmm-face klmm-front ${
                      isMatched
                        ? "ring-2 ring-emerald-400 bg-emerald-50 dark:bg-emerald-500/15"
                        : "bg-white dark:bg-white/10"
                    }`}
                  >
                    <span
                      className={
                        card.kind === "front"
                          ? "klmm-char"
                          : card.text.length > 6
                            ? "klmm-word-sm"
                            : "klmm-word"
                      }
                    >
                      {card.text}
                    </span>
                    {card.sub && (
                      <span className="klmm-sub">{card.sub}</span>
                    )}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {won && (
        <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <p className="text-2xl" aria-label={`${stars} out of 3 stars`}>
            {"★".repeat(stars)}
            {"☆".repeat(3 - stars)}
          </p>
          <h2 className="mt-1 text-xl font-black text-emerald-800 dark:text-emerald-200">
            You found every pair!
          </h2>
          <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
            {modeLabel} · matched with {partnerLabel} · {moves}{" "}
            moves in {formatTime(elapsed)} · {accuracy}% accuracy
          </p>
          <button
            type="button"
            onClick={() => newGame()}
            className="mt-4 rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-600/25 transition hover:bg-emerald-500 active:scale-95"
          >
            Play Again
          </button>
        </div>
      )}

      {/* Reference charts */}
      {pool.length > 0 && mode !== "kanji" && (
        <ReferenceChartKana pool={pool} modeLabel={modeLabel} />
      )}

      {mode === "kanji" && (
        <ReferenceChartKanji
          kanjiPool={pools.kanji}
          kanjiMeaningPool={pools.kanjiMeaning}
          mode={mode}
        />
      )}

      {/* How to Play modal */}
      {showHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowHelp(false)}
          role="dialog"
          aria-modal="true"
          aria-label="How to Play"
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              How to Play
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              <li>Pick a game: Hiragana, Katakana or Kanji.</li>
              <li>
                For Kanji, choose whether the kanji match with their
                Reading or their Meaning.
              </li>
              <li>
                Click a card to flip it, then flip a second card.
              </li>
              <li>
                A character and its {partnerLabel} are a pair. Pairs
                stay face up; other cards flip back over.
              </li>
              <li>
                Find every pair in as few moves and as little time
                as you can.
              </li>
            </ul>
            <button
              type="button"
              onClick={() => setShowHelp(false)}
              className="mt-5 w-full rounded-full bg-indigo-600 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-500 active:scale-95"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Card flip styles */}
      <style>{`
        .klmm-card { perspective: 600px; background: none; border: none; padding: 0; cursor: pointer; font-size: calc(${boardWidth}px / ${Math.max(cols, 1)} * 0.42); }
        .klmm-inner { position: relative; display: block; width: 100%; height: 100%; transform-style: preserve-3d; transition: transform 0.35s ease; }
        .klmm-inner.klmm-open { transform: rotateY(180deg); }
        .klmm-face { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.1em; border-radius: 0.55em; backface-visibility: hidden; -webkit-backface-visibility: hidden; overflow: hidden; padding: 0.15em; }
        .klmm-back-design { background: linear-gradient(135deg, #6366f1, #8b5cf6); box-shadow: inset 0 0 0 2px rgba(255,255,255,0.25); font-size: 1em; }
        .klmm-front { transform: rotateY(180deg); box-shadow: inset 0 0 0 1px rgba(100,116,139,0.25); color: #1e293b; }
        .dark .klmm-front { color: #f8fafc; }
        .klmm-char { font-size: 1em; font-weight: 800; line-height: 1.1; }
        .klmm-word { font-size: 0.62em; font-weight: 800; line-height: 1.15; text-align: center; word-break: break-word; }
        .klmm-word-sm { font-size: 0.42em; font-weight: 700; line-height: 1.2; text-align: center; word-break: break-word; }
        .klmm-sub { font-size: 0.34em; font-weight: 600; color: #94a3b8; line-height: 1.1; }
      `}</style>
    </div>
  );
}