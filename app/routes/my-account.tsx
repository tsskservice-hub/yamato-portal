/**
 * @file my-account.tsx
 * @description アカウント設定画面（モジュール分割・クレジット残高・履歴・リアルタイム同期対応版）
 */
import { json, redirect, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useLoaderData, useRevalidator, useRouteLoaderData } from '@remix-run/react';
import { ToolPageWrapper } from '~/components/layout/ToolPageWrapper';
import type { PageLayoutRef } from '~/components/layout/PageLayout';
import { generateModuleMeta } from '~/utils/seoMeta';
import { createAdminSupabaseClient, createServerSupabaseClient } from '~/lib/supabase.server';
import { supabase } from '~/lib/supabaseClient';

// モジュール化したコンポーネントのインポート
import { TutorPreferencesSection } from '~/components/TutorPreferencesSection';
import { RegistrationDetails } from '~/components/RegistrationDetails';
import { CreditTransactionsSection } from '~/components/CreditTransactionsSection';
import { DeleteAccountModal } from '~/components/DeleteAccountModal';
import { StudentClassSection, type StudentHomeworkItem } from '~/components/StudentClassSection';
import { getStudentClass, getVerifiedSchoolEmails, normaliseJoinCode, type VerifiedSchoolEmail } from '~/lib/teacher.server';
import { INVITE_CODE_LENGTH, TEACHER_LIMITS, allowedStudentDomains, isStudentDomainAllowed } from '~/lib/teacher-config';

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
  let initialState: string | null = null;
  let initialSchoolName: string | null = null;
  let initialSchoolRefId: number | null = null;
  let isTeacher = false;
  let teacherStatus: string | null = null;
  let studentClass: Awaited<ReturnType<typeof getStudentClass>> = null;
  let homework: StudentHomeworkItem[] = [];
  let verifiedSchoolEmails: VerifiedSchoolEmail[] = [];
  let joinRequest: { className: string; schoolEmail: string | null } | null = null;

  if (user) {
    const { data: profile } = await serverSupabase
      .from("profiles")
      .select("credits, nickname, learning_pace, state, school_name, school_ref_id, is_teacher, teacher_status")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      initialCredits = (profile as any).credits ?? 10;
      initialNickname = (profile as any).nickname ?? "";
      initialPace = (profile as any).learning_pace ?? "normal";
      initialState = (profile as any).state ?? null;
      initialSchoolName = (profile as any).school_name ?? null;
      initialSchoolRefId = (profile as any).school_ref_id ?? null;
      isTeacher = Boolean((profile as any).is_teacher);
      teacherStatus = (profile as any).teacher_status ?? null;
    }

    // 💡 生徒：参加しているクラスと宿題（クラス・宿題テーブルはブラウザから読めないのでサーバーで取得）
    if (!isTeacher && teacherStatus !== "pending") {
      try {
        const admin = createAdminSupabaseClient(context);
        studentClass = await getStudentClass(admin, user.id);
        if (studentClass) {
          homework = await loadStudentHomework(admin, studentClass.id, user.id);
        } else {
          verifiedSchoolEmails = await getVerifiedSchoolEmails(admin, user.id);
          const { data: req } = await admin
            .from("edu_class_join_requests")
            .select("school_email, edu_classes(name)")
            .eq("user_id", user.id)
            .maybeSingle();
          if (req) {
            joinRequest = { className: (req as any).edu_classes?.name ?? "your class", schoolEmail: req.school_email ?? null };
          }
        }
      } catch (err) {
        console.error("Failed to load class/homework:", err);
      }
    }
  }

  return json({
    user: user ? { id: user.id, email: user.email } : null,
    email: user?.email ?? "",
    plan: initialPlan,
    credits: initialCredits,
    nickname: initialNickname,
    learningPace: initialPace,
    state: initialState,
    schoolName: initialSchoolName,
    schoolRefId: initialSchoolRefId,
    isTeacher,
    teacherStatus,
    studentClass,
    homework,
    verifiedSchoolEmails,
    joinRequest,
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

  // 💡 生徒：参加コードでクラスへの参加を申請する（1人1クラス・先生が承認すると入れる）
  //    学校の外の子どもが入れないよう、クラスの学校ドメインに合う学校アカウント（Google / Microsoft）を確認した生徒だけが申請できる
  if (intent === "join-class") {
    const code = normaliseJoinCode(formData.get("joinCode"));
    if (code.length < 4) {
      return json({ intent, error: "Please enter the class code from your teacher.", success: false }, { status: 400 });
    }
    const admin = createAdminSupabaseClient(context);

    const { data: me } = await admin.from("profiles").select("is_teacher, teacher_status").eq("id", user.id).maybeSingle();
    if (me?.is_teacher || me?.teacher_status === "pending") {
      return json({ intent, error: "Teacher accounts cannot join a class as a student.", success: false }, { status: 400 });
    }
    if (await getStudentClass(admin, user.id)) {
      return json({ intent, error: "You are already in a class. Leave it first to join another one.", success: false }, { status: 400 });
    }

    const { data: cls } = await admin.from("edu_classes").select("id, name, school_domain").eq("join_code", code).maybeSingle();
    if (!cls) {
      return json({ intent, error: "That class code was not found. Please check it with your teacher.", success: false }, { status: 404 });
    }

    const schoolEmails = await getVerifiedSchoolEmails(admin, user.id);
    const match = schoolEmails.find((e) => isStudentDomainAllowed(cls.school_domain, e.domain));
    if (!match) {
      const allowed = allowedStudentDomains(cls.school_domain).map((d) => `@${d}`).join(" or ");
      return json({
        intent,
        error: `To join this class, verify a school account ending in ${allowed} first.`,
        success: false,
      }, { status: 403 });
    }

    const { count } = await admin
      .from("edu_class_members")
      .select("user_id", { count: "exact", head: true })
      .eq("class_id", cls.id)
      .eq("role", "student");
    if ((count ?? 0) >= TEACHER_LIMITS.maxStudentsPerClass) {
      return json({ intent, error: "This class is full. Please ask your teacher.", success: false }, { status: 400 });
    }

    // 前の申請があれば置き換える（1人1件）
    await removeJoinRequest(admin, user.id);
    const { error: requestError } = await admin
      .from("edu_class_join_requests")
      .insert({ class_id: cls.id, user_id: user.id, school_email: match.email });
    if (requestError) {
      console.error("join-class request failed:", requestError.message);
      return json({ intent, error: "Could not send your request. Please try again.", success: false }, { status: 500 });
    }
    return json({ intent, success: true, message: `Request sent to ${cls.name}. Your teacher needs to approve it.` });
  }

  // 💡 生徒：先生から手渡された 1 人用の招待コードで参加を申請する（学校が Google を使っていない生徒のため）
  //    コードは 1 回だけ使える。先生が承認するとクラスに入れる
  if (intent === "redeem-invite") {
    const code = normaliseJoinCode(formData.get("inviteCode"));
    if (code.length !== INVITE_CODE_LENGTH) {
      return json({ intent, error: "Please enter the 8-character invite code from your teacher.", success: false }, { status: 400 });
    }
    const admin = createAdminSupabaseClient(context);

    const { data: me } = await admin.from("profiles").select("is_teacher, teacher_status").eq("id", user.id).maybeSingle();
    if (me?.is_teacher || me?.teacher_status === "pending") {
      return json({ intent, error: "Teacher accounts cannot join a class as a student.", success: false }, { status: 400 });
    }
    if (await getStudentClass(admin, user.id)) {
      return json({ intent, error: "You are already in a class. Leave it first to join another one.", success: false }, { status: 400 });
    }

    const { data: invite } = await admin
      .from("edu_class_invites")
      .select("id, class_id, edu_classes(name)")
      .eq("code", code)
      .is("used_by", null)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (!invite) {
      return json({
        intent,
        error: "That invite code is not valid, has already been used, or has expired. Please ask your teacher for a new one.",
        success: false,
      }, { status: 404 });
    }

    const { count } = await admin
      .from("edu_class_members")
      .select("user_id", { count: "exact", head: true })
      .eq("class_id", invite.class_id)
      .eq("role", "student");
    if ((count ?? 0) >= TEACHER_LIMITS.maxStudentsPerClass) {
      return json({ intent, error: "This class is full. Please ask your teacher.", success: false }, { status: 400 });
    }

    await removeJoinRequest(admin, user.id);

    // 同時に 2 人が同じコードを使っても、1 人だけが取れるようにする
    const { data: claimed } = await admin
      .from("edu_class_invites")
      .update({ used_by: user.id, used_at: new Date().toISOString() })
      .eq("id", invite.id)
      .is("used_by", null)
      .is("used_at", null)
      .select("id");
    if (!claimed || claimed.length === 0) {
      return json({ intent, error: "That invite code has already been used. Please ask your teacher for a new one.", success: false }, { status: 409 });
    }

    const { error: requestError } = await admin
      .from("edu_class_join_requests")
      .insert({ class_id: invite.class_id, user_id: user.id, school_email: null, invite_id: invite.id });
    if (requestError) {
      console.error("redeem-invite request failed:", requestError.message);
      await admin.from("edu_class_invites").update({ used_by: null, used_at: null }).eq("id", invite.id);
      return json({ intent, error: "Could not send your request. Please try again.", success: false }, { status: 500 });
    }
    const className = (invite as any).edu_classes?.name ?? "your class";
    return json({ intent, success: true, message: `Request sent to ${className}. Your teacher needs to approve it.` });
  }

  // 💡 生徒：参加申請を取り消す
  if (intent === "cancel-request") {
    const admin = createAdminSupabaseClient(context);
    await removeJoinRequest(admin, user.id);
    return json({ intent, success: true, message: "Your request was cancelled." });
  }

  // 💡 生徒：クラスから抜ける
  if (intent === "leave-class") {
    const admin = createAdminSupabaseClient(context);
    const { error: leaveError } = await admin
      .from("edu_class_members")
      .delete()
      .eq("user_id", user.id)
      .eq("role", "student");
    if (leaveError) {
      return json({ intent, error: "Could not leave the class. Please try again.", success: false }, { status: 500 });
    }
    return json({ intent, success: true, message: "You left the class." });
  }

  return json({ error: "Invalid intent.", success: false }, { status: 400 });
}

/**
 * 生徒の参加申請を消す。招待コードで出した申請なら、そのコードをもう一度使えるように戻す
 * （先生が断った申請のコードは戻さない。断られたときは先生の操作で申請ごと消える）
 */
async function removeJoinRequest(admin: any, userId: string) {
  const { data: old } = await admin.from("edu_class_join_requests").select("invite_id").eq("user_id", userId).maybeSingle();
  await admin.from("edu_class_join_requests").delete().eq("user_id", userId);
  if (old?.invite_id) {
    await admin.from("edu_class_invites").update({ used_by: null, used_at: null }).eq("id", old.invite_id).eq("used_by", userId);
  }
}

/** 生徒の宿題一覧（新しい締切順）と、それぞれのタスクが終わったかどうか */
async function loadStudentHomework(admin: any, classId: string, userId: string): Promise<StudentHomeworkItem[]> {
  const { data: rows } = await admin
    .from("edu_homework")
    .select("id, title, lesson_id, task_keys, due_at")
    .eq("class_id", classId)
    .order("due_at", { ascending: false })
    .limit(30);
  if (!rows || rows.length === 0) return [];

  const lessonIds = [...new Set(rows.map((r: any) => String(r.lesson_id)))];
  const [{ data: lessons }, { data: progress }] = await Promise.all([
    admin.from("edu_lessons").select("id, slug, title_en").in("id", lessonIds),
    admin
      .from("edu_student_progress")
      .select("lesson_id, task_key, is_completed")
      .eq("user_id", userId)
      .in("lesson_id", lessonIds),
  ]);

  const lessonMap = new Map((lessons ?? []).map((l: any) => [String(l.id), l]));
  const done = new Set(
    (progress ?? []).filter((p: any) => p.is_completed).map((p: any) => `${p.lesson_id}:${p.task_key}`)
  );

  return rows.map((r: any) => {
    const lesson: any = lessonMap.get(String(r.lesson_id));
    return {
      id: r.id,
      title: r.title,
      dueAt: r.due_at,
      lessonTitle: lesson?.title_en ?? "Lesson",
      lessonUrl: lesson?.slug ? `/lessons/${lesson.slug}` : "/lessons",
      tasks: (r.task_keys as string[]).map((key) => ({ key, done: done.has(`${r.lesson_id}:${key}`) })),
    };
  });
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

  // 🔄 ユーザーデータとクレジット履歴を最新化する共通関数
  const fetchUserDataAndTransactions = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const activeUser = session?.user ?? rootData?.user ?? initialData.user;

      if (activeUser) {
        setUser(activeUser);
        setUserEmail(activeUser.email ?? "");
        if (activeUser.created_at) {
          setUserCreatedAt(new Date(activeUser.created_at).toLocaleDateString("en-AU"));
        }

        // プロファイル（残高・ニックネーム）の取得
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

        // クレジット履歴（加算・減算両方）の取得
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
  }, [rootData, initialData]);

  // 初回マウント時および rootData 変更時にデータ取得を実行
  useEffect(() => {
    fetchUserDataAndTransactions();
  }, [fetchUserDataAndTransactions]);

  // リアルタイムリスナー（Supabase Realtime）の設定：クレジット加算や減算時に自動で再取得
  useEffect(() => {
    let channel: any = null;

    const setupRealtimeSync = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const activeUser = session?.user ?? rootData?.user ?? initialData.user;

      if (!activeUser?.id) return;

      // profiles テーブルまたは credit_transactions テーブルの変更を監視
      channel = supabase
        .channel(`public:user_credits:${activeUser.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${activeUser.id}`,
          },
          () => {
            // 残高が変動した際に即座にデータを再取得
            fetchUserDataAndTransactions();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'credit_transactions',
            filter: `user_id=eq.${activeUser.id}`,
          },
          () => {
            // 新しいトランザクション（加算・減算履歴）が追加された際に即座に再取得
            fetchUserDataAndTransactions();
          }
        )
        .subscribe();
    };

    setupRealtimeSync();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [rootData, initialData, fetchUserDataAndTransactions]);

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
          initialState={initialData.state}
          initialSchoolName={initialData.schoolName}
          initialSchoolRefId={initialData.schoolRefId}
          onSaved={() => revalidator.revalidate()}
        />

        {/* 1a. 先生アカウントの審査中のお知らせ */}
        {initialData.teacherStatus === "pending" && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-sm text-indigo-900">
            <p className="font-semibold">Your teacher account is being reviewed.</p>
            <p className="text-xs text-indigo-800 mt-1">
              We check every teacher account before classes can be created. Adding your state and school below helps us confirm it.
              You can keep using AI Yamato as usual in the meantime.
            </p>
          </div>
        )}

        {/* 1b. クラス参加・宿題（生徒のみ） */}
        {!initialData.isTeacher && initialData.teacherStatus !== "pending" && user?.id && (
          <StudentClassSection
            studentClass={initialData.studentClass}
            homework={initialData.homework}
            verifiedSchoolEmails={initialData.verifiedSchoolEmails}
            joinRequest={initialData.joinRequest}
          />
        )}

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