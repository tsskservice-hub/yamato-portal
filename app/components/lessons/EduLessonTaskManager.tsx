/**
 * @file app/components/lessons/EduLessonTaskManager.tsx
 * @description レッスン内の各自習タスク（語彙、リスニング、リーディング、スピーキング、ライティング）と修了バッジ管理コンポーネント
 */

import React, { useState, useEffect } from "react";
import { supabase } from "~/lib/supabaseClient"; // 💡 共通の安全なクライアントをインポート

export interface EduLessonTaskManagerProps {
  lessonId: string; // どのレッスンかを識別するためのID
  userId?: string;  // 生徒のユーザーID（省略時はセッション等から取得または仮対応）
  onAllCompletedChange?: (completed: boolean) => void;
}

export function EduLessonTaskManager({ lessonId, userId, onAllCompletedChange }: EduLessonTaskManagerProps) {
  const [taskProgress, setTaskProgress] = useState({
    vocabulary: false,
    listening: false,
    reading: false,
    speaking: false,
    writing: false,
  });

  const [isLoading, setIsLoading] = useState(false);

  // マウント時に Supabase から現在の進捗状況をロードする
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

          setTaskProgress(loadedProgress);
          const allDone = Object.values(loadedProgress).every(Boolean);
          if (onAllCompletedChange) {
            onAllCompletedChange(allDone);
          }
        }
      } catch (err) {
        console.error("Failed to fetch student progress:", err);
      }
    }

    fetchProgress();
  }, [lessonId, userId]);

  const toggleTask = async (taskKey: keyof typeof taskProgress) => {
    const nextValue = !taskProgress[taskKey];
    const updated = {
      ...taskProgress,
      [taskKey]: nextValue,
    };
    
    // 楽観的UI更新
    setTaskProgress(updated);
    
    const allDone = Object.values(updated).every(Boolean);
    if (onAllCompletedChange) {
      onAllCompletedChange(allDone);
    }

    // Supabase へ保存 (upsert)
    if (userId) {
      setIsLoading(true);
      try {
        const { error } = await supabase
          .from("edu_student_progress")
          .upsert(
            {
              user_id: userId,
              lesson_id: lessonId,
              task_key: taskKey,
              is_completed: nextValue,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,lesson_id,task_key" }
          );

        if (error) {
          console.error("Failed to update task progress in Supabase:", error.message);
        }
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
            🎯 Lesson Tasks & Practice Drills
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Complete all tasks below to master this lesson and earn your Unit Completion Badge!
          </p>
        </div>
        <div className="text-right flex items-center gap-3">
          {isLoading && (
            <span className="text-xs text-slate-400 animate-pulse">Saving...</span>
          )}
          <span className={`text-xs font-bold px-4 py-2 rounded-xl border ${
            allTasksCompleted 
              ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800" 
              : "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900"
          }`}>
            {allTasksCompleted ? "🎉 All Tasks Completed!" : "⏳ In Progress"}
          </span>
        </div>
      </div>

      {/* タスクカード群グリッド */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 語彙ドリルタスク */}
        <div className={`p-6 rounded-3xl border transition ${taskProgress.vocabulary ? 'bg-emerald-50/50 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-800' : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold uppercase px-2.5 py-1 bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 rounded-lg">
              Task 1
            </span>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
              <input 
                type="checkbox" 
                checked={taskProgress.vocabulary}
                onChange={() => toggleTask("vocabulary")}
                className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500"
              />
              Mark as Done
            </label>
          </div>
          <h4 className="font-black text-slate-900 dark:text-slate-100 text-base mb-1">
            📖 Vocabulary Drill (語彙ドリル)
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Review the vocabulary sidebar, check meanings & pronunciation of family members (お父さん, お母さん) and counters (ひとり, ふたり).
          </p>
        </div>

        {/* リスニングタスク */}
        <div className={`p-6 rounded-3xl border transition ${taskProgress.listening ? 'bg-emerald-50/50 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-800' : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold uppercase px-2.5 py-1 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 rounded-lg">
              Task 2
            </span>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
              <input 
                type="checkbox" 
                checked={taskProgress.listening}
                onChange={() => toggleTask("listening")}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              Mark as Done
            </label>
          </div>
          <h4 className="font-black text-slate-900 dark:text-slate-100 text-base mb-1">
            🎧 Listening Task (リスニングタスク)
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Listen to audio samples of family size questions ("なんにんかぞくですか") and answer comprehension check questions.
          </p>
        </div>

        {/* リーディングタスク */}
        <div className={`p-6 rounded-3xl border transition ${taskProgress.reading ? 'bg-emerald-50/50 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-800' : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold uppercase px-2.5 py-1 bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 rounded-lg">
              Task 3
            </span>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
              <input 
                type="checkbox" 
                checked={taskProgress.reading}
                onChange={() => toggleTask("reading")}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
              />
              Mark as Done
            </label>
          </div>
          <h4 className="font-black text-slate-900 dark:text-slate-100 text-base mb-1">
            📚 Reading Task (リーディングタスク)
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Read short passages introducing family members linked with the particle "to" and identify correct family structures.
          </p>
        </div>

        {/* スピーキングタスク */}
        <div className={`p-6 rounded-3xl border transition ${taskProgress.speaking ? 'bg-emerald-50/50 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-800' : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold uppercase px-2.5 py-1 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded-lg">
              Task 4
            </span>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
              <input 
                type="checkbox" 
                checked={taskProgress.speaking}
                onChange={() => toggleTask("speaking")}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
              />
              Mark as Done
            </label>
          </div>
          <h4 className="font-black text-slate-900 dark:text-slate-100 text-base mb-1">
            🎤 Speaking Task (スピーキングタスク)
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Practice speaking aloud with Yamato Sensei above. Describe your family size and members using proper counters (人).
          </p>
        </div>

      </div>

      {/* ライティングタスク（ワイド表示） */}
      <div className={`p-6 rounded-3xl border transition ${taskProgress.writing ? 'bg-emerald-50/50 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-800' : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800 shadow-sm'}`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-extrabold uppercase px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-lg">
            Task 5
          </span>
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
            <input 
              type="checkbox" 
              checked={taskProgress.writing}
              onChange={() => toggleTask("writing")}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
            />
            Mark as Done
          </label>
        </div>
        <h4 className="font-black text-slate-900 dark:text-slate-100 text-base mb-1">
          ✍️ Writing Task & AI Feedback (ライティングタスク)
        </h4>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
          Write a short paragraph about your family and pets. Use the chat window above to upload a photo of your handwritten work or paste your text for Yamato Sensei's immediate correction and feedback!
        </p>
        
        {allTasksCompleted && (
          <div className="p-4 bg-emerald-500 text-white rounded-2xl flex items-center justify-between shadow-md animate-bounce">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏆</span>
              <div>
                <h5 className="font-black text-sm">Congratulations! Unit Completion Badge Earned!</h5>
                <p className="text-xs text-emerald-100">You have successfully mastered all tasks in this lesson.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}