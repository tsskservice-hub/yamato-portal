/**
 * @file ChatYamatoEoyWriting.tsx
 * @description VCE Writing Practice専用ヤマトAIチャットウィジェット（ダッシュボード画像・設問情報・クレジット残高・選択中設問ウィジェット統合版）
 */
import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient";

export interface ChatYamatoEoyWritingMetaType {
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

export const CHAT_YAMATO_EOY_WRITING_META: ChatYamatoEoyWritingMetaType = {
  componentName: "ChatYamatoEoyWriting",
  version: "3.7.0",
  role: "VCE Writing Practice専用AIチャットウィジェット（クレジット・選択中設問ウィジェット内移動版）",
  features: [
    {
      featureName: "Dashboard Image Integration",
      description: "ダッシュボード側でアップロードされた答案画像を受け取り、チャット内でプレビュー・送信"
    },
    {
      featureName: "Assigned Question Widget Integration",
      description: "Learning Pace等と同じデザインのブロックで、選択された質問情報をチャット内上部に分かりやすく表示"
    },
    {
      featureName: "Credits Moved to Widget Section",
      description: "クレジット残高表示をチャット内上部ウィジェット群の最上部に移動"
    },
    {
      featureName: "Login Guard & Auth Modal Trigger",
      description: "未ログインユーザーがチャットを利用しようとした際にガード画面を表示し、認証モーダルを開く"
    },
    {
      featureName: "Cyan Color Theme Fixed",
      description: "VCE Writing専用の水色（cyan）テーマをデフォルト固定"
    },
    {
      featureName: "Font Size Customization",
      description: "チャット内の文字サイズを4段階に動的切替可能"
    }
  ],
  supportedThemes: ["cyan"],
  learningPaces: ["steady", "normal", "accelerated"]
};

type ChatMessage = {
  role: "assistant" | "user";
  content: string;
  imageUrl?: string;
};

const FEATURE_COSTS = {
  textAi: 2,         // 通常のテキストチャット
  imageAi: 4,        // 画像付きチャット
};

export type ChatYamatoEoyWritingProps = {
  systemPrompt?: string;
  defaultOpen?: boolean;
  userId?: string;
  userNickname?: string;
  credits?: number;
  onOpenAuth?: () => void;
  // 💡 ダッシュボードから画像および設問情報を受け取るためのプロパティ
  externalImageFile?: File | null;
  externalImagePreview?: string | null;
  onClearExternalImage?: () => void;
  assignedQuestion?: string; // 💡 選択中の設問情報
};

const themeStyles = {
  cyan: {
    floatingBg: "bg-cyan-600 hover:bg-cyan-700",
    floatingText: "text-white",
    floatingBorder: "border border-cyan-400",
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
};

function sanitizeAiOutput(text: string): string {
  if (!text) return "";
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*/g, '');
}

export function ChatYamatoEoyWriting({
  systemPrompt = "",
  defaultOpen = false,
  userId: propUserId,
  userNickname = "My friend",
  credits: initialCredits = 10,
  onOpenAuth,
  externalImageFile,
  externalImagePreview,
  onClearExternalImage,
  assignedQuestion = "",
}: ChatYamatoEoyWritingProps) {
  const characterName = "Eoy Writing Practice";
  const appType = "eoy-writing";
  const initialGreeting = "Hello, my friend! 🌟 How are your studies going for the end-of-year written exam? I'm here to support your academic improvement with all my heart today too!";

  const [isAiTutorOpen, setIsAiTutorOpen] = useState<boolean>(defaultOpen);
  const [isAiFullscreen, setIsAiFullscreen] = useState<boolean>(false);
  const aiChatRef = useRef<HTMLDivElement>(null);

  const [activeUserId, setActiveUserId] = useState<string | undefined>(propUserId);
  const [currentCredits, setCurrentCredits] = useState<number>(initialCredits);

  useEffect(() => {
    if (propUserId) setActiveUserId(propUserId);
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
        console.error("Session check error:", err);
      }
    }

    if (!activeUserId) checkAuthSession();

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
  const [modalImageSrc, setModalImageSrc] = useState<string | null>(null);

  const currentTheme = themeStyles.cyan;
  const finalFloatingButtonClass = `${currentTheme.floatingBg} ${currentTheme.floatingText} ${currentTheme.floatingBorder}`;

  const [tutorMessages, setTutorMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: initialGreeting },
  ]);
  const [tutorInput, setTutorInput] = useState<string>("");
  const [isTutorLoading, setIsTutorLoading] = useState<boolean>(false);
  const [tutorLevel, setTutorLevel] = useState<"steady" | "normal" | "accelerated">("normal");
  const [requestVisualAid, setRequestVisualAid] = useState<boolean>(false);

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
      console.error("学習ペース更新エラー:", err);
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
    if ((!tutorInput.trim() && !externalImagePreview) || isTutorLoading) return;

    if (!activeUserId) {
      alert("お話しするには、無料サインアップまたはログインが必要です！");
      if (onOpenAuth) onOpenAuth();
      return;
    }

    if (currentCredits <= 0) {
      setTutorMessages((prev) => [
        ...prev,
        { role: "user", content: tutorInput.trim() },
        {
          role: "assistant",
          content: `🌟 **[Zero Credits Remaining]**\n\nHello, my friend! It looks like your credit balance has reached zero. Please top up your credits! 📚✨`
        }
      ]);
      setTutorInput("");
      return;
    }

    const requiredCost = externalImagePreview ? FEATURE_COSTS.imageAi : FEATURE_COSTS.textAi;
    if (currentCredits < requiredCost) {
      setTutorMessages((prev) => [
        ...prev,
        { role: "user", content: tutorInput.trim(), imageUrl: externalImagePreview || undefined },
        {
          role: "assistant",
          content: `⚠️ **[Insufficient Credits]**\n\nMy friend, your current balance (${currentCredits} credits) is not enough for this request (requires ${requiredCost} credits). 🪙`
        }
      ]);
      setTutorInput("");
      return;
    }

    const userMsg = tutorInput.trim() || "Please check this answer image.";
    const needsVisual = requestVisualAid;
    const imageBase64 = externalImagePreview;

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
        ? `Educational instructional diagram and visual aid explaining: ${userMsg}. Clean layout, high quality, professional illustration style.`
        : undefined;

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
          assignedQuestion: assignedQuestion,
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
              { role: "assistant", content: `🌟 **[Zero Credits Remaining]**\n\nPlease top up your credits to continue!` }
            ]);
            await refreshUserCredits();
            return;
          } else if (errorCode === "PARTIAL_SHORTAGE") {
            setTutorMessages([
              ...newMessages,
              { role: "assistant", content: `⚠️ **[Insufficient Credits]**\n\nStandard text chat (2 credits) is available, but this action requires more credits.` }
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
      <aside aria-label="AI Yamato" className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 font-sans">
        {!isAiTutorOpen ? (
          <button
            type="button"
            onClick={() => setIsAiTutorOpen(true)}
            className={`${finalFloatingButtonClass} font-bold px-4 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all cursor-pointer text-sm relative`}
          >
            <span>🤖</span>
            <span>{characterName}</span>
            {externalImagePreview && (
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
            className={`bg-white border-2 ${currentTheme.border} rounded-2xl p-5 shadow-2xl flex flex-col transition-all ${
              isAiFullscreen
                ? "w-screen h-screen rounded-none border-none p-6 sm:p-10 overflow-auto"
                : "w-80 sm:w-96 h-[540px] min-w-[280px] min-h-[380px] max-w-[90vw] max-h-[85vh] resize overflow-auto"
            }`}
          >
            <div className="w-full h-full flex flex-col">
              {/* ヘッダー（クレジット表示を削除） */}
              <div className="flex items-center justify-between border-b pb-2 mb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <h3 className={`text-sm font-bold ${currentTheme.headerText} flex items-center gap-1.5 m-0`}>
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

              {/* 💡 クレジット残高表示セクション（Learning Pace等の上部へ移動） */}
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

              {/* フォントサイズ変更UI */}
              <div className="bg-slate-100 border border-slate-200 rounded-xl p-2 mb-2 flex items-center justify-between shrink-0">
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

              {/* 💡 選択された質問番号表示UI（Fontsの下・Learning Pace等と同じデザイン） */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-2 mb-3 flex items-center justify-between shrink-0">
                <span className="text-xs font-bold text-indigo-900">Active Question</span>
                <span className="text-xs font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-200 truncate max-w-[170px]">
                  {assignedQuestion ? assignedQuestion.split(':')[0] : "None selected"}
                </span>
              </div>

              {/* 未ログインガード画面 */}
              {!activeUserId ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex-grow mb-3 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="text-3xl">🔒</div>
                  <h4 className="font-bold text-sm text-slate-800">Sign Up Required to Chat</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Please sign up or log in to chat with {characterName}!
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
                                    alt="AI Visual Aid"
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

                  {/* 💡 ダッシュボードから連携された添付画像のプレビューバー */}
                  {externalImagePreview && (
                    <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-2.5 py-1.5 rounded-lg text-xs mb-2 shrink-0">
                      <img src={externalImagePreview} alt="Preview" className="w-8 h-8 object-cover rounded border" />
                      <span className="truncate flex-grow text-blue-900 font-medium">Answer photo attached from Dashboard</span>
                      {onClearExternalImage && (
                        <button
                          type="button"
                          onClick={onClearExternalImage}
                          className="text-red-600 hover:text-red-800 font-bold px-1 cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  )}

                  {/* 入力フォーム */}
                  <form onSubmit={handleSendTutorMessage} className="flex flex-col gap-2 shrink-0">
                    <div className="flex items-center justify-end">
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
                        placeholder={externalImagePreview ? "Ask feedback for photo..." : "Ask Yamato anything..."}
                        disabled={isTutorLoading}
                        className={`flex-grow p-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 ${currentTheme.inputRing} bg-slate-50/50`}
                      />
                      <button
                        type="submit"
                        disabled={isTutorLoading || (!tutorInput.trim() && !externalImagePreview)}
                        className={`px-4 py-2 ${currentTheme.submitBtn} font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 shrink-0`}
                      >
                        Send
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                      <span>💡 Chat: {FEATURE_COSTS.textAi} cr / Image: {FEATURE_COSTS.imageAi} cr</span>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
      </aside>

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

export default ChatYamatoEoyWriting;