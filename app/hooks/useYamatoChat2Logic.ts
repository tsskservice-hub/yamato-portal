import { yamatoFetch } from '~/lib/yamatoApi';
import { useState, useRef } from "react";
import { useYamatoAccount, getSafeString } from "../hooks/useYamatoAccount";
import { personaliseGreeting, resolveDisplayName } from "../utils/nickname";
import { addAiGeneratedLabel } from "../utils/aiImageLabel";

export type ChatOption = {
  label: string;
  value: string;
};

export type ChatMessage = {
  role: "assistant" | "user";
  content: string;
  imageUrl?: string;
  options?: ChatOption[];
};

export type UseYamatoChat2LogicProps = {
  initialGreeting?: string;
  systemPrompt?: string;
  appType?: string;
  initialLearningPace?: "steady" | "normal" | "accelerated";
  userId?: string;
  userNickname?: string;
  credits?: number;
  onOpenAuth?: (mode?: "signin" | "signup") => void;
  externalImageFile?: File | null;
  externalImagePreview?: string | null;
  onClearExternalImage?: () => void;
  assignedQuestion?: string;
  calculateCreditCost?: (imageCount: number) => number;
  baseCreditCost?: number;
  image1CreditCost?: number;
  image2To4CreditCost?: number;
};

export function useYamatoChat2Logic({
  initialGreeting,
  systemPrompt = "",
  appType = "general",
  initialLearningPace, // 💡 受け取っている引数名
  userId: propUserId,
  userNickname: propNickname,
  credits: propCredits,
  onOpenAuth,
  externalImageFile,
  externalImagePreview,
  onClearExternalImage,
  assignedQuestion = "",
  calculateCreditCost,
  baseCreditCost = 2,
  image1CreditCost = 4,
  image2To4CreditCost = 6,
}: UseYamatoChat2LogicProps) {
  // アカウント同期フック（ここで propLearningPace に結びつける）
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
    propLearningPace: initialLearningPace, // 💡 修正点: initialLearningPace を propLearningPace として渡す
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

  const sanitizeAiOutput = (text: string): string => {
    if (!text) return "";
    return text.replace(/^#{1,6}\s+/gm, "").replace(/\*\*/g, "");
  };

  // 授業開始時の処理（挨拶自動生成）
  const handleStartLesson = async () => {
    if (!activeUserId) {
      alert("レッスンを始めるには、無料サインアップまたはログインが必要です！");
      handleTriggerAuth("signup");
      return;
    }

    setIsLessonStarted(true);

    const rawGreeting =
      initialGreeting ||
      `Awesome! Let's dive right into today's Japanese lesson! ✨\nToday, we are going to learn about "${assignedQuestion || "Japanese"}".\n\nHow would you like to start? Please choose an option below:`;

    const greetingMsg = personaliseGreeting(rawGreeting, currentNickname);

    const initialMsgList: ChatMessage[] = [
      {
        role: "assistant",
        content: greetingMsg,
        options: [
          { label: "🚀 I already know the Learning Intention and Success Criteria! Let's jump into vocabulary and practice!", value: "1" },
          { label: "📖 I want to check the Learning Intention and Success Criteria first!", value: "2" },
        ],
      },
    ];
    setTutorMessages(initialMsgList);
  };

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

      const response = await yamatoFetch("https://api.jptutoraiyamato.com/chat", {
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

        // 🔐 ログインが必要（401）
        if (response.status === 401) {
          setIsTutorLoading(false);
          setTutorMessages([
            ...newMessages,
            {
              role: "assistant",
              content: `🔐 **[Login Required]**\n\nPlease log in to chat with AI Yamato.`,
            },
          ]);
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
      // ヤマトが描いた絵には「AI-generated」のラベルを焼き込んでから表示する
      const imageUrl = data.imageUrl ? await addAiGeneratedLabel(data.imageUrl) : undefined;
      const apiOptions = data.options;
      const sanitizedReply = sanitizeAiOutput(replyText);

      setIsTutorLoading(false);
      setTutorMessages([
        ...newMessages,
        {
          role: "assistant",
          content: sanitizedReply,
          imageUrl: imageUrl,
          options: Array.isArray(apiOptions) ? apiOptions : undefined,
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

  return {
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
    clearSelectedImage: () => {
      setSelectedImage(null);
      setSelectedImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (onClearExternalImage) onClearExternalImage();
    },
  };
}