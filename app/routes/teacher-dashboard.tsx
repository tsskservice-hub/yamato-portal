/**
 * @file teacher-dashboard.tsx
 * @description 教師ダッシュボード（無料・機能限定）
 *  - クラスを作り、参加コードを生徒に配る
 *  - 宿題（homework）・授業内の課題（classwork）を、クラス全員または選んだ生徒に出す（SQL 42）
 *    出せるもの: レッスンのタスク（6 つから選ぶ）／先生が作った語彙クイズ（edu_teacher_quizzes）
 *  - 宿題・課題ごと・生徒ごとの進捗（edu_student_progress / edu_quiz_attempts）と、期間内の完了率（%）を見る
 *  - 生徒の手書きライティング（edu_writing_submissions と非公開バケットの画像）を見る
 *  - ゲームをクラス全体でロック／ロック解除、生徒 1 人ずつロック解除する（判定は lib/game-access.server.ts）
 *  - 語彙ドリルで 1 つのモードに出す語の数を、全レッスン一括・レッスンごとに制限する（lib/lesson-settings.server.ts）
 *
 * edu_classes / edu_homework はブラウザから触れないため、すべてこのサーバー側で担任かどうかを確認してから管理者キーで読み書きする。
 */
import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import React, { useRef } from 'react';
import { useActionData, useLoaderData, type ShouldRevalidateFunction } from '@remix-run/react';
import PageLayout, { type PageLayoutRef } from '~/components/layout/PageLayout';
import {
  generateInviteCode,
  generateJoinCode,
  getOwnedClass,
  getTeacherOrApplicant,
  getVerifiedSchoolEmails,
  requireTeacher,
} from '~/lib/teacher.server';
import { SchoolAccountLink } from '~/components/SchoolAccountLink';
import {
  DEFAULT_HANDWRITING_RETENTION_DAYS,
  HANDWRITING_RETENTION_OPTIONS,
  INVITE_CODE_DAYS,
  INVITE_LABEL_MAX,
  LESSON_TASKS,
  TEACHER_LIMITS,
  VOCAB_QUIZ_LIMITS,
  allowedStudentDomains,
  assignmentKindLabel,
  isAssignmentKind,
  isLessonTaskKey,
  isStudentDomainAllowed,
} from '~/lib/teacher-config';
import { parseVocabLimit } from '~/lib/lesson-settings.server';
import { loadClassAssignments } from '~/lib/assignments.server';
import {
  ClassBar,
  ClassSettingsCard,
  LessonTaskSettingsCard,
  GamesCard,
  JoinRequestsCard,
  InviteCodesCard,
  HandwritingCard,
  type DashboardData,
} from '~/components/teacher/TeacherDashboardSections';
import {
  AssignCard,
  AssignmentListCard,
  CompletionCard,
  StudentProgressDialog,
  StudentsCard,
  VocabQuizCard,
} from '~/components/teacher/AssignmentSections';
import { BackToTopButton, DashboardJumpNav } from '~/components/teacher/DashboardJumpNav';
import { SchoolHoursCard } from '~/components/teacher/SchoolHoursSections';

const DAY_MS = 86_400_000;

/** "YYYY-MM-DD" と先生のブラウザの時差（getTimezoneOffset の分）から、その日の始まり（UTC）を返す */
function localDayStart(date: string, tzOffsetMinutes: number): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const utcMidnight = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(utcMidnight)) return null;
  return new Date(utcMidnight + tzOffsetMinutes * 60_000);
}

// 宿題の学校時間ブロックの初期値（edu_classes の列の初期値と同じ。SQL 44）
const DEFAULT_SCHOOL_HOURS = { timezone: 'Australia/Melbourne', start: '08:45', end: '15:15', days: [1, 2, 3, 4, 5] };

/** そのタイムゾーンでの今日 "YYYY-MM-DD" */
function localDateIn(timeZone: string, date = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

function isValidTimeZone(tz: string) {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return tz.length > 0 && tz.length <= 64;
  } catch {
    return false;
  }
}

/** クラスのタイムゾーン（SQL 44 の前は初期値） */
async function classTimeZone(admin: any, classId: string) {
  const { data } = await admin.from('edu_classes').select('school_timezone').eq('id', classId).maybeSingle();
  return String(data?.school_timezone || DEFAULT_SCHOOL_HOURS.timezone);
}

function parseTz(raw: unknown) {
  const n = Number(raw);
  return Number.isFinite(n) && Math.abs(n) <= 14 * 60 ? n : 0;
}

function toDateInput(d: Date, tzOffsetMinutes: number) {
  return new Date(d.getTime() - tzOffsetMinutes * 60_000).toISOString().slice(0, 10);
}

/** 生徒一覧の 2 行目（学校メール、なければ招待コードに付けたメモ） */
function memberSubtitle(schoolEmail: string | null, inviteLabel: string | null) {
  if (schoolEmail) return schoolEmail;
  return inviteLabel ? `Invite code: ${inviteLabel}` : 'Joined with an invite code';
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
    .select('id, name, join_code, school_domain, games_locked, created_at')
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
    .select('id, slug, title_en, title_jp, lesson_order, site_order')
    .order('site_order', { ascending: true, nullsFirst: false })
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
    invites: [],
    retention: 'none',
    vocabLimits: { available: false, classDefault: null, lessons: [], students: [] },
    assignmentsAvailable: false,
    quizzes: [],
    quizStats: [],
    schoolHours: { ...DEFAULT_SCHOOL_HOURS, available: false, offToday: false, today: localDateIn(DEFAULT_SCHOOL_HOURS.timezone) },
    homeworkUnlocks: [],
  };

  if (!selected) return json(base);

  // 生徒（先生には個人のメールではなく、承認したときの学校メール、または招待コードに付けたメモを見せる）
  const { data: memberRows } = await admin
    .from('edu_class_members')
    .select('user_id, school_email, invite_label')
    .eq('class_id', selected.id)
    .eq('role', 'student');
  const studentIds = (memberRows ?? []).map((m: any) => m.user_id as string);
  const schoolEmailOf = new Map(
    (memberRows ?? []).map((m: any) => [m.user_id as string, memberSubtitle(m.school_email, m.invite_label)])
  );

  // 参加申請（先生が承認するまで、生徒のデータは見えない）
  const { data: requestRows } = await admin
    .from('edu_class_join_requests')
    .select('id, user_id, school_email, invite_id, created_at')
    .eq('class_id', selected.id)
    .order('created_at', { ascending: true });

  // 生徒 1 人ずつの招待コード（新しい順）
  const { data: inviteRows } = await admin
    .from('edu_class_invites')
    .select('id, code, label, expires_at, used_by, used_at, created_at')
    .eq('class_id', selected.id)
    .order('created_at', { ascending: false })
    .limit(200);
  const inviteOf = new Map((inviteRows ?? []).map((i: any) => [i.id as string, i]));

  const profileIds = [
    ...new Set([
      ...studentIds,
      ...(requestRows ?? []).map((r: any) => r.user_id as string),
      ...(inviteRows ?? []).filter((i: any) => i.used_by).map((i: any) => i.used_by as string),
    ]),
  ];
  const { data: studentProfiles } = profileIds.length
    ? await admin.from('profiles').select('id, nickname').in('id', profileIds)
    : { data: [] as any[] };
  const nicknameOf = new Map((studentProfiles ?? []).map((p: any) => [p.id as string, (p.nickname as string | null) ?? null]));

  const students = studentIds
    .map((id) => ({ id, nickname: nicknameOf.get(id) ?? null, email: schoolEmailOf.get(id) ?? '' }))
    .sort((a, b) => (a.nickname || a.email).localeCompare(b.nickname || b.email));
  const joinRequests = (requestRows ?? []).map((r: any) => {
    const invite: any = r.invite_id ? inviteOf.get(r.invite_id) : null;
    return {
      id: r.id as string,
      nickname: nicknameOf.get(r.user_id) ?? null,
      schoolEmail: (r.school_email as string | null) ?? null,
      inviteCode: (invite?.code as string | undefined) ?? null,
      inviteLabel: (invite?.label as string | null | undefined) ?? null,
      createdAt: r.created_at as string,
    };
  });
  const nowMs = Date.now();
  const invites = (inviteRows ?? []).map((i: any) => ({
    id: i.id as string,
    code: i.code as string,
    label: (i.label as string | null) ?? null,
    expiresAt: i.expires_at as string,
    status: (i.used_by || i.used_at ? 'used' : new Date(i.expires_at).getTime() < nowMs ? 'expired' : 'unused') as
      | 'used'
      | 'expired'
      | 'unused',
    usedByName: i.used_by ? nicknameOf.get(i.used_by) ?? 'A student' : null,
  }));

  // 宿題・課題（新しい締切順）。SQL 42 の前は新しい列が無いので、今までの形で読む（新しい機能は「まだ使えない」と表示）
  const assignments = await loadClassAssignments(admin, selected.id, user.id);
  // 宿題の学校時間ブロック（SQL 44）：クラスの学校時間と、生徒ごとの解除
  let schoolHours = base.schoolHours;
  let homeworkUnlocks: DashboardData['homeworkUnlocks'] = [];
  if (assignments.schoolHoursAvailable) {
    const { data: hours } = await admin
      .from('edu_classes')
      .select('school_timezone, school_start, school_end, school_days, homework_lock_off_date')
      .eq('id', selected.id)
      .maybeSingle();
    if (hours) {
      const timezone = String(hours.school_timezone || DEFAULT_SCHOOL_HOURS.timezone);
      const today = localDateIn(timezone);
      schoolHours = {
        available: true,
        timezone,
        start: String(hours.school_start).slice(0, 5),
        end: String(hours.school_end).slice(0, 5),
        days: (hours.school_days as number[] | null) ?? DEFAULT_SCHOOL_HOURS.days,
        offToday: hours.homework_lock_off_date === today,
        today,
      };
      const { data: unlockRows } = await admin
        .from('edu_class_homework_unlocks')
        .select('user_id, until_date')
        .eq('class_id', selected.id)
        .gte('until_date', today);
      homeworkUnlocks = (unlockRows ?? []).map((u: any) => ({ userId: String(u.user_id), untilDate: String(u.until_date) }));
    }
  }

  const homework = assignments.items.map((h) => ({
    ...h,
    inPeriod: new Date(h.dueAt) >= periodStart && new Date(h.dueAt) <= periodEnd,
  }));

  // 進捗（このクラスの生徒 × 宿題に出したレッスン）
  const lessonIds = [...new Set(homework.map((h) => h.lessonId).filter((id): id is string => Boolean(id)))];
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

  // 語彙ドリルの語数の制限（31_class_vocab_limits.sql）。SQL の前は読めないので「まだ使えない」と表示する
  const [vocabDefaultRes, vocabLessonRes, vocabStudentRes] = await Promise.all([
    admin.from('edu_classes').select('vocab_words_per_mode').eq('id', selected.id).maybeSingle(),
    admin.from('edu_class_lesson_settings').select('lesson_id, vocab_words_per_mode').eq('class_id', selected.id),
    admin.from('edu_class_student_settings').select('user_id, vocab_words_per_mode').eq('class_id', selected.id),
  ]);
  const vocabLimits: DashboardData['vocabLimits'] =
    vocabDefaultRes.error || vocabLessonRes.error || vocabStudentRes.error
      ? { available: false, classDefault: null, lessons: [], students: [] }
      : {
          available: true,
          classDefault: parseVocabLimit((vocabDefaultRes.data as any)?.vocab_words_per_mode),
          lessons: (vocabLessonRes.data ?? [])
            .map((r: any) => ({ lessonId: String(r.lesson_id), limit: parseVocabLimit(r.vocab_words_per_mode) }))
            .filter((r) => r.limit !== null) as Array<{ lessonId: string; limit: number }>,
          // クラスを抜けた生徒の行は出さない
          students: (vocabStudentRes.data ?? [])
            .map((r: any) => ({ userId: String(r.user_id), limit: parseVocabLimit(r.vocab_words_per_mode) }))
            .filter((r) => r.limit !== null && studentIds.includes(r.userId)) as Array<{ userId: string; limit: number }>,
        };

  // ゲームのロック（クラス全体）と、ロック中に個別にロック解除した生徒（21_class_game_locks.sql）
  const { data: unlockRows } = selected.games_locked
    ? await admin.from('edu_class_game_unlocks').select('user_id').eq('class_id', selected.id)
    : { data: [] as any[] };
  const memberSet = new Set(studentIds);
  const gameUnlockedIds = (unlockRows ?? []).map((u: any) => u.user_id as string).filter((id) => memberSet.has(id));

  return json({
    ...base,
    selectedClass: {
      id: selected.id,
      name: selected.name,
      joinCode: selected.join_code,
      allowedDomains: allowedStudentDomains(selected.school_domain),
      gamesLocked: Boolean(selected.games_locked),
      gameUnlockedIds,
    },
    joinRequests,
    invites,
    students,
    homework,
    progress,
    handwriting,
    retention,
    vocabLimits,
    assignmentsAvailable: assignments.available,
    quizzes: assignments.quizzes,
    quizStats: assignments.quizStats,
    schoolHours,
    homeworkUnlocks,
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
      .select('id, user_id, school_email, invite_id')
      .eq('id', String(form.get('requestId') ?? ''))
      .eq('class_id', cls.id)
      .maybeSingle();
    if (!req) return fail('Request not found.', 404);

    if (intent === 'approve-request') {
      // 承認する時点でも、学校ドメイン（または このクラスの招待コード）と人数をもう一度確認する
      let inviteLabel: string | null = null;
      if (req.school_email) {
        const { data: full } = await admin.from('edu_classes').select('school_domain').eq('id', cls.id).single();
        const domain = String(req.school_email).split('@').pop() ?? '';
        if (!full || !isStudentDomainAllowed(full.school_domain, domain)) {
          return fail("This student's school account does not match your class.");
        }
      } else {
        const { data: invite } = req.invite_id
          ? await admin.from('edu_class_invites').select('code, label').eq('id', req.invite_id).eq('class_id', cls.id).maybeSingle()
          : { data: null };
        if (!invite) return fail('This request has no valid invite code for your class.');
        inviteLabel = (invite.label as string | null) || `Invite ${invite.code}`;
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
          .insert({
            class_id: cls.id,
            user_id: req.user_id,
            role: 'student',
            school_email: req.school_email ?? null,
            invite_label: inviteLabel,
          });
        if (error) {
          console.error('[teacher-dashboard] approve-request failed:', error.message);
          return fail('Could not add the student. Please try again.', 500);
        }
      }
    }
    await admin.from('edu_class_join_requests').delete().eq('id', req.id);
    return backTo(cls.id);
  }

  // 生徒 1 人ずつの使い捨て招待コードを作る（学校が Google を使っていない生徒のため）
  //   1 行に 1 人分のメモ（先生にだけ見える）を書けば、その行数だけ作る。空なら「何枚」の数だけ作る
  if (intent === 'create-invites') {
    const labels = String(form.get('labels') ?? '')
      .split(/\r?\n/)
      .map((l) => l.trim().replace(/\s+/g, ' ').slice(0, INVITE_LABEL_MAX))
      .filter(Boolean);
    const count = labels.length || Math.floor(Number(form.get('count') ?? 0));
    if (!Number.isFinite(count) || count < 1) return fail('Enter how many codes to make, or one student per line.');

    const { count: members } = await admin
      .from('edu_class_members')
      .select('user_id', { count: 'exact', head: true })
      .eq('class_id', cls.id)
      .eq('role', 'student');
    const { count: openInvites } = await admin
      .from('edu_class_invites')
      .select('id', { count: 'exact', head: true })
      .eq('class_id', cls.id)
      .is('used_by', null)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString());
    const room = TEACHER_LIMITS.maxStudentsPerClass - (members ?? 0) - (openInvites ?? 0);
    if (count > room) {
      return fail(
        room > 0
          ? `You can make up to ${room} more code${room === 1 ? '' : 's'} (a class has up to ${TEACHER_LIMITS.maxStudentsPerClass} students, including unused codes).`
          : 'This class has no room for more codes. Remove unused codes or students first.'
      );
    }

    const expiresAt = new Date(Date.now() + INVITE_CODE_DAYS * DAY_MS).toISOString();
    for (let attempt = 0; attempt < 5; attempt++) {
      const rows = Array.from({ length: count }, (_, i) => ({
        class_id: cls.id,
        code: generateInviteCode(),
        label: labels[i] ?? null,
        expires_at: expiresAt,
      }));
      const { error } = await admin.from('edu_class_invites').insert(rows);
      if (!error) return backTo(cls.id);
      if (error.code !== '23505') {
        console.error('[teacher-dashboard] create-invites failed:', error.message);
        break;
      }
    }
    return fail('Could not make the codes. Please try again.', 500);
  }

  // 招待コードを取り消す（そのコードでの参加申請も消える。承認済みの生徒はクラスに残る）
  if (intent === 'delete-invite') {
    await admin.from('edu_class_invites').delete().eq('id', String(form.get('inviteId') ?? '')).eq('class_id', cls.id);
    return backTo(cls.id);
  }

  if (intent === 'remove-student') {
    const studentId = String(form.get('studentId') ?? '');
    await admin.from('edu_class_members').delete().eq('class_id', cls.id).eq('user_id', studentId).eq('role', 'student');
    await admin.from('edu_class_game_unlocks').delete().eq('class_id', cls.id).eq('user_id', studentId);
    // 生徒ごとの語彙ドリルの設定も消す（SQL 31 の前は表が無いが、エラーは無視してよい）
    await admin.from('edu_class_student_settings').delete().eq('class_id', cls.id).eq('user_id', studentId);
    // このクラスで「選んだ生徒」に出していた宿題・課題の対象からも外す（SQL 42 の前は表が無いが、エラーは無視してよい）
    const { data: classHw } = await admin.from('edu_homework').select('id').eq('class_id', cls.id);
    const hwIds = (classHw ?? []).map((h: any) => h.id);
    if (hwIds.length) await admin.from('edu_homework_students').delete().eq('user_id', studentId).in('homework_id', hwIds);
    await admin.from('edu_class_homework_unlocks').delete().eq('class_id', cls.id).eq('user_id', studentId);
    return backTo(cls.id);
  }

  // ゲームのロック（授業中に生徒がゲームに夢中にならないように）
  //   クラス全体をロック／ロック解除すると、個別のロック解除はリセットする（次の授業はまた全員ロックから始める）
  if (intent === 'lock-games' || intent === 'unlock-games') {
    const locked = intent === 'lock-games';
    const { error } = await admin
      .from('edu_classes')
      .update({ games_locked: locked, games_locked_at: locked ? new Date().toISOString() : null })
      .eq('id', cls.id);
    if (error) {
      console.error('[teacher-dashboard] game lock failed:', error.message);
      return fail('Could not change the game lock. Please try again.', 500);
    }
    await admin.from('edu_class_game_unlocks').delete().eq('class_id', cls.id);
    return backTo(cls.id);
  }

  // ロック中のクラスで、生徒 1 人だけロック解除する（課題が早く終わった生徒など）／もう一度ロックする
  if (intent === 'unlock-student-games' || intent === 'relock-student-games') {
    const studentId = String(form.get('studentId') ?? '');
    const { data: member } = await admin
      .from('edu_class_members')
      .select('user_id')
      .eq('class_id', cls.id)
      .eq('user_id', studentId)
      .eq('role', 'student')
      .maybeSingle();
    if (!member) return fail('Student not found.', 404);

    const { error } = intent === 'unlock-student-games'
      ? await admin
          .from('edu_class_game_unlocks')
          .upsert({ class_id: cls.id, user_id: studentId, unlocked_at: new Date().toISOString() }, { onConflict: 'class_id,user_id' })
      : await admin.from('edu_class_game_unlocks').delete().eq('class_id', cls.id).eq('user_id', studentId);
    if (error) {
      console.error('[teacher-dashboard] student game lock failed:', error.message);
      return fail('Could not change the game lock for this student. Please try again.', 500);
    }
    return backTo(cls.id);
  }

  // 語彙ドリルの語数の制限：全レッスン一括（空 = 制限なし）
  if (intent === 'update-vocab-default') {
    const raw = String(form.get('limit') ?? '');
    const limit = raw === '' ? null : parseVocabLimit(raw);
    if (raw !== '' && limit === null) return fail('Choose a number of words between 1 and 50.');
    const { error } = await admin.from('edu_classes').update({ vocab_words_per_mode: limit }).eq('id', cls.id);
    if (error) {
      console.error('[teacher-dashboard] vocab default failed:', error.message);
      return fail('Could not save the vocabulary setting. Please try again.', 500);
    }
    return backTo(cls.id);
  }

  // 語彙ドリルの語数の制限：レッスンごと（全レッスン一括の設定より優先）／レッスンごとの設定を消す
  if (intent === 'set-lesson-vocab' || intent === 'clear-lesson-vocab') {
    const lessonId = String(form.get('lessonId') ?? '');
    const { data: lesson } = await admin.from('edu_lessons').select('id').eq('id', lessonId).maybeSingle();
    if (!lesson) return fail('Lesson not found.');

    if (intent === 'clear-lesson-vocab') {
      await admin.from('edu_class_lesson_settings').delete().eq('class_id', cls.id).eq('lesson_id', String(lesson.id));
      return backTo(cls.id);
    }

    const limit = parseVocabLimit(form.get('limit'));
    if (limit === null) return fail('Choose a number of words between 1 and 50.');
    const { error } = await admin.from('edu_class_lesson_settings').upsert(
      {
        class_id: cls.id,
        lesson_id: String(lesson.id),
        vocab_words_per_mode: limit,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      },
      { onConflict: 'class_id,lesson_id' }
    );
    if (error) {
      console.error('[teacher-dashboard] lesson vocab failed:', error.message);
      return fail('Could not save the vocabulary setting. Please try again.', 500);
    }
    return backTo(cls.id);
  }

  // 語彙ドリルの語数の制限：生徒ごと（いちばん優先。全レッスンに効く）／生徒ごとの設定を消す
  if (intent === 'set-student-vocab' || intent === 'clear-student-vocab') {
    const studentId = String(form.get('studentId') ?? '');
    const { data: member } = await admin
      .from('edu_class_members')
      .select('user_id')
      .eq('class_id', cls.id)
      .eq('user_id', studentId)
      .eq('role', 'student')
      .maybeSingle();
    if (!member) return fail('Student not found.', 404);

    if (intent === 'clear-student-vocab') {
      await admin.from('edu_class_student_settings').delete().eq('class_id', cls.id).eq('user_id', studentId);
      return backTo(cls.id);
    }

    const limit = parseVocabLimit(form.get('limit'));
    if (limit === null) return fail('Choose a number of words between 1 and 50.');
    const { error } = await admin.from('edu_class_student_settings').upsert(
      {
        class_id: cls.id,
        user_id: studentId,
        vocab_words_per_mode: limit,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      },
      { onConflict: 'class_id,user_id' }
    );
    if (error) {
      console.error('[teacher-dashboard] student vocab failed:', error.message);
      return fail('Could not save the vocabulary setting. Please try again.', 500);
    }
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

  // 宿題・課題を出す（レッスンのタスク または 語彙クイズ。クラス全員 または 選んだ生徒）
  if (intent === 'assign-homework') {
    const kind = isAssignmentKind(form.get('kind')) ? (form.get('kind') as string) : 'homework';
    const itemType = form.get('itemType') === 'vocab_quiz' ? 'vocab_quiz' : 'lesson';
    const assignTo = form.get('assignTo') === 'students' ? 'students' : 'class';
    const title = String(form.get('title') ?? '').trim().replace(/\s+/g, ' ');
    const due = localDayStart(String(form.get('dueDate') ?? ''), parseTz(form.get('tz')));
    if (!due) return fail('Choose a due date.');

    // 新しい形（課題・語彙クイズ・選んだ生徒）は SQL 42 が必要。今までの形（クラス全員の宿題でレッスン）だけは前と同じに出せる
    const isNewShape = kind !== 'homework' || itemType !== 'lesson' || assignTo !== 'class';

    let studentIds: string[] = [];
    if (assignTo === 'students') {
      const picked = [...new Set(form.getAll('studentIds').map(String))];
      if (picked.length === 0) return fail('Choose at least one student, or assign it to the whole class.');
      const { data: members } = await admin
        .from('edu_class_members')
        .select('user_id')
        .eq('class_id', cls.id)
        .eq('role', 'student')
        .in('user_id', picked);
      studentIds = (members ?? []).map((m: any) => String(m.user_id));
      if (studentIds.length === 0) return fail('Those students are not in this class.');
    }

    const row: Record<string, unknown> = { class_id: cls.id, teacher_id: user.id };
    let defaultTitle = '';
    if (itemType === 'lesson') {
      const lessonId = String(form.get('lessonId') ?? '');
      const taskKeys = [...new Set(form.getAll('taskKeys').map(String))].filter(isLessonTaskKey);
      if (!lessonId) return fail('Choose a lesson.');
      if (taskKeys.length === 0) return fail('Choose at least one task.');
      const { data: lesson } = await admin.from('edu_lessons').select('id, title_en').eq('id', lessonId).maybeSingle();
      if (!lesson) return fail('Lesson not found.');
      row.lesson_id = String(lesson.id);
      row.task_keys = LESSON_TASKS.map((t) => t.key).filter((k) => taskKeys.includes(k));
      defaultTitle = String(lesson.title_en);
    } else {
      const { data: quiz } = await admin
        .from('edu_teacher_quizzes')
        .select('id, title')
        .eq('id', String(form.get('quizId') ?? ''))
        .eq('teacher_id', user.id)
        .maybeSingle();
      if (!quiz) return fail('Choose one of your vocabulary quizzes.');
      row.quiz_id = quiz.id;
      row.lesson_id = null;
      row.task_keys = null;
      defaultTitle = String(quiz.title);
    }

    const { count } = await admin
      .from('edu_homework')
      .select('id', { count: 'exact', head: true })
      .eq('class_id', cls.id)
      .gte('due_at', new Date().toISOString());
    if ((count ?? 0) >= TEACHER_LIMITS.maxActiveHomeworkPerClass) {
      return fail(`Free teacher accounts can have up to ${TEACHER_LIMITS.maxActiveHomeworkPerClass} upcoming homework and classwork per class.`);
    }

    row.title = (title || `${defaultTitle} ${assignmentKindLabel(kind).toLowerCase()}`).slice(0, 100);
    // 締切の日時（先生の時間）。時刻がなければ、その日の終わり（23:59:59）
    const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(form.get('dueTime') ?? ''));
    row.due_at = timeMatch
      ? new Date(due.getTime() + Number(timeMatch[1]) * 3_600_000 + Number(timeMatch[2]) * 60_000).toISOString()
      : new Date(due.getTime() + DAY_MS - 1000).toISOString();
    row.kind = kind;
    row.item_type = itemType;
    row.assign_to = assignTo;
    // 宿題を学校時間中にもしてよいか（初期値: してはいけない）。課題は授業中にやるもの
    const allowDuringSchool = kind === 'homework' && form.get('allowDuringSchool') === 'on';
    if (allowDuringSchool) row.allow_during_school = true;

    let { data: created, error } = await admin.from('edu_homework').insert(row).select('id').single();
    if (error && /allow_during_school/.test(error.message)) {
      // SQL 44 の前：学校時間のブロックはまだ無いので、その列を外して出す
      delete row.allow_during_school;
      ({ data: created, error } = await admin.from('edu_homework').insert(row).select('id').single());
    }
    if (error && !isNewShape && /kind|item_type|assign_to/.test(error.message)) {
      // SQL 42 の前：今までの列だけで出す
      delete row.kind; delete row.item_type; delete row.assign_to;
      ({ data: created, error } = await admin.from('edu_homework').insert(row).select('id').single());
    }
    if (error || !created) {
      console.error('[teacher-dashboard] assign-homework failed:', error?.message);
      return fail(
        isNewShape
          ? 'Could not set this. Classwork, vocabulary quizzes and assigning to selected students need a database update (SQL 42).'
          : 'Could not set the homework. Please try again.',
        500
      );
    }

    if (studentIds.length) {
      const { error: targetError } = await admin
        .from('edu_homework_students')
        .insert(studentIds.map((id) => ({ homework_id: created!.id, user_id: id })));
      if (targetError) {
        console.error('[teacher-dashboard] homework targets failed:', targetError.message);
        await admin.from('edu_homework').delete().eq('id', created.id);
        return fail('Could not save the students for this. Please try again.', 500);
      }
    }
    return backTo(cls.id);
  }

  // 出したあとで、対象（クラス全員 / 選んだ生徒）を変える
  if (intent === 'update-homework-targets') {
    const { data: hw } = await admin
      .from('edu_homework')
      .select('id')
      .eq('id', String(form.get('homeworkId') ?? ''))
      .eq('class_id', cls.id)
      .maybeSingle();
    if (!hw) return fail('Not found.', 404);

    const assignTo = form.get('assignTo') === 'students' ? 'students' : 'class';
    let studentIds: string[] = [];
    if (assignTo === 'students') {
      const picked = [...new Set(form.getAll('studentIds').map(String))];
      const { data: members } = picked.length
        ? await admin.from('edu_class_members').select('user_id').eq('class_id', cls.id).eq('role', 'student').in('user_id', picked)
        : { data: [] as any[] };
      studentIds = (members ?? []).map((m: any) => String(m.user_id));
      if (studentIds.length === 0) return fail('Choose at least one student, or assign it to the whole class.');
    }

    await admin.from('edu_homework_students').delete().eq('homework_id', hw.id);
    if (studentIds.length) {
      const { error } = await admin.from('edu_homework_students').insert(studentIds.map((id) => ({ homework_id: hw.id, user_id: id })));
      if (error) return fail('Could not save the students. Please try again.', 500);
    }
    const { error } = await admin.from('edu_homework').update({ assign_to: assignTo }).eq('id', hw.id);
    if (error) return fail('Could not save the students. Please try again.', 500);
    return backTo(cls.id);
  }

  // 宿題の学校時間（クラスごと）: タイムゾーン・始まり・終わり・曜日
  if (intent === 'update-school-hours') {
    const timezone = String(form.get('timezone') ?? '');
    const start = String(form.get('start') ?? '');
    const end = String(form.get('end') ?? '');
    const days = [...new Set(form.getAll('days').map(Number))].filter((d) => Number.isInteger(d) && d >= 1 && d <= 7).sort();
    const timeOk = (t: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
    if (!isValidTimeZone(timezone)) return fail('Choose a time zone.');
    if (!timeOk(start) || !timeOk(end) || start >= end) return fail('School hours must start before they end.');
    const { error } = await admin
      .from('edu_classes')
      .update({ school_timezone: timezone, school_start: start, school_end: end, school_days: days })
      .eq('id', cls.id);
    if (error) {
      console.error('[teacher-dashboard] school hours failed:', error.message);
      return fail('Could not save school hours. This needs a database update (SQL 44).', 500);
    }
    return backTo(cls.id);
  }

  // クラス全体で「今日はブロックしない」（研修日・遠足など）／元に戻す
  if (intent === 'school-day-off-today' || intent === 'school-day-on') {
    const today = localDateIn(await classTimeZone(admin, cls.id));
    const { error } = await admin
      .from('edu_classes')
      .update({ homework_lock_off_date: intent === 'school-day-off-today' ? today : null })
      .eq('id', cls.id);
    if (error) return fail('Could not change this. This needs a database update (SQL 44).', 500);
    return backTo(cls.id);
  }

  // 生徒ごとに、学校時間でも宿題をしてよくする（休んだ生徒など）。「今日だけ」または「〇日まで」／元に戻す
  if (intent === 'unlock-student-homework' || intent === 'relock-student-homework') {
    const studentId = String(form.get('studentId') ?? '');
    const { data: member } = await admin
      .from('edu_class_members')
      .select('user_id')
      .eq('class_id', cls.id)
      .eq('user_id', studentId)
      .eq('role', 'student')
      .maybeSingle();
    if (!member) return fail('Student not found.', 404);

    if (intent === 'relock-student-homework') {
      await admin.from('edu_class_homework_unlocks').delete().eq('class_id', cls.id).eq('user_id', studentId);
      return backTo(cls.id);
    }

    const today = localDateIn(await classTimeZone(admin, cls.id));
    const raw = String(form.get('until') ?? '');
    const until = raw === 'today' || raw === '' ? today : raw;
    const maxDate = localDateIn('UTC', new Date(Date.now() + 90 * DAY_MS));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(until) || until < today || until > maxDate) {
      return fail('Choose a date from today up to 90 days ahead.');
    }
    const { error } = await admin.from('edu_class_homework_unlocks').upsert(
      { class_id: cls.id, user_id: studentId, until_date: until, created_at: new Date().toISOString(), created_by: user.id },
      { onConflict: 'class_id,user_id' }
    );
    if (error) {
      console.error('[teacher-dashboard] unlock homework failed:', error.message);
      return fail('Could not change this. This needs a database update (SQL 44).', 500);
    }
    return backTo(cls.id);
  }

  if (intent === 'delete-homework') {
    await admin.from('edu_homework').delete().eq('id', String(form.get('homeworkId') ?? '')).eq('class_id', cls.id);
    return backTo(cls.id);
  }

  // 語彙クイズを作る（サイトの単語帳から選んだ語は、サーバーで単語帳から読み直して写す）
  if (intent === 'create-quiz') {
    const title = String(form.get('title') ?? '').trim().replace(/\s+/g, ' ');
    if (!title || title.length > VOCAB_QUIZ_LIMITS.titleMax) return fail(`Quiz name must be 1 to ${VOCAB_QUIZ_LIMITS.titleMax} characters.`);

    let raw: unknown;
    try { raw = JSON.parse(String(form.get('items') ?? '[]')); } catch { raw = []; }
    const list = Array.isArray(raw) ? raw.slice(0, VOCAB_QUIZ_LIMITS.maxWords + 1) : [];
    if (list.length < VOCAB_QUIZ_LIMITS.minWords || list.length > VOCAB_QUIZ_LIMITS.maxWords) {
      return fail(`A quiz needs ${VOCAB_QUIZ_LIMITS.minWords} to ${VOCAB_QUIZ_LIMITS.maxWords} words.`);
    }

    const { count: quizCount } = await admin
      .from('edu_teacher_quizzes')
      .select('id', { count: 'exact', head: true })
      .eq('teacher_id', user.id);
    if ((quizCount ?? 0) >= VOCAB_QUIZ_LIMITS.maxQuizzesPerTeacher) {
      return fail(`You can keep up to ${VOCAB_QUIZ_LIMITS.maxQuizzesPerTeacher} quizzes. Delete an old quiz first.`);
    }

    const vocabIds = list.map((it: any) => (typeof it?.vocabularyId === 'string' ? it.vocabularyId : '')).filter(Boolean);
    const { data: vocabRows } = vocabIds.length
      ? await admin.from('kl_vocabulary').select('id, jp_text, jp_kana, english_text, audio_url').in('id', vocabIds)
      : { data: [] as any[] };
    const vocabOf = new Map((vocabRows ?? []).map((v: any) => [String(v.id), v]));

    const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : '');
    const items: Array<{ vocabulary_id: string | null; jp_text: string; jp_kana: string | null; english_text: string; audio_url: string | null }> = [];
    for (const it of list as any[]) {
      const site = typeof it?.vocabularyId === 'string' ? vocabOf.get(it.vocabularyId) : null;
      const jp = site ? clean(site.jp_text, VOCAB_QUIZ_LIMITS.jpMax) : clean(it?.jp, VOCAB_QUIZ_LIMITS.jpMax);
      const kana = site ? clean(site.jp_kana, VOCAB_QUIZ_LIMITS.jpMax) : clean(it?.kana, VOCAB_QUIZ_LIMITS.jpMax);
      const english = site ? clean(site.english_text, VOCAB_QUIZ_LIMITS.englishMax) : clean(it?.english, VOCAB_QUIZ_LIMITS.englishMax);
      if (!jp || !english) return fail('Every word needs Japanese and English.');
      items.push({
        vocabulary_id: site ? String(site.id) : null,
        jp_text: jp,
        jp_kana: kana && kana !== jp ? kana : null,
        english_text: english,
        audio_url: site?.audio_url ? String(site.audio_url) : null,
      });
    }
    // 4 択の選択肢が重ならないよう、英語の意味は全部違うものにする
    if (new Set(items.map((i) => i.english_text.toLowerCase())).size !== items.length) {
      return fail('Two words have the same English meaning. Each word needs a different English meaning for the multiple-choice quiz.');
    }

    const { data: quiz, error } = await admin
      .from('edu_teacher_quizzes')
      .insert({ teacher_id: user.id, title })
      .select('id')
      .single();
    if (error || !quiz) {
      console.error('[teacher-dashboard] create-quiz failed:', error?.message);
      return fail('Could not save the quiz. Vocabulary quizzes need a database update (SQL 42).', 500);
    }
    const { error: itemsError } = await admin
      .from('edu_teacher_quiz_items')
      .insert(items.map((it, i) => ({ ...it, quiz_id: quiz.id, position: i })));
    if (itemsError) {
      console.error('[teacher-dashboard] create-quiz items failed:', itemsError.message);
      await admin.from('edu_teacher_quizzes').delete().eq('id', quiz.id);
      return fail('Could not save the quiz words. Please try again.', 500);
    }
    return backTo(cls.id);
  }

  // 語彙クイズを消す（そのクイズを使った宿題・課題と、生徒の結果も消える）
  if (intent === 'delete-quiz') {
    await admin.from('edu_teacher_quizzes').delete().eq('id', String(form.get('quizId') ?? '')).eq('teacher_id', user.id);
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
              <SchoolAccountLink verifiedEmails={loaded.schoolEmails} returnPath="/teacher-dashboard" teacherHelp />
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
            {/* 💡 ページ内のジャンプボタン。よく使うもの（上）と、たまに使う設定（下）に分けて並べる */}
            <DashboardJumpNav data={data} />

            {/* 参加申請は、来ているときだけ一番上に出す（承認しないと生徒が使えないため） */}
            <JoinRequestsCard data={data} />

            {/* ---------- 日々よく使うもの ---------- */}
            <div id="td-assign" className="scroll-mt-20"><AssignCard data={data} /></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <div id="td-homework" className="scroll-mt-20 min-w-0"><AssignmentListCard data={data} kind="homework" /></div>
              <div id="td-classwork" className="scroll-mt-20 min-w-0"><AssignmentListCard data={data} kind="classwork" /></div>
            </div>
            <div id="td-completion" className="scroll-mt-20"><CompletionCard data={data} /></div>
            <div id="td-quizzes" className="scroll-mt-20"><VocabQuizCard data={data} /></div>
            <div id="td-handwriting" className="scroll-mt-20"><HandwritingCard data={data} /></div>
            <div id="td-students" className="scroll-mt-20"><StudentsCard data={data} /></div>

            {/* ---------- たまに使う設定 ---------- */}
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 pt-4 border-t border-slate-200">Class settings</h2>
            {/* Class Code は 1 列（全幅）。その下に 2 列：左 Personal Invite Codes、右 Games */}
            <div id="td-class-code" className="scroll-mt-20"><ClassSettingsCard data={data} /></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <div id="td-invites" className="scroll-mt-20 min-w-0"><InviteCodesCard data={data} /></div>
              <div id="td-games" className="scroll-mt-20 min-w-0"><GamesCard data={data} /></div>
            </div>
            <div id="td-school-hours" className="scroll-mt-20"><SchoolHoursCard data={data} /></div>
            <div id="td-vocab-length" className="scroll-mt-20"><LessonTaskSettingsCard data={data} /></div>

            {/* 生徒の名前を押すと開く、その生徒の宿題・課題すべての進捗（?student=ID） */}
            <StudentProgressDialog data={data} />
          </>
        )}
        <BackToTopButton />
      </div>
    </PageLayout>
  );
}

/** 生徒の進捗を開く・閉じる（?student= だけが変わる）ときは、データを読み直さない（表示だけ切り替える） */
export const shouldRevalidate: ShouldRevalidateFunction = ({ currentUrl, nextUrl, formMethod, defaultShouldRevalidate }) => {
  if (formMethod && formMethod.toUpperCase() !== 'GET') return defaultShouldRevalidate;
  if (currentUrl.pathname !== nextUrl.pathname) return defaultShouldRevalidate;
  const strip = (u: URL) => {
    const p = new URLSearchParams(u.search);
    p.delete('student');
    p.sort();
    return p.toString();
  };
  return strip(currentUrl) === strip(nextUrl) ? false : defaultShouldRevalidate;
};

export const meta: MetaFunction = () => [
  { title: 'Teacher Dashboard | AI Yamato Japanese Hub' },
  { name: 'robots', content: 'noindex, nofollow' },
];
