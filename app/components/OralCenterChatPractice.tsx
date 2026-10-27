import React, { useRef, useEffect } from "react";

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
  onRepeatQuestion: () => void;
  onProceedNext: () => void;
  onSendMessage: (e: React.FormEvent) => void;
  themeColor?: string;
  titleLabel?: string;
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
  setInputMessage,
  onStartRecording,
  onStopRecording,
  onRepeatQuestion,
  onProceedNext,
  onSendMessage,
  themeColor = "#eab308",
  titleLabel = "Conversation Practice with AI Yamato",
}) => {
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, isAnalyzing]);

  return (
    <div
      ref={chatContainerRef}
      className="bg-white dark:bg-slate-900 border-2 rounded-3xl p-6 shadow-md space-y-6"
      style={{ borderColor: themeColor }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: themeColor }}>
            Main Interactive Practice Screen
          </span>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span>2. {titleLabel}</span> 🎙️
          </h2>
        </div>
        {isPracticing && (
          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full text-xs font-bold animate-pulse">
            🟢 Active (Q{currentQuestionIndex + 1}/{totalQuestions})
          </span>
        )}
      </div>

      {/* Chat Messages Container */}
      <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 h-96 overflow-y-auto space-y-4">
        {chatMessages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
            {/* 💡 dangerouslySetInnerHTML によりメッセージ内の <ruby> などのルビタグを正しく HTML 表示 */}
            <div
              className={`max-w-[90%] sm:max-w-[85%] p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap shadow-xs ${
                msg.role === "user"
                  ? "text-white rounded-br-none"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-none"
              }`}
              style={msg.role === "user" ? { backgroundColor: themeColor } : {}}
              dangerouslySetInnerHTML={{ __html: msg.content }}
            />
          </div>
        ))}
        {isAnalyzing && (
          <div className="text-xs font-bold italic animate-pulse p-2" style={{ color: themeColor }}>
            ⏳ AIヤマトがあなたの回答を分析・フィードバック作成中...
          </div>
        )}
      </div>

      {/* Controls Bar & Input */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {!isRecording ? (
              <button
                type="button"
                onClick={onStartRecording}
                disabled={!isPracticing || isAnalyzing || isWaitingForNext}
                className="bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold px-6 py-3 rounded-xl shadow-md transition cursor-pointer text-xs sm:text-sm shrink-0 flex items-center gap-2"
              >
                <span>🎙️</span> Record{" "}
                <span className="text-[10px] bg-rose-800 px-2 py-0.5 rounded-full">[Spacebar]</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onStopRecording}
                className="text-white font-bold px-6 py-3 rounded-xl shadow-md transition animate-pulse cursor-pointer text-xs sm:text-sm shrink-0 flex items-center gap-2"
                style={{ backgroundColor: themeColor }}
              >
                <span>⏹</span> Stop{" "}
                <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded-full">[Spacebar]</span>
              </button>
            )}

            {isPracticing && (
              <button
                type="button"
                onClick={onRepeatQuestion}
                disabled={isAnalyzing}
                className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-4 py-3 rounded-xl shadow-md transition text-xs shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                <span>🔊</span> Repeat Q
              </button>
            )}
          </div>

          {isWaitingForNext && (
            <button
              type="button"
              onClick={onProceedNext}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl text-xs sm:text-sm shadow-md transition cursor-pointer"
            >
              ➡️ Next Question
            </button>
          )}
        </div>

        <form onSubmit={onSendMessage} className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={
              isWaitingForNext
                ? "上の「Next Question」を押して次へ進んでください"
                : isPracticing
                ? "マイク録音、またはここにテキスト入力して送信..."
                : "上の「Speak to AI Yamato」を押して開始..."
            }
            disabled={!isPracticing || isAnalyzing || isWaitingForNext}
            className="flex-grow p-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!isPracticing || isAnalyzing || !inputMessage.trim() || isWaitingForNext}
            className="text-white font-bold px-6 py-3 rounded-xl transition text-xs sm:text-sm shrink-0 cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: themeColor }}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default OralCenterChatPractice;