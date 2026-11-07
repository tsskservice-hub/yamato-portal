/**
 * @file app/routes/lessons.obento-unit-4-lesson-1.tsx
 * @description Obento Deluxe Unit 4 - Lesson 1 個別学習レッスンページ（上下分割・タスクモジュール化対応版）
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
    // 1. edu_lessons から Unit 4 の Lesson 1 データを取得 (slug または lesson_order = 1 でマッチング)
    const { data: lessons } = await supabase
      .from("edu_lessons")
      .select("*")
      .ilike("slug", "%obento-unit-4-%")
      .eq("lesson_order", 1)
      .limit(1);

    if (lessons && lessons.length > 0) {
      lessonData = lessons[0];
    } else {
      // フォールバック: 単に lesson_order が 1 のもの、または slug が一致するもの
      const { data: fallbackLesson } = await supabase
        .from("edu_lessons")
        .select("*")
        .eq("lesson_order", 1)
        .limit(1);
      lessonData = fallbackLesson?.[0] || null;
    }

    if (lessonData) {
      // 2. 紐づくトピック情報を取得
      if (lessonData.topic_id) {
        const { data: topic } = await supabase
          .from("edu_topics")
          .select("*")
          .eq("id", lessonData.topic_id)
          .single();
        topicData = topic || null;
      }

      // 3. このレッスンに紐づく語彙データを取得
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
  const themeColor = "#f97316"; // Obento U4 Warm Orange theme

  const [user, setUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [credits, setCredits] = useState<number>(10);
  const [nickname, setNickname] = useState<string>("VCE Student");

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

          {/* 2. 上部：常設ヤマト・AIチューター スクリーン（質問・添削・会話の相談窓口） */}
          <section aria-label="Yamato Sensei Live Tutor" className="bg-white dark:bg-slate-900 border-2 border-orange-500/40 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500 text-white rounded-2xl flex items-center justify-center text-xl shadow-md">
                  👩‍🏫
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                    Yamato Sensei - Live Tutor & Consultation
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Need help with tasks, writing corrections, or speaking practice? Ask Yamato anytime!
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 rounded-full">
                Ready to Help
              </span>
            </div>

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
          </section>

          {/* 3. 下部：自習タスクセクション（lessonId と userId を渡すよう修正） */}
          <EduLessonTaskManager 
            lessonId={lesson?.id || "obento-unit-4-lesson-1"} 
            userId={user?.id} 
          />

          {/* 4. メインコンテンツ & 語彙リストグリッド */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <div className="md:col-span-2 space-y-6">
              <EduLessonDetailsCard lesson={lesson} />
            </div>
            <div className="space-y-6">
              <EduVocabularySidebar vocabulary={vocabulary} />
            </div>
          </div>

        </main>
      </div>
    </ToolPageWrapper>
  );
}

export default LessonsObentoUnit4Lesson1Page;