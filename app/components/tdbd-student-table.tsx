/**
 * @file tdbd-student-table.tsx
 * @description 生徒別個別解放コントロールテーブル（各タスク進捗状況の視覚的表示対応）
 */
import React from 'react';
import type { Student } from '../hooks/tdbd-use-dashboard';

export interface StudentProgressItem {
  user_id?: string | null;
  lesson_id?: string | null;
  task_key?: string | null;
  is_completed?: boolean;
  updated_at?: string | null;
}

export type TdbdStudentTableProps = {
  students: Student[];
  studentProgress?: StudentProgressItem[];
  onToggleLock: (id: string) => void;
};

export default function TdbdStudentTable({
  students,
  studentProgress = [],
  onToggleLock,
}: TdbdStudentTableProps) {
  // 指定した生徒・指定したタスクの完了状態を取得するヘルパー
  const getTaskStatusIcon = (studentId: string, taskKey: string) => {
    const record = studentProgress.find(
      (p) => p.user_id === studentId && p.task_key === taskKey
    );
    return record?.is_completed ? "✅" : "⏳";
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl space-y-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h2 className="font-bold text-slate-800 dark:text-slate-100 text-base">
          生徒別 個別解放 & タスク進捗トラッカー
        </h2>
        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3">
          <span>完了</span>
          <span>進行中/未着手</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="p-3.5 font-bold">生徒名 / アカウント</th>
              <th className="p-3.5 font-bold text-center">語彙 (Vocab)</th>
              <th className="p-3.5 font-bold text-center">リスニング</th>
              <th className="p-3.5 font-bold text-center">リーディング</th>
              <th className="p-3.5 font-bold text-center">スピーキング</th>
              <th className="p-3.5 font-bold text-center">ライティング</th>
              <th className="p-3.5 font-bold">状態</th>
              <th className="p-3.5 font-bold text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {students.map((student) => (
              <tr key={student.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                <td className="p-3.5 font-bold text-slate-900 dark:text-slate-100">
                  {student.name}
                </td>
                
                {/* 5つのタスク進捗アイコン表示 */}
                <td className="p-3.5 text-center text-base" title="Vocabulary Drill">
                  {getTaskStatusIcon(student.id, "vocabulary")}
                </td>
                <td className="p-3.5 text-center text-base" title="Listening Task">
                  {getTaskStatusIcon(student.id, "listening")}
                </td>
                <td className="p-3.5 text-center text-base" title="Reading Task">
                  {getTaskStatusIcon(student.id, "reading")}
                </td>
                <td className="p-3.5 text-center text-base" title="Speaking Task">
                  {getTaskStatusIcon(student.id, "speaking")}
                </td>
                <td className="p-3.5 text-center text-base" title="Writing Task & AI Feedback">
                  {getTaskStatusIcon(student.id, "writing")}
                </td>

                <td className="p-3.5">
                  {student.isUnlocked ? (
                    <span className="text-emerald-700 dark:text-emerald-300 text-xs bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md font-bold border border-emerald-200 dark:border-emerald-800">
                      個別解放中
                    </span>
                  ) : (
                    <span className="text-slate-500 dark:text-slate-400 text-xs bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md font-bold border border-slate-200 dark:border-slate-700">
                      ロック中
                    </span>
                  )}
                </td>
                <td className="p-3.5 text-right">
                  <button
                    type="button"
                    onClick={() => onToggleLock(student.id)}
                    className={`text-xs px-3.5 py-1.5 rounded-lg font-bold transition cursor-pointer shadow-2xs ${
                      student.isUnlocked
                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {student.isUnlocked ? 'ロックする' : '個別に解放する'}
                  </button>
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400">
                  登録されている生徒がいません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}