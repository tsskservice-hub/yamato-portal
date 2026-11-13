import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// フォールバック用のURL（秘密情報ではない）
// ※管理者キー（SUPABASE_SERVICE_ROLE_KEY）は環境変数からのみ取得する。コードに直接書かないこと。
const DEFAULT_URL = "https://ybquwzoreecxxbewjpdn.supabase.co";

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

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

  // 2. 支払いが完了した通知だけを処理する
  //    - checkout.session.completed: カード払いなど（payment_status が "paid" のときだけ付与）
  //    - checkout.session.async_payment_succeeded: 後から入金が確定する支払い方法
  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
    return json({ received: true }, 200);
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") {
    // まだ入金が確定していない（確定したら async_payment_succeeded が届く）
    return json({ received: true, pending: true }, 200);
  }

  const userId = session.metadata?.supabase_user_id;
  // 通常クレジットとボーナスクレジットを個別に取得（旧メタデータ `credits` が残っている場合のフォールバックも考慮）
  const regularCredits = Number(session.metadata?.regular_credits || session.metadata?.credits || 0);
  const bonusCredits = Number(session.metadata?.bonus_credits || 0);

  if (!userId || regularCredits + bonusCredits <= 0) {
    console.error(`Stripe webhook: session ${session.id} has no user or no credits in metadata.`);
    return json({ received: true, skipped: true }, 200);
  }

  // 3. 購入記録の保存とクレジット加算をデータベース関数で1回で行う
  //    同じ決済（session.id）が再送されても、2回目は付与されない
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabaseAdmin.rpc("grant_purchase_credits", {
    p_user_id: userId,
    p_session_id: session.id,
    p_amount_paid: session.amount_total ?? 0,
    p_regular_credits: regularCredits,
    p_bonus_credits: bonusCredits,
  });

  if (error) {
    // 500 を返すと Stripe が再送する。関数は同じ決済を2回付与しないので、再送されても安全
    console.error(`Stripe webhook: grant_purchase_credits failed for session ${session.id}:`, error.message);
    return json({ error: "Failed to grant credits" }, 500);
  }

  console.log(`Stripe webhook: session ${session.id} → ${JSON.stringify(data)}`);
  return json({ received: true }, 200);
}
