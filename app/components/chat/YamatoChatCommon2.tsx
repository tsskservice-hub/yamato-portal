/**
 * @file YamatoChatCommon2.tsx
 * @description 教科書準拠レッスン専用メインクラスルーム・チャットコンポーネント（モジュール連携版・安定送信対応）
 */
import React from "react";
import { themeStyles, type ThemeColorKey } from "../../styles/chatThemes";
import { ImageModal } from "../ImageModal";
import { CreditCostFooter } from "../CreditCostFooter";
import { useYamatoChat2Logic } from "../../hooks/useYamatoChat2Logic";
import { YCC2ChatHeaderControls } from "./YCC2ChatHeaderControls";
import { YCC2ChatOptionButtons } from "./YCC2ChatOptionButtons";

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
  version: "1.4.1",
  role: "教科書準拠レッスン専用メインクラスルーム・チャット（モジュール分離・400エラー対策版）",
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
      featureName: "Stable Option Submission",
      description: "選択肢クリック時に値（value）ベースで送信し、API側の400エラーを完全に防止",
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

export function YamatoChatCommon2({
  characterName = "Yamato Sensei",
  initialGreeting,
  systemPrompt = "",
  appType = "general",
  themeColor = "#f97316",
  initialLearningPace,
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
  // チャットロジックをカスタムフックから取得
  const {
    activeUserId,
    currentCredits,
    tutorLevel,
    chatFontSize,
    setChatFontSize,
    tutorMessages,
    isLessonStarted,
    tutorInput,
    setTutorInput,
    isTutorLoading,
    requestVisualAid,
    setRequestVisualAid,
    modalImageSrc,
    setModalImageSrc,
    activeImagePreview,
    fileInputRef,
    handlePaceChange,
    handleImageChange,
    handleStartLesson,
    handleSelectOption,
    handleSendTutorMessage,
    clearSelectedImage,
  } = useYamatoChat2Logic({
    initialGreeting,
    systemPrompt,
    appType,
    initialLearningPace,
    userId: propUserId,
    userNickname: propNickname,
    credits: propCredits,
    onOpenAuth,
    externalImageFile,
    externalImagePreview,
    onClearExternalImage,
    assignedQuestion,
    calculateCreditCost,
    baseCreditCost,
    image1CreditCost,
    image2To4CreditCost,
  });

  const isHexColor = themeColor.startsWith("#");
  const currentTheme =
    !isHexColor && themeStyles[themeColor as ThemeColorKey]
      ? themeStyles[themeColor as ThemeColorKey]
      : themeStyles.orange;

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

  return (
    <div className="w-full bg-white dark:bg-slate-900 border-4 border-orange-500 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col font-sans">
      
      {/* ヘッダーコントロールモジュール */}
      <YCC2ChatHeaderControls
        characterName={characterName}
        activeUserId={activeUserId}
        currentCredits={currentCredits}
        tutorLevel={tutorLevel}
        chatFontSize={chatFontSize}
        themeColor={themeColor}
        onPaceChange={handlePaceChange}
        onFontSizeChange={setChatFontSize}
      />

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
              Yamato Sensei is ready in the classroom to guide you through this unit step by step using interactive questions and personalised feedback.
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
          
          {/* 授業チャット履歴エリア */}
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
                      
                      {/* 選択肢ボタンモジュール (valueを送信しつつ美しいlabelを表示) */}
                      <YCC2ChatOptionButtons
                        options={msg.options}
                        isLoading={isTutorLoading}
                        onSelect={(value, label) => handleSelectOption(value, label)}
                      />

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
                onClick={clearSelectedImage}
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
                    <span>{activeImagePreview ? "Change Worksheet Photo" : "Upload Worksheet / Answer Photo"}</span>
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