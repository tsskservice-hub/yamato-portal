/**
 * @file app/data/yamato-configs.ts
 * @description Decoupled TypeScript logic & Supabase client integration for Yamato Bot Configs.
 * Stores data in Supabase 'app_knowledge' table under key: 'YAMATO_CONFIGS'.
 */

import { SupabaseClient } from '@supabase/supabase-js';

// --- Type Definitions ---
export type AppType = 
  | "concierge" 
  | "game-igo" 
  | "genkoyoshi-editor-general" 
  | "genkoyoshi-editor-vce" 
  | "eoy-oral-drill" 
  | "eoy-oral-elaborate" 
  | "eoy-oral-mock" 
  | "eoy-writing" 
  | "oral-exam-questions"
  | "image-explanation";

export type BotConfig = {
  name: string;
  greeting: string;
  themeColor: "red" | "blue" | "black" | "green" | "yellow" | "orange" | "purple" | "cyan" | "pink" | "rainbow";
  apiSourceFile: string;
  targetAudience: string;
  buttonStyle: {
    border: string;
    background: string;
    color: string;
  };
  floatingButtonStyle: {
    border: string;
    background: string;
    color: string;
  };
};

export type YamatoConfigsData = Record<AppType, BotConfig>;

export interface AppKnowledgeRecord<T = any> {
  id?: string;
  key: string;
  title: string;
  category: string;
  content_json: T;
  created_at?: string;
  updated_at?: string;
}

const KNOWLEDGE_KEY = 'YAMATO_CONFIGS';

/**
 * Fetch Yamato Bot Configs data from Supabase 'app_knowledge' table.
 */
export async function fetchYamatoConfigsData(supabaseClient: SupabaseClient): Promise<YamatoConfigsData | null> {
  const { data, error } = await supabaseClient
    .from('app_knowledge')
    .select('content_json')
    .eq('key', KNOWLEDGE_KEY)
    .single();

  if (error) {
    console.error(`Error fetching ${KNOWLEDGE_KEY} from Supabase:`, error);
    return null;
  }

  return data?.content_json as YamatoConfigsData;
}

/**
 * Upsert Yamato Bot Configs data to Supabase 'app_knowledge' table.
 */
export async function upsertYamatoConfigsData(
  supabaseClient: SupabaseClient,
  content: YamatoConfigsData,
  category = 'Yamato System Configs'
): Promise<boolean> {
  const { error } = await supabaseClient
    .from('app_knowledge')
    .upsert({
      key: KNOWLEDGE_KEY,
      title: 'Yamato Bot Configs',
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
 * Get bot configuration by appType.
 */
export function getBotConfigByType(configsData: YamatoConfigsData, appType: AppType): BotConfig | null {
  return configsData[appType] || null;
}