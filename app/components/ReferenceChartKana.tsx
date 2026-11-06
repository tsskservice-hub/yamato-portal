/**
 * @file ReferenceChartKana.tsx
 * @description ひらがなおよびカタカナの参照表コンポーネント（種類別カラーリング対応版）
 */
import React from "react";

export interface PairSource {
  id: string;
  front: string;
  back: string;
  backSub?: string;
  sortOrder?: number | null;
  strokeCount?: number | null;
  radical?: string;
  gradeLevel?: string | number | null;
  category?: string;
}

type KanaSoundType = "basic" | "modified" | "combined";

const SMALL_Y = ["ゃ", "ゅ", "ょ", "ャ", "ュ", "ョ"];
const DA_ROW = new Set([
  "だ", "ぢ", "づ", "で", "ど",
  "ダ", "ヂ", "ヅ", "デ", "ド",
]);

function bySortOrder(
  a: { sortOrder?: number | null; front: string },
  b: { sortOrder?: number | null; front: string },
): number {
  const ao = a.sortOrder ?? null;
  const bo = b.sortOrder ?? null;
  if (ao !== null && bo !== null && ao !== bo) return ao - bo;
  if (ao !== null && bo === null) return -1;
  if (ao === null && bo !== null) return 1;
  return a.front.localeCompare(b.front, "ja");
}

function kanaGroupKey(p: PairSource): string {
  const chars = Array.from(p.front);
  const romaji = p.back.toLowerCase().trim();
  if (chars[0] === "ん" || chars[0] === "ン" || romaji === "n")
    return "row-w";
  if (chars[0] === "を" || chars[0] === "ヲ") return "row-w";
  if (chars.length >= 2 && SMALL_Y.includes(chars[1])) {
    if (chars[0] === "ぢ" || chars[0] === "ヂ") return "yoon-dy";
    return `yoon-${romaji.replace(/[auo]$/, "")}`;
  }
  if (chars.length === 1 && DA_ROW.has(chars[0])) return "row-d";
  if (/^[aiueo]$/.test(romaji)) return "row-a";
  const base = romaji.replace(/[aiueo]$/, "");
  const rowOf: Record<string, string> = {
    k: "k", g: "g", s: "s", sh: "s", z: "z", j: "z",
    t: "t", ch: "t", ts: "t", d: "d", n: "n", h: "h",
    f: "h", m: "m", y: "y", r: "r", w: "w", b: "b", p: "p",
  };
  return `row-${rowOf[base] ?? base}`;
}

// 各文字が basic, modified, combined のどれに属するかを判定する関数
function getKanaSoundType(p: PairSource): KanaSoundType {
  const chars = Array.from(p.front);
  const romaji = p.back.toLowerCase().trim();

  // 1. combined sounds (拗音: ゃ、ゅ、ょ など)
  if (chars.length >= 2 && SMALL_Y.includes(chars[1])) {
    return "combined";
  }

  // 2. modified sounds (濁音・半濁音: ガ行、ザ行、ダ行、バ行、パ行など)
  const modifiedRows = new Set(["g", "z", "j", "d", "b", "p"]);
  const base = romaji.replace(/[aiueo]$/, "");
  if (modifiedRows.has(base) || DA_ROW.has(chars[0])) {
    return "modified";
  }

  // 3. その他は basic sounds (清音)
  return "basic";
}

// 種類に応じたTailwindの背景色クラスを返す
function getSoundTypeStyle(type: KanaSoundType): string {
  switch (type) {
    case "combined":
      // Light pink
      return "bg-pink-50 text-pink-900 border-pink-200 dark:bg-pink-500/15 dark:text-pink-200 dark:border-pink-500/30";
    case "modified":
      // Yellow (Amber)
      return "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-500/30";
    case "basic":
    default:
      // Light blue (Sky)
      return "bg-sky-50 text-sky-900 border-sky-200 dark:bg-sky-500/15 dark:text-sky-200 dark:border-sky-500/30";
  }
}

export function buildKanaGroups(pool: PairSource[]): PairSource[][] {
  const sorted = [...pool].sort(bySortOrder);
  const groups: PairSource[][] = [];
  const byKey = new Map<string, PairSource[]>();
  for (const p of sorted) {
    const key = kanaGroupKey(p);
    let g = byKey.get(key);
    if (!g) {
      g = [];
      byKey.set(key, g);
      groups.push(g);
    }
    g.push(p);
  }
  return groups;
}

interface ReferenceChartKanaProps {
  pool: PairSource[];
  modeLabel: string;
}

export function ReferenceChartKana({ pool, modeLabel }: ReferenceChartKanaProps) {
  if (pool.length === 0) return null;

  return (
    <section className="mx-auto mt-8 max-w-xl">
      <h2 className="mb-1 text-center text-sm font-black tracking-wide text-slate-700 dark:text-slate-200">
        {modeLabel} Reference Chart
      </h2>
      <p className="mb-3 text-center text-xs text-slate-400">
        basic sounds (light blue), modified sounds (yellow), combined sounds (light pink).
      </p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {buildKanaGroups(pool).map((group) => (
          <div
            key={group.map((p) => p.id).join("-")}
            className="flex gap-1"
          >
            {group.map((p) => {
              const soundType = getKanaSoundType(p);
              const styleClass = getSoundTypeStyle(soundType);

              return (
                <div
                  key={p.id}
                  className={`min-w-0 flex-1 rounded-lg border px-0.5 py-1.5 text-center transition-colors ${styleClass}`}
                >
                  <p className="truncate text-base font-bold leading-tight">
                    {p.front}
                  </p>
                  <p className="truncate text-[10px] font-medium opacity-75">
                    {p.back}
                  </p>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}