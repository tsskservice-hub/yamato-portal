/**
 * @file app/routes/lessons.obento-unit-4-lesson-1.tsx
 * @description Obento Deluxe Unit 4 - Lesson 1 個別学習レッスンページ（語彙ドリルモーダル連携版）
 */

import React, { useState, useEffect, useRef } from "react";
import { json, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { generateModuleMeta } from "~/utils/seoMeta";
import ToolPageWrapper from "~/components/layout/ToolPageWrapper";
import { type PageLayoutRef } from "~/components/layout/PageLayout";
import { YamatoChatCommon2 } from "~/components/chat/YamatoChatCommon2";
import { supabase } from "~/lib/supabaseClient";

// モジュール化したコンポーネントのインポート
import { EduLessonHeader } from "~/components/lessons/EduLessonHeader";
import { EduLessonDetailsCard } from "~/components/lessons/EduLessonDetailsCard";
import { EduVocabularySidebar } from "~/components/lessons/EduVocabularySidebar";
import { EduLessonTaskManager } from "~/components/lessons/EduLessonTaskManager";
import { EduVocabularyDrillModal } from "~/components/lessons/EduVocabularyDrillModal"; // 👈 語彙ドリルモーダルのインポート

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  let portalContent = null;
  try {
    const { data: portalData } = await supabase
      .from("portal_settings")
      .select("content")
      .eq("key", "PORTAL_CONTENT")
      .single();
    portalContent = portalData?.content || null;
  } catch (e) {}

  let lessonData = null;
  let vocabData: any[] = [];
  let topicData = null;

  try {
    const { data: lessons } = await supabase
      .from("edu_lessons")
      .select("*")
      .ilike("slug", "%obento-unit-4-%")
      .eq("lesson_order", 1)
      .limit(1);

    if (lessons && lessons.length > 0) {
      lessonData = lessons[0];
    } else {
      const { data: fallbackLesson } = await supabase
        .from("edu_lessons")
        .select("*")
        .eq("lesson_order", 1)
        .limit(1);
      lessonData = fallbackLesson?.[0] || null;
    }

    if (lessonData) {
      if (lessonData.topic_id) {
        const { data: topic } = await supabase
          .from("edu_topics")
          .select("*")
          .eq("id", lessonData.topic_id)
          .single();
        topicData = topic || null;
      }

      const { data: vocabs } = await supabase
        .from("edu_vocabulary")
        .select("*")
        .eq("lesson_id", lessonData.id)
        .order("order_index", { ascending: true });
      vocabData = vocabs || [];
    }
  } catch (err) {
    console.warn("⚠️ [Loader] Failed to fetch Obento Unit 4 Lesson 1 data from Supabase:", err);
  }

  return json({
    portalContent,
    currentPath: url.pathname,
    lesson: lessonData,
    topic: topicData,
    vocabulary: vocabData,
  });
}

export const meta: MetaFunction<typeof loader> = ({ data }: { data: any }) => {
  return generateModuleMeta(data?.portalContent || null, data?.currentPath || "");
};

function LessonsObentoUnit4Lesson1Page() {
  const layoutRef = useRef<PageLayoutRef>(null);
  const themeColor = "#f97316";

  const [user, setUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [credits, setCredits] = useState<number>(10);
  const [nickname, setNickname] = useState<string>("VCE Student");

  // 👈 語彙ドリルモーダルの開閉状態と達成状態の管理
  const [isDrillOpen, setIsDrillOpen] = useState(false);
  const [vocabTaskCompleted, setVocabTaskCompleted] = useState(false);

  const loaderData = useLoaderData<typeof loader>() || {};
  const { lesson, topic, vocabulary = [] } = loaderData;

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
      <ToolPageWrapper layoutRef={layoutRef}>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 flex items-center justify-center">
          <div className="text-slate-600 dark:text-slate-300 font-bold text-lg animate-pulse">
            Loading Obento Unit 4 - Lesson 1...
          </div>
        </div>
      </ToolPageWrapper>
    );
  }

  if (!user) {
    return (
      <ToolPageWrapper layoutRef={layoutRef}>
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
                Obento Deluxe Unit 4 lessons and AI Yamato tutoring require you to sign in. Please sign in to access interactive lessons.
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
    <ToolPageWrapper layoutRef={layoutRef}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 relative">
        <main className="max-w-5xl mx-auto space-y-8">
          
          {/* 1. ヘッダーカードモジュール */}
          <EduLessonHeader lesson={lesson} topic={topic} />

          {/* 2. 上部：常設ヤマト・AIチューター */}
          <YamatoChatCommon2
            characterName="Yamato Sensei"
            appType="obento-unit-4-lesson-1"
            themeColor={themeColor}
            userId={user?.id}
            userNickname={nickname}
            credits={credits}
            onOpenAuth={handleOpenAuth}
            assignedQuestion={`Obento Deluxe Unit 4 Lesson 1: ${lesson?.title_en || "Family and Pets"}`}
          />

          {/* 3. メインコンテンツ & 語彙リストグリッド (Lesson Details & Vocabulary) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <div className="md:col-span-2 space-y-6">
              <EduLessonDetailsCard lesson={lesson} />
            </div>
            <div className="space-y-6">
              {/* 👈 語彙サイドバーに onStartDrill を渡してボタンを表示 */}
              <EduVocabularySidebar 
                vocabulary={vocabulary} 
                onStartDrill={() => setIsDrillOpen(true)}
              />
            </div>
          </div>

          {/* 4. 下部：自習タスクセクション (Task 1 からのドリル起動および完了状態の同期) */}
          <EduLessonTaskManager 
            lessonId={lesson?.id || "obento-unit-4-lesson-1"} 
            userId={user?.id}
            onStartVocabularyDrill={() => setIsDrillOpen(true)}
            externalTaskStatus={{
              vocabulary: vocabTaskCompleted,
            }}
          />

        </main>
      </div>

      {/* 👈 5. フルスクリーン対応 語彙ドリルモーダル */}
      <EduVocabularyDrillModal
        vocabulary={vocabulary}
        isOpen={isDrillOpen}
        onClose={() => setIsDrillOpen(false)}
        onCompleted={() => setVocabTaskCompleted(true)}
      />
    </ToolPageWrapper>
  );
}

export default LessonsObentoUnit4Lesson1Page;