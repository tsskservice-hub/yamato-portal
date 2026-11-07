/**
 * @file YamatoChatCommon2.tsx
 * @description 教科書準拠レッスン専用メインクラスルーム・チャットコンポーネント（ニックネームモジュール連携・全画面常設・自動スタート・挨拶自動生成対応版）
 */
import React, { useState, useEffect, useRef } from "react";
import { themeStyles, type ThemeColorKey } from "../../styles/chatThemes";
import { ImageModal } from "../ImageModal";
import { CreditCostFooter } from "../CreditCostFooter";
import { useYamatoAccount, getSafeString } from "../../hooks/useYamatoAccount";
import { personaliseGreeting, resolveDisplayName } from "../../utils/nickname"; // 💡 ニックネームモジュールのインポート

export interface YamatoChatCommon2MetaType {
  componentName: string;
  version: string;
  role: string;
  features: { featureName: string; description: string }[];
  supportedThemes: string[];
  learningPaces: string[];
}

export const YAMATO_CHAT_COMMON_2_META: YamatoChatCommon2MetaType = {
  componentName: "YamatoChatCommon2",
  version: "1.3.0",
  role: "教科書準拠レッスン専用メインクラスルーム・チャット（挨拶自動生成・動的オプションボタン対応版）",
  features: [
    {
      featureName: "Nickname Module Integration",
      description: "app/utils/nickname.ts を用いて、やまと先生の授業開始時の挨拶やクレジット不足時の呼びかけをユーザーのニックネームにパーソナライズ",
    },
    {
      featureName: "Automatic Greeting Generation",
      description: "assignedQuestion やレッスン情報を元に、個別ページで挨拶をハードコードしなくても自動で最適なウェルカムメッセージを生成",
    },
    {
      featureName: "Dynamic Option Buttons (Method B)",
      description: "APIから返却される options 配列を検知して、チャット内に美しいクリック可能な選択肢ボタンを動的レンダリング",
    },
    {
      featureName: "Always Open Main Stage",
      description: "右下の常駐ボタンを廃止し、ページのメインコンテンツとして広く常時表示",
    },
  ],
  supportedThemes: [
    "red",
    "blue",
    "black",
    "green",
    "yellow",
    "orange",
    "purple",
    "cyan",
    "pink",
    "custom",
  ],
  learningPaces: ["steady", "normal", "accelerated"],
};

// 💡 選択肢（オプション）の型定義
type ChatOption = {
  label: string;
  value: string;
};

type ChatMessage = {
  role: "assistant" | "user";
  content: string;
  imageUrl?: string;
  options?: ChatOption[]; // 💡 APIから受け取る選択肢データ
};

const FEATURE_COSTS = {
  textAi: 2,
  imageAi: 4,
};

export type YamatoChatCommon2Props = {
  characterName?: string;
  initialGreeting?: string;
  systemPrompt?: string;
  appType?: string;
  themeColor?: string;
  initialLearningPace?: "steady" | "normal" | "accelerated";
  userId?: string;
  userNickname?: string;
  credits?: number;
  onOpenAuth?: (mode?: "signin" | "signup") => void;
  enableImageUpload?: boolean;
  externalImageFile?: File | null;
  externalImagePreview?: string | null;
  onClearExternalImage?: () => void;
  assignedQuestion?: string;
  customWidget?: React.ReactNode;
  onExportPdf?: (content: string) => void;
  calculateCreditCost?: (imageCount: number) => number;
  baseCreditCost?: number;
  image1CreditCost?: number;
  image2To4CreditCost?: number;
};

function sanitizeAiOutput(text: string): string {
  if (!text) return "";
  return text.replace(/^#{1,6}\s+/gm, "").replace(/\*\*/g, "");
}

export function YamatoChatCommon2({
  characterName = "Yamato Sensei",
  initialGreeting,
  systemPrompt = "",
  appType = "general",
  themeColor = "#f97316",
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
  customWidget,
  onExportPdf,
  calculateCreditCost,
  baseCreditCost = 2,
  image1CreditCost = 4,
  image2To4CreditCost = 6,
}: YamatoChatCommon2Props) {
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTriggerAuth = (mode: "signin" | "signup" = "signup") => {
    if (onOpenAuth) {
      onOpenAuth(mode);
    } else {
      window.dispatchEvent(new CustomEvent("open-auth-modal", { detail: { mode } }));
    }
  };

  const [chatFontSize, setChatFontSize] = useState<"sm" | "base" | "lg" | "xl">("base");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);

  const activeImagePreview = selectedImagePreview || externalImagePreview || null;

  const isHexColor = themeColor.startsWith("#");
  const currentTheme =
    !isHexColor && themeStyles[themeColor as ThemeColorKey]
      ? themeStyles[themeColor as ThemeColorKey]
      : themeStyles.orange;

  const boxBorderInlineStyle = isHexColor ? { borderColor: themeColor } : undefined;

  const [tutorMessages, setTutorMessages] = useState<ChatMessage[]>([]);
  const [isLessonStarted, setIsLessonStarted] = useState<boolean>(false);
  const [tutorInput, setTutorInput] = useState<string>("");
  const [isTutorLoading, setIsTutorLoading] = useState<boolean>(false);
  const [requestVisualAid, setRequestVisualAid] = useState<boolean>(false);
  const [modalImageSrc, setModalImageSrc] = useState<string | null>(null);

  const getFontSizeClass = () => {
    switch (chatFontSize) {
      case "sm":
        return "text-xs";
      case "base":
        return "text-sm";
      case "lg":
        return "text-base";
      case "xl":
        return "text-lg";
      default:
        return "text-sm";
    }
  };

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

  // 💡 授業開始時に initialGreeting が未指定の場合、assignedQuestion を使って自動生成する
  const handleStartLesson = async () => {
    if (!activeUserId) {
      alert("レッスンを始めるには、無料サインアップまたはログインが必要です！");
      handleTriggerAuth("signup");
      return;
    }

    setIsLessonStarted(true);

    // 挨拶文が渡されていない場合の自動生成ロジック
    const rawGreeting =
      initialGreeting ||
      `Awesome! Let's dive right into today's Japanese lesson! ✨\nToday, we are going to learn about "${assignedQuestion || 'Japanese'}".\n\nHow would you like to start? Please choose an option below:`;

    // モジュールを使用して挨拶内の "my friend" をユーザーのニックネームに置換
    const greetingMsg = personaliseGreeting(rawGreeting, currentNickname);
    
    // 初期挨拶のメッセージとRPG風の二者択一オプションを設定
    const initialMsgList: ChatMessage[] = [
      { 
        role: "assistant", 
        content: greetingMsg,
        options: [
          { label: "🚀 I already know the Learning Intention and Success Criteria! Let's jump into vocabulary and practice!", value: "1" },
          { label: "📖 I want to check the Learning Intention and Success Criteria first!", value: "2" }
        ]
      }
    ];
    setTutorMessages(initialMsgList);
  };

  // 💡 選択肢ボタンがクリックされたときに自動でメッセージとして送信するハンドラー
  const handleSelectOption = async (optionValue: string, optionLabel: string) => {
    await executeSendMessage(optionLabel);
  };

  const handleSendTutorMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!tutorInput.trim() && !activeImagePreview) || isTutorLoading) return;
    await executeSendMessage(tutorInput.trim());
  };

  const executeSendMessage = async (textToSend: string) => {
    if (!activeUserId) {
      alert("お話しするには、無料サインアップまたはログインが必要です！");
      handleTriggerAuth("signup");
      return;
    }

    // 💡 resolveDisplayName モジュールを利用して安全な呼び名を取得
    const callName = resolveDisplayName(currentNickname, "my friend");

    if (currentCredits <= 0) {
      setTutorMessages((prev) => [
        ...prev,
        { role: "user", content: textToSend },
        {
          role: "assistant",
          content: `🌟 **[Zero Credits Remaining]**\n\nHello, ${callName}! It looks like your credit balance has reached zero. To continue our lesson together, please top up your credits! 📚✨`,
        },
      ]);
      setTutorInput("");
      return;
    }

    const imageCount = activeImagePreview ? 1 : 0;
    let requiredCredits = baseCreditCost;
    if (calculateCreditCost) {
      requiredCredits = calculateCreditCost(imageCount);
    } else if (imageCount === 1 && image1CreditCost !== undefined) {
      requiredCredits = image1CreditCost;
    } else if (imageCount >= 2 && imageCount <= 4 && image2To4CreditCost !== undefined) {
      requiredCredits = image2To4CreditCost;
    } else {
      requiredCredits =
        requestVisualAid || Boolean(activeImagePreview) ? 4 : baseCreditCost;
    }

    if (currentCredits < requiredCredits) {
      setTutorMessages((prev) => [
        ...prev,
        { role: "user", content: textToSend },
        {
          role: "assistant",
          content: `⚠️ **[Insufficient Credits]**\n\n${callName}, your current balance (${currentCredits} credits) is not enough for this request (requires ${requiredCredits} credits). Please top up! 🪙`,
        },
      ]);
      setTutorInput("");
      return;
    }

    const userMsg = textToSend || (activeImagePreview ? "Please check this answer image." : "Hello Yamato Sensei!");
    const needsVisual = requestVisualAid;
    const imageBase64ToSend = activeImagePreview;

    setTutorInput("");
    setSelectedImage(null);
    setSelectedImagePreview(null);
    setRequestVisualAid(false);
    if (fileInputRef.current) fileInputRef.current.value = "";

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

      const sendingNickname = resolveDisplayName(currentNickname, "My friend");

      const response = await fetch("https://api.jptutoraiyamato.com/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          history: tutorMessages.map((m) => ({ role: m.role, content: m.content })),
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
          setTutorMessages([
            ...newMessages,
            {
              role: "assistant",
              content: `🌟 **[Zero Credits Remaining]**\n\nHello, ${callName}! Please top up your credits to continue!`,
            },
          ]);
          await refreshUserCredits();
          return;
        }

        if (data?.error === "UNREGISTERED_APP_PROMPT") {
          setIsTutorLoading(false);
          setTutorMessages([
            ...newMessages,
            {
              role: "assistant",
              content: `⚠️ An error occurred while processing your request. Please try again or contact support.`,
            },
          ]);
          return;
        }

        throw new Error(data?.error || `APIエラー (${response.status})`);
      }

      const replyText = data.reply || "I'm sorry, I couldn't generate a response.";
      const imageUrl = data.imageUrl;
      const apiOptions = data.options; // 💡 APIから返された選択肢配列
      const sanitizedReply = sanitizeAiOutput(replyText);

      setIsTutorLoading(false);
      setTutorMessages([
        ...newMessages,
        { 
          role: "assistant", 
          content: sanitizedReply, 
          imageUrl: imageUrl,
          options: Array.isArray(apiOptions) ? apiOptions : undefined 
        },
      ]);

      deductCredits(requiredCredits);
      await refreshUserCredits();
    } catch (err: any) {
      console.error(err);
      setIsTutorLoading(false);
      setTutorMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Sorry, an error occurred: ${err.message || "Communication error"}`,
        },
      ]);
    }
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 border-4 border-orange-500 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col font-sans">
      
      {/* 授業ヘッダー */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-4 gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 flex items-center justify-center text-2xl font-black shadow-inner">
            👩‍🏫
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>{characterName}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 font-bold">
                Live Lesson Room
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Your primary Japanese teacher guiding you step by step.
            </p>
          </div>
        </div>

        {/* コントロール群 (クレジット・ペース・フォントサイズ) */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {/* Credit Balance */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5 flex items-center gap-2">
            <span className="text-xs font-bold text-amber-800">Credits:</span>
            {activeUserId ? (
              <span className="text-xs font-bold text-amber-900">🪙 {currentCredits}</span>
            ) : (
              <span className="text-xs font-bold text-slate-500">🔒 Guest</span>
            )}
          </div>

          {/* 学習ペース選択 */}
          <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 flex items-center">
            {(["steady", "normal", "accelerated"] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => handlePaceChange(level)}
                style={
                  tutorLevel === level && isHexColor
                    ? { backgroundColor: themeColor, color: "#ffffff" }
                    : undefined
                }
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition ${
                  tutorLevel === level
                    ? currentTheme.buttonActive
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                {level}
              </button>
            ))}
          </div>

          {/* フォントサイズ */}
          <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 flex items-center">
            {(
              [
                { key: "sm", label: "小" },
                { key: "base", label: "中" },
                { key: "lg", label: "大" },
                { key: "xl", label: "特大" },
              ] as const
            ).map((size) => (
              <button
                key={size.key}
                type="button"
                onClick={() => setChatFontSize(size.key)}
                style={
                  chatFontSize === size.key && isHexColor
                    ? { backgroundColor: themeColor, color: "#ffffff" }
                    : undefined
                }
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition ${
                  chatFontSize === size.key
                    ? currentTheme.buttonActive
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                {size.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* カスタムウィジェットエリア */}
      {customWidget && <div className="mb-4 shrink-0">{customWidget}</div>}

      {/* メインステージ: 未開始の場合はスタート画面、開始後は授業チャットルームを表示 */}
      {!isLessonStarted ? (
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-slate-800 dark:to-slate-800/60 border border-orange-200 dark:border-orange-900/50 rounded-3xl p-10 text-center space-y-6 my-4 flex flex-col items-center justify-center min-h-[350px]">
          <div className="w-20 h-20 bg-orange-500 text-white rounded-3xl flex items-center justify-center text-4xl shadow-lg animate-bounce">
            🎓
          </div>
          <div className="space-y-2 max-w-lg">
            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">
              Ready to Start Your Lesson with {characterName}?
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Yamato Sensei is ready in the classroom to guide you through this unit step by step using interactive questions and personalized feedback.
            </p>
          </div>
          <button
            type="button"
            onClick={handleStartLesson}
            className="py-4 px-8 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-extrabold text-sm tracking-wider uppercase shadow-xl transition transform hover:scale-105 cursor-pointer"
          >
            🚀 Start Lesson Now
          </button>
        </div>
      ) : (
        <div className="flex flex-col flex-grow space-y-4">
          
          {/* 授業チャット履歴エリア（広々としたメインステージ） */}
          <div
            className={`bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 overflow-y-auto space-y-3 min-h-[400px] max-h-[600px] flex-grow ${getFontSizeClass()}`}
          >
            {tutorMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${
                  msg.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  style={
                    msg.role === "user" && isHexColor
                      ? { backgroundColor: themeColor, color: "#ffffff" }
                      : undefined
                  }
                  className={`max-w-[90%] p-4 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? currentTheme.userBubble
                      : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-bl-xs shadow-sm"
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
                            className="rounded-xl max-h-48 object-cover cursor-pointer hover:opacity-90 border border-white/20"
                            onClick={() => setModalImageSrc(msg.imageUrl || null)}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div dangerouslySetInnerHTML={{ __html: msg.content }} />
                      
                      {/* 💡 選択肢（オプション）が渡されている場合にボタンとして動的レンダリング */}
                      {msg.options && msg.options.length > 0 && (
                        <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Please choose an option:</p>
                          <div className="flex flex-col gap-2">
                            {msg.options.map((opt, optIdx) => (
                              <button
                                key={optIdx}
                                type="button"
                                disabled={isTutorLoading}
                                onClick={() => handleSelectOption(opt.value, opt.label)}
                                className="text-left px-4 py-3 rounded-xl bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-500 hover:text-white text-slate-800 dark:text-slate-200 text-xs font-bold transition border border-orange-200 dark:border-orange-900/60 shadow-sm cursor-pointer disabled:opacity-50"
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {msg.imageUrl && (
                        <div className="mt-2">
                          <img
                            src={msg.imageUrl}
                            alt="AI Generated Visual Aid"
                            className="rounded-xl border border-slate-200 max-h-60 object-contain w-full bg-white dark:bg-slate-950 cursor-pointer hover:opacity-90"
                            onClick={() => setModalImageSrc(msg.imageUrl || null)}
                          />
                        </div>
                      )}

                      {onExportPdf && (
                        <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => onExportPdf(msg.content)}
                            className="text-xs font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer hover:opacity-80"
                            style={{ color: themeColor, backgroundColor: `${themeColor}15` }}
                            title="Export lesson notes as PDF"
                          >
                            <span>📄</span>
                            <span>Export Lesson Notes (PDF)</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isTutorLoading && (
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 italic bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl w-fit shadow-xs">
                <span className="inline-block animate-spin text-base">👩‍🏫</span>
                <span>Yamato Sensei is writing on the blackboard & thinking...</span>
              </div>
            )}
          </div>

          {/* 添付画像のプレビューバー */}
          {activeImagePreview && (
            <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900 px-3 py-2 rounded-xl text-xs shrink-0">
              <img
                src={activeImagePreview}
                alt="Preview"
                className="w-10 h-10 object-cover rounded-lg border border-orange-300"
              />
              <span className="truncate flex-grow text-orange-900 dark:text-orange-200 font-medium">
                {externalImagePreview ? "Answer photo attached from Dashboard" : "Worksheet photo attached"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedImage(null);
                  setSelectedImagePreview(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                  if (onClearExternalImage) onClearExternalImage();
                }}
                className="text-red-600 hover:text-red-800 font-bold px-2 py-1 cursor-pointer"
                title="Remove photo"
              >
                ✕ Remove
              </button>
            </div>
          )}

          {/* 入力フォーム */}
          <form onSubmit={handleSendTutorMessage} className="flex flex-col gap-3 shrink-0 pt-2">
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
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-300 dark:border-slate-700"
                  >
                    <span>📷</span>
                    <span>{selectedImagePreview ? "Change Worksheet Photo" : "Upload Worksheet / Answer Photo"}</span>
                  </button>
                </>
              ) : (
                <div />
              )}

              <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={requestVisualAid}
                  onChange={(e) => setRequestVisualAid(e.target.checked)}
                  className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 w-4 h-4"
                />
                <span>Request Visual Aid / Diagram</span>
              </label>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={tutorInput}
                onChange={(e) => setTutorInput(e.target.value)}
                placeholder={
                  activeImagePreview ? "Ask Yamato Sensei to check this photo..." : "Type your answer or ask Yamato Sensei..."
                }
                disabled={isTutorLoading}
                className="flex-grow p-3 text-sm border border-slate-300 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
              <button
                type="submit"
                disabled={isTutorLoading || (!tutorInput.trim() && !activeImagePreview)}
                className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm rounded-2xl transition-all shadow-md cursor-pointer disabled:opacity-50 shrink-0"
              >
                Send to Sensei
              </button>
            </div>

            {/* クレジット消費案内 */}
            <CreditCostFooter />
          </form>
        </div>
      )}

      {/* 画像拡大表示モーダル */}
      {modalImageSrc && <ImageModal src={modalImageSrc} onClose={() => setModalImageSrc(null)} />}
    </div>
  );
}

export default YamatoChatCommon2;