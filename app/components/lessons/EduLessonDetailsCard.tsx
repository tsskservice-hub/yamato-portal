import React from "react";
import { EduFlexibleDataRenderer } from "./EduFlexibleDataRenderer";

interface EduLessonDetailsCardProps {
  lesson: any;
}

export const EduLessonDetailsCard: React.FC<EduLessonDetailsCardProps> = ({ lesson }) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
        <span>📖</span>
        <span>Lesson Details & Objectives</span>
      </h2>

      {!lesson ? (
        <p className="text-sm text-slate-500 italic">No lesson data found in database.</p>
      ) : (
        <div className="space-y-4">
          {/* 教科書参照ページ */}
          {lesson.obento_page_ref && (
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Textbook Reference:</span>
              <span className="text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/50 px-3 py-1 rounded-full border border-orange-200 dark:border-orange-900">
                📚 {lesson.obento_page_ref}
              </span>
            </div>
          )}

          {/* 学習意図（Learning Intention） */}
          {lesson.learning_intention && (
            <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
              <strong className="text-slate-800 dark:text-slate-100 block font-bold">🎯 Learning Intention:</strong>
              <p>{lesson.learning_intention}</p>
            </div>
          )}

          {/* 成功基準（Success Criteria） */}
          {lesson.success_criteria && (
            <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
              <strong className="text-slate-800 dark:text-slate-100 block font-bold">✨ Success Criteria:</strong>
              <p>{Array.isArray(lesson.success_criteria) ? lesson.success_criteria.join(", ") : lesson.success_criteria}</p>
            </div>
          )}

          {/* ターゲット文法・キー表現 */}
          {(lesson.target_grammar || lesson.key_expressions) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {lesson.target_grammar && (
                <div className="bg-orange-50/60 dark:bg-orange-950/20 p-3.5 rounded-2xl border border-orange-100 dark:border-orange-900/40 text-orange-900 dark:text-orange-300 text-xs space-y-1.5">
                  <strong className="block font-bold mb-1">🛠️ Target Grammar:</strong>
                  <EduFlexibleDataRenderer data={lesson.target_grammar} />
                </div>
              )}
              {lesson.key_expressions && (
                <div className="bg-amber-50/60 dark:bg-amber-950/20 p-3.5 rounded-2xl border border-amber-100 dark:border-amber-900/40 text-amber-900 dark:text-amber-300 text-xs space-y-1.5">
                  <strong className="block font-bold mb-1">💬 Key Expressions:</strong>
                  <EduFlexibleDataRenderer data={lesson.key_expressions} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};