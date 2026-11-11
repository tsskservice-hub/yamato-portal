/**
 * @file app/components/lessons/EduSpeakingPart2View.tsx
 */

import React from "react";

interface EduSpeakingPart2ViewProps {
  promptText: string;
  promptEn?: string | null;
  askStep: "question" | "typing";
  isAIPlaying: boolean;
  isListening: boolean;
  result: "correct" | "revealed" | null;
  canRecord: boolean;
  spokenText: string;
  typedAnswer: string;
  /** React 19 / TypeScript の型厳密化に対応した ref の型指定 */
  inputRef: React.RefObject<HTMLInputElement>;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onReplyAgain: () => void;
  onTypedAnswerChange: (val: string) => void;
  onSubmitTypedAnswer: () => void;
}

export const EduSpeakingPart2View: React.FC<EduSpeakingPart2ViewProps> = ({
  promptText,
  promptEn,
  askStep,
  isAIPlaying,
  isListening,
  result,
  canRecord,
  spokenText,
  typedAnswer,
  inputRef,
  onStartRecording,
  onStopRecording,
  onReplyAgain,
  onTypedAnswerChange,
  onSubmitTypedAnswer,
}) => {
  const inTypingStep = askStep === "typing";

  return (
    <div className="space-y-4">
      {/* 質問文バナー */}
      <div className="p-4 bg-sky-50 dark:bg-sky-950/30 rounded-xl border-2 border-sky-300 dark:border-sky-700 text-center space-y-1">
        <span className="text-xs font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider block">
          {inTypingStep ? "You asked:" : "Now YOU ask AI Yamato"}
        </span>
        <span className="text-2xl sm:text-3xl font-black text-sky-900 dark:text-sky-200">
          {promptText}
        </span>
        {promptEn && (
          <span className="text-xs text-sky-700 dark:text-sky-400 italic block">
            ({promptEn})
          </span>
        )}
      </div>

      {/* 質問ステップ時の音声録音コントロール */}
      {!inTypingStep && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onStartRecording}
              disabled={!canRecord || isListening}
              className={`py-4 px-4 rounded-2xl font-black text-sm text-white shadow-md transition flex items-center justify-center gap-2 ${
                !canRecord
                  ? "bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
                  : isListening
                  ? "bg-amber-500 animate-pulse"
                  : "bg-emerald-600 hover:bg-emerald-700 active:scale-95 cursor-pointer"
              }`}
            >
              <span>🎙️</span>
              <span>{isListening ? "Recording... (Space to Stop)" : "Start Recording (Space)"}</span>
            </button>

            <button
              type="button"
              onClick={onStopRecording}
              disabled={!canRecord || !isListening}
              className={`py-4 px-4 rounded-2xl font-black text-sm text-white shadow-md transition flex items-center justify-center gap-2 ${
                !canRecord || !isListening
                  ? "bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
                  : "bg-rose-600 hover:bg-rose-700 active:scale-95 cursor-pointer"
              }`}
            >
              <span>⏹️</span>
              <span>Stop & Verify</span>
            </button>
          </div>

          <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-center min-h-[70px] flex flex-col justify-center">
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-bold mb-1">
              Your Spoken Question (あなたの質問):
            </span>
            <span
              className={`text-base sm:text-lg font-black ${
                spokenText ? "text-slate-900 dark:text-slate-100" : "text-slate-400 italic"
              }`}
            >
              {spokenText ? `"${spokenText}"` : "(Press Spacebar and ask the question)"}
            </span>
          </div>
        </>
      )}

      {/* タイピングステップ時：AIの答えを聞いて人数を入力 */}
      {inTypingStep && (
        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              AI Yamato's answer
            </span>
            <button
              type="button"
              onClick={onReplyAgain}
              disabled={isAIPlaying || !!result}
              className="text-xs bg-slate-200 dark:bg-slate-700 hover:bg-indigo-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>🔊</span> Listen Again
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            How many people are in AI Yamato's family? Type the number.
          </p>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              value={typedAnswer}
              onChange={(e) => onTypedAnswerChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onSubmitTypedAnswer();
                }
              }}
              disabled={isAIPlaying || !!result}
              placeholder="e.g. 3"
              className="flex-1 px-4 py-3 text-2xl font-black text-center rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={onSubmitTypedAnswer}
              disabled={isAIPlaying || !!result || typedAnswer.trim() === ""}
              className="py-3 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-md transition active:scale-95 cursor-pointer"
            >
              Submit
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EduSpeakingPart2View;