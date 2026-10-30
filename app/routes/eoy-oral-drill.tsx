/**
 *  @file eoy-oral-drill.tsx
 *  @description VCE Japanese - EOY Oral Practice & Custom QA Bank (Clean Cloudflare-compatible Edition)
 */
import React, { useState, useEffect, useMemo, useRef } from "react";
import type { MetaFunction } from "@remix-run/react";
import PageLayout from "../components/PageLayout";
import { DataErrorState } from "../components/DataErrorState";
import OralExaminerAvatar from "../components/OralExaminerAvatar";
import ChatYamatoEoyOralDrill from "../components/ChatYamatoEoyOralDrill";
import { supabase } from "../lib/supabaseClient";

// 💡 Modular Oral components & hooks
import OralCenterChatPractice from "../components/OralCenterChatPractice";
import OralUserAnswerList, { QuestionItem } from "../components/OralUserAnswerList";
import OralCustomQuestionForm from "../components/OralCustomQuestionForm";
import OralDrillQuestionSelector from "../components/OralDrillQuestionSelector";
import { useOralPracticeEngine, QuestionData } from "../hooks/OralPracticeHooks";
import { useSupabaseUserAnswers } from "../hooks/OralUserAnswersHooks";
import {
  fetchOralExamQuestionsData,
  OralExamQuestionsData,
} from "../data/oral-exam-questions";

export const meta: MetaFunction = () => {
  return [
    { title: "VCE Japanese - EOY Oral Drill & Custom QA Bank | JPTutor AI Yamato" },
    {
      name: "description",
      content:
        "Comprehensive VCE Japanese Oral Exam practice covering all stages from entrance greetings to Section 1 & Section 2 Detailed Study.",
    },
  ];
};

export default function EoyOralDrillPage() {
  const themeColor = "#eab308"; // Amber / Gold theme

  const [user, setUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [credits, setCredits] = useState<number>(10);
  const [nickname, setNickname] = useState<string>("VCE Student");

  const [questionsData, setQuestionsData] = useState<OralExamQuestionsData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  // 💡 要件に対応したステート初期値の設定（Section 1, Normal ペース, スピード 1.0）
  const [selectedSection, setSelectedSection] = useState<
    "beforeSec1" | "sec1" | "sec2" | "afterSec2" | "custom"
  >("sec1");
  const [selectedLevel, setSelectedLevel] = useState<"steady" | "normal" | "accelerated">(
    "normal"
  );
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]); // 空配列 ＝ クリア状態（全選択など）
  const [speechSpeed, setSpeechSpeed] = useState<number>(1.0); // デフォルト 1.0
  const [orderMode, setOrderMode] = useState<"sequential" | "random">("sequential");

  const [newQuestionText, setNewQuestionText] = useState("");
  const [newAnswerText, setNewAnswerText] = useState("");
  const [newCategory, setNewCategory] = useState("");

  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  // 💡 確実に認証モーダルやログイン画面を開くための共通トリガー関数
  const handleOpenAuth = () => {
    window.dispatchEvent(new CustomEvent("open-auth-modal", { detail: { mode: "signin" } }));
    const authButton = document.querySelector("[data-auth-trigger]") as HTMLElement;
    if (authButton) {
      authButton.click();
    } else {
      window.location.href = "/#auth";
    }
  };

  // 💡 Drillモードとして明示的に "drill" を指定してフックを呼び出す
  const {
    answers,
    customQuestionsRaw,
    fetchCustomQuestions,
    loadSavedAnswers,
    handleAnswerChange,
    handleAnswerBlur,
    addCustomQuestion,
    deleteCustomQuestion,
  } = useSupabaseUserAnswers(supabase, user?.id, "drill");

  // 💡 【修正ポイント】 user?.id と nickname を第3・第4引数として渡す
  const engine = useOralPracticeEngine(selectedLevel, speechSpeed, user?.id, nickname);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsAuthLoading(false);
      if (session?.user) fetchProfile(session.user.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsAuthLoading(false);
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

  // 💡 AIの音声解析（isAnalyzing）が完了したタイミングで Supabase から最新の残高を自動同期する
  useEffect(() => {
    if (!engine.isAnalyzing && user?.id) {
      fetchProfile(user.id);
    }
  }, [engine.isAnalyzing, user?.id]);

  useEffect(() => {
    if (selectedSection === "custom" && user?.id) fetchCustomQuestions();
  }, [selectedSection, user?.id]);

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

  // マルチセレクト用のトピック切り替えハンドラー
  const toggleTopic = (topic: string) => {
    if (selectedTopics.includes(topic)) {
      setSelectedTopics(selectedTopics.filter((t) => t !== topic));
    } else {
      setSelectedTopics([...selectedTopics, topic]);
    }
  };

  const handleSelectAllTopics = () => setSelectedTopics(availableTopics);
  const handleClearAllTopics = () => setSelectedTopics([]);

  const currentQuestions: (QuestionItem & {
    questionOriginal: string;
    defaultAnswerOriginal?: string;
    minLength?: number;
  })[] = useMemo(() => {
    const list: (QuestionItem & {
      questionOriginal: string;
      defaultAnswerOriginal?: string;
      minLength?: number;
    })[] = [];
    const initialMap: { [key: string]: string } = {};

    if (selectedSection === "custom") {
      customQuestionsRaw.forEach((q) => {
        const categoryName = q.category || "General";
        if (selectedTopics.length > 0 && !selectedTopics.includes(categoryName)) return;

        const qId = String(q.id);
        const effectiveAnswer = q.answer_text || "";
        list.push({
          id: qId,
          question: q.question_text,
          questionOriginal: q.question_text,
          category: categoryName,
          isCustom: true,
          defaultAnswerOriginal: effectiveAnswer,
          minLength: 10,
        });
        initialMap[qId] = effectiveAnswer;
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
              question: displayQuestion,
              questionOriginal: plainQuestion,
              category: categoryName,
              isCustom: false,
              defaultAnswerOriginal: plainAnswer,
              minLength: 10,
            });
            initialMap[String(qId)] = plainAnswer;
          }
        });
      }
    }

    loadSavedAnswers(initialMap);
    return list;
  }, [selectedSection, selectedLevel, selectedTopics, questionsData, customQuestionsRaw]);

  // 💡 バリデーションガード付きの練習開始ハンドラー（クレジット残高の事前検証も実施）
  const handleStartPractice = async () => {
    if (!user) {
      alert("会話練習を行うには、サインインが必要です！");
      handleOpenAuth();
      return;
    }

    // 💡 事前検証（クレジット残高が3クレジット以上あるかチェック）
    if (credits < 3) {
      alert("クレジットが不足しています（一問一答ドリルには3クレジット必要です）。チャージを行ってください。");
      return;
    }

    // 各質問の現在の回答内容をチェック（10文字未満のものが無いか検証）
    for (const q of currentQuestions) {
      const currentAns = answers[q.id] || "";
      if (currentAns.trim().length < 10) {
        alert(
          `[Character Count Check]\nThe answer for "${q.questionOriginal.slice(
            0,
            20
          )}..." is too short.\nPlease enter at least 10 characters for your drill response. (Current: ${
            currentAns.trim().length
          } characters)`
        );
        return;
      }
    }

    const targetQList: QuestionData[] = currentQuestions.map((q) => ({
      id: q.id,
      question: q.question,
      questionOriginal: q.questionOriginal,
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
    if (!user) {
      alert("カスタム質問を追加するにはサインインが必要です。");
      handleOpenAuth();
      return;
    }
    if (!newQuestionText.trim() || !newAnswerText.trim()) {
      alert("Please enter both the question and answer.");
      return;
    }
    if (newAnswerText.trim().length < 10) {
      alert("Drillの回答は10文字以上で入力してください。");
      return;
    }

    const success = await addCustomQuestion(newQuestionText, newAnswerText, newCategory);
    if (success) {
      setNewQuestionText("");
      setNewAnswerText("");
      setNewCategory("");
    }
  };

  // 💡 チャットメッセージ送信時にバックエンド経由で3クレジットが減算される仕組みを連動
  const handleSendMessageWithCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (credits < 3) {
      alert("クレジットが不足しています。");
      return;
    }

    // エンジン側の送信処理を実行
    await engine.sendAnswerMessage(e, answers, "drill", selectedSection);

    // 💡 応答・減算成功後に最新のクレジット残高を再取得してヘッダー表示を即時更新
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  if (isAuthLoading || isLoadingData) {
    return (
      <PageLayout user={user} credits={credits}>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 flex items-center justify-center">
          <div className="text-slate-600 dark:text-slate-300 font-bold text-lg animate-pulse">
            Loading EOY Oral Practice...
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!user) {
    return (
      <PageLayout user={user} credits={credits}>
        <div className="min-h-[70vh] bg-slate-50 dark:bg-slate-950 py-16 px-4 flex items-center justify-center">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 rounded-3xl p-8 shadow-sm text-center space-y-6">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-2xl mx-auto flex items-center justify-center text-2xl font-black">
              🔒
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">
                Sign In Required
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                EOY Oral Practice & Custom QA Bank require you to sign in. Please sign in to access
                oral drills and save your custom answers.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAuth}
              className="w-full py-3 px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs tracking-wider uppercase transition shadow-sm cursor-pointer"
            >
              Sign In / Sign Up Now
            </button>
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
          <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300">
                  All VCE Oral Exam Stages
                </span>
                <span className="text-xs text-slate-500">
                  VCE Japanese Oral Exam Prep (Cost: 3 credits/session)
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100">
                EOY Oral Exam Practice & Custom QA Bank
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Practice every stage of the VCE Japanese Oral Exam. Your custom answers are
                automatically saved. (Drill requirement: 10+ characters | 3 credits per practice
                session)
              </p>
            </div>
            <OralExaminerAvatar statusText="Ready for Practice" themeColor={themeColor} />
          </div>

          <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                📂 Select Exam Stage / Source
              </h3>
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

            {/* 💡 共通の OralDrillQuestionSelector にマルチセレクト機能を完全統合 */}
            {selectedSection !== "custom" && (
              <OralDrillQuestionSelector
                categories={availableTopics}
                selectedTopics={selectedTopics}
                onToggleTopic={toggleTopic}
                onSelectAllTopics={handleSelectAllTopics}
                onClearAllTopics={handleClearAllTopics}
                selectedLevel={selectedLevel}
                onSelectLevel={setSelectedLevel}
                selectedSpeed={speechSpeed}
                onSelectSpeed={setSpeechSpeed}
                themeColor={themeColor}
                questionsCount={currentQuestions.length}
              />
            )}
          </div>

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

          <div ref={chatContainerRef}>
            {!user ? (
              <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 rounded-3xl p-8 shadow-sm text-center space-y-4">
                <div className="w-14 h-14 bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-2xl mx-auto flex items-center justify-center text-2xl font-black">
                  🔒
                </div>
                <div className="space-y-1">
                  <h3 className="font-black text-base text-slate-800 dark:text-slate-100">
                    Sign In Required for Oral Practice
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                    Please sign in to start interactive EOY Oral Exam practice sessions with AI Yamato
                    and record your progress.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAuth}
                  className="py-3 px-6 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition shadow-sm cursor-pointer inline-block"
                >
                  Sign In / Sign Up Now
                </button>
              </div>
            ) : (
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
                onSendMessage={handleSendMessageWithCredit}
                themeColor={themeColor}
              />
            )}
          </div>

          <aside
            aria-label="Floating Controls"
            className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3"
          >
            <ChatYamatoEoyOralDrill userId={user?.id} userNickname={nickname} credits={credits} />
          </aside>
        </main>
      </div>
    </PageLayout>
  );
}