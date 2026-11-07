/**
 * @file teacher-dashboard.tsx
 * @description 教師用コントロールパネル（tdbdモジュール分割適用版 / サーバーサイド認証・認可ガード対応 / 生徒タスク進捗一覧表示対応）
 */
import { json, redirect, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import React, { useRef } from 'react';
import { useLoaderData } from '@remix-run/react';
import PageLayout, { type PageLayoutRef } from '~/components/PageLayout';
import { createServerSupabaseClient } from '~/lib/supabase.server';

// 先頭に tdbd を付与したモジュールのインポート
import { tdbdUseDashboard } from '~/hooks/tdbd-use-dashboard';
import TdbdGlobalSwitchCard from '~/components/tdbd-global-switch-card';
import TdbdPasscodeCard from '~/components/tdbd-passcode-card';
import TdbdStudentTable from '~/components/tdbd-student-table';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { supabase: serverSupabase } = createServerSupabaseClient(request, context);
  const { data: { user }, error: userError } = await serverSupabase.auth.getUser();

  if (userError || !user) {
    return redirect('/');
  }

  const { data: profile, error: profileError } = await serverSupabase
    .from('profiles')
    .select('is_teacher')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile || !(profile as any).is_teacher) {
    return redirect('/');
  }

  // 生徒ごとのタスク進捗状況（edu_student_progress）を一括取得
  const { data: progressData, error: progressError } = await serverSupabase
    .from('edu_student_progress')
    .select('user_id, lesson_id, task_key, is_completed, updated_at');

  if (progressError) {
    console.warn("⚠️ Failed to fetch student progress for teacher dashboard:", progressError.message);
  }

  return json({
    userEmail: user.email,
    studentProgress: progressData || [],
  });
}

export default function TeacherDashboardPage() {
  const data = useLoaderData<typeof loader>();
  const layoutRef = useRef<PageLayoutRef>(null);

  // tdbdカスタムフックから状態と操作関数を取得
  const {
    isGlobalUnlocked,
    toggleGlobalUnlock,
    passcode,
    refreshPasscode,
    students,
    toggleStudentLock,
  } = tdbdUseDashboard();

  return (
    <PageLayout ref={layoutRef}>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <header className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl flex justify-between items-center shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">👨‍🏫 教師用コントロールパネル & 進捗トラッカー</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Year 9 & 10 Japanese クラス管理 ({data.userEmail})</p>
          </div>
          {/* 確実にホームへ戻れる補助リンク */}
          <a
            href="/"
            className="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 transition no-underline inline-flex items-center cursor-pointer"
          >
            🏠 ホームへ戻る
          </a>
        </header>

        {/* クラス全体一斉解放スイッチカード */}
        <TdbdGlobalSwitchCard
          isGlobalUnlocked={isGlobalUnlocked}
          onToggle={toggleGlobalUnlock}
        />

        {/* 本日の時限パスコードカード */}
        <TdbdPasscodeCard
          passcode={passcode}
          onRefresh={refreshPasscode}
        />

        {/* 生徒別個別解放コントロール & タスク進捗一覧テーブル */}
        <TdbdStudentTable
          students={students}
          studentProgress={data.studentProgress} // 取得したタスク進捗データをコンポーネントへ渡す
          onToggleLock={toggleStudentLock}
        />
      </div>
    </PageLayout>
  );
}

export const meta: MetaFunction = () => {
  return [
    { title: "Teacher Control Panel | AI Yamato Japanese Hub" },
    { name: "robots", content: "noindex, nofollow" },
  ];
};