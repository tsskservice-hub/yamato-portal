/**
 * @file app/components/lessons/EduLessonPage.tsx
 * @description レッスンページ本体（全レッスン共通）。データは app/lib/lessonPageData.ts の fetchLessonPageData で読み込む。
 *   タスク：語彙ドリル・リスニング・リーディング・スピーキング・ライティング・文化（全レッスン共通の6タスク）
 *   - 内容が無いタスクのボタンは出さない（語彙が無い → 語彙・リーディング、会話データが無い → スピーキング など）
 *   - レッスンごとに違う部分は app/data/lesson-pages.ts、文化タスクは app/data/culture-tasks.ts
 */

import React, { useState, useEffect, useRef } from "react";
import ToolPageWrapper from "~/components/layout/ToolPageWrapper";
import { type PageLayoutRef } from "~/components/layout/PageLayout";
import { YamatoChatCommon2 } from "~/components/chat/YamatoChatCommon2";
import { supabase } from "~/lib/supabaseClient";
import { EduLessonHeader } from "~/components/lessons/EduLessonHeader";
import { EduLessonDetailsCard } from "~/components/lessons/EduLessonDetailsCard";
import { EduVocabularySidebar } from "~/components/lessons/EduVocabularySidebar";
import { EduLessonTaskManager, type LessonTaskKey, type LessonTaskProgress } from "~/components/lessons/EduLessonTaskManager";
import { EduFinishedView } from "~/components/lessons/EduFinishedView";
import { EduVocabularyDrillModal } from "~/components/lessons/EduVocabularyDrillModal";
import { EduListeningTaskModal } from "~/components/lessons/EduListeningTaskModal";
import { EduReadingDrillModal } from "~/components/lessons/EduReadingDrillModal";
import { EduSpeakingTaskModal } from "~/components/lessons/EduSpeakingTaskModal";
import { EduWritingTaskModal } from "~/components/lessons/EduWritingTaskModal";
import { EduCultureTaskModal } from "~/components/lessons/EduCultureTaskModal";
import { findCultureTaskForLesson } from "~/data/culture-tasks";
import { LESSON_PAGE_EXTRAS } from "~/data/lesson-pages";
import type { LessonPageData } from "~/lib/lessonPageData";

/** 完了メッセージ「You have successfully mastered all ○○!」に入れるタスク名 */
const COMPLETED_TASK_NAMES: Record<LessonTaskKey, string> = {
  vocabulary: "vocabulary drills",
  listening: "listening tasks",
  reading: "reading tasks",
  speaking: "speaking practice rounds",
  writing: "writing tasks",
  culture: "culture tasks",
};

export interface EduLessonPageProps {
  /** このページのレッスン（edu_lessons.slug。例：family-1） */
  lessonSlug: string;
  data: LessonPageData;
}

/** レッスンページ本体（全レッスン共通：ヘッダー・AI Yamato・語彙・6つのタスク） */
export function EduLessonPage({ lessonSlug: LESSON_SLUG, data }: EduLessonPageProps) {
  const layoutRef = useRef<PageLayoutRef>(null);
  const themeColor = "#f97316";

  const [user, setUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [credits, setCredits] = useState<number>(10);
  const [nickname, setNickname] = useState<string>("VCE Student");

  // 1. 語彙ドリルモーダルの開閉状態と達成状態の管理
  const [isDrillOpen, setIsDrillOpen] = useState(false);
  const [vocabTaskCompleted, setVocabTaskCompleted] = useState(false);

  // 2. リスニング課題モーダルの開閉状態と達成状態の管理
  const [isListeningTaskOpen, setIsListeningTaskOpen] = useState(false);
  const [listeningTaskCompleted, setListeningTaskCompleted] = useState(false);

  // 3. リーディングタスクモーダルの開閉状態と達成状態の管理
  const [isReadingDrillOpen, setIsReadingDrillOpen] = useState(false);
  const [readingTaskCompleted, setReadingTaskCompleted] = useState(false);

  // 4. スピーキング課題モーダルの開閉状態と完了状態の管理
  const [isSpeakingModalOpen, setIsSpeakingModalOpen] = useState(false);
  const [speakingTaskCompleted, setSpeakingTaskCompleted] = useState(false);

  // 5. ライティング課題モーダルの開閉状態と完了状態の管理
  const [isWritingTaskOpen, setIsWritingTaskOpen] = useState(false);
  const [writingTaskCompleted, setWritingTaskCompleted] = useState(false);

  // 6. 文化タスクモーダルの開閉状態と完了状態の管理
  const [isCultureTaskOpen, setIsCultureTaskOpen] = useState(false);
  const [cultureTaskCompleted, setCultureTaskCompleted] = useState(false);
  // このレッスンの文化タスク（app/data/culture-tasks.ts の lessons にこのレッスンの slug が書いてあるもの）
  const cultureTask = findCultureTaskForLesson(LESSON_SLUG)?.task;
  // レッスンごとに違う部分（app/data/lesson-pages.ts）
  const extras = LESSON_PAGE_EXTRAS[LESSON_SLUG] ?? {};

  // 7. 保存済みの完了状態（EduLessonTaskManager から受け取る）と、「完了済み」メッセージの表示
  //    完了済みのタスクはモーダルを開かずにメッセージを出す（ライティングはモーダル自身がサーバーの記録で判断する）
  const [savedProgress, setSavedProgress] = useState<LessonTaskProgress | null>(null);
  const [completedNotice, setCompletedNotice] = useState<LessonTaskKey | null>(null);

  const startTask = (key: Exclude<LessonTaskKey, "writing">, open: () => void) => {
    if (savedProgress?.[key]) {
      setCompletedNotice(key);
      return;
    }
    open();
  };
  const startVocabularyDrill = () => startTask("vocabulary", () => setIsDrillOpen(true));

  const loaderData = data;
  const { lesson, topic, vocabulary = [], textbookRefs = [], hasSpeaking } = data;
  const hasVocabulary = vocabulary.length > 0;

  // 語彙データからリーディング用アイテム（日本語文章・意味・音声）を生成
  const readingItems = vocabulary.map((v: any) => ({
    jp_text: v.jp_text,
    romaji: v.romaji,
    english_text: v.english_text,
    audio_url: v.audio_url,
  }));

  const handleOpenAuth = () => {
    window.dispatchEvent(new CustomEvent("open-auth-modal", { detail: { mode: "signin" } }));
    const authButton = document.querySelector("[data-auth-trigger]") as HTMLElement;
    if (authButton) {
      authButton.click();
    } else {
      window.location.href = "/#auth";
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

  if (isAuthLoading) {
    return (
      <ToolPageWrapper
        layoutRef={layoutRef}
        hasError={!!loaderData.loadError}
        errorTitle="Unable to Load Data"
        errorMessage={loaderData.loadError || ""}
      >
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 flex items-center justify-center">
          <div className="text-slate-600 dark:text-slate-300 font-bold text-lg animate-pulse">
            Loading lesson...
          </div>
        </div>
      </ToolPageWrapper>
    );
  }

  if (!user) {
    return (
      <ToolPageWrapper
        layoutRef={layoutRef}
        hasError={!!loaderData.loadError}
        errorTitle="Unable to Load Data"
        errorMessage={loaderData.loadError || ""}
      >
        <div className="min-h-[70vh] bg-slate-50 dark:bg-slate-950 py-16 px-4 flex items-center justify-center">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-900/50 rounded-3xl p-8 shadow-sm text-center space-y-6">
            <div className="w-16 h-16 bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 rounded-2xl mx-auto flex items-center justify-center text-2xl font-black">
              🔒
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">
                Sign In Required
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Lessons and AI Yamato tutoring require you to sign in. Please sign in to access interactive lessons.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAuth}
              className="w-full py-3 px-6 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs tracking-wider uppercase transition shadow-sm cursor-pointer"
            >
              Sign In / Sign Up Now
            </button>
          </div>
        </div>
      </ToolPageWrapper>
    );
  }

  return (
    <ToolPageWrapper
        layoutRef={layoutRef}
        hasError={!!loaderData.loadError}
        errorTitle="Unable to Load Data"
        errorMessage={loaderData.loadError || ""}
      >
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 relative">
        <main className="max-w-5xl mx-auto space-y-8">
          
          {/* 1. Header Card Module */}
          <EduLessonHeader lesson={lesson} topic={topic} textbookRefs={textbookRefs} />

          {/* 2. Top: Persistent Yamato AI Tutor */}
          <YamatoChatCommon2
            characterName="Yamato Sensei"
            appType={LESSON_SLUG}
            themeColor={themeColor}
            userId={user?.id}
            userNickname={nickname}
            credits={credits}
            onOpenAuth={handleOpenAuth}
            assignedQuestion={`${topic?.title_en ? `${topic.title_en} – ` : ""}Lesson ${lesson?.lesson_order || 1}: ${lesson?.title_en || ""}`}
          />

          {/* 3. Main Content & Vocabulary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <div className="md:col-span-2 space-y-6">
              <EduLessonDetailsCard lesson={lesson} textbookRefs={textbookRefs} />
            </div>
            <div className="space-y-6">
              <EduVocabularySidebar 
                vocabulary={vocabulary} 
                onStartDrill={startVocabularyDrill}
              />
            </div>
          </div>

          {/* 4. Bottom: Self-Study Task Section */}
          <EduLessonTaskManager 
            lessonId={lesson?.id || LESSON_SLUG}
            userId={user?.id}
            onProgressChange={setSavedProgress}
            onStartVocabularyDrill={hasVocabulary ? startVocabularyDrill : undefined}
            onStartListeningDrill={extras.listening ? () => startTask("listening", () => setIsListeningTaskOpen(true)) : undefined}
            onStartReadingDrill={hasVocabulary ? () => startTask("reading", () => setIsReadingDrillOpen(true)) : undefined}
            onStartSpeakingDrill={hasSpeaking ? () => startTask("speaking", () => setIsSpeakingModalOpen(true)) : undefined}
            onStartWritingTask={lesson?.id ? () => setIsWritingTaskOpen(true) : undefined}
            onStartCultureTask={cultureTask ? () => startTask("culture", () => setIsCultureTaskOpen(true)) : undefined}
            externalTaskStatus={{
              vocabulary: vocabTaskCompleted,
              listening: listeningTaskCompleted,
              reading: readingTaskCompleted,
              speaking: speakingTaskCompleted,
              writing: writingTaskCompleted,
              culture: cultureTaskCompleted,
            }}
          />

        </main>
      </div>

      {/* 5. Fullscreen Vocabulary Drill Modal */}
      <EduVocabularyDrillModal
        vocabulary={vocabulary}
        isOpen={isDrillOpen}
        onClose={() => setIsDrillOpen(false)}
        onCompleted={() => setVocabTaskCompleted(true)}
      />

      {/* 6. Listening Task Modal（今は Family 1 の「何人家族ですか」だけ） */}
      {extras.listening === "family-count" && (
        <EduListeningTaskModal
          isOpen={isListeningTaskOpen}
          onClose={() => setIsListeningTaskOpen(false)}
          onCompleted={() => setListeningTaskCompleted(true)}
        />
      )}

      {/* 7. Fullscreen Reading Comprehension Dual-Check Drill Modal */}
      <EduReadingDrillModal
        items={readingItems}
        isOpen={isReadingDrillOpen}
        onClose={() => setIsReadingDrillOpen(false)}
        onCompleted={() => setReadingTaskCompleted(true)}
      />

      {/* 8. Real-time Voice Speaking Task Modal */}
      {hasSpeaking && (
      <EduSpeakingTaskModal
        isOpen={isSpeakingModalOpen}
        onClose={() => setIsSpeakingModalOpen(false)}
        title={extras.speakingTitle || `Speaking Task: ${lesson?.title_en || "Practice Speaking"}`}
        userId={user?.id}
        appType={LESSON_SLUG}
        lessonSlug={lesson?.slug || LESSON_SLUG} // スピーキングの会話データ（edu_lesson_dialogues.lesson_key）は edu_lessons.slug と同じ値
        onCompleted={() => {
          setSpeakingTaskCompleted(true);
        }}
      />
      )}

      {/* 9b. Culture Task Modal（紙芝居＋字幕 → Quick Check） */}
      {cultureTask && (
        <EduCultureTaskModal
          task={cultureTask}
          isOpen={isCultureTaskOpen}
          onClose={() => setIsCultureTaskOpen(false)}
          onCompleted={() => setCultureTaskCompleted(true)}
        />
      )}

      {/* 10. 完了済みのタスクを開こうとしたときのメッセージ（ライティング課題の完了画面と同じ見た目） */}
      {completedNotice && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl p-5 sm:p-10 shadow-2xl my-auto">
            <EduFinishedView
              taskName={COMPLETED_TASK_NAMES[completedNotice]}
              description="You have already completed this task. Your progress has been saved."
              onClose={() => setCompletedNotice(null)}
            />
          </div>
        </div>
      )}

      {/* 9. Writing Task Modal（手書き・デジタル原稿用紙 → AI 読み取り＆フィードバック） */}
      {lesson?.id && (
        <EduWritingTaskModal
          isOpen={isWritingTaskOpen}
          onClose={() => setIsWritingTaskOpen(false)}
          onCompleted={() => setWritingTaskCompleted(true)}
          lessonId={String(lesson.id)} // edu_writing_tasks.lesson_id（文字列）と照合する
        />
      )}
    </ToolPageWrapper>
  );
}
