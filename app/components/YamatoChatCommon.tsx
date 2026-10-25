/**
 * @file YamatoChatCommon.tsx
 * @description ポータル共通AIチャットウィジェット（Learning Pace薄灰色統一・Credit Balance表記・全枠線4px完全統一・完全モジュール分離・外部答案画像連携・ヘッダー即時連動・クレジット消費案内復元版）
 * 💡 特徴：
 * 1. Learning Pace の背景を Font Size と同じ薄い灰色（bg-slate-100）に統一
 * 2. クレジット表示欄を「Credit Balance」表記に変更し、ChatYamatoEoyWritingCustomと同じ黄色調（bg-amber-50）に統一
 * 3. 閉じたフローティングボタンおよび開いたチャットウィンドウの枠線を 4px (border-4 & 4px solid) で完全統一
 * 4. useYamatoAccount による Supabase 通信・Realtime・クレジット同期の完全カプセル化
 * 5. chatThemes, ImageModal, ScrollTopButton, useChatResize, CreditCostFooter の分離による高い保守性
 * 6. eoy-writing 等のダッシュボードからの答案画像（externalImagePreview）および設問（assignedQuestion）自動連携
 * 7. 入力フォーム下部にクレジット消費案内（Text: 2 cr / 1 Photo: 4 cr / Visual Aid: 4 cr）を再表示
 */
import React, { useState, useEffect, useRef } from "react";

// 🌟 切り出した共通モジュール＆カスタムフックをインポート
import { themeStyles, type ThemeColorKey } from "../styles/chatThemes";
import { ScrollTopButton } from "./ScrollTopButton";
import { ImageModal } from "./ImageModal";
import { CreditCostFooter } from "./CreditCostFooter";
import { useChatResize } from "../hooks/useChatResize";
import { useYamatoAccount, getSafeString } from "../hooks/useYamatoAccount";

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

export const YAMATO_CHAT_COMMON_META: YamatoChatCommonMetaType = {
  componentName: "YamatoChatCommon",
  version: "4.9.0",
  role: "ポータル共通AIチャットウィジェット（UI配色完全統一版）",
  features: [
    {
      featureName: "Unified Slate Learning Pace Style",
      description: "Learning Paceの背景をFont Sizeと同じ薄い灰色に統一"
    },
    {
      featureName: "Credit Balance Header with Amber Theme",
      description: "アカウント表示をCredit Balanceに変更しChatYamatoEoyWritingCustomと共通の黄色い背景色を適用"
    },
    {
      featureName: "Uniform 4px Border Width",
      description: "閉じた起動ボタンおよび開いたチャット枠線の太さを4pxに完全統一"
    },
    {
      featureName: "Modular Architecture",
      description: "テーマ・モーダル・リサイズ・上戻りボタン・アカウント同期・フッター案内を完全分離"
    },
    {
      featureName: "Credit Cost Guide Footer",
      description: "入力欄下部にテキスト2cr / 写真4cr / Visual Aid 4cr の消費目安を明示"
    },
    {
      featureName: "Dashboard External Image & Question Integration",
      description: "eoy-writing等のダッシュボードから答案画像や選択設問を受け取りプレビュー・送信"
    },
    {
      featureName: "Type-Safe Dynamic Nickname Resolution",
      description: "getSafeString により null や非文字列の入力でも例外を完全に防止し安全にニックネームを反映"
    },
    {
      featureName: "Instant Credit Header Sync",
      description: "AI返答受信時に deductCredits を通じて yamato:credits-updated イベントを発行し即時ヘッダー同期"
    }
  ],
  supportedThemes: ["red", "blue", "black", "green", "yellow", "orange", "purple", "cyan", "pink", "custom"],
  learningPaces: ["steady", "normal", "accelerated"]
};

type ChatMessage = {
  role: "assistant" | "user";
  content: string;
  imageUrl?: string;
};

const FEATURE_COSTS = {
  textAi: 2,
  imageAi: 4,
};

export type YamatoChatCommonProps = {
  characterName?: string;
  initialGreeting?: string;
  systemPrompt?: string;
  appType?: "concierge" | "writing" | "oral" | "general" | string;
  defaultOpen?: boolean;
  themeColor?: string;
  floatingButtonClassName?: string;
  buttonStyle?: {
    border?: string;
    background?: string;
    color?: string;
  };
  initialLearningPace?: "steady" | "normal" | "accelerated";
  userId?: string;
  userNickname?: string;
  credits?: number;
  onOpenAuth?: (mode?: 'signin' | 'signup') => void;
  enableImageUpload?: boolean;
  externalImageFile?: File | null;
  externalImagePreview?: string | null;
  onClearExternalImage?: () => void;
  assignedQuestion?: string;
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
  themeColor = "#3b82f6",
  floatingButtonClassName,
  buttonStyle,
  initialLearningPace: propLearningPace,
  userId: propUserId,
  userNickname: propNickname,
  credits: propCredits,
  onOpenAuth,
  enableImageUpload = true,
  externalImageFile,
  externalImagePreview,
  onClearExternalImage,
  assignedQuestion = "",
}: YamatoChatCommonProps) {
  // アカウント同期フック
  const {
    activeUserId,
    currentCredits,
    currentNickname,
    learningPace: tutorLevel,
    refreshUserData: refreshUserCredits,
    deductCredits,
    updateLearningPace: handlePaceChange,
  } = useYamatoAccount({
    propUserId,
    propCredits,
    propNickname,
    propLearningPace,
  });

  // リサイズフック
  const { chatSize, startTopLeftResize } = useChatResize();

  const [isAiTutorOpen, setIsAiTutorOpen] = useState<boolean>(defaultOpen);
  const [isAiFullscreen, setIsAiFullscreen] = useState<boolean>(false);
  const aiChatRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (externalImagePreview) {
      setIsAiTutorOpen(true);
    }
  }, [externalImagePreview]);

  const handleTriggerAuth = (mode: 'signin' | 'signup' = 'signup') => {
    if (onOpenAuth) {
      onOpenAuth(mode);
    } else {
      window.dispatchEvent(new CustomEvent("open-auth-modal", { detail: { mode } }));
    }
  };

  const [chatFontSize, setChatFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);

  const activeImagePreview = selectedImagePreview || externalImagePreview || null;

  const isHexColor = themeColor.startsWith('#');
  const currentTheme = !isHexColor && themeStyles[themeColor as ThemeColorKey]
    ? themeStyles[themeColor as ThemeColorKey]
    : themeStyles.blue;
  
  const finalFloatingButtonClass = floatingButtonClassName || (isHexColor ? "text-white" : `${currentTheme.floatingBg} ${currentTheme.floatingText} ${currentTheme.floatingBorder}`);
  
  const floatingInlineStyle = {
    ...(buttonStyle?.border
      ? { border: buttonStyle.border.replace("2px", "4px").replace("1px", "4px") }
      : isHexColor
      ? { border: `4px solid ${themeColor}` }
      : {}),
    ...(buttonStyle?.background ? { backgroundColor: buttonStyle.background } : isHexColor ? { backgroundColor: themeColor } : {}),
    ...(buttonStyle?.color ? { color: buttonStyle.color } : {}),
  };

  const boxBorderInlineStyle = isHexColor ? { borderColor: themeColor } : undefined;

  const [tutorMessages, setTutorMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: initialGreeting,
    },
  ]);

  useEffect(() => {
    const validNick = getSafeString(currentNickname);
    if (validNick && typeof initialGreeting === "string") {
      setTutorMessages((prev) => {
        if (prev.length > 0 && prev[0]?.role === "assistant") {
          const updatedFirstMsg: ChatMessage = {
            ...prev[0],
            content: initialGreeting.replace(/my friend/gi, validNick),
          };
          return [updatedFirstMsg, ...prev.slice(1)];
        }
        return prev;
      });
    }
  }, [currentNickname, initialGreeting]);

  const [tutorInput, setTutorInput] = useState<string>("");
  const [isTutorLoading, setIsTutorLoading] = useState<boolean>(false);
  const [requestVisualAid, setRequestVisualAid] = useState<boolean>(false);
  const [modalImageSrc, setModalImageSrc] = useState<string | null>(null);

  const getFontSizeClass = () => {
    switch (chatFontSize) {
      case 'sm': return 'text-xs';
      case 'base': return 'text-sm';
      case 'lg': return 'text-base';
      case 'xl': return 'text-lg';
      default: return 'text-sm';
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
    if ((!tutorInput.trim() && !activeImagePreview) || isTutorLoading) return;

    if (!activeUserId) {
      alert("お話しするには、無料サインアップまたはログインが必要です！");
      handleTriggerAuth('signup');
      return;
    }

    const callName = getSafeString(currentNickname) || "my friend";

    if (currentCredits <= 0) {
      setTutorMessages((prev) => [
        ...prev,
        { role: "user", content: tutorInput.trim() },
        {
          role: "assistant",
          content: `🌟 **[Zero Credits Remaining]**\n\nHello, ${callName}! It looks like your credit balance has reached zero. To continue our learning journey together, please top up your credits or choose an upgrade plan! 📚✨`
        }
      ]);
      setTutorInput("");
      return;
    }

    const requiredCredits = (requestVisualAid || Boolean(activeImagePreview) || appType === "kanji-grammar-checker-ocr") ? 4 : 2;

    if (currentCredits < requiredCredits) {
      setTutorMessages((prev) => [
        ...prev,
        { role: "user", content: tutorInput.trim() },
        {
          role: "assistant",
          content: `⚠️ **[Insufficient Credits]**\n\n${callName}, your current balance (${currentCredits} credits) is not enough for this request (requires ${requiredCredits} credits). Please top up your account! 🪙`
        }
      ]);
      setTutorInput("");
      return;
    }

    const userMsg = tutorInput.trim() || (activeImagePreview ? "Please check this answer image." : "Hello Yamato!");
    const needsVisual = requestVisualAid;
    const imageBase64ToSend = activeImagePreview;

    setTutorInput("");
    setSelectedImage(null);
    setSelectedImagePreview(null);
    setRequestVisualAid(false);
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (onClearExternalImage) {
      onClearExternalImage();
    }

    const newMessages: ChatMessage[] = [
      ...tutorMessages,
      { role: "user", content: userMsg, imageUrl: imageBase64ToSend || undefined },
    ];
    setTutorMessages(newMessages);
    setIsTutorLoading(true);

    try {
      const visualPrompt = needsVisual
        ? `Educational instructional diagram and visual aid explaining: ${userMsg}. Clean layout, high quality, professional illustration style.`
        : undefined;

      const sendingNickname = getSafeString(currentNickname) || "My friend";

      const response = await fetch("https://api.jptutoraiyamato.com/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          history: tutorMessages.map(m => ({ role: m.role, content: m.content })),
          learningPace: tutorLevel,
          userNickname: sendingNickname,
          appType: appType,
          systemPrompt: systemPrompt,
          assignedQuestion: assignedQuestion,
          visualPrompt: visualPrompt,
          requestVisualAid: needsVisual,
          imageBase64: imageBase64ToSend,
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
              { role: "assistant", content: `🌟 **[Zero Credits Remaining]**\n\nHello, ${callName}! Please top up your credits to continue!` }
            ]);
            await refreshUserCredits();
            return;
          } else if (errorCode === "PARTIAL_SHORTAGE") {
            setTutorMessages([
              ...newMessages,
              { role: "assistant", content: `⚠️ **[Insufficient Credits]**\n\n${callName}, standard text chat (2 credits) is available, but this action requires more credits.` }
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

      deductCredits(requiredCredits);
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
        
        {/* 上に戻るボタン */}
        <ScrollTopButton floatingClass={finalFloatingButtonClass} inlineStyle={floatingInlineStyle} />

        {!isAiTutorOpen ? (
          <button
            type="button"
            onClick={() => setIsAiTutorOpen(true)}
            style={floatingInlineStyle}
            className={`${finalFloatingButtonClass} border-4 font-bold px-4 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all cursor-pointer text-sm relative`}
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
            style={
              isAiFullscreen 
                ? undefined 
                : { width: `${chatSize.width}px`, height: `${chatSize.height}px`, ...boxBorderInlineStyle }
            }
            className={`bg-white border-4 ${!isHexColor ? currentTheme.border : ''} rounded-2xl p-5 shadow-2xl flex flex-col transition-all ${
              isAiFullscreen
                ? "w-screen h-screen rounded-none border-none p-6 sm:p-10 overflow-auto"
                : "min-w-[280px] min-h-[380px] max-w-[90vw] max-h-[85vh] overflow-auto"
            }`}
          >
            <div className="w-full h-full flex flex-col">
              {/* ヘッダー */}
              <div className="flex items-center justify-between border-b pb-2 mb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <h3 className={`text-sm font-bold ${currentTheme.headerText} flex items-center gap-1.5 m-0`}>
                    <span className={isTutorLoading ? "inline-block animate-spin" : "inline-block"}>🤖</span>
                    {characterName}
                  </h3>
                  
                  {!isAiFullscreen && (
                    <button
                      type="button"
                      onMouseDown={startTopLeftResize}
                      title="ドラッグして左上方向にサイズ変更"
                      className="cursor-nw-resize text-slate-400 hover:text-slate-700 text-[11px] px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 transition flex items-center gap-0.5 select-none"
                    >
                      <span>↖</span>
                      <span className="text-[10px]">サイズ変更</span>
                    </button>
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

              {/* Credit Balance 表示エリア（ChatYamatoEoyWritingCustom と同じ黄色 bg-amber-50） */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-2 mb-2 flex items-center justify-between shrink-0">
                <span className="text-xs font-bold text-amber-800">Credit Balance</span>
                {activeUserId ? (
                  <div className="flex items-center gap-2">
                    {getSafeString(currentNickname) && (
                      <span className="text-[10px] text-slate-600 font-medium">
                        👤 {getSafeString(currentNickname)}
                      </span>
                    )}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${currentCredits >= FEATURE_COSTS.textAi ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                      🪙 {currentCredits} credits
                    </span>
                  </div>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    🔒 Guest
                  </span>
                )}
              </div>

              {/* 💡 【修正点】学習ペース選択UI（Font Size と同じ薄い灰色 bg-slate-100 に統一） */}
              <div className="bg-slate-100 border border-slate-200 rounded-xl p-2 mb-2 flex items-center justify-between shrink-0">
                <span className="text-xs font-bold text-slate-700">Learning Pace</span>
                <div className="inline-flex rounded-lg bg-white p-0.5 shadow-xs border border-slate-200">
                  {(["steady", "normal", "accelerated"] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => handlePaceChange(level)}
                      style={tutorLevel === level && isHexColor ? { backgroundColor: themeColor, color: '#ffffff' } : undefined}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold capitalize transition ${
                        tutorLevel === level ? currentTheme.buttonActive : currentTheme.buttonInactive
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* フォントサイズ変更UI（薄い灰色 bg-slate-100） */}
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
                      style={chatFontSize === size.key && isHexColor ? { backgroundColor: themeColor, color: '#ffffff' } : undefined}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition ${
                        chatFontSize === size.key
                          ? currentTheme.buttonActive
                          : currentTheme.buttonInactive
                      }`}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 設問バッジ */}
              {assignedQuestion && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-2 mb-3 flex items-center justify-between shrink-0">
                  <span className="text-xs font-bold text-indigo-900">Target Question</span>
                  <span className="text-xs font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-200 truncate max-w-[180px]">
                    {assignedQuestion}
                  </span>
                </div>
              )}

              {/* 未ログイン時のガード画面 */}
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
                      handleTriggerAuth('signup');
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
                          style={msg.role === "user" && isHexColor ? { backgroundColor: themeColor, color: '#ffffff' } : undefined}
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

                  {/* 添付画像のプレビューバー */}
                  {activeImagePreview && (
                    <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-2.5 py-1.5 rounded-lg text-xs mb-2 shrink-0">
                      <img src={activeImagePreview} alt="Preview" className="w-8 h-8 object-cover rounded border" />
                      <span className="truncate flex-grow text-blue-900 font-medium">
                        {externalImagePreview ? "Answer photo attached from Dashboard" : "Answer photo attached"}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedImage(null);
                          setSelectedImagePreview(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                          if (onClearExternalImage) onClearExternalImage();
                        }}
                        className="text-red-600 hover:text-red-800 font-bold px-1 cursor-pointer"
                        title="画像を削除"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* 入力フォーム */}
                  <form onSubmit={handleSendTutorMessage} className="flex flex-col gap-2 shrink-0">
                    <div className="flex items-center justify-between">
                      {enableImageUpload ? (
                        <>
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
                        </>
                      ) : (
                        <div />
                      )}

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
                        placeholder={activeImagePreview ? "Ask feedback for photo..." : "Ask Yamato anything..."}
                        disabled={isTutorLoading}
                        className={`flex-grow p-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 ${currentTheme.inputRing} bg-slate-50/50`}
                      />
                      <button
                        type="submit"
                        disabled={isTutorLoading || (!tutorInput.trim() && !activeImagePreview)}
                        style={isHexColor ? { backgroundColor: themeColor, color: '#ffffff' } : undefined}
                        className={`px-4 py-2 ${currentTheme.submitBtn} font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 shrink-0`}
                      >
                        Send
                      </button>
                    </div>

                    {/* クレジット消費案内 */}
                    <CreditCostFooter />
                  </form>
                </>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* 画像拡大表示モーダル */}
      {modalImageSrc && (
        <ImageModal src={modalImageSrc} onClose={() => setModalImageSrc(null)} />
      )}
    </>
  );
}

export default YamatoChatCommon;