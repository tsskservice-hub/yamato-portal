import React from "react";

export interface CorrectionDetail {
  original: string;
  corrected: string;
  explanation: string;
}

export interface FeedbackData {
  scoreLabel?: string;
  evaluationHtml?: string;
  correctionsHtml?: string;
  refinedPolishHtml?: string;
  defaultAnswerWithRuby?: string;
  score?: number;
  corrections?: CorrectionDetail[];
}

export interface OralDrillFeedbackCardProps {
  feedback?: FeedbackData;
  questionText?: string;
  studentAnswer?: string;
  score?: number;
  corrections?: CorrectionDetail[];
  suggestedBetterAnswer?: string;
  audioUrl?: string;
  onReplayAudio?: () => void;
  onNextQuestion?: () => void;
  themeColor?: string;
}

export const OralDrillFeedbackCard: React.FC<OralDrillFeedbackCardProps> = ({
  feedback,
  questionText,
  studentAnswer,
  score = 85,
  corrections = [],
  suggestedBetterAnswer,
  audioUrl,
  onReplayAudio,
  onNextQuestion,
  themeColor = "#a855f7",
}) => {
  const displayScore = feedback?.score ?? score;
  const scoreLabel = feedback?.scoreLabel || `${displayScore} pts`;
  const evaluationHtml = feedback?.evaluationHtml;
  const correctionsHtml = feedback?.correctionsHtml;
  const refinedPolish = feedback?.refinedPolishHtml || suggestedBetterAnswer;
  const defaultRubyAnswer = feedback?.defaultAnswerWithRuby;

  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md space-y-5">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            AI Evaluation & Feedback
          </span>
          {questionText && (
            <h5 className="font-bold text-sm text-slate-800 dark:text-slate-100">
              {questionText}
            </h5>
          )}
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {audioUrl && (
            <button
              type="button"
              onClick={onReplayAudio}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 text-xs cursor-pointer"
              title="Play Question Audio"
            >
              🔊 Audio
            </button>
          )}
          <span
            className="px-3 py-1 rounded-xl text-xs font-black text-white shadow-xs"
            style={{ backgroundColor: themeColor }}
          >
            {scoreLabel}
          </span>
        </div>
      </div>

      {studentAnswer && (
        <div className="space-y-1 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-bold text-slate-400">Your Answer:</span>
          <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
            "{studentAnswer}"
          </p>
        </div>
      )}

      {evaluationHtml && (
        <div className="p-3.5 bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 rounded-xl text-xs space-y-1">
          <span className="font-bold text-purple-700 dark:text-purple-300">💡 Feedback:</span>
          <div
            className="text-slate-700 dark:text-slate-300 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: evaluationHtml }}
          />
        </div>
      )}

      {correctionsHtml ? (
        <div className="p-3.5 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl text-xs space-y-1">
          <span className="font-bold text-amber-700 dark:text-amber-300">🔧 Improvements:</span>
          <div
            className="text-slate-700 dark:text-slate-300 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: correctionsHtml }}
          />
        </div>
      ) : corrections.length > 0 ? (
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">
            Grammar & Expression Fixes
          </span>
          <div className="space-y-2">
            {corrections.map((corr, idx) => (
              <div
                key={idx}
                className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl text-xs space-y-1"
              >
                <div className="flex items-center space-x-2">
                  <span className="line-through text-red-500 font-medium">{corr.original}</span>
                  <span>→</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{corr.corrected}</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{corr.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {(refinedPolish || defaultRubyAnswer) && (
        <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-900/40 space-y-1">
          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
            ✨ Upgraded Model Answer (模範解答):
          </span>
          <p
            className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: refinedPolish || defaultRubyAnswer || "" }}
          />
        </div>
      )}

      {onNextQuestion && (
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onNextQuestion}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md hover:opacity-90 transition cursor-pointer"
            style={{ backgroundColor: themeColor }}
          >
            Next Question →
          </button>
        </div>
      )}
    </div>
  );
};

export default OralDrillFeedbackCard;