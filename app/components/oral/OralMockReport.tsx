import React from "react";
import { ExamResultData } from "./OralMockSession";

export interface OralMockReportProps {
  result: ExamResultData;
  onRetry: () => void;
  onBackToHome: () => void;
  themeColor?: string;
}

export const OralMockReport: React.FC<OralMockReportProps> = ({
  result,
  onRetry,
  onBackToHome,
  themeColor = "#ef4444",
}) => {
  const { config, messages, totalDurationSeconds, fillerCount, overallScore } = result;

  const minutes = Math.floor(totalDurationSeconds / 60);
  const seconds = totalDurationSeconds % 60;

  return (
    <div className="max-w-3xl mx-auto p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl space-y-8">
      {/* Overall Score Header */}
      <div className="text-center space-y-3 border-b border-slate-100 dark:border-slate-800 pb-6">
        <span className="text-4xl">🏆</span>
        <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">
          VCE Oral Exam Performance Report
        </h3>
        <p className="text-xs text-slate-500">Candidate: {config.studentName}</p>

        {/* 10-Star Rating Bar */}
        <div className="flex items-center justify-center space-x-1 pt-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <span
              key={i}
              className={`text-xl ${
                i < overallScore ? "text-amber-400 scale-110" : "text-slate-200 dark:text-slate-700"
              }`}
            >
              ★
            </span>
          ))}
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-2">
            {overallScore} / 10
          </span>
        </div>
      </div>

      {/* Quick Metrics Grid */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-center space-y-1">
          <span className="text-xs font-semibold text-slate-400">Total Duration</span>
          <div className="text-base font-extrabold text-slate-800 dark:text-slate-100">
            {minutes}分 {seconds}秒
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-center space-y-1">
          <span className="text-xs font-semibold text-slate-400">Speech Fillers</span>
          <div className="text-base font-extrabold text-amber-600 dark:text-amber-400">
            {fillerCount} 回
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-center space-y-1">
          <span className="text-xs font-semibold text-slate-400">Pace / Level</span>
          <div className="text-base font-extrabold capitalize text-slate-800 dark:text-slate-100">
            {config.learningPace}
          </div>
        </div>
      </div>

      {/* 4-Quadrant Criteria Evaluation Matrix */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          VCE Criterion Assessment Matrix
        </h4>
        <div className="grid grid-cols-2 gap-4">
          {[
            { title: "1. Communication & Fluency", score: "8/10", note: "Natural pace and good responsiveness." },
            { title: "2. Grammar & Structures", score: "7/10", note: "Minor particle errors in complex sentences." },
            { title: "3. Vocabulary & Expressions", score: "9/10", note: "Rich variety of VCE kanji vocabulary." },
            { title: "4. Elaboration & Depth", score: "8/10", note: "Supported answers with clear personal opinions." },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.title}</span>
                <span className="text-xs font-extrabold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600">
                  {item.score}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">{item.note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* AI Examiner Grammar Feedback Chips */}
      <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-6">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Key Feedback & Expression Upgrades
        </h4>
        <div className="space-y-2">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl text-xs space-y-1">
            <span className="font-bold text-amber-800 dark:text-amber-300">💡 Particle Revision:</span>
            <p className="text-slate-700 dark:text-slate-300">
              “日本<span className="line-through text-red-500">に</span>行くことが好きです” → “日本<span className="font-bold text-emerald-600">へ</span>行くのが好きです”
            </p>
          </div>
          <div className="p-3 bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/50 rounded-xl text-xs space-y-1">
            <span className="font-bold text-cyan-800 dark:text-cyan-300">✨ VCE Elaboration Upgrade:</span>
            <p className="text-slate-700 dark:text-slate-300">
              “理由があります” → “いくつかの明確な理由がございますので、詳しくご説明いたします”
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={onBackToHome}
          className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          ← Back to Home
        </button>

        <button
          type="button"
          onClick={onRetry}
          className="px-6 py-2.5 rounded-xl font-bold text-white text-xs shadow-md transition hover:opacity-90 cursor-pointer"
          style={{ backgroundColor: themeColor }}
        >
          🔄 Retry Exam Simulation
        </button>
      </div>
    </div>
  );
};

export default OralMockReport;
