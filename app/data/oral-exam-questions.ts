import { SupabaseClient } from '@supabase/supabase-js';

export interface OralExamQuestionItem {
  category: string;
  text: string;
  audio?: string;
  text_original?: string;
  defaultAnswer?: string;
  default_answer_original?: string;
}

export interface OralExamModeGroup {
  steady?: OralExamQuestionItem[];
  normal?: OralExamQuestionItem[];
  accelerated?: OralExamQuestionItem[];
}

export interface OralExamQuestionsData {
  beforeSec1?: OralExamModeGroup;
  sec1?: OralExamModeGroup;
  sec2?: OralExamModeGroup;
  afterSec2?: OralExamModeGroup;
}

export const ORAL_EXAM_QUESTIONS_DATA: OralExamQuestionsData = {
  beforeSec1: {
    steady: [
      { category: "Entering", text: "こんにちは。", text_original: "こんにちは。", defaultAnswer: "こんにちは、よろしくお願いします。" }
    ],
    normal: [
      { category: "Entering", text: "こんにちは。", text_original: "こんにちは。", defaultAnswer: "こんにちは、本日はどうぞよろしくお願いいたします。" }
    ],
    accelerated: [
      { category: "Entering", text: "こんにちは。", text_original: "こんにちは。", defaultAnswer: "こんにちは、本日はよろしくお願いいたします。" }
    ]
  },
  sec1: { steady: [], normal: [], accelerated: [] },
  sec2: { steady: [], normal: [], accelerated: [] },
  afterSec2: { steady: [], normal: [], accelerated: [] }
};

export default ORAL_EXAM_QUESTIONS_DATA;

const KNOWLEDGE_KEY = 'ORAL_EXAM_QUESTIONS';
const KNOWLEDGE_KEY_LOWER = 'oral-exam-questions';

export async function fetchOralExamQuestionsData(supabaseClient: SupabaseClient): Promise<OralExamQuestionsData | null> {
  try {
    const { data: rows, error } = await supabaseClient
      .from('app_knowledge')
      .select('key, content_json, data')
      .in('key', [KNOWLEDGE_KEY, KNOWLEDGE_KEY_LOWER]);

    if (error || !rows || rows.length === 0) {
      return ORAL_EXAM_QUESTIONS_DATA;
    }

    const row = rows[0];
    const result = (row.content_json || (row as any).data) as OralExamQuestionsData;

    if (result && typeof result === 'object' && Object.keys(result).length > 0) {
      return result;
    }

    return ORAL_EXAM_QUESTIONS_DATA;
  } catch (err) {
    console.error(`Error fetching ${KNOWLEDGE_KEY} from Supabase:`, err);
    return ORAL_EXAM_QUESTIONS_DATA;
  }
}