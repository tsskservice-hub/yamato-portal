/**
 * @file teacher-dashboard.tsx
 * @description 教師ダッシュボード（無料・機能限定）
 *  - クラスを作り、参加コードを生徒に配る
 *  - レッスンのタスク（vocabulary / listening / reading / speaking / writing）を宿題として出す
 *  - 宿題ごと・生徒ごとの進捗（edu_student_progress）と、期間内の宿題完了率（%）を見る
 *  - 生徒の手書きライティング（edu_writing_submissions と非公開バケットの画像）を見る
 *
 * edu_classes / edu_homework はブラウザから触れないため、すべてこのサーバー側で担任かどうかを確認してから管理者キーで読み書きする。
 */
import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import React, { useRef } from 'react';
import { useActionData, useLoaderData } from '@remix-run/react';
import PageLayout, { type PageLayoutRef } from '~/components/layout/PageLayout';
import { generateJoinCode, getOwnedClass, getTeacherOrApplicant, getVerifiedSchoolEmails, requireTeacher } from '~/lib/teacher.server';
import { SchoolAccountLink } from '~/components/SchoolAccountLink';
import {
  DEFAULT_HANDWRITING_RETENTION_DAYS,
  HANDWRITING_RETENTION_OPTIONS,
  LESSON_TASKS,
  TEACHER_LIMITS,
  allowedStudentDomains,
  isLessonTaskKey,
  isStudentDomainAllowed,
} from '~/lib/teacher-config';
import {
  ClassBar,
  ClassSettingsCard,
  JoinRequestsCard,
  HandwritingCard,
  HomeworkCard,
  CompletionCard,
  type DashboardData,
} from '~/components/teacher/TeacherDashboardSections';

const DAY_MS = 86_400_000;

/** "YYYY-MM-DD" と先生のブラウザの時差（getTimezoneOffset の分）から、その日の始まり（UTC）を返す */
function localDayStart(date: string, tzOffsetMinutes: number): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const utcMidnight = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(utcMidnight)) return null;
  return new Date(utcMidnight + tzOffsetMinutes * 60_000);
}

function parseTz(raw: unknown) {
  const n = Number(raw);
  return Number.isFinite(n) && Math.abs(n) <= 14 * 60 ? n : 0;
}

function toDateInput(d: Date, tzOffsetMinutes: number) {
  return new Date(d.getTime() - tzOffsetMinutes * 60_000).toISOString().slice(0, 10);
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { user, profile, admin } = await getTeacherOrApplicant(request, context);
  const url = new URL(request.url);
  const tz = parseTz(url.searchParams.get('tz'));

  // 先生の学校アカウント（Google / Microsoft で確認済みの学校メール）
  const schoolEmails = (await getVerifiedSchoolEmails(admin, user.id)).map((e) => ({ email: e.email, domain: e.domain }));

  // 審査中：案内と学校アカウントの確認だけ表示する（クラスや生徒のデータは読まない）
  if (!profile.is_teacher) {
    return json({
      pending: true as const,
      teacher: { email: user.email ?? '', nickname: profile.nickname ?? null, schoolName: profile.school_name ?? null },
      schoolEmails,
    });
  }

  const { data: classes } = await admin
    .from('edu_classes')
    .select('id, name, join_code, school_domain, created_at')
    .eq('teacher_id', user.id)
    .order('created_at', { ascending: true });

  const classList = classes ?? [];
  const selected = classList.find((c) => c.id === url.searchParams.get('class')) ?? classList[0] ?? null;

  // 期間（初期値: 今日までの4週間）
  const now = new Date();
  const defaultTo = toDateInput(now, tz);
  const defaultFrom = toDateInput(new Date(now.getTime() - 27 * DAY_MS), tz);
  const fromParam = url.searchParams.get('from') || defaultFrom;
  const toParam = url.searchParams.get('to') || defaultTo;
  const periodStart = localDayStart(fromParam, tz) ?? localDayStart(defaultFrom, tz)!;
  const periodEndDayStart = localDayStart(toParam, tz) ?? localDayStart(defaultTo, tz)!;
  const periodEnd = new Date(periodEndDayStart.getTime() + DAY_MS - 1);

  const { data: lessonRows } = await admin
    .from('edu_lessons')
    .select('id, slug, title_en, title_jp, lesson_order')
    .order('slug', { ascending: true });
  const lessons = (lessonRows ?? []).map((l: any) => ({
    id: String(l.id),
    slug: l.slug as string,
    title: `${l.title_en}${l.title_jp ? ` (${l.title_jp})` : ''}`,
  }));

  const base: DashboardData = {
    teacher: { email: user.email ?? '', nickname: profile.nickname ?? null, schoolName: profile.school_name ?? null },
    limits: TEACHER_LIMITS,
    schoolEmails,
    classes: classList.map((c) => ({ id: c.id, name: c.name })),
    selectedClass: null,
    lessons,
    period: { from: toDateInput(periodStart, tz), to: toDateInput(periodEndDayStart, tz), tz },
    students: [],
    homework: [],
    progress: [],
    handwriting: [],
    joinRequests: [],
    retention: 'none',
  };

  if (!selected) return json(base);

  // 生徒（先生には個人のメールではなく、承認したときの学校メールを見せる）
  const { data: memberRows } = await admin
    .from('edu_class_members')
    .select('user_id, school_email')
    .eq('class_id', selected.id)
    .eq('role', 'student');
  const studentIds = (memberRows ?? []).map((m: any) => m.user_id as string);
  const schoolEmailOf = new Map((memberRows ?? []).map((m: any) => [m.user_id as string, (m.school_email as string | null) ?? '']));

  // 参加申請（先生が承認するまで、生徒のデータは見えない）
  const { data: requestRows } = await admin
    .from('edu_class_join_requests')
    .select('id, user_id, school_email, created_at')
    .eq('class_id', selected.id)
    .order('created_at', { ascending: true });

  const profileIds = [...studentIds, ...(requestRows ?? []).map((r: any) => r.user_id as string)];
  const { data: studentProfiles } = profileIds.length
    ? await admin.from('profiles').select('id, nickname').in('id', profileIds)
    : { data: [] as any[] };
  const nicknameOf = new Map((studentProfiles ?? []).map((p: any) => [p.id as string, (p.nickname as string | null) ?? null]));

  const students = studentIds
    .map((id) => ({ id, nickname: nicknameOf.get(id) ?? null, email: schoolEmailOf.get(id) ?? '' }))
    .sort((a, b) => (a.nickname || a.email).localeCompare(b.nickname || b.email));
  const joinRequests = (requestRows ?? []).map((r: any) => ({
    id: r.id as string,
    nickname: nicknameOf.get(r.user_id) ?? null,
    schoolEmail: r.school_email as string,
    createdAt: r.created_at as string,
  }));

  // 宿題（新しい締切順）
  const { data: homeworkRows } = await admin
    .from('edu_homework')
    .select('id, title, lesson_id, task_keys, due_at, created_at')
    .eq('class_id', selected.id)
    .order('due_at', { ascending: false })
    .limit(100);
  const homework = (homeworkRows ?? []).map((h: any) => ({
    id: h.id as string,
    title: h.title as string,
    lessonId: String(h.lesson_id),
    taskKeys: h.task_keys as string[],
    dueAt: h.due_at as string,
    inPeriod: new Date(h.due_at) >= periodStart && new Date(h.due_at) <= periodEnd,
  }));

  // 進捗（このクラスの生徒 × 宿題に出したレッスン）
  const lessonIds = [...new Set(homework.map((h) => h.lessonId))];
  const { data: progressRows } = studentIds.length && lessonIds.length
    ? await admin
        .from('edu_student_progress')
        .select('user_id, lesson_id, task_key, is_completed, updated_at')
        .in('user_id', studentIds)
        .in('lesson_id', lessonIds)
        .eq('is_completed', true)
    : { data: [] as any[] };
  const progress = (progressRows ?? []).map((p: any) => ({
    userId: p.user_id as string,
    lessonId: String(p.lesson_id),
    taskKey: p.task_key as string,
    completedAt: (p.updated_at as string | null) ?? null,
  }));

  // 手書きライティング（最新 50 件）
  const { data: writingRows } = studentIds.length
    ? await admin
        .from('edu_writing_submissions')
        .select('id, user_id, lesson_id, attempt_no, transcription, classification, created_at, image_path, image_delete_after, image_deleted_at')
        .in('user_id', studentIds)
        .eq('kind', 'submission')
        .order('created_at', { ascending: false })
        .limit(50)
    : { data: [] as any[] };
  const handwriting = (writingRows ?? []).map((w: any) => ({
    id: w.id as string,
    userId: w.user_id as string,
    lessonId: String(w.lesson_id),
    attemptNo: (w.attempt_no as number | null) ?? null,
    transcription: (w.transcription as string | null) ?? '',
    classification: w.classification as string,
    createdAt: w.created_at as string,
    hasImage: Boolean(w.image_path) && !w.image_deleted_at,
    imageDeleteAfter: (w.image_delete_after as string | null) ?? null,
  }));

  const { data: settings } = await admin
    .from('edu_class_writing_settings')
    .select('image_retention_mode, image_retention_days')
    .eq('class_id', selected.id)
    .maybeSingle();
  const retention =
    settings?.image_retention_mode === 'days' && settings.image_retention_days
      ? String(settings.image_retention_days)
      : 'none';

  return json({
    ...base,
    selectedClass: {
      id: selected.id,
      name: selected.name,
      joinCode: selected.join_code,
      allowedDomains: allowedStudentDomains(selected.school_domain),
    },
    joinRequests,
    students,
    homework,
    progress,
    handwriting,
    retention,
  } satisfies DashboardData);
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { user, admin } = await requireTeacher(request, context);
  const form = await request.formData();
  const intent = String(form.get('intent') ?? '');
  const fail = (error: string, status = 400) => json({ intent, ok: false, error }, { status });
  const backTo = (classId?: string) => {
    const back = new URL(request.url);
    if (classId) back.searchParams.set('class', classId);
    return redirect(`${back.pathname}${back.search}`);
  };

  if (intent === 'create-class') {
    const name = String(form.get('name') ?? '').trim().replace(/\s+/g, ' ');
    if (!name || name.length > 60) return fail('Class name must be 1 to 60 characters.');

    // 学校の外の子どもが入れないよう、クラスには先生の確認済みの学校ドメインを記録する
    const schoolEmails = await getVerifiedSchoolEmails(admin, user.id);
    const chosen = schoolEmails.find((e) => e.domain === String(form.get('schoolDomain') ?? '')) ?? schoolEmails[0];
    if (!chosen) return fail('Verify your school Google or Microsoft account before creating a class.');

    const { count } = await admin.from('edu_classes').select('id', { count: 'exact', head: true }).eq('teacher_id', user.id);
    if ((count ?? 0) >= TEACHER_LIMITS.maxClasses) {
      return fail(`The free teacher plan includes ${TEACHER_LIMITS.maxClasses} class. Please contact us about a school plan for more classes.`);
    }

    // 参加コードが他のクラスと重なったら作り直す
    for (let i = 0; i < 5; i++) {
      const { data: created, error } = await admin
        .from('edu_classes')
        .insert({ teacher_id: user.id, name, join_code: generateJoinCode(), school_domain: chosen.domain })
        .select('id')
        .single();
      if (created) {
        await admin.from('edu_class_writing_settings').upsert(
          {
            class_id: created.id,
            image_retention_mode: 'days',
            image_retention_days: DEFAULT_HANDWRITING_RETENTION_DAYS,
            image_retention_until: null,
            max_resubmissions: 2,
            max_photo_retakes: 3,
            updated_at: new Date().toISOString(),
            updated_by: user.id,
          },
          { onConflict: 'class_id' }
        );
        return backTo(created.id);
      }
      if (error && error.code !== '23505') {
        console.error('[teacher-dashboard] create-class failed:', error.message);
        return fail('Could not create the class. Please try again.', 500);
      }
    }
    return fail('Could not create the class. Please try again.', 500);
  }

  // ここから下はすべて「自分のクラス」に対する操作
  const cls = await getOwnedClass(admin, user.id, form.get('classId'));
  if (!cls) return fail('Class not found.', 404);

  if (intent === 'regenerate-code') {
    for (let i = 0; i < 5; i++) {
      const { error } = await admin.from('edu_classes').update({ join_code: generateJoinCode() }).eq('id', cls.id);
      if (!error) return backTo(cls.id);
      if (error.code !== '23505') break;
    }
    return fail('Could not make a new code. Please try again.', 500);
  }

  if (intent === 'delete-class') {
    if (String(form.get('confirmName') ?? '') !== cls.name) return fail('Type the class name exactly to delete it.');
    await admin.from('edu_class_members').delete().eq('class_id', cls.id);
    await admin.from('edu_class_writing_settings').delete().eq('class_id', cls.id);
    const { error } = await admin.from('edu_classes').delete().eq('id', cls.id); // 宿題は ON DELETE CASCADE で消える
    if (error) return fail('Could not delete the class.', 500);
    return backTo();
  }

  if (intent === 'approve-request' || intent === 'decline-request') {
    const { data: req } = await admin
      .from('edu_class_join_requests')
      .select('id, user_id, school_email')
      .eq('id', String(form.get('requestId') ?? ''))
      .eq('class_id', cls.id)
      .maybeSingle();
    if (!req) return fail('Request not found.', 404);

    if (intent === 'approve-request') {
      // 承認する時点でも、学校ドメインと人数をもう一度確認する
      const { data: full } = await admin.from('edu_classes').select('school_domain').eq('id', cls.id).single();
      const domain = String(req.school_email).split('@').pop() ?? '';
      if (!full || !isStudentDomainAllowed(full.school_domain, domain)) {
        return fail("This student's school account does not match your class.");
      }

      const { count } = await admin
        .from('edu_class_members')
        .select('user_id', { count: 'exact', head: true })
        .eq('class_id', cls.id)
        .eq('role', 'student');
      if ((count ?? 0) >= TEACHER_LIMITS.maxStudentsPerClass) {
        return fail(`A class can have up to ${TEACHER_LIMITS.maxStudentsPerClass} students.`);
      }
      const { data: existing } = await admin
        .from('edu_class_members')
        .select('class_id')
        .eq('user_id', req.user_id)
        .eq('role', 'student')
        .limit(1)
        .maybeSingle();
      if (!existing) {
        const { error } = await admin
          .from('edu_class_members')
          .insert({ class_id: cls.id, user_id: req.user_id, role: 'student', school_email: req.school_email });
        if (error) {
          console.error('[teacher-dashboard] approve-request failed:', error.message);
          return fail('Could not add the student. Please try again.', 500);
        }
      }
    }
    await admin.from('edu_class_join_requests').delete().eq('id', req.id);
    return backTo(cls.id);
  }

  if (intent === 'remove-student') {
    const studentId = String(form.get('studentId') ?? '');
    await admin.from('edu_class_members').delete().eq('class_id', cls.id).eq('user_id', studentId).eq('role', 'student');
    return backTo(cls.id);
  }

  if (intent === 'update-retention') {
    const value = String(form.get('retention') ?? '');
    if (!HANDWRITING_RETENTION_OPTIONS.some((o) => o.value === value)) return fail('Invalid option.');
    const days = value === 'none' ? null : Number(value);
    const { error } = await admin.from('edu_class_writing_settings').upsert(
      {
        class_id: cls.id,
        image_retention_mode: days ? 'days' : 'none',
        image_retention_days: days,
        image_retention_until: null,
        max_resubmissions: 2,
        max_photo_retakes: 3,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      },
      { onConflict: 'class_id' }
    );
    if (error) return fail('Could not save the setting.', 500);
    return backTo(cls.id);
  }

  if (intent === 'assign-homework') {
    const lessonId = String(form.get('lessonId') ?? '');
    const taskKeys = [...new Set(form.getAll('taskKeys').map(String))].filter(isLessonTaskKey);
    const title = String(form.get('title') ?? '').trim().replace(/\s+/g, ' ');
    const due = localDayStart(String(form.get('dueDate') ?? ''), parseTz(form.get('tz')));

    if (!lessonId) return fail('Choose a lesson.');
    if (taskKeys.length === 0) return fail('Choose at least one task.');
    if (!due) return fail('Choose a due date.');

    const { data: lesson } = await admin.from('edu_lessons').select('id, title_en').eq('id', lessonId).maybeSingle();
    if (!lesson) return fail('Lesson not found.');

    const finalTitle = (title || `${lesson.title_en} homework`).slice(0, 100);
    const { count } = await admin
      .from('edu_homework')
      .select('id', { count: 'exact', head: true })
      .eq('class_id', cls.id)
      .gte('due_at', new Date().toISOString());
    if ((count ?? 0) >= TEACHER_LIMITS.maxActiveHomeworkPerClass) {
      return fail(`Free teacher accounts can have up to ${TEACHER_LIMITS.maxActiveHomeworkPerClass} upcoming homework per class.`);
    }

    // 締切日の終わり（先生の時間で 23:59:59）
    const dueAt = new Date(due.getTime() + DAY_MS - 1000).toISOString();
    const orderedKeys = LESSON_TASKS.map((t) => t.key).filter((k) => taskKeys.includes(k));
    const { error } = await admin.from('edu_homework').insert({
      class_id: cls.id,
      teacher_id: user.id,
      lesson_id: String(lesson.id),
      task_keys: orderedKeys,
      title: finalTitle,
      due_at: dueAt,
    });
    if (error) {
      console.error('[teacher-dashboard] assign-homework failed:', error.message);
      return fail('Could not set the homework. Please try again.', 500);
    }
    return backTo(cls.id);
  }

  if (intent === 'delete-homework') {
    await admin.from('edu_homework').delete().eq('id', String(form.get('homeworkId') ?? '')).eq('class_id', cls.id);
    return backTo(cls.id);
  }

  return fail('Unknown action.');
}

export default function TeacherDashboardPage() {
  const loaded = useLoaderData<typeof loader>() as unknown as
    | DashboardData
    | { pending: true; teacher: DashboardData['teacher']; schoolEmails: DashboardData['schoolEmails'] };
  const actionData = useActionData<{ ok?: boolean; error?: string }>();
  const layoutRef = useRef<PageLayoutRef>(null);

  if ('pending' in loaded) {
    return (
      <PageLayout ref={layoutRef}>
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="bg-white border border-indigo-200 rounded-xl shadow-sm p-6 space-y-3">
            <h1 className="text-xl font-bold text-slate-800">👩‍🏫 Your teacher account is being reviewed</h1>
            <p className="text-sm text-slate-700">
              Thanks for signing up as a teacher{loaded.teacher.nickname ? `, ${loaded.teacher.nickname}` : ''}! To protect students,
              we check every teacher account before classes can be created. Once approved, your Teacher Dashboard will open here
              and a &quot;Teacher Panel&quot; button will appear in the header.
            </p>
            <div className="border-t border-slate-100 pt-3 space-y-2">
              <p className="text-sm font-semibold text-slate-800">Verify your school account</p>
              <p className="text-sm text-slate-700">
                Sign in with the Google or Microsoft account your school gave you. We approve teacher accounts with a verified school email,
                and only students with an account from your school can ask to join your class.
              </p>
              <SchoolAccountLink verifiedEmails={loaded.schoolEmails} returnPath="/teacher-dashboard" />
            </div>
            <p className="text-sm text-slate-700">
              It also helps if your <a href="/my-account" className="text-indigo-700 font-semibold hover:underline">My Account</a> page shows
              your state and school. You can use AI Yamato as usual in the meantime.
            </p>
          </div>
        </div>
      </PageLayout>
    );
  }
  const data = loaded;

  return (
    <PageLayout ref={layoutRef}>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <header className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-800">👩‍🏫 Teacher Dashboard</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {[data.teacher.nickname, data.teacher.schoolName, data.teacher.email].filter(Boolean).join(' · ')}
            </p>
          </div>
          <span className="self-start sm:self-auto text-[11px] font-bold px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700">
            Free teacher plan · {data.limits.maxClasses} class / up to {data.limits.maxStudentsPerClass} students
          </span>
        </header>

        {actionData?.error && (
          <p role="alert" className="text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {actionData.error}
          </p>
        )}

        <ClassBar data={data} />

        {data.selectedClass && (
          <>
            <JoinRequestsCard data={data} />
            <ClassSettingsCard data={data} />
            <HomeworkCard data={data} />
            <CompletionCard data={data} />
            <HandwritingCard data={data} />
          </>
        )}
      </div>
    </PageLayout>
  );
}

export const meta: MetaFunction = () => [
  { title: 'Teacher Dashboard | AI Yamato Japanese Hub' },
  { name: 'robots', content: 'noindex, nofollow' },
];
