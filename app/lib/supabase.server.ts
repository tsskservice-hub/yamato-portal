/**
 * @file supabase.server.ts
 * @description Server-side Supabase clients for Remix / Cloudflare Workers
 */
import { createServerClient as createSsrSupabaseClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

// Cloudflare環境およびビルド・ランタイムでのフォールバック用定数（機密情報は含めない）
const DEFAULT_URL = "https://ybquwzoreecxxbewjpdn.supabase.co";
// 公開用キー（publishable key）。ブラウザ側の supabaseClient.ts と同じ値。秘密情報ではない。
const DEFAULT_ANON_KEY = "sb_publishable_kxxOp7nY3OuRNYp_Cxl5Sw_QtVCG_te";

const getEnv = (key: string, context?: any) => {
  const cfEnv = context?.cloudflare?.env || context?.env || context || {};
  
  if (cfEnv[key] && !String(cfEnv[key]).includes('placeholder')) {
    return cfEnv[key];
  }
  
  try {
    if (typeof process !== 'undefined' && process.env?.[key] && !String(process.env[key]).includes('placeholder')) {
      return process.env[key];
    }
  } catch {}

  return '';
};

// 1. リクエストごとのサーバーサイドSupabaseクライアント（セッション維持用）
export function createServerSupabaseClient(request: Request, context?: any) {
  const headers = new Headers();
  
  const url = getEnv("SUPABASE_URL", context) || getEnv("VITE_SUPABASE_URL", context) || DEFAULT_URL;
  const anonKey = getEnv("SUPABASE_ANON_KEY", context) || getEnv("VITE_SUPABASE_ANON_KEY", context) || DEFAULT_ANON_KEY;

  const supabase = createSsrSupabaseClient(url, anonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get("Cookie") ?? "");
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: any }>) {
        cookiesToSet.forEach(({ name, value, options }) => {
          headers.append("Set-Cookie", serializeCookieHeader(name, value, options));
        });
      },
    },
  });

  return { supabase, headers };
}

/**
 * 🔐 サーバー用のログイン Cookie（名前が "sb-" で始まるもの）をすべて消す Set-Cookie を headers に足す。
 * ログアウト・アカウント削除のときに使う。Cookie が残ると、共有パソコンで次の人が前の人として扱われるおそれがある。
 */
export function appendClearAuthCookies(request: Request, headers: Headers) {
  const cookies = parseCookieHeader(request.headers.get("Cookie") ?? "");
  for (const { name } of cookies) {
    if (name.startsWith("sb-")) {
      headers.append("Set-Cookie", serializeCookieHeader(name, "", { path: "/", maxAge: 0 }));
    }
  }
}

/**
 * 署名（HMAC）用の秘密の文字列。管理者キーから用途（purpose）ごとに作る。
 * 新しい環境変数を増やさずに済み、管理者キーそのものはどこにも出さない（HMAC の鍵として使うだけ）。
 */
export function getDerivedSecret(context: any, purpose: string) {
  const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY", context);
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing in environment variables.");
  }
  return `yamato:${purpose}:${serviceKey}`;
}

// 2. 特権権限（Service Role）を用いた管理者用クライアント（アカウント完全削除用など）
export function createAdminSupabaseClient(context?: any) {
  const url = getEnv("SUPABASE_URL", context) || getEnv("VITE_SUPABASE_URL", context) || DEFAULT_URL;
  
  // 秘密鍵は環境変数（SUPABASE_SERVICE_ROLE_KEY）からのみ取得するように厳格化
  const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY", context);

  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing in environment variables.");
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}