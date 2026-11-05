/**
 * @file my-account.tsx
 * @description アカウント設定画面（モジュール分割・クレジット残高・履歴・クライアント更新対応版）
 */
import { json, redirect, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import React, { useEffect, useRef, useState } from 'react';
import { useLoaderData, useRevalidator, useRouteLoaderData } from '@remix-run/react';
import { ToolPageWrapper } from '~/components/ToolPageWrapper';
import type { PageLayoutRef } from '~/components/PageLayout';
import { generateModuleMeta } from '~/utils/seoMeta';
import { createAdminSupabaseClient, createServerSupabaseClient } from '~/lib/supabase.server';
import { supabase } from '~/lib/supabaseClient';

// モジュール化したコンポーネントのインポート
import { TutorPreferencesSection } from '~/components/TutorPreferencesSection';
import { RegistrationDetails } from '~/components/RegistrationDetails';
import { CreditTransactionsSection } from '~/components/CreditTransactionsSection';
import { DeleteAccountModal } from '~/components/DeleteAccountModal';

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

// Action: アカウント削除処理のみをサーバー側で安全に処理
export async function action({ request, context }: LoaderFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  const { supabase: serverSupabase, headers } = createServerSupabaseClient(request, context);
  const { data: { user } } = await serverSupabase.auth.getUser();

  if (!user) {
    return json({ error: "Authentication error occurred.", success: false }, { status: 401 });
  }

  // アカウント削除処理
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
  const revalidator = useRevalidator();

  const rootData = useRouteLoaderData("root") as {
    user?: any;
    credits?: number;
    nickname?: string;
  } | undefined;

  const [nicknameInput, setNicknameInput] = useState(() => {
    return (rootData?.nickname && rootData.nickname.trim() !== "")
      ? rootData.nickname
      : (initialData.nickname && initialData.nickname.trim() !== ""
          ? initialData.nickname
          : "");
  });

  const [paceInput] = useState(initialData.learningPace);
  const [userEmail, setUserEmail] = useState(initialData.email);
  const [userPlan] = useState(initialData.plan);
  const [userCreatedAt, setUserCreatedAt] = useState(initialData.createdAt);

  const [user, setUser] = useState<any>(rootData?.user ?? initialData.user ?? null);
  const [credits, setCredits] = useState<number>(rootData?.credits ?? initialData.credits);

  // クレジット履歴ステート
  const [transactions, setTransactions] = useState<Array<any>>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);

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
            .select("credits, nickname")
            .eq("id", activeUser.id)
            .maybeSingle();

          if (profileData) {
            if (profileData.credits !== undefined) {
              setCredits(profileData.credits);
            }
            if (profileData.nickname) {
              setNicknameInput(profileData.nickname);
            }
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

  return (
    <ToolPageWrapper layoutRef={layoutRef}>
      <div className="max-w-4xl mx-auto p-6 space-y-8 min-h-[70vh]">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage your AI tutor preferences, registration details, subscription plan, and credit history.
          </p>
        </div>

        {/* 1. AIチューター設定・プロフィールセクション（モジュール化） */}
        <TutorPreferencesSection
          userId={user?.id}
          initialNickname={nicknameInput}
          initialPace={paceInput}
          onSaved={() => revalidator.revalidate()}
        />

        {/* 2. 総合的なアカウント情報セクション（モジュール化） */}
        <RegistrationDetails
          email={userEmail}
          plan={userPlan}
          credits={credits}
          createdAt={userCreatedAt}
        />

        {/* 3. クレジット履歴セクション（モジュール化） */}
        <CreditTransactionsSection
          transactions={transactions}
          isLoading={isLoadingTransactions}
        />

        {/* 4. 危険なエリア（アカウント削除セクション ＆ モーダル・モジュール化） */}
        <DeleteAccountModal />
      </div>
    </ToolPageWrapper>
  );
}

export const meta: MetaFunction<typeof loader> = ({ data }: { data: any }) => {
  return generateModuleMeta((data as any)?.portalContent || null, (data as any)?.currentPath || "");
};