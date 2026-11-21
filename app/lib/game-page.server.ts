/**
 * @file game-page.server.ts
 * @description ゲームのページ共通の loader（SEO 用の PORTAL_CONTENT と現在のパス）
 *
 * 遊べるかどうか（ログイン・先生のロック）はここでは判定しない。
 * ページを開いた後に GameAccessGate がブラウザのセッションで /api/game-access に問い合わせる。
 */
import { json } from '@remix-run/cloudflare';
import { supabase } from '~/lib/supabaseClient';

export async function loadGamePage(request: Request) {
  let portalContent = null;
  try {
    const { data } = await supabase.from('portal_settings').select('content').eq('key', 'PORTAL_CONTENT').single();
    portalContent = data?.content || null;
  } catch {
    /* SEO 用なので無くても表示する */
  }
  return json({ portalContent, currentPath: new URL(request.url).pathname });
}
