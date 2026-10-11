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

  // 🎨 ユーザーが明示的に図解・イラスト生成を要求するためのチェックボックス用ステート
  const [requestVisualAid, setRequestVisualAid] = useState<boolean>(false);

  // 🔍 拡大表示（モーダル）用のステート
  const [modalImageSrc, setModalImageSrc] = useState<string | null>(null);

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
    const needsVisual = requestVisualAid; // 🎨 チェック状態を保持

    setTutorInput("");
    setRequestVisualAid(false); // 送信後にチェックを自動リセット

    const newMessages: ChatMessage[] = [...tutorMessages, { role: "user", content: userMsg }];
    setTutorMessages(newMessages);
    setIsTutorLoading(true);

    try {
      // 🎨 チェックが入っている場合のみ、 visualPrompt を構築
      const visualPrompt = needsVisual
        ? `Educational instructional diagram and visual aid for VCE Japanese high school students explaining: ${userMsg}. Clean layout, high quality, professional illustration style.`
        : undefined;

      const response = await fetch("https://api.jptutoraiyamato.com/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          history: tutorMessages.map(m => ({ role: m.role, content: m.content })),
          learningPace: tutorLevel,
          userNickname: "テスト生徒さん",
          appType: "general",
          systemPrompt: systemPrompt,
          visualPrompt: visualPrompt, // 🎨 バックエンドへ visualPrompt を送信
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
      const imageUrl = data.imageUrl; // 💡 生成画像URL
      const sanitizedReply = sanitizeAiOutput(replyText);

      setTutorMessages([
        ...newMessages,
        {
          role: "assistant",
          content: sanitizedReply,
          imageUrl: imageUrl,
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
    <>
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
                      {msg.role === "user" ? (
                        msg.content
                      ) : (
                        <div className="space-y-2">
                          <div dangerouslySetInnerHTML={{ __html: msg.content }} />
                          {/* 🎨 インライン表示される生成画像（クリックで拡大可能） */}
                          {msg.imageUrl && (
                            <div className="mt-2 rounded-lg overflow-hidden border border-emerald-200 bg-emerald-50/50 p-1">
                              <img
                                src={msg.imageUrl}
                                alt="AI Yamato Visual Explanation"
                                onClick={() => setModalImageSrc(msg.imageUrl || null)}
                                className="w-full h-auto rounded-md object-contain max-h-48 cursor-pointer hover:opacity-95 transition"
                                title="クリックして画像を拡大"
                              />
                              <p className="text-[10px] text-emerald-800 text-center mt-1 font-medium cursor-pointer" onClick={() => setModalImageSrc(msg.imageUrl || null)}>
                                ✨ ヤマト特製図解・イラスト（クリックして拡大）
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isTutorLoading && (
                  <div className="text-xs text-slate-500 italic">🤖 ヤマトが考えています (and creating visual illustration)...</div>
                )}
              </div>

              {/* 入力フォーム & 図解生成チェックボックス */}
              <form onSubmit={handleSendTutorMessage} className="flex flex-col gap-2 shrink-0">
                {/* 🎨 ユーザーが明示的に図解を要求するためのチェックボックス */}
                <div className="flex items-center gap-2 px-1">
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={requestVisualAid}
                      onChange={(e) => setRequestVisualAid(e.target.checked)}
                      disabled={isTutorLoading}
                      className="rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span>🎨 explain with diagrams and illustrations</span>
                  </label>
                </div>

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

      {/* 🔍 画像拡大表示用モーダル（Lightbox） */}
      {modalImageSrc && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setModalImageSrc(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl p-2 shadow-2xl flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setModalImageSrc(null)}
              className="absolute top-3 right-3 bg-slate-800/70 hover:bg-slate-900 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition cursor-pointer z-10"
            >
              ✕
            </button>
            <img
              src={modalImageSrc}
              alt="Enlarged AI Yamato Visual"
              className="max-w-full max-h-[80vh] rounded-lg object-contain"
            />
            <p className="text-xs text-slate-600 mt-2 font-medium">✨ ヤマト特製図解・イラスト（拡大表示）</p>
          </div>
        </div>
      )}
    </>
  );
}