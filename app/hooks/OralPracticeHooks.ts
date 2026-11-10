/**
 * @file OralPracticeHooks.ts
 * @description ハンズフリー自動送信のパラメータを最適化し、400エラーを解消した完全版フック
 */
import { useState, useEffect, useRef, useCallback } from "react";

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

export function useOralPracticeEngine(
  selectedLevel = "normal",
  speechSpeed = 1.0,
  userId?: string,
  userNickname?: string
) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "ようこそ！練習モードを選択してスタートしてください。",
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

  // 💡 マイクストリームをセッション中保持するためのRef
  const persistentStreamRef = useRef<MediaStream | null>(null);

  // VAD（無音検知）用の参照
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimerRef = useRef<any>(null);
  const isSpeakingDetectedRef = useRef<boolean>(false);
  const animationFrameRef = useRef<number | null>(null);

  // 🔊 TTS Voice Playback
  const playTTS = async (textToSpeak: string): Promise<void> => {
    return new Promise(async (resolve) => {
      console.log("🔊 [DEBUG] playTTS called with text:", textToSpeak);
      let isResolved = false;
      const safeResolve = (origin: string) => {
        if (!isResolved) {
          isResolved = true;
          console.log(`🔊 [DEBUG] playTTS resolved from: ${origin}`);
          resolve();
        }
      };

      try {
        if (!textToSpeak) {
          safeResolve("empty-text");
          return;
        }
        const cleanedText = textToSpeak
          .replace(/<rt>.*?<\/rt>/g, "")
          .replace(/<.*?>/g, "")
          .replace(/【.*?】/g, "")
          .replace(/※.*$/gm, "")
          .trim();

        if (!cleanedText) {
          safeResolve("empty-cleaned-text");
          return;
        }

        const ttsEndpoint = "https://api.jptutoraiyamato.com/api/test-tts";
        const response = await fetch(ttsEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: cleanedText }),
        });

        if (response.ok) {
          const audioBlob = await response.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          audio.playbackRate = speechSpeed || 1.0;

          const estimatedDurationMs = Math.max(cleanedText.length * 200, 2000) / (speechSpeed || 1.0) + 1500;

          const estimatedTimer = setTimeout(() => {
            console.warn("⏱️ [DEBUG] Estimated duration reached. Forcing audio pause & resolve.");
            audio.pause();
            safeResolve("estimated-timer");
          }, estimatedDurationMs);
          
          audio.onended = () => {
            console.log("🔊 [DEBUG] audio.onended event fired.");
            clearTimeout(estimatedTimer);
            safeResolve("onended");
          };

          audio.onerror = (e) => {
            console.error("❌ [DEBUG] audio.onerror event fired:", e);
            clearTimeout(estimatedTimer);
            fallbackWebSpeech(cleanedText, speechSpeed);
            safeResolve("onerror");
          };

          await audio.play().catch((playErr) => {
            console.warn("⚠️ [DEBUG] audio.play() was blocked or failed:", playErr);
            clearTimeout(estimatedTimer);
            fallbackWebSpeech(cleanedText, speechSpeed);
            safeResolve("play-catch");
          });
        } else {
          fallbackWebSpeech(cleanedText, speechSpeed);
          safeResolve("response-not-ok");
        }
      } catch (err) {
        console.error("❌ [DEBUG] playTTS exception caught:", err);
        fallbackWebSpeech(textToSpeak, speechSpeed);
        safeResolve("exception");
      }
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      persistentStreamRef.current = stream;
      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        await transcribeAudioManually(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access error:", err);
      alert("マイクへのアクセスが許可されていません。");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudioManually = async (audioBlob: Blob) => {
    setIsAnalyzing(true);
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      const base64Audio = reader.result as string;
      try {
        const endpoint = "https://api.jptutoraiyamato.com/chat";
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audioBase64: base64Audio,
            appType: "eoy-oral-drill",
            level: selectedLevel,
            userId,
            userNickname,
          }),
        });
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
        const data = (await res.json()) as any;
        setInputMessage(data.transcript || "");
      } catch (err) {
        console.error("Transcription error:", err);
        alert("音声の文字起こしに失敗しました。");
      } finally {
        setIsAnalyzing(false);
      }
    };
  };

  // ハンズフリー自動送信処理（必要なパラメータを全て網羅）
  const processAndSendAudioAuto = async (audioBlob: Blob, answersMap: { [key: string]: string }) => {
    console.log("🤖 [DEBUG] processAndSendAudioAuto started. Blob size:", audioBlob.size);
    setIsAnalyzing(true);
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      const base64Audio = reader.result as string;
      const currentQ = activeQuestions[currentQuestionIndex];
      const registeredAnswer = answersMap[currentQ?.id] || "";

      try {
        const endpoint = "https://api.jptutoraiyamato.com/chat";
        const requestPayload = {
          audioBase64: base64Audio,
          appType: "eoy-oral-accelerated",
          mode: "drill",
          section: "sec1",
          expectedQuestion: currentQ?.questionOriginal || currentQ?.question,
          registeredAnswer: registeredAnswer,
          level: selectedLevel,
          userId,
          userNickname,
          chatHistory: chatMessages.map(m => ({ role: m.role, content: m.content }))
        };

        console.log("🤖 [DEBUG] Sending audio to backend endpoint (/chat) with payload:", requestPayload);
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestPayload),
        });

        if (!res.ok) {
          const errBody = await res.text();
          console.error(`❌ [DEBUG] Backend HTTP Error ${res.status}:`, errBody);
          throw new Error(`HTTP Error: ${res.status} - ${errBody}`);
        }

        const data = (await res.json()) as any;
        console.log("🤖 [DEBUG] Backend response received:", data);

        const userTranscript = data.transcript || "（音声認識完了）";
        const aiFeedback = data.reply || "◎ よくできました。";
        const formattedHtml = formatOralFeedbackToHtml(aiFeedback);

        setChatMessages((prev) => [
          ...prev,
          { role: "user", content: userTranscript, isHtml: false },
          { role: "assistant", content: formattedHtml, isHtml: true },
        ]);

        setIsAnalyzing(false);
        console.log("🔊 [DEBUG] Playing AI feedback TTS...");
        await playTTS(aiFeedback);
        console.log("🔊 [DEBUG] AI feedback TTS finished.");

        const nextIndex = currentQuestionIndex + 1;
        if (nextIndex < activeQuestions.length) {
          setCurrentQuestionIndex(nextIndex);
          const nextQ = activeQuestions[nextIndex];
          const nextTargetAns = answersMap[nextQ.id] || "";
          
          setChatMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `【Next Question】<br><br>Yamato: 「${nextQ.question}」<br><br>（どうぞ、お話しください...）`,
              isHtml: true,
            },
          ]);
          console.log("🔊 [DEBUG] Playing next question TTS...");
          await playTTS(nextQ.questionOriginal || nextQ.question);
          console.log("🔊 [DEBUG] Next question TTS finished. Starting auto recording...");
          startAutoRecording(answersMap);
        } else {
          setChatMessages((prev) => [
            ...prev,
            { role: "assistant", content: "<b>🎉 すべての質問が完了しました！お疲れ様でした。</b>", isHtml: true },
          ]);
          setIsPracticing(false);
          stopPractice();
        }
      } catch (err) {
        console.error("❌ [DEBUG] Auto send error:", err);
        setIsAnalyzing(false);
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: "通信エラーが発生しました。もう一度お話しください。", isHtml: false },
        ]);
        startAutoRecording(answersMap);
      }
    };
  };

  // 💡 自動無音検知録音の開始
  const startAutoRecording = useCallback(async (answersMap: { [key: string]: string }) => {
    console.log("🎤 [DEBUG] startAutoRecording invoked.");
    try {
      let stream = persistentStreamRef.current;
      if (!stream || !stream.active) {
        console.log("🎤 [DEBUG] Requesting getUserMedia stream inside startAutoRecording...");
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        persistentStreamRef.current = stream;
      }

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;

      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        console.log("🎤 [DEBUG] MediaRecorder stopped. Processing recorded blob...");
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioCtx.state !== 'closed') audioCtx.close();
        processAndSendAudioAuto(blob, answersMap);
      };

      mediaRecorder.start();
      setIsRecording(true);
      isSpeakingDetectedRef.current = false;
      console.log("🔴 [DEBUG] MediaRecorder started successfully. Mic is now ON (Listening...).");

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkAudioLevel = () => {
        if (!analyserRef.current || mediaRecorder.state !== "recording") return;
        analyserRef.current.getByteFrequencyData(dataArray);
        
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
        const average = sum / bufferLength;

        const VOICE_THRESHOLD = 15; 
        const SILENCE_DURATION = 1300; 

        if (average > VOICE_THRESHOLD) {
          if (!isSpeakingDetectedRef.current) {
            console.log("🗣️ [DEBUG] Voice detected! Average volume:", average);
          }
          isSpeakingDetectedRef.current = true;
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        } else if (isSpeakingDetectedRef.current && !silenceTimerRef.current) {
          console.log("🤫 [DEBUG] Silence detected after speech. Starting silence countdown...");
          silenceTimerRef.current = setTimeout(() => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
              console.log("⏹️ [DEBUG] Silence duration reached. Stopping MediaRecorder automatically.");
              setIsRecording(false);
              mediaRecorderRef.current.stop();
              if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            }
          }, SILENCE_DURATION);
        }

        animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
      };

      checkAudioLevel();
    } catch (err) {
      console.error("❌ [DEBUG] Microphone access error in startAutoRecording:", err);
      alert("マイクへのアクセスが許可されていません。ブラウザの設定をご確認ください。");
    }
  }, [currentQuestionIndex, activeQuestions, selectedLevel, userId, userNickname]);

  const startPractice = async (
    questionsList: QuestionData[],
    answersMap: { [key: string]: string },
    orderMode: "sequential" | "random" = "sequential",
    modeType: "manual" | "handsfree" = "manual"
  ) => {
    console.log("🚀 [DEBUG] startPractice invoked with modeType:", modeType);
    if (!questionsList || questionsList.length === 0) {
      alert("練習用の設問が見つかりません。");
      return;
    }

    if (modeType === "handsfree" && (!persistentStreamRef.current || !persistentStreamRef.current.active)) {
      try {
        console.log("🚀 [DEBUG] Requesting initial getUserMedia permission for handsfree...");
        persistentStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("🚀 [DEBUG] Initial getUserMedia granted.");
      } catch (e) {
        console.error("❌ [DEBUG] getUserMedia rejected:", e);
        alert("マイクの使用が許可されませんでした。ブラウザの設定をご確認ください。");
        return;
      }
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

    const startMsg = modeType === "handsfree"
      ? `【ハンズフリー会話開始】<br><br>Yamato: 「${firstQ.question}」<br><br>（どうぞ、マイクに向かってお話しください...）`
      : `【ドリルセッション開始】<br><br>Yamato: 「${firstQ.question}」<br><br>(Your Answer: 「${userTargetAns || "(Empty)"}」)<br><br>録音ボタンを押して答えてください！`;

    setChatMessages([
      {
        role: "assistant",
        content: startMsg,
        isHtml: true,
      },
    ]);

    console.log("🔊 [DEBUG] Playing first question TTS...");
    await playTTS(firstQ.questionOriginal || firstQ.question);
    console.log("🔊 [DEBUG] First question TTS finished.");

    if (modeType === "handsfree") {
      console.log("🎤 [DEBUG] Triggering initial startAutoRecording...");
      startAutoRecording(answersMap);
    }
  };

  const stopPractice = () => {
    console.log("🛑 [DEBUG] stopPractice invoked.");
    setIsPracticing(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    
    if (persistentStreamRef.current) {
      persistentStreamRef.current.getTracks().forEach((t) => t.stop());
      persistentStreamRef.current = null;
    }
    setIsRecording(false);
  };

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
    const registeredAnswer = answersMap[currentQ?.id] || "";

    try {
      const endpoint = "https://api.jptutoraiyamato.com/chat";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          appType: "eoy-oral-drill",
          expectedQuestion: currentQ?.questionOriginal || currentQ?.question,
          registeredAnswer: registeredAnswer,
          mode,
          level: selectedLevel,
          section,
          userId: userId,
          userNickname: userNickname,
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
            content: `${formattedHtml}<br><br><b>🎉 すべての質問が完了しました！お疲れ様でした。</b>`,
            isHtml: true,
          },
        ]);
        setIsPracticing(false);
      }
    } catch (err) {
      console.error("Send answer error:", err);
      setChatMessages([
        ...newMessages,
        { role: "assistant", content: "エラーが発生しました。もう一度送信してください。", isHtml: false },
      ]);
    } finally {
      setIsAnalyzing(false);
    }
  };

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
    stopPractice,
    proceedToNextQuestion,
    sendAnswerMessage,
  };
}

export default useOralPracticeEngine;