/**
 * @file homework-status.ts
 * @description 宿題・課題の締切と追加期間（catch-up）から、生徒ごとの状態を決める（ブラウザ・サーバー共通。SQL 45）
 *
 *   ontime  … 締切までに終えた
 *   late    … 締切は過ぎたが、追加期間中に終えた
 *   open    … まだ締切前で、終えていない
 *   catchup … 締切は過ぎたが、追加期間中で、まだ終えていない
 *   missed  … 閉じた（締切、または追加期間が終わった）のに終えていない。閉じた後に終えたものも、宿題としては数えない
 */
export type HomeworkStatus = 'ontime' | 'late' | 'open' | 'catchup' | 'missed';

/** 閉じる時刻（追加期間があればその終わり、なければ締切） */
export function closesAt(item: { dueAt: string; catchupUntil: string | null }) {
  return item.catchupUntil ?? item.dueAt;
}

/** 宿題として数える「終えた」か（閉じる時刻までに終えたか） */
export function countsAsDone(item: { dueAt: string; catchupUntil: string | null }, finishedAt: string | null) {
  return Boolean(finishedAt) && new Date(finishedAt!).getTime() <= new Date(closesAt(item)).getTime();
}

export function homeworkStatus(
  item: { dueAt: string; catchupUntil: string | null },
  finishedAt: string | null,
  now: number = Date.now()
): HomeworkStatus {
  const due = new Date(item.dueAt).getTime();
  const close = new Date(closesAt(item)).getTime();
  if (finishedAt) {
    const t = new Date(finishedAt).getTime();
    if (t <= due) return 'ontime';
    if (t <= close) return 'late';
  }
  if (now <= due) return 'open';
  if (now <= close) return 'catchup';
  return 'missed';
}

export const STATUS_LABEL: Record<HomeworkStatus, string> = {
  ontime: 'Done on time',
  late: 'Done late',
  open: 'Not done yet',
  catchup: 'Overdue – catch-up period',
  missed: 'Closed – not done',
};

/** 状態ごとの色（Tailwind のクラス） */
export const STATUS_STYLE: Record<HomeworkStatus, string> = {
  ontime: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  late: 'bg-amber-50 border-amber-200 text-amber-800',
  open: 'bg-slate-50 border-slate-200 text-slate-600',
  catchup: 'bg-orange-50 border-orange-300 text-orange-800',
  missed: 'bg-red-50 border-red-200 text-red-700',
};

/** 締切の後の追加期間の選択肢（日数）。初期値 7 日 */
export const CATCHUP_OPTIONS = [
  { days: 0, label: 'No catch-up (closes at the due time)' },
  { days: 3, label: '3 days after the due time' },
  { days: 7, label: '7 days after the due time' },
  { days: 14, label: '14 days after the due time' },
] as const;
export const DEFAULT_CATCHUP_DAYS = 7;
