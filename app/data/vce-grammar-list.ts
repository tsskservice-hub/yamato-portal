/**
 * @file vce-grammar-list.ts
 * @description Decoupled TypeScript logic & Supabase client integration for VCE Grammar List Categories.
 * Stores data in Supabase 'app_knowledge' table under key: 'vce-grammar-list'.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- VCE Grammar List Constant ---
export const VCE_GRAMMAR_LIST: string[] = [
  "しなければなりませんでした", "なければなりません", "なくてはいけません", "たくなかったです", "いたいと思っています", "にいったことがあります", "ことがある", "ことが好きじゃないです", "ことができました", "ことができます", "ことがはじまります", "ほうがいいです", "てもいいですか", "ていただけませんか", "てくださいませんか", "いでください", "かもしれません", "たのしみにしています", "にきょうみがあります", "としてしられています", "でゆう名です", "のおかげで、", "のほかに、", "だけでなく", "とchigaimasu", "にとにています", "をつうじて", "たいです", "たくないです", "たがります", "たがっている", "つもりです", "が上手です", "下手です", "やすい", "づらい", "にくい", "が好きです", "大好です", "きらいです", "ほしいです", "がいります", "分かります", "はじめました", "おえました", "に来ます", "行きます", "てしまいます", "試してみます", "みたいです", "もいいです", "はいけません", "てはだめです", "なくてもいいです", "なくてもよかったです", "べきです", "べきじゃないです", "べきでした", "ましょう", "ましょうか", "ませんか", "てください", "すぎます", "という", "などの", "ために", "あいだ", "まえに", "あとで", "からです", "ですから", "そうだです", "らしいです", "ようです", "でしょう", "だろう", "のようです", "と思います", "と言います", "んです", "られます", "といえば、", "たとえば、", "だから、", "しかし、", "また、", "そして、", "一方、", "によると、", "として", "は一番", "ことは", "ながら", "なので、", "てから、", "でから、", "から、", "ので、", "たら、", "ば、", "でも", "ても、", "けれど", "けど", "のに", "し、", "くて", "より", "など", "ほか", "て、", "ています", "でいます"
];

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

const KNOWLEDGE_KEY = 'VCE_GRAMMAR_LIST';

/**
 * Fetch VCE Grammar List Categories data from Supabase 'app_knowledge' table.
 */
export async function fetchGrammarCategoriesData(supabaseClient: SupabaseClient): Promise<GrammarCategoriesData | null> {
  const { data, error } = await supabaseClient
    .from('app_knowledge')
    .select('*')
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