/**
 * @file texttypes.ts
 * @description Decoupled TypeScript logic & Supabase client integration for VCE Japanese Text Types Specification.
 * Stores data in Supabase 'app_knowledge' table under key: 'TEXTTYPES'.
 */

import { SupabaseClient } from '@supabase/supabase-js';

// --- Type Definitions ---
export interface TextTypeDetail {
  title: string;
  purpose: string;
  structure: string[];
  sampleImage?: string;
  sample?: string;
}

export type TextTypesData = Record<string, TextTypeDetail>;
export type TextTypesDataPayload = TextTypesData;

// --- Default Fallback Data (取得前の初期値・オフライン保険) ---
export const TEXT_TYPES_DATA: TextTypesData = {
  "Speech": {
    "title": "Speech",
    "purpose": "To persuade, inform, or entertain an audience through spoken delivery.",
    "structure": [
      "Catchy opening / Greeting",
      "Clear thesis statement",
      "Body paragraphs with supporting arguments",
      "Strong concluding call to action"
    ]
  },
  "Journal": {
    "title": "Journal",
    "purpose": "To record personal thoughts, feelings, and reflections on daily experiences.",
    "structure": [
      "Date / Salutation",
      "Personal tone and emotional expression",
      "Chronological or thematic reflection",
      "Closing personal thought"
    ]
  },
  "Article": {
    "title": "Article",
    "purpose": "To inform and engage readers in magazines or newspapers on specific topics.",
    "structure": [
      "Catchy headline",
      "Introduction outlining the main theme",
      "Informative body sections with subheadings",
      "Conclusion summarizing key takeaways"
    ]
  }
};

export default TEXT_TYPES_DATA;

export interface AppKnowledgeRecord<T = any> {
  id?: string;
  key: string;
  title: string;
  category: string;
  data: T;
  created_at?: string;
  updated_at?: string;
}

// 💡 Supabase の key（大文字の 'TEXTTYPES'）
const KNOWLEDGE_KEY = 'TEXTTYPES';

/**
 * Fetch VCE Japanese Text Types Specification data from Supabase 'app_knowledge' table.
 */
export async function fetchTextTypesData(supabaseClient: SupabaseClient): Promise<TextTypesData> {
  try {
    // 💡 Supabase の標準カラム名 'data'（または content_json）を安全に取得
    const { data: row, error } = await supabaseClient
      .from('app_knowledge')
      .select('*')
      .eq('key', KNOWLEDGE_KEY)
      .single();

    if (error || !row) {
      console.warn(`[${KNOWLEDGE_KEY}] Supabaseからの取得失敗のためデフォルトを返します:`, error?.message);
      return TEXT_TYPES_DATA;
    }

    const result = (row.data || row.content_json) as TextTypesData;
    if (result && typeof result === 'object' && Object.keys(result).length > 0) {
      return result;
    }

    return TEXT_TYPES_DATA;
  } catch (err) {
    console.error(`Error fetching ${KNOWLEDGE_KEY} from Supabase:`, err);
    return TEXT_TYPES_DATA;
  }
}

/**
 * Upsert VCE Japanese Text Types Specification data to Supabase 'app_knowledge' table.
 */
export async function upsertTextTypesData(
  supabaseClient: SupabaseClient,
  content: TextTypesData,
  category = 'VCE Japanese Data'
): Promise<boolean> {
  const { error } = await supabaseClient
    .from('app_knowledge')
    .upsert({
      key: KNOWLEDGE_KEY,
      title: 'VCE Japanese Text Types Specification',
      category,
      data: content, // 💡 data カラムに保存
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });

  if (error) {
    console.error(`Error upserting ${KNOWLEDGE_KEY} to Supabase:`, error);
    return false;
  }
  return true;
}

export function getTextTypeByName(textTypesData: TextTypesData, name: string): TextTypeDetail | null {
  return textTypesData[name] || null;
}

export function listAllTextTypeNames(textTypesData: TextTypesData): string[] {
  return Object.keys(textTypesData);
}