/**
 * @file my-account.tsx
 * @description アカウント設定画面（シンプル・クライアント認証対応版）
 */
import { useState, useEffect } from "react";
import { Form, useNavigation, useActionData, useLoaderData, useNavigate } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { UserCheck, Gauge } from "lucide-react";
import { createServerSupabaseClient, createAdminSupabaseClient } from "../lib/supabase.server";
import { supabase } from "../lib/supabaseClient";
import { signUpAndRegisterPasskey, signInWithPasskey } from "../lib/passkey";
import PageLayout from "../components/PageLayout";

// Loader: サーバー側で認証ユーザーを取得し、対応するプロフィールを確実に取得する
export async function loader({ request, context }: LoaderFunctionArgs) {
  const { supabase: serverSupabase } = createServerSupabaseClient(request, context);
  const { data: { user } } = await serverSupabase.auth.getUser();

  let initialNickname = "";
  let initialPace = "normal";
  let initialPlan = "Free Plan";
  let initialCredits = 10;

  if (user) {
    const { data: profile } = await serverSupabase
      .from("profiles")
      .select("credits, plan, nickname, learning_pace")
      .eq("id", user.id)
      .maybeSingle(); // .single()だとデータがない場合にエラーになるため .maybeSingle() を推奨

    if (profile) {
      initialCredits = (profile as any).credits ?? 10;
      initialPlan = (profile as any).plan ?? "Free Plan";
      initialNickname = (profile as any).nickname ?? "";
      initialPace = (profile as any).learning_pace ?? "normal";
    }
  }

  return json({
    email: user?.email ?? "",
    plan: initialPlan,
    credits: initialCredits,
    nickname: initialNickname,
    learningPace: initialPace,
    createdAt: user?.created_at ? new Date(user.created_at).toLocaleDateString("en-AU") : "-",
  });
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
  const initialData = useLoaderData<typeof loader>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  
  const actionData = useActionData<typeof action>() as { message?: string; error?: string } | undefined;
  
  const navigation = useNavigation();
  const navigate = useNavigate();
  const isSubmitting = navigation.state === "submitting";

  // ローカルステート（ローダーから取得した初期データをセット）
  const [nicknameInput, setNicknameInput] = useState(initialData.nickname);
  const [paceInput, setPaceInput] = useState(initialData.learningPace);
  const [userEmail, setUserEmail] = useState(initialData.email);
  const [userPlan, setUserPlan] = useState(initialData.plan);
  const [userCreatedAt, setUserCreatedAt] = useState(initialData.createdAt);

  // Auth & Credits States (PageLayout連携用)
  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState<number>(initialData.credits);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [emailInput, setEmailInput] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // ブラウザ側でユーザーのプロフィール情報を再取得して確実に同期する関数
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('credits, plan, nickname, learning_pace')
        .eq('id', userId)
        .maybeSingle();
      
      if (profileData && !error) {
        setCredits((profileData as any).credits ?? 10);
        if ((profileData as any).plan) setUserPlan((profileData as any).plan);
        if ((profileData as any).nickname) {
          setNicknameInput((profileData as any).nickname);
        }
        if ((profileData as any).learning_pace) {
          setPaceInput((profileData as any).learning_pace);
        }
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
    }
  };

  // ブラウザ側のマウント時にセッションを確認し、プロフィールをフェッチ
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        setUserEmail(currentUser.email ?? "");
        if (currentUser.created_at) {
          setUserCreatedAt(new Date(currentUser.created_at).toLocaleDateString("en-AU"));
        }
        fetchUserProfile(currentUser.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        setUserEmail(currentUser.email ?? "");
        fetchUserProfile(currentUser.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate("/");
  };

  const handleOpenAuthModal = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
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
                <p className="text-xs text-gray-500 mt-1">
                  Yamato will call you by this name. If left blank, you will be called "My Friend".
                </p>
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
                <p className="text-xs text-gray-500 mt-1">
                  Let Yamato know whether you want to learn at a steady, normal, or accelerated pace. Yamato will tailor his conversation accordingly. You can also change this anytime right from Yamato's chat window.
                </p>
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