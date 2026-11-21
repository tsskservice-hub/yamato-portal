/**
 * @file TimezoneSection.tsx
 * @description マイアカウントのタイムゾーン設定。デイリークイズはこの地域の真夜中に新しくなる。
 *   変更は 30 日に 1 回まで（サーバーの set_my_timezone が確認する。SQL 26）。最初の設定は回数に数えない。
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Globe } from 'lucide-react';
import { supabase } from '~/lib/supabaseClient';
import { getBrowserTimezone, type DailyQuizStatus } from '~/lib/dailyQuiz';

/** ブラウザが知っているタイムゾーンの一覧（古いブラウザでは現在値とブラウザの地域だけ） */
function listTimezones(extra: Array<string | null>): string[] {
  let all: string[] = [];
  try {
    all = (Intl as any).supportedValuesOf?.('timeZone') ?? [];
  } catch {
    all = [];
  }
  const set = new Set<string>(all);
  extra.forEach((tz) => tz && set.add(tz));
  return Array.from(set).sort();
}

export function TimezoneSection({ userId }: { userId?: string }) {
  const [savedTz, setSavedTz] = useState<string | null>(null);
  const [selectedTz, setSelectedTz] = useState<string>('');
  const [nextChangeAt, setNextChangeAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const browserTz = useMemo(() => getBrowserTimezone(), []);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data, error } = await supabase.rpc('get_daily_quiz_status');
      const status = data as DailyQuizStatus | null;
      if (!error && status) {
        setSavedTz(status.timezone);
        setSelectedTz(status.timezone ?? browserTz ?? 'UTC');
        setNextChangeAt(status.next_timezone_change_at);
      }
      setIsLoading(false);
    })();
  }, [userId, browserTz]);

  const options = useMemo(() => listTimezones([savedTz, browserTz, selectedTz]), [savedTz, browserTz, selectedTz]);

  // 30 日以内に変更済みなら、次に変更できる日まで変更ボタンを止める（最初の設定は対象外）
  const isLocked = !!savedTz && !!nextChangeAt && new Date(nextChangeAt).getTime() > Date.now();
  const nextChangeLabel = nextChangeAt ? new Date(nextChangeAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

  const handleSave = async () => {
    if (!selectedTz || selectedTz === savedTz) return;
    if (savedTz && !window.confirm(
      `Change your time zone to ${selectedTz}?\n\nYou can only change your time zone once every 30 days.`
    )) return;

    setIsSaving(true);
    setMessage(null);
    const { data, error } = await supabase.rpc('set_my_timezone', { p_timezone: selectedTz });
    const result = data as { ok?: boolean; error?: string; next_change_at?: string } | null;
    setIsSaving(false);

    if (error || !result) {
      setMessage({ type: 'error', text: 'Could not save your time zone. Please try again.' });
      return;
    }
    if (!result.ok) {
      if (result.error === 'TOO_SOON' && result.next_change_at) setNextChangeAt(result.next_change_at);
      setMessage({
        type: 'error',
        text: result.error === 'TOO_SOON'
          ? 'You changed your time zone less than 30 days ago.'
          : 'That time zone is not recognised.',
      });
      return;
    }

    // 最初の設定でなければ 30 日のカウントが始まる
    if (savedTz) setNextChangeAt(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());
    setSavedTz(selectedTz);
    setMessage({ type: 'ok', text: 'Saved!' });
  };

  if (!userId) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 border-b pb-3 flex items-center gap-2">
        <Globe className="w-5 h-5 text-blue-600" /> Time Zone
      </h2>

      <p className="text-sm text-gray-600">
        Your Daily Quiz resets at midnight in this time zone.
      </p>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <select
          value={selectedTz}
          onChange={(e) => setSelectedTz(e.target.value)}
          disabled={isLoading || isLocked || isSaving}
          className="w-full sm:max-w-sm px-3 py-2 border border-gray-300 rounded-md text-sm text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-500"
        >
          {options.map((tz) => (
            <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleSave}
          disabled={isLoading || isLocked || isSaving || !selectedTz || selectedTz === savedTz}
          className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : savedTz ? 'Change Time Zone' : 'Save Time Zone'}
        </button>
        {message && (
          <span className={`text-xs font-semibold ${message.type === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>
            {message.type === 'ok' ? `✓ ${message.text}` : message.text}
          </span>
        )}
      </div>

      {/* 💡 注意書き：変更は 30 日に 1 回まで */}
      <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-xs text-amber-900 space-y-1">
        <p className="font-semibold">⚠️ You can only change your time zone once every 30 days.</p>
        <p>
          Please choose the time zone where you usually live and study.
          {isLocked && nextChangeLabel && <> You can change it again on <strong>{nextChangeLabel}</strong>.</>}
        </p>
      </div>
    </div>
  );
}

export default TimezoneSection;
