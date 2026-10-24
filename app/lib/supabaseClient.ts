/**
 * @file supabaseClient.ts
 * @description Supabase client initialization for Remix / Vite / Cloudflare Pages
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// シングルトンとして保持するクライアントインスタンス
let cachedSupabase: SupabaseClient | null = null;

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

  if (!url || !key || url.includes('placeholder')) {
    console.error('❌ CRITICAL: Supabase URL or Anon Key is missing during client initialization.');
  }

  // 実行時に有効な値でインスタンスを生成
  cachedSupabase = createClient(
    url || 'https://placeholder.supabase.co', 
    key || 'placeholder-key'
  );

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