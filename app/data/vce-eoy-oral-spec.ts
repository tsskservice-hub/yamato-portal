/**
 * @file vce-eoy-oral-spec.ts
 * @description Decoupled TypeScript logic & Supabase client integration for VCE Oral Examination Specification.
 * Stores data in Supabase 'app_knowledge' table under key: 'vce-eoy-oral-spec'.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- Type Definitions ---
export interface OralSection {
  section: string;
  title: string;
  duration: string;
  marks: number;
  description: string;
  details?: string[];
}

export interface OralSpecification {
  title: string;
  study: string;
  accreditationPeriod: string;
  overallConditions: {
    examinationTime: string;
    assessors: string;
    weighting: string;
    locationAndRules: string;
  };
  format: {
    introduction: string;
    sections: OralSection[];
    totalMarks: number;
  };
  approvedMaterials: {
    visualMaterial: string;
    restrictions: string[];
  };
  relevantReferences: string[];
}

export type OralSpecificationPayload = OralSpecification;

export interface AppKnowledgeRecord<T = any> {
  id?: string;
  key: string;
  title: string;
  category: string;
  content_json: T;
  created_at?: string;
  updated_at?: string;
}

const KNOWLEDGE_KEY = 'VCE_EOY_ORAL_SPEC';

/**
 * Fetch VCE Oral Examination Specification data from Supabase 'app_knowledge' table.
 */
export async function fetchOralSpecification(supabaseClient: SupabaseClient): Promise<OralSpecification | null> {
  const { data, error } = await supabaseClient
    .from('app_knowledge')
    .select('*')
    .eq('key', KNOWLEDGE_KEY)
    .single();

  if (error) {
    console.error(`Error fetching ${KNOWLEDGE_KEY} from Supabase:`, error);
    return null;
  }

  return data?.content_json as OralSpecification;
}

/**
 * Upsert VCE Oral Examination Specification data to Supabase 'app_knowledge' table.
 */
export async function upsertOralSpecification(
  supabaseClient: SupabaseClient,
  content: OralSpecification,
  category = 'VCE Japanese Data'
): Promise<boolean> {
  const { error } = await supabaseClient
    .from('app_knowledge')
    .upsert({
      key: KNOWLEDGE_KEY,
      title: 'VCE Oral Examination Specification',
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
 * Get section information from Oral Specification.
 */
export function getOralSpecSection(spec: OralSpecification, sectionName: string): OralSection | null {
  return spec.format.sections.find(s => s.section.toLowerCase() === sectionName.toLowerCase()) || null;
}
