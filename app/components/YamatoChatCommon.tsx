/**
 * @file YamatoChatCommon.tsx
 * @description ヤマトAIチャットウィジェット（画像アップロード・フォントサイズ切替・全テーマカラー・Supabase即時更新・スマートクレジットエラー分岐完全統合版）
 */
import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * YamatoChatCommon のメタデータおよび仕様の型定義
 */
export interface YamatoChatCommonMetaType {
  componentName: string;
  version: string;
  role: string;
  features: {
    featureName: string;
    description: string;
  }[];
  supportedThemes: string[];
  learningPaces: string[];
}

/**
 * 構造化メタデータ（コード近接配置）
 */
export const YAMATO_CHAT_COMMON_META: YamatoChatCommonMetaType = {
  componentName: "YamatoChatCommon",
  version: "2.7.0",
  role: "ポータル共通AIチャットウィジェット（画像アップロード・フォントサイズ変更・全テーマカラー・Supabase即時更新・フルスクリーン切替・スマートクレジットエラー分岐対応）",
  features: [
    {
      featureName: "Image Upload & Vision Support",
      description: "手書き答案などの画像を選択・プレビュー付きでアップロードし、AI家庭教師に画像付きで質問送信可能"
    },
    {
      featureName: "Font Size Customization",
      description: "チャット内の文字サイズを「小・中・大・特大」の4段階に動的切替可能"
    },
    {
      featureName: "Theme Customization",
      description: "emerald, blue, yellow, purple, cyan, orange, black, green, navy などの多様なカラーテーマスタイルを動的に適用"
    },
    {
      featureName: "Learning Pace Synchronization",
      description: "steady, normal, accelerated の学習ペース切替時に Supabase の profiles テーブルを即時更新"
    },
    {
      featureName: "Fullscreen & Responsive Window",
      description: "チャット窓の最大化・縮小表示、およびリサイズ可能なフロートウィジェット設計"
    },
    {
      featureName: "Smart Credit Handling",
      description: "残高ゼロ（ZERO_CREDITS）と部分的な残高不足（PARTIAL_SHORTAGE）を検知し、温かい英語のメッセージで案内"
    }
  ],
  supportedThemes: ["emerald", "blue", "yellow", "purple", "cyan", "orange", "black", "green", "navy"],
  learningPaces: ["steady", "normal", "accelerated"]
};

type ChatMessage = {
  role: "assistant" | "user";
  content: string;
  imageUrl?: string;
};

// 外部から受け取るプロパティ（Props）の型定義
export type YamatoChatCommonProps = {
  characterName?: string;         // チャット窓のタイトルに表示する名前
  initialGreeting?: string;      // 最初の一言メッセージ
  systemPrompt?: string;          // キャラクター固有の指示
  appType?: "concierge" | "writing" | "oral" | "general" | string;  
  
  // 共通の初期非表示仕様とテーマカラー設定
  defaultOpen?: boolean;          // 初期状態で開いておくか
  themeColor?: "emerald" | "blue" | "yellow" | "purple" | "cyan" | "orange" | "black" | "green" | "navy" | string; 
  
  // 学習ペースの初期値、Supabase更新用のユーザーID、ユーザーのニックネーム
  initialLearningPace?: "steady" | "normal" | "accelerated";
  userId?: string; 
  userNickname?: string;          // ユーザーのニックネームを受け取るプロパティ
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
  initialGreeting = "Hello, my friend! 🌟 Welcome to Yamato AI Tutor. How can I assist your Japanese learning today?",
  systemPrompt = "",
  appType = "general",
  defaultOpen = false,      
  themeColor = "emerald",    
  initialLearningPace = "normal", 
  userId, 
  userNickname = "My friend", 
}: YamatoChatCommonProps) {
  const [isAiTutorOpen, setIsAiTutorOpen] = useState<boolean>(defaultOpen);
  const [isAiFullscreen, setIsAiFullscreen] = useState<boolean>(false);
  const aiChatRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // フォントサイズの管理ステート ('sm' | 'base' | 'lg' | 'xl')
  const [chatFontSize, setChatFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base');

  // 画像アップロード用ステート
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);

  // 選択されたテーマのスタイルセットを取得
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
  const [requestVisualAid, setRequestVisualAid] = useState<boolean>(false);

  // 拡大用画像モーダル用ステート
  const [modalImageSrc, setModalImageSrc] = useState<string | null>(null);

  useEffect(() => {
    if (initialLearningPace) {
      setTutorLevel(initialLearningPace);
    }
  }, [initialLearningPace]);

  const getFontSizeClass = () => {
    switch (chatFontSize) {
      case 'sm': return 'text-xs';
      case 'base': return 'text-sm';
      case 'lg': return 'text-base';
      case 'xl': return 'text-lg';
      default: return 'text-sm';
    }
  };

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

  // 画像選択ハンドラー
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendTutorMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!tutorInput.trim() && !selectedImage) || isTutorLoading) return;

    const userMsg = tutorInput.trim() || "Please check this answer image.";
    const needsVisual = requestVisualAid;
    const imageBase64 = selectedImagePreview;

    setTutorInput("");
    setSelectedImage(null);
    setSelectedImagePreview(null);
    setRequestVisualAid(false);
    if (fileInputRef.current) fileInputRef.current.value = '';

    const newMessages: ChatMessage[] = [
      ...tutorMessages, 
      { role: "user", content: userMsg, imageUrl: imageBase64 || undefined },
    ];
    setTutorMessages(newMessages);
    setIsTutorLoading(true);

    try {
      const visualPrompt = needsVisual
        ? `Educational instructional diagram and visual aid explaining: ${userMsg}. Clean layout, high quality, professional illustration style.`
        : undefined;

      // 💡 api.jptutoraiyamato.com/chat へリクエスト送信（imageBase64対応）
      const response = await fetch("https://api.jptutoraiyamato.com/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          history: tutorMessages.map(m => ({ role: m.role, content: m.content })),
          learningPace: tutorLevel,
          userNickname: userNickname,
          appType: appType,
          systemPrompt: systemPrompt,
          visualPrompt: visualPrompt, 
          requestVisualAid: needsVisual,
          imageBase64: imageBase64,
          userId: userId,
        }),
      });

      const responseText = await response.text();
      
      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch (parseErr) {
        throw new Error(`サーバーからの応答がJSONではありません: ${responseText.slice(0, 100)}`);
      }

      // 💡 クレジット不足エラー（402 Payment Required）のスマート分岐ハンドリング
      if (!response.ok) {
        if (response.status === 402) {
          setIsTutorLoading(false);
          const errorCode = data?.error;

          if (errorCode === "ZERO_CREDITS") {
            setTutorMessages([
              ...newMessages,
              {
                role: "assistant",
                content: `🌟 **[Zero Credits Remaining]**\n\nHello, my friend! It looks like your credit balance has reached zero. To continue our learning journey together, please top up your credits or choose an upgrade plan! 📚✨`
              }
            ]);
            return;
          } else if (errorCode === "PARTIAL_SHORTAGE") {
            setTutorMessages([
              ...newMessages,
              {
                role: "assistant",
                content: `⚠️ **[Insufficient Credits]**\n\nMy friend, this action requires more credits than your current balance. Don't worry—standard text chat (2 credits) is still available, or you can top up for full access! 💬`
              }
            ]);
            return;
          }
        }

        throw new Error(data?.error || `APIエラー (${response.status})`);
      }

      const replyText = data.reply || "I'm sorry, I couldn't generate a response.";
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
        { role: "assistant", content: `Sorry, an error occurred: ${err.message || "Communication error"}` },
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
            {selectedImagePreview && (
              <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse"></span>
            )}
          </button>
        ) : (
          <div
            ref={aiChatRef}
            className={`bg-white border-2 ${currentTheme.border} rounded-2xl p-5 shadow-2xl flex flex-col transition-all ${
              isAiFullscreen
                ? "w-screen h-screen rounded-none border-none p-6 sm:p-10 overflow-auto"
                : "w-80 sm:w-96 h-[540px] min-w-[280px] min-h-[380px] max-w-[90vw] max-h-[85vh] resize overflow-auto"
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

              {/* 学習ペース選択UI */}
              <div className={`${currentTheme.badgeBg} border rounded-xl p-2 mb-2 flex items-center justify-between shrink-0`}>
                <span className={`text-xs font-bold ${currentTheme.badgeText}`}>Learning Pace</span>
                <div className="inline-flex rounded-lg bg-white p-0.5 shadow-xs border border-slate-200">
                  {(["steady", "normal", "accelerated"] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => handlePaceChange(level)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold capitalize transition ${
                        tutorLevel === level ? currentTheme.buttonActive : currentTheme.buttonInactive
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* フォントサイズ変更UI（新規追加） */}
              <div className="bg-slate-100 border border-slate-200 rounded-xl p-2 mb-3 flex items-center justify-between shrink-0">
                <span className="text-xs font-bold text-slate-700">Font Size</span>
                <div className="inline-flex rounded-lg bg-white p-0.5 shadow-xs border border-slate-200">
                  {(
                    [
                      { key: 'sm', label: '小' },
                      { key: 'base', label: '中' },
                      { key: 'lg', label: '大' },
                      { key: 'xl', label: '特大' },
                    ] as const
                  ).map((size) => (
                    <button
                      key={size.key}
                      type="button"
                      onClick={() => setChatFontSize(size.key)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition ${
                        chatFontSize === size.key
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-slate-600 hover:text-blue-700"
                      }`}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* チャット履歴エリア（フォントサイズ反映） */}
              <div className={`bg-slate-50 border border-slate-200 rounded-xl p-3 overflow-y-auto space-y-2.5 flex-grow mb-3 ${getFontSizeClass()}`}>
                {tutorMessages.map((msg, idx) => (
                  <div key={idx} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                    <div
                      className={`max-w-[95%] p-2.5 rounded-xl leading-relaxed whitespace-pre-wrap ${
                        msg.role === "user"
                          ? currentTheme.userBubble
                          : "bg-white border border-slate-200 text-slate-800 rounded-bl-xs shadow-xs"
                      }`}
                    >
                      {msg.role === "user" ? (
                        <div>
                          {msg.content}
                          {msg.imageUrl && (
                            <div className="mt-2">
                              <img 
                                src={msg.imageUrl} 
                                alt="User Upload" 
                                className="rounded-lg max-h-36 object-cover cursor-pointer hover:opacity-90"
                                onClick={() => setModalImageSrc(msg.imageUrl || null)}
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div dangerouslySetInnerHTML={{ __html: msg.content }} />
                          {msg.imageUrl && (
                            <div className="mt-2">
                              <img 
                                src={msg.imageUrl} 
                                alt="AI Generated Visual Aid" 
                                className="rounded-lg border border-slate-200 max-h-48 object-contain w-full bg-white cursor-pointer hover:opacity-90"
                                onClick={() => setModalImageSrc(msg.imageUrl || null)}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isTutorLoading && (
                  <div className="flex items-center gap-2 text-xs text-slate-600 italic bg-white/80 border border-slate-200 p-2 rounded-xl w-fit shadow-xs">
                    <span className="inline-block animate-spin text-sm">🤖</span>
                    <span>Yamato is thinking & reading...</span>
                  </div>
                )}
              </div>

              {/* 添付画像のプレビューバー（新規追加） */}
              {selectedImagePreview && (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-2.5 py-1.5 rounded-lg text-xs mb-2 shrink-0">
                  <img src={selectedImagePreview} alt="Preview" className="w-8 h-8 object-cover rounded border" />
                  <span className="truncate flex-grow text-blue-900 font-medium">Answer photo attached</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedImage(null);
                      setSelectedImagePreview(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-red-600 hover:text-red-800 font-bold px-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* 入力フォーム */}
              <form onSubmit={handleSendTutorMessage} className="flex flex-col gap-2 shrink-0">
                <div className="flex items-center justify-between">
                  {/* 画像アップロード用隐藏ファイル入力 & ボタン（新規追加） */}
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer border border-slate-300"
                  >
                    <span>📷</span>
                    <span>{selectedImagePreview ? "Change Photo" : "Upload Photo"}</span>
                  </button>

                  <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={requestVisualAid} 
                      onChange={(e) => setRequestVisualAid(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                    />
                    <span>Visual Aid</span>
                  </label>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tutorInput}
                    onChange={(e) => setTutorInput(e.target.value)}
                    placeholder={selectedImagePreview ? "Ask feedback for photo..." : "Ask Yamato anything..."}
                    disabled={isTutorLoading}
                    className={`flex-grow p-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 ${currentTheme.inputRing} bg-slate-50/50`}
                  />
                  <button
                    type="submit"
                    disabled={isTutorLoading || (!tutorInput.trim() && !selectedImage)}
                    className={`px-4 py-2 ${currentTheme.submitBtn} font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 shrink-0`}
                  >
                    Send
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </aside>

      {/* 画像拡大表示モーダル */}
      {modalImageSrc && (
        <div 
          className="fixed inset-0 z-[2147483648] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setModalImageSrc(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button 
              onClick={() => setModalImageSrc(null)}
              className="absolute -top-10 right-0 text-white text-sm font-bold bg-black/50 px-3 py-1 rounded-full hover:bg-black/80 transition cursor-pointer"
            >
              ✕ Close
            </button>
            <img 
              src={modalImageSrc} 
              alt="Enlarged View" 
              className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl bg-white" 
            />
          </div>
        </div>
      )}
    </>
  );
}

export default YamatoChatCommon;