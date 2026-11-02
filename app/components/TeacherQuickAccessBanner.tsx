/**
 * @file TeacherQuickAccessBanner.tsx
 * @description 教師権限を持つユーザーに対してのみ「教師用ダッシュボード」へのクイックリンクを表示するバナーコンポーネント
 */
import React from 'react';
import { Link } from '@remix-run/react';

interface TeacherQuickAccessBannerProps {
  user: any;
  isTeacher?: boolean; // 教師権限フラグ
}

export function TeacherQuickAccessBanner({ user, isTeacher }: TeacherQuickAccessBannerProps) {
  // 未ログイン、または教師権限がない場合は何も描画しない
  if (!user || !isTeacher) return null;

  return (
    <div className="bg-blue-600/10 dark:bg-blue-950/30 border border-blue-500/30 p-4 rounded-2xl flex flex-wrap justify-between items-center gap-4 shadow-sm transition-all">
      <div className="flex items-center space-x-3">
        <span className="text-2xl">👨‍🏫</span>
        <div>
          <h3 className="font-bold text-sm text-blue-600 dark:text-blue-400">
            教職員用コントロールパネル
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            クラスのゲームロック解除、時限パスコードの確認、生徒の進捗管理を行えます。
          </p>
        </div>
      </div>
      <Link
        to="/teacher/dashboard"
        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-md shadow-blue-600/20 whitespace-nowrap cursor-pointer"
      >
        教師用ダッシュボードを開く ↗
      </Link>
    </div>
  );
}