/**
 * @file ChatYamatoEoyWritingCustom.tsx
 * @description 生徒持参問題＆答案対応 VCE Writing 3セクション添削専用AIチャット
 * 💡 特徴：
 * 1. Escキーでのフルスクリーン解除時に元のウィンドウサイズへ確実に復帰
 * 2. Select Writing Section & Learning Pace の背景を Font Size と同じ薄い灰色（bg-slate-100）に統一
 * 3. useYamatoAccount による Supabase認証・Realtime・クレジット残高・ヘッダー連動の完全カプセル化
 * 4. FeedbackPdfModal による先生用添削編集・備考（P.S.）追加＆高品質PDF印刷機能
 * 5. CreditCostFooter, ImageModal, ScrollTopButton, useChatResize による共通UI・操作の外部化
 */
import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { fetchYamatoConfigsData, BotConfig } from "../data/yamato-configs";

// 🌟 切り出した共通モジュール＆カスタムフック群
import { themeStyles } from "../styles/chatThemes";
import { ScrollTopButton } from "./ScrollTopButton";
import { ImageModal } from "./ImageModal";
import { CreditCostFooter } from "./CreditCostFooter";
import { FeedbackPdfModal } from "./FeedbackPdfModal";
import { useChatResize } from "../hooks/useChatResize";
import { useYamatoAccount, getSafeString } from "../hooks/useYamatoAccount";

export interface ChatYamatoEoyWritingCustomMetaType {
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

export const CHAT_YAMATO_EOY_WRITING_CUSTOM_META: ChatYamatoEoyWritingCustomMetaType = {
  componentName: "ChatYamatoEoyWritingCustom",
  version: "6.2.0",
  role: "生徒持参問題・直書き＆画像両対応 VCE Writing 3セクション対応 添削・フィードバック専用AIチャット（フルスクリーン復帰＆UI統一版）",
  features: [
    {
      featureName: "Fullscreen Escape Restoration",
      description: "Escキーやブラウザ側の全画面解除時に元の通常サイズへ正確に復帰"
    },
    {
      featureName: "Unified Slate UI Style",
      description: "Writing Section と Learning Pace の背景を Font Size と同じ薄い灰色に統一"
    },
    {
      featureName: "External Editable Feedback for PDF Export",
      description: "FeedbackPdfModal により先生が添削本文を推敲し、備考（P.S.）を添えて高品質なPDFレポートとして印刷・保存可能"
    },
    {
      featureName: "Modular Architecture",
      description: "アカウント同期、リサイズ、クレジット案内、画像モーダル等を外部委託し高い保守性を実現"
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

export type ChatYamatoEoyWritingCustomProps = {
  systemPrompt?: string;
  defaultOpen?: boolean;
  userId?: string;
  userNickname?: string;
  credits?: number;
  initialLearningPace?: "steady" | "normal" | "accelerated";
  onOpenAuth?: (mode?: 'signin' | 'signup') => void;
  externalQuestionFiles?: File[];
  externalImageFile?: File | null;
  externalImagePreview?: string | null;
  onClearExternalImage?: () => void;
  assignedQuestion?: string;
};

function sanitizeAiOutput(text: string): string {
  if (!text) return "";
  return text.replace(/^#{1,6}\s+/gm, '').replace(/\*\*/g, '');
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export function ChatYamatoEoyWritingCustom({
  systemPrompt = "",
  defaultOpen = false,
  userId: propUserId,
  userNickname: propNickname = "My friend",
  credits: propCredits,
  initialLearningPace: propLearningPace,
  onOpenAuth,
  externalQuestionFiles = [],
  externalImageFile,
  externalImagePreview,
  onClearExternalImage,
  assignedQuestion = "",
}: ChatYamatoEoyWritingCustomProps) {
  const appType = "eoy-writing-custom";

  // 🌟 アカウント・クレジット同期フック
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

  // 🌟 ウィンドウリサイズフック
  const { chatSize, startTopLeftResize } = useChatResize();

  // Supabase からの動的ボット設定ロード
  const [config, setConfig] = useState<BotConfig | null>(null);
  useEffect(() => {
    async function loadConfig() {
      try {
        const configsData = await fetchYamatoConfigsData(supabase);
        if (configsData && configsData[appType]) {
          setConfig(configsData[appType]);
        }
      } catch (err) {
        console.error("Failed to load eoy-writing-custom config:", err);
      }
    }
    loadConfig();
  }, [appType]);

  const characterName = config?.name || "VCE Writing Tutor (Yamato)";
  const themeColor = config?.themeColor || "#06b6d4";

  const [isAiTutorOpen, setIsAiTutorOpen] = useState<boolean>(defaultOpen);
  const [isAiFullscreen, setIsAiFullscreen] = useState<boolean>(false);
  const aiChatRef = useRef<HTMLDivElement>(null);

  // 💡 VCE Writing セクション選択 ("section2b" | "section3" | "other")
  const [writingSection, setWritingSection] = useState<"section2b" | "section3" | "other">("section2b");

  // 💡 PDFモーダル用：編集対象とするAI返答テキスト
  const [pdfTargetContent, setPdfTargetContent] = useState<string | null>(null);

  const [chatFontSize, setChatFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base');
  const [modalImageSrc, setModalImageSrc] = useState<string | null>(null);

  const initialGreeting = config?.greeting || "Hello, my friend! 🌟 Please select your writing section (Section 2 Part B, Section 3, or Other) and share your brought question and answer. I am ready to give you detailed VCE feedback!";

  const [tutorMessages, setTutorMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: initialGreeting },
  ]);
  const [tutorInput, setTutorInput] = useState<string>("");
  const [isTutorLoading, setIsTutorLoading] = useState<boolean>(false);
  const [requestVisualAid, setRequestVisualAid] = useState<boolean>(false);

  // 答案画像が渡されたら自動で開く
  useEffect(() => {
    if (externalImagePreview) {
      setIsAiTutorOpen(true);
    }
  }, [externalImagePreview]);

  // ニックネームに応じた挨拶の反映
  useEffect(() => {
    const validNick = getSafeString(currentNickname);
    if (validNick && config?.greeting) {
      setTutorMessages([{ role: "assistant", content: config.greeting.replace(/my friend/gi, validNick) }]);
    }
  }, [config?.greeting, currentNickname]);

  const handleTriggerAuth = (mode: 'signin' | 'signup' = 'signup') => {
    if (onOpenAuth) {
      onOpenAuth(mode);
    } else {
      window.dispatchEvent(new CustomEvent("open-auth-modal", { detail: { mode } }));
    }
  };

  const getFontSizeClass = () => {
    switch (chatFontSize) {
      case 'sm': return 'text-xs';
      case 'base': return 'text-sm';
      case 'lg': return 'text-base';
      case 'xl': return 'text-lg';
      default: return 'text-sm';
    }
  };

  // 💡 フルスクリーン切り替え
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

  // 💡 【修正点1】Escキーおよびブラウザ全画面解除イベントで元のサイズに復帰
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
    if ((!tutorInput.trim() && !externalImagePreview && externalQuestionFiles.length === 0) || isTutorLoading) return;

    if (!activeUserId) {
      alert("お話しするには、無料サインアップまたはログインが必要です！");
      handleTriggerAuth('signup');
      return;
    }

    const callName = getSafeString(currentNickname) || "my friend";
    const hasImages = Boolean(externalImagePreview) || externalQuestionFiles.length > 0;
    const totalImagesCount = (externalImagePreview ? 1 : 0) + externalQuestionFiles.length;
    const requiredCost = totalImagesCount >= 2 ? 6 : (hasImages ? 4 : 2);

    if (currentCredits < requiredCost) {
      setTutorMessages((prev) => [
        ...prev,
        { role: "user", content: tutorInput.trim() || "Please evaluate my submission.", imageUrl: externalImagePreview || undefined },
        {
          role: "assistant",
          content: `⚠️ **[Insufficient Credits]**\n\n${callName}, your current balance (${currentCredits} credits) is not enough for this request (requires ${requiredCost} credits). 🪙`
        }
      ]);
      setTutorInput("");
      return;
    }

    const userMsg = tutorInput.trim() || (hasImages ? "Please evaluate these attached question/answer images." : "Please check this text.");
    const needsVisual = requestVisualAid;
    const imageBase64 = externalImagePreview;

    let questionImagesBase64: string[] = [];
    try {
      if (externalQuestionFiles && externalQuestionFiles.length > 0) {
        questionImagesBase64 = await Promise.all(
          externalQuestionFiles.map((file) => fileToBase64(file))
        );
      }
    } catch (err) {
      console.error("Failed to convert question files to base64:", err);
    }

    const effectiveAssignedQuestion = assignedQuestion && assignedQuestion.trim()
      ? assignedQuestion
      : questionImagesBase64.length > 0
      ? `[External Question Images Attached for AI OCR (${questionImagesBase64.length} page(s))]`
      : userMsg;

    setTutorInput("");
    setRequestVisualAid(false);
    if (onClearExternalImage) onClearExternalImage();

    const newMessages: ChatMessage[] = [
      ...tutorMessages,
      { role: "user", content: userMsg, imageUrl: imageBase64 || undefined },
    ];
    setTutorMessages(newMessages);
    setIsTutorLoading(true);

    try {
      const visualPrompt = needsVisual
        ? `Educational instructional diagram explaining: ${userMsg}. Clean layout, high quality, professional illustration style.`
        : undefined;

      const response = await fetch("https://api.jptutoraiyamato.com/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          writingSection: writingSection,
          assignedQuestion: effectiveAssignedQuestion,
          studentEssay: userMsg,
          history: tutorMessages.map(m => ({ role: m.role, content: m.content })),
          learningPace: tutorLevel,
          userNickname: getSafeString(currentNickname) || "My friend",
          appType: appType,
          systemPrompt: systemPrompt,
          questionImagesBase64: questionImagesBase64,
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

      // クレジット減算とヘッダー即時同期
      deductCredits(requiredCost);
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
      <aside aria-label="AI Yamato Custom" className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 font-sans">
        
        {/* 上に戻るボタン */}
        <ScrollTopButton floatingClass="text-white" inlineStyle={{ backgroundColor: themeColor }} />

        {!isAiTutorOpen ? (
          <button
            type="button"
            onClick={() => setIsAiTutorOpen(true)}
            style={{ backgroundColor: themeColor }}
            className="text-white font-bold px-4 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all cursor-pointer text-sm relative hover:opacity-90 border-4 border-cyan-400"
          >
            <span>🤖</span>
            <span>{characterName}</span>
            {externalImagePreview && (
              <span className="w-2.5 h-2.5 bg-red-400 rounded-full animate-pulse"></span>
            )}
            {activeUserId && currentCredits < 2 && (
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
                : { width: `${chatSize.width}px`, height: `${chatSize.height}px`, borderColor: themeColor }
            }
            className={`bg-white border-4 rounded-2xl p-5 shadow-2xl flex flex-col transition-all ${
              isAiFullscreen
                ? "w-screen h-screen rounded-none border-none p-6 sm:p-10 overflow-auto"
                : "min-w-[280px] min-h-[400px] max-w-[90vw] max-h-[88vh] overflow-auto"
            }`}
          >
            <div className="w-full h-full flex flex-col">
              {/* ヘッダー */}
              <div className="flex items-center justify-between border-b pb-2 mb-2.5 shrink-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold flex items-center gap-1.5 m-0" style={{ color: themeColor }}>
                    <span className={isTutorLoading ? "inline-block animate-spin" : "inline-block"}>🤖</span> {characterName}
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
                      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
                      setIsAiTutorOpen(false);
                      setIsAiFullscreen(false);
                    }}
                    className="text-slate-400 hover:text-slate-600 text-xs font-bold px-2 py-1 rounded-md transition cursor-pointer"
                  >
                    ✕ Close
                  </button>
                </div>
              </div>

              {/* クレジット表示エリア */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-2 mb-2 flex items-center justify-between shrink-0">
                <span className="text-xs font-bold text-amber-800">Account Status</span>
                {activeUserId ? (
                  <div className="flex items-center gap-2">
                    {getSafeString(currentNickname) && (
                      <span className="text-[10px] text-slate-600 font-medium">
                        👤 {getSafeString(currentNickname)}
                      </span>
                    )}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${currentCredits >= 2 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                      🪙 {currentCredits} credits
                    </span>
                  </div>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    🔒 Guest
                  </span>
                )}
              </div>

              {/* 💡 【修正点2】VCE Writing セクション選択UI（Font Sizeと同じ薄い灰色 bg-slate-100 に統一） */}
              <div className="bg-slate-100 border border-slate-200 rounded-xl p-2 mb-2 flex flex-col gap-1.5 shrink-0">
                <span className="text-xs font-bold text-slate-700">Select Writing Section</span>
                <div className="grid grid-cols-3 gap-1">
                  {(
                    [
                      { key: 'section2b', label: 'Sec 2 Part B' },
                      { key: 'section3', label: 'Sec 3 (400-500字)' },
                      { key: 'other', label: 'Other' },
                    ] as const
                  ).map((sec) => (
                    <button
                      key={sec.key}
                      type="button"
                      onClick={() => setWritingSection(sec.key)}
                      style={writingSection === sec.key ? { backgroundColor: themeColor, color: '#ffffff' } : {}}
                      className={`py-1 px-1 rounded-md text-[10px] font-bold transition text-center truncate ${
                        writingSection === sec.key
                          ? "shadow-xs"
                          : "bg-white text-slate-600 hover:opacity-80 border border-slate-200"
                      }`}
                    >
                      {sec.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 💡 【修正点2】学習ペース選択UI（Font Sizeと同じ薄い灰色 bg-slate-100 に統一） */}
              <div className="bg-slate-100 border border-slate-200 rounded-xl p-2 mb-2 flex items-center justify-between shrink-0">
                <span className="text-xs font-bold text-slate-700">Learning Pace</span>
                <div className="inline-flex rounded-lg bg-white p-0.5 shadow-xs border border-slate-200">
                  {(["steady", "normal", "accelerated"] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => handlePaceChange(level)}
                      style={tutorLevel === level ? { backgroundColor: themeColor, color: '#ffffff' } : {}}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold capitalize transition ${
                        tutorLevel === level ? "shadow-xs" : "text-slate-600 hover:opacity-80"
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
                      style={chatFontSize === size.key ? { backgroundColor: themeColor, color: '#ffffff' } : {}}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition ${
                        chatFontSize === size.key ? "shadow-xs" : "text-slate-600 hover:opacity-80"
                      }`}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 未ログインガード画面 */}
              {!activeUserId ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex-grow mb-3 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="text-3xl">🔒</div>
                  <h4 className="font-bold text-sm text-slate-800">Sign Up Required to Chat</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Please sign up or log in to get detailed VCE feedback from {characterName}!
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAiTutorOpen(false);
                      handleTriggerAuth('signup');
                    }}
                    style={{ backgroundColor: themeColor }}
                    className="w-full py-2.5 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer hover:opacity-90"
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
                          style={msg.role === "user" ? { backgroundColor: themeColor, color: '#ffffff' } : {}}
                          className={`max-w-[95%] p-2.5 rounded-xl leading-relaxed whitespace-pre-wrap ${
                            msg.role === "user"
                              ? "rounded-br-xs"
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
                              {/* Export PDF ボタン */}
                              <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-end">
                                <button
                                  type="button"
                                  onClick={() => setPdfTargetContent(msg.content)}
                                  className="text-[11px] font-bold px-2.5 py-1 rounded-md transition flex items-center gap-1 cursor-pointer hover:opacity-80"
                                  style={{ color: themeColor, backgroundColor: `${themeColor}15` }}
                                  title="Export this feedback as PDF with customizable P.S. Notes"
                                >
                                  <span>📄</span>
                                  <span>Export PDF</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {isTutorLoading && (
                      <div className="flex items-center gap-2 text-xs text-slate-600 italic bg-white/80 border border-slate-200 p-2 rounded-xl w-fit shadow-xs">
                        <span className="inline-block animate-spin text-sm">🤖</span>
                        <span>Yamato is analyzing your answer...</span>
                      </div>
                    )}
                  </div>

                  {/* ダッシュボード答案画像プレビューバー */}
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
                          className="rounded border-slate-300 w-3.5 h-3.5"
                          style={{ accentColor: themeColor }}
                        />
                        <span>Visual Aid</span>
                      </label>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={tutorInput}
                        onChange={(e) => setTutorInput(e.target.value)}
                        placeholder={externalImagePreview || externalQuestionFiles.length > 0 ? "Ask feedback for photos..." : "Enter question & your writing text..."}
                        disabled={isTutorLoading}
                        className="flex-grow p-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 bg-slate-50/50"
                      />
                      <button
                        type="submit"
                        disabled={isTutorLoading || (!tutorInput.trim() && !externalImagePreview && externalQuestionFiles.length === 0)}
                        style={{ backgroundColor: themeColor }}
                        className="px-4 py-2 font-bold text-xs text-white rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 shrink-0 hover:opacity-90"
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

      {/* 先生用PDF編集・備考追加モーダル */}
      {pdfTargetContent && (
        <FeedbackPdfModal
          initialContent={pdfTargetContent}
          themeColor={themeColor}
          sectionTitle={writingSection.toUpperCase()}
          studentName={getSafeString(currentNickname)}
          onClose={() => setPdfTargetContent(null)}
        />
      )}

      {/* 画像拡大表示モーダル */}
      {modalImageSrc && (
        <ImageModal src={modalImageSrc} onClose={() => setModalImageSrc(null)} />
      )}
    </>
  );
}

export default ChatYamatoEoyWritingCustom;