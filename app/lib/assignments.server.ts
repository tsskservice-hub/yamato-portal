/**
 * @file assignments.server.ts
 * @description 宿題・課題（edu_homework）と、教師が作る語彙クイズのサーバー専用ヘルパー（SQL 42）
 *
 * どの表もブラウザからは読めない。呼び出す側が「担任か」「その生徒が対象か」を確認してから使うこと。
 * SQL 42 の前（新しい列・表が無い）でも、今までの宿題（レッスンのタスク・クラス全員）は読めるようにしてある。
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { VOCAB_QUIZ_LIMITS, isAssignmentKind, type AssignmentKind } from '~/lib/teacher-config';

export type AssignmentItem = {
  id: string;
  title: string;
  kind: AssignmentKind;
  itemType: 'lesson' | 'vocab_quiz';
  lessonId: string | null;
  taskKeys: string[];
  quizId: string | null;
  assignTo: 'class' | 'students';
  /** assignTo = 'students' のときの対象の生徒 */
  studentIds: string[];
  dueAt: string;
  /** 宿題を学校時間中にもしてよいか（SQL 47。課題は常に true 扱い） */
  allowDuringSchool: boolean;
  /** 締切の後、終えていない生徒が終えられる期限（SQL 48。null = 締切で閉じる） */
  catchupUntil: string | null;
};

// 読む列（新しい SQL ほど列が多い）。古いデータベースでも読めるよう、順に試す
const COLUMN_SETS = [
  'id, title, kind, item_type, lesson_id, task_keys, quiz_id, assign_to, due_at, allow_during_school, catchup_until', // SQL 48 の後
  'id, title, kind, item_type, lesson_id, task_keys, quiz_id, assign_to, due_at, allow_during_school', // SQL 47 の後
  'id, title, kind, item_type, lesson_id, task_keys, quiz_id, assign_to, due_at', // SQL 42 の後
  'id, title, lesson_id, task_keys, due_at', // それより前
];

/** edu_homework を、使える列で読む。level: 0 = SQL 48 まで、1 = SQL 47 まで、2 = SQL 42 まで、3 = それより前 */
async function selectHomework(admin: SupabaseClient, classId: string, limit: number) {
  for (let level = 0; level < COLUMN_SETS.length; level++) {
    const { data, error } = await admin
      .from('edu_homework')
      .select(COLUMN_SETS[level])
      .eq('class_id', classId)
      .order('due_at', { ascending: false })
      .limit(limit);
    if (!error) return { rows: (data ?? []) as any[], level };
  }
  return { rows: [] as any[], level: 3 };
}

export type QuizSummary = { id: string; title: string; wordCount: number; createdAt: string };

/** 語彙クイズの結果（宿題 × 生徒ごと）: 最高点・回数・最後にやった日 */
export type QuizStat = {
  homeworkId: string; userId: string; best: number; total: number; attempts: number; lastAt: string;
  /** 最初にやった時刻（期限内に終えたかの判定に使う） */
  firstAt: string;
};

function toItem(h: any, studentIds: string[]): AssignmentItem {
  return {
    id: String(h.id),
    title: String(h.title),
    kind: isAssignmentKind(h.kind) ? h.kind : 'homework',
    itemType: h.item_type === 'vocab_quiz' ? 'vocab_quiz' : 'lesson',
    lessonId: h.lesson_id ? String(h.lesson_id) : null,
    taskKeys: Array.isArray(h.task_keys) ? (h.task_keys as string[]) : [],
    quizId: h.quiz_id ? String(h.quiz_id) : null,
    assignTo: h.assign_to === 'students' ? 'students' : 'class',
    studentIds,
    dueAt: String(h.due_at),
    allowDuringSchool: h.kind === 'classwork' || h.allow_during_school === true,
    catchupUntil: h.catchup_until ? String(h.catchup_until) : null,
  };
}

/** その生徒に出されているか */
export function isAssignedTo(item: Pick<AssignmentItem, 'assignTo' | 'studentIds'>, userId: string) {
  return item.assignTo === 'class' || item.studentIds.includes(userId);
}

/** 対象の生徒（assignTo = 'students'）を宿題ごとにまとめて読む */
async function loadTargets(admin: SupabaseClient, homeworkIds: string[]) {
  const map = new Map<string, string[]>();
  if (homeworkIds.length === 0) return map;
  const { data } = await admin.from('edu_homework_students').select('homework_id, user_id').in('homework_id', homeworkIds);
  for (const r of data ?? []) {
    const list = map.get(String(r.homework_id)) ?? [];
    list.push(String(r.user_id));
    map.set(String(r.homework_id), list);
  }
  return map;
}

/** 語彙クイズの結果を、宿題 × 生徒ごとに集計する */
export async function loadQuizStats(admin: SupabaseClient, homeworkIds: string[], userIds?: string[]): Promise<QuizStat[]> {
  if (homeworkIds.length === 0) return [];
  let query = admin.from('edu_quiz_attempts').select('homework_id, user_id, score, total, created_at').in('homework_id', homeworkIds);
  if (userIds) {
    if (userIds.length === 0) return [];
    query = query.in('user_id', userIds);
  }
  const { data } = await query;
  const stats = new Map<string, QuizStat>();
  for (const a of data ?? []) {
    const key = `${a.homework_id}:${a.user_id}`;
    const s = stats.get(key);
    const pct = (n: number, t: number) => (t > 0 ? n / t : 0);
    if (!s) {
      stats.set(key, {
        homeworkId: String(a.homework_id),
        userId: String(a.user_id),
        best: Number(a.score),
        total: Number(a.total),
        attempts: 1,
        lastAt: String(a.created_at),
        firstAt: String(a.created_at),
      });
    } else {
      s.attempts += 1;
      if (pct(Number(a.score), Number(a.total)) > pct(s.best, s.total)) {
        s.best = Number(a.score);
        s.total = Number(a.total);
      }
      if (String(a.created_at) > s.lastAt) s.lastAt = String(a.created_at);
      if (String(a.created_at) < s.firstAt) s.firstAt = String(a.created_at);
    }
  }
  return [...stats.values()];
}

/** 先生のダッシュボード用：クラスの宿題・課題、先生のクイズ一覧、クイズの結果 */
export async function loadClassAssignments(admin: SupabaseClient, classId: string, teacherId: string) {
  const { rows, level } = await selectHomework(admin, classId, 200);

  if (level === 3) {
    // SQL 42 の前：今までの列だけ
    return {
      available: false,
      schoolHoursAvailable: false,
      catchupAvailable: false,
      items: rows.map((h: any) => toItem(h, [])),
      quizzes: [] as QuizSummary[],
      quizStats: [] as QuizStat[],
    };
  }

  const list = rows;
  const targets = await loadTargets(admin, list.filter((h: any) => h.assign_to === 'students').map((h: any) => String(h.id)));
  const items = list.map((h: any) => toItem(h, targets.get(String(h.id)) ?? []));

  const [quizzes, quizStats] = await Promise.all([
    loadTeacherQuizzes(admin, teacherId),
    loadQuizStats(admin, items.filter((i) => i.itemType === 'vocab_quiz').map((i) => i.id)),
  ]);
  return { available: true, schoolHoursAvailable: level <= 1, catchupAvailable: level === 0, items, quizzes, quizStats };
}

export async function loadTeacherQuizzes(admin: SupabaseClient, teacherId: string): Promise<QuizSummary[]> {
  const { data: quizzes } = await admin
    .from('edu_teacher_quizzes')
    .select('id, title, created_at')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false })
    .limit(VOCAB_QUIZ_LIMITS.maxQuizzesPerTeacher);
  const ids = (quizzes ?? []).map((q: any) => String(q.id));
  const counts = new Map<string, number>();
  if (ids.length) {
    const { data: items } = await admin.from('edu_teacher_quiz_items').select('quiz_id').in('quiz_id', ids);
    for (const it of items ?? []) counts.set(String(it.quiz_id), (counts.get(String(it.quiz_id)) ?? 0) + 1);
  }
  return (quizzes ?? []).map((q: any) => ({
    id: String(q.id),
    title: String(q.title),
    wordCount: counts.get(String(q.id)) ?? 0,
    createdAt: String(q.created_at),
  }));
}

// ---------- 生徒用 ----------

/** 生徒に出されている宿題・課題（クラスのうち、自分が対象のものだけ） */
export async function loadStudentAssignments(admin: SupabaseClient, classId: string, userId: string) {
  const { rows, level } = await selectHomework(admin, classId, 60);

  let items: AssignmentItem[];
  if (level === 3) {
    items = rows.map((h: any) => toItem(h, []));
  } else {
    const list = rows;
    // 自分が対象かどうかだけ分かればよい（ほかの生徒の名前は読まない）
    const studentOnly = list.filter((h: any) => h.assign_to === 'students').map((h: any) => String(h.id));
    const mine = new Set<string>();
    if (studentOnly.length) {
      const { data } = await admin
        .from('edu_homework_students')
        .select('homework_id')
        .in('homework_id', studentOnly)
        .eq('user_id', userId);
      for (const r of data ?? []) mine.add(String(r.homework_id));
    }
    items = list
      .map((h: any) => toItem(h, mine.has(String(h.id)) ? [userId] : []))
      .filter((i) => isAssignedTo(i, userId));
  }
  return items;
}

/**
 * 生徒が語彙クイズを開く・提出するときの確認：そのクラスの生徒で、その宿題の対象か。
 * よければ宿題とクイズの単語を返す
 */
export async function getStudentQuizAssignment(admin: SupabaseClient, homeworkId: string, userId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(homeworkId)) return null;
  const { data: hw } = await admin
    .from('edu_homework')
    .select('*')
    .eq('id', homeworkId)
    .maybeSingle();
  if (!hw || hw.item_type !== 'vocab_quiz' || !hw.quiz_id) return null;

  const { data: member } = await admin
    .from('edu_class_members')
    .select('user_id')
    .eq('class_id', hw.class_id)
    .eq('user_id', userId)
    .eq('role', 'student')
    .maybeSingle();
  if (!member) return null;

  if (hw.assign_to === 'students') {
    const { data: target } = await admin
      .from('edu_homework_students')
      .select('user_id')
      .eq('homework_id', hw.id)
      .eq('user_id', userId)
      .maybeSingle();
    if (!target) return null;
  }

  const { data: items } = await admin
    .from('edu_teacher_quiz_items')
    .select('id, position, jp_text, jp_kana, english_text, audio_url')
    .eq('quiz_id', hw.quiz_id)
    .order('position', { ascending: true });

  return {
    homework: {
      id: String(hw.id),
      title: String(hw.title),
      kind: (isAssignmentKind(hw.kind) ? hw.kind : 'homework') as AssignmentKind,
      dueAt: String(hw.due_at),
      catchupUntil: hw.catchup_until ? String(hw.catchup_until) : null,
    },
    items: (items ?? []).map((it: any) => ({
      id: String(it.id),
      jp: String(it.jp_text),
      kana: (it.jp_kana as string | null) ?? null,
      english: String(it.english_text),
      audioUrl: (it.audio_url as string | null) ?? null,
    })),
  };
}
