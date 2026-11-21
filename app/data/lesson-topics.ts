/**
 * @file app/data/lesson-topics.ts
 * @description このサイトのトピック（URL の名前）と、教科書のユニットの対応表
 *
 * レッスンの URL は「トピック名-番号」に決めている（例：Unit 4 Family → /lessons/family、/lessons/family-1）。
 * Obento Deluxe / Supreme のどのユニットのページを作り始めても迷わないように、
 * 全ユニットのトピック名をここで先に決めておく。
 *   - edu_topics.slug          … ここの topic
 *   - edu_lessons.slug         … `${topic}-${番号}`（例：dates-1）
 *   - edu_lessons.site_order   … ここの siteOrder × 100 ＋ レッスン番号 × 10（例：dates-1 → 710）
 * データベース側の登録は supabase/sql/20_all_unit_topics.sql、レッスンの追加は
 * supabase/sql/templates/new_lesson.sql を使う。
 */

export interface UnitTopic {
  /** URL に使う名前（edu_topics.slug） */
  topic: string;
  /** 教科書（edu_textbooks.id） */
  textbook: "obento-deluxe" | "obento-supreme";
  /** 教科書のユニット番号 */
  unit: number;
  /** 英語のトピック名（edu_textbook_units.title） */
  topicEn: string;
  /** このサイトでの順番（Deluxe 1〜12 → Supreme 13〜24） */
  siteOrder: number;
}

export const UNIT_TOPICS: UnitTopic[] = [
  { topic: "greetings",  textbook: "obento-deluxe",  unit: 1,  topicEn: "Introductions", siteOrder: 1 },
  { topic: "numbers",    textbook: "obento-deluxe",  unit: 2,  topicEn: "Numbers",       siteOrder: 2 },
  { topic: "countries",  textbook: "obento-deluxe",  unit: 3,  topicEn: "Nationality",   siteOrder: 3 },
  { topic: "family",     textbook: "obento-deluxe",  unit: 4,  topicEn: "Family",        siteOrder: 4 },
  { topic: "pets",       textbook: "obento-deluxe",  unit: 5,  topicEn: "Pets",          siteOrder: 5 },
  { topic: "food",       textbook: "obento-deluxe",  unit: 6,  topicEn: "Food",          siteOrder: 6 },
  { topic: "dates",      textbook: "obento-deluxe",  unit: 7,  topicEn: "Dates",         siteOrder: 7 },
  { topic: "hobbies",    textbook: "obento-deluxe",  unit: 8,  topicEn: "Hobbies",       siteOrder: 8 },
  { topic: "transport",  textbook: "obento-deluxe",  unit: 9,  topicEn: "Transport",     siteOrder: 9 },
  { topic: "activities", textbook: "obento-deluxe",  unit: 10, topicEn: "Activities",    siteOrder: 10 },
  { topic: "leisure",    textbook: "obento-deluxe",  unit: 11, topicEn: "Leisure",       siteOrder: 11 },
  { topic: "holidays",   textbook: "obento-deluxe",  unit: 12, topicEn: "Holidays",      siteOrder: 12 },
  { topic: "parties",    textbook: "obento-supreme", unit: 1,  topicEn: "Parties",       siteOrder: 13 },
  { topic: "housing",    textbook: "obento-supreme", unit: 2,  topicEn: "Housing",       siteOrder: 14 },
  { topic: "school",     textbook: "obento-supreme", unit: 3,  topicEn: "School",        siteOrder: 15 },
  { topic: "seasons",    textbook: "obento-supreme", unit: 4,  topicEn: "Seasons",       siteOrder: 16 },
  { topic: "shopping",   textbook: "obento-supreme", unit: 5,  topicEn: "Shopping",      siteOrder: 17 },
  { topic: "dining",     textbook: "obento-supreme", unit: 6,  topicEn: "Dining",        siteOrder: 18 },
  { topic: "appearance", textbook: "obento-supreme", unit: 7,  topicEn: "Appearance",    siteOrder: 19 },
  { topic: "homestay",   textbook: "obento-supreme", unit: 8,  topicEn: "Homestay",      siteOrder: 20 },
  { topic: "directions", textbook: "obento-supreme", unit: 9,  topicEn: "Directions",    siteOrder: 21 },
  { topic: "sports",     textbook: "obento-supreme", unit: 10, topicEn: "Sports",        siteOrder: 22 },
  { topic: "work",       textbook: "obento-supreme", unit: 11, topicEn: "Work",          siteOrder: 23 },
  { topic: "manga",      textbook: "obento-supreme", unit: 12, topicEn: "Manga",         siteOrder: 24 },
];

/** レッスンの slug（例：dates-1） */
export const lessonSlugFor = (topic: string, lessonNumber: number) => `${topic}-${lessonNumber}`;

/** edu_lessons.site_order の値（例：dates-1 → 710） */
export function siteOrderFor(topic: string, lessonNumber: number): number | null {
  const t = UNIT_TOPICS.find((u) => u.topic === topic);
  return t ? t.siteOrder * 100 + lessonNumber * 10 : null;
}
