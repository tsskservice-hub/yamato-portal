/**
 * @file kanji-list.ts
 * @description Decoupled TypeScript logic & Supabase client integration for VCE Kanji List.
 * Stores data in Supabase 'app_knowledge' table under key: 'kanji-list'.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- VCE Kanji List Constant ---
export const VCE_KANJI_LIST: string[] = [
  "一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "百", "千", "万", "本", "人", "回", "才", "円", "番", "春", "夏", "秋", "冬", "日", "月", "火", "水", "木", "金", "土", "曜", "年", "時", "分", "夕", "半", "午", "毎", "週", "間", "今", "先", "朝", "晩", "昼", "夜", "去", "目", "口", "耳", "手", "体", "上", "中", "下", "右", "左", "前", "後", "東", "西", "南", "北", "外", "学", "校", "英", "語", "文", "漢", "字", "勉", "強", "父", "母", "子", "家", "族", "兄", "弟", "姉", "妹", "友", "私", "男", "女", "大", "小", "好", "安", "高", "新", "古", "多", "少", "楽", "長", "近", "正", "広", "早", "明", "行", "来", "休", "出", "入", "生", "見", "思", "書", "言", "話", "読", "売", "買", "食", "飲", "知", "作", "住", "会", "使", "着", "発", "聞", "帰", "持", "待", "教", "乗", "働", "動", "歩", "終", "始", "泊", "洗", "立", "考", "習", "山", "川", "田", "花", "島", "海", "天", "雨", "雪", "牛", "魚", "馬", "犬", "京", "都", "市", "県", "州", "国", "町", "神", "寺", "駅", "店", "電", "車", "道", "旅", "赤", "青", "白", "黒", "色", "銀", "々", "何", "紙", "元", "気", "活", "社", "自", "物", "名", "方", "院", "所", "屋", "肉", "場", "飯", "洋", "和", "病", "次", "同", "仕", "事", "点"
];

// --- Type Definitions ---
export interface KanjiItem {
  kanji: string;
  reading: string;
  romaji: string;
  meaning: string;
  vceGroup: string;
}

export interface KanjiListData {
  curriculum: string;
  level: string;
  category: string;
  kanjiItems: KanjiItem[];
}

export type KanjiListDataPayload = KanjiListData;

export interface AppKnowledgeRecord<T = any> {
  id?: string;
  key: string;
  title: string;
  category: string;
  content_json: T;
  created_at?: string;
  updated_at?: string;
}

const KNOWLEDGE_KEY = 'kanji-list';

/**
 * Fetch VCE Kanji List data from Supabase 'app_knowledge' table.
 */
export async function fetchKanjiListData(supabaseClient: SupabaseClient): Promise<KanjiListData | null> {
  const { data, error } = await supabaseClient
    .from('app_knowledge')
    .select('content_json')
    .eq('key', KNOWLEDGE_KEY)
    .single();

  if (error) {
    console.error(`Error fetching ${KNOWLEDGE_KEY} from Supabase:`, error);
    return null;
  }

  return data?.content_json as KanjiListData;
}

/**
 * Upsert VCE Kanji List data to Supabase 'app_knowledge' table.
 */
export async function upsertKanjiListData(
  supabaseClient: SupabaseClient,
  content: KanjiListData,
  category = 'VCE Japanese Data'
): Promise<boolean> {
  const { error } = await supabaseClient
    .from('app_knowledge')
    .upsert({
      key: KNOWLEDGE_KEY,
      title: 'VCE Kanji List',
      category,
      content_json: content,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });

  if (error) {
    console.error(`Error upserting ${KNOWLEDGE_KEY} to Supabase:`, error);
    return false;
  }
  return true;
}

// --- Helper & Utility Logic ---
/**
 * Search kanji items by character, reading, romaji, or meaning.
 */
export function searchKanji(kanjiData: KanjiListData, query: string): KanjiItem[] {
  const q = query.toLowerCase().trim();
  if (!q) return kanjiData.kanjiItems;
  return kanjiData.kanjiItems.filter(item =>
    item.kanji.includes(q) ||
    item.reading.includes(q) ||
    item.romaji.toLowerCase().includes(q) ||
    item.meaning.toLowerCase().includes(q)
  );
}

/**
 * Filter kanji items by VCE group.
 */
export function getKanjiByGroup(kanjiData: KanjiListData, group: string): KanjiItem[] {
  return kanjiData.kanjiItems.filter(item => item.vceGroup.toLowerCase() === group.toLowerCase());
}