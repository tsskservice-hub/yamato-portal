/**
 * @file eoy-oral-drill.tsx
 * @description VCE Japanese - Section 1 General Conversation Oral Drill Practice (PageLayoutデータエラーガード完全対応版)
 * 💡 特徴:
 * 1. Supabase の app_knowledge (key: ORAL_EXAM_QUESTIONS) から動的データ読み込み・同期
 * 2. 取得失敗時は PageLayout 経由で DataErrorState（サポート宛て自動報告付き）を表示
 * 3. OralDrillQuestionSelector & OralQuestionPracticeCard によるカプセル化
 * 4. OralExaminerAvatar によるアバター演出（ゴールドテーマ #eab308）
 * 5. ChatYamatoEoyOralDrill (ラッパー方式) による常駐AIアシスタント連携
 */
import React, { useState, useEffect, useCallback } from "react";
import type { MetaFunction } from "@remix-run/react";
import PageLayout from "../components/PageLayout";
import { supabase } from "../lib/supabaseClient";

// 💡 共通化・分割した Oral 系コンポーネント群をインポート
import OralExaminerAvatar from "../components/OralExaminerAvatar";
import OralDrillQuestionSelector from "../components/OralDrillQuestionSelector";
import OralQuestionPracticeCard from "../components/OralQuestionPracticeCard";
import ChatYamatoEoyOralDrill from "../components/ChatYamatoEoyOralDrill";

// 💡 Supabase ナレッジデータ連携
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

  // 1. ユーザーセッション＆プロフィールステート
  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState<number>(10);
  const [nickname, setNickname] = useState<string>("VCE Student");

  // 2. 口頭設問データ＆ローディング/エラー判定ステート
  const [questionsData, setQuestionsData] = useState<OralExamQuestionsData>(ORAL_EXAM_QUESTIONS_DATA);
  const [loading, setLoading] = useState<boolean>(true);
  const [dataError, setDataError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // 3. 設問フィルターステート
  const [selectedSection, setSelectedSection] = useState<"beforeSec1" | "sec1" | "sec2" | "afterSec2">("sec1");
  const [selectedLevel, setSelectedLevel] = useState<"steady" | "normal" | "accelerated">("normal");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedQuestion, setSelectedQuestion] = useState<OralExamQuestionItem | null>(null);

  // Supabase から ORAL_EXAM_QUESTIONS データを非同期取得
  const loadQuestions = useCallback(async () => {
    setLoading(true);
    setDataError(false);
    setErrorMessage("");

    try {
      const fetched = await fetchOralExamQuestionsData(supabase);
      if (fetched && typeof fetched === "object" && Object.keys(fetched).length > 0) {
        console.log("✅ [eoy-oral-drill] Supabase 口頭問題データの読込成功:", fetched);
        setQuestionsData(fetched);
      } else {
        console.error("❌ [eoy-oral-drill] 口頭問題データが空または取得失敗でした。");
        setDataError(true);
        setErrorMessage("Supabase から ORAL_EXAM_QUESTIONS データの取得に失敗しました。");
      }
    } catch (err: any) {
      console.error("Failed to load questions from Supabase:", err);
      setDataError(true);
      setErrorMessage("Supabase 口頭問題データの読み込み中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }, []);

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

    loadQuestions();

    return () => subscription.unsubscribe();
  }, [loadQuestions]);

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

  // 選択された Section と Pace に応じて Supabase データを抽出
  const rawQuestions = questionsData[selectedSection]?.[selectedLevel] || [];
  const categories = Array.from(new Set(rawQuestions.map((q) => q.category).filter(Boolean)));
  const filteredQuestions = rawQuestions.filter(
    (q) => selectedCategory === "all" || q.category === selectedCategory
  );

  // 常駐AIチャットへの選択中プロンプト連携
  const currentSystemPrompt = selectedQuestion
    ? `[Selected Section 1 General Conversation Question]\nCategory: ${selectedQuestion.category}\nQuestion: ${selectedQuestion.text}\nSample Answer: ${selectedQuestion.defaultAnswer || selectedQuestion.default_answer_original}`
    : "";

  return (
    <PageLayout
      user={user}
      credits={credits}
      nickname={nickname}
      error={dataError}
      errorMessage={errorMessage || "Supabase から ORAL_EXAM_QUESTIONS のデータ取得に失敗しました。"}
      onRetry={loadQuestions}
    >
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 relative">
        <main className="max-w-4xl mx-auto space-y-8">
          
          {/* ヘッダーカード ＆ AI 面接官アバター */}
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

          {/* Section 切替タブ */}
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
                  setSelectedCategory("all");
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
            questionsCount={filteredQuestions.length}
          />

          {/* 設問グリッド選択 ＆ 録音・AI即時フィードバックカード */}
          <OralQuestionPracticeCard
            questions={filteredQuestions}
            selectedQuestion={selectedQuestion}
            onSelectQuestion={setSelectedQuestion}
            selectedLevel={selectedLevel}
            themeColor={themeColor}
            modeLabel={`${selectedSection.toUpperCase()} Drill`}
          />

          {/* 右下固定配置の AI 常駐チャット（ラッパー方式） */}
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
