/**
 * @file dailyQuiz.ts
 * @description デイリークイズの共通処理（ブラウザ側）。
 *   「今日はもう解いたか」と「次までの秒数」はサーバー（get_daily_quiz_status / claim_daily_quiz_reward）が決める。
 *   ここでは表示用の整形と、ブラウザのタイムゾーン取得だけを行う。（SQL: supabase/sql/26_daily_quiz_timezone.sql）
 */

export type DailyQuizStatus = {
  completed: boolean;
  seconds_until_next: number;
  timezone: string | null;
  timezone_changed_at: string | null;
  next_timezone_change_at: string | null;
};

/** ブラウザのタイムゾーン（例: 'Australia/Melbourne'）。取れなければ null */
export function getBrowserTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

const DIGITS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

/** 0〜99 を漢数字に（例: 20 → 二十、23 → 二十三、10 → 十） */
export function toKanjiNumber(n: number): string {
  if (n <= 0) return '〇';
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  const tensPart = tens === 0 ? '' : tens === 1 ? '十' : `${DIGITS[tens]}十`;
  return tensPart + DIGITS[ones];
}

/**
 * 残り秒数を日本語の時間に（例: 12000 → 三時間二十分、10800 → 三時間、300 → 五分）。
 * 簡単な日本語に触れてもらうため、ここだけ日本語（漢数字）で表示する。分は切り上げ。
 */
export function formatKanjiDuration(seconds: number): string {
  const totalMinutes = Math.max(1, Math.ceil(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const h = hours > 0 ? `${toKanjiNumber(hours)}時間` : '';
  const m = minutes > 0 ? `${toKanjiNumber(minutes)}分` : '';
  return h + m;
}

/** 同じ残り時間の英語表記（マウスを乗せたときのヒント用。例: 3 h 20 min） */
export function formatEnglishDuration(seconds: number): string {
  const totalMinutes = Math.max(1, Math.ceil(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return [hours > 0 ? `${hours} h` : '', minutes > 0 ? `${minutes} min` : ''].filter(Boolean).join(' ');
}
