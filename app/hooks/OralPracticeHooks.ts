/**
 *  @file OralPracticeHooks.ts
 *  @description バックエンドAPIの音声・チャットエンドポイントと確実に通信するオーラル練習エンジンフック
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

export function getApiEndpoint(): string {
  return "https://api.jptutoraiyamato.com/chat";
}

export function fallbackWebSpeech(text: string, speed = 1.0) {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
      const cleaned = text
        .replace(/<rt>.*?<\/rt>/g, "")
        .replace(/<.*?>/g, "")
        .replace(/【.*?】/g, "")
        .replace(/※.*$/gm, "")
        .trim();

      if (!cleaned) return;
      const utterance = new SpeechSynthesisUtterance(cleaned);
      utterance.lang = "ja-JP";
      utterance.rate = speed || 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Web Speech API fallback error:", e);
    }
  }
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

// 💡 第3引数 userId と 第4引数 userNickname を追加
export function useOralPracticeEngine(
  selectedLevel = "normal",
  speechSpeed = 1.0,
  userId?: string,
  userNickname?: string
) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Welcome! Click 'Speak to AI Yamato' below to start practicing in the center screen.",
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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // TTS Voice Playback via Backend API
  const playTTS = async (textToSpeak: string) => {
    try {
      if (!textToSpeak) return;
      const cleanedText = textToSpeak
        .replace(/<rt>.*?<\/rt>/g, "")
        .replace(/<.*?>/g, "")
        .replace(/【.*?】/g, "")
        .replace(/※.*$/gm, "")
        .trim();

      if (!cleanedText) return;

      const ttsEndpoint = "https://api.jptutoraiyamato.com/api/test-tts";

      const response = await fetch(ttsEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: cleanedText,
        }),
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.playbackRate = speechSpeed || 1.0;
        await audio.play();
      } else {
        console.warn("Backend TTS failed, falling back to Web Speech API");
        fallbackWebSpeech(cleanedText, speechSpeed);
      }
    } catch (err) {
      console.warn("Server TTS connection error, falling back to Web Speech:", err);
      fallbackWebSpeech(textToSpeak, speechSpeed);
    }
  };

  // Start Audio Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      let mimeType = "audio/webm";
      if (typeof MediaRecorder !== "undefined") {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        }
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        await transcribeAudio(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access error:", err);
      alert("Microphone access is denied or not supported on this browser.");
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

  // Spacebar Keyboard Event Listener
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

  // Speech Transcription via Backend API
  const transcribeAudio = async (audioBlob: Blob) => {
    setIsAnalyzing(true);
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");

    try {
      const sttEndpoint = "https://api.jptutoraiyamato.com/api/test-stt";

      const res = await fetch(sttEndpoint, { method: "POST", body: formData });
      if (!res.ok) throw new Error(`Transcription HTTP Error: ${res.status}`);
      const data = (await res.json()) as any;
      setInputMessage(data.userText || "");
    } catch (err) {
      console.error("Transcription error:", err);
      alert("Audio transcription failed. Please try speaking again or typing your answer.");
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
      alert("No practice questions found for the selected filter.");
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

    // 💡 配列の最初の要素を取得するように [0] を指定
    const firstQ = qList[0];
    const userTargetAns = answersMap[firstQ.id] || "";

    setChatMessages([
      {
        role: "assistant",
        content: `【Practice Session Started】<br><br>Yamato: 「${firstQ.question}」<br><br>(Your Answer: 「${userTargetAns || "(Empty)"}」)<br><br>Please respond using microphone or text!`,
        isHtml: true,
      },
    ]);

    playTTS(firstQ.questionOriginal || firstQ.question);
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
          content: `【Next Question】<br><br>Yamato: 「${nextQ.question}」<br><br>(Your Answer: 「${nextTargetAns || "(Empty)"}」)<br><br>Your turn!`,
          isHtml: true,
        },
      ]);
      setIsWaitingForNext(false);
      playTTS(nextQ.questionOriginal || nextQ.question);
    }
  };

  // Send User Answer Message (Gemini Evaluation Chat)
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
      const endpoint = "https://api.jptutoraiyamato.com/chat";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          appType: "eoy-oral-drill",
          expectedQuestion: currentQ.questionOriginal || currentQ.question,
          registeredAnswer: registeredAnswer,
          mode,
          level: selectedLevel,
          section,
          userId: userId,           // 💡 クレジット減算用
          userNickname: userNickname, // 💡 ニックネーム呼びかけ用
        }),
      });

      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);

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
              content: `【Next Question】<br><br>Yamato: 「${nextQ.question}」<br><br>(Your Answer: 「${nextTargetAns || "(Empty)"}」)<br><br>Your turn!`,
              isHtml: true,
            },
          ]);
          setIsWaitingForNext(false);
          playTTS(nextQ.questionOriginal || nextQ.question);
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
            content: `${formattedHtml}<br><br><b>🎉 All questions completed! Great job!</b>`,
            isHtml: true,
          },
        ]);
        setIsPracticing(false);
      }
    } catch (err) {
      console.error("Send answer error:", err);
      setChatMessages([
        ...newMessages,
        { role: "assistant", content: "An error occurred. Please try sending again.", isHtml: false },
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
    startRecording,
    stopRecording,
    playTTS,
    startPractice,
    proceedToNextQuestion,
    sendAnswerMessage,
  };
}

export default useOralPracticeEngine;