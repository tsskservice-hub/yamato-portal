/**
 * @file faq-database.ts
 * @description Supabase 'app_knowledge' (key: 'FAQ') とフロントエンドを繋ぐアダプター
 * 
 * 💡 設計方針 (terms.tsx 模範準拠):
 * 1. 質問1件を最小単位とする「フラットな配列形式（FaqItem[]）」を採用。
 * 2. 取得失敗時・レコード不在時は null を返し、UI側で DataErrorState にフォールバックさせる。
 */

import { SupabaseClient } from '@supabase/supabase-js';

// --- 単一質問エンティティの型定義 ---
export interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

export type FaqDataPayload = FaqItem[];

export interface AppKnowledgeRecord<T = any> {
  id?: string;
  key: string;
  title: string;
  category: string;
  data: T;
  created_at?: string;
  updated_at?: string;
}

// 💡 Supabase app_knowledge の key（大文字の 'FAQ'）
const KNOWLEDGE_KEY = 'FAQ';

/**
 * Supabase 'app_knowledge' テーブルから FAQ データを取得
 * 取得失敗・レコード不在時は null を返し、UI側で DataErrorState を表示させます
 */
export async function fetchFaqData(supabaseClient: SupabaseClient): Promise<FaqItem[] | null> {
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

    const result = row.data as FaqItem[];
    if (Array.isArray(result) && result.length > 0) {
      return result;
    }

    return null;
  } catch (err) {
    console.error(`Error fetching ${KNOWLEDGE_KEY} from Supabase:`, err);
    return null;
  }
}

/**
 * FAQ データを Supabase に Upsert 保存
 */
export async function upsertFaqData(
  supabaseClient: SupabaseClient,
  content: FaqItem[],
  category = 'FAQ & Knowledge Base'
): Promise<boolean> {
  const { error } = await supabaseClient
    .from('app_knowledge')
    .upsert({
      key: KNOWLEDGE_KEY,
      title: 'AI Yamato Portal FAQ',
      category,
      data: content,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });

  if (error) {
    console.error(`Error upserting ${KNOWLEDGE_KEY} to Supabase:`, error);
    return false;
  }
  return true;
}

// --- 検索・抽出ヘルパー ---

export function searchFaqs(items: FaqItem[] | null, keyword: string): FaqItem[] {
  if (!items) return [];
  const query = keyword.toLowerCase().trim();
  if (!query) return items;

  return items.filter(
    (item) =>
      item.question.toLowerCase().includes(query) ||
      item.answer.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query)
  );
}

export function getFaqsByCategory(items: FaqItem[] | null, category: string): FaqItem[] {
  if (!items) return [];
  if (category === "all") return items;
  return items.filter((item) => item.category === category);
}

export default fetchFaqData;