/**
 * @file app/components/lessons/EduLessonTaskManager.tsx
 * @description レッスン内の各自習タスクの自動判定・進捗管理コンポーネント（黒板風デザイン対応版）
 */

import React, { useState, useEffect } from "react";
import { supabase } from "~/lib/supabaseClient";

export interface EduLessonTaskManagerProps {
  lessonId: string; // レッスンID
  userId?: string;  // ユーザーID
  onAllCompletedChange?: (completed: boolean) => void;
  onStartVocabularyDrill?: () => void;
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
      
      {/* 黒板風の外枠コンテナ（木目調を意識したブラウンのボーダーと深いグリーン背景） */}
      <div className="bg-[#1b3b2b] dark:bg-[#12261c] border-4 border-[#8B5A2B] dark:border-[#5c3a1c] rounded-3xl p-6 sm:p-8 shadow-xl text-slate-100 space-y-6 relative overflow-hidden">
        
        {/* チョークの粉っぽさを演出する微かなグラデーションやハイライト */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />

        {/* ヘッダーエリア */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-emerald-800/60 pb-6 relative z-10">
          <div>
            <h3 className="text-xl font-black text-emerald-100 flex items-center gap-2">
              <span>🏫</span>
              <span>Lesson Tasks & Practice Drills (黒板タスク管理)</span>
            </h3>
            <p className="text-xs sm:text-sm text-emerald-200/80 mt-1">
              各ドリルへの挑戦、クイズの合格、および Yamato Sensei との添削完了時に自動で進捗が記録されます。
            </p>
          </div>
          <div className="text-right flex items-center gap-3">
            {isLoading && (
              <span className="text-xs text-emerald-300 animate-pulse">Syncing...</span>
            )}
            <span className={`text-xs font-bold px-4 py-2 rounded-xl border shadow-sm ${
              allTasksCompleted 
                ? "bg-emerald-400 text-slate-950 border-emerald-300" 
                : "bg-amber-500/20 text-amber-200 border-amber-400/40"
            }`}>
              {allTasksCompleted ? "🎉 All Tasks Completed!" : "⏳ 学習進行中"}
            </span>
          </div>
        </div>

        {/* タスクカード群（黒板になじむチョークホワイトとダークグリーンのカード） */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          
          {/* Task 1: 語彙ドリル */}
          <div className={`p-6 rounded-2xl border transition ${taskProgress.vocabulary ? 'bg-[#234835] border-emerald-500 shadow-md' : 'bg-[#163224] border-emerald-800/80 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold uppercase px-2.5 py-1 bg-amber-500/30 text-amber-200 rounded-lg border border-amber-500/40">
                Task 1
              </span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${taskProgress.vocabulary ? 'bg-emerald-500 text-slate-950' : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'}`}>
                {taskProgress.vocabulary ? '✅ 達成済み (Completed)' : '🔒 未達成'}
              </span>
            </div>
            <h4 className="font-black text-white text-base mb-1">
              📖 Vocabulary Drill (語彙確認)
            </h4>
            <p className="text-xs text-emerald-100/80 leading-relaxed mb-4">
              4つのモード（日→英、音声→英、英→日、発声練習）の語彙ドリルをクリアすると自動で完了になります。
            </p>

            <div className="flex flex-wrap items-center gap-4">
              {onStartVocabularyDrill && (
                <button
                  type="button"
                  onClick={onStartVocabularyDrill}
                  className="py-2.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <span>🚀</span>
                  <span>Start Vocab Drill (ドリル開始)</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => updateTaskStatus("vocabulary", !taskProgress.vocabulary)}
                className="text-[11px] text-emerald-300/70 hover:text-emerald-200 underline"
              >
                [開発用] 状態切替
              </button>
            </div>
          </div>

          {/* Task 2: リスニングタスク */}
          <div className={`p-6 rounded-2xl border transition ${taskProgress.listening ? 'bg-[#234835] border-emerald-500 shadow-md' : 'bg-[#163224] border-emerald-800/80 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold uppercase px-2.5 py-1 bg-blue-500/30 text-blue-200 rounded-lg border border-blue-500/40">
                Task 2
              </span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${taskProgress.listening ? 'bg-emerald-500 text-slate-950' : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'}`}>
                {taskProgress.listening ? '✅ 達成済み (Completed)' : '🔒 未達成'}
              </span>
            </div>
            <h4 className="font-black text-white text-base mb-1">
              🎧 Listening Task (リスニング確認)
            </h4>
            <p className="text-xs text-emerald-100/80 leading-relaxed mb-4">
              音声を聞いて内容理解クイズに正解すると自動で完了になります。
            </p>
            <button
              type="button"
              onClick={() => updateTaskStatus("listening", !taskProgress.listening)}
              className="text-[11px] text-emerald-300/70 hover:text-emerald-200 font-bold underline"
            >
              [開発・テスト用] 状態を切り替える
            </button>
          </div>

          {/* Task 3: リーディングタスク */}
          <div className={`p-6 rounded-2xl border transition ${taskProgress.reading ? 'bg-[#234835] border-emerald-500 shadow-md' : 'bg-[#163224] border-emerald-800/80 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold uppercase px-2.5 py-1 bg-purple-500/30 text-purple-200 rounded-lg border border-purple-500/40">
                Task 3
              </span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${taskProgress.reading ? 'bg-emerald-500 text-slate-950' : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'}`}>
                {taskProgress.reading ? '✅ 達成済み (Completed)' : '🔒 未達成'}
              </span>
            </div>
            <h4 className="font-black text-white text-base mb-1">
              📚 Reading Task (長文読解)
            </h4>
            <p className="text-xs text-emerald-100/80 leading-relaxed mb-4">
              リーディングパッセージの読了チェックを通過すると完了になります。
            </p>
            <button
              type="button"
              onClick={() => updateTaskStatus("reading", !taskProgress.reading)}
              className="text-[11px] text-emerald-300/70 hover:text-emerald-200 font-bold underline"
            >
              [開発・テスト用] 状態を切り替える
            </button>
          </div>

          {/* Task 4: スピーキングタスク */}
          <div className={`p-6 rounded-2xl border transition ${taskProgress.speaking ? 'bg-[#234835] border-emerald-500 shadow-md' : 'bg-[#163224] border-emerald-800/80 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold uppercase px-2.5 py-1 bg-amber-500/30 text-amber-200 rounded-lg border border-amber-500/40">
                Task 4
              </span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${taskProgress.speaking ? 'bg-emerald-500 text-slate-950' : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'}`}>
                {taskProgress.speaking ? '✅ 達成済み (Completed)' : '🔒 未達成'}
              </span>
            </div>
            <h4 className="font-black text-white text-base mb-1">
              🎤 Speaking Task (AI音声会話)
            </h4>
            <p className="text-xs text-emerald-100/80 leading-relaxed mb-4">
              上部の Yamato Sensei と音声またはチャットで会話セッションを完了すると自動で記録されます。
            </p>
            <button
              type="button"
              onClick={() => updateTaskStatus("speaking", !taskProgress.speaking)}
              className="text-[11px] text-emerald-300/70 hover:text-emerald-200 font-bold underline"
            >
              [開発・テスト用] 状態を切り替える
            </button>
          </div>

        </div>

        {/* Task 5: ライティングタスク（ワイド表示） */}
        <div className={`p-6 rounded-2xl border transition relative z-10 ${taskProgress.writing ? 'bg-[#234835] border-emerald-500 shadow-md' : 'bg-[#163224] border-emerald-800/80 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold uppercase px-2.5 py-1 bg-emerald-500/30 text-emerald-200 rounded-lg border border-emerald-500/40">
              Task 5
            </span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${taskProgress.writing ? 'bg-emerald-500 text-slate-950' : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'}`}>
              {taskProgress.writing ? '✅ 達成済み (Completed)' : '🔒 未達成'}
            </span>
          </div>
          <h4 className="font-black text-white text-base mb-1">
            ✍️ Writing Task & AI Feedback (作文・添削)
          </h4>
          <p className="text-xs text-emerald-100/80 leading-relaxed mb-4">
            上部のチャットで作文を提出し、Yamato Sensei から添削フィードバックを受けた際に自動で達成となります。
          </p>

          <div className="mb-4">
            <button
              type="button"
              onClick={() => updateTaskStatus("writing", !taskProgress.writing)}
              className="text-[11px] text-emerald-300/70 hover:text-emerald-200 font-bold underline"
            >
              [開発・テスト用] 状態を切り替える
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