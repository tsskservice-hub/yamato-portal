/**
 * @file ChatYamatoKanjiGrammarCheckerVce.tsx
 * @description VCE漢字文法チェッカー専用AIチャットウィジェット（カスタムテーマ・ログインガード・クレジット管理対応版）
 */
import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * ChatYamatoKanjiGrammarCheckerVce のメタデータおよび仕様の型定義
 */
export interface ChatYamatoKanjiGrammarCheckerVceMetaType {
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
export const CHAT_YAMATO_KANJI_GRAMMAR_CHECKER_VCE_META: ChatYamatoKanjiGrammarCheckerVceMetaType = {
  componentName: "ChatYamatoKanjiGrammarCheckerVce",
  version: "3.8.0",
  role: "VCE漢字文法チェッカー専用AIチャットウィジェット（カスタムテーマ・ログインガード・クレジット管理・セッション自動検知・画像生成対応版）",
  features: [
    {
      featureName: "Login Guard & Auth Modal Trigger",
      description: "未ログインユーザーがチャットを利用しようとした際にガード画面を表示し、認証モーダルを開く"
    },
    {
      featureName: "Custom Theme Styling",
      description: "ボタンの枠線は紺、背景は薄めの桃色、文字色は黒のカスタムスタイルを適用"
    },
    {
      featureName: "Credits Moved Above Learning Pace",
      description: "クレジット残高表示ブロックをLearning Paceの上の位置に移動"
    },
    {
      featureName: "Smart 402 Credit Error Handling",
      description: "バックエンドからの ZERO_CREDITS および PARTIAL_SHORTAGE エラーをスマートにハンドリング"
    },
    {
      featureName: "External Image & Vision Support",
      description: "ページ側で選択された答案画像をプレビュー付きで受け取り、AI家庭教師に画像付きで質問送信可能"
    },
    {
      featureName: "Learning Pace Synchronization",
      description: "steady, normal, accelerated の学習ペース切替時に Supabase の profiles テーブルを即時更新"
    },
    {
      featureName: "Credit Cost & Feature Footer",
      description: "チャット下部にクレジット消費案内（Text / Photo / Visual Aid）を配置"
    }
  ],
  supportedThemes: ["custom-vce-kanji"],
  learningPaces: ["steady", "normal", "accelerated"]
};

type ChatMessage = {
  role: "assistant" | "user";
  content: string;
  imageUrl?: string;
};

// 💡 機能ごとの消費クレジット定義
const FEATURE_COSTS = {
  textAi: 2,           // 通常のテキストチャット
  imageAi: 4,          // 画像付きチャット（1枚）または画像生成AI
  multiImageAi: 6,     // 画像付きチャット（2枚）
};

// 外部から受け取るプロパティ（Props）の型定義
export type ChatYamatoKanjiGrammarCheckerVceProps = {
  defaultOpen?: boolean;
  floatingButtonClassName?: string;
  initialLearningPace?: "steady" | "normal" | "accelerated";
  userId?: string;
  userNickname?: string;
  credits?: number; // クレジット残高初期値
  onOpenAuth?: () => void; // 未ログイン時に認証モーダルを開くコールバック
  externalImageFile?: File | null;
  externalImagePreview?: string | null;
  onClearExternalImage?: () => void;
};

function sanitizeAiOutput(text: string): string {
  if (!text) return "";
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*/g, '');
}

export function ChatYamatoKanjiGrammarCheckerVce({
  defaultOpen = false,
  floatingButtonClassName,
  initialLearningPace = "normal",
  userId: propUserId,
  userNickname = "My friend",
  credits: initialCredits = 10,
  onOpenAuth,
  externalImagePreview,
  onClearExternalImage,
}: ChatYamatoKanjiGrammarCheckerVceProps) {
  const characterName = "漢字文法チェッカー for VCE";
  const initialGreeting = "Are you studying hard today? This is a handy tool that lets you see at a glance how many essential kanji and grammar points required for the VCE are included in your writing!";
  const appType = "kanji-grammar-checker-vce";
  const systemPrompt = "";

  const [isAiTutorOpen, setIsAiTutorOpen] = useState<boolean>(defaultOpen);
  const [isAiFullscreen, setIsAiFullscreen] = useState<boolean>(false);
  const aiChatRef = useRef<HTMLDivElement>(null);

  const [activeUserId, setActiveUserId] = useState<string | undefined>(propUserId);
  const [currentCredits, setCurrentCredits] = useState<number>(initialCredits);

  useEffect(() => {
    if (propUserId) {
      setActiveUserId(propUserId);
    }
  }, [propUserId]);

  useEffect(() => {
    setCurrentCredits(initialCredits);
  }, [initialCredits]);

  useEffect(() => {
    let isMounted = true;

    async function checkAuthSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id && isMounted && !activeUserId) {
          setActiveUserId(session.user.id);
          const { data: profileData } = await supabase
            .from('profiles')
            .select('credits')
            .eq('id', session.user.id)
            .single();
          if (profileData && typeof profileData.credits === 'number') {
            setCurrentCredits(profileData.credits);
          }
        }
      } catch (err) {
        console.error("Session check error in ChatYamatoKanjiGrammarCheckerVce:", err);
      }
    }

    if (!activeUserId) {
      checkAuthSession();
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (isMounted) {
        const newUid = session?.user?.id;
        setActiveUserId(newUid);
        if (newUid) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('credits')
            .eq('id', newUid)
            .single();
          if (profileData && typeof profileData.credits === 'number') {
            setCurrentCredits(profileData.credits);
          }
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [activeUserId]);

  const [chatFontSize, setChatFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base');

  const activeImagePreview = externalImagePreview || null;

  // ご要望のカスタムボタンスタイル（枠線：紺、背景：薄めの桃色、文字：黒）
  const customButtonStyle = {
    border: "2px solid #1e3a8a", // 紺 (navy/indigo系)
    background: "#fce7f3", // 薄めの桃色 (pink-100系)
    color: "#000000", // 黒
  };

  const finalFloatingButtonClass = floatingButtonClassName || "hover:opacity-90";

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

    if (!activeUserId) return;

    try {
      await supabase
        .from("profiles")
        .update({ learning_pace: newLevel })
        .eq("id", activeUserId);
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
      if (!document.fullscreenElement) setIsAiFullscreen(false);
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

  const refreshUserCredits = async () => {
    if (!activeUserId) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', activeUserId)
        .single();
      
      if (data && !error && typeof data.credits === 'number') {
        setCurrentCredits(data.credits);
      }
    } catch (err) {
      console.error("Failed to refresh credits:", err);
    }
  };

  const handleSendTutorMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!tutorInput.trim() && !activeImagePreview) || isTutorLoading) return;

    if (!activeUserId) {
      alert("お話しするには、無料サインアップまたはログインが必要です！");
      if (onOpenAuth) {
        onOpenAuth();
      }
      return;
    }

    if (currentCredits <= 0) {
      setTutorMessages((prev) => [
        ...prev,
        { role: "user", content: tutorInput.trim() || "Please check this photo." },
        {
          role: "assistant",
          content: `🌟 **[Zero Credits Remaining]**\n\nHello, my friend! It looks like your credit balance has reached zero. To continue our learning journey together, please top up your credits or choose an upgrade plan! 📚✨`
        }
      ]);
      setTutorInput("");
      return;
    }

    const hasImage = Boolean(activeImagePreview);
    const needsVisual = requestVisualAid;
    const requiredCost = (hasImage || needsVisual) ? FEATURE_COSTS.imageAi : FEATURE_COSTS.textAi;

    if (currentCredits < requiredCost) {
      setTutorMessages((prev) => [
        ...prev,
        { role: "user", content: tutorInput.trim() || "Please check this photo.", imageUrl: activeImagePreview || undefined },
        {
          role: "assistant",
          content: `⚠️ **[Insufficient Credits]**\n\nMy friend, your current balance (${currentCredits} credits) is not enough for this request (requires ${requiredCost} credits). 🪙`
        }
      ]);
      setTutorInput("");
      return;
    }

    const userMsg = tutorInput.trim() || (hasImage ? "Please check this attached photo." : "");
    const imageBase64 = activeImagePreview;

    setTutorInput("");
    setRequestVisualAid(false);
    if (onClearExternalImage) {
      onClearExternalImage();
    }

    const newMessages: ChatMessage[] = [
      ...tutorMessages,
      { role: "user", content: userMsg, imageUrl: imageBase64 || undefined },
    ];
    setTutorMessages(newMessages);
    setIsTutorLoading(true);

    try {
      const visualPrompt = needsVisual
        ? `Educational instructional diagram and visual aid for Japanese language learners explaining: ${userMsg}. Clean layout, high quality, professional illustration style.`
        : undefined;

      const isLocal = typeof window !== "undefined" && window.location.hostname === "localhost";
      const apiBaseUrl = isLocal ? "http://localhost:8787" : "https://api.jptutoraiyamato.com";

      const response = await fetch(`${apiBaseUrl}/chat`, {
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
          userId: activeUserId,
        }),
      });

      const responseText = await response.text();
      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(`サーバーからの応答がJSONではありません: ${responseText.slice(0, 100)}`);
      }

      if (!response.ok) {
        if (response.status === 402) {
          setIsTutorLoading(false);
          const errorCode = data?.error;
          if (errorCode === "ZERO_CREDITS") {
            setTutorMessages([
              ...newMessages,
              { role: "assistant", content: `🌟 **[Zero Credits Remaining]**\n\nHello, my friend! Please top up your credits to continue!` }
            ]);
            await refreshUserCredits();
            return;
          } else if (errorCode === "PARTIAL_SHORTAGE") {
            setTutorMessages([
              ...newMessages,
              { role: "assistant", content: `⚠️ **[Insufficient Credits]**\n\nMy friend, standard text chat (2 credits) is available, but this action requires more credits.` }
            ]);
            await refreshUserCredits();
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

  return (
    <>
      <aside aria-label="AI Yamato Kanji Grammar Checker" className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 font-sans">
        {!isAiTutorOpen ? (
          <button
            type="button"
            onClick={() => setIsAiTutorOpen(true)}
            style={customButtonStyle}
            className={`${finalFloatingButtonClass} font-bold px-4 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all cursor-pointer text-sm relative`}
          >
            <span>🤖</span>
            <span>{characterName}</span>
            {activeImagePreview && (
              <span className="w-2.5 h-2.5 bg-red-400 rounded-full animate-pulse"></span>
            )}
            {activeUserId && currentCredits < FEATURE_COSTS.textAi && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white text-[9px] font-bold flex items-center justify-center text-white">
                !
              </span>
            )}
          </button>
        ) : (
          <div
            ref={aiChatRef}
            className={`bg-white border-2 border-indigo-900 rounded-2xl p-5 shadow-2xl flex flex-col transition-all ${
              isAiFullscreen
                ? "w-screen h-screen rounded-none border-none p-6 sm:p-10 overflow-auto"
                : "w-80 sm:w-96 h-[540px] min-w-[280px] min-h-[380px] max-w-[90vw] max-h-[85vh] resize overflow-auto"
            }`}
          >
            <div className="w-full h-full flex flex-col">
              {/* ヘッダー */}
              <div className="flex items-center justify-between border-b pb-2 mb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-1.5 m-0">
                    <span className={isTutorLoading ? "inline-block animate-spin" : "inline-block"}>🤖</span> {characterName}
                  </h3>
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

              {/* クレジット残高表示セクション（学習ペースの上） */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-2 mb-2 flex items-center justify-between shrink-0">
                <span className="text-xs font-bold text-amber-800">Credits Balance</span>
                {activeUserId ? (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${currentCredits >= FEATURE_COSTS.textAi ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                    🪙 {currentCredits} credits
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    🔒 Guest
                  </span>
                )}
              </div>

              {/* 学習ペース選択UI */}
              <div className="bg-pink-50 border border-pink-200 rounded-xl p-2 mb-2 flex items-center justify-between shrink-0">
                <span className="text-xs font-bold text-pink-900">Learning Pace</span>
                <div className="inline-flex rounded-lg bg-white p-0.5 shadow-xs border border-slate-200">
                  {(["steady", "normal", "accelerated"] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => handlePaceChange(level)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold capitalize transition ${
                        tutorLevel === level ? "bg-pink-600 text-white shadow-xs" : "text-slate-600 hover:text-pink-700"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* フォントサイズ変更UI（Learning Paceと同じ桃色系に変更） */}
              <div className="bg-pink-50 border border-pink-200 rounded-xl p-2 mb-3 flex items-center justify-between shrink-0">
                <span className="text-xs font-bold text-pink-900">Font Size</span>
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
                          ? "bg-pink-600 text-white shadow-xs"
                          : "text-slate-600 hover:text-pink-700"
                      }`}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 未ログイン時の新規登録・ログインガード画面 */}
              {!activeUserId ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex-grow mb-3 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="text-3xl">🔒</div>
                  <h4 className="font-bold text-sm text-slate-800">Sign Up Required to Chat</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Please sign up or log in to chat with {characterName} and receive welcome credits!
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAiTutorOpen(false);
                      if (onOpenAuth) onOpenAuth();
                    }}
                    className="w-full py-2.5 bg-indigo-900 hover:bg-black text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer"
                  >
                    Sign In / Sign Up Now
                  </button>
                </div>
              ) : (
                <>
                  {/* チャット履歴エリア */}
                  <div className={`bg-slate-50 border border-slate-200 rounded-xl p-3 overflow-y-auto space-y-2.5 flex-grow mb-3 ${getFontSizeClass()}`}>
                    {tutorMessages.map((msg, idx) => (
                      <div key={idx} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                        <div
                          className={`max-w-[95%] p-2.5 rounded-xl leading-relaxed whitespace-pre-wrap ${
                            msg.role === "user"
                              ? "bg-pink-600 text-white rounded-br-xs"
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
                        <span>かんがえちゅう...</span>
                      </div>
                    )}
                  </div>

                  {/* 添付画像のプレビューバー */}
                  {activeImagePreview && (
                    <div className="flex items-center gap-2 bg-pink-50 border border-pink-200 px-2.5 py-1.5 rounded-lg text-xs mb-2 shrink-0">
                      <img src={activeImagePreview} alt="Preview" className="w-8 h-8 object-cover rounded border" />
                      <span className="truncate flex-grow text-pink-900 font-medium">Answer photo attached</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (onClearExternalImage) onClearExternalImage();
                        }}
                        className="text-red-600 hover:text-red-800 font-bold px-1 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* 入力フォーム（Upload Photo ボタンを削除） */}
                  <form onSubmit={handleSendTutorMessage} className="flex flex-col gap-2 shrink-0">
                    <div className="flex items-center justify-end">
                      <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={requestVisualAid}
                          onChange={(e) => setRequestVisualAid(e.target.checked)}
                          className="rounded border-slate-300 text-pink-600 focus:ring-pink-500 w-3.5 h-3.5"
                        />
                        <span>Visual Aid</span>
                      </label>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={tutorInput}
                        onChange={(e) => setTutorInput(e.target.value)}
                        placeholder={activeImagePreview ? "Ask feedback for photo..." : "Ask Yamato anything..."}
                        disabled={isTutorLoading}
                        className="flex-grow p-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 bg-slate-50/50"
                      />
                      <button
                        type="submit"
                        disabled={isTutorLoading || (!tutorInput.trim() && !activeImagePreview)}
                        className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        Send
                      </button>
                    </div>

                    {/* 消費クレジット案内 */}
                    <div className="text-[10px] text-slate-400 px-1 text-left">
                      💡 Text: {FEATURE_COSTS.textAi} cr / 1 Photo: {FEATURE_COSTS.imageAi} cr / Visual Aid: {FEATURE_COSTS.imageAi} cr
                    </div>
                  </form>
                </>
              )}
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

export default ChatYamatoKanjiGrammarCheckerVce;