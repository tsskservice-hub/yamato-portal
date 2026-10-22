import { useState, useEffect, useMemo, useRef } from "react";
import type { MetaFunction } from "@remix-run/react";
import oralExamQuestionsData from "../data/oral-exam-questions.json";
import PageLayout from "../components/PageLayout";
import { supabase } from "../lib/supabaseClient";

export const meta: MetaFunction = () => {
  return [
    { title: "VCE Japanese - Unified Drill & Custom QA Bank | JPTutor AI Yamato" },
    { name: "description", content: "Unified drill practice supporting VCE exam sections, levels, and your own custom Q&A bank." },
  ];
};

interface DrillQuestion {
  id: string;
  question: string;
  questionOriginal: string;
  defaultAnswer: string;
  defaultAnswerWithRuby: string;
  category?: string;
  isCustom?: boolean;
}

type ChatMessage = {
  role: 'assistant' | 'user';
  content: string;
  imageUrl?: string;
};

const questionsData = oralExamQuestionsData;

/**
 * 1. ドリル練習画面（メイン中央）専用の構造化HTML変換パーサー関数
 */
function formatDrillFeedbackToHtml(rawText: string): string {
  if (!rawText) return '';

  let cleaned = rawText.replace(/^#{1,6}\s+/gm, '').replace(/\*\*/g, '');

  cleaned = cleaned.replace(
    /Evaluation\s*(&|and)\s*Score:/gi,
    '<div style="margin-top: 1.25rem; margin-bottom: 0.75rem; padding: 0.5rem 0.75rem; background: #e0f2fe; color: #0369a1; font-weight: 800; font-size: 0.95rem; border-left: 4px solid #0284c7; border-radius: 0.375rem;">📊 Evaluation & Score</div>'
  );

  cleaned = cleaned.replace(
    /Analysis\s*(&|and)\s*Corrections:/gi,
    '<div style="margin-top: 1.25rem; margin-bottom: 0.75rem; padding: 0.5rem 0.75rem; background: #fef3c7; color: #b45309; font-weight: 800; font-size: 0.95rem; border-left: 4px solid #d97706; border-radius: 0.375rem;">💡 Analysis & Corrections</div>'
  );

  cleaned = cleaned.replace(
    /Grammar\s*(&|and)\s*Vocabulary\s*Notes:/gi,
    '<div style="margin-top: 1.25rem; margin-bottom: 0.75rem; padding: 0.5rem 0.75rem; background: #ffedd5; color: #c2410c; font-weight: 800; font-size: 0.95rem; border-left: 4px solid #ea580c; border-radius: 0.375rem;">📚 Grammar & Vocabulary Notes</div>'
  );

  cleaned = cleaned.replace(
    /Refined\s*Expression\s*(&|and)\s*Polish:/gi,
    '<div style="margin-top: 1.25rem; margin-bottom: 0.75rem; padding: 0.5rem 0.75rem; background: #d1fae5; color: #065f46; font-weight: 800; font-size: 0.95rem; border-left: 4px solid #059669; border-radius: 0.375rem;">✨ Refined Expression & Polish</div>'
  );

  cleaned = cleaned.replace(
    /^(\d+)\.\s+([A-Za-z\s&]+):\s*(.*)$/gm,
    '<div style="margin: 0.5rem 0; padding: 0.5rem 0.75rem; background: #f8fafc; border-radius: 0.5rem; border: 1px solid #e2e8f0; font-size: 0.9rem;"><strong style="color: #334155;">$1. $2:</strong> <span style="color: #0f172a; font-weight: 600;">$3</span></div>'
  );

  cleaned = cleaned.replace(/\n/g, "<br>");

  return cleaned;
}

/**
 * 2. 右下の汎用ヤマトチャット専用の構造化HTML変換パーサー関数
 */
function formatAiTutorFeedbackToHtml(rawText: string): string {
  if (!rawText) return '';

  let cleaned = rawText.replace(/^#{1,6}\s+/gm, '').replace(/\*\*/g, '');

  cleaned = cleaned.replace(
    /Explanation\s*(&|and)\s*Overview:/gi,
    '<div style="margin-top: 1.25rem; margin-bottom: 0.75rem; padding: 0.5rem 0.75rem; background: #e0f2fe; color: #0369a1; font-weight: 800; font-size: 0.95rem; border-left: 4px solid #0284c7; border-radius: 0.375rem;">💡 Explanation & Overview</div>'
  );

  cleaned = cleaned.replace(
    /Usage\s*(&|and)\s*Grammar\s*Notes:/gi,
    '<div style="margin-top: 1.25rem; margin-bottom: 0.75rem; padding: 0.5rem 0.75rem; background: #fef3c7; color: #b45309; font-weight: 800; font-size: 0.95rem; border-left: 4px solid #d97706; border-radius: 0.375rem;">✍️ Usage & Grammar Notes</div>'
  );

  cleaned = cleaned.replace(
    /Practical\s*Examples:/gi,
    '<div style="margin-top: 1.25rem; margin-bottom: 0.75rem; padding: 0.5rem 0.75rem; background: #d1fae5; color: #065f46; font-weight: 800; font-size: 0.95rem; border-left: 4px solid #059669; border-radius: 0.375rem;">💬 Practical Examples</div>'
  );

  cleaned = cleaned.replace(
    /Common\s*Mistakes:/gi,
    '<div style="margin-top: 1.25rem; margin-bottom: 0.75rem; padding: 0.5rem 0.75rem; background: #fee2e2; color: #b91c1c; font-weight: 800; font-size: 0.95rem; border-left: 4px solid #dc2626; border-radius: 0.375rem;">⚠️ Common Mistakes</div>'
  );

  cleaned = cleaned.replace(
    /Key\s*Takeaways:/gi,
    '<div style="margin-top: 1.25rem; margin-bottom: 0.75rem; padding: 0.5rem 0.75rem; background: #f3e8ff; color: #6b21a8; font-weight: 800; font-size: 0.95rem; border-left: 4px solid #9333ea; border-radius: 0.375rem;">🎯 Key Takeaways</div>'
  );

  cleaned = cleaned.replace(
    /Next\s*Step:/gi,
    '<div style="margin-top: 1.25rem; margin-bottom: 0.75rem; padding: 0.5rem 0.75rem; background: #ccfbf1; color: #115e59; font-weight: 800; font-size: 0.95rem; border-left: 4px solid #0d9488; border-radius: 0.375rem;">🚀 Next Step</div>'
  );

  cleaned = cleaned.replace(
    /AI\s*Yamato\s*Feedback:/gi,
    '<div style="font-weight: 900; color: #065f46; margin-bottom: 0.75rem; font-size: 1.05rem; border-bottom: 2px solid #a7f3d0; padding-bottom: 0.3rem;">🤖 AI Yamato Feedback</div>'
  );

  cleaned = cleaned.replace(
    /^(\d+)\.\s+([A-Za-z\s&]+):\s*(.*)$/gm,
    '<div style="margin: 0.5rem 0; padding: 0.5rem 0.75rem; background: #f8fafc; border-radius: 0.5rem; border: 1px solid #e2e8f0; font-size: 0.9rem;"><strong style="color: #334155;">$1. $2:</strong> <span style="color: #0f172a; font-weight: 600;">$3</span></div>'
  );

  cleaned = cleaned.replace(/\n/g, "<br>");

  return cleaned;
}

export default function UnifiedDrillMode() {
  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState<number>(10);

  const [isAiTutorOpen, setIsAiTutorOpen] = useState<boolean>(false);
  const [isAiFullscreen, setIsAiFullscreen] = useState<boolean>(false);
  const [chatFontSize, setChatFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base');
  const aiChatRef = useRef<HTMLDivElement>(null);

  const [currentDrillContext, setCurrentDrillContext] = useState<{
    question: string;
    userAnswer: string;
    aiFeedback: string;
  } | null>(null);

  const [tutorMessages, setTutorMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Welcome! Feel free to ask me anything about Japanese grammar or study tips.'
    }
  ]);
  const [tutorInput, setTutorInput] = useState<string>('');
  const [isTutorLoading, setIsTutorLoading] = useState<boolean>(false);
  const [requestVisualAid, setRequestVisualAid] = useState<boolean>(false);
  const [modalImageSrc, setModalImageSrc] = useState<string | null>(null);
  const [tutorLevel, setTutorLevel] = useState<'steady' | 'normal' | 'accelerated'>('steady');

  // Supabase session & credits
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserCredits(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserCredits(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserCredits = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', userId)
        .single();
      
      if (data && !error) {
        const typedData = data as { credits?: number };
        setCredits(typedData.credits ?? 10);
      }
    } catch (err) {
      console.error('Failed to fetch user credits:', err);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const getFontSizeClass = () => {
    switch (chatFontSize) {
      case 'sm': return 'text-sm';
      case 'base': return 'text-base';
      case 'lg': return 'text-lg';
      case 'xl': return 'text-xl';
      default: return 'text-base';
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
      console.error('Fullscreen toggle failed:', err);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) setIsAiFullscreen(false);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleSendTutorMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tutorInput.trim() || isTutorLoading) return;
    const userMsg = tutorInput.trim();
    const needsVisual = requestVisualAid;
    setTutorInput('');
    setRequestVisualAid(false);
    const newMessages: ChatMessage[] = [...tutorMessages, { role: 'user', content: userMsg }];
    setTutorMessages(newMessages);
    setIsTutorLoading(true);
    try {
      const visualPrompt = needsVisual
        ? `Educational instructional diagram and visual aid for VCE Japanese high school students explaining: ${userMsg}. Clean layout, high quality, professional illustration style.`
        : undefined;
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          chatHistory: tutorMessages,
          learningPace: tutorLevel,
          visualPrompt,
          drillContext: currentDrillContext,
        }),
      });
      if (!res.ok) {
        throw new Error('Failed to get response from AI tutor');
      }
      const data = await res.json() as any;
      const replyText = data.reply || "I'm here to help you with your Japanese studies!";
      const imageUrl = data.imageUrl;
      const formattedReply = formatAiTutorFeedbackToHtml(replyText);
      setTutorMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: formattedReply,
          imageUrl: imageUrl,
        },
      ]);
    } catch (err) {
      console.error(err);
      setTutorMessages([
        ...newMessages,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try asking again!' },
      ]);
    } finally {
      setIsTutorLoading(false);
    }
  };

  const [selectedLevel, setSelectedLevel] = useState<"steady" | "normal" | "accelerated">("normal");
  const [selectedSection, setSelectedSection] = useState<"beforeSec1" | "sec1" | "sec2" | "afterSec2" | "custom">("sec1");
  const [selectedTopic, setSelectedTopic] = useState<string[]>([]);
  const [speechSpeed, setSpeechSpeed] = useState<number>(1.0);

  const handleLevelChange = (newLevel: "steady" | "normal" | "accelerated") => {
    setSelectedLevel(newLevel);
    if (newLevel === "steady") setSpeechSpeed(0.85);
    else if (newLevel === "accelerated") setSpeechSpeed(1.1);
    else setSpeechSpeed(1.0);
  };

  const [currentLevelQuestions, setCurrentLevelQuestions] = useState<DrillQuestion[]>([]);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [customQuestionsRaw, setCustomQuestionsRaw] = useState<any[]>([
    { id: "c1", question_text: "家族とよく何をしますか？", answer_text: "私はよく家族と買い物をします。", category: "Family" }
  ]);

  const [newQuestionText, setNewQuestionText] = useState("");
  const [newAnswerText, setNewAnswerText] = useState("");
  const [newCategory, setNewCategory] = useState("");

  const [orderMode, setOrderMode] = useState<"sequential" | "random">("sequential");
  const [chatMessages, setChatMessages] = useState<{ role: "assistant" | "user"; content: string; isHtml?: boolean }[]>([
    {
      role: "assistant",
      content: "ようこそ！ Select your level/section or custom bank, then click '🚀 Speak to AI Yamato' above to start.",
      isHtml: false,
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isPracticing, setIsPracticing] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [activeQuestions, setActiveQuestions] = useState<DrillQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isWaitingForNext, setIsWaitingForNext] = useState(false);

  const playTTS = async (textToSpeak: string) => {
    try {
      const cleanedText = textToSpeak
        .replace(/【.*?】/g, "")
        .replace(/※.*$/gm, "")
        .trim();

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          speakText: cleanedText,
          level: selectedSection === "custom" ? "normal" : selectedLevel,
          learningPace: selectedSection === "custom" ? "normal" : selectedLevel,
          pace: selectedSection === "custom" ? "normal" : selectedLevel,
          speed: speechSpeed
        }),
      });

      if (!response.ok) return;

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.play().catch((err) => console.error("Audio playback error:", err));
    } catch (err) {
      console.error("TTS request error:", err);
    }
  };

  const availableTopics = useMemo(() => {
    const categoriesSet = new Set<string>();

    if (selectedSection === "custom") {
      customQuestionsRaw.forEach((q) => {
        if (q.category) categoriesSet.add(q.category);
      });
    } else {
      const dataObj = questionsData as Record<string, any>;
      const secData = dataObj[selectedSection];
      if (secData) {
        const targetList = secData[selectedLevel] || secData["normal"] || secData["steady"] || [];
        if (Array.isArray(targetList)) {
          targetList.forEach((q: any) => {
            if (q && q.category) categoriesSet.add(q.category);
          });
        }
      }
    }
    return Array.from(categoriesSet);
  }, [selectedSection, selectedLevel, customQuestionsRaw]);

  useEffect(() => {
    setSelectedTopic(availableTopics);
  }, [selectedLevel, selectedSection, availableTopics]);

  const handleSelectAllTopics = () => setSelectedTopic(availableTopics);
  const handleDeselectAllTopics = () => setSelectedTopic([]);

  const handleTopicClick = (top: string) => {
    let updated = [...selectedTopic];
    if (updated.includes(top)) {
      updated = updated.filter((t) => t !== top);
    } else {
      updated.push(top);
    }
    setSelectedTopic(updated);
  };

  useEffect(() => {
    const loadedQuestions: DrillQuestion[] = [];
    const initialAnswersMap: { [key: string]: string } = {};

    if (selectedSection === "custom") {
      customQuestionsRaw.forEach((q) => {
        if (selectedTopic.length > 0) {
          if (!q.category || !selectedTopic.includes(q.category)) return;
        }
        const qId = String(q.id);
        const qText = q.question_text;
        const ansText = q.answer_text;

        loadedQuestions.push({
          id: qId,
          question: qText,
          questionOriginal: qText,
          defaultAnswer: ansText,
          defaultAnswerWithRuby: ansText,
          category: q.category || "General",
          isCustom: true,
        });
        initialAnswersMap[qId] = ansText;
      });
      setCurrentLevelQuestions(loadedQuestions);
      setAnswers(initialAnswersMap);
      setIsPracticing(false);
    } else {
      const dataObj = questionsData as Record<string, any>;
      let counter = 1;
      const sectionData = dataObj[selectedSection];

      if (sectionData) {
        const targetList = sectionData[selectedLevel] || sectionData["normal"] || sectionData["steady"] || [];

        if (Array.isArray(targetList)) {
          targetList.forEach((q: any) => {
            if (q && (q.text || q.text_original)) {
              if (selectedTopic.length > 0) {
                if (!q.category || !selectedTopic.includes(q.category)) return;
              }

              const qText = q.text || q.text_original; 
              const qTextOriginal = q.text_original || q.text; 
              const qId = q.audio ? q.audio.replace("/audio/", "").replace(".mp3", "") : `q-${counter++}`;

              const plainAnswer = q.default_answer_original || q.defaultAnswer || "Please enter your answer here.";
              const rubyAnswer = q.defaultAnswer || q.default_answer_original || "Please enter your answer here.";

              loadedQuestions.push({
                id: String(qId),
                question: qText,
                questionOriginal: qTextOriginal,
                defaultAnswer: plainAnswer,
                defaultAnswerWithRuby: rubyAnswer,
                category: q.category,
                isCustom: false,
              });
              initialAnswersMap[String(qId)] = plainAnswer;
            }
          });
        }
      }

      setCurrentLevelQuestions(loadedQuestions);
      setAnswers({ ...initialAnswersMap });
      setIsPracticing(false);
    }
  }, [selectedLevel, selectedSection, selectedTopic, customQuestionsRaw]);

  const handleAnswerChange = (id: string, text: string) => {
    setAnswers((prev) => ({ ...prev, [id]: text }));
  };

  const handleAnswerBlur = (_id: string, _text: string, _isCustom?: boolean) => {
  };

  const handleAddCustomQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim() || !newAnswerText.trim()) {
      alert("Please enter both question and sample answer.");
      return;
    }

    const newItem = {
      id: `custom-${Date.now()}`,
      question_text: newQuestionText.trim(),
      answer_text: newAnswerText.trim(),
      category: newCategory.trim() || "General",
    };

    setCustomQuestionsRaw((prev) => [...prev, newItem]);
    setNewQuestionText("");
    setNewAnswerText("");
    setNewCategory("");
  };

  const handleDeleteCustom = (id: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;
    setCustomQuestionsRaw((prev) => prev.filter((q) => q.id !== id));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split("\n");
        const itemsToInsert: { id: string; question_text: string; answer_text: string; category: string }[] = [];
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          const cols = trimmed.split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
          if (cols.length >= 2 && cols[0] && cols[1]) {
            itemsToInsert.push({
              id: `custom-${Date.now()}-${Math.random()}`,
              question_text: cols[0],
              answer_text: cols[1],
              category: cols[2] || "General",
            });
          }
        }

        if (itemsToInsert.length > 0) {
          setCustomQuestionsRaw((prev) => [...prev, ...itemsToInsert]);
          alert(`Successfully imported ${itemsToInsert.length} questions!`);
        }
      } catch (_err) {
        alert("Failed to import CSV.");
      } finally {
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  const downloadCsvTemplate = () => {
    const content = "\uFEFFQuestion,Answer,Topic\n家族とよく何をしますか？,私はよく家族と買い物をします。,Family";
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "custom_questions_template.csv";
    link.click();
  };

  const startDrillPractice = () => {
    if (currentLevelQuestions.length === 0) {
      alert("No questions found matching the selected criteria.");
      return;
    }

    let qList = [...currentLevelQuestions];
    if (orderMode === "random") {
      qList = qList.sort(() => Math.random() - 0.5);
    }
    setActiveQuestions(qList);
    setCurrentQuestionIndex(0);
    setIsPracticing(true);
    setIsWaitingForNext(false);
    setInputMessage("");

    const firstQ = qList[0];
    const targetAns = answers[firstQ.id] || "";
    const topicDisplay = selectedTopic.length === availableTopics.length ? "All Topics" : `${selectedTopic.length} topics selected`;
    const modeDesc = selectedSection === "custom" ? "Custom Bank" : `${selectedLevel.toUpperCase()} / ${selectedSection}`;

    setChatMessages([
      {
        role: "assistant",
        content: `[Drill Started (${modeDesc} / ${topicDisplay})] Here is your first question:\n\n「${firstQ.question}」\n\n(Your Answer: 「${targetAns}」)\n\n始めましょう！`,
        isHtml: true,
      },
    ]);

    playTTS(firstQ.questionOriginal);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await transcribeAudioToInput(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (_err) {
      alert("Microphone access is denied or unavailable.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      setIsRecording(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === " ") {
        const target = e.target as HTMLElement;
        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
          return;
        }

        if (!isPracticing || isLoading || isWaitingForNext) {
          return;
        }

        e.preventDefault();
        if (!isRecording) {
          startRecording();
        } else {
          stopRecording();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPracticing, isLoading, isWaitingForNext, isRecording]);

  const transcribeAudioToInput = async (audioBlob: Blob) => {
    setIsLoading(true);
    const currentQ = activeQuestions[currentQuestionIndex];
    const formData = new FormData();
    formData.append("audio", audioBlob, "user-audio.webm");
    formData.append("expectedQuestion", currentQ.questionOriginal);
    formData.append("mode", selectedSection === "custom" ? "drill-custom-transcribe" : "drill-elaborate-transcribe");
    formData.append("learningPace", selectedLevel);
    formData.append("pace", selectedLevel);

    try {
      const res = await fetch("/api/chat", { method: "POST", body: formData });
      if (!res.ok) throw new Error();
      const data = await res.json() as any;
      setInputMessage(data.userText || "");
    } catch (_err) {
      alert("Transcription error.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userText = inputMessage.trim();
    setInputMessage("");

    const newMessages = [...chatMessages, { role: "user" as const, content: userText, isHtml: false }];
    setChatMessages(newMessages);
    setIsLoading(true);

    const currentQ = activeQuestions[currentQuestionIndex];
    const registeredAnswer = answers[currentQ.id] || "";
    const isExactMatch = userText.trim() === registeredAnswer.trim();

    try {
      let aiFeedback = "";
      if (isExactMatch) {
        aiFeedback = "◎ よくできました。完璧です！";
      } else {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userText,
            expectedQuestion: currentQ.questionOriginal,
            registeredAnswer: registeredAnswer,
            mode: selectedSection === "custom" ? "drill-custom" : "drill",
            level: selectedLevel,
            learningPace: selectedLevel,
            pace: selectedLevel,
            section: selectedSection,
          }),
        });
        const data = await res.json() as any;
        aiFeedback = data.reply || "◎ よくできました。";
      }

      setCurrentDrillContext({
        question: currentQ.questionOriginal,
        userAnswer: userText,
        aiFeedback: aiFeedback,
      });

      const formattedFeedback = formatDrillFeedbackToHtml(aiFeedback);
      let fullFeedback = `<div style="font-weight: 900; color: #047857; margin-bottom: 0.75rem; font-size: 1.05rem; border-bottom: 2px solid #a7f3d0; padding-bottom: 0.3rem;">AI Yamato Feedback</div>${formattedFeedback}`;
      
      const nextIndex = currentQuestionIndex + 1;
      const isPerfect = isExactMatch || aiFeedback.trim().startsWith("◎");

      if (isPerfect && nextIndex < activeQuestions.length) {
        setTimeout(() => {
          setCurrentQuestionIndex(nextIndex);
          const nextQ = activeQuestions[nextIndex];
          const targetAns = answers[nextQ.id] || "";
          setChatMessages((prev) => [
            ...prev,
            { role: "assistant", content: fullFeedback, isHtml: true },
            { role: "assistant", content: `Next question:\n\n「${nextQ.question}」\n\n(Your Answer: 「${targetAns}」)\n\nがんばってね！`, isHtml: true },
          ]);
          setIsWaitingForNext(false);
          playTTS(nextQ.questionOriginal);
        }, 400);
        setIsLoading(false);
        return;
      } else if (!isPerfect && nextIndex < activeQuestions.length) {
        fullFeedback += `<br><br><div style="text-align: center; margin-top: 1rem;"><strong style="color: #059669;">👉 Ready to Proceed?</strong></div>`;
        setIsWaitingForNext(true);
      } else {
        fullFeedback += `<br><br><div style="text-align: center; margin-top: 1rem; color: #047857; font-weight: bold;">🎉 You have completed all questions! Great job.</div>`;
        setIsPracticing(false);
      }

      setChatMessages([...newMessages, { role: "assistant", content: fullFeedback, isHtml: true }]);
    } catch (_err) {
      setChatMessages([...newMessages, { role: "assistant", content: "An error occurred.", isHtml: false }]);
    } finally {
      setIsLoading(false);
    }
  };

  const proceedToNextQuestion = () => {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < activeQuestions.length) {
      setCurrentQuestionIndex(nextIndex);
      const nextQ = activeQuestions[nextIndex];
      const targetAns = answers[nextQ.id] || "";
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Next question:\n\n「${nextQ.question}」\n\n(Your Answer: 「${targetAns}」)\n\nがんばってね！`, isHtml: true },
      ]);
      setIsWaitingForNext(false);
      playTTS(nextQ.questionOriginal);
    }
  };

  const topicLabelDisplay = selectedTopic.length === availableTopics.length ? "All Topics" : `${selectedTopic.length} topics selected`;

  return (
    <PageLayout
      user={user}
      credits={credits}
      onSignOut={handleSignOut}
    >
      <div className="bg-emerald-50 min-h-screen text-slate-800 font-sans pb-16 relative">
        <style>{`
          @keyframes rotate-border {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          .glow-border-btn {
            position: relative;
            background-color: #059669;
            color: white;
            border-radius: 12px;
            background-clip: padding-box;
            border: 3px solid transparent;
          }
          .glow-border-btn::before {
            content: '';
            position: absolute;
            inset: -3px;
            border-radius: 14px;
            background: linear-gradient(90deg, #34d399, #f59e0b, #3b82f6, #34d399);
            background-size: 300% 300%;
            animation: rotate-border 2.5s linear infinite;
            z-index: -1;
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            mask-composite: exclude;
          }
        `}</style>

        <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
          <div className="bg-white border-2 border-amber-300 rounded-2xl p-6 shadow-md">
            <h2 className="text-lg font-bold text-slate-900 mb-2">💡 How to Use Unified Drill Mode</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Choose a VCE exam section or select <strong>My Custom Bank</strong> to load your own Q&A. Customize your answers, tune the AI speed, and practice interactively via microphone (or press <strong>Spacebar</strong> to toggle recording!) or text.
            </p>
          </div>

          <div className="bg-white border border-amber-200 rounded-2xl p-6 shadow-md space-y-6">
            {selectedSection !== "custom" && (
              <div className="space-y-3">
                <h3 className="text-md font-bold text-slate-900 border-b pb-2">🎯 Select Level</h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "steady", label: "🌱 Steady (Foundation)" },
                    { id: "normal", label: "🌿 Normal (Standard)" },
                    { id: "accelerated", label: "🌳 Accelerated (Advanced)" },
                  ].map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => handleLevelChange(lvl.id as any)}
                      className={`p-3 rounded-xl border text-sm font-bold transition cursor-pointer ${
                        selectedLevel === lvl.id
                          ? "bg-amber-500 text-white border-amber-500 shadow"
                          : "bg-amber-50/60 text-slate-700 border-amber-200 hover:bg-amber-100"
                      }`}
                    >
                      {lvl.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2 pt-2 border-t">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-900">🔊 AI Speech Speed</h3>
                <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">{speechSpeed}x</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: "🐢 Very Slow (0.7x)", value: 0.7 },
                  { label: "🚶 Slow (0.85x)", value: 0.85 },
                  { label: "🏃 Normal (1.0x)", value: 1.0 },
                  { label: "⚡ Fast (1.15x)", value: 1.15 },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setSpeechSpeed(item.value)}
                    className={`p-2 rounded-lg border text-xs font-bold transition cursor-pointer ${
                      speechSpeed === item.value
                        ? "bg-emerald-300 text-slate-900 border-emerald-300 shadow-2xl"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t">
              <h3 className="text-md font-bold text-slate-900 border-b pb-2">📂 Select Section / Source</h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { id: "beforeSec1", label: "Before Sec 1" },
                  { id: "sec1", label: "Section 1" },
                  { id: "sec2", label: "Section 2" },
                  { id: "afterSec2", label: "After Sec 2" },
                  { id: "custom", label: "⭐ My Custom Bank" },
                ].map((sec) => (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setSelectedSection(sec.id as any)}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      selectedSection === sec.id
                        ? "bg-emerald-300 text-slate-900 border-emerald-300 shadow"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {sec.label}
                  </button>
                ))}
              </div>
            </div>

            {availableTopics.length > 0 && (
              <div className="space-y-3 pt-2 border-t">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <h3 className="text-md font-bold text-slate-900">🏷 Filter Topics ({selectedTopic.length} selected)</h3>
                  <div className="space-x-2">
                    <button
                      type="button"
                      onClick={handleSelectAllTopics}
                      className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold px-3 py-1 rounded transition cursor-pointer"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAllTopics}
                      className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1 rounded transition cursor-pointer"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableTopics.map((top) => {
                    const isSelected = selectedTopic.includes(top);
                    return (
                      <button
                        key={top}
                        type="button"
                        onClick={() => handleTopicClick(top)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                          isSelected ? "bg-amber-500 text-white border-amber-500" : "bg-slate-50 text-slate-700 border-slate-200"
                        }`}
                      >
                        {isSelected ? "✓ " : ""}{top}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {selectedSection === "custom" && (
            <div className="bg-white border border-amber-200 rounded-2xl p-6 shadow-md space-y-6">
              <h3 className="text-md font-bold text-slate-900 border-b pb-2">➕ Add Custom Question & Answer</h3>
              <form onSubmit={handleAddCustomQuestion} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Question</label>
                    <input
                      type="text"
                      value={newQuestionText}
                      onChange={(e) => setNewQuestionText(e.target.value)}
                      placeholder="例：家族とよく何をしますか？"
                      className="w-full p-2.5 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Topic</label>
                    <input
                      type="text"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="例：Family"
                      className="w-full p-2.5 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Answer</label>
                  <textarea
                    rows={2}
                    value={newAnswerText}
                    onChange={(e) => setNewAnswerText(e.target.value)}
                    placeholder="例：私はよく家族と買い物をします。"
                    className="w-full p-2.5 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div className="flex justify-end">
                  <button type="submit" className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition cursor-pointer shadow-xs">
                    + Add to Custom Bank
                  </button>
                </div>
              </form>

              <div className="pt-4 border-t space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-900">📂 Import from CSV</h4>
                  <button type="button" onClick={downloadCsvTemplate} className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold px-3 py-1 rounded text-xs cursor-pointer">
                    📥 Template
                  </button>
                </div>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-white cursor-pointer"
                />
              </div>
            </div>
          )}

          <div className="bg-white border border-amber-200 rounded-2xl p-6 shadow-md space-y-6">
            <h3 className="text-md font-bold text-slate-900 border-b pb-2 flex items-center justify-between flex-wrap gap-2">
              <span>1. Review & Edit Q&A ({selectedSection === "custom" ? "Custom Bank" : `${selectedLevel.toUpperCase()} / ${selectedSection}`} - {topicLabelDisplay})</span>
              <span className="text-xs bg-amber-100 text-amber-900 font-bold px-2.5 py-1 rounded-full">
                Matches: {currentLevelQuestions.length}
              </span>
            </h3>

            <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2">
              {currentLevelQuestions.length === 0 ? (
                <p className="text-sm text-slate-500 py-8 text-center font-medium">No questions found matching the criteria.</p>
              ) : (
                currentLevelQuestions.map((item: DrillQuestion, index: number) => (
                  <div key={item.id} className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">Q{index + 1}</span>
                        {item.category && (
                          <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold">{item.category}</span>
                        )}
                      </div>
                      <span className="text-sm font-medium text-slate-900" dangerouslySetInnerHTML={{ __html: item.question }} />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pt-1">
                      <span className="text-xs font-semibold text-slate-600 shrink-0">Sample Answer:</span>
                      <div className="text-sm font-bold text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-amber-200 shadow-2xs leading-relaxed flex-grow">
                        <span dangerouslySetInnerHTML={{ __html: item.defaultAnswerWithRuby }} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="block text-xs font-semibold text-slate-600">Your Answer</label>
                        {item.isCustom && (
                          <button type="button" onClick={() => handleDeleteCustom(item.id)} className="text-rose-600 hover:text-rose-800 text-xs font-bold cursor-pointer">
                            Delete Question
                          </button>
                        )}
                      </div>
                      <textarea
                        rows={2}
                        value={answers[item.id] ?? ""}
                        onChange={(e) => handleAnswerChange(item.id, e.target.value)}
                        onBlur={(e) => handleAnswerBlur(item.id, e.target.value, item.isCustom)}
                        placeholder="Enter your own answer..."
                        className="w-full text-sm p-3 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t">
              <div className="flex items-center gap-4">
                <span className="text-sm font-bold text-slate-700">Order Mode:</span>
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input type="radio" name="orderMode" checked={orderMode === "sequential"} onChange={() => setOrderMode("sequential")} /> Sequential
                </label>
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input type="radio" name="orderMode" checked={orderMode === "random"} onChange={() => setOrderMode("random")} /> Random
                </label>
              </div>

              <button
                type="button"
                onClick={startDrillPractice}
                disabled={currentLevelQuestions.length === 0}
                className="w-full sm:w-auto bg-emerald-300 hover:bg-emerald-400 disabled:bg-slate-300 text-slate-900 font-bold px-6 py-3 rounded-xl shadow transition cursor-pointer"
              >
                🚀 Speak to AI Yamato
              </button>
            </div>
          </div>

          <div className="bg-white border border-amber-200 rounded-2xl p-6 shadow-md space-y-4">
            <h3 className="text-md font-bold text-slate-900 border-b pb-2">2. Conversation Practice with AI Yamato!🎙️</h3>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 h-96 overflow-y-auto space-y-3">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div className={`max-w-[90%] sm:max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user" ? "bg-amber-500 text-white rounded-br-lg" : "bg-white border border-slate-200 text-slate-800 rounded-bl-lg shadow-xs"
                  }`}>
                    {msg.isHtml ? <div dangerouslySetInnerHTML={{ __html: msg.content }} /> : msg.content}
                  </div>
                </div>
              ))}
              {isLoading && <div className="text-xs text-slate-500 italic">AI is analyzing your answer...</div>}
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex-wrap">
                <div className="flex-1 flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      disabled={!isPracticing || isLoading || isWaitingForNext}
                      className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white font-bold px-6 py-3 rounded-full shadow-md transition cursor-pointer text-sm"
                    >
                      <span>🎙️</span> Recording <span className="text-xs bg-rose-800 px-2 py-0.5 rounded-full opacity-90">[Spacebar]</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold px-6 py-3 rounded-full shadow-md transition animate-pulse cursor-pointer text-sm"
                    >
                      <span>⏹</span> Stop Recording <span className="text-xs bg-amber-700 px-2 py-0.5 rounded-full opacity-90">[Spacebar]</span>
                    </button>
                  )}

                  {isPracticing && (
                    <button
                      type="button"
                      onClick={() => {
                        const currentQ = activeQuestions[currentQuestionIndex];
                        if (currentQ) playTTS(currentQ.questionOriginal);
                      }}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold px-4 py-3 rounded-full shadow-md transition text-sm cursor-pointer"
                    >
                      <span>🔊</span> Repeat Q
                    </button>
                  )}
                </div>

                <div className="flex justify-center sm:justify-end min-w-[120px]">
                  {isWaitingForNext && (
                    <button type="button" onClick={proceedToNextQuestion} className="glow-border-btn font-bold px-6 py-3 rounded-xl text-sm shadow-lg transition cursor-pointer">
                      ➡️ Proceed
                    </button>
                  )}
                </div>
              </div>

              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={isWaitingForNext ? "Please click 'Proceed' above" : isPracticing ? "Type or record your answer..." : "Start drill above first..."}
                  disabled={!isPracticing || isLoading || isWaitingForNext}
                  className="flex-grow p-3 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:bg-slate-100"
                />
                <button
                  type="submit"
                  disabled={!isPracticing || isLoading || !inputMessage.trim() || isWaitingForNext}
                  className="bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white font-bold px-6 py-3 rounded-xl transition text-sm shrink-0 cursor-pointer"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        </main>

        <aside aria-label="AI Yamato" className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
          {!isAiTutorOpen ? (
            <button
              type="button"
              onClick={() => setIsAiTutorOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all cursor-pointer text-sm"
            >
              <span>🤖</span>
              <span>AI Yamato</span>
            </button>
          ) : (
            <div
              ref={aiChatRef}
              className={`bg-white border-2 border-emerald-300 rounded-2xl p-5 shadow-2xl flex flex-col transition-all ${
                isAiFullscreen
                  ? "w-screen h-screen rounded-none border-none p-6 sm:p-10 overflow-auto"
                  : "w-80 sm:w-96 h-[560px] min-w-[280px] min-h-[350px] max-w-[90vw] max-h-[85vh] resize overflow-auto [transform:rotate(180deg)]"
              }`}
            >
              <div className={`w-full h-full flex flex-col ${!isAiFullscreen ? "[transform:rotate(180deg)]" : ""}`}>
                <div className="flex items-center justify-between border-b pb-2 mb-3 shrink-0">
                  <h3 className="text-sm font-bold text-emerald-900 flex items-center gap-2 m-0">
                    <span>🤖</span> 日本語Tutor AI Yamato
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={toggleAiFullscreen}
                      className="text-slate-500 hover:text-slate-700 text-xs font-bold px-2 py-1 rounded-md transition cursor-pointer border border-slate-200"
                      title={isAiFullscreen ? "元の大きさに戻す" : "デバイスの画面に合わせて最大化"}
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

                <p className="text-xs text-slate-600 leading-relaxed mb-3 shrink-0">
                  Ask questions about grammar, or get study advice!
                </p>

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 mb-2 flex items-center justify-between shrink-0">
                  <span className="text-xs font-bold text-emerald-900">Learning Pace</span>
                  <div className="inline-flex rounded-lg bg-white p-0.5 shadow-xs border border-emerald-200">
                    {(['steady', 'normal', 'accelerated'] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setTutorLevel(level)}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold capitalize transition cursor-pointer ${
                          tutorLevel === level
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "text-slate-600 hover:text-emerald-700"
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-100 border border-slate-200 rounded-xl p-2.5 mb-3 flex items-center justify-between shrink-0">
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
                        className={`px-2 py-1 rounded-md text-[10px] font-bold transition cursor-pointer ${
                          chatFontSize === size.key
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "text-slate-600 hover:text-emerald-700"
                        }`}
                      >
                        {size.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={`bg-slate-50 border border-slate-200 rounded-xl p-3 overflow-y-auto space-y-2.5 flex-grow mb-3 ${getFontSizeClass()}`}>
                  {tutorMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[95%] p-2.5 rounded-xl leading-relaxed whitespace-pre-wrap ${
                          msg.role === 'user'
                            ? "bg-emerald-600 text-white rounded-br-xs"
                            : "bg-white border border-slate-200 text-slate-800 rounded-bl-xs shadow-xs"
                        }`}
                      >
                        {msg.role === 'user' ? (
                          msg.content
                        ) : (
                          <div className="space-y-2">
                            <div
                              className="ai-markdown-content overflow-x-auto"
                              dangerouslySetInnerHTML={{ __html: msg.content }}
                            />
                            {msg.imageUrl && (
                              <div className="mt-2 rounded-lg overflow-hidden border border-emerald-200 bg-emerald-50/50 p-1">
                                <img
                                  src={msg.imageUrl}
                                  alt="AI Yamato Visual Explanation"
                                  onClick={() => setModalImageSrc(msg.imageUrl || null)}
                                  className="w-full h-auto rounded-md object-contain max-h-48 cursor-pointer hover:opacity-95 transition"
                                  title="クリックして画像を拡大"
                                />
                                <p className="text-[10px] text-emerald-800 text-center mt-1 font-medium cursor-pointer" onClick={() => setModalImageSrc(msg.imageUrl || null)}>
                                  ✨ ヤマト特製図解・イラスト（クリックして拡大）
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isTutorLoading && (
                    <div className="text-slate-500 italic">🤖 かんがえちゅう...</div>
                  )}
                </div>

                <form onSubmit={handleSendTutorMessage} className="flex flex-col gap-2 shrink-0">
                  <div className="flex items-center gap-2 px-1">
                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={requestVisualAid}
                        onChange={(e) => setRequestVisualAid(e.target.checked)}
                        disabled={isTutorLoading}
                        className="rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                      />
                      <span>🎨 explain with diagrams and illustrations</span>
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tutorInput}
                      onChange={(e) => setTutorInput(e.target.value)}
                      placeholder="Ask AI tutor anything..."
                      disabled={isTutorLoading}
                      className="flex-grow p-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
                    />
                    <button
                      type="submit"
                      disabled={isTutorLoading || !tutorInput.trim()}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      Send
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </aside>

        {modalImageSrc && (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setModalImageSrc(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl p-2 shadow-2xl flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setModalImageSrc(null)}
                className="absolute top-3 right-3 bg-slate-800/70 hover:bg-slate-900 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition cursor-pointer z-10"
              >
                ✕
              </button>
              <img
                src={modalImageSrc}
                alt="Enlarged AI Yamato Visual"
                className="max-w-full max-h-[80vh] rounded-lg object-contain"
              />
              <p className="text-xs text-slate-600 mt-2 font-medium">✨ AI Yamato 特製図解・イラスト（拡大表示）</p>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}