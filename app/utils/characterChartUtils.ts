/**
 * @file characterChartUtils.ts
 * @description ひらがな・カタカナおよび漢字のグループ化、ソート、型定義を行う共通ユーティリティ
 */

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

export interface KanjiChartItem {
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

export interface KanjiCategoryGroup {
  key: string;
  label: string;
  items: KanjiChartItem[];
}

const SMALL_Y = ["ゃ", "ゅ", "ょ", "ャ", "ュ", "ョ"];
const DA_ROW = new Set([
  "だ", "ぢ", "づ", "で", "ど",
  "ダ", "ヂ", "ヅ", "デ", "ド",
]);
const DEFAULT_CATEGORY = "Miscellaneous";

// reference.200kanji.tsx と完全に同期させたカテゴリー表示順序
export const CATEGORY_ORDER = [
  "Numbers",
  "Counters",
  "Season",
  "Days of the week",
  "Day",
  "Time",
  "Parts of the body",
  "Positions",
  "Directions",
  "School life",
  "People/family",
  "Adjectives/adverbs",
  "Verbs (Movement)",
  "Verbs (Body/Senses)",
  "Verbs (Lifestyle)",
  "Verbs (Activity)",
  "Country/city",
  "Place",
  "Travel/transport",
  "Food",
  "Nature",
  "Animals",
  "Colours",
  "Repeat sign",
  "Miscellaneous",
];

export function bySortOrder(
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

export function kanaGroupKey(p: PairSource): string {
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

export function kanjiCategoryLabel(category?: string): string {
  const c = (category ?? "").trim();
  if (!c) return DEFAULT_CATEGORY;
  
  // CATEGORY_ORDER に完全一致するものがあれば、そのままのケース（大文字小文字など）で返す
  const matched = CATEGORY_ORDER.find(
    (cat) => cat.toLowerCase() === c.toLowerCase()
  );
  if (matched) return matched;

  if (c.toLowerCase() === "other" || c.toLowerCase() === "others") return DEFAULT_CATEGORY;
  return c.charAt(0).toUpperCase() + c.slice(1);
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
    const rawCategory = (item.category ?? "").trim();
    const label = kanjiCategoryLabel(rawCategory);
    // グループ化のキーとしてラベルをそのまま利用（大小文字を統一して扱う）
    const key = label.toLowerCase();
    
    let g = groupsByKey.get(key);
    if (!g) {
      g = { key, label, items: [] };
      groupsByKey.set(key, g);
    }
    g.items.push(item);
  }

  const groups = [...groupsByKey.values()];
  for (const g of groups) g.items.sort(bySortOrder);

  // CATEGORY_ORDER の配列順序に従ってグループを厳密にソートする
  groups.sort((a, b) => {
    const indexA = CATEGORY_ORDER.findIndex(
      (cat) => cat.toLowerCase() === a.label.toLowerCase()
    );
    const indexB = CATEGORY_ORDER.findIndex(
      (cat) => cat.toLowerCase() === b.label.toLowerCase()
    );

    // 両方とも CATEGORY_ORDER に存在する場合はその定義順に従う
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    // 片方だけ存在しない場合のフォールバック（存在する方を優先）
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;

    // どちらも定義外の場合はアルファベット順
    return a.label.localeCompare(b.label, "en", { sensitivity: "base" });
  });

  return groups;
}