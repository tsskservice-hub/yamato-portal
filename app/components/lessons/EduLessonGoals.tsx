/**
 * @file app/components/lessons/EduLessonGoals.tsx
 * @description 学習意図（Learning Intention）と成功基準（Success Criteria）の専用セクション（全レッスン共通）
 *   レッスンの見出しのすぐ下に置き、「何を学ぶか」「何ができればよいか」をひと目でわかるようにする。
 *   - Learning Intention：1文（edu_lessons.learning_intention）
 *   - Success Criteria：「I can ...」のリスト（edu_lessons.success_criteria。配列でも文字列でもよい）
 */

import React from "react";

interface EduLessonGoalsProps {
  lesson: any;
}

/** success_criteria を1項目ずつの配列にする（配列 / 改行区切り / 1文） */
function toCriteriaList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === "string") return value.split(/\r?\n/).map((v) => v.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);
  return [];
}

export const EduLessonGoals: React.FC<EduLessonGoalsProps> = ({ lesson }) => {
  const intention: string = typeof lesson?.learning_intention === "string" ? lesson.learning_intention.trim() : "";
  const criteria = toCriteriaList(lesson?.success_criteria);
  if (!intention && criteria.length === 0) return null;

  return (
    <section aria-labelledby="lesson-goals-heading" className="space-y-3">
      <h2 id="lesson-goals-heading" className="sr-only">
        Lesson goals
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 sm:gap-6">
        {/* 学習意図：何を学ぶか */}
        {intention && (
          <div
            className={`relative overflow-hidden rounded-3xl border-2 border-sky-200 dark:border-sky-800 bg-gradient-to-br from-sky-50 to-white dark:from-sky-950/60 dark:to-slate-900 p-6 sm:p-7 shadow-sm ${
              criteria.length > 0 ? "md:col-span-2" : "md:col-span-5"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-500 text-2xl shadow-md" aria-hidden="true">
                🎯
              </span>
              <div>
                <p className="text-lg sm:text-xl font-black text-sky-900 dark:text-sky-100 leading-tight">Learning Intention</p>
                <p className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">What I am learning</p>
              </div>
            </div>
            <p className="mt-5 text-base sm:text-lg font-semibold leading-relaxed text-slate-800 dark:text-slate-100">
              {intention}
            </p>
          </div>
        )}

        {/* 成功基準：何ができればよいか */}
        {criteria.length > 0 && (
          <div
            className={`relative overflow-hidden rounded-3xl border-2 border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/60 dark:to-slate-900 p-6 sm:p-7 shadow-sm ${
              intention ? "md:col-span-3" : "md:col-span-5"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-2xl shadow-md" aria-hidden="true">
                ✅
              </span>
              <div>
                <p className="text-lg sm:text-xl font-black text-emerald-900 dark:text-emerald-100 leading-tight">Success Criteria</p>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  By the end of this lesson…
                </p>
              </div>
            </div>
            <ul className="mt-5 space-y-2.5">
              {criteria.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 rounded-2xl border border-emerald-100 dark:border-emerald-900/60 bg-white/80 dark:bg-slate-900/60 px-4 py-3"
                >
                  <span
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900 text-sm font-black text-emerald-700 dark:text-emerald-300"
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  <span className="text-base font-semibold leading-relaxed text-slate-800 dark:text-slate-100">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <p className="text-center text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
        💪 Complete the six tasks below to show you can do all of these!
      </p>
    </section>
  );
};

export default EduLessonGoals;
