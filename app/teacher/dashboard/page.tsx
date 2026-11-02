'client';
import React, { useState } from 'react';

const INITIAL_STUDENTS = [
  { id: 's1', name: 'Liam Smith', progress: 'Lesson 5 完了', isUnlocked: false },
  { id: 's2', name: 'Charlotte Brown', progress: 'Lesson 3 進行中', isUnlocked: false },
  { id: 's3', name: 'Noah Davis', progress: 'Lesson 5 完了', isUnlocked: true },
  { id: 's4', name: 'Olivia Wilson', progress: 'Lesson 2 進行中', isUnlocked: false },
];

export default function TeacherDashboardPage() {
  const [isGlobalUnlocked, setIsGlobalUnlocked] = useState(false);
  const [passcode, setPasscode] = useState('8842');
  const [students, setStudents] = useState(INITIAL_STUDENTS);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold text-blue-400">👨‍🏫 教師用コントロールパネル</h1>
            <p className="text-xs text-slate-400">Year 9 Japanese クラス管理</p>
          </div>
          <a href="/games/tower-defense" className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded text-slate-300">
            生徒用ゲーム画面へ ↗
          </a>
        </header>

        {/* クラス全体スイッチ */}
        <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-200">クラス全体の一斉解放スイッチ</h2>
            <p className="text-xs text-slate-400">ONにすると、全員のゲームが一斉に解放されます。</p>
          </div>
          <button
            onClick={() => setIsGlobalUnlocked(!isGlobalUnlocked)}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${isGlobalUnlocked ? 'bg-emerald-500' : 'bg-slate-600'}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${isGlobalUnlocked ? 'translate-x-8' : 'translate-x-1'}`} />
          </button>
        </div>

        {/* パスコード設定 */}
        <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-200">本日の時限パスコード</h2>
            <p className="text-xs text-slate-400">生徒が自力で入力して解除するためのコードです。</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-slate-900 text-red-400 font-mono text-lg font-bold px-4 py-1 rounded border border-slate-600 tracking-widest">
              {passcode}
            </span>
            <button
              onClick={() => setPasscode(Math.floor(1000 + Math.random() * 9000).toString())}
              className="bg-slate-700 hover:bg-slate-600 text-xs px-3 py-2 rounded text-slate-200"
            >
              🔄 更新
            </button>
          </div>
        </div>

        {/* 個別生徒管理テーブル */}
        <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl space-y-4">
          <h2 className="font-semibold text-slate-200">生徒別 個別解放コントロール</h2>
          <div className="overflow-x-auto rounded-lg border border-slate-700">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900 text-slate-400 text-xs uppercase">
                <tr>
                  <th className="p-3">生徒名</th>
                  <th className="p-3">進捗状況</th>
                  <th className="p-3">状態</th>
                  <th className="p-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-700/40">
                    <td className="p-3 font-medium text-slate-100">{student.name}</td>
                    <td className="p-3 text-slate-400">{student.progress}</td>
                    <td className="p-3">
                      {student.isUnlocked ? (
                        <span className="text-emerald-400 text-xs bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">🔓 個別解放中</span>
                      ) : (
                        <span className="text-slate-400 text-xs bg-slate-700 px-2 py-0.5 rounded">🔒 ロック中</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => {
                          setStudents(students.map(s => s.id === student.id ? { ...s, isUnlocked: !s.isUnlocked } : s));
                        }}
                        className={`text-xs px-3 py-1.5 rounded font-medium transition ${student.isUnlocked ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
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
      </div>
    </div>
  );
}