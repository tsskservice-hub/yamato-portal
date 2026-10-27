/**
 * @file oral-exam-questions.ts
 * @description Decoupled TypeScript logic & Supabase client integration for Oral Exam Questions Database.
 * Stores data in Supabase 'app_knowledge' table under key: 'ORAL_EXAM_QUESTIONS'.
 */

import { SupabaseClient } from '@supabase/supabase-js';

// --- Type Definitions ---
export interface OralExamQuestionItem {
  id?: string;
  category: string;
  text: string;
  audio?: string;
  text_original?: string;
  defaultAnswer?: string;
  default_answer_original?: string;
  keyInfoHint?: string;
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

// --- Pure Empty Reference Structure (サンプルデータ排除・空配列化) ---
export const ORAL_EXAM_QUESTIONS_DATA: OralExamQuestionsData = {
  beforeSec1: { steady: [], normal: [], accelerated: [] },
  sec1: { steady: [], normal: [], accelerated: [] },
  sec2: { steady: [], normal: [], accelerated: [] },
  afterSec2: { steady: [], normal: [], accelerated: [] }
};

export default ORAL_EXAM_QUESTIONS_DATA;

const KNOWLEDGE_KEY = 'ORAL_EXAM_QUESTIONS';

/**
 * Fetch Oral Exam Questions Database data from Supabase 'app_knowledge' table.
 * Returns null when fetch fails or data is empty, triggering DataErrorState.tsx in UI.
 */
export async function fetchOralExamQuestionsData(supabaseClient: SupabaseClient): Promise<OralExamQuestionsData | null> {
  try {
    const { data: rows, error } = await supabaseClient
      .from('app_knowledge')
      .select('key, data')
      .eq('key', KNOWLEDGE_KEY);

    if (error) {
      console.warn(`[${KNOWLEDGE_KEY}] Supabase fetch error:`, error.message);
      return null;
    }

    if (!rows || rows.length === 0) {
      console.warn(`[${KNOWLEDGE_KEY}] No rows found in Supabase.`);
      return null;
    }

    const row = rows[0];
    const rawData = row.data;

    if (rawData) {
      const parsed = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
        console.log(`[${KNOWLEDGE_KEY}] Successfully imported data from Supabase!`);
        return parsed as OralExamQuestionsData;
      }
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
  content: OralExamQuestionsData
): Promise<boolean> {
  const { error } = await supabaseClient
    .from('app_knowledge')
    .upsert({
      key: KNOWLEDGE_KEY,
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
export function getOralQuestionsBySectionAndMode(
  data: OralExamQuestionsData,
  section: keyof OralExamQuestionsData,
  mode: 'steady' | 'normal' | 'accelerated'
): OralExamQuestionItem[] {
  return data[section]?.[mode] || [];
}

export function searchOralQuestionsByCategory(data: OralExamQuestionsData, category: string): OralExamQuestionItem[] {
  const results: OralExamQuestionItem[] = [];
  const catLower = category.toLowerCase();
  
  for (const section of Object.values(data)) {
    if (!section) continue;
    for (const questions of Object.values(section)) {
      if (Array.isArray(questions)) {
        questions.forEach(q => {
          if (q.category && q.category.toLowerCase().includes(catLower)) {
            results.push(q);
          }
        });
      }
    }
  }
  return results;
}