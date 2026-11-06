/**
 * @file ReferenceChartKanji.tsx
 * @description カテゴリ別の漢字参照表コンポーネント（共通ユーティリティ連携・順序強制版）
 */
import React from "react";
import type { PairSource } from "./ReferenceChartKana";
import { buildKanjiGroups, CATEGORY_ORDER } from "~/utils/characterChartUtils";

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

  // 共通ユーティリティのグループ化を呼び出した後、CATEGORY_ORDER に従って確実に並び替える
  const groups = buildKanjiGroups(kanjiPool, kanjiMeaningPool).sort((a, b) => {
    const indexA = CATEGORY_ORDER.findIndex(
      (cat) => cat.toLowerCase() === a.label.toLowerCase()
    );
    const indexB = CATEGORY_ORDER.findIndex(
      (cat) => cat.toLowerCase() === b.label.toLowerCase()
    );

    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;

    return a.label.localeCompare(b.label, "en", { sensitivity: "base" });
  });

  return (
    <section className="mx-auto mt-8 max-w-xl">
      <h2 className="mb-1 text-center text-sm font-black tracking-wide text-slate-700 dark:text-slate-200">
        Kanji Chart
      </h2>
      <p className="mb-3 text-center text-xs text-slate-400">
        These 200 VCE Kanji characters are fundamental for everyday life in Japan.
      </p>
      {groups.map((group) => (
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