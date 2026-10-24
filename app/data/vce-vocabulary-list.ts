/**
 * @file vce-vocabulary-list.ts
 * @description Decoupled TypeScript logic & Supabase client integration for VCE Vocabulary List.
 * Stores data in Supabase 'app_knowledge' table under key: 'vce-vocabulary-list'.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- Type Definitions ---
export interface VocabularyItem {
  id: string;
  english: string;
  kana: string;
  kanji: string;
  partOfSpeech?: string;
  group?: string;
}

export type VocabularyListData = VocabularyItem[];

export type VocabularyListDataPayload = VocabularyListData;

export interface AppKnowledgeRecord<T = any> {
  id?: string;
  key: string;
  title: string;
  category: string;
  content_json: T;
  created_at?: string;
  updated_at?: string;
}

const KNOWLEDGE_KEY = 'VCE_VOCABULARY_LIST';

/**
 * Fetch VCE Vocabulary List data from Supabase 'app_knowledge' table.
 */
export async function fetchVocabularyListData(supabaseClient: SupabaseClient): Promise<VocabularyListData | null> {
  const { data, error } = await supabaseClient
    .from('app_knowledge')
    .select('*')
    .eq('key', KNOWLEDGE_KEY)
    .single();

  if (error) {
    console.error(`Error fetching ${KNOWLEDGE_KEY} from Supabase:`, error);
    return null;
  }

  return data?.content_json as VocabularyListData;
}

/**
 * Upsert VCE Vocabulary List data to Supabase 'app_knowledge' table.
 */
export async function upsertVocabularyListData(
  supabaseClient: SupabaseClient,
  content: VocabularyListData,
  category = 'VCE Japanese Data'
): Promise<boolean> {
  const { error } = await supabaseClient
    .from('app_knowledge')
    .upsert({
      key: KNOWLEDGE_KEY,
      title: 'VCE Vocabulary List',
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
 * Search vocabulary list by keyword (English, Kana, or Kanji).
 */
export function searchVocabulary(vocabList: VocabularyListData, keyword: string): VocabularyItem[] {
  const k = keyword.toLowerCase().trim();
  if (!k) return vocabList;
  return vocabList.filter(item =>
    item.english.toLowerCase().includes(k) ||
    item.kana.includes(k) ||
    item.kanji.includes(k)
  );
}

/**
 * Filter vocabulary list by group (e.g. 'food', 'family', 'school').
 */
export function getVocabularyByGroup(vocabList: VocabularyListData, group: string): VocabularyItem[] {
  return vocabList.filter(item => item.group && item.group.toLowerCase() === group.toLowerCase());
}
