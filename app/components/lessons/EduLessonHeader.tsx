/**
 * @file app/components/lessons/EduLessonHeader.tsx
 * @description レッスンヘッダーコンポーネント（タイトルサイズ調整・ふりがな対応・絵文字付き版）
 */

import React from "react";

interface EduLessonHeaderProps {
  lesson: any;
  topic: any;
}

export const EduLessonHeader: React.FC<EduLessonHeaderProps> = ({ lesson, topic }) => {
  return (
    <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-3xl p-8 sm:p-10 shadow-xl font-sans space-y-4">
      {/* パンくず・ユニット情報バッジ */}
      <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold uppercase tracking-wider bg-white/25 w-fit px-4 py-1.5 rounded-full shadow-xs">
        <span>Obento Deluxe</span>
        <span>•</span>
        <span>Unit 4</span>
        <span>•</span>
        <span>Lesson {lesson?.lesson_order || 1}</span>
      </div>

      {/* 日本語タイトル（大きく表示・ふりがな対応） */}
      {lesson?.title_jp && (
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight drop-shadow-sm">
          {lesson.title_jp}
        </h1>
      )}

      {/* 英語タイトル（小さくすっきりと表示） */}
      <p className="text-sm sm:text-base font-bold text-orange-100 opacity-90">
        {lesson?.title_en || "Obento Unit 4: Lesson"}
      </p>

      {/* 学習意図 & サクセス・クライテリア（成功基準） */}
      <div className="pt-2 border-t border-white/20 space-y-2 max-w-3xl">
        {lesson?.learning_intention && (
          <p className="text-orange-50 text-sm sm:text-base leading-relaxed">
            <strong className="font-extrabold text-white">🎯 Learning Intention: </strong>
            {lesson.learning_intention}
          </p>
        )}

        {lesson?.success_criteria && (
          <p className="text-orange-50 text-sm sm:text-base leading-relaxed">
            <strong className="font-extrabold text-white">✨ Success Criteria: </strong>
            {Array.isArray(lesson.success_criteria)
              ? lesson.success_criteria.join(", ")
              : lesson.success_criteria}
          </p>
        )}
      </div>
    </div>
  );
};

export default EduLessonHeader;