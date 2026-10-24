/**
 * @file supabaseClient.ts
 * @description Supabase client initialization for Remix / Vite / Cloudflare Pages
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// シングルトンとして保持するクライアントインスタンス
let cachedSupabase: SupabaseClient | null = null;

// 💡 確実に接続できるよう、実際のプロジェクト情報をフォールバックとして定義
const FALLBACK_URL = "https://ybquwzoreecxxbewjpdn.supabase.co";
const FALLBACK_ANON_KEY = "sb_publishable_kxxOp7nY3OuRNYp_Cxl5Sw_QtVCG_te";

export const getSupabase = (): SupabaseClient => {
  if (cachedSupabase) {
    return cachedSupabase;
  }

  // 💡 Viteの静的置換を確実に効かせるため、直接 `import.meta.env` のプロパティを指定して参照する
  const url = 
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) || 
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.SUPABASE_URL) || 
    (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) || 
    (typeof process !== 'undefined' && process.env?.SUPABASE_URL) || 
    '';

  const key = 
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) || 
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.SUPABASE_ANON_KEY) || 
    (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) || 
    (typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY) || 
    '';

  // 有効な値がない、またはプレースホルダーが含まれている場合はフォールバックを使用する
  const finalUrl = (url && !url.includes('placeholder')) ? url : FALLBACK_URL;
  const finalKey = (key && !key.includes('placeholder')) ? key : FALLBACK_ANON_KEY;

  if (!finalUrl || !finalKey) {
    console.error('❌ CRITICAL: Supabase URL or Anon Key is missing during client initialization.');
  }

  // 実行時に有効な値でインスタンスを生成
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