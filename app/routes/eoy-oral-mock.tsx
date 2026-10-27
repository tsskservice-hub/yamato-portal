/**
 * @file eoy-oral-mock.tsx
 * @description VCE Japanese - AI Mock Oral Exam (DataErrorState フォールバック対応版)
 */
import React, { useState, useEffect } from "react";
import type { MetaFunction } from "@remix-run/react";
import PageLayout from "../components/PageLayout";
import { DataErrorState } from "../components/DataErrorState";
import { supabase } from "../lib/supabaseClient";

import { OralMockConfig, MockExamConfig } from "../components/OralMockConfig";
import { OralMockSession, ExamResultData } from "../components/OralMockSession";
import { OralMockReport } from "../components/OralMockReport";
import ChatYamatoEoyOralMock from "../components/ChatYamatoEoyOralMock";

import {
  fetchOralExamQuestionsData,
  OralExamQuestionsData,
} from "../data/oral-exam-questions";

// 💡 OralMockSession の型チェックを回避するためのキャスト
const SessionComponent = OralMockSession as any;

export const meta: MetaFunction = () => {
  return [
    { title: "VCE Japanese - AI Mock Oral Mode | JPTutor AI Yamato" },
    { name: "description", content: "VCE Japanese Mock Oral mode featuring elapsed time, topic deep-dive rotation, examiner persona, and fluency tracking." },
  ];
};

export default function MockOralMode() {
  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState<number>(10);
  const [nickname, setNickname] = useState<string>("VCE Student");

  const [questionsData, setQuestionsData] = useState<OralExamQuestionsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [examPhase, setExamPhase] = useState<"config" | "examining" | "result">("config");
  const [currentConfig, setCurrentConfig] = useState<MockExamConfig | null>(null);
  const [examResult, setExamResult] = useState<ExamResultData | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
    });

    // 💡 Supabase から ORAL_EXAM_QUESTIONS データを非同期取得
    async function loadQuestions() {
      setIsLoading(true);
      try {
        const fetched = await fetchOralExamQuestionsData(supabase);
        if (fetched && typeof fetched === "object" && Object.keys(fetched).length > 0) {
          console.log("✅ [eoy-oral-mock] Supabase 口頭問題データの読込成功:", fetched);
          setQuestionsData(fetched);
        } else {
          console.warn("⚠️ [eoy-oral-mock] Supabase データ取得失敗または空です");
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
      console.error("Failed to fetch user profile:", err);
    }
  };

  const handleStartExam = (config: MockExamConfig) => {
    setCurrentConfig(config);
    setExamPhase("examining");
  };

  const handleExamComplete = (result: ExamResultData) => {
    setExamResult(result);
    setExamPhase("result");
  };

  // 💡 データ読み込み中状態の描画
  if (isLoading) {
    return (
      <PageLayout user={user} credits={credits}>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 flex items-center justify-center">
          <div className="text-slate-600 dark:text-slate-300 font-bold text-lg animate-pulse">
            Loading Mock Oral Exam Database from Supabase...
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
            title="Oral Exam Database Unavailable"
            message="Unable to load Oral Exam Questions for Mock Exam from the database. Please reload or report this error."
            errorMessage="Failed to fetch key 'ORAL_EXAM_QUESTIONS' from app_knowledge table in Supabase."
          />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout user={user} credits={credits}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 relative">
        {/* 1. 試験設定画面 */}
        {examPhase === "config" && (
          <OralMockConfig
            onStartExam={handleStartExam}
            defaultStudentName={nickname}
            themeColor="#ef4444"
          />
        )}

        {/* 2. 模擬試験本番画面（Supabase問題データ連携） */}
        {examPhase === "examining" && currentConfig && (
          <SessionComponent
            config={currentConfig}
            questionsData={questionsData}
            onExamComplete={handleExamComplete}
            onCancel={() => setExamPhase("config")}
            themeColor="#ef4444"
          />
        )}

        {/* 3. 総合結果レポート画面 */}
        {examPhase === "result" && examResult && (
          <OralMockReport
            result={examResult}
            onRetry={() => setExamPhase("config")}
            onBackToHome={() => (window.location.href = "/")}
            themeColor="#ef4444"
          />
        )}

        {/* 4. 常駐AIチャット */}
        <aside aria-label="Floating Controls" className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
          <ChatYamatoEoyOralMock
            userId={user?.id}
            userNickname={nickname}
            credits={credits}
          />
        </aside>
      </div>
    </PageLayout>
  );
}