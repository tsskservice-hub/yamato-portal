/**
 * @file eoy-oral-elaborate.tsx
 * @description VCE Japanese - Section 2 Detailed Study Elaboration Practice (リファクタリング版)
 * 💡 特徴:
 * 1. OralDrillQuestionSelector & OralQuestionPracticeCard によるカプセル化
 * 2. OralExaminerAvatar によるアバター演出
 * 3. ChatYamatoEoyOralElaborate (ラッパー方式) による常駐AIアシスタント連携
 */
import React, { useState, useEffect } from "react";
import type { MetaFunction } from "@remix-run/react";
import PageLayout from "../components/PageLayout";
import { supabase } from "../lib/supabaseClient";

// 💡 共通化・分割した Oral 系コンポーネント群をインポート
import OralExaminerAvatar from "../components/OralExaminerAvatar";
import OralDrillQuestionSelector from "../components/OralDrillQuestionSelector";
import OralQuestionPracticeCard from "../components/OralQuestionPracticeCard";
import ChatYamatoEoyOralElaborate from "../components/ChatYamatoEoyOralElaborate";

// 💡 Supabase ナレッジデータ連携
import {
  fetchOralExamQuestionsData,
  ORAL_EXAM_QUESTIONS_DATA,
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
  const themeColor = "#a855f7"; // パープル（Section 2 Detailed Study テーマカラー）

  // 1. ユーザーセッション＆プロフィールステート
  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState<number>(10);
  const [nickname, setNickname] = useState<string>("VCE Student");

  // 2. 口頭設問データ＆フィルターステート
  const [questionsData, setQuestionsData] = useState<OralExamQuestionsData>(ORAL_EXAM_QUESTIONS_DATA);
  const [selectedLevel, setSelectedLevel] = useState<"steady" | "normal" | "accelerated">("normal");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedQuestion, setSelectedQuestion] = useState<OralExamQuestionItem | null>(null);

  // Supabase セッション＆設問データの同期
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
    });

    // Supabase から ORAL_EXAM_QUESTIONS を取得
    async function loadQuestions() {
      const fetched = await fetchOralExamQuestionsData(supabase);
      if (fetched) {
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

  // Section 2 (sec2) 設問の抽出とカテゴリー生成
  const rawQuestions = questionsData.sec2?.[selectedLevel] || [];
  const categories = Array.from(new Set(rawQuestions.map((q) => q.category).filter(Boolean)));
  const filteredQuestions = rawQuestions.filter(
    (q) => selectedCategory === "all" || q.category === selectedCategory
  );

  // 常駐AIチャットへの選択中プロンプト連携
  const currentSystemPrompt = selectedQuestion
    ? `[Selected Section 2 Detailed Study Question]\nCategory: ${selectedQuestion.category}\nQuestion: ${selectedQuestion.text}\nSample Answer: ${selectedQuestion.defaultAnswer || selectedQuestion.default_answer_original}`
    : "";

  return (
    <PageLayout user={user} credits={credits}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 relative">
        <main className="max-w-4xl mx-auto space-y-8">
          
          {/* ヘッダーカード ＆ AI 面接官アバター */}
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

          {/* Pace（難易度）＆ Category フィルター */}
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
          />

          {/* 設問グリッド選択 ＆ 録音・AI即時フィードバックカード */}
          <OralQuestionPracticeCard
            questions={filteredQuestions}
            selectedQuestion={selectedQuestion}
            onSelectQuestion={setSelectedQuestion}
            selectedLevel={selectedLevel}
            themeColor={themeColor}
            modeLabel="Detailed Study"
          />

          {/* 右下固定配置の AI 常駐チャット（ラッパー方式） */}
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