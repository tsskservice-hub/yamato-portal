import { safeHtml } from '~/utils/safeHtml';
import React, { useRef, useEffect, useState } from "react";

export type ChatMessage = {
  role: "assistant" | "user";
  content: string;
  isHtml?: boolean;
};

export interface OralCenterChatPracticeProps {
  chatMessages: ChatMessage[];
  isPracticing: boolean;
  currentQuestionIndex: number;
  totalQuestions: number;
  isAnalyzing: boolean;
  isRecording: boolean;
  isWaitingForNext: boolean;
  inputMessage: string;
  setInputMessage: (val: string) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  /** 使っていない（質問の繰り返しは、生徒が「すみません」と言う方式に変えた）。呼び出し側の互換のために残している */
  onRepeatQuestion?: () => void;
  onProceedNext: () => void;
  onSendMessage: (e: React.FormEvent) => void;
  themeColor?: string;
  titleLabel?: string;
  headerRight?: React.ReactNode;
  creditCost?: number; // 💡 音声会話練習の消費クレジット数（デフォルト: 4）
  /** 練習を始める（練習中なら、今の設定でやり直す）。あれば、この画面に Start / Restart ボタンを出す */
  onStartPractice?: () => void;
}

export const OralCenterChatPractice: React.FC<OralCenterChatPracticeProps> = ({
  chatMessages,
  isPracticing,
  currentQuestionIndex,
  totalQuestions,
  isAnalyzing,
  isRecording,
  isWaitingForNext,
  inputMessage,
  onStartRecording,
  onStopRecording,
  onProceedNext,
  onSendMessage,
  themeColor = "#eab308",
  titleLabel = "Conversation Practice with AI Yamato",
  headerRight,
  creditCost = 4,
  onStartPractice,
}) => {
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const sendFormRef = useRef<HTMLFormElement | null>(null);
  // 録音して文字になった答えが、送る前の確認待ちになっているか（family-1 の Speaking タスクと同じ流れ）
  // ・違っていたら「Record Again」で言い直す（書き直しはしない）・合っていたら「Send」で AI に送る
  const hasTranscript = inputMessage.trim().length > 0;
  const awaitingConfirm = isPracticing && hasTranscript && !isRecording && !isAnalyzing && !isWaitingForNext;
  // 登録した答え（Your Answer: 〜）をチャットに表示するか。隠すと、見ながら読まずに答える練習になる
  const [showAnswers, setShowAnswers] = useState<boolean>(true);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, isAnalyzing, isWaitingForNext]);

  // ⌨️ スペースバーで録音の開始・停止（練習中だけ）。確認待ちのときのスペースは「言い直し」、Enter は「送る」
  // 文字入力欄（ヤマトチャットなど）にいるときは普通にスペースを打てるようにする。
  // ボタンにフォーカスが残っているとスペースでそのボタン（Start Practice など）が押されてしまうので、ここで止める。
  useEffect(() => {
    if (!isPracticing) return;

    const isTypingTarget = (el: EventTarget | null) => {
      const node = el as HTMLElement | null;
      if (!node) return false;
      const tag = node.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || node.isContentEditable;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.key === "Enter" && awaitingConfirm) {
        e.preventDefault();
        sendFormRef.current?.requestSubmit();
        return;
      }
      if (e.code !== "Space") return;
      e.preventDefault();
      if (e.repeat) return;
      if (isRecording) {
        onStopRecording();
      } else if (!isAnalyzing && !isWaitingForNext) {
        onStartRecording();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isTypingTarget(e.target)) e.preventDefault();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [isPracticing, isRecording, isAnalyzing, isWaitingForNext, awaitingConfirm, onStartRecording, onStopRecording]);

  return (
    <div
      className="bg-white dark:bg-slate-900 border-2 rounded-3xl p-6 shadow-md space-y-6"
      style={{ borderColor: themeColor }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: themeColor }}
            >
              Main Interactive Practice Screen
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
              {creditCost === 0 ? "🎁 Free (follow-up question)" : `🪙 ${creditCost} credits / turn`}
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span>{titleLabel}</span> 🎙️
          </h2>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {isPracticing && (
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full text-xs font-bold animate-pulse">
              🟢 Active (Q{currentQuestionIndex + 1}/{totalQuestions})
            </span>
          )}
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showAnswers}
              onChange={(e) => setShowAnswers(e.target.checked)}
              className="cursor-pointer"
            />
            Show my answers
          </label>
          {headerRight}
        </div>
      </div>

      {/* Chat Messages Container */}
      <div
        ref={chatContainerRef}
        className={`bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 h-96 overflow-y-auto space-y-4 ${
          showAnswers ? "" : "[&_.registered-answer]:hidden"
        }`}
      >
        {chatMessages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${
              msg.role === "user" ? "items-end" : "items-start"
            }`}
          >
            <div
              className={`max-w-[90%] sm:max-w-[85%] p-4 rounded-2xl text-sm sm:text-base leading-relaxed whitespace-pre-wrap shadow-xs ${
                msg.role === "user"
                  ? "text-white rounded-br-none"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-none"
              }`}
              style={msg.role === "user" ? { backgroundColor: themeColor } : {}}
              dangerouslySetInnerHTML={{ __html: safeHtml(msg.content) }}
            />
          </div>
        ))}
        {isWaitingForNext && (
          <div className="flex justify-start">
            <button
              type="button"
              onClick={onProceedNext}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl text-xs sm:text-sm shadow-md transition cursor-pointer"
            >
              ➡️ Next Question
            </button>
          </div>
        )}
        {isAnalyzing && (
          <div
            className="text-xs font-bold italic animate-pulse p-2"
            style={{ color: themeColor }}
          >
            ⏳ AI Yamato is analyzing your response and creating feedback...
          </div>
        )}
      </div>

      {/* Controls Bar & Input */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {awaitingConfirm ? null : !isRecording ? (
              <button
                type="button"
                onClick={onStartRecording}
                disabled={!isPracticing || isAnalyzing || isWaitingForNext}
                className="bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold px-6 py-3 rounded-xl shadow-md transition cursor-pointer text-xs sm:text-sm shrink-0 flex items-center gap-2"
              >
                <span>🎙️</span> Record{" "}
                <span className="text-[10px] bg-rose-800 px-2 py-0.5 rounded-full">
                  [Spacebar]
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onStopRecording}
                className="text-white font-bold px-6 py-3 rounded-xl shadow-md transition animate-pulse cursor-pointer text-xs sm:text-sm shrink-0 flex items-center gap-2"
                style={{ backgroundColor: themeColor }}
              >
                <span>⏹</span> Stop{" "}
                <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded-full">
                  [Spacebar]
                </span>
              </button>
            )}

            {isPracticing && (
              <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                🔁 To hear the question again, say
                <br />
                <span className="font-bold text-slate-700 dark:text-slate-200">「すみません。もういちどおねがいします。」</span>
              </p>
            )}
          </div>

          {/* 練習を始める / 今の設定（下で選んだセクション・難しさ・トピック）でやり直す */}
          {onStartPractice && (
            <div className="flex flex-col items-center sm:items-end gap-1 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  if (
                    isPracticing &&
                    !window.confirm("Restart the practice with the stage, difficulty and topics selected below?")
                  ) {
                    return;
                  }
                  onStartPractice();
                }}
                disabled={isRecording || isAnalyzing}
                className={`w-full sm:w-auto font-black px-5 py-3 rounded-xl shadow-md transition cursor-pointer text-xs sm:text-sm disabled:opacity-40 ${
                  isPracticing ? "bg-white dark:bg-slate-900 border-2" : "text-white"
                }`}
                style={isPracticing ? { borderColor: themeColor, color: themeColor } : { backgroundColor: themeColor }}
              >
                {isPracticing ? "🔄 Restart Practice" : "🚀 Speak to AI Yamato (Start Practice)"}
              </button>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                {isPracticing
                  ? "Speed changes apply from the next question. For a new stage, difficulty or topic, change it below and restart."
                  : "Choose the stage, difficulty and topics below, then start."}
              </span>
            </div>
          )}
        </div>

        {/* 録音した答えの確認: 言い直す（Record Again）か、送る（Send）か。書き直す欄はない */}
        {awaitingConfirm && (
          <div className="space-y-3">
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                Is this what you said? If not, press &apos;Record Again&apos; (Space). If yes, press &apos;Send&apos; (Enter).
              </p>
              <p className="text-base font-bold text-slate-800 dark:text-slate-100">「{inputMessage}」</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                If only the kanji is different for a word that sounds the same (e.g. 買った／飼った), you can still press &apos;Send&apos;. It won&apos;t count as a mistake.
              </p>
            </div>
            <form ref={sendFormRef} onSubmit={onSendMessage} className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onStartRecording}
                className="py-3 px-3 rounded-2xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-black text-sm transition flex flex-col items-center justify-center cursor-pointer active:scale-95"
              >
                <span>🔁 Record Again (Space)</span>
                <span className="text-xs font-bold opacity-75">Not what I said</span>
              </button>
              <button
                type="submit"
                className="py-3 px-3 rounded-2xl border-2 bg-white dark:bg-slate-900 font-black text-sm transition flex flex-col items-center justify-center cursor-pointer active:scale-95 hover:shadow-md"
                style={{ borderColor: themeColor, color: themeColor }}
              >
                <span>✅ Send ({creditCost === 0 ? "Free" : `${creditCost} 🪙`}) (Enter)</span>
                <span className="text-xs font-bold opacity-75">This is what I said</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default OralCenterChatPractice;