import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

// 1. リクエストごとのサーバーサイドSupabaseクライアント（セッション維持用）
export function createServerSupabaseClient(request: Request) {
  const headers = new Headers();

  const supabase = createServerClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY!,
    {
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
    }
  );

  return { supabase, headers };
}

// 2. 特権権限（Service Role）を用いた管理者用クライアント（アカウント完全削除用）
export function createAdminSupabaseClient() {
  return createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!,
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}