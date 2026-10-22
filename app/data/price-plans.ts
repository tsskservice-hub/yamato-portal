/**
 * @file price-plans.ts
 * @description Type definitions, campaign notices, credit consumption guides, and helper functions for pricing plans (Yamato Portal)
 */

export interface PlanConfig {
  id: string; // Stripeの Price ID または free
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

/**
 * 💡 キャンペーンおよびボーナスクレジットの有効期限に関する共通文言の定義
 */
export const CAMPAIGN_NOTICE = {
  title: "Limited-Time Campaign (Until October 29)",
  description: "Paid packs include bonus credits valid until October 29! Standard base credits do not expire.",
  rawText: "Limited-Time Campaign (Until October 29): Paid packs include bonus credits valid until October 29! (Bonus credits expire on Oct 29; standard base credits are unexpired.)"
};

/**
 * 💡 クレジット消費ガイドの定義
 */
export const CREDIT_CONSUMPTION_GUIDE = [
  { item: "Text Chat (Q&A / Vocabulary)", cost: "2 credits / turn" },
  { item: "Image Attachment (1) / Image Gen", cost: "4 credits" },
  { item: "Image Attachments (2) [System multi-image discount]", cost: "6 credits" },
  { item: "Essay / Genkoyoshi Correctors", cost: "20-30 credits / session" },
  { item: "Oral Exam / Voice Roleplay", cost: "15-25 credits / min" },
  { item: "Mini Games & Drills", cost: "Free / 0.5 credits" },
];

/**
 * Retrieves a plan config by its price ID from Supabase fetched plans record/array.
 * @param plans Record or array of PlanConfig fetched from Supabase
 * @param priceId The target Stripe Price ID or free identifier
 */
export function getPlanByPriceId(
  plans: Record<string, PlanConfig> | PlanConfig[],
  priceId: string
): PlanConfig | undefined {
  const planList = Array.isArray(plans) ? plans : Object.values(plans);
  return planList.find((plan) => plan.id === priceId);
}