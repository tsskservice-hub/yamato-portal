/**
 * @file ChatYamatoConcierge.tsx
 * @description ヤマトポータル（_index.tsx）本番用のコンシェルジュヤマト専用チャットウィジェット（portalContextData 連携対応版）
 */
import { useState, useEffect, useRef } from "react";

type ChatMessage = {
  role: "assistant" | "user";
  content: string;
  imageUrl?: string;
};

function sanitizeAiOutput(text: string): string {
  if (!text) return "";
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*/g, '');
}

// 💡 _index.tsx から渡される additionalContext の型定義
interface ChatYamatoConciergeProps {
  additionalContext?: {
    pricePlans?: Record<string, any>;
    creditGuide?: Array<{ item: string; cost: string }>;
    todayQuiz?: any;
    allQuizzes?: Array<any>;
    legalContent?: {
      terms?: any;
      disclaimer?: any;
      privacy?: any;
      contact?: any;
    };
    cityName?: string;
    timeZone?: string;
  };
}

export function ChatYamatoConcierge({ additionalContext }: ChatYamatoConciergeProps) {
  // 💡 初期状態を閉じている状態（false）に変更し、リロード時にボタンとしておさまるようにします
  const [isAiTutorOpen, setIsAiTutorOpen] = useState<boolean>(false);
  const [isAiFullscreen, setIsAiFullscreen] = useState<boolean>(false);
  const aiChatRef = useRef<HTMLDivElement>(null);

  const characterName = "やまと先生";
  const initialGreeting = "Hello, my friend! 🌟 Welcome to the Yamato Portal. I am Yamato-sensei, your guide and concierge. Please feel free to ask me anything about our Japanese quizzes, mini-games, pricing plans, or portal features!";

  const [tutorMessages, setTutorMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: initialGreeting,
    },
  ]);
  const [tutorInput, setTutorInput] = useState<string>("");
  const [isTutorLoading, setIsTutorLoading] = useState<boolean>(false);

  // フルスクリーン制御
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

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsAiFullscreen(false);
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // メッセージ送信処理
  const handleSendTutorMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tutorInput.trim() || isTutorLoading) return;

    const userMsg = tutorInput.trim();
    setTutorInput("");

    const newMessages: ChatMessage[] = [
      ...tutorMessages, 
      { role: "user", content: userMsg },
    ];
    setTutorMessages(newMessages);
    setIsTutorLoading(true);

    // ★ _index.tsx から受け取った additionalContext（価格、クイズ、法的データ）をそのままバックエンドに送信するペイロードに組み込む
    const portalContextPayload = {
      quizzes: additionalContext?.allQuizzes?.map(q => ({
        title: q.topic || q.title,
        description: q.question || q.description
      })) || [
        { title: "VCE Japanese Kanji & Vocabulary", description: "Interactive practice aligned with Australian secondary curricula." },
        { title: "Mini Shogi & Go", description: "Traditional Japanese board games adapted for language learners." },
        { title: "Karuta & Typing Games", description: "Engaging drills to master Japanese reading and kana/kanji." }
      ],
      todayQuiz: additionalContext?.todayQuiz || null,
      pricePlans: additionalContext?.pricePlans || null,
      creditGuide: additionalContext?.creditGuide || null,
      legalContent: additionalContext?.legalContent || null,
      cityName: additionalContext?.cityName || "Melbourne, Australia",
      timeZone: additionalContext?.timeZone || "Australia/Melbourne"
    };

    try {
      const response = await fetch("https://api.jptutoraiyamato.com/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          history: tutorMessages.map(m => ({ role: m.role, content: m.content })),
          learningPace: "normal",
          userNickname: "my friend",
          appType: "concierge", // 常にコンシェルジュとして動作
          portalData: portalContextPayload,
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

      const replyText = data.reply || "I'm sorry, I couldn't generate a response.";
      const sanitizedReply = sanitizeAiOutput(replyText);

      setIsTutorLoading(false);
      setTutorMessages([
        ...newMessages,
        { role: "assistant", content: sanitizedReply }
      ]);

    } catch (err: any) {
      console.error(err);
      setIsTutorLoading(false);
      setTutorMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Sorry, an error occurred: ${err.message || "Communication error"}` },
      ]);
    }
  };

  return (
    <aside aria-label="Yamato Concierge" className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 font-sans">
      {!isAiTutorOpen ? (
        <button
          type="button"
          onClick={() => setIsAiTutorOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all cursor-pointer text-sm"
        >
          <span>🤖</span>
          <span>{characterName}</span>
        </button>
      ) : (
        <div
          ref={aiChatRef}
          className={`bg-white border-2 border-blue-300 rounded-2xl p-5 shadow-2xl flex flex-col transition-all ${
            isAiFullscreen
              ? "w-screen h-screen rounded-none border-none p-6 sm:p-10 overflow-auto"
              : "w-80 sm:w-96 h-[500px] min-w-[280px] min-h-[350px] max-w-[90vw] max-h-[85vh] resize overflow-auto"
          }`}
        >
          <div className="w-full h-full flex flex-col">
            {/* ヘッダー */}
            <div className="flex items-center justify-between border-b pb-2 mb-3 shrink-0">
              <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2 m-0">
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

            {/* チャット履歴エリア */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 overflow-y-auto space-y-2.5 flex-grow mb-3">
              {tutorMessages.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div
                    className={`max-w-[95%] p-2.5 rounded-xl text-xs leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white rounded-br-xs"
                        : "bg-white border border-slate-200 text-slate-800 rounded-bl-xs shadow-xs"
                    }`}
                  >
                    {msg.role === "user" ? (
                      msg.content
                    ) : (
                      <div className="space-y-2">
                        <div dangerouslySetInnerHTML={{ __html: msg.content }} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isTutorLoading && (
                <div className="text-xs text-slate-500 italic">🤖 やまと先生が考えています...</div>
              )}
            </div>

            {/* 入力フォーム */}
            <form onSubmit={handleSendTutorMessage} className="flex flex-col gap-2 shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tutorInput}
                  onChange={(e) => setTutorInput(e.target.value)}
                  placeholder="Ask Yamato anything..."
                  disabled={isTutorLoading}
                  className="flex-grow p-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                />
                <button
                  type="submit"
                  disabled={isTutorLoading || !tutorInput.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 shrink-0"
                >
                  Send
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
}

export default ChatYamatoConcierge;