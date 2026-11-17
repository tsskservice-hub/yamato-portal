/**
 * @file homework-lock.server.ts
 * @description 宿題の「学校時間中はできない」の判定（サーバー専用）。判定そのものは SQL 44 の関数 1 か所にある。
 *   SQL 44 の前（関数が無い）は「ブロックしない」として扱う。
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export type LockResult = { locked: boolean; until: string | null };

const UNLOCKED: LockResult = { locked: false, until: null };

function toLock(data: any): LockResult {
  return data && data.locked ? { locked: true, until: typeof data.until === 'string' ? data.until : null } : UNLOCKED;
}

/** レッスンのタスクごとに、今この生徒が完了にしてよいか */
export async function getTaskLocks(admin: SupabaseClient, userId: string, lessonId: string, taskKeys: readonly string[]) {
  const entries = await Promise.all(
    taskKeys.map(async (key) => {
      const { data, error } = await admin.rpc('homework_task_lock', { p_user_id: userId, p_lesson_id: lessonId, p_task: key });
      return [key, error ? UNLOCKED : toLock(data)] as const;
    })
  );
  return Object.fromEntries(entries) as Record<string, LockResult>;
}

/** 語彙クイズの宿題を、今この生徒が解いてよいか */
export async function getItemLock(admin: SupabaseClient, userId: string, homeworkId: string): Promise<LockResult> {
  const { data, error } = await admin.rpc('homework_item_lock', { p_user_id: userId, p_homework_id: homeworkId });
  return error ? UNLOCKED : toLock(data);
}

/** クラスの学校時間のブロック中なら、終わる時刻（ISO）。ブロック中でなければ null */
export async function getClassLockUntil(admin: SupabaseClient, classId: string, userId: string): Promise<string | null> {
  const { data, error } = await admin.rpc('school_hours_lock_until', { p_class_id: classId, p_user_id: userId });
  return error || !data ? null : String(data);
}
