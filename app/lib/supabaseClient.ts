import { createClient } from '@supabase/supabase-js';

// クライアントサイド (Vite) とサーバー/エッジサイド (Cloudflare Workers) の両方から環境変数を安全に取得
const getEnvVar = (key: string) => {
  try {
    // 1. Viteのクライアント環境変数チェック
    if (typeof import.meta !== 'undefined' && (import.meta as any).env?.[key]) {
      return (import.meta as any).env[key];
    }
  } catch {}

  try {
    // 2. Node / Cloudflare Workersの process.env チェック
    if (typeof process !== 'undefined' && process.env?.[key]) {
      return process.env[key];
    }
  } catch {}

  return '';
};

// プレフィックス付き（VITE_SUPABASE_URL）とプレフィックスなし（SUPABASE_URL）の両方に対応
const supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || getEnvVar('SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || getEnvVar('SUPABASE_ANON_KEY');

// ビルド時や初期化時にエラーでクラッシュしないよう、プレースホルダーを許容するガード
const safeUrl = supabaseUrl || 'https://placeholder.supabase.co';
const safeKey = supabaseAnonKey || 'placeholder-key';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase URL or Anon Key is missing in environment variables. Running with placeholder values.');
}

export const supabase = createClient(safeUrl, safeKey);