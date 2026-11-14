/**
 * @file app/data/lesson-pages.ts
 * @description レッスンごとに違う部分（データベースに入っていないもの）
 *   ここに書いていないレッスンも、共通の部分（語彙・リーディング・ライティング・AI Yamato）は表示される。
 *   - listening    … リスニング課題の種類（今は Family 1 の「何人家族ですか」だけ）
 *   - speakingTitle … スピーキング課題の見出し（無ければレッスンの英語名から作る）
 *   文化タスクは app/data/culture-tasks.ts の lessons、スピーキングの会話は edu_lesson_dialogues で決まる。
 */

export type ListeningTaskKind = "family-count";

export interface LessonPageExtras {
  listening?: ListeningTaskKind;
  speakingTitle?: string;
}

export const LESSON_PAGE_EXTRAS: Record<string, LessonPageExtras> = {
  "family-1": {
    listening: "family-count",
    speakingTitle: "Speaking Task: Practice Talking About Your Family Members",
  },
};
