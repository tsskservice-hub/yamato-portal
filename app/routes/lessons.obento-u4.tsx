/**
 * @file app/routes/lessons.obento-u4.tsx
 * @description Obento Deluxe Unit 4 (Family and Pets) の学習レッスンページ（やまと先生メインステージ常設版）
 */

import React, { useState, useEffect, useRef } from "react";
import { json, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { generateModuleMeta } from "~/utils/seoMeta";
import ToolPageWrapper from "~/components/ToolPageWrapper";
import { type PageLayoutRef } from "~/components/PageLayout";
import { YamatoChatCommon2 } from "~/components/YamatoChatCommon2";
import { supabase } from "~/lib/supabaseClient";

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

  let topicData = null;
  let lessonsData: any[] = [];
  let vocabData: any[] = [];

  try {
    const { data: topic } = await supabase
      .from("edu_topics")
      .select("*")
      .ilike("slug", "%obento-u4%")
      .single();

    topicData = topic || null;

    if (topicData) {
      const { data: lessons } = await supabase
        .from("edu_lessons")
        .select("*")
        .eq("topic_id", topicData.id)
        .order("sort_order", { ascending: true });
      lessonsData = lessons || [];
    }

    if (lessonsData.length === 0) {
      const { data: fallbackLessons } = await supabase
        .from("edu_lessons")
        .select("*")
        .ilike("slug", "obento-u4-%")
        .order("sort_order", { ascending: true });
      lessonsData = fallbackLessons || [];
    }

    const lessonIds = lessonsData.map((l) => l.id);
    if (lessonIds.length > 0) {
      const { data: vocabs } = await supabase
        .from("edu_vocabulary")
        .select("*")
        .in("lesson_id", lessonIds)
        .order("order_index", { ascending: true });
      vocabData = vocabs || [];
    }
  } catch (err) {
    console.warn("⚠️ [Loader] Failed to fetch Obento U4 data from Supabase:", err);
  }

  return json({
    portalContent,
    currentPath: url.pathname,
    topic: topicData,
    lessons: lessonsData,
    vocabulary: vocabData,
  });
}

export const meta: MetaFunction<typeof loader> = ({ data }: { data: any }) => {
  return generateModuleMeta(data?.portalContent || null, data?.currentPath || "");
};

export default function LessonsObentoU4Page() {
  const layoutRef = useRef<PageLayoutRef>(null);
  const themeColor = "#f97316"; // Obento U4 Warm Orange theme

  const [user, setUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [credits, setCredits] = useState<number>(10);
  const [nickname, setNickname] = useState<string>("VCE Student");

  const loaderData = useLoaderData<typeof loader>() || {};
  const { topic, lessons = [], vocabulary = [] } = loaderData;

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
            Loading Obento Unit 4...
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
          
          {/* ヘッダーカード */}
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-3xl p-8 shadow-xl">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider bg-white/20 w-fit px-3 py-1 rounded-full mb-3">
              <span>Obento Deluxe</span>
              <span>•</span>
              <span>Unit 4</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold mb-3">
              {topic?.title || "家族とペット (Family and Pets)"}
            </h1>
            <p className="text-orange-100 text-sm sm:text-base leading-relaxed max-w-2xl">
              {topic?.description || "Learn how to introduce your family members, count people correctly using Japanese counters, and talk about your pets!"}
            </p>
          </div>

          {/* 👩‍🏫 やまと先生メインステージ（授業スタート画面 & ライブチャットルーム） */}
          <section aria-label="Yamato Sensei Live Lesson">
            <YamatoChatCommon2
              characterName="Yamato Sensei"
              initialGreeting="Hello, my friend! 🌟 Welcome to Obento Unit 4 (Family & Pets). Let's practise talking about your family members, counting people (一人、二人...), and discussing your pets together! What would you like to start with?"
              appType="obento-u4"
              themeColor={themeColor}
              userId={user?.id}
              userNickname={nickname}
              credits={credits}
              onOpenAuth={handleOpenAuth}
              assignedQuestion="Obento Deluxe Unit 4: Family and Pets Practice"
            />
          </section>

          {/* メインコンテンツ & 語彙リストグリッド */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                  <span>📖</span>
                  <span>Lessons & Learning Intentions</span>
                </h2>
                {lessons.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">No lessons registered yet for this unit.</p>
                ) : (
                  <div className="space-y-4">
                    {lessons.map((lesson: any, index: number) => (
                      <div key={lesson.id || index} className="border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 transition hover:shadow-md">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-orange-600 bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-900 px-2.5 py-0.5 rounded-full">
                            Lesson {index + 1}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">{lesson.slug}</span>
                        </div>
                        <h3 className="font-bold text-base text-slate-800 dark:text-slate-200 mb-1">{lesson.title}</h3>
                        {lesson.learning_intention && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                            <strong className="text-slate-700 dark:text-slate-300">Learning Intention:</strong> {lesson.learning_intention}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* サイドバー: 語彙プレビュー */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                  <span>📝</span>
                  <span>Vocabulary Highlights ({vocabulary.length})</span>
                </h2>
                {vocabulary.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No vocabulary items loaded.</p>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                    {vocabulary.map((vocab: any, vIdx: number) => (
                      <div key={vocab.id || vIdx} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm">{vocab.jp_text}</span>
                          <span className="text-slate-400 italic text-[11px]">{vocab.romaji}</span>
                        </div>
                        <span className="text-slate-600 dark:text-slate-400 font-medium text-right">{vocab.english_text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

        </main>
      </div>
    </ToolPageWrapper>
  );
}