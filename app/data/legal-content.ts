/**
 * @file legal-content.ts
 * @description Decoupled TypeScript logic & Supabase client integration for AI Yamato Portal legal documents.
 * Stores data in Supabase 'app_knowledge' table under key: 'LEGAL_CONTENTS'.
 */

import { SupabaseClient } from '@supabase/supabase-js';

// --- Type Definitions ---
export interface LegalListItem {
  strong?: string;
  text?: string;
}

export interface LegalSection {
  heading?: string;
  content?: string;
  globalContent?: string;
  vceContent?: string;
  vceNote?: string;
  listItems?: LegalListItem[];
  isContactLink?: boolean;
}

export interface LegalDocument {
  title: string;
  lastUpdated: string;
  summary: string;
  sections: LegalSection[];
  directEmail?: string;
  inquiryTypes?: string[];
}

export interface LegalContent {
  terms: LegalDocument;
  disclaimer: LegalDocument;
  privacy: LegalDocument;
  contact: LegalDocument;
}

// 💡 Supabase app_knowledge の key
const KNOWLEDGE_KEY = 'LEGAL_CONTENTS';

/**
 * Fetch Legal Content data from Supabase 'app_knowledge' table.
 * 失敗時は null を返し、呼び出し元の画面で DataErrorState を表示させます。
 */
export async function fetchLegalContentData(supabaseClient: SupabaseClient): Promise<LegalContent | null> {
  try {
    const { data: row, error } = await supabaseClient
      .from('app_knowledge')
      .select('*')
      .eq('key', KNOWLEDGE_KEY)
      .single();

    if (error || !row) {
      console.error(`[${KNOWLEDGE_KEY}] Supabase fetch error:`, error?.message);
      return null;
    }

    const result = (row.data || row.content_json) as LegalContent;
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
 * Upsert Legal Content data to Supabase 'app_knowledge' table.
 */
export async function upsertLegalContentData(
  supabaseClient: SupabaseClient,
  content: LegalContent,
  category = 'Legal & Compliance'
): Promise<boolean> {
  const { error } = await supabaseClient
    .from('app_knowledge')
    .upsert({
      key: KNOWLEDGE_KEY,
      title: 'AI Yamato Legal Documents',
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