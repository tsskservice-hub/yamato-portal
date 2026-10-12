import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export async function onRequestPost(context: {
  request: Request;
  env: {
    STRIPE_SECRET_KEY: string;
    STRIPE_WEBHOOK_SECRET: string;
    SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
  };
}) {
  const { request, env } = context;

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-09-30.endive" as any,
  });

  const signature = request.headers.get("stripe-signature");
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
  const isTestBypass = request.headers.get("x-test-mode") === "true";

  let userId: string | undefined;
  let creditsToAdd = 0;
  let sessionId = `test_session_${Date.now()}`;
  let amountPaid = 1000;

  try {
    const payload = await request.text();

    // ★ テスト用ヘッダー（x-test-mode: true）がある場合は署名検証をスキップ
    if (isTestBypass) {
      const testData = JSON.parse(payload);
      userId = testData.userId;
      creditsToAdd = Number(testData.credits || 1000);
      amountPaid = Number(testData.amountPaid || 1000);
    } else {
      // 通常のStripe Webhook処理
      if (!signature || !webhookSecret) {
        console.error("Missing signature or webhook secret");
        return new Response(
          JSON.stringify({ error: "Missing signature or webhook secret" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // 署名検証とイベントの構築
      const event = await stripe.webhooks.constructEventAsync(payload, signature, webhookSecret);
      console.log(`Stripe Event Received: ${event.type}`);

      // checkout.session.completed または async_payment_succeeded を処理対象にする
      if (
        event.type === "checkout.session.completed" ||
        event.type === "checkout.session.async_payment_succeeded"
      ) {
        const session = event.data.object as Stripe.Checkout.Session;
        userId = session.metadata?.supabase_user_id;
        creditsToAdd = Number(session.metadata?.credits || 0);
        sessionId = session.id;
        amountPaid = session.amount_total || 1000;

        console.log(`Parsed Session Metadata - userId: ${userId}, credits: ${creditsToAdd}, amount: ${amountPaid}`);
      } else {
        // 対象外のイベントはそのまま200を返す
        return new Response(JSON.stringify({ received: true, ignored: event.type }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Supabaseの更新処理
    if (userId && creditsToAdd > 0) {
      const supabaseAdmin = createClient(
        env.SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY
      );

      // 1. クレジットの加算処理（RPCまたは直接UPDATE）
      const { error: rpcError } = await supabaseAdmin.rpc("increment_credits", {
        user_id: userId,
        amount: creditsToAdd,
      });

      if (rpcError) {
        console.warn("RPC increment_credits failed, falling back to direct update:", rpcError.message);
        const { data: profile, error: fetchError } = await supabaseAdmin
          .from("profiles")
          .select("credits")
          .eq("id", userId)
          .single();

        if (fetchError) {
          console.error("Failed to fetch profile for user:", userId, fetchError.message);
        }

        const currentCredits = profile?.credits || 0;
        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({ credits: currentCredits + creditsToAdd })
          .eq("id", userId);

        if (updateError) {
          console.error("Failed to update credits directly:", updateError.message);
        }
      }

      // 2. purchases テーブルへの購入履歴の保存処理
      const { error: purchaseError } = await supabaseAdmin.from("purchases").insert({
        user_id: userId,
        stripe_session_id: sessionId,
        amount_paid: amountPaid,
        credits_granted: creditsToAdd,
      });

      if (purchaseError) {
        console.error("Failed to insert purchase record:", purchaseError.message);
      } else {
        console.log(`Successfully recorded purchase for user ${userId} with ${creditsToAdd} credits.`);
      }
    } else {
      console.warn("Webhook processed, but userId was missing or creditsToAdd was 0. userId:", userId, "credits:", creditsToAdd);
    }

    return new Response(JSON.stringify({ received: true, testMode: isTestBypass }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("WEBHOOK ERROR DETAIL:", err.message, err.stack);
    return new Response(
      JSON.stringify({ error: `Webhook Error: ${err.message}` }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
}