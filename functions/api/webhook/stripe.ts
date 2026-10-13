import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// フォールバック用の安全なダミー値
const DEFAULT_URL = "https://ybquwzoreecxxbewjpdn.supabase.co";
const DEFAULT_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlicXV3em9yZWVjeHhiZXdqcGRuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjY5MDk0OSwiZXhwIjoyMTAyMjY2OTQ5fQ.3urGAd9dp1ZS36kF_vBCQ_1RrbIypR-Def_0QRHqE4k";

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
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || (typeof process !== 'undefined' ? process.env.SUPABASE_SERVICE_ROLE_KEY : '') || DEFAULT_SERVICE_KEY;

  if (!stripeSecretKey) {
    return new Response(JSON.stringify({ error: "Stripe Secret Key is missing" }), { status: 500 });
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2026-09-30.endive" as any });
  const signature = request.headers.get("stripe-signature");

  try {
    const payload = await request.text();
    // Cloudflare環境では非同期版 constructEventAsync を使用
    const event = await stripe.webhooks.constructEventAsync(payload, signature!, webhookSecret!);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      const creditsToAdd = Number(session.metadata?.credits || 0);

      if (userId && creditsToAdd > 0) {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        // 1. クレジット残高の加算（RPC関数）
        const { error: rpcError } = await supabaseAdmin.rpc("increment_credits", {
          user_id: userId,
          amount: creditsToAdd,
        });

        if (rpcError) {
          const { data: profile } = await supabaseAdmin.from("profiles").select("credits").eq("id", userId).single();
          const currentCredits = profile?.credits || 0;
          await supabaseAdmin.from("profiles").update({ credits: currentCredits + creditsToAdd }).eq("id", userId);
        }

        // 2. purchases テーブルへ購入履歴保存
        await supabaseAdmin.from("purchases").insert({
          user_id: userId,
          stripe_session_id: session.id,
          amount_paid: session.amount_total,
          credits_granted: creditsToAdd,
        });
      }
    }
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: `Webhook Error: ${err.message}` }), { status: 400 });
  }
}