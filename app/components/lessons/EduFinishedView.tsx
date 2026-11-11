/**
 * @file app/components/lessons/EduFinishedView.tsx
 * @description 各種学習タスク（スピーキング、リーディング、リスニング等）の完了画面
 */

import React from "react";

interface EduFinishedViewProps {
  /** 完了したタスクの名称や内容（例: "speaking practice rounds", "reading task"） */
  taskName?: string;
  /** 表示するカスタムメッセージ */
  description?: string;
  /** 閉じるボタンが押された時のハンドラー */
  onClose: () => void;
}

export const EduFinishedView: React.FC<EduFinishedViewProps> = ({
  taskName = "practice rounds",
  description = "Fantastic effort. Your progress has been saved and this task is now marked as complete.",
  onClose,
}) => {
  return (
    <div className="text-center space-y-6 py-12 flex-1 flex flex-col justify-center items-center animate-fade-in">
      <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-3xl flex items-center justify-center text-5xl font-black shadow-inner">
        🎉
      </div>
      <div className="space-y-3 max-w-md">
        <h4 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
          Congratulations!
        </h4>
        <p className="text-base sm:text-lg font-bold text-orange-600 dark:text-orange-400">
          You have successfully mastered all {taskName}!
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {description}
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="py-4 px-12 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-base transition shadow-lg hover:shadow-orange-500/25 active:scale-95 cursor-pointer"
      >
        Complete & Return to Lesson ➔
      </button>
    </div>
  );
};

export default EduFinishedView;