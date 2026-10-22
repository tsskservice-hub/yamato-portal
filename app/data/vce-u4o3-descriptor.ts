/**
 * @file vce-u4o3-descriptor.ts
 * @description Decoupled TypeScript logic & Supabase client integration for VCE Unit 4 Outcome 3 Performance Descriptor.
 * Stores data in Supabase 'app_knowledge' table under key: 'vce-u4o3-descriptor'.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- Type Definitions ---
export interface PerformanceLevel {
  level: string;
  markRange: string;
  descriptors: string[];
}

export interface UnitOutcomeDescriptor {
  unit: string;
  outcome: string;
  title: string;
  totalMarks: number;
  levels: PerformanceLevel[];
}

export type UnitOutcomeDescriptorPayload = UnitOutcomeDescriptor;

export interface AppKnowledgeRecord<T = any> {
  id?: string;
  key: string;
  title: string;
  category: string;
  content_json: T;
  created_at?: string;
  updated_at?: string;
}

const KNOWLEDGE_KEY = 'vce-u4o3-descriptor';

/**
 * Fetch VCE Unit 4 Outcome 3 Performance Descriptor data from Supabase 'app_knowledge' table.
 */
export async function fetchUnitOutcomeDescriptor(supabaseClient: SupabaseClient): Promise<UnitOutcomeDescriptor | null> {
  const { data, error } = await supabaseClient
    .from('app_knowledge')
    .select('content_json')
    .eq('key', KNOWLEDGE_KEY)
    .single();

  if (error) {
    console.error(`Error fetching ${KNOWLEDGE_KEY} from Supabase:`, error);
    return null;
  }

  return data?.content_json as UnitOutcomeDescriptor;
}

/**
 * Upsert VCE Unit 4 Outcome 3 Performance Descriptor data to Supabase 'app_knowledge' table.
 */
export async function upsertUnitOutcomeDescriptor(
  supabaseClient: SupabaseClient,
  content: UnitOutcomeDescriptor,
  category = 'VCE Japanese Data'
): Promise<boolean> {
  const { error } = await supabaseClient
    .from('app_knowledge')
    .upsert({
      key: KNOWLEDGE_KEY,
      title: 'VCE Unit 4 Outcome 3 Performance Descriptor',
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
 * Get performance level descriptor by level name (e.g. 'Very high', 'High', etc.).
 */
export function getPerformanceLevel(descriptor: UnitOutcomeDescriptor, levelName: string): PerformanceLevel | null {
  return descriptor.levels.find(l => l.level.toLowerCase() === levelName.toLowerCase()) || null;
}
