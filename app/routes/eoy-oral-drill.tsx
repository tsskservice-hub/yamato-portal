/**
 * @file eoy-oral-drill.tsx
 * @description VCE Japanese - EOY Oral Practice & Custom QA Bank (Self-Contained Remix Route Edition)
 */
import React, { useState, useEffect, useMemo, useRef } from "react";
import type { MetaFunction, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import PageLayout from "../components/PageLayout";
import { DataErrorState } from "../components/DataErrorState";
import OralExaminerAvatar from "../components/OralExaminerAvatar";
import ChatYamatoEoyOralDrill from "../components/ChatYamatoEoyOralDrill";
import { supabase } from "../lib/supabaseClient";

// 💡 Modular Oral components & hooks
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
    { title: "VCE Japanese - EOY Oral Drill & Custom QA Bank | JPTutor AI Yamato" },
    { name: "description", content: "Comprehensive VCE Japanese Oral Exam practice covering all stages from entrance greetings to Section 1 & Section 2 Detailed Study." },
  ];
};

// ==========================================
// 💡 サーバー側の自己完結型処理 (Remix Action)
// ==========================================
export async function action({ request }: ActionFunctionArgs) {
  try {
    const formData = await request.formData();
    const actionType = formData.get("actionType"); // "tts", "stt", または "chat"

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return json({ error: "OpenAI API Key is not configured on the server." }, { status: 500 });
    }

    // 1. TTS (音声合成) の処理
    if (actionType === "tts") {
      const text = formData.get("text") as string;
      if (!text) return json({ error: "Text is required for TTS" }, { status: 400 });

      const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "tts-1",
          input: text,
          voice: "fable", // ユーザー様こだわりの音声
        }),
      });

      if (!ttsRes.ok) {
        const errBody = await ttsRes.text();
        return json({ error: `TTS API Error: ${errBody}` }, { status: 500 });
      }

      const audioBuffer = await ttsRes.arrayBuffer();
      return new Response(audioBuffer, {
        headers: { "Content-Type": "audio/mpeg" },
      });
    }

    // 2. STT (文字起こし / Whisper) の処理
    if (actionType === "stt") {
      const audioFile = formData.get("audio") as File;
      if (!audioFile) return json({ error: "Audio file is required for STT" }, { status: 400 });

      const apiFormData = new FormData();
      apiFormData.append("file", audioFile, "recording.webm");
      apiFormData.append("model", "whisper-1");
      apiFormData.append("language", "ja");

      const sttRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
        body: apiFormData,
      });

      if (!sttRes.ok) {
        const errBody = await sttRes.text();
        return json({ error: `STT API Error: ${errBody}` }, { status: 500 });
      }

      const sttData = (await sttRes.json()) as { text?: string };
      return json({ success: true, userText: sttData.text || "" });
    }

    return json({ error: "Invalid actionType" }, { status: 400 });
  } catch (err: any) {
    return json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

// ==========================================
// 💡 クライアント側の画面コンポーネント
// ==========================================
export default function EoyOralDrillPage() {
  const themeColor = "#eab308"; // Amber / Gold theme

  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState<number>(10);
  const [nickname, setNickname] = useState<string>("VCE Student");

  const [questionsData, setQuestionsData] = useState<OralExamQuestionsData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  const [selectedSection, setSelectedSection] = useState<"beforeSec1" | "sec1" | "sec2" | "afterSec2" | "custom">("sec1");
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
      if (session?.user) fetchProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
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
    if (selectedSection === "custom") fetchCustomQuestions();
  }, [selectedSection, user?.id]);

  // Available topics for the selected section & pace
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

  // Default to selecting all available topics on section / level change
  useEffect(() => {
    setSelectedTopics(availableTopics);
  }, [selectedLevel, selectedSection, availableTopics.length]);

  // Topic multi-selection toggle
  const toggleTopic = (topic: string) => {
    if (selectedTopics.includes(topic)) {
      setSelectedTopics(selectedTopics.filter((t) => t !== topic));
    } else {
      setSelectedTopics([...selectedTopics, topic]);
    }
  };

  const handleSelectAllTopics = () => setSelectedTopics(availableTopics);
  const handleClearAllTopics = () => setSelectedTopics([]);

  // Questions filtered by selected topics
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
            const categoryName = q.category || "General";
            if (selectedTopics.length > 0 && !selectedTopics.includes(categoryName)) return;

            const qId = q.audio ? q.audio.replace("/audio/", "").replace(".mp3", "") : `q-${counter++}`;
            const plainAnswer = q.default_answer_original || q.defaultAnswer || "";
            const displayQuestion = q.text || q.text_original || "";
            const plainQuestion = q.text_original || q.text || "";

            list.push({
              id: String(qId),
              question: displayQuestion,          // Formatted HTML with furigana for UI
              questionOriginal: plainQuestion,  // Clean text for speech synthesis
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

  const handleStartPractice = () => {
    const targetQList: QuestionData[] = currentQuestions.map((q) => ({
      id: q.id,
      question: q.question,                     // UI Display
      questionOriginal: q.questionOriginal, // Clean text for TTS
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
    if (!newQuestionText.trim() || !newAnswerText.trim()) {
      alert("Please enter both the question and answer.");
      return;
    }
    const success = await addCustomQuestion(newQuestionText, newAnswerText, newCategory);
    if (success) {
      setNewQuestionText("");
      setNewAnswerText("");
      setNewCategory("");
    }
  };

  if (isLoadingData) {
    return (
      <PageLayout user={user} credits={credits}>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 flex items-center justify-center">
          <div className="text-slate-600 dark:text-slate-300 font-bold text-lg animate-pulse">
            Loading Oral Exam Database from Supabase...
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
          {/* Header Card & AI Examiner Avatar */}
          <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300">
                  All VCE Oral Exam Stages
                </span>
                <span className="text-xs text-slate-500">VCE Japanese Oral Exam Prep</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100">
                EOY Oral Exam Practice & Custom QA Bank
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Practice every stage of the VCE Japanese Oral Exam — from entrance greetings and Section 1 General Conversation to Section 2 Detailed Study and exit. Your custom answers are automatically saved so you can practice and edit them anytime, anywhere.
              </p>
            </div>
            <OralExaminerAvatar statusText="Ready for Practice" themeColor={themeColor} />
          </div>

          {/* Section & Filter Controls */}
          <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-3xl p-6 shadow-sm space-y-6">
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
                        ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-amber-50"
                    }`}
                  >
                    {sec.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Pace Selection */}
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
                          ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-amber-50"
                      }`}
                    >
                      {lvl.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Multi-Topic Filter */}
            {availableTopics.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      🏷 Select Topics (Multiple Selection Allowed)
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300">
                      {selectedTopics.length} / {availableTopics.length} selected
                    </span>
                  </div>
                  <div className="space-x-2">
                    <button
                      type="button"
                      onClick={handleSelectAllTopics}
                      className="text-xs text-amber-600 font-bold hover:underline cursor-pointer"
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
                            ? "bg-amber-500 text-white border-amber-600 shadow-xs"
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

          {/* 1. Review & Customize Answers List */}
          <OralUserAnswerList
            questions={currentQuestions}
            answers={answers}
            onAnswerChange={handleAnswerChange}
            onAnswerBlur={handleAnswerBlur}
            onDeleteCustom={deleteCustomQuestion}
            onStartPractice={handleStartPractice}
            orderMode={orderMode}
            setOrderMode={setOrderMode}
            themeColor={themeColor}
          />

          {/* 2. Central Interactive Practice Screen */}
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
              onSendMessage={(e) => engine.sendAnswerMessage(e, answers, "drill", selectedSection)}
              themeColor={themeColor}
            />
          </div>

          {/* Floating Chat */}
          <aside aria-label="Floating Controls" className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
            <ChatYamatoEoyOralDrill userId={user?.id} userNickname={nickname} credits={credits} />
          </aside>
        </main>
      </div>
    </PageLayout>
  );
}