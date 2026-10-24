/**
 * @file DataErrorState.tsx
 * @description データ取得失敗時のエラー表示および、Supabase Edge Function経由での自動メール送信コンポーネント
 */
import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface DataErrorStateProps {
  title?: string;
  message?: string;
  errorMessage: string;
}

export function DataErrorState({
  title = 'Unable to Load Data',
  message = 'An unexpected error has occurred while loading the page. You can automatically notify our support team by clicking the button below.',
  errorMessage,
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

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-lg shadow-sm border border-slate-200 my-8">
      <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
      <p className="text-slate-600 max-w-md mb-6 text-sm leading-relaxed">{message}</p>

      {sentSuccess ? (
        <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md text-sm font-bold mb-4">
          ✓ Error report sent successfully to support. Thank you!
        </div>
      ) : (
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-md transition-colors text-sm cursor-pointer"
          >
            Reload Page
          </button>

          <button
            onClick={handleAutoReport}
            disabled={isSending}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-300 text-white font-medium rounded-md transition-colors text-sm inline-flex items-center cursor-pointer"
          >
            {isSending ? 'Sending Report...' : 'Report Error to Support'}
          </button>
        </div>
      )}

      {sendError && (
        <p className="text-xs text-red-600 mt-3">
          Failed to send automatically. Please contact support@jptutoraiyamato.com directly.
        </p>
      )}
    </div>
  );
}