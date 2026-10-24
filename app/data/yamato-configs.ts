/**
 * @file app/data/yamato-configs.ts
 * @description Decoupled TypeScript logic & Supabase client integration for Yamato Bot Configs.
 * Stores data in Supabase 'app_knowledge' table under key: 'YAMATO_CONFIGS'.
 */

import { SupabaseClient } from '@supabase/supabase-js';

// --- Type Definitions ---
export type AppType = 
  | "concierge" 
  | "game-igo" 
  | "genkoyoshi-editor-general" 
  | "genkoyoshi-editor-vce" 
  | "eoy-oral-drill" 
  | "eoy-oral-elaborate" 
  | "eoy-oral-mock" 
  | "eoy-writing" 
  | "eoy-writing-custom"
  | "oral-exam-questions"
  | "kanji-grammar-checker"
  | "image-explanation";

export type BotConfig = {
  name: string;
  greeting: string;
  themeColor: "red" | "blue" | "black" | "green" | "yellow" | "orange" | "purple" | "cyan" | "pink" | "rainbow" | string;
  apiSourceFile?: string;
  targetAudience?: string;
  buttonStyle: {
    border: string;
    background: string;
    color: string;
  };
  floatingButtonStyle: {
    border: string;
    background: string;
    color: string;
  };
};

export type YamatoConfigsData = Record<string, BotConfig>;

// 💡 デフォルトのフォールバック設定（Supabaseロード前やオフライン時にも指定色を即座に適用）
export const YAMATO_BOT_CONFIGS: YamatoConfigsData = {
  "genkoyoshi-editor-vce": {
    name: "原稿用紙エディタ for VCE",
    greeting: "Hello, my friend! 🌟 Are you studying hard today? Let's master correct Genkoyoshi usage and stay well prepared for your SACs and End of Year Exam! 📝✨",
    themeColor: "blue",
    buttonStyle: {
      border: "2px solid #38bdf8",
      background: "#3b82f6",
      color: "#ffffff"
    },
    floatingButtonStyle: {
      border: "2px solid #38bdf8",
      background: "#3b82f6",
      color: "#ffffff"
    }
  },
  "concierge": {
    name: "やまと先生",
    greeting: "Hello, my friend! 🌟 Welcome to Yamato Portal. How can I assist you today?",
    themeColor: "red",
    buttonStyle: { border: "2px solid #ef4444", background: "#ffffff", color: "#000000" },
    floatingButtonStyle: { border: "2px solid #ef4444", background: "#ffffff", color: "#000000" },
  },
  "kanji-grammar-checker": {
    name: "漢字文法チェッカーヤマト",
    greeting: "Are you studying Japanese hard and keeping your spirits high today? Let's check your grammar and kanji!",
    themeColor: "yellow",
    buttonStyle: { border: "2px solid #eab308", background: "#fef08a", color: "#000000" },
    floatingButtonStyle: { border: "2px solid #eab308", background: "#fef08a", color: "#000000" },
  },
  "eoy-writing": {
    name: "VCE Writing Practice",
    greeting: "Hello, my friend! 🌟 Welcome to your EOY Writing practice session!",
    themeColor: "cyan",
    buttonStyle: { border: "2px solid #06b6d4", background: "#cffafe", color: "#000000" },
    floatingButtonStyle: { border: "2px solid #06b6d4", background: "#cffafe", color: "#000000" },
  }
};

const KNOWLEDGE_KEY = 'YAMATO_CONFIGS';

/**
 * Fetch Yamato Bot Configs data from Supabase 'app_knowledge' table.
 */
export async function fetchYamatoConfigsData(supabaseClient: SupabaseClient): Promise<YamatoConfigsData | null> {
  try {
    const { data: row, error } = await supabaseClient
      .from('app_knowledge')
      .select('*')
      .eq('key', KNOWLEDGE_KEY)
      .single();

    if (error || !row) {
      console.warn(`[${KNOWLEDGE_KEY}] Supabaseからの取得失敗のためデフォルトを返します:`, error?.message);
      return YAMATO_BOT_CONFIGS;
    }

    const result = (row.data || row.content_json) as YamatoConfigsData;
    if (result && typeof result === 'object' && Object.keys(result).length > 0) {
      return { ...YAMATO_BOT_CONFIGS, ...result };
    }

    return YAMATO_BOT_CONFIGS;
  } catch (err) {
    console.error(`Error fetching ${KNOWLEDGE_KEY} from Supabase:`, err);
    return YAMATO_BOT_CONFIGS;
  }
}

export function getBotConfigByType(configsData: YamatoConfigsData, appType: string): BotConfig | null {
  return configsData[appType] || YAMATO_BOT_CONFIGS[appType] || null;
}

export default YAMATO_BOT_CONFIGS;