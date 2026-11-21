/**
 * @file api.lesson-settings.ts
 * @description レッスンページが、先生がクラスに設定したタスクの設定を受け取る（lib/lesson-settings.server.ts）
 *
 * POST /api/lesson-settings?lessonId=<edu_lessons.id>  （Authorization: Bearer <Supabase のアクセストークン>）
 *  → { vocabWordsPerMode: number | null }   null = 制限なし（ログインしていない・クラスに入っていない・設定なし・読み込み失敗）
 */
import { json, type ActionFunctionArgs } from '@remix-run/cloudflare';
import { createAdminSupabaseClient } from '~/lib/supabase.server';
import { getUserIdFromBearer } from '~/lib/game-access.server';
import { getLessonTaskSettingsForUser } from '~/lib/lesson-settings.server';

const NO_STORE = { 'Cache-Control': 'no-store' };
const NO_LIMIT = { vocabWordsPerMode: null };

export async function loader() {
  return json({ error: 'Method not allowed.' }, { status: 405, headers: NO_STORE });
}

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, { status: 405, headers: NO_STORE });
  }
  const lessonId = new URL(request.url).searchParams.get('lessonId') ?? '';
  if (!lessonId || !request.headers.get('Authorization')) return json(NO_LIMIT, { headers: NO_STORE });

  try {
    const admin = createAdminSupabaseClient(context);
    const userId = await getUserIdFromBearer(request, admin);
    if (!userId) return json(NO_LIMIT, { headers: NO_STORE });
    return json(await getLessonTaskSettingsForUser(admin, userId, lessonId), { headers: NO_STORE });
  } catch (err) {
    console.error('[api.lesson-settings] failed:', err);
    return json(NO_LIMIT, { headers: NO_STORE });
  }
}
