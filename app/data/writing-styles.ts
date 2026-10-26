/**
 * @file writing-styles.ts
 * @description Decoupled TypeScript logic & Supabase client integration for VCE Writing Styles Guide.
 * Stores data in Supabase 'app_knowledge' table under key: 'WRITING_STYLES'.
 * 
 * 💡 設計方針 (legal-content.ts 準拠):
 * 1. 静的オブジェクトではなく、非同期取得関数 (fetchWritingStylesData) を提供。
 * 2. 取得失敗時は null を返し、UI側で DataErrorState にフォールバックさせる。
 */

import { SupabaseClient } from '@supabase/supabase-js';

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
  data: T;
  created_at?: string;
  updated_at?: string;
}

// 💡 Supabase app_knowledge の key（大文字の 'WRITING_STYLES'）
const KNOWLEDGE_KEY = 'WRITING_STYLES';

/**
 * Supabase 'app_knowledge' テーブルから WRITING_STYLES データを取得
 * 取得失敗・レコード不在時は null を返し、UI側で DataErrorState を表示させます
 */
export async function fetchWritingStylesData(supabaseClient: SupabaseClient): Promise<WritingStylesData | null> {
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

    const result = row.data as WritingStylesData;
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
export function getWritingStyleByName(stylesData: WritingStylesData | null, styleName: string): WritingStyleDetail | null {
  if (!stylesData) return null;
  return stylesData[styleName] || null;
}

export function listAllWritingStyleNames(stylesData: WritingStylesData | null): string[] {
  return stylesData ? Object.keys(stylesData) : [];
}

export default fetchWritingStylesData;