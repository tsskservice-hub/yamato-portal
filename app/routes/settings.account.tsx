import { useState } from "react";
import { Form, useNavigation, useActionData, useLoaderData } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
// 実際のファイルパスに合わせてインポート（必要に応じて有効化してください）
// import { createServerSupabaseClient, createAdminSupabaseClient } from "~/lib/supabase.server";

// ローダー：ログイン中のユーザー情報を取得
export async function loader({ request }: LoaderFunctionArgs) {
  /*
  const { supabase, headers } = createServerSupabaseClient(request);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("credits, plan")
    .eq("id", user.id)
    .single();

  return json({
    email: user.email ?? "",
    plan: profile?.plan || "Freeプラン",
    credits: profile?.credits || 0,
    createdAt: user.created_at ? new Date(user.created_at).toLocaleDateString("ja-JP") : "-",
  }, { headers });
  */

  // ダミー返却値
  return json({
    email: "user@example.com",
    plan: "VCE Japanese Pro",
    credits: 120,
    createdAt: "2026年8月15日",
  });
}

// アクション：アカウント削除処理
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "delete-account") {
    const confirmText = formData.get("confirmText");
    if (confirmText !== "削除する") {
      return json({ error: "確認用のキーワードが正しくありません。", success: false }, { status: 400 });
    }

    /*
    const { supabase } = createServerSupabaseClient(request);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return json({ error: "認証エラーが発生しました。", success: false }, { status: 401 });
    }

    const supabaseAdmin = createAdminSupabaseClient();
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      return json({ error: "アカウントの削除に失敗しました: " + deleteError.message, success: false }, { status: 500 });
    }

    return redirect("/", {
      headers: {
        "Set-Cookie": "sb-access-token=; Max-Age=0; path=/",
      },
    });
    */

    return redirect("/");
  }

  return json({ success: true, error: null });
}

export default function AccountSettingsRoute() {
  const data = useLoaderData<typeof loader>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">アカウント設定</h1>
        <p className="text-sm text-gray-600 mt-1">
          ご登録情報の確認やプラン管理、アカウントの退会手続きを行います。
        </p>
      </div>

      {/* 1. 総合的なアカウント情報セクション */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900 border-b pb-3">登録情報</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <span className="block text-gray-500">メールアドレス</span>
            <span className="font-medium text-gray-900">{data.email}</span>
          </div>
          <div>
            <span className="block text-gray-500">現在のプラン</span>
            <span className="font-medium text-gray-900">{data.plan}</span>
          </div>
          <div>
            <span className="block text-gray-500">保有クレジット残高</span>
            <span className="font-medium text-gray-900">{data.credits} pt</span>
          </div>
          <div>
            <span className="block text-gray-500">アカウント作成日</span>
            <span className="font-medium text-gray-900">{data.createdAt}</span>
          </div>
        </div>
      </div>

      {/* 2. 危険なエリア（アカウント削除セクション） */}
      <div className="bg-white border border-red-200 rounded-lg shadow-sm p-6 space-y-4">
        <div className="border-b border-red-100 pb-4">
          <h2 className="text-lg font-semibold text-red-600">アカウントの削除</h2>
          <p className="text-sm text-gray-600 mt-1">
            アカウントを削除すると、保存されたデータ、学習履歴、購入したクレジット、およびすべての個人情報が永久に消去されます。この操作は取り消せません。
          </p>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition"
          >
            アカウントを削除する
          </button>
        </div>
      </div>

      {/* 削除確認モーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-6">
            <h3 className="text-xl font-bold text-gray-900">本当にアカウントを削除しますか？</h3>
            <p className="text-sm text-gray-600">
              確認のため、下の入力欄に <span className="font-semibold text-gray-900">「削除する」</span> と入力してください。
            </p>

            <Form method="post" className="space-y-4">
              <input type="hidden" name="intent" value="delete-account" />
              <input
                type="text"
                name="confirmText"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="「削除する」と入力"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                required
              />
              {actionData && 'error' in actionData && actionData.error && (
                <p className="text-xs text-red-600 mt-1">{actionData.error as string}</p>
              )}

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={confirmInput !== "削除する" || isSubmitting}
                  className="px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {isSubmitting ? "削除中..." : "完全に削除する"}
                </button>
              </div>
            </Form>
          </div>
        </div>
      )}
    </div>
  );
}