/**
 * @file app/components/lessons/EduSpeakingTaskModal.tsx
 * @description スピーキング課題を行うモーダル（propsをtitleのみに絞り込んだカスタム版）
 */

import React, { useEffect, useRef } from "react";
import { useEduSpeakingDrill } from "~/hooks/useEduSpeakingDrill";
import { useSoundEffect } from "~/hooks/useSoundEffect"; // ← 効果音用フックのインポート

import { EduSpeakingHeader } from "./EduSpeakingHeader";
import { EduSpeakingPart1View } from "./EduSpeakingPart1View";
import { EduSpeakingPart2View } from "./EduSpeakingPart2View";
import { EduFinishedView } from "./EduFinishedView";

export interface EduSpeakingTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  userId: string;
  appType?: string;
  lessonSlug?: string;
  roundsPerDynamicQuestion?: number;
  askRoundsPerDynamicQuestion?: number;
  questions?: { question: string; english?: string }[];
  onCompleted?: () => void;
}

export const EduSpeakingTaskModal: React.FC<EduSpeakingTaskModalProps> = ({
  isOpen,
  onClose,
  title,
  userId,
  lessonSlug = "obento-unit-4-lesson-1",
  roundsPerDynamicQuestion = 3,
  askRoundsPerDynamicQuestion = 3,
  questions,
  onCompleted,
}) => {
  // 内部的なデフォルトの説明文
  const description = "Practice speaking by listening to AI questions and answering via microphone.";

  const drill = useEduSpeakingDrill({
    isOpen,
    lessonSlug,
    questions,
    roundsPerDynamicQuestion,
    askRoundsPerDynamicQuestion,
    onCompleted,
  });

  // 効果音フックの呼び出し（playSound: 正解音 / playCompleteSound: タスク完了音）
  const { playSound, playCompleteSound } = useSoundEffect();
  const prevResultRef = useRef(drill.result);

  // 正解した瞬間（"correct" に切り替わったとき）に一度だけ効果音を鳴らす
  useEffect(() => {
    if (drill.result === "correct" && prevResultRef.current !== "correct") {
      playSound();
    }
    prevResultRef.current = drill.result;
  }, [drill.result, playSound]);

  // セッションが完了した瞬間（false → true に切り替わったとき）に一度だけ完了音を鳴らす
  const prevFinishedRef = useRef(drill.sessionFinished);

  useEffect(() => {
    if (drill.sessionFinished && !prevFinishedRef.current) {
      playCompleteSound();
    }
    prevFinishedRef.current = drill.sessionFinished;
  }, [drill.sessionFinished, playCompleteSound]);

  // キーボードのイベントから常に最新の状態を読むための参照
  const drillRef = useRef(drill);
  drillRef.current = drill;

  // キーボードショートカット（Space: 録音の開始/停止、R: 録音のやり直し）
  useEffect(() => {
    if (!isOpen) return;

    const isTextField = (el: Element | null) =>
      el?.tagName === "INPUT" || el?.tagName === "TEXTAREA";

    const handleKeyDown = (e: KeyboardEvent) => {
      const d = drillRef.current;

      if (e.code === "Space") {
        if (isTextField(document.activeElement)) return;

        e.preventDefault();
        const active = document.activeElement;
        if (active instanceof HTMLElement && active.tagName === "BUTTON") active.blur();
        if (e.repeat) return;

        const inTypingStep = d.currentRound?.mode === "ask" && d.askStep === "typing";
        if (!d.isStarted || d.sessionFinished || d.isAIPlaying || d.result || inTypingStep) return;

        if (d.isListening) {
          d.stopRecordingAndVerify();
        } else {
          d.startRecording();
        }
        return;
      }

      if (e.code === "KeyR" && d.isListening && !isTextField(document.activeElement)) {
        e.preventDefault();
        if (!e.repeat) d.restartRecording();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      if (isTextField(document.activeElement)) return;
      e.preventDefault();
    };

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyUp, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyUp, true);
    };
  }, [isOpen]);

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
    drillRef.current.clearTimers();
    drillRef.current.stopAllMedia();
  }, [isOpen]);

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

            {drill.isListening && (
              <button
                type="button"
                onClick={drill.restartRecording}
                className="w-full py-3 px-4 rounded-2xl border-2 border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 font-bold text-xs sm:text-sm transition hover:bg-amber-100 dark:hover:bg-amber-950/50 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>🔄</span>
                <span>Restart Recording (R) — the text is wrong, start over</span>
              </button>
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
                  {isAskMode ? "AI said:" : "Answer:"}
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
                key="start-session"
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
                key="end-session"
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