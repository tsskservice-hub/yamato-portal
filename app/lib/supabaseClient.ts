import { createClient } from '@supabase/supabase-js';

// 環境変数（Viteの場合は VITE_ プレフィックス）からSupabaseのURLとAnon Keyを取得します
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables in portal project.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// passkey.ts 等で supabaseClient という名前でインポートしている場合はエイリアスも作成しておきます
export const supabaseClient = supabase;