/**
 * @file app/components/lessons/EduVocabularySidebar.tsx
 * @description レッスン内の語彙リスト表示用サイドバーコンポーネント（文字サイズ・視認性改善版）
 */

import React from "react";

interface EduVocabularySidebarProps {
  vocabulary: any[];
}

export const EduVocabularySidebar: React.FC<EduVocabularySidebarProps> = ({ vocabulary = [] }) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
      <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
        <span>📝</span>
        <span>Lesson Vocabulary ({vocabulary.length})</span>
      </h2>
      {vocabulary.length === 0 ? (
        <p className="text-xs text-slate-500 italic">No vocabulary items registered for this lesson.</p>
      ) : (
        <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
          {vocabulary.map((vocab: any, vIdx: number) => (
            <div key={vocab.id || vIdx} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <div>
                {/* 日本語テキストの文字サイズを大きく変更 (text-base / sm:text-lg) */}
                <span className="font-bold text-slate-900 dark:text-slate-100 block text-base sm:text-lg">
                  {vocab.jp_text}
                </span>
                {/* ローマ字の文字色を濃く変更 (text-slate-600 dark:text-slate-300 にし、サイズも少しアップ) */}
                <span className="text-slate-600 dark:text-slate-300 font-medium italic text-xs block mt-0.5">
                  {vocab.romaji}
                </span>
              </div>
              {/* 英語テキストの文字サイズも大きく変更 (text-sm / sm:text-base) */}
              <span className="text-slate-700 dark:text-slate-300 font-semibold text-right text-sm sm:text-base">
                {vocab.english_text}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};