/**
 * @file vce-eoy-oral-advice2026.ts
 * @description Decoupled TypeScript logic & Supabase client integration for 2026 VCE Languages Oral Examination Advice.
 * Stores data in Supabase 'app_knowledge' table under key: 'vce-eoy-oral-advice2026'.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- Type Definitions ---
export interface StudySpecificRequirement {
  studyGroup: string;
  visualMaterial: string;
  allowedItems?: string[];
  prohibitedItems: string[];
  notes?: string;
}

export interface OralExamAdvice2026 {
  title: string;
  year: number;
  version: string;
  summary: string;
  keyDates: { vassAvailableDate: string };
  requiredDocuments: string[];
  studySpecificRequirements: StudySpecificRequirement[];
  dressCode: string;
  arrivalInstructions: string;
  conductOfExamination: string[];
}

export type OralExamAdvice2026Payload = OralExamAdvice2026;

export interface AppKnowledgeRecord<T = any> {
  id?: string;
  key: string;
  title: string;
  category: string;
  content_json: T;
  created_at?: string;
  updated_at?: string;
}

const KNOWLEDGE_KEY = 'VCE_EOY_ORAL_ADVICE2026';

/**
 * Fetch 2026 VCE Languages Oral Examination Advice data from Supabase 'app_knowledge' table.
 */
export async function fetchOralExamAdvice2026(supabaseClient: SupabaseClient): Promise<OralExamAdvice2026 | null> {
  const { data, error } = await supabaseClient
    .from('app_knowledge')
    .select('*')
    .eq('key', KNOWLEDGE_KEY)
    .single();

  if (error) {
    console.error(`Error fetching ${KNOWLEDGE_KEY} from Supabase:`, error);
    return null;
  }

  return data?.content_json as OralExamAdvice2026;
}

/**
 * Upsert 2026 VCE Languages Oral Examination Advice data to Supabase 'app_knowledge' table.
 */
export async function upsertOralExamAdvice2026(
  supabaseClient: SupabaseClient,
  content: OralExamAdvice2026,
  category = 'VCE Japanese Data'
): Promise<boolean> {
  const { error } = await supabaseClient
    .from('app_knowledge')
    .upsert({
      key: KNOWLEDGE_KEY,
      title: '2026 VCE Languages Oral Examination Advice',
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
 * Get study-specific oral exam requirements for Japanese Second Language.
 */
export function getJapaneseOralRequirements(advice: OralExamAdvice2026): StudySpecificRequirement | null {
  return advice.studySpecificRequirements.find(req =>
    req.studyGroup.includes('Japanese Second Language')
  ) || null;
}
