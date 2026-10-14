/**
 * @file settings.account.tsx
 * @description アカウント設定画面（ニックネームおよび学習ペースの保存・更新対応版）
 */
import { useState, useEffect } from "react";
import { Form, useNavigation, useActionData, useLoaderData, useNavigate } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { KeyRound, ShieldCheck, X, UserCheck, Gauge } from "lucide-react";
import { createServerSupabaseClient, createAdminSupabaseClient } from "../lib/supabase.server";
import { supabase } from "../lib/supabaseClient";
import { signUpAndRegisterPasskey, signInWithPasskey } from "../lib/passkey";
import PageLayout from "../components/PageLayout";

// Loader: サーバー側での認証チェックとプロフィール情報の取得
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
    // 未ログイン時はトップページへ誘導
    return redirect("/", { headers });
  }

  // profiles テーブルから credits, plan に加え nickname と learning_pace を取得
  const { data: profile } = await serverSupabase
    .from("profiles")
    .select("credits, plan, nickname, learning_pace")
    .eq("id", user.id)
    .single();

  return json({
    email: user.email ?? "",
    plan: profile?.plan || "Free Plan",
    credits: profile?.credits || 0,
    nickname: profile?.nickname || "",
    learningPace: profile?.learning_pace || "normal",
    createdAt: user.created_at ? new Date(user.created_at).toLocaleDateString("en-AU") : "-",
  }, { headers });
}

// Action: アカウント削除およびプロフィール更新処理
export async function action({ request, context }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  const { supabase: serverSupabase, headers } = createServerSupabaseClient(request, context);
  const { data: { user } } = await serverSupabase.auth.getUser();

  if (!user) {
    return json({ error: "Authentication error occurred.", success: false }, { status: 401 });
  }

  // 1. ニックネームと学習ペースの更新処理
  if (intent === "update-profile") {
    const nickname = formData.get("nickname")?.toString().trim() || "";
    const learningPace = formData.get("learningPace")?.toString().trim() || "normal";

    const { error: updateError } = await serverSupabase
      .from("profiles")
      .update({ 
        nickname, 
        learning_pace: learningPace 
      })
      .eq("id", user.id);

    if (updateError) {
      return json({ error: "Failed to update profile: " + updateError.message, success: false }, { status: 500 });
    }

    return json({ success: true, error: null, message: "Profile settings updated successfully!" }, { headers });
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

  return json({ success: true, error: null });
}

export default function AccountSettingsRoute() {
  const data = useLoaderData<typeof loader>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  
  // 型推論エラーを防ぐため actionData に型を明示
  const actionData = useActionData<typeof action>() as { message?: string; error?: string } | undefined;
  
  const navigation = useNavigation();
  const navigate = useNavigate();
  const isSubmitting = navigation.state === "submitting";

  // フォーム入力用のステート（ローダーからの初期値を反映）
  const [nicknameInput, setNicknameInput] = useState(data.nickname);
  const [paceInput, setPaceInput] = useState(data.learningPace);

  // Auth & Credits States (PageLayout連携用)
  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState<number>(data.credits);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [emailInput, setEmailInput] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Fetch user credits from Supabase
  const fetchUserCredits = async (userId: string) => {
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', userId)
        .single();
      
      if (profileData && !error) {
        setCredits((profileData as any).credits ?? data.credits);
      }
    } catch (err) {
      console.error('Failed to fetch user data:', err);
    }
  };

  // Auth and session handling
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserCredits(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserCredits(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ブラウザ側でURLハッシュ（#access_token...）を検知してセッションを保持させる処理
  useEffect(() => {
    const handleAuthHash = async () => {
      const hash = window.location.hash;
      if (hash && hash.includes("access_token")) {
        const { error } = await supabase.auth.getSession();
        if (!error) {
          navigate("/settings/account", { replace: true });
        }
      }
    };
    handleAuthHash();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate("/");
  };

  const handleOpenAuthModal = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const handlePasskeyAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      if (authMode === 'signup') {
        if (!emailInput) {
          throw new Error('Please enter your email address for passkey registration.');
        }
        await signUpAndRegisterPasskey(emailInput);
        alert('Passkey registration successful! Welcome to AI Yamato.');
      } else {
        await signInWithPasskey();
        alert('Passkey sign in successful!');
      }
      setIsAuthModalOpen(false);
      setEmailInput('');
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || 'Passkey authentication failed. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <PageLayout 
      user={user} 
      credits={credits} 
      onOpenAuth={handleOpenAuthModal} 
      onSignOut={handleSignOut}
    >
      <div className="max-w-4xl mx-auto p-6 space-y-8 min-h-[70vh]">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage your AI tutor preferences, registration details, subscription plan, and account cancellation.
          </p>
        </div>

        {/* 更新完了メッセージの表示 */}
        {actionData?.message ? (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-lg text-sm">
            {actionData.message}
          </div>
        ) : null}

        {/* 1. AIチューター設定・プロフィールセクション（ニックネーム & ペース） */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-3 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-600" /> AI Tutor Preferences & Profile
          </h2>

          <Form method="post" className="space-y-6">
            <input type="hidden" name="intent" value="update-profile" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* ニックネーム入力 */}
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
                <p className="text-xs text-gray-500 mt-1">やまと先生があなたを呼ぶときの名前です。</p>
              </div>

              {/* 学習ペース選択 */}
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
                <p className="text-xs text-gray-500 mt-1">チャット指導時のデフォルトのテンポ設定です。</p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : "Save Preferences"}
              </button>
            </div>
          </Form>
        </div>

        {/* 2. 総合的なアカウント情報セクション */}
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
              <span className="font-medium text-gray-900">{credits} pts</span>
            </div>
            <div>
              <span className="block text-gray-500">Account Created</span>
              <span className="font-medium text-gray-900">{data.createdAt}</span>
            </div>
          </div>
        </div>

        {/* 3. 危険なエリア（アカウント削除セクション） */}
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

              <Form method="post" className="space-y-4">
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
                {actionData && 'error' in actionData && actionData.error && (
                  <p className="text-xs text-red-600 mt-1">{actionData.error}</p>
                )}

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={confirmInput !== "DELETE" || isSubmitting}
                    className="px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? "Deleting..." : "Permanently Delete"}
                  </button>
                </div>
              </Form>
            </div>
          </div>
        )}

      </div>
    </PageLayout>
  );
}