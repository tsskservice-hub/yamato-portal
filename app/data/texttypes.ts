/**
 * @file texttypes.ts
 * @description Decoupled TypeScript logic & Supabase client integration for VCE Japanese Text Types Specification.
 * Stores data in Supabase 'app_knowledge' table under key: 'texttypes'.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- Type Definitions ---
export interface TextTypeDetail {
  title: string;
  purpose: string;
  structure: string[];
  sampleImage?: string;
}

export type TextTypesData = Record<string, TextTypeDetail>;

export type TextTypesDataPayload = TextTypesData;

// --- Default Text Types Data (デフォルトエクスポート用) ---
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
  content_json: T;
  created_at?: string;
  updated_at?: string;
}

const KNOWLEDGE_KEY = 'texttypes';

/**
 * Fetch VCE Japanese Text Types Specification data from Supabase 'app_knowledge' table.
 */
export async function fetchTextTypesData(supabaseClient: SupabaseClient): Promise<TextTypesData | null> {
  const { data, error } = await supabaseClient
    .from('app_knowledge')
    .select('content_json')
    .eq('key', KNOWLEDGE_KEY)
    .single();

  if (error) {
    console.error(`Error fetching ${KNOWLEDGE_KEY} from Supabase:`, error);
    return null;
  }

  return data?.content_json as TextTypesData;
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
 * Get text type details by name.
 */
export function getTextTypeByName(textTypesData: TextTypesData, name: string): TextTypeDetail | null {
  return textTypesData[name] || null;
}

/**
 * List all supported text type titles.
 */
export function listAllTextTypeNames(textTypesData: TextTypesData): string[] {
  return Object.keys(textTypesData);
}