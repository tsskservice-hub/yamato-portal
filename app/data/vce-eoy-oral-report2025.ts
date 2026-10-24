/**
 * @file vce-eoy-oral-report2025.ts
 * @description Decoupled TypeScript logic & Supabase client integration for 2025 VCE Japanese Oral Assessment Report.
 * Stores data in Supabase 'app_knowledge' table under key: 'vce-eoy-oral-report2025'.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- Type Definitions ---
export interface OralReportSection {
  section: string;
  title: string;
  whatStudentsDidWell: string[];
  areasForImprovement: string[];
}

export interface OralAssessmentReport2025 {
  title: string;
  year: number;
  study: string;
  sections: OralReportSection[];
  commonSubtopics: string[];
}

export type OralAssessmentReport2025Payload = OralAssessmentReport2025;

export interface AppKnowledgeRecord<T = any> {
  id?: string;
  key: string;
  title: string;
  category: string;
  content_json: T;
  created_at?: string;
  updated_at?: string;
}

const KNOWLEDGE_KEY = 'VCE_EOY_ORAL_REPORT2025';

/**
 * Fetch 2025 VCE Japanese Oral Assessment Report data from Supabase 'app_knowledge' table.
 */
export async function fetchOralAssessmentReport2025(supabaseClient: SupabaseClient): Promise<OralAssessmentReport2025 | null> {
  const { data, error } = await supabaseClient
    .from('app_knowledge')
    .select('content_json')
    .eq('key', KNOWLEDGE_KEY)
    .single();

  if (error) {
    console.error(`Error fetching ${KNOWLEDGE_KEY} from Supabase:`, error);
    return null;
  }

  return data?.content_json as OralAssessmentReport2025;
}

/**
 * Upsert 2025 VCE Japanese Oral Assessment Report data to Supabase 'app_knowledge' table.
 */
export async function upsertOralAssessmentReport2025(
  supabaseClient: SupabaseClient,
  content: OralAssessmentReport2025,
  category = 'VCE Japanese Data'
): Promise<boolean> {
  const { error } = await supabaseClient
    .from('app_knowledge')
    .upsert({
      key: KNOWLEDGE_KEY,
      title: '2025 VCE Japanese Oral Assessment Report',
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
 * Get report feedback section by section name.
 */
export function getOralReportSection(report: OralAssessmentReport2025, sectionName: string): OralReportSection | null {
  return report.sections.find(s => s.section.toLowerCase() === sectionName.toLowerCase()) || null;
}
