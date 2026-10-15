/**
 * @file supabase.server.ts
 * @description Server-side Supabase clients for Remix / Cloudflare Workers
 */
import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

// Cloudflare環境およびビルド・ランタイムでのフォールバック用定数（機密情報は含めない）
const DEFAULT_URL = "https://ybquwzoreecxxbewjpdn.supabase.co";
const DEFAULT_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlicXV3em9yZWVjeHhiZXdqcGRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2OTA5NDksImV4cCI6MjEwMjI2Njk0OX0.OHz5CEV9CLO02vzP4FOBCwPSs-aHuDOZtgobfiO5VM0";

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

  const supabase = createServerClient(url, anonKey, {
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