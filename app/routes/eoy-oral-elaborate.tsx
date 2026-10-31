/**
 * @file eoy-oral-elaborate.tsx
 * @description VCE Japanese - EOY Oral Elaborate Practice & Custom QA Bank
 */
import React, { useState, useEffect, useMemo, useRef } from "react";
import type { MetaFunction } from "@remix-run/react";
import PageLayout from "../components/PageLayout";
import { DataErrorState } from "../components/DataErrorState";
import OralExaminerAvatar from "../components/OralExaminerAvatar";
import ChatYamatoEoyOralElaborate from "../components/ChatYamatoEoyOralElaborate";
import { supabase } from "../lib/supabaseClient";

// Modular Oral components & hooks
import OralCenterChatPractice from "../components/OralCenterChatPractice";
import OralCustomQuestionForm from "../components/OralCustomQuestionForm";
import OralDrillQuestionSelector from "../components/OralDrillQuestionSelector";
import { useOralPracticeEngine, QuestionData } from "../hooks/OralPracticeHooks";
import { useSupabaseUserAnswers } from "../hooks/OralUserAnswersHooks";
import {
  fetchOralExamQuestionsData,
  OralExamQuestionsData,
} from "../data/oral-exam-questions";

import { Download, Plus, Trash2, Play, Lightbulb } from "lucide-react";
import ElaborateHintModal from "../components/ElaborateHintModal";

export interface QuestionItem {
  id: string;
  question: string;
  category?: string;
  isCustom?: boolean;
}

export const meta: MetaFunction = () => {
  return [
    { title: "VCE Japanese - EOY Oral Elaborate Practice & Custom QA Bank | JPTutor AI Yamato" },
    {
      name: "description",
      content:
        "Comprehensive VCE Japanese Oral Exam practice covering all stages with detailed elaboration and deep conversational responses.",
    },
  ];
};

export default function EoyOralElaboratePage() {
  const themeColor = "#a855f7"; // Purple / Violet theme for Elaborate

  const [user, setUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  const [credits, setCredits] = useState<number>(10);
  const [nickname, setNickname] = useState<string>("VCE Student");

  const [questionsData, setQuestionsData] = useState<OralExamQuestionsData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  const [selectedSection, setSelectedSection] = useState<
    "beforeSec1" | "sec1" | "sec2" | "afterSec2" | "custom"
  >("sec1");
  const [selectedLevel, setSelectedLevel] = useState<"steady" | "normal" | "accelerated">(
    "normal"
  );
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [speechSpeed, setSpeechSpeed] = useState<number>(1.0);
  const [orderMode, setOrderMode] = useState<"sequential" | "random">("sequential");

  const [newQuestionText, setNewQuestionText] = useState("");
  const [newAnswerText, setNewAnswerText] = useState("");
  const [newCategory, setNewCategory] = useState("");

  // Modal State for Elaborate Hint
  const [isHintModalOpen, setIsHintModalOpen] = useState<boolean>(false);

  // Sentence map state for each question ID: { [qId: string]: ["Sentence 1", "Sentence 2", "Sentence 3", ...] }
  const [sentencesMap, setSentencesMap] = useState<{ [qId: string]: string[] }>({});

  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  const handleOpenAuth = () => {
    window.dispatchEvent(new CustomEvent("open-auth-modal", { detail: { mode: "signin" } }));
    const authButton = document.querySelector("[data-auth-trigger]") as HTMLElement;
    if (authButton) {
      authButton.click();
    } else {
      window.location.href = "/#auth";
    }
  };

  const {
    answers,
    customQuestionsRaw,
    fetchCustomQuestions,
    loadSavedAnswers,
    handleAnswerChange,
    handleAnswerBlur,
    addCustomQuestion,
    deleteCustomQuestion,
    fetchDrillAnswers,
  } = useSupabaseUserAnswers(supabase, user?.id, "elaborate");

  const engine = useOralPracticeEngine(selectedLevel, speechSpeed, user?.id, nickname);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsAuthLoading(false);
      if (session?.user) fetchProfile(session.user.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsAuthLoading(false);
      if (session?.user) fetchProfile(session.user.id);
    });

    async function loadQuestions() {
      setIsLoadingData(true);
      try {
        const fetched = await fetchOralExamQuestionsData(supabase);
        setQuestionsData(fetched);
      } catch (err) {
        setQuestionsData(null);
      } finally {
        setIsLoadingData(false);
      }
    }
    loadQuestions();

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("credits, nickname")
        .eq("id", userId)
        .single();

      if (data && !error) {
        if (typeof data.credits === "number") setCredits(data.credits);
        if (data.nickname) setNickname(data.nickname);
      }
    } catch (err) {
      console.error("Fetch profile error:", err);
    }
  };

  useEffect(() => {
    if (!engine.isAnalyzing && user?.id) {
      fetchProfile(user.id);
    }
  }, [engine.isAnalyzing, user?.id]);

  useEffect(() => {
    if (selectedSection === "custom" && user?.id) fetchCustomQuestions();
  }, [selectedSection, user?.id]);

  const availableTopics = useMemo(() => {
    const set = new Set<string>();
    if (selectedSection === "custom") {
      customQuestionsRaw.forEach((q) => q.category && set.add(q.category));
    } else if (questionsData) {
      const secData = questionsData[selectedSection];
      if (secData) {
        const list = secData[selectedLevel] || secData["normal"] || secData["steady"] || [];
        list.forEach((q) => q.category && set.add(q.category));
      }
    }
    return Array.from(set);
  }, [selectedSection, selectedLevel, questionsData, customQuestionsRaw]);

  const toggleTopic = (topic: string) => {
    if (selectedTopics.includes(topic)) {
      setSelectedTopics(selectedTopics.filter((t) => t !== topic));
    } else {
      setSelectedTopics([...selectedTopics, topic]);
    }
  };

  const handleSelectAllTopics = () => setSelectedTopics(availableTopics);
  const handleClearAllTopics = () => setSelectedTopics([]);

  const currentQuestions: (QuestionItem & {
    questionOriginal: string;
    defaultAnswerOriginal?: string;
    minLength?: number;
  })[] = useMemo(() => {
    const list: (QuestionItem & {
      questionOriginal: string;
      defaultAnswerOriginal?: string;
      minLength?: number;
    })[] = [];
    const initialMap: { [key: string]: string } = {};

    if (selectedSection === "custom") {
      customQuestionsRaw.forEach((q) => {
        const categoryName = q.category || "General";
        if (selectedTopics.length > 0 && !selectedTopics.includes(categoryName)) return;

        const qId = String(q.id);
        const effectiveAnswer = q.answer_text || "";
        list.push({
          id: qId,
          question: q.question_text,
          questionOriginal: q.question_text,
          category: categoryName,
          isCustom: true,
          defaultAnswerOriginal: effectiveAnswer,
          minLength: 10,
        });
        initialMap[qId] = effectiveAnswer;
      });
    } else if (questionsData) {
      const secData = questionsData[selectedSection];
      if (secData) {
        const rawList = secData[selectedLevel] || secData["normal"] || secData["steady"] || [];
        let counter = 1;
        rawList.forEach((q) => {
          if (q && (q.text || q.text_original)) {
            const categoryName = q.category || "General";
            if (selectedTopics.length > 0 && !selectedTopics.includes(categoryName)) return;

            const qId = q.audio ? q.audio.replace("/audio/", "").replace(".mp3", "") : `q-${counter++}`;
            const plainAnswer = q.default_answer_original || q.defaultAnswer || "";
            const displayQuestion = q.text || q.text_original || "";
            const plainQuestion = q.text_original || q.text || "";

            list.push({
              id: String(qId),
              question: displayQuestion,
              questionOriginal: plainQuestion,
              category: categoryName,
              isCustom: false,
              defaultAnswerOriginal: plainAnswer,
              minLength: 10,
            });
            initialMap[String(qId)] = plainAnswer;
          }
        });
      }
    }

    loadSavedAnswers(initialMap);
    return list;
  }, [selectedSection, selectedLevel, selectedTopics, questionsData, customQuestionsRaw]);

  // 安全に文章を結合するヘルパー関数 (二重句点「。。」を自動修正)
  const combineSentencesList = (sentences: string[]): string => {
    const valid = sentences.map((s) => s.trim()).filter(Boolean);
    if (valid.length === 0) return "";
    return valid.map((s) => s.replace(/[。！？]+$/, "")).join("。") + "。";
  };

  // Sentence-based Input Management Logic
  const getSentencesForQuestion = (qId: string): string[] => {
    if (sentencesMap[qId]) return sentencesMap[qId];

    const existingText = answers[qId] || "";
    if (existingText.trim()) {
      const normalized = existingText.replace(/([。！？])\1+/g, "$1");
      const parts = normalized
        .split(/(?<=[。！？\n])/)
        .map((s) => s.trim())
        .filter((s) => s !== "" && s !== "。" && s !== "！" && s !== "？");
      if (parts.length >= 3) return parts;
      return [parts[0] || "", parts[1] || "", parts[2] || ""];
    }
    return ["", "", ""];
  };

  const handleSentenceChange = (qId: string, index: number, value: string) => {
    const current = getSentencesForQuestion(qId);
    const updated = [...current];
    updated[index] = value;

    setSentencesMap((prev) => ({ ...prev, [qId]: updated }));

    const combined = combineSentencesList(updated);
    handleAnswerChange(qId, combined);
  };

  const handleSentenceBlur = (qId: string, isCustom?: boolean) => {
    const current = getSentencesForQuestion(qId);
    const combined = combineSentencesList(current);
    handleAnswerBlur(qId, combined, isCustom);
  };

  // Import Drill answer into Sentence 1 for a specific question
  const handleImportDrillForQuestion = async (qId: string) => {
    if (!fetchDrillAnswers) return;
    const drillMap = await fetchDrillAnswers();
    const drillAns = drillMap[qId];
    if (!drillAns) {
      alert("No Drill answer found for this question.");
      return;
    }

    const current = getSentencesForQuestion(qId);
    const updated = [...current];
    updated[0] = drillAns; // 1文目(インデックス0)を書き換え

    setSentencesMap((prev) => ({ ...prev, [qId]: updated }));

    const combined = combineSentencesList(updated);
    handleAnswerChange(qId, combined);
    handleAnswerBlur(qId, combined);
  };

  // Import Drill answers into Sentence 1 for all questions
  const handleImportAllFromDrill = async () => {
    if (!fetchDrillAnswers) return;
    const drillMap = await fetchDrillAnswers();
    if (Object.keys(drillMap).length === 0) {
      alert("No importable Drill answers found.");
      return;
    }

    const nextSentencesMap = { ...sentencesMap };
    let importedCount = 0;

    currentQuestions.forEach((q) => {
      const drillAns = drillMap[q.id];
      if (drillAns) {
        const current = getSentencesForQuestion(q.id);
        const updated = [...current];
        updated[0] = drillAns; // 1文目(インデックス0)を書き換え
        nextSentencesMap[q.id] = updated;

        const combined = combineSentencesList(updated);
        handleAnswerChange(q.id, combined);
        handleAnswerBlur(q.id, combined);
        importedCount++;
      }
    });

    setSentencesMap(nextSentencesMap);
    alert(`Imported Drill answers into Sentence 1 for ${importedCount} questions!`);
  };

  // Add 4th and subsequent sentence boxes
  const handleAddSentence = (qId: string) => {
    const current = getSentencesForQuestion(qId);
    const updated = [...current, ""];
    setSentencesMap((prev) => ({ ...prev, [qId]: updated }));
  };

  // Remove sentence box
  const handleRemoveSentence = (qId: string, index: number) => {
    const current = getSentencesForQuestion(qId);
    if (current.length <= 1) return;
    const updated = current.filter((_, i) => i !== index);
    setSentencesMap((prev) => ({ ...prev, [qId]: updated }));

    const combined = combineSentencesList(updated);
    handleAnswerChange(qId, combined);
    handleAnswerBlur(qId, combined);
  };

  const handleStartPractice = async () => {
    if (!user) {
      alert("Sign-in is required to start conversation practice!");
      handleOpenAuth();
      return;
    }
    if (credits < 4) {
      alert("Insufficient credits (4 credits required for Elaborate practice). Please top up your credits.");
      return;
    }

    for (const q of currentQuestions) {
      const sentences = getSentencesForQuestion(q.id);
      const filledSentences = sentences.filter((s) => s.trim().length > 0);
      if (filledSentences.length < 3) {
        alert(
          `Answer for question "${q.questionOriginal.slice(
            0,
            20
          )}..." is incomplete. Please enter at least 3 sentences.`
        );
        return;
      }
    }

    const targetQList: QuestionData[] = currentQuestions.map((q) => ({
      id: q.id,
      question: q.question,
      questionOriginal: q.questionOriginal,
      category: q.category,
      defaultAnswerOriginal: q.defaultAnswerOriginal,
    }));

    engine.startPractice(targetQList, answers, orderMode);
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleAddCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("Sign-in is required to add custom questions.");
      handleOpenAuth();
      return;
    }
    if (!newQuestionText.trim() || !newAnswerText.trim()) {
      alert("Please enter both the question and answer.");
      return;
    }
    if (newAnswerText.trim().length < 10) {
      alert("Please enter at least 10 characters for your response.");
      return;
    }
    const success = await addCustomQuestion(newQuestionText, newAnswerText, newCategory);
    if (success) {
      setNewQuestionText("");
      setNewAnswerText("");
      setNewCategory("");
    }
  };

  const handleSendMessageWithCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (credits < 4) {
      alert("Insufficient credits.");
      return;
    }
    await engine.sendAnswerMessage(e, answers, "elaborate", selectedSection);
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  if (isAuthLoading || isLoadingData) {
    return (
      <PageLayout user={user} credits={credits}>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 flex items-center justify-center">
          <div className="text-slate-600 dark:text-slate-300 font-bold text-lg animate-pulse">
            Loading EOY Oral Practice...
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!user) {
    return (
      <PageLayout user={user} credits={credits}>
        <div className="min-h-[70vh] bg-slate-50 dark:bg-slate-950 py-16 px-4 flex items-center justify-center">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/50 rounded-3xl p-8 shadow-sm text-center space-y-6">
            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 rounded-2xl mx-auto flex items-center justify-center text-2xl font-black">
              🔒
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">
                Sign In Required
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                EOY Oral Elaborate Practice & Custom QA Bank require you to sign in. Please sign in to access oral practice sessions and save your custom answers.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAuth}
              className="w-full py-3 px-6 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs tracking-wider uppercase transition shadow-sm cursor-pointer"
            >
              Sign In / Sign Up Now
            </button>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!questionsData || Object.keys(questionsData).length === 0) {
    return (
      <PageLayout user={user} credits={credits}>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 max-w-4xl mx-auto">
          <DataErrorState
            title="Oral Exam Database Unavailable"
            message="Unable to load Oral Exam Questions from Supabase. Please reload or report this error."
            errorMessage="Failed to fetch key 'ORAL_EXAM_QUESTIONS' from app_knowledge table in Supabase."
          />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout user={user} credits={credits}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 relative">
        <main className="max-w-4xl mx-auto space-y-8">
          {/* Header Banner Section */}
          <div className="bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/50 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-300">
                  All VCE Oral Exam Stages
                </span>
                <span className="text-xs text-slate-500">
                  VCE Japanese Oral Exam Prep (Cost: 4 credits/session)
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100">
                EOY Oral Exam Elaborate Practice & Custom QA Bank
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Practice every stage of the VCE Japanese Oral Exam with detailed elaboration. Your custom answers are automatically saved. (Requirement: 3+ sentences | 4 credits per turn/response)
              </p>
            </div>

            <OralExaminerAvatar statusText="Ready for Practice" themeColor={themeColor} />
          </div>

          {/* 2. Conversation Practice with AI Yamato 🎙️ (単一のインタラクティブ・コンポーネント) */}
          <div ref={chatContainerRef}>
            <OralCenterChatPractice
              chatMessages={engine.chatMessages}
              isPracticing={engine.isPracticing}
              currentQuestionIndex={engine.currentQuestionIndex}
              totalQuestions={engine.activeQuestions.length}
              isAnalyzing={engine.isAnalyzing}
              isRecording={engine.isRecording}
              isWaitingForNext={engine.isWaitingForNext}
              inputMessage={engine.inputMessage}
              setInputMessage={engine.setInputMessage}
              onStartRecording={engine.startRecording}
              onStopRecording={engine.stopRecording}
              onRepeatQuestion={() => {
                const currentQ = engine.activeQuestions[engine.currentQuestionIndex];
                if (currentQ) engine.playTTS(currentQ.questionOriginal || currentQ.question);
              }}
              onProceedNext={() => engine.proceedToNextQuestion(answers)}
              onSendMessage={handleSendMessageWithCredit}
              themeColor={themeColor}
              headerRight={
                !engine.isPracticing && (
                  <button
                    type="button"
                    onClick={handleStartPractice}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs uppercase tracking-wider transition shadow-sm cursor-pointer shrink-0"
                  >
                    <Play size={16} />
                    <span>Speak to AI Yamato</span>
                  </button>
                )
              }
            />
          </div>

          {/* Section Selection Area & Control Selector */}
          <div className="bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 rounded-3xl p-6 shadow-sm space-y-6">
            {/* Stage Selection */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                📂 Select Exam Stage / Source
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { id: "beforeSec1", label: "Before Sec 1 (Entrance)" },
                  { id: "sec1", label: "Section 1 (General)" },
                  { id: "sec2", label: "Section 2 (Detailed)" },
                  { id: "afterSec2", label: "After Sec 2 (Exit)" },
                  { id: "custom", label: "⭐ My Custom Bank" },
                ].map((sec) => (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => {
                      setSelectedSection(sec.id as any);
                      setSelectedTopics([]);
                    }}
                    className={`p-3 rounded-2xl border text-xs font-bold transition cursor-pointer ${
                      selectedSection === sec.id
                        ? "bg-purple-600 text-white border-purple-700 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-purple-50"
                    }`}
                  >
                    {sec.label}
                  </button>
                ))}
              </div>
            </div>

            {selectedSection !== "custom" && (
              <OralDrillQuestionSelector
                categories={availableTopics}
                selectedTopics={selectedTopics}
                onToggleTopic={toggleTopic}
                onSelectAllTopics={handleSelectAllTopics}
                onClearAllTopics={handleClearAllTopics}
                selectedLevel={selectedLevel}
                onSelectLevel={setSelectedLevel}
                selectedSpeed={speechSpeed}
                onSelectSpeed={setSpeechSpeed}
                themeColor={themeColor}
                questionsCount={currentQuestions.length}
              />
            )}
          </div>

          {selectedSection === "custom" && (
            <OralCustomQuestionForm
              newQuestionText={newQuestionText}
              setNewQuestionText={setNewQuestionText}
              newAnswerText={newAnswerText}
              setNewAnswerText={setNewAnswerText}
              newCategory={newCategory}
              setNewCategory={setNewCategory}
              onSubmit={handleAddCustom}
              themeColor={themeColor}
            />
          )}

          {/* Review & Customize Your Answers Section */}
          <div className="bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <span>📝 Review & Customize Your Answers</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Please enter 3 or more sentences for each question. You can import your answer from Drill into Sentence 1.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* 全問の第一文をドリルからインポートする文言 ＋ [import] ボタン */}
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <span>Import the first sentence from Drill for all questions</span>
                  <button
                    type="button"
                    onClick={handleImportAllFromDrill}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition shadow-sm cursor-pointer"
                  >
                    <Download size={13} />
                    <span>[import]</span>
                  </button>
                </div>

                {/* Order mode toggle */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setOrderMode("sequential")}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      orderMode === "sequential"
                        ? "bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-sm"
                        : "text-slate-500"
                    }`}
                  >
                    Sequential
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderMode("random")}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      orderMode === "random"
                        ? "bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-sm"
                        : "text-slate-500"
                    }`}
                  >
                    Random
                  </button>
                </div>
              </div>
            </div>

            {/* Answer input area for each question */}
            <div className="space-y-6">
              {currentQuestions.map((q, qIdx) => {
                const sentences = getSentencesForQuestion(q.id);

                return (
                  <div
                    key={q.id}
                    className="p-5 bg-slate-50/70 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-4"
                  >
                    {/* Question Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2.5 py-1 bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 rounded-md">
                          {q.category || `Q${qIdx + 1}`}
                        </span>
                        <h3
                          className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100"
                          dangerouslySetInnerHTML={{ __html: q.question }}
                        />
                      </div>

                      {q.isCustom && (
                        <button
                          type="button"
                          onClick={() => deleteCustomQuestion(q.id)}
                          className="text-xs text-rose-500 hover:text-rose-700 flex items-center gap-1 p-1 self-start sm:self-auto"
                        >
                          <Trash2 size={14} />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>

                    {/* Sentence 1, 2, 3... Input Fields */}
                    <div className="space-y-3">
                      {sentences.map((sText, sIdx) => (
                        <div key={sIdx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                            <div className="flex items-center gap-2">
                              <span>Sentence {sIdx + 1}</span>
                              {/* Sentence 1: [import from Drill] ボタン */}
                              {sIdx === 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleImportDrillForQuestion(q.id)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 rounded-lg transition cursor-pointer"
                                >
                                  <Download size={12} />
                                  <span>[import from Drill]</span>
                                </button>
                              )}
                              {/* Sentence 2 & 3: [Elaborate Hint] ボタン */}
                              {(sIdx === 1 || sIdx === 2) && (
                                <button
                                  type="button"
                                  onClick={() => setIsHintModalOpen(true)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 rounded-lg transition cursor-pointer"
                                >
                                  <Lightbulb size={12} />
                                  <span>[Elaborate Hint]</span>
                                </button>
                              )}
                            </div>

                            {sIdx >= 3 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveSentence(q.id, sIdx)}
                                className="text-rose-500 hover:text-rose-700 text-xs flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 size={13} />
                                <span>Delete Box</span>
                              </button>
                            )}
                          </div>
                          <textarea
                            value={sText}
                            onChange={(e) => handleSentenceChange(q.id, sIdx, e.target.value)}
                            onBlur={() => handleSentenceBlur(q.id, q.isCustom)}
                            placeholder={
                              sIdx === 0
                                ? "Importable from Drill"
                                : sIdx === 1 || sIdx === 2
                                ? "If you don't know what to write, check [Elaborate Hint]"
                                : `Enter Sentence ${sIdx + 1}`
                            }
                            rows={2}
                            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition resize-none"
                          />
                        </div>
                      ))}
                    </div>

                    {/* Add Sentence Button */}
                    <button
                      type="button"
                      onClick={() => handleAddSentence(q.id)}
                      className="w-full py-2.5 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50/40 text-purple-700 dark:text-purple-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Plus size={16} />
                      <span>+ Add Sentence</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <aside
            aria-label="Floating Controls"
            className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3"
          >
            <ChatYamatoEoyOralElaborate userId={user?.id} userNickname={nickname} credits={credits} />
          </aside>
        </main>
      </div>

      {/* Elaborate Hint モーダル */}
      <ElaborateHintModal
        isOpen={isHintModalOpen}
        onClose={() => setIsHintModalOpen(false)}
      />
    </PageLayout>
  );
}