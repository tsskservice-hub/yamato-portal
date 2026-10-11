import { useState, useEffect, useRef } from "react";
import type { MetaFunction } from "@remix-run/react";
import { Header } from "../components/header";

export const meta: MetaFunction = () => {
  return [
    { title: "VCE Japanese - Mock Oral Mode | JPTutor AI Yamato" },
    { name: "description", content: "VCE Japanese Mock Oral mode featuring elapsed time, topic deep-dive rotation, examiner persona, and fluency tracking." },
  ];
};

interface ExamQuestion {
  id: string;
  category: string;
  text: string;
  text_original: string;
}

interface GrammarDetectionItem {
  id: string;
  pattern: string;
  category: string;
  exampleUsed?: string;
}

interface ExamResult {
  totalTimeSec: number;
  netSpeakingTimeSec: number;
  actualSpeakingSec: number;
  thinkingSec: number;
  sectionsCompleted: string[];
  grammarScore: string;
  elaborationScore: string;
  detectedGrammarItems?: GrammarDetectionItem[];
  fluencyMetrics: {
    silenceCount: number;
    fillerCount: number;
    initialHesitationAvgSec: number;
    smoothnessRating: string;
    avgSpeechRateCPS: number;
    totalOutputChars: number;
  };
  performanceOverview: string;
  weaknessesAnalysis: string;
  actionPlan: string;
}

interface ChatMessage {
  role: "assistant" | "user";
  content: string;
  isHtml?: boolean;
}

// --- 📦 モノレポの外部パッケージ依存を解消するためのインラインデータ定義 ---

const oralExamQuestionsData: Record<string, any> = {
  sec1: {
    steady: [
      {
        id: "s1_1",
        category: "Personal World",
        text: "あなたの家族について教えてください。",
        text_original: "あなたの家族について教えてください。",
      },
      {
        id: "s1_2",
        category: "School Life",
        text: "学校でどんな科目を勉強していますか。",
        text_original: "学校でどんな科目を勉強していますか。",
      }
    ],
    normal: [
      {
        id: "s1_1",
        category: "Personal World",
        text: "あなたの家族について教えてください。また、お父さんやお母さんはどんな人ですか。",
        text_original: "あなたの家族について教えてください。また、お父さんやお母さんはどんな人ですか。",
      },
      {
        id: "s1_2",
        category: "School Life",
        text: "学校で一番好きな科目は何ですか。それはどうしてですか。",
        text_original: "学校で一番好きな科目は何ですか。それはどうしてですか。",
      },
      {
        id: "s1_3",
        category: "Hobbies & Lifestyle",
        text: "週末に普段何をすることが好きですか。詳しく教えてください。",
        text_original: "週末に普段何をすることが好きですか。詳しく教えてください。",
      }
    ],
    accelerated: [
      {
        id: "s1_1",
        category: "Personal World",
        text: "将来、どんな仕事に就きたいですか。その理由は何ですか。",
        text_original: "将来、どんな仕事に就きたいですか。その理由は何ですか。",
      }
    ]
  },
  sec2: {
    normal: [
      {
        id: "s2_1",
        category: "Detailed Study",
        text: "あなたの詳細な研究（Detailed Study）のテーマは何ですか。選んだ理由は何ですか。",
        text_original: "あなたの詳細な研究（Detailed Study）のテーマは何ですか。選んだ理由は何ですか。",
      },
      {
        id: "s2_2",
        category: "Detailed Study",
        text: "そのテーマについて調べて、一番印象に残ったことは何ですか。",
        text_original: "そのテーマについて調べて、一番印象に残ったことは何ですか。",
      }
    ]
  }
};

const questionDataRaw = oralExamQuestionsData;

export default function MockOralMode() {
  const [examPhase, setExamPhase] = useState<"config" | "examining" | "result">("config");
  const [selectedLevel, setSelectedLevel] = useState<string>("normal");
  const [examType, setExamType] = useState<"sec1" | "sec1_2">("sec1");
  const [aiSpeed, setAiSpeed] = useState<number>(1.0);
  
  const [questionSource, setQuestionSource] = useState<"curriculum" | "custom" | "free">("curriculum");
  const [customQuestions, setCustomQuestions] = useState<ExamQuestion[]>([]);
  const [isLoadingCustom, setIsLoadingCustom] = useState<boolean>(false);

  // 💡 Support Material (Detailed Study Photo) States
  const [supportImageBase64, setSupportImageBase64] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string>("");
  const [isCompressingImage, setIsCompressingImage] = useState<boolean>(false);

  const [modalContent, setModalContent] = useState<{ title: string; text: string } | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [systemWaitSeconds, setSystemWaitSeconds] = useState<number>(0);
  const systemWaitSecondsRef = useRef<number>(0);
  systemWaitSecondsRef.current = systemWaitSeconds;

  const totalActualSpeakingSecRef = useRef<number>(0);

  const [activeTopicGroups, setActiveTopicGroups] = useState<{ category: string; questions: ExamQuestion[] }[]>([]);
  const [currentGroupIndex, setCurrentGroupIndex] = useState<number>(0);
  const topicGroupStartTimeRef = useRef<number>(0);

  const currentGroupIndexRef = useRef<number>(0);
  currentGroupIndexRef.current = currentGroupIndex;

  const topicQuestionCountRef = useRef<number>(0);

  const [usedQuestionIds, setUsedQuestionIds] = useState<Set<string>>(new Set());
  const usedQuestionIdsRef = useRef<Set<string>>(new Set());
  usedQuestionIdsRef.current = usedQuestionIds;

  const usedCategoriesRef = useRef<Set<string>>(new Set());

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const chatMessagesRef = useRef<ChatMessage[]>([]);
  chatMessagesRef.current = chatMessages;

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  const [isRecording, setIsRecording] = useState<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isRecordingRef = useRef<boolean>(false);
  isRecordingRef.current = isRecording;

  const [silenceCount, setSilenceCount] = useState<number>(0);
  const [fillerCount, setFillerCount] = useState<number>(0);
  const questionPromptedTimeRef = useRef<number>(0);
  const [hesitationTimes, setHesitationTimes] = useState<number[]>([]);

  const recordingStartTimeRef = useRef<number>(0);
  const [totalOutputChars, setTotalOutputChars] = useState<number>(0);
  const [speechRates, setSpeechRates] = useState<number[]>([]);
  const totalOutputCharsRef = useRef<number>(0);
  totalOutputCharsRef.current = totalOutputChars;
  const speechRatesRef = useRef<number[]>([]);
  speechRatesRef.current = speechRates;

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isCurrentlySilentRef = useRef<boolean>(false);

  const [examResult, setExamResult] = useState<ExamResult | null>(null);
  const sessionStartTimeRef = useRef<number>(0);

  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeAbortControllerRef = useRef<AbortController | null>(null);

  // 💡 Canvasによる画像自動圧縮処理（長辺最大1200px, JPEG品質0.8）
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFileName(file.name);
    setIsCompressingImage(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const MAX_SIZE = 1200;

        if (width > height && width > MAX_SIZE) {
          height = Math.round((height * MAX_SIZE) / width);
          width = MAX_SIZE;
        } else if (height >= width && height > MAX_SIZE) {
          width = Math.round((width * MAX_SIZE) / height);
          height = MAX_SIZE;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.8);
          setSupportImageBase64(compressedBase64);
        }
        setIsCompressingImage(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (questionSource === "custom") {
      fetchCustomQuestions();
    }
  }, [questionSource]);

  const fetchCustomQuestions = async () => {
    setIsLoadingCustom(true);
    try {
      const fallbackCustom: ExamQuestion[] = [
        { id: "custom-q-1", category: "Custom Topics", text: "あなたの趣味について詳しく教えてください。", text_original: "あなたの趣味について詳しく教えてください。" }
      ];
      setCustomQuestions(fallbackCustom);
    } catch (err) {
      console.error("Error fetching custom questions:", err);
      setQuestionSource("curriculum");
    } finally {
      setIsLoadingCustom(false);
    }
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, isLoading]);

  const playTTS = async (textToSpeak: string, onAudioEnd?: () => void) => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    activeAbortControllerRef.current = abortController;
    const ttsStartTime = Date.now();

    try {
      const cleanedText = (textToSpeak || "")
        .replace(/<rt>.*?<\/rt>/g, "")
        .replace(/<\/?ruby>/g, "")
        .replace(/【.*?】/g, "")
        .replace(/※.*$/gm, "")
        .trim();

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ speakText: cleanedText, level: selectedLevel, speed: aiSpeed }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        setSystemWaitSeconds((prev) => prev + Math.round((Date.now() - ttsStartTime) / 1000));
        if (onAudioEnd) onAudioEnd();
        return;
      }
      const audioBlob = await response.blob();
      
      if (abortController.signal.aborted) {
        setSystemWaitSeconds((prev) => prev + Math.round((Date.now() - ttsStartTime) / 1000));
        if (onAudioEnd) onAudioEnd();
        return;
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      activeAudioRef.current = audio;

      audio.onended = () => {
        if (activeAudioRef.current === audio) {
          activeAudioRef.current = null;
        }
        setSystemWaitSeconds((prev) => prev + Math.round((Date.now() - ttsStartTime) / 1000));
        questionPromptedTimeRef.current = Date.now();
        if (onAudioEnd) onAudioEnd();
      };

      audio.play().catch((err: unknown) => {
        if (err instanceof Error && err.name !== "AbortError") {
          console.error("Audio playback error:", err);
        }
        setSystemWaitSeconds((prev) => prev + Math.round((Date.now() - ttsStartTime) / 1000));
        questionPromptedTimeRef.current = Date.now();
        if (onAudioEnd) onAudioEnd();
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("TTS request error:", err);
      }
      setSystemWaitSeconds((prev) => prev + Math.round((Date.now() - ttsStartTime) / 1000));
      questionPromptedTimeRef.current = Date.now();
      if (onAudioEnd) onAudioEnd();
    }
  };

  useEffect(() => {
    if (examPhase === "examining") {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [examPhase]);

  const startMockOral = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
    }
    if (isRecording) {
      stopRecording();
    }

    const groupByCategory = (rawList: any[]) => {
      const map: Record<string, any[]> = {};
      rawList.forEach((q) => {
        const textCheck = q?.text || q?.text_original || q?.question_text || "";
        if (questionSource === "curriculum" && (textCheck.includes("何年生") || textCheck.includes("なんねんせい"))) return;

        const cat = q?.category || "General";
        if (!map[cat]) map[cat] = [];
        map[cat].push(q);
      });
      return Object.keys(map).map((cat) => ({
        category: cat,
        questions: map[cat],
      }));
    };

    const shuffleArray = (array: any[]) => {
      const arr = [...array];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };

    let combinedGroups: { category: string; questions: ExamQuestion[] }[] = [];

    if (questionSource === "free") {
      const freeCategories = ["General World", "Personal Background", "School & Study", "Hobbies & Lifestyle"];
      combinedGroups = freeCategories.map((cat, idx) => ({
        category: cat,
        questions: [{ id: `free-q-${idx}`, category: cat, text: "AI Free Generation", text_original: "AI Free Generation" }]
      }));
    } else {
      let rawSourceList: any[] = [];
      let rawSec2List: any[] = [];

      if (questionSource === "custom") {
        rawSourceList = customQuestions;
      } else {
        const dataObj = questionDataRaw as Record<string, any>;
        rawSourceList = dataObj["sec1"]?.[selectedLevel] || dataObj["sec1"]?.["normal"] || [];
        rawSec2List = examType === "sec1_2" ? (dataObj["sec2"]?.[selectedLevel] || dataObj["sec2"]?.["normal"] || []) : [];
      }

      const sec1Groups = groupByCategory(rawSourceList);
      const randomizedSec1Groups = shuffleArray(sec1Groups).map((g) => ({
        category: g.category,
        questions: shuffleArray(g.questions).map((q: any, idx: number) => ({
          id: q?.id || `exam-q-${g.category}-${idx}`,
          category: g.category,
          text: q?.text || q?.text_original || q?.question_text || "No question text",
          text_original: q?.text_original || q?.text || q?.question_text || "No question text",
        })),
      }));

      const sec2Groups = examType === "sec1_2" ? groupByCategory(rawSec2List) : [];
      const randomizedSec2Groups = shuffleArray(sec2Groups).map((g) => ({
        category: g.category,
        questions: shuffleArray(g.questions).map((q: any, idx: number) => ({
          id: q?.id || `exam-q-sec2-${g.category}-${idx}`,
          category: g.category,
          text: q?.text || q?.text_original || "No question text",
          text_original: q?.text_original || q?.text || "No question text",
        })),
      }));

      combinedGroups = [...randomizedSec1Groups, ...randomizedSec2Groups];
    }

    if (combinedGroups.length === 0 || combinedGroups[0].questions.length === 0) {
      alert("Failed to load exam questions.");
      return;
    }

    setActiveTopicGroups(combinedGroups);
    setCurrentGroupIndex(0);
    setCurrentGroupIndexRef(0);
    topicGroupStartTimeRef.current = 0;
    topicQuestionCountRef.current = 0;

    setUsedQuestionIds(new Set());
    usedQuestionIdsRef.current = new Set();
    usedCategoriesRef.current = new Set();

    setSilenceCount(0);
    setFillerCount(0);
    setHesitationTimes([]);
    setTotalOutputChars(0);
    setSpeechRates([]);
    setSystemWaitSeconds(0);
    totalActualSpeakingSecRef.current = 0;

    setElapsedSeconds(0);
    sessionStartTimeRef.current = Date.now();
    setExamPhase("examining");

    const firstGroup = combinedGroups[0];
    const firstQ = firstGroup.questions[Math.floor(Math.random() * firstGroup.questions.length)];
    
    const newUsedSet = new Set<string>([firstQ.id]);
    setUsedQuestionIds(newUsedSet);
    usedQuestionIdsRef.current = newUsedSet;

    usedCategoriesRef.current.add(firstGroup.category);

    const freeInitialQuestions = [
      "こんにちは。",
      "おはようございます。",
      "いい天気ですね。",
      "お元気ですか。",
      "リラックスして、いきましょう。"
    ];

    const randomFreeQuestion = freeInitialQuestions[Math.floor(Math.random() * freeInitialQuestions.length)];
    const initialQuestionText = questionSource === "free" ? randomFreeQuestion : (firstQ?.text || "");

    setChatMessages([
      {
        role: "assistant",
        content: `【VCE Mock Exam Started (${questionSource.toUpperCase()})${supportImageBase64 ? " [With Support Material Photo]" : ""}】\n\nExaminer: 「${initialQuestionText}」\n\n(Waiting for student response...)`,
        isHtml: true,
      },
    ]);

    playTTS(initialQuestionText);
  };

  const setCurrentGroupIndexRef = (val: number) => {
    currentGroupIndexRef.current = val;
  };

  const countFillers = (text: string): number => {
    const fillerRegex = /(ええと|あのう|あのー|えーと|うーん|うーんと|まあ|ええ|あの|えー|んー)/g;
    const matches = text.match(fillerRegex);
    return matches ? matches.length : 0;
  };

  const startRecording = async () => {
    if (isRecordingRef.current) return;

    recordingStartTimeRef.current = Date.now();

    if (questionPromptedTimeRef.current > 0) {
      const hesitationSec = Math.max(0, Math.round((Date.now() - questionPromptedTimeRef.current) / 1000));
      setHesitationTimes((prev) => [...prev, hesitationSec]);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;

      isCurrentlySilentRef.current = false;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const checkVolume = () => {
        if (!isRecordingRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const average = sum / dataArray.length;
        
        const SILENCE_THRESHOLD = 15; 

        if (average < SILENCE_THRESHOLD) {
          if (!isCurrentlySilentRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              if (isRecordingRef.current) {
                setSilenceCount((prev) => prev + 1);
                isCurrentlySilentRef.current = true;
              }
            }, 1200);
          }
        } else {
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
          isCurrentlySilentRef.current = false;
        }

        requestAnimationFrame(checkVolume);
      };
      checkVolume();

      const options = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? { mimeType: "audio/webm;codecs=opus" }
        : { mimeType: "audio/webm" };

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (audioContextRef.current && audioContextRef.current.state !== "closed") {
          audioContextRef.current.close();
        }
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await transcribeAndAutoSend(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access error:", err);
      alert("Microphone access is denied or unavailable. Please check your browser settings.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecordingRef.current) {
      try {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      } catch (err) {
        console.error("Error stopping media recorder:", err);
      }
      setIsRecording(false);
    }
  };

  const transcribeAndAutoSend = async (audioBlob: Blob) => {
    setIsLoading(true);
    const reqStartTime = Date.now();

    const recordingDurationSec = Math.max(1, Math.round((Date.now() - recordingStartTimeRef.current) / 1000));
    totalActualSpeakingSecRef.current += recordingDurationSec;

    const gIndex = currentGroupIndexRef.current;
    let nextGIndex = gIndex;

    const currentElapsed = elapsedSeconds;
    const timeInCurrentTopic = currentElapsed - topicGroupStartTimeRef.current;

    topicQuestionCountRef.current += 1;

    let isTopicSwitched = false;

    if ((topicQuestionCountRef.current >= 4 || timeInCurrentTopic >= 60) && activeTopicGroups.length > 1) {
      topicQuestionCountRef.current = 0;
      
      let candidateGroups = activeTopicGroups
        .map((group, idx) => ({ idx, category: group.category }))
        .filter((item) => item.idx !== gIndex && !usedCategoriesRef.current.has(item.category))
        .map((item) => item.idx);

      if (candidateGroups.length === 0) {
        candidateGroups = activeTopicGroups
          .map((_, idx) => idx)
          .filter((idx) => idx !== gIndex);
      }
      if (candidateGroups.length === 0) {
        candidateGroups = [gIndex];
      }

      nextGIndex = candidateGroups[Math.floor(Math.random() * candidateGroups.length)];
      
      topicGroupStartTimeRef.current = currentElapsed;
      setCurrentGroupIndex(nextGIndex);
      setCurrentGroupIndexRef(nextGIndex);
      isTopicSwitched = true;
    }

    const targetGroup = activeTopicGroups[nextGIndex] || activeTopicGroups[0];
    
    if (targetGroup?.category) {
      usedCategoriesRef.current.add(targetGroup.category);
    }

    const currentUsedSet = usedQuestionIdsRef.current;

    let availableQuestions = targetGroup.questions.filter((q) => !currentUsedSet.has(q.id));
    if (availableQuestions.length === 0) {
      availableQuestions = targetGroup.questions;
    }

    const userTurnCount = chatMessagesRef.current.filter(m => m.role === "user").length + 1;

    const formData = new FormData();
    formData.append("audio", audioBlob, "user-audio.webm");
    formData.append("mode", "mock-oral");
    formData.append("level", selectedLevel);
    formData.append("examType", examType);
    formData.append("currentCategory", targetGroup.category);
    formData.append("questionSource", questionSource);
    formData.append("userTurnCount", userTurnCount.toString());
    formData.append("isTopicSwitched", isTopicSwitched.toString());
    
    if (supportImageBase64) {
      formData.append("hasFiles", "true");
      formData.append("imageBase64", supportImageBase64);
    } else {
      formData.append("hasFiles", "false");
    }

    formData.append("usedCategories", JSON.stringify(Array.from(usedCategoriesRef.current)));
    formData.append("questionCandidates", JSON.stringify(availableQuestions.slice(0, 6)));

    try {
      const response = await fetch("/api/chat", { method: "POST", body: formData });
      
      const reqDuration = Math.round((Date.now() - reqStartTime) / 1000);
      setSystemWaitSeconds((prev) => prev + reqDuration);

      if (!response.ok) throw new Error("Server communication failed");
      
      const data = (await response.json()) as any;
      const transcribedText = (data?.userText || "").trim();
      const examinerReply = (data?.reply || "").trim();
      const nextQuestionText = data?.nextQuestion || "もう少し詳しく教えてください。";

      if (!transcribedText || transcribedText === "（音声回答）" || transcribedText.includes("本日はご覧いただきありがとうございます")) {
        alert("音声がうまく聞き取れませんでした。もう一度クリアに発話してください。");
        setIsLoading(false);
        return;
      }

      const textLength = transcribedText.length;
      if (textLength > 0) {
        setTotalOutputChars((prev) => prev + textLength);
        const currentCPS = parseFloat((textLength / recordingDurationSec).toFixed(2));
        setSpeechRates((prev) => [...prev, currentCPS]);
      }

      const detectedFillers = countFillers(transcribedText);
      if (detectedFillers > 0) {
        setFillerCount((prev) => prev + detectedFillers);
      }

      const matchedQ = targetGroup.questions.find((q) => q.text === nextQuestionText || q.text_original === nextQuestionText) || availableQuestions[0];
      if (matchedQ) {
        const updatedUsedSet = new Set(currentUsedSet);
        updatedUsedSet.add(matchedQ.id);
        setUsedQuestionIds(updatedUsedSet);
        usedQuestionIdsRef.current = updatedUsedSet;
      }

      const assistantContent = examinerReply
        ? `Examiner: 「${examinerReply}」\n\nNext Question:\n「${nextQuestionText}」`
        : `Next Question:\n「${nextQuestionText}」`;

      const updatedMessages = [
        ...chatMessagesRef.current,
        { role: "user" as const, content: transcribedText, isHtml: false },
        { role: "assistant" as const, content: assistantContent, isHtml: true },
      ];
      setChatMessages(updatedMessages);
      setIsLoading(false);

      playTTS(examinerReply + nextQuestionText);
    } catch (err) {
      const reqDuration = Math.round((Date.now() - reqStartTime) / 1000);
      setSystemWaitSeconds((prev) => prev + reqDuration);

      console.warn("Mock oral API warning:", err);
      alert("Failed to process your response. Please try speaking again.");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (examPhase === "examining" && !isLoading && document.activeElement?.tagName !== "INPUT") {
        if (e.code === "Space") {
          e.preventDefault();
          if (isRecordingRef.current) {
            stopRecording();
          } else {
            startRecording();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [examPhase, isLoading]);

  const finishExam = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (isRecordingRef.current) stopRecording();

    const closingMessage = "では、おわりましょう。ありがとうございました。";
    
    const finalMessages = [
      ...chatMessagesRef.current,
      { role: "assistant" as const, content: `Examiner: 「${closingMessage}」`, isHtml: true },
    ];
    setChatMessages(finalMessages);
    setIsLoading(true);

    playTTS(closingMessage, async () => {
      const totalSec = elapsedSeconds > 0 ? elapsedSeconds : Math.round((Date.now() - sessionStartTimeRef.current) / 1000);
      
      const netSpeakingSec = Math.max(1, totalSec - systemWaitSecondsRef.current);
      const actualSpeakingSec = totalActualSpeakingSecRef.current;
      const thinkingSec = Math.max(0, netSpeakingSec - actualSpeakingSec);

      const currentRates = speechRatesRef.current;
      const finalTotalChars = totalOutputCharsRef.current;
      const netAvgCPS = netSpeakingSec > 0 && finalTotalChars > 0 
        ? parseFloat((finalTotalChars / netSpeakingSec).toFixed(1)) 
        : (currentRates.length > 0 ? parseFloat((currentRates.reduce((a, b) => a + b, 0) / currentRates.length).toFixed(1)) : 2.5);

      try {
        const formData = new FormData();
        formData.append("mode", "evaluate-exam");
        formData.append("chatHistory", JSON.stringify(finalMessages));
        formData.append("level", selectedLevel);
        formData.append("examType", examType);
        
        formData.append("clientSilenceCount", silenceCount.toString());
        formData.append("clientFillerCount", fillerCount.toString());
        const avgH = hesitationTimes.length > 0 ? Math.round(hesitationTimes.reduce((a, b) => a + b, 0) / hesitationTimes.length) : 1;
        formData.append("clientHesitationAvg", avgH.toString());
        formData.append("clientAvgSpeechRate", netAvgCPS.toString());
        formData.append("clientTotalChars", finalTotalChars.toString());

        const response = await fetch("/api/chat", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const evalData = (await response.json()) as any;
          const result: ExamResult = {
            totalTimeSec: totalSec,
            netSpeakingTimeSec: netSpeakingSec,
            actualSpeakingSec: actualSpeakingSec,
            thinkingSec: thinkingSec,
            sectionsCompleted: evalData.sectionsCompleted || (examType === "sec1" ? ["Section 1 (Personal World & Topics)"] : ["Section 1", "Section 2 (Detailed Study Discussion)"]),
            grammarScore: evalData.grammarScore || "7 / 10",
            elaborationScore: evalData.elaborationScore || "7 / 10",
            detectedGrammarItems: evalData.detectedGrammarItems || [],
            fluencyMetrics: {
              silenceCount: evalData.fluencyMetrics?.silenceCount ?? silenceCount,
              fillerCount: evalData.fluencyMetrics?.fillerCount ?? fillerCount,
              initialHesitationAvgSec: evalData.fluencyMetrics?.initialHesitationAvgSec ?? avgH,
              smoothnessRating: evalData.fluencyMetrics?.smoothnessRating || "Fair / Needs Expansion",
              avgSpeechRateCPS: evalData.fluencyMetrics?.avgSpeechRateCPS ?? netAvgCPS,
              totalOutputChars: evalData.fluencyMetrics?.totalOutputChars ?? finalTotalChars,
            },
            performanceOverview: evalData.performanceOverview || "Your responses were frequently too brief.",
            weaknessesAnalysis: evalData.weaknessesAnalysis || "Lacked sufficient detail and elaboration.",
            actionPlan: evalData.actionPlan || "Please practice adding more depth to each response.",
          };
          setExamResult(result);
        } else {
          throw new Error("Evaluation API error");
        }
      } catch (err) {
        console.error("Failed to fetch dynamic evaluation, using fallback evaluation:", err);
        const avgH = hesitationTimes.length > 0 ? Math.round(hesitationTimes.reduce((a, b) => a + b, 0) / hesitationTimes.length) : 1;
        const fallbackResult: ExamResult = {
          totalTimeSec: totalSec,
          netSpeakingTimeSec: netSpeakingSec,
          actualSpeakingSec: actualSpeakingSec,
          thinkingSec: thinkingSec,
          sectionsCompleted: examType === "sec1" ? ["Section 1 (Personal World & Topics)"] : ["Section 1", "Section 2 (Detailed Study Discussion)"],
          grammarScore: "6 / 10",
          elaborationScore: "6 / 10",
          detectedGrammarItems: [],
          fluencyMetrics: {
            silenceCount: silenceCount,
            fillerCount: fillerCount,
            initialHesitationAvgSec: avgH,
            smoothnessRating: "Needs Improvement (Requires more detail)",
            avgSpeechRateCPS: netAvgCPS,
            totalOutputChars: finalTotalChars,
          },
          performanceOverview: "Your responses were consistently very brief.",
          weaknessesAnalysis: "VCE oral assessment criteria require you to elaborate fully.",
          actionPlan: "Please practice adding more depth to each response.",
        };
        setExamResult(fallbackResult);
      }

      setExamPhase("result");
      setIsLoading(false);
    });
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const renderTenScaleStarRating = (scoreText: string) => {
    let numericScore = 7.0;
    
    const match10 = scoreText.match(/([0-9]+(?:\.[0-9]+)?)\s*\/\s*10/);
    if (match10) {
      numericScore = parseFloat(match10[1]);
    } else {
      const match5 = scoreText.match(/([1-5](?:\.[0-9]+)?)\s*\/\s*5/);
      if (match5) {
        numericScore = parseFloat(match5[1]) * 2;
      } else if (scoreText.includes("A")) {
        numericScore = 9.0;
      } else if (scoreText.includes("B")) {
        numericScore = 7.5;
      } else if (scoreText.includes("C")) {
        numericScore = 6.0;
      } else if (scoreText.includes("D")) {
        numericScore = 4.0;
      } else if (scoreText.includes("E")) {
        numericScore = 2.0;
      }
    }

    const integerRating = Math.max(1, Math.min(10, Math.round(numericScore)));

    return (
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center gap-3">
          <div className="flex text-base tracking-tighter">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => {
              const isFull = star <= integerRating;
              return (
                <span key={star} className={isFull ? "text-amber-500" : "text-slate-300"}>
                  ★
                </span>
              );
            })}
          </div>
          <span className="text-sm font-bold text-slate-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            {integerRating} / 10
          </span>
        </div>
      </div>
    );
  };

  return (
    // ⬅️ ② 全体を囲む親要素を `bg-slate-50 min-h-screen text-slate-800 font-sans relative` に統一
    <div className="bg-slate-50 min-h-screen text-slate-800 font-sans relative pb-16">
      <style>{`
        @keyframes avatar-pulse {
          0%, 100% { box-shadow: 0 0 15px rgba(37, 99, 235, 0.3); }
          50% { box-shadow: 0 0 30px rgba(37, 99, 235, 0.6); }
        }
        .avatar-glow {
          animation: avatar-pulse 3s infinite ease-in-out;
        }
      `}</style>

      {/* ⬅️ ③ 共通ヘッダーコンポーネントを一番上に配置 */}
      <Header />

      {/* ⬅️ ④ メインコンテンツ */}
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {examPhase === "config" && (
          <div className="bg-white border-2 border-blue-300 rounded-2xl p-6 shadow-md space-y-6">
            <div className="space-y-2 border-b border-blue-200 pb-4">
              <h2 className="text-xl font-bold text-slate-900">Mock Oral Settings</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Practice in an authentic exam environment with topic deep-dive rotation and AI examiner dialogue. Choose your preferred question source below to begin.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">📌 Question Source Mode:</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: "curriculum", title: "🏫 AI Yamato Questions", desc: "Use question pools by teaching experts."},
                    { id: "custom", title: "👤 My Custom Questions", desc: "Practice with your saved questions." },
                    { id: "free", title: "🌟 AI Ad-lib Free Mode", desc: "AI dynamically generates questions under VCE rules." },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setQuestionSource(mode.id as any)}
                      className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        questionSource === mode.id
                          ? "bg-blue-300 text-slate-900 border-blue-400 font-bold shadow-sm"
                          : "bg-blue-50/60 text-slate-700 border-blue-200 hover:bg-blue-100"
                      }`}
                    >
                      <div>
                        <div className="font-bold text-sm">{mode.title}</div>
                        <div className={`text-[11px] mt-1 leading-tight ${questionSource === mode.id ? "text-slate-800" : "text-slate-500"}`}>
                          {mode.desc}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">🎯 Difficulty Level:</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "steady", label: "🌱 Steady (Foundation)" },
                    { id: "normal", label: "🌿 Normal (Standard)" },
                    { id: "accelerated", label: "🌳 Accelerated (Advanced)" },
                  ].map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setSelectedLevel(lvl.id)}
                      className={`p-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        selectedLevel === lvl.id
                          ? "bg-blue-300 text-slate-900 border-blue-400 shadow-sm"
                          : "bg-blue-50/60 text-slate-700 border-blue-200 hover:bg-blue-100"
                      }`}
                    >
                      {lvl.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">🔊 Examiner Speech Speed: <span className="text-blue-700">{aiSpeed}x</span></label>
                <input
                  type="range"
                  min="0.8"
                  max="1.2"
                  step="0.05"
                  value={aiSpeed}
                  onChange={(e) => setAiSpeed(parseFloat(e.target.value))}
                  className="w-full accent-blue-300 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>Slow (0.8x)</span>
                  <span>Normal (1.0x)</span>
                  <span>Fast (1.2x)</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">⏱ Exam Section & Format:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setExamType("sec1")}
                    className={`p-4 rounded-xl border text-left transition cursor-pointer ${
                      examType === "sec1" ? "bg-blue-300 text-slate-900 border-blue-400 shadow-sm font-bold" : "bg-blue-50/60 border-blue-200 text-slate-700 hover:bg-blue-100"
                    }`}
                  >
                    <div className="font-bold text-sm">Section 1 Intensive (~7 Mins target)</div>
                    <div className="text-xs mt-1 opacity-90">General interview and Personal World questions.</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExamType("sec1_2")}
                    className={`p-4 rounded-xl border text-left transition cursor-pointer ${
                      examType === "sec1_2" ? "bg-blue-300 text-slate-900 border-blue-400 shadow-sm font-bold" : "bg-blue-50/60 border-blue-200 text-slate-700 hover:bg-blue-100"
                    }`}
                  >
                    <div className="font-bold text-sm">Section 1 + 2 Full Mock (~15 Mins target)</div>
                    <div className="text-xs mt-1 opacity-90">Comprehensive exam including personal interview and Detailed Study discussion.</div>
                  </button>
                </div>
              </div>

              {examType === "sec1_2" && (
                <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 space-y-2">
                  <label className="block text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <span>🖼️</span> Section 2 Detailed Study Support Material (Optional Photo / Image):
                  </label>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Upload your Detailed Study support photo/image. The AI examiner will examine the visual details and ask targeted questions based on it during Section 2!
                  </p>
                  <div className="flex items-center gap-3 pt-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="text-xs text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                    />
                    {isCompressingImage && <span className="text-xs text-blue-600 font-bold animate-pulse">Compressing...</span>}
                    {supportImageBase64 && !isCompressingImage && <span className="text-xs text-emerald-600 font-bold">✅ Photo Ready ({imageFileName || "Attached"})</span>}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-blue-200 flex justify-end">
              <button
                type="button"
                onClick={startMockOral}
                disabled={isLoadingCustom || isCompressingImage}
                className="bg-blue-300 hover:bg-blue-400 text-slate-900 font-bold px-8 py-3.5 rounded-xl shadow-md transition cursor-pointer text-sm disabled:opacity-50"
              >
                {isLoadingCustom ? "⏳ Loading Custom Questions..." : "🚀 Start Mock Oral"}
              </button>
            </div>
          </div>
        )}

        {examPhase === "examining" && (
          <div className="space-y-6">
            <div className="bg-white border border-blue-200 rounded-2xl p-5 shadow-md flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center text-2xl relative ${isRecording ? "bg-rose-100 border-rose-500 animate-pulse" : "bg-blue-100 border-blue-500 avatar-glow"}`}>
                  <span>{isRecording ? "🎙" : "🧑‍🏫"}</span>
                  <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${isRecording ? "bg-rose-500 animate-ping" : "bg-blue-500"}`}></span>
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-semibold">
                    AI Yamato Examiner • <span className="text-blue-700 font-bold">Mock Exam Mode ({questionSource.toUpperCase()})</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    {isRecording ? "🔴 Recording (Speak now / Press [Space] to submit)" : isLoading ? "⏳ AI Scoring & Generating Response..." : "🟢 Ready"}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-blue-200 rounded-2xl p-6 shadow-md space-y-4 relative">
              <div className="text-xs font-bold text-slate-600 border-b border-blue-200 pb-2 flex justify-between items-center">
                <span>VCE Oral Exam Simulation (Deep-Dive Topic Rotation)</span>
              </div>

              <div ref={chatContainerRef} className="bg-slate-50 border border-slate-200 rounded-xl p-4 h-80 overflow-y-auto space-y-3">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                    <div
                      className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "bg-blue-600 text-white rounded-br-xs"
                          : "bg-white border border-slate-200 text-slate-800 rounded-bl-xs shadow-xs"
                      }`}
                      dangerouslySetInnerHTML={{ __html: msg.content }}
                    />
                  </div>
                ))}
                {isLoading && (
                  <div className="text-xs text-blue-700 font-bold bg-blue-50 p-3 rounded-xl border border-blue-200 animate-pulse text-center">
                    ⏳ Generating Response...
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs">
                  <span className="text-slate-600 font-medium">
                    💡 *Tip: You can also use the Space key to start and stop recording!*
                  </span>

                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      disabled={isLoading}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2 rounded-lg shadow transition cursor-pointer shrink-0"
                    >
                      🎙 Start Recording
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg shadow transition animate-pulse cursor-pointer shrink-0"
                    >
                      ⏹ Stop & Submit
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 pt-3 border-t border-blue-200">
                <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border shadow-xs transition ${
                  elapsedSeconds >= 420 
                    ? "bg-rose-100 border-rose-400 animate-pulse" 
                    : "bg-blue-50 border-blue-200"
                }`}>
                  <span className="text-[11px] text-slate-600 font-bold uppercase tracking-wider flex items-center gap-1">
                    {elapsedSeconds >= 420 ? "⚠ Target 7m Reached:" : "Elapsed Time:"}
                  </span>
                  <span className={`text-sm font-mono font-bold ${
                    elapsedSeconds >= 420 ? "text-rose-700" : "text-blue-700"
                  }`}>
                    {formatTime(elapsedSeconds)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={finishExam}
                  disabled={isLoading}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-5 py-2 rounded-xl text-xs transition cursor-pointer shadow disabled:opacity-50"
                >
                  🏁 Finish Exam & Get Report
                </button>
              </div>

              <div className="pt-2 text-xs text-slate-500">
                <span>*The timer counts up from zero. Topics rotate for natural deep-diving. Click "Finish Exam" when ready.</span>
              </div>
            </div>
          </div>
        )}

        {examPhase === "result" && examResult && (() => {
          const speed = examResult.fluencyMetrics.avgSpeechRateCPS;
          const chars = examResult.fluencyMetrics.totalOutputChars;
          const isFast = speed > 2.5;
          const isMany = chars > 300;

          let quadrantId = 4;
          if (isFast && isMany) quadrantId = 1;
          else if (!isFast && isMany) quadrantId = 2;
          else if (isFast && !isMany) quadrantId = 3;
          else quadrantId = 4;

          return (
            <div className="bg-white border border-blue-200 rounded-2xl p-6 shadow-md space-y-6">
              <div className="border-b border-blue-200 pb-4 flex justify-between items-center flex-wrap gap-2">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                  🎉 Mock Oral Comprehensive Report {examType === "sec1" ? "for Section 1" : "for Section 1 & 2"}
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">
                  VCE Japanese Mock Oral Assessment Summary ({examType === "sec1" ? "Section 1 Intensive" : "Section 1 + 2 Full Mock"})
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                  <span>📊</span> Assessment Breakdown Metrics (Net Speaking Time Base):
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white border-2 border-blue-200 rounded-xl p-5 shadow-xs space-y-3 sm:col-span-2">
                    <div className="text-base font-bold text-slate-900 flex items-center gap-2.5 border-b border-blue-100 pb-2">
                      <span className="text-xl">📖</span>
                      <span>Grammar & Vocabulary (VCE Checklist Matching)</span>
                    </div>
                    <div>
                      {renderTenScaleStarRating(examResult.grammarScore)}
                    </div>

                    <div className="pt-2 border-t border-blue-100 space-y-2">
                      <div className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                        <span>✨ Detected VCE Grammar & Expressions Used:</span>
                      </div>
                      {examResult.detectedGrammarItems && examResult.detectedGrammarItems.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {examResult.detectedGrammarItems.map((item, index) => (
                            <div key={index} className="bg-blue-50 border border-blue-300 rounded-lg p-2 text-xs text-slate-800 space-y-0.5 flex-1 min-w-[200px] shadow-xs">
                              <div className="font-bold text-blue-800 flex items-center justify-between">
                                <span>{item.pattern}</span>
                                <span className="text-[10px] text-slate-500 font-normal">{item.category}</span>
                              </div>
                              {item.exampleUsed && (
                                <div className="text-[11px] text-slate-600 italic">
                                  「{item.exampleUsed}」
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 italic bg-slate-50 p-3 rounded-lg border border-slate-200">
                          No specific VCE checklist grammar patterns were explicitly identified, or responses were too brief. Try incorporating more diverse sentence structures next time!
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white border-2 border-blue-200 rounded-xl p-5 shadow-xs space-y-2 sm:col-span-2">
                    <div className="text-base font-bold text-slate-900 flex items-center gap-2.5 border-b border-blue-100 pb-2">
                      <span className="text-xl">💬</span>
                      <span>Elaboration</span>
                    </div>
                    <div>
                      {renderTenScaleStarRating(examResult.elaborationScore)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  <div className="bg-white border-2 border-blue-200 rounded-xl p-4 shadow-xs space-y-1.5">
                    <div className="text-xs font-bold text-slate-900 flex items-center justify-between border-b border-blue-100 pb-1.5">
                      <span className="flex items-center gap-1.5">⏱️ Elapsed Time</span>
                      <button
                        type="button"
                        onClick={() => setModalContent({
                          title: "Elapsed Time",
                          text: "The total duration of your mock oral session from start to finish, including examiner questions and system pauses."
                        })}
                        className="text-blue-700 underline text-[10px] font-bold cursor-pointer"
                      >
                        Note
                      </button>
                    </div>
                    <div className="text-sm font-mono font-bold text-slate-900 pt-0.5">
                      {Math.floor(examResult.totalTimeSec / 60)}m {examResult.totalTimeSec % 60}s
                    </div>
                  </div>

                  <div className="bg-white border-2 border-blue-200 rounded-xl p-4 shadow-xs space-y-1.5">
                    <div className="text-xs font-bold text-slate-900 flex items-center justify-between border-b border-blue-100 pb-1.5">
                      <span className="flex items-center gap-1.5">📣 Speaking Time</span>
                      <button
                        type="button"
                        onClick={() => setModalContent({
                          title: "Actual Speaking Time",
                          text: "The total cumulative time you spent actively recording and speaking answers into the microphone during the session."
                        })}
                        className="text-blue-700 underline text-[10px] font-bold cursor-pointer"
                      >
                        Note
                      </button>
                    </div>
                    <div className="text-sm font-mono font-bold text-blue-700 pt-0.5">
                      {Math.floor(examResult.actualSpeakingSec / 60)}m {examResult.actualSpeakingSec % 60}s
                    </div>
                  </div>

                  <div className="bg-white border-2 border-blue-200 rounded-xl p-4 shadow-xs space-y-1.5">
                    <div className="text-xs font-bold text-slate-900 flex items-center justify-between border-b border-blue-100 pb-1.5">
                      <span className="flex items-center gap-1.5">🧠 Thinking Time</span>
                      <button
                        type="button"
                        onClick={() => setModalContent({
                          title: "Thinking Time",
                          text: "The time spent pondering or hesitating before your responses, calculated by subtracting your active speaking time from your net turn time."
                        })}
                        className="text-blue-700 underline text-[10px] font-bold cursor-pointer"
                      >
                        Note
                      </button>
                    </div>
                    <div className="text-sm font-mono font-bold text-blue-800 pt-0.5">
                      {Math.floor(examResult.thinkingSec / 60)}m {examResult.thinkingSec % 60}s
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="bg-white border-2 border-blue-200 rounded-xl p-5 shadow-xs space-y-2">
                    <div className="text-base font-bold text-slate-900 flex items-center justify-between border-b border-blue-100 pb-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">🗣</span>
                        <span>Speech Speed</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setModalContent({
                          title: "Speech Speed & Fluency",
                          text: "Measures how smoothly and continuously you speak without excessive pausing. A natural pace (2.5 - 4.5 chars/sec) shows confidence and linguistic automaticity."
                        })}
                        className="text-blue-700 underline text-xs font-bold cursor-pointer"
                      >
                        Note
                      </button>
                    </div>
                    
                    <div className="space-y-2 pt-1">
                      <div className="text-sm font-bold text-slate-900">
                        {examResult.fluencyMetrics.avgSpeechRateCPS} characters / sec
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <div className={`p-2 rounded-lg text-xs flex items-center justify-between border transition ${
                          examResult.fluencyMetrics.avgSpeechRateCPS <= 2.5
                            ? "bg-blue-100 border-blue-400 font-bold text-blue-900 shadow-xs"
                            : "bg-slate-50 border-slate-200 text-slate-400 opacity-60"
                        }`}>
                          <span>🐢 Deliberate Pace</span>
                          <span className="font-mono text-[11px]">&le; 2.5 chars/sec</span>
                        </div>

                        <div className={`p-2 rounded-lg text-xs flex items-center justify-between border transition ${
                          examResult.fluencyMetrics.avgSpeechRateCPS > 2.5 && examResult.fluencyMetrics.avgSpeechRateCPS < 4.5
                            ? "bg-emerald-100 border-emerald-400 font-bold text-emerald-900 shadow-xs"
                            : "bg-slate-50 border-slate-200 text-slate-400 opacity-60"
                        }`}>
                          <span>👍 Natural Pace</span>
                          <span className="font-mono text-[11px]">2.5 - 4.5 chars/sec</span>
                        </div>

                        <div className={`p-2 rounded-lg text-xs flex items-center justify-between border transition ${
                          examResult.fluencyMetrics.avgSpeechRateCPS >= 4.5
                            ? "bg-rose-100 border-rose-400 font-bold text-rose-900 shadow-xs"
                            : "bg-slate-50 border-slate-200 text-slate-400 opacity-60"
                        }`}>
                          <span>⚡ Fast Pace</span>
                          <span className="font-mono text-[11px]">&ge; 4.5 chars/sec</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 pt-1">
                      <span>Target Reference: 3.0 - 4.5 characters / sec</span>
                    </div>
                  </div>

                  <div className="bg-white border-2 border-blue-200 rounded-xl p-5 shadow-xs space-y-3">
                    <div className="text-base font-bold text-slate-900 flex items-center justify-between border-b border-blue-100 pb-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">📝</span>
                        <span>Total Output Volume</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setModalContent({
                          title: "Total Output Volume & Elaboration",
                          text: "Measures the depth and amount of information in your responses. VCE assessment criteria require you to elaborate fully with reasons and examples rather than giving brief, single-sentence answers."
                        })}
                        className="text-blue-700 underline text-xs font-bold cursor-pointer"
                      >
                        Note
                      </button>
                    </div>

                    <div className="space-y-2 pt-1">
                      <div className="text-sm font-bold text-slate-900">
                        {examResult.fluencyMetrics.totalOutputChars} characters spoken
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <div className={`p-2 rounded-lg text-xs flex items-center justify-between border transition ${
                          examResult.fluencyMetrics.totalOutputChars < 150
                            ? "bg-rose-100 border-rose-400 font-bold text-rose-900 shadow-xs"
                            : "bg-slate-50 border-slate-200 text-slate-400 opacity-60"
                        }`}>
                          <span>🛑 Brief / Too Short</span>
                          <span className="font-mono text-[11px]">&lt; 150 chars</span>
                        </div>

                        <div className={`p-2 rounded-lg text-xs flex items-center justify-between border transition ${
                          examResult.fluencyMetrics.totalOutputChars >= 150 && examResult.fluencyMetrics.totalOutputChars < 300
                            ? "bg-blue-100 border-blue-400 font-bold text-blue-900 shadow-xs"
                            : "bg-slate-50 border-slate-200 text-slate-400 opacity-60"
                        }`}>
                          <span>🌿 Moderate Elaboration</span>
                          <span className="font-mono text-[11px]">150 - 300 chars</span>
                        </div>

                        <div className={`p-2 rounded-lg text-xs flex items-center justify-between border transition ${
                          examResult.fluencyMetrics.totalOutputChars >= 300
                            ? "bg-emerald-100 border-emerald-400 font-bold text-emerald-900 shadow-xs"
                            : "bg-slate-50 border-slate-200 text-slate-400 opacity-60"
                        }`}>
                          <span>🌟 Rich Elaboration (Goal)</span>
                          <span className="font-mono text-[11px]">&ge; 300 chars</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 pt-0.5">
                      <span>Target Reference: &ge; 300 characters</span>
                    </div>

                    <details className="group pt-2 border-t border-blue-100">
                      <summary className="text-xs font-bold text-blue-700 cursor-pointer hover:underline flex items-center justify-between">
                        <span>🎙️ View My Spoken Transcript</span>
                        <span className="transition group-open:rotate-180">▼</span>
                      </summary>
                      <div className="mt-2 max-h-48 overflow-y-auto space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700">
                        {chatMessages.filter(msg => msg.role === "user").length > 0 ? (
                          chatMessages
                            .filter(msg => msg.role === "user")
                            .map((msg, i) => (
                              <div key={i} className="border-b border-slate-200 pb-2 last:border-b-0 last:pb-0">
                                <div className="font-bold text-[10px] text-blue-800 mb-0.5">Response #{i + 1}</div>
                                <div className="leading-relaxed">{msg.content}</div>
                              </div>
                            ))
                        ) : (
                          <div className="text-slate-400 italic">No user speech recorded.</div>
                        )}
                      </div>
                    </details>
                  </div>
                </div>

                <div className="bg-white border-2 border-blue-300 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-blue-200 pb-3 flex-wrap gap-2">
                    <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span className="text-lg">🗺️</span>
                      <span>Your Speaking Style Matrix (Speed vs. Volume)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModalContent({
                        title: "Speaking Style Matrix Guide",
                        text: "This 2x2 matrix maps your speech speed against your total output volume to help you identify your current speaking pattern. Your goal as a VCE student is to reach Quadrant 1 (Fast & Many), where you speak fluently and elaborate extensively."
                      })}
                      className="text-xs text-blue-700 font-bold underline cursor-pointer"
                    >
                      Note
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Based on your net speech rate and total output volume, your current performance falls into one of the four categories below:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div className={`p-4 rounded-xl border-2 transition ${quadrantId === 1 ? "bg-emerald-50 border-emerald-500 shadow-md ring-2 ring-emerald-400" : "bg-slate-50/60 border-slate-200 opacity-60"}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-emerald-900">🌟 Quadrant 1: Fast & Many (Goal)</span>
                        {quadrantId === 1 && <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">📍 You Are Here</span>}
                      </div>
                      <div className="text-xs text-slate-700 leading-relaxed">
                        High speed and rich elaboration. You speak smoothly and provide detailed explanations with examples.
                      </div>
                    </div>

                    <div className={`p-4 rounded-xl border-2 transition ${quadrantId === 2 ? "bg-blue-50 border-blue-500 shadow-md ring-2 ring-blue-400" : "bg-slate-50/60 border-slate-200 opacity-60"}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-blue-900">🐢 Quadrant 2: Slow & Many</span>
                        {quadrantId === 2 && <span className="text-[10px] bg-blue-600 text-white font-bold px-2 py-0.5 rounded-full">📍 You Are Here</span>}
                      </div>
                      <div className="text-xs text-slate-700 leading-relaxed">
                        You want to say a lot, but you pause frequently to search for vocabulary or grammar.
                      </div>
                    </div>

                    <div className={`p-4 rounded-xl border-2 transition ${quadrantId === 3 ? "bg-blue-50 border-blue-500 shadow-md ring-2 ring-blue-400" : "bg-slate-50/60 border-slate-200 opacity-60"}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-blue-900">⚡ Quadrant 3: Fast & Few</span>
                        {quadrantId === 3 && <span className="text-[10px] bg-blue-600 text-white font-bold px-2 py-0.5 rounded-full">📍 You Are Here</span>}
                      </div>
                      <div className="text-xs text-slate-700 leading-relaxed">
                        Quick, snappy answers, but too brief ("Yes/No" style). Lacks elaboration.
                      </div>
                    </div>

                    <div className={`p-4 rounded-xl border-2 transition ${quadrantId === 4 ? "bg-rose-50 border-rose-500 shadow-md ring-2 ring-rose-400" : "bg-slate-50/60 border-slate-200 opacity-60"}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-rose-900">🛑 Quadrant 4: Slow & Few</span>
                        {quadrantId === 4 && <span className="text-[10px] bg-rose-600 text-white font-bold px-2 py-0.5 rounded-full">📍 You Are Here</span>}
                      </div>
                      <div className="text-xs text-slate-700 leading-relaxed">
                        Struggling with both speed and volume. Long silences and short sentences.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                  <span>📋</span> Examiner's Feedback & Advice:
                </div>

                <div className="bg-white border-2 border-blue-200 rounded-xl p-5 shadow-xs space-y-2">
                  <div className="text-base font-bold text-slate-900 flex items-center gap-2.5 border-b border-blue-100 pb-2">
                    <span className="text-xl">📊</span>
                    <span>Performance Overview</span>
                  </div>
                  <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap pt-1">
                    {examResult.performanceOverview}
                  </div>
                </div>

                <div className="bg-white border-2 border-blue-200 rounded-xl p-5 shadow-xs space-y-2">
                  <div className="text-base font-bold text-slate-900 flex items-center gap-2.5 border-b border-blue-100 pb-2">
                    <span className="text-xl">⚠️</span>
                    <span>Key Weaknesses & Hesitation Analysis</span>
                  </div>
                  <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap pt-1">
                    {examResult.weaknessesAnalysis}
                  </div>
                </div>

                <div className="bg-white border-2 border-blue-200 rounded-xl p-5 shadow-xs space-y-2">
                  <div className="text-base font-bold text-slate-900 flex items-center gap-2.5 border-b border-blue-100 pb-2">
                    <span className="text-xl">🎯</span>
                    <span>Action Plan for Real VCE Exam</span>
                  </div>
                  <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap pt-1">
                    {examResult.actionPlan}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-blue-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setExamPhase("config")}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-6 py-3 rounded-xl text-sm transition cursor-pointer"
                >
                  🔄 Retake Mock Oral
                </button>
                <a
                  href="/dashboard"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition cursor-pointer shadow"
                >
                  🏠 Return to Dashboard
                </a>
              </div>
            </div>
          );
        })()}
      </main>

      {modalContent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border-2 border-blue-300 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-blue-200 pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <span>ℹ</span> {modalContent.title}
              </h3>
              <button
                type="button"
                onClick={() => setModalContent(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              {modalContent.text}
            </p>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setModalContent(null)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2 rounded-xl transition cursor-pointer shadow"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}