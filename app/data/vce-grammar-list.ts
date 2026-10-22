/**
 * @file vce-grammar-list.ts
 * @description Decoupled TypeScript logic & Supabase client integration for VCE Grammar List Categories.
 * Stores data in Supabase 'app_knowledge' table under key: 'vce-grammar-list'.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- Type Definitions ---
export interface GrammarItem {
  id: string;
  pattern: string;
  meaning: string;
  example?: string;
}

export interface GrammarCategory {
  categoryTitle: string;
  items: GrammarItem[];
}

export type GrammarCategoriesData = GrammarCategory[];

export type GrammarCategoriesDataPayload = GrammarCategoriesData;

export interface AppKnowledgeRecord<T = any> {
  id?: string;
  key: string;
  title: string;
  category: string;
  content_json: T;
  created_at?: string;
  updated_at?: string;
}

const KNOWLEDGE_KEY = 'vce-grammar-list';

/**
 * Fetch VCE Grammar List Categories data from Supabase 'app_knowledge' table.
 */
export async function fetchGrammarCategoriesData(supabaseClient: SupabaseClient): Promise<GrammarCategoriesData | null> {
  const { data, error } = await supabaseClient
    .from('app_knowledge')
    .select('content_json')
    .eq('key', KNOWLEDGE_KEY)
    .single();

  if (error) {
    console.error(`Error fetching ${KNOWLEDGE_KEY} from Supabase:`, error);
    return null;
  }

  return data?.content_json as GrammarCategoriesData;
}

/**
 * Upsert VCE Grammar List Categories data to Supabase 'app_knowledge' table.
 */
export async function upsertGrammarCategoriesData(
  supabaseClient: SupabaseClient,
  content: GrammarCategoriesData,
  category = 'VCE Japanese Data'
): Promise<boolean> {
  const { error } = await supabaseClient
    .from('app_knowledge')
    .upsert({
      key: KNOWLEDGE_KEY,
      title: 'VCE Grammar List Categories',
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
 * Search grammar patterns by keyword across all categories.
 */
export function searchGrammarPatterns(categories: GrammarCategoriesData, keyword: string): GrammarItem[] {
  const k = keyword.toLowerCase().trim();
  if (!k) return [];
  const results: GrammarItem[] = [];
  categories.forEach(cat => {
    cat.items.forEach(item => {
      if (item.pattern.toLowerCase().includes(k) || item.meaning.toLowerCase().includes(k) || item.id.includes(k)) {
        results.push(item);
      }
    });
  });
  return results;
}
