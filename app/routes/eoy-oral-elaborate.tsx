/**
 * @file eoy-oral-elaborate.tsx
 * @description VCE Japanese - Section 2 Detailed Study Elaboration Practice (DataErrorState フォールバック対応版)
 */
import React, { useState, useEffect } from "react";
import type { MetaFunction } from "@remix-run/react";
import PageLayout from "../components/PageLayout";
import { DataErrorState } from "../components/DataErrorState";
import { supabase } from "../lib/supabaseClient";

import OralExaminerAvatar from "../components/OralExaminerAvatar";
import OralDrillQuestionSelector from "../components/OralDrillQuestionSelector";
import OralQuestionPracticeCard from "../components/OralQuestionPracticeCard";
import ChatYamatoEoyOralElaborate from "../components/ChatYamatoEoyOralElaborate";

import {
  fetchOralExamQuestionsData,
  OralExamQuestionsData,
  OralExamQuestionItem,
} from "../data/oral-exam-questions";

export const meta: MetaFunction = () => {
  return [
    { title: "VCE Japanese - EOY Oral Elaborate Practice | JPTutor AI Yamato" },
    { name: "description", content: "Section 2 Detailed Study deep-dive practice with instant AI feedback and oral elaboration drills." },
  ];
};

export default function EoyOralElaboratePage() {
  const themeColor = "#a855f7";

  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState<number>(10);
  const [nickname, setNickname] = useState<string>("VCE Student");

  const [questionsData, setQuestionsData] = useState<OralExamQuestionsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [selectedLevel, setSelectedLevel] = useState<"steady" | "normal" | "accelerated">("normal");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
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

    // 💡 Supabase から ORAL_EXAM_QUESTIONS データを非同期取得
    async function loadQuestions() {
      setIsLoading(true);
      try {
        const fetched = await fetchOralExamQuestionsData(supabase);
        if (fetched && typeof fetched === "object" && Object.keys(fetched).length > 0) {
          console.log("✅ [eoy-oral-elaborate] Supabase 口頭問題データの読込成功:", fetched);
          setQuestionsData(fetched);
        } else {
          console.warn("⚠️ [eoy-oral-elaborate] Supabase データ取得失敗または空です");
          setQuestionsData(null);
        }
      } catch (err) {
        console.error("Failed to load oral questions from Supabase:", err);
        setQuestionsData(null);
      } finally {
        setIsLoading(false);
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

  // 💡 データ読み込み中状態の描画
  if (isLoading) {
    return (
      <PageLayout user={user} credits={credits}>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 flex items-center justify-center">
          <div className="text-slate-600 dark:text-slate-300 font-bold text-lg animate-pulse">
            Loading Detailed Study Questions from Supabase...
          </div>
        </div>
      </PageLayout>
    );
  }

  // 💡 Supabase からデータが取得できなかった場合は DataErrorState を表示
  if (!questionsData || Object.keys(questionsData).length === 0) {
    return (
      <PageLayout user={user} credits={credits}>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 max-w-4xl mx-auto">
          <DataErrorState
            title="Section 2 Detailed Study Questions Unavailable"
            message="Unable to load Detailed Study Questions from the database. Please reload or report this error."
            errorMessage="Failed to fetch key 'ORAL_EXAM_QUESTIONS' from app_knowledge table in Supabase."
          />
        </div>
      </PageLayout>
    );
  }

  const rawQuestions = questionsData.sec2?.[selectedLevel] || [];
  const categories = Array.from(new Set(rawQuestions.map((q) => q.category).filter(Boolean)));
  const filteredQuestions = rawQuestions.filter(
    (q) => selectedCategory === "all" || q.category === selectedCategory
  );

  const currentSystemPrompt = selectedQuestion
    ? `[Selected Section 2 Detailed Study Question]\nCategory: ${selectedQuestion.category}\nQuestion: ${selectedQuestion.text}\nSample Answer: ${selectedQuestion.defaultAnswer || selectedQuestion.default_answer_original}`
    : "";

  return (
    <PageLayout user={user} credits={credits}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 relative">
        <main className="max-w-4xl mx-auto space-y-8">
          
          <div className="bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/50 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300">
                  Section 2 Detailed Study
                </span>
                <span className="text-xs text-slate-500">VCE Oral Exam Practice</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100">
                EOY Oral Elaboration Practice
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                1問一答の深掘り練習（Elaboration）を通して、理由や具体例を複数文で論理的に語るスピーキング力を鍛えます。
              </p>
            </div>

            <OralExaminerAvatar
              statusText="Ready for Elaboration"
              themeColor={themeColor}
            />
          </div>

          <OralDrillQuestionSelector
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
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
            themeColor={themeColor}
            modeLabel="Detailed Study"
          />

          <aside aria-label="Floating Controls" className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
            <ChatYamatoEoyOralElaborate
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