/**
 * @file faq-database.ts
 * @description Type definitions and Supabase client integration for FAQ and AI Yamato Expert Guidance Data Bank.
 * Stores data in Supabase 'app_knowledge' table under key: 'FAQ'.
 * 
 * 💡 設計方針 (legal-content.ts 準拠):
 * 1. 静的配列の直参照ではなく、非同期取得関数 (fetchFaqData) を提供。
 * 2. 取得失敗時は null を返し、UI側で DataErrorState にフォールバックさせる。
 */

import { SupabaseClient } from '@supabase/supabase-js';

// --- Type Definitions ---
export interface FaqItem {
  id: string;
  category: "general" | "vce_written" | "vce_oral" | "genkoyoshi" | "portal_usage";
  tags: string[];         // Tags for search and filtering
  questionEn: string;      // English question text
  questionJp: string;      // Japanese question text
  answerHtml: string;      // Detailed explanation displayed on the site's FAQ page (supports HTML)
  expertGuidance: string;  // Scoring criteria and guidance policy referenced by AI Yamato in its prompt
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

    // 万が一 { faqList: [...] } の形式で保存されている場合の互換ハンドリング
    if (result && typeof result === 'object' && Array.isArray((result as any).faqList)) {
      return (result as any).faqList;
    }

    return null;
  } catch (err) {
    console.error(`Error fetching ${KNOWLEDGE_KEY} from Supabase:`, err);
    return null;
  }
}

/**
 * Upsert FAQ data to Supabase 'app_knowledge' table.
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

// --- Helper & Utility Logic ---

/**
 * Retrieves a specific FAQ item by its ID from Supabase fetched data.
 */
export function getFaqById(faqs: FaqItem[] | null, id: string): FaqItem | undefined {
  if (!faqs) return undefined;
  return faqs.find((faq) => faq.id === id);
}

/**
 * Filters FAQ items by category from Supabase fetched data.
 */
export function getFaqsByCategory(
  faqs: FaqItem[] | null,
  category: FaqItem["category"] | "all"
): FaqItem[] {
  if (!faqs) return [];
  if (category === "all") return faqs;
  return faqs.filter((faq) => faq.category === category);
}

/**
 * Searches FAQ items by keyword matching against question text, tags, or answer content.
 */
export function searchFaqs(faqs: FaqItem[] | null, keyword: string): FaqItem[] {
  if (!faqs) return [];
  const query = keyword.toLowerCase().trim();
  if (!query) return faqs;

  return faqs.filter(
    (faq) =>
      faq.questionEn.toLowerCase().includes(query) ||
      faq.questionJp.toLowerCase().includes(query) ||
      faq.answerHtml.toLowerCase().includes(query) ||
      faq.tags.some((tag) => tag.toLowerCase().includes(query))
  );
}

export default fetchFaqData;
