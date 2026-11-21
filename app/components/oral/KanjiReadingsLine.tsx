import React, { useMemo } from "react";
import { findReadings, withContextReadings, type ReadingDict } from "~/utils/kanji-readings";

/** 答えの欄の下に、VCE 以外の漢字の読みを出す（例: 📖 受験（じゅけん）・番号（ばんごう）） */
export const KanjiReadingsLine: React.FC<{
  text: string;
  dict: ReadingDict;
  /** その質問の見本の答え（ふりがな付き HTML）。あれば、その読みを優先する */
  contextHtml?: string;
}> = ({ text, dict, contextHtml }) => {
  const localDict = useMemo(() => withContextReadings(dict, contextHtml), [dict, contextHtml]);
  const found = findReadings(text, localDict);
  if (found.length === 0) return null;
  return (
    <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
      <span className="font-bold">📖 Readings: </span>
      {found.map((r) => (
        <span key={r.base} className="inline-block mr-2">
          {r.base}
          <span className="text-slate-500 dark:text-slate-400">（{r.readings.join("／")}）</span>
        </span>
      ))}
    </p>
  );
};

export default KanjiReadingsLine;
