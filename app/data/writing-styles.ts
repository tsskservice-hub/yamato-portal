/**
 * @file writing-styles.ts
 * @description Decoupled TypeScript logic & Supabase client integration for VCE Writing Styles Guide.
 * Stores data in Supabase 'app_knowledge' table under key: 'writing-styles'.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- Type Definitions ---
export interface WritingVocabularyCategory {
  categories: string;
  examples: string[];
}

export interface WritingStyleDetail {
  styleName: string;
  japaneseName: string;
  purpose: string;
  keyFeatures: string[];
  effectiveVocabulary: WritingVocabularyCategory[];
  effectiveGrammar: string[];
  compatibleTextTypes: string[];
}

export type WritingStylesData = Record<string, WritingStyleDetail>;

export type WritingStylesDataPayload = WritingStylesData;

export interface AppKnowledgeRecord<T = any> {
  id?: string;
  key: string;
  title: string;
  category: string;
  content_json: T;
  created_at?: string;
  updated_at?: string;
}

const KNOWLEDGE_KEY = 'writing-styles';

/**
 * Fetch VCE Writing Styles Guide data from Supabase 'app_knowledge' table.
 */
export async function fetchWritingStylesData(supabaseClient: SupabaseClient): Promise<WritingStylesData | null> {
  const { data, error } = await supabaseClient
    .from('app_knowledge')
    .select('content_json')
    .eq('key', KNOWLEDGE_KEY)
    .single();

  if (error) {
    console.error(`Error fetching ${KNOWLEDGE_KEY} from Supabase:`, error);
    return null;
  }

  return data?.content_json as WritingStylesData;
}

/**
 * Upsert VCE Writing Styles Guide data to Supabase 'app_knowledge' table.
 */
export async function upsertWritingStylesData(
  supabaseClient: SupabaseClient,
  content: WritingStylesData,
  category = 'VCE Japanese Data'
): Promise<boolean> {
  const { error } = await supabaseClient
    .from('app_knowledge')
    .upsert({
      key: KNOWLEDGE_KEY,
      title: 'VCE Writing Styles Guide',
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
 * Get writing style details by style name (Informative, Evaluative, Persuasive, Imaginative, Personal).
 */
export function getWritingStyleByName(stylesData: WritingStylesData, styleName: string): WritingStyleDetail | null {
  return stylesData[styleName] || null;
}
