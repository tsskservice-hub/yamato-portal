/**
 * @file app/components/lessons/EduLessonTaskManager.tsx
 * @description レッスン内の各自習タスクの自動判定・進捗管理コンポーネント（タスクカード背景白版・リスニング＆リーディング＆スピーキング＆ライティング＆文化タスク起動対応）
 */

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "~/lib/supabaseClient";

/** 宿題で、学校時間中のためブロック中のタスク（until = ブロックが終わる時刻） */
type TaskLocks = Partial<Record<LessonTaskKey, { locked: boolean; until: string | null }>>;

function formatTime(iso: string | null) {
  if (!iso) return "after school";
  return `after ${new Date(iso).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}`;
}

// 全レッスン共通の6タスク（edu_student_progress.task_key と同じ値）。表示順もこの順
const TASK_KEYS = ["vocabulary", "listening", "reading", "speaking", "writing", "culture"] as const;

export type LessonTaskKey = (typeof TASK_KEYS)[number];
export type LessonTaskProgress = Record<LessonTaskKey, boolean>;

export interface EduLessonTaskManagerProps {
  lessonId: string; // レッスンID
  userId?: string;  // ユーザーID
  onAllCompletedChange?: (completed: boolean) => void;
  /** 完了状態（データベースの記録＋このページで完了したもの）が変わるたびに呼ばれる。完了済みタスクを開かせないために使う */
  onProgressChange?: (progress: LessonTaskProgress) => void;
  onStartVocabularyDrill?: () => void;
  onStartListeningDrill?: () => void; // 追加：リスニングタスク起動ハンドラー
  onStartReadingDrill?: () => void;  // リーディングドリル起動ハンドラー
  onStartSpeakingDrill?: () => void;  // スピーキングタスク起動ハンドラー
  onStartWritingTask?: () => void;  // 追加：ライティングタスク起動ハンドラー
  onStartCultureTask?: () => void;  // 文化タスク起動ハンドラー
  externalTaskStatus?: {
    vocabulary?: boolean;
    listening?: boolean;
    reading?: boolean;
    speaking?: boolean;
    writing?: boolean;
    culture?: boolean;
  };
}

export function EduLessonTaskManager({ 
  lessonId, 
  userId, 
  onAllCompletedChange,
  onProgressChange,
  onStartVocabularyDrill,
  onStartListeningDrill, // 追加
  onStartReadingDrill,
  onStartSpeakingDrill,
  onStartWritingTask, // 追加
  onStartCultureTask,
  externalTaskStatus = {}
}: EduLessonTaskManagerProps) {
  const [taskProgress, setTaskProgress] = useState<LessonTaskProgress>({
    vocabulary: false,
    listening: false,
    reading: false,
    speaking: false,
    writing: false,
    culture: false,
  });

  // 💡 宿題の学校時間ブロック（サーバーが判定する。SQL 47 / api.lesson-progress.ts）
  const [locks, setLocks] = useState<TaskLocks>({});
  const isLocked = (k: LessonTaskKey) => Boolean(locks[k]?.locked) && !taskProgress[k];

  useEffect(() => {
    if (!userId || !lessonId) return;
    let cancelled = false;
    fetch(`/api/lesson-progress?lessonId=${encodeURIComponent(lessonId)}`, { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : { locks: {} }))
      .then((d: any) => { if (!cancelled) setLocks(d?.locks ?? {}); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [lessonId, userId]);

  const onProgressChangeRef = useRef(onProgressChange);
  onProgressChangeRef.current = onProgressChange;
  const onAllCompletedChangeRef = useRef(onAllCompletedChange);
  onAllCompletedChangeRef.current = onAllCompletedChange;

  // 親が毎回新しいオブジェクトを渡しても、値が変わったときだけ読み込み直す
  const externalKey = TASK_KEYS.map((k) => (externalTaskStatus[k] ? "1" : "0")).join("");

  const publishProgress = (progress: LessonTaskProgress) => {
    onProgressChangeRef.current?.(progress);
    onAllCompletedChangeRef.current?.(Object.values(progress).every(Boolean));
  };

  useEffect(() => {
    let cancelled = false;
    async function fetchProgress() {
      if (!userId) return;
      try {
        const { data, error } = await supabase
          .from("edu_student_progress")
          .select("task_key, is_completed")
          .eq("user_id", userId)
          .eq("lesson_id", lessonId);
        if (error || !data || cancelled) return;

        const saved: LessonTaskProgress = { vocabulary: false, listening: false, reading: false, speaking: false, writing: false, culture: false };
        data.forEach((row: { task_key: string; is_completed: boolean }) => {
          if (row.task_key in saved) saved[row.task_key as LessonTaskKey] = row.is_completed;
        });

        // データベースの「完了」は、このページの値（最初はすべて false）で上書きしない
        const merged = { ...saved };
        TASK_KEYS.forEach((k) => {
          if (externalTaskStatus[k]) merged[k] = true;
        });

        // このページで新しく完了したタスクを保存する（次に開いたときに完了済みとして扱うため）
        // ライティングはサーバー（api）が保存するので、ここでは保存しない
        //    完了の記録はサーバー（/api/lesson-progress）だけが行う。宿題で学校時間中のタスクは記録されない
        const newlyCompleted = TASK_KEYS.filter((k) => k !== "writing" && externalTaskStatus[k] && !saved[k]);
        if (newlyCompleted.length > 0) {
          try {
            const res = await fetch("/api/lesson-progress", {
              method: "POST",
              credentials: "same-origin",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ lessonId, taskKeys: newlyCompleted }),
            });
            const result: any = await res.json().catch(() => ({}));
            const refused: Array<{ taskKey: string; until: string | null }> = Array.isArray(result?.locked) ? result.locked : [];
            if (refused.length) {
              // 記録されなかったタスクは「完了」にしない
              refused.forEach((r) => { if (r.taskKey in merged) merged[r.taskKey as LessonTaskKey] = false; });
              if (!cancelled) {
                setLocks((prev) => {
                  const next = { ...prev };
                  refused.forEach((r) => { next[r.taskKey as LessonTaskKey] = { locked: true, until: r.until }; });
                  return next;
                });
              }
            }
            if (!res.ok) console.error("Failed to save task completion:", result?.error);
          } catch (saveErr) {
            console.error("Failed to save task completion:", saveErr);
          }
        }

        if (cancelled) return;
        setTaskProgress(merged);
        publishProgress(merged);
      } catch (err) {
        console.error("Failed to fetch student progress:", err);
      }
    }

    fetchProgress();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, userId, externalKey]);

  const allTasksCompleted = Object.values(taskProgress).every(Boolean);

  return (
    <section aria-label="Lesson Tasks and Drills" className="space-y-6">
      
      {/* 黒板風のベースフレーム */}
      <div className="bg-[#23533b] dark:bg-[#1a3e2c] border-4 border-[#a06532] dark:border-[#744720] rounded-3xl p-6 sm:p-8 shadow-xl text-slate-50 space-y-6 relative overflow-hidden">
        
        {/* ヘッダーエリア */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-emerald-600/40 pb-6 relative z-10">
          <div>
            <h3 className="text-xl font-black text-emerald-100 flex items-center gap-2">
              <span>🏫</span>
              <span>Lesson Tasks & Practice Drills</span>
            </h3>
            <p className="text-xs sm:text-sm text-emerald-100/90 mt-1">
              Complete all six tasks to finish this lesson. Your progress is saved automatically each time you complete a task.
            </p>
          </div>
          <div className="text-right flex items-center gap-3">
            <span className={`text-xs font-bold px-4 py-2 rounded-xl border shadow-sm ${
              allTasksCompleted 
                ? "bg-emerald-300 text-slate-950 border-emerald-200" 
                : "bg-amber-400 text-slate-950 border-amber-300"
            }`}>
              {allTasksCompleted ? "🎉 All Tasks Completed!" : "⏳ In Progress"}
            </span>
          </div>
        </div>

        {/* 💡 宿題で、学校時間中はできないタスクがあるときの案内 */}
        {TASK_KEYS.some((k) => isLocked(k)) && (
          <div className="relative z-10 bg-amber-100 text-amber-900 border border-amber-300 rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold">
            🔒 Some tasks here are homework. Homework can&apos;t be done during school hours. Please come back{" "}
            {formatTime(TASK_KEYS.map((k) => locks[k]).find((l) => l?.locked)?.until ?? null)}.
          </div>
        )}

        {/* タスクカード群 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          
          {/* Task 1: 語彙ドリル */}
          <div className={`p-6 rounded-2xl border transition ${taskProgress.vocabulary ? 'bg-emerald-50/95 border-emerald-400 shadow-md' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold uppercase px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg">
                Task 1
              </span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${taskProgress.vocabulary ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                {taskProgress.vocabulary ? '✅ Completed' : isLocked('vocabulary') ? `🔒 Homework – ${formatTime(locks.vocabulary?.until ?? null)}` : '🔒 Not completed'}
              </span>
            </div>
            <h4 className="font-black text-slate-900 dark:text-slate-100 text-base mb-1">
              📖 Vocabulary Drill
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              Clear all four modes (Japanese → English, Audio → English, English → Japanese, and Speaking practice) to complete this task.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              {onStartVocabularyDrill && !isLocked('vocabulary') && (
                <button
                  type="button"
                  onClick={onStartVocabularyDrill}
                  className="py-2.5 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <span>🚀</span>
                  <span>Start Vocab Drill</span>
                </button>
              )}
            </div>
          </div>

          {/* Task 2: リスニングタスク */}
          <div className={`p-6 rounded-2xl border transition ${taskProgress.listening ? 'bg-emerald-50/95 border-emerald-400 shadow-md' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold uppercase px-2.5 py-1 bg-sky-100 text-sky-800 rounded-lg">
                Task 2
              </span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${taskProgress.listening ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                {taskProgress.listening ? '✅ Completed' : isLocked('listening') ? `🔒 Homework – ${formatTime(locks.listening?.until ?? null)}` : '🔒 Not completed'}
              </span>
            </div>
            <h4 className="font-black text-slate-900 dark:text-slate-100 text-base mb-1">
              🎧 Listening Task
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              Listen to short conversations and type your answers. Answer 5 questions correctly to complete this task.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              {onStartListeningDrill && !isLocked('listening') && (
                <button
                  type="button"
                  onClick={onStartListeningDrill}
                  className="py-2.5 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <span>🚀</span>
                  <span>Start Listening Task</span>
                </button>
              )}
            </div>
          </div>

          {/* Task 3: リーディングタスク */}
          <div className={`p-6 rounded-2xl border transition ${taskProgress.reading ? 'bg-emerald-50/95 border-emerald-400 shadow-md' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold uppercase px-2.5 py-1 bg-purple-100 text-purple-800 rounded-lg">
                Task 3
              </span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${taskProgress.reading ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                {taskProgress.reading ? '✅ Completed' : isLocked('reading') ? `🔒 Homework – ${formatTime(locks.reading?.until ?? null)}` : '🔒 Not completed'}
              </span>
            </div>
            <h4 className="font-black text-slate-900 dark:text-slate-100 text-base mb-1">
              📚 Reading Task
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              Read the Japanese on the screen aloud into your microphone, then type its meaning in English. Clear the drill to complete this task.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              {onStartReadingDrill && !isLocked('reading') && (
                <button
                  type="button"
                  onClick={onStartReadingDrill}
                  className="py-2.5 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <span>🚀</span>
                  <span>Start Reading Drill</span>
                </button>
              )}
            </div>
          </div>

          {/* Task 4: スピーキングタスク */}
          <div className={`p-6 rounded-2xl border transition ${taskProgress.speaking ? 'bg-emerald-50/95 border-emerald-400 shadow-md' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold uppercase px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg">
                Task 4
              </span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${taskProgress.speaking ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                {taskProgress.speaking ? '✅ Completed' : isLocked('speaking') ? `🔒 Homework – ${formatTime(locks.speaking?.until ?? null)}` : '🔒 Not completed'}
              </span>
            </div>
            <h4 className="font-black text-slate-900 dark:text-slate-100 text-base mb-1">
              🎤 Speaking Task
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              Have a question-and-answer voice conversation with AI Yamato. Finish the session to complete this task.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              {onStartSpeakingDrill && !isLocked('speaking') && (
                <button
                  type="button"
                  onClick={onStartSpeakingDrill}
                  className="py-2.5 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <span>🚀</span>
                  <span>Start Speaking Task</span>
                </button>
              )}
            </div>
          </div>

          {/* Task 5: ライティングタスク */}
          <div className={`p-6 rounded-2xl border transition ${taskProgress.writing ? 'bg-emerald-50/95 border-emerald-400 shadow-md' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold uppercase px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg">
                Task 5
              </span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${taskProgress.writing ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                {taskProgress.writing ? '✅ Completed' : isLocked('writing') ? `🔒 Homework – ${formatTime(locks.writing?.until ?? null)}` : '🔒 Not completed'}
              </span>
            </div>
            <h4 className="font-black text-slate-900 dark:text-slate-100 text-base mb-1">
              ✍️ Writing Task & AI Feedback
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              Write a message in Japanese for a reader (on paper and upload a photo, or on the digital genkō yōshi) and submit it. You complete this task when you receive a reply and feedback.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              {onStartWritingTask && !isLocked('writing') && (
                <button
                  type="button"
                  onClick={onStartWritingTask}
                  className="py-2.5 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <span>🚀</span>
                  <span>Start Writing Task</span>
                </button>
              )}
            </div>
          </div>

          {/* Task 6: 文化タスク */}
          <div className={`p-6 rounded-2xl border transition ${taskProgress.culture ? 'bg-emerald-50/95 border-emerald-400 shadow-md' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold uppercase px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg">
                Task 6
              </span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${taskProgress.culture ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                {taskProgress.culture ? '✅ Completed' : isLocked('culture') ? `🔒 Homework – ${formatTime(locks.culture?.until ?? null)}` : '🔒 Not completed'}
              </span>
            </div>
            <h4 className="font-black text-slate-900 dark:text-slate-100 text-base mb-1">
              🎎 Culture Task
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              Learn about Japanese culture through a picture story with narration and subtitles. Answer every Quick Check question correctly to complete this task.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              {onStartCultureTask && !isLocked('culture') && (
                <button
                  type="button"
                  onClick={onStartCultureTask}
                  className="py-2.5 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <span>🚀</span>
                  <span>Start Culture Task</span>
                </button>
              )}
            </div>
          </div>

        </div>

        {allTasksCompleted && (
          <div className="p-4 bg-amber-400 text-slate-950 rounded-2xl flex items-center justify-between shadow-lg animate-bounce relative z-10">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏆</span>
              <div>
                <h5 className="font-black text-sm">Congratulations! You have earned the lesson completion badge!</h5>
                <p className="text-xs text-slate-900 font-medium">You have completed all the tasks in this lesson.</p>
              </div>
            </div>
          </div>
        )}

      </div>
    </section>
  );
}
