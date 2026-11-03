/**
 * @file teacher-dashboard.tsx
 * @description 教師用コントロールパネル（tdbdモジュール分割適用版 / サーバーサイド認証・認可ガード対応 / noindex対応）
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

  return json({
    userEmail: user.email,
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
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <header className="bg-white border border-slate-200 p-5 rounded-xl flex justify-between items-center shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-800">👨‍🏫 教師用コントロールパネル</h1>
            <p className="text-xs text-slate-500 mt-0.5">Year 9 Japanese クラス管理 ({data.userEmail})</p>
          </div>
          {/* 確実にホームへ戻れる補助リンク */}
          <a
            href="/"
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg border border-slate-300 transition no-underline inline-flex items-center cursor-pointer"
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

        {/* 生徒別個別解放コントロールテーブル */}
        <TdbdStudentTable
          students={students}
          onToggleLock={toggleStudentLock}
        />
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