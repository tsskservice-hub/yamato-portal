/**
 * @file kanji-list.ts
 * @description Decoupled TypeScript logic & Supabase client integration for VCE Kanji List.
 * Stores data in Supabase 'app_knowledge' table under key: 'kanji-list'.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- Type Definitions ---
export interface KanjiItem {
  kanji: string;
  reading: string;
  romaji: string;
  meaning: string;
  vceGroup: string;
}

export interface KanjiListData {
  curriculum: string;
  level: string;
  category: string;
  kanjiItems: KanjiItem[];
}

export type KanjiListDataPayload = KanjiListData;

export interface AppKnowledgeRecord<T = any> {
  id?: string;
  key: string;
  title: string;
  category: string;
  content_json: T;
  created_at?: string;
  updated_at?: string;
}

const KNOWLEDGE_KEY = 'kanji-list';

/**
 * Fetch VCE Kanji List data from Supabase 'app_knowledge' table.
 */
export async function fetchKanjiListData(supabaseClient: SupabaseClient): Promise<KanjiListData | null> {
  const { data, error } = await supabaseClient
    .from('app_knowledge')
    .select('content_json')
    .eq('key', KNOWLEDGE_KEY)
    .single();

  if (error) {
    console.error(`Error fetching ${KNOWLEDGE_KEY} from Supabase:`, error);
    return null;
  }

  return data?.content_json as KanjiListData;
}

/**
 * Upsert VCE Kanji List data to Supabase 'app_knowledge' table.
 */
export async function upsertKanjiListData(
  supabaseClient: SupabaseClient,
  content: KanjiListData,
  category = 'VCE Japanese Data'
): Promise<boolean> {
  const { error } = await supabaseClient
    .from('app_knowledge')
    .upsert({
      key: KNOWLEDGE_KEY,
      title: 'VCE Kanji List',
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
 * Search kanji items by character, reading, romaji, or meaning.
 */
export function searchKanji(kanjiData: KanjiListData, query: string): KanjiItem[] {
  const q = query.toLowerCase().trim();
  if (!q) return kanjiData.kanjiItems;
  return kanjiData.kanjiItems.filter(item =>
    item.kanji.includes(q) ||
    item.reading.includes(q) ||
    item.romaji.toLowerCase().includes(q) ||
    item.meaning.toLowerCase().includes(q)
  );
}

/**
 * Filter kanji items by VCE group.
 */
export function getKanjiByGroup(kanjiData: KanjiListData, group: string): KanjiItem[] {
  return kanjiData.kanjiItems.filter(item => item.vceGroup.toLowerCase() === group.toLowerCase());
}
