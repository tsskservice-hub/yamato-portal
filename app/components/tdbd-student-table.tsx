/**
 * @file tdbd-student-table.tsx
 * @description 生徒別個別解放コントロールテーブル
 */
import React from 'react';
import type { Student } from '../hooks/tdbd-use-dashboard';

type TdbdStudentTableProps = {
  students: Student[];
  onToggleLock: (id: string) => void;
};

export default function TdbdStudentTable({
  students,
  onToggleLock,
}: TdbdStudentTableProps) {
  return (
    <div className="bg-white border border-slate-200 p-5 rounded-xl space-y-4 shadow-sm">
      <h2 className="font-bold text-slate-800 text-base">生徒別 個別解放コントロール</h2>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-left text-sm text-slate-700">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
            <tr>
              <th className="p-3.5 font-bold">生徒名</th>
              <th className="p-3.5 font-bold">進捗状況</th>
              <th className="p-3.5 font-bold">状態</th>
              <th className="p-3.5 font-bold text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map((student) => (
              <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="p-3.5 font-bold text-slate-900">{student.name}</td>
                <td className="p-3.5 text-slate-600">{student.progress}</td>
                <td className="p-3.5">
                  {student.isUnlocked ? (
                    <span className="text-emerald-700 text-xs bg-emerald-50 px-2.5 py-1 rounded-md font-bold border border-emerald-200">
                      🔓 個別解放中
                    </span>
                  ) : (
                    <span className="text-slate-500 text-xs bg-slate-100 px-2.5 py-1 rounded-md font-bold border border-slate-200">
                      🔒 ロック中
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
          </tbody>
        </table>
      </div>
    </div>
  );
}