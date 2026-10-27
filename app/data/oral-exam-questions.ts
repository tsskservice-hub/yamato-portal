/**
 * @file oral-exam-questions.ts
 * @description Decoupled TypeScript logic & Supabase client integration for Oral Exam Questions Database.
 * Stores data in Supabase 'app_knowledge' table under key: 'ORAL_EXAM_QUESTIONS'.
 * 
 * 💡 設計方針 (terms.tsx 模範準拠):
 * 1. 静的配列の直参照ではなく、非同期取得関数 (fetchOralExamQuestionsData) を提供。
 * 2. 取得失敗時は null を返し、UI側で DataErrorState にフォールバックさせる。
 */

import { SupabaseClient } from '@supabase/supabase-js';

// --- Type Definitions ---
export interface OralExamQuestionItem {
  category: string;
  text: string;
  audio?: string;        // 実際の音声ファイルパス
  text_original?: string;
  defaultAnswer?: string;
}

export interface OralExamModeGroup {
  steady?: OralExamQuestionItem[];
  normal?: OralExamQuestionItem[];
  accelerated?: OralExamQuestionItem[];
}

export interface OralExamQuestionsData {
  beforeSec1?: OralExamModeGroup;
  sec1?: OralExamModeGroup;
  sec2?: OralExamModeGroup;
  afterSec2?: OralExamModeGroup;
}

export type OralExamQuestionsDataPayload = OralExamQuestionsData;

export interface AppKnowledgeRecord<T = any> {
  id?: string;
  key: string;
  title: string;
  category: string;
  data: T;
  created_at?: string;
  updated_at?: string;
}

// 💡 Supabase app_knowledge の key（大文字の 'ORAL_EXAM_QUESTIONS'）
const KNOWLEDGE_KEY = 'ORAL_EXAM_QUESTIONS';

/**
 * Supabase 'app_knowledge' テーブルから ORAL_EXAM_QUESTIONS データを取得
 * 取得失敗・レコード不在時は null を返し、UI側で DataErrorState を表示させます
 */
export async function fetchOralExamQuestionsData(supabaseClient: SupabaseClient): Promise<OralExamQuestionsData | null> {
  try {
    const { data: row, error } = await supabaseClient
      .from('app_knowledge')
      .select('data')
      .eq('key', KNOWLEDGE_KEY)
      .single();

    if (error || !row) {
      console.error(`[${KNOWLEDGE_KEY}] Failed to fetch from Supabase app_knowledge:`, error?.message);
      return null;
    }

    const result = (row.data || (row as any).content_json) as OralExamQuestionsData;
    if (result && typeof result === 'object' && Object.keys(result).length > 0) {
      return result;
    }

    return null;
  } catch (err) {
    console.error(`Error fetching ${KNOWLEDGE_KEY} from Supabase:`, err);
    return null;
  }
}

/**
 * Upsert Oral Exam Questions Database data to Supabase 'app_knowledge' table.
 */
export async function upsertOralExamQuestionsData(
  supabaseClient: SupabaseClient,
  content: OralExamQuestionsData,
  category = 'VCE Japanese Data'
): Promise<boolean> {
  const { error } = await supabaseClient
    .from('app_knowledge')
    .upsert({
      key: KNOWLEDGE_KEY,
      title: 'Oral Exam Questions Database',
      category,
      data: content,
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
 * セクションおよびペースに応じた設問リストを取得
 */
export function getOralQuestionsBySectionAndMode(
  data: OralExamQuestionsData | null,
  section: keyof OralExamQuestionsData,
  mode: 'steady' | 'normal' | 'accelerated'
): OralExamQuestionItem[] {
  if (!data) return [];
  return data[section]?.[mode] || [];
}

/**
 * カテゴリ名で設問を横断検索
 */
export function searchOralQuestionsByCategory(
  data: OralExamQuestionsData | null,
  category: string
): OralExamQuestionItem[] {
  if (!data) return [];
  const results: OralExamQuestionItem[] = [];
  const catLower = category.toLowerCase();

  for (const section of Object.values(data)) {
    if (!section) continue;
    for (const questions of Object.values(section)) {
      if (Array.isArray(questions)) {
        questions.forEach((q) => {
          if (q.category && q.category.toLowerCase().includes(catLower)) {
            results.push(q);
          }
        });
      }
    }
  }
  return results;
}

export default fetchOralExamQuestionsData;