/**
 * @file supabaseClient.ts
 * @description Supabase client initialization for Remix / Vite / Cloudflare Pages (Fixed for Vite static replacement)
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// シングルトンとして保持するクライアントインスタンス
let cachedSupabase: SupabaseClient | null = null;

// フォールバック設定
const FALLBACK_URL = "https://ybquwzoreecxxbewjpdn.supabase.co";
const FALLBACK_ANON_KEY = "sb_publishable_kxxOp7nY3OuRNYp_Cxl5Sw_QtVCG_te";

export const getSupabase = (): SupabaseClient => {
  if (cachedSupabase) {
    return cachedSupabase;
  }

  // 💡 Viteのビルド時静的置換を確実に効かせるため、各環境変数を個別に直接取得する
  let envUrl = '';
  let envKey = '';

  try {
    // Vite (Client-side)
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      envUrl = (import.meta as any).env.VITE_SUPABASE_URL || (import.meta as any).env.SUPABASE_URL || '';
      envKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || (import.meta as any).env.SUPABASE_ANON_KEY || '';
    }
  } catch (e) {
    // ignore
  }

  // Node / SSR / Cloudflare Workers environment fallback
  if (!envUrl && typeof process !== 'undefined' && process.env) {
    envUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  }
  if (!envKey && typeof process !== 'undefined' && process.env) {
    envKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  }

  // フォールバックや有効性のチェック
  const finalUrl = (envUrl && !envUrl.includes('placeholder')) ? envUrl : FALLBACK_URL;
  const finalKey = (envKey && !envKey.includes('placeholder')) ? envKey : FALLBACK_ANON_KEY;

  if (!finalUrl || !finalKey) {
    console.error('❌ CRITICAL: Supabase URL or Anon Key is missing during client initialization.');
  }

  // インスタンス生成
  cachedSupabase = createClient(finalUrl, finalKey);

  return cachedSupabase;
};

// 従来の `import { supabase } from ...` を使っている既存コードとの互換性を保つための Proxy エクスポート
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    const client = getSupabase();
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});