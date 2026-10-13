import { createClient, SupabaseClient } from '@supabase/supabase-js';

// シングルトンとして保持するクライアントインスタンス
let cachedSupabase: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient => {
  if (cachedSupabase) {
    return cachedSupabase;
  }

  const getEnvVar = (key: string): string => {
    try {
      if (typeof import.meta !== 'undefined' && (import.meta as any).env?.[key]) {
        return (import.meta as any).env[key];
      }
    } catch {}

    try {
      if (typeof process !== 'undefined' && process.env?.[key]) {
        return process.env[key] as string;
      }
    } catch {}

    try {
      if (typeof window !== 'undefined' && (window as any)[key]) {
        return (window as any)[key];
      }
    } catch {}

    return '';
  };

  const url = 
    getEnvVar('SUPABASE_URL') || 
    getEnvVar('VITE_SUPABASE_URL') || 
    getEnvVar('PUBLIC_SUPABASE_URL');

  const key = 
    getEnvVar('SUPABASE_ANON_KEY') || 
    getEnvVar('VITE_SUPABASE_ANON_KEY') || 
    getEnvVar('PUBLIC_SUPABASE_ANON_KEY');

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