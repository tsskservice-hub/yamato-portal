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
import { appendClearAuthCookies, createAdminSupabaseClient, createServerSupabaseClient } from '~/lib/supabase.server';
import { supabase } from '~/lib/supabaseClient';

// モジュール化したコンポーネントのインポート
import { TutorPreferencesSection } from '~/components/TutorPreferencesSection';
import { TimezoneSection } from '~/components/TimezoneSection';
import { PlanSection } from '~/components/billing/PlanSection';
import { RegistrationDetails } from '~/components/RegistrationDetails';
import { CreditTransactionsSection } from '~/components/CreditTransactionsSection';
import { DeleteAccountModal } from '~/components/DeleteAccountModal';
import { StudentClassSection, type StudentHomeworkItem } from '~/components/StudentClassSection';
import { loadQuizStats, loadStudentAssignments } from '~/lib/assignments.server';
import { getClassLockUntil } from '~/lib/homework-lock.server';
import { countsAsDone, homeworkStatus } from '~/lib/homework-status';
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
      initialCredits = (profile as any).credits ?? 0;
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

    // 手書きの写真とライティングの提出記録を先に消す（アカウントを消しても写真のファイルが残らないように）
    // 失敗しても削除は止めない。記録が消えれば、写真はデータベースの削除待ちリストから毎日の処理で消える（SQL 20）
    await deleteHandwritingSubmissions(supabaseAdmin, user.id);

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      return json({ error: "Failed to delete account: " + deleteError.message, success: false }, { status: 500 });
    }

    // 🔐 サーバー用のログイン Cookie をすべて消す（以前は存在しない名前の Cookie を消していた）
    appendClearAuthCookies(request, headers);
    return redirect("/", { headers });
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

/** アカウント削除の前に、その人の手書きの写真（非公開バケット）とライティングの提出記録を消す */
async function deleteHandwritingSubmissions(admin: any, userId: string) {
  try {
    const { data: rows } = await admin
      .from("edu_writing_submissions")
      .select("image_path")
      .eq("user_id", userId)
      .not("image_path", "is", null);
    const paths = (rows ?? []).map((r: any) => r.image_path as string).filter(Boolean);
    if (paths.length > 0) {
      const { error } = await admin.storage.from("writing-submissions").remove(paths);
      if (error) console.error("delete-account: could not delete handwriting images:", error.message);
    }
    const { error: rowError } = await admin.from("edu_writing_submissions").delete().eq("user_id", userId);
    if (rowError) console.error("delete-account: could not delete writing submissions:", rowError.message);
  } catch (err) {
    console.error("delete-account: handwriting cleanup failed:", err);
  }
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

/**
 * 生徒の宿題・課題一覧（新しい締切順）。自分が対象のものだけ（クラス全員 または 選ばれた生徒）。
 * レッスンはタスクごとに終わったか、語彙クイズは最高点と回数（SQL 42）
 */
async function loadStudentHomework(admin: any, classId: string, userId: string): Promise<StudentHomeworkItem[]> {
  const rows = await loadStudentAssignments(admin, classId, userId);
  if (rows.length === 0) return [];

  const lessonIds = [...new Set(rows.map((r) => r.lessonId).filter((id): id is string => Boolean(id)))];
  const quizIds = [...new Set(rows.map((r) => r.quizId).filter((id): id is string => Boolean(id)))];
  // 今、学校時間のブロック中か（宿題で「授業中もしてよい」でないものに効く。SQL 47）
  const lockedUntil = await getClassLockUntil(admin, classId, userId);
  const lockOf = (r: { kind: string; allowDuringSchool: boolean }) =>
    r.kind === "homework" && !r.allowDuringSchool ? lockedUntil : null;

  // いつ終えたか（completed_at, SQL 48。その前は updated_at）
  const readProgress = (columns: string) =>
    admin.from("edu_student_progress").select(columns).eq("user_id", userId).in("lesson_id", lessonIds);
  const loadProgress = async () => {
    if (!lessonIds.length) return { data: [] };
    const withCompletedAt = await readProgress("lesson_id, task_key, is_completed, updated_at, completed_at");
    return withCompletedAt.error ? readProgress("lesson_id, task_key, is_completed, updated_at") : withCompletedAt;
  };

  const [{ data: lessons }, { data: progress }, { data: quizzes }, quizStats] = await Promise.all([
    lessonIds.length ? admin.from("edu_lessons").select("id, slug, title_en").in("id", lessonIds) : { data: [] },
    loadProgress(),
    quizIds.length ? admin.from("edu_teacher_quizzes").select("id, title").in("id", quizIds) : { data: [] },
    loadQuizStats(admin, rows.filter((r) => r.itemType === "vocab_quiz").map((r) => r.id), [userId]),
  ]);

  const lessonMap = new Map((lessons ?? []).map((l: any) => [String(l.id), l]));
  const quizMap = new Map((quizzes ?? []).map((q: any) => [String(q.id), String(q.title)]));
  const statMap = new Map(quizStats.map((st) => [st.homeworkId, st]));
  const completedAt = new Map<string, string>(
    (progress ?? [])
      .filter((p: any) => p.is_completed)
      .map((p: any) => [`${p.lesson_id}:${p.task_key}`, String(p.completed_at ?? p.updated_at ?? "1970-01-01T00:00:00Z")])
  );

  return rows.map((r) => {
    if (r.itemType === "vocab_quiz") {
      const st = statMap.get(r.id);
      return {
        id: r.id,
        title: r.title,
        kind: r.kind,
        dueAt: r.dueAt,
        catchupUntil: r.catchupUntil,
        status: homeworkStatus(r, st?.firstAt ?? null),
        itemType: "vocab_quiz" as const,
        lessonTitle: quizMap.get(r.quizId ?? "") ?? "Vocabulary quiz",
        lessonUrl: `/class-quiz/${r.id}`,
        tasks: [],
        quiz: st ? { best: st.best, total: st.total, attempts: st.attempts } : { best: null, total: null, attempts: 0 },
        lockedUntil: lockOf(r),
      };
    }
    const lesson: any = lessonMap.get(String(r.lessonId));
    const times = r.taskKeys.map((key) => completedAt.get(`${r.lessonId}:${key}`) ?? null);
    const finishedAt = times.some((t) => !t) ? null : times.reduce((a, b) => (a! > b! ? a : b), times[0]);
    return {
      id: r.id,
      title: r.title,
      kind: r.kind,
      dueAt: r.dueAt,
      catchupUntil: r.catchupUntil,
      status: homeworkStatus(r, finishedAt),
      itemType: "lesson" as const,
      lessonTitle: lesson?.title_en ?? "Lesson",
      lessonUrl: lesson?.slug ? `/lessons/${lesson.slug}` : "/lessons",
      // 宿題として数えるのは、閉じるまでに終えたタスクだけ
      tasks: r.taskKeys.map((key) => ({ key, done: countsAsDone(r, completedAt.get(`${r.lessonId}:${key}`) ?? null) })),
      quiz: null,
      lockedUntil: lockOf(r),
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
          .select("id, amount, feature_used, description, created_at, expires_at, balance_after")
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

  // 💡 生徒のクラス・宿題・課題のセクション。クラスに入っている生徒は一番上、まだの生徒は今まで通りの位置に出す
  const showStudentClass = !initialData.isTeacher && initialData.teacherStatus !== "pending" && Boolean(user?.id);
  const inClass = Boolean(initialData.studentClass);
  const studentClassSection = (
    <StudentClassSection
      studentClass={initialData.studentClass}
      homework={initialData.homework}
      verifiedSchoolEmails={initialData.verifiedSchoolEmails}
      joinRequest={initialData.joinRequest}
    />
  );

  return (
    <ToolPageWrapper layoutRef={layoutRef}>
      <div className="max-w-4xl mx-auto p-6 space-y-8 min-h-[70vh]">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage your AI tutor preferences, registration details, subscription plan, and credit history.
          </p>
        </div>

        {/* 0. クラスに入っている生徒（学校の生徒）は、宿題・課題がいちばん大事なので一番上に出す */}
        {showStudentClass && inClass && studentClassSection}

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

        {/* 1-2. タイムゾーン（デイリークイズの切り替わり。変更は 30 日に 1 回まで） */}
        <PlanSection userId={user?.id} />
        <TimezoneSection userId={user?.id} />

        {/* 1a. 先生アカウントの審査中のお知らせ */}
        {initialData.teacherStatus === "pending" && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-sm text-indigo-900">
            <p className="font-semibold">Your teacher account is being reviewed.</p>
            <p className="text-xs text-indigo-800 mt-1">
              We check every teacher account before classes can be created. Adding your state and school below helps us confirm it.
              You can keep using AI Yamato as usual in the meantime.
            </p>
            <a href="/teacher-dashboard" className="inline-block mt-2 text-xs font-semibold text-indigo-700 hover:underline">
              Open your Teacher Dashboard to verify your school Google account →
            </a>
          </div>
        )}

        {/* 1b. クラス参加・宿題（クラスにまだ入っていない生徒は、ここ＝今まで通りの位置） */}
        {showStudentClass && !inClass && studentClassSection}

        {/* 2. 総合的なアカウント情報セクション（モジュール化） */}
        <RegistrationDetails
          email={userEmail}
          plan={userPlan}
          credits={credits}
          createdAt={userCreatedAt}
        />

        {/* 3. クレジット履歴セクション（モジュール化）。列が多いので、広い画面ではこのセクションだけ左右に広げる */}
        <CreditTransactionsSection
          transactions={transactions}
          isLoading={isLoadingTransactions}
          className="lg:-mx-8 xl:-mx-24"
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