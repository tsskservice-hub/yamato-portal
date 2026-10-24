/**
 * @file texttypes.ts
 * @description Decoupled TypeScript logic & Supabase client integration for VCE Japanese Text Types Specification.
 * Stores data in Supabase 'app_knowledge' table under key: 'TEXTTYPES'.
 */

import { SupabaseClient } from '@supabase/supabase-js';

// --- Type Definitions ---
export interface TextTypeDetail {
  title: string;
  purpose: string;
  structure: string[];
  sampleImage?: string;
  sample?: string;
}

export type TextTypesData = Record<string, TextTypeDetail>;
export type TextTypesDataPayload = TextTypesData;

// --- Default Fallback Data (Genkooyooshi を含むデフォルトデータ) ---
export const TEXT_TYPES_DATA: TextTypesData = {
  "Speech": {
    "title": "Speech (スピーチ原稿)",
    "purpose": "To persuade, inform, or entertain an audience through spoken delivery.",
    "structure": [
      "Catchy opening / Greeting (e.g. みなさん、こんにちは)",
      "Clear thesis statement & self-introduction",
      "Body paragraphs with supporting arguments & rhetorical questions",
      "Strong concluding call to action & polite closing (e.g. ご清聴ありがとうございました)"
    ]
  },
  "Journal": {
    "title": "Journal, Diary Entry (日記)",
    "purpose": "To record personal thoughts, feelings, and reflections on daily experiences.",
    "structure": [
      "Date / Day of week / Weather header at the top",
      "Personal tone and emotional expression (Plain style / だ・である調)",
      "Chronological or thematic reflection on unforgettable moments",
      "Closing personal resolution or future thought"
    ]
  },
  "Article": {
    "title": "Article (記事)",
    "purpose": "To inform, persuade, or entertain readers through a structured publication format.",
    "structure": [
      "Catchy headline / Title",
      "Author's name (fictional) under the title",
      "Introduction outlining the main theme & engaging hook",
      "Informative body sections with clear logical flow",
      "Conclusion summarizing key takeaways (Plain or Polite style)"
    ]
  },
  "Email": {
    "title": "Email (Eメール)",
    "purpose": "To convey a clear message, consultation, or advice to a specific recipient.",
    "structure": [
      "Recipient name at the top",
      "Subject line clearly indicating the topic",
      "Polite opening & main text",
      "Sign-off & Sender name at the end"
    ]
  },
  "Letter": {
    "title": "Personal Letter (手紙)",
    "purpose": "To correspond warmly with friends, host families, or teachers.",
    "structure": [
      "Greeting to recipient (e.g. 〇〇さんへ)",
      "Seasonal greeting or opening inquiry",
      "Body paragraphs with personal recount and questions",
      "Closing remarks & sender sign-off with date"
    ]
  },
  // 💡 原稿用紙の使い方ガイド（How to use Genkooyooshi）
  "Genkooyooshi": {
    "title": "Genkooyooshi Usage Guide (原稿用紙の使い方)",
    "purpose": "This guide outlines the standard VCE rules for formatting titles, names, indentations, and punctuation marks on Japanese manuscript paper.",
    "structure": [
      "Title (Line 1): Leave 3 blank squares at the beginning, then write your title.",
      "Name (Line 2): Align your name towards the bottom, leaving the very last square blank.",
      "Paragraph Indentation: Always leave 1 blank square at the start of every new paragraph.",
      "Punctuation (、 and 。): Each punctuation mark occupies its own square. Never start a new line with a comma or full stop (place it inside the last square of the previous line instead).",
      "Numbers & Alphabet: Two half-width digits or letters occupy one single square (e.g. '20', 'in')."
    ],
    "sampleImage": "/genkoyoshi.pdf"
  }
};

// 表記ゆれ（Genkoyoshi）対策のエイリアス
TEXT_TYPES_DATA["Genkoyoshi"] = TEXT_TYPES_DATA["Genkooyooshi"];

export default TEXT_TYPES_DATA;

export interface AppKnowledgeRecord<T = any> {
  id?: string;
  key: string;
  title: string;
  category: string;
  data: T;
  created_at?: string;
  updated_at?: string;
}

const KNOWLEDGE_KEY = 'TEXTTYPES';

/**
 * Fetch VCE Japanese Text Types Specification data from Supabase 'app_knowledge' table.
 */
export async function fetchTextTypesData(supabaseClient: SupabaseClient): Promise<TextTypesData> {
  try {
    const { data: row, error } = await supabaseClient
      .from('app_knowledge')
      .select('*')
      .eq('key', KNOWLEDGE_KEY)
      .single();

    if (error || !row) {
      console.warn(`[${KNOWLEDGE_KEY}] Supabaseからの取得失敗のためデフォルトを返します:`, error?.message);
      return TEXT_TYPES_DATA;
    }

    const fetchedData = (row.data || row.content_json) as TextTypesData;
    if (fetchedData && typeof fetchedData === 'object' && Object.keys(fetchedData).length > 0) {
      // 💡 もし Supabase 側のデータに Genkooyooshi が欠けている場合はデフォルトから補完
      if (!fetchedData["Genkooyooshi"] && !fetchedData["Genkoyoshi"]) {
        fetchedData["Genkooyooshi"] = TEXT_TYPES_DATA["Genkooyooshi"];
      }
      // 表記ゆれエイリアスの同期
      if (fetchedData["Genkooyooshi"] && !fetchedData["Genkoyoshi"]) {
        fetchedData["Genkoyoshi"] = fetchedData["Genkooyooshi"];
      } else if (fetchedData["Genkoyoshi"] && !fetchedData["Genkooyooshi"]) {
        fetchedData["Genkooyooshi"] = fetchedData["Genkoyoshi"];
      }
      return fetchedData;
    }

    return TEXT_TYPES_DATA;
  } catch (err) {
    console.error(`Error fetching ${KNOWLEDGE_KEY} from Supabase:`, err);
    return TEXT_TYPES_DATA;
  }
}

/**
 * Upsert VCE Japanese Text Types Specification data to Supabase 'app_knowledge' table.
 */
export async function upsertTextTypesData(
  supabaseClient: SupabaseClient,
  content: TextTypesData,
  category = 'VCE Japanese Data'
): Promise<boolean> {
  const { error } = await supabaseClient
    .from('app_knowledge')
    .upsert({
      key: KNOWLEDGE_KEY,
      title: 'VCE Japanese Text Types Specification',
      category,
      data: content,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });

  if (error) {
    console.error(`Error upserting ${KNOWLEDGE_KEY} to Supabase:`, error);
    return false;
  }
  return true;
}

export function getTextTypeByName(textTypesData: TextTypesData, name: string): TextTypeDetail | null {
  return textTypesData[name] || textTypesData[name === "Genkooyooshi" ? "Genkoyoshi" : "Genkooyooshi"] || null;
}

export function listAllTextTypeNames(textTypesData: TextTypesData): string[] {
  return Object.keys(textTypesData);
}