/**
 * @file vce-oral-criteria.ts
 * @description Decoupled TypeScript logic & Supabase client integration for VCE Oral Assessment Criteria.
 * Stores data in Supabase 'app_knowledge' table under key: 'vce-oral-criteria'.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- Type Definitions ---
export interface CriteriaDescriptor {
  markRange: string;
  description: string;
}

export interface OralCriterion {
  id: number;
  name: string;
  focus: string;
  descriptors: CriteriaDescriptor[];
}

export interface ExamSectionCriteria {
  sectionName: string;
  description: string;
  criteria: OralCriterion[];
}

export type OralCriteriaMap = Record<string, ExamSectionCriteria>;

export type OralCriteriaMapPayload = OralCriteriaMap;

export interface AppKnowledgeRecord<T = any> {
  id?: string;
  key: string;
  title: string;
  category: string;
  content_json: T;
  created_at?: string;
  updated_at?: string;
}

const KNOWLEDGE_KEY = 'VCE_ORAL_CRITERIA';

/**
 * Fetch VCE Oral Assessment Criteria data from Supabase 'app_knowledge' table.
 */
export async function fetchOralCriteriaMap(supabaseClient: SupabaseClient): Promise<OralCriteriaMap | null> {
  const { data, error } = await supabaseClient
    .from('app_knowledge')
    .select('*')
    .eq('key', KNOWLEDGE_KEY)
    .single();

  if (error) {
    console.error(`Error fetching ${KNOWLEDGE_KEY} from Supabase:`, error);
    return null;
  }

  return data?.content_json as OralCriteriaMap;
}

/**
 * Upsert VCE Oral Assessment Criteria data to Supabase 'app_knowledge' table.
 */
export async function upsertOralCriteriaMap(
  supabaseClient: SupabaseClient,
  content: OralCriteriaMap,
  category = 'VCE Japanese Data'
): Promise<boolean> {
  const { error } = await supabaseClient
    .from('app_knowledge')
    .upsert({
      key: KNOWLEDGE_KEY,
      title: 'VCE Oral Assessment Criteria',
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
 * Get oral assessment criteria by section key ('sec1' | 'sec2').
 */
export function getOralCriteriaSection(map: OralCriteriaMap, sectionKey: string): ExamSectionCriteria | null {
  return map[sectionKey] || null;
}
