/**
 * @file ReferenceChartKana.tsx
 * @description ひらがなおよびカタカナの参照表コンポーネント
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
        In character-table order: basic sounds first, then voiced, semi-voiced and combined sounds. Characters are grouped by sound row — two groups per row.
      </p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {buildKanaGroups(pool).map((group) => (
          <div
            key={group.map((p) => p.id).join("-")}
            className="flex gap-1"
          >
            {group.map((p) => (
              <div
                key={p.id}
                className="min-w-0 flex-1 rounded-lg bg-slate-100 px-0.5 py-1.5 text-center dark:bg-white/5"
              >
                <p className="truncate text-base font-bold leading-tight text-slate-800 dark:text-white">
                  {p.front}
                </p>
                <p className="truncate text-[10px] font-medium text-slate-400">
                  {p.back}
                </p>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}