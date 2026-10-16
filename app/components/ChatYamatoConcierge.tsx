/**
 * @file ChatYamatoConcierge.tsx
 * @description ヤマトポータル（_index.tsx）本番用のコンシェルジュヤマト専用チャットウィジェット（学習ペース・Supabase即時更新連動・テキスト/画像AIクレジットガード対応版）
 */
import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient"; // ★ブラウザ用Supabaseクライアントのインポート

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

// 💡 テキストAI・画像AI利用時の最大予想消費クレジット数（キャップ設定）
const MAX_ESTIMATED_CREDITS = {
  textAi: 2,   // テキストチャット最大予想消費
  imageAi: 4,  // 画像生成・ビジュアル解説最大予想消費
};

// 💡 _index.tsx から渡される additionalContext および学習ペース・ユーザーID・クレジットの型定義
export interface ChatYamatoConciergeProps {
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
  initialLearningPace?: "steady" | "normal" | "accelerated";
  userId?: string;
  credits?: number; // クレジット残高
  onOpenAuth?: () => void;
}

export function ChatYamatoConcierge({ 
  additionalContext, 
  initialLearningPace = "normal", 
  userId,
  credits = 10,
  onOpenAuth
}: ChatYamatoConciergeProps) {
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
  
  // ★学習ペース用のステート
  const [tutorLevel, setTutorLevel] = useState<"steady" | "normal" | "accelerated">(initialLearningPace);

  useEffect(() => {
    if (initialLearningPace) {
      setTutorLevel(initialLearningPace);
    }
  }, [initialLearningPace]);

  // 学習ペース変更時にローカルステートと Supabase を即時更新する関数
  const handlePaceChange = async (newLevel: "steady" | "normal" | "accelerated") => {
    setTutorLevel(newLevel);

    if (!userId) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ learning_pace: newLevel })
        .eq("id", userId);

      if (error) {
        console.error("学習ペースのSupabase更新に失敗しました:", error.message);
      }
    } catch (err) {
      console.error("学習ペース更新時の通信エラー:", err);
    }
  };

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

  // メッセージ送信処理（テキストAI: 最大予想2クレジットをチェック）
  const handleSendTutorMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tutorInput.trim() || isTutorLoading) return;

    if (userId && credits < MAX_ESTIMATED_CREDITS.textAi) {
      return;
    }

    const userMsg = tutorInput.trim();
    setTutorInput("");

    const newMessages: ChatMessage[] = [
      ...tutorMessages, 
      { role: "user", content: userMsg },
    ];
    setTutorMessages(newMessages);
    setIsTutorLoading(true);

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
          learningPace: tutorLevel,
          userNickname: "my friend",
          appType: "concierge",
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

  // 💡 画像AI機能などを利用する際の手前チェック用ヘルパー関数
  const handleRequestImageAiFeature = () => {
    if (userId && credits < MAX_ESTIMATED_CREDITS.imageAi) {
      alert(`画像生成AIを利用するには最大 ${MAX_ESTIMATED_CREDITS.imageAi} クレジットの余裕が必要です（現在残高: 🪙 ${credits} クレジット）。デイリークイズやプラン購入で補充してください。`);
      const pricingSection = document.getElementById('pricing');
      if (pricingSection) {
        pricingSection.scrollIntoView({ behavior: 'smooth' });
      }
      return false;
    }
    // クレジットが足りている場合の画像生成処理へ進む
    alert("画像AI機能へアクセスします（クレジット十分）");
    return true;
  };

  return (
    <aside aria-label="Yamato Concierge" className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 font-sans">
      {!isAiTutorOpen ? (
        <button
          type="button"
          onClick={() => setIsAiTutorOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all cursor-pointer text-sm relative"
        >
          <span>🤖</span>
          <span>{characterName}</span>
          {userId && credits < MAX_ESTIMATED_CREDITS.textAi && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white text-[9px] font-bold flex items-center justify-center text-white">
              !
            </span>
          )}
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
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-blue-900 flex items-center gap-1.5 m-0">
                  <span className={isTutorLoading ? "inline-block animate-spin" : "inline-block"}>🤖</span> 
                  {characterName}
                </h3>
                {userId && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${credits >= MAX_ESTIMATED_CREDITS.textAi ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    🪙 {credits} credits
                  </span>
                )}
              </div>
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

            {/* 学習ペース選択UIの追加 */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 mb-3 flex items-center justify-between shrink-0">
              <span className="text-xs font-bold text-blue-900">Learning Pace</span>
              <div className="inline-flex rounded-lg bg-white p-0.5 shadow-xs border border-slate-200">
                {(["steady", "normal", "accelerated"] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => handlePaceChange(level)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold capitalize transition cursor-pointer ${
                      tutorLevel === level 
                        ? "bg-blue-600 text-white shadow-xs" 
                        : "text-slate-600 hover:text-blue-700"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* クレジット不足時のガード画面（テキストAIの最大予想に満たない場合） */}
            {userId && credits < MAX_ESTIMATED_CREDITS.textAi ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex-grow mb-3 flex flex-col items-center justify-center text-center space-y-3">
                <div className="text-3xl">🪙</div>
                <h4 className="font-bold text-sm text-slate-800">More Credits Required</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Your current balance ({credits} credits) is below the estimated max requirement ({MAX_ESTIMATED_CREDITS.textAi} credits) to chat with Yamato-sensei. Complete today's daily quiz for <span className="font-bold text-blue-600">+2 free credits</span> or top up a credit pack!
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const pricingSection = document.getElementById('pricing');
                    if (pricingSection) {
                      pricingSection.scrollIntoView({ behavior: 'smooth' });
                    }
                    setIsAiTutorOpen(false);
                  }}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  View Credit Packs & Daily Quiz
                </button>
              </div>
            ) : (
              <>
                {/* チャット履歴エリア */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 overflow-y-auto space-y-2.5 flex-grow mb-3">
                  {tutorMessages.map((msg, idx) => (
                    <div key={idx} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                      {msg.role === "assistant" && (
                        <div className="text-[10px] text-slate-400 mb-0.5 ml-1 flex items-center gap-1">
                          <span>🤖</span> やまと先生
                        </div>
                      )}
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
                    <div className="flex items-center gap-2 text-xs text-slate-600 italic mt-1 bg-blue-50/70 border border-blue-100 p-2 rounded-xl w-fit">
                      <span className="inline-block animate-spin text-sm">🤖</span>
                      <span>やまと先生が考えています...</span>
                    </div>
                  )}
                </div>

                {/* 入力フォーム ＆ 画像AI機能テストボタン */}
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
                  <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                    <span>💡 Chat: max {MAX_ESTIMATED_CREDITS.textAi} cr / Image AI: max {MAX_ESTIMATED_CREDITS.imageAi} cr</span>
                    <button
                      type="button"
                      onClick={handleRequestImageAiFeature}
                      className="text-blue-600 hover:underline font-semibold cursor-pointer"
                    >
                      Test Image AI Check
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}

export default ChatYamatoConcierge;