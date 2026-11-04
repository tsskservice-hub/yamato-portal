import type { ActionFunctionArgs } from "@remix-run/cloudflare"; // 修正
import { json } from "@remix-run/cloudflare";                    // 修正
import { nicknameSchema } from "~/validations/profile";
import { createServerSupabaseClient } from "~/lib/supabase.server";

export async function action({ request, context }: ActionFunctionArgs) {
  const formData = await request.formData();
  const nickname = formData.get("nickname")?.toString() || "";

  // 1. Zodによるバリデーション実行
  const result = nicknameSchema.safeParse(nickname);

  if (!result.success) {
    // エラーメッセージを取得してフォームに返す
    const errorMessage = result.error.errors[0].message;
    return json({ error: errorMessage }, { status: 400 });
  }

  const validatedNickname = result.data;

  // 2. Supabaseへ保存処理（createServerSupabaseClientを使用し、contextも渡す）
  const { supabase, headers } = createServerSupabaseClient(request, context);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return json({ error: "認証されていません。" }, { status: 401 });
  }

  const { error: dbError } = await supabase
    .from("profiles")
    .update({ nickname: validatedNickname })
    .eq("id", user.id);

  if (dbError) {
    // 万が一DBのCHECK制約などに引っかかった場合のエラーハンドリング
    return json({ error: "データベースの保存に失敗しました。" }, { status: 500 });
  }

  return json({ success: true, message: "ニックネームを更新しました。" }, { headers });
}