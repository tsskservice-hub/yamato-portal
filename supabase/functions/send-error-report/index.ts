import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

// 送信先・件名はサーバー側で固定（呼び出し側からは変更不可）
const FIXED_RECIPIENT = "support@jptutoraiyamato.com";
const FIXED_SUBJECT = "[System Error Report] JP Tutor AI Yamato";

// 呼び出しを許可するオリジン（自サイトのみ）
const ALLOWED_ORIGINS = [
  "https://jptutoraiyamato.com",
  "https://www.jptutoraiyamato.com",
  "http://localhost:5173",
];

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

// HTMLエスケープ（長さ制限付き）
function escapeHtml(value: unknown, maxLength: number): string {
  return String(value ?? "")
    .slice(0, maxLength)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// 自サイトのURLだけをリンクにする
function safePageUrl(value: unknown): string {
  try {
    const url = new URL(String(value ?? ""));
    const host = url.hostname;
    if (
      url.protocol === "https:" &&
      (host === "jptutoraiyamato.com" || host.endsWith(".jptutoraiyamato.com"))
    ) {
      return url.toString();
    }
  } catch {
    // 無効なURLは無視
  }
  return "";
}

serve(async (req) => {
  const origin = req.headers.get("Origin");
  const headers = { ...corsHeaders(origin), "Content-Type": "application/json" };

  // CORSプリフライトリクエストの処理
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  }

  // ブラウザ以外からの直接呼び出しを減らすため Origin を確認
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers });
  }

  try {
    const body = await req.json().catch(() => ({}));

    // recipient / subject は受け取っても使用しない
    const pageUrl = safePageUrl(body.pageUrl);
    const pageUrlHtml = pageUrl
      ? `<a href="${escapeHtml(pageUrl, 500)}">${escapeHtml(pageUrl, 500)}</a>`
      : "(invalid or external URL)";
    const timestamp = escapeHtml(body.timestamp, 50);
    const errorMessage = escapeHtml(body.errorMessage, 2000);

    // Resend APIを叩いてメールを送信
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "JP Tutor AI Yamato Support <support@jptutoraiyamato.com>",
        to: [FIXED_RECIPIENT],
        subject: FIXED_SUBJECT,
        html: `
          <div style="font-family: sans-serif; color: #333;">
            <h2 style="color: #0284c7;">System Error Report</h2>
            <p>An error occurred on the <strong>JP Tutor AI Yamato</strong> platform.</p>
            <hr style="border: 1px solid #e2e8f0; margin: 16px 0;" />
            <ul>
              <li><strong>Page URL:</strong> ${pageUrlHtml}</li>
              <li><strong>Timestamp:</strong> ${timestamp}</li>
            </ul>
            <h3>Error Details:</h3>
            <pre style="background: #f1f5f9; padding: 12px; border-radius: 6px; overflow-x: auto;">${errorMessage}</pre>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      // Resendのエラー詳細はログにのみ残し、呼び出し側には返さない
      console.error("Resend error:", await res.text());
      return new Response(JSON.stringify({ error: "Failed to send report" }), { status: 502, headers });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers });
  } catch (error) {
    console.error("send-error-report error:", error);
    return new Response(JSON.stringify({ error: "Bad request" }), { status: 400, headers });
  }
});
