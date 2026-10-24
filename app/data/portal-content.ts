/**
 * @file portal-content.ts
 * @description Decoupled TypeScript logic & Supabase client integration for JP Tutor AI Yamato Portal Content.
 * Stores data in Supabase 'app_knowledge' table under key: 'portal-content'.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- Type Definitions ---
export interface PortalModule {
  id: string;
  name: string;
  description: string;
  category: string;
  path: string | null;
  isComingSoon: boolean;
}

export interface PortalSection {
  id: string;
  title: string;
  emoji: string;
  modules: PortalModule[];
}

export interface PortalContentData {
  header: {
    brandName: string;
    navLinks: Array<{ label: string; path?: string; targetId?: string }>;
  };
  modulesSection: {
    header: { title: string; subtitle: string };
    section1: PortalSection;
    section2: PortalSection;
  };
  footer: {
    copyright: string;
  };
}

export type PortalContentDataPayload = PortalContentData;

export interface AppKnowledgeRecord<T = any> {
  id?: string;
  key: string;
  title: string;
  category: string;
  content_json: T;
  created_at?: string;
  updated_at?: string;
}

const KNOWLEDGE_KEY = 'PORTAL_CONTENT';

/**
 * Fetch JP Tutor AI Yamato Portal Content data from Supabase 'app_knowledge' table.
 */
export async function fetchPortalContentData(supabaseClient: SupabaseClient): Promise<PortalContentData | null> {
  const { data, error } = await supabaseClient
    .from('app_knowledge')
    .select('content_json')
    .eq('key', KNOWLEDGE_KEY)
    .single();

  if (error) {
    console.error(`Error fetching ${KNOWLEDGE_KEY} from Supabase:`, error);
    return null;
  }

  return data?.content_json as PortalContentData;
}

/**
 * Upsert JP Tutor AI Yamato Portal Content data to Supabase 'app_knowledge' table.
 */
export async function upsertPortalContentData(
  supabaseClient: SupabaseClient,
  content: PortalContentData,
  category = 'VCE Japanese Data'
): Promise<boolean> {
  const { error } = await supabaseClient
    .from('app_knowledge')
    .upsert({
      key: KNOWLEDGE_KEY,
      title: 'JP Tutor AI Yamato Portal Content',
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
 * Retrieve module by module ID across all portal sections.
 */
export function getPortalModuleById(portalData: PortalContentData, moduleId: string): PortalModule | null {
  const allModules = [
    ...portalData.modulesSection.section1.modules,
    ...portalData.modulesSection.section2.modules
  ];
  return allModules.find(m => m.id === moduleId) || null;
}

/**
 * Get active (non-coming-soon) modules for a given section.
 */
export function getActiveModulesBySection(portalData: PortalContentData, sectionKey: 'section1' | 'section2'): PortalModule[] {
  return portalData.modulesSection[sectionKey].modules.filter(m => !m.isComingSoon);
}
