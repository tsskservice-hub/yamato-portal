/**
 * @file api.game-access.ts
 * @description ゲームを遊べるかどうかを返す（ゲームのページが開いたときと、その後 30 秒ごとに呼ばれる）
 *
 * POST /api/game-access  （Authorization: Bearer <Supabase のアクセストークン>）
 *  - { status: 'login' }                       … ログインしていない
 *  - { status: 'locked', className }           … 先生がクラスのゲームをロックしている
 *  - { status: 'allowed', ticket }             … 遊べる（ticket は iframe のゲームを読み込むときに使う）
 *
 * サーバーの Cookie はパスキーでのログイン時などにしか同期されないため、ブラウザのセッションのトークンで判定する。
 */
import { json, type ActionFunctionArgs } from '@remix-run/cloudflare';
import { createAdminSupabaseClient } from '~/lib/supabase.server';
import { createGameTicket, getGameAccessForUser, getUserIdFromBearer } from '~/lib/game-access.server';

const NO_STORE = { 'Cache-Control': 'no-store' };

export async function loader() {
  return json({ error: 'Method not allowed.' }, { status: 405, headers: NO_STORE });
}

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, { status: 405, headers: NO_STORE });
  }

  if (!request.headers.get('Authorization')) return json({ status: 'login' }, { headers: NO_STORE });

  const admin = createAdminSupabaseClient(context);
  const userId = await getUserIdFromBearer(request, admin);
  if (!userId) return json({ status: 'login' }, { headers: NO_STORE });

  const access = await getGameAccessForUser(admin, userId);
  if (access.status !== 'allowed') return json(access, { headers: NO_STORE });

  return json({ status: 'allowed', ticket: await createGameTicket(context, userId) }, { headers: NO_STORE });
}
