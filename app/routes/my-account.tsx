/**
 * @file my-account.tsx
 * @description アカウント設定画面（クレジット残高・履歴・NGワードバリデーション対応版）
 */
import { json, redirect, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import React, { useEffect, useRef, useState } from 'react';
import { useLoaderData, useNavigate, useRevalidator, useRouteLoaderData, useFetcher } from '@remix-run/react';
import { ToolPageWrapper } from '~/components/ToolPageWrapper';
import PageLayout, { type PageLayoutRef } from '~/components/PageLayout';
import { generateModuleMeta } from '~/utils/seoMeta';
import { ArrowDownRight, ArrowUpRight, Gauge, History, UserCheck } from 'lucide-react';
import { createAdminSupabaseClient, createServerSupabaseClient } from '~/lib/supabase.server';
import { supabase } from '~/lib/supabaseClient';
import { nicknameSchema } from '~/validations/profile';

// Loader: 基本的な骨組みを安全に返す
export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const { supabase: serverSupabase } = createServerSupabaseClient(request, context);
  const { data: portalData } = await serverSupabase
    .from('portal_settings')
    .select('content')
    .eq('key', 'PORTAL_CONTENT')
    .single();
  const { data: { user } } = await serverSupabase.auth.getUser();

  let initialNickname = "";
  let initialPace = "normal";
  let initialPlan = "Free Plan";
  let initialCredits = 10;

  if (user) {
    const { data: profile } = await serverSupabase
      .from("profiles")
      .select("credits, nickname, learning_pace")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      initialCredits = (profile as any).credits ?? 10;
      initialNickname = (profile as any).nickname ?? "";
      initialPace = (profile as any).learning_pace ?? "normal";
    }
  }

  return json({
    user: user ? { id: user.id, email: user.email } : null,
    email: user?.email ?? "",
    plan: initialPlan,
    credits: initialCredits,
    nickname: initialNickname,
    learningPace: initialPace,
    createdAt: user?.created_at ? new Date(user.created_at).toLocaleDateString("en-AU") : "-",
    portalContent: portalData?.content ?? null,
    currentPath: url.pathname,
  });
}

// Action: プロフィール更新（NGワード・Zodチェック付き） および アカウント削除処理
export async function action({ request, context }: LoaderFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  const { supabase: serverSupabase, headers } = createServerSupabaseClient(request, context);
  const { data: { user } } = await serverSupabase.auth.getUser();

  if (!user) {
    return json({ error: "Authentication error occurred.", success: false }, { status: 401 });
  }

  // 1. プロフィール更新処理
  if (intent === "update-profile") {
    const nickname = formData.get("nickname")?.toString() || "";
    const learningPace = formData.get("learningPace")?.toString() || "normal";

    // Zodによるバリデーション（NGワード・文字数チェック）
    const result = nicknameSchema.safeParse(nickname);
    if (!result.success) {
      const errorMessage = result.error.errors[0].message;
      return json({ error: errorMessage, success: false }, { status: 400 });
    }

    const validatedNickname = result.data;

    const { error: updateError } = await serverSupabase
      .from("profiles")
      .update({
        nickname: validatedNickname,
        learning_pace: learningPace,
      })
      .eq("id", user.id);

    if (updateError) {
      return json({ error: "Failed to update profile: " + updateError.message, success: false }, { status: 500 });
    }

    return json({ success: true, error: null, message: "Preferences updated successfully." }, { headers });
  }

  // 2. アカウント削除処理
  if (intent === "delete-account") {
    const confirmText = formData.get("confirmText");
    if (confirmText !== "DELETE") {
      return json({ error: "The confirmation keyword is incorrect.", success: false }, { status: 400 });
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

  return json({ error: "Invalid intent.", success: false }, { status: 400 });
}

export default function AccountSettingsRoute() {
  const layoutRef = useRef<PageLayoutRef>(null);
  const initialData = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const revalidator = useRevalidator();

  // 💡 Remix の useFetcher を利用して action を安全に呼び出す
  const fetcher = useFetcher<{ success?: boolean; error?: string; message?: string }>();

  const rootData = useRouteLoaderData("root") as {
    user?: any;
    credits?: number;
    nickname?: string;
  } | undefined;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");

  const [nicknameInput, setNicknameInput] = useState(() => {
    return (rootData?.nickname && rootData.nickname.trim() !== "")
      ? rootData.nickname
      : (initialData.nickname && initialData.nickname.trim() !== ""
          ? initialData.nickname
          : "");
  });

  const [paceInput, setPaceInput] = useState(initialData.learningPace);
  const [userEmail, setUserEmail] = useState(initialData.email);
  const [userPlan] = useState(initialData.plan);
  const [userCreatedAt, setUserCreatedAt] = useState(initialData.createdAt);

  const [user, setUser] = useState<any>(rootData?.user ?? initialData.user ?? null);
  const [credits, setCredits] = useState<number>(rootData?.credits ?? initialData.credits);

  // クレジット履歴ステート
  const [transactions, setTransactions] = useState<Array<any>>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);

  // fetcher の状態からローディング・エラー・成功状態を連動
  const isSaving = fetcher.state === "submitting" || fetcher.state === "loading";
  const saveError = fetcher.data?.error || null;
  const showSavedIndicator = fetcher.data?.success === true;

  // クライアント側で認証セッション・最新プロフィール(残高)・履歴を非同期取得
  useEffect(() => {
    const fetchUserDataAndTransactions = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const activeUser = session?.user ?? rootData?.user ?? initialData.user;

        if (activeUser) {
          setUser(activeUser);
          setUserEmail(activeUser.email ?? "");
          if (activeUser.created_at) {
            setUserCreatedAt(new Date(activeUser.created_at).toLocaleDateString("en-AU"));
          }

          const { data: profileData } = await supabase
            .from("profiles")
            .select("credits")
            .eq("id", activeUser.id)
            .maybeSingle();

          if (profileData && profileData.credits !== undefined) {
            setCredits(profileData.credits);
          }

          const { data: txData, error: txError } = await supabase
            .from("credit_transactions")
            .select("id, amount, feature_used, description, created_at, expires_at")
            .eq("user_id", activeUser.id)
            .order("created_at", { ascending: false });

          if (!txError && txData) {
            setTransactions(txData);
          }
        }
      } catch (err) {
        console.error("Failed to fetch user data on client:", err);
      } finally {
        setIsLoadingTransactions(false);
      }
    };

    fetchUserDataAndTransactions();
  }, [rootData]);

  useEffect(() => {
    if (rootData) {
      if (rootData.user !== undefined && rootData.user !== null) {
        setUser(rootData.user);
      }
      if (rootData.credits !== undefined) {
        setCredits(rootData.credits);
      }
      if (rootData.nickname !== undefined && rootData.nickname !== null && rootData.nickname.trim() !== "") {
        setNicknameInput(rootData.nickname);
      }
    }
  }, [rootData]);

  // 保存成功時にリバデーションを実行
  useEffect(() => {
    if (fetcher.data?.success) {
      revalidator.revalidate();
    }
  }, [fetcher.data]);

  return (
    <ToolPageWrapper layoutRef={layoutRef}>
      <div className="max-w-4xl mx-auto p-6 space-y-8 min-h-[70vh]">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage your AI tutor preferences, registration details, subscription plan, and credit history.
          </p>
        </div>

        {/* 1. AIチューター設定・プロフィールセクション */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-3 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-600" /> AI Tutor Preferences & Profile
          </h2>

          {/* 💡 fetcher.Form を使用することで、安全にサーバーの action へPOSTされ Zod が機能します */}
          <fetcher.Form method="post" className="space-y-6">
            <input type="hidden" name="intent" value="update-profile" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Nickname (AI呼びかけ用)
                </label>
                <input
                  type="text"
                  name="nickname"
                  value={nicknameInput}
                  onChange={(e) => setNicknameInput(e.target.value)}
                  placeholder="e.g. Kenji"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Yamato will call you by this name. If left blank, you will be called "My Friend".
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-blue-600" /> Default Learning Pace
                </label>
                <select
                  name="learningPace"
                  value={paceInput}
                  onChange={(e) => setPaceInput(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="steady">Steady (じっくり丁寧・基礎重視)</option>
                  <option value="normal">Normal (標準ペース)</option>
                  <option value="accelerated">Accelerated (高速・発展重視)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Let Yamato know whether you want to learn at a steady, normal, or accelerated pace.
                </p>
              </div>
            </div>

            {saveError && (
              <p className="text-xs text-red-600 font-medium">{saveError}</p>
            )}

            <div className="flex items-center justify-end space-x-3">
              {showSavedIndicator && (
                <span className="text-xs font-semibold text-emerald-600 animate-fade-in flex items-center gap-1">
                  ✓ Saved!
                </span>
              )}
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Preferences"}
              </button>
            </div>
          </fetcher.Form>
        </div>

        {/* 2. 総合的なアカウント情報セクション */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-3">Registration Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <span className="block text-gray-500">Email Address</span>
              <span className="font-medium text-gray-900">{userEmail || "Loading..."}</span>
            </div>
            <div>
              <span className="block text-gray-500">Current Plan</span>
              <span className="font-medium text-gray-900">{userPlan}</span>
            </div>
            <div>
              <span className="block text-gray-500">Credit Balance</span>
              <span className="font-medium text-gray-900">{credits} pts</span>
            </div>
            <div>
              <span className="block text-gray-500">Account Created</span>
              <span className="font-medium text-gray-900">{userCreatedAt}</span>
            </div>
          </div>
        </div>

        {/* 3. クレジット履歴セクション */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-3 flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" /> Credit Transactions History
          </h2>
          <p className="text-xs text-gray-500">
            A complete record of all credits earned (such as daily quizzes or top-ups) and credits consumed across AI features.
          </p>

          {isLoadingTransactions ? (
            <div className="text-center py-8 text-sm text-gray-500 italic bg-gray-50 rounded-lg animate-pulse">
              Loading transactions history...
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-500 italic bg-gray-50 rounded-lg">
              No credit transactions recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-gray-600">
                    <th className="py-2.5 px-3 font-semibold">Date / Time</th>
                    <th className="py-2.5 px-3 font-semibold">Feature / Type</th>
                    <th className="py-2.5 px-3 font-semibold">Description</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map((tx) => {
                    const isPositive = tx.amount > 0;
                    const formattedDate = new Date(tx.created_at).toLocaleString("en-AU", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    });

                    return (
                      <tr key={tx.id} className="hover:bg-gray-50/50">
                        <td className="py-3 px-3 text-gray-600 whitespace-nowrap">
                          {formattedDate}
                        </td>
                        <td className="py-3 px-3 font-medium text-gray-900 whitespace-nowrap">
                          {tx.feature_used || "general"}
                        </td>
                        <td className="py-3 px-3 text-gray-600 max-w-xs truncate" title={tx.description || ""}>
                          {tx.description || "-"}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-0.5 px-2 py-1 rounded-full font-bold ${
                              isPositive
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {isPositive ? (
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowDownRight className="w-3.5 h-3.5" />
                            )}
                            {isPositive ? `+${tx.amount}` : tx.amount} pts
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 4. 危険なエリア（アカウント削除セクション） */}
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
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition cursor-pointer"
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

              <form method="post" className="space-y-4">
                <input type="hidden" name="intent" value="delete-account" />
                <input
                  type="text"
                  name="confirmText"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder="Type 'DELETE'"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-slate-900"
                  required
                />
                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={confirmInput !== "DELETE"}
                    className="px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                  >
                    Permanently Delete
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </ToolPageWrapper>
  );
}

export const meta: MetaFunction<typeof loader> = ({ data }: { data: any }) => {
  return generateModuleMeta((data as any)?.portalContent || null, (data as any)?.currentPath || "");
};