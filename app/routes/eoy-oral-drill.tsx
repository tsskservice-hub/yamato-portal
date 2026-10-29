import React, { useState, useEffect } from "react";
import type { MetaFunction } from "@remix-run/react";
import PageLayout from "../components/PageLayout";
import { supabase } from "../lib/supabaseClient";

import OralExaminerAvatar from "../components/OralExaminerAvatar";
import OralDrillQuestionSelector from "../components/OralDrillQuestionSelector";
import OralQuestionPracticeCard from "../components/OralQuestionPracticeCard";
import ChatYamatoEoyOralDrill from "../components/ChatYamatoEoyOralDrill";

import {
  fetchOralExamQuestionsData,
  ORAL_EXAM_QUESTIONS_DATA,
  OralExamQuestionsData,
  OralExamQuestionItem,
} from "../data/oral-exam-questions";

export const meta: MetaFunction = () => {
  return [
    { title: "VCE Japanese - EOY Oral Drill Practice | JPTutor AI Yamato" },
    { name: "description", content: "Section 1 General Conversation practice with instant AI feedback and fluency drills." },
  ];
};

export default function EoyOralDrillPage() {
  const themeColor = "#eab308"; // ゴールド/アンバー（Section 1 Oral Drill テーマカラー）

  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState<number>(10);
  const [nickname, setNickname] = useState<string>("VCE Student");

  const [questionsData, setQuestionsData] = useState<OralExamQuestionsData>(ORAL_EXAM_QUESTIONS_DATA);
  const [selectedSection, setSelectedSection] = useState<"beforeSec1" | "sec1" | "sec2" | "afterSec2">("sec1");
  const [selectedLevel, setSelectedLevel] = useState<"steady" | "normal" | "accelerated">("normal");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]); // 💡 マルチセレクト対応（空＝全選択）
  const [selectedQuestion, setSelectedQuestion] = useState<OralExamQuestionItem | null>(null);

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
      const fetched = await fetchOralExamQuestionsData(supabase);
      if (fetched && typeof fetched === "object" && Object.keys(fetched).length > 0) {
        setQuestionsData(fetched);
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
      console.error("Failed to fetch profile:", err);
    }
  };

  const rawQuestions = questionsData[selectedSection]?.[selectedLevel] || [];
  const categories = Array.from(new Set(rawQuestions.map((q) => q.category).filter(Boolean))) as string[];
  
  // 💡 マルチセレクトによる絞り込みロジック
  const filteredQuestions = rawQuestions.filter(
    (q) => selectedTopics.length === 0 || (q.category && selectedTopics.includes(q.category))
  );

  const toggleTopic = (topic: string) => {
    if (selectedTopics.includes(topic)) {
      setSelectedTopics(selectedTopics.filter((t) => t !== topic));
    } else {
      setSelectedTopics([...selectedTopics, topic]);
    }
  };

  const handleSelectAllTopics = () => setSelectedTopics(categories);
  const handleClearAllTopics = () => setSelectedTopics([]);

  const currentSystemPrompt = selectedQuestion
    ? `[Selected Section 1 General Conversation Question]\nCategory: ${selectedQuestion.category}\nQuestion: ${selectedQuestion.text}\nSample Answer: ${selectedQuestion.defaultAnswer || selectedQuestion.default_answer_original}`
    : "";

  return (
    <PageLayout user={user} credits={credits}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 relative">
        <main className="max-w-4xl mx-auto space-y-8">
          
          <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300">
                  Section 1 General Conversation
                </span>
                <span className="text-xs text-slate-500">VCE Oral Exam Practice</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100">
                EOY Oral Drill Practice
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                1問一答の基本ドリルを通して、即答力と流暢さ（Fluency）を高めるスピーキング練習を行います。
              </p>
            </div>

            <OralExaminerAvatar
              statusText="Ready for Oral Drill"
              themeColor={themeColor}
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {[
              { id: "beforeSec1", label: "Before Sec 1 (入室・確認)" },
              { id: "sec1", label: "Section 1 (一般会話)" },
              { id: "sec2", label: "Section 2 (詳細研究)" },
              { id: "afterSec2", label: "After Sec 2 (退室)" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setSelectedSection(tab.id as any);
                  setSelectedTopics([]);
                  setSelectedQuestion(null);
                }}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition cursor-pointer shrink-0 border ${
                  selectedSection === tab.id
                    ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-amber-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 💡 マルチセレクト対応の共通セレクター */}
          <OralDrillQuestionSelector
            categories={categories}
            selectedTopics={selectedTopics}
            onToggleTopic={toggleTopic}
            onSelectAllTopics={handleSelectAllTopics}
            onClearAllTopics={handleClearAllTopics}
            selectedLevel={selectedLevel}
            onSelectLevel={(lvl) => {
              setSelectedLevel(lvl);
              setSelectedQuestion(null);
            }}
            themeColor={themeColor}
            questionsCount={filteredQuestions.length}
          />

          <OralQuestionPracticeCard
            questions={filteredQuestions}
            selectedQuestion={selectedQuestion}
            onSelectQuestion={setSelectedQuestion}
            selectedLevel={selectedLevel}
            userId={user?.id}
            appType="eoy-oral-drill"
            isVoiceMode="drill"
            onCreditsUpdated={(newCredits) => setCredits(newCredits)}
            themeColor={themeColor}
            modeLabel={`${selectedSection.toUpperCase()} Drill`}
          />

          <aside aria-label="Floating Controls" className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
            <ChatYamatoEoyOralDrill
              systemPrompt={currentSystemPrompt}
              userId={user?.id}
              userNickname={nickname}
              credits={credits}
            />
          </aside>
        </main>
      </div>
    </PageLayout>
  );
}