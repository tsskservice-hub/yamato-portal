/**
 * @file ChatYamatoConcierge.tsx
 * @description ヤマトポータル（_index.tsx）本番用のコンシェルジュヤマト専用チャットウィジェット（未ログインガード・userId送信・クレジット連動・リロードなし残高同期・スマートクレジットエラー分岐対応版）
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

// 💡 機能ごとの消費クレジット定義（バックエンドの credit-rules.ts と完全に一致）
const FEATURE_COSTS = {
  textAi: 2,         // 通常のテキストチャット
  imageAi: 4,        // 画像付きチャット・ビジュアル解説
  voiceDrill: 3,     // 音声ドリル
  voiceElaborate: 4, // 音声詳細応答
  mockSection1: 6,   // 模試 Sec1
  mockSection2: 6,   // 模試 Sec2
  mockFull: 10,      // フル模試
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
  credits: initialCredits = 10,
  onOpenAuth
}: ChatYamatoConciergeProps) {
  const [isAiTutorOpen, setIsAiTutorOpen] = useState<boolean>(false);
  const [isAiFullscreen, setIsAiFullscreen] = useState<boolean>(false);
  const aiChatRef = useRef<HTMLDivElement>(null);

  // 💡 コンポーネント内でクレジット残高を管理するステート（リアルタイム更新用）
  const [currentCredits, setCurrentCredits] = useState<number>(initialCredits);

  // 親から渡された初期 credits が更新されたら反映
  useEffect(() => {
    setCurrentCredits(initialCredits);
  }, [initialCredits]);

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

  // 💡 Supabaseから最新のクレジット残高を非同期で再取得する関数
  const refreshUserCredits = async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', userId)
        .single();
      
      if (data && !error && typeof data.credits === 'number') {
        setCurrentCredits(data.credits);
      }
    } catch (err) {
      console.error("Failed to refresh credits:", err);
    }
  };

  // メッセージ送信処理（未ログインガード ＆ userId ＆ 402スマートクレジットエラー分岐ハンドリング）
  const handleSendTutorMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tutorInput.trim() || isTutorLoading) return;

    // 💡 ガード1: 未ログインの場合はチャットをブロックして認証モーダルを開く
    if (!userId) {
      alert("やまと先生とお話しするには、無料サインアップまたはログインが必要です！");
      if (onOpenAuth) {
        onOpenAuth();
      }
      return;
    }

    // 💡 ガード2: クレジット残高が完全にゼロの場合の事前ブロック
    if (currentCredits <= 0) {
      setTutorMessages((prev) => [
        ...prev,
        { role: "user", content: tutorInput.trim() },
        {
          role: "assistant",
          content: `🚨 **[クレジット残高ゼロ]**\n\n現在クレジットがありません。学習を継続するにはプランのアップグレードまたはクレジットの追加が必要です。\n\n💡 料金プランページよりクレジットを追加してください。`
        }
      ]);
      setTutorInput("");
      return;
    }

    // 💡 ガード3: クレジット残高がテキストチャットの最低コスト（2クレジット）に満たない場合
    if (currentCredits < FEATURE_COSTS.textAi) {
      setTutorMessages((prev) => [
        ...prev,
        { role: "user", content: tutorInput.trim() },
        {
          role: "assistant",
          content: `⚠️ **[クレジット残高不足]**\n\n現在の残高（${currentCredits}クレジット）ではテキストチャット（2クレジット）を行うことができません。\n\n💡 デイリークイズやプラン購入で補充してください。`
        }
      ]);
      setTutorInput("");
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
          chatHistory: tutorMessages.map(m => ({ role: m.role, content: m.content })),
          learningPace: tutorLevel,
          userNickname: "my friend",
          appType: "concierge",
          portalData: portalContextPayload,
          userId: userId, // ★重要：バックエンドでクレジットを減算するためにユーザーIDを確実に送信
        }),
      });

      const responseText = await response.text();
      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch (parseErr) {
        throw new Error(`サーバーからの応答がJSONではありません: ${responseText.slice(0, 100)}`);
      }

      // 💡 402エラー（スマートクレジットエラー分岐）のハンドリング
      if (!response.ok) {
        if (response.status === 402) {
          setIsTutorLoading(false);
          const errorCode = data?.error;
          const msgContent = data?.message || "クレジットが不足しています。";

          if (errorCode === "ZERO_CREDITS") {
            setTutorMessages([
              ...newMessages,
              {
                role: "assistant",
                content: `🚨 **[クレジット残高ゼロ]**\n\n${msgContent}\n\n💡 学習を続けるには、料金プランページよりクレジットを追加してください。`
              }
            ]);
            await refreshUserCredits();
            return;
          } else if (errorCode === "PARTIAL_SHORTAGE") {
            setTutorMessages([
              ...newMessages,
              {
                role: "assistant",
                content: `⚠️ **[クレジット残高不足]**\n\n${msgContent}\n\n💬 テキストチャット（2クレジット）であればまだご利用いただけます。`
              }
            ]);
            await refreshUserCredits();
            return;
          }
        }

        throw new Error(data?.error || data?.reply || `APIエラー (${response.status})`);
      }

      const replyText = data.reply || "I'm sorry, I couldn't generate a response.";
      const sanitizedReply = sanitizeAiOutput(replyText);
      const aiImageUrl = data.imageUrl; // バックエンドから返却される可能性のある画像URL

      setIsTutorLoading(false);
      setTutorMessages([
        ...newMessages,
        { role: "assistant", content: sanitizedReply, imageUrl: aiImageUrl }
      ]);

      // 💡 リロードせず、バックグラウンドで最新のクレジット残高を非同期取得して更新
      await refreshUserCredits();

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
    if (!userId) {
      alert("ログインが必要です");
      if (onOpenAuth) onOpenAuth();
      return false;
    }
    if (currentCredits < FEATURE_COSTS.imageAi) {
      alert(`画像生成AIを利用するには ${FEATURE_COSTS.imageAi} クレジット必要ですが、現在の残高は ${currentCredits} クレジットです（※テキストチャット（2クレジット）ならまだご利用いただけます）。`);
      return false;
    }
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
          {userId && currentCredits < FEATURE_COSTS.textAi && (
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
                {userId ? (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${currentCredits >= FEATURE_COSTS.textAi ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    🪙 {currentCredits} credits
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    🔒 Guest (Login Required)
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

            {/* 学習ペース選択UI */}
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

            {/* 未ログイン時のガード画面 */}
            {!userId ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex-grow mb-3 flex flex-col items-center justify-center text-center space-y-3">
                <div className="text-3xl">🔒</div>
                <h4 className="font-bold text-sm text-slate-800">Sign Up Required to Chat</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Please sign up or log in to chat with Yamato-sensei and receive 10 welcome credits!
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsAiTutorOpen(false);
                    if (onOpenAuth) onOpenAuth();
                  }}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  Sign In / Sign Up Now
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
                            {msg.imageUrl && (
                              <div className="mt-2">
                                <img 
                                  src={msg.imageUrl} 
                                  alt="AI Generated Visual Aid" 
                                  className="rounded-lg border border-slate-200 max-h-48 object-contain w-full bg-white" 
                                />
                              </div>
                            )}
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
                    <span>💡 Chat: {FEATURE_COSTS.textAi} cr / Image: {FEATURE_COSTS.imageAi} cr</span>
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