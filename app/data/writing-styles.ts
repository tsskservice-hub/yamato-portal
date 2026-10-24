/**
 * @file writing-styles.ts
 * @description Decoupled TypeScript logic & Supabase client integration for VCE Writing Styles Guide.
 * Stores data in Supabase 'app_knowledge' table under key: 'WRITING_STYLES'.
 */

import { SupabaseClient } from '@supabase/supabase-js';

// --- Type Definitions ---
export interface WritingVocabularyCategory {
  categories: string;
  examples: string[];
}

export interface WritingStyleDetail {
  styleName: string;
  japaneseName: string;
  purpose: string;
  keyFeatures: string[];
  effectiveVocabulary: WritingVocabularyCategory[];
  effectiveGrammar: string[];
  compatibleTextTypes: string[];
}

export type WritingStylesData = Record<string, WritingStyleDetail>;
export type WritingStylesDataPayload = WritingStylesData;

// --- Default Fallback Data (オフライン時・未取得時の保険) ---
export const vceWritingStyles: WritingStylesData = {
  Informative: {
    styleName: "Informative",
    japaneseName: "説明的・報告的",
    purpose: "To convey objective facts and information clearly and accurately to the reader or listener, avoiding subjective emotions or exaggeration.",
    keyFeatures: [
      "Presents objective facts and structured information",
      "Maintains a neutral, informative tone without personal bias",
      "Ensures the situation can be accurately understood by anyone"
    ],
    effectiveVocabulary: [
      {
        categories: "Conjunctions & Introductions",
        examples: ["まず (First)", "次に (Next)", "その結果 (As a result)", "さらに (Furthermore)", "一般的に (Generally)", "によると (According to)"]
      },
      {
        categories: "Key Expressions",
        examples: ["〜について (About)", "〜によると (According to)", "〜ということが分かっています (It is known that)"]
      }
    ],
    effectiveGrammar: [
      "Basic sentence patterns for stating facts (〜そうだ, 〜と言われている, 〜によれば〜)",
      "Passive voice and objective descriptions"
    ],
    compatibleTextTypes: [
      "Report",
      "Official Report",
      "Article",
      "Summary"
    ]
  },
  Evaluative: {
    styleName: "Evaluative",
    japaneseName: "評価的・分析的",
    purpose: "To compare and examine an issue, problem, or text from multiple perspectives (pros/cons, advantages/disadvantages) and lead to a logical evaluation or conclusion.",
    keyFeatures: [
      "Compares multiple viewpoints and weighs advantages and disadvantages",
      "Conducts logical analysis and drives well-reasoned conclusions",
      "Highly emphasized in VCE external assessments (Section 2 Part B, Reports)"
    ],
    effectiveVocabulary: [
      {
        categories: "Comparison & Contrast",
        examples: ["一方で (On the other hand)", "他方 (On the other hand)", "〜に比べて (Compared to)", "〜と同様に (Similarly)", "対照的に (In contrast)"]
      },
      {
        categories: "Evaluation",
        examples: ["長所・短所 (Pros and cons)", "効果的である (Effective)", "〜という点で優れている (Superior in that)", "〜という課題がある (There is an issue that)"]
      }
    ],
    effectiveGrammar: [
      "Concessive and adversative expressions (〜けれども, 〜が, 〜にもかかわらず, 〜ものの)",
      "Expressions of reasons and grounds (〜という理由から, 〜の観点から見ると)"
    ],
    compatibleTextTypes: [
      "Review",
      "Report",
      "Essay",
      "Article"
    ]
  },
  Persuasive: {
    styleName: "Persuasive",
    japaneseName: "説得的・論説的",
    purpose: "To clearly state one's stance or argument and use compelling evidence and examples to persuade the reader or listener's thoughts and actions.",
    keyFeatures: [
      "Clearly establishes a position or argument on an issue",
      "Uses compelling evidence, examples, and rhetorical devices",
      "Aims to influence the audience's perspective or prompt action"
    ],
    effectiveVocabulary: [
      {
        categories: "Stating Claims",
        examples: ["私は〜と強く信じている (I strongly believe that)", "〜すべきである (Should / Must)", "〜に違いありません (No doubt that)"]
      },
      {
        categories: "Engaging the Reader",
        examples: ["皆さんはどう思いますか？ (What do you think?)", "〜考えてみてください (Please consider...)"]
      }
    ],
    effectiveGrammar: [
      "Expressions of obligation and necessity (〜なければならない, 〜べきだ, 〜たほうがいい)",
      "Expressions of strong conviction and conjecture (〜に違いない, 〜はずだ)",
      "Emphasis and rhetorical questions (〜ではないでしょうか)"
    ],
    compatibleTextTypes: [
      "Speech",
      "Email",
      "Article",
      "Essay"
    ]
  },
  Imaginative: {
    styleName: "Imaginative",
    japaneseName: "創作的・物語的",
    purpose: "To use imagination to create an engaging narrative featuring characters, settings, and a dynamic plot with emotional resonance.",
    keyFeatures: [
      "Builds an imaginative narrative with clear plot development (introduction, climax, resolution)",
      "Vividly portrays settings, atmosphere, and character emotions",
      "Uses creative and expressive language features"
    ],
    effectiveVocabulary: [
      {
        categories: "Emotions & Atmosphere",
        examples: ["がっかりした (Disappointed)", "胸がドキドキした (Heart pounding)", "あっという間に (In the blink of an eye)", "静かに (Quietly)"]
      },
      {
        categories: "Scenic Descriptions",
        examples: ["青空が広がる (Blue skies extending)", "風が冷たい (Cold wind)", "夕日が沈む (Sunset sinking)"]
      }
    ],
    effectiveGrammar: [
      "Use of onomatopoeia and mimetic words (mimetic expressions)",
      "Expressing emotions and exclamations (〜てしまった, 〜のだろうか, なんと〜だろう)",
      "Shifts in tense and descriptive modifiers for scenery"
    ],
    compatibleTextTypes: [
      "Story",
      "Journal",
      "Personal Account"
    ]
  },
  Personal: {
    styleName: "Personal",
    japaneseName: "個人的・回想的",
    purpose: "To express personal experiences, memories, daily events, and individual reflections in a relatable, honest, and natural tone.",
    keyFeatures: [
      "Reflects on personal experiences, thoughts, and emotional responses",
      "Maintains an approachable, friendly, and honest tone",
      "Common in diary entries, personal letters, and recounted experiences"
    ],
    effectiveVocabulary: [
      {
        categories: "Experiences & Impressions",
        examples: ["〜たことがある (Have experienced)", "忘れられない思い出 (Unforgettable memory)", "〜と感じた (Felt that)", "〜てよかった (Glad that)"]
      },
      {
        categories: "Recollection",
        examples: ["昔 (In the past)", "〜の頃 (Around the time of)", "あの時は (At that time)"]
      }
    ],
    effectiveGrammar: [
      "Connecting reasons and impressions naturally (〜から, 〜ので, 〜て, 〜たら)",
      "Expressing personal opinions and conjectures (〜と思います, 〜つもりです)"
    ],
    compatibleTextTypes: [
      "Personal Account",
      "Journal",
      "Letter",
      "Email",
      "Message"
    ]
  }
};

export default vceWritingStyles;

export interface AppKnowledgeRecord<T = any> {
  id?: string;
  key: string;
  title: string;
  category: string;
  data: T;
  created_at?: string;
  updated_at?: string;
}

// 💡 Supabase app_knowledge の key
const KNOWLEDGE_KEY = 'WRITING_STYLES';

/**
 * Fetch VCE Writing Styles Guide data from Supabase 'app_knowledge' table.
 */
export async function fetchWritingStylesData(supabaseClient: SupabaseClient): Promise<WritingStylesData> {
  try {
    const { data: row, error } = await supabaseClient
      .from('app_knowledge')
      .select('*')
      .eq('key', KNOWLEDGE_KEY)
      .single();

    if (error || !row) {
      console.warn(`[${KNOWLEDGE_KEY}] Supabaseからの取得失敗のためデフォルトを返します:`, error?.message);
      return vceWritingStyles;
    }

    // 💡 data カラムまたは content_json カラムの両方に対応して安全に取り出す
    const result = (row.data || row.content_json) as WritingStylesData;
    if (result && typeof result === 'object' && Object.keys(result).length > 0) {
      return result;
    }

    return vceWritingStyles;
  } catch (err) {
    console.error(`Error fetching ${KNOWLEDGE_KEY} from Supabase:`, err);
    return vceWritingStyles;
  }
}

/**
 * Upsert VCE Writing Styles Guide data to Supabase 'app_knowledge' table.
 */
export async function upsertWritingStylesData(
  supabaseClient: SupabaseClient,
  content: WritingStylesData,
  category = 'VCE Japanese Data'
): Promise<boolean> {
  const { error } = await supabaseClient
    .from('app_knowledge')
    .upsert({
      key: KNOWLEDGE_KEY,
      title: 'VCE Writing Styles Guide',
      category,
      data: content, // 💡 data カラムに保存
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
 * Get writing style details by style name (Informative, Evaluative, Persuasive, Imaginative, Personal).
 */
export function getWritingStyleByName(stylesData: WritingStylesData, styleName: string): WritingStyleDetail | null {
  return stylesData[styleName] || null;
}

export function listAllWritingStyleNames(stylesData: WritingStylesData): string[] {
  return Object.keys(stylesData);
}