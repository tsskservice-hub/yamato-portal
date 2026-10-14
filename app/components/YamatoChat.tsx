/**
 * @file YamatoChat.tsx
 * @description ヤマトAIチャットウィジェット（初期非表示対応・テーマカラー切り替え・Supabase即時更新対応版）
 */
import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient"; // ★ブラウザ用Supabaseクライアントのインポート（プロジェクトの構成に合わせてパスを調整してください）

type ChatMessage = {
  role: "assistant" | "user";
  content: string;
  imageUrl?: string;
};

// 外部から受け取るプロパティ（Props）の型定義
export type YamatoChatProps = {
  characterName?: string;        // チャット窓のタイトルに表示する名前（例: "やまと先生"）
  initialGreeting?: string;      // 最初の一言メッセージ
  systemPrompt?: string;         // キャラクター固有の指示（将来の拡張用）
  appType?: "concierge" | "writing" | "oral" | "general" | string;  
  additionalContext?: any;       // コンシェルジュ等に渡す追加のポータルデータ
  
  // 共通の初期非表示仕様とテーマカラー設定
  defaultOpen?: boolean;         // 初期状態で開いておくか（デフォルトは false＝非表示・折りたたみボタン）
  themeColor?: "emerald" | "blue" | string; // テーマカラー（"emerald" または "blue" など）
  
  // ★追加: 学習ペースの初期値と、Supabase更新用のユーザーID
  initialLearningPace?: "steady" | "normal" | "accelerated";
  userId?: string; 
};

// カラーテーマごとのスタイル定義（Tailwind CSSのクラスが静的解析で消えないよう完全なクラス名で記述）
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
  appType = "general",
  additionalContext,
  defaultOpen = false,      
  themeColor = "emerald",   
  initialLearningPace = "normal", 
  userId, // ★追加: ユーザーIDを受け取る
}: YamatoChatProps) {
  const [isAiTutorOpen, setIsAiTutorOpen] = useState<boolean>(defaultOpen);
  const [isAiFullscreen, setIsAiFullscreen] = useState<boolean>(false);
  const aiChatRef = useRef<HTMLDivElement>(null);

  // 選択されたテーマのスタイルセットを取得（存在しない場合は emerald をフォールバック）
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

  // 💡 props から渡される initialLearningPace が変わった時に同期させる
  useEffect(() => {
    if (initialLearningPace) {
      setTutorLevel(initialLearningPace);
    }
  }, [initialLearningPace]);

  // ★追加: ユーザーが学習ペースを変更した際に、ローカルステート更新とSupabaseの即時更新を行う関数
  const handlePaceChange = async (newLevel: "steady" | "normal" | "accelerated") => {
    setTutorLevel(newLevel); // 1. まずUI側のステートを即時反映

    if (!userId) {
      console.warn("userIdが渡されていないため、Supabaseのprofiles更新はスキップされました。");
      return;
    }

    try {
      // 2. Supabase の profiles テーブルを即時更新
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

  // 🎨 [開発中につき一時非表示] ユーザーが明示的に図解・イラスト生成を要求するためのチェックボックス用ステート
  const [requestVisualAid, setRequestVisualAid] = useState<boolean>(false);

  // 🔍 [開発中につき一時非表示] 拡大表示（モーダル）用のステート
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

  // 💡 ESCキーやブラウザ側の全画面解除に確実に対応し、元のデフォルトの大きさに戻す
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
    const needsVisual = requestVisualAid; // 🎨 チェック状態を保持

    setTutorInput("");
    setRequestVisualAid(false); // 送信後にチェックを自動リセット

    // 1. ユーザーのメッセージを履歴に追加
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
          userNickname: "テストゲストさん",
          appType: appType,
          systemPrompt: systemPrompt,
          visualPrompt: visualPrompt, 
          requestVisualAid: needsVisual,
          portalData: additionalContext, // コンシェルジュ用のポータルデータ（quizzes, price-plans等）を渡す
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

      // AIの「思考中」表示を終了し、一括でメッセージを画面に反映（デフォルト表示）
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
                      onClick={() => handlePaceChange(level)} // ★変更: クリック時にSupabase即時更新関数を実行
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

export default YamatoChat;