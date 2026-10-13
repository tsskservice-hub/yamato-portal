// app/data/price-plans.ts

export interface PlanConfig {
  id: string; // Stripeの Price ID
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

export const PRICE_PLANS: Record<string, PlanConfig> = {
  free: {
    id: 'free',
    name: "FREE PLAN",
    price: "$0",
    period: "/ forever",
    priceAUD: 0,
    regularCredits: 4,
    bonusCredits: 0,
    badge: "Daily Quiz Credits (Promo: 4 Credits until Oct 29)",
    description: "Log in daily and answer Japanese quizzes correctly to earn credits. Valid for 7 days.",
    features: [
      "Daily Quiz & Login Credits",
      "Genkoyoshi Editor & Basic Tools",
    ],
    ctaText: "Get Started Free",
    ctaLink: "/",
  },
  starter: {
    id: 'price_1UPzTeJtfpDoC5FGEK9FfWY6', // 実際のStripe Price IDに書き換えてください
    name: "STARTER PACK",
    price: "$10",
    period: "AUD",
    priceAUD: 10,
    regularCredits: 1000,
    bonusCredits: 1000,
    expiryDate: '2026-10-29',
    badge: "2,000 Credits (1,000 unexpired + 1,000 bonus until Oct 29)",
    description: "Great for beginners. Ideal for a few essay corrections or voice roleplay sessions.",
    features: [
      "Standard AI Chat & Q&A",
      "Pay-as-you-go flexibility",
    ],
  },
  standard: {
    id: 'price_1UQ155JtfpDoC5FGR3uNtKXI', // 実際のStripe Price IDに書き換えてください
    name: "STANDARD PACK",
    price: "$25",
    period: "AUD",
    priceAUD: 25,
    regularCredits: 2800,
    bonusCredits: 2800,
    expiryDate: '2026-10-29',
    badge: "5,600 Credits (2,800 unexpired + 2,800 bonus until Oct 29)",
    description: "Our most popular choice. Perfect for regular study routines and test preparation.",
    features: [
      "Double Value Promotion",
      "Regular Study & Test Practice",
    ],
    isMostPopular: true,
  },
  pro: {
    id: 'price_1UQ164JtfpDoC5FGHJxsA4OQ', // 実際のStripe Price IDに書き換えてください
    name: "PRO INTENSIVIST",
    price: "$50",
    period: "AUD",
    priceAUD: 50,
    regularCredits: 6000,
    bonusCredits: 6000,
    expiryDate: '2026-10-29',
    badge: "12,000 Credits (6,000 unexpired + 6,000 bonus until Oct 29)",
    description: "For heavy users and premium-intensive drills. Maximum value with doubled bonus credits.",
    features: [
      "Double Value Promotion",
      "Exam Prep & Intensive Essays",
    ],
  },
};

export const CREDIT_CONSUMPTION_GUIDE = [
  { item: "Text Chat (Q&A / Vocabulary)", cost: "1-2 credits / turn" },
  { item: "Essay / Genkoyoshi Correctors", cost: "20-30 credits / session" },
  { item: "Oral Exam / Voice Roleplay", cost: "15-25 credits / min" },
  { item: "Mini Games & Drills", cost: "Free / 0.5 credits" },
];

export function getPlanByPriceId(priceId: string): PlanConfig | undefined {
  return Object.values(PRICE_PLANS).find((plan) => plan.id === priceId);
}