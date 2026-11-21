/**
 * @file app/routes/api.auth.logout.ts
 * @description ログアウト時に、サーバー用のログイン Cookie を消すエンドポイント（POST /api/auth/logout）
 *
 * ブラウザ側の supabase.auth.signOut() だけでは、/api/auth/callback で作ったサーバー用 Cookie が残る。
 * 共有パソコンで次の人が前の人（先生など）として扱われないよう、ここで必ず消す。
 */
import { json, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { appendClearAuthCookies, createServerSupabaseClient } from "~/lib/supabase.server";

export async function action({ request, context }: ActionFunctionArgs) {
  const { supabase, headers } = createServerSupabaseClient(request, context);

  // サーバー側のセッションも終了する（失敗しても Cookie は下で必ず消す）
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {}

  appendClearAuthCookies(request, headers);
  return json({ success: true }, { headers });
}

// GET などで開かれても何もしない
export async function loader() {
  return json({ error: "Method Not Allowed" }, { status: 405 });
}
