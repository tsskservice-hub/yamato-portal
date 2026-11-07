/**
 * @file app/components/lessons/EduLessonTaskManager.tsx
 * @description レッスン内の各自習タスクの自動判定・進捗管理コンポーネント（ドリル起動ボタン連携版）
 */

import React, { useState, useEffect } from "react";
import { supabase } from "~/lib/supabaseClient";

export interface EduLessonTaskManagerProps {
  lessonId: string; // レッスンID
  userId?: string;  // ユーザーID
  onAllCompletedChange?: (completed: boolean) => void;
  onStartVocabularyDrill?: () => void; // 👈 語彙ドリルモーダルを開くためのコールバックを追加
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
  onStartVocabularyDrill,
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

  useEffect(() => {
    async function fetchProgress() {
      if (!userId) return;
      try {
        const { data, error } = await supabase
          .from("edu_student_progress")
          .select("task_key, is_completed")
          .eq("user_id", userId)
          .eq("lesson_id", lessonId);

        if (!error && data) {
          const loadedProgress = {
            vocabulary: false,
            listening: false,
            reading: false,
            speaking: false,
            writing: false,
          };

          data.forEach((row: { task_key: string; is_completed: boolean }) => {
            if (row.task_key in loadedProgress) {
              (loadedProgress as any)[row.task_key] = row.is_completed;
            }
          });

          const merged = {
            ...loadedProgress,
            ...externalTaskStatus,
          };

          setTaskProgress(merged);
          const allDone = Object.values(merged).every(Boolean);
          if (onAllCompletedChange) {
            onAllCompletedChange(allDone);
          }
        }
      } catch (err) {
        console.error("Failed to fetch student progress:", err);
      }
    }

    fetchProgress();
  }, [lessonId, userId, externalTaskStatus]);

  const updateTaskStatus = async (taskKey: keyof typeof taskProgress, isCompleted: boolean) => {
    const updated = {
      ...taskProgress,
      [taskKey]: isCompleted,
    };
    
    setTaskProgress(updated);
    
    const allDone = Object.values(updated).every(Boolean);
    if (onAllCompletedChange) {
      onAllCompletedChange(allDone);
    }

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
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
            🎯 Lesson Tasks & Practice Drills (自動達成管理)
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            各ドリルへの挑戦、クイズの合格、および Yamato Sensei との添削完了時に自動で進捗が記録されます。
          </p>
        </div>
        <div className="text-right flex items-center gap-3">
          {isLoading && (
            <span className="text-xs text-slate-400 animate-pulse">Syncing...</span>
          )}
          <span className={`text-xs font-bold px-4 py-2 rounded-xl border ${
            allTasksCompleted 
              ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800" 
              : "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900"
          }`}>
            {allTasksCompleted ? "🎉 All Tasks Completed!" : "⏳ 学習進行中"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Task 1: 語彙ドリル（ここにドリル起動ボタンを配置） */}
        <div className={`p-6 rounded-3xl border transition ${taskProgress.vocabulary ? 'bg-emerald-50/50 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-800' : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold uppercase px-2.5 py-1 bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 rounded-lg">
              Task 1
            </span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${taskProgress.vocabulary ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
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
                className="py-2.5 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-sm transition flex items-center gap-2 cursor-pointer"
              >
                <span>🚀</span>
                <span>Start Vocab Drill (ドリル開始)</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => updateTaskStatus("vocabulary", !taskProgress.vocabulary)}
              className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline"
            >
              [開発用] 状態切替
            </button>
          </div>
        </div>

        {/* Task 2: リスニングタスク */}
        <div className={`p-6 rounded-3xl border transition ${taskProgress.listening ? 'bg-emerald-50/50 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-800' : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold uppercase px-2.5 py-1 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 rounded-lg">
              Task 2
            </span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${taskProgress.listening ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
              {taskProgress.listening ? '✅ 達成済み (Completed)' : '🔒 未達成'}
            </span>
          </div>
          <h4 className="font-black text-slate-900 dark:text-slate-100 text-base mb-1">
            🎧 Listening Task (リスニング確認)
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
            音声を聞いて内容理解クイズに正解すると自動で完了になります。
          </p>
          <button
            type="button"
            onClick={() => updateTaskStatus("listening", !taskProgress.listening)}
            className="text-[11px] text-blue-600 dark:text-blue-400 font-bold hover:underline"
          >
            [開発・テスト用] 状態を切り替える
          </button>
        </div>

        {/* Task 3: リーディングタスク */}
        <div className={`p-6 rounded-3xl border transition ${taskProgress.reading ? 'bg-emerald-50/50 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-800' : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold uppercase px-2.5 py-1 bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 rounded-lg">
              Task 3
            </span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${taskProgress.reading ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
              {taskProgress.reading ? '✅ 達成済み (Completed)' : '🔒 未達成'}
            </span>
          </div>
          <h4 className="font-black text-slate-900 dark:text-slate-100 text-base mb-1">
            📚 Reading Task (長文読解)
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
            リーディングパッセージの読了チェックを通過すると完了になります。
          </p>
          <button
            type="button"
            onClick={() => updateTaskStatus("reading", !taskProgress.reading)}
            className="text-[11px] text-purple-600 dark:text-purple-400 font-bold hover:underline"
          >
            [開発・テスト用] 状態を切り替える
          </button>
        </div>

        {/* Task 4: スピーキングタスク */}
        <div className={`p-6 rounded-3xl border transition ${taskProgress.speaking ? 'bg-emerald-50/50 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-800' : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold uppercase px-2.5 py-1 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded-lg">
              Task 4
            </span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${taskProgress.speaking ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
              {taskProgress.speaking ? '✅ 達成済み (Completed)' : '🔒 未達成'}
            </span>
          </div>
          <h4 className="font-black text-slate-900 dark:text-slate-100 text-base mb-1">
            🎤 Speaking Task (AI音声会話)
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
            上部の Yamato Sensei と音声またはチャットで会話セッションを完了すると自動で記録されます。
          </p>
          <button
            type="button"
            onClick={() => updateTaskStatus("speaking", !taskProgress.speaking)}
            className="text-[11px] text-amber-600 dark:text-amber-400 font-bold hover:underline"
          >
            [開発・テスト用] 状態を切り替える
          </button>
        </div>

      </div>

      {/* Task 5: ライティングタスク */}
      <div className={`p-6 rounded-3xl border transition ${taskProgress.writing ? 'bg-emerald-50/50 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-800' : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800 shadow-sm'}`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-extrabold uppercase px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-lg">
            Task 5
          </span>
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${taskProgress.writing ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
            {taskProgress.writing ? '✅ 達成済み (Completed)' : '🔒 未達成'}
          </span>
        </div>
        <h4 className="font-black text-slate-900 dark:text-slate-100 text-base mb-1">
          ✍️ Writing Task & AI Feedback (作文・添削)
        </h4>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
          上部のチャットで作文を提出し、Yamato Sensei から添削フィードバックを受けた際に自動で達成となります。
        </p>

        <div className="mb-4">
          <button
            type="button"
            onClick={() => updateTaskStatus("writing", !taskProgress.writing)}
            className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
          >
            [開発・テスト用] 状態を切り替える
          </button>
        </div>
        
        {allTasksCompleted && (
          <div className="p-4 bg-emerald-500 text-white rounded-2xl flex items-center justify-between shadow-md animate-bounce">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏆</span>
              <div>
                <h5 className="font-black text-sm">おめでとうございます！ユニット修了バッジ獲得！</h5>
                <p className="text-xs text-emerald-100">すべての学習タスクをシステム判定によりクリアしました。</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}