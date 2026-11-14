/**
 * @file app/data/lesson-slugs.ts
 * @description 古い（教科書名入りの）レッスン・トピックの slug と、新しい slug の対応
 *
 * 2026-11 に slug を教科書に依存しない形（obento-unit-4-lesson-1 → family-1）へ変えた。
 * - 古い URL（/lessons/obento-unit-4-lesson-1 など）を新しい URL へ転送するために使う
 * - データベースの切り替え（supabase/sql/17_neutral_lesson_slugs.sql）の前後どちらでも
 *   レッスンを見つけられるように、新しい slug から古い slug も引けるようにする
 * どの教科書のどのユニットに対応するかは、データベースの edu_lesson_textbook_units が持つ。
 */

export const LEGACY_LESSON_SLUGS: Record<string, string> = {
  "obento-unit-1-lesson-1": "greetings-1",
  "obento-unit-1-lesson-2": "greetings-2",
  "obento-unit-1-lesson-3": "greetings-3",
  "obento-unit-2-lesson-1": "numbers-1",
  "obento-unit-2-lesson-2": "numbers-2",
  "obento-unit-2-lesson-3": "numbers-3",
  "obento-unit-3-lesson-1": "countries-1",
  "obento-unit-3-lesson-2": "countries-2",
  "obento-unit-3-lesson-3": "countries-3",
  "obento-unit-4-lesson-1": "family-1",
  "obento-unit-4-lesson-2": "family-2",
  "obento-unit-4-lesson-3": "family-3",
  "obento-unit-5-lesson-1": "pets-1",
  "obento-unit-5-lesson-2": "pets-2",
  "obento-unit-6-lesson-1": "food-1",
  "obento-unit-6-lesson-2": "food-2",
};

export const LEGACY_TOPIC_SLUGS: Record<string, string> = {
  "obento-unit-1": "greetings",
  "obento-unit-2": "numbers",
  "obento-unit-3": "countries",
  "obento-unit-4": "family",
  "obento-unit-5": "pets",
  "obento-unit-6": "food",
};

/** 古い slug なら新しい slug を返す（古くなければ null） */
export function newSlugFor(slug: string): string | null {
  return LEGACY_LESSON_SLUGS[slug] ?? LEGACY_TOPIC_SLUGS[slug] ?? null;
}

/** 新しい slug と、それに対応する古い slug（データベースを切り替える前の値）をまとめて返す */
export function slugCandidates(slug: string): string[] {
  const legacy = [...Object.entries(LEGACY_LESSON_SLUGS), ...Object.entries(LEGACY_TOPIC_SLUGS)]
    .filter(([, next]) => next === slug)
    .map(([old]) => old);
  return [slug, ...legacy];
}
