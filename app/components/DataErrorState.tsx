/**
 * @file DataErrorState.tsx
 * @description データ取得失敗時のエラー表示および、Supabase Edge Function経由での自動メール送信コンポーネント
 */
import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface DataErrorStateProps {
  title?: string;
  message?: string;
  errorMessage?: string;
  onRetry?: () => void;
}

export function DataErrorState({
  title = 'Unable to Load Data',
  message = 'An unexpected error has occurred while loading the page. You can automatically notify our support team by clicking the button below.',
  errorMessage = 'No additional error details provided.',
  onRetry,
}: DataErrorStateProps) {
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [sendError, setSendError] = useState(false);

  // ボタンを押したときにEdge Function経由でメールを自動送信する関数
  const handleAutoReport = async () => {
    setIsSending(true);
    setSendError(false);

    try {
      const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
      const timestamp = new Date().toISOString();

      // Supabase Edge Function 'send-error-report' を呼び出し
      const { error } = await supabase.functions.invoke('send-error-report', {
        body: {
          recipient: 'support@jptutoraiyamato.com',
          subject: '[System Error Report] JP Tutor AI Yamato',
          pageUrl: currentUrl,
          timestamp: timestamp,
          errorMessage: errorMessage,
        },
      });

      if (error) {
        throw error;
      }

      setSentSuccess(true);
    } catch (err) {
      console.error('Failed to send error report:', err);
      setSendError(true);
    } finally {
      setIsSending(false);
    }
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl shadow-sm max-w-lg mx-auto my-12">
      <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
        ⚠️
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-2">
        {title}
      </h3>
      <p className="text-sm text-slate-600 mb-6 leading-relaxed">
        {message}
      </p>

      {sentSuccess ? (
        <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-sm font-bold mb-4">
          ✓ Error report sent successfully to support. Thank you!
        </div>
      ) : (
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            type="button"
            onClick={handleRetry}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm cursor-pointer shadow-xs"
          >
            Retry / Reload
          </button>

          <button
            type="button"
            onClick={handleAutoReport}
            disabled={isSending}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold rounded-xl transition-colors text-sm inline-flex items-center cursor-pointer shadow-xs"
          >
            {isSending ? 'Sending Report...' : 'Report Error to Support'}
          </button>
        </div>
      )}

      {sendError && (
        <p className="text-xs text-rose-600 mt-3 font-medium">
          Failed to send automatically. Please contact support@jptutoraiyamato.com directly.
        </p>
      )}
    </div>
  );
}

// 💡 デフォルトエクスポートを追加（contact.tsx 等の default import に対応）
export default DataErrorState;