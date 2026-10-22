/**
 * @file writing-exam-questions.ts
 * @description Decoupled TypeScript logic & Supabase client integration for Writing Exam Questions Database.
 * Stores data in Supabase 'app_knowledge' table under key: 'writing-exam-questions'.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

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

// --- Default Questions Data (デフォルトエクスポート用) ---
export const WRITING_EXAM_QUESTIONS: WritingExamQuestion[] = [
  {
    id: 1,
    category: "Persuasive",
    textType: "Speech",
    english: "Write a speech persuading your peers to adopt sustainable living practices.",
    japanese: "持続可能な生活習慣を取り入れるよう仲間に説得するスピーチを書く。"
  },
  {
    id: 2,
    category: "Personal",
    textType: "Journal",
    english: "Write a journal entry reflecting on an unforgettable experience during a trip to Japan.",
    japanese: "日本旅行中の忘れられない経験を振り返る日記を書く。"
  },
  {
    id: 3,
    category: "Informative",
    textType: "Article",
    english: "Write an article introducing Japanese traditional culture to Australian high school students.",
    japanese: "オーストラリアの高校生に日本の伝統文化を紹介する記事を書く。"
  }
];

export default WRITING_EXAM_QUESTIONS;

export interface AppKnowledgeRecord<T = any> {
  id?: string;
  key: string;
  title: string;
  category: string;
  content_json: T;
  created_at?: string;
  updated_at?: string;
}

const KNOWLEDGE_KEY = 'writing-exam-questions';

/**
 * Fetch Writing Exam Questions Database data from Supabase 'app_knowledge' table.
 */
export async function fetchWritingExamQuestionsData(supabaseClient: SupabaseClient): Promise<WritingExamQuestionsData | null> {
  const { data, error } = await supabaseClient
    .from('app_knowledge')
    .select('content_json')
    .eq('key', KNOWLEDGE_KEY)
    .single();

  if (error) {
    console.error(`Error fetching ${KNOWLEDGE_KEY} from Supabase:`, error);
    return null;
  }

  return data?.content_json as WritingExamQuestionsData;
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
 * Filter writing exam questions by category.
 */
export function getWritingQuestionsByCategory(questions: WritingExamQuestionsData, category: string): WritingExamQuestion[] {
  return questions.filter(q => q.category.toLowerCase() === category.toLowerCase());
}

/**
 * Filter writing exam questions by text type (e.g. Speech, Essay, Letter, Report).
 */
export function getWritingQuestionsByTextType(questions: WritingExamQuestionsData, textType: string): WritingExamQuestion[] {
  return questions.filter(q => q.textType.toLowerCase() === textType.toLowerCase());
}