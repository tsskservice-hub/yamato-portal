/**
 * @file billing-client.ts
 * @description ブラウザから、支払い画面・お客様用ページを開く／自分のプランを読む（料金ページとマイアカウントで共通）
 */
import { supabase } from '~/lib/supabaseClient';
import { yamatoFetch } from '~/lib/yamatoApi';
import type { MyPlan, PlanKey } from '~/data/billing-plans';

/** 自分のプラン（ログインしていなければ null）。51 の SQL がまだのときも null */
export async function fetchMyPlan(): Promise<MyPlan | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data, error } = await supabase.rpc('get_my_plan');
  if (error) {
    console.error('get_my_plan failed:', error.message);
    return null;
  }
  return data as MyPlan;
}

/** Stripe の支払い画面へ移る。うまくいかなければエラーの文を返す */
export async function startPlanCheckout(plan: PlanKey): Promise<string | null> {
  try {
    const res = await yamatoFetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });
    const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (data.url) {
      window.location.href = data.url;
      return null;
    }
    return data.error || 'Could not start checkout. Please try again.';
  } catch {
    return 'Could not start checkout. Please try again.';
  }
}

/** Stripe のお客様用ページ（解約・カード変更・領収書）へ移る */
export async function openBillingPortal(): Promise<string | null> {
  try {
    const res = await yamatoFetch('/api/create-portal-session', { method: 'POST' });
    const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (data.url) {
      window.location.href = data.url;
      return null;
    }
    return data.error || 'Could not open the plan management page. Please try again.';
  } catch {
    return 'Could not open the plan management page. Please try again.';
  }
}

export const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
