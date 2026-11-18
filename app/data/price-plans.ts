/**
 * @file price-plans.ts
 * @description Type definitions, Supabase client integration, and helper functions for pricing plans (Yamato Portal)
 * Stores data in Supabase 'kl_app' table under key: 'PRICE_PLANS'.
 */

import { CREDIT_COSTS } from './credit-costs';
import { SupabaseClient } from '@supabase/supabase-js';
import { isProductionHost } from '../utils/developerOnly';

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
  // 公開している料金表（Credit Consumption Guide）と同じ。サーバーが実際に引く数は api/src/credit-rules.ts
  { item: "Text Chat", cost: `${CREDIT_COSTS.textChat} credits / turn` },
  { item: "Image Attachment (1)", cost: `${CREDIT_COSTS.imageAttachment} credits` },
  { item: "Image Attachments (2 to 4)", cost: `${CREDIT_COSTS.multiImageAttachment} credits` },
  { item: "Voice AI: EOY Oral Drill", cost: `${CREDIT_COSTS.oralDrill} credits / question` },
  { item: "Voice AI: EOY Oral Elaborate", cost: `${CREDIT_COSTS.oralElaborate} credits / question` },
  { item: "Voice AI: Mock Section 1 (approx. 7 min)", cost: `${CREDIT_COSTS.mockSection1} credits / mock` },
  { item: "Voice AI: Mock Section 2 (approx. 8 min)", cost: `${CREDIT_COSTS.mockSection2} credits / mock` },
  { item: "Voice AI: Full Mock (approx. 15 min)", cost: `${CREDIT_COSTS.mockFull} credits / mock` },
  { item: "Voice AI: EOY Oral Superb (free conversation)", cost: `${CREDIT_COSTS.realtime5} credits / 5 min, ${CREDIT_COSTS.realtime10} credits / 10 min` },
  { item: "Kanji AI Lookup (🔍 Kanji button)", cost: `Free ${CREDIT_COSTS.kanjiLookupFreePerDay} / day, then ${CREDIT_COSTS.kanjiLookup} credit / lookup` },
];


// Supabase kl_app のキー名
// 本番（jptutoraiyamato.com）は公開用の Price ID、プレビュー（*.pages.dev）・localhost は Stripe sandbox 用の Price ID を使う
export const LIVE_PRICE_PLANS_KEY = 'PRICE_PLANS';
export const SANDBOX_PRICE_PLANS_KEY = 'PRICE_PLANS_SANDBOX';

/**
 * どのプラン一覧（公開用 / sandbox 用）を使うかを、開いているドメインで決める
 * ※ サーバー側（create-checkout-session）も同じ関数で判定するので、画面と決済で食い違わない
 */
export function getPricePlansKey(hostname: string): string {
  return isProductionHost(hostname) ? LIVE_PRICE_PLANS_KEY : SANDBOX_PRICE_PLANS_KEY;
}

/**
 * Supabase 'kl_app' テーブルからプランデータを取得します。
 * hostname を省略するとブラウザの現在のドメインで判定します（サーバー側では必ず渡すこと）。
 * 取得失敗・データ不在時は null を返し、PageLayout 経由で DataErrorState を表示させます。
 */
export async function fetchPricePlansData(
  supabaseClient: SupabaseClient,
  hostname?: string
): Promise<PricePlansKnowledge | null> {
  const host = hostname ?? (typeof window !== 'undefined' ? window.location.hostname : '');
  // ドメインが分からないときは安全側（公開用）にする
  const KNOWLEDGE_KEY = host ? getPricePlansKey(host) : LIVE_PRICE_PLANS_KEY;
  try {
    const { data: row, error } = await supabaseClient
      .from('kl_app')
      .select('data')
      .eq('key', KNOWLEDGE_KEY)
      .single();

    if (error || !row) {
      console.error(
        `[${KNOWLEDGE_KEY}] Supabase kl_app からのデータ取得に失敗しました:`,
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
