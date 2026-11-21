/**
 * @file kanji-readings.ts
 * @description 答えの欄（textarea）ではふりがなを付けられないので、VCE 以外の漢字の読みを欄の下に出すための道具。
 *
 * 読みは、見本の答え（defaultAnswer）と質問文（text）にもともと付いている <ruby>漢字<rt>よみ</rt></ruby> から集める。
 * AI も外部の辞書も使わないので、お金がかからず、すぐに出る。
 * 見本の答えで使っている漢字は全部ここに入るので、見本をそのまま使ったり少し書き換えたりした答えなら、読みが出る。
 */
import type { OralExamQuestionsData } from "~/data/oral-exam-questions";

/** 漢字 → 読み（同じ漢字に読みが 2 つ以上あれば全部） */
export type ReadingDict = Map<string, string[]>;

const RUBY_RE = /<ruby>([^<]+?)<rt>([^<]+?)<\/rt><\/ruby>/g;

function addRubies(dict: ReadingDict, html: string | undefined) {
  if (!html) return;
  for (const m of html.matchAll(RUBY_RE)) {
    const base = m[1].trim();
    const reading = m[2].trim();
    if (!base || !reading) continue;
    const list = dict.get(base) ?? [];
    if (!list.includes(reading)) list.push(reading);
    dict.set(base, list);
  }
}

/** oral exam questions の全部の質問・見本の答えから、読みの辞書を作る */
export function buildReadingDictFromOralData(data: OralExamQuestionsData | null): ReadingDict {
  const dict: ReadingDict = new Map();
  if (!data) return dict;
  for (const section of Object.values(data)) {
    if (!section || typeof section !== "object") continue;
    for (const list of Object.values(section)) {
      if (!Array.isArray(list)) continue;
      for (const q of list) {
        addRubies(dict, q?.defaultAnswer);
        addRubies(dict, q?.text);
      }
    }
  }
  return dict;
}

/**
 * その質問の見本の答え（ふりがな付き）の読みを優先した辞書を返す。
 * 例: 「歳」は辞書では「さい／とし」だが、「二歳上の兄」の質問では見本どおり「とし」だけを出す。
 */
export function withContextReadings(dict: ReadingDict, contextHtml?: string): ReadingDict {
  if (!contextHtml) return dict;
  const local: ReadingDict = new Map();
  addRubies(local, contextHtml);
  if (local.size === 0) return dict;
  const merged: ReadingDict = new Map(dict);
  for (const [base, readings] of local) merged.set(base, readings);
  return merged;
}

export interface FoundReading {
  base: string;
  readings: string[];
}

/**
 * 文の中で、辞書にある漢字を見つけて読みを返す（同じものは 1 回だけ）。
 * いちばん長く一致するものを先に取る（「受験番号」→「受験」「番号」より長い登録があればそちら）。
 */
export function findReadings(text: string, dict: ReadingDict): FoundReading[] {
  if (!text || dict.size === 0) return [];
  let maxLen = 1;
  for (const k of dict.keys()) if (k.length > maxLen) maxLen = k.length;

  const found: FoundReading[] = [];
  const seen = new Set<string>();
  let i = 0;
  while (i < text.length) {
    let matched = 0;
    for (let len = Math.min(maxLen, text.length - i); len >= 1; len--) {
      const piece = text.slice(i, i + len);
      const readings = dict.get(piece);
      if (readings) {
        if (!seen.has(piece)) {
          seen.add(piece);
          found.push({ base: piece, readings });
        }
        matched = len;
        break;
      }
    }
    i += matched || 1;
  }
  return found;
}
