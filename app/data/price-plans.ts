/**
 * @file price-plans.ts
 * @description Supabase 'app_knowledge' (key: 'PRICE_PLANS') からの料金プラン取得データモジュール
 * 
 * 💡 変更点:
 * 1. 静的フォールバック（ハードコードデータ）を完全に削除。
 * 2. Supabaseからの取得失敗時には null を返却し、呼び出し元のページが 
 *    PageLayout の error プロパティ経由で自動的に DataErrorState を表示・サポート自動報告できるように変更。
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface PlanConfig {
  id: string; // Stripe の Price ID または 'free'
  name: string;
  price: string;
  period: string;
  priceAUD: number;
  regularCredits: number;
  bonusCredits: number;
  expiryDate?: string;
  description: string;
  badge?: string;
  features: string[];
  ctaText?: string;
  ctaLink?: string;
  isMostPopular?: boolean;
}

export interface CampaignNotice {
  title: string;
  description: string;
  rawText: string;
}

export interface CreditConsumptionGuideItem {
  item: string;
  cost: string;
}

export interface PricePlansData {
  free?: PlanConfig;
  starter?: PlanConfig;
  standard?: PlanConfig;
  pro?: PlanConfig;
  [key: string]: PlanConfig | undefined;
}

export interface PricePlansKnowledge {
  campaignNotice?: CampaignNotice;
  pricePlans?: PricePlansData;
  creditConsumptionGuide?: CreditConsumptionGuideItem[];
}

// Supabase app_knowledge のキー名
const KNOWLEDGE_KEY = 'PRICE_PLANS';

/**
 * Supabase 'app_knowledge' テーブルから PRICE_PLANS データを取得します。
 * 静的フォールバックは廃止し、取得失敗・データ不在時は null を返します。
 */
export async function fetchPricePlansData(
  supabaseClient: SupabaseClient
): Promise<PricePlansKnowledge | null> {
  try {
    const { data: row, error } = await supabaseClient
      .from('app_knowledge')
      .select('data')
      .eq('key', KNOWLEDGE_KEY)
      .single();

    if (error || !row) {
      console.error(
        `[${KNOWLEDGE_KEY}] Supabase app_knowledge からのデータ取得に失敗しました:`,
        error?.message
      );
      return null;
    }

    const result = row.data as PricePlansKnowledge;
    if (result && typeof result === 'object' && result.pricePlans) {
      return result;
    }

    return null;
  } catch (err) {
    console.error(`Error fetching ${KNOWLEDGE_KEY} from Supabase:`, err);
    return null;
  }
}

/**
 * Price ID またはキー名から該当プラン設定を取得するヘルパー関数
 */
export function getPlanByPriceId(
  plans: Record<string, PlanConfig> | PlanConfig[],
  priceId: string
): PlanConfig | undefined {
  const planList = Array.isArray(plans) ? plans : Object.values(plans);
  return planList.find((plan) => plan.id === priceId);
}

export default fetchPricePlansData;