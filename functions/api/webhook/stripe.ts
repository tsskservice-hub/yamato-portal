/**
 * @file functions/api/webhook/stripe.ts
 * @description Stripe からの通知（Webhook）を受けて、クレジット・プランを記録する。クレジットを足すのはここだけ
 *
 * 受け取るイベント（Stripe の Webhook の設定で選ぶ）:
 *   checkout.session.completed / checkout.session.async_payment_succeeded
 *     … クレジットパック・AI 体験・シーズンプランの支払い完了、サブスクの申し込み完了
 *   invoice.paid … サブスクの毎回の支払い（月額は毎月、年払いは毎年）→ その月の分のクレジット
 *   customer.subscription.created / updated / deleted … サブスクの状態（解約の予約・終了など）
 *   charge.refunded … 返金（記録だけ）
 *
 * ・本物の Stripe からの通知かを署名で確かめる
 * ・同じ通知が何度来ても、クレジットは 1 回しか渡さない（データベース関数が決済 ID で見分ける。49・51）
 * ・データベースの処理に失敗したら 500 を返す → Stripe が自動で送り直す
 * ・AI 体験は 1 人 1 回・カード 1 枚 1 回。2 回目のカードは、全額返金してクレジットは渡さない
 */
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { PLAN_OFFERS, isPlanKey } from "../../../app/data/billing-plans";

// フォールバック用のURL（秘密情報ではない）
// ※管理者キー（SUPABASE_SERVICE_ROLE_KEY）は環境変数からのみ取得する。コードに直接書かないこと。
const DEFAULT_URL = "https://ybquwzoreecxxbewjpdn.supabase.co";

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/** Stripe の時刻（秒）→ ISO 文字列 */
const iso = (sec: number | null | undefined) => (sec ? new Date(sec * 1000).toISOString() : null);

/** データベースの処理の失敗（500 を返して Stripe に送り直してもらう） */
class RetryableError extends Error {}

export async function onRequestPost(context: {
  request: Request;
  env?: {
    STRIPE_SECRET_KEY?: string;
    STRIPE_WEBHOOK_SECRET?: string;
    SUPABASE_URL?: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;
  };
}) {
  const { request, env = {} } = context;

  const stripeSecretKey = env.STRIPE_SECRET_KEY || (typeof process !== 'undefined' ? process.env.STRIPE_SECRET_KEY : '');
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET || (typeof process !== 'undefined' ? process.env.STRIPE_WEBHOOK_SECRET : '');

  const supabaseUrl = env.SUPABASE_URL || (typeof process !== 'undefined' ? process.env.SUPABASE_URL : '') || DEFAULT_URL;
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || (typeof process !== 'undefined' ? process.env.SUPABASE_SERVICE_ROLE_KEY : '');

  // 設定不足は 500（Stripe が自動で再送するため、環境変数を設定すれば取りこぼしは回復できる）
  if (!stripeSecretKey || !webhookSecret || !supabaseServiceKey) {
    console.error("Stripe webhook: STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET / SUPABASE_SERVICE_ROLE_KEY is missing.");
    return json({ error: "Server configuration error" }, 500);
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return json({ error: "Missing signature" }, 400);
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2026-09-30.endive" as any });

  // 1. Stripe からの正しい通知かを署名で確認する（失敗 → 400。偽物なので再送不要）
  let event: Stripe.Event;
  try {
    const payload = await request.text();
    // Cloudflare環境では非同期版 constructEventAsync を使用
    event = await stripe.webhooks.constructEventAsync(payload, signature, webhookSecret);
  } catch (err: any) {
    console.error("Stripe webhook signature verification failed:", err?.message);
    return json({ error: "Invalid signature" }, 400);
  }

  const admin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        return await handleCheckout(event.data.object as Stripe.Checkout.Session, stripe, admin);
      case "invoice.paid":
        return await handleInvoicePaid(event.data.object as Stripe.Invoice, stripe, admin);
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await saveSubscription(event.data.object as Stripe.Subscription, admin);
        return json({ received: true }, 200);
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        console.log(`Stripe webhook: charge ${charge.id} refunded (${charge.amount_refunded} cents).`);
        return json({ received: true }, 200);
      }
      default:
        return json({ received: true }, 200);
    }
  } catch (err: any) {
    // 500 を返すと Stripe が再送する。データベース関数は同じ決済を 2 回処理しないので、再送されても安全
    console.error(`Stripe webhook: ${event.type} failed:`, err?.message || String(err));
    return json({ error: "Processing failed" }, 500);
  }
}

// ---------- 支払い画面での支払い完了 ----------
async function handleCheckout(session: Stripe.Checkout.Session, stripe: Stripe, admin: any) {
  const userId = session.metadata?.supabase_user_id || session.client_reference_id || "";
  if (!userId) {
    console.error(`Stripe webhook: session ${session.id} has no user.`);
    return json({ received: true, skipped: true }, 200);
  }

  // お客様 ID を覚える（解約・カード変更のページを開くため）
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  if (customerId) {
    const { error } = await admin.rpc("save_stripe_customer", { p_user_id: userId, p_customer_id: customerId });
    if (error) throw new RetryableError(`save_stripe_customer: ${error.message}`);
  }

  const kind = session.metadata?.kind || "pack";
  const planKey = session.metadata?.plan_key;

  // サブスクの申し込み: 状態だけ記録する（クレジットは invoice.paid で渡す）
  if (session.mode === "subscription") {
    const subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
    if (subId) await saveSubscription(await stripe.subscriptions.retrieve(subId), admin);
    return json({ received: true }, 200);
  }

  if (session.payment_status !== "paid") {
    // まだ入金が確定していない（確定したら async_payment_succeeded が届く）
    return json({ received: true, pending: true }, 200);
  }

  if (kind === "trial") {
    // カードの指紋を調べる（同じカードで 2 回体験させないため）
    const piId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
    let fingerprint: string | null = null;
    if (piId) {
      const pi = await stripe.paymentIntents.retrieve(piId, { expand: ["latest_charge"] });
      const charge = pi.latest_charge as Stripe.Charge | null;
      fingerprint = charge?.payment_method_details?.card?.fingerprint ?? null;
    }
    const { data, error } = await admin.rpc("grant_ai_trial", {
      p_user_id: userId,
      p_session_id: session.id,
      p_amount_paid: session.amount_total ?? 0,
      p_card_fingerprint: fingerprint,
    });
    if (error) throw new RetryableError(`grant_ai_trial: ${error.message}`);
    if (data?.reason === "DUPLICATE_TRIAL" && piId) {
      // 2 回目の体験 → 全額返金（同じ決済の返金は 1 回だけ）
      await stripe.refunds.create({ payment_intent: piId, reason: "duplicate" }, { idempotencyKey: `trial-duplicate-${session.id}` });
      console.log(`Stripe webhook: duplicate AI trial refunded (session ${session.id}).`);
    }
    console.log(`Stripe webhook: trial ${session.id} → ${JSON.stringify(data)}`);
    return json({ received: true }, 200);
  }

  if (kind === "season") {
    const months = isPlanKey(planKey) ? PLAN_OFFERS[planKey].months : undefined;
    if (!months) {
      console.error(`Stripe webhook: season session ${session.id} has no valid plan_key.`);
      return json({ received: true, skipped: true }, 200);
    }
    const { data, error } = await admin.rpc("grant_season_pass", {
      p_user_id: userId,
      p_session_id: session.id,
      p_amount_paid: session.amount_total ?? 0,
      p_months: months,
    });
    if (error) throw new RetryableError(`grant_season_pass: ${error.message}`);
    console.log(`Stripe webhook: season ${session.id} → ${JSON.stringify(data)}`);
    return json({ received: true }, 200);
  }

  // クレジットパック（今までどおり）
  const regularCredits = Number(session.metadata?.regular_credits || session.metadata?.credits || 0);
  const bonusCredits = Number(session.metadata?.bonus_credits || 0);
  if (regularCredits + bonusCredits <= 0) {
    console.error(`Stripe webhook: session ${session.id} has no credits in metadata.`);
    return json({ received: true, skipped: true }, 200);
  }
  const { data, error } = await admin.rpc("grant_purchase_credits", {
    p_user_id: userId,
    p_session_id: session.id,
    p_amount_paid: session.amount_total ?? 0,
    p_regular_credits: regularCredits,
    p_bonus_credits: bonusCredits,
  });
  if (error) throw new RetryableError(`grant_purchase_credits: ${error.message}`);
  console.log(`Stripe webhook: pack ${session.id} → ${JSON.stringify(data)}`);
  return json({ received: true }, 200);
}

// ---------- サブスクの状態 ----------
function subscriptionPlan(sub: Stripe.Subscription) {
  const key = sub.metadata?.plan_key;
  if (!isPlanKey(key)) return null;
  const offer = PLAN_OFFERS[key];
  if (offer.kind !== "subscription" || !offer.plan || !offer.interval) return null;
  return { plan: offer.plan, interval: offer.interval };
}

/** 期間は、新しい API ではサブスクの品目に、古い API ではサブスク本体にある */
function subscriptionPeriod(sub: Stripe.Subscription) {
  const item: any = sub.items?.data?.[0];
  const s: any = sub;
  return {
    start: iso(item?.current_period_start ?? s.current_period_start),
    end: iso(item?.current_period_end ?? s.current_period_end),
  };
}

async function saveSubscription(sub: Stripe.Subscription, admin: any) {
  const userId = sub.metadata?.supabase_user_id;
  const plan = subscriptionPlan(sub);
  if (!userId || !plan) {
    console.error(`Stripe webhook: subscription ${sub.id} has no user or plan in metadata.`);
    return;
  }
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const period = subscriptionPeriod(sub);
  const { error } = await admin.rpc("upsert_subscription", {
    p_subscription_id: sub.id,
    p_user_id: userId,
    p_customer_id: customerId,
    p_plan: plan.plan,
    p_interval: plan.interval,
    p_status: sub.status,
    p_period_start: period.start,
    p_period_end: period.end,
    p_cancel_at_period_end: Boolean(sub.cancel_at_period_end || (sub as any).cancel_at),
  });
  if (error) throw new RetryableError(`upsert_subscription: ${error.message}`);
  const { error: custError } = await admin.rpc("save_stripe_customer", { p_user_id: userId, p_customer_id: customerId });
  if (custError) throw new RetryableError(`save_stripe_customer: ${custError.message}`);
}

// ---------- サブスクの支払い（毎回） ----------
async function handleInvoicePaid(invoice: Stripe.Invoice, stripe: Stripe, admin: any) {
  const inv: any = invoice;
  const subId: string | undefined =
    (typeof inv.subscription === "string" ? inv.subscription : inv.subscription?.id) ??
    inv.parent?.subscription_details?.subscription ??
    undefined;
  if (!subId) return json({ received: true, skipped: true }, 200); // サブスク以外の請求

  const sub = await stripe.subscriptions.retrieve(typeof subId === "string" ? subId : (subId as any).id);
  await saveSubscription(sub, admin);
  const userId = sub.metadata?.supabase_user_id;
  const plan = subscriptionPlan(sub);
  if (!userId || !plan) return json({ received: true, skipped: true }, 200);

  // この請求の期間の始まり（＝その月の分の始まり）
  const line: any = invoice.lines?.data?.[0];
  const periodStart = iso(line?.period?.start) ?? subscriptionPeriod(sub).start;
  const { data, error } = await admin.rpc("grant_subscription_invoice", {
    p_invoice_id: invoice.id,
    p_subscription_id: sub.id,
    p_user_id: userId,
    p_plan: plan.plan,
    p_amount_paid: invoice.amount_paid ?? 0,
    p_period_start: periodStart,
  });
  if (error) throw new RetryableError(`grant_subscription_invoice: ${error.message}`);
  console.log(`Stripe webhook: invoice ${invoice.id} → ${JSON.stringify(data)}`);
  return json({ received: true }, 200);
}
