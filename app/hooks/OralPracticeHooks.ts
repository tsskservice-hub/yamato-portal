/**
 * @file OralPracticeHooks.ts
 * @description VCE Oral Examination Practice Hook (OpenAI TTS fable 固定・ブラウザ読み上げ廃止＆DataErrorState連動対応版)
 */
import { useState, useEffect, useRef } from "react";

export type ChatMessage = {
  role: "assistant" | "user";
  content: string;
  isHtml?: boolean;
};

export interface QuestionData {
  id: string;
  question: string;
  questionOriginal: string;
  defaultAnswer?: string;
  category?: string;
}

export function formatOralFeedbackToHtml(rawText: string): string {
  if (!rawText) return "";
  let cleaned = rawText.replace(/^#{1,6}\s+/gm, "").replace(/\*\*/g, "");

  cleaned = cleaned.replace(
    /Evaluation\s*(&|and)\s*Score:/gi,
    '<div style="margin-top: 1rem; margin-bottom: 0.5rem; padding: 0.5rem 0.75rem; background: #e0f2fe; color: #0369a1; font-weight: 800; font-size: 0.9rem; border-left: 4px solid #0284c7; border-radius: 0.375rem;">📊 Evaluation & Score</div>'
  );

  cleaned = cleaned.replace(
    /Analysis\s*(&|and)\s*Corrections:/gi,
    '<div style="margin-top: 1rem; margin-bottom: 0.5rem; padding: 0.5rem 0.75rem; background: #fef3c7; color: #b45309; font-weight: 800; font-size: 0.9rem; border-left: 4px solid #d97706; border-radius: 0.375rem;">💡 Analysis & Corrections</div>'
  );

  cleaned = cleaned.replace(
    /Grammar\s*(&|and)\s*Vocabulary\s*Notes:/gi,
    '<div style="margin-top: 1rem; margin-bottom: 0.5rem; padding: 0.5rem 0.75rem; background: #ffedd5; color: #c2410c; font-weight: 800; font-size: 0.9rem; border-left: 4px solid #ea580c; border-radius: 0.375rem;">📚 Grammar & Vocabulary Notes</div>'
  );

  cleaned = cleaned.replace(
    /Refined\s*Expression\s*(&|and)\s*Polish:/gi,
    '<div style="margin-top: 1rem; margin-bottom: 0.5rem; padding: 0.5rem 0.75rem; background: #d1fae5; color: #065f46; font-weight: 800; font-size: 0.9rem; border-left: 4px solid #059669; border-radius: 0.375rem;">✨ Refined Expression & Polish</div>'
  );

  cleaned = cleaned.replace(/\n/g, "<br>");
  return cleaned;
}

export function useOralPracticeEngine(selectedLevel = "normal", speechSpeed = 1.0) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "ようこそ！下の「Speak to AI Yamato」を押して中央画面で対話練習を始めましょう。",
      isHtml: false,
    },
  ]);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [isPracticing, setIsPracticing] = useState<boolean>(false);
  const [activeQuestions, setActiveQuestions] = useState<QuestionData[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isWaitingForNext, setIsWaitingForNext] = useState<boolean>(false);

  // 💡 TTS エラー管理用ステート（DataErrorState表示用）
  const [ttsError, setTtsError] = useState<boolean>(false);
  const [ttsErrorMessage, setTtsErrorMessage] = useState<string>("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // 💡 OpenAI TTS（サーバー経由固定・fableボイス指定）
  const playTTS = async (textToSpeak: string) => {
    try {
      setTtsError(false);
      setTtsErrorMessage("");

      const cleanedText = textToSpeak
        .replace(/【.*?】/g, "")
        .replace(/※.*$/gm, "")
        .trim();

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          speakText: cleanedText,
          voice: "fable", // 💡 OpenAI TTS fable ボイス固定
          level: selectedLevel,
          speed: speechSpeed,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI TTS Server Response Error (${response.status})`);
      }

      const audioBlob = await response.blob();
      if (audioBlob.size === 0) {
        throw new Error("Received empty audio blob from OpenAI TTS server");
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      await audio.play();
    } catch (err: any) {
      console.error("❌ OpenAI TTS connection error:", err);
      // 💡 ブラウザ代替読み上げ（Web Speech API）は行わず、DataErrorState トリガーのステートを設定
      setTtsError(true);
      setTtsErrorMessage(
        `OpenAI TTS (fable) サーバーへの接続に失敗しました: ${err.message || String(err)}`
      );
    }
  };

  // Start Audio Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await transcribeAudio(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert("マイクへのアクセスが許可されていません。");
    }
  };

  // Stop Audio Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      setIsRecording(false);
    }
  };

  // Keyboard Spacebar listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === " ") {
        const target = e.target as HTMLElement;
        if (
          target &&
          (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
        ) {
          return;
        }
        if (!isPracticing || isAnalyzing || isWaitingForNext) return;

        e.preventDefault();
        if (!isRecording) startRecording();
        else stopRecording();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPracticing, isAnalyzing, isWaitingForNext, isRecording]);

  // Speech Transcription via /api/chat
  const transcribeAudio = async (audioBlob: Blob) => {
    setIsAnalyzing(true);
    const currentQ = activeQuestions[currentQuestionIndex];
    const formData = new FormData();
    formData.append("audio", audioBlob, "user-audio.webm");
    formData.append("expectedQuestion", currentQ?.questionOriginal || "");
    formData.append("mode", "drill-practice");
    formData.append("level", selectedLevel);

    try {
      const res = await fetch("/api/chat", { method: "POST", body: formData });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as any;
      setInputMessage(data.userText || "");
    } catch (err) {
      alert("音声の書き起こしに失敗しました。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Start Practice Session
  const startPractice = (
    questionsList: QuestionData[],
    answersMap: { [key: string]: string },
    orderMode: "sequential" | "random" = "sequential"
  ) => {
    if (!questionsList || questionsList.length === 0) {
      alert("練習対象の設問が見つかりませんでした。");
      return;
    }

    let qList = [...questionsList];
    if (orderMode === "random") {
      qList = qList.sort(() => Math.random() - 0.5);
    }

    setActiveQuestions(qList);
    setCurrentQuestionIndex(0);
    setIsPracticing(true);
    setIsWaitingForNext(false);
    setInputMessage("");

    const firstQ = qList[0];
    const userTargetAns = answersMap[firstQ.id] || "";

    setChatMessages([
      {
        role: "assistant",
        content: `【Practice Session Started】\n\nYamato: 「${firstQ.question}」\n\n(あなたの作成解答: 「${userTargetAns || "（未入力）"}」)\n\nマイクまたはテキストで回答してください！`,
        isHtml: true,
      },
    ]);

    playTTS(firstQ.questionOriginal);
  };

  // Proceed to Next Question
  const proceedToNextQuestion = (answersMap: { [key: string]: string }) => {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < activeQuestions.length) {
      setCurrentQuestionIndex(nextIndex);
      const nextQ = activeQuestions[nextIndex];
      const nextTargetAns = answersMap[nextQ.id] || "";
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `【Next Question】\nYamato: 「${nextQ.question}」\n(あなたの作成解答: 「${nextTargetAns || "（未入力）"}」)\n\nどうぞ！`,
          isHtml: true,
        },
      ]);
      setIsWaitingForNext(false);
      playTTS(nextQ.questionOriginal);
    }
  };

  // Send Answer Message
  const sendAnswerMessage = async (
    e: React.FormEvent,
    answersMap: { [key: string]: string },
    mode = "drill",
    section = "sec1"
  ) => {
    e.preventDefault();
    if (!inputMessage.trim() || isAnalyzing) return;

    const userText = inputMessage.trim();
    setInputMessage("");

    const newMessages: ChatMessage[] = [
      ...chatMessages,
      { role: "user", content: userText, isHtml: false },
    ];
    setChatMessages(newMessages);
    setIsAnalyzing(true);

    const currentQ = activeQuestions[currentQuestionIndex];
    const registeredAnswer = answersMap[currentQ.id] || "";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          expectedQuestion: currentQ.questionOriginal,
          registeredAnswer: registeredAnswer,
          mode,
          level: selectedLevel,
          section,
        }),
      });

      const data = (await res.json()) as any;
      const aiFeedback = data.reply || "◎ よくできました。";
      const formattedHtml = formatOralFeedbackToHtml(aiFeedback);

      const nextIndex = currentQuestionIndex + 1;
      const isPerfect = aiFeedback.trim().startsWith("◎");

      if (isPerfect && nextIndex < activeQuestions.length) {
        setTimeout(() => {
          setCurrentQuestionIndex(nextIndex);
          const nextQ = activeQuestions[nextIndex];
          const nextTargetAns = answersMap[nextQ.id] || "";
          setChatMessages((prev) => [
            ...prev,
            { role: "assistant", content: formattedHtml, isHtml: true },
            {
              role: "assistant",
              content: `【Next Question】\nYamato: 「${nextQ.question}」\n(あなたの作成解答: 「${nextTargetAns || "（未入力）"}」)\n\nどうぞ！`,
              isHtml: true,
            },
          ]);
          setIsWaitingForNext(false);
          playTTS(nextQ.questionOriginal);
        }, 500);
      } else if (nextIndex < activeQuestions.length) {
        setIsWaitingForNext(true);
        setChatMessages([
          ...newMessages,
          { role: "assistant", content: formattedHtml, isHtml: true },
        ]);
      } else {
        setChatMessages([
          ...newMessages,
          {
            role: "assistant",
            content: `${formattedHtml}<br><br><b>🎉 すべての問題を完了しました！お疲れ様でした！</b>`,
            isHtml: true,
          },
        ]);
        setIsPracticing(false);
      }
    } catch (err) {
      setChatMessages([
        ...newMessages,
        { role: "assistant", content: "エラーが発生しました。もう一度送信してください。", isHtml: false },
      ]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return {
    chatMessages,
    inputMessage,
    setInputMessage,
    isPracticing,
    activeQuestions,
    currentQuestionIndex,
    isAnalyzing,
    isRecording,
    isWaitingForNext,
    ttsError,
    ttsErrorMessage,
    resetTtsError: () => setTtsError(false),
    startRecording,
    stopRecording,
    playTTS,
    startPractice,
    proceedToNextQuestion,
    sendAnswerMessage,
  };
}
