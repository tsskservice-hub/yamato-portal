/**
 * @file app/routes/api.auth.callback.ts
 * @description クライアント側のセッションをサーバー側のCookieに同期させるエンドポイント
 */
import { json, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { createServerSupabaseClient } from "../lib/supabase.server";

export async function action({ request, context }: ActionFunctionArgs) {
  try {
    const body = await request.json().catch(() => ({}));
    const { accessToken, refreshToken } = body as { accessToken?: string; refreshToken?: string };

    if (!accessToken || !refreshToken) {
      return json({ success: false, error: "Missing tokens" }, { status: 400 });
    }

    // サーバー側のSupabaseクライアント（Cookieのセット機能を内蔵）を生成
    const { supabase, headers } = createServerSupabaseClient(request, context);

    // サーバー側でセッションを設定し、Set-Cookieヘッダーを生成させる
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      return json({ success: false, error: error.message }, { status: 400 });
    }

    // 生成されたSet-Cookieヘッダーを含めてレスポンスを返す
    return json({ success: true }, { headers });
  } catch (err: any) {
    return json({ success: false, error: err.message || "Internal Error" }, { status: 500 });
  }
}