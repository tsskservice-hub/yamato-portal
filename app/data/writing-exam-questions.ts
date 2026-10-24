/**
 * @file writing-exam-questions.ts
 * @description Decoupled TypeScript logic & Supabase client integration for Writing Exam Questions Database.
 * Stores data in Supabase 'app_knowledge' table under key: 'writing-exam-questions' (or 'WRITING_EXAM_QUESTIONS').
 */

import { SupabaseClient } from '@supabase/supabase-js';

// --- Type Definitions ---
export interface WritingExamQuestion {
  id: number;
  category: 'Informative' | 'Evaluative' | 'Persuasive' | 'Personal' | 'Imaginative';
  textType: string;
  english: string;
  japanese: string;
}

export type WritingExamQuestionsData = WritingExamQuestion[];
export type WritingExamQuestionsDataPayload = WritingExamQuestionsData;

// --- Fallback & Default Data (取得失敗時の案内メッセージ) ---
export const WRITING_EXAM_QUESTIONS_FALLBACK: WritingExamQuestion[] = [
  {
    id: 0,
    category: "Informative",
    textType: "Notice",
    english: "Currently, exam questions are temporarily unavailable. We apologize for the inconvenience. Please contact support@jptutoraiyamato.com for assistance.",
    japanese: "ただいま問題を表示できません。恐れ入りますが、support@jptutoraiyamato.com までご連絡ください。"
  }
];

// デフォルトエクスポートにもフォールバックを設定
export default WRITING_EXAM_QUESTIONS_FALLBACK;

export interface AppKnowledgeRecord<T = any> {
  id?: string;
  key: string;
  title: string;
  category: string;
  data: T;
  created_at?: string;
  updated_at?: string;
}

// 💡 Supabase の key カラムに登録されている文字列に合わせて設定してください
// （Supabase側が小文字ハイフンの場合は 'writing-exam-questions' にしてください）
const KNOWLEDGE_KEY = 'WRITING_EXAM_QUESTIONS';

/**
 * Fetch Writing Exam Questions Database data from Supabase 'app_knowledge' table.
 * 取得に失敗した場合は、案内メッセージが入ったフォールバック配列を安全に返します。
 */
export async function fetchWritingExamQuestionsData(
  supabaseClient: SupabaseClient
): Promise<WritingExamQuestionsData> {
  try {
    const { data: row, error } = await supabaseClient
      .from('app_knowledge')
      .select('*')
      .eq('key', KNOWLEDGE_KEY)
      .single();

    if (error || !row) {
      console.warn(`[${KNOWLEDGE_KEY}] Supabaseからの取得失敗またはデータ未登録のため、フォールバック案内を返します:`, error?.message);
      return WRITING_EXAM_QUESTIONS_FALLBACK;
    }

    // 💡 カラム名が 'data' の場合と 'content_json' の場合の双方に対応
    const questions = (row.data || row.content_json) as WritingExamQuestionsData;
    if (Array.isArray(questions) && questions.length > 0) {
      return questions;
    }

    return WRITING_EXAM_QUESTIONS_FALLBACK;
  } catch (err) {
    console.error(`Error fetching ${KNOWLEDGE_KEY} from Supabase:`, err);
    return WRITING_EXAM_QUESTIONS_FALLBACK;
  }
}

/**
 * Upsert Writing Exam Questions Database data to Supabase 'app_knowledge' table.
 */
export async function upsertWritingExamQuestionsData(
  supabaseClient: SupabaseClient,
  content: WritingExamQuestionsData,
  category = 'VCE Japanese Data'
): Promise<boolean> {
  const { error } = await supabaseClient
    .from('app_knowledge')
    .upsert({
      key: KNOWLEDGE_KEY,
      title: 'Writing Exam Questions Database',
      category,
      data: content, // 💡 Supabaseの標準カラム名 'data' に格納
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });

  if (error) {
    console.error(`Error upserting ${KNOWLEDGE_KEY} to Supabase:`, error);
    return false;
  }
  return true;
}

// --- Helper & Utility Logic ---
/**
 * Filter writing exam questions by category.
 */
export function getWritingQuestionsByCategory(questions: WritingExamQuestionsData, category: string): WritingExamQuestion[] {
  if (!Array.isArray(questions)) return [];
  return questions.filter(q => q.category.toLowerCase() === category.toLowerCase());
}

/**
 * Filter writing exam questions by text type (e.g. Speech, Essay, Letter, Report).
 */
export function getWritingQuestionsByTextType(questions: WritingExamQuestionsData, textType: string): WritingExamQuestion[] {
  if (!Array.isArray(questions)) return [];
  return questions.filter(q => q.textType.toLowerCase() === textType.toLowerCase());
}