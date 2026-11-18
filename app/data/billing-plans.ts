/**
 * @file billing-plans.ts
 * @description サブスク・シーズンプラン・AI 体験の一覧（料金ページ・支払い画面を開く処理・Webhook が共通で使う）
 *
 * Stripe の価格は Lookup key（このファイルのキー）で探す。テスト用と本番で同じキーにしてあるので、価格 ID は持たない。
 * クレジット数と期限は、データベース（51_subscriptions.sql）と合わせること。決まりはメモ subscription-plan。
 * クレジットパック（Starter など）は今までどおり kl_app の PRICE_PLANS（price-plans.ts）。
 */
export type PlanKey = 'ai_trial' | 'basic_monthly' | 'basic_yearly' | 'plus_monthly' | 'plus_yearly' | 'season_3m' | 'season_6m';

export type PlanOffer = {
  kind: 'trial' | 'subscription' | 'season';
  /** サブスクのとき */
  plan?: 'basic' | 'plus';
  interval?: 'month' | 'year';
  /** シーズンプランのとき */
  months?: 3 | 6;
  /** 値段（セント）。Stripe の価格と食い違ったら支払い画面を開かない */
  priceCents: number;
  /** もらえるクレジット（サブスクは 1 か月分） */
  credits: number;
  name: string;
};

export const PLAN_OFFERS: Record<PlanKey, PlanOffer> = {
  ai_trial: { kind: 'trial', priceCents: 100, credits: 100, name: 'AI Trial' },
  basic_monthly: { kind: 'subscription', plan: 'basic', interval: 'month', priceCents: 500, credits: 200, name: 'Basic (monthly)' },
  basic_yearly: { kind: 'subscription', plan: 'basic', interval: 'year', priceCents: 5100, credits: 200, name: 'Basic (yearly)' },
  plus_monthly: { kind: 'subscription', plan: 'plus', interval: 'month', priceCents: 1000, credits: 700, name: 'Plus (monthly)' },
  plus_yearly: { kind: 'subscription', plan: 'plus', interval: 'year', priceCents: 10200, credits: 700, name: 'Plus (yearly)' },
  season_3m: { kind: 'season', months: 3, priceCents: 1500, credits: 700, name: 'VCE Exam Season – 3 months' },
  season_6m: { kind: 'season', months: 6, priceCents: 3000, credits: 1500, name: 'VCE Exam Season – 6 months' },
};

export const isPlanKey = (v: unknown): v is PlanKey => typeof v === 'string' && v in PLAN_OFFERS;

/** 初回の割引（Stripe のクーポン ID → 割引額） */
export const FIRST_PLAN_COUPONS: Record<string, number> = { FIRST_SUB_TRIAL: 200, FIRST_SUB: 100 };

/** 本人のプランの状態（データベース関数 get_my_plan の戻り値） */
export type MyPlan = {
  paid_access: boolean;
  plan: 'basic' | 'plus' | null;
  interval: 'month' | 'year' | null;
  status: string | null;
  period_end: string | null;
  cancel_at_period_end: boolean;
  season_ends_at: string | null;
  trial_done: boolean;
  ai_unlocked: boolean;
  has_customer: boolean;
  first_plan_coupon: 'FIRST_SUB_TRIAL' | 'FIRST_SUB' | null;
};
