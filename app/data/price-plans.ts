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
 * 💡 プラン定義の追加
 */
export const PRICE_PLANS = {
  free: {
    id: "free",
    name: "Free Plan",
    price: "$0",
    period: "forever",
    priceAUD: 0,
    regularCredits: 10,
    bonusCredits: 0,
    description: "Basic access with daily free credits.",
    badge: "Free",
    features: ["10 Free Welcome Credits", "Daily Quiz (+2 Credits)", "Community Access"],
    ctaText: "Get Started Free",
    ctaLink: "/my-account"
  },
  starter: {
    id: "price_starter",
    name: "Starter Pack",
    price: "$9",
    period: "one-time",
    priceAUD: 9,
    regularCredits: 50,
    bonusCredits: 10,
    description: "Great for casual practice.",
    badge: "Starter",
    features: ["50 Credits", "Standard Support"],
    ctaText: "Buy Starter",
    ctaLink: "https://gumroad.com/l/sample-starter"
  },
  standard: {
    id: "price_standard",
    name: "Standard Pack",
    price: "$19",
    period: "one-time",
    priceAUD: 19,
    regularCredits: 120,
    bonusCredits: 30,
    description: "Most popular for exam preparation.",
    badge: "Most Popular",
    features: ["120 Credits", "Priority Support", "All Tools Access"],
    ctaText: "Buy Standard",
    ctaLink: "https://gumroad.com/l/sample-standard"
  },
  pro: {
    id: "price_pro",
    name: "Pro Intensivist",
    price: "$39",
    period: "one-time",
    priceAUD: 39,
    regularCredits: 300,
    bonusCredits: 100,
    description: "For intensive full-scale study.",
    badge: "Pro",
    features: ["300 Credits", "VIP Support", "Unlimited Advanced AI Access"],
    ctaText: "Buy Pro",
    ctaLink: "https://gumroad.com/l/sample-pro"
  }
};

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
  { item: "Text Chat (Q&A / Vocabulary)", cost: "2 credits per turn" },
  { item: "Image Attachment (1) / Image Gen", cost: "4 credits" },
  { item: "Image Attachments (2) [System multi-image discount]", cost: "6 credits" },
  { item: "Essay / Genkoyoshi Correctors", cost: "20-30 credits per session" },
  { item: "Oral Exam / Voice Roleplay", cost: "15-25 credits per minute" },
  { item: "Mini Games & Drills", cost: "Free or 0.5 credits per play" },
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