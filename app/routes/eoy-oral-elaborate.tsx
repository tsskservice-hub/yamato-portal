/**
 * @file eoy-oral-elaborate.tsx
 * @description VCE Japanese - EOY Oral Elaborate Practice & Custom QA Bank (Clean Cloudflare-compatible Edition)
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

// 💡 【切り出しファイルのインポート & 追加アイコン】
import { Lightbulb, Download, X } from "lucide-react";
import ElaborateHintModal from "../components/ElaborateHintModal";
import { countValidSentences } from "../utils/oralValidation";

export const meta: MetaFunction = () => {
  return [
    { title: "VCE Japanese - EOY Oral Elaborate Practice & Custom QA Bank | JPTutor AI Yamato" },
    {
      name: "description",
      content:
        "Comprehensive VCE Japanese Oral Exam practice covering all stages with detailed elaboration and deep conversational responses.",
    },
  ];
};

export default function EoyOralElaboratePage() {
  const themeColor = "#a855f7"; // Purple / Violet theme for Elaborate

  const [user, setUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  const [credits, setCredits] = useState<number>(10);
  const [nickname, setNickname] = useState<string>("VCE Student");

  const [questionsData, setQuestionsData] = useState<OralExamQuestionsData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  const [selectedSection, setSelectedSection] = useState<
    "beforeSec1" | "sec1" | "sec2" | "afterSec2" | "custom"
  >("sec1");
  const [selectedLevel, setSelectedLevel] = useState<"steady" | "normal" | "accelerated">(
    "normal"
  );
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [speechSpeed, setSpeechSpeed] = useState<number>(1.0);
  const [orderMode, setOrderMode] = useState<"sequential" | "random">("sequential");

  const [newQuestionText, setNewQuestionText] = useState("");
  const [newAnswerText, setNewAnswerText] = useState("");
  const [newCategory, setNewCategory] = useState("");

  // 💡 【新規追加ステート】モーダル開閉・インポート状態・メッセージ
  const [isHintModalOpen, setIsHintModalOpen] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  const handleOpenAuth = () => {
    window.dispatchEvent(new CustomEvent("open-auth-modal", { detail: { mode: "signin" } }));
    const authButton = document.querySelector("[data-auth-trigger]") as HTMLElement;
    if (authButton) {
      authButton.click();
    } else {
      window.location.href = "/#auth";
    }
  };

  // 💡 フックからDrill解答取得・インポート用の拡張関数も取得
  const {
    answers,
    customQuestionsRaw,
    fetchCustomQuestions,
    loadSavedAnswers,
    handleAnswerChange,
    handleAnswerBlur,
    addCustomQuestion,
    deleteCustomQuestion,
    importDrillAnswers,
  } = useSupabaseUserAnswers(supabase, user?.id, "elaborate");

  // 💡 userId と nickname をフックに渡す
  const engine = useOralPracticeEngine(selectedLevel, speechSpeed, user?.id, nickname);

  // 💡 【新規追加関数】Drill解答インポートのハンドラー
  const handleImportFromDrill = async (targetQuestionId?: string) => {
    if (!user) {
      alert("Drillの解答を読み込むにはサインインが必要です。");
      handleOpenAuth();
      return;
    }
    setIsImporting(true);
    setStatusMessage(null);

    try {
      const success = await importDrillAnswers(targetQuestionId);
      if (success) {
        setStatusMessage(
          targetQuestionId
            ? "該当質問のDrillでの解答を1文目にインポートしました！"
            : "Drillからの全解答をインポートしました！2文目・3文目を追加して深掘りしましょう。"
        );
      } else {
        setStatusMessage("インポート可能なDrillの解答が見つかりませんでした。直接入力から始められます。");
      }
    } catch (err) {
      console.error(err);
      setStatusMessage("Drill解答のインポート中にエラーが発生しました。");
    } finally {
      setIsImporting(false);
    }
  };

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

  // 💡 AIの解析（isAnalyzing）完了時に最新クレジットを再取得して連動
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

  // 💡 【要件更新】練習開始時のバリデーション（1文10文字以上の有効な日本語が3文以上あるか検証）
  const handleStartPractice = async () => {
    if (!user) {
      alert("会話練習を行うには、サインインが必要です！");
      handleOpenAuth();
      return;
    }
    if (credits < 4) {
      alert("クレジットが不足しています（Elaborate練習には4クレジット必要です）。チャージを行ってください。");
      return;
    }

    for (const q of currentQuestions) {
      const currentAns = answers[q.id] || "";
      const sentences = currentAns.split(/[。！?\n]+/).filter((s) => s.trim().length > 0);
      const validSentenceCount = countValidSentences(sentences);

      if (validSentenceCount < 3) {
        alert(
          `【Elaborate 3文条件チェック】\n質問「${q.questionOriginal.slice(
            0,
            20
          )}...」の解答が不十分です。\n\n1文あたり10文字以上の日本語文章を【3文以上】入力してください。（現在の有効な文: ${validSentenceCount}文）`
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
      alert("回答は10文字以上で入力してください。");
      return;
    }
    const success = await addCustomQuestion(newQuestionText, newAnswerText, newCategory);
    if (success) {
      setNewQuestionText("");
      setNewAnswerText("");
      setNewCategory("");
    }
  };

  const handleSendMessageWithCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (credits < 4) {
      alert("クレジットが不足しています。");
      return;
    }
    await engine.sendAnswerMessage(e, answers, "elaborate", selectedSection);
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
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/50 rounded-3xl p-8 shadow-sm text-center space-y-6">
            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 rounded-2xl mx-auto flex items-center justify-center text-2xl font-black">
              🔒
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">
                Sign In Required
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                EOY Oral Elaborate Practice & Custom QA Bank require you to sign in. Please sign in to access oral practice sessions and save your custom answers.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAuth}
              className="w-full py-3 px-6 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs tracking-wider uppercase transition shadow-sm cursor-pointer"
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
          {/* 💡 ヘッダーバナー（ヒントボタン＆Drillインポートボタンを追加） */}
          <div className="bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/50 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-300">
                  All VCE Oral Exam Stages
                </span>
                <span className="text-xs text-slate-500">
                  VCE Japanese Oral Exam Prep (Cost: 4 credits/session)
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100">
                EOY Oral Exam Elaborate Practice & Custom QA Bank
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Practice every stage of the VCE Japanese Oral Exam with detailed elaboration. Your custom answers are automatically saved. (Requirement: 3+ sentences | 4 credits per turn/response)
              </p>

              {/* 💡 【新規追加】アクションボタン群 */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsHintModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-bold text-xs rounded-xl border border-amber-200 dark:border-amber-800 transition shadow-sm cursor-pointer"
                >
                  <Lightbulb size={16} className="text-amber-600 dark:text-amber-400" />
                  <span>深掘り（Elaborate）のヒント</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleImportFromDrill()}
                  disabled={isImporting}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Download size={16} />
                  <span>{isImporting ? "読み込み中..." : "Drillから全問インポート"}</span>
                </button>
              </div>
            </div>

            <OralExaminerAvatar statusText="Ready for Practice" themeColor={themeColor} />
          </div>

          {/* 💡 【新規追加】ステータスメッセージ表示 */}
          {statusMessage && (
            <div className="p-3 bg-purple-50 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-2xl text-xs flex items-center justify-between">
              <span>{statusMessage}</span>
              <button
                type="button"
                onClick={() => setStatusMessage(null)}
                className="text-purple-500 hover:text-purple-700 p-1"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* セクション選択エリア */}
          <div className="bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 rounded-3xl p-6 shadow-sm space-y-6">
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
                        ? "bg-purple-600 text-white border-purple-700 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-purple-50"
                    }`}
                  >
                    {sec.label}
                  </button>
                ))}
              </div>
            </div>

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

          {/* 解答一覧・入力エリア */}
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

          {/* チャット練習エリア */}
          <div ref={chatContainerRef}>
            {!user ? (
              <div className="bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/50 rounded-3xl p-8 shadow-sm text-center space-y-4">
                <div className="w-14 h-14 bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 rounded-2xl mx-auto flex items-center justify-center text-2xl font-black">
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
                  className="py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition shadow-sm cursor-pointer inline-block"
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

      {/* 💡 【新規追加】深掘りのヒント モーダルコンポーネント */}
      <ElaborateHintModal
        isOpen={isHintModalOpen}
        onClose={() => setIsHintModalOpen(false)}
      />
    </PageLayout>
  );
}