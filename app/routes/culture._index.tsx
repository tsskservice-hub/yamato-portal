/**
 * @file app/routes/culture._index.tsx
 * @description 文化タスクを横断して学べるページ（/culture）
 *   - app/data/culture-tasks.ts に登録したすべての文化タスクを一覧にし、どれでもその場で開ける
 *   - 日本語の力がなくても学べる内容なので、ログインなしで誰でも使える（AI は使わない）
 *   - ログイン中の生徒がタスクを終えると、そのタスクを使うレッスン（CultureTask.lessons）の
 *     文化タスク（edu_student_progress.task_key = 'culture'）も完了にする。
 *     逆に、レッスンで終えた文化タスクもここで「Completed」と表示する
 *   - ログインしていない人は、このブラウザだけに「Completed」の印を残す
 */

import React, { useEffect, useState } from "react";
import { Link } from "@remix-run/react";
import type { MetaFunction } from "@remix-run/cloudflare";
import { ToolPageWrapper } from "~/components/layout/ToolPageWrapper";
import { EduCultureTaskModal } from "~/components/lessons/EduCultureTaskModal";
import { CULTURE_TASKS } from "~/data/culture-tasks";
import { newSlugFor, slugCandidates } from "~/data/lesson-slugs";
import { supabase } from "~/lib/supabaseClient";

const PAGE_TITLE = "Japanese Culture";
const PAGE_DESCRIPTION =
  "Picture stories about life in Japan, with narration and English subtitles. No Japanese needed – watch the story, then try a short quiz.";

export const meta: MetaFunction = () => [
  { title: `${PAGE_TITLE} | AI Yamato Portal` },
  { name: "description", content: PAGE_DESCRIPTION },
  { property: "og:title", content: `${PAGE_TITLE} | AI Yamato Portal` },
  { property: "og:description", content: PAGE_DESCRIPTION },
  { name: "twitter:card", content: "summary_large_image" },
];

// ログインしていない人用：このブラウザで終えたタスク（per-viewer の印。保存できない環境では印が出ないだけ）
const STORAGE_KEY = "culture-completed-v1";

function readCompleted(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function writeCompleted(list: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // 保存できなくても学習は続けられる
  }
}

const TASK_ENTRIES = Object.entries(CULTURE_TASKS);

/** すべての文化タスクが使うレッスンの slug */
const ALL_LESSON_SLUGS = [...new Set(TASK_ENTRIES.flatMap(([, t]) => (t.lessons ?? []).map((l) => l.slug)))];

export default function CultureHubPage() {
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [completed, setCompleted] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  /** レッスンの slug → edu_lessons.id */
  const [lessonIds, setLessonIds] = useState<Record<string, string>>({});
  /** タスク ID → レッスンの進捗に記録したことを伝えるメッセージ */
  const [savedNotice, setSavedNotice] = useState<Record<string, string>>({});

  const addCompleted = (ids: string[]) =>
    setCompleted((prev) => {
      const next = [...new Set([...prev, ...ids])];
      return next.length === prev.length ? prev : next;
    });

  // このブラウザの印
  useEffect(() => {
    addCompleted(readCompleted());
  }, []);

  // ログイン状態
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUserId(session?.user?.id ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) =>
      setUserId(session?.user?.id ?? null)
    );
    return () => subscription.unsubscribe();
  }, []);

  // ログイン中：レッスンの ID を調べ、レッスンで終えた文化タスクも「Completed」にする
  useEffect(() => {
    if (!userId || ALL_LESSON_SLUGS.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: lessons, error } = await supabase
          .from("edu_lessons")
          .select("id, slug")
          .in("slug", ALL_LESSON_SLUGS.flatMap(slugCandidates));
        if (error) throw error;
        const ids: Record<string, string> = {};
        for (const l of lessons ?? []) ids[newSlugFor(l.slug) || l.slug] = String(l.id);
        if (cancelled) return;
        setLessonIds(ids);

        const idList = Object.values(ids);
        if (idList.length === 0) return;
        const { data: progress, error: progressError } = await supabase
          .from("edu_student_progress")
          .select("lesson_id, is_completed")
          .eq("user_id", userId)
          .eq("task_key", "culture")
          .in("lesson_id", idList);
        if (progressError) throw progressError;
        const doneLessonIds = new Set((progress ?? []).filter((p) => p.is_completed).map((p) => String(p.lesson_id)));
        const doneTasks = TASK_ENTRIES.filter(([, t]) =>
          (t.lessons ?? []).some((l) => ids[l.slug] && doneLessonIds.has(ids[l.slug]))
        ).map(([id]) => id);
        if (!cancelled) addCompleted(doneTasks);
      } catch (err) {
        console.error("[Culture] Failed to load lesson progress:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  /** タスクを終えた時：このブラウザに印を付け、ログイン中ならレッスンの文化タスクも完了にする */
  const handleCompleted = async (taskId: string) => {
    writeCompleted([...new Set([...readCompleted(), taskId])]);
    addCompleted([taskId]);

    const task = CULTURE_TASKS[taskId];
    if (!userId || !task?.lessons?.length) return;
    const targets = task.lessons.filter((l) => lessonIds[l.slug]);
    if (targets.length === 0) return;
    try {
      const now = new Date().toISOString();
      const { error } = await supabase.from("edu_student_progress").upsert(
        targets.map((l) => ({
          user_id: userId,
          lesson_id: lessonIds[l.slug],
          task_key: "culture",
          is_completed: true,
          updated_at: now,
        })),
        { onConflict: "user_id,lesson_id,task_key" }
      );
      if (error) throw error;
      setSavedNotice((prev) => ({
        ...prev,
        [taskId]: `Counted as the culture task in ${targets.map((l) => l.label.split(":")[0]).join(", ")}.`,
      }));
    } catch (err) {
      console.error("[Culture] Failed to save lesson progress:", err);
    }
  };

  const openTask = openTaskId ? CULTURE_TASKS[openTaskId] : null;
  const completedCount = completed.filter((id) => id in CULTURE_TASKS).length;

  return (
    <ToolPageWrapper breadcrumbTitle={PAGE_TITLE}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 sm:py-12 px-4">
        <main className="max-w-6xl mx-auto space-y-8">
          {/* ヘッダー */}
          <div className="bg-gradient-to-r from-rose-500 to-orange-500 text-white rounded-3xl p-6 sm:p-10 shadow-xl space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider bg-white/20 w-fit px-3 py-1 rounded-full">
              <span>🎎 Culture</span>
              <span>•</span>
              <span>No Japanese needed</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold">{PAGE_TITLE}</h1>
            <p className="text-sm sm:text-base text-rose-50 leading-relaxed max-w-2xl">{PAGE_DESCRIPTION}</p>
            <p className="text-xs sm:text-sm text-rose-100">
              {TASK_ENTRIES.length} {TASK_ENTRIES.length === 1 ? "story" : "stories"} · {completedCount} completed
              {userId
                ? " · Stories you finish here also count in your lessons."
                : " · Sign in to have the stories you finish count in your lessons."}
            </p>
          </div>

          {/* タスク一覧 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {TASK_ENTRIES.map(([taskId, task]) => {
              const isDone = completed.includes(taskId);
              const cover = task.cards[0];
              return (
                <article
                  key={taskId}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition flex flex-col"
                >
                  {cover && (
                    <button
                      type="button"
                      onClick={() => setOpenTaskId(taskId)}
                      className="block bg-slate-100 dark:bg-slate-800 cursor-pointer"
                      aria-label={`Start: ${task.title}`}
                    >
                      <img
                        src={cover.imageUrl}
                        alt={cover.imageAlt}
                        loading="lazy"
                        className="w-full aspect-[3/2] object-cover"
                      />
                    </button>
                  )}
                  <div className="p-5 sm:p-6 flex flex-col gap-3 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 leading-snug">
                        {task.title}
                      </h2>
                      {isDone && (
                        <span className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          ✅ Completed
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{task.summary}</p>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      🖼️ {task.cards.length} picture cards · 🔊 narration with subtitles · ❓ {task.questions.length} quiz questions
                    </p>
                    {task.lessons && task.lessons.length > 0 && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Also in lesson:{" "}
                        {task.lessons.map((l, i) => (
                          <React.Fragment key={l.slug}>
                            {i > 0 && ", "}
                            <Link to={`/lessons/${l.slug}`} className="font-bold text-orange-600 dark:text-orange-400 underline">
                              {l.label}
                            </Link>
                          </React.Fragment>
                        ))}
                      </p>
                    )}
                    {savedNotice[taskId] && (
                      <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300" role="status">
                        🎉 {savedNotice[taskId]}
                      </p>
                    )}
                    <div className="mt-auto pt-2">
                      <button
                        type="button"
                        onClick={() => setOpenTaskId(taskId)}
                        className="w-full py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-sm shadow transition active:scale-95 cursor-pointer"
                      >
                        {isDone ? "🔁 Watch again" : "▶ Start the story"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
            {userId
              ? "Finishing a story here also completes the culture task in the lessons that use it."
              : "Completed marks are saved only in this browser. Sign in to save your progress to your lessons."}
          </p>
        </main>
      </div>

      {openTask && openTaskId && (
        <EduCultureTaskModal
          task={openTask}
          isOpen={true}
          onClose={() => setOpenTaskId(null)}
          onCompleted={() => handleCompleted(openTaskId)}
        />
      )}
    </ToolPageWrapper>
  );
}
