/**
 * @file app/data/lesson-pages.ts
 * @description レッスンごとに違う部分（データベースに入っていないもの）
 *   ここに書いていないレッスンも、共通の部分（語彙・リーディング・ライティング・AI Yamato）は表示される。
 *   - speakingTitle … スピーキング課題の見出し（無ければレッスンの英語名から作る）
 *   リスニングは app/data/listening-tasks.ts、文化タスクは app/data/culture-tasks.ts の lessons、
 *   スピーキングの会話は edu_lesson_dialogues（＋ kl_dialogues）で決まる。
 */

export interface LessonPageExtras {
  speakingTitle?: string;
}

export const LESSON_PAGE_EXTRAS: Record<string, LessonPageExtras> = {
  "family-1": {
    speakingTitle: "Speaking Task: Practice Talking About Your Family Members",
  },
  "countries-1": {
    speakingTitle: "Speaking Task: Where Are You From?",
  },
};
