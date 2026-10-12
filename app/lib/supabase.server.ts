import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

// Cloudflare環境およびビルド・ランタイムでの確実なフォールバック用定数
const DEFAULT_URL = "https://ybquwzoreecxxbewjpdn.supabase.co";
const DEFAULT_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlicXV3em9yZWVjeHhiZXdqcGRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2OTA5NDksImV4cCI6MjEwMjI2Njk0OX0.OHz5CEV9CLO02vzP4FOBCwPSs-aHuDOZtgobfiO5VM0";
const DEFAULT_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlicXV3em9yZWVjeHhiZXdqcGRuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjY5MDk0OSwiZXhwIjoyMTAyMjY2OTQ5fQ.3urGAd9dp1ZS36kF_vBCQ_1RrbIypR-Def_0QRHqE4k";

// 1. リクエストごとのサーバーサイドSupabaseクライアント（セッション維持用）
export function createServerSupabaseClient(request: Request, context?: any) {
  const headers = new Headers();
  
  // Cloudflare Pagesのcontext、クラウドアダプター、またはprocess.envから安全に取得
  const cfEnv = context?.cloudflare?.env || context || {};
  
  const url = cfEnv.SUPABASE_URL || cfEnv.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_URL;
  const anonKey = cfEnv.SUPABASE_ANON_KEY || cfEnv.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY;

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

// 2. 特権権限（Service Role）を用いた管理者用クライアント（アカウント完全削除用）
export function createAdminSupabaseClient(context?: any) {
  const cfEnv = context?.cloudflare?.env || context || {};
  
  const url = cfEnv.SUPABASE_URL || cfEnv.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_URL;
  const serviceKey = cfEnv.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || DEFAULT_SERVICE_KEY;

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}