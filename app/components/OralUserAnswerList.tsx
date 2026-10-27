import React from "react";

export interface QuestionItem {
  id: string;
  category?: string;
  question: string;
  isCustom?: boolean;
}

export interface OralUserAnswerListProps {
  questions: QuestionItem[];
  answers: { [key: string]: string };
  onAnswerChange: (id: string, text: string) => void;
  onAnswerBlur: (id: string, text: string, isCustom?: boolean) => void;
  onDeleteCustom?: (id: string) => void;
  onStartPractice: () => void;
  orderMode?: "sequential" | "random";
  setOrderMode?: (mode: "sequential" | "random") => void;
  themeColor?: string;
  title?: string;
}

export const OralUserAnswerList: React.FC<OralUserAnswerListProps> = ({
  questions,
  answers,
  onAnswerChange,
  onAnswerBlur,
  onDeleteCustom,
  onStartPractice,
  orderMode = "sequential",
  setOrderMode,
  themeColor = "#eab308",
  title = "Review & Customize Your Answers",
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border rounded-3xl p-6 shadow-sm space-y-6 border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            1. {title} ({questions.length} Questions)
          </h3>
          <p className="text-xs text-slate-500">
            テキスト欄を編集してカーソルを外すと（onBlur）、解答が Supabase に自動保存されます。
          </p>
        </div>
      </div>

      <div className="space-y-4 max-h-[480px] overflow-y-auto pr-2">
        {questions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            該当する設問が見つかりませんでした。
          </div>
        ) : (
          questions.map((item, idx) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded border"
                    style={{
                      backgroundColor: `${themeColor}20`,
                      borderColor: `${themeColor}40`,
                      color: themeColor,
                    }}
                  >
                    {item.category || "General"}
                  </span>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Q{idx + 1}. {item.question}
                  </h4>
                </div>
                {item.isCustom && onDeleteCustom && (
                  <button
                    type="button"
                    onClick={() => onDeleteCustom(item.id)}
                    className="text-xs text-rose-500 hover:text-rose-700 font-bold cursor-pointer"
                  >
                    Delete
                  </button>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  ✍️ Your Answer (Auto-saves to Supabase on blur):
                </label>
                <textarea
                  rows={2}
                  value={answers[item.id] ?? ""}
                  onChange={(e) => onAnswerChange(item.id, e.target.value)}
                  onBlur={(e) => onAnswerBlur(item.id, e.target.value, item.isCustom)}
                  placeholder="自分の言葉で回答を入力してください..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:outline-none"
                />
              </div>
            </div>
          ))
        )}
      </div>

      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        {setOrderMode && (
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-slate-600">Order:</span>
            <label className="flex items-center gap-1 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="radio"
                name="orderMode"
                checked={orderMode === "sequential"}
                onChange={() => setOrderMode("sequential")}
              />
              Sequential
            </label>
            <label className="flex items-center gap-1 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="radio"
                name="orderMode"
                checked={orderMode === "random"}
                onChange={() => setOrderMode("random")}
              />
              Random
            </label>
          </div>
        )}

        <button
          type="button"
          onClick={onStartPractice}
          disabled={questions.length === 0}
          className="w-full sm:w-auto text-white font-black px-8 py-3.5 rounded-2xl shadow-lg transition cursor-pointer text-sm disabled:opacity-50 ml-auto"
          style={{ backgroundColor: themeColor }}
        >
          🚀 Speak to AI Yamato (画面中央で対話開始)
        </button>
      </div>
    </div>
  );
};

export default OralUserAnswerList;