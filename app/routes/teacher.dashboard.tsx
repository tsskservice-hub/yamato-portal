/**
 * @file teacher-dashboard.tsx
 * @description 教師用コントロールパネル (PageLayout 共通レイアウト適用版 / サーバーサイド認証・認可ガード対応 / noindex対応)
 */
import { json, redirect, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import React, { useRef, useState } from 'react';
import PageLayout, { type PageLayoutRef } from '../components/PageLayout';
import { supabase } from '../lib/supabaseClient';

const INITIAL_STUDENTS = [
  { id: 's1', name: 'Liam Smith', progress: 'Lesson 5 完了', isUnlocked: false },
  { id: 's2', name: 'Charlotte Brown', progress: 'Lesson 3 進行中', isUnlocked: false },
  { id: 's3', name: 'Noah Davis', progress: 'Lesson 5 完了', isUnlocked: true },
  { id: 's4', name: 'Olivia Wilson', progress: 'Lesson 2 進行中', isUnlocked: false },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return redirect('/login');
  }

  const user = session.user;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.role !== 'teacher') {
    return redirect('/');
  }

  return json({
    userEmail: user.email,
  });
}

export default function TeacherDashboardPage() {
  const layoutRef = useRef<PageLayoutRef>(null);
  const [isGlobalUnlocked, setIsGlobalUnlocked] = useState(false);
  const [passcode, setPasscode] = useState('8842');
  const [students, setStudents] = useState(INITIAL_STUDENTS);

  return (
    <PageLayout ref={layoutRef}>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <header className="bg-white border border-slate-200 p-5 rounded-xl flex justify-between items-center shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-800">👨‍🏫 教師用コントロールパネル</h1>
            <p className="text-xs text-slate-500 mt-0.5">Year 9 Japanese クラス管理</p>
          </div>
          <a
            href="/games/tower-defense"
            className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-3.5 py-2 rounded-lg border border-indigo-200 transition"
          >
            生徒用ゲーム画面へ ↗
          </a>
        </header>

        {/* クラス全体スイッチ */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <h2 className="font-bold text-slate-800 text-base">クラス全体の一斉解放スイッチ</h2>
            <p className="text-xs text-slate-500 mt-0.5">ONにすると、全員のゲームが一斉に解放されます。</p>
          </div>
          <button
            type="button"
            onClick={() => setIsGlobalUnlocked(!isGlobalUnlocked)}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors cursor-pointer ${
              isGlobalUnlocked ? 'bg-emerald-500' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                isGlobalUnlocked ? 'translate-x-8' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* パスコード設定 */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <h2 className="font-bold text-slate-800 text-base">本日の時限パスコード</h2>
            <p className="text-xs text-slate-500 mt-0.5">生徒が自力で入力して解除するためのコードです。</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-slate-100 text-rose-600 font-mono text-xl font-bold px-4 py-1.5 rounded-lg border border-slate-300 tracking-widest">
              {passcode}
            </span>
            <button
              type="button"
              onClick={() => setPasscode(Math.floor(1000 + Math.random() * 9000).toString())}
              className="bg-slate-100 hover:bg-slate-200 text-xs font-bold px-3.5 py-2.5 rounded-lg text-slate-700 cursor-pointer transition border border-slate-200"
            >
              🔄 更新
            </button>
          </div>
        </div>

        {/* 個別生徒管理テーブル */}
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
                        onClick={() => {
                          setStudents(
                            students.map((s) =>
                              s.id === student.id ? { ...s, isUnlocked: !s.isUnlocked } : s
                            )
                          );
                        }}
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
      </div>
    </PageLayout>
  );
}

export const meta: MetaFunction = () => {
  return [
    { title: "Teacher Control Panel | Learning Dashboard" },
    { name: "robots", content: "noindex, nofollow" },
  ];
};