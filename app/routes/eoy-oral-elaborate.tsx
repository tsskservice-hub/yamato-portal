/**
 * @file eoy-oral-elaborate.tsx
 * @description VCE Japanese - Section 2 Detailed Study Elaboration Practice (Modular Refactored Edition)
 */
import React, { useState, useEffect, useMemo, useRef } from "react";
import type { MetaFunction } from "@remix-run/react";
import PageLayout from "../components/PageLayout";
import { DataErrorState } from "../components/DataErrorState";
import OralExaminerAvatar from "../components/OralExaminerAvatar";
import ChatYamatoEoyOralElaborate from "../components/ChatYamatoEoyOralElaborate";
import { supabase } from "../lib/supabaseClient";

// 💡 分割・モジュール化した Oral コンポーネント ＆ フック
import OralCenterChatPractice from "../components/OralCenterChatPractice";
import OralUserAnswerList, { QuestionItem } from "../components/OralUserAnswerList";
import { useOralPracticeEngine } from "../hooks/OralPracticeHooks";
import { useSupabaseUserAnswers } from "../hooks/OralUserAnswersHooks";

import {
  fetchOralExamQuestionsData,
  OralExamQuestionsData,
} from "../data/oral-exam-questions";

export const meta: MetaFunction = () => {
  return [
    { title: "VCE Japanese - EOY Oral Elaborate Practice | JPTutor AI Yamato" },
    { name: "description", content: "Section 2 Detailed Study elaboration practice with custom answers auto-saved to Supabase and central AI Yamato deep-dive dialogue." },
  ];
};

export default function EoyOralElaboratePage() {
  const themeColor = "#a855f7"; // パープル

  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState<number>(10);
  const [nickname, setNickname] = useState<string>("VCE Student");

  const [questionsData, setQuestionsData] = useState<OralExamQuestionsData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  const [selectedLevel, setSelectedLevel] = useState<"steady" | "normal" | "accelerated">("normal");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [speechSpeed, setSpeechSpeed] = useState<number>(1.0);

  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  const {
    answers,
    loadSavedAnswers,
    handleAnswerChange,
    handleAnswerBlur,
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

  const rawQuestions = useMemo(() => {
    if (!questionsData?.sec2) return [];
    return questionsData.sec2[selectedLevel] || questionsData.sec2["normal"] || questionsData.sec2["steady"] || [];
  }, [questionsData, selectedLevel]);

  const categories = useMemo(() => {
    return Array.from(new Set(rawQuestions.map((q) => q.category).filter(Boolean)));
  }, [rawQuestions]);

  const currentQuestions: QuestionItem[] = useMemo(() => {
    const list: QuestionItem[] = [];
    const initialMap: { [key: string]: string } = {};

    rawQuestions.forEach((q, idx) => {
      if (selectedCategory !== "all" && q.category && q.category !== selectedCategory) return;
      const qText = q.text || q.text_original || "";
      const qId = q.audio ? q.audio.replace("/audio/", "").replace(".mp3", "") : `sec2-q-${idx + 1}`;
      const plainAnswer = q.default_answer_original || q.defaultAnswer || "";

      list.push({
        id: String(qId),
        category: q.category || "Detailed Study",
        question: qText,
        isCustom: false,
      });
      initialMap[String(qId)] = plainAnswer;
    });

    loadSavedAnswers(initialMap);
    return list;
  }, [rawQuestions, selectedCategory]);

  const handleStartElaboration = () => {
    const targetQList = currentQuestions.map((q) => {
      const found = rawQuestions.find((item) => (item.text || item.text_original) === q.question);
      const qOrig = found ? found.text_original || found.text || q.question : q.question;
      return { id: q.id, question: q.question, questionOriginal: qOrig, category: q.category };
    });

    engine.startPractice(targetQList, answers, "sequential");
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  if (isLoadingData) {
    return (
      <PageLayout user={user} credits={credits}>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 flex items-center justify-center">
          <div className="text-slate-600 dark:text-slate-300 font-bold text-lg animate-pulse">
            Loading Section 2 Detailed Study Database...
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
            title="Detailed Study Database Unavailable"
            message="Unable to load Section 2 Detailed Study Questions from Supabase. Please reload or report this error."
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
          {/* Header */}
          <div className="bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/50 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300">
                  Section 2 Detailed Study
                </span>
                <span className="text-xs text-slate-500">VCE Oral Elaboration Drill</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100">
                EOY Oral Elaboration Practice
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                作成した深掘り（Elaboration）解答は Supabase に自動保存されます。画面中央のヤマトと対話して、複数文で根拠を語る論理的スピーキング力を養いましょう！
              </p>
            </div>
            <OralExaminerAvatar statusText="Ready for Detailed Study" themeColor={themeColor} />
          </div>

          {/* Level & Subtopic Filters */}
          <div className="bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/50 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="space-y-3">
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

            {categories.length > 0 && (
              <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">🏷 Subtopic Filter</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("all")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      selectedCategory === "all"
                        ? "bg-purple-600 text-white border-purple-700"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    All Subtopics
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                        selectedCategory === cat
                          ? "bg-purple-600 text-white border-purple-700"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 1. Review & Customize Answers List */}
          <OralUserAnswerList
            questions={currentQuestions}
            answers={answers}
            onAnswerChange={handleAnswerChange}
            onAnswerBlur={handleAnswerBlur}
            onStartPractice={handleStartElaboration}
            themeColor={themeColor}
            title="Review & Customize Your Elaboration Answers"
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
                if (currentQ) engine.playTTS(currentQ.questionOriginal);
              }}
              onProceedNext={() => engine.proceedToNextQuestion(answers)}
              onSendMessage={(e) => engine.sendAnswerMessage(e, answers, "drill-elaborate", "sec2")}
              themeColor={themeColor}
              titleLabel="Detailed Study Elaboration Practice with AI Yamato"
            />
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