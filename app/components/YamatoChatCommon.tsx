/**
 * @file YamatoChatCommon.tsx
 * @description ヤマトAIチャットウィジェット（初期非表示対応・全テーマカラー・Supabase即時更新対応版）
 */
import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient";

type ChatMessage = {
  role: "assistant" | "user";
  content: string;
  imageUrl?: string;
};

// 外部から受け取るプロパティ（Props）の型定義
export type YamatoChatCommonProps = {
  characterName?: string;        // チャット窓のタイトルに表示する名前
  initialGreeting?: string;      // 最初の一言メッセージ
  systemPrompt?: string;         // キャラクター固有の指示
  appType?: "concierge" | "writing" | "oral" | "general" | string;  
  additionalContext?: any;       // コンシェルジュ等に渡す追加のポータルデータ
  
  // 共通の初期非表示仕様とテーマカラー設定
  defaultOpen?: boolean;         // 初期状態で開いておくか
  themeColor?: "emerald" | "blue" | "yellow" | "purple" | "cyan" | "orange" | "black" | "green" | "navy" | string; 
  
  // 学習ペースの初期値、Supabase更新用のユーザーID、ユーザーのニックネーム
  initialLearningPace?: "steady" | "normal" | "accelerated";
  userId?: string; 
  userNickname?: string;         // ← 【追加】ユーザーのニックネームを受け取るプロパティ
};

// カラーテーマごとのスタイル定義（全対応版）
const themeStyles = {
  emerald: {
    button: "bg-emerald-600 hover:bg-emerald-700 text-white",
    border: "border-emerald-300",
    headerText: "text-emerald-900",
    badgeBg: "bg-emerald-50 border-emerald-200",
    badgeText: "text-emerald-900",
    buttonActive: "bg-emerald-600 text-white shadow-xs",
    buttonInactive: "text-slate-600 hover:text-emerald-700",
    userBubble: "bg-emerald-600 text-white rounded-br-xs",
    inputRing: "focus:ring-emerald-500",
    submitBtn: "bg-emerald-600 hover:bg-emerald-700 text-white",
  },
  blue: {
    button: "bg-blue-600 hover:bg-blue-700 text-white",
    border: "border-blue-300",
    headerText: "text-blue-900",
    badgeBg: "bg-blue-50 border-blue-200",
    badgeText: "text-blue-900",
    buttonActive: "bg-blue-600 text-white shadow-xs",
    buttonInactive: "text-slate-600 hover:text-blue-700",
    userBubble: "bg-blue-600 text-white rounded-br-xs",
    inputRing: "focus:ring-blue-500",
    submitBtn: "bg-blue-600 hover:bg-blue-700 text-white",
  },
  yellow: {
    button: "bg-yellow-500 hover:bg-yellow-600 text-slate-900",
    border: "border-yellow-300",
    headerText: "text-yellow-900",
    badgeBg: "bg-yellow-50 border-yellow-200",
    badgeText: "text-yellow-900",
    buttonActive: "bg-yellow-500 text-slate-900 shadow-xs",
    buttonInactive: "text-slate-600 hover:text-yellow-700",
    userBubble: "bg-yellow-500 text-slate-900 rounded-br-xs",
    inputRing: "focus:ring-yellow-500",
    submitBtn: "bg-yellow-500 hover:bg-yellow-600 text-slate-900",
  },
  purple: {
    button: "bg-purple-600 hover:bg-purple-700 text-white",
    border: "border-purple-300",
    headerText: "text-purple-900",
    badgeBg: "bg-purple-50 border-purple-200",
    badgeText: "text-purple-900",
    buttonActive: "bg-purple-600 text-white shadow-xs",
    buttonInactive: "text-slate-600 hover:text-purple-700",
    userBubble: "bg-purple-600 text-white rounded-br-xs",
    inputRing: "focus:ring-purple-500",
    submitBtn: "bg-purple-600 hover:bg-purple-700 text-white",
  },
  cyan: {
    button: "bg-cyan-600 hover:bg-cyan-700 text-white",
    border: "border-cyan-300",
    headerText: "text-cyan-900",
    badgeBg: "bg-cyan-50 border-cyan-200",
    badgeText: "text-cyan-900",
    buttonActive: "bg-cyan-600 text-white shadow-xs",
    buttonInactive: "text-slate-600 hover:text-cyan-700",
    userBubble: "bg-cyan-600 text-white rounded-br-xs",
    inputRing: "focus:ring-cyan-500",
    submitBtn: "bg-cyan-600 hover:bg-cyan-700 text-white",
  },
  orange: {
    button: "bg-orange-500 hover:bg-orange-600 text-white",
    border: "border-orange-300",
    headerText: "text-orange-900",
    badgeBg: "bg-orange-50 border-orange-200",
    badgeText: "text-orange-900",
    buttonActive: "bg-orange-500 text-white shadow-xs",
    buttonInactive: "text-slate-600 hover:text-orange-700",
    userBubble: "bg-orange-500 text-white rounded-br-xs",
    inputRing: "focus:ring-orange-500",
    submitBtn: "bg-orange-500 hover:bg-orange-600 text-white",
  },
  black: {
    button: "bg-slate-900 hover:bg-black text-white",
    border: "border-slate-700",
    headerText: "text-slate-900",
    badgeBg: "bg-slate-100 border-slate-300",
    badgeText: "text-slate-900",
    buttonActive: "bg-slate-900 text-white shadow-xs",
    buttonInactive: "text-slate-600 hover:text-slate-900",
    userBubble: "bg-slate-900 text-white rounded-br-xs",
    inputRing: "focus:ring-slate-900",
    submitBtn: "bg-slate-900 hover:bg-black text-white",
  },
  green: {
    button: "bg-green-600 hover:bg-green-700 text-white",
    border: "border-green-300",
    headerText: "text-green-900",
    badgeBg: "bg-green-50 border-green-200",
    badgeText: "text-green-900",
    buttonActive: "bg-green-600 text-white shadow-xs",
    buttonInactive: "text-slate-600 hover:text-green-700",
    userBubble: "bg-green-600 text-white rounded-br-xs",
    inputRing: "focus:ring-green-500",
    submitBtn: "bg-green-600 hover:bg-green-700 text-white",
  },
  navy: {
    button: "bg-indigo-900 hover:bg-indigo-950 text-white",
    border: "border-indigo-300",
    headerText: "text-indigo-950",
    badgeBg: "bg-indigo-50 border-indigo-200",
    badgeText: "text-indigo-950",
    buttonActive: "bg-indigo-900 text-white shadow-xs",
    buttonInactive: "text-slate-600 hover:text-indigo-900",
    userBubble: "bg-indigo-900 text-white rounded-br-xs",
    inputRing: "focus:ring-indigo-900",
    submitBtn: "bg-indigo-900 hover:bg-indigo-950 text-white",
  },
};

function sanitizeAiOutput(text: string): string {
  if (!text) return "";
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*/g, '');
}

export function YamatoChatCommon({
  characterName = "ヤマト AI",
  initialGreeting = "こんにちは！日本語Tutor AI ヤマトです。何か話しかけてみてくださいね！",
  systemPrompt = "",
  appType = "general",
  additionalContext,
  defaultOpen = false,       
  themeColor = "emerald",    
  initialLearningPace = "normal", 
  userId, 
  userNickname = "My friend", // ← 【追加】受け取るプロパティ（未指定時は "My friend"）
}: YamatoChatCommonProps) {
  const [isAiTutorOpen, setIsAiTutorOpen] = useState<boolean>(defaultOpen);
  const [isAiFullscreen, setIsAiFullscreen] = useState<boolean>(false);
  const aiChatRef = useRef<HTMLDivElement>(null);

  // 選択されたテーマのスタイルセットを取得（存在しない場合は emerald）
  const currentTheme = themeStyles[themeColor as keyof typeof themeStyles] || themeStyles.emerald;

  const [tutorMessages, setTutorMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: initialGreeting,
    },
  ]);
  const [tutorInput, setTutorInput] = useState<string>("");
  const [isTutorLoading, setIsTutorLoading] = useState<boolean>(false);
  const [tutorLevel, setTutorLevel] = useState<"steady" | "normal" | "accelerated">(initialLearningPace);

  useEffect(() => {
    if (initialLearningPace) {
      setTutorLevel(initialLearningPace);
    }
  }, [initialLearningPace]);

  const handlePaceChange = async (newLevel: "steady" | "normal" | "accelerated") => {
    setTutorLevel(newLevel);

    if (!userId) {
      console.warn("userIdが渡されていないため、Supabaseのprofiles更新はスキップされました。");
      return;
    }

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

  const [requestVisualAid, setRequestVisualAid] = useState<boolean>(false);

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

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
        setIsAiFullscreen(false);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleSendTutorMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tutorInput.trim() || isTutorLoading) return;

    const userMsg = tutorInput.trim();
    const needsVisual = requestVisualAid;

    setTutorInput("");
    setRequestVisualAid(false);

    const newMessages: ChatMessage[] = [
      ...tutorMessages, 
      { role: "user", content: userMsg },
    ];
    setTutorMessages(newMessages);
    setIsTutorLoading(true);

    try {
      const visualPrompt = needsVisual
        ? `Educational instructional diagram and visual aid explaining: ${userMsg}. Clean layout, high quality, professional illustration style.`
        : undefined;

      const response = await fetch("https://api.jptutoraiyamato.com/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          history: tutorMessages.map(m => ({ role: m.role, content: m.content })),
          learningPace: tutorLevel,
          userNickname: userNickname, // ← 【変更】固定値 ("テストゲストさん") から受け取った変数に変更
          appType: appType,
          systemPrompt: systemPrompt,
          visualPrompt: visualPrompt, 
          requestVisualAid: needsVisual,
          portalData: additionalContext,
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
      const imageUrl = data.imageUrl;
      const sanitizedReply = sanitizeAiOutput(replyText);

      setIsTutorLoading(false);
      setTutorMessages([
        ...newMessages,
        { role: "assistant", content: sanitizedReply, imageUrl: imageUrl }
      ]);

    } catch (err: any) {
      console.error(err);
      setIsTutorLoading(false);
      setTutorMessages((prev) => [
        ...prev,
        { role: "assistant", content: `エラーが発生しました: ${err.message || "通信エラー"}` },
      ]);
    }
  };

  return (
    <>
      <aside aria-label="AI Yamato" className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 font-sans">
        {!isAiTutorOpen ? (
          <button
            type="button"
            onClick={() => setIsAiTutorOpen(true)}
            className={`${currentTheme.button} font-bold px-4 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all cursor-pointer text-sm`}
          >
            <span>🤖</span>
            <span>{characterName}</span>
          </button>
        ) : (
          <div
            ref={aiChatRef}
            className={`bg-white border-2 ${currentTheme.border} rounded-2xl p-5 shadow-2xl flex flex-col transition-all ${
              isAiFullscreen
                ? "w-screen h-screen rounded-none border-none p-6 sm:p-10 overflow-auto"
                : "w-80 sm:w-96 h-[500px] min-w-[280px] min-h-[350px] max-w-[90vw] max-h-[85vh] resize overflow-auto"
            }`}
          >
            <div className="w-full h-full flex flex-col">
              {/* ヘッダー */}
              <div className="flex items-center justify-between border-b pb-2 mb-3 shrink-0">
                <h3 className={`text-sm font-bold ${currentTheme.headerText} flex items-center gap-2 m-0`}>
                  <span className={isTutorLoading ? "inline-block animate-spin" : "inline-block"}>🤖</span> {characterName}
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
                接続先: <code>api.jptutoraiyamato.com/chat</code> (Mode: <code>{appType}</code>)
              </p>

              {/* 学習ペース選択UI */}
              <div className={`${currentTheme.badgeBg} border rounded-xl p-2.5 mb-3 flex items-center justify-between shrink-0`}>
                <span className={`text-xs font-bold ${currentTheme.badgeText}`}>Learning Pace</span>
                <div className="inline-flex rounded-lg bg-white p-0.5 shadow-xs border border-slate-200">
                  {(["steady", "normal", "accelerated"] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => handlePaceChange(level)}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold capitalize transition ${
                        tutorLevel === level ? currentTheme.buttonActive : currentTheme.buttonInactive
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
                          ? currentTheme.userBubble
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
                  <div className="flex items-center gap-2 text-xs text-slate-600 italic bg-white/80 border border-slate-200 p-2 rounded-xl w-fit shadow-xs">
                    <span className="inline-block animate-spin text-sm">🤖</span>
                    <span>ヤマトが考えています...</span>
                  </div>
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
                    className={`flex-grow p-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 ${currentTheme.inputRing} bg-slate-50/50`}
                  />
                  <button
                    type="submit"
                    disabled={isTutorLoading || !tutorInput.trim()}
                    className={`px-4 py-2 ${currentTheme.submitBtn} font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 shrink-0`}
                  >
                    送信
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

export default YamatoChatCommon;