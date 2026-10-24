/**
 * @file oral-exam-questions.ts
 * @description Decoupled TypeScript logic & Supabase client integration for Oral Exam Questions Database.
 * Stores data in Supabase 'app_knowledge' table under key: 'oral-exam-questions'.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- Type Definitions ---
export interface OralExamQuestionItem {
  category: string;
  text: string;
  audio?: string;
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

// --- Default Data for Default Export ---
export const ORAL_EXAM_QUESTIONS_DATA: OralExamQuestionsData = {
  beforeSec1: {
    steady: [
      { category: "Personal World", text: "自己紹介をしてください。", defaultAnswer: "はじめまして。私は..." }
    ],
    normal: [
      { category: "Personal World", text: "あなたの趣味は何ですか。", defaultAnswer: "私の趣味は..." }
    ],
    accelerated: [
      { category: "Personal World", text: "将来の夢について教えてください。", defaultAnswer: "将来は..." }
    ]
  },
  sec1: {
    steady: [],
    normal: [],
    accelerated: []
  },
  sec2: {
    steady: [],
    normal: [],
    accelerated: []
  },
  afterSec2: {
    steady: [],
    normal: [],
    accelerated: []
  }
};

export default ORAL_EXAM_QUESTIONS_DATA;

export interface AppKnowledgeRecord<T = any> {
  id?: string;
  key: string;
  title: string;
  category: string;
  content_json: T;
  created_at?: string;
  updated_at?: string;
}

const KNOWLEDGE_KEY = 'ORAL_EXAM_QUESTIONS';

/**
 * Fetch Oral Exam Questions Database data from Supabase 'app_knowledge' table.
 */
export async function fetchOralExamQuestionsData(supabaseClient: SupabaseClient): Promise<OralExamQuestionsData | null> {
  const { data, error } = await supabaseClient
    .from('app_knowledge')
    .select('content_json')
    .eq('key', KNOWLEDGE_KEY)
    .single();

  if (error) {
    console.error(`Error fetching ${KNOWLEDGE_KEY} from Supabase:`, error);
    return null;
  }

  return data?.content_json as OralExamQuestionsData;
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
      content_json: content,
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
 * Get oral questions by section and mode.
 */
export function getOralQuestionsBySectionAndMode(
  data: OralExamQuestionsData,
  section: keyof OralExamQuestionsData,
  mode: 'steady' | 'normal' | 'accelerated'
): OralExamQuestionItem[] {
  return data[section]?.[mode] || [];
}

/**
 * Filter questions across all sections by category keyword.
 */
export function searchOralQuestionsByCategory(data: OralExamQuestionsData, category: string): OralExamQuestionItem[] {
  const results: OralExamQuestionItem[] = [];
  const catLower = category.toLowerCase();
  
  for (const section of Object.values(data)) {
    if (!section) continue;
    for (const questions of Object.values(section)) {
      if (Array.isArray(questions)) {
        questions.forEach(q => {
          if (q.category.toLowerCase().includes(catLower)) {
            results.push(q);
          }
        });
      }
    }
  }
  return results;
}