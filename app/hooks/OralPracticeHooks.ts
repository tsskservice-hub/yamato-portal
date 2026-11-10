/**
 * @file OralPracticeHooks.ts
 * @description マニュアル録音（ボタンあり）と自動無音検知（ボタンなし・ハンズフリー）の両方に対応したオーラル練習エンジンフック
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

  // VAD（無音検知）用の参照
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimerRef = useRef<any>(null);
  const isSpeakingDetectedRef = useRef<boolean>(false);
  const animationFrameRef = useRef<number | null>(null);

  // TTS Voice Playback via Backend API (カスケード型対応)
  const playTTS = async (textToSpeak: string): Promise<void> => {
    return new Promise(async (resolve) => {
      try {
        if (!textToSpeak) { resolve(); return; }
        const cleanedText = textToSpeak
          .replace(/<rt>.*?<\/rt>/g, "")
          .replace(/<.*?>/g, "")
          .replace(/【.*?】/g, "")
          .replace(/※.*$/gm, "")
          .trim();

        if (!cleanedText) { resolve(); return; }

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
          
          audio.onended = () => resolve();
          audio.onerror = () => { fallbackWebSpeech(cleanedText, speechSpeed); resolve(); };
          await audio.play().catch(() => {
            fallbackWebSpeech(cleanedText, speechSpeed);
            resolve();
          });
        } else {
          fallbackWebSpeech(cleanedText, speechSpeed);
          resolve();
        }
      } catch (err) {
        fallbackWebSpeech(textToSpeak, speechSpeed);
        resolve();
      }
    });
  };

  // ==========================================
  // 🔘 【パターンA：ボタンあり（マニュアル録音）用】
  // ==========================================
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
        stream.getTracks().forEach((t) => t.stop());
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

  // ボタンありモードでの音声文字起こし（STT）
  const transcribeAudioManually = async (audioBlob: Blob) => {
    setIsAnalyzing(true);
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      const base64Audio = reader.result as string;
      try {
        // カスケード型の /chat エンドポイントを利用してSTTおよび返答を取得
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

  // ==========================================
  // 🎙️ 【パターンB：ボタンなし（ハンズフリー・自動無音検知）用】
  // ==========================================
  const processAndSendAudioAuto = async (audioBlob: Blob, answersMap: { [key: string]: string }) => {
    setIsAnalyzing(true);
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      const base64Audio = reader.result as string;
      const currentQ = activeQuestions[currentQuestionIndex];
      const registeredAnswer = answersMap[currentQ?.id] || "";

      try {
        const endpoint = "https://api.jptutoraiyamato.com/chat";
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audioBase64: base64Audio,
            appType: "eoy-oral-accelerated",
            expectedQuestion: currentQ?.questionOriginal || currentQ?.question,
            registeredAnswer: registeredAnswer,
            level: selectedLevel,
            userId,
            userNickname,
            chatHistory: chatMessages.map(m => ({ role: m.role, content: m.content }))
          }),
        });

        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);

        const data = (await res.json()) as any;
        const userTranscript = data.transcript || "（音声認識完了）";
        const aiFeedback = data.reply || "◎ よくできました。";
        const formattedHtml = formatOralFeedbackToHtml(aiFeedback);

        setChatMessages((prev) => [
          ...prev,
          { role: "user", content: userTranscript, isHtml: false },
          { role: "assistant", content: formattedHtml, isHtml: true },
        ]);

        setIsAnalyzing(false);
        await playTTS(aiFeedback);

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
          await playTTS(nextQ.questionOriginal || nextQ.question);
          startAutoRecording(answersMap);
        } else {
          setChatMessages((prev) => [
            ...prev,
            { role: "assistant", content: "<b>🎉 すべての質問が完了しました！お疲れ様でした。</b>", isHtml: true },
          ]);
          setIsPracticing(false);
        }
      } catch (err) {
        console.error("Auto send error:", err);
        setIsAnalyzing(false);
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: "通信エラーが発生しました。もう一度お話しください。", isHtml: false },
        ]);
        startAutoRecording(answersMap);
      }
    };
  };

  const startAutoRecording = useCallback(async (answersMap: { [key: string]: string }) => {
    if (!isPracticing) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        stream.getTracks().forEach((t) => t.stop());
        if (audioCtx.state !== 'closed') audioCtx.close();
        processAndSendAudioAuto(blob, answersMap);
      };

      mediaRecorder.start();
      setIsRecording(true);
      isSpeakingDetectedRef.current = false;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkAudioLevel = () => {
        if (!analyserRef.current || mediaRecorder.state !== "recording") return;
        analyserRef.current.getByteFrequencyData(dataArray);
        
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
        const average = sum / bufferLength;

        const VOICE_THRESHOLD = 15; 
        const SILENCE_DURATION = 1300; // 1.3秒無音が続いたら送信

        if (average > VOICE_THRESHOLD) {
          isSpeakingDetectedRef.current = true;
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        } else if (isSpeakingDetectedRef.current && !silenceTimerRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
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
      console.error("Microphone access error:", err);
      alert("マイクへのアクセスが許可されていません。");
    }
  }, [isPracticing, currentQuestionIndex, activeQuestions, selectedLevel, userId, userNickname]);

  // ==========================================
  // 🚀 セッション開始関数（モード選択対応）
  // ==========================================
  const startPractice = async (
    questionsList: QuestionData[],
    answersMap: { [key: string]: string },
    orderMode: "sequential" | "random" = "sequential",
    modeType: "manual" | "handsfree" = "manual" // 👈 "manual"(ボタンあり) または "handsfree"(ボタンなし) を指定可能
  ) => {
    if (!questionsList || questionsList.length === 0) {
      alert("練習用の設問が見つかりません。");
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

    await playTTS(firstQ.questionOriginal || firstQ.question);

    // ハンズフリーモードの場合はそのまま自動録音を開始
    if (modeType === "handsfree") {
      startAutoRecording(answersMap);
    }
  };

  const stopPractice = () => {
    setIsPracticing(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    setIsRecording(false);
  };

  // ボタンありモード用の手動メッセージ送信関数
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
    startRecording,      // ボタンあり用：手動録音開始
    stopRecording,       // ボタンあり用：手動録音停止
    playTTS,
    startPractice,       // 第4引数に "manual" または "handsfree" を指定可能
    stopPractice,
    proceedToNextQuestion,
    sendAnswerMessage,   // ボタンあり用：テキスト/音声入力送信
  };
}

export default useOralPracticeEngine;