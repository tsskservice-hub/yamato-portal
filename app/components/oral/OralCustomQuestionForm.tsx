import React from "react";

export interface OralCustomQuestionFormProps {
  newQuestionText: string;
  setNewQuestionText: (val: string) => void;
  newAnswerText: string;
  setNewAnswerText: (val: string) => void;
  newCategory: string;
  setNewCategory: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  themeColor?: string;
}

export const OralCustomQuestionForm: React.FC<OralCustomQuestionFormProps> = ({
  newQuestionText,
  setNewQuestionText,
  newAnswerText,
  setNewAnswerText,
  newCategory,
  setNewCategory,
  onSubmit,
  themeColor = "#eab308",
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
        <span>➕</span>
        <span>Add Custom Question & Answer</span>
      </h3>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-500 mb-1">Question Text</label>
            <input
              type="text"
              value={newQuestionText}
              onChange={(e) => setNewQuestionText(e.target.value)}
              placeholder="例：家族とよく何をしますか？"
              className="w-full p-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Topic / Category</label>
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="例：Family"
              className="w-full p-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">Sample Answer</label>
          <textarea
            rows={2}
            value={newAnswerText}
            onChange={(e) => setNewAnswerText(e.target.value)}
            placeholder="例：私はよく家族と買い物をします。"
            className="w-full p-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-md transition cursor-pointer"
            style={{ backgroundColor: themeColor }}
          >
            + Add Question to Custom Bank
          </button>
        </div>
      </form>
    </div>
  );
};

export default OralCustomQuestionForm;