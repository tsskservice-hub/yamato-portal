/**
 * @file api.lesson-progress.ts
 * @description レッスンのタスクの完了を記録する、ただ 1 つの窓口（ライティングは api が記録する）
 *
 *   GET  /api/lesson-progress?lessonId=...   → 今ブロック中のタスク（宿題で学校時間中のもの）
 *   POST /api/lesson-progress  { lessonId, taskKeys: [...] }  → 完了を記録する（ブロック中のタスクは記録しない）
 *
 * SQL 47 から、ブラウザは edu_student_progress に書けない。ここでログイン中の本人か・学校時間のブロック中でないかを
 * 確かめてから、管理者キーで書く。ブロックの判定は SQL 47 の関数（homework_task_lock）。
 */
import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { createAdminSupabaseClient } from '~/lib/supabase.server';
import { getSessionUser } from '~/lib/teacher.server';
import { getTaskLocks } from '~/lib/homework-lock.server';
import { isLessonTaskKey } from '~/lib/teacher-config';

const UUID = /^[0-9a-f-]{36}$/i;
// ライティングは api（textbook-lesson-writing-handler）が採点のあとに記録する
const BROWSER_TASKS = ['vocabulary', 'listening', 'reading', 'speaking', 'culture'] as const;

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { user, headers } = await getSessionUser(request, context);
  const lessonId = new URL(request.url).searchParams.get('lessonId') ?? '';
  if (!user || !UUID.test(lessonId)) return json({ locks: {} }, { headers });

  const admin = createAdminSupabaseClient(context);
  const locks = await getTaskLocks(admin, user.id, lessonId, [...BROWSER_TASKS, 'writing']);
  return json({ locks }, { headers });
}

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 });
  const { user, headers } = await getSessionUser(request, context);
  if (!user) return json({ error: 'Please sign in.' }, { status: 401, headers });

  const body: any = await request.json().catch(() => ({}));
  // 1 つのレッスン、または /culture のように複数のレッスンをまとめて送れる
  const items: Array<{ lessonId: string; taskKeys: string[] }> = Array.isArray(body?.items)
    ? body.items
    : [{ lessonId: body?.lessonId, taskKeys: body?.taskKeys }];

  const admin = createAdminSupabaseClient(context);
  const saved: Array<{ lessonId: string; taskKey: string }> = [];
  const locked: Array<{ lessonId: string; taskKey: string; until: string | null }> = [];

  for (const item of items.slice(0, 20)) {
    const lessonId = typeof item?.lessonId === 'string' ? item.lessonId : '';
    if (!UUID.test(lessonId)) continue;
    const keys = [...new Set(Array.isArray(item.taskKeys) ? item.taskKeys : [])]
      .filter((k): k is (typeof BROWSER_TASKS)[number] => isLessonTaskKey(k) && (BROWSER_TASKS as readonly string[]).includes(k));
    if (keys.length === 0) continue;

    const { data: lesson } = await admin.from('edu_lessons').select('id').eq('id', lessonId).maybeSingle();
    if (!lesson) continue;

    const locks = await getTaskLocks(admin, user.id, lessonId, keys);
    const allowed = keys.filter((k) => !locks[k]?.locked);
    keys.filter((k) => locks[k]?.locked).forEach((k) => locked.push({ lessonId, taskKey: k, until: locks[k].until }));

    if (allowed.length) {
      const now = new Date().toISOString();
      const { error } = await admin.from('edu_student_progress').upsert(
        allowed.map((k) => ({ user_id: user.id, lesson_id: lessonId, task_key: k, is_completed: true, updated_at: now })),
        { onConflict: 'user_id,lesson_id,task_key' }
      );
      if (error) {
        console.error('[api.lesson-progress] save failed:', error.message);
        return json({ error: 'Could not save your progress. Please try again.' }, { status: 500, headers });
      }
      allowed.forEach((k) => saved.push({ lessonId, taskKey: k }));
    }
  }

  return json({ saved, locked }, { headers });
}
