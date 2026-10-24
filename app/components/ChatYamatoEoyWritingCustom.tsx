/**
 * @file ChatYamatoEoyWritingCustom.tsx
 * @description 生徒が持参した問題と解答（画像および直書きテキスト両対応）に基づき、VCE形式（Section 2 Part B / Section 3 / その他）で詳細な添削・フィードバックを行う専用AIチャットウィジェット
 */
import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { fetchYamatoConfigsData, BotConfig } from "../data/yamato-configs";

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
  version: "5.2.2",
  role: "生徒持参問題・直書き＆画像両対応 VCE Writing 3セクション対応 添削・フィードバック専用AIチャット",
  features: [
    {
      featureName: "Flexible Input Support (Text & Images)",
      description: "問題および答案が画像でアップロードされた場合だけでなく、テキストとして直接書き込まれた場合でも正確に認識して添削"
    },
    {
      featureName: "3 VCE Writing Sections Selection",
      description: "Section 2 Part B、Section 3、その他の3つのセクション選択UIを搭載し、それぞれの基準に沿ったフィードバックを提供"
    },
    {
      featureName: "Section 3 Word Count Guidance",
      description: "Section 3選択時、400字以上は必ず書き、上限は500字を少し上回るぐらいまでが望ましいという基準でアドバイスを最適化"
    },
    {
      featureName: "Fullscreen PDF Edit Modal",
      description: "PDF編集モーダルをフルスクリーン（最大化／縮小）に切り替え可能にし、長文の添削内容の編集を快適化"
    },
    {
      featureName: "Editable Feedback for PDF Export",
      description: "PDF出力前に、先生がヤマトの添削フィードバック本文を自由に編集・修正が可能"
    },
    {
      featureName: "Page Break Prevention for P.S.",
      description: "PDF出力時にP.S.ボックスがページをまたいで分断されないようにCSS制御を最適化"
    },
    {
      featureName: "Customizable Teacher Notes Title & P.S.",
      description: "PDF出力時に先生が備考のタイトル（デフォルト「P.S.」）およびコメントを自由に編集してレポートに含めることが可能"
    },
    {
      featureName: "Export PDF Feedback",
      description: "添削・フィードバック結果をクリーンなフォーマットでPDFレポートとして保存・印刷可能"
    },
    {
      featureName: "Dashboard Multiple Image Integration",
      description: "ダッシュボード側でアップロードされた複数の問題画像および答案画像を受け取り、チャット内でプレビュー・送信"
    },
    {
      featureName: "Login Guard & Auth Modal Trigger",
      description: "未ログインユーザーがチャットを利用しようとした際にガード画面を表示し、認証モーダルを開く"
    },
    {
      featureName: "Dynamic Color Theme Support",
      description: "Supabaseから動的にカラーコード（例: #06b6d4）を取得して反映"
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
  imageAi: 4,        // 画像付きチャット（1枚）
  multiImageAi: 6,   // 画像付きチャット（2枚）
};

export type ChatYamatoEoyWritingCustomProps = {
  systemPrompt?: string;
  defaultOpen?: boolean;
  userId?: string;
  userNickname?: string;
  credits?: number;
  onOpenAuth?: () => void;
  externalQuestionFiles?: File[];
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
  userNickname = "My friend",
  credits: initialCredits = 10,
  onOpenAuth,
  externalQuestionFiles = [],
  externalImageFile,
  externalImagePreview,
  onClearExternalImage,
  assignedQuestion = "",
}: ChatYamatoEoyWritingCustomProps) {
  const appType = "eoy-writing-custom";
  
  // 💡 Supabase から動的に取得する設定ステート
  const [config, setConfig] = useState<BotConfig | null>(null);

  useEffect(() => {
    async function loadConfig() {
      try {
        const configsData = await fetchYamatoConfigsData(supabase);
        if (configsData && configsData[appType]) {
          setConfig(configsData[appType]);
        }
      } catch (err) {
        console.error("Failed to load eoy-writing-custom config from Supabase:", err);
      }
    }
    loadConfig();
  }, [appType]);

  const characterName = config?.name || "VCE Writing Tutor (Yamato)";
  const initialGreeting = config?.greeting || "Hello, my friend! 🌟 Please select your writing section (Section 2 Part B, Section 3, or Other) and share your brought question and answer (via text or image). I am ready to give you detailed VCE feedback!";
  const themeColor = config?.themeColor || "#06b6d4";

  const [isAiTutorOpen, setIsAiTutorOpen] = useState<boolean>(defaultOpen);
  const [isAiFullscreen, setIsAiFullscreen] = useState<boolean>(false);
  const aiChatRef = useRef<HTMLDivElement>(null);

  const [activeUserId, setActiveUserId] = useState<string | undefined>(propUserId);
  const [currentCredits, setCurrentCredits] = useState<number>(initialCredits);

  // 💡 VCE Writing セクション選択用ステート ("section2b" | "section3" | "other")
  const [writingSection, setWritingSection] = useState<"section2b" | "section3" | "other">("section2b");

  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);
  const [isPdfFullscreen, setIsPdfFullscreen] = useState<boolean>(false);
  const [pendingPdfContent, setPendingPdfContent] = useState<string>("");
  const [editablePdfContent, setEditablePdfContent] = useState<string>("");
  const [teacherNotesTitleInput, setTeacherNotesTitleInput] = useState<string>("P.S.");
  const [teacherNotesInput, setTeacherNotesInput] = useState<string>("");

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

  const [tutorMessages, setTutorMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: initialGreeting },
  ]);

  // initialGreeting がロード後に変わった場合の初回メッセージ更新
  useEffect(() => {
    if (config?.greeting && tutorMessages.length === 1 && tutorMessages[0].role === "assistant") {
      setTutorMessages([{ role: "assistant", content: config.greeting }]);
    }
  }, [config?.greeting]);

  const [tutorInput, setTutorInput] = useState<string>("");
  const [isTutorLoading, setIsTutorLoading] = useState<boolean>(false);
  const [tutorLevel, setTutorLevel] = useState<"steady" | "normal" | "accelerated">("normal");
  const [requestVisualAid, setRequestVisualAid] = useState<boolean>(false);

  const handleOpenPdfModal = (contentHtml: string) => {
    setPendingPdfContent(contentHtml);
    const cleanForEdit = contentHtml
      .replace(/<br\s*[\/]?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]*>?/gm, '');
    setEditablePdfContent(cleanForEdit);
    setTeacherNotesTitleInput("P.S.");
    setTeacherNotesInput("");
    setIsPdfFullscreen(false);
    setIsPdfModalOpen(true);
  };

  const handleExecutePdfExport = () => {
    setIsPdfModalOpen(false);
    setIsPdfFullscreen(false);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("ポップアップがブロックされました。ブラウザの設定をご確認ください。");
      return;
    }

    const cleanContent = editablePdfContent.trim();
    const sanitizedTitle = teacherNotesTitleInput.trim() || "P.S.";
    const sanitizedNotes = teacherNotesInput.trim();

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>VCE Japanese Writing Feedback Report</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.8; }
            .header { border-bottom: 3px solid ${themeColor}; padding-bottom: 15px; margin-bottom: 25px; }
            h1 { color: ${themeColor}; font-size: 22px; margin: 0 0 5px 0; }
            .meta { font-size: 13px; color: #64748b; }
            .content { font-size: 14px; white-space: pre-wrap; word-break: break-word; }
            
            .teacher-notes-box {
              margin-top: 40px;
              border: 2px dashed ${themeColor};
              background-color: #ecfeff;
              padding: 20px;
              border-radius: 8px;
              break-inside: avoid;
              page-break-inside: avoid;
            }
            .teacher-notes-title { font-weight: bold; color: ${themeColor}; font-size: 15px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
            .teacher-notes-text { font-size: 14px; color: #164e63; white-space: pre-wrap; }
            
            @media print {
              body { padding: 20px; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🌟 VCE Japanese Writing Feedback Report (${writingSection.toUpperCase()})</h1>
            <div class="meta">Date: ${new Date().toLocaleDateString()}</div>
          </div>
          <div class="content">${cleanContent}</div>
          
          ${sanitizedNotes ? `
            <div class="teacher-notes-box">
              <div class="teacher-notes-title">✏️ ${sanitizedTitle}</div>
              <div class="teacher-notes-text">${sanitizedNotes}</div>
            </div>
          ` : ''}

          <script>
            window.onload = () => {
              setTimeout(() => { window.print(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
    if ((!tutorInput.trim() && !externalImagePreview && externalQuestionFiles.length === 0) || isTutorLoading) return;

    if (!activeUserId) {
      alert("お話しするには、無料サインアップまたはログインが必要です！");
      if (onOpenAuth) onOpenAuth();
      return;
    }

    if (currentCredits <= 0) {
      setTutorMessages((prev) => [
        ...prev,
        { role: "user", content: tutorInput.trim() || "Please evaluate my submission." },
        {
          role: "assistant",
          content: `🌟 **[Zero Credits Remaining]**\n\nHello, my friend! It looks like your credit balance has reached zero. Please top up your credits! 📚✨`
        }
      ]);
      setTutorInput("");
      return;
    }

    const hasImages = Boolean(externalImagePreview) || externalQuestionFiles.length > 0;
    const totalImagesCount = (externalImagePreview ? 1 : 0) + externalQuestionFiles.length;
    const requiredCost = totalImagesCount >= 2 ? FEATURE_COSTS.multiImageAi : (hasImages ? FEATURE_COSTS.imageAi : FEATURE_COSTS.textAi);

    if (currentCredits < requiredCost) {
      setTutorMessages((prev) => [
        ...prev,
        { role: "user", content: tutorInput.trim() || "Please evaluate my submission.", imageUrl: externalImagePreview || undefined },
        {
          role: "assistant",
          content: `⚠️ **[Insufficient Credits]**\n\nMy friend, your current balance (${currentCredits} credits) is not enough for this request (requires ${requiredCost} credits). 🪙`
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
          writingSection: writingSection,
          assignedQuestion: effectiveAssignedQuestion,
          studentEssay: userMsg,
          history: tutorMessages.map(m => ({ role: m.role, content: m.content })),
          learningPace: tutorLevel,
          userNickname: userNickname,
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
      <aside aria-label="AI Yamato Custom" className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 font-sans">
        {!isAiTutorOpen ? (
          <button
            type="button"
            onClick={() => setIsAiTutorOpen(true)}
            style={config?.floatingButtonStyle || { backgroundColor: themeColor, color: '#ffffff' }}
            className="font-bold px-4 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all cursor-pointer text-sm relative hover:opacity-90"
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
            className={`bg-white border-2 rounded-2xl p-5 shadow-2xl flex flex-col transition-all ${
              isAiFullscreen
                ? "w-screen h-screen rounded-none border-none p-6 sm:p-10 overflow-auto"
                : "w-80 sm:w-96 h-[580px] min-w-[280px] min-h-[400px] max-w-[90vw] max-h-[88vh] resize overflow-auto"
            }`}
            style={{ borderColor: themeColor }}
          >
            <div className="w-full h-full flex flex-col">
              {/* ヘッダー */}
              <div className="flex items-center justify-between border-b pb-2 mb-2.5 shrink-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold flex items-center gap-1.5 m-0" style={{ color: themeColor }}>
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

              {/* クレジット残高表示セクション */}
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

              {/* 💡 VCE Writing セクション選択UI */}
              <div className="border rounded-xl p-2 mb-2 flex flex-col gap-1.5 shrink-0" style={{ backgroundColor: `${themeColor}0d`, borderColor: `${themeColor}40` }}>
                <span className="text-[11px] font-bold" style={{ color: themeColor }}>Select Writing Section</span>
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
                          : "bg-white text-slate-700 hover:opacity-80 border border-slate-200"
                      }`}
                    >
                      {sec.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 学習ペース選択UI */}
              <div className="border rounded-xl p-2 mb-2 flex items-center justify-between shrink-0" style={{ backgroundColor: `${themeColor}0d`, borderColor: `${themeColor}40` }}>
                <span className="text-xs font-bold" style={{ color: themeColor }}>Learning Pace</span>
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
                        chatFontSize === size.key
                          ? "shadow-xs"
                          : "text-slate-600 hover:opacity-80"
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
                    Please sign up or log in to chat with {characterName}!
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAiTutorOpen(false);
                      if (onOpenAuth) onOpenAuth();
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
                              {/* 💡 Export PDF ボタン */}
                              <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-end">
                                <button
                                  type="button"
                                  onClick={() => handleOpenPdfModal(msg.content)}
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
                        <span>かんがえちゅう...</span>
                      </div>
                    )}
                  </div>

                  {/* ダッシュボードから連携された添付画像のプレビューバー */}
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
                        style={{ focusRingColor: themeColor } as any}
                      />
                      <button
                        type="button"
                        onClick={handleSendTutorMessage}
                        disabled={isTutorLoading || (!tutorInput.trim() && !externalImagePreview && externalQuestionFiles.length === 0)}
                        style={{ backgroundColor: themeColor }}
                        className="px-4 py-2 font-bold text-xs text-white rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 shrink-0 hover:opacity-90"
                      >
                        Send
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                      <span>💡 Text: {FEATURE_COSTS.textAi} cr / 1 Photo: {FEATURE_COSTS.imageAi} cr / 2 Photos: {FEATURE_COSTS.multiImageAi} cr</span>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* 💡 先生用PDF編集・備考追加モーダル（フルスクリーン切替対応） */}
      {isPdfModalOpen && (
        <div className="fixed inset-0 z-[2147483648] bg-black/60 flex items-center justify-center p-4">
          <div className={`bg-white shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200 flex flex-col transition-all ${
            isPdfFullscreen
              ? "w-screen h-screen rounded-none p-6 sm:p-10"
              : "rounded-2xl p-6 max-w-2xl w-full max-h-[92vh]"
          }`}>
            {/* モーダルヘッダー */}
            <div className="flex items-center justify-between border-b pb-3 mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 m-0">
                  <span>✏️</span> Edit Feedback & Add P.S. for PDF ({writingSection.toUpperCase()})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPdfFullscreen(!isPdfFullscreen)}
                  className="text-slate-500 hover:text-slate-700 text-xs font-bold px-2 py-1 rounded-md transition cursor-pointer border border-slate-200"
                >
                  {isPdfFullscreen ? "🗗 縮小" : "🗖 最大化"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPdfModalOpen(false);
                    setIsPdfFullscreen(false);
                  }}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold px-2 py-1 rounded-md transition cursor-pointer"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-500 mb-3 shrink-0">
              PDFに出力する添削内容の修正および、末尾の先生からのコメント（P.S.等）を自由に編集できます。最大化して広々編集することも可能です。
            </p>

            {/* 添削本文の編集エリア（フルスクリーン時は高さを自動拡張） */}
            <div className={`mb-3 flex flex-col overflow-hidden ${isPdfFullscreen ? "flex-grow" : "h-56"}`}>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Feedback Content (Editable)</label>
              <textarea
                value={editablePdfContent}
                onChange={(e) => setEditablePdfContent(e.target.value)}
                className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 bg-slate-50 resize-none font-mono leading-relaxed flex-grow h-full"
              />
            </div>

            <div className="mb-3 shrink-0">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Notes Title (Default: P.S.)</label>
              <input
                type="text"
                value={teacherNotesTitleInput}
                onChange={(e) => setTeacherNotesTitleInput(e.target.value)}
                placeholder="例: P.S. / 先生からのメッセージ / Note from Mr. Tanaka"
                className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 bg-slate-50"
              />
            </div>

            <div className="mb-4 shrink-0">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Teacher's Notes / Comments</label>
              <textarea
                value={teacherNotesInput}
                onChange={(e) => setTeacherNotesInput(e.target.value)}
                placeholder="例: よく頑張りました！次回は文末の表現（〜と思います）に気をつけましょう。"
                rows={3}
                className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 bg-slate-50 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 shrink-0 pt-2 border-t">
              <button
                type="button"
                onClick={() => {
                  setIsPdfModalOpen(false);
                  setIsPdfFullscreen(false);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecutePdfExport}
                style={{ backgroundColor: themeColor }}
                className="px-4 py-2 text-xs font-bold text-white rounded-xl transition shadow-md cursor-pointer hover:opacity-90"
              >
                Generate PDF / Print
              </button>
            </div>
          </div>
        </div>
      )}

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

export default ChatYamatoEoyWritingCustom;