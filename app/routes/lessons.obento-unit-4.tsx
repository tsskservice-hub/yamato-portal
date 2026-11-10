/**
 * @file app/routes/lessons.obento-unit-4.tsx
 * @description Obento Deluxe Unit 4 (Family and Pets) の学習ハブページ（edu_lessons データベース完全連動版）
 */

import React, { useState, useEffect, useRef } from "react";
import { json, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/cloudflare";
import { useLoaderData, Link } from "@remix-run/react";
import { generateModuleMeta } from "~/utils/seoMeta";
import ToolPageWrapper from "~/components/layout/ToolPageWrapper";
import { type PageLayoutRef } from "~/components/layout/PageLayout";
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
    // 1. Obento Unit 4 のトピックデータを取得
    const { data: topic } = await supabase
      .from("edu_topics")
      .select("*")
      .ilike("slug", "%obento-unit-4%")
      .single();

    topicData = topic || null;

    if (topicData) {
      // 2. 紐づくレッスンを edu_lessons から lesson_order 順に取得
      const { data: lessons } = await supabase
        .from("edu_lessons")
        .select("*")
        .eq("topic_id", topicData.id)
        .order("lesson_order", { ascending: true });
      lessonsData = lessons || [];
    }

    // フォールバック（もしtopic_idで結ばれていない場合のslug検索）
    if (lessonsData.length === 0) {
      const { data: fallbackLessons } = await supabase
        .from("edu_lessons")
        .select("*")
        .ilike("slug", "obento-unit-4-%")
        .order("lesson_order", { ascending: true });
      lessonsData = fallbackLessons || [];
    }

    const lessonIds = lessonsData.map((l) => l.id);
    if (lessonIds.length > 0) {
      const { data: vocabs } = await supabase
        .from("kl_vocabulary")
        .select("*")
        .in("lesson_id", lessonIds)
        .order("order_index", { ascending: true });
      vocabData = vocabs || [];
    }
  } catch (err) {
    console.warn("⚠️ [Loader] Failed to fetch Obento Unit 4 data from Supabase:", err);
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

export default function LessonsObentoUnit4Page() {
  const layoutRef = useRef<PageLayoutRef>(null);

  const [user, setUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

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
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isAuthLoading) {
    return (
      <ToolPageWrapper layoutRef={layoutRef}>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 flex items-center justify-center">
          <div className="text-slate-600 dark:text-slate-300 font-bold text-lg animate-pulse">
            Loading Obento Unit 4 Hub...
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
                Obento Deluxe Unit 4 lessons require you to sign in. Please sign in to access the learning materials.
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
              <span>Unit 4 Hub</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold mb-2">
              {topic?.title_en || "Obento Unit 4: Family and Pets"}
            </h1>
            {topic?.title_jp && (
              <p className="text-orange-200 font-semibold text-sm mb-3">
                {topic.title_jp}
              </p>
            )}
            <p className="text-orange-100 text-sm sm:text-base leading-relaxed max-w-2xl">
              {topic?.description || "Learn how to introduce your family members, count people correctly using Japanese counters, and talk about your pets!"}
            </p>
          </div>

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
                    {lessons.map((lesson: any, index: number) => {
                      // レッスンごとの個別ページパスを生成（例: /lessons/obento-unit-4-lesson-1 など）
                      const lessonSlug = lesson.slug || `obento-unit-4-lesson-${lesson.lesson_order || index + 1}`;
                      const lessonPath = `/lessons/${lessonSlug}`;

                      return (
                        <div key={lesson.id || index} className="border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 transition hover:shadow-md space-y-3">
                          
                          {/* レッスン番号と教科書参照ページ */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-orange-600 bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-900 px-2.5 py-0.5 rounded-full">
                              Lesson {lesson.lesson_order || index + 1}
                            </span>
                            {lesson.obento_page_ref && (
                              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-200/50 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
                                📚 {lesson.obento_page_ref}
                              </span>
                            )}
                          </div>

                          {/* 英語および日本語のレッスンタイトル */}
                          <div>
                            <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
                              {lesson.title_en}
                            </h3>
                            {lesson.title_jp && (
                              <p className="text-xs font-medium text-orange-600 dark:text-orange-400 mt-0.5">
                                {lesson.title_jp}
                              </p>
                            )}
                          </div>

                          {/* 学習意図（Learning Intention） */}
                          {lesson.learning_intention && (
                            <div className="text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                              <strong className="text-slate-700 dark:text-slate-300 block mb-0.5">Learning Intention:</strong>
                              {lesson.learning_intention}
                            </div>
                          )}

                          {/* 成功基準（Success Criteria） */}
                          {lesson.success_criteria && (
                            <div className="text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                              <strong className="text-slate-700 dark:text-slate-300 block mb-0.5">Success Criteria:</strong>
                              <span>{Array.isArray(lesson.success_criteria) ? lesson.success_criteria.join(", ") : lesson.success_criteria}</span>
                            </div>
                          )}

                          {/* 個別レッスンページへのリンクボタン */}
                          <div className="pt-2 flex justify-end">
                            <Link
                              to={lessonPath}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs transition shadow-sm"
                            >
                              <span>Start This Lesson</span>
                              <span>→</span>
                            </Link>
                          </div>

                        </div>
                      );
                    })}
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