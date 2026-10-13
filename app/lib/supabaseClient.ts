import { createClient } from '@supabase/supabase-js';

const getEnvVar = (key: string): string => {
  try {
    // 1. Remix / Vite の client / SSR 環境変数
    if (typeof import.meta !== 'undefined' && (import.meta as any).env?.[key]) {
      return (import.meta as any).env[key];
    }
  } catch {}

  try {
    // 2. Node.js / Cloudflare Functions の process.env
    if (typeof process !== 'undefined' && process.env?.[key]) {
      return process.env[key] as string;
    }
  } catch {}

  try {
    // 3. ウィンドウオブジェクト等に埋め込まれている場合
    if (typeof window !== 'undefined' && (window as any)[key]) {
      return (window as any)[key];
    }
  } catch {}

  return '';
};

// 💡 Cloudflare上で登録されている各種キーを網羅的にフォールバック探索
const supabaseUrl = 
  getEnvVar('SUPABASE_URL') || 
  getEnvVar('VITE_SUPABASE_URL') || 
  getEnvVar('PUBLIC_SUPABASE_URL');

const supabaseAnonKey = 
  getEnvVar('SUPABASE_ANON_KEY') || 
  getEnvVar('VITE_SUPABASE_ANON_KEY') || 
  getEnvVar('PUBLIC_SUPABASE_ANON_KEY');

if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
  console.error('❌ CRITICAL: Supabase URL is missing in Cloudflare Environment Variables.');
}

if (!supabaseAnonKey || supabaseAnonKey.includes('placeholder')) {
  console.error('❌ CRITICAL: Supabase Anon Key is missing in Cloudflare Environment Variables.');
}

// 実行時に有効な値がない場合でも最低限クラッシュを防ぎつつ、明確にログ出力する
const safeUrl = (supabaseUrl && !supabaseUrl.includes('placeholder')) ? supabaseUrl : 'https://placeholder.supabase.co';
const safeKey = (supabaseAnonKey && !supabaseAnonKey.includes('placeholder')) ? supabaseAnonKey : 'placeholder-key';

export const supabase = createClient(safeUrl, safeKey);