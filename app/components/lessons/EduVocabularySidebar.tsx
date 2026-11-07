import React from "react";

interface EduVocabularySidebarProps {
  vocabulary: any[];
}

export const EduVocabularySidebar: React.FC<EduVocabularySidebarProps> = ({ vocabulary = [] }) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
      <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
        <span>📝</span>
        <span>Lesson Vocabulary ({vocabulary.length})</span>
      </h2>
      {vocabulary.length === 0 ? (
        <p className="text-xs text-slate-500 italic">No vocabulary items registered for this lesson.</p>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {vocabulary.map((vocab: any, vIdx: number) => (
            <div key={vocab.id || vIdx} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm">{vocab.jp_text}</span>
                <span className="text-slate-400 italic text-[11px]">{vocab.romaji}</span>
              </div>
              <span className="text-slate-600 dark:text-slate-400 font-medium text-right">{vocab.english_text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};