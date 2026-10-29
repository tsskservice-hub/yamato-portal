/**
 * @file eoy-oral-mock.tsx
 * @description VCE Japanese - AI Mock Oral Exam (PageLayout 統合型データエラーガード対応版)
 */

import React, { useState, useEffect, useCallback } from "react";
import type { MetaFunction } from "@remix-run/react";
import PageLayout from "../components/PageLayout";
import { supabase } from "../lib/supabaseClient";

import { OralMockConfig, MockExamConfig } from "../components/OralMockConfig";
import { OralMockSession, ExamResultData } from "../components/OralMockSession";
import { OralMockReport } from "../components/OralMockReport";
import ChatYamatoEoyOralMock from "../components/ChatYamatoEoyOralMock";

import { fetchOralExamQuestionsData, OralExamQuestionsData } from "../data/oral-exam-questions";

const SessionComponent = OralMockSession as any;

export const meta: MetaFunction = () => {
  return [
    { title: "VCE Japanese - AI Mock Oral Mode | JPTutor AI Yamato" },
    {
      name: "description",
      content: "VCE Japanese Mock Oral mode featuring elapsed time, topic deep-dive rotation, examiner persona, and fluency tracking.",
    },
  ];
};

export default function MockOralMode() {
  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState<number>(10);
  const [nickname, setNickname] = useState<string>("VCE Student");

  const [questionsData, setQuestionsData] = useState<OralExamQuestionsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  const [examPhase, setExamPhase] = useState<"config" | "examining" | "result">("config");
  const [currentConfig, setCurrentConfig] = useState<MockExamConfig | null>(null);
  const [examResult, setExamResult] = useState<ExamResultData | null>(null);

  const loadQuestions = useCallback(async () => {
    setIsLoading(true);
    setError(false);
    try {
      const fetched = await fetchOralExamQuestionsData(supabase);
      if (fetched && typeof fetched === "object" && Object.keys(fetched).length > 0) {
        setQuestionsData(fetched);
      } else {
        setQuestionsData(null);
        setError(true);
      }
    } catch (err) {
      console.error("Failed to load oral questions from Supabase:", err);
      setQuestionsData(null);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  return (
    <PageLayout
      user={user}
      credits={credits}
      isLoading={isLoading}
      error={error || (!isLoading && (!questionsData || Object.keys(questionsData).length === 0))}
      errorMessage="Failed to fetch key 'ORAL_EXAM_QUESTIONS' from app_knowledge table in Supabase."
      onRetry={loadQuestions}
    >
      {questionsData && (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 relative">
          {examPhase === "config" && (
            <OralMockConfig
              onStartExam={handleStartExam}
              defaultStudentName={nickname}
              themeColor="#ef4444"
            />
          )}

          {examPhase === "examining" && currentConfig && (
            <SessionComponent
              config={currentConfig}
              questionsData={questionsData}
              onExamComplete={handleExamComplete}
              onCancel={() => setExamPhase("config")}
              themeColor="#ef4444"
            />
          )}

          {examPhase === "result" && examResult && (
            <OralMockReport
              result={examResult}
              onRetry={() => setExamPhase("config")}
              onBackToHome={() => (window.location.href = "/")}
              themeColor="#ef4444"
            />
          )}

          <aside aria-label="Floating Controls" className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
            <ChatYamatoEoyOralMock
              userId={user?.id}
              userNickname={nickname}
              credits={credits}
            />
          </aside>
        </div>
      )}
    </PageLayout>
  );
}
