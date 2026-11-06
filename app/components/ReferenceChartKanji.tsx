/**
 * @file ReferenceChartKanji.tsx
 * @description カテゴリ別の漢字参照表コンポーネント
 */
import React from "react";
import type { PairSource } from "./ReferenceChartKana";

interface KanjiChartItem {
  id: string;
  front: string;
  reading?: string;
  readingRomaji?: string;
  meaning?: string;
  sortOrder?: number | null;
  strokeCount?: number | null;
  radical?: string;
  gradeLevel?: string | number | null;
  category?: string;
}

interface KanjiCategoryGroup {
  key: string;
  label: string;
  items: KanjiChartItem[];
}

const NO_CATEGORY = "Other";

function kanjiCategoryLabel(category?: string): string {
  const c = (category ?? "").trim();
  if (!c) return NO_CATEGORY;
  return c.charAt(0).toUpperCase() + c.slice(1);
}

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

export function buildKanjiGroups(
  readingPool: PairSource[],
  meaningPool: PairSource[],
): KanjiCategoryGroup[] {
  const byId = new Map<string, KanjiChartItem>();
  const merge = (p: PairSource, isMeaning: boolean) => {
    let item = byId.get(p.id);
    if (!item) {
      item = {
        id: p.id,
        front: p.front,
        sortOrder: p.sortOrder ?? null,
        strokeCount: p.strokeCount ?? null,
        radical: p.radical,
        gradeLevel: p.gradeLevel ?? null,
        category: p.category,
      };
      byId.set(p.id, item);
    }
    if (isMeaning) {
      item.meaning = p.back;
      if (!item.reading && p.backSub) item.reading = p.backSub;
    } else {
      item.reading = p.back;
      if (p.backSub) item.readingRomaji = p.backSub;
    }
  };
  for (const p of readingPool) merge(p, false);
  for (const p of meaningPool) merge(p, true);

  const groupsByKey = new Map<string, KanjiCategoryGroup>();
  for (const item of byId.values()) {
    const key = (item.category ?? "").trim();
    let g = groupsByKey.get(key);
    if (!g) {
      g = { key, label: kanjiCategoryLabel(key), items: [] };
      groupsByKey.set(key, g);
    }
    g.items.push(item);
  }
  const groups = [...groupsByKey.values()];
  for (const g of groups) g.items.sort(bySortOrder);
  groups.sort((a, b) => {
    if (a.key === "" && b.key !== "") return 1;
    if (a.key !== "" && b.key === "") return -1;
    return a.key.localeCompare(b.key, "en", {
      sensitivity: "base",
    });
  });
  return groups;
}

interface ReferenceChartKanjiProps {
  kanjiPool: PairSource[];
  kanjiMeaningPool: PairSource[];
  mode: string;
}

export function ReferenceChartKanji({
  kanjiPool,
  kanjiMeaningPool,
  mode,
}: ReferenceChartKanjiProps) {
  if (mode !== "kanji" || (kanjiPool.length === 0 && kanjiMeaningPool.length === 0)) {
    return null;
  }

  return (
    <section className="mx-auto mt-8 max-w-xl">
      <h2 className="mb-1 text-center text-sm font-black tracking-wide text-slate-700 dark:text-slate-200">
        Kanji Chart
      </h2>
      <p className="mb-3 text-center text-xs text-slate-400">
        Grouped by category. Within each category, kanji are shown in the order set in the character table.
      </p>
      {buildKanjiGroups(kanjiPool, kanjiMeaningPool).map((group) => (
        <div key={group.key || "__other__"} className="mb-5">
          <h3 className="mb-2 flex items-baseline gap-2 text-left text-xs font-black tracking-wide text-slate-600 dark:text-slate-300">
            <span>{group.label}</span>
            <span className="text-[10px] font-bold text-slate-400">
              ({group.items.length})
            </span>
          </h3>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {group.items.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2.5 rounded-lg bg-slate-100 px-2.5 py-1.5 dark:bg-white/5"
              >
                <span className="text-xl font-bold text-slate-800 dark:text-white">
                  {p.front}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-bold text-slate-600 dark:text-slate-300">
                    {p.reading
                      ? `${p.reading}${
                          p.readingRomaji ? ` · ${p.readingRomaji}` : ""
                        }`
                      : "—"}
                  </span>
                  <span className="block truncate text-[11px] text-slate-400">
                    {p.meaning ?? ""}
                  </span>
                  {(() => {
                    const meta: string[] = [];
                    if (p.strokeCount != null)
                      meta.push(`${p.strokeCount} strokes`);
                    if (p.radical) meta.push(`radical ${p.radical}`);
                    if (
                      p.gradeLevel != null &&
                      p.gradeLevel !== ""
                    )
                      meta.push(`grade ${p.gradeLevel}`);
                    return meta.length > 0 ? (
                      <span className="block truncate text-[10px] text-slate-400">
                        {meta.join(" · ")}
                      </span>
                    ) : null;
                  })()}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}