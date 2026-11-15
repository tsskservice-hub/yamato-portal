/**
 * @file lesson-settings.server.ts
 * @description 先生がクラスに設定したレッスンのタスクの設定（サーバー専用。31_class_vocab_limits.sql）
 *
 * 今あるもの：語彙ドリルで 1 つのモードに出す語の数の上限（vocabWordsPerMode）
 *  - 初期値は制限なし（null＝そのレッスンの語を全部出す）
 *  - 優先順：生徒ごとの設定（edu_class_student_settings）＞ レッスンごとの設定（edu_class_lesson_settings）
 *            ＞ クラスの全レッスン一括の設定（edu_classes.vocab_words_per_mode）＞ 制限なし
 *  - 生徒が複数のクラスに入っている場合は、いちばん小さい上限を使う
 *  - クラスに入っていない人（個人の学習者・先生）は制限なし
 * DB の読み込みに失敗したとき・SQL 31 を実行する前は、制限なしにする（学習が止まらないように）
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export interface LessonTaskSettings {
  vocabWordsPerMode: number | null;
}

const NO_LIMIT: LessonTaskSettings = { vocabWordsPerMode: null };

/** 1〜50 の整数なら返す（それ以外は null＝制限なし） */
export function parseVocabLimit(raw: unknown): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 50 ? n : null;
}

export async function getLessonTaskSettingsForUser(
  admin: SupabaseClient,
  userId: string,
  lessonId: string
): Promise<LessonTaskSettings> {
  const { data: memberships, error: memberError } = await admin
    .from('edu_class_members')
    .select('class_id')
    .eq('user_id', userId)
    .eq('role', 'student');
  if (memberError) {
    console.error('[lesson-settings] members query failed:', memberError.message);
    return NO_LIMIT;
  }
  const classIds = (memberships ?? []).map((m: any) => m.class_id as string).filter(Boolean);
  if (classIds.length === 0) return NO_LIMIT;

  const [classRes, lessonRes, studentRes] = await Promise.all([
    admin.from('edu_classes').select('id, vocab_words_per_mode').in('id', classIds),
    admin
      .from('edu_class_lesson_settings')
      .select('class_id, vocab_words_per_mode')
      .in('class_id', classIds)
      .eq('lesson_id', lessonId),
    admin
      .from('edu_class_student_settings')
      .select('class_id, vocab_words_per_mode')
      .in('class_id', classIds)
      .eq('user_id', userId),
  ]);
  if (classRes.error || lessonRes.error || studentRes.error) {
    // SQL 31 の前は列・表が無いのでここに来る
    console.warn(
      '[lesson-settings] settings query failed:',
      classRes.error?.message ?? lessonRes.error?.message ?? studentRes.error?.message
    );
    return NO_LIMIT;
  }

  const limitMap = (rows: any[] | null) =>
    new Map((rows ?? []).map((r: any) => [r.class_id as string, parseVocabLimit(r.vocab_words_per_mode)]));
  const studentLimitOf = limitMap(studentRes.data);
  const lessonLimitOf = limitMap(lessonRes.data);
  const limits = (classRes.data ?? [])
    .map((c: any) => {
      if (studentLimitOf.get(c.id) != null) return studentLimitOf.get(c.id)!;
      if (lessonLimitOf.get(c.id) != null) return lessonLimitOf.get(c.id)!;
      return parseVocabLimit(c.vocab_words_per_mode);
    })
    .filter((v): v is number => typeof v === 'number');

  return { vocabWordsPerMode: limits.length ? Math.min(...limits) : null };
}
