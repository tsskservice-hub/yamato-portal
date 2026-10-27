/**
 * @file eoy-oral-drill.tsx
 * @description VCE Japanese - Section 1 General Conversation Oral Drill & Custom QA Bank (トピック複数選択フィルター機能追加版)
 * 💡 特徴：
 * 1. Section 1 や各セクションのトピック（カテゴリ）を複数選択できるフィルター機能を搭載
 * 2. 選択したトピックのみを対象にマイ解答の作成・確認および画面中央の AI ヤマト対話練習が可能
 * 3. プレーンテキスト（text_original / default_answer_original）とルビ付き表示テキストを分離し、TTS音声の超高精度再生を実現
 */
import React, { useState, useEffect, useMemo, useRef } from "react";
import type { MetaFunction } from "@remix-run/react";
import PageLayout from "../components/PageLayout";
import { DataErrorState } from "../components/DataErrorState";
import OralExaminerAvatar from "../components/OralExaminerAvatar";
import ChatYamatoEoyOralDrill from "../components/ChatYamatoEoyOralDrill";
import { supabase } from "../lib/supabaseClient";

// 💡 分割・モジュール化した Oral コンポーネント ＆ フック
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
    { name: "description", content: "Interactive Section 1 oral practice with multi-topic filtering, custom Q&A bank, auto-saved answers to Supabase, and central AI Yamato dialogue." },
  ];
};

export default function EoyOralDrillPage() {
  const themeColor = "#eab308"; // ゴールド/アンバー

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

  // 💡 選択中セクション・難易度で利用可能な全トピック（カテゴリ）を取得
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

  // 初期状態・セクション切替時に全トピックをデフォルト選択
  useEffect(() => {
    setSelectedTopics(availableTopics);
  }, [selectedLevel, selectedSection, availableTopics.length]);

  // 💡 トピックの複数選択/選択解除トグル処理
  const toggleTopic = (topic: string) => {
    if (selectedTopics.includes(topic)) {
      setSelectedTopics(selectedTopics.filter((t) => t !== topic));
    } else {
      setSelectedTopics([...selectedTopics, topic]);
    }
  };

  const handleSelectAllTopics = () => setSelectedTopics(availableTopics);
  const handleClearAllTopics = () => setSelectedTopics([]);

  // 💡 複数選択されたトピックに基づく問題リストの抽出
  const currentQuestions: (QuestionItem & { questionOriginal: string; defaultAnswerOriginal?: string })[] = useMemo(() => {
    const list: (QuestionItem & { questionOriginal: string; defaultAnswerOriginal?: string })[] = [];
    const initialMap: { [key: string]: string } = {};

    if (selectedSection === "custom") {
      customQuestionsRaw.forEach((q) => {
        const categoryName = q.category || "General";
        // 複数トピックフィルター判定
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
            // 複数トピックフィルター判定
            if (selectedTopics.length > 0 && !selectedTopics.includes(categoryName)) return;

            const qId = q.audio ? q.audio.replace("/audio/", "").replace(".mp3", "") : `q-${counter++}`;
            const plainAnswer = q.default_answer_original || q.defaultAnswer || "";
            const displayQuestion = q.text || q.text_original || "";
            const plainQuestion = q.text_original || q.text || "";

            list.push({
              id: String(qId),
              question: displayQuestion,          // 画面表示用 (ルビ付き)
              questionOriginal: plainQuestion,  // TTS音声用 (フリガナなし)
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
      question: q.question,                 // ルビ付き画面表示用
      questionOriginal: q.questionOriginal, // TTS発話用フリガナなし text_original
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
      alert("設問と解答の両方を入力してください。");
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
          {/* Header */}
          <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300">
                  Section 1 General Conversation
                </span>
                <span className="text-xs text-slate-500">VCE Oral Exam Practice</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100">
                EOY Oral Drill & Custom QA Bank
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                学習したいトピックを自由に複数選択して練習できます。作成したマイ解答は Supabase に自動保存されます。
              </p>
            </div>
            <OralExaminerAvatar statusText="Ready for Conversation" themeColor={themeColor} />
          </div>

          {/* Section & Filter Controls */}
          <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-3xl p-6 shadow-sm space-y-6">
            {/* 1. Section Selection */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">📂 Select Section / Source</h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { id: "beforeSec1", label: "Before Sec 1" },
                  { id: "sec1", label: "Section 1" },
                  { id: "sec2", label: "Section 2" },
                  { id: "afterSec2", label: "After Sec 2" },
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

            {/* 3. 🌟 トピック複数選択フィルター (Multi-Topic Filter) 🌟 */}
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

                {/* トピック選択ボタン（ピル型デザイン） */}
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