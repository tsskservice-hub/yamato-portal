/**
 * @file eoy-oral-mock.tsx
 * @description VCE Japanese - AI Mock Oral Exam (コンポーネント分割・リファクタリング版)
 * 💡 特徴:
 * 1. OralMockConfig, OralMockSession, OralMockReport によるフェーズ管理
 * 2. ChatYamatoEoyOralMock (ラッパー方式) による常駐AIアシスタント連携
 * 3. 1,000行超のモノリスコードを約100行へ劇的スリム化
 */
import React, { useState, useEffect } from "react";
import type { MetaFunction } from "@remix-run/react";
import PageLayout from "../components/PageLayout";
import { supabase } from "../lib/supabaseClient";

// 💡 分割・再利用化した Oral 系コンポーネント群をインポート
import { OralMockConfig, MockExamConfig } from "../components/OralMockConfig";
import { OralMockSession, ExamResultData } from "../components/OralMockSession";
import { OralMockReport } from "../components/OralMockReport";
import ChatYamatoEoyOralMock from "../components/ChatYamatoEoyOralMock";

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

  // 💡 模擬試験のフェーズ管理 ("config" | "examining" | "result")
  const [examPhase, setExamPhase] = useState<"config" | "examining" | "result">("config");
  const [currentConfig, setCurrentConfig] = useState<MockExamConfig | null>(null);
  const [examResult, setExamResult] = useState<ExamResultData | null>(null);

  // Supabase セッション＆プロフィール（クレジット・ニックネーム）同期
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

  // 1. 試験開始（設定画面 → 本番セッションへ移動）
  const handleStartExam = (config: MockExamConfig) => {
    setCurrentConfig(config);
    setExamPhase("examining");
  };

  // 2. 試験終了（本番セッション → 結果レポートへ移動）
  const handleExamComplete = (result: ExamResultData) => {
    setExamResult(result);
    setExamPhase("result");
  };

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

        {/* 2. 模擬試験本番画面（タイマー・音声対話・アバター演出） */}
        {examPhase === "examining" && currentConfig && (
          <OralMockSession
            config={currentConfig}
            onExamComplete={handleExamComplete}
            onCancel={() => setExamPhase("config")}
            themeColor="#ef4444"
          />
        )}

        {/* 3. 総合結果レポート画面（10段階評価・4象限マトリクス） */}
        {examPhase === "result" && examResult && (
          <OralMockReport
            result={examResult}
            onRetry={() => setExamPhase("config")}
            onBackToHome={() => (window.location.href = "/")}
            themeColor="#ef4444"
          />
        )}

        {/* 4. 右下固定配置の AI ヤマト常駐チャット（ラッパー方式） */}
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