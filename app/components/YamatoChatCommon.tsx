/**
 * @file YamatoChatCommon.tsx
 * @description ポータル共通AIチャットウィジェット（ニックネーム動的反映・ヘッダークレジット即時連動・左上リサイズ・完全連動上戻りボタン内包版）
 * 💡 特徴：
 * 1. root loader & Supabase profiles からのニックネーム・クレジット自動解決
 * 2. 初期挨拶（my friend）の登録ニックネームへの自動置換
 * 3. AIバックエンドへの最新ニックネーム送信（パーソナライズ呼びかけ）
 * 4. F5なしのヘッダークレジット即時連動（yamato:credits-updated イベント発行）
 * 5. 左上ドラッグリサイズ＆テーマ完全連動上戻りボタン
 * 6. 写真アップロード（enableImageUpload）のON/OFF切り替え
 */
import { useState, useEffect, useRef } from "react";
import { useRouteLoaderData } from "@remix-run/react";
import { supabase } from "../lib/supabaseClient";

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
  version: "4.1.0",
  role: "ポータル共通AIチャットウィジェット（ニックネーム反映・ヘッダー即時連動版）",
  features: [
    {
      featureName: "Dynamic Nickname Resolution & Greeting",
      description: "Supabase profiles または root からニックネームを取得し、初期挨拶およびAIプロンプトへ反映"
    },
    {
      featureName: "Synchronized Scroll Top Button",
      description: "チャットボタンと枠線,背景,文字色（三角）を完全に共有する上に戻るボタンを内包"
    },
    {
      featureName: "Top-Left Resizing Handle",
      description: "画面内に収まったまま左上方向にスムーズにチャット窓をドラッグリサイズ可能"
    },
    {
      featureName: "Configurable Image Upload Button",
      description: "enableImageUpload props により、部屋ごとに写真アップロードボタンの表示/非表示を自在に切り替え可能"
    },
    {
      featureName: "Direct Color Code Theme Support",
      description: "themeColor に直接カラーコード（例: #1e3a8a）を指定可能"
    },
    {
      featureName: "Instant Credit Header Sync",
      description: "AI返答受信時に yamato:credits-updated イベントを発行し、F5なしで即時ヘッダーを同期"
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

interface RootLoaderData {
  user?: any;
  credits?: number;
  nickname?: string;
  learningPace?: "steady" | "normal" | "accelerated";
}

export type YamatoChatCommonProps = {
  characterName?: string;
  initialGreeting?: string;
  systemPrompt?: string;
  appType?: "concierge" | "writing" | "oral" | "general" | string;
  defaultOpen?: boolean;
  themeColor?: string; // キーワードまたはカラーコード（例: "#1e3a8a"）
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
};

const themeStyles = {
  red: {
    floatingBg: "bg-red-600 hover:bg-red-700",
    floatingText: "text-white",
    floatingBorder: "border border-red-400",
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
};

function sanitizeAiOutput(text: string): string {
  if (!text) return "";
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*/g, '');
}

function ScrollTopButton({
  floatingClass,
  inlineStyle
}: {
  floatingClass: string;
  inlineStyle?: { border?: string; background?: string; color?: string }
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const toggleVisible = () => {
      if (window.scrollY > 300) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };
    window.addEventListener("scroll", toggleVisible);
    return () => window.removeEventListener("scroll", toggleVisible);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      style={inlineStyle}
      className={`${floatingClass} w-10 h-10 rounded-full shadow-lg transition cursor-pointer text-xs font-bold flex items-center justify-center`}
      title="ページトップへ戻る"
    >
      ▲
    </button>
  );
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
}: YamatoChatCommonProps) {
  const rootData = useRouteLoaderData("root") as RootLoaderData | undefined;

  const effectiveUserId = propUserId ?? rootData?.user?.id;
  const effectiveCreditsFromRoot = propCredits ?? rootData?.credits ?? 0;
  const effectiveLearningPace = propLearningPace ?? rootData?.learningPace ?? "normal";

  // 💡 ニックネームの優先解決ステート（prop -> rootData -> 空文字）
  const [currentNickname, setCurrentNickname] = useState<string>(
    (propNickname && propNickname.trim() !== "")
      ? propNickname.trim()
      : (rootData?.nickname && rootData.nickname.trim() !== "")
        ? rootData.nickname.trim()
        : ""
  );

  const [isAiTutorOpen, setIsAiTutorOpen] = useState<boolean>(defaultOpen);
  const [isAiFullscreen, setIsAiFullscreen] = useState<boolean>(false);
  const aiChatRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 左上リサイズ用ステート
  const [chatSize, setChatSize] = useState<{ width: number; height: number }>({ width: 384, height: 540 });
  const resizingRef = useRef<boolean>(false);
  const startPosRef = useRef<{ x: number; y: number; w: number; h: number }>({ x: 0, y: 0, w: 384, h: 540 });

  const startTopLeftResize = (e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = true;
    startPosRef.current = {
      x: e.clientX,
      y: e.clientY,
      w: chatSize.width,
      h: chatSize.height,
    };

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingRef.current) return;
      const deltaX = startPosRef.current.x - moveEvent.clientX;
      const deltaY = startPosRef.current.y - moveEvent.clientY;
      const newWidth = Math.max(280, Math.min(window.innerWidth * 0.95, startPosRef.current.w + deltaX));
      const newHeight = Math.max(380, Math.min(window.innerHeight * 0.9, startPosRef.current.h + deltaY));
      setChatSize({ width: newWidth, height: newHeight });
    };

    const onMouseUp = () => {
      resizingRef.current = false;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const [activeUserId, setActiveUserId] = useState<string | undefined>(effectiveUserId);
  const [currentCredits, setCurrentCredits] = useState<number>(effectiveCreditsFromRoot);

  useEffect(() => {
    setActiveUserId(effectiveUserId);
  }, [effectiveUserId]);

  useEffect(() => {
    setCurrentCredits(effectiveCreditsFromRoot);
  }, [effectiveCreditsFromRoot]);

  useEffect(() => {
    if (propNickname && propNickname.trim() !== "") {
      setCurrentNickname(propNickname.trim());
    } else if (rootData?.nickname && rootData.nickname.trim() !== "") {
      setCurrentNickname(rootData.nickname.trim());
    }
  }, [propNickname, rootData?.nickname]);

  // 💡 全体クレジット更新イベントの受信
  useEffect(() => {
    const handleGlobalCreditUpdate = (e: any) => {
      if (typeof e.detail?.credits === "number") {
        setCurrentCredits(e.detail.credits);
      }
    };
    window.addEventListener("yamato:credits-updated", handleGlobalCreditUpdate);
    return () => window.removeEventListener("yamato:credits-updated", handleGlobalCreditUpdate);
  }, []);

  // 💡 Supabase から credits と nickname を同時に取得・セッション監視
  useEffect(() => {
    let isMounted = true;

    async function checkAuthSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id && isMounted) {
          setActiveUserId(session.user.id);
          const { data: profileData } = await supabase
            .from('profiles')
            .select('credits, nickname')
            .eq('id', session.user.id)
            .single();

          if (profileData) {
            if (typeof profileData.credits === 'number') {
              setCurrentCredits(profileData.credits);
            }
            if (profileData.nickname && profileData.nickname.trim() !== "") {
              setCurrentNickname(profileData.nickname.trim());
            }
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
            .select('credits, nickname')
            .eq('id', newUid)
            .single();

          if (profileData) {
            if (typeof profileData.credits === 'number') {
              setCurrentCredits(profileData.credits);
            }
            if (profileData.nickname && profileData.nickname.trim() !== "") {
              setCurrentNickname(profileData.nickname.trim());
            }
          }
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [activeUserId]);

  // 💡 Supabase Realtime 監視（profiles の credits と nickname の更新）
  useEffect(() => {
    if (!activeUserId) return;

    const channel = supabase
      .channel(`chat-profile-${activeUserId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${activeUserId}`,
        },
        (payload: any) => {
          if (payload.new) {
            if (typeof payload.new.credits === "number") {
              setCurrentCredits(payload.new.credits);
            }
            if (payload.new.nickname && payload.new.nickname.trim() !== "") {
              setCurrentNickname(payload.new.nickname.trim());
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeUserId]);

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

  const isHexColor = themeColor.startsWith('#');
  const currentTheme = !isHexColor && themeStyles[themeColor as keyof typeof themeStyles] ? themeStyles[themeColor as keyof typeof themeStyles] : themeStyles.blue;
  
  const finalFloatingButtonClass = floatingButtonClassName || (isHexColor ? "text-white" : `${currentTheme.floatingBg} ${currentTheme.floatingText} ${currentTheme.floatingBorder}`);
  
  const floatingInlineStyle = {
    ...(buttonStyle?.border ? { border: buttonStyle.border } : isHexColor ? { border: `2px solid ${themeColor}` } : {}),
    ...(buttonStyle?.background ? { backgroundColor: buttonStyle.background } : isHexColor ? { backgroundColor: themeColor } : {}),
    ...(buttonStyle?.color ? { color: buttonStyle.color } : {}),
  };

  const boxBorderInlineStyle = isHexColor ? { borderColor: themeColor } : undefined;

  // 初期メッセージ設定
  const [tutorMessages, setTutorMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: initialGreeting,
    },
  ]);

  // 💡 ニックネームが確定した際、初期挨拶の中の "my friend" を動的に置換
  useEffect(() => {
    if (currentNickname && currentNickname.trim() !== "") {
      setTutorMessages((prev) => {
        if (prev.length > 0 && prev[0].role === "assistant") {
          const updatedFirstMsg: ChatMessage = {
            ...prev[0],
            content: initialGreeting.replace(/my friend/gi, currentNickname),
          };
          return [updatedFirstMsg, ...prev.slice(1)];
        }
        return prev;
      });
    }
  }, [currentNickname, initialGreeting]);

  const [tutorInput, setTutorInput] = useState<string>("");
  const [isTutorLoading, setIsTutorLoading] = useState<boolean>(false);
  const [tutorLevel, setTutorLevel] = useState<"steady" | "normal" | "accelerated">(effectiveLearningPace);
  const [requestVisualAid, setRequestVisualAid] = useState<boolean>(false);
  const [modalImageSrc, setModalImageSrc] = useState<string | null>(null);

  useEffect(() => {
    if (effectiveLearningPace) {
      setTutorLevel(effectiveLearningPace);
    }
  }, [effectiveLearningPace]);

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
        .select('credits, nickname')
        .eq('id', activeUserId)
        .single();
      
      if (data && !error) {
        if (typeof data.credits === 'number') {
          setCurrentCredits(data.credits);
        }
        if (data.nickname && data.nickname.trim() !== "") {
          setCurrentNickname(data.nickname.trim());
        }
      }
    } catch (err) {
      console.error("Failed to refresh user data:", err);
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

  const handleSendTutorMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!tutorInput.trim() && !selectedImage) || isTutorLoading) return;

    if (!activeUserId) {
      alert("お話しするには、無料サインアップまたはログインが必要です！");
      handleTriggerAuth('signup');
      return;
    }

    if (currentCredits <= 0) {
      const callName = currentNickname || "my friend";
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

    const requiredCredits = (requestVisualAid || Boolean(selectedImage) || appType === "kanji-grammar-checker-ocr") ? 4 : 2;

    if (currentCredits < requiredCredits) {
      const callName = currentNickname || "my friend";
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

      // 💡 決定されたニックネーム（未設定時のみ My friend）をAPIへ送信
      const sendingNickname = currentNickname && currentNickname.trim() !== "" ? currentNickname.trim() : "My friend";

      const response = await fetch("https://api.jptutoraiyamato.com/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          history: tutorMessages.map(m => ({ role: m.role, content: m.content })),
          learningPace: tutorLevel,
          userNickname: sendingNickname, // 🌟 ニックネーム送信
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
          const callName = currentNickname || "my friend";
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

      // 🌟 ヘッダーのクレジット表記を即座（F5なし）に連動更新
      const nextCredits = Math.max(0, currentCredits - requiredCredits);
      setCurrentCredits(nextCredits);

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("yamato:credits-updated", {
            detail: { credits: nextCredits },
          })
        );
      }

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
            className={`${finalFloatingButtonClass} font-bold px-4 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all cursor-pointer text-sm relative`}
          >
            <span>🤖</span>
            <span>{characterName}</span>
            {selectedImagePreview && (
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
            className={`bg-white border-2 ${!isHexColor ? currentTheme.border : ''} rounded-2xl p-5 shadow-2xl flex flex-col transition-all ${
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

              {/* クレジット表示エリア */}
              <div className={`${currentTheme.badgeBg} border rounded-xl p-2 mb-2 flex items-center justify-between shrink-0`}>
                <span className={`text-xs font-bold ${currentTheme.badgeText}`}>Account Status</span>
                {activeUserId ? (
                  <div className="flex items-center gap-2">
                    {currentNickname && (
                      <span className="text-[10px] text-slate-600 font-medium">
                        👤 {currentNickname}
                      </span>
                    )}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${currentCredits >= FEATURE_COSTS.textAi ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                      🪙 {currentCredits} credits
                    </span>
                  </div>
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
                        placeholder={selectedImagePreview ? "Ask feedback for photo..." : "Ask Yamato anything..."}
                        disabled={isTutorLoading}
                        className={`flex-grow p-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 ${currentTheme.inputRing} bg-slate-50/50`}
                      />
                      <button
                        type="submit"
                        disabled={isTutorLoading || (!tutorInput.trim() && !selectedImage)}
                        style={isHexColor ? { backgroundColor: themeColor, color: '#ffffff' } : undefined}
                        className={`px-4 py-2 ${currentTheme.submitBtn} font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 shrink-0`}
                      >
                        Send
                      </button>
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
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
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