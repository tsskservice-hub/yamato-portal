// components/DataErrorState.tsx
import React from 'react';

interface DataErrorStateProps {
  title?: string;
  message?: string;
  errorMessage: string;
}

export function DataErrorState({
  title = 'データを正しく読み込めませんでした',
  message = '一時的な読み込みエラーが発生している可能性があります。お手数ですが、以下のボタンから管理者へエラーをご報告いただけますと幸いです。',
  errorMessage,
} : DataErrorStateProps) {
  // 現在のページURLと日時からメールリンクを動的生成
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const timestamp = new Date().toLocaleString('ja-JP', { timeZone: 'Australia/Melbourne' });

  const subject = encodeURIComponent('[システムエラー報告] JP Tutor AI Yamato');
  const body = encodeURIComponent(
    `サポートチーム様\n\n` +
    `以下のページでデータの読み込みエラーが発生しました。\n\n` +
    `---\n` +
    `■ 発生URL: ${currentUrl}\n` +
    `■ 発生日時: ${timestamp}\n` +
    `■ エラー内容: ${errorMessage}\n` +
    `---\n\n` +
    `（もしよろしければ、エラー発生時の状況をご記入ください）\n`
  );

  const mailtoLink = `mailto:support@jptutoraiyamato.com?subject=${subject}&body=${body}`;

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-lg shadow-sm border border-slate-200 my-8">
      <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
      <p className="text-slate-600 max-w-md mb-6 text-sm leading-relaxed">{message}</p>
      
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-md transition-colors text-sm"
        >
          ページを再読み込み
        </button>
        <a
          href={mailtoLink}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-md transition-colors text-sm inline-flex items-center"
        >
          サポートへエラーを報告する
        </a>
      </div>
    </div>
  );
}