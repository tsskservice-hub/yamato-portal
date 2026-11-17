/**
 * @file OralMockReport.tsx
 * @description 模擬試験が終わったあとの画面。試験全体のフィードバックを、ここで 1 回だけまとめて作って見せる
 * （形は生徒の learning pace に合わせる。サーバーがアカウントの設定を読む）
 */
import React, { useEffect, useRef, useState } from "react";
import { yamatoFetch, YAMATO_API_BASE } from "~/lib/yamatoApi";
import type { ExamResultData, MockLogItem, MockStageId } from "./OralMockSession";

export interface OralMockReportProps {
  result: ExamResultData;
  onRetry: () => void;
  themeColor?: string;
  /** フィードバックを作る api（省略すると mock 用。superb は /api/oral-superb/feedback） */
  feedbackEndpoint?: string;
  /** 見出しの下の説明（省略すると「Section 1 + 2 · medium」など） */
  subtitle?: string;
  /** 会話の記録で、相手の名前（省略すると Examiner） */
  partnerName?: string;
  /** 会話の記録で、セクションの見出しを出さない（accelerated の自由会話） */
  hideStageHeadings?: boolean;
  /** もう一度のボタンの文字 */
  retryLabel?: string;
  /**
   * フィードバックの前に、生徒が自分の言ったこと（文字起こし）を確かめて直せるようにする。
   * 聞き取りがまちがっていたのに、それをもとにフィードバックされないように（accelerated で使う）
   */
  reviewBeforeFeedback?: boolean;
}

const STAGE_LABEL: Record<MockStageId, string> = {
  before: "Entering the room",
  sec1: "Section 1 · General Conversation",
  sec2: "Section 2 · Detailed Study",
  after: "Leaving the room",
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** AI のフィードバック（見出しは「絵文字 [見出し]」の行）を、読みやすい HTML にする */
function formatFeedback(raw: string, color: string): string {
  return raw
    .replace(/\*\*/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .split("\n")
    .map((line) => {
      const t = line.trim();
      if (!t) return '<div style="height:0.5rem"></div>';
      const safe = escapeHtml(t);
      // 見出し: 「🟢 [VCE-Aligned Estimation Band] (…)」のような行
      const m = safe.match(/^(\S{1,3}\s*)?\[([^\]]+)\](.*)$/u);
      if (m) {
        return `<div style="margin-top:1rem;margin-bottom:0.35rem;padding:0.5rem 0.75rem;border-left:4px solid ${color};background:${color}14;border-radius:0.5rem;font-weight:800">${m[1] || ""}${m[2]}<span style="font-weight:500">${m[3] || ""}</span></div>`;
      }
      if (/^[・\-•]/.test(t)) return `<div style="padding-left:1rem;text-indent:-0.75rem;margin:0.15rem 0">${safe}</div>`;
      return `<div style="margin:0.15rem 0">${safe}</div>`;
    })
    .join("");
}

export const OralMockReport: React.FC<OralMockReportProps> = ({
  result,
  onRetry,
  themeColor = "#ef4444",
  feedbackEndpoint = `${YAMATO_API_BASE}/api/oral-mock/feedback`,
  subtitle,
  partnerName = "Examiner",
  hideStageHeadings = false,
  retryLabel = "🔄 Take another mock exam",
  reviewBeforeFeedback = false,
}) => {
  // フィードバックに使う会話（生徒が直したあとのもの）
  const [transcript, setTranscript] = useState<MockLogItem[]>(result.transcript);
  const [reviewing, setReviewing] = useState(reviewBeforeFeedback);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const requestedRef = useRef(false);

  const loadFeedback = async (lines: MockLogItem[] = transcript) => {
    setLoading(true);
    setError(null);
    try {
      const res = await yamatoFetch(feedbackEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: result.sessionId,
          transcript: lines,
          durations: result.durations,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as any;
      if (!res.ok || !data.feedback) throw new Error(data.message || "Sorry, we could not create your feedback.");
      setFeedback(data.feedback);
    } catch (err: any) {
      setError(err?.message || "Sorry, we could not create your feedback.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (requestedRef.current || reviewBeforeFeedback) return;
    requestedRef.current = true;
    loadFeedback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = result.totalDurationSeconds;
  const answers = transcript.filter((t) => t.speaker === "student" && t.text.trim());

  /** 生徒の行を直す（空にすると、その行はフィードバックに使わない） */
  const editLine = (index: number, text: string) => {
    setTranscript((prev) =>
      prev.map((t, i) => (i === index ? { ...t, text, edited: text.trim() !== (result.transcript[i]?.text || "").trim() } : t))
    );
  };

  const confirmAndGetFeedback = () => {
    const lines = transcript.filter((t) => t.text.trim());
    setTranscript(lines);
    setReviewing(false);
    requestedRef.current = true;
    loadFeedback(lines);
  };
  const avgLength = answers.length ? Math.round(answers.reduce((s, a) => s + a.text.length, 0) / answers.length) : 0;

  return (
    <div className="max-w-3xl mx-auto p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6">
      <div className="text-center space-y-2 border-b border-slate-100 dark:border-slate-800 pb-5">
        <span className="text-4xl">🏁</span>
        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100">
          {subtitle ? "Conversation Feedback" : "Mock Exam Feedback"}
        </h1>
        <p className="text-xs text-slate-500">
          {subtitle ?? (
            <>
              {result.config.examSection === "both" ? "Section 1 + 2" : result.config.examSection === "section1" ? "Section 1" : "Section 2"} ·{" "}
              {{ steady: "easy", normal: "medium", accelerated: "hard" }[result.config.difficulty]}
            </>
          )}
        </p>
      </div>

      {/* 数字 */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: subtitle ? "Talk time" : "Exam time", value: `${Math.floor(total / 60)} min ${total % 60} s` },
          { label: "Your answers", value: `${answers.length}` },
          { label: "Average answer", value: `${avgLength} characters` },
        ].map((m) => (
          <div key={m.label} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <span className="text-[11px] font-semibold text-slate-400">{m.label}</span>
            <div className="text-base font-extrabold text-slate-800 dark:text-slate-100">{m.value}</div>
          </div>
        ))}
      </div>

      {/* フィードバックの前に、自分の言ったことを確かめる（聞き取りのまちがいを直す） */}
      {reviewing && (
        <div className="space-y-3">
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-sm text-slate-700 dark:text-slate-200 space-y-1">
            <p className="font-bold">✏️ Check what you said</p>
            <p className="text-xs">
              Your voice was turned into text automatically, and sometimes it is heard wrongly. If a line is not what you
              said, fix it so your feedback is based on what you really said. Leave a line empty to skip it. Please fix
              only mistakes in hearing — don&apos;t improve your Japanese here.
            </p>
          </div>
          <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
            {transcript.map((t, i) =>
              t.speaker === "student" ? (
                <div key={i} className="space-y-1">
                  <textarea
                    value={t.text}
                    onChange={(e) => editLine(i, e.target.value)}
                    rows={2}
                    className={`w-full p-3 rounded-xl border text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 ${
                      t.edited ? "border-amber-400" : "border-slate-200 dark:border-slate-700"
                    }`}
                  />
                  {t.edited && <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400">Changed</p>}
                </div>
              ) : (
                <p key={i} className="text-xs text-slate-500 dark:text-slate-400 pl-1">
                  {partnerName}: {t.text}
                </p>
              )
            )}
          </div>
          <button
            type="button"
            onClick={confirmAndGetFeedback}
            className="w-full py-3 rounded-2xl font-bold text-white text-sm shadow-md cursor-pointer"
            style={{ backgroundColor: themeColor }}
          >
            ✅ This is what I said — get my feedback
          </button>
        </div>
      )}

      {/* AI が評価できること・できないこと（AI の答えにかかわらず、いつも出す） */}
      {!reviewing && (
        <p className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
          ℹ️ This feedback is based on the text of what you said (speech-to-text): how well your answers fit the
          questions, how much you elaborated, how you kept the conversation going, and your vocabulary and grammar.
          Pronunciation, intonation, rhythm and tempo are not assessed.
        </p>
      )}

      {/* フィードバック */}
      <div className="space-y-2">
        {loading && (
          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-center space-y-2">
            <p className="text-sm font-bold animate-pulse" style={{ color: themeColor }}>
              AI Yamato is reading your whole exam…
            </p>
            <p className="text-xs text-slate-500">This usually takes 10–30 seconds.</p>
          </div>
        )}
        {error && !loading && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 space-y-2">
            <p className="text-sm text-rose-800 dark:text-rose-200">{error}</p>
            <button
              type="button"
              onClick={() => loadFeedback()}
              className="px-4 py-2 rounded-xl text-white text-xs font-bold cursor-pointer"
              style={{ backgroundColor: themeColor }}
            >
              🔄 Try again
            </button>
          </div>
        )}
        {feedback && (
          <div
            className="text-sm sm:text-base leading-relaxed text-slate-800 dark:text-slate-100"
            dangerouslySetInnerHTML={{ __html: formatFeedback(feedback, themeColor) }}
          />
        )}
      </div>

      {/* 会話の記録 */}
      <details className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
        <summary className="text-sm font-bold text-slate-700 dark:text-slate-200 cursor-pointer">📜 Read the whole conversation</summary>
        <div className="mt-3 space-y-1.5 text-sm">
          {transcript.map((t, i) => {
            const newStage = i === 0 || transcript[i - 1].stage !== t.stage;
            return (
              <React.Fragment key={i}>
                {newStage && !hideStageHeadings && <p className="mt-3 text-xs font-bold text-slate-400 uppercase">{STAGE_LABEL[t.stage]}</p>}
                <p className={t.speaker === "student" ? "font-bold text-slate-800 dark:text-slate-100" : "text-slate-500 dark:text-slate-400"}>
                  {t.speaker === "student" ? "You: " : `${partnerName}: `}
                  {t.text}
                </p>
              </React.Fragment>
            );
          })}
        </div>
      </details>

      <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={onRetry}
          className="px-6 py-2.5 rounded-xl font-bold text-white text-sm shadow-md hover:opacity-90 cursor-pointer"
          style={{ backgroundColor: themeColor }}
        >
          {retryLabel}
        </button>
      </div>
    </div>
  );
};

export default OralMockReport;
