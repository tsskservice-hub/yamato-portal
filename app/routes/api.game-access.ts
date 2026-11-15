/**
 * @file api.game-access.ts
 * @description ゲームを遊べるかどうかを返す（ゲームのページが開いたときと、その後 30 秒ごとに呼ばれる）
 *
 * POST /api/game-access  （Authorization: Bearer <Supabase のアクセストークン>）
 *  - { status: 'login' }                       … ログインしていない
 *  - { status: 'locked', className }           … 先生がクラスのゲームをロックしている
 *  - { status: 'allowed', ticket }             … 遊べる（ticket は iframe のゲームを読み込むときに使う）
 *
 * POST /api/game-access?hub=1  （ゲーム一覧用）
 *  - 上と同じ。ただし allowed のときは ticket の代わりに teacher（先生だけ：{ classCount, lockedCount }、それ以外は null）を返す
 *
 * サーバーの Cookie はパスキーでのログイン時などにしか同期されないため、ブラウザのセッションのトークンで判定する。
 */
import { json, type ActionFunctionArgs } from '@remix-run/cloudflare';
import { createAdminSupabaseClient } from '~/lib/supabase.server';
import { createGameTicket, getGameAccessForUser, getTeacherLockSummary, getUserIdFromBearer } from '~/lib/game-access.server';

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

  // ゲーム一覧（?hub=1）：ゲームは読み込まないのでチケットは作らない。
  // 代わりに、先生には自分のクラスのロック状況を返す（一覧に「クラスコントロール」の案内を出すため）。
  if (new URL(request.url).searchParams.get('hub') === '1') {
    return json({ status: 'allowed', teacher: await getTeacherLockSummary(admin, userId) }, { headers: NO_STORE });
  }

  return json({ status: 'allowed', ticket: await createGameTicket(context, userId) }, { headers: NO_STORE });
}
