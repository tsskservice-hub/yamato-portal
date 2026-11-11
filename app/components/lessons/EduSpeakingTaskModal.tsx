/**
 * @file app/components/lessons/EduSpeakingTaskModal.tsx
 * @description スピーキング課題を行うモーダル（カスタムフックによるロジックモジュール化版）
 */

import React, { useEffect } from "react";
import { useEduSpeakingDrill } from "~/hooks/useEduSpeakingDrill";

import { EduSpeakingHeader } from "./EduSpeakingHeader";
import { EduSpeakingPart1View } from "./EduSpeakingPart1View";
import { EduSpeakingPart2View } from "./EduSpeakingPart2View";
import { EduFinishedView } from "./EduFinishedView";

export interface EduSpeakingTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  userId: string;
  appType?: string;
  lessonSlug?: string;
  topic?: string;
  roundsPerDynamicQuestion?: number;
  askRoundsPerDynamicQuestion?: number;
  questions?: { question: string; english?: string }[];
  onCompleted?: () => void;
}

export const EduSpeakingTaskModal: React.FC<EduSpeakingTaskModalProps> = ({
  isOpen,
  onClose,
  title,
  description = "Practice speaking by listening to AI Yamato's questions and answering via microphone.",
  lessonSlug = "obento-unit-4-lesson-1",
  topic,
  roundsPerDynamicQuestion = 3,
  askRoundsPerDynamicQuestion = 3,
  questions,
  onCompleted,
}) => {
  const drill = useEduSpeakingDrill({
    isOpen,
    lessonSlug,
    questions,
    roundsPerDynamicQuestion,
    askRoundsPerDynamicQuestion,
    onCompleted,
  });

  // キーボードショートカット (Spacebar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || !drill.isStarted || drill.sessionFinished || drill.isAIPlaying || drill.result) return;
      if (e.code !== "Space") return;
      if (drill.currentRound?.mode === "ask" && drill.askStep === "typing") return;

      const activeElem = document.activeElement;
      if (activeElem?.tagName === "INPUT" || activeElem?.tagName === "TEXTAREA") return;

      e.preventDefault();
      if (e.repeat) return;

      if (drill.isListening) {
        drill.stopRecordingAndVerify();
      } else {
        drill.startRecording();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, drill]);

  // タイピングステップ時のフォーカス制御
  useEffect(() => {
    if (
      drill.isStarted &&
      drill.currentRound?.mode === "ask" &&
      drill.askStep === "typing" &&
      !drill.isAIPlaying &&
      !drill.result
    ) {
      drill.inputRef.current?.focus();
    }
  }, [drill.isStarted, drill.currentRound, drill.askStep, drill.isAIPlaying, drill.result, drill.inputRef]);

  // モーダル非表示時のクリーンアップ
  useEffect(() => {
    if (isOpen) return;
    drill.clearTimers();
    drill.stopAllMedia();
  }, [isOpen, drill]);

  if (!isOpen) return null;

  const isAskMode = drill.currentRound?.mode === "ask";
  const inTypingStep = isAskMode && drill.askStep === "typing";
  const canRecord = drill.isStarted && !drill.isAIPlaying && !drill.result && !inTypingStep;

  const handleClose = () => {
    drill.clearTimers();
    drill.stopAllMedia();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div
        className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full p-5 sm:p-8 shadow-2xl space-y-4 transition-all duration-300 ${
          drill.isFullscreen
            ? "max-w-full min-h-screen sm:min-h-[90vh] flex flex-col justify-between rounded-none sm:rounded-3xl"
            : "max-w-2xl"
        }`}
      >
        <EduSpeakingHeader
          title={title}
          description={description}
          topic={topic}
          isFullscreen={drill.isFullscreen}
          onToggleFullscreen={() => drill.setIsFullscreen(!drill.isFullscreen)}
          onClose={handleClose}
        />

        {drill.loadState === "loading" && (
          <div className="text-xs sm:text-sm font-bold text-slate-500 bg-white/80 px-4 py-3 rounded-xl border border-slate-100">
            Loading questions...
          </div>
        )}

        {drill.loadState === "error" && drill.totalItems === 0 && (
          <div className="text-xs sm:text-sm font-bold text-rose-600 bg-rose-50 px-4 py-3 rounded-xl border border-rose-200">
            Failed to load questions. Please close and try again.
          </div>
        )}

        {drill.loadState === "ready" && drill.totalItems === 0 && (
          <div className="text-xs sm:text-sm font-bold text-slate-500 bg-white/80 px-4 py-3 rounded-xl border border-slate-100">
            No speaking questions are registered for this lesson yet.
          </div>
        )}

        {drill.isStarted && drill.currentRound && !drill.sessionFinished && (
          <div className="p-4 bg-white dark:bg-slate-800/40 rounded-2xl border border-indigo-100 dark:border-slate-800 shadow-inner space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                <span>
                  Question {drill.currentIndex + 1} ·{" "}
                  {isAskMode ? "Part 2: Ask & Listen" : "Part 1: Listen & Answer"}
                </span>
                <span className="text-indigo-600 dark:text-indigo-400">
                  {drill.score} / {drill.requiredCount} Correct
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
                  style={{
                    width: `${drill.requiredCount > 0 ? (Number(drill.score) / Number(drill.requiredCount)) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            {/* Part 1 View */}
            {!isAskMode && (
              <EduSpeakingPart1View
                promptText={drill.currentRound.dialogue.prompt_text}
                promptEn={drill.currentRound.dialogue.prompt_en}
                cue={drill.currentRound.cue}
                cueHint={drill.currentRound.cueHint}
                isAIPlaying={drill.isAIPlaying}
                isListening={drill.isListening}
                result={drill.result}
                canRecord={canRecord}
                spokenText={drill.spokenText}
                onReplay={drill.replayQuestion}
                onStartRecording={drill.startRecording}
                onStopRecording={drill.stopRecordingAndVerify}
              />
            )}

            {/* Part 2 View */}
            {isAskMode && (
              <EduSpeakingPart2View
                promptText={drill.currentRound.dialogue.prompt_text}
                promptEn={drill.currentRound.dialogue.prompt_en}
                askStep={drill.askStep}
                isAIPlaying={drill.isAIPlaying}
                isListening={drill.isListening}
                result={drill.result}
                canRecord={canRecord}
                spokenText={drill.spokenText}
                typedAnswer={drill.typedAnswer}
                inputRef={drill.inputRef}
                onStartRecording={drill.startRecording}
                onStopRecording={drill.stopRecordingAndVerify}
                onReplyAgain={drill.replyAgain}
                onTypedAnswerChange={drill.setTypedAnswer}
                onSubmitTypedAnswer={drill.submitTypedAnswer}
              />
            )}

            {drill.result === "correct" && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-center space-y-0.5">
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">✨ Correct!</p>
                {drill.shownModel && (
                  <>
                    <p className="text-base font-black text-emerald-900 dark:text-emerald-200">{drill.shownModel.text}</p>
                    {drill.shownModel.reading && (
                      <p className="text-xs text-emerald-700 dark:text-emerald-400">{drill.shownModel.reading}</p>
                    )}
                    {drill.shownModel.en && (
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 italic">({drill.shownModel.en})</p>
                    )}
                  </>
                )}
              </div>
            )}

            {drill.result === "revealed" && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-center space-y-1">
                <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
                  {isAskMode ? "AI Yamato said:" : "Answer:"}
                </p>
                {drill.shownModel && (
                  <>
                    <p className="text-base font-black text-amber-900 dark:text-amber-200">{drill.shownModel.text}</p>
                    {drill.shownModel.reading && (
                      <p className="text-xs text-amber-700 dark:text-amber-400">{drill.shownModel.reading}</p>
                    )}
                    {drill.shownModel.en && (
                      <p className="text-xs text-amber-700 dark:text-amber-400 italic">({drill.shownModel.en})</p>
                    )}
                  </>
                )}
                <button
                  type="button"
                  onClick={drill.goNext}
                  className="mt-2 py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md transition active:scale-95 cursor-pointer"
                >
                  Next Question ➔
                </button>
              </div>
            )}

            {!drill.result && drill.attempts > 0 && (
              <p className="text-center text-xs font-bold text-rose-600">
                Attempt {drill.attempts} / {3}
              </p>
            )}
          </div>
        )}

        {!drill.sessionFinished && (
          <div className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 bg-white/80 dark:bg-slate-800/60 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
            📢 {drill.statusMessage || "Ready to start speaking practice."}
          </div>
        )}

        {!drill.sessionFinished && (
          <div className="flex items-center gap-3">
            {!drill.isStarted ? (
              <button
                type="button"
                onClick={drill.startSession}
                disabled={drill.loadState === "loading" || drill.totalItems === 0}
                className="py-3 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md transition transform active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <span>🎙️</span>
                <span>Start Voice Speaking Practice</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={drill.stopSession}
                className="py-3 px-6 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md transition transform active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <span>⏹️</span>
                <span>End Session</span>
              </button>
            )}
          </div>
        )}

        {drill.sessionFinished && (
          <EduFinishedView
            taskName="speaking practice rounds"
            onClose={handleClose}
          />
        )}
      </div>
    </div>
  );
};

export default EduSpeakingTaskModal;