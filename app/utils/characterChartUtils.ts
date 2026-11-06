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
const NO_CATEGORY = "Other";

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
  if (!c) return NO_CATEGORY;
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