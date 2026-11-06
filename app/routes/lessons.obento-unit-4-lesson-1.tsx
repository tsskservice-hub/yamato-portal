/**
 * @file app/routes/lessons.obento-unit-4-lesson-1.tsx
 * @description Obento Deluxe Unit 4 - Lesson 1 個別学習レッスンページ（edu_lessons データベース連動版）
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

export default function LessonsObentoUnit4Lesson1Page() {
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
          
          {/* ヘッダーカード */}
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-3xl p-8 shadow-xl">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider bg-white/25 w-fit px-3 py-1 rounded-full mb-3">
              <span>Obento Deluxe</span>
              <span>•</span>
              <span>Unit 4</span>
              <span>•</span>
              <span>Lesson {lesson?.lesson_order || 1}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold mb-2">
              {lesson?.title_en || "Obento Unit 4: Lesson 1"}
            </h1>
            {lesson?.title_jp && (
              <p className="text-orange-100 font-semibold text-sm mb-3">
                {lesson.title_jp}
              </p>
            )}
            <p className="text-orange-50 text-sm sm:text-base leading-relaxed max-w-2xl">
              {lesson?.learning_intention || topic?.description || "Let's learn key expressions and vocabulary for Unit 4 with Yamato Sensei!"}
            </p>
          </div>

          {/* 👩‍🏫 やまと先生メインステージ（授業スタート画面 & ライブチャットルーム） */}
          <section aria-label="Yamato Sensei Live Lesson">
            <YamatoChatCommon2
              characterName="Yamato Sensei"
              initialGreeting={`Hello, my friend! 🌟 Welcome to Obento Unit 4, Lesson 1: "${lesson?.title_en || "Family and Pets"}". Let's practise together! What would you like to check first?`}
              appType="obento-unit-4-lesson-1"
              themeColor={themeColor}
              userId={user?.id}
              userNickname={nickname}
              credits={credits}
              onOpenAuth={handleOpenAuth}
              assignedQuestion={`Obento Deluxe Unit 4 Lesson 1: ${lesson?.title_en || "Practice"}`}
            />
          </section>

          {/* メインコンテンツ & 語彙リストグリッド */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>📖</span>
                  <span>Lesson Details & Objectives</span>
                </h2>

                {!lesson ? (
                  <p className="text-sm text-slate-500 italic">No lesson data found in database.</p>
                ) : (
                  <div className="space-y-4">
                    {/* 教科書参照ページ */}
                    {lesson.obento_page_ref && (
                      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Textbook Reference:</span>
                        <span className="text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/50 px-3 py-1 rounded-full border border-orange-200 dark:border-orange-900">
                          📚 {lesson.obento_page_ref}
                        </span>
                      </div>
                    )}

                    {/* 学習意図（Learning Intention） */}
                    {lesson.learning_intention && (
                      <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
                        <strong className="text-slate-800 dark:text-slate-100 block font-bold">🎯 Learning Intention:</strong>
                        <p>{lesson.learning_intention}</p>
                      </div>
                    )}

                    {/* 成功基準（Success Criteria） */}
                    {lesson.success_criteria && (
                      <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
                        <strong className="text-slate-800 dark:text-slate-100 block font-bold">✨ Success Criteria:</strong>
                        <p>{Array.isArray(lesson.success_criteria) ? lesson.success_criteria.join(", ") : lesson.success_criteria}</p>
                      </div>
                    )}

                    {/* ターゲット文法・キー表現 */}
                    {(lesson.target_grammar || lesson.key_expressions) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        {lesson.target_grammar && (
                          <div className="bg-orange-50/60 dark:bg-orange-950/20 p-3.5 rounded-2xl border border-orange-100 dark:border-orange-900/40 text-orange-900 dark:text-orange-300 text-xs">
                            <strong className="block font-bold mb-1">🛠️ Target Grammar:</strong>
                            <div className="whitespace-pre-wrap">{JSON.stringify(lesson.target_grammar, null, 2)}</div>
                          </div>
                        )}
                        {lesson.key_expressions && (
                          <div className="bg-amber-50/60 dark:bg-amber-950/20 p-3.5 rounded-2xl border border-amber-100 dark:border-amber-900/40 text-amber-900 dark:text-amber-300 text-xs">
                            <strong className="block font-bold mb-1">💬 Key Expressions:</strong>
                            <div className="whitespace-pre-wrap">{JSON.stringify(lesson.key_expressions, null, 2)}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* サイドバー: 語彙リストグリッド */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                  <span>📝</span>
                  <span>Lesson Vocabulary ({vocabulary.length})</span>
                </h2>
                {vocabulary.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No vocabulary items registered for this lesson.</p>
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