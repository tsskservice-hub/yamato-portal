/**
 * @file app/components/lessons/EduSpeakingPart1View.tsx
 */

import React from "react";

interface EduSpeakingPart1ViewProps {
  promptText: string;
  promptEn?: string | null;
  cue?: string | null;
  cueHint?: string | null;
  isAIPlaying: boolean;
  isListening: boolean;
  result: "correct" | "revealed" | null;
  canRecord: boolean;
  spokenText: string;
  onReplay: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

export const EduSpeakingPart1View: React.FC<EduSpeakingPart1ViewProps> = ({
  promptText,
  promptEn,
  cue,
  cueHint,
  isAIPlaying,
  isListening,
  result,
  canRecord,
  spokenText,
  onReplay,
  onStartRecording,
  onStopRecording,
}) => {
  return (
    <div className="space-y-4">
      {/* AIの質問 */}
      <div className="p-4 bg-indigo-50/50 dark:bg-slate-800 rounded-xl border border-indigo-100 dark:border-slate-700 text-center space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">
            AI Question
          </span>
          <button
            type="button"
            onClick={onReplay}
            disabled={isAIPlaying || isListening || !!result}
            className="text-xs bg-slate-200 dark:bg-slate-700 hover:bg-indigo-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>🔊</span> Listen Again
          </button>
        </div>
        <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
          {promptText}
        </p>
        {promptEn && (
          <p className="text-xs text-slate-500 dark:text-slate-400 italic">({promptEn})</p>
        )}
      </div>

      {/* 提示される「数」 */}
      {cue && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl border-2 border-amber-300 dark:border-amber-700 text-center space-y-1">
          <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">
            Answer with this number
          </span>
          <span className="text-5xl font-black text-amber-900 dark:text-amber-200">
            {cue}
          </span>
          {cueHint && (
            <span className="text-xs text-amber-700 dark:text-amber-400 italic block">
              ({cueHint})
            </span>
          )}
        </div>
      )}

      {/* 録音コントロールボタン */}
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
          <span>
            {isListening ? "Recording... (Space to Stop)" : "Start Recording (Space)"}
          </span>
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

      {/* 認識された音声 */}
      <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-center min-h-[70px] flex flex-col justify-center">
        <span className="text-xs text-slate-500 dark:text-slate-400 block font-bold mb-1">
          Your Spoken Text (認識されたあなたの発音):
        </span>
        <span
          className={`text-base sm:text-lg font-black ${
            spokenText ? "text-slate-900 dark:text-slate-100" : "text-slate-400 italic"
          }`}
        >
          {spokenText ? `"${spokenText}"` : "(Press Spacebar or click 'Start Recording' and speak)"}
        </span>
      </div>
    </div>
  );
};