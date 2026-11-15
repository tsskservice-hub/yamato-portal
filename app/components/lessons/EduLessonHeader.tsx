/**
 * @file app/components/lessons/EduLessonHeader.tsx
 * @description レッスンヘッダーコンポーネント（全レッスン共通：白い背景・オレンジの枠線）
 *   学習意図・成功基準は、この下の専用セクション EduLessonGoals に表示する。
 *   レッスンの絵・写真（app/data/lesson-pages.ts の heroImage）があれば、横長の画面では右側に、スマホではタイトルの下に出す
 */

import React from "react";
import { formatTextbookRef, TEXTBOOK_DISCLAIMER, type TextbookRef } from "~/lib/lessonTextbooks";
import type { LessonHeroImage } from "~/data/lesson-pages";

interface EduLessonHeaderProps {
  lesson: any;
  topic: any;
  /** このレッスンが対応する教科書・ユニット（edu_lesson_textbook_units） */
  textbookRefs?: TextbookRef[];
  /** タイトルの横に出す絵・写真（無ければ出さない） */
  heroImage?: LessonHeroImage | null;
}

export const EduLessonHeader: React.FC<EduLessonHeaderProps> = ({ lesson, topic, textbookRefs = [], heroImage = null }) => {
  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-orange-400 dark:border-orange-500/70 rounded-3xl p-6 sm:p-8 md:p-10 shadow-sm font-sans">
      <div className={heroImage ? "flex flex-col md:flex-row md:items-center gap-6 md:gap-8" : ""}>
        <div className="space-y-4 min-w-0 flex-1">
          {/* トピック・レッスン番号のバッジ */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold uppercase tracking-wider bg-orange-500 text-white w-fit px-4 py-1.5 rounded-full shadow-xs">
            {topic?.title_en && (
              <>
                <span>{topic.title_en}</span>
                <span>•</span>
              </>
            )}
            <span>Lesson {lesson?.lesson_order || 1}</span>
          </div>

          {/* 対応する教科書・ユニット */}
          {textbookRefs.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {textbookRefs.map((ref, i) => (
                <span
                  key={i}
                  className="text-[11px] sm:text-xs font-bold text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-900 px-3 py-1 rounded-full"
                >
                  📚 {formatTextbookRef(ref)}
                </span>
              ))}
              <p className="basis-full text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500">{TEXTBOOK_DISCLAIMER}</p>
            </div>
          )}

          {/* 日本語タイトル（大きく表示） */}
          {lesson?.title_jp && (
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-slate-50 tracking-tight break-words">
              {lesson.title_jp}
            </h1>
          )}

          {/* 英語タイトル */}
          <p className="text-sm sm:text-base font-bold text-orange-600 dark:text-orange-400">
            {lesson?.title_en || "Lesson"}
          </p>
        </div>

        {/* レッスンの絵・写真（横長の画面では右側） */}
        {heroImage && (
          <figure className="w-full md:w-72 lg:w-80 shrink-0">
            <img
              src={heroImage.src}
              alt={heroImage.alt}
              loading="eager"
              className="w-full aspect-[4/3] object-cover rounded-2xl border border-orange-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />
            {heroImage.credit && (
              <figcaption className="mt-1.5 text-[10px] text-slate-400 dark:text-slate-500 text-right">{heroImage.credit}</figcaption>
            )}
          </figure>
        )}
      </div>
    </div>
  );
};

export default EduLessonHeader;
