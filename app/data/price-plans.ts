/**
 * @file price-plans.ts
 * @description Type definitions, Supabase client integration, and helper functions for pricing plans (Yamato Portal)
 * Stores data in Supabase 'app_knowledge' table under key: 'PRICE_PLANS'.
 * 
 * 💡 設計方針 (terms.tsx 模範準拠):
 * 1. Supabase の JSONB データ構造（pricePlans, campaignNotice, creditConsumptionGuide）に完全準拠した型定義。
 * 2. 取得失敗時は null を返し、UI側で DataErrorState にフォールバックさせる。
 */

import { SupabaseClient } from '@supabase/supabase-js';

// --- Type Definitions ---
export interface PlanConfig {
  id: string; // Stripe Price ID または "free"
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
  rawText: string;
  description: string;
}

export interface CreditConsumptionItem {
  cost: string;
  item: string;
}

export interface PricePlansKnowledge {
  pricePlans: {
    free: PlanConfig;
    starter: PlanConfig;
    standard: PlanConfig;
    pro: PlanConfig;
    [key: string]: PlanConfig;
  };
  campaignNotice: CampaignNotice;
  creditConsumptionGuide: CreditConsumptionItem[];
}

export interface AppKnowledgeRecord<T = any> {
  id?: string;
  key: string;
  title: string;
  category: string;
  data: T;
  created_at?: string;
  updated_at?: string;
}

// 💡 Supabase app_knowledge の key（大文字の 'PRICE_PLANS'）
const KNOWLEDGE_KEY = 'PRICE_PLANS';

/**
 * 💡 静的フォールバック・互換用マスターデータ
 */
export const DEFAULT_PRICE_PLANS: PricePlansKnowledge = {
  pricePlans: {
    free: {
      id: "free",
      name: "FREE PLAN",
      badge: "Daily Quiz Credits (Promo: 4 Credits until Oct 29)",
      price: "$0",
      period: "/ forever",
      ctaLink: "/",
      ctaText: "Get Started Free",
      features: [
        "Daily Quiz & Login Credits",
        "Genkoyoshi Editor & Basic Tools"
      ],
      priceAUD: 0,
      description: "Log in daily and answer Japanese quizzes correctly to earn credits. Valid for 7 days.",
      bonusCredits: 0,
      regularCredits: 4
    },
    starter: {
      id: "price_starter",
      name: "STARTER PACK",
      badge: "2,000 Credits (1,000 unexpired + 1,000 bonus valid until Oct 29)",
      price: "$10",
      period: "AUD",
      features: [
        "Standard AI Chat & Q&A",
        "Pay-as-you-go flexibility"
      ],
      priceAUD: 10,
      expiryDate: "2026-10-29",
      description: "Great for beginners. Ideal for a few essay corrections or voice roleplay sessions.",
      bonusCredits: 1000,
      regularCredits: 1000
    },
    standard: {
      id: "price_standard",
      name: "STANDARD PACK",
      badge: "5,600 Credits (2,800 unexpired + 2,800 bonus valid until Oct 29)",
      price: "$25",
      period: "AUD",
      features: [
        "Double Value Promotion",
        "Regular Study & Test Practice"
      ],
      priceAUD: 25,
      expiryDate: "2026-10-29",
      description: "Our most popular choice. Perfect for regular study routines and test preparation.",
      bonusCredits: 2800,
      isMostPopular: true,
      regularCredits: 2800
    },
    pro: {
      id: "price_pro",
      name: "PRO INTENSIVIST",
      badge: "12,000 Credits (6,000 unexpired + 6,000 bonus valid until Oct 29)",
      price: "$50",
      period: "AUD",
      features: [
        "Double Value Promotion",
        "Exam Prep & Intensive Essays"
      ],
      priceAUD: 50,
      expiryDate: "2026-10-29",
      description: "For heavy users and premium-intensive drills. Maximum value with doubled bonus credits.",
      bonusCredits: 6000,
      regularCredits: 6000
    }
  },
  campaignNotice: {
    title: "Limited-Time Campaign (Until October 29)",
    rawText: "Limited-Time Campaign (Until October 29): Paid packs include bonus credits valid until October 29! (Bonus credits expire on Oct 29; standard base credits are unexpired.)",
    description: "Paid packs include bonus credits valid until October 29! Standard base credits do not expire."
  },
  creditConsumptionGuide: [
    { cost: "2 credits / turn", item: "Text Chat (Q&A / Vocabulary)" },
    { cost: "4 credits", item: "Image Attachment (1) / Image Gen" },
    { cost: "6 credits", item: "Image Attachments (2) [System multi-image discount]" },
    { cost: "20-30 credits / session", item: "Essay / Genkoyoshi Correctors" },
    { cost: "15-25 credits / min", item: "Oral Exam / Voice Roleplay" },
    { cost: "Free / 0.5 credits", item: "Mini Games & Drills" }
  ]
};

// 従来の同期インポートとの後方互換性
export const PRICE_PLANS = DEFAULT_PRICE_PLANS.pricePlans;
export const CAMPAIGN_NOTICE = DEFAULT_PRICE_PLANS.campaignNotice;
export const CREDIT_CONSUMPTION_GUIDE = DEFAULT_PRICE_PLANS.creditConsumptionGuide;

/**
 * Supabase 'app_knowledge' テーブルから PRICE_PLANS データを取得
 * 取得失敗・レコード不在時は null を返し、UI側で DataErrorState を表示させます
 */
export async function fetchPricePlansData(supabaseClient: SupabaseClient): Promise<PricePlansKnowledge | null> {
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
 * プランIDから該当プランを取得するヘルパー関数
 */
export function getPlanByPriceId(
  plans: Record<string, PlanConfig> | PlanConfig[],
  priceId: string
): PlanConfig | undefined {
  const planList = Array.isArray(plans) ? plans : Object.values(plans);
  return planList.find((plan) => plan.id === priceId);
}

export default fetchPricePlansData;