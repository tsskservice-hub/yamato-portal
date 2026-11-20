/**
 * @file app/data/lesson-pages.ts
 * @description レッスンごとに違う部分（データベースに入っていないもの）
 *   ここに書いていないレッスンも、共通の部分（語彙・リーディング・ライティング・AI Yamato）は表示される。
 *   - speakingTitle … スピーキング課題の見出し（無ければレッスンの英語名から作る）
 *   - heroImage     … タイトル部分の右側（スマホではタイトルの下）に出す絵・写真。
 *                     書かなくても、public/images/lessons/<レッスンの slug>.webp（例：family-2.webp）があれば自動で出る
 *                     （説明文はレッスンの英語名から作る）。ここに書くのは、説明文を決めたい時・別のファイル名を使う時だけ
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
    heroImage: { src: "/images/lessons/family-1.webp", alt: "A family together" },
  },
  "countries-1": {
    speakingTitle: "Speaking Task: Where Are You From?",
    heroImage: { src: "/images/lessons/countries-1.webp", alt: "Kaminari-mon gate in Asakusa, Tokyo" },
  },
};
