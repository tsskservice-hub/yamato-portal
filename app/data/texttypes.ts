/**
 * @file texttypes.ts
 * @description Decoupled TypeScript logic & Supabase client integration for VCE Japanese Text Types Specification.
 * Stores data in Supabase 'app_knowledge' table under key: 'TEXTTYPES'.
 */

import { SupabaseClient } from '@supabase/supabase-js';

// --- Type Definitions ---
export interface TextTypeDetail {
  title: string;
  purpose: string;
  structure: string[];
  sampleImage?: string;
  sample?: string;
  title_original?: string;
  purpose_original?: string;
  structure_original?: string[];
}

export type TextTypesData = Record<string, TextTypeDetail>;

export interface AppKnowledgeRecord<T = any> {
  id?: string;
  key: string;
  title: string;
  category: string;
  data: T;
  created_at?: string;
  updated_at?: string;
}

// Supabase の key（大文字の 'TEXTTYPES'）
const KNOWLEDGE_KEY = 'TEXTTYPES';

/**
 * 原稿用紙データを安全に取り出すヘルパー関数（表記揺れ Genkoyoshi / genkoyoshi / Genkooyooshi を吸収）
 */
export function getGenkoyoshiData(textTypesData?: TextTypesData | null): TextTypeDetail | null {
  if (!textTypesData) return null;
  return (
    textTypesData["Genkoyoshi"] ||
    textTypesData["genkoyoshi"] ||
    textTypesData["Genkooyooshi"] ||
    null
  );
}

/**
 * Supabase 'app_knowledge' テーブルから TEXTTYPES データを取得
 * 取得失敗・レコード不在時は null を返し、UI側で DataErrorState を表示させます
 */
export async function fetchTextTypesData(supabaseClient: SupabaseClient): Promise<TextTypesData | null> {
  try {
    const { data: row, error } = await supabaseClient
      .from('app_knowledge')
      .select('data')
      .eq('key', KNOWLEDGE_KEY)
      .single();

    if (error || !row) {
      console.error(`[${KNOWLEDGE_KEY}] Failed to fetch from Supabase app_knowledge:`, error?.message);
      return null;
    }

    const result = row.data as TextTypesData;
    if (result && typeof result === 'object' && Object.keys(result).length > 0) {
      const resolvedGenkoyoshi = getGenkoyoshiData(result);
      if (resolvedGenkoyoshi) {
        return {
          ...result,
          Genkoyoshi: resolvedGenkoyoshi,
          genkoyoshi: resolvedGenkoyoshi,
          Genkooyooshi: resolvedGenkoyoshi
        };
      }
      return result;
    }

    return null;
  } catch (err) {
    console.error(`Error fetching ${KNOWLEDGE_KEY} from Supabase:`, err);
    return null;
  }
}

/**
 * テキストタイプ名から該当データを取得
 */
export function getTextTypeByName(textTypesData: TextTypesData | null, name: string): TextTypeDetail | null {
  if (!textTypesData) return null;
  if (name.toLowerCase() === "genkoyoshi" || name.toLowerCase() === "genkooyooshi") {
    return getGenkoyoshiData(textTypesData);
  }
  return textTypesData[name] || null;
}