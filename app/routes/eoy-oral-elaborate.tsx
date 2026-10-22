import { useState, useRef, useMemo, useEffect } from "react";
import type { MetaFunction } from "@remix-run/react";
import oralExamQuestionsData from "../data/oral-exam-questions.json";
import PageLayout from "../components/PageLayout";
import { supabase } from "../lib/supabaseClient";

export const meta: MetaFunction = () => {
  return [
    { title: "VCE Japanese - Elaborate Drill | JPTutor AI Yamato" },
    { name: "description", content: "Special training mode to elaborate answers in multiple sentences across 3 proficiency levels." },
  ];
};

interface QuestionItem {
  id: string;
  category: string;
  text: string;
  audio?: string;
  text_original?: string;
  default_answer_original?: string;
  keyInfoHint: string;
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
  if (!rawText) return "";

  let cleaned = rawText.replace(/^#{1,6}\s+/gm, "").replace(/\*\*/g, "");

  cleaned = cleaned.replace(
    /(🌟|👍|🙂|⚠|❌)\s*(Exceptional!|Perfect!|Great!|Good!|Satisfactory\.\.\.|Needs improvement\.\.\.)/g,
    '<div style="display: inline-flex; align-items: center; gap: 0.5rem; background: #f3e8ff; color: #6b21a8; padding: 0.5rem 1rem; border-radius: 9999px; font-weight: bold; font-size: 1rem; border: 1px solid #d8b4fe; margin-bottom: 1rem; box-shadow: 0 1px 2px rgba(0,0,0,0.05);"><span>$1</span> <span>$2</span></div>'
  );

  cleaned = cleaned.replace(
    /(?:Evaluation\s*(&|and)\s*Score|Score\s*&\s*Breakdown|Score):/gi,
    '<div style="margin-top: 1.25rem; margin-bottom: 0.75rem; padding: 0.5rem 0.75rem; background: #e0f2fe; color: #0369a1; font-weight: 800; font-size: 0.95rem; border-left: 4px solid #0284c7; border-radius: 0.375rem;">📊 Evaluation & Score</div>'
  );

  cleaned = cleaned.replace(
    /(?:Analysis\s*(&|and)\s*Corrections|Key\s*Feedback\s*(&|and)\s*Corrections):/gi,
    '<div style="margin-top: 1.25rem; margin-bottom: 0.75rem; padding: 0.5rem 0.75rem; background: #fef3c7; color: #b45309; font-weight: 800; font-size: 0.95rem; border-left: 4px solid #d97706; border-radius: 0.375rem;">💡 Analysis & Corrections</div>'
  );

  cleaned = cleaned.replace(
    /Grammar\s*(&|and)\s*Vocabulary\s*Notes:/gi,
    '<div style="margin-top: 1.25rem; margin-bottom: 0.75rem; padding: 0.5rem 0.75rem; background: #ffedd5; color: #c2410c; font-weight: 800; font-size: 0.95rem; border-left: 4px solid #ea580c; border-radius: 0.375rem;">📚 Grammar & Vocabulary Notes</div>'
  );

  cleaned = cleaned.replace(
    /(?:Refined\s*Expression\s*(&|and)\s*Polish|Model\s*Refinement):/gi,
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
  if (!rawText) return "";

  let cleaned = rawText.replace(/^#{1,6}\s+/gm, "").replace(/\*\*/g, "");

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
    '<div style="font-weight: 900; color: #581c87; margin-bottom: 0.75rem; font-size: 1.05rem; border-bottom: 2px solid #f3e8ff; padding-bottom: 0.3rem;">🤖 AI Yamato Feedback</div>'
  );

  cleaned = cleaned.replace(
    /^(\d+)\.\s+([A-Za-z\s&]+):\s*(.*)$/gm,
    '<div style="margin: 0.5rem 0; padding: 0.5rem 0.75rem; background: #f8fafc; border-radius: 0.5rem; border: 1px solid #e2e8f0; font-size: 0.9rem;"><strong style="color: #334155;">$1. $2:</strong> <span style="color: #0f172a; font-weight: 600;">$3</span></div>'
  );

  cleaned = cleaned.replace(/\n/g, "<br>");

  return cleaned;
}

export default function ElaborateDrillMode() {
  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState<number>(10);

  const [selectedLevel, setSelectedLevel] = useState<string>("level2");
  const [selectedSection, setSelectedSection] = useState<string>("sec1");
  const [selectedTopics, setSelectedTopics] = useState<string[]>(["アルバイト (Part-time Job)"]);

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

  const [orderMode, setOrderMode] = useState<"sequential" | "random">("sequential");
  const [chatMessages, setChatMessages] = useState<{ role: "assistant" | "user"; content: string; isHtml?: boolean }[]>([
    {
      role: "assistant",
      content: "Welcome to the Elaborate Drill. Select your level and section, practice expanding your answers in multiple sentences, and click '🚀 Start Drill with Selected Range' above to start.",
      isHtml: false,
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isPracticing, setIsPracticing] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [activeQuestions, setActiveQuestions] = useState<QuestionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isWaitingForNext, setIsWaitingForNext] = useState(false);

  const getDifficultyKey = (level: string) => {
    if (level === "level1") return "steady";
    if (level === "level2") return "normal";
    return "accelerated";
  };

  const availableSec1Topics = useMemo(() => {
    const sectionObj = (questionsData as any)["sec1"];
    if (!sectionObj) return [];
    
    const diffKey = getDifficultyKey(selectedLevel);
    const targetList = sectionObj[diffKey] || sectionObj.steady || [];
    const categoriesSet = new Set<string>();
    
    targetList.forEach((item: any) => {
      if (item.category) {
        categoriesSet.add(item.category);
      }
    });

    return Array.from(categoriesSet);
  }, [selectedLevel]);

  const handleTopicClick = (top: string) => {
    let updated = [...selectedTopics];
    if (updated.includes(top)) {
      updated = updated.filter((t) => t !== top);
    } else {
      updated.push(top);
    }
    setSelectedTopics(updated);
  };

  const handleSelectAllTopics = () => setSelectedTopics(availableSec1Topics);
  const handleDeselectAllTopics = () => setSelectedTopics([]);

  const playTTS = async (textToSpeak: string) => {
    try {
      const cleanedText = textToSpeak
        .replace(/【.*?】/g, "")
        .replace(/※.*$/gm, "")
        .trim();

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ speakText: cleanedText }),
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

  const getFilteredQuestions = (): QuestionItem[] => {
    let rawList: any[] = [];
    const diffKey = getDifficultyKey(selectedLevel);

    const sectionObj = (questionsData as any)[selectedSection];
    if (sectionObj) {
      const targetSource = sectionObj[diffKey] || sectionObj.steady || [];

      if (selectedSection === "sec1") {
        rawList = targetSource.filter((item: any) => selectedTopics.includes(item.category));
      } else {
        rawList = targetSource;
      }
    }

    return rawList.map((item: any, idx: number) => ({
      id: item.audio ? item.audio.replace("/audio/", "").replace(".mp3", "") : `q_${idx}`,
      category: item.category || "General",
      text: item.text || "",
      text_original: item.text_original || item.text,
      default_answer_original: item.default_answer_original || item.default_answer || "",
      keyInfoHint: item.keyInfoHint || "Incorporate reasons and specific examples, and elaborate using multiple sentences.",
    }));
  };

  const startDrillPractice = () => {
    let qList = getFilteredQuestions();
    if (qList.length === 0) {
      alert("No questions found matching your criteria. Please select at least one topic.");
      return;
    }

    if (orderMode === "random") {
      qList = [...qList].sort(() => Math.random() - 0.5);
    }

    setActiveQuestions(qList);
    setCurrentQuestionIndex(0);
    setIsPracticing(true);
    setIsWaitingForNext(false);
    setInputMessage("");

    const firstQ = qList[0];
    const initialText = `[Elaborate Drill Started] First Question (Category: ${firstQ.category}):<br><br>「${firstQ.text}」<br><br>💡 Tip: ${firstQ.keyInfoHint}<br>Try answering richly using multiple sentences!`;

    setChatMessages([
      {
        role: "assistant",
        content: initialText,
        isHtml: true,
      },
    ]);

    playTTS(firstQ.text_original || firstQ.text);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await transcribeAudioToInput(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access error:", err);
      alert("Microphone access denied or unavailable.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
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
    formData.append("expectedQuestion", currentQ.text_original || currentQ.text);
    formData.append("mode", "drill-elaborate-transcribe");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to transcribe audio");
      }

      const data = await response.json() as any;
      const transcribedText = data.userText || "";
      setInputMessage(transcribedText);
    } catch (err) {
      console.error(err);
      alert("An error occurred during audio transcription. Please try again.");
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

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          expectedQuestion: currentQ.text_original || currentQ.text,
          registeredAnswer: currentQ.default_answer_original,
          mode: "drill-elaborate",
          difficulty: getDifficultyKey(selectedLevel),
          section: selectedSection,
        }),
      });

      const data = await response.json() as any;
      const rawAiFeedback = data.reply || "Content reviewed.";
      
      setCurrentDrillContext({
        question: currentQ.text_original || currentQ.text,
        userAnswer: userText,
        aiFeedback: rawAiFeedback,
      });

      const formattedFeedback = formatDrillFeedbackToHtml(rawAiFeedback);

      let fullFeedback = `<div style="font-weight: 900; color: #581c87; margin-bottom: 0.75rem; font-size: 1.05rem; border-bottom: 2px solid #f3e8ff; padding-bottom: 0.3rem;">AI Yamato Feedback</div>${formattedFeedback}`;
      const nextIndex = currentQuestionIndex + 1;

      if (nextIndex < activeQuestions.length) {
        fullFeedback += `<br><br><div style="text-align: center; margin-top: 1rem;"><strong style="color: #0d9488;">👉 Ready to Proceed?</strong></div>`;
        setIsWaitingForNext(true);
      } else {
        fullFeedback += `<br><br><div style="text-align: center; margin-top: 1rem; color: #15803d; font-weight: bold;">🎉 You have completed all questions! Great job expanding your answers!</div>`;
        setIsPracticing(false);
      }

      setChatMessages([...newMessages, { role: "assistant", content: fullFeedback, isHtml: true }]);
    } catch (err) {
      console.error(err);
      setChatMessages([...newMessages, { role: "assistant", content: "An error occurred. Please try again.", isHtml: false }]);
    } finally {
      setIsLoading(false);
    }
  };

  const proceedToNextQuestion = () => {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < activeQuestions.length) {
      setCurrentQuestionIndex(nextIndex);
      const nextQ = activeQuestions[nextIndex];
      setInputMessage("");

      const nextMessage = {
        role: "assistant" as const,
        content: `Next question (Category: ${nextQ.category}):<br><br>「${nextQ.text}」<br><br>💡 Tip: ${nextQ.keyInfoHint}<br>Try answering in detail using multiple sentences!`,
        isHtml: true,
      };

      setChatMessages((prev) => [...prev, nextMessage]);
      setIsWaitingForNext(false);

      playTTS(nextQ.text_original || nextQ.text);
    }
  };

  return (
    <PageLayout
      user={user}
      credits={credits}
      onSignOut={handleSignOut}
    >
      <div className="bg-purple-50 min-h-screen text-slate-800 font-sans pb-16 relative">
        <style>{`
          @keyframes rotate-border {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          .glow-border-btn {
            position: relative;
            background-color: #0d9488;
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
            background: linear-gradient(90deg, #2dd4bf, #f59e0b, #3b82f6, #2dd4bf);
            background-size: 300% 300%;
            animation: rotate-border 2.5s linear infinite;
            z-index: -1;
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            mask-composite: exclude;
          }
        `}</style>

        <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
          <div className="bg-white border-2 border-purple-300 rounded-2xl p-6 shadow-md">
            <h2 className="text-lg font-bold text-slate-900 mb-2">💡 Study Tips for Elaborate Drill</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Practice responding to questions tailored to your proficiency level by <strong>expanding and enriching your answers using multiple sentences</strong> (elaborating), rather than just single words. Spoken answers are transcribed automatically—review and edit if needed before sending! (Press <strong>Spacebar</strong> to toggle recording!)
            </p>
          </div>

          <div className="bg-white border border-purple-200 rounded-2xl p-6 shadow-md space-y-6">
            <div className="space-y-3">
              <h3 className="text-md font-bold text-slate-900 border-b pb-2">🎯 Select Level</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "level1", label: "🌱 Level 1 (Foundation)" },
                  { id: "level2", label: "🌿 Level 2 (Standard)" },
                  { id: "level3", label: "🌳 Level 3 (Advanced)" },
                ].map((lvl) => (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => setSelectedLevel(lvl.id)}
                    disabled={isPracticing}
                    className={`p-3 rounded-xl border text-sm font-bold transition cursor-pointer ${
                      selectedLevel === lvl.id
                        ? "bg-purple-300 text-purple-950 border-purple-400 shadow-xs"
                        : "bg-purple-50/60 text-slate-700 border-purple-200 hover:bg-purple-100"
                    }`}
                  >
                    {lvl.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t">
              <h3 className="text-md font-bold text-slate-900 border-b pb-2">📂 Select Section / Source</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "beforeSec1", label: "Before Sec 1" },
                  { id: "sec1", label: "Section 1" },
                  { id: "sec2", label: "Section 2" },
                  { id: "afterSec2", label: "After Sec 2" },
                ].map((sec) => (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setSelectedSection(sec.id)}
                    disabled={isPracticing}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      selectedSection === sec.id
                        ? "bg-purple-300 text-purple-950 border-purple-400 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {sec.label}
                  </button>
                ))}
              </div>
            </div>

            {selectedSection === "sec1" && (
              <div className="space-y-3 pt-2 border-t">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <h3 className="text-md font-bold text-slate-900">🏷 Filter Topics ({selectedTopics.length} selected)</h3>
                  <div className="space-x-2">
                    <button
                      type="button"
                      onClick={handleSelectAllTopics}
                      disabled={isPracticing}
                      className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold px-3 py-1 rounded transition cursor-pointer"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAllTopics}
                      disabled={isPracticing}
                      className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1 rounded transition cursor-pointer"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableSec1Topics.map((top) => {
                    const isSelected = selectedTopics.includes(top);
                    return (
                      <button
                        key={top}
                        type="button"
                        onClick={() => handleTopicClick(top)}
                        disabled={isPracticing}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                          isSelected ? "bg-purple-300 text-purple-950 border-purple-400 shadow-2xs" : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-purple-50"
                        }`}
                      >
                        {isSelected ? "✓ " : ""}{top}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t">
              <div className="flex items-center gap-4">
                <span className="text-sm font-bold text-slate-700">Order Mode:</span>
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input type="radio" name="orderMode" checked={orderMode === "sequential"} onChange={() => setOrderMode("sequential")} disabled={isPracticing} /> Sequential
                </label>
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input type="radio" name="orderMode" checked={orderMode === "random"} onChange={() => setOrderMode("random")} disabled={isPracticing} /> Random
                </label>
              </div>

              <button
                type="button"
                onClick={startDrillPractice}
                disabled={isPracticing}
                className="w-full sm:w-auto bg-purple-300 hover:bg-purple-400 disabled:bg-slate-300 text-purple-950 border border-purple-400 font-bold px-6 py-3 rounded-xl shadow-xs transition cursor-pointer"
              >
                🚀 Start Drill with Selected Range
              </button>
            </div>
          </div>

          <div className="bg-white border border-purple-200 rounded-2xl p-6 shadow-md space-y-4">
            <h3 className="text-md font-bold text-slate-900 border-b pb-2">2. Conversation Practice with AI Yamato!🎙️</h3>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 h-96 overflow-y-auto space-y-3">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div className={`max-w-[90%] sm:max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user" ? "bg-teal-600 text-white rounded-br-xs" : "bg-white border border-slate-200 text-slate-800 rounded-bl-xs shadow-sm"
                  }`}>
                    {msg.isHtml ? <div dangerouslySetInnerHTML={{ __html: msg.content }} /> : msg.content}
                  </div>
                </div>
              ))}
              {isLoading && <div className="text-xs text-slate-500 italic">AI is analyzing your elaborate answer...</div>}
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between gap-3 p-3 bg-purple-50 border border-purple-200 rounded-xl flex-wrap">
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

                  {isPracticing && activeQuestions[currentQuestionIndex] && (
                    <button
                      type="button"
                      onClick={() => {
                        const currentQ = activeQuestions[currentQuestionIndex];
                        if (currentQ) playTTS(currentQ.text_original || currentQ.text);
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
                      ➡ Proceed
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
                  className="flex-grow p-3 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 focus:outline-none disabled:bg-slate-150"
                />
                <button
                  type="submit"
                  disabled={!isPracticing || isLoading || !inputMessage.trim() || isWaitingForNext}
                  className="bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white font-bold px-6 py-3 rounded-xl transition text-sm shrink-0 cursor-pointer"
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
              className="bg-purple-700 hover:bg-purple-800 text-white font-bold px-4 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all cursor-pointer text-sm"
            >
              <span>🤖</span>
              <span>AI Yamato</span>
            </button>
          ) : (
            <div
              ref={aiChatRef}
              className={`bg-white border-2 border-purple-300 rounded-2xl p-5 shadow-2xl flex flex-col transition-all ${
                isAiFullscreen
                  ? "w-screen h-screen rounded-none border-none p-6 sm:p-10 overflow-auto"
                  : "w-80 sm:w-96 h-[560px] min-w-[280px] min-h-[350px] max-w-[90vw] max-h-[85vh] resize overflow-auto [transform:rotate(180deg)]"
              }`}
            >
              <div className={`w-full h-full flex flex-col ${!isAiFullscreen ? "[transform:rotate(180deg)]" : ""}`}>
                <div className="flex items-center justify-between border-b pb-2 mb-3 shrink-0">
                  <h3 className="text-sm font-bold text-purple-900 flex items-center gap-2 m-0">
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

                <div className="bg-purple-50 border border-purple-200 rounded-xl p-2.5 mb-2 flex items-center justify-between shrink-0">
                  <span className="text-xs font-bold text-purple-900">Learning Pace</span>
                  <div className="inline-flex rounded-lg bg-white p-0.5 shadow-xs border border-purple-200">
                    {(['steady', 'normal', 'accelerated'] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setTutorLevel(level)}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold capitalize transition cursor-pointer ${
                          tutorLevel === level
                            ? "bg-purple-700 text-white shadow-xs"
                            : "text-slate-600 hover:text-purple-800"
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
                            ? "bg-purple-700 text-white shadow-xs"
                            : "text-slate-600 hover:text-purple-800"
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
                            ? "bg-purple-700 text-white rounded-br-xs"
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
                              <div className="mt-2 rounded-lg overflow-hidden border border-purple-200 bg-purple-50/50 p-1">
                                <img
                                  src={msg.imageUrl}
                                  alt="AI Yamato Visual Explanation"
                                  onClick={() => setModalImageSrc(msg.imageUrl || null)}
                                  className="w-full h-auto rounded-md object-contain max-h-48 cursor-pointer hover:opacity-95 transition"
                                  title="クリックして画像を拡大"
                                />
                                <p className="text-[10px] text-purple-900 text-center mt-1 font-medium cursor-pointer" onClick={() => setModalImageSrc(msg.imageUrl || null)}>
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
                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-purple-900 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={requestVisualAid}
                        onChange={(e) => setRequestVisualAid(e.target.checked)}
                        disabled={isTutorLoading}
                        className="rounded border-purple-300 text-purple-700 focus:ring-purple-500 w-3.5 h-3.5 cursor-pointer"
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
                      className="flex-grow p-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-slate-50/50"
                    />
                    <button
                      type="submit"
                      disabled={isTutorLoading || !tutorInput.trim()}
                      className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 shrink-0"
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