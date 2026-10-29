/**
 * @file price-plans.ts
 * @description Type definitions, Supabase client integration, and helper functions for pricing plans (Yamato Portal)
 * Stores data in Supabase 'app_knowledge' table under key: 'PRICE_PLANS'.
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

// 💡 他コンポーネント（CreditCostFooter.tsxなど）が直接インポートして参照するデフォルトのガイドデータ（ビルドエラー防止用）
export const CREDIT_CONSUMPTION_GUIDE: CreditConsumptionGuideItem[] = [
  { item: "Text Chat (Q&A / Vocabulary)", cost: "2 credits / turn" },
  { item: "Image Attachment (1) / Image Gen", cost: "4 credits" },
  { item: "Image Attachments (2) [Multi-image discount]", cost: "6 credits" },
  { item: "Essay / Genkoyoshi Correctors", cost: "20-30 credits / session" },
  { item: "Oral Exam / Voice Roleplay", cost: "15-25 credits / min" },
  { item: "Mini Games & Drills", cost: "Free / 0.5 credits" },
];

export const CAMPAIGN_NOTICE: CampaignNotice = {
  title: "Limited-Time Campaign (Until October 29)",
  description: "Paid packs include bonus credits valid until October 29! Standard base credits do not expire.",
  rawText: "Limited-Time Campaign (Until October 29): Paid packs include bonus credits valid until October 29! (Bonus credits expire on Oct 29; standard base credits are unexpired.)"
};

// Supabase app_knowledge のキー名
const KNOWLEDGE_KEY = 'PRICE_PLANS';

/**
 * Supabase 'app_knowledge' テーブルから PRICE_PLANS データを取得します。
 * 取得失敗・データ不在時は null を返し、PageLayout 経由で DataErrorState を表示させます。
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
