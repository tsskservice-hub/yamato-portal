/**
 * @file app/data/lesson-pages.ts
 * @description レッスンごとに違う部分（データベースに入っていないもの）
 *   ここに書いていないレッスンも、共通の部分（語彙・リーディング・ライティング・AI Yamato）は表示される。
 *   - speakingTitle … スピーキング課題の見出し（無ければレッスンの英語名から作る）
 *   - heroImage     … タイトル部分の右側（スマホではタイトルの下）に出す絵・写真。
 *                     ファイルは public/images/lessons/ に置き、src は "/images/lessons/ファイル名" と書く
 *   リスニングは app/data/listening-tasks.ts、文化タスクは app/data/culture-tasks.ts の lessons、
 *   スピーキングの会話は edu_lesson_dialogues（＋ kl_dialogues）で決まる。
 */

export interface LessonHeroImage {
  /** 例："/images/lessons/family-1.webp" */
  src: string;
  /** 画像の説明（英語。画面の読み上げソフトで使われる） */
  alt: string;
  /** 写真の出典など（必要な時だけ） */
  credit?: string;
}

export interface LessonPageExtras {
  speakingTitle?: string;
  heroImage?: LessonHeroImage;
}

export const LESSON_PAGE_EXTRAS: Record<string, LessonPageExtras> = {
  "family-1": {
    speakingTitle: "Speaking Task: Practice Talking About Your Family Members",
  },
  "countries-1": {
    speakingTitle: "Speaking Task: Where Are You From?",
  },
};
