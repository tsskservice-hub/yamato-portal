/**
 * @file vce-eoy-written-criteria.ts
 * @description Decoupled TypeScript logic & Supabase client integration for VCE Written Examination Assessment Criteria.
 * Stores data in Supabase 'app_knowledge' table under key: 'vce-eoy-written-criteria'.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- Type Definitions ---
export interface AssessmentCriterion {
  id: string | number;
  name: string;
  description?: string[];
}

export interface ExpectedQuality {
  markRange: string;
  qualities: string[];
}

export interface SectionCriteria {
  section: string;
  title: string;
  criteria: AssessmentCriterion[];
  expectedQualities: ExpectedQuality[];
}

export type WrittenCriteriaData = SectionCriteria[];

export type WrittenCriteriaDataPayload = WrittenCriteriaData;

export interface AppKnowledgeRecord<T = any> {
  id?: string;
  key: string;
  title: string;
  category: string;
  content_json: T;
  created_at?: string;
  updated_at?: string;
}

const KNOWLEDGE_KEY = 'vce-eoy-written-criteria';

/**
 * Fetch VCE Written Examination Assessment Criteria data from Supabase 'app_knowledge' table.
 */
export async function fetchWrittenCriteriaData(supabaseClient: SupabaseClient): Promise<WrittenCriteriaData | null> {
  const { data, error } = await supabaseClient
    .from('app_knowledge')
    .select('content_json')
    .eq('key', KNOWLEDGE_KEY)
    .single();

  if (error) {
    console.error(`Error fetching ${KNOWLEDGE_KEY} from Supabase:`, error);
    return null;
  }

  return data?.content_json as WrittenCriteriaData;
}

/**
 * Upsert VCE Written Examination Assessment Criteria data to Supabase 'app_knowledge' table.
 */
export async function upsertWrittenCriteriaData(
  supabaseClient: SupabaseClient,
  content: WrittenCriteriaData,
  category = 'VCE Japanese Data'
): Promise<boolean> {
  const { error } = await supabaseClient
    .from('app_knowledge')
    .upsert({
      key: KNOWLEDGE_KEY,
      title: 'VCE Written Examination Assessment Criteria',
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
 * Get written assessment criteria by section.
 */
export function getWrittenCriteriaBySection(data: WrittenCriteriaData, sectionName: string): SectionCriteria | null {
  return data.find(s => s.section.toLowerCase().includes(sectionName.toLowerCase())) || null;
}
