/**
 * @file app/routes/lessons._index.tsx
 * @description Japanese Learning Lessons Hub（各ユニットのレッスンと個別ボタンを統合表示）
 */

import { json, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/cloudflare";
import React from "react";
import { Link, useLoaderData } from "@remix-run/react";
import { ToolPageWrapper } from "~/components/layout/ToolPageWrapper";
import { generateModuleMeta } from "~/utils/seoMeta";
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

  let topicsData: any[] = [];
  let fetchError = null;

  try {
    // 💡 edu_topics と、それに紐づく edu_lessons を一括で取得 (リレーション結合)
    const { data: topics, error } = await supabase
      .from("edu_topics")
      .select(`
        *,
        edu_lessons (*)
      `)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("❌ [Supabase Error] edu_topics fetch failed:", error);
      fetchError = error.message;
    } else {
      // 各トピック内のレッスンも sort_order で昇順ソートしておく
      topicsData = (topics || []).map((topic: any) => ({
        ...topic,
        edu_lessons: (topic.edu_lessons || []).sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      }));
    }
  } catch (err: any) {
    console.error("❌ [Loader Exception]:", err);
    fetchError = err?.message || String(err);
  }

  return json({
    portalContent,
    currentPath: url.pathname,
    topics: topicsData,
    hasError: false,
    errorTitle: "",
    errorMessage: fetchError,
  });
}

export const meta: MetaFunction<typeof loader> = ({ data }: { data: any }) => {
  return generateModuleMeta(data?.portalContent || null, data?.currentPath || "");
};

export default function LessonsHubIndex() {
  const loaderData = useLoaderData<typeof loader>() || {};
  const { topics = [], errorMessage } = loaderData;

  return (
    <ToolPageWrapper 
      breadcrumbTitle="Japanese Lessons Hub"
      hasError={false}
      errorTitle="Failed to Load Lessons Content"
      errorMessage={errorMessage || ""}
    >
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          
          {/* ヘッダーセクション */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 px-3 py-1 rounded-full mb-3">
              <span>AI Yamato Hub</span>
              <span>•</span>
              <span>Interactive Curriculum</span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-5xl mb-4">
              Japanese Lessons & Textbooks
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Explore interactive lessons, vocabulary builders, and AI-guided conversational practice designed for learners worldwide.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 rounded-2xl text-xs">
              <strong>Database Warning:</strong> {errorMessage}
            </div>
          )}

          {/* レッスントピック一覧セクション */}
          <div className="mb-12">
            <div className="mb-6 border-b border-slate-200 dark:border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Available Learning Units</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Select a lesson to start your interactive practice with Yamato Sensei</p>
              </div>
              <span className="text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-full">
                {topics.length} Units Available
              </span>
            </div>

            {topics.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-4">
                <div className="text-4xl">📚</div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Learning Units Found</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Topics are currently being added to the database. Please check back soon!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {topics.map((topic: any) => {
                  const topicSlug = topic.slug || "obento-unit-4";
                  const baseLessonPath = `/lessons/${topicSlug}`;
                  const isComingSoon = Boolean(topic.is_coming_soon);
                  const lessonsList = topic.edu_lessons || [];

                  return (
                    <div 
                      key={topic.id} 
                      className={`bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between hover:shadow-md transition-all relative overflow-hidden group ${
                        isComingSoon ? "opacity-75" : ""
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900">
                            {topic.category || "Textbook Unit"}
                          </span>
                          {isComingSoon ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500">
                              Coming Soon
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                              Active Unit
                            </span>
                          )}
                        </div>
                        
                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1 group-hover:text-orange-600 transition-colors">
                          {topic.title_en || topic.slug}
                        </h3>
                        
                        {topic.title_jp && (
                          <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-3">
                            {topic.title_jp}
                          </p>
                        )}
                        
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                          {topic.description || "Interactive Japanese learning module with grammar, vocabulary, and AI sensei support."}
                        </p>

                        {/* 💡 各ユニットに含まれるレッスン一覧と個別ボタンのリスト */}
                        {!isComingSoon && lessonsList.length > 0 && (
                          <div className="space-y-2 mb-6 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                              Included Lessons:
                            </p>
                            {lessonsList.map((lesson: any, lIdx: number) => {
                              // 例: /lessons/obento-unit-4#lesson-1 または個別ページがある場合は lesson.slug などにリンク可能
                              const lessonTargetLink = lesson.slug ? `/lessons/${lesson.slug}` : `${baseLessonPath}#lesson-${lIdx + 1}`;

                              return (
                                <Link
                                  key={lesson.id || lIdx}
                                  to={lessonTargetLink}
                                  className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-orange-50 dark:hover:bg-orange-950/40 border border-slate-200/60 dark:border-slate-700/60 text-xs transition group/item"
                                >
                                  <div>
                                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                                      Lesson {lIdx + 1}: {lesson.title || `Lesson ${lIdx + 1}`}
                                    </span>
                                    {lesson.learning_intention && (
                                      <span className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                                        {lesson.learning_intention}
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-bold text-orange-600 dark:text-orange-400 text-[11px] whitespace-nowrap ml-2 group-hover/item:translate-x-0.5 transition-transform">
                                    Start Unit {topic.slug.replace(/[^0-9]/g, '')} Lesson {lIdx + 1} &rarr;
                                  </span>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div>
                        {isComingSoon ? (
                          <span className="inline-block w-full text-center py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-400 font-bold text-xs uppercase tracking-wider rounded-2xl cursor-not-allowed">
                            Coming Soon
                          </span>
                        ) : (
                          <Link
                            to={baseLessonPath}
                            className="inline-flex items-center justify-center w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs uppercase tracking-wider rounded-2xl transition-colors shadow-sm cursor-pointer"
                          >
                            🚀 Open Main Lesson Page
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </ToolPageWrapper>
  );
}