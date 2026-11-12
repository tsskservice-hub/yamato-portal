/**
 * @file app/components/lessons/EduLessonTaskManager.tsx
 * @description レッスン内の各自習タスクの自動判定・進捗管理コンポーネント（タスクカード背景白版・リスニング＆リーディング＆スピーキング＆ライティング起動対応）
 */

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "~/lib/supabaseClient";

const TASK_KEYS = ["vocabulary", "listening", "reading", "speaking", "writing"] as const;

export type LessonTaskKey = "vocabulary" | "listening" | "reading" | "speaking" | "writing";
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
  externalTaskStatus?: {
    vocabulary?: boolean;
    listening?: boolean;
    reading?: boolean;
    speaking?: boolean;
    writing?: boolean;
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
  externalTaskStatus = {}
}: EduLessonTaskManagerProps) {
  const [taskProgress, setTaskProgress] = useState({
    vocabulary: false,
    listening: false,
    reading: false,
    speaking: false,
    writing: false,
  });

  const [isLoading, setIsLoading] = useState(false);

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

        const saved: LessonTaskProgress = { vocabulary: false, listening: false, reading: false, speaking: false, writing: false };
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
        const newlyCompleted = TASK_KEYS.filter((k) => k !== "writing" && externalTaskStatus[k] && !saved[k]);
        if (newlyCompleted.length > 0) {
          const now = new Date().toISOString();
          const { error: upsertError } = await supabase.from("edu_student_progress").upsert(
            newlyCompleted.map((k) => ({ user_id: userId, lesson_id: lessonId, task_key: k, is_completed: true, updated_at: now })),
            { onConflict: "user_id,lesson_id,task_key" }
          );
          if (upsertError) console.error("Failed to save task completion:", upsertError);
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

  const updateTaskStatus = async (taskKey: keyof typeof taskProgress, isCompleted: boolean) => {
    const updated = {
      ...taskProgress,
      [taskKey]: isCompleted,
    };
    
    setTaskProgress(updated);
    publishProgress(updated);

    if (userId) {
      setIsLoading(true);
      try {
        await supabase
          .from("edu_student_progress")
          .upsert(
            {
              user_id: userId,
              lesson_id: lessonId,
              task_key: taskKey,
              is_completed: isCompleted,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,lesson_id,task_key" }
          );
      } catch (err) {
        console.error("Exception during progress upsert:", err);
      } finally {
        setIsLoading(false);
      }
    }
  };

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
              <span>Lesson Tasks & Practice Drills (学習タスク管理)</span>
            </h3>
            <p className="text-xs sm:text-sm text-emerald-100/90 mt-1">
              各ドリルへの挑戦、クイズの合格、および Yamato Sensei との添削完了時に自動で進捗が記録されます。
            </p>
          </div>
          <div className="text-right flex items-center gap-3">
            {isLoading && (
              <span className="text-xs text-emerald-200 animate-pulse">Syncing...</span>
            )}
            <span className={`text-xs font-bold px-4 py-2 rounded-xl border shadow-sm ${
              allTasksCompleted 
                ? "bg-emerald-300 text-slate-950 border-emerald-200" 
                : "bg-amber-400 text-slate-950 border-amber-300"
            }`}>
              {allTasksCompleted ? "🎉 All Tasks Completed!" : "⏳ 学習進行中"}
            </span>
          </div>
        </div>

        {/* タスクカード群 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          
          {/* Task 1: 語彙ドリル */}
          <div className={`p-6 rounded-2xl border transition ${taskProgress.vocabulary ? 'bg-emerald-50/95 border-emerald-400 shadow-md' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold uppercase px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg">
                Task 1
              </span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${taskProgress.vocabulary ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                {taskProgress.vocabulary ? '✅ 達成済み (Completed)' : '🔒 未達成'}
              </span>
            </div>
            <h4 className="font-black text-slate-900 dark:text-slate-100 text-base mb-1">
              📖 Vocabulary Drill (語彙確認)
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              4つのモード（日→英、音声→英、英→日、発声練習）の語彙ドリルをクリアすると自動で完了になります。
            </p>

            <div className="flex flex-wrap items-center gap-4">
              {onStartVocabularyDrill && (
                <button
                  type="button"
                  onClick={onStartVocabularyDrill}
                  className="py-2.5 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <span>🚀</span>
                  <span>Start Vocab Drill (ドリル開始)</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => updateTaskStatus("vocabulary", !taskProgress.vocabulary)}
                className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline font-semibold"
              >
                [開発用] 状態切替
              </button>
            </div>
          </div>

          {/* Task 2: リスニングタスク */}
          <div className={`p-6 rounded-2xl border transition ${taskProgress.listening ? 'bg-emerald-50/95 border-emerald-400 shadow-md' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold uppercase px-2.5 py-1 bg-sky-100 text-sky-800 rounded-lg">
                Task 2
              </span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${taskProgress.listening ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                {taskProgress.listening ? '✅ 達成済み (Completed)' : '🔒 未達成'}
              </span>
            </div>
            <h4 className="font-black text-slate-900 dark:text-slate-100 text-base mb-1">
              🎧 Listening Task (リスニング確認)
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              「何人家族ですか」の会話を聞いて、人数をタイピングで答える問題を5問クリアすると完了になります。
            </p>

            <div className="flex flex-wrap items-center gap-4">
              {onStartListeningDrill && (
                <button
                  type="button"
                  onClick={onStartListeningDrill}
                  className="py-2.5 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <span>🚀</span>
                  <span>Start Listening Task (リスニング開始)</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => updateTaskStatus("listening", !taskProgress.listening)}
                className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline font-semibold"
              >
                [開発用] 状態切替
              </button>
            </div>
          </div>

          {/* Task 3: リーディングタスク */}
          <div className={`p-6 rounded-2xl border transition ${taskProgress.reading ? 'bg-emerald-50/95 border-emerald-400 shadow-md' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold uppercase px-2.5 py-1 bg-purple-100 text-purple-800 rounded-lg">
                Task 3
              </span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${taskProgress.reading ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                {taskProgress.reading ? '✅ 達成済み (Completed)' : '🔒 未達成'}
              </span>
            </div>
            <h4 className="font-black text-slate-900 dark:text-slate-100 text-base mb-1">
              📚 Reading Task (リーディング読解・発話確認)
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              画面の日本語をマイクに向かって発声し、意味を英語でタイピング入力するデュアルチェックドリルをクリアすると完了になります。
            </p>

            <div className="flex flex-wrap items-center gap-4">
              {onStartReadingDrill && (
                <button
                  type="button"
                  onClick={onStartReadingDrill}
                  className="py-2.5 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <span>🚀</span>
                  <span>Start Reading Drill (リーディング開始)</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => updateTaskStatus("reading", !taskProgress.reading)}
                className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline font-semibold"
              >
                [開発用] 状態切替
              </button>
            </div>
          </div>

          {/* Task 4: スピーキングタスク */}
          <div className={`p-6 rounded-2xl border transition ${taskProgress.speaking ? 'bg-emerald-50/95 border-emerald-400 shadow-md' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold uppercase px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg">
                Task 4
              </span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${taskProgress.speaking ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                {taskProgress.speaking ? '✅ 達成済み (Completed)' : '🔒 未達成'}
              </span>
            </div>
            <h4 className="font-black text-slate-900 dark:text-slate-100 text-base mb-1">
              🎤 Speaking Task (AI音声会話)
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              AI Yamato との一問一答音声会話セッション（モーダル）を完了すると自動で記録されます。
            </p>

            <div className="flex flex-wrap items-center gap-4">
              {onStartSpeakingDrill && (
                <button
                  type="button"
                  onClick={onStartSpeakingDrill}
                  className="py-2.5 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <span>🚀</span>
                  <span>Start Speaking Task (スピーキング開始)</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => updateTaskStatus("speaking", !taskProgress.speaking)}
                className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline font-semibold"
              >
                [開発用] 状態切替
              </button>
            </div>
          </div>

        </div>

        {/* Task 5: ライティングタスク（ワイド表示） */}
        <div className={`p-6 rounded-2xl border transition relative z-10 ${taskProgress.writing ? 'bg-emerald-50/95 border-emerald-400 shadow-md' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold uppercase px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg">
              Task 5
            </span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${taskProgress.writing ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
              {taskProgress.writing ? '✅ 達成済み (Completed)' : '🔒 未達成'}
            </span>
          </div>
          <h4 className="font-black text-slate-900 dark:text-slate-100 text-base mb-1">
            ✍️ Writing Task & AI Feedback (作文・添削)
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
            相手に伝えるためのメッセージを日本語で手書き（紙＋写真、またはデジタル原稿用紙）して提出します。読み手からの返事とフィードバックを受け取ると達成になります。
          </p>

          <div className="flex flex-wrap items-center gap-4 mb-4">
            {onStartWritingTask && (
              <button
                type="button"
                onClick={onStartWritingTask}
                className="py-2.5 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
              >
                <span>🚀</span>
                <span>Start Writing Task (ライティング開始)</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => updateTaskStatus("writing", !taskProgress.writing)}
              className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline font-semibold"
            >
              [開発用] 状態切替
            </button>
          </div>
          
          {allTasksCompleted && (
            <div className="p-4 bg-amber-400 text-slate-950 rounded-2xl flex items-center justify-between shadow-lg animate-bounce mt-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🏆</span>
                <div>
                  <h5 className="font-black text-sm">おめでとうございます！ユニット修了バッジ獲得！</h5>
                  <p className="text-xs text-slate-900 font-medium">すべての学習タスクをシステム判定によりクリアしました。</p>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </section>
  );
}
