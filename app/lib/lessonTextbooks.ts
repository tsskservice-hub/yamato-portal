/**
 * @file app/lib/lessonTextbooks.ts
 * @description レッスンが対応する教科書・ユニット（edu_lesson_textbook_units）を読み込む
 *   レッスンページやトピックページで「Obento Deluxe (5th edition) · Unit 4: Family · P. 1-3」のように表示するために使う。
 *   後で iiTomo などの対応を足しても、データベースに行を足すだけでここはそのまま使える。
 */

import { supabase } from "~/lib/supabaseClient";

export interface TextbookRef {
  textbook: string;          // 例：Obento Deluxe
  edition: string | null;    // 例：5th edition
  unit: number;              // 例：4
  unitTitle: string | null;  // 例：Family（英語のトピック名）
  coverage: "full" | "partial";
  pageRef: string | null;    // 例：P. 1-3
  note: string | null;
  textbookOrder: number;     // 教科書の並び順
}

/** レッスン ID ごとの対応教科書の一覧（教科書の並び順）。読み込めない時は空 */
export async function fetchTextbookRefs(lessonIds: string[]): Promise<Record<string, TextbookRef[]>> {
  const result: Record<string, TextbookRef[]> = {};
  if (lessonIds.length === 0) return result;
  try {
    const { data, error } = await supabase
      .from("edu_lesson_textbook_units")
      .select("lesson_id, coverage, page_ref, note, edu_textbook_units ( unit_number, title, edu_textbooks ( title, edition, sort_order ) )")
      .in("lesson_id", lessonIds);
    if (error) throw error;

    for (const row of (data ?? []) as any[]) {
      const unit = Array.isArray(row.edu_textbook_units) ? row.edu_textbook_units[0] : row.edu_textbook_units;
      const book = unit && (Array.isArray(unit.edu_textbooks) ? unit.edu_textbooks[0] : unit.edu_textbooks);
      if (!unit || !book) continue;
      const list = (result[String(row.lesson_id)] ??= []);
      list.push({
        textbook: book.title,
        edition: book.edition ?? null,
        unit: unit.unit_number,
        unitTitle: unit.title ?? null,
        coverage: row.coverage === "partial" ? "partial" : "full",
        pageRef: row.page_ref ?? null,
        note: row.note ?? null,
        textbookOrder: book.sort_order ?? 0,
      });
    }
    Object.values(result).forEach((list) => list.sort((a, b) => a.textbookOrder - b.textbookOrder || a.unit - b.unit));
  } catch (err) {
    console.warn("⚠️ [lessonTextbooks] Failed to load textbook references:", err);
  }
  return result;
}

/** 表示用の 1 行：Obento Deluxe (5th edition) · Unit 4: Family · P. 1-3 */
export function formatTextbookRef(ref: TextbookRef): string {
  const book = ref.edition ? `${ref.textbook} (${ref.edition})` : ref.textbook;
  const page = ref.pageRef ? ` · ${ref.pageRef.replace(/^Unit \d+,\s*/, "")}` : "";
  const partial = ref.coverage === "partial" ? " · partly" : "";
  const unit = ref.unitTitle ? `Unit ${ref.unit}: ${ref.unitTitle}` : `Unit ${ref.unit}`;
  return `${book} · ${unit}${page}${partial}`;
}

/** 教科書の出版社と関係がないことを示す一文（教科書名を出す場所に添える） */
export const TEXTBOOK_DISCLAIMER =
  "Textbook references are for convenience only. This site is not affiliated with the publishers of these textbooks.";
