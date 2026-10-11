import { useState, useRef } from "react";

type ChatMessage = {
  role: "assistant" | "user";
  content: string;
  imageUrl?: string;
};

// 外部から受け取るプロパティ（Props）の型定義
type YamatoChatProps = {
  characterName?: string;       // チャット窓のタイトルに表示する名前
  initialGreeting?: string;     // 最初の一言メッセージ
  systemPrompt?: string;        // キャラクター固有の指示（将来の拡張用）
};

function sanitizeAiOutput(text: string): string {
  if (!text) return "";
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*/g, '');
}

export function YamatoChat({
  characterName = "ヤマト AI",
  initialGreeting = "こんにちは！日本語Tutor AI ヤマトです。何か話しかけてみてくださいね！",
  systemPrompt = "",
}: YamatoChatProps) {
  const [isAiTutorOpen, setIsAiTutorOpen] = useState<boolean>(true);
  const [isAiFullscreen, setIsAiFullscreen] = useState<boolean>(false);
  const aiChatRef = useRef<HTMLDivElement>(null);

  const [tutorMessages, setTutorMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: initialGreeting,
    },
  ]);
  const [tutorInput, setTutorInput] = useState<string>("");
  const [isTutorLoading, setIsTutorLoading] = useState<boolean>(false);
  const [tutorLevel, setTutorLevel] = useState<"steady" | "normal" | "accelerated">("normal");

  const toggleAiFullscreen = async () => {
    if (!aiChatRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await aiChatRef.current.requestFullscreen();
        setIsAiFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsAiFullscreen(false);
      }
    } catch (err) {
      console.error("Fullscreen toggle failed:", err);
    }
  };

  const handleSendTutorMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tutorInput.trim() || isTutorLoading) return;

    const userMsg = tutorInput.trim();
    setTutorInput("");

    const newMessages: ChatMessage[] = [...tutorMessages, { role: "user", content: userMsg }];
    setTutorMessages(newMessages);
    setIsTutorLoading(true);

    try {
      const response = await fetch("https://api.jptutoraiyamato.com/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          history: tutorMessages.map(m => ({ role: m.role, content: m.content })),
          learningPace: tutorLevel,
          userNickname: "テスト生徒さん",
          appType: "general",
          // 必要に応じて systemPrompt などのカスタム設定もここに含められます
          systemPrompt: systemPrompt,
        }),
      });

      const responseText = await response.text();
      
      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch (parseErr) {
        throw new Error(`サーバーからの応答がJSONではありません: ${responseText.slice(0, 100)}`);
      }

      if (!response.ok) {
        throw new Error(data?.error || `APIエラー (${response.status})`);
      }

      const replyText = data.reply || "お返事がうまく取得できませんでした。";
      const sanitizedReply = sanitizeAiOutput(replyText);

      setTutorMessages([
        ...newMessages,
        {
          role: "assistant",
          content: sanitizedReply,
        },
      ]);
    } catch (err: any) {
      console.error(err);
      setTutorMessages([
        ...newMessages,
        { role: "assistant", content: `エラーが発生しました: ${err.message || "通信エラー"}` },
      ]);
    } finally {
      setIsTutorLoading(false);
    }
  };

  return (
    <aside aria-label="AI Yamato" className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 font-sans">
      {!isAiTutorOpen ? (
        <button
          type="button"
          onClick={() => setIsAiTutorOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all cursor-pointer text-sm"
        >
          <span>🤖</span>
          <span>{characterName}</span>
        </button>
      ) : (
        <div
          ref={aiChatRef}
          className={`bg-white border-2 border-emerald-300 rounded-2xl p-5 shadow-2xl flex flex-col transition-all ${
            isAiFullscreen
              ? "w-screen h-screen rounded-none border-none p-6 sm:p-10 overflow-auto"
              : "w-80 sm:w-96 h-[500px] min-w-[280px] min-h-[350px] max-w-[90vw] max-h-[85vh] resize overflow-auto"
          }`}
        >
          <div className="w-full h-full flex flex-col">
            {/* ヘッダー */}
            <div className="flex items-center justify-between border-b pb-2 mb-3 shrink-0">
              <h3 className="text-sm font-bold text-emerald-900 flex items-center gap-2 m-0">
                <span>🤖</span> {characterName}
              </h3>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleAiFullscreen}
                  className="text-slate-500 hover:text-slate-700 text-xs font-bold px-2 py-1 rounded-md transition cursor-pointer border border-slate-200"
                >
                  {isAiFullscreen ? "🗗 縮小" : "🗖 最大化"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (document.fullscreenElement) {
                      document.exitFullscreen().catch(() => {});
                    }
                    setIsAiTutorOpen(false);
                    setIsAiFullscreen(false);
                  }}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold px-2 py-1 rounded-md transition cursor-pointer"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-3 shrink-0">
              接続先: <code>api.jptutoraiyamato.com/chat</code>
            </p>

            {/* 学習ペース選択UI */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 mb-3 flex items-center justify-between shrink-0">
              <span className="text-xs font-bold text-emerald-900">Learning Pace</span>
              <div className="inline-flex rounded-lg bg-white p-0.5 shadow-xs border border-emerald-200">
                {(["steady", "normal", "accelerated"] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setTutorLevel(level)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold capitalize transition ${
                      tutorLevel === level ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-emerald-700"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* チャット履歴エリア */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 overflow-y-auto space-y-2.5 flex-grow mb-3">
              {tutorMessages.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div
                    className={`max-w-[95%] p-2.5 rounded-xl text-xs leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-emerald-600 text-white rounded-br-xs"
                        : "bg-white border border-slate-200 text-slate-800 rounded-bl-xs shadow-xs"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isTutorLoading && (
                <div className="text-xs text-slate-500 italic">🤖 ヤマトが考えています...</div>
              )}
            </div>

            {/* 入力フォーム */}
            <form onSubmit={handleSendTutorMessage} className="flex flex-col gap-2 shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tutorInput}
                  onChange={(e) => setTutorInput(e.target.value)}
                  placeholder="ヤマトに質問を入力..."
                  disabled={isTutorLoading}
                  className="flex-grow p-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
                />
                <button
                  type="submit"
                  disabled={isTutorLoading || !tutorInput.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 shrink-0"
                >
                  送信
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
}