/**
 * @file vce-eoy-written-spec.ts
 * @description Decoupled TypeScript logic & Supabase client integration for VCE Written Examination Specification.
 * Stores data in Supabase 'app_knowledge' table under key: 'vce-eoy-written-spec'.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- Type Definitions ---
export interface WrittenSectionPart {
  part?: string;
  title: string;
  marks: number;
  description: string;
  details?: string[];
}

export interface WrittenSection {
  section: string;
  title: string;
  totalMarks: number;
  parts: WrittenSectionPart[];
}

export interface WrittenSpecification {
  title: string;
  study: string;
  accreditationPeriod: string;
  overallConditions: {
    readingTime: string;
    writingTime: string;
    marking: string;
    weighting: string;
    rulesAndLocation: string;
  };
  content: string;
  format: {
    formatType: string;
    sections: WrittenSection[];
    totalMarks: number;
  };
  additionalInformation: {
    listeningLength: string;
    readingLength: string;
    visualTextsCount: string;
  };
  approvedMaterials: string[];
  relevantReferences: string[];
}

export type WrittenSpecificationPayload = WrittenSpecification;

export interface AppKnowledgeRecord<T = any> {
  id?: string;
  key: string;
  title: string;
  category: string;
  content_json: T;
  created_at?: string;
  updated_at?: string;
}

const KNOWLEDGE_KEY = 'VCE_EOY_WRITTEN_SPEC';

/**
 * Fetch VCE Written Examination Specification data from Supabase 'app_knowledge' table.
 */
export async function fetchWrittenSpecification(supabaseClient: SupabaseClient): Promise<WrittenSpecification | null> {
  const { data, error } = await supabaseClient
    .from('app_knowledge')
    .select('content_json')
    .eq('key', KNOWLEDGE_KEY)
    .single();

  if (error) {
    console.error(`Error fetching ${KNOWLEDGE_KEY} from Supabase:`, error);
    return null;
  }

  return data?.content_json as WrittenSpecification;
}

/**
 * Upsert VCE Written Examination Specification data to Supabase 'app_knowledge' table.
 */
export async function upsertWrittenSpecification(
  supabaseClient: SupabaseClient,
  content: WrittenSpecification,
  category = 'VCE Japanese Data'
): Promise<boolean> {
  const { error } = await supabaseClient
    .from('app_knowledge')
    .upsert({
      key: KNOWLEDGE_KEY,
      title: 'VCE Written Examination Specification',
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
 * Get section from written specification.
 */
export function getWrittenSpecSection(spec: WrittenSpecification, sectionName: string): WrittenSection | null {
  return spec.format.sections.find(s => s.section.toLowerCase().includes(sectionName.toLowerCase())) || null;
}
