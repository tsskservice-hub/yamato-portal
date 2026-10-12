import { useState, useEffect } from "react";
import { Form, useNavigation, useActionData, useLoaderData, useNavigate } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { createServerSupabaseClient, createAdminSupabaseClient } from "../lib/supabase.server";
import { supabase } from "../lib/supabaseClient"; // クライアント側のSupabaseインスタンス

// Loader: サーバー側での認証チェック
export async function loader({ request, context }: LoaderFunctionArgs) {
  const { supabase: serverSupabase, headers } = createServerSupabaseClient(request, context);
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (code) {
    await serverSupabase.auth.exchangeCodeForSession(code);
    return redirect("/settings/account", { headers });
  }

  const { data: { user }, error: authError } = await serverSupabase.auth.getUser();

  if (authError || !user) {
    return redirect("/login", { headers });
  }

  const { data: profile } = await serverSupabase
    .from("profiles")
    .select("credits, plan")
    .eq("id", user.id)
    .single();

  return json({
    email: user.email ?? "",
    plan: profile?.plan || "Free Plan",
    credits: profile?.credits || 0,
    createdAt: user.created_at ? new Date(user.created_at).toLocaleDateString("en-AU") : "-",
  }, { headers });
}

// Action: アカウント削除処理
export async function action({ request, context }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "delete-account") {
    const confirmText = formData.get("confirmText");
    if (confirmText !== "DELETE") {
      return json({ error: "The confirmation keyword is incorrect.", success: false }, { status: 400 });
    }

    const { supabase: serverSupabase, headers } = createServerSupabaseClient(request, context);
    const { data: { user } } = await serverSupabase.auth.getUser();

    if (!user) {
      return json({ error: "Authentication error occurred.", success: false }, { status: 401 });
    }

    const supabaseAdmin = createAdminSupabaseClient(context);
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      return json({ error: "Failed to delete account: " + deleteError.message, success: false }, { status: 500 });
    }

    return redirect("/", {
      headers: {
        ...Object.fromEntries(headers.entries()),
        "Set-Cookie": "sb-access-token=; Max-Age=0; path=/",
      },
    });
  }

  return json({ success: true, error: null });
}

export default function AccountSettingsRoute() {
  const data = useLoaderData<typeof loader>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const isSubmitting = navigation.state === "submitting";

  // 【追加】ブラウザ側でURLハッシュ（#access_token...）を検知してセッションを保持させる処理
  useEffect(() => {
    const handleAuthHash = async () => {
      const hash = window.location.hash;
      if (hash && hash.includes("access_token")) {
        // Supabaseクライアントにハッシュを処理させる
        const { error } = await supabase.auth.getSession();
        if (!error) {
          // ハッシュを綺麗にしてページを再読み込み・再フェッチさせる
          navigate("/settings/account", { replace: true });
        }
      }
    };
    handleAuthHash();
  }, [navigate]);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
        <p className="text-sm text-gray-600 mt-1">
          Manage your registration details, subscription plan, and account cancellation.
        </p>
      </div>

      {/* 1. 総合的なアカウント情報セクション */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900 border-b pb-3">Registration Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <span className="block text-gray-500">Email Address</span>
            <span className="font-medium text-gray-900">{data.email}</span>
          </div>
          <div>
            <span className="block text-gray-500">Current Plan</span>
            <span className="font-medium text-gray-900">{data.plan}</span>
          </div>
          <div>
            <span className="block text-gray-500">Credit Balance</span>
            <span className="font-medium text-gray-900">{data.credits} pts</span>
          </div>
          <div>
            <span className="block text-gray-500">Account Created</span>
            <span className="font-medium text-gray-900">{data.createdAt}</span>
          </div>
        </div>
      </div>

      {/* 2. 危険なエリア（アカウント削除セクション） */}
      <div className="bg-white border border-red-200 rounded-lg shadow-sm p-6 space-y-4">
        <div className="border-b border-red-100 pb-4">
          <h2 className="text-lg font-semibold text-red-600">Delete Account</h2>
          <p className="text-sm text-gray-600 mt-1">
            Deleting your account will permanently erase all saved data, learning history, purchased credits, and personal information. This action cannot be undone.
          </p>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition"
          >
            Delete Account
          </button>
        </div>
      </div>

      {/* 削除確認モーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-6">
            <h3 className="text-xl font-bold text-gray-900">Are you sure you want to delete your account?</h3>
            <p className="text-sm text-gray-600">
              To confirm, please type <span className="font-semibold text-gray-900">「DELETE」</span> in the field below.
            </p>

            <Form method="post" className="space-y-4">
              <input type="hidden" name="intent" value="delete-account" />
              <input
                type="text"
                name="confirmText"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="Type 'DELETE'"
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
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={confirmInput !== "DELETE" || isSubmitting}
                  className="px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Deleting..." : "Permanently Delete"}
                </button>
              </div>
            </Form>
          </div>
        </div>
      )}
    </div>
  );
}