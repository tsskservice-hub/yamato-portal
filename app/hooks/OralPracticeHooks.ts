/**
 * @file OralPracticeHooks.ts
 * @description ハンズフリー会話がエンドレスに継続し、ユーザーが終了を意図した際（「終わり」等の発話）にのみセッションが終了するように修正した完全版フック
 */
import { yamatoFetch } from '~/lib/yamatoApi';
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
  /** 質問の音声ファイル（例: /audio/Q001.mp3）。あればAIの読み上げの代わりにこれを流す。カスタム質問にはない */
  audio?: string;
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

/**
 * 生徒が「質問をもう一度言ってほしい」と言ったかどうか。
 * 「すみません」だけ、または「すみません、もういちど言ってください／お願いします」なら true（漢字・ひらがな・句読点の違いは無視）。
 * true のときは AI を呼ばずに（クレジットを使わずに）質問をもう一度読む。
 */
export function isRepeatRequest(text: string): boolean {
  const t = (text || "").replace(/[\s、。,.!！?？「」『』…・〜~ー-]/g, "");
  return /^(すみません|すいません|済みません)(もう(いちど|一度|1度|１度)((いって|言って)(ください|下さい)|(おねがい|お願い)(します|いたします|致します)))?$/.test(t);
}

export function useOralPracticeEngine(
  selectedLevel = "normal",
  speechSpeed = 1.0,
  userId?: string,
  userNickname?: string,
  initialMessage = "Press the 🚀 Speak to AI Yamato (Start Practice) button to start your practice."
) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: initialMessage,
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
  // 質問の音声ファイルが読めなかったときの内容（null ならエラーなし）。画面はこれがあると DataErrorState を出す
  const [questionAudioError, setQuestionAudioError] = useState<string | null>(null);
  // elaborate の「つっこみ質問」: 試験官が今たずねているつっこみ（null ならなし）。token は 1 回だけ使える無料の券
  const [followUp, setFollowUp] = useState<{ question: string; token: string } | null>(null);
  const followUpRef = useRef<{ question: string; token: string } | null>(null);
  const setFollowUpBoth = (value: { question: string; token: string } | null) => {
    followUpRef.current = value;
    setFollowUp(value);
  };

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

  // 録音が終わった時点の「今の質問」を確実に読むための参照（録音開始時のクロージャは古いことがある）
  const latestQuestionRef = useRef<{ list: QuestionData[]; index: number }>({ list: [], index: 0 });
  latestQuestionRef.current = { list: activeQuestions, index: currentQuestionIndex };
  // 練習を始めたときの「生徒が登録した答え」（文字起こしの手がかりに使う）
  const answersRef = useRef<{ [key: string]: string }>({});

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
        const response = await yamatoFetch(ttsEndpoint, {
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

  // 🔊 質問を流す: 音声ファイルがあればそれを（AI を呼ばないので運営側の費用もかからない）、なければ AI の読み上げ（カスタム質問）
  // 速さの設定（0.8x〜1.2x）は再生速度として同じように効く。
  // ファイルが読めなかったときは AI に切り替えず、練習を止めて questionAudioError を立てる（画面が DataErrorState でエラー報告を出す）
  const playQuestion = (q: QuestionData): Promise<void> => {
    if (!q.audio) return playTTS(q.questionOriginal || q.question);
    const audioPath = q.audio;
    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (!done) {
          done = true;
          resolve();
        }
      };
      const fail = (reason: string) => {
        if (done) return;
        done = true;
        console.error(`❌ Question audio failed: ${audioPath} (${reason})`);
        stopPractice();
        setQuestionAudioError(`Question audio failed to load: ${audioPath} (${reason})`);
        resolve();
      };
      const audio = new Audio(audioPath);
      audio.playbackRate = speechSpeed || 1.0;
      audio.onended = finish;
      audio.onerror = () => fail(`media error code ${audio.error?.code ?? "unknown"}`);
      audio.play().catch((err: any) => {
        // ブラウザが自動再生を止めただけ（ファイルは無事）のときはエラー画面にしない。
        // 質問の文は画面に出ているので、生徒は「すみません」でもう一度流せる
        if (err?.name === "NotAllowedError") {
          finish();
          return;
        }
        fail(err?.name || "play() failed");
      });
    });
  };

  const startRecording = async () => {
    // 言い直し: 前に録音して文字になった答えは消してから録り直す
    setInputMessage("");
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
        // 🎙️ 録音が終わったらマイクを閉じる（閉じないと、練習が終わってもブラウザの「録音中」表示が消えない）
        stream.getTracks().forEach((t) => t.stop());
        if (persistentStreamRef.current === stream) persistentStreamRef.current = null;
        await transcribeAudioManually(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access error:", err);
      alert("Microphone access is not allowed. Please check your browser settings.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // 🔁 今の質問をもう一度読む（「すみません」と言われたとき。AI は呼ばないのでクレジットは使わない）
  const repeatCurrentQuestion = async (studentText: string) => {
    // つっこみ質問の途中なら、つっこみ質問をもう一度読む
    const activeFollowUp = followUpRef.current;
    if (activeFollowUp) {
      setChatMessages((prev) => [
        ...prev,
        { role: "user", content: studentText, isHtml: false },
        { role: "assistant", content: `Yamato: 「${activeFollowUp.question}」`, isHtml: true },
      ]);
      await playTTS(activeFollowUp.question);
      return;
    }
    const { list, index } = latestQuestionRef.current;
    const q = list[index];
    if (!q) return;
    setChatMessages((prev) => [
      ...prev,
      { role: "user", content: studentText, isHtml: false },
      { role: "assistant", content: `Yamato: 「${q.question}」`, isHtml: true },
    ]);
    await playQuestion(q);
  };

  // 🎙️ 録音 → 文字起こしだけ（/api/stt。AI の返事は作らないのでクレジットは使わない）
  // 以前は /chat に送っていたため、文字起こしのたびに AI が呼ばれ 3 クレジット引かれていた（返事は捨てていた）
  const transcribeAudioManually = async (audioBlob: Blob) => {
    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      // 文字起こしの手がかり: 今の質問と、生徒が登録した答え。
      // 「ペットを飼ったことがあります」が「買った」になるような、同じ音の漢字の取り違えを減らす
      const { list, index } = latestQuestionRef.current;
      const currentQ = list[index];
      if (followUpRef.current) {
        formData.append("prompt", followUpRef.current.question);
      } else if (currentQ) {
        const hint = [currentQ.questionOriginal || currentQ.question, answersRef.current[currentQ.id] || ""]
          .filter(Boolean)
          .join(" ");
        if (hint) formData.append("prompt", hint);
      }
      const res = await yamatoFetch("https://api.jptutoraiyamato.com/api/stt", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      const data = (await res.json()) as any;
      const transcript = (data.userText || data.text || "").trim();

      if (isRepeatRequest(transcript)) {
        setInputMessage("");
        setIsAnalyzing(false);
        await repeatCurrentQuestion(transcript);
        return;
      }
      setInputMessage(transcript);
    } catch (err) {
      console.error("Transcription error:", err);
      alert("Sorry, we couldn't transcribe your recording. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 💡 ハンズフリー自動送信処理（会話をエンドレスに継続させ、終了キーワードで終了する仕様）
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
          audio: base64Audio,
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

        console.log("🤖 [DEBUG] Sending audio to backend endpoint (/chat) with payload keys:", Object.keys(requestPayload));
        const res = await yamatoFetch(endpoint, {
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

        // 💡 チャット履歴にユーザーの発話とAIの返答を追加
        setChatMessages((prev) => [
          ...prev,
          { role: "user", content: userTranscript, isHtml: false },
          { role: "assistant", content: formattedHtml, isHtml: true },
        ]);

        setIsAnalyzing(false);
        console.log("🔊 [DEBUG] Playing AI feedback TTS...");
        await playTTS(aiFeedback);
        console.log("🔊 [DEBUG] AI feedback TTS finished.");

        // 💡 終了キーワード（「終わり」「終了」「おしまい」など）が含まれているかチェック
        const isEndRequested = 
          userTranscript.includes("終わり") || 
          userTranscript.includes("終了") || 
          userTranscript.includes("おしまい") ||
          userTranscript.includes("これで終わりにします");

        if (isEndRequested) {
          setChatMessages((prev) => [
            ...prev,
            { role: "assistant", content: "<b>🎉 お疲れ様でした！練習を終了します。</b>", isHtml: true },
          ]);
          setIsPracticing(false);
          stopPractice();
          return;
        }

        // 💡 質問リストを順番に進めつつ、最後の質問を超えても会話を永続的に継続させる
        const nextIndex = currentQuestionIndex + 1;
        if (nextIndex < activeQuestions.length) {
          setCurrentQuestionIndex(nextIndex);
          const nextQ = activeQuestions[nextIndex];
          
          setChatMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `【Next Question】<br><br>Yamato: 「${nextQ.question}」<br><br>（どうぞ、お話しください...）`,
              isHtml: true,
            },
          ]);
          console.log("🔊 [DEBUG] Playing next question TTS...");
          await playQuestion(nextQ);
          console.log("🔊 [DEBUG] Next question TTS finished. Starting auto recording...");
          startAutoRecording(answersMap);
        } else {
          // 💡 すべての設問が終わった後も、自由対話・継続モードとして自動録音を再開し続ける
          console.log("🔄 [DEBUG] Question list completed. Continuing open conversation loop...");
          setChatMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `（続けてお話しください... 終了する場合は「おわり」または「終了」と言ってください）`,
              isHtml: true,
            },
          ]);
          startAutoRecording(answersMap);
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
      alert("No questions found for this practice.");
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
      // Fisher–Yates（sort(() => Math.random() - 0.5) は並びに偏りが出る）
      for (let i = qList.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [qList[i], qList[j]] = [qList[j], qList[i]];
      }
    }

    answersRef.current = answersMap;
    setFollowUpBoth(null);
    setActiveQuestions(qList);
    setCurrentQuestionIndex(0);
    setIsPracticing(true);
    setIsWaitingForNext(false);
    setInputMessage("");

    const firstQ = qList[0];
    const userTargetAns = answersMap[firstQ.id] || "";

    const startMsg = modeType === "handsfree"
      ? `【ハンズフリー会話開始】<br><br>Yamato: 「${firstQ.question}」<br><br>（どうぞ、マイクに向かってお話しください...終了時は「終わり」と言ってください）`
      : `<b>Drill session started</b><br><br>Yamato: 「${firstQ.question}」<br><br><span class="registered-answer">(Your Answer: 「${userTargetAns || "(Empty)"}」)<br><br></span>Press the Record button or the spacebar to answer. To hear the question again, say 「すみません。もういちどおねがいします。」`;

    setChatMessages([
      {
        role: "assistant",
        content: startMsg,
        isHtml: true,
      },
    ]);

    console.log("🔊 [DEBUG] Playing first question TTS...");
    await playQuestion(firstQ);
    console.log("🔊 [DEBUG] First question TTS finished.");

    if (modeType === "handsfree") {
      console.log("🎤 [DEBUG] Triggering initial startAutoRecording...");
      startAutoRecording(answersMap);
    }
  };

  const stopPractice = () => {
    console.log("🛑 [DEBUG] stopPractice invoked.");
    setIsPracticing(false);
    setFollowUpBoth(null);
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

    // 「すみません」と打った場合も、AI を呼ばずに質問をもう一度読む
    if (isRepeatRequest(userText)) {
      await repeatCurrentQuestion(userText);
      return;
    }

    const newMessages: ChatMessage[] = [
      ...chatMessages,
      { role: "user", content: userText, isHtml: false },
    ];
    setChatMessages(newMessages);
    setIsAnalyzing(true);

    const currentQ = activeQuestions[currentQuestionIndex];
    const registeredAnswer = answersMap[currentQ?.id] || "";
    // つっこみ質問への答えか（無料の券を送る）。サーバーが券を確かめて、使えたときだけクレジットを引かない
    const activeFollowUp = followUpRef.current;
    // elaborate で 3 問に 1 回（3・6・9 問目…）、フィードバックと一緒につっこみ質問を作ってもらう
    const requestFollowUp =
      mode === "elaborate" && !activeFollowUp && (currentQuestionIndex + 1) % 3 === 0;

    try {
      const endpoint = "https://api.jptutoraiyamato.com/chat";
      const res = await yamatoFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          // elaborate ページは elaborate 用の AI（eoy-oral-elaborate）、それ以外は drill 用。料金はサーバーが appType で決める
          appType: mode === "elaborate" ? "eoy-oral-elaborate" : "eoy-oral-drill",
          expectedQuestion: activeFollowUp ? activeFollowUp.question : currentQ?.questionOriginal || currentQ?.question,
          registeredAnswer: activeFollowUp ? "" : registeredAnswer,
          followUpToken: activeFollowUp?.token,
          requestFollowUp,
          difficulty: selectedLevel,
          mode,
          section,
          userId: userId,
          userNickname: userNickname,
        }),
      });

      // つっこみの券が使えなかった（時間切れ・使用済み）ときは、つっこみをやめて次へ進めるようにする
      if (res.status === 409 && activeFollowUp) {
        setFollowUpBoth(null);
        const nextIdx = currentQuestionIndex + 1;
        setChatMessages([
          ...newMessages,
          {
            role: "assistant",
            content: "This follow-up question has expired. Please go on to the next question.",
            isHtml: false,
          },
        ]);
        if (nextIdx < activeQuestions.length) setIsWaitingForNext(true);
        else setIsPracticing(false);
        return;
      }

      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);

      const data = (await res.json()) as any;
      const aiFeedback = data.reply || "◎ よくできました。";
      const formattedHtml = formatOralFeedbackToHtml(aiFeedback);

      // つっこみへの答えが終わったら、つっこみは終わり
      if (activeFollowUp) setFollowUpBoth(null);

      // 🎙️ つっこみ質問が返ってきたら、フィードバックのあとに試験官がつっこむ（この答えは無料）
      if (!activeFollowUp && data.followUpQuestion && data.followUpToken) {
        const fu = { question: String(data.followUpQuestion), token: String(data.followUpToken) };
        setFollowUpBoth(fu);
        setChatMessages([
          ...newMessages,
          { role: "assistant", content: formattedHtml, isHtml: true },
          {
            role: "assistant",
            content: `<b>【Follow-up question】</b><br><br>Yamato: 「${fu.question}」<br><br>The examiner wants to hear more. Answer in Japanese — this answer is free (no credits).`,
            isHtml: true,
          },
        ]);
        setIsAnalyzing(false);
        await playTTS(fu.question);
        return;
      }

      const nextIndex = currentQuestionIndex + 1;

      // ◎ でもすぐには進まない。フィードバックを読んでから、生徒が「Next Question」を押して進む
      if (nextIndex < activeQuestions.length) {
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
            content: `${formattedHtml}<br><br><b>🎉 You have finished all the questions. Great work!</b>`,
            isHtml: true,
          },
        ]);
        setIsPracticing(false);
      }
    } catch (err) {
      console.error("Send answer error:", err);
      setChatMessages([
        ...newMessages,
        { role: "assistant", content: "Sorry, something went wrong. Please send your answer again.", isHtml: false },
      ]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const proceedToNextQuestion = (answersMap: { [key: string]: string }) => {
    setFollowUpBoth(null);
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < activeQuestions.length) {
      setCurrentQuestionIndex(nextIndex);
      const nextQ = activeQuestions[nextIndex];
      const nextTargetAns = answersMap[nextQ.id] || "";
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `【Next Question】<br><br>Yamato: 「${nextQ.question}」<br><br><span class="registered-answer">(Your Answer: 「${nextTargetAns || "(Empty)"}」)<br><br></span>Your turn!`,
          isHtml: true,
        },
      ]);
      setIsWaitingForNext(false);
      playQuestion(nextQ);
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
    questionAudioError,
    clearQuestionAudioError: () => setQuestionAudioError(null),
    /** つっこみ質問に答えている途中か（その答えは無料） */
    isFollowUpActive: followUp !== null,
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