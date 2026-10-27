import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // CORSプリフライトリクエストの処理
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { recipient, subject, pageUrl, timestamp, errorMessage } = await req.json();

    // Resend APIを叩いてメールを送信
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        // ※ドメイン認証未完了の場合は 'onboarding@resend.dev' を使用してください
        from: "JP Tutor AI Yamato Support <support@jptutoraiyamato.com>",
        to: [recipient || "support@jptutoraiyamato.com"],
        subject: subject || "[System Error Report]",
        html: `
          <div style="font-family: sans-serif; color: #333;">
            <h2 style="color: #0284c7;">System Error Report</h2>
            <p>An error occurred on the <strong>JP Tutor AI Yamato</strong> platform.</p>
            <hr style="border: 1px solid #e2e8f0; margin: 16px 0;" />
            <ul>
              <li><strong>Page URL:</strong> <a href="${pageUrl}">${pageUrl}</a></li>
              <li><strong>Timestamp:</strong> ${timestamp}</li>
            </ul>
            <h3>Error Details:</h3>
            <pre style="background: #f1f5f9; padding: 12px; border-radius: 6px; overflow-x: auto;">${errorMessage}</pre>
          </div>
        `,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(JSON.stringify(data));
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});