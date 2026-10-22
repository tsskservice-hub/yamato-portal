/**
 * @file YamatoChatCommon.tsx
 * @description ヤマトAIチャットウィジェット（虹色テーマ対応・未ログインガード・クレジット残高・スマートクレジット制御版）
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
  version: "3.5.1",
  role: "ポータル共通AIチャットウィジェット（虹色テーマ対応・ログインガード・クレジット管理・セッション自動検知・画像生成対応版）",
  features: [
    {
      featureName: "Login Guard & Auth Modal Trigger",
      description: "未ログインユーザーがチャットを利用しようとした際にガード画面を表示し、認証モーダルを開く"
    },
    {
      featureName: "Live Credit Display & Warning Badge",
      description: "ヘッダーに現在のクレジット残高をリアルタイム表示し、不足時に警告バッジを点灯"
    },
    {
      featureName: "Smart 402 Credit Error Handling",
      description: "バックエンドからの ZERO_CREDITS および PARTIAL_SHORTAGE エラーをスマートにハンドリング"
    },
    {
      featureName: "New Theme Support (including Rainbow)",
      description: "虹色テーマを含む多彩なカラーテーマに対応"
    },
    {
      featureName: "Image Upload & Vision Support",
      description: "手書き答案などの画像を選択・プレビュー付きでアップロードし、AI家庭教師に画像付きで質問送信可能"
    },
    {
      featureName: "Font Size Customization",
      description: "チャット内の文字サイズを「小・中・大・特大」の4段階に動的切替可能"
    },
    {
      featureName: "Learning Pace Synchronization",
      description: "steady, normal, accelerated の学習ペース切替時に Supabase の profiles テーブルを即時更新"
    },
    {
      featureName: "Credit Cost & Feature Footer",
      description: "チャット下部にクレジット消費案内（Chat / Image）を配置"
    }
  ],
  supportedThemes: ["red", "blue", "black", "green", "yellow", "orange", "purple", "cyan", "pink", "rainbow"],
  learningPaces: ["steady", "normal", "accelerated"]
};

type ChatMessage = {
  role: "assistant" | "user";
  content: string;
  imageUrl?: string;
};

// 💡 機能ごとの消費クレジット定義
const FEATURE_COSTS = {
  textAi: 2,         // 通常のテキストチャット
  imageAi: 4,        // 画像付きチャット（1枚）または画像生成AI
  multiImageAi: 6,   // 画像付きチャット（2枚）
};

// 外部から受け取るプロパティ（Props）の型定義
export type YamatoChatCommonProps = {
  characterName?: string;
  initialGreeting?: string;
  systemPrompt?: string;
  appType?: "concierge" | "writing" | "oral" | "general" | string;
  defaultOpen?: boolean;
  themeColor?: "red" | "blue" | "black" | "green" | "yellow" | "orange" | "purple" | "cyan" | "pink" | "rainbow" | string;
  floatingButtonClassName?: string;
  buttonStyle?: {
    border?: string;
    background?: string;
    color?: string;
  };
  initialLearningPace?: "steady" | "normal" | "accelerated";
  userId?: string;
  userNickname?: string;
  credits?: number; // クレジット残高初期値
  onOpenAuth?: () => void; // 未ログイン時に認証モーダルを開くコールバック
  externalImageFile?: File | null;
  externalImagePreview?: string | null;
  onClearExternalImage?: () => void;
};

// テーマカラーごとのスタイル定義（rainbow を追加）
const themeStyles = {
  red: {
    floatingBg: "bg-red-600 hover:bg-red-700",
    floatingText: "text-white",
    floatingBorder: "border border-red-400",
    button: "bg-red-600 hover:bg-red-700 text-white",
    border: "border-red-300",
    headerText: "text-red-900",
    badgeBg: "bg-red-50 border-red-200",
    badgeText: "text-red-900",
    buttonActive: "bg-red-600 text-white shadow-xs",
    buttonInactive: "text-slate-600 hover:text-red-700",
    userBubble: "bg-red-600 text-white rounded-br-xs",
    inputRing: "focus:ring-red-500",
    submitBtn: "bg-red-600 hover:bg-red-700 text-white",
  },
  blue: {
    floatingBg: "bg-blue-600 hover:bg-blue-700",
    floatingText: "text-white",
    floatingBorder: "border border-blue-400",
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
  black: {
    floatingBg: "bg-slate-900 hover:bg-black",
    floatingText: "text-white",
    floatingBorder: "border border-slate-700",
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
    floatingBg: "bg-green-600 hover:bg-green-700",
    floatingText: "text-white",
    floatingBorder: "border border-green-400",
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
  yellow: {
    floatingBg: "bg-yellow-500 hover:bg-yellow-600",
    floatingText: "text-slate-900",
    floatingBorder: "border border-yellow-300",
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
  orange: {
    floatingBg: "bg-orange-500 hover:bg-orange-600",
    floatingText: "text-white",
    floatingBorder: "border border-orange-300",
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
  purple: {
    floatingBg: "bg-purple-600 hover:bg-purple-700",
    floatingText: "text-white",
    floatingBorder: "border border-purple-400",
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
  pink: {
    floatingBg: "bg-pink-600 hover:bg-pink-700",
    floatingText: "text-white",
    floatingBorder: "border border-pink-400",
    button: "bg-pink-600 hover:bg-pink-700 text-white",
    border: "border-pink-300",
    headerText: "text-pink-900",
    badgeBg: "bg-pink-50 border-pink-200",
    badgeText: "text-pink-900",
    buttonActive: "bg-pink-600 text-white shadow-xs",
    buttonInactive: "text-slate-600 hover:text-pink-700",
    userBubble: "bg-pink-600 text-white rounded-br-xs",
    inputRing: "focus:ring-pink-500",
    submitBtn: "bg-pink-600 hover:bg-pink-700 text-white",
  },
  rainbow: {
    floatingBg: "bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 hover:opacity-90",
    floatingText: "text-white",
    floatingBorder: "border-2 border-pink-400",
    button: "bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 text-white",
    border: "border-pink-300",
    headerText: "text-purple-900 font-extrabold",
    badgeBg: "bg-purple-50 border-purple-200",
    badgeText: "text-purple-900",
    buttonActive: "bg-gradient-to-r from-red-500 via-yellow-500 to-purple-500 text-white shadow-xs",
    buttonInactive: "text-slate-600 hover:text-purple-700",
    userBubble: "bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-br-xs",
    inputRing: "focus:ring-purple-500",
    submitBtn: "bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90 text-white",
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
  themeColor = "blue",
  floatingButtonClassName,
  buttonStyle,
  initialLearningPace = "normal",
  userId: propUserId,
  userNickname = "My friend",
  credits: initialCredits = 10,
  onOpenAuth,
  externalImagePreview,
  onClearExternalImage,
}: YamatoChatCommonProps) {
  const [isAiTutorOpen, setIsAiTutorOpen] = useState<boolean>(defaultOpen);
  const [isAiFullscreen, setIsAiFullscreen] = useState<boolean>(false);
  const aiChatRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        console.error("Session check error in YamatoChatCommon:", err);
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

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [internalImagePreview, setInternalImagePreview] = useState<string | null>(null);

  const activeImagePreview = externalImagePreview || internalImagePreview;

  const currentTheme = themeStyles[themeColor as keyof typeof themeStyles] || themeStyles.blue;

  const finalFloatingButtonClass = floatingButtonClassName || `${currentTheme.floatingBg} ${currentTheme.floatingText} ${currentTheme.floatingBorder}`;
  
  const floatingInlineStyle = buttonStyle ? {
    border: buttonStyle.border,
    background: buttonStyle.background,
    color: buttonStyle.color,
  } : undefined;

  const [tutorMessages, setTutorMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: initialGreeting,
    },
  ]);
  const [tutorInput, setTutorInput] = useState<string>("");
  const [isTutorLoading, setIsTutorLoading] = useState<boolean>(false);
  const [tutorLevel, setTutorLevel] = useState<"steady" | "normal" | "accelerated">(initialLearningPace);
  
  // 💡 絵で説明ヤマト（image-explanation）の場合はデフォルトで Visual Aid チェックをONにする
  const [requestVisualAid, setRequestVisualAid] = useState<boolean>(appType === "image-explanation");

  useEffect(() => {
    if (appType === "image-explanation") {
      setRequestVisualAid(true);
    }
  }, [appType]);

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setInternalImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
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
    const needsVisual = requestVisualAid || appType === "image-explanation";
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
    setSelectedImage(null);
    setInternalImagePreview(null);
    if (appType !== "image-explanation") {
      setRequestVisualAid(false);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
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
      <aside aria-label="AI Yamato" className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 font-sans">
        {!isAiTutorOpen ? (
          <button
            type="button"
            onClick={() => setIsAiTutorOpen(true)}
            style={floatingInlineStyle}
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
            className={`bg-white border-2 ${currentTheme.border} rounded-2xl p-5 shadow-2xl flex flex-col transition-all ${
              isAiFullscreen
                ? "w-screen h-screen rounded-none border-none p-6 sm:p-10 overflow-auto"
                : "w-80 sm:w-96 h-[540px] min-w-[280px] min-h-[380px] max-w-[90vw] max-h-[85vh] resize overflow-auto"
            }`}
          >
            <div className="w-full h-full flex flex-col">
              {/* ヘッダー */}
              <div className="flex items-center justify-between border-b pb-2 mb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <h3 className={`text-sm font-bold ${currentTheme.headerText} flex items-center gap-1.5 m-0`}>
                    <span className={isTutorLoading ? "inline-block animate-spin" : "inline-block"}>🤖</span> {characterName}
                  </h3>
                  {activeUserId ? (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${currentCredits >= FEATURE_COSTS.textAi ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                      🪙 {currentCredits} credits
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600 border border-slate-200">
                      🔒 Guest
                    </span>
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
                        <span>Yamato is thinking & generating visual aid...</span>
                      </div>
                    )}
                  </div>

                  {/* 添付画像のプレビューバー */}
                  {activeImagePreview && (
                    <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-2.5 py-1.5 rounded-lg text-xs mb-2 shrink-0">
                      <img src={activeImagePreview} alt="Preview" className="w-8 h-8 object-cover rounded border" />
                      <span className="truncate flex-grow text-blue-900 font-medium">Answer photo attached</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedImage(null);
                          setInternalImagePreview(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                          if (onClearExternalImage) onClearExternalImage();
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
                        <span>{activeImagePreview ? "Change Photo" : "Upload Photo"}</span>
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
                        placeholder={activeImagePreview ? "Ask feedback for photo..." : "Ask Yamato anything..."}
                        disabled={isTutorLoading}
                        className={`flex-grow p-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 ${currentTheme.inputRing} bg-slate-50/50`}
                      />
                      <button
                        type="submit"
                        disabled={isTutorLoading || (!tutorInput.trim() && !activeImagePreview)}
                        className={`px-4 py-2 ${currentTheme.submitBtn} font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 shrink-0`}
                      >
                        Send
                      </button>
                    </div>

                    {/* 消費クレジット案内 */}
                    <div className="text-[10px] text-slate-400 px-1 text-left">
                      💡 Text: {FEATURE_COSTS.textAi} cr / 1 Photo: {FEATURE_COSTS.imageAi} cr
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

export default YamatoChatCommon;