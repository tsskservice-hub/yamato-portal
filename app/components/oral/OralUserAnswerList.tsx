import { safeHtml } from '~/utils/safeHtml';
import React from "react";
import QuestionAudioButton from "./QuestionAudioButton";
import KanjiReadingsLine from "./KanjiReadingsLine";
import type { ReadingDict } from "~/utils/kanji-readings";

export interface QuestionItem {
  id: string;
  category?: string;
  question: string;
  isCustom?: boolean;
  /** 練習を始めるのに必要な答えの最低文字数（あれば、入力欄の下に「今の文字数 / 必要な文字数」を出す） */
  minLength?: number;
  /** 質問の音声ファイル（あれば、質問の前に 🔊 ボタンを出す） */
  audio?: string;
  /** 見本の答え（ふりがな付き HTML）。読みを出すときに、この読みを優先する */
  defaultAnswerHtml?: string;
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
  /** 🔊 で質問を聞くときの速さ */
  speechSpeed?: number;
  /** VCE 以外の漢字の読み（あれば、答えの欄の下に読みを出す） */
  readingDict?: ReadingDict;
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
  speechSpeed = 1,
  readingDict,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border rounded-3xl p-6 shadow-sm space-y-6 border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            {title} ({questions.length} Questions)
          </h3>
          <p className="text-xs text-slate-500">
            Auto-saves your answers when you click outside the text box.
          </p>
        </div>
      </div>

      <div className="space-y-4 max-h-[520px] overflow-y-auto pr-2">
        {questions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No questions found for the selected filter.
          </div>
        ) : (
          questions.map((item, idx) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider"
                    style={{
                      backgroundColor: `${themeColor}20`,
                      borderColor: `${themeColor}40`,
                      color: themeColor,
                    }}
                  >
                    {item.category || "General"}
                  </span>
                  {/* 💡 問題文のフォントサイズを text-sm から text-base sm:text-lg へ拡大 */}
                  <h4 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 flex items-start gap-1.5 leading-snug">
                    {item.audio && (
                      <QuestionAudioButton src={item.audio} playbackRate={speechSpeed} themeColor={themeColor} />
                    )}
                    <span className="shrink-0">Q{idx + 1}. </span>
                    <span dangerouslySetInnerHTML={{ __html: safeHtml(item.question) }} />
                  </h4>
                </div>
                {item.isCustom && onDeleteCustom && (
                  <button
                    type="button"
                    onClick={() => onDeleteCustom(item.id)}
                    className="text-xs text-rose-500 hover:text-rose-700 font-bold cursor-pointer shrink-0"
                  >
                    Delete
                  </button>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">
                  ✍️ Your Answer (Saves automatically when you click away):
                </label>
                {/* 💡 解答欄・サンプル解答のテキストサイズを text-xs から text-sm sm:text-base へ拡大 */}
                <textarea
                  rows={2}
                  value={answers[item.id] ?? ""}
                  onChange={(e) => onAnswerChange(item.id, e.target.value)}
                  onBlur={(e) => onAnswerBlur(item.id, e.target.value, item.isCustom)}
                  placeholder="Enter your response in Japanese..."
                  className="w-full text-sm sm:text-base p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:outline-none leading-relaxed"
                />
                {readingDict && <KanjiReadingsLine text={answers[item.id] ?? ""} dict={readingDict} contextHtml={item.defaultAnswerHtml} />}
                {item.minLength ? (() => {
                  const count = (answers[item.id] ?? "").trim().length;
                  const ok = count >= item.minLength;
                  return (
                    <p className={`text-[11px] font-bold ${ok ? "text-emerald-600" : "text-rose-600"}`}>
                      {ok ? "✓" : "✗"} {count} / {item.minLength}+ characters
                    </p>
                  );
                })() : null}
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
          🚀 Speak to AI Yamato (Start Practice)
        </button>
      </div>
    </div>
  );
};

export default OralUserAnswerList;
