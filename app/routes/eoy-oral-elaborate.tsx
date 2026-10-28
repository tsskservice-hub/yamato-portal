/**
 * @file eoy-oral-elaborate.tsx
 * @description VCE Japanese - Comprehensive EOY Oral Elaborate Practice & Custom QA Bank
 * Covers all stages of the VCE Oral Exam: Before Section 1, Section 1, Section 2, and After Section 2 with multi-topic selection for Section 1 and all sections.
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
import OralUserAnswerList, { QuestionItem } from "../components/OralUserAnswerList";
import OralCustomQuestionForm from "../components/OralCustomQuestionForm";
import { useOralPracticeEngine, QuestionData } from "../hooks/OralPracticeHooks";
import { useSupabaseUserAnswers } from "../hooks/OralUserAnswersHooks";

import {
  fetchOralExamQuestionsData,
  OralExamQuestionsData,
} from "../data/oral-exam-questions";

export const meta: MetaFunction = () => {
  return [
    { title: "VCE Japanese - EOY Oral Elaborate Practice | JPTutor AI Yamato" },
    { name: "description", content: "Comprehensive VCE Japanese Oral Exam elaboration practice covering Before Section 1, Section 1, Section 2, and After Section 2 with multi-topic filtering and AI dialogue." },
  ];
};

export default function EoyOralElaboratePage() {
  const themeColor = "#a855f7"; // Purple theme for Elaboration Practice

  const [user, setUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [credits, setCredits] = useState<number>(10);
  const [nickname, setNickname] = useState<string>("VCE Student");

  const [questionsData, setQuestionsData] = useState<OralExamQuestionsData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  const [selectedSection, setSelectedSection] = useState<"beforeSec1" | "sec1" | "sec2" | "afterSec2" | "custom">("sec2");
  const [selectedLevel, setSelectedLevel] = useState<"steady" | "normal" | "accelerated">("normal");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [speechSpeed, setSpeechSpeed] = useState<number>(1.0);
  const [orderMode, setOrderMode] = useState<"sequential" | "random">("sequential");

  const [newQuestionText, setNewQuestionText] = useState("");
  const [newAnswerText, setNewAnswerText] = useState("");
  const [newCategory, setNewCategory] = useState("");

  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  const {
    answers,
    customQuestionsRaw,
    fetchCustomQuestions,
    loadSavedAnswers,
    handleAnswerChange,
    handleAnswerBlur,
    addCustomQuestion,
    deleteCustomQuestion,
  } = useSupabaseUserAnswers(supabase, user?.id);

  const engine = useOralPracticeEngine(selectedLevel, speechSpeed);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsAuthLoading(false);
      if (session?.user) fetchProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
    if (selectedSection === "custom" && user?.id) fetchCustomQuestions();
  }, [selectedSection, user?.id]);

  // Extract all available topics for the current exam stage/section & pace
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

  // Default to selecting all available topics on section or level change
  useEffect(() => {
    setSelectedTopics(availableTopics);
  }, [selectedLevel, selectedSection, availableTopics.length]);

  // Multi-topic selection toggle
  const toggleTopic = (topic: string) => {
    if (selectedTopics.includes(topic)) {
      setSelectedTopics(selectedTopics.filter((t) => t !== topic));
    } else {
      setSelectedTopics([...selectedTopics, topic]);
    }
  };

  const handleSelectAllTopics = () => setSelectedTopics(availableTopics);
  const handleClearAllTopics = () => setSelectedTopics([]);

  // Extract current questions based on selected topics
  const currentQuestions: (QuestionItem & { questionOriginal: string; defaultAnswerOriginal?: string })[] = useMemo(() => {
    const list: (QuestionItem & { questionOriginal: string; defaultAnswerOriginal?: string })[] = [];
    const initialMap: { [key: string]: string } = {};

    if (selectedSection === "custom") {
      customQuestionsRaw.forEach((q) => {
        const categoryName = q.category || "General";
        if (selectedTopics.length > 0 && !selectedTopics.includes(categoryName)) return;

        const qId = String(q.id);
        list.push({
          id: qId,
          question: q.question_text,
          questionOriginal: q.question_text,
          category: categoryName,
          isCustom: true,
          defaultAnswerOriginal: q.answer_text || "",
        });
        initialMap[qId] = q.answer_text || "";
      });
    } else if (questionsData) {
      const secData = questionsData[selectedSection];
      if (secData) {
        const rawList = secData[selectedLevel] || secData["normal"] || secData["steady"] || [];
        let counter = 1;
        rawList.forEach((q) => {
          if (q && (q.text || q.text_original)) {
            const categoryName = q.category || "Detailed Study";
            if (selectedTopics.length > 0 && !selectedTopics.includes(categoryName)) return;

            const qId = q.audio ? q.audio.replace("/audio/", "").replace(".mp3", "") : `sec-q-${counter++}`;
            const plainAnswer = q.default_answer_original || q.defaultAnswer || "";
            const displayQuestion = q.text || q.text_original || "";
            const plainQuestion = q.text_original || q.text || "";

            list.push({
              id: String(qId),
              question: displayQuestion,          // Formatted HTML with furigana for UI
              questionOriginal: plainQuestion,  // Clean text without furigana for TTS
              category: categoryName,
              isCustom: false,
              defaultAnswerOriginal: plainAnswer,
            });
            initialMap[String(qId)] = plainAnswer;
          }
        });
      }
    }

    loadSavedAnswers(initialMap);
    return list;
  }, [selectedSection, selectedLevel, selectedTopics, questionsData, customQuestionsRaw]);

  const handleStartElaboration = () => {
    if (!user) {
      alert("詳細解説・会話練習を行うには、サインインが必要です！");
      window.dispatchEvent(new CustomEvent("open-auth-modal", { detail: { mode: 'signin' } }));
      return;
    }

    const targetQList: QuestionData[] = currentQuestions.map((q) => ({
      id: q.id,
      question: q.question,                  // Ruby-formatted for UI display
      questionOriginal: q.questionOriginal, // Clean text for TTS engine
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
      alert("カスタム質問を追加するにはサインインが必要です。");
      return;
    }
    if (!newQuestionText.trim() || !newAnswerText.trim()) {
      alert("Please enter both the question and sample answer.");
      return;
    }
    const success = await addCustomQuestion(newQuestionText, newAnswerText, newCategory);
    if (success) {
      setNewQuestionText("");
      setNewAnswerText("");
      setNewCategory("");
    }
  };

  if (isAuthLoading || isLoadingData) {
    return (
      <PageLayout user={user} credits={credits}>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 flex items-center justify-center">
          <div className="text-slate-600 dark:text-slate-300 font-bold text-lg animate-pulse">
            Loading EOY Oral Elaboration Practice...
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
          {/* Header Card */}
          <div className="bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/50 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300">
                  All VCE Oral Exam Stages
                </span>
                <span className="text-xs text-slate-500">VCE Japanese Oral Elaboration</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100">
                EOY Oral Elaboration Practice
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Practice in-depth elaboration across all stages of the VCE Oral Exam (Before Sec 1, Sec 1, Sec 2, and After Sec 2). Filter by multiple topics, auto-save your responses to Supabase, and build logical speaking fluency with AI Yamato.
              </p>
            </div>
            <OralExaminerAvatar statusText="Ready for Elaboration" themeColor={themeColor} />
          </div>

          {/* Section & Filter Controls */}
          <div className="bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/50 rounded-3xl p-6 shadow-sm space-y-6">
            {/* 1. Exam Stage / Section Selection */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">📂 Select Exam Stage / Source</h3>
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

            {/* 2. Learning Pace Selection */}
            {selectedSection !== "custom" && (
              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">🌱 Select Learning Pace</h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "steady", label: "Steady (Foundation)" },
                    { id: "normal", label: "Normal (Standard)" },
                    { id: "accelerated", label: "Accelerated (Advanced)" },
                  ].map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setSelectedLevel(lvl.id as any)}
                      className={`p-3 rounded-2xl border text-xs font-bold transition cursor-pointer ${
                        selectedLevel === lvl.id
                          ? "bg-purple-600 text-white border-purple-700 shadow-sm"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-purple-50"
                      }`}
                    >
                      {lvl.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Multi-Topic Selection Filter */}
            {availableTopics.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      🏷 Select Topics (Multiple Selection Allowed)
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300">
                      {selectedTopics.length} / {availableTopics.length} selected
                    </span>
                  </div>
                  <div className="space-x-2">
                    <button
                      type="button"
                      onClick={handleSelectAllTopics}
                      className="text-xs text-purple-600 font-bold hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAllTopics}
                      className="text-xs text-slate-400 font-bold hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Topic Pill Buttons */}
                <div className="flex flex-wrap gap-2">
                  {availableTopics.map((topic) => {
                    const isSelected = selectedTopics.includes(topic);
                    return (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => toggleTopic(topic)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-purple-600 text-white border-purple-700 shadow-xs"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        <span>{isSelected ? "☑" : "□"}</span>
                        <span>{topic}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Add Custom Question Form */}
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

          {/* 1. Review & Customize Elaboration Answers List */}
          <OralUserAnswerList
            questions={currentQuestions}
            answers={answers}
            onAnswerChange={handleAnswerChange}
            onAnswerBlur={handleAnswerBlur}
            onDeleteCustom={deleteCustomQuestion}
            onStartPractice={handleStartElaboration}
            orderMode={orderMode}
            setOrderMode={setOrderMode}
            themeColor={themeColor}
            title="Review & Customize Your Elaboration Answers"
          />

          {/* 2. Central Interactive Practice Screen (未ログイン時はガード画面を表示) */}
          <div ref={chatContainerRef}>
            {!user ? (
              <div className="bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/50 rounded-3xl p-8 shadow-sm text-center space-y-4">
                <div className="w-14 h-14 bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 rounded-2xl mx-auto flex items-center justify-center text-2xl font-black">
                  🔒
                </div>
                <div className="space-y-1">
                  <h3 className="font-black text-base text-slate-800 dark:text-slate-100">
                    Sign In Required for Elaboration Practice
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                    Please sign in to start in-depth EOY Oral Elaboration practice sessions with AI Yamato and save your custom elaboration notes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent("open-auth-modal", { detail: { mode: 'signin' } }))}
                  className="py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition shadow-sm cursor-pointer inline-block"
                >
                  Sign In / Sign Up Now
                </button>
              </div>
            ) : (
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
                onSendMessage={(e) => engine.sendAnswerMessage(e, answers, "drill-elaborate", selectedSection)}
                themeColor={themeColor}
                titleLabel="Detailed Elaboration Practice with AI Yamato"
              />
            )}
          </div>

          {/* Floating Chat */}
          <aside aria-label="Floating Controls" className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
            <ChatYamatoEoyOralElaborate userId={user?.id} userNickname={nickname} credits={credits} />
          </aside>
        </main>
      </div>
    </PageLayout>
  );
}